import express from 'express';
import dotenv from 'dotenv';
dotenv.config();

import axios from 'axios';
const router = express.Router();

const CLIENT_ID =process.env.GOOGLE_CLIENT_ID; 
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:3000/api/auth/google/callback';

// Initiates the Google Login flow
router.get('/auth/google', (req, res) => {
  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=profile email`;
  res.redirect(url);
});

// Callback URL for handling the Google Login response
router.get('/auth/google/callback', async (req, res) => {
  const { code } = req.query;

  try {
    // Exchange authorization code for access token
    const { data } = await axios.post('https://oauth2.googleapis.com/token', {
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code',
    });

    const { access_token, id_token } = data;

    // Use access_token or id_token to fetch user profile
    const { data: profile } = await axios.get('https://www.googleapis.com/oauth2/v1/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    res.cookie('id_token', id_token, {
      httpOnly: true,   // Ensures JavaScript can't access the token
      //secure: true,     // Use true in production (requires HTTPS)
      sameSite: 'strict',  // Restricts cookie sending to same-site requests
    });
    
    res.cookie('access_token', access_token, {
      httpOnly: true,   // Ensures JavaScript can't access the token
      //secure: true,     // Use true in production (requires HTTPS)
      sameSite: 'strict',  // Restricts cookie sending to same-site requests
    });

    res.redirect('/');
  } catch (error) {
    console.error('Error:', error);
    res.redirect('/login');
  }
});

// Logout route
router.get('/logout', (req, res) => {
  // Code to handle user logout
  res.redirect('/login');
});

export default router;