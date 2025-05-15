-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'VERIFIED', 'FIXED', 'REJECTED');

-- CreateTable
CREATE TABLE "DetectionData" (
    "id" TEXT NOT NULL,
    "originalImage" TEXT NOT NULL,
    "annotatedImage" TEXT,
    "userId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "accuracyMeters" DOUBLE PRECISION,
    "notes" TEXT,
    "rawDetections" TEXT NOT NULL,
    "counts" TEXT NOT NULL,
    "processingTimeMs" DOUBLE PRECISION NOT NULL,
    "averageConfidence" DOUBLE PRECISION NOT NULL,
    "totalDetections" INTEGER NOT NULL,
    "highestSeverity" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DetectionData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Detection" (
    "id" TEXT NOT NULL,
    "detectionDataId" TEXT NOT NULL,
    "classId" INTEGER NOT NULL,
    "className" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "severity" TEXT NOT NULL,
    "bbox" TEXT NOT NULL,
    "center" TEXT NOT NULL,
    "positionDescription" TEXT NOT NULL,
    "relativePosition" TEXT,
    "area" DOUBLE PRECISION NOT NULL,
    "width" DOUBLE PRECISION NOT NULL,
    "height" DOUBLE PRECISION NOT NULL,
    "aspectRatio" DOUBLE PRECISION,
    "percentageOfImage" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Detection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'user',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLogin" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "Detection" ADD CONSTRAINT "Detection_detectionDataId_fkey" FOREIGN KEY ("detectionDataId") REFERENCES "DetectionData"("id") ON DELETE CASCADE ON UPDATE CASCADE;
