import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI, Part } from '@google/generative-ai';

// Initialize Gemini
const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export async function POST(req: NextRequest) {
    try {
        const { message, imageBase64 } = await req.json();

        let prompt = `You are a medical AI assistant. The user is asking: ${message}\n\nProvide helpful medical information but remember:\n- Do NOT provide specific medication dosages\n- Do NOT diagnose specific conditions definitively\n- Provide general guidance and recommend consulting a healthcare professional for serious concerns\n- Be empathetic and helpful\n\nRespond to the user's question.`;

        if (imageBase64) {
            prompt = `You are a medical AI assistant. Analyze this image and answer the user's question.\n\nUser's question: ${message}\n\nIMPORTANT: \n- If this image is NOT related to medical/health topics (e.g., landscapes, animals, food, objects, etc.), respond with: "I'm sorry, I don't recognize this as a medical image. Please upload an image related to health, medical conditions, symptoms, scans, or medical documentation."\n\n- If this IS a medical image, provide helpful medical information but remember:\n  - Do NOT provide specific medication dosages\n  - Do NOT diagnose specific conditions definitively\n  - Provide general guidance and recommend consulting a healthcare professional\n  - Focus on what you observe and general information\n\nAnalyze the image and respond to the user's question accordingly.`;
        }

        const parts: Part[] = [{ text: prompt }];

        if (imageBase64) {
            const base64Data = imageBase64.split(',')[1] || imageBase64;
            parts.push({
                inlineData: {
                    data: base64Data,
                    mimeType: "image/jpeg"
                }
            });
        }

        const result = await model.generateContent(parts);
        const response = await result.response;
        const text = response.text();

        return NextResponse.json({ response: text });

    } catch (error: unknown) {
        console.error("Gemini API Error:", error);
        if (error instanceof Error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }
        return NextResponse.json({ error: "Unknown error" }, { status: 500 });
    }
}
