
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GeminiService } from './services/gemini.service.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

console.log('Testing Gemini Service...');
console.log('API KEY:', process.env.GEMINI_API_KEY ? 'Present' : 'Missing');

const mockEvents = [
    { type: 'click', target: 'button#submit', timestamp: 1000 },
    { type: 'navigation', target: '/dashboard', timestamp: 2000 }
];


async function run() {
    const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-pro'];

    for (const modelName of models) {
        console.log(`\nTesting Model: ${modelName}...`);
        try {
            // Config must be passed here to override the service's hardcoded one?
            // Ah, the service hardcodes the model name. We need to modify the service or mock it.
            // Since we imported the service, we can't easily change the internal variable without editing the file.
            // So we will instantiate the SDK directly here to test the model availability.

            const { GoogleGenerativeAI } = await import("@google/generative-ai");
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ model: modelName });

            const result = await model.generateContent("Hello, are you working?");
            const response = await result.response;
            console.log(`[SUCCESS] ${modelName}:`, response.text());
            return; // Exit on first success
        } catch (e) {
            console.error(`[FAILED] ${modelName}:`, e.message);
        }
    }
    console.log('\nAll models failed.');
}


run();
