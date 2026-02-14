"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { MdArrowBack, MdMedicalServices, MdPerson, MdWarning, MdInfoOutline, MdCheckCircleOutline } from 'react-icons/md';
import { doc, getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../../../../lib/firebase';

export default function PatientDetailScreen() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;

    const [patient, setPatient] = useState<any>(null);
    const [symptoms, setSymptoms] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!id) return;
            try {
                // Fetch User Profile
                const userDoc = await getDoc(doc(db, "users", id));
                if (userDoc.exists()) {
                    setPatient(userDoc.data());
                }

                // Fetch Symptoms
                const q = query(collection(db, "symptoms"), where("userId", "==", id));
                const querySnapshot = await getDocs(q);
                const fetchedSymptoms = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    timestamp: doc.data().timestamp?.toDate() || new Date()
                }));
                fetchedSymptoms.sort((a: any, b: any) => b.timestamp - a.timestamp);
                setSymptoms(fetchedSymptoms);

            } catch (error) {
                console.error("Error fetching patient data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id]);

    const getRiskColor = (risk: string) => {
        switch (risk?.toUpperCase()) {
            case 'HIGH': return 'text-red-600 border-red-200 bg-red-50';
            case 'MEDIUM': return 'text-orange-600 border-orange-200 bg-orange-50';
            default: return 'text-green-600 border-green-200 bg-green-50';
        }
    };

    if (loading) return <div className="flex justify-center items-center h-screen">Loading...</div>;
    if (!patient) return <div className="p-6">Patient not found</div>;

    return (
        <div className="p-4 sm:p-6 max-w-4xl mx-auto w-full pb-32">
            <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-600 mb-6 hover:text-black">
                <MdArrowBack /> Back to Patients
            </button>

            {/* Profile Header */}
            <div className="bg-white p-6 rounded-[20px] shadow-sm mb-6 flex items-start gap-4">
                <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 text-2xl font-bold">
                    {patient.name?.charAt(0)}
                </div>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-black/87">{patient.name}</h1>
                    <p className="text-gray-500">{patient.email}</p>


                </div>
            </div>

            {/* Vitals Card */}
            <div className="bg-white p-6 rounded-[20px] shadow-sm mb-6">
                <h2 className="text-lg font-bold mb-4">Current Vitals</h2>
                <div className="flex gap-4">
                    <div className="flex-1 p-4 bg-gray-50 rounded-xl">
                        <div className="text-xs text-gray-500 mb-1">Sugar Level</div>
                        <div className="text-2xl font-bold text-blue-600">{patient.vitals?.sugarLevel || '-'} <span className="text-sm text-gray-400 font-medium">mg/dL</span></div>
                    </div>
                    <div className="flex-1 p-4 bg-gray-50 rounded-xl">
                        <div className="text-xs text-gray-500 mb-1">Heart Rate</div>
                        <div className="text-2xl font-bold text-red-600">{patient.vitals?.heartRate || '-'} <span className="text-sm text-gray-400 font-medium">bpm</span></div>
                    </div>
                </div>
            </div>

            {/* Medical History */}
            <h2 className="text-lg font-bold mb-4">Medical History</h2>
            <div className="space-y-3">
                {symptoms.map(symptom => (
                    <div key={symptom.id} className="bg-white p-5 rounded-[16px] shadow-[0_2px_8px_rgba(0,0,0,0.05)] border border-gray-100">
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-2">
                                {symptom.cured ? (
                                    <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[10px] font-bold">CURED</span>
                                ) : (
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getRiskColor(symptom.risk)}`}>
                                        {symptom.risk || 'ACTIVE'}
                                    </span>
                                )}
                                <span className="text-xs text-gray-500">
                                    {symptom.timestamp.toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                        <p className="text-sm font-semibold text-black/87 mb-2">{symptom.symptom}</p>
                        {symptom.medicalPlan && (
                            <div className="bg-gray-50 p-3 rounded-lg text-xs text-gray-600">
                                <span className="font-bold">Plan Recommendation:</span> {symptom.medicalPlan.recommendation}
                            </div>
                        )}
                    </div>
                ))}
                {symptoms.length === 0 && (
                    <div className="text-gray-500 text-center py-8">No medical history recorded.</div>
                )}
            </div>
        </div>
    );
}
