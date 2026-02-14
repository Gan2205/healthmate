"use client";

import React from 'react';
import {
    MdNotifications,
    MdSecurity,
    MdInfo,
    MdChevronRight,
    MdLanguage,
    MdHelp
} from 'react-icons/md';

export default function SettingsScreen() {
    return (
        <div className="p-4 sm:p-6 max-w-2xl mx-auto w-full pb-32">
            {/* AppBar */}
            <div className="mb-6">
                <h1 className="text-xl font-bold text-black/87">Settings</h1>
            </div>

            <div className="space-y-4">
                <Section title="General">
                    <SettingItem icon={<MdNotifications />} title="Notifications" />
                    <SettingItem icon={<MdLanguage />} title="Language" value="English" />
                </Section>

                <Section title="Security">
                    <SettingItem icon={<MdSecurity />} title="Privacy & Security" />
                </Section>

                <Section title="Support">
                    <SettingItem icon={<MdHelp />} title="Help & Support" />
                    <SettingItem icon={<MdInfo />} title="About App" value="v1.0.0" />
                </Section>
            </div>

        </div>
    );
}

function Section({ title, children }: { title: string, children: React.ReactNode }) {
    return (
        <div>
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2 ml-2">{title}</h2>
            <div className="bg-white rounded-[20px] shadow-[0_2px_10px_rgba(0,0,0,0.05)] overflow-hidden">
                {children}
            </div>
        </div>
    );
}

function SettingItem({ icon, title, value }: { icon: React.ReactNode, title: string, value?: string }) {
    return (
        <button className="w-full flex items-center justify-between p-4 border-b border-gray-100 last:border-none hover:bg-gray-50 transition-colors text-black/87">
            <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gray-100 text-lg text-gray-600">
                    {icon}
                </div>
                <span className="font-medium text-sm">{title}</span>
            </div>
            <div className="flex items-center gap-2">
                {value && <span className="text-sm text-gray-500">{value}</span>}
                <MdChevronRight className="text-gray-400 text-xl" />
            </div>
        </button>
    );
}
