// src/types/express.d.ts
import * as express from 'express';

// Extend Express.Request interface
declare global {
  namespace Express {
    interface Request {
      user?: { id: string, email: string };
      customProperty?: string;
    }
  }
}
