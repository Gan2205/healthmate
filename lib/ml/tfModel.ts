import * as tf from '@tensorflow/tfjs';

export interface HealthInput {
    age: number;
    gender: 'Male' | 'Female';
    systolicBP: number; // 90-180
    diastolicBP: number; // 60-120
    heartRate: number; // 40-120
    temperature: number; // 35-41
    symptoms: string[];
    preExistingConditions: string[];
}

export interface TrainingData {
    inputs: number[][];
    labels: number[][]; // One-hot encoded [Low, Medium, High]
}

// 1. Data Preprocessing
const encodeGender = (g: string) => (g === 'Male' ? 1 : 0);
const normalize = (val: number, min: number, max: number) => (val - min) / (max - min);

// Known conditions and symptoms for encoding (must match generator)
const REC_SYMPTOMS = ['Fever', 'Cough', 'Fatigue', 'Headache', 'Chest Pain', 'Shortness of Breath', 'Dizziness', 'Nausea'];
const REC_CONDITIONS = ['Hypertension', 'Diabetes', 'Asthma', 'Heart Disease'];

export function preprocessData(rawData: any[]): TrainingData {
    const inputs: number[][] = [];
    const labels: number[][] = [];

    rawData.forEach(record => {
        // Features
        const ageNorm = normalize(record.Age, 18, 90);
        const genderEnc = encodeGender(record.Gender);
        const sysNorm = normalize(record.BloodPressure.Systolic, 90, 180);
        const diaNorm = normalize(record.BloodPressure.Diastolic, 60, 120);
        const hrNorm = normalize(record.HeartRate, 40, 120);
        const tempNorm = normalize(record.Temperature, 35, 41);

        // One-hot Symptoms (8 slots)
        const symptomVector = REC_SYMPTOMS.map(s => record.Symptoms.includes(s) ? 1 : 0);

        // One-hot Conditions (4 slots)
        const conditionVector = REC_CONDITIONS.map(c => record.PreExistingConditions.includes(c) ? 1 : 0);

        // Custom condition "Others" - Simple binary flag if any OTHER condition exists
        const hasOtherCondition = record.PreExistingConditions.some((c: string) => !REC_CONDITIONS.includes(c)) ? 1 : 0;

        inputs.push([
            ageNorm, genderEnc, sysNorm, diaNorm, hrNorm, tempNorm,
            ...symptomVector,
            ...conditionVector,
            hasOtherCondition
        ]);

        // Label: One-hot encode risk (0, 1, 2)
        const label = record.Label; // 0, 1, 2
        const labelVector = [0, 0, 0];
        labelVector[label] = 1;
        labels.push(labelVector);
    });

    return { inputs, labels };
}


// 2. Model Definition
export function createModel(inputShape: number): tf.Sequential {
    const model = tf.sequential();

    // Input Layer + Hidden Layer 1
    model.add(tf.layers.dense({
        inputShape: [inputShape],
        units: 16,
        activation: 'relu'
    }));

    // Hidden Layer 2
    model.add(tf.layers.dense({
        units: 12,
        activation: 'relu'
    }));

    // Hidden Layer 3
    model.add(tf.layers.dense({
        units: 8,
        activation: 'relu'
    }));

    // Output Layer (3 Classes: Low, Medium, High)
    model.add(tf.layers.dense({
        units: 3,
        activation: 'softmax'
    }));

    model.compile({
        optimizer: tf.train.adam(0.01),
        loss: 'categoricalCrossentropy',
        metrics: ['accuracy']
    });

    return model;
}

// 3. Training Function
export async function trainModel(model: tf.Sequential, data: TrainingData, onEpochEnd?: (epoch: number, logs: any) => void) {
    const xs = tf.tensor2d(data.inputs);
    const ys = tf.tensor2d(data.labels);

    await model.fit(xs, ys, {
        epochs: 20,
        batchSize: 32,
        shuffle: true,
        callbacks: {
            onEpochEnd: (epoch, logs) => {
                if (onEpochEnd) onEpochEnd(epoch, logs);
            }
        }
    });

    xs.dispose();
    ys.dispose();
    return model;
}

// 4. Prediction Function
export function predictWithTF(model: tf.Sequential, input: HealthInput) {
    // Similar preprocessing for single input
    const ageNorm = normalize(input.age, 18, 90);
    const genderEnc = encodeGender(input.gender);
    const sysNorm = normalize(input.systolicBP, 90, 180);
    const diaNorm = normalize(input.diastolicBP, 60, 120);
    const hrNorm = normalize(input.heartRate, 40, 120);
    const tempNorm = normalize(input.temperature, 35, 41);

    const symptomVector = REC_SYMPTOMS.map(s => input.symptoms.includes(s) ? 1 : 0);
    const conditionVector = REC_CONDITIONS.map(c => input.preExistingConditions.includes(c) ? 1 : 0);
    const hasOtherCondition = input.preExistingConditions.some(c => !REC_CONDITIONS.includes(c)) ? 1 : 0;

    const inputData = [
        ageNorm, genderEnc, sysNorm, diaNorm, hrNorm, tempNorm,
        ...symptomVector,
        ...conditionVector,
        hasOtherCondition
    ];

    const inputTensor = tf.tensor2d([inputData]);
    const prediction = model.predict(inputTensor) as tf.Tensor;
    const values = prediction.dataSync(); // Float32Array [prob_low, prob_med, prob_high]

    inputTensor.dispose();
    prediction.dispose();

    // Find max probability index
    const maxProb = Math.max(...values);
    const classIndex = values.indexOf(maxProb);

    const riskLevels = ['Low', 'Medium', 'High'];
    const riskLevel = riskLevels[classIndex];
    const confidence = Math.round(maxProb * 100);

    return {
        riskLevel,
        confidence,
        rawProbabilities: values
    };
}
