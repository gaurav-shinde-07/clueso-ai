# Deployment Guide

This document explains the current architectural state of the Clueso application, why it is currently configured for local execution, and provides a comprehensive, step-by-step roadmap for migrating it to a production cloud environment.

## ⚠️ Why is it currently local-only?

Before attempting deployment, it is critical to understand *why* the app is not hosted yet. The current architecture relies on specific local resources that do not exist or behave differently in a cloud environment:

1.  **Local File System Dependency (`/uploads`)**:
    *   **Current State**: The backend saves large video files (`.webm`) directly to `apps/backend/uploads` on the machine running the node process.
    *   **The Problem**: Cloud platforms like Vercel, Heroku, or AWS Lambda use "ephemeral file systems." This means any file you write to the disk is **deleted** instantly when the request finishes or when the server restarts (which happens frequently). If you deployed the current code, users would upload videos, but they would disappear seconds later.

2.  **Flat-File Database (`knowledge_base.json`)**:
    *   **Current State**: Metadata and vector embeddings are stored in a simple JSON file.
    *   **The Problem**: JSON files are not databases. In a cloud environment with multiple server instances (scaling), each server would have its own version of the file, leading to data loss and inconsistency. Additionally, hosting providers often lock the file system to "Read Only" for security, causing the app to crash when it tries to save new data.

3.  **Compute Intensity**:
    *   **Current State**: Video processing and AI fusion happen in the main Node.js thread.
    *   **The Problem**: Serverless functions have strict timeout limits (usually 10-60 seconds). Processing a 5-minute video might take 2 minutes, causing the cloud function to timeout and fail before completion.

---

## 🚀 Step-by-Step Production Roadmap

To deploy this application, you must refactor the "Stateful" parts of the application to use external cloud services.

### Phase 1: Database Migration (The "Brain")

You need a persistent place to store data that survives server restarts.

1.  **Choose a Provider**:
    *   **MongoDB Atlas** (Recommended): Easiest for storing JSON-like data (our guides).
    *   **Supabase (PostgreSQL)**: Great if you want relational data.

2.  **Implementation Steps**:
    *   Create a free cluster on MongoDB Atlas.
    *   Get your connection string: `mongodb+srv://<user>:<password>@cluster.mongodb.net/clueso`.
    *   **Code Update in Backend**:
        *   Install Mongoose: `npm install mongoose`
        *   Create a Record Schema:
            ```javascript
            // apps/backend/src/models/Recording.js
            const mongoose = require('mongoose');
            const RecordingSchema = new mongoose.Schema({
                id: String,
                title: String,
                videoUrl: String, // Will store AWS S3 URL here
                transcript: String,
                createdAt: Date
            });
            module.exports = mongoose.model('Recording', RecordingSchema);
            ```
        *   Replace all `fs.readFile('./knowledge_base.json')` calls with `Recording.find()`.
        *   Replace all `fs.writeFile` calls with `await recording.save()`.

### Phase 2: Cloud Storage (The "Hard Drive")

You need a place to store video files permanently.

1.  **Choose a Provider**:
    *   **AWS S3**: Industry standard, cheap, reliable.
    *   **Cloudinary**: Easier API for media, but more expensive at scale.

2.  **Implementation Steps (AWS S3 Example)**:
    *   Create an S3 Bucket (e.g., `clueso-recordings-prod`).
    *   Create an IAM User with `AmazonS3FullAccess` policy to get an `ACCESS_KEY` and `SECRET_KEY`.
    *   **Code Update in Backend**:
        *   Install SDK: `npm install @aws-sdk/client-s3`
        *   Configure Multer (the file upload library) to stream directly to S3 instead of disk:
            ```javascript
            // You'll need a library like 'multer-s3'
            const multerS3 = require('multer-s3');
            const upload = multer({
                storage: multerS3({
                    s3: s3Client,
                    bucket: 'clueso-recordings-prod',
                    key: function (req, file, cb) {
                        cb(null, Date.now().toString() + '.webm')
                    }
                })
            });
            ```
    *   Now, when a file is uploaded, you get a public URL (e.g., `https://s3.aws.com/.../video.webm`). Save **this URL** to your MongoDB database.

### Phase 3: Hosting the Services

Once code changes are made, you can host the application parts.

#### 1. Backend Hosting (Node.js API)
*   **Provider**: **Railway**, **Render**, or **DigitalOcean App Platform**.
*   **Why**: These support persistent services (Docker containers) better than Vercel Functions.
*   **Configuration**:
    *   Connect your GitHub Repo.
    *   Set Root Directory: `apps/backend`
    *   Set Build Command: `npm install`
    *   Set Start Command: `node src/main.js`
    *   **Environment Variables**: copy your `.env` keys (`GEMINI_API_KEY`, `MONGODB_URI`, `AWS_ACCESS_KEY`, etc.) into the dashboard.

#### 2. Frontend Hosting (React App)
*   **Provider**: **Vercel** or **Netlify**.
*   **Configuration**:
    *   Connect GitHub Repo.
    *   Set Root Directory: `apps/frontend`
    *   Set Build Command: `npm run build`
    *   Set Output Directory: `dist`
    *   **Env Vars**: set `VITE_API_URL` to your **Backend's** new URL (e.g., `https://clueso-backend-production.up.railway.app`).

#### 3. The Chrome Extension
*   **Action**: The extension is a client-side tool. It runs in the user's browser, not on a server.
*   **Update**: You must change the `API_URL` in `apps/extension/background.js` from `localhost:3000` to your new Frontend/Backend URL.
*   **Distribution**: Zip the `apps/extension` folder and distribute it, or pay $5 to publish it on the Chrome Web Store.

---

## Summary of Architecture Change

| Feature | Current (Local) | Production (Cloud) |
| :--- | :--- | :--- |
| **Database** | `knowledge_base.json` | **MongoDB Atlas** |
| **Video Storage** | Local Disk (`/uploads`) | **AWS S3 Bucket** |
| **Auth/User** | Hardcoded Mock User | **Clerk** or **Firebase Auth** |
| **Backend Host** | Localhost:3001 | **Railway / Render** |
| **Frontend Host** | Localhost:3000 | **Vercel** |
