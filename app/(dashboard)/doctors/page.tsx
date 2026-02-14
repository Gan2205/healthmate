"use client";

import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, Timestamp } from 'firebase/firestore';
import { db, auth } from '../../../lib/firebase';
import { useUserData } from '../../../hooks/useUserData';
import Link from 'next/link';
import { MdMedicalServices, MdLocationOn, MdStar, MdSearch, MdPersonAdd, MdCheck, MdSchool, MdCheckCircle, MdPerson } from 'react-icons/md';

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
        <div className="p-4 sm:p-6 max-w-7xl mx-auto w-full animate-fade-in">
            {/* Header & Search */}
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-black/87 tracking-tight">Find a Doctor</h1>
                    <p className="text-sm text-gray-500 mt-1">Connect with specialists for your health needs</p>
                </div>

                <div className="relative w-full md:w-96">
                    <MdSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl" />
                    <input
                        type="text"
                        placeholder="Search by name, specialization, or hospital..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all shadow-sm"
                    />
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
                </div>
            ) : filteredDoctors.length === 0 ? (
                <div className="bg-white p-12 rounded-3xl border border-dashed border-gray-300 text-center flex flex-col items-center justify-center">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                        <MdPerson className="text-3xl text-gray-400" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">No doctors found</h3>
                    <p className="text-gray-500">Try adjusting your search terms.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredDoctors.map((doctor, index) => {
                        const isConnected = userData?.assignedDoctorId === doctor.id;
                        const isPending = pendingRequests.some(req => req.doctorId === doctor.id);

                        return (
                            <div
                                key={doctor.id}
                                className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col animate-slide-up"
                                style={{ animationDelay: `${index * 0.05}s` }}
                            >
                                <div className="flex items-start gap-4 mb-4">
                                    <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center text-gray-500 shrink-0">
                                        <MdPerson className="text-3xl" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-gray-900 leading-tight mb-1">Dr. {doctor.name}</h3>
                                        <div className="text-sm font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md inline-block mb-1">
                                            {doctor.specialization || 'General Practitioner'}
                                        </div>
                                        <p className="text-xs text-gray-500">{doctor.hospitalName}</p>
                                    </div>
                                </div>

                                <div className="space-y-2 text-sm text-gray-600 mb-6 flex-1">
                                    <div className="flex items-center gap-2">
                                        <MdSchool className="text-gray-400" />
                                        <span>{doctor.study || 'MBBS'}</span>
                                    </div>
                                    {doctor.email && (
                                        <div className="flex items-center gap-2">
                                            <span className="w-4 flex justify-center text-gray-400 font-bold">@</span>
                                            <span className="truncate">{doctor.email}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-3 mt-auto">
                                    <Link
                                        href={`/book-appointment/${doctor.id}`}
                                        className="col-span-1 bg-black text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-800 transition-colors flex items-center justify-center"
                                    >
                                        Book
                                    </Link>

                                    {isConnected ? (
                                        <button disabled className="col-span-1 bg-green-50 text-green-700 px-4 py-2.5 rounded-xl text-sm font-bold border border-green-100 flex items-center justify-center gap-1 cursor-default">
                                            <MdCheckCircle className="text-green-500" /> Connected
                                        </button>
                                    ) : isPending ? (
                                        <button disabled className="col-span-1 bg-yellow-50 text-yellow-700 px-4 py-2.5 rounded-xl text-sm font-bold border border-yellow-100 flex items-center justify-center cursor-default">
                                            Pending...
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleSendConnectionRequest(doctor.id, doctor.name)}
                                            className="col-span-1 bg-white border border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-50 transition-colors flex items-center justify-center"
                                        >
                                            Connect
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
