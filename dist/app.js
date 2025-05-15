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
const client_1 = require("@prisma/client");
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const https_1 = __importDefault(require("https"));
const fs_1 = __importDefault(require("fs"));
const axios_1 = __importDefault(require("axios"));
const socket_io_1 = require("socket.io");
const app = (0, express_1.default)();
const port = 3000;
const prisma = new client_1.PrismaClient();
// Load SSL certificates
const options = {
    key: fs_1.default.readFileSync('key.pem'),
    cert: fs_1.default.readFileSync('cert.pem'),
};
const server = https_1.default.createServer(options, app);
const io = new socket_io_1.Server(server);
app.use((0, cors_1.default)());
app.use((0, cookie_parser_1.default)());
app.use(express_1.default.static('public'));
app.use(express_1.default.json()); // To parse JSON bodies
app.use('/api', authRoutes_1.default);
app.get('/check', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.send('Hello, TypeScript Backend!');
}));
io.on('connection', (socket) => {
    console.log('A user connected');
    socket.on('streamVideo', (data) => {
        console.log("frames coming");
        const payload = {
            image: data.imageData
        };
        // Send the POST request to the Flask API
        const url = 'http://localhost:5000/predict'; // Update with the correct URL if needed
        axios_1.default.post(url, payload)
            .then((response) => __awaiter(void 0, void 0, void 0, function* () {
            console.log('Predicted classes:', response.data.predicted_classes);
            if (response.data.predicted_classes.length) {
                console.log("saved to database");
                yield prisma.pothole.create({
                    data: {
                        img: data.imageData,
                        severity: 3,
                        reportedBy: "test",
                        latitude: data.location.latitude,
                        longitude: data.location.longitude
                    }
                });
            }
            console.log('Class names:', response.data.class_names);
        }))
            .catch((error) => {
            console.error('Error:', error.response ? error.response.data : error.message);
        });
    });
    socket.on('disconnect', () => {
        console.log('A user disconnected');
    });
});
server.listen(port, '0.0.0.0', () => {
    console.log(`Server is running on https://localhost:${port}`);
});
