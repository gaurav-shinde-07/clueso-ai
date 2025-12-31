
import express from 'express';
import { RagService } from '../services/rag.service.js';

const router = express.Router();

router.post('/ask', async (req, res) => {
    try {
        const { query } = req.body;
        if (!query) return res.status(400).json({ error: 'Query is required' });

        const result = await RagService.answerQuestion(query);
        res.json(result);
    } catch (e) {
        console.error('[RAG Controller] Error:', e);
        res.status(500).json({ error: 'Failed to answer question' });
    }
});

// Force index a guide manually (for testing)
router.post('/index/:id', async (req, res) => {
    // In a real app, this would fetch from DB. 
    // Here we'd need to access the main DB, but this file doesn't have access to "RecordingController" scope easily unless we import db.
    // For now, let's skip manual re-index endpoint to keep architecture clean or import db if needed.
    res.status(501).json({ message: 'Not implemented manually yet' });
});

export const ragRoutes = router;
