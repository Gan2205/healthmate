import React from 'react';
import SideNav from '../../components/SideNav';
import BottomNav from '../../components/BottomNav';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen">
            <SideNav />
            <main className="flex-1 md:ml-64 pb-20 md:pb-0 min-h-screen" style={{ background: 'linear-gradient(135deg, #EEF2FF 0%, #E8EEFF 30%, #F0F4FF 60%, #F5F7FF 100%)' }}>
                {children}
            </main>
            <BottomNav />
        </div>
    );
}
