const OpenAI = require("openai");
const fs = require('fs');
const path = require('path');

// Read .env.local manually
const envPath = path.join(__dirname, '.env.local');
let apiKey = process.env.OPENAI_API_KEY;

if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const lines = envContent.split('\n');
    for (const line of lines) {
        if (line.startsWith('OPENAI_API_KEY=')) {
            apiKey = line.split('=')[1].trim();
            break;
        }
    }
}

if (!apiKey) {
    console.error("API Key not found.");
    process.exit(1);
}

console.log("Testing OpenAI Key:", apiKey.substring(0, 10) + "...");

const openai = new OpenAI({ apiKey: apiKey });

async function testConfig() {
    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "user", content: "Hello, are you working?" }
            ],
        });
        console.log("Success! Response:", completion.choices[0].message.content);
    } catch (error) {
        console.error("OpenAI Error:", error.message);
        console.error("Full Error:", error);
    }
}

testConfig();
