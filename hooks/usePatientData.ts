
import { useState, useEffect } from 'react';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

export interface PatientData {
    profile: any;
    appointments: any[];
    reports: any[];
    loading: boolean;
}

export function usePatientData() {
    const [data, setData] = useState<PatientData>({
        profile: null,
        appointments: [],
        reports: [],
        loading: true
    });

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                setData({ profile: null, appointments: [], reports: [], loading: false });
                return;
            }

            try {
                // 1. Fetch Profile
                const userDoc = await getDoc(doc(db, "users", user.uid));
                const profile = userDoc.exists() ? userDoc.data() : null;

                // 2. Fetch Upcoming Appointments
                const aptQ = query(
                    collection(db, "appointments"),
                    where("patientId", "==", user.uid),
                    where("status", "==", "booked")
                );
                const aptSnap = await getDocs(aptQ);
                const appointments = aptSnap.docs.map(d => ({ id: d.id, ...d.data() }));

                // 3. Fetch Recent Reports (Limit to last 5 for context window efficiency)
                const reportQ = query(
                    collection(db, "patient_reports"),
                    where("userId", "==", user.uid),
                    // Note: orderBy requires an index, so we might skip it or handle it carefully. 
                    // For now, let's just fetch and sort in memory to avoid index errors if not created.
                );
                const reportSnap = await getDocs(reportQ);
                let reports = reportSnap.docs.map(d => {
                    const data = d.data();
                    // Convert timestamp to string for serialization
                    const date = data.reportDate || (data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString());
                    return { id: d.id, ...data, reportDate: date };
                });

                // Sort by date desc
                reports.sort((a: any, b: any) => new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime());
                reports = reports.slice(0, 5); // Keep top 5

                setData({
                    profile,
                    appointments,
                    reports,
                    loading: false
                });

            } catch (error) {
                console.error("Error fetching patient data:", error);
                setData(prev => ({ ...prev, loading: false }));
            }
        });

        return () => unsubscribe();
    }, []);

    return data;
}
