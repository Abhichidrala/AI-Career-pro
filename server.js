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

// Middleware to serve static files from the project root
app.use(express.static(__dirname));

// Middleware to parse JSON bodies
app.use(express.json());

// Middleware for CORS
app.use(cors());

// Configure Gemini API with the updated model name
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Global variable to store pre-loaded fallback questions
let fallbackQuestions = {};

// Function to pre-load fallback questions on server startup
function preloadFallbackQuestions() {
    const roles = ['data_scientist', 'machine_learning_engineer', 'ai_researcher', 'computer_vision_engineer'];
    roles.forEach(role => {
        const filePath = path.join(__dirname, 'fallback_questions', `${role}_questions.json`);
        try {
            const fileContent = fs.readFileSync(filePath, 'utf-8');
            fallbackQuestions[role] = JSON.parse(fileContent).questions;
            console.log(`Successfully pre-loaded fallback questions for: ${role}`);
        } catch (error) {
            console.error(`ERROR: Failed to pre-load fallback questions for role: ${role}. Error: ${error.message}`);
            fallbackQuestions[role] = null;
        }
    });
}

// Pre-load the questions when the server first starts
preloadFallbackQuestions();

// Define a route to generate questions
app.post('/generate-questions', async (req, res) => {
    const { role, difficulty, mode } = req.body;

    if (!role || !difficulty || !mode) {
        return res.status(400).json({ error: 'Role, difficulty, and mode are required.' });
    }

    const roleKey = role.toLowerCase().replace(/\s/g, '_');

    if (mode === 'fallback') {
        if (fallbackQuestions[roleKey]) {
            const filteredQuestions = fallbackQuestions[roleKey].filter(q => q.difficulty.toLowerCase() === difficulty.toLowerCase());
            
            const finalQuestions = filteredQuestions.length >= 30 ? filteredQuestions.slice(0, 30) : fallbackQuestions[roleKey].slice(0, 30);

            if (finalQuestions.length > 0) {
                return res.status(200).json({ questions: finalQuestions });
            }
        }
        res.status(500).json({ error: 'Failed to load fallback questions for this role.' });

    } else { // Assume mode is 'ai'
        try {
            const prompt = `Generate 30 multiple-choice questions for an assessment in the field of "${role}". The questions should be of "${difficulty}" difficulty. The output must be a single JSON object with a key named "questions" which is an array of question objects. Each question object must have "question", "options" (an array of four strings), and "answer" (the correct option's string) properties.`;

            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            const jsonString = text.replace(/```json\n|```/g, '').trim();
            const questions = JSON.parse(jsonString);

            res.status(200).json(questions);

        } catch (error) {
            console.error('Error generating questions with Gemini API. Attempting to use fallback questions:', error);

            if (fallbackQuestions[roleKey]) {
                const filteredQuestions = fallbackQuestions[roleKey].filter(q => q.difficulty.toLowerCase() === difficulty.toLowerCase());
                const finalQuestions = filteredQuestions.length >= 30 ? filteredQuestions.slice(0, 30) : fallbackQuestions[roleKey].slice(0, 30);

                if (finalQuestions.length > 0) {
                    return res.status(200).json({ questions: finalQuestions });
                }
            }
            res.status(500).json({ error: 'Failed to generate questions. Neither API nor fallback questions were available.' });
        }
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});