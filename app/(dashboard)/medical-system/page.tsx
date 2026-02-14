"use client";

import React, { useState, useEffect } from 'react';
import {
    MdPerson,
    MdMedicalServices,
    MdHealthAndSafety,
    MdVisibility,
    MdCheckCircleOutline
} from 'react-icons/md';
import Link from 'next/link';
import { auth, db } from '../../../lib/firebase';
import { collection, query, where, getDocs, orderBy, doc, updateDoc } from 'firebase/firestore';
import { useUserData } from '../../../hooks/useUserData';
import { onAuthStateChanged } from 'firebase/auth';

export default function MedicalSystemScreen() {
    const { userData, loading: userLoading } = useUserData();
    const [symptoms, setSymptoms] = useState<any[]>([]);
    const [loadingSymptoms, setLoadingSymptoms] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                try {
                    const q = query(
                        collection(db, "symptoms"),
                        where("userId", "==", user.uid)
                    );

                    const querySnapshot = await getDocs(q);
                    const fetchedSymptoms = querySnapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data(),
                        timestamp: doc.data().timestamp?.toDate() || new Date()
                    }));

                    // Sort client-side to avoid composite index requirement
                    fetchedSymptoms.sort((a: any, b: any) => b.timestamp - a.timestamp);

                    setSymptoms(fetchedSymptoms);
                } catch (error: any) {
                    console.error("Error fetching symptoms:", error);
                    // Check for index error
                    if (error.message && error.message.includes("requires an index")) {
                        alert("System Update Required: Please open the browser console (F12) and click the link to create the required database index.");
                    }
                } finally {
                    setLoadingSymptoms(false);
                }
            } else {
                setLoadingSymptoms(false);
            }
        });
        return () => unsubscribe();
    }, []);

    const getRiskColor = (risk: string) => {
        switch (risk?.toUpperCase()) {
            case 'HIGH': return 'text-red-600 border-red-600 bg-red-50';
            case 'MEDIUM': return 'text-orange-600 border-orange-600 bg-orange-50';
            default: return 'text-green-600 border-green-600 bg-green-50';
        }
    };

    const handleMarkCured = async (id: string, e: React.MouseEvent) => {
        e.preventDefault(); // Prevent navigation if button is inside a link (it isn't here, but good practice)
        if (!confirm("Are you sure you want to mark this symptom as cured? It will be moved to history.")) return;

        try {
            const symptomRef = doc(db, "symptoms", id);
            await updateDoc(symptomRef, {
                cured: true,
                curedAt: new Date().toISOString()
            });

            // Update local state to reflect change immediately (move to history)
            setSymptoms(prev => prev.map(s =>
                s.id === id ? { ...s, cured: true } : s
            ));
        } catch (error) {
            console.error("Error marking as cured:", error);
            alert("Failed to update status");
        }
    };

    if (userLoading || loadingSymptoms) {
        return <div className="flex justify-center items-center h-screen">Loading...</div>;
    }

    // Fallback for user data if not yet set in profile
    const displayUser = {
        name: userData?.name || "User",
        email: userData?.email || auth.currentUser?.email || "",
        height: userData?.height || "-",
        weight: userData?.weight || "-",
        bmi: userData?.bmi || "-"
    };

    return (
        <div className="p-4 sm:p-6 max-w-2xl mx-auto w-full pb-32">
            {/* AppBar */}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-xl font-bold text-black/87">Medical System</h1>
                <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-full">
                    {/* Refresh Icon */}
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38" /></svg>
                </button>
            </div>

            {/* User Profile Card */}
            <div className="bg-white p-5 rounded-[20px] shadow-[0_2px_10px_rgba(0,0,0,0.05)] mb-6">
                <div className="flex items-center gap-4 mb-5">
                    <div className="w-[60px] h-[60px] rounded-full bg-[#1A1A1A]/10 flex items-center justify-center">
                        <MdPerson className="text-3xl text-[#1A1A1A]" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-black/87">{displayUser.name}</h2>
                        <div className="text-sm text-gray-600">{displayUser.email}</div>
                    </div>
                </div>

                <div className="h-px bg-gray-100 w-full mb-4" />

                <div className="flex items-center text-center">
                    <div className="flex-1">
                        <div className="text-lg font-bold text-black/87">{displayUser.height} cm</div>
                        <div className="text-xs text-gray-500">Height</div>
                    </div>
                    <div className="w-px h-8 bg-gray-200" />
                    <div className="flex-1">
                        <div className="text-lg font-bold text-black/87">{displayUser.weight} kg</div>
                        <div className="text-xs text-gray-500">Weight</div>
                    </div>
                    <div className="w-px h-8 bg-gray-200" />
                    <div className="flex-1">
                        <div className="text-lg font-bold text-black/87">{displayUser.bmi}</div>
                        <div className="text-xs text-gray-500">BMI</div>
                    </div>
                </div>
            </div>

            {/* Active Symptoms Label */}
            <div className="flex items-center gap-2 mb-4">
                <MdMedicalServices className="text-[#1A1A1A] text-xl" />
                <h2 className="text-lg font-bold text-black/87">Active Symptoms</h2>
            </div>

            {/* Active Symptoms List */}
            <div className="space-y-3 mb-8">
                {symptoms.filter(s => !s.cured).length === 0 ? (
                    <div className="bg-white p-6 rounded-[20px] shadow-sm flex flex-col items-center text-center border border-dashed border-gray-200">
                        <p className="text-sm text-gray-500">No active health issues.</p>
                    </div>
                ) : (
                    symptoms.filter(s => !s.cured).map((symptom) => (
                        <div key={symptom.id} className="bg-white p-4 rounded-[16px] shadow-[0_2px_8px_rgba(0,0,0,0.05)] hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-3">
                                <span className={`px-3 py-1 rounded-lg text-[10px] font-bold border ${getRiskColor(symptom.risk)}`}>
                                    {symptom.risk || 'UNKNOWN'} RISK
                                </span>
                                <span className="text-xs text-gray-500 font-medium">
                                    {symptom.timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                            </div>

                            <div className="text-sm font-semibold text-black/87 mb-4 line-clamp-2">
                                {symptom.symptom || 'No description'}
                            </div>

                            <div className="flex gap-2">
                                <Link
                                    href={`/medical-plan?id=${symptom.id}`}
                                    className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-gray-200 rounded-xl text-xs font-medium text-[#1A1A1A] hover:bg-gray-50 transition-colors"
                                >
                                    <MdVisibility className="text-base" />
                                    View Plan
                                </Link>
                                <button
                                    onClick={(e) => handleMarkCured(symptom.id, e)}
                                    className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-green-200 text-green-700 rounded-xl text-xs font-medium hover:bg-green-50 transition-colors"
                                >
                                    <MdCheckCircleOutline className="text-base" />
                                    Mark Cured
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Medical History Section */}
            {symptoms.filter(s => s.cured).length > 0 && (
                <>
                    <div className="flex items-center gap-2 mb-4 mt-8">
                        <MdCheckCircleOutline className="text-gray-400 text-xl" />
                        <h2 className="text-lg font-bold text-gray-600">Medical History</h2>
                    </div>

                    <div className="space-y-3 opacity-80">
                        {symptoms.filter(s => s.cured).map((symptom) => (
                            <div key={symptom.id} className="bg-gray-50 p-4 rounded-[16px] border border-gray-100">
                                <div className="flex justify-between items-center mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded">CURED</div>
                                        <span className="text-xs text-gray-400">
                                            {symptom.timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </span>
                                    </div>
                                    <Link href={`/medical-plan?id=${symptom.id}`} className="text-xs text-blue-600 font-medium hover:underline">
                                        View Past Plan
                                    </Link>
                                </div>
                                <div className="text-sm text-gray-600 font-medium">
                                    {symptom.symptom}
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

        </div>
    );
}
