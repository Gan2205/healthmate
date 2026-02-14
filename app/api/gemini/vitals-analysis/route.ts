import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export async function POST(req: Request) {
    try {
        const { sugarLevel, heartRate, userProfile } = await req.json();

        // Construct a prompt for the medical analysis
        const prompt = `
            Analyze the following health vitals for a user:
            - Sugar Level: ${sugarLevel} mg/dL
            - Heart Rate: ${heartRate} bpm
            - Profile: ${JSON.stringify(userProfile || {})}

            Based on medical standards, determine the health risk status.
            
            Return ONLY a JSON object with this exact structure (no markdown, no backticks):
            {
                "status": "GOOD" | "MEDIUM" | "HIGH",
                "message": "A concise, single-sentence health advice (max 15 words)."
            }

            Rules:
            - GOOD: Levels are within normal healthy ranges.
            - MEDIUM: Slight deviation, potential concern.
            - HIGH: Dangerous levels requiring attention.
        `;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        // Clean up the response to ensure valid JSON
        const cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        const analysis = JSON.parse(cleanedText);

        return NextResponse.json(analysis);

    } catch (error: any) {
        console.error("Gemini Vitals Analysis Error:", error);
        return NextResponse.json(
            { error: "Failed to analyze vitals", details: error.message },
            { status: 500 }
        );
    }
}
