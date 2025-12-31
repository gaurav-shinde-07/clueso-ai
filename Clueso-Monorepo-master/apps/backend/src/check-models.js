
import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const key = process.env.GEMINI_API_KEY;
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;

console.log('Fetching models from:', url.replace(key, 'HIDDEN_KEY'));

https.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        if (res.statusCode === 200) {
            const models = JSON.parse(data).models;
            const names = models.map(m => m.name);
            fs.writeFileSync('available_models_list.txt', names.join('\n'));
            console.log('Written to available_models_list.txt');
        } else {
            console.error('Failed:', res.statusCode, data);
        }
    });
}).on('error', e => console.error(e));
