import { OAuth2Client } from 'google-auth-library';
const client = new OAuth2Client(process.env.CLIENT_ID);
import express,{Response,Request,NextFunction} from 'express';

async function verifyToken(req : Request,res : Response,next : NextFunction): Promise<void> {
  const idToken = req.cookies.id_token; // Read token from cookies
  if (!idToken) {
    res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.CLIENT_ID,
    });

     console.log(ticket.getPayload()); // Attach user info to request
    next();
  } catch (error) {
    console.error('Token verification failed:', error);
    res.status(403).json({ message: 'Invalid or expired token' });
  }
};

export default verifyToken;
