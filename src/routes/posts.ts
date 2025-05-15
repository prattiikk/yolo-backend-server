import express from 'express';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
dotenv.config();

const prisma = new PrismaClient();
const router = express.Router();

router.get('/near', async (req, res) => {
    try{
       if(req.query.lat && req.query.lon && req.query.radius){
            const lat = parseFloat(req.query.lat as string);
            const lon= parseFloat(req.query.lon as string);
            const radius = parseFloat(req.query.radius as string);
            const potholeData = await prisma.pothole.findMany({
                where: {
                        latitude: { lte: (lat + radius), gte: (lat - radius) },
                        longitude: { lte: (lon + radius), gte: (lon - radius) }
                }
            });
            res.send({'data':potholeData});

            
    }
}catch(e){
       res.status(400).send({'error':e});
    }
    
});

export default router;