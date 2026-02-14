"use client";

import React from 'react';
import {
    MdMedicalServices,
    MdWarning,
    MdInfoOutline,
    MdCheckCircleOutline,
    MdWaterDrop,
    MdFavorite,
    MdHealthAndSafety,
    MdChatBubble
} from 'react-icons/md';
import Link from 'next/link';
import { useUserData } from '../../../hooks/useUserData';
import { auth, db } from '../../../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

export default function HomeScreen() {
    // Dummy data
    const { userData, loading } = useUserData();
    const username = userData?.name || auth.currentUser?.displayName || "User";
    // Vitals State
    const [sugarLevel, setSugarLevel] = React.useState("98");
    const [heartRate, setHeartRate] = React.useState("—");

    // Analysis State
    const [healthStatus, setHealthStatus] = React.useState<string>("GOOD");
    const [healthMessage, setHealthMessage] = React.useState("No recent symptoms recorded");
    const [isAnalyzing, setIsAnalyzing] = React.useState(false);

    // Initialize state from userData when available
    React.useEffect(() => {
        if (userData?.vitals) {
            if (userData.vitals.sugarLevel) setSugarLevel(userData.vitals.sugarLevel);
            if (userData.vitals.heartRate) setHeartRate(userData.vitals.heartRate);
        }
        // Load saved analysis if available (optional, can be added to user schema later)
        if (userData?.latestAnalysis) {
            setHealthStatus(userData.latestAnalysis.status);
            setHealthMessage(userData.latestAnalysis.message);
        }
    }, [userData]);

    const handleUpdateVital = async (field: 'sugarLevel' | 'heartRate', value: string) => {
        // Optimistic update
        if (field === 'sugarLevel') setSugarLevel(value);
        if (field === 'heartRate') setHeartRate(value);

        if (auth.currentUser) {
            try {
                const userRef = doc(db, "users", auth.currentUser.uid);
                await updateDoc(userRef, {
                    [`vitals.${field}`]: value
                });
            } catch (error) {
                console.error(`Error updating ${field}:`, error);
            }
        }
    };

    const handleAnalyzeHealth = async () => {
        if (!auth.currentUser) return;
        setIsAnalyzing(true);
        try {
            const response = await fetch('/api/gemini/vitals-analysis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sugarLevel,
                    heartRate,
                    userProfile: userData
                })
            });
            const data = await response.json();

            if (data.status) {
                setHealthStatus(data.status);
                setHealthMessage(data.message);

                // Save analysis to Firestore so it persists
                const userRef = doc(db, "users", auth.currentUser.uid);
                await updateDoc(userRef, {
                    latestAnalysis: data
                });
            }
        } catch (error) {
            console.error("Analysis failed", error);
            alert("Failed to analyze health data");
        } finally {
            setIsAnalyzing(false);
        }
    };

    // Helper to get colors based on status
    const getHealthColorStr = (status: string) => {
        switch (status.toUpperCase()) {
            case "LOW":
            case "GOOD":
                return "from-green-50 to-green-100";
            case "MEDIUM":
            case "AVERAGE":
                return "from-orange-50 to-orange-100";
            case "HIGH":
                return "from-red-50 to-red-100";
            default:
                return "from-gray-50 to-gray-100";
        }
    };

    const getHealthTextColor = (status: string) => {
        switch (status.toUpperCase()) {
            case "LOW":
            case "GOOD":
                return "text-green-700";
            case "MEDIUM":
            case "AVERAGE":
                return "text-orange-700";
            case "HIGH":
                return "text-red-700";
            default:
                return "text-gray-700";
        }
    };

    const getHealthIconColor = (status: string) => {
        switch (status.toUpperCase()) {
            case "LOW":
            case "GOOD":
                return "text-green-600";
            case "MEDIUM":
            case "AVERAGE":
                return "text-orange-600";
            case "HIGH":
                return "text-red-600";
            default:
                return "text-gray-600";
        }
    };

    return (
        <div className="p-4 sm:p-6 max-w-2xl mx-auto w-full">
            {/* AppBar / Header */}
            <div className="mb-6">
                <h1 className="text-xl font-bold text-black/87">
                    Hello, {username}
                </h1>
                <p className="text-xs text-gray-600">
                    How are you feeling today?
                </p>
            </div>

            {/* Health Status Card */}
            <div className={`mb-5 p-6 rounded-[20px] bg-gradient-to-br shadow-[0_4px_10px_rgba(0,0,0,0.1)] ${getHealthColorStr(healthStatus)}`}>
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-white/80 rounded-xl">
                        {healthStatus === "HIGH" ? (
                            <MdWarning className={`text-[28px] ${getHealthIconColor(healthStatus)}`} />
                        ) : healthStatus === "MEDIUM" ? (
                            <MdInfoOutline className={`text-[28px] ${getHealthIconColor(healthStatus)}`} />
                        ) : (
                            <MdCheckCircleOutline className={`text-[28px] ${getHealthIconColor(healthStatus)}`} />
                        )}
                    </div>
                    <div className="flex-1">
                        <div className="text-sm text-gray-700 font-medium mb-1">Health Status</div>
                        <div className={`text-2xl font-bold ${getHealthTextColor(healthStatus)}`}>
                            {healthStatus}
                        </div>
                    </div>
                </div>
                <div className="mt-4 text-sm text-gray-800 leading-relaxed font-medium">
                    {healthMessage}
                </div>
            </div>

            {/* Today's Vitals */}
            <div className="mb-5 p-6 bg-white rounded-[20px] shadow-[0_4px_10px_rgba(0,0,0,0.1)]">
                <div className="flex justify-between items-center mb-5">
                    <h2 className="text-lg font-bold text-black/87">Today&apos;s Vitals</h2>
                    <div className="flex items-center gap-2">
                        <button className="text-blue-600 p-1 hover:bg-blue-50 rounded-full">
                            {/* Refresh icon */}
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38" /></svg>
                        </button>
                        <MdFavorite className="text-red-400" />
                    </div>
                </div>

                <div className="flex gap-4">
                    {/* Sugar Level */}
                    <div className="flex-1 p-[18px] bg-gray-50 rounded-2xl border border-gray-200 flex items-center gap-3.5">
                        <div className="p-3 bg-white rounded-xl shadow-sm">
                            <MdWaterDrop className="text-[22px] text-indigo-600" />
                        </div>
                        <div className="flex-1">
                            <div className="text-[13px] text-gray-600 font-medium">Sugar Level</div>
                            <div className="flex items-center gap-1">
                                <input
                                    type="text"
                                    value={sugarLevel}
                                    onChange={(e) => handleUpdateVital('sugarLevel', e.target.value)}
                                    className="text-sm font-semibold text-black/87 bg-transparent border-b border-gray-300 focus:border-indigo-600 outline-none w-full max-w-[60px] p-0"
                                />
                                <span className="text-xs text-black/60 font-medium">mg/dL</span>
                            </div>
                        </div>
                    </div>

                    {/* Heart Rate */}
                    <div className="flex-1 p-[18px] bg-gray-50 rounded-2xl border border-gray-200 flex items-center gap-3.5">
                        <div className="p-3 bg-white rounded-xl shadow-sm">
                            <MdFavorite className="text-[22px] text-red-600" />
                        </div>
                        <div className="flex-1">
                            <div className="text-[13px] text-gray-600 font-medium">Heart Rate</div>
                            <div className="flex items-center gap-1">
                                <input
                                    type="text"
                                    value={heartRate}
                                    onChange={(e) => handleUpdateVital('heartRate', e.target.value)}
                                    className="text-sm font-semibold text-black/87 bg-transparent border-b border-gray-300 focus:border-red-600 outline-none w-full max-w-[50px] p-0"
                                />
                                <span className="text-xs text-black/60 font-medium">bpm</span>
                            </div>
                        </div>
                    </div>
                </div>

                <button
                    onClick={handleAnalyzeHealth}
                    disabled={isAnalyzing}
                    className="w-full mt-4 bg-[#1A1A1A] text-white py-3 rounded-xl font-bold text-sm hover:bg-black/90 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                >
                    {isAnalyzing ? (
                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <>
                            <MdHealthAndSafety className="text-lg" />
                            Analyze My Vitals
                        </>
                    )}
                </button>
            </div>

            {/* Quick Actions */}
            <div className="mb-4">
                <h2 className="text-xl font-bold text-black/87 mb-4">Quick Actions</h2>
                <div className="flex gap-3 mb-4">
                    {/* Symptom Check */}
                    <Link href="/symptom-check" className="flex-1 p-[22px] bg-blue-50 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.05)] hover:bg-blue-100 transition-colors">
                        <MdHealthAndSafety className="text-[34px] text-blue-600 mb-3.5" />
                        <div className="text-[17px] font-bold text-black/87">Symptom Check</div>
                        <div className="text-[13px] text-gray-600 mt-1.5">AI-powered analysis</div>
                    </Link>

                    {/* View Plan */}
                    <Link href="/medical-plan" className="flex-1 p-[22px] bg-green-50 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.05)] hover:bg-green-100 transition-colors">
                        <MdMedicalServices className="text-[34px] text-green-600 mb-3.5" />
                        <div className="text-[17px] font-bold text-black/87">View Plan</div>
                        <div className="text-[13px] text-gray-600 mt-1.5">Your medical plan</div>
                    </Link>
                </div>

                {/* AI Chat */}
                <Link href="/chat" className="block w-full p-[22px] bg-purple-50 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.05)] hover:bg-purple-100 transition-colors">
                    <MdChatBubble className="text-[34px] text-purple-600 mb-3.5" />
                    <div className="text-[17px] font-bold text-black/87">AI Medical Chat</div>
                    <div className="text-[13px] text-gray-600 mt-1.5">Chat with AI or upload medical images</div>
                </Link>
            </div>

            {/* Recent Activity */}
            <div className="mt-7 mb-4 flex justify-between items-center">
                <h2 className="text-xl font-bold text-black/87">Recent Activity</h2>
                <button className="text-blue-600 text-sm font-medium hover:underline">View All</button>
            </div>

            {/* Empty State for Recent Activity */}
            <div className="p-6 bg-white rounded-2xl flex flex-col items-center justify-center text-center shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
                <MdMedicalServices className="text-5xl text-gray-300 mb-3" />
                <div className="text-sm text-gray-600 mb-2">No symptoms recorded yet</div>
                <Link href="/symptom-check" className="flex items-center gap-2 bg-[#1A1A1A] text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-black/90 transition-colors mt-2">
                    <span className="text-lg">+</span> Check Symptoms
                </Link>
            </div>

        </div>
    );
}
