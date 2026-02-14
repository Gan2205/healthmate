"use client";

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
    MdArrowBack,
    MdLocalHospital,
    MdSchedule,
    MdShield,
    MdChecklist,
    MdMedicalServices
} from 'react-icons/md';
import Link from 'next/link';
import { db } from '../../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

function MedicalPlanContent() {
    const searchParams = useSearchParams();
    const id = searchParams.get('id');
    const [plan, setPlan] = React.useState<any>(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState('');

    React.useEffect(() => {
        const fetchPlan = async () => {
            if (!id) {
                setError("No plan ID provided");
                setLoading(false);
                return;
            }

            try {
                const docRef = doc(db, "symptoms", id);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    // Maps Firestore data to component state
                    // logic handles both nested 'medicalPlan' object structure or direct fields if structure varies
                    const medicalData = data.medicalPlan || data;

                    setPlan({
                        ...medicalData,
                        riskLevel: data.risk || medicalData.riskLevel,
                        timestamp: data.timestamp?.toDate() || new Date()
                    });
                } else {
                    setError("Plan not found");
                }
            } catch (err) {
                console.error("Error fetching plan:", err);
                setError("Failed to load plan");
            } finally {
                setLoading(false);
            }
        };

        fetchPlan();
    }, [id]);

    const getRiskColor = (risk: string) => {
        switch (risk?.toUpperCase()) {
            case 'HIGH': return 'bg-red-600 text-white';
            case 'MEDIUM': return 'bg-orange-500 text-white';
            default: return 'bg-green-600 text-white';
        }
    };

    if (loading) return <div className="flex justify-center items-center h-screen">Loading Plan...</div>;
    if (error) return (
        <div className="p-6 text-center">
            <h2 className="text-xl font-bold text-red-600 mb-4">{error}</h2>
            <Link href="/medical-system" className="text-blue-600 underline">Go Back</Link>
        </div>
    );
    if (!plan) return null;

    return (
        <div className="p-4 sm:p-6 max-w-2xl mx-auto w-full pb-32">
            {/* AppBar */}
            <div className="flex items-center gap-4 mb-6">
                <Link href="/medical-system" className="p-2 -ml-2 text-black/87 hover:bg-gray-100 rounded-full">
                    <MdArrowBack className="text-2xl" />
                </Link>
                <h1 className="text-xl font-bold text-black/87">Medical Plan</h1>
            </div>

            {/* Timestamp */}
            <div className="text-sm text-gray-500 mb-4 text-center">
                Generated on {plan.timestamp?.toLocaleDateString()} at {plan.timestamp?.toLocaleTimeString()}
            </div>

            {/* Risk Level */}
            <div className="bg-white p-6 rounded-[20px] shadow-[0_2px_10px_rgba(0,0,0,0.05)] mb-6 text-center">
                <span className={`inline-block px-4 py-1.5 rounded-full text-xs font-bold mb-4 ${getRiskColor(plan.riskLevel)}`}>
                    {plan.riskLevel} RISK
                </span>
                <p className="text-base text-gray-800 leading-relaxed font-medium">
                    {plan.recommendation}
                </p>
            </div>

            {/* Consultation Details */}
            {plan.consultation && (
                <div className="mb-6">
                    <h2 className="text-lg font-bold text-black/87 mb-4">Consultation Required</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-blue-50 p-5 rounded-[20px] flex items-center gap-4">
                            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
                                <MdLocalHospital className="text-2xl text-blue-600" />
                            </div>
                            <div>
                                <div className="text-xs text-gray-500 font-medium">Specialist</div>
                                <div className="text-sm font-bold text-black/87">{plan.consultation.specialist}</div>
                            </div>
                        </div>

                        <div className="bg-orange-50 p-5 rounded-[20px] flex items-center gap-4">
                            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
                                <MdSchedule className="text-2xl text-orange-600" />
                            </div>
                            <div>
                                <div className="text-xs text-gray-500 font-medium">Urgency</div>
                                <div className="text-sm font-bold text-black/87">{plan.consultation.urgency}</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Treatment Plan */}
            {plan.treatmentPlan && (
                <div className="mb-6">
                    <div className="flex items-center gap-2 mb-4">
                        <MdMedicalServices className="text-xl text-[#1A1A1A]" />
                        <h2 className="text-lg font-bold text-black/87">Treatment Plan</h2>
                    </div>
                    <div className="bg-white rounded-[20px] shadow-[0_2px_10px_rgba(0,0,0,0.05)] overflow-hidden">
                        {plan.treatmentPlan.map((step: any, index: number) => (
                            <div key={index} className="p-4 border-b border-gray-100 last:border-none flex gap-4">
                                <div className="w-6 h-6 rounded-full bg-[#1A1A1A] text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                                    {index + 1}
                                </div>
                                <div className="text-sm text-gray-800 font-medium leading-relaxed">
                                    {typeof step === 'string' ? step : step.description}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Precautions */}
            {plan.precautions && (
                <div>
                    <div className="flex items-center gap-2 mb-4">
                        <MdShield className="text-xl text-[#1A1A1A]" />
                        <h2 className="text-lg font-bold text-black/87">Precautions</h2>
                    </div>
                    <div className="bg-white rounded-[20px] shadow-[0_2px_10px_rgba(0,0,0,0.05)] overflow-hidden">
                        {plan.precautions.map((precaution: any, index: number) => (
                            <div key={index} className="p-4 border-b border-gray-100 last:border-none flex gap-3 items-center">
                                <MdChecklist className="text-green-500 text-xl flex-shrink-0" />
                                <div className="text-sm text-gray-800 font-medium">
                                    {typeof precaution === 'string' ? precaution : precaution.description}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

        </div>
    );
}

export default function MedicalPlanScreen() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-screen">Loading...</div>}>
            <MedicalPlanContent />
        </Suspense>
    );
}
