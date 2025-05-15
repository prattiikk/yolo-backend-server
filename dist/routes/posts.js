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
const client_1 = require("@prisma/client");
dotenv_1.default.config();
const prisma = new client_1.PrismaClient();
const router = express_1.default.Router();
router.get('/near', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (req.query.lat && req.query.lon && req.query.radius) {
            const lat = parseFloat(req.query.lat);
            const lon = parseFloat(req.query.lon);
            const radius = parseFloat(req.query.radius);
            const potholeData = yield prisma.pothole.findMany({
                where: {
                    latitude: { lte: (lat + radius), gte: (lat - radius) },
                    longitude: { lte: (lon + radius), gte: (lon - radius) }
                }
            });
        }
    }
    catch (e) {
        res.status(400).send({ 'error': e });
    }
}));
exports.default = router;
