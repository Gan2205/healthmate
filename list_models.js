const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const path = require('path');

// Read .env.local manually to avoid installing dotenv if not present
const envPath = path.join(__dirname, '.env.local');
let apiKey = process.env.GEMINI_API_KEY;

if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const match = envContent.match(/GEMINI_API_KEY=(.*)/);
    if (match) {
        apiKey = match[1].trim();
    }
}

if (!apiKey) {
    console.error("API Key not found in .env.local or environment variables.");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function listModels() {
    try {
        // There isn't a direct listModels method on the genAI instance in the node SDK easily accessible 
        // without using the model manager, but let's try to infer or just test standard models.
        // Actually, the Node SDK doesn't expose listModels directly on the top-level class in early versions.
        // Let's try to use the model manager if available, or just test a few known ones.

        // Wait, the error message said "Call ListModels".
        // The Google AI SDK for Node.js (specifically @google/generative-ai) might not have a direct listModels helper 
        // on the client instance in older versions, but let's try the google-generative-ai package's approach.

        // Actually, let's just try to instantiate a few models and see which ones DON'T throw immediately,
        // or improved: just print the error which contains the list of available models usually?
        // THE ERROR MESSAGE SAID "Call ListModels to see the list..."

        // Let's try to make a raw REST call to list models using the key, 
        // since the SDK might obscure the listModels method or I might not know the exact import.

        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.models) {
            console.log("Available Models:");
            data.models.forEach(m => {
                if (m.name.includes("1.5") || m.name.includes("flash")) {
                    console.log(`- ${m.name} (${m.displayName}) [Supported Methods: ${m.supportedGenerationMethods}]`);
                }
            });
        } else {
            console.log("No models found or error:", data);
        }

    } catch (error) {
        console.error("Error listing models:", error);
    }
}

listModels();
