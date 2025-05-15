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
Object.defineProperty(exports, "__esModule", { value: true });
const google_auth_library_1 = require("google-auth-library");
const client = new google_auth_library_1.OAuth2Client(process.env.CLIENT_ID);
function verifyToken(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        const idToken = req.cookies.id_token; // Read token from cookies
        if (!idToken) {
            res.status(401).json({ message: 'Unauthorized' });
        }
        try {
            const ticket = yield client.verifyIdToken({
                idToken,
                audience: process.env.CLIENT_ID,
            });
            console.log(ticket.getPayload()); // Attach user info to request
            next();
        }
        catch (error) {
            console.error('Token verification failed:', error);
            res.status(403).json({ message: 'Invalid or expired token' });
        }
    });
}
;
exports.default = verifyToken;
