import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey || "");

// Use gemini-2.0-flash for best vision + text accuracy
const MODELS = [
    "gemini-2.0-flash",
    "gemini-flash-latest",
    "gemini-2.0-flash-lite-preview-02-05"
];

async function tryWithModel(modelName: string, prompt: string, imageParts: any[]) {
    const model = genAI.getGenerativeModel({ model: modelName });
    const parts: any[] = [{ text: prompt }];
    if (imageParts.length > 0) {
        parts.push(...imageParts);
    }
    const result = await model.generateContent(parts);
    const response = await result.response;
    return response.text();
}

export async function POST(req: NextRequest) {
    try {
        const { reportType, imageBase64, textContent, patientInfo } = await req.json();

        if (!imageBase64 && !textContent) {
            return NextResponse.json({ error: "Please upload a report image or paste report text." }, { status: 400 });
        }

        const prompt = `You are an expert medical report analyst with deep expertise in clinical pathology, cardiology, radiology, and all medical diagnostics.

TASK: Analyze the following medical report and explain it in simple, easy-to-understand language that a patient with no medical background can understand. Be thorough and accurate.

REPORT TYPE: ${reportType || 'General Medical Report'}

${patientInfo ? `PATIENT CONTEXT:
- Age: ${patientInfo.age || 'Unknown'}
- Gender: ${patientInfo.gender || 'Unknown'}
- Pre-existing conditions: ${patientInfo.preExistingDiseases || 'None reported'}
` : ''}

${textContent ? `REPORT TEXT:\n${textContent}\n` : ''}
${imageBase64 ? 'The report image is attached. Extract ALL values, parameters, and findings from it.\n' : ''}

You MUST respond with ONLY valid JSON in this exact format (no markdown, no code blocks):
{
    "reportTitle": "Name/type of the report (e.g., Complete Blood Count, ECG Report, Lipid Profile)",
    "summary": "A 2-3 sentence plain-English summary of the overall report - what it means for the patient",
    "overallStatus": "NORMAL" or "ATTENTION" or "CRITICAL",
    "parameters": [
        {
            "name": "Parameter name (e.g., Hemoglobin, Heart Rate)",
            "value": "The measured value with unit",
            "normalRange": "The normal/reference range",
            "status": "NORMAL" or "HIGH" or "LOW" or "ABNORMAL",
            "explanation": "What this parameter means in simple terms (1-2 sentences)"
        }
    ],
    "keyFindings": [
        {
            "finding": "A specific finding from the report",
            "severity": "NORMAL" or "MILD" or "MODERATE" or "SEVERE",
            "explanation": "What this means for the patient in plain English"
        }
    ],
    "recommendations": [
        "Simple actionable recommendation 1",
        "Simple actionable recommendation 2"
    ],
    "importantNotes": [
        "Any critical warnings or important notes the patient should know"
    ],
    "needsDoctorReview": true or false,
    "doctorReviewReason": "Why the patient should see a doctor (if applicable)"
}

CRITICAL RULES:
1. Extract EVERY parameter/value from the report - do not skip any
2. Always provide the normal range for comparison
3. Explain each finding as if talking to someone who has never read a medical report
4. Be medically accurate - do not fabricate or assume values not in the report
5. Flag anything abnormal clearly
6. If the image is unclear, mention which parts couldn't be read
7. Always recommend consulting a doctor for abnormal results`;

        // Prepare image parts if provided
        const imageParts: any[] = [];
        if (imageBase64) {
            // Extract MIME type and data
            const matches = imageBase64.match(/^data:(.+);base64,(.+)$/);
            if (matches) {
                imageParts.push({
                    inlineData: {
                        mimeType: matches[1],
                        data: matches[2]
                    }
                });
            }
        }

        // Try models in order of preference
        let text = '';
        let lastError: any = null;

        for (const modelName of MODELS) {
            try {
                text = await tryWithModel(modelName, prompt, imageParts);
                break;
            } catch (err: any) {
                lastError = err;
                console.log(`Model ${modelName} failed, trying next...`);
                continue;
            }
        }

        if (!text) {
            throw lastError || new Error("All models failed");
        }

        // Clean and parse response
        let cleanedText = text
            .replace(/```json\s*/gi, '')
            .replace(/```\s*/gi, '')
            .trim();

        // Find JSON object
        const jsonStart = cleanedText.indexOf('{');
        const jsonEnd = cleanedText.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd !== -1) {
            cleanedText = cleanedText.substring(jsonStart, jsonEnd + 1);
        }

        let analysis;
        try {
            analysis = JSON.parse(cleanedText);
        } catch {
            // If JSON parsing fails, return raw text in a structured format
            analysis = {
                reportTitle: "Medical Report Analysis",
                summary: cleanedText.substring(0, 500),
                overallStatus: "ATTENTION",
                parameters: [],
                keyFindings: [{ finding: "AI analysis completed", severity: "NORMAL", explanation: cleanedText }],
                recommendations: ["Please consult your doctor for a detailed interpretation."],
                importantNotes: ["The AI could not fully structure this report. Please share with your doctor."],
                needsDoctorReview: true,
                doctorReviewReason: "Automated analysis could not be fully structured."
            };
        }

        return NextResponse.json(analysis);

    } catch (error: any) {
        console.error("Report Analysis Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to analyze report. Please try again." },
            { status: 500 }
        );
    }
}
