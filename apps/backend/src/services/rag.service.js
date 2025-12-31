
import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from 'fs';
import path from 'path';

// Calculate similarity between two vectors (Dot Product)
function cosineSimilarity(vecA, vecB) {
    const dotProduct = vecA.reduce((acc, val, i) => acc + val * vecB[i], 0);
    const magA = Math.sqrt(vecA.reduce((acc, val) => acc + val * val, 0));
    const magB = Math.sqrt(vecB.reduce((acc, val) => acc + val * val, 0));
    return dotProduct / (magA * magB);
}

const DB_PATH = path.resolve('knowledge_base.json');

export const RagService = {
    // Initialize standard Gemini model for embeddings
    getEmbeddingModel() {
        const apiKey = process.env.GEMINI_API_KEY;
        const genAI = new GoogleGenerativeAI(apiKey);
        return genAI.getGenerativeModel({ model: "text-embedding-004" });
    },

    getChatModel() {
        const apiKey = process.env.GEMINI_API_KEY;
        const genAI = new GoogleGenerativeAI(apiKey);
        return genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    },

    /**
     * 1. INGESTION: Turn a Guide into a searchable vector
     * Call this whenever a new guide is saved to DB/Filesystem
     */
    async addGuideToKnowledgeBase(guideId, guideContent) {
        try {
            const model = this.getEmbeddingModel();

            // Create a text summary of the guide for the AI to "read" later
            const textToEmbed = `
        Title: ${guideContent.title}
        Steps: ${guideContent.steps.map(s => s.instruction).join(', ')}
        `;

            // Get Embedding
            const result = await model.embedContent(textToEmbed);
            const vector = result.embedding.values;

            // Save to local JSON "database"
            let db = [];
            if (fs.existsSync(DB_PATH)) {
                try {
                    db = JSON.parse(fs.readFileSync(DB_PATH));
                } catch (e) {
                    console.warn('[RAG] Knowledge base corrupted, starting fresh');
                    db = [];
                }
            }

            // Avoid duplicates or update existing
            const existingIdx = db.findIndex(e => e.guideId === guideId);
            if (existingIdx !== -1) {
                db[existingIdx] = { guideId, vector, textToEmbed, timestamp: new Date().toISOString() };
            } else {
                db.push({ guideId, vector, textToEmbed, timestamp: new Date().toISOString() });
            }

            fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
            console.log(`[RAG] Indexed Guide: ${guideId}`);
            return true;
        } catch (e) {
            console.error('[RAG] Indexing Failed:', e);
            return false;
        }
    },

    /**
     * 2. RETRIEVAL: Find relevant guides for a user question
     */
    async search(userQuery) {
        try {
            const model = this.getEmbeddingModel();

            // Embed the User's Query
            const result = await model.embedContent(userQuery);
            const queryVector = result.embedding.values;

            // Load Database
            if (!fs.existsSync(DB_PATH)) return [];
            const db = JSON.parse(fs.readFileSync(DB_PATH));

            // Compare Query vs. All stored guides
            const outcomes = db.map(entry => ({
                ...entry,
                score: cosineSimilarity(queryVector, entry.vector)
            }));

            // Return top 3 matches greater than 60% similarity
            return outcomes
                .filter(match => match.score > 0.6)
                .sort((a, b) => b.score - a.score)
                .slice(0, 3);
        } catch (e) {
            console.error('[RAG] Search Failed:', e);
            return [];
        }
    },

    /**
     * 3. GENERATION: Answer the question using the context
     */
    async answerQuestion(userQuery) {
        // 1. Get Context
        const relevantGuides = await this.search(userQuery);

        let contextBlock = "";
        if (relevantGuides.length > 0) {
            contextBlock = relevantGuides.map(g => `SOURCE (${g.guideId}):\n${g.textToEmbed}`).join('\n\n');
        } else {
            contextBlock = "No specific guides found in knowledge base.";
        }

        // 2. Ask Gemini
        const model = this.getChatModel();

        const prompt = `
        You are a smart support assistant for Clueso.io.
        You have access to a knowledge base of recorded guides.

        CONTEXT FROM KNOWLEDGE BASE:
        ${contextBlock}
        
        USER QUESTION: "${userQuery}"
        
        INSTRUCTIONS:
        - If the context answers the question, explain it step-by-step citing the guide Source ID unless vague.
        - If the context is irrelevant, answer generally but mention you don't have a specific guide for it.
        - Be concise and helpful.
        
        ANSWER:
      `;

        const response = await model.generateContent(prompt);
        return {
            answer: response.response.text(),
            sources: relevantGuides.map(g => g.guideId)
        };
    }
};
