
export interface HealthInput {
    age: number;
    gender: 'Male' | 'Female';
    systolicBP: number;
    diastolicBP: number;
    heartRate: number;
    temperature: number;
    symptoms: string[];
    preExistingConditions: string[]; // Added field
}

export interface PredictionResult {
    prediction: string;
    confidence: number;
    riskLevel: 'Low' | 'Medium' | 'High';
    contributingFactors: string[];
    recommendation: string;
    resultSource?: string;
    recommendedSpecialist?: string;
    riskBreakdown?: { label: string; amount: number }[];
}

/**
 * A simplified "Random Forest" style rule engine.
 * In a real scenario, this would load a serialized model (e.g. ONNX or TensorFlow.js).
 * For this demo, we implement the logic derived from the synthetic data patterns.
 */
export function predictHealthStatus(input: HealthInput): PredictionResult {
    const factors: string[] = [];
    let riskScore = 0; // 0-100 scale

    // --- 1. Blood Pressure Check ---
    if (input.systolicBP > 180 || input.diastolicBP > 120) {
        riskScore += 80; // Hypertensive Crisis
        factors.push(`CRITICAL: Hypertensive Crisis (${input.systolicBP}/${input.diastolicBP})`);
    } else if (input.systolicBP > 140 || input.diastolicBP > 90) {
        riskScore += 40;
        factors.push(`High Blood Pressure (Hypertension)`);
    } else if (input.systolicBP < 90 || input.diastolicBP < 60) {
        riskScore += 40;
        factors.push(`Low Blood Pressure (Hypotension)`);
    } else if (input.systolicBP > 120 || input.diastolicBP > 80) {
        riskScore += 10;
        factors.push(`Elevated Blood Pressure`);
    }

    // --- 2. Heart Rate Check ---
    if (input.heartRate > 120) {
        riskScore += 50;
        factors.push(`Severe Tachycardia (High HR: ${input.heartRate} bpm)`);
    } else if (input.heartRate > 100) {
        riskScore += 20;
        factors.push(`High Resting Heart Rate (${input.heartRate} bpm)`);
    } else if (input.heartRate < 50) {
        riskScore += 75; // Critical Bradycardia (e.g. 42 bpm)
        factors.push(`Severe Bradycardia (Critically Low HR: ${input.heartRate} bpm)`);
    } else if (input.heartRate < 60) {
        riskScore += 15;
        factors.push(`Low Resting Heart Rate (${input.heartRate} bpm)`);
    }

    // --- 3. Temperature Check ---
    if (input.temperature > 39.0) {
        riskScore += 60;
        factors.push(`High Fever (${input.temperature}°C)`);
    } else if (input.temperature > 37.5) {
        riskScore += 30;
        factors.push(`Elevated Body Temperature (${input.temperature}°C)`);
    } else if (input.temperature < 35.0) {
        riskScore += 60;
        factors.push(`Hypothermia Risk (${input.temperature}°C)`);
    }

    // --- 4. Age Factor ---
    if (input.age > 65) {
        // Elderly are more susceptible
        if (riskScore > 0) riskScore += 10;
    }

    // --- 5. Pre-Existing Conditions Analysis ---
    if (input.preExistingConditions && input.preExistingConditions.length > 0) {
        input.preExistingConditions.forEach(condition => {
            if (condition === 'Heart Disease') {
                riskScore += 30;
                factors.push('History of Heart Disease');
            } else if (condition === 'Hypertension') {
                if (input.systolicBP > 130) {
                    riskScore += 20;
                    factors.push('Uncontrolled Hypertension');
                } else {
                    riskScore += 10;
                    factors.push('History of Hypertension');
                }
            } else if (condition === 'Diabetes') {
                riskScore += 20;
                factors.push('Diabetes (Comorbidity Risk)');
            } else if (condition === 'Asthma') {
                if (input.symptoms.includes('Shortness of Breath') || input.symptoms.includes('Cough')) {
                    riskScore += 30;
                    factors.push('Asthma exacerbation likely');
                } else {
                    factors.push('History of Asthma');
                }
            } else {
                // Generic handling for "Other" conditions
                riskScore += 10;
                factors.push(`History of ${condition}`);
            }
        });
    }

    // --- 6. Symptom Analysis ---
    const criticalSymptoms = ['Chest Pain', 'Shortness of Breath', 'Severe Headache', 'Dizziness'];
    const moderateSymptoms = ['Fever', 'Cough', 'Fatigue', 'Nausea'];

    const reportedCritical = input.symptoms.filter(s => criticalSymptoms.includes(s));

    if (reportedCritical.length > 0) {
        riskScore += 75; // Ensuring High Risk for ANY critical symptom

        // Add detailed description per critical symptom
        reportedCritical.forEach(sym => {
            if (sym === 'Chest Pain') factors.push('CRITICAL: Chest Pain — Indicates possible cardiac event. Seek emergency care.');
            else if (sym === 'Shortness of Breath') factors.push('CRITICAL: Shortness of Breath — Respiratory distress. Could indicate asthma, COPD, or cardiac issue.');
            else if (sym === 'Severe Headache') factors.push('WARNING: Severe Headache — Could indicate neurological concern (migraine, stroke risk).');
            else if (sym === 'Dizziness') factors.push('WARNING: Dizziness — Circulatory or neurological issue. Monitor closely.');
        });

        // Contextual Risk escalation
        if (input.preExistingConditions.includes('Heart Disease') && reportedCritical.includes('Chest Pain')) {
            riskScore = 99; // Max risk
            factors.push('🚨 EMERGENCY: Heart Disease History + Chest Pain — Immediate hospital visit required.');
        }
        if (input.preExistingConditions.includes('Asthma') && reportedCritical.includes('Shortness of Breath')) {
            factors.push('⚠️ ALERT: Asthma + Shortness of Breath — Possible asthma attack. Use rescue inhaler and seek care.');
        }
    } else if (input.symptoms.some(s => moderateSymptoms.includes(s))) {
        riskScore += 30;
        // Add per-symptom detail for moderate symptoms too
        const reportedModerate = input.symptoms.filter(s => moderateSymptoms.includes(s));
        reportedModerate.forEach(sym => {
            if (sym === 'Fever') factors.push('Fever detected — Possible infection. Monitor temperature.');
            else if (sym === 'Cough') factors.push('Cough reported — Respiratory symptom. Could be viral or allergic.');
            else if (sym === 'Fatigue') factors.push('Fatigue reported — General weakness. Rest and hydrate.');
            else if (sym === 'Nausea') factors.push('Nausea reported — Digestive concern. Monitor for vomiting.');
        });
    }

    // --- 7. Specialist Recommendation ---
    let specialist = "General Physician";

    if (input.preExistingConditions.includes('Heart Disease') ||
        reportedCritical.includes('Chest Pain') ||
        input.systolicBP > 140 ||
        input.diastolicBP > 90 ||
        input.heartRate < 50 ||
        input.heartRate > 100) {
        specialist = "Cardiologist";
    } else if (input.preExistingConditions.includes('Asthma') ||
        input.symptoms.includes('Shortness of Breath') ||
        input.symptoms.includes('Cough')) {
        specialist = "Pulmonologist";
    } else if (input.preExistingConditions.includes('Diabetes')) { // Assuming Diabetes check or sugar level, simplified here
        specialist = "Endocrinologist";
    } else if (input.symptoms.includes('Severe Headache') ||
        input.symptoms.includes('Dizziness')) {
        specialist = "Neurologist";
    }

    // --- 8. Risk Breakdown Calculation ---
    const riskBreakdown: { label: string; amount: number }[] = [];

    // Recalculate component scores for breakdown (simulated since we summed them up)
    // In a real system, we'd sum these into variables first.
    // For now, we'll re-evaluate quickly to push to array.

    // BP
    if (input.systolicBP > 180 || input.diastolicBP > 120) riskBreakdown.push({ label: 'Hypertensive Crisis', amount: 80 });
    else if (input.systolicBP > 140 || input.diastolicBP > 90) riskBreakdown.push({ label: 'High Blood Pressure', amount: 40 });
    else if (input.systolicBP < 90 || input.diastolicBP < 60) riskBreakdown.push({ label: 'Low Blood Pressure', amount: 40 });

    // HR
    if (input.heartRate > 120) riskBreakdown.push({ label: 'Severe Tachycardia', amount: 50 });
    else if (input.heartRate > 100) riskBreakdown.push({ label: 'High Heart Rate', amount: 20 });
    else if (input.heartRate < 50) riskBreakdown.push({ label: 'Severe Bradycardia', amount: 75 });
    else if (input.heartRate < 60) riskBreakdown.push({ label: 'Low Heart Rate', amount: 15 });

    // Temp
    if (input.temperature > 39.0) riskBreakdown.push({ label: 'High Fever', amount: 60 });
    else if (input.temperature > 37.5) riskBreakdown.push({ label: 'Elevated Temp', amount: 30 });
    else if (input.temperature < 35.0) riskBreakdown.push({ label: 'Hypothermia Risk', amount: 60 });

    // Conditions
    input.preExistingConditions.forEach(condition => {
        if (condition === 'Heart Disease') riskBreakdown.push({ label: 'Heart Disease History', amount: 30 });
        else if (condition === 'Hypertension') riskBreakdown.push({ label: 'Hypertension History', amount: input.systolicBP > 130 ? 20 : 10 });
        else if (condition === 'Diabetes') riskBreakdown.push({ label: 'Diabetes', amount: 20 });
        else if (condition === 'Asthma') riskBreakdown.push({ label: 'Asthma History', amount: (input.symptoms.includes('Shortness of Breath') || input.symptoms.includes('Cough')) ? 30 : 0 });
        else riskBreakdown.push({ label: `History of ${condition}`, amount: 10 });
    });

    // Symptoms — Individual Critical Symptoms
    const criticalSymptomDetails: Record<string, { severity: string; amount: number }> = {
        'Chest Pain': { severity: '⚠️ Chest Pain — Possible cardiac event', amount: 75 },
        'Shortness of Breath': { severity: '⚠️ Shortness of Breath — Respiratory distress', amount: 60 },
        'Severe Headache': { severity: '⚠️ Severe Headache — Neurological concern', amount: 45 },
        'Dizziness': { severity: '⚠️ Dizziness — Circulatory / Neurological issue', amount: 40 },
    };

    const moderateSymptomDetails: Record<string, { severity: string; amount: number }> = {
        'Fever': { severity: 'Fever — Infection indicator', amount: 25 },
        'Cough': { severity: 'Cough — Respiratory symptom', amount: 15 },
        'Fatigue': { severity: 'Fatigue — General weakness', amount: 10 },
        'Nausea': { severity: 'Nausea — Digestive concern', amount: 15 },
    };

    // Add each reported critical symptom individually
    reportedCritical.forEach(sym => {
        const details = criticalSymptomDetails[sym];
        if (details) riskBreakdown.push({ label: details.severity, amount: details.amount });
    });

    // Contextual escalation
    if (input.preExistingConditions.includes('Heart Disease') && reportedCritical.includes('Chest Pain')) {
        riskBreakdown.push({ label: '🚨 Heart Disease + Chest Pain — MAX RISK', amount: 99 });
    }

    // Add each reported moderate symptom individually (only if no critical symptoms)
    if (reportedCritical.length === 0) {
        input.symptoms.forEach(sym => {
            const details = moderateSymptomDetails[sym];
            if (details) riskBreakdown.push({ label: details.severity, amount: details.amount });
        });
    }

    // Sort breakdown by highest impact first, remove zero-amount items
    const sortedBreakdown = riskBreakdown
        .filter(item => item.amount > 0)
        .sort((a, b) => b.amount - a.amount);

    // Normalize Score
    riskScore = Math.min(riskScore, 99);

    // Determine Output
    let prediction = "Healthy / Normal";
    let riskLevel: 'Low' | 'Medium' | 'High' = 'Low';
    let recommendation = "Maintain your healthy lifestyle. Regular checkups are recommended.";

    if (riskScore >= 70) {
        riskLevel = 'High';

        // Detailed Prediction Logic
        if (input.heartRate < 50) prediction = "High Risk: Severe Bradycardia";
        else if (input.heartRate > 120) prediction = "High Risk: Severe Tachycardia";
        else if (input.systolicBP > 180) prediction = "CRITICAL: Hypertensive Crisis";
        else if (input.preExistingConditions.includes('Heart Disease') && reportedCritical.includes('Chest Pain')) prediction = "CRITICAL: Potential Cardiac Event";
        else if (reportedCritical.includes('Chest Pain')) prediction = "High Risk: Potential Cardiac Event";
        else prediction = "High Health Risk Detected";

        recommendation = "IMMEDIATE medical attention required. Please visit a hospital or consult a specialist right away.";
    } else if (riskScore >= 35) {
        riskLevel = 'Medium';

        if (input.systolicBP > 140) prediction = "Risk of Hypertension";
        else if (input.systolicBP < 90) prediction = "Risk of Hypotension";
        else if (input.temperature > 37.5) prediction = "Potential Infection / Fever";
        else if (input.preExistingConditions.includes('Asthma') && input.symptoms.includes('Cough')) prediction = "Asthma Exacerbation Risk";
        else prediction = "Health Concern Detected";

        recommendation = "Consult a general practitioner soon. Monitor your vitals closely and rest.";
    }

    return {
        prediction,
        confidence: riskScore,
        riskLevel,
        contributingFactors: factors,
        recommendation,
        recommendedSpecialist: specialist,
        riskBreakdown: sortedBreakdown
    };
}
