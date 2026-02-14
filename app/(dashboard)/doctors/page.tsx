"use client";

import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, Timestamp } from 'firebase/firestore';
import { db, auth } from '../../../lib/firebase';
import { useUserData } from '../../../hooks/useUserData';
import Link from 'next/link';
import { MdMedicalServices, MdLocationOn, MdStar, MdSearch, MdPersonAdd, MdCheck } from 'react-icons/md';

export default function DoctorsPage() {
    const { userData } = useUserData();
    const [doctors, setDoctors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [pendingRequests, setPendingRequests] = useState<any[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch Doctors
                const q = query(collection(db, "users"), where("role", "==", "doctor"));
                const querySnapshot = await getDocs(q);
                const docs = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setDoctors(docs);

                // Fetch Pending Requests
                if (auth.currentUser) {
                    const reqQ = query(
                        collection(db, "connection_requests"),
                        where("patientId", "==", auth.currentUser.uid),
                        where("status", "==", "pending")
                    );
                    const reqSnap = await getDocs(reqQ);
                    setPendingRequests(reqSnap.docs.map(d => ({ id: d.id, ...d.data() })));
                }
            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleSendConnectionRequest = async (doctorId: string, doctorName: string) => {
        if (!auth.currentUser) return;
        try {
            // Check if already pending (double check)
            if (pendingRequests.some(r => r.doctorId === doctorId)) return;

            await addDoc(collection(db, "connection_requests"), {
                patientId: auth.currentUser.uid,
                patientName: auth.currentUser.displayName || userData?.name || "Patient",
                patientEmail: auth.currentUser.email || userData?.email || "",
                doctorId: doctorId,
                doctorName: doctorName,
                status: "pending",
                createdAt: Timestamp.now()
            });

            // Update local state
            setPendingRequests(prev => [...prev, { doctorId, status: 'pending' }]);
            alert("Connection request sent!");
        } catch (error) {
            console.error("Error sending request:", error);
            alert("Failed to send request.");
        }
    };

    const filteredDoctors = doctors.filter(doctor =>
        doctor.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doctor.specialization?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doctor.hospitalName?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6 pb-32">
            <div className="flex flex-col gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-black/87">Find a Doctor</h1>
                    <p className="text-sm text-gray-500">Book appointments with top specialists</p>
                </div>

                {/* Search Bar */}
                <div className="relative">
                    <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xl" />
                    <input
                        type="text"
                        placeholder="Search by name, specialization, or hospital..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-black focus:ring-0 outline-none transition-all"
                    />
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 h-32 animate-pulse">
                            <div className="flex gap-4">
                                <div className="w-16 h-16 bg-gray-200 rounded-full"></div>
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : filteredDoctors.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                    <MdMedicalServices className="text-4xl mx-auto mb-2 text-gray-300" />
                    <p>No doctors found.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredDoctors.map((doctor) => {
                        const isPending = pendingRequests.some(r => r.doctorId === doctor.id);
                        const isConnected = userData?.assignedDoctorId === doctor.id;

                        return (
                            <div key={doctor.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all">
                                <div className="flex gap-4 mb-4">
                                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 shrink-0">
                                        <MdMedicalServices className="text-2xl" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-black/87">Dr. {doctor.name}</h3>
                                        <p className="text-blue-600 text-sm font-medium">{doctor.specialization || 'General Practitioner'}</p>
                                        <div className="flex items-center gap-1 text-gray-400 text-xs mt-1">
                                            <MdLocationOn />
                                            <span>{doctor.hospitalName || 'HealthMate Clinic'}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 border-t border-gray-50 pt-4">
                                    {/* Action Buttons */}
                                    {isConnected ? (
                                        <div className="flex-1 bg-green-50 text-green-700 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-1 cursor-default">
                                            <MdCheck className="text-lg" /> Connected
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => handleSendConnectionRequest(doctor.id, doctor.name)}
                                            disabled={isPending}
                                            className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-1 transition-colors ${isPending
                                                ? 'bg-yellow-50 text-yellow-700 cursor-not-allowed'
                                                : 'bg-white border border-gray-200 text-black hover:bg-gray-50'
                                                }`}
                                        >
                                            {isPending ? 'Pending...' : <><MdPersonAdd className="text-lg" /> Connect</>}
                                        </button>
                                    )}

                                    <Link
                                        href={`/book-appointment/${doctor.id}`}
                                        className="flex-1 bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors text-center"
                                    >
                                        Book Now
                                    </Link>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
