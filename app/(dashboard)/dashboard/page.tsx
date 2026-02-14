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
    MdChatBubble,
    MdCalendarMonth,
    MdAccessTime,
    MdNotifications,
    MdClose,
    MdDescription
} from 'react-icons/md';
import { collection, query, where, getDocs, addDoc, Timestamp } from 'firebase/firestore';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUserData } from '../../../hooks/useUserData';
import { auth, db } from '../../../lib/firebase';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import VoiceAssistant from '../../../components/VoiceAssistant';

export default function HomeScreen() {
    // Dummy data
    const router = useRouter();
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
    const [doctors, setDoctors] = React.useState<any[]>([]);
    const [loadingDoctors, setLoadingDoctors] = React.useState(true);
    const [notifications, setNotifications] = React.useState<any[]>([]);
    const [pendingRequests, setPendingRequests] = React.useState<any[]>([]);

    React.useEffect(() => {
        if (userData?.role === 'doctor') {
            router.push('/doctor');
        }

        if (userData?.vitals) {
            if (userData.vitals.sugarLevel) setSugarLevel(userData.vitals.sugarLevel);
            if (userData.vitals.heartRate) setHeartRate(userData.vitals.heartRate);
        }
        // Load saved analysis if available
        if (userData?.latestAnalysis) {
            setHealthStatus(userData.latestAnalysis.status);
            setHealthMessage(userData.latestAnalysis.message);
        }

        // Fetch Doctors
        const fetchDoctors = async () => {
            try {
                const q = query(collection(db, "users"), where("role", "==", "doctor"));
                const querySnapshot = await getDocs(q);
                const docs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setDoctors(docs);
            } catch (e) {
                console.error("Error fetching doctors", e);
            } finally {
                setLoadingDoctors(false);
            }
        };
        fetchDoctors();

    }, [userData, router]);

    // Fetch notifications for the current user
    React.useEffect(() => {
        const fetchNotifications = async () => {
            if (!auth.currentUser) return;
            try {
                const q = query(
                    collection(db, "notifications"),
                    where("userId", "==", auth.currentUser.uid),
                    where("read", "==", false)
                );
                const snap = await getDocs(q);
                const notifs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                // Sort by createdAt desc
                notifs.sort((a: any, b: any) => (b.createdAt?.toDate?.()?.getTime() || 0) - (a.createdAt?.toDate?.()?.getTime() || 0));
                setNotifications(notifs);
            } catch (e) {
                console.error("Error fetching notifications:", e);
            }
        };
        fetchNotifications();

        // Fetch pending connection requests
        const fetchPendingRequests = async () => {
            if (!auth.currentUser) return;
            try {
                const q = query(
                    collection(db, "connection_requests"),
                    where("patientId", "==", auth.currentUser.uid),
                    where("status", "==", "pending")
                );
                const snap = await getDocs(q);
                setPendingRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch (e) {
                console.error("Error fetching pending requests:", e);
            }
        };
        fetchPendingRequests();

    }, [userData, router]);

    const handleSendConnectionRequest = async (doctorId: string, doctorName: string) => {
        if (!auth.currentUser) return;
        try {
            // Check if a pending request already exists
            const existingQ = query(
                collection(db, "connection_requests"),
                where("patientId", "==", auth.currentUser.uid),
                where("doctorId", "==", doctorId),
                where("status", "==", "pending")
            );
            const existingSnap = await getDocs(existingQ);
            if (!existingSnap.empty) {
                alert("You already have a pending request with this doctor.");
                return;
            }

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
            alert("Connection request sent! The doctor will review your request.");
        } catch (error) {
            console.error("Error sending connection request:", error);
            alert("Failed to send connection request.");
        }
    };

    const handleAssignDoctor = async (doctorId: string | null) => {
        if (!auth.currentUser) return;
        try {
            const userRef = doc(db, "users", auth.currentUser.uid);
            await updateDoc(userRef, {
                assignedDoctorId: doctorId
            });
            // Force reload or optimistic update (useUserData should handle it if it listens, but standard hook might need reload)
            window.location.reload();
        } catch (error) {
            console.error("Error assigning doctor:", error);
        }
    };

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
        <div className="p-4 sm:p-6 max-w-7xl mx-auto w-full animate-fade-in min-h-screen bg-patient-dashboard">
            {/* Patient Header - Warm Gradient */}
            <div className="mb-8 bg-gradient-to-r from-blue-600 via-violet-600 to-purple-600 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-xl shadow-violet-900/10">
                <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-400/10 rounded-full blur-3xl -ml-10 -mb-10 pointer-events-none" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse" />
                            <span className="text-xs font-medium text-white/70 uppercase tracking-wider">
                                {loading ? '...' : (userData?.role || 'Patient')}
                            </span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                            Hello, {username}
                        </h1>
                        <p className="text-sm text-white/60 mt-2">
                            How are you feeling today?
                        </p>
                    </div>

                    {/* Vitals Summary Pill (Desktop) */}
                    <div className="hidden md:flex items-center gap-6 bg-white/10 backdrop-blur-sm px-6 py-3 rounded-2xl border border-white/10 transition-all hover:bg-white/15">
                        <div className="flex items-center gap-3">
                            <MdWaterDrop className="text-blue-300 text-lg" />
                            <div className="flex flex-col">
                                <span className="text-[10px] text-white/60 font-medium uppercase tracking-wider">Sugar</span>
                                <div className="flex items-baseline gap-1">
                                    <input
                                        type="number"
                                        value={sugarLevel}
                                        onChange={(e) => handleUpdateVital('sugarLevel', e.target.value)}
                                        className="w-12 font-bold text-white bg-transparent outline-none border-b border-transparent hover:border-blue-300/50 focus:border-blue-300 transition-colors p-0 text-base"
                                    />
                                    <span className="text-white/50 font-normal text-xs">mg/dL</span>
                                </div>
                            </div>
                        </div>
                        <div className="w-px h-8 bg-white/20" />
                        <div className="flex items-center gap-3">
                            <MdFavorite className="text-rose-300 text-lg" />
                            <div className="flex flex-col">
                                <span className="text-[10px] text-white/60 font-medium uppercase tracking-wider">Heart</span>
                                <div className="flex items-baseline gap-1">
                                    <input
                                        type="number"
                                        value={heartRate}
                                        onChange={(e) => handleUpdateVital('heartRate', e.target.value)}
                                        className="w-12 font-bold text-white bg-transparent outline-none border-b border-transparent hover:border-rose-300/50 focus:border-rose-300 transition-colors p-0 text-base"
                                    />
                                    <span className="text-white/50 font-normal text-xs">bpm</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Notifications */}
            {notifications.length > 0 && (
                <div className="mb-8 space-y-3 animate-slide-up" style={{ animationDelay: '0.1s' }}>
                    {notifications.map((notif) => (
                        <div key={notif.id} className="relative bg-orange-50 border border-orange-100 rounded-2xl p-4 pr-10 shadow-sm transition-all hover:shadow-md">
                            <button
                                onClick={async () => {
                                    try {
                                        await updateDoc(doc(db, 'notifications', notif.id), { read: true });
                                        setNotifications(prev => prev.filter(n => n.id !== notif.id));
                                    } catch (e) { console.error(e); }
                                }}
                                className="absolute top-3 right-3 p-1 text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded-full transition-colors"
                            >
                                <MdClose className="text-lg" />
                            </button>
                            <div className="flex items-start gap-4">
                                <div className="p-2.5 bg-orange-100 rounded-xl shrink-0 text-orange-600">
                                    <MdNotifications className="text-xl" />
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-gray-900 mb-1">{notif.title}</div>
                                    <p className="text-sm text-gray-600 leading-relaxed">{notif.message}</p>
                                    {notif.newTime && (
                                        <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-orange-100 rounded-full text-xs font-bold text-orange-700 shadow-sm">
                                            <MdAccessTime />
                                            New Time: {notif.newTime}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column (Main Actions) */}
                <div className="lg:col-span-2 space-y-8">

                    {/* Quick Actions */}
                    <div className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
                        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <MdMedicalServices className="text-gray-400" /> Quick Actions
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Symptom Check */}
                            <Link href="/symptom-check" className="group p-6 bg-blue-50 rounded-3xl border border-blue-100 transition-all duration-300 hover:shadow-lg hover:shadow-blue-100 hover:-translate-y-1">
                                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-4 group-hover:scale-110 transition-transform">
                                    <MdHealthAndSafety className="text-3xl text-blue-600" />
                                </div>
                                <div className="text-lg font-bold text-gray-900">Symptom Check</div>
                                <div className="text-sm text-blue-700/80 mt-1">AI-powered health analysis</div>
                            </Link>

                            {/* View Plan */}
                            <Link href="/medical-plan" className="group p-6 bg-emerald-50 rounded-3xl border border-emerald-100 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-100 hover:-translate-y-1">
                                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-4 group-hover:scale-110 transition-transform">
                                    <MdMedicalServices className="text-3xl text-emerald-600" />
                                </div>
                                <div className="text-lg font-bold text-gray-900">View Plan</div>
                                <div className="text-sm text-emerald-700/80 mt-1">Your personalized roadmap</div>
                            </Link>

                            {/* AI Chat */}
                            <Link href="/chat" className="group p-6 bg-purple-50 rounded-3xl border border-purple-100 transition-all duration-300 hover:shadow-lg hover:shadow-purple-100 hover:-translate-y-1">
                                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-4 group-hover:scale-110 transition-transform">
                                    <MdChatBubble className="text-3xl text-purple-600" />
                                </div>
                                <div className="text-lg font-bold text-gray-900">AI Chat</div>
                                <div className="text-sm text-purple-700/80 mt-1">Instant medical answers</div>
                            </Link>

                            {/* My Reports */}
                            <Link href="/my-reports" className="group p-6 bg-amber-50 rounded-3xl border border-amber-100 transition-all duration-300 hover:shadow-lg hover:shadow-amber-100 hover:-translate-y-1">
                                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-4 group-hover:scale-110 transition-transform">
                                    <MdDescription className="text-3xl text-amber-600" />
                                </div>
                                <div className="text-lg font-bold text-gray-900">My Reports</div>
                                <div className="text-sm text-amber-700/80 mt-1">Save & view your scans</div>
                            </Link>
                        </div>
                    </div>

                    {/* Upcoming Appointments */}
                    <div className="animate-slide-up" style={{ animationDelay: '0.3s' }}>
                        <UpcomingAppointments />
                    </div>
                </div>

                {/* Right Column (Doctor & Sidebar info) */}
                <div className="space-y-8 animate-slide-up" style={{ animationDelay: '0.4s' }}>
                    {/* My Doctor - Compact */}
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 mb-4">My Doctor</h2>
                        {userData?.assignedDoctorId ? (
                            <div className="bg-white p-6 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-gray-100 hover:shadow-lg transition-all duration-300">
                                <div className="flex gap-4 items-start mb-6">
                                    <div className="w-14 h-14 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center text-white shadow-violet-200 shadow-lg">
                                        <MdMedicalServices className="text-2xl" />
                                    </div>
                                    <div>
                                        <div className="font-bold text-gray-900 text-lg line-clamp-1">
                                            Dr. {doctors.find(d => d.id === userData.assignedDoctorId)?.name?.split(' ')[0] || 'Doc'}
                                        </div>
                                        <div className="text-xs font-medium text-violet-600 bg-violet-50 px-2 py-0.5 rounded-md inline-block mt-1">
                                            {doctors.find(d => d.id === userData.assignedDoctorId)?.specialization || 'Specialist'}
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <Link
                                        href={`/book-appointment/${userData.assignedDoctorId}`}
                                        className="w-full bg-gradient-to-r from-violet-500 to-purple-600 text-white py-3.5 rounded-xl font-bold text-sm hover:from-violet-600 hover:to-purple-700 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-violet-200"
                                    >
                                        Book Visit
                                    </Link>
                                    <button
                                        onClick={() => handleAssignDoctor(null)}
                                        className="w-full text-gray-400 text-xs font-medium hover:text-red-500 transition-colors"
                                    >
                                        Disconnect
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white p-8 rounded-3xl border border-dashed border-gray-300 flex flex-col items-center justify-center text-center hover:border-gray-400 transition-colors">
                                <div className="w-14 h-14 bg-violet-50 rounded-full flex items-center justify-center mb-4">
                                    <MdMedicalServices className="text-2xl text-violet-400" />
                                </div>
                                <p className="text-sm text-gray-500 mb-6 max-w-[200px]">
                                    Connect with a doctor for personalized care.
                                </p>
                                <Link
                                    href="/doctors"
                                    className="bg-violet-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-violet-700 transition-all shadow-lg shadow-violet-200"
                                >
                                    Find Doctor
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* Recent Activity Mini-List */}
                    <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-3xl p-6 relative overflow-hidden group border border-violet-100 shadow-[0_4px_20px_rgba(139,92,246,0.05)]">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/40 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                        <div className="flex justify-between items-center mb-6 relative z-10">
                            <h2 className="font-bold text-violet-900">Recent Updates</h2>
                            <button className="text-xs text-violet-600 hover:text-violet-800 transition-colors font-medium bg-white/50 px-2 py-1 rounded-lg">History</button>
                        </div>

                        <div className="flex flex-col items-center justify-center py-6 text-center relative z-10">
                            <div className="w-14 h-14 rounded-full bg-white shadow-sm flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
                                <MdCheckCircleOutline className="text-2xl text-violet-500" />
                            </div>
                            <div className="text-sm font-bold text-violet-900">All systems normal</div>
                            <div className="text-xs text-violet-600/80 mt-1 font-medium">No critical alerts</div>
                        </div>

                        <Link href="/symptom-check" className="mt-4 w-full bg-white text-violet-700 hover:bg-violet-100 border border-violet-200 text-center block py-3.5 rounded-xl text-sm font-bold transition-all shadow-sm">
                            New Checkup
                        </Link>
                    </div>
                </div>
            </div>

            {/* Voice Assistant - Patient Only */}
            <VoiceAssistant
                userName={username}
                sugarLevel={sugarLevel}
                heartRate={heartRate}
            />

        </div>
    );
}

function UpcomingAppointments() {
    const [appointments, setAppointments] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [cancellingId, setCancellingId] = React.useState<string | null>(null);

    const fetchAppointments = async () => {
        if (!auth.currentUser) return;
        try {
            const q = query(
                collection(db, "appointments"),
                where("patientId", "==", auth.currentUser.uid),
                where("status", "==", "booked")
            );
            const querySnapshot = await getDocs(q);
            const docs = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            docs.sort((a: any, b: any) => new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime());
            setAppointments(docs);
        } catch (error) {
            console.error("Error fetching appointments:", error);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        fetchAppointments();
    }, []);

    const handleCancel = async (aptId: string, doctorName: string) => {
        const confirmed = window.confirm(`Cancel your appointment with Dr. ${doctorName}? This action cannot be undone.`);
        if (!confirmed) return;

        setCancellingId(aptId);
        try {
            const aptRef = doc(db, "appointments", aptId);
            await updateDoc(aptRef, {
                status: "cancelled",
                cancelledAt: new Date().toISOString(),
                cancelledBy: "patient"
            });
            setAppointments(prev => prev.filter(a => a.id !== aptId));
        } catch (error) {
            console.error("Error cancelling appointment:", error);
            alert("Failed to cancel appointment. Please try again.");
        } finally {
            setCancellingId(null);
        }
    };

    if (loading) return null;
    if (appointments.length === 0) return null;

    return (
        <div className="mb-8">
            <h2 className="text-xl font-bold text-black/87 mb-4">Upcoming Appointments</h2>
            <div className="space-y-3">
                {appointments.map(apt => (
                    <div key={apt.id} className="bg-white p-4 rounded-xl border-l-4 border-blue-500 shadow-sm group hover:shadow-md transition-all duration-200">
                        <div className="flex justify-between items-start">
                            <div className="flex-1 min-w-0">
                                <div className="font-bold text-black/87">Dr. {apt.doctorName}</div>
                                <div className="text-sm text-gray-500 flex items-center gap-2">
                                    <MdCalendarMonth className="text-gray-400" />
                                    {new Date(apt.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                    <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                    <MdAccessTime className="text-gray-400" />
                                    {apt.time}
                                </div>
                                <div className="text-xs text-gray-400 mt-1 truncate max-w-[200px]">
                                    {apt.reason}
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-2 ml-3">
                                <div className="bg-blue-50 text-blue-600 text-xs font-bold px-3 py-1 rounded-full uppercase">
                                    Confirmed
                                </div>
                                <button
                                    onClick={() => handleCancel(apt.id, apt.doctorName)}
                                    disabled={cancellingId === apt.id}
                                    className="text-xs font-semibold text-gray-400 hover:text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-all duration-200 disabled:opacity-50 flex items-center gap-1"
                                >
                                    {cancellingId === apt.id ? (
                                        <>
                                            <div className="w-3 h-3 border-2 border-red-300 border-t-red-500 rounded-full animate-spin" />
                                            Cancelling...
                                        </>
                                    ) : (
                                        <>
                                            <MdClose className="text-sm" />
                                            Cancel
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
