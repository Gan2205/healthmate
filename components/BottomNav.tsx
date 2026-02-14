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
    MdOutlineScience
} from 'react-icons/md';

// ... imports
import { useUserData } from '../hooks/useUserData';

export default function BottomNav() {
    const pathname = usePathname();
    const { userData } = useUserData();

    const patientNavItems = [
        {
            label: 'Home',
            icon: <MdOutlineHome className="text-2xl" />,
            activeIcon: <MdHome className="text-2xl" />,
            href: '/dashboard',
        },
        {
            label: 'Symptoms',
            icon: <MdOutlineMedicalServices className="text-2xl" />,
            activeIcon: <MdMedicalServices className="text-2xl" />,
            href: '/medical-system',
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
        // We can add more doctor-specific links here later (e.g., Appointments)
        {
            label: 'Profile',
            icon: <MdOutlinePerson className="text-2xl" />,
            activeIcon: <MdPerson className="text-2xl" />,
            href: '/profile', // Doctors can share the same profile page for now, or we create a specific one
        },
    ];

    const navItems = userData?.role === 'doctor' ? doctorNavItems : patientNavItems;

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] pb-safe-area z-50">
            <div className="flex justify-around items-center h-16 md:justify-center md:gap-20">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive ? 'text-[#1A1A1A]' : 'text-gray-500'}`}
                        >
                            {isActive ? item.activeIcon : item.icon}
                            <span className={`text-[10px] ${isActive ? 'font-semibold' : 'font-medium'}`}>
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
