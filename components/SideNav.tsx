"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    MdHome,
    MdOutlineHome,
    MdPerson,
    MdOutlinePerson,
    MdMedicalServices,
    MdOutlineMedicalServices,
    MdScience,
    MdOutlineScience,
    MdLogout
} from 'react-icons/md';
import { useUserData } from '../hooks/useUserData';
import { auth } from '../lib/firebase';
import { useRouter } from 'next/navigation';

export default function SideNav() {
    const pathname = usePathname();
    const router = useRouter();
    const { userData } = useUserData();

    const patientNavItems = [
        {
            label: 'Home',
            icon: <MdOutlineHome className="text-2xl" />,
            activeIcon: <MdHome className="text-2xl" />,
            href: '/dashboard',
        },
        {
            label: 'Doctors',
            icon: <MdOutlineMedicalServices className="text-2xl" />,
            activeIcon: <MdMedicalServices className="text-2xl" />,
            href: '/doctors',
        },
        {
            label: 'AI Scan',
            icon: <MdOutlineScience className="text-2xl" />,
            activeIcon: <MdScience className="text-2xl" />,
            href: '/health-prediction',
        },
        {
            label: 'Profile',
            icon: <MdOutlinePerson className="text-2xl" />,
            activeIcon: <MdPerson className="text-2xl" />,
            href: '/profile',
        },
    ];

    const doctorNavItems = [
        {
            label: 'Patients',
            icon: <MdOutlineHome className="text-2xl" />,
            activeIcon: <MdHome className="text-2xl" />,
            href: '/doctor',
        },
        {
            label: 'Profile',
            icon: <MdOutlinePerson className="text-2xl" />,
            activeIcon: <MdPerson className="text-2xl" />,
            href: '/profile',
        },
    ];

    const navItems = userData?.role === 'doctor' ? doctorNavItems : patientNavItems;

    const handleLogout = async () => {
        try {
            await auth.signOut();
            router.push('/');
        } catch (error) {
            console.error("Error signing out:", error);
        }
    };

    return (
        <div className="hidden md:flex flex-col w-64 bg-white h-screen fixed left-0 top-0 border-r border-gray-200 z-50">
            <div className="p-6">
                <h1 className="text-2xl font-bold text-black flex items-center gap-2">
                    <MdMedicalServices className="text-blue-600" />
                    HealthMate
                </h1>
            </div>

            <nav className="flex-1 px-3 space-y-1 mt-6">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`group flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 ease-in-out ${isActive
                                ? 'bg-black text-white shadow-lg shadow-black/5 transform scale-[1.02]'
                                : 'text-gray-500 hover:bg-gray-50 hover:text-black hover:translate-x-1'
                                }`}
                        >
                            <span className={`text-2xl transition-colors ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-black'}`}>
                                {isActive ? item.activeIcon : item.icon}
                            </span>
                            <span className={`font-medium text-sm ${isActive ? 'font-semibold' : ''}`}>{item.label}</span>

                            {isActive && (
                                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white/30" />
                            )}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-gray-100">
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-4 px-4 py-3 w-full rounded-xl text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
                >
                    <MdLogout className="text-2xl" />
                    <span className="font-medium">Logout</span>
                </button>
            </div>
        </div>
    );
}
