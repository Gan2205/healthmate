"use client";

import React from 'react';
import Link from 'next/link';
import {
  MdHealthAndSafety,
  MdMedicalServices,
  MdSmartToy,
  MdArrowForward,
  MdCheckCircle,
  MdSecurity
} from 'react-icons/md';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-[#1A1A1A] rounded-xl flex items-center justify-center text-white text-xl">
              <MdHealthAndSafety />
            </div>
            <span className="text-xl font-bold text-[#1A1A1A] tracking-tight">HealthMate</span>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-black transition-colors hidden sm:block">
              Login
            </Link>
            <Link
              href="/signup"
              className="bg-[#1A1A1A] text-white px-5 py-2.5 rounded-full text-sm font-bold hover:bg-black/90 transition-all shadow-lg shadow-black/5"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 pt-20">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-20 sm:py-32 bg-gray-50">
          <div className="max-w-7xl mx-auto px-6 relative z-10">
            <div className="text-center max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold mb-6">
                <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                AI-POWERED HEALTHCARE
              </div>
              <h1 className="text-4xl sm:text-6xl font-black text-[#1A1A1A] leading-[1.1] mb-6 tracking-tight">
                Your Personal AI <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-green-500">
                  Medical Assistant
                </span>
              </h1>
              <p className="text-lg sm:text-xl text-gray-600 mb-10 leading-relaxed max-w-2xl mx-auto">
                Analyze symptoms, get instant medical plans, and chat with an intelligent health assistant.
                Accessible, secure, and always available.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/signup"
                  className="w-full sm:w-auto px-8 py-4 bg-[#1A1A1A] text-white rounded-full font-bold text-lg hover:bg-black/90 transition-all shadow-xl shadow-blue-900/5 flex items-center justify-center gap-2"
                >
                  Start Your Health Journey
                  <MdArrowForward />
                </Link>
                <Link
                  href="/login"
                  className="w-full sm:w-auto px-8 py-4 bg-white text-[#1A1A1A] border border-gray-200 rounded-full font-bold text-lg hover:bg-gray-50 transition-all flex items-center justify-center"
                >
                  Login to Account
                </Link>
              </div>

              <div className="mt-12 flex items-center justify-center gap-8 text-sm text-gray-500 font-medium">
                <div className="flex items-center gap-2">
                  <MdCheckCircle className="text-green-500 text-lg" />
                  Files & Data Encrypted
                </div>
                <div className="flex items-center gap-2">
                  <MdCheckCircle className="text-green-500 text-lg" />
                  24/7 AI Availability
                </div>
              </div>
            </div>
          </div>

          {/* Decorative Elements */}
          <div className="absolute top-1/2 left-0 -translate-y-1/2 w-64 h-64 bg-blue-200 rounded-full blur-[100px] opacity-20 -z-10" />
          <div className="absolute top-0 right-0 w-96 h-96 bg-green-200 rounded-full blur-[100px] opacity-20 -z-10" />
        </section>

        {/* Features Section */}
        <section className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-[#1A1A1A] mb-4">Complete Health Management</h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Everything you need to monitor and improve your health, powered by advanced artificial intelligence.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <FeatureCard
                icon={<MdHealthAndSafety className="text-4xl text-blue-600" />}
                title="Symptom Checker"
                description="Describe your symptoms or upload images. Our AI analyzes them instantly to assess risk levels and potential causes."
                bg="bg-blue-50"
              />
              <FeatureCard
                icon={<MdMedicalServices className="text-4xl text-green-600" />}
                title="Smart Medical Plans"
                description="Get personalized recovery plans including treatment steps, precautions, and specialist recommendations."
                bg="bg-green-50"
              />
              <FeatureCard
                icon={<MdSmartToy className="text-4xl text-purple-600" />}
                title="AI Health Assistant"
                description="Chat with our medical AI for instant answers to your health questions, available 24/7."
                bg="bg-purple-50"
              />
            </div>
          </div>
        </section>

        {/* Security Section */}
        <section className="py-20 bg-[#1A1A1A] text-white">
          <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center gap-12">
            <div className="flex-1">
              <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-6 text-3xl">
                <MdSecurity />
              </div>
              <h2 className="text-3xl font-bold mb-6">Your Health Data is Secure</h2>
              <p className="text-gray-400 mb-8 leading-relaxed">
                We prioritize your privacy. All your medical data, chat history, and personal information are encrypted and securely stored. tailored for your peace of mind.
              </p>
              <ul className="space-y-4">
                <li className="flex items-center gap-3">
                  <MdCheckCircle className="text-green-500 text-xl" />
                  <span>End-to-end encryption for all data</span>
                </li>
                <li className="flex items-center gap-3">
                  <MdCheckCircle className="text-green-500 text-xl" />
                  <span>Private and anonymous analysis</span>
                </li>
                <li className="flex items-center gap-3">
                  <MdCheckCircle className="text-green-500 text-xl" />
                  <span>Compliance with health data standards</span>
                </li>
              </ul>
            </div>
            <div className="flex-1 bg-white/5 p-8 rounded-3xl border border-white/10">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-xl">
                  <MdHealthAndSafety />
                </div>
                <div>
                  <div className="font-bold">Medical System</div>
                  <div className="text-xs text-gray-500">System Status</div>
                </div>
                <div className="ml-auto flex items-center gap-2 text-green-400 text-xs font-bold bg-green-500/10 px-3 py-1 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  OPERATIONAL
                </div>
              </div>
              <div className="space-y-4">
                <div className="h-2 bg-white/10 rounded-full w-3/4" />
                <div className="h-2 bg-white/10 rounded-full w-1/2" />
                <div className="h-2 bg-white/10 rounded-full w-5/6" />
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white py-12 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#1A1A1A] rounded-lg flex items-center justify-center text-white text-sm">
              <MdHealthAndSafety />
            </div>
            <span className="font-bold text-[#1A1A1A]">HealthMate</span>
          </div>

          <div className="text-sm text-gray-500">
            © {new Date().getFullYear()} HealthMate AI. All rights reserved.
          </div>

          <div className="flex gap-6">
            <Link href="#" className="text-gray-400 hover:text-black transition-colors">Privacy</Link>
            <Link href="#" className="text-gray-400 hover:text-black transition-colors">Terms</Link>
            <Link href="#" className="text-gray-400 hover:text-black transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description, bg }: { icon: React.ReactNode, title: string, description: string, bg: string }) {
  return (
    <div className={`p-8 rounded-[30px] ${bg} hover:shadow-xl hover:-translate-y-1 transition-all duration-300`}>
      <div className="mb-6 bg-white w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-[#1A1A1A] mb-3">{title}</h3>
      <p className="text-gray-600 leading-relaxed">
        {description}
      </p>
    </div>
  );
}
