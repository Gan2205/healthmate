import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey || "");

// Models to try in order of preference (Speed > Stability > Fallback)
const MODELS_TO_TRY = [
    "gemini-2.0-flash-lite-preview-02-05", // Newest, fastest, separate quota
    "gemini-flash-latest",                // Standard Flash
    "gemini-flash-lite-latest"            // Ultra-light fallback
];

export async function POST(req: NextRequest) {
    try {
        const { transcript, language, userContext } = await req.json();

        if (!transcript) {
            return NextResponse.json({ error: "No transcript provided" }, { status: 400 });
        }

        const languageNames: Record<string, string> = {
            'en-US': 'English',
            'en-IN': 'English',
            'hi-IN': 'Hindi',
            'te-IN': 'Telugu',
            'ta-IN': 'Tamil',
            'kn-IN': 'Kannada',
            'bn-IN': 'Bengali',
            'mr-IN': 'Marathi',
            'gu-IN': 'Gujarati',
        };

        const detectedLang = languageNames[language] || 'English';

        const prompt = `You are HealthMate AI — a friendly, empathetic voice health assistant.

USER SAID (in ${detectedLang}): "${transcript}"

USER CONTEXT:
- Name: ${userContext?.name || 'User'}
- Sugar Level: ${userContext?.sugarLevel || 'Unknown'}
- Heart Rate: ${userContext?.heartRate || 'Unknown'}

YOUR TASK:
1. Identify the user's INTENT from these categories:
   - "health_query"
   - "symptom_report"
   - "book_appointment"
   - "check_vitals"
   - "ai_scan"
   - "navigation"
   - "greeting"
   - "unknown"

2. Generate a helpful, warm, EXTREMELY CONCISE spoken response (1-2 sentences, max 15 words).
   - MUST respond in ${detectedLang} language
   - Be conversational and natural
   - For vitals queries, use the context values
   - NEVER give specific medication dosages
   - Recommend consulting a doctor for serious concerns

3. If there's an action, specify the navigation path (/dashboard, /symptom-check, /health-prediction, /profile, /medical-system, or null).

RESPOND IN EXACT JSON FORMAT (no markdown, no code blocks):
{
  "intent": "string",
  "response": "string in ${detectedLang}",
  "action": "string or null",
  "language": "${language}"
}

IMPORTANT: Return ONLY valid JSON, no extra text.`;

        let lastError = null;
        let successResponse = null;

        // Try models in sequence
        for (const modelName of MODELS_TO_TRY) {
            try {
                console.log(`Attempting generation with model: ${modelName}`);
                const model = genAI.getGenerativeModel({ model: modelName });

                const result = await model.generateContent(prompt);
                const response = await result.response;
                const text = response.text().trim();

                successResponse = text;
                break; // Success! Exit loop
            } catch (error: any) {
                console.warn(`Model ${modelName} failed:`, error.message);
                lastError = error;
                // Continue to next model
            }
        }

        if (!successResponse) {
            console.error("All models failed.");
            throw lastError || new Error("All backup models failed.");
        }

        // Parse the JSON response
        let parsed;
        try {
            // Remove potential markdown code block wrappers
            const cleaned = successResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            parsed = JSON.parse(cleaned);
        } catch {
            // Fallback if Gemini doesn't return valid JSON
            parsed = {
                intent: 'health_query',
                response: successResponse.replace(/"/g, '').substring(0, 100),
                action: null,
                language: language
            };
        }

        return NextResponse.json(parsed);

    } catch (error: unknown) {
        console.error("Voice Assistant API Error:", error);
        if (error instanceof Error) {
            return NextResponse.json({ error: error.message }, { status: 503 }); // Service Unavailable
        }
        return NextResponse.json({ error: "Unknown error" }, { status: 500 });
    }
}
