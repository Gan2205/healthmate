const fs = require('fs');
const path = require('path');

const NUM_SAMPLES = 1000;

// Data Generators
const firstNames = ['John', 'Jane', 'Michael', 'Emily', 'Chris', 'Sarah', 'David', 'Laura', 'James', 'Emma', 'Robert', 'Olivia', 'William', 'Sophia', 'Joseph', 'Isabella'];
const lastNames = ['Smith', 'Johnson', 'Brown', 'Williams', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
const genders = ['Male', 'Female'];
const commonSymptoms = ['None', 'Fever', 'Cough', 'Fatigue', 'Headache', 'Chest Pain', 'Shortness of Breath', 'Dizziness', 'Nausea'];
const conditions = ['None', 'None', 'None', 'Hypertension', 'Diabetes', 'Asthma', 'Heart Disease'];

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function generatePatient() {
    const gender = getRandomItem(genders);
    const age = getRandomInt(18, 90);

    // Correlate vitals with age and conditions for realism
    let condition = getRandomItem(conditions);

    // Adjust vitals based on condition
    let systolicBP = getRandomInt(90, 130);
    let diastolicBP = getRandomInt(60, 85);
    let heartRate = getRandomInt(60, 100);
    let temperature = Number((Math.random() * (37.5 - 36.1) + 36.1).toFixed(1)); // Normal range
    let symptoms = [];

    // Force realism
    if (condition === 'Hypertension' || Math.random() > 0.9) {
        systolicBP = getRandomInt(140, 180);
        diastolicBP = getRandomInt(90, 110);
        if (Math.random() > 0.5) symptoms.push('Headache');
    }

    if (condition === 'Heart Disease') {
        heartRate = getRandomInt(90, 120);
        if (Math.random() > 0.5) symptoms.push('Chest Pain');
        if (Math.random() > 0.5) symptoms.push('Shortness of Breath');
    }

    if (condition === 'Asthma') {
        if (Math.random() > 0.3) symptoms.push('Shortness of Breath'); // 70% chance
        if (Math.random() > 0.3) symptoms.push('Cough');
    }

    if (Math.random() > 0.8) { // Fever chance
        temperature = Number((Math.random() * (40.0 - 37.8) + 37.8).toFixed(1));
        symptoms.push('Fever');
        symptoms.push('Fatigue');
    }

    if (symptoms.length === 0 || Math.random() > 0.7) {
        const randomSym = getRandomItem(commonSymptoms);
        if (randomSym !== 'None' && !symptoms.includes(randomSym)) {
            symptoms.push(randomSym);
        }
    }

    if (symptoms.length === 0) symptoms.push('None');

    // Determine Risk Label (Ground Truth)
    let riskScore = 0;

    if (systolicBP > 140 || diastolicBP > 90) riskScore += 40;
    if (systolicBP > 180 || diastolicBP > 120) riskScore += 80;
    if (heartRate > 100) riskScore += 20;
    if (heartRate > 120) riskScore += 50;
    if (heartRate < 60) riskScore += 10;
    if (heartRate < 50) riskScore += 75;
    if (temperature > 37.5) riskScore += 30;
    if (temperature > 39.0) riskScore += 60;

    // Condition-Specific Risk Logic
    if (condition === 'Heart Disease') {
        riskScore += 30;
        if (symptoms.includes('Chest Pain')) riskScore += 60; // Critical
        if (symptoms.includes('Shortness of Breath')) riskScore += 40;
    }

    if (condition === 'Hypertension') {
        riskScore += 20;
        if (systolicBP > 160 || diastolicBP > 100) riskScore += 30; // Severe
        if (symptoms.includes('Chest Pain')) riskScore += 60; // Emergency
        if (symptoms.includes('Headache') && systolicBP > 150) riskScore += 40; // Hypertensive Urgency
    }

    if (condition === 'Diabetes') {
        riskScore += 20;
        if (symptoms.includes('Dizziness')) riskScore += 30;
        if (symptoms.includes('Fever')) riskScore += 30; // Infection risk
    }

    // Critical Combination: Asthma + Shortness of Breath
    if (condition === 'Asthma') {
        riskScore += 10;
        if (symptoms.includes('Shortness of Breath')) riskScore += 80; // Critical
        if (symptoms.includes('Cough')) riskScore += 20;
    }

    // Universal Critical Symptoms (if not already handled)
    if (symptoms.includes('Chest Pain')) {
        riskScore += 70; // High Risk regardless of other factors
    } else if (symptoms.includes('Shortness of Breath') && riskScore < 50) {
        riskScore += 40; // Ensure at least Medium/High if combined with anything
    }


    let label = 0; // Low
    let riskLevel = 'Low';

    if (riskScore >= 70) {
        label = 2; // High
        riskLevel = 'High';
    } else if (riskScore >= 35) {
        label = 1; // Medium
        riskLevel = 'Medium';
    }

    return {
        id: Math.random().toString(36).substr(2, 9),
        Name: `${getRandomItem(firstNames)} ${getRandomItem(lastNames)}`,
        Gender: gender,
        Age: age,
        Symptoms: [...new Set(symptoms)], // Remove duplicates
        BloodPressure: { Systolic: systolicBP, Diastolic: diastolicBP },
        HeartRate: heartRate,
        Temperature: temperature,
        PreExistingConditions: [condition !== 'None' ? condition : null].filter(Boolean),
        RiskLevel: riskLevel,
        Label: label
    };
}

const dataset = [];
for (let i = 0; i < NUM_SAMPLES; i++) {
    dataset.push(generatePatient());
}

const outputPath = path.join(__dirname, '../public/health_dataset.json');
fs.writeFileSync(outputPath, JSON.stringify(dataset, null, 2));

console.log(`Successfully generated ${NUM_SAMPLES} patient records at ${outputPath}`);
