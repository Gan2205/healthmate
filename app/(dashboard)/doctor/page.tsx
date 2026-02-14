"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MdPerson, MdSearch, MdArrowForward, MdCheck, MdClose, MdDescription, MdCalendarMonth, MdZoomIn } from 'react-icons/md';
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

    // Patient reports viewer state
    const [viewingPatientReports, setViewingPatientReports] = useState(false);
    const [patientReports, setPatientReports] = useState<any[]>([]);
    const [loadingReports, setLoadingReports] = useState(false);
    const [reportsPatientName, setReportsPatientName] = useState('');
    const [viewingReportImage, setViewingReportImage] = useState<any>(null);

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

    // Fetch patient reports for a specific patient
    const fetchPatientReports = async (patientId: string, patientName: string) => {
        setReportsPatientName(patientName);
        setViewingPatientReports(true);
        setLoadingReports(true);
        setPatientReports([]);
        try {
            const q = query(
                collection(db, "patient_reports"),
                where("userId", "==", patientId)
            );
            const snap = await getDocs(q);
            const docs = snap.docs.map(d => ({
                id: d.id,
                ...d.data()
            }));
            docs.sort((a: any, b: any) => {
                const dateA = new Date(a.reportDate || '').getTime();
                const dateB = new Date(b.reportDate || '').getTime();
                return dateB - dateA;
            });
            setPatientReports(docs);
        } catch (err) {
            console.error("Error fetching patient reports:", err);
        } finally {
            setLoadingReports(false);
        }
    };

    const formatReportDate = (dateStr: string) => {
        try {
            return new Date(dateStr).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short', year: 'numeric'
            });
        } catch { return dateStr; }
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
        <div className="p-4 sm:p-6 max-w-7xl mx-auto w-full animate-fade-in min-h-screen bg-doctor-dashboard">
            {/* Doctor Header - Elegant Gradient */}
            <div className="mb-8 bg-gradient-to-r from-teal-600 via-teal-700 to-indigo-700 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-xl shadow-teal-900/10">
                <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl -ml-10 -mb-10 pointer-events-none" />
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse" />
                            <span className="text-xs font-medium text-white/70 uppercase tracking-wider">Online</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                            Dr. {userData?.name}
                        </h1>
                        {userData?.specialization && (
                            <span className="inline-block mt-2 px-3 py-1 bg-white/15 backdrop-blur-sm rounded-lg text-sm font-medium text-white/90 border border-white/10">
                                {userData.specialization}
                            </span>
                        )}
                        <p className="text-sm text-white/60 mt-2">Welcome back to your dashboard</p>
                    </div>
                    <div className="hidden sm:flex items-center gap-3 bg-white/10 backdrop-blur-sm px-5 py-3 rounded-2xl border border-white/10">
                        <div className="text-center">
                            <div className="text-2xl font-bold">{patients.length}</div>
                            <div className="text-[10px] text-white/60 uppercase tracking-wider font-medium">Patients</div>
                        </div>
                        <div className="w-px h-8 bg-white/20" />
                        <div className="text-center">
                            <div className="text-2xl font-bold">{appointments.filter(a => a.status === 'booked').length}</div>
                            <div className="text-[10px] text-white/60 uppercase tracking-wider font-medium">Upcoming</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Cards - Mobile */}
            <div className="grid grid-cols-2 sm:hidden gap-4 mb-8">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 animate-slide-up" style={{ animationDelay: '0.1s' }}>
                    <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-teal-600 rounded-xl flex items-center justify-center mb-3 shadow-lg shadow-teal-200">
                        <MdPerson className="text-white text-lg" />
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{patients.length}</div>
                    <div className="text-xs text-gray-500 font-medium mt-0.5">Total Patients</div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 animate-slide-up" style={{ animationDelay: '0.15s' }}>
                    <div className="w-10 h-10 bg-gradient-to-br from-violet-400 to-violet-600 rounded-xl flex items-center justify-center mb-3 shadow-lg shadow-violet-200">
                        <MdArrowForward className="text-white text-lg" />
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{appointments.filter(a => a.status === 'booked').length}</div>
                    <div className="text-xs text-gray-500 font-medium mt-0.5">Upcoming</div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-xl w-fit animate-slide-up" style={{ animationDelay: '0.2s' }}>
                <button
                    onClick={() => setActiveTab('patients')}
                    className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${activeTab === 'patients' ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    My Patients
                </button>
                <button
                    onClick={() => setActiveTab('appointments')}
                    className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${activeTab === 'appointments' ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Appointments
                </button>
                <button
                    onClick={() => setActiveTab('requests')}
                    className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 relative ${activeTab === 'requests' ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Requests
                    {connectionRequests.length > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                            {connectionRequests.length}
                        </span>
                    )}
                </button>
            </div>

            {activeTab === 'patients' ? (
                <>
                    {/* Search */}
                    <div className="relative mb-6 animate-slide-up" style={{ animationDelay: '0.25s' }}>
                        <MdSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl" />
                        <input
                            type="text"
                            placeholder="Search patients by name or email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-white pl-12 pr-4 py-4 rounded-2xl border border-gray-200 shadow-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none text-sm placeholder:text-gray-400 transition-all"
                        />
                    </div>

                    {/* Patient List */}
                    <div className="space-y-3">
                        {filteredPatients.length === 0 ? (
                            <div className="bg-white p-12 rounded-3xl border border-dashed border-gray-300 text-center flex flex-col items-center">
                                <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mb-4">
                                    <MdPerson className="text-3xl text-teal-400" />
                                </div>
                                <h3 className="font-bold text-gray-900 mb-1">No patients found</h3>
                                <p className="text-sm text-gray-500">Patients will appear here once connected.</p>
                            </div>
                        ) : (
                            filteredPatients.map((patient, index) => (
                                <div
                                    key={patient.id}
                                    onClick={() => router.push(`/doctor/patient/${patient.id}`)}
                                    className="bg-white p-5 rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer border border-gray-100 flex items-center justify-between group animate-slide-up"
                                    style={{ animationDelay: `${0.05 * index}s` }}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-400 to-indigo-500 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-teal-200/50">
                                            {patient.name?.charAt(0) || <MdPerson />}
                                        </div>
                                        <div>
                                            <div className="font-bold text-gray-900">{patient.name || 'Unknown'}</div>
                                            <div className="text-xs text-gray-500">{patient.email}</div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6">
                                        {patient.vitals && (
                                            <div className="hidden sm:flex gap-4 text-xs font-medium bg-gray-50 px-4 py-2 rounded-xl border border-gray-100">
                                                <div className="flex items-center gap-1.5 text-teal-600">
                                                    <span className="w-1.5 h-1.5 bg-teal-400 rounded-full" />
                                                    <span>Sugar: {patient.vitals.sugarLevel || '-'}</span>
                                                </div>
                                                <div className="w-px h-4 bg-gray-200" />
                                                <div className="flex items-center gap-1.5 text-rose-600">
                                                    <span className="w-1.5 h-1.5 bg-rose-400 rounded-full" />
                                                    <span>HR: {patient.vitals.heartRate || '-'}</span>
                                                </div>
                                            </div>
                                        )}
                                        <MdArrowForward className="text-gray-300 group-hover:text-teal-600 group-hover:translate-x-1 transition-all" />
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
                        <div className="bg-white p-12 rounded-3xl border border-dashed border-gray-300 text-center flex flex-col items-center">
                            <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mb-4">
                                <MdPerson className="text-3xl text-amber-400" />
                            </div>
                            <h3 className="font-bold text-gray-900 mb-1">No pending requests</h3>
                            <p className="text-sm text-gray-500">New connection requests will appear here.</p>
                        </div>
                    ) : (
                        connectionRequests.map((req, index) => (
                            <div key={req.id} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-lg hover:border-amber-200 transition-all duration-300 animate-slide-up" style={{ animationDelay: `${0.05 * index}s` }}>
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-amber-200/50">
                                            {req.patientName?.charAt(0) || <MdPerson />}
                                        </div>
                                        <div>
                                            <div className="font-bold text-gray-900 text-lg">{req.patientName || 'Unknown'}</div>
                                            <div className="text-sm text-gray-500">{req.patientEmail}</div>
                                        </div>
                                    </div>
                                    <div className="px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 border border-amber-200">
                                        Pending
                                    </div>
                                </div>

                                <div className="text-xs text-gray-400 mb-5 pl-[4.5rem]">
                                    Requested on {req.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown date'}
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => handleAcceptRequest(req)}
                                        className="flex-1 bg-gradient-to-r from-teal-500 to-teal-600 text-white py-3 rounded-xl text-sm font-bold hover:from-teal-600 hover:to-teal-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-teal-200/50"
                                    >
                                        <MdCheck className="text-lg" /> Accept
                                    </button>
                                    <button
                                        onClick={() => handleRejectRequest(req)}
                                        className="flex-1 bg-white border border-gray-200 text-gray-700 py-3 rounded-xl text-sm font-bold hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all flex items-center justify-center gap-2"
                                    >
                                        <MdClose className="text-lg" /> Decline
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
                            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${appointmentSubTab === 'upcoming' ? 'bg-teal-600 text-white shadow-lg shadow-teal-200/50' : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                        >
                            Upcoming
                        </button>
                        <button
                            onClick={() => setAppointmentSubTab('completed')}
                            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${appointmentSubTab === 'completed' ? 'bg-teal-600 text-white shadow-lg shadow-teal-200/50' : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                        >
                            Completed
                        </button>
                    </div>

                    <div className="space-y-4">
                        {appointments.filter(a => appointmentSubTab === 'upcoming' ? a.status === 'booked' : a.status === 'completed').length === 0 ? (
                            <div className="bg-white p-12 rounded-3xl border border-dashed border-gray-300 text-center flex flex-col items-center">
                                <div className="w-16 h-16 bg-violet-50 rounded-full flex items-center justify-center mb-4">
                                    <MdArrowForward className="text-3xl text-violet-400" />
                                </div>
                                <h3 className="font-bold text-gray-900 mb-1">
                                    {appointmentSubTab === 'upcoming' ? 'No upcoming appointments' : 'No completed appointments yet'}
                                </h3>
                                <p className="text-sm text-gray-500">Appointments will show up here.</p>
                            </div>
                        ) : (
                            appointments.filter(a => appointmentSubTab === 'upcoming' ? a.status === 'booked' : a.status === 'completed').map((app, index) => (
                                <div key={app.id} className={`bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300 animate-slide-up border-l-4 ${app.riskLevel === 'High' ? 'border-l-red-500' : app.riskLevel === 'Medium' ? 'border-l-amber-500' : 'border-l-teal-500'}`} style={{ animationDelay: `${0.05 * index}s` }}>
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <div className="font-bold text-lg text-gray-900 flex items-center gap-2">
                                                {app.patientName}
                                                {app.riskLevel && (
                                                    <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase border ${getRiskBadgeColor(app.riskLevel)}`}>
                                                        {app.riskLevel} Risk
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-sm text-teal-600 font-medium">{app.visitType || 'General Visit'}</div>
                                        </div>
                                        <div className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider ${app.status === 'booked' ? 'bg-teal-50 text-teal-700 border border-teal-200' :
                                            app.status === 'completed' ? 'bg-gray-100 text-gray-500' :
                                                'bg-red-50 text-red-500'
                                            }`}>
                                            {app.status}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                                        <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg">
                                            <span className="font-bold">{app.date}</span> at <span className="font-bold">{app.time}</span>
                                        </div>
                                    </div>

                                    <div className="bg-gray-50 p-4 rounded-2xl text-sm text-gray-700 mb-4">
                                        <span className="font-bold text-gray-900 block mb-1">Reason:</span>
                                        {app.reason}

                                        {app.aiScanId && (
                                            <div className="mt-3 pt-3 border-t border-gray-200">
                                                <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">AI Health Scan Report</div>
                                                <button
                                                    onClick={() => router.push(`/ai-scan-report?id=${app.aiScanId}`)}
                                                    className="text-indigo-600 font-bold hover:underline flex items-center gap-1"
                                                >
                                                    View AI Scan Report <MdArrowForward />
                                                </button>
                                            </div>
                                        )}

                                        {app.scanId && (
                                            <div className={`${app.aiScanId ? 'mt-2' : 'mt-3 pt-3 border-t border-gray-200'}`}>
                                                <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Patient Medical Plan</div>
                                                <button
                                                    onClick={() => router.push(`/medical-plan?id=${app.scanId}`)}
                                                    className="text-teal-600 font-bold hover:underline flex items-center gap-1"
                                                >
                                                    View Medical Plan <MdArrowForward />
                                                </button>
                                            </div>
                                        )}

                                        {/* Patient Reports Link */}
                                        <div className={`${app.scanId || app.aiScanId ? 'mt-2' : 'mt-3 pt-3 border-t border-gray-200'}`}>
                                            <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Patient Uploaded Reports</div>
                                            <button
                                                onClick={() => fetchPatientReports(app.patientId, app.patientName)}
                                                className="text-amber-600 font-bold hover:underline flex items-center gap-1"
                                            >
                                                <MdDescription className="text-base" /> View Patient Reports <MdArrowForward />
                                            </button>
                                        </div>
                                    </div>

                                    {app.status === 'booked' && (
                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => updateAppointmentStatus(app.id, 'completed')}
                                                className="flex-1 bg-gradient-to-r from-teal-500 to-teal-600 text-white py-3 rounded-xl text-sm font-bold hover:from-teal-600 hover:to-teal-700 transition-all shadow-lg shadow-teal-200/50"
                                            >
                                                Complete
                                            </button>
                                            <button
                                                onClick={() => updateAppointmentStatus(app.id, 'cancelled')}
                                                className="flex-1 bg-white border border-gray-200 text-gray-700 py-3 rounded-xl text-sm font-bold hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all"
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

            {/* Patient Reports Modal */}
            {viewingPatientReports && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in" onClick={() => { setViewingPatientReports(false); setViewingReportImage(null); }}>
                    <div
                        className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl p-6 max-h-[85vh] overflow-y-auto animate-slide-up"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-5">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">{reportsPatientName}&apos;s Reports</h2>
                                <p className="text-xs text-gray-400">{patientReports.length} report{patientReports.length !== 1 ? 's' : ''} found</p>
                            </div>
                            <button onClick={() => { setViewingPatientReports(false); setViewingReportImage(null); }} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors">
                                <MdClose className="text-xl" />
                            </button>
                        </div>

                        {loadingReports ? (
                            <div className="text-center py-12">
                                <div className="w-8 h-8 border-2 border-gray-200 border-t-teal-600 rounded-full animate-spin mx-auto mb-3" />
                                <p className="text-sm text-gray-400">Loading reports...</p>
                            </div>
                        ) : patientReports.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <MdDescription className="text-2xl text-gray-300" />
                                </div>
                                <p className="font-bold text-gray-900">No reports uploaded</p>
                                <p className="text-xs text-gray-400 mt-1">This patient hasn&apos;t uploaded any medical reports yet.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {patientReports.map((report: any) => (
                                    <div key={report.id} className="bg-gray-50 rounded-2xl p-4 border border-gray-100 hover:bg-gray-100 transition-colors">
                                        <div className="flex items-center gap-3">
                                            {/* Thumbnail */}
                                            <button
                                                onClick={() => setViewingReportImage(report)}
                                                className="w-14 h-14 rounded-xl bg-white border border-gray-200 flex-shrink-0 overflow-hidden hover:border-teal-300 transition-colors relative group"
                                            >
                                                {report.imageBase64 ? (
                                                    <>
                                                        <img src={report.imageBase64} alt={report.reportName} className="w-full h-full object-cover" />
                                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                                                            <MdZoomIn className="text-white text-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                                                        </div>
                                                    </>
                                                ) : (
                                                    <MdDescription className="text-xl text-gray-300 m-auto" />
                                                )}
                                            </button>

                                            {/* Details */}
                                            <div className="flex-1 min-w-0">
                                                <div className="font-bold text-sm text-gray-900 truncate">{report.reportName}</div>
                                                <div className="text-xs text-teal-600 font-medium">{report.reportCategory}</div>
                                                <div className="flex items-center gap-1 mt-1 text-[11px] text-gray-400">
                                                    <MdCalendarMonth className="text-xs" />
                                                    {formatReportDate(report.reportDate)}
                                                </div>
                                            </div>

                                            {/* View button */}
                                            <button
                                                onClick={() => setViewingReportImage(report)}
                                                className="p-2 text-teal-500 hover:bg-teal-50 rounded-lg transition-colors"
                                                title="View full image"
                                            >
                                                <MdZoomIn className="text-lg" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Fullscreen Report Image */}
            {viewingReportImage && (
                <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4 animate-fade-in" onClick={() => setViewingReportImage(null)}>
                    <div className="relative max-w-3xl w-full max-h-[90vh]" onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => setViewingReportImage(null)}
                            className="absolute -top-12 right-0 text-white/80 hover:text-white bg-white/10 p-2 rounded-full transition-colors"
                        >
                            <MdClose className="text-2xl" />
                        </button>
                        <div className="text-white text-center mb-3">
                            <div className="font-bold">{viewingReportImage.reportName}</div>
                            <div className="text-xs text-white/60">{viewingReportImage.reportCategory} • {formatReportDate(viewingReportImage.reportDate)}</div>
                        </div>
                        <img
                            src={viewingReportImage.imageBase64}
                            alt={viewingReportImage.reportName}
                            className="w-full max-h-[75vh] object-contain rounded-2xl bg-white"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
