import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
    try {
        const { message, imageBase64, patientData } = await req.json();

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json({ error: "GEMINI_API_KEY is not set" }, { status: 500 });
        }

        // Using gemini-3-flash-preview as specific user request
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

        let prompt = message;

        if (patientData && patientData.profile) {
            const profile = patientData.profile;
            const appointments = patientData.appointments || [];
            const reports = patientData.reports || [];

            const contextString = `
User Profile:
- Name: ${profile.name || 'Unknown'}
- Age: ${profile.age || 'Unknown'}
- Gender: ${profile.gender || 'Unknown'}
- Pre-Existing Diseases: ${profile.preExistingDiseases || 'None'}
- Allergies: ${profile.allergies || 'None'}

Health Metrics:
- Sugar Level: ${profile.vitals?.sugarLevel || 'Not recorded'}
- Heart Rate: ${profile.vitals?.heartRate || 'Not recorded'}
- Blood Pressure: ${profile.bloodPressure || 'Not recorded'}
- Weight: ${profile.weight || 'Not recorded'}

Upcoming Appointments:
${appointments.length > 0 ? appointments.map((a: any) => `- Dr. ${a.doctorName} on ${a.date} at ${a.time} for ${a.reason}`).join('\n') : 'No upcoming appointments.'}

Recent Medical Reports:
${reports.length > 0 ? reports.map((r: any) => `- ${r.reportName} (${r.reportCategory}) on ${r.reportDate}`).join('\n') : 'No recent reports.'}

Instructions:
1. You are a personalized AI medical assistant having access to the user's full dashboard.
2. Use the "User Profile", "Health Metrics", "Appointments", and "Reports" above to answer.
3. If the user asks about their health history, refer to the data provided.
4. If the user asks "When is my next appointment?", use the appointment data.
5. If the user asks about their diseases, check "Pre-Existing Diseases".
6. **Important:** When giving medical advice based on pre-existing diseases, keep it concise (ideally one line) and practical.
7. If the user asks about a specific report (e.g., ECG), summarize the findings from the "Recent Medical Reports" section.
`;
            prompt = contextString + "\nUser Query: " + message;
        }

        if (imageBase64) {
            prompt += "\n\n(Image provided but processing text only for this version)";
        }

        let result;
        let attempts = 0;
        const maxAttempts = 3;
        let lastError;

        while (attempts < maxAttempts) {
            try {
                console.log(`Sending request to Gemini (Attempt ${attempts + 1})...`);
                result = await model.generateContent(prompt);
                break; // Success
            } catch (error: any) {
                attempts++;
                lastError = error;
                console.error(`Attempt ${attempts} failed: ${error.message}`);

                // Check for 503 (Service Unavailable) or 429 (Too Many Requests) or general fetch errors that might be transient
                if ((error.status === 503 || error.message?.includes('503') || error.status === 429) && attempts < maxAttempts) {
                    const waitTime = 1000 * Math.pow(2, attempts - 1);
                    console.warn(`Retrying in ${waitTime}ms...`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                } else {
                    // If it's not a retryable error or max attempts reached, rethrow
                    if (attempts === maxAttempts) throw error;
                    // If it's another error (like 400), don't retry, just throw
                    throw error;
                }
            }
        }

        if (!result) {
            throw lastError || new Error("Failed to generate content after multiple attempts");
        }

        const response = await result.response;
        const text = response.text();

        // Frontend expects { response: text }
        return NextResponse.json({ response: text });
    } catch (error) {
        console.error("Chat API Error:", error);
        const err = error as any;
        // Log detailed error for debugging
        console.error("Chat API Detailed Error:", JSON.stringify(err, null, 2));

        return NextResponse.json({ error: err.message || "Unknown Error" }, { status: 500 });
    }
}
