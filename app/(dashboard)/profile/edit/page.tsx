"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../../../lib/firebase';
import { MdArrowBack, MdSave } from 'react-icons/md';
import { useUserData } from '../../../../hooks/useUserData';

export default function EditProfileScreen() {
    const router = useRouter();
    const { userData, loading } = useUserData();

    // Form state
    const [formData, setFormData] = useState<any>({
        name: '',
        height: '',
        weight: '',
        age: '',
        bloodType: '',
        study: '',
        specialization: '',
        hospitalName: '',
        phoneNumber: ''
    });
    const [saving, setSaving] = useState(false);

    // Load initial data
    useEffect(() => {
        if (userData) {
            setFormData({
                name: userData.name || '',
                height: userData.height || '',
                weight: userData.weight || '',
                age: userData.age || '',
                bloodType: userData.bloodType || '',
                study: userData.study || '',
                specialization: userData.specialization || '',
                hospitalName: userData.hospitalName || '',
                phoneNumber: userData.phoneNumber || ''
            });
        }
    }, [userData]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev: any) => ({ ...prev, [name]: value }));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            if (!auth.currentUser) return;

            const userRef = doc(db, "users", auth.currentUser.uid);

            // Calculate BMI if height and weight are provided
            let bmi = null;
            if (formData.height && formData.weight) {
                const h = parseFloat(formData.height) / 100; // cm to m
                const w = parseFloat(formData.weight);
                if (h > 0) {
                    bmi = (w / (h * h)).toFixed(1);
                }
            }

            await setDoc(userRef, {
                ...formData,
                bmi: bmi,
                updatedAt: new Date().toISOString()
            }, { merge: true });

            router.back();
        } catch (error) {
            console.error("Error updating profile:", error);
            // Show more detailed error
            if (error instanceof Error) {
                alert(`Failed to update profile: ${error.message}`);
            } else {
                alert("Failed to update profile");
            }
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-6">Loading...</div>;

    return (
        <div className="p-4 sm:p-6 max-w-2xl mx-auto w-full">
            {/* AppBar */}
            <div className="flex items-center gap-4 mb-6">
                <button
                    onClick={() => router.back()}
                    className="p-2 -ml-2 text-black/87 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <MdArrowBack className="text-2xl" />
                </button>
                <h1 className="text-xl font-bold text-black/87">Edit Profile</h1>
            </div>

            <form onSubmit={handleSave} className="bg-white p-6 rounded-[20px] shadow-[0_2px_10px_rgba(0,0,0,0.05)] space-y-5">

                {/* Name */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full p-3 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-[#1A1A1A]"
                        placeholder="Enter your name"
                        required
                    />
                </div>

                {/* Conditional Fields based on Role */}
                {userData?.role === 'doctor' ? (
                    <div className="grid grid-cols-1 gap-4">
                        {/* Study */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Study / Degree</label>
                            <input
                                type="text"
                                name="study"
                                value={formData.study || ''}
                                onChange={handleChange}
                                className="w-full p-3 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-[#1A1A1A]"
                                placeholder="e.g. MBBS, MD"
                            />
                        </div>

                        {/* Specialization */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Specialization</label>
                            <input
                                type="text"
                                name="specialization"
                                value={formData.specialization || ''}
                                onChange={handleChange}
                                className="w-full p-3 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-[#1A1A1A]"
                                placeholder="e.g. Cardiologist"
                            />
                        </div>

                        {/* Hospital */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Hospital Name</label>
                            <input
                                type="text"
                                name="hospitalName"
                                value={formData.hospitalName || ''}
                                onChange={handleChange}
                                className="w-full p-3 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-[#1A1A1A]"
                                placeholder="e.g. City General Hospital"
                            />
                        </div>

                        {/* Phone */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                            <input
                                type="tel"
                                name="phoneNumber"
                                value={formData.phoneNumber || ''}
                                onChange={handleChange}
                                className="w-full p-3 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-[#1A1A1A]"
                                placeholder="e.g. +91 9876543210"
                            />
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-2 gap-4">
                            {/* Height */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Height (cm)</label>
                                <input
                                    type="number"
                                    name="height"
                                    value={formData.height}
                                    onChange={handleChange}
                                    className="w-full p-3 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-[#1A1A1A]"
                                    placeholder="e.g. 175"
                                />
                            </div>

                            {/* Weight */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
                                <input
                                    type="number"
                                    name="weight"
                                    value={formData.weight}
                                    onChange={handleChange}
                                    className="w-full p-3 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-[#1A1A1A]"
                                    placeholder="e.g. 70"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {/* Age */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                                <input
                                    type="number"
                                    name="age"
                                    value={formData.age}
                                    onChange={handleChange}
                                    className="w-full p-3 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-[#1A1A1A]"
                                    placeholder="e.g. 25"
                                />
                            </div>

                            {/* Blood Type */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Blood Type</label>
                                <select
                                    name="bloodType"
                                    value={formData.bloodType}
                                    onChange={handleChange}
                                    className="w-full p-3 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-[#1A1A1A]"
                                >
                                    <option value="">Select</option>
                                    <option value="A+">A+</option>
                                    <option value="A-">A-</option>
                                    <option value="B+">B+</option>
                                    <option value="B-">B-</option>
                                    <option value="AB+">AB+</option>
                                    <option value="AB-">AB-</option>
                                    <option value="O+">O+</option>
                                    <option value="O-">O-</option>
                                </select>
                            </div>
                        </div>
                    </>
                )}

                <button
                    type="submit"
                    disabled={saving}
                    className="w-full bg-[#1A1A1A] text-white py-4 rounded-xl font-bold text-base hover:bg-black/90 transition-all flex items-center justify-center gap-2 mt-4"
                >
                    {saving ? "Saving..." : (
                        <>
                            <MdSave className="text-xl" />
                            Save Changes
                        </>
                    )}
                </button>

            </form>
        </div>
    );
}
