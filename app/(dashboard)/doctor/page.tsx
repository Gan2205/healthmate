"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MdPerson, MdSearch, MdArrowForward, MdCheck, MdClose } from 'react-icons/md';
import { collection, query, where, getDocs, updateDoc, doc, addDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db, auth } from '../../../lib/firebase';
import { useUserData } from '../../../hooks/useUserData';

export default function DoctorDashboard() {
    const router = useRouter();
    const { userData, loading: userLoading } = useUserData();
    const [patients, setPatients] = useState<any[]>([]);
    const [loadingPatients, setLoadingPatients] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [appointments, setAppointments] = useState<any[]>([]);
    const [loadingAppointments, setLoadingAppointments] = useState(true);
    const [activeTab, setActiveTab] = useState('patients'); // 'patients', 'appointments', or 'requests'
    const [appointmentSubTab, setAppointmentSubTab] = useState<'upcoming' | 'completed'>('upcoming');
    const [connectionRequests, setConnectionRequests] = useState<any[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            if (!userData?.uid) return;

            try {
                // Fetch patients assigned to this doctor
                const qPatients = query(
                    collection(db, "users"),
                    where("assignedDoctorId", "==", userData.uid)
                );
                const patientsSnap = await getDocs(qPatients);
                const fetchedPatients = patientsSnap.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setPatients(fetchedPatients);

                // Fetch appointments for this doctor
                const qAppointments = query(
                    collection(db, "appointments"),
                    where("doctorId", "==", userData.uid)
                );
                const appointmentsSnap = await getDocs(qAppointments); // Note: Simple query, might need index for complex sorting
                const fetchedAppointments = appointmentsSnap.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                // Sort by date/time, then by Risk Level (High > Medium > Low)
                const riskOrder = { 'High': 3, 'Medium': 2, 'Low': 1, 'Unknown': 0 };

                fetchedAppointments.sort((a: any, b: any) => {
                    const dateA = new Date(`${a.date}T${convertTo24Hour(a.time)}`);
                    const dateB = new Date(`${b.date}T${convertTo24Hour(b.time)}`);

                    // Compare times first
                    const timeDiff = dateA.getTime() - dateB.getTime();
                    if (timeDiff !== 0) return timeDiff;

                    // If times are same (or very close), prioritize High Risk
                    const riskA = riskOrder[a.riskLevel as keyof typeof riskOrder] || 0;
                    const riskB = riskOrder[b.riskLevel as keyof typeof riskOrder] || 0;
                    return riskB - riskA; // Descending risk
                });

                setAppointments(fetchedAppointments);

            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setLoadingPatients(false);
                setLoadingAppointments(false);
            }
        };

        if (userData?.role === 'doctor') {
            fetchData();
        }
    }, [userData]);

    // Fetch connection requests
    useEffect(() => {
        const fetchRequests = async () => {
            if (!userData?.uid) return;
            try {
                const q = query(
                    collection(db, "connection_requests"),
                    where("doctorId", "==", userData.uid),
                    where("status", "==", "pending")
                );
                const snap = await getDocs(q);
                setConnectionRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch (e) {
                console.error("Error fetching connection requests:", e);
            }
        };
        if (userData?.role === 'doctor') {
            fetchRequests();
        }
    }, [userData]);

    const handleAcceptRequest = async (request: any) => {
        try {
            // Assign the patient to this doctor
            const patientRef = doc(db, "users", request.patientId);
            await updateDoc(patientRef, { assignedDoctorId: userData?.uid });

            // Update request status
            const reqRef = doc(db, "connection_requests", request.id);
            await updateDoc(reqRef, { status: "accepted" });

            // Send notification to patient
            await addDoc(collection(db, "notifications"), {
                userId: request.patientId,
                type: 'connection_accepted',
                title: 'Connection Accepted ✅',
                message: `Dr. ${userData?.name || 'Your doctor'} has accepted your connection request. You can now book appointments and share your health data.`,
                read: false,
                createdAt: Timestamp.now()
            });

            // Update local state
            setConnectionRequests((prev: any[]) => prev.filter(r => r.id !== request.id));
            setPatients((prev: any[]) => [...prev, { id: request.patientId, name: request.patientName, email: request.patientEmail }]);
            alert(`Accepted ${request.patientName}'s connection request.`);
        } catch (e) {
            console.error("Error accepting request:", e);
            alert("Failed to accept request.");
        }
    };

    const handleRejectRequest = async (request: any) => {
        try {
            const reqRef = doc(db, "connection_requests", request.id);
            await updateDoc(reqRef, { status: "rejected" });

            // Send notification to patient
            await addDoc(collection(db, "notifications"), {
                userId: request.patientId,
                type: 'connection_rejected',
                title: 'Connection Request Update',
                message: `Dr. ${userData?.name || 'The doctor'} was unable to accept your connection request at this time. Please try connecting with another doctor.`,
                read: false,
                createdAt: Timestamp.now()
            });

            setConnectionRequests((prev: any[]) => prev.filter(r => r.id !== request.id));
            alert(`Rejected ${request.patientName}'s connection request.`);
        } catch (e) {
            console.error("Error rejecting request:", e);
            alert("Failed to reject request.");
        }
    };

    // Helper to convert 12h to 24h for sorting
    const convertTo24Hour = (timeBtn: string) => {
        if (!timeBtn) return '00:00';
        const [time, modifier] = timeBtn.split(' ');
        let [hours, minutes] = time.split(':');
        if (hours === '12') {
            hours = '00';
        }
        if (modifier === 'PM') {
            hours = String(parseInt(hours, 10) + 12);
        }
        return `${hours}:${minutes}`;
    };

    const updateAppointmentStatus = async (appId: string, newStatus: string) => {
        try {
            await updateDoc(doc(db, "appointments", appId), { status: newStatus });

            // Optimistic update
            setAppointments((prev: any[]) => prev.map(app =>
                app.id === appId ? { ...app, status: newStatus } : app
            ));
        } catch (error) {
            console.error("Error updating status:", error);
            alert("Failed to update status");
        }
    };

    const getRiskBadgeColor = (risk: string) => {
        switch (risk) {
            case 'High': return 'bg-red-100 text-red-700 border-red-200';
            case 'Medium': return 'bg-orange-100 text-orange-700 border-orange-200';
            default: return 'bg-blue-50 text-blue-700 border-blue-100'; // Low or Unknown
        }
    };

    const filteredPatients = patients.filter(patient =>
        patient.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (userLoading || loadingPatients || loadingAppointments) {
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
                    <div className="text-3xl font-bold text-purple-600 mb-1">{appointments.filter(a => a.status === 'booked').length}</div>
                    <div className="text-xs text-gray-500 font-medium">Upcoming Appts</div>
                </div>
                {connectionRequests.length > 0 && (
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-orange-200">
                        <div className="text-3xl font-bold text-orange-600 mb-1">{connectionRequests.length}</div>
                        <div className="text-xs text-gray-500 font-medium">Pending Requests</div>
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-4 mb-6 border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('patients')}
                    className={`pb-2 px-1 text-sm font-bold transition-colors ${activeTab === 'patients' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    My Patients
                </button>
                <button
                    onClick={() => setActiveTab('appointments')}
                    className={`pb-2 px-1 text-sm font-bold transition-colors ${activeTab === 'appointments' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    Appointments
                </button>
                <button
                    onClick={() => setActiveTab('requests')}
                    className={`pb-2 px-1 text-sm font-bold transition-colors relative ${activeTab === 'requests' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    Requests
                    {connectionRequests.length > 0 && (
                        <span className="absolute -top-1 -right-4 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                            {connectionRequests.length}
                        </span>
                    )}
                </button>
            </div>

            {activeTab === 'patients' ? (
                <>
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
                </>
            ) : activeTab === 'requests' ? (
                /* Connection Requests */
                <div className="space-y-4">
                    {connectionRequests.length === 0 ? (
                        <div className="text-center py-10 text-gray-500">No pending connection requests</div>
                    ) : (
                        connectionRequests.map(req => (
                            <div key={req.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:border-orange-200 transition-colors">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center text-orange-600 font-bold text-lg">
                                            {req.patientName?.charAt(0) || <MdPerson />}
                                        </div>
                                        <div>
                                            <div className="font-bold text-black/87 text-lg">{req.patientName || 'Unknown'}</div>
                                            <div className="text-sm text-gray-500">{req.patientEmail}</div>
                                        </div>
                                    </div>
                                    <div className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-yellow-100 text-yellow-700">
                                        Pending
                                    </div>
                                </div>

                                <div className="text-xs text-gray-400 mb-4">
                                    Requested connection on {req.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown date'}
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleAcceptRequest(req)}
                                        className="flex-1 bg-green-600 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <MdCheck className="text-lg" /> Accept
                                    </button>
                                    <button
                                        onClick={() => handleRejectRequest(req)}
                                        className="flex-1 bg-white border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-bold hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <MdClose className="text-lg" /> Reject
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            ) : (
                /* Appointments List */
                <div>
                    {/* Sub-tabs */}
                    <div className="flex gap-2 mb-5">
                        <button
                            onClick={() => setAppointmentSubTab('upcoming')}
                            className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${appointmentSubTab === 'upcoming' ? 'bg-black text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                        >
                            Upcoming
                        </button>
                        <button
                            onClick={() => setAppointmentSubTab('completed')}
                            className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${appointmentSubTab === 'completed' ? 'bg-black text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                        >
                            Completed
                        </button>
                    </div>

                    <div className="space-y-4">
                        {appointments.filter(a => appointmentSubTab === 'upcoming' ? a.status === 'booked' : a.status === 'completed').length === 0 ? (
                            <div className="text-center py-10 text-gray-500">
                                {appointmentSubTab === 'upcoming' ? 'No upcoming appointments' : 'No completed appointments yet'}
                            </div>
                        ) : (
                            appointments.filter(a => appointmentSubTab === 'upcoming' ? a.status === 'booked' : a.status === 'completed').map(app => (
                                <div key={app.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:border-blue-200 transition-colors">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <div className="font-bold text-lg text-black/87 flex items-center gap-2">
                                                {app.patientName}
                                                {/* Risk Badge */}
                                                {app.riskLevel && (
                                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${getRiskBadgeColor(app.riskLevel)}`}>
                                                        {app.riskLevel} Risk
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-sm text-blue-600 font-medium">{app.visitType || 'General Visit'}</div>
                                        </div>
                                        <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${app.status === 'booked' ? 'bg-green-100 text-green-700' :
                                            app.status === 'completed' ? 'bg-gray-100 text-gray-500' :
                                                'bg-red-50 text-red-500'
                                            }`}>
                                            {app.status}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                                        <div className="flex items-center gap-1">
                                            <span className="font-bold">{app.date}</span> at <span className="font-bold">{app.time}</span>
                                        </div>
                                    </div>

                                    <div className="bg-gray-50 p-3 rounded-xl text-sm text-gray-700 mb-4">
                                        <span className="font-bold text-black/87 block mb-1">Reason:</span>
                                        {app.reason}

                                        {/* Link to AI Scan Report if available */}
                                        {app.aiScanId && (
                                            <div className="mt-3 pt-3 border-t border-gray-200">
                                                <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">AI Health Scan Report</div>
                                                <button
                                                    onClick={() => router.push(`/ai-scan-report?id=${app.aiScanId}`)}
                                                    className="text-purple-600 font-bold hover:underline flex items-center gap-1"
                                                >
                                                    View AI Scan Report <MdArrowForward />
                                                </button>
                                            </div>
                                        )}

                                        {/* Link to Medical Plan if available */}
                                        {app.scanId && (
                                            <div className={`${app.aiScanId ? 'mt-2' : 'mt-3 pt-3 border-t border-gray-200'}`}>
                                                <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Patient Medical Plan</div>
                                                <button
                                                    onClick={() => router.push(`/medical-plan?id=${app.scanId}`)}
                                                    className="text-blue-600 font-bold hover:underline flex items-center gap-1"
                                                >
                                                    View Medical Plan <MdArrowForward />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {app.status === 'booked' && (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => updateAppointmentStatus(app.id, 'completed')}
                                                className="flex-1 bg-black text-white py-2 rounded-lg text-sm font-bold hover:bg-gray-800 transition-colors"
                                            >
                                                Complete
                                            </button>
                                            <button
                                                onClick={() => updateAppointmentStatus(app.id, 'cancelled')}
                                                className="flex-1 bg-white border border-gray-200 text-gray-700 py-2 rounded-lg text-sm font-bold hover:bg-gray-50 transition-colors"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
