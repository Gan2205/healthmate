"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MdPerson, MdSearch, MdArrowForward } from 'react-icons/md';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../../../lib/firebase';
import { useUserData } from '../../../hooks/useUserData';

export default function DoctorDashboard() {
    const router = useRouter();
    const { userData, loading: userLoading } = useUserData();
    const [patients, setPatients] = useState<any[]>([]);
    const [loadingPatients, setLoadingPatients] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        // Simple protection: Redirect if not doctor
        if (!userLoading && userData && userData.role !== 'doctor') {
            router.push('/dashboard');
        }
    }, [userData, userLoading, router]);

    useEffect(() => {
        const fetchPatients = async () => {
            if (!userData?.uid) return;

            try {
                // Fetch patients assigned to this doctor
                const q = query(
                    collection(db, "users"),
                    where("assignedDoctorId", "==", userData.uid)
                );

                const querySnapshot = await getDocs(q);
                const fetchedPatients = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setPatients(fetchedPatients);
            } catch (error) {
                console.error("Error fetching patients:", error);
            } finally {
                setLoadingPatients(false);
            }
        };

        if (userData?.role === 'doctor') {
            fetchPatients();
        }
    }, [userData]);

    const filteredPatients = patients.filter(patient =>
        patient.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (userLoading || loadingPatients) {
        return <div className="flex justify-center items-center h-screen">Loading...</div>;
    }

    if (userData?.role !== 'doctor') return null;

    return (
        <div className="p-4 sm:p-6 max-w-4xl mx-auto w-full pb-32">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-black/87">
                        Hello, Dr. {userData?.name}
                        {userData?.specialization && <span className="text-lg font-normal text-gray-500 ml-2">({userData.specialization})</span>}
                    </h1>
                    <p className="text-sm text-gray-600">Welcome to your dashboard</p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                    <div className="text-3xl font-bold text-blue-600 mb-1">{patients.length}</div>
                    <div className="text-xs text-gray-500 font-medium">Total Patients</div>
                </div>
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                    <div className="text-3xl font-bold text-purple-600 mb-1">0</div>
                    <div className="text-xs text-gray-500 font-medium">New Reports</div>
                </div>
            </div>

            {/* Search */}
            <div className="relative mb-6">
                <MdSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl" />
                <input
                    type="text"
                    placeholder="Search patients by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white pl-12 pr-4 py-4 rounded-xl border-none shadow-sm focus:ring-2 focus:ring-blue-500 outline-none text-sm placeholder:text-gray-400"
                />
            </div>

            {/* Patient List */}
            <h2 className="text-lg font-bold text-black/87 mb-4">Your Patients</h2>
            <div className="space-y-3">
                {filteredPatients.length === 0 ? (
                    <div className="text-center py-10 text-gray-500">No patients found</div>
                ) : (
                    filteredPatients.map(patient => (
                        <div
                            key={patient.id}
                            onClick={() => router.push(`/doctor/patient/${patient.id}`)}
                            className="bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer border border-gray-100 flex items-center justify-between group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold text-lg">
                                    {patient.name?.charAt(0) || <MdPerson />}
                                </div>
                                <div>
                                    <div className="font-bold text-black/87">{patient.name || 'Unknown'}</div>
                                    <div className="text-xs text-gray-500">{patient.email}</div>
                                </div>
                            </div>

                            <div className="flex items-center gap-6">
                                {/* Vitals Preview (if avail) */}
                                {patient.vitals && (
                                    <div className="hidden sm:flex gap-4 text-xs font-medium bg-gray-50 px-3 py-1.5 rounded-lg">
                                        <div className="flex items-center gap-1 text-blue-600">
                                            <span>Sug: {patient.vitals.sugarLevel || '-'}</span>
                                        </div>
                                        <div className="w-px h-3 bg-gray-300" />
                                        <div className="flex items-center gap-1 text-red-600">
                                            <span>HR: {patient.vitals.heartRate || '-'}</span>
                                        </div>
                                    </div>
                                )}
                                <MdArrowForward className="text-gray-300 group-hover:text-black transition-colors" />
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
