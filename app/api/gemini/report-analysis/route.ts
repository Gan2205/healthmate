
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
    try {
        const { reportType, imageBase64, textContent, patientInfo } = await req.json();

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json({ error: "GEMINI_API_KEY is not set" }, { status: 500 });
        }

        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

        let prompt = `
        You are an expert AI medical assistant specializing in analyzing medical reports.
        
        Analyze the following ${reportType} report for a patient with these details:
        - Age: ${patientInfo?.age || 'Unknown'}
        - Gender: ${patientInfo?.gender || 'Unknown'}
        - Pre-existing Conditions: ${patientInfo?.preExistingDiseases || 'None'}

        Task:
        1. Extract all key medical parameters and their values.
        2. Compare values against standard normal ranges.
        3. Identify any abnormal or critical findings.
        4. Provide a clear, layman-friendly summary.
        5. Offer actionable recommendations.
        6. Highlight if immediate doctor consultation is needed.

        Return the analysis in STRICT JSON format with no markdown formatting or code blocks. The JSON structure must be:
        {
            "reportTitle": "Title of the report",
            "overallStatus": "Normal | Abnormal | Critical",
            "summary": "Clear summary of the report...",
            "parameters": [
                {
                    "name": "Parameter Name",
                    "value": "Measured Value",
                    "normalRange": "Standard Range",
                    "status": "Normal | Low | High | Abnormal",
                    "explanation": "Brief explanation of what this means"
                }
            ],
            "keyFindings": [
                {
                    "finding": "Key observation",
                    "severity": "Mild | Moderate | Severe",
                    "explanation": "Why this is important"
                }
            ],
            "recommendations": ["Recommendation 1", "Recommendation 2"],
            "importantNotes": ["Note 1", "Note 2"],
            "needsDoctorReview": boolean,
            "doctorReviewReason": "Reason if true, else null"
        }
        `;

        const parts: any[] = [{ text: prompt }];

        if (textContent) {
            parts.push({ text: `Report Text Content:\n${textContent}` });
        }

        if (imageBase64) {
            // Remove header if present (e.g., "data:image/jpeg;base64,")
            const base64Data = imageBase64.split(',')[1] || imageBase64;
            parts.push({
                inlineData: {
                    mimeType: "image/jpeg", // Assuming JPEG for simplicity, can extract from string if needed
                    data: base64Data
                }
            });
        }

        const result = await model.generateContent(parts);
        const responseText = result.response.text();

        // Clean up response if it contains markdown code blocks
        const cleanedResponse = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

        try {
            const jsonResponse = JSON.parse(cleanedResponse);
            return NextResponse.json(jsonResponse);
        } catch (parseError) {
            console.error("JSON Parse Error:", parseError, "Response:", responseText);
            return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
        }

    } catch (error: any) {
        console.error("Analysis Error:", error);
        return NextResponse.json({ error: error.message || "Failed to analyze report" }, { status: 500 });
    }
}
