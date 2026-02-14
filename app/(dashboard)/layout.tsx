import React from 'react';
import BottomNav from '../../components/BottomNav';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex flex-col min-h-screen bg-[#FAFAFA]">
            <div className="flex-1 pb-20"> {/* Padding bottom for nav bar */}
                {children}
            </div>
            <BottomNav />
        </div>
    );
}
