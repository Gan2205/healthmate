"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    MdHealthAndSafety,
    MdAnalytics,
    MdAddPhotoAlternate,
    MdClose,
    MdVisibility,
    MdLocalHospital,
    MdSchedule,
    MdShield,
    MdChecklist
} from 'react-icons/md';
import { auth, db } from '../../../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// Define interfaces for type safety
interface MedicalPlan {
    riskLevel: string;
    recommendation: string;
    consultation: { specialist: string; urgency: string };
    precautions: string[];
    treatmentPlan: string[];
}

export default function SymptomCheckScreen() {
    const router = useRouter();
    const [symptomText, setSymptomText] = useState('');
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [analysisComplete, setAnalysisComplete] = useState(false);
    const [medicalPlan, setMedicalPlan] = useState<MedicalPlan | null>(null);

    const handleImageSelect = () => {
        // Simulate image selection
        setSelectedImage("dummy_image_path");
    };

    const removeImage = () => {
        setSelectedImage(null);
    };

    const analyzeSymptoms = async () => {
        if (!symptomText.trim() && !selectedImage) {
            alert("Please describe your symptoms or add an image");
            return;
        }

        if (!auth.currentUser) {
            alert("You must be logged in to analyze symptoms");
            router.push('/login');
            return;
        }

        setLoading(true);

        try {
            // Step 1: AI Analysis
            const response = await fetch('/api/gemini/medical-plan', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    description: symptomText,
                    imageBase64: selectedImage
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to analyze symptoms');
            }

            const plan: MedicalPlan = data;
            setMedicalPlan(plan);
            setAnalysisComplete(true);

            // Step 2: Save to Firestore
            try {
                await addDoc(collection(db, "symptoms"), {
                    userId: auth.currentUser.uid,
                    symptom: symptomText,
                    description: symptomText,
                    timestamp: serverTimestamp(),
                    risk: plan.riskLevel,
                    medicalPlan: plan,
                    cured: false
                });
            } catch (firestoreError: any) {
                console.error("Firestore Error (non-fatal):", firestoreError);
                // We don't block the UI if saving fails, but alert the user
                alert("Analysis complete, but failed to save to history: " + firestoreError.message);
            }

        } catch (error: any) {
            console.error("Analysis Error:", error);
            alert(`Analysis Failed: ${error.message}. Please try again.`);
        } finally {
            setLoading(false);
        }
    };

    const getRiskColor = (risk: string) => {
        switch (risk.toUpperCase()) {
            case 'HIGH': return 'bg-red-600 text-white';
            case 'MEDIUM': return 'bg-orange-500 text-white';
            default: return 'bg-green-600 text-white';
        }
    };

    const getRiskBgClasses = (risk: string) => {
        switch (risk.toUpperCase()) {
            case 'HIGH': return 'bg-red-50 border-red-200';
            case 'MEDIUM': return 'bg-orange-50 border-orange-200';
            default: return 'bg-green-50 border-green-200';
        }
    };

    return (
        <div className="p-4 sm:p-6 max-w-2xl mx-auto w-full pb-32">
            {/* AppBar */}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-xl font-bold text-black/87">Symptom Check</h1>
            </div>

            {/* Header Section */}
            <div className="bg-white p-6 rounded-[20px] mb-6 flex flex-col items-center text-center shadow-[0_2px_10px_rgba(0,0,0,0.05)] border border-blue-50">
                <div className="p-4 bg-blue-50 rounded-full mb-4">
                    <MdHealthAndSafety className="text-4xl text-[#1A1A1A]" />
                </div>
                <h2 className="text-lg font-bold text-black/87 mb-2">Describe Your Symptoms</h2>
                <p className="text-sm text-gray-600 max-w-xs">
                    Our AI will analyze your symptoms and create a personalized medical plan
                </p>
            </div>

            {/* Input Section */}
            <div className="bg-white p-5 rounded-[20px] shadow-[0_2px_10px_rgba(0,0,0,0.05)] mb-6">
                <h3 className="text-base font-bold text-black/87 mb-3">What symptoms are you experiencing?</h3>

                <textarea
                    className="w-full min-h-[120px] p-4 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-[#1A1A1A] resize-none text-sm text-black placeholder:text-gray-400 outline-none transition-all"
                    placeholder="Example: I have been experiencing headaches, fever, and fatigue for the past 3 days..."
                    value={symptomText}
                    onChange={(e) => setSymptomText(e.target.value)}
                />

                <div className="mt-4 flex gap-3">
                    <button
                        onClick={handleImageSelect}
                        className="flex-1 flex items-center justify-center gap-2 py-3 border border-dashed border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 text-gray-600 transition-colors"
                    >
                        <MdAddPhotoAlternate className="text-lg" />
                        Add Image
                    </button>

                    {selectedImage && (
                        <div className="flex-[2] relative bg-gray-100 rounded-xl overflow-hidden h-12 flex items-center px-3 border border-gray-200">
                            <span className="text-xs text-gray-600 truncate font-medium">Image selected</span>
                            <button onClick={removeImage} className="absolute right-2 bg-black/60 text-white rounded-full p-1 hover:bg-black/80 transition-colors">
                                <MdClose className="text-xs" />
                            </button>
                        </div>
                    )}
                </div>

                <div className="mt-6">
                    <button
                        onClick={analyzeSymptoms}
                        disabled={loading}
                        className="w-full bg-[#1A1A1A] text-white py-4 rounded-[16px] font-bold text-base hover:bg-black/90 transition-all flex items-center justify-center gap-2 disabled:opacity-70 shadow-lg shadow-black/10"
                    >
                        {loading ? (
                            <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <MdAnalytics className="text-xl" />
                                Analyze Symptoms
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Results Section */}
            {analysisComplete && medicalPlan && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <MdChecklist className="text-xl text-[#1A1A1A]" />
                        <h3 className="text-lg font-bold text-black/87">Analysis Results</h3>
                    </div>

                    {/* Risk Level */}
                    <div className={`p-5 rounded-2xl border ${getRiskBgClasses(medicalPlan.riskLevel)}`}>
                        <div className="flex items-center gap-2 mb-3">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] tracking-wide font-bold uppercase ${getRiskColor(medicalPlan.riskLevel)}`}>
                                {medicalPlan.riskLevel} RISK
                            </span>
                        </div>
                        <p className="text-sm text-gray-800 leading-relaxed font-medium">
                            {medicalPlan.recommendation}
                        </p>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 gap-3">
                        <SummaryCard
                            icon={<MdLocalHospital className="text-2xl text-blue-500" />}
                            title="Specialist"
                            value={medicalPlan.consultation.specialist}
                        />
                        <SummaryCard
                            icon={<MdSchedule className="text-2xl text-orange-500" />}
                            title="Urgency"
                            value={medicalPlan.consultation.urgency}
                        />
                        <SummaryCard
                            icon={<MdShield className="text-2xl text-green-500" />}
                            title="Precautions"
                            value={`${medicalPlan.precautions.length} items`}
                        />
                        <SummaryCard
                            icon={<MdChecklist className="text-2xl text-purple-500" />}
                            title="Treatment Steps"
                            value={`${medicalPlan.treatmentPlan.length} steps`}
                        />
                    </div>

                    <button className="w-full bg-white border border-gray-200 text-[#1A1A1A] py-4 rounded-xl font-bold text-base hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 mt-4 shadow-sm">
                        <MdVisibility className="text-xl" />
                        View Complete Plan
                    </button>

                </div>
            )}

        </div>
    );
}

function SummaryCard({ icon, title, value }: { icon: React.ReactNode, title: string, value: string }) {
    return (
        <div className="bg-white p-4 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.05)] border border-gray-100 flex flex-col justify-center">
            <div className="mb-2 bg-gray-50 w-10 h-10 rounded-lg flex items-center justify-center">{icon}</div>
            <div className="text-xs text-gray-500 font-medium mb-1">{title}</div>
            <div className="text-sm font-bold text-black/87 leading-tight">{value}</div>
        </div>
    );
}
