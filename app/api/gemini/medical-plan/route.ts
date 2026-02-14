import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI, Part } from '@google/generative-ai';

// Initialize Gemini
// In production, use process.env.GEMINI_API_KEY
// Initialize Gemini
const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export async function POST(req: NextRequest) {
  try {
    const { description, imageBase64, vitals } = await req.json();

    if (!description && !imageBase64) {
      return NextResponse.json({ error: "Description or image is required" }, { status: 400 });
    }

    let prompt = `You are an advanced medical AI assistant. A user reports these symptoms: ${description || 'No text description provided.'}\n`;

    if (vitals) {
      prompt += `\nUser Vitals Context:\n- Sugar Level: ${vitals.sugarLevel || 'Not provided'}\n- Heart Rate: ${vitals.heartRate || 'Not provided'}\n\nConsider these vitals when formulating the plan. If they are abnormal, prioritize advice related to managing them alongside the symptoms.\n`;
    }

    prompt += `\n`;

    if (imageBase64) {
      prompt += '\n\nThe user has also provided an image related to their symptoms. Please analyze the image carefully and incorporate any visible symptoms, conditions, or relevant medical information you observe in the image into your analysis.';
    }

    prompt += `
Provide a comprehensive medical plan in JSON format. Structure your response as valid JSON only:

{
  "riskLevel": "Low/Medium/High",
  "recommendation": "Brief overview of what the user should know",
  "advice": "Detailed important advice (do not suggest specific medications)",
  "suggestedSpecialist": "Type of doctor specialist recommended",
  "consultation": {
    "specialist": "Specific specialist type (e.g., Cardiologist, Dermatologist, General Practitioner)",
    "urgency": "Immediate/Urgent/Within 24 hours/Within 1 week/Non-urgent",
    "recommendedTimeframe": "When to see the doctor (e.g., 'Within 24 hours', 'Within 1 week')",
    "preparationNotes": "What to prepare before the visit (symptoms timeline, medications, questions)",
    "questionsToAsk": ["Question 1", "Question 2", "Question 3"]
  },
  "precautions": [
    {
      "title": "Precaution title",
      "description": "Detailed precaution description",
      "priority": "High/Medium/Low"
    }
  ],
  "treatmentPlan": [
    {
      "step": "Step name",
      "description": "What to do in this step",
      "day": 1,
      "timeOfDay": "Morning/Afternoon/Evening/Anytime"
    }
  ]
}

Important guidelines:
- Do NOT suggest specific medications or dosages
- Focus on lifestyle changes, monitoring, and when to seek care
- Provide actionable steps for each day
- Make precautions specific and practical
- Ensure treatment plan spans at least 3-7 days
- Risk level should accurately reflect symptom severity
- **CRITICAL:** The 'suggestedSpecialist' and 'consultation.specialist' MUST be the most specific and relevant doctor for the reported symptoms.
    - Heart/Chest pain/High BP -> Cardiologist
    - Skin issues/Rashes -> Dermatologist
    - Bone/Joint pain -> Orthopedist
    - Stomach/Digestion -> Gastroenterologist
    - General/Fever/Flu -> General Practitioner or Internal Medicine
    - Diabetes/High Sugar -> Endocrinologist
    - If unsure, recommend 'General Practitioner'
`;

    const parts: Part[] = [{ text: prompt }];

    if (imageBase64) {
      // Prepare image part if provided
      // Assuming imageBase64 includes the 'data:image/jpeg;base64,' prefix or plain base64
      // The SDK expects pure base64.
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
    let text = response.text();

    console.log("Gemini Raw Response:", text);

    // clean markdown
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    // extract json
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) {
      text = text.substring(jsonStart, jsonEnd + 1);
    }

    try {
      const jsonResponse = JSON.parse(text);
      return NextResponse.json(jsonResponse);
    } catch (e) {
      console.error("Failed to parse JSON", e);
      // Fallback or error
      return NextResponse.json({
        error: "Failed to parse AI response",
        raw: text
      }, { status: 500 });
    }

  } catch (error: unknown) {
    console.error("Gemini API Error:", error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: "Unknown error" }, { status: 500 });
  }
}
