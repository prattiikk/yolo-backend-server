import express, { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/authRoutes';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import http from 'http'; // Change from https to http
import fs from 'fs';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { Server, Socket } from 'socket.io';

// Define types
interface Location {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  altitudeAccuracy?: number;
  heading?: number;
  speed?: number;
  timestamp?: number;
  source?: string;
  confidence?: string;
  satelliteData?: any;
}

interface StreamVideoData {
  imageData: string;
  location: Location;
  userId?: string;
  username?: string;
  notes?: string;
  speed?: number;
  frameRate?: number;
}

interface SubmitImageData {
  imageData: string;
  location: Location;
  userId?: string;
  username?: string;
  notes?: string;
}

interface Detection {
  class_id: number;
  class_name: string;
  confidence: number;
  severity: string;
  bbox: number[];
  center: [number, number];
  relative_position?: [number, number];
  position_description: string;
  area: number;
  width: number;
  height: number;
  aspect_ratio?: number;
  percentage_of_image: number;
}

interface PredictionSummary {
  total_detections: number;
  class_distribution: Record<string, number>;
  largest_detection: Detection | null;
  average_confidence: number;
  total_covered_area: number;
  percentage_covered: number;
  severity_distribution: Record<string, number>;
  processing_time_seconds: number;
  image_dimensions: {
    width: number;
    height: number;
    aspect_ratio: number;
    resolution: number;
  };
  timestamp: string;
}

interface PredictionResponse {
  detections: Detection[];
  counts: Record<string, number>;
  summary: PredictionSummary;
  annotated_image?: string;
}

interface DetectionCompleteResponse {
  success: boolean;
  detectionId?: string;
  noDetections?: boolean;
  message?: string;
  data?: any;
}

interface ErrorResponse {
  message: string;
  details?: string;
}

// Express app setup
const app = express();
const port = 4000;
const prisma = new PrismaClient();

// Remove SSL certificates loading as we are switching to HTTP
// const options = {
//   key: fs.readFileSync('key.pem'),
//   cert: fs.readFileSync('cert.pem'),
// };

// Change to http.createServer
const server = http.createServer(app); // Changed from https.createServer
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  maxHttpBufferSize: 5e6 // 5MB for handling larger images
});

// Configure middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(cookieParser());
app.use(express.static('public'));
app.use(express.json({ limit: '5mb' })); // Increased limit for larger images

// Use auth routes - only needed for user authentication
app.use('/api', authRoutes);

// Health check endpoint
app.get('/check', async (req: Request, res: Response): Promise<void> => {
  res.send('Server running successfully');
});

