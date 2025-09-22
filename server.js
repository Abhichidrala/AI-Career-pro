// Load environment variables from .env file
require('dotenv').config();

// Import necessary modules
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Express app
const app = express();
const port = process.env.PORT || 4000;

// Middleware to parse JSON bodies
app.use(express.json());

// Middleware for CORS
app.use(cors());

// Serve frontend static files from 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// Catch-all route to serve index.html for frontend routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Configure Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Global variable to store pre-loaded fallback questions
let fallbackQuestions = {};

// Preload fallback questions from JSON files
function preloadFallbackQuestions() {
    const roles = ['data_scientist', 'machine_learning_engineer', 'ai_researcher', 'computer_vision_engineer'];
    roles.forEach(role => {
        const filePath = path.join(__dirname, 'fallback_questions', `${role}_questions.json`);
        try {
            const fileContent = fs.readFileSync(filePath, 'utf-8');
            fallbackQuestions[role] = JSON.parse(fileContent).questions;
            console.log(`Preloaded fallback questions for: ${role}`);
        } catch (error) {
            console.error(`Failed to load fallback questions for ${role}: ${error.message}`);
            fallbackQuestions[role] = null;
        }
    });
}

// Call preload on server start
preloadFallbackQuestions();

// Route to generate questions
app.post('/generate-questions', async (req, res) => {
    const { role, difficulty, mode } = req.body;

    if (!role || !difficulty || !mode) {
        return res.status(400).json({ error: 'Role, difficulty, and mode are required.' });
    }

    const roleKey = role.toLowerCase().replace(/\s/g, '_');

    if (mode === 'fallback') {
        if (fallbackQuestions[roleKey]) {
            const filtered = fallbackQuestions[roleKey].filter(q => q.difficulty.toLowerCase() === difficulty.toLowerCase());
            const finalQuestions = filtered.length >= 30 ? filtered.slice(0, 30) : fallbackQuestions[roleKey].slice(0, 30);
            if (finalQuestions.length > 0) return res.status(200).json({ questions: finalQuestions });
        }
        return res.status(500).json({ error: 'Failed to load fallback questions for this role.' });
    } else {
        try {
            const prompt = `Generate 30 multiple-choice questions for "${role}" of "${difficulty}" difficulty. Output a JSON object with key "questions", each with "question", "options" (array of 4), "answer".`;
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            const jsonString = text.replace(/```json\n|```/g, '').trim();
            const questions = JSON.parse(jsonString);
            return res.status(200).json(questions);
        } catch (error) {
            console.error('Gemini API error, using fallback:', error);
            if (fallbackQuestions[roleKey]) {
                const filtered = fallbackQuestions[roleKey].filter(q => q.difficulty.toLowerCase() === difficulty.toLowerCase());
                const finalQuestions = filtered.length >= 30 ? filtered.slice(0, 30) : fallbackQuestions[roleKey].slice(0, 30);
                if (finalQuestions.length > 0) return res.status(200).json({ questions: finalQuestions });
            }
            return res.status(500).json({ error: 'Failed to generate questions. No API or fallback available.' });
        }
    }
});

// Start server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
