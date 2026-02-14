"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
    MdArrowBack,
    MdMedicalServices,
    MdWarning,
    MdCheckCircle,
    MdInfo,
    MdScience,
} from 'react-icons/md';
import { db } from '../../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

function ScanReportContent() {
    const searchParams = useSearchParams();
    const id = searchParams.get('id');
    const [scan, setScan] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchScan = async () => {
            if (!id) {
                setError("No scan ID provided");
                setLoading(false);
                return;
            }
            try {
                const docRef = doc(db, "ai_scans", id);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setScan({
                        ...data,
                        timestamp: data.timestamp?.toDate() || new Date()
                    });
                } else {
                    setError("Scan report not found");
                }
            } catch (err) {
                console.error("Error fetching scan:", err);
                setError("Failed to load scan report");
            } finally {
                setLoading(false);
            }
        };
        fetchScan();
    }, [id]);

    const getRiskColor = (risk: string) => {
        switch (risk?.toUpperCase()) {
            case 'HIGH': return 'bg-red-600 text-white';
            case 'MEDIUM': return 'bg-orange-500 text-white';
            default: return 'bg-green-600 text-white';
        }
    };

    const getBarColor = (amount: number) => {
        if (amount >= 50) return 'bg-red-500';
        if (amount >= 30) return 'bg-orange-500';
        return 'bg-yellow-500';
    };

    const getTextColor = (amount: number) => {
        if (amount >= 50) return 'text-red-600';
        if (amount >= 30) return 'text-orange-600';
        return 'text-gray-600';
    };

    if (loading) return <div className="flex justify-center items-center h-screen">Loading Scan Report...</div>;
    if (error) return (
        <div className="p-6 text-center">
            <h2 className="text-xl font-bold text-red-600 mb-4">{error}</h2>
            <Link href="/dashboard" className="text-blue-600 underline">Go Back</Link>
        </div>
    );
    if (!scan) return null;

    return (
        <div className="p-4 sm:p-6 max-w-2xl mx-auto w-full pb-32">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <button onClick={() => window.history.back()} className="p-2 -ml-2 text-black/87 hover:bg-gray-100 rounded-full">
                    <MdArrowBack className="text-2xl" />
                </button>
                <h1 className="text-xl font-bold text-black/87">AI Health Scan Report</h1>
            </div>

            {/* Timestamp & Source */}
            <div className="flex justify-between items-center text-sm text-gray-500 mb-4">
                <span>Generated on {scan.timestamp?.toLocaleDateString()} at {scan.timestamp?.toLocaleTimeString()}</span>
                <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-full text-xs font-bold">
                    <MdScience className="text-sm" /> {scan.resultSource || 'AI'}
                </span>
            </div>

            {/* Risk Level & Prediction */}
            <div className="bg-white p-6 rounded-[20px] shadow-[0_2px_10px_rgba(0,0,0,0.05)] mb-6 text-center">
                <span className={`inline-block px-4 py-1.5 rounded-full text-xs font-bold mb-4 ${getRiskColor(scan.riskLevel)}`}>
                    {scan.riskLevel} RISK
                </span>
                <p className="text-lg font-bold text-black/87 mb-2">{scan.prediction}</p>
                <p className="text-sm text-gray-600 leading-relaxed">{scan.recommendation}</p>
            </div>

            {/* Vitals Snapshot */}
            {scan.vitals && (
                <div className="mb-6">
                    <h2 className="text-lg font-bold text-black/87 mb-3">Vitals at Time of Scan</h2>
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-white p-3 rounded-xl shadow-sm text-center border border-gray-100">
                            <div className="text-xs text-gray-500 mb-1">Blood Pressure</div>
                            <div className="text-lg font-bold text-black/87">{scan.vitals.systolicBP}/{scan.vitals.diastolicBP}</div>
                            <div className="text-[10px] text-gray-400">mmHg</div>
                        </div>
                        <div className="bg-white p-3 rounded-xl shadow-sm text-center border border-gray-100">
                            <div className="text-xs text-gray-500 mb-1">Heart Rate</div>
                            <div className="text-lg font-bold text-red-600">{scan.vitals.heartRate}</div>
                            <div className="text-[10px] text-gray-400">bpm</div>
                        </div>
                        <div className="bg-white p-3 rounded-xl shadow-sm text-center border border-gray-100">
                            <div className="text-xs text-gray-500 mb-1">Temperature</div>
                            <div className="text-lg font-bold text-orange-600">{scan.vitals.temperature}</div>
                            <div className="text-[10px] text-gray-400">°F</div>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-3">
                        <div className="bg-white p-3 rounded-xl shadow-sm text-center border border-gray-100">
                            <div className="text-xs text-gray-500 mb-1">Age</div>
                            <div className="text-lg font-bold text-black/87">{scan.vitals.age}</div>
                        </div>
                        <div className="bg-white p-3 rounded-xl shadow-sm text-center border border-gray-100">
                            <div className="text-xs text-gray-500 mb-1">Gender</div>
                            <div className="text-lg font-bold text-black/87">{scan.vitals.gender}</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Symptoms & Conditions */}
            <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {scan.symptoms && scan.symptoms.length > 0 && (
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="text-sm font-bold text-black/87 mb-2">Reported Symptoms</h3>
                        <div className="flex flex-wrap gap-1.5">
                            {scan.symptoms.map((s: string, i: number) => (
                                <span key={i} className="px-2 py-1 bg-red-50 text-red-700 text-xs font-medium rounded-full">{s}</span>
                            ))}
                        </div>
                    </div>
                )}
                {scan.preExistingConditions && scan.preExistingConditions.length > 0 && (
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="text-sm font-bold text-black/87 mb-2">Pre-existing Conditions</h3>
                        <div className="flex flex-wrap gap-1.5">
                            {scan.preExistingConditions.map((c: string, i: number) => (
                                <span key={i} className="px-2 py-1 bg-purple-50 text-purple-700 text-xs font-medium rounded-full">{c}</span>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Risk Breakdown */}
            {scan.riskBreakdown && scan.riskBreakdown.length > 0 && (
                <div className="mb-6">
                    <h2 className="text-lg font-bold text-black/87 mb-3">Risk Breakdown</h2>
                    <div className="bg-white rounded-[20px] shadow-sm p-4 border border-gray-100">
                        <ul className="space-y-3">
                            {scan.riskBreakdown.map((item: any, i: number) => (
                                <li key={i} className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2 text-gray-700">
                                        <span className={`w-2 h-2 rounded-full shrink-0 ${getBarColor(item.amount)}`} />
                                        {item.label}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                            <div className={`h-full rounded-full ${getBarColor(item.amount)}`}
                                                style={{ width: `${Math.min(item.amount, 100)}%` }} />
                                        </div>
                                        <span className={`text-xs font-bold ${getTextColor(item.amount)}`}>
                                            +{item.amount}%
                                        </span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            {/* Contributing Factors */}
            {scan.contributingFactors && scan.contributingFactors.length > 0 && (
                <div className="mb-6">
                    <h2 className="text-lg font-bold text-black/87 mb-3">Contributing Factors</h2>
                    <div className="bg-white rounded-[20px] shadow-sm overflow-hidden border border-gray-100">
                        {scan.contributingFactors.map((factor: string, i: number) => (
                            <div key={i} className="p-3 border-b border-gray-50 last:border-none flex gap-3 items-start">
                                <MdInfo className="text-blue-500 shrink-0 mt-0.5" />
                                <span className="text-sm text-gray-700">{factor}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Specialist Recommendation */}
            {scan.recommendedSpecialist && (
                <div className="p-5 bg-purple-50 rounded-[20px] border border-purple-100">
                    <h3 className="text-sm font-bold text-purple-900 mb-1 flex items-center gap-2">
                        <MdMedicalServices className="text-lg" />
                        Recommended Specialist
                    </h3>
                    <p className="text-sm text-purple-800">
                        Based on the analysis, a <strong>{scan.recommendedSpecialist}</strong> consultation is recommended.
                    </p>
                </div>
            )}
        </div>
    );
}

export default function AIScanReportPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-screen">Loading...</div>}>
            <ScanReportContent />
        </Suspense>
    );
}
