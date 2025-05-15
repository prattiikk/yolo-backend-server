"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const axios_1 = __importDefault(require("axios"));
const router = express_1.default.Router();
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:3000/api/auth/google/callback';
// Initiates the Google Login flow
router.get('/auth/google', (req, res) => {
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=profile email`;
    res.redirect(url);
});
// Callback URL for handling the Google Login response
router.get('/auth/google/callback', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { code } = req.query;
    try {
        // Exchange authorization code for access token
        const { data } = yield axios_1.default.post('https://oauth2.googleapis.com/token', {
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            code,
            redirect_uri: REDIRECT_URI,
            grant_type: 'authorization_code',
        });
        const { access_token, id_token } = data;
        // Use access_token or id_token to fetch user profile
        const { data: profile } = yield axios_1.default.get('https://www.googleapis.com/oauth2/v1/userinfo', {
            headers: { Authorization: `Bearer ${access_token}` },
        });
        res.cookie('id_token', id_token, {
            httpOnly: true, // Ensures JavaScript can't access the token
            //secure: true,     // Use true in production (requires HTTPS)
            sameSite: 'strict', // Restricts cookie sending to same-site requests
        });
        res.cookie('access_token', access_token, {
            httpOnly: true, // Ensures JavaScript can't access the token
            //secure: true,     // Use true in production (requires HTTPS)
            sameSite: 'strict', // Restricts cookie sending to same-site requests
        });
        res.redirect('/');
    }
    catch (error) {
        console.error('Error:', error);
        res.redirect('/login');
    }
}));
// Logout route
router.get('/logout', (req, res) => {
    // Code to handle user logout
    res.redirect('/login');
});
exports.default = router;
