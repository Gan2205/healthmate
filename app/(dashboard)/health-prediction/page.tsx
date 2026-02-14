"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useUserData } from '../../../hooks/useUserData';
import { predictHealthStatus, PredictionResult } from '../../../lib/ml/predictionModel';
import { createModel, trainModel, predictWithTF, preprocessData } from '../../../lib/ml/tfModel';
import * as tf from '@tensorflow/tfjs';
import { MdHealthAndSafety, MdWarning, MdCheckCircle, MdInfo, MdScience, MdAutoGraph, MdMedicalServices } from 'react-icons/md';
import { db, auth } from '../../../lib/firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';

export default function HealthPredictionPage() {
    const { userData } = useUserData();

    // State for inputs
    const [age, setAge] = useState<number | ''>(30);
    const [gender, setGender] = useState<'Male' | 'Female'>('Male');
    const [systolicBP, setSystolicBP] = useState<number | ''>(120);
    const [diastolicBP, setDiastolicBP] = useState<number | ''>(80);
    const [heartRate, setHeartRate] = useState<number | ''>(72);
    const [temperature, setTemperature] = useState<number | ''>(98.6); // Default F
    const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);

    const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
    const [otherCondition, setOtherCondition] = useState('');

    // State for result
    const [result, setResult] = useState<PredictionResult | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // TF Model State
    const [tfModel, setTfModel] = useState<tf.Sequential | null>(null);
    const [trainingStatus, setTrainingStatus] = useState<string>('Initializing...');
    const [isModelReady, setIsModelReady] = useState(false);
    const [trainingProgress, setTrainingProgress] = useState(0);

    // Auto-fill from profile
    useEffect(() => {
        if (userData) {
            if (userData.age) setAge(parseInt(userData.age));
            if (userData.gender) setGender(userData.gender === 'Female' ? 'Female' : 'Male');
        }
    }, [userData]);

    // Train Model on Mount
    useEffect(() => {
        async function loadAndTrain() {
            try {
                setTrainingStatus("Loading synthetic dataset...");
                const response = await fetch('/health_dataset.json');
                const rawData = await response.json();

                setTrainingStatus("Preprocessing data...");
                const data = preprocessData(rawData);

                setTrainingStatus("Building Neural Network...");
                const model = createModel(data.inputs[0].length); // Input shape from data

                setTrainingStatus("Training AI Model in Browser...");

                await trainModel(model, data, (epoch, logs) => {
                    setTrainingProgress(Math.round(((epoch + 1) / 20) * 100)); // 20 epochs
                });

                setTfModel(model);
                setIsModelReady(true);
                setTrainingStatus("AI Model Ready");
            } catch (error) {
                console.error("TF Training Error:", error);
                setTrainingStatus("Model Training Failed");
            }
        }

        loadAndTrain();
    }, []);


    const handleSymptomToggle = (symptom: string) => {
        if (selectedSymptoms.includes(symptom)) {
            setSelectedSymptoms(prev => prev.filter(s => s !== symptom));
        } else {
            setSelectedSymptoms(prev => [...prev, symptom]);
        }
    };

    const handleConditionToggle = (condition: string) => {
        if (selectedConditions.includes(condition)) {
            setSelectedConditions(prev => prev.filter(c => c !== condition));
            if (condition === 'Others') setOtherCondition('');
        } else {
            setSelectedConditions(prev => [...prev, condition]);
        }
    };

    const handlePredict = async () => {
        // Validate inputs before prediction
        if (age === '' || systolicBP === '' || diastolicBP === '' || heartRate === '' || temperature === '') {
            alert("Please fill in all fields");
            return;
        }

        setIsAnalyzing(true);
        setResult(null);

        // Convert F to C for model
        const tempC = (Number(temperature) - 32) * (5 / 9);

        // 1. Get Rule-Based Result (for Explainability components)
        const ruleBasedResult = predictHealthStatus({
            age: Number(age),
            gender,
            systolicBP: Number(systolicBP),
            diastolicBP: Number(diastolicBP),
            heartRate: Number(heartRate),
            temperature: tempC,
            symptoms: selectedSymptoms,
            preExistingConditions: [
                ...selectedConditions.filter(c => c !== 'Others'),
                ...(selectedConditions.includes('Others') && otherCondition.trim() ? [otherCondition.trim()] : [])
            ]
        });

        // 2. Get TF Result (for actual Risk Score/Level)
        if (tfModel) {
            const tfResult = predictWithTF(tfModel, {
                age: Number(age),
                gender,
                systolicBP: Number(systolicBP),
                diastolicBP: Number(diastolicBP),
                heartRate: Number(heartRate),
                temperature: tempC,
                symptoms: selectedSymptoms,
                preExistingConditions: [
                    ...selectedConditions.filter(c => c !== 'Others'),
                    ...(selectedConditions.includes('Others') && otherCondition.trim() ? [otherCondition.trim()] : [])
                ]
            });

            // Merge Results
            // Use TF for: Confidence, Risk Level (Classification)
            // Use Rule-Based for: Recommendation, Contributing Factors (Explainability)

            // Map TF High/Medium/Low to prediction text
            let finalPrediction = ruleBasedResult.prediction; // Default to rule-based text

            // AI Prediction
            if (tfResult.riskLevel === 'High') finalPrediction = "High Health Risk Detected (AI)";
            else if (tfResult.riskLevel === 'Medium') finalPrediction = "Moderate Health Concern (AI)";
            else if (tfResult.riskLevel === 'Low') finalPrediction = "Healthy / Normal (AI)";

            // SAFETY OERRIDE: If Rule-Based says High/Critical, FORCE High Risk regardless of AI
            // This prevents "AI Hallucination" where it misses obvious critical signs
            if (ruleBasedResult.riskLevel === 'High') {
                tfResult.riskLevel = 'High';
                tfResult.confidence = Math.max(tfResult.confidence, 85); // Force high confidence
                finalPrediction = ruleBasedResult.prediction; // Use the specific rule-based warning (e.g. "CRITICAL: Asthma Attack")
            }


            setTimeout(() => {
                const finalResult = {
                    ...ruleBasedResult,
                    resultSource: 'TensorFlow.js',
                    confidence: tfResult.confidence,
                    riskLevel: tfResult.riskLevel as 'Low' | 'Medium' | 'High',
                    prediction: finalPrediction
                };
                setResult(finalResult);
                saveAIScan(finalResult);
                setIsAnalyzing(false);
            }, 800); // Small delay for UI effect

        } else {
            // Fallback if TF failed
            setTimeout(() => {
                setResult(ruleBasedResult);
                saveAIScan(ruleBasedResult);
                setIsAnalyzing(false);
            }, 1000);
        }
    };

    // Save AI Scan to Firestore
    const saveAIScan = async (scanResult: PredictionResult) => {
        if (!auth.currentUser) return;
        try {
            await addDoc(collection(db, "ai_scans"), {
                userId: auth.currentUser.uid,
                patientName: auth.currentUser.displayName || userData?.name || "Patient",
                timestamp: Timestamp.now(),
                // Vitals snapshot
                vitals: {
                    age: Number(age),
                    gender,
                    systolicBP: Number(systolicBP),
                    diastolicBP: Number(diastolicBP),
                    heartRate: Number(heartRate),
                    temperature: Number(temperature), // stored in F
                },
                symptoms: selectedSymptoms,
                preExistingConditions: [
                    ...selectedConditions.filter(c => c !== 'Others' && c !== 'None'),
                    ...(selectedConditions.includes('Others') && otherCondition.trim() ? [otherCondition.trim()] : [])
                ],
                // AI Result
                prediction: scanResult.prediction,
                riskLevel: scanResult.riskLevel,
                confidence: scanResult.confidence,
                contributingFactors: scanResult.contributingFactors,
                recommendation: scanResult.recommendation,
                recommendedSpecialist: scanResult.recommendedSpecialist || "General Physician",
                riskBreakdown: scanResult.riskBreakdown || [],
                resultSource: scanResult.resultSource || 'Rule-Based',
            });
        } catch (err) {
            console.error("Error saving AI scan:", err);
        }
    };

    const commonSymptomsList = [
        'Fever', 'Cough', 'Fatigue', 'Headache',
        'Chest Pain', 'Shortness of Breath', 'Dizziness', 'Nausea'
    ];

    const conditionsList = [
        'None', 'Hypertension', 'Diabetes', 'Asthma', 'Heart Disease', 'Others'
    ];

    return (
        <div className="p-6 max-w-4xl mx-auto pb-32">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-black/87 flex items-center gap-3">
                    <MdScience className="text-purple-600" />
                    AI Health Prediction
                </h1>
                <p className="text-gray-600 mt-2">
                    Enter your current vitals and symptoms. Our Neural Network will analyze them against 1000+ patient records.
                </p>

                {/* Model Status Indicator */}
                <div className="mt-4 flex items-center gap-3 bg-purple-50 p-3 rounded-lg border border-purple-100 w-fit">
                    <div className="relative">
                        <MdAutoGraph className={`text-xl ${isModelReady ? 'text-purple-600' : 'text-gray-400'}`} />
                        {!isModelReady && (
                            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-purple-500"></span>
                            </span>
                        )}
                    </div>
                    <div className="text-xs font-medium text-purple-900">
                        <div className="uppercase tracking-wider text-[10px] text-purple-500">Model Status</div>
                        {trainingStatus} {trainingProgress > 0 && trainingProgress < 100 && `(${trainingProgress}%)`}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Input Form */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-fit">
                    <h2 className="text-lg font-bold mb-6">Input Vitals</h2>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                            <input
                                type="number"
                                value={age}
                                onChange={(e) => setAge(e.target.value === '' ? '' : parseInt(e.target.value))}
                                className="w-full p-3 bg-gray-50 rounded-xl"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                            <select
                                value={gender}
                                onChange={(e) => setGender(e.target.value as any)}
                                className="w-full p-3 bg-gray-50 rounded-xl"
                            >
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Systolic BP</label>
                            <input
                                type="number"
                                value={systolicBP}
                                onChange={(e) => setSystolicBP(e.target.value === '' ? '' : parseInt(e.target.value))}
                                className="w-full p-3 bg-gray-50 rounded-xl"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Diastolic BP</label>
                            <input
                                type="number"
                                value={diastolicBP}
                                onChange={(e) => setDiastolicBP(e.target.value === '' ? '' : parseInt(e.target.value))}
                                className="w-full p-3 bg-gray-50 rounded-xl"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Heart Rate</label>
                            <input
                                type="number"
                                value={heartRate}
                                onChange={(e) => setHeartRate(e.target.value === '' ? '' : parseInt(e.target.value))}
                                className="w-full p-3 bg-gray-50 rounded-xl"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Temp (°F)</label>
                            <input
                                type="number"
                                value={temperature}
                                onChange={(e) => setTemperature(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                className="w-full p-3 bg-gray-50 rounded-xl"
                            />
                        </div>
                    </div>

                    <h3 className="text-sm font-bold mb-3">Pre-existing Conditions</h3>
                    <div className="flex flex-wrap gap-2 mb-6">
                        {conditionsList.map(cond => (
                            <button
                                key={cond}
                                onClick={() => handleConditionToggle(cond)}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${selectedConditions.includes(cond)
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                {cond}
                            </button>
                        ))}
                    </div>

                    {selectedConditions.includes('Others') && (
                        <div className="mb-6 animate-in fade-in slide-in-from-top-4 duration-300">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Please specify condition:</label>
                            <input
                                type="text"
                                value={otherCondition}
                                onChange={(e) => setOtherCondition(e.target.value)}
                                placeholder="E.g. Lupus, Migraine, Arthritis..."
                                className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all outline-none"
                            />
                        </div>
                    )}

                    <h3 className="text-sm font-bold mb-3">Symptoms</h3>
                    <div className="flex flex-wrap gap-2 mb-8">
                        {commonSymptomsList.map(sym => (
                            <button
                                key={sym}
                                onClick={() => handleSymptomToggle(sym)}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${selectedSymptoms.includes(sym)
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                {sym}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={handlePredict}
                        disabled={isAnalyzing || !isModelReady}
                        className="w-full bg-black text-white py-4 rounded-xl font-bold hover:bg-gray-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isAnalyzing ? (
                            <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : !isModelReady ? (
                            <>
                                <MdAutoGraph className="text-xl animate-pulse" />
                                Training Model ({trainingProgress}%)...
                            </>
                        ) : (
                            <>
                                <MdScience className="text-xl" />
                                Run AI Prediction
                            </>
                        )}
                    </button>
                </div>

                {/* Result Card */}
                <div>
                    {!result ? (
                        <div className="h-full flex flex-col items-center justify-center p-8 text-center text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                            <MdHealthAndSafety className="text-6xl mb-4 opacity-50" />
                            <p>Run the prediction model to see results here.</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
                            <div className={`p-6 ${result.riskLevel === 'High' ? 'bg-red-50' :
                                result.riskLevel === 'Medium' ? 'bg-orange-50' : 'bg-green-50'
                                }`}>
                                <div className="flex items-center gap-2 mb-2">
                                    {result.riskLevel === 'High' ? <MdWarning className="text-red-600 text-xl" /> :
                                        result.riskLevel === 'Medium' ? <MdInfo className="text-orange-600 text-xl" /> :
                                            <MdCheckCircle className="text-green-600 text-xl" />
                                    }
                                    <span className={`font-bold uppercase text-sm ${result.riskLevel === 'High' ? 'text-red-700' :
                                        result.riskLevel === 'Medium' ? 'text-orange-700' : 'text-green-700'
                                        }`}>
                                        {result.riskLevel} Risk
                                    </span>
                                </div>
                                <h2 className={`text-2xl font-bold ${result.riskLevel === 'High' ? 'text-red-900' :
                                    result.riskLevel === 'Medium' ? 'text-orange-900' : 'text-green-900'
                                    }`}>
                                    {result.prediction}
                                </h2>
                                <div className="mt-4 flex items-center gap-2">
                                    <div className="flex-1 h-2 bg-white rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full ${result.riskLevel === 'High' ? 'bg-red-500' :
                                                result.riskLevel === 'Medium' ? 'bg-orange-500' : 'bg-green-500'
                                                }`}
                                            style={{ width: `${result.confidence}%` }}
                                        />
                                    </div>
                                    <span className="text-xs font-bold text-gray-600">{result.confidence}% Confidence</span>
                                </div>
                                <p className="text-[10px] text-gray-500 mt-2 text-right">
                                    Powered by TensorFlow.js
                                </p>
                            </div>

                            <div className="p-6">
                                <h3 className="font-bold text-black/87 mb-3">Analysis</h3>

                                <div className="mb-6">
                                    <h4 className="text-sm text-gray-500 font-medium uppercase mb-3">Primary Risk Contributors</h4>

                                    {result.riskBreakdown && result.riskBreakdown.length > 0 ? (
                                        <ul className="space-y-3">
                                            {result.riskBreakdown.map((item, i) => (
                                                <li key={i} className="flex items-center justify-between text-sm">
                                                    <div className="flex items-center gap-2 text-gray-700">
                                                        <span className={`w-2 h-2 rounded-full shrink-0 ${item.amount >= 50 ? 'bg-red-500' :
                                                            item.amount >= 30 ? 'bg-orange-500' : 'bg-yellow-500'
                                                            }`} />
                                                        {item.label}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full ${item.amount >= 50 ? 'bg-red-500' :
                                                                    item.amount >= 30 ? 'bg-orange-500' : 'bg-yellow-500'
                                                                    }`}
                                                                style={{ width: `${Math.min(item.amount, 100)}%` }}
                                                            />
                                                        </div>
                                                        <span className={`text-xs font-bold ${item.amount >= 50 ? 'text-red-600' :
                                                            item.amount >= 30 ? 'text-orange-600' : 'text-gray-600'
                                                            }`}>
                                                            +{item.amount}%
                                                        </span>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : result.contributingFactors.length > 0 ? (
                                        /* Fallback for old/simple factors */
                                        <ul className="space-y-2">
                                            {result.contributingFactors.map((factor, i) => (
                                                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                                                    <span className="mt-1 w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                                                    {factor}
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-sm text-gray-500 italic">No significant specific triggers found, but overall metrics indicate risk level.</p>
                                    )}
                                </div>

                                <div className="p-4 bg-purple-50 rounded-xl mb-4 border border-purple-100">
                                    <h4 className="text-sm font-bold text-purple-900 mb-1 flex items-center gap-2">
                                        <MdMedicalServices className="text-lg" />
                                        Recommended Specialist
                                    </h4>
                                    <p className="text-sm text-purple-800">
                                        Based on your symptoms, we recommend consulting a <strong>{result.recommendedSpecialist || "General Physician"}</strong>.
                                    </p>
                                </div>

                                <div className="p-4 bg-gray-50 rounded-xl">
                                    <h4 className="text-sm font-bold text-black/87 mb-1">Recommendation</h4>
                                    <p className="text-sm text-gray-600 leading-relaxed">
                                        {result.recommendation}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
