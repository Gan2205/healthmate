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
    MdClose
} from 'react-icons/md';
import { collection, query, where, getDocs, addDoc, Timestamp } from 'firebase/firestore';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUserData } from '../../../hooks/useUserData';
import { auth, db } from '../../../lib/firebase';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';

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
        <div className="p-4 sm:p-6 max-w-2xl mx-auto w-full">
            {/* AppBar / Header */}
            <div className="mb-6">
                <h1 className="text-xl font-bold text-black/87">
                    Hello, {username} <span className="text-xs ml-2 font-normal text-gray-500">({loading ? 'loading...' : (userData?.role || 'Patient')})</span>
                </h1>
                <p className="text-xs text-gray-600">
                    How are you feeling today?
                </p>
            </div>

            {/* Notifications */}
            {notifications.length > 0 && (
                <div className="mb-5 space-y-3">
                    {notifications.map((notif) => (
                        <div key={notif.id} className="relative bg-orange-50 border border-orange-200 rounded-2xl p-4 pr-10 shadow-sm">
                            <button
                                onClick={async () => {
                                    try {
                                        await updateDoc(doc(db, 'notifications', notif.id), { read: true });
                                        setNotifications(prev => prev.filter(n => n.id !== notif.id));
                                    } catch (e) { console.error(e); }
                                }}
                                className="absolute top-3 right-3 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"
                            >
                                <MdClose className="text-lg" />
                            </button>
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-orange-100 rounded-xl shrink-0 mt-0.5">
                                    <MdNotifications className="text-orange-600 text-xl" />
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-orange-900 mb-1">{notif.title}</div>
                                    <p className="text-sm text-gray-700 leading-relaxed">{notif.message}</p>
                                    {notif.newTime && (
                                        <div className="mt-2 inline-flex items-center gap-1 px-3 py-1 bg-white border border-orange-200 rounded-full text-xs font-bold text-orange-700">
                                            <MdAccessTime className="text-sm" />
                                            New Time: {notif.newTime}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Quick Actions */}
            <div className="mb-4">
                <h2 className="text-xl font-bold text-black/87 mb-4">Quick Actions</h2>
                <div className="flex gap-3 mb-4">
                    {/* Symptom Check */}
                    <Link href="/symptom-check" className="flex-1 p-[22px] bg-blue-50 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.05)] hover:bg-blue-100 transition-colors">
                        <MdHealthAndSafety className="text-[34px] text-blue-600 mb-3.5" />
                        <div className="text-[17px] font-bold text-black/87">Symptom Check</div>
                        <div className="text-[13px] text-gray-600 mt-1.5">AI-powered analysis</div>
                    </Link>

                    {/* View Plan */}
                    <Link href="/medical-plan" className="flex-1 p-[22px] bg-green-50 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.05)] hover:bg-green-100 transition-colors">
                        <MdMedicalServices className="text-[34px] text-green-600 mb-3.5" />
                        <div className="text-[17px] font-bold text-black/87">View Plan</div>
                        <div className="text-[13px] text-gray-600 mt-1.5">Your medical plan</div>
                    </Link>
                </div>

                {/* AI Chat */}
                <Link href="/chat" className="block w-full p-[22px] bg-purple-50 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.05)] hover:bg-purple-100 transition-colors">
                    <MdChatBubble className="text-[34px] text-purple-600 mb-3.5" />
                    <div className="text-[17px] font-bold text-black/87">AI Medical Chat</div>
                    <div className="text-[13px] text-gray-600 mt-1.5">Chat with AI or upload medical images</div>
                </Link>
            </div>

            {/* Doctor Selection Section */}
            <div className="mb-8">
                <h2 className="text-xl font-bold text-black/87 mb-4">My Doctor</h2>

                {/* Assigned Doctor Card */}
                {userData?.assignedDoctorId ? (
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                                    <MdMedicalServices className="text-2xl" />
                                </div>
                                <div>
                                    <div className="font-bold text-black/87">
                                        Dr. {doctors.find(d => d.id === userData.assignedDoctorId)?.name || 'Loading...'}
                                    </div>
                                    <div className="text-xs text-gray-500 flex flex-col">
                                        {(() => {
                                            const doc = doctors.find(d => d.id === userData.assignedDoctorId);
                                            if (!doc) return <span>Your specific doctor</span>;
                                            return (
                                                <>
                                                    <span>{doc.study ? `(${doc.study})` : ''} {doc.specialization ? `- ${doc.specialization}` : ''}</span>
                                                    <span>{doc.hospitalName}</span>
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => handleAssignDoctor(null)}
                                className="text-red-500 text-sm font-medium hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
                            >
                                Change
                            </button>
                        </div>

                        <Link
                            href={`/book-appointment/${userData.assignedDoctorId}`}
                            className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                        >
                            <MdCalendarMonth className="text-lg" />
                            Book Appointment
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {loadingDoctors ? (
                            <div className="text-sm text-gray-500">Loading doctors...</div>
                        ) : doctors.length === 0 ? (
                            <div className="p-4 bg-gray-50 rounded-xl text-center text-gray-500 text-sm">
                                No doctors registered yet.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-3">
                                {doctors.map(doc => (
                                    <div key={doc.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col gap-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500">
                                                    <MdMedicalServices />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-sm text-black/87">Dr. {doc.name}</div>
                                                    <div className="text-xs text-gray-500 flex flex-col">
                                                        <span>{doc.study ? `(${doc.study})` : ''} {doc.specialization ? `- ${doc.specialization}` : ''}</span>
                                                        <span>{doc.hospitalName}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleSendConnectionRequest(doc.id, doc.name)}
                                                disabled={pendingRequests.some(r => r.doctorId === doc.id)}
                                                className={`text-xs font-bold px-4 py-2 rounded-lg transition-colors ${pendingRequests.some(r => r.doctorId === doc.id)
                                                        ? 'bg-yellow-100 text-yellow-700 cursor-not-allowed'
                                                        : 'bg-black text-white hover:bg-gray-800'
                                                    }`}
                                            >
                                                {pendingRequests.some(r => r.doctorId === doc.id) ? 'Pending...' : 'Connect'}
                                            </button>
                                        </div>
                                        <Link
                                            href={`/book-appointment/${doc.id}`}
                                            className="w-full bg-gray-50 text-blue-600 border border-blue-100 py-2 rounded-lg font-bold text-xs hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
                                        >
                                            Book Appointment
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Upcoming Appointments */}
            <UpcomingAppointments />

            {/* Recent Activity */}
            <div className="mb-4 flex justify-between items-center">
                <h2 className="text-xl font-bold text-black/87">Recent Activity</h2>
                <button className="text-blue-600 text-sm font-medium hover:underline">View All</button>
            </div>

            {/* Empty State for Recent Activity */}
            <div className="p-6 bg-white rounded-2xl flex flex-col items-center justify-center text-center shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
                <MdMedicalServices className="text-5xl text-gray-300 mb-3" />
                <div className="text-sm text-gray-600 mb-2">No symptoms recorded yet</div>
                <Link href="/symptom-check" className="flex items-center gap-2 bg-[#1A1A1A] text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-black/90 transition-colors mt-2">
                    <span className="text-lg">+</span> Check Symptoms
                </Link>
            </div>

        </div>
    );
}

function UpcomingAppointments() {
    const [appointments, setAppointments] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        const fetchAppointments = async () => {
            if (!auth.currentUser) return;
            try {
                const q = query(
                    collection(db, "appointments"),
                    where("patientId", "==", auth.currentUser.uid),
                    where("status", "==", "booked")
                );
                const querySnapshot = await getDocs(q);
                const docs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                // Sort by date/time (client side for simplicity)
                docs.sort((a: any, b: any) => new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime());
                setAppointments(docs);
            } catch (error) {
                console.error("Error fetching appointments:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchAppointments();
    }, []);

    if (loading) return null;
    if (appointments.length === 0) return null;

    return (
        <div className="mb-8">
            <h2 className="text-xl font-bold text-black/87 mb-4">Upcoming Appointments</h2>
            <div className="space-y-3">
                {appointments.map(apt => (
                    <div key={apt.id} className="bg-white p-4 rounded-xl border-l-4 border-blue-500 shadow-sm flex justify-between items-center">
                        <div>
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
                        <div className="bg-blue-50 text-blue-600 text-xs font-bold px-3 py-1 rounded-full uppercase">
                            Confirmed
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
