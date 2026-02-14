"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { doc, getDoc, collection, addDoc, Timestamp, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db, auth } from '../../../../lib/firebase';
import { MdArrowBack, MdMedicalServices, MdCalendarMonth, MdAccessTime, MdSubject } from 'react-icons/md';
import Link from 'next/link';

export default function BookAppointmentPage() {
    const router = useRouter();
    const params = useParams();
    const doctorId = params?.doctorId as string;

    const [doctor, setDoctor] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [visitType, setVisitType] = useState('First Visit');
    const [history, setHistory] = useState<any[]>([]);

    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [reason, setReason] = useState('');

    // Slot availability: { '10:00 AM': 2, '11:00 AM': 3, ... }
    const [slotCounts, setSlotCounts] = useState<Record<string, number>>({});
    const [loadingSlots, setLoadingSlots] = useState(false);
    const MAX_PER_SLOT = 3;

    useEffect(() => {
        const fetchDoctor = async () => {
            if (!doctorId) return;
            try {
                const docRef = doc(db, "users", doctorId);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setDoctor({ id: docSnap.id, ...docSnap.data() });
                } else {
                    alert("Doctor not found");
                    router.push('/dashboard');
                }
            } catch (error) {
                console.error("Error fetching doctor:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchDoctor();
    }, [doctorId, router]);

    useEffect(() => {
        const fetchHistory = async () => {
            if (!auth.currentUser) return;
            try {
                // Fetch recent symptoms/conditions
                // Re-reading context... walkthrough says "symptoms collection for medical history"

                const qSymptoms = query(collection(db, "symptoms"), where("userId", "==", auth.currentUser.uid));
                const snap = await getDocs(qSymptoms);
                const symptomsData = snap.docs.map(d => ({
                    id: d.id,
                    ...d.data(),
                    timestamp: d.data().timestamp?.toDate() || new Date()
                }));
                // Sort client-side to avoid index error
                symptomsData.sort((a: any, b: any) => b.timestamp - a.timestamp);
                setHistory(symptomsData);
            } catch (e) {
                console.error("Error fetching history", e);
            }
        };
        fetchHistory();
    }, []);

    useEffect(() => {
        if (visitType === 'First Visit') {
            setReason('');
        } else {
            // Auto-fill logic
            if (history.length > 0) {
                // Get most recent or relevant info
                const recent = history[0]; // Sorted by desc timestamp
                const symptomsList = recent.symptoms?.join(', ') || 'General Checkup';
                const conditions = recent.predictedCondition || 'Undiagnosed';
                setReason(`Follow-up for: ${conditions} (${symptomsList}). Previous visit history.`);
            } else {
                setReason('Follow-up checkup.');
            }
        }
    }, [visitType, history]);

    // All time slots in order for priority rescheduling
    const allTimeSlots = [
        '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '12:00 PM',
        '01:30 PM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM',
        '06:00 PM', '06:30 PM', '07:00 PM', '07:30 PM', '08:00 PM'
    ];

    // Fetch slot availability whenever date changes
    useEffect(() => {
        const fetchSlotAvailability = async () => {
            if (!date || !doctorId) {
                setSlotCounts({});
                return;
            }
            setLoadingSlots(true);
            setTime(''); // Reset selected time when date changes
            try {
                const q = query(
                    collection(db, "appointments"),
                    where("doctorId", "==", doctorId),
                    where("date", "==", date),
                    where("status", "==", "booked")
                );
                const snap = await getDocs(q);
                const counts: Record<string, number> = {};
                snap.docs.forEach(d => {
                    const t = d.data().time;
                    if (t) counts[t] = (counts[t] || 0) + 1;
                });
                setSlotCounts(counts);
            } catch (err) {
                console.error("Error fetching slot availability:", err);
            } finally {
                setLoadingSlots(false);
            }
        };
        fetchSlotAvailability();
    }, [date, doctorId]);

    const isSlotFull = (slot: string) => (slotCounts[slot] || 0) >= MAX_PER_SLOT;
    const getSlotsRemaining = (slot: string) => MAX_PER_SLOT - (slotCounts[slot] || 0);

    const handleBookAppointment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!auth.currentUser) return;
        if (!date || !time || !reason) {
            alert("Please fill in all fields");
            return;
        }

        setSubmitting(true);
        try {
            // Determine Risk Level from history (fallback)
            let currentRisk = 'Low';
            let recentScanId = null;
            if (history.length > 0) {
                currentRisk = history[0].risk || 'Low';
                recentScanId = history[0].id;
            }

            // Fetch latest AI Scan for this patient
            let aiScanId = null;
            try {
                const aiScanQuery = query(
                    collection(db, "ai_scans"),
                    where("userId", "==", auth.currentUser.uid)
                );
                const aiScanSnap = await getDocs(aiScanQuery);
                if (!aiScanSnap.empty) {
                    let latestDoc = aiScanSnap.docs[0];
                    let latestTime = latestDoc.data().timestamp?.toDate?.()?.getTime() || 0;
                    aiScanSnap.docs.forEach(d => {
                        const t = d.data().timestamp?.toDate?.()?.getTime() || 0;
                        if (t > latestTime) { latestDoc = d; latestTime = t; }
                    });
                    aiScanId = latestDoc.id;
                    // Use AI Scan risk level as primary source of truth
                    const aiRisk = latestDoc.data().riskLevel;
                    if (aiRisk) {
                        currentRisk = aiRisk;
                    }
                }
            } catch (e) {
                console.warn("Could not fetch AI scans, skipping:", e);
            }

            // Book the appointment
            await addDoc(collection(db, "appointments"), {
                patientId: auth.currentUser.uid,
                patientName: auth.currentUser.displayName || "Patient",
                doctorId: doctorId,
                doctorName: doctor.name,
                date,
                time,
                visitType,
                reason,
                riskLevel: currentRisk,
                scanId: recentScanId,
                aiScanId: aiScanId,
                status: 'booked',
                createdAt: Timestamp.now()
            });

            // --- Priority Rescheduling Logic ---
            // After booking, check if this slot now has 2+ high-risk patients
            // If so, bump non-high-risk patients to the next available slot
            try {
                const slotQuery = query(
                    collection(db, "appointments"),
                    where("doctorId", "==", doctorId),
                    where("date", "==", date),
                    where("time", "==", time),
                    where("status", "==", "booked")
                );
                const slotSnap = await getDocs(slotQuery);
                const slotApps = slotSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];

                const highRiskInSlot = slotApps.filter(a => a.riskLevel?.toLowerCase() === 'high');

                if (highRiskInSlot.length >= 2) {
                    // Find non-high-risk patients in this slot to reschedule
                    const toBump = slotApps.filter(a => a.riskLevel?.toLowerCase() !== 'high');

                    if (toBump.length > 0) {
                        // Get all booked appointments for this doctor on this date to find busy slots
                        const dayQuery = query(
                            collection(db, "appointments"),
                            where("doctorId", "==", doctorId),
                            where("date", "==", date),
                            where("status", "==", "booked")
                        );
                        const daySnap = await getDocs(dayQuery);
                        const dayApps = daySnap.docs.map(d => d.data()) as any[];

                        // Count appointments per slot
                        const slotCounts: Record<string, number> = {};
                        dayApps.forEach(a => {
                            slotCounts[a.time] = (slotCounts[a.time] || 0) + 1;
                        });

                        const currentSlotIndex = allTimeSlots.indexOf(time);

                        for (const bumpApp of toBump) {
                            // Find next available slot (fewer than 2 appointments)
                            let newSlot = null;
                            for (let i = currentSlotIndex + 1; i < allTimeSlots.length; i++) {
                                const candidate = allTimeSlots[i];
                                if ((slotCounts[candidate] || 0) < 2) {
                                    newSlot = candidate;
                                    slotCounts[candidate] = (slotCounts[candidate] || 0) + 1;
                                    break;
                                }
                            }

                            if (newSlot) {
                                // Update the appointment time
                                const { updateDoc: updateDocFn } = await import('firebase/firestore');
                                const appRef = doc(db, "appointments", bumpApp.id);
                                await updateDocFn(appRef, { time: newSlot });

                                // Create notification for bumped patient
                                await addDoc(collection(db, "notifications"), {
                                    userId: bumpApp.patientId,
                                    type: 'appointment_rescheduled',
                                    title: 'Appointment Rescheduled',
                                    message: `Dear ${bumpApp.patientName}, your appointment with Dr. ${doctor.name} on ${date} has been shifted from ${time} to ${newSlot} due to emergency high-risk cases. We appreciate your understanding and cooperation. Thank you!`,
                                    oldTime: time,
                                    newTime: newSlot,
                                    date: date,
                                    doctorName: doctor.name,
                                    read: false,
                                    createdAt: Timestamp.now()
                                });
                            }
                        }
                    }
                }
            } catch (priorityErr) {
                console.warn("Priority rescheduling check failed (non-critical):", priorityErr);
            }

            alert("Appointment Booked Successfully!");
            router.push('/dashboard');
        } catch (error) {
            console.error("Error booking appointment:", error);
            alert("Failed to book appointment");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Loading doctor details...</div>;
    }

    if (!doctor) return null;

    // Get tomorrow's date for min date attribute
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const minDate = tomorrow.toISOString().split('T')[0];

    return (
        <div className="p-6 max-w-lg mx-auto pb-32">
            <div className="mb-6 flex items-center gap-4">
                <Link href="/dashboard" className="p-2 -ml-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors">
                    <MdArrowBack className="text-2xl" />
                </Link>
                <h1 className="text-xl font-bold text-black/87">Book Appointment</h1>
            </div>

            {/* Doctor Info Card */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 mb-8">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
                    <MdMedicalServices className="text-3xl" />
                </div>
                <div>
                    <div className="font-bold text-lg text-black/87">Dr. {doctor.name}</div>
                    <div className="text-sm text-gray-500">
                        {doctor.specialization || 'General Practitioner'}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                        {doctor.hospitalName}
                    </div>
                </div>
            </div>

            <form onSubmit={handleBookAppointment} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">

                {/* Visit Type */}
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                        <MdSubject className="text-gray-400 text-lg" />
                        Visit Type
                    </label>
                    <div className="flex gap-2">
                        {['First Visit', 'Second Visit', 'Third Visit'].map((type) => (
                            <button
                                key={type}
                                type="button"
                                onClick={() => setVisitType(type)}
                                className={`flex-1 py-3 px-2 rounded-xl text-xs font-bold transition-all border ${visitType === type
                                    ? 'bg-black text-white border-black shadow-md'
                                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                                    }`}
                            >
                                {type}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Date */}
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                        <MdCalendarMonth className="text-gray-400 text-lg" />
                        Select Date
                    </label>
                    <input
                        type="date"
                        min={minDate}
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-black focus:ring-0 outline-none transition-all font-medium"
                        required
                    />
                </div>

                {/* Time Slots */}
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                        <MdAccessTime className="text-gray-400 text-lg" />
                        Select Time
                    </label>

                    <div className="space-y-4">
                        {/* Morning */}
                        <div>
                            <div className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Morning (10:00 AM - 12:00 PM)</div>
                            <div className="grid grid-cols-3 gap-2">
                                {['10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '12:00 PM'].map((slot) => {
                                    const full = isSlotFull(slot);
                                    const remaining = getSlotsRemaining(slot);
                                    return (
                                        <button
                                            key={slot}
                                            type="button"
                                            onClick={() => !full && setTime(slot)}
                                            disabled={full || loadingSlots}
                                            className={`py-2 px-1 rounded-lg text-xs font-bold transition-all border relative ${full
                                                    ? 'bg-gray-100 text-gray-300 border-gray-100 cursor-not-allowed line-through'
                                                    : time === slot
                                                        ? 'bg-black text-white border-black shadow-md transform scale-105'
                                                        : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400 hover:bg-gray-50'
                                                }`}
                                            title={full ? 'Slot full — 3/3 booked' : `${remaining} spot${remaining !== 1 ? 's' : ''} left`}
                                        >
                                            {slot}
                                            {date && !loadingSlots && (
                                                <span className={`block text-[9px] font-medium mt-0.5 ${full ? 'text-red-300' : remaining === 1 ? 'text-amber-500' : 'text-emerald-500'}`}>
                                                    {full ? 'Full' : `${remaining} left`}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Afternoon */}
                        <div>
                            <div className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Afternoon (01:30 PM - 04:30 PM)</div>
                            <div className="grid grid-cols-3 gap-2">
                                {['01:30 PM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM'].map((slot) => {
                                    const full = isSlotFull(slot);
                                    const remaining = getSlotsRemaining(slot);
                                    return (
                                        <button
                                            key={slot}
                                            type="button"
                                            onClick={() => !full && setTime(slot)}
                                            disabled={full || loadingSlots}
                                            className={`py-2 px-1 rounded-lg text-xs font-bold transition-all border relative ${full
                                                    ? 'bg-gray-100 text-gray-300 border-gray-100 cursor-not-allowed line-through'
                                                    : time === slot
                                                        ? 'bg-black text-white border-black shadow-md transform scale-105'
                                                        : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400 hover:bg-gray-50'
                                                }`}
                                            title={full ? 'Slot full — 3/3 booked' : `${remaining} spot${remaining !== 1 ? 's' : ''} left`}
                                        >
                                            {slot}
                                            {date && !loadingSlots && (
                                                <span className={`block text-[9px] font-medium mt-0.5 ${full ? 'text-red-300' : remaining === 1 ? 'text-amber-500' : 'text-emerald-500'}`}>
                                                    {full ? 'Full' : `${remaining} left`}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Evening */}
                        <div>
                            <div className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Evening (06:00 PM - 08:00 PM)</div>
                            <div className="grid grid-cols-3 gap-2">
                                {['06:00 PM', '06:30 PM', '07:00 PM', '07:30 PM', '08:00 PM'].map((slot) => {
                                    const full = isSlotFull(slot);
                                    const remaining = getSlotsRemaining(slot);
                                    return (
                                        <button
                                            key={slot}
                                            type="button"
                                            onClick={() => !full && setTime(slot)}
                                            disabled={full || loadingSlots}
                                            className={`py-2 px-1 rounded-lg text-xs font-bold transition-all border relative ${full
                                                    ? 'bg-gray-100 text-gray-300 border-gray-100 cursor-not-allowed line-through'
                                                    : time === slot
                                                        ? 'bg-black text-white border-black shadow-md transform scale-105'
                                                        : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400 hover:bg-gray-50'
                                                }`}
                                            title={full ? 'Slot full — 3/3 booked' : `${remaining} spot${remaining !== 1 ? 's' : ''} left`}
                                        >
                                            {slot}
                                            {date && !loadingSlots && (
                                                <span className={`block text-[9px] font-medium mt-0.5 ${full ? 'text-red-300' : remaining === 1 ? 'text-amber-500' : 'text-emerald-500'}`}>
                                                    {full ? 'Full' : `${remaining} left`}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Reason */}
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                        <MdSubject className="text-gray-400 text-lg" />
                        Reason for Visit
                    </label>
                    <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Briefly describe your symptoms or reason for visit..."
                        rows={3}
                        readOnly={visitType !== 'First Visit'}
                        className={`w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-black focus:ring-0 outline-none transition-all resize-none ${visitType !== 'First Visit' ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                        required
                    />
                    {visitType !== 'First Visit' && (
                        <p className="text-xs text-blue-600 mt-2 font-medium flex items-center gap-1">
                            Auto-filled based on medical history
                        </p>
                    )}
                </div>

                <div className="pt-2">
                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full bg-black text-white py-4 rounded-xl font-bold hover:bg-gray-800 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {submitting ? 'Confirming...' : 'Confirm Appointment'}
                    </button>
                    <p className="text-center text-xs text-gray-400 mt-3">
                        No payment required at this stage.
                    </p>
                </div>

            </form>
        </div>
    );
}
