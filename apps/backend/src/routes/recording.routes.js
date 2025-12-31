
import express from 'express';
import multer from 'multer';
import path from 'path';
import { RecordingController } from '../controllers/recording.controller.js';

const router = express.Router();

// Multer Storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Ensure this exists
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Routes
router.get('/', RecordingController.getAll);
router.get('/:id', RecordingController.getOne);
router.post('/upload', upload.single('video'), RecordingController.upload);

export const recordingRoutes = router;