// Socket.io connection handler
io.on('connection', (socket: Socket): void => {
  console.log('A user connected:', socket.id);

  // Function to determine the highest severity level among all detections
  const getHighestSeverity = (detections: Detection[]): string => {
    const severityLevels = {
      "Critical": 4,
      "HIGH": 3,
      "MEDIUM": 2,
      "LOW": 1
    };
    
    let highestLevel = 0;
    let highestSeverity = "LOW";
    
    for (const detection of detections) {
      const severityValue = severityLevels[detection.severity as keyof typeof severityLevels] || 0;
      if (severityValue > highestLevel) {
        highestLevel = severityValue;
        highestSeverity = detection.severity.toUpperCase();
      }
    }
    
    return highestSeverity;
  };

  // Function to store detection data from API response
  const storeDetectionData = async (
    data: StreamVideoData | SubmitImageData, 
    responseData: PredictionResponse
  ): Promise<string> => {
    // Create a unique detection ID
    const detectionId = uuidv4();
    
    // Create timestamp
    const timestamp = new Date();
    
    // Get the base64 image data
    const imageData = data.imageData;
    // Handle both base64 with or without prefix
    const originalImageBase64 = imageData.includes('base64,') ? 
      imageData : `data:image/jpeg;base64,${imageData}`;
    
    // Process annotated image if available
    let annotatedImageBase64 = null;
    if (responseData.annotated_image) {
      annotatedImageBase64 = `data:image/jpeg;base64,${responseData.annotated_image}`;
    }
    
    // Determine highest severity level
    const highestSeverity = getHighestSeverity(responseData.detections);
    
    // Store the main detection data record with base64 image data
    const detectionData = await prisma.detectionData.create({
      data: {
        id: detectionId,
        originalImage: originalImageBase64,  // Store base64 string directly
        annotatedImage: annotatedImageBase64, // Store base64 string directly or null
        userId: data.userId || 'anonymous',
        username: data.username || 'anonymous user',
        latitude: data.location.latitude,
        longitude: data.location.longitude,
        accuracyMeters: data.location.accuracy || null,
        notes: data.notes || '',
        rawDetections: JSON.stringify(responseData.detections),
        counts: JSON.stringify(responseData.counts),
        processingTimeMs: responseData.summary.processing_time_seconds * 1000,
        averageConfidence: responseData.summary.average_confidence,
        totalDetections: responseData.detections.length,
        highestSeverity: highestSeverity,
        createdAt: timestamp,
        updatedAt: timestamp
      }
    });
    
    // Store individual detection entries
    if (responseData.detections.length > 0) {
      const detectionEntries = responseData.detections.map(detection => ({
        id: uuidv4(),
        detectionDataId: detectionId,
        classId: detection.class_id,
        className: detection.class_name,
        confidence: detection.confidence,
        severity: detection.severity,
        bbox: JSON.stringify(detection.bbox),
        center: JSON.stringify(detection.center),
        positionDescription: detection.position_description,
        relativePosition: detection.relative_position ? JSON.stringify(detection.relative_position) : null,
        area: detection.area,
        width: detection.width,
        height: detection.height,
        aspectRatio: detection.aspect_ratio || null,
        percentageOfImage: detection.percentage_of_image
      }));
      
      await prisma.detection.createMany({
        data: detectionEntries
      });
    }
    
    console.log(`Saved detection data ${detectionId} with ${responseData.detections.length} detections`);
    return detectionId;
  };

  // Handler for video stream frames
  socket.on('streamVideo', async (data: StreamVideoData): Promise<void> => {
    console.log(`Processing frame from user ${socket.id}, speed: ${data.speed}, frameRate: ${data.frameRate}`);
    
    try {
      if (!data || !data.imageData || !data.location) {
        socket.emit('error', { message: 'Invalid data format' } as ErrorResponse);
        return;
      }

      const payload = {
        image: data.imageData.includes('base64,') ? 
          data.imageData.split('base64,')[1] : data.imageData
      };

      console.log("payload is ----------------> ", payload)

      // Send the POST request to the Flask API
      const url = 'http://localhost:6000/predict';
      const response = await axios.post<PredictionResponse>(url, payload);
      
      // Get response data from Flask API
      const responseData = response.data;
      
      // Store the detection data
      const detectionId = await storeDetectionData(data, responseData);
      
      // Emit success response back to client
      socket.emit('detectionComplete', {
        success: true,
        detectionId: detectionId,
        noDetections: responseData.detections.length === 0,
        message: responseData.detections.length > 0 
          ? `Detected ${responseData.detections.length} issues: ${Object.entries(responseData.counts).map(([k, v]) => `${v} ${k}`).join(', ')}`
          : 'No issues detected in this frame',
        data: {
          counts: responseData.counts,
          totalDetections: responseData.detections.length,
          processingTime: responseData.summary.processing_time_seconds,
          severityDistribution: responseData.summary.severity_distribution
        }
      } as DetectionCompleteResponse);
      
    } catch (error: any) {
      console.error('Error processing frame:', error);
      socket.emit('error', { 
        message: 'Failed to process video frame',
        details: error.message
      } as ErrorResponse);
    }
  });

  // Handler for single image submissions
  socket.on('submitImage', async (data: SubmitImageData): Promise<void> => {
    try {
      if (!data || !data.imageData || !data.location) {
        socket.emit('error', { message: 'Invalid data format' } as ErrorResponse);
        return;
      }

      const payload = {
        image: data.imageData.includes('base64,') ? 
          data.imageData.split('base64,')[1] : data.imageData
      };

      // Send the POST request to the Flask API
      const url = 'http://localhost:6000/predict';
      const response = await axios.post<PredictionResponse>(url, payload);
      
      // Get response data from Flask API
      const responseData = response.data;
      
      // Store the detection data
      const detectionId = await storeDetectionData(data, responseData);
      
      // Emit success response back to client
      socket.emit('imageSubmitted', {
        success: true,
        detectionId: detectionId,
        noDetections: responseData.detections.length === 0,
        message: responseData.detections.length > 0 
          ? `Detected ${responseData.detections.length} issues: ${Object.entries(responseData.counts).map(([k, v]) => `${v} ${k}`).join(', ')}`
          : 'No issues detected in this image',
        data: {
          counts: responseData.counts,
          totalDetections: responseData.detections.length,
          processingTime: responseData.summary.processing_time_seconds,
          severityDistribution: responseData.summary.severity_distribution
        }
      });
      
    } catch (error: any) {
      socket.emit('error', { 
        message: 'Failed to submit image',
        details: error.message
      } as ErrorResponse);
    }
  });

  socket.on('disconnect', (): void => {
    console.log('User disconnected:', socket.id);
  });
});

// API endpoint to retrieve detection data by ID
app.get('/api/detections/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const detectionId = req.params.id;
    
    const detectionData = await prisma.detectionData.findUnique({
      where: { id: detectionId },
      include: { detections: true }
    });
    
    if (!detectionData) {
      res.status(404).json({ error: 'Detection data not found' });
      return;
    }
    
    res.json(detectionData);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to retrieve detection data', details: error.message });
  }
});

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction): void => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Server error', 
    message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred'
  });
});

// Start server
server.listen(port, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${port}`); // Updated console log
});

// Handle graceful shutdown
process.on('SIGTERM', async (): Promise<void> => {
  console.log('SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});