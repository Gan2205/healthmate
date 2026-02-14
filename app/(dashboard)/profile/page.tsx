"use client";

import React, { useState } from 'react';
import {
    MdPerson,
    MdEdit,
    MdLogout,
    MdChevronRight
} from 'react-icons/md';
import { signOut } from 'firebase/auth';
import { auth } from '../../../lib/firebase'; // Adjusted path
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUserData } from '../../../hooks/useUserData';

export default function ProfileScreen() {
    const router = useRouter();
    const { userData } = useUserData();
    const [user] = useState({
        name: "User Name",
        email: "user@example.com",
        height: 175,
        weight: 70,
        age: 28,
        bloodType: "O+"
    });

    const handleLogout = async () => {
        try {
            await signOut(auth);
            router.push('/');
        } catch (error) {
            console.error("Error signing out: ", error);
        }
    };

    return (
        <div className="p-4 sm:p-6 max-w-2xl mx-auto w-full pb-32">
            {/* AppBar */}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-xl font-bold text-black/87">Profile</h1>
                <Link href="/profile/edit" className="p-2 text-gray-600 hover:bg-gray-100 rounded-full">
                    <MdEdit className="text-xl" />
                </Link>
            </div>

            {/* Profile Card */}
            <div className="bg-white p-6 rounded-[20px] shadow-[0_2px_10px_rgba(0,0,0,0.05)] mb-6 flex flex-col items-center text-center">
                <div className="w-24 h-24 rounded-full bg-gray-100 mb-4 flex items-center justify-center relative">
                    <MdPerson className="text-5xl text-gray-400" />
                    <Link href="/profile/edit" className="absolute bottom-0 right-0 bg-[#1A1A1A] text-white p-2 rounded-full border-2 border-white">
                        <MdEdit className="text-xs" />
                    </Link>
                </div>
                <h2 className="text-xl font-bold text-black/87">{userData?.name || user.name}</h2>
                <p className="text-sm text-gray-500">{userData?.email || auth.currentUser?.email || 'No email'}</p>
            </div>

            {/* Stats Grid - Hide for Doctors */}
            {userData?.role !== 'doctor' ? (
                <>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-white p-5 rounded-[20px] shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
                            <div className="text-xs text-gray-500 font-medium mb-1">Height</div>
                            <div className="text-lg font-bold text-black/87">{userData?.height || '-'} cm</div>
                        </div>
                        <div className="bg-white p-5 rounded-[20px] shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
                            <div className="text-xs text-gray-500 font-medium mb-1">Weight</div>
                            <div className="text-lg font-bold text-black/87">{userData?.weight || '-'} kg</div>
                        </div>
                        <div className="bg-white p-5 rounded-[20px] shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
                            <div className="text-xs text-gray-500 font-medium mb-1">Age</div>
                            <div className="text-lg font-bold text-black/87">{userData?.age || '-'} yrs</div>
                        </div>
                        <div className="bg-white p-5 rounded-[20px] shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
                            <div className="text-xs text-gray-500 font-medium mb-1">Blood Type</div>
                            <div className="text-lg font-bold text-black/87">{userData?.bloodType || '-'}</div>
                        </div>
                        <div className="bg-white p-5 rounded-[20px] shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
                            <div className="text-xs text-gray-500 font-medium mb-1">Gender</div>
                            <div className="text-lg font-bold text-black/87">{userData?.gender || '-'}</div>
                        </div>
                        <div className="bg-white p-5 rounded-[20px] shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
                            <div className="text-xs text-gray-500 font-medium mb-1">Phone</div>
                            <div className="text-lg font-bold text-black/87">{userData?.phoneNumber || '-'}</div>
                        </div>
                    </div>
                    {userData?.preExistingDiseases && (
                        <div className="bg-white p-5 rounded-[20px] shadow-[0_2px_8px_rgba(0,0,0,0.05)] mb-6">
                            <div className="text-xs text-gray-500 font-medium mb-2">Pre-existing Diseases</div>
                            <div className="flex flex-wrap gap-2">
                                {userData.preExistingDiseases.split(',').map((disease: string, i: number) => (
                                    <span key={i} className="px-3 py-1 bg-red-50 text-red-700 text-xs font-semibold rounded-full border border-red-100">
                                        {disease.trim()}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-white p-5 rounded-[20px] shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
                        <div className="text-xs text-gray-500 font-medium mb-1">Study/Degree</div>
                        <div className="text-lg font-bold text-black/87">{userData?.study || '-'}</div>
                    </div>
                    <div className="bg-white p-5 rounded-[20px] shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
                        <div className="text-xs text-gray-500 font-medium mb-1">Specialization</div>
                        <div className="text-lg font-bold text-black/87">{userData?.specialization || '-'}</div>
                    </div>
                    <div className="bg-white p-5 rounded-[20px] shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
                        <div className="text-xs text-gray-500 font-medium mb-1">Hospital</div>
                        <div className="text-lg font-bold text-black/87">{userData?.hospitalName || '-'}</div>
                    </div>
                    <div className="bg-white p-5 rounded-[20px] shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
                        <div className="text-xs text-gray-500 font-medium mb-1">Phone No</div>
                        <div className="text-lg font-bold text-black/87">{userData?.phoneNumber || '-'}</div>
                    </div>
                </div>
            )}

            {/* Menu Items */}
            <div className="bg-white rounded-[20px] shadow-[0_2px_10px_rgba(0,0,0,0.05)] overflow-hidden">
                <MenuItem icon={<MdPerson />} title="Personal Information" onClick={() => router.push('/profile/edit')} />
                <MenuItem icon={<MdLogout />} title="Logout" onClick={handleLogout} isDestructive />
            </div>

        </div>
    );
}

function MenuItem({ icon, title, onClick, isDestructive = false }: { icon: React.ReactNode, title: string, onClick?: () => void, isDestructive?: boolean }) {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center justify-between p-4 border-b border-gray-100 last:border-none hover:bg-gray-50 transition-colors ${isDestructive ? 'text-red-600' : 'text-black/87'}`}
        >
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isDestructive ? 'bg-red-50' : 'bg-gray-100'} text-lg`}>
                    {icon}
                </div>
                <span className="font-medium text-sm">{title}</span>
            </div>
            {!isDestructive && <MdChevronRight className="text-gray-400 text-xl" />}
        </button>
    );
}
