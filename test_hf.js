const { HfInference } = require("@huggingface/inference");
const fs = require('fs');
const path = require('path');

// Read .env.local manually
const envPath = path.join(__dirname, '.env.local');
let apiKey = process.env.HUGGINGFACE_API_KEY;

if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const lines = envContent.split('\n');
    for (const line of lines) {
        if (line.startsWith('HUGGINGFACE_API_KEY=')) {
            apiKey = line.split('=')[1].trim();
            break;
        }
    }
}

const hf = new HfInference(apiKey);

async function testConfig() {
    try {
        console.log("Testing OpenAssistant/oasst-sft-4-pythia-12b-epoch-3.5 with textGeneration...");
        const response = await hf.textGeneration({
            model: 'OpenAssistant/oasst-sft-4-pythia-12b-epoch-3.5',
            inputs: "<|prompter|>Say hello<|endoftext|><|assistant|>",
            parameters: {
                max_new_tokens: 20
            }
        });
        console.log("OpenAssistant Success:", response.generated_text);
    } catch (error) {
        console.error("OpenAssistant Error:", error.message);
    }
}

testConfig();
