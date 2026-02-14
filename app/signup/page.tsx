"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FaGoogle, FaEye, FaEyeSlash, FaStethoscope, FaUserInjured } from 'react-icons/fa';
import { MdEmail, MdPerson, MdDescription } from 'react-icons/md';
import { createUserWithEmailAndPassword, updateProfile, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth, db } from '../../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

export default function SignupScreen() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<'patient' | 'doctor'>('patient');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            console.log("Starting sign up...");
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            console.log("User created:", user.uid);

            await updateProfile(user, { displayName: name });

            console.log("Saving user data to Firestore...");
            await setDoc(doc(db, "users", user.uid), {
                name: name,
                email: email,
                uid: user.uid,
                createdAt: new Date().toISOString(),
                role: role
            });
            console.log("Firestore document created.");

            router.push('/dashboard');
        } catch (err: any) {
            console.error("Signup error details:", err);

            if (err.code === 'auth/email-already-in-use') {
                setError('This email is already registered. Please login instead.');
            } else if (err.code === 'auth/network-request-failed') {
                setError('Network error. Check your connection.');
            } else if (err.code === 'permission-denied') {
                setError('Database permission denied. Check Firestore rules.');
            } else {
                setError(`Error: ${err.message || 'Failed to sign up. Check if Firestore is enabled in Console.'}`);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleSignup = async () => {
        setIsLoading(true);
        setError('');
        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            await setDoc(doc(db, "users", user.uid), {
                name: user.displayName || 'Unknown',
                email: user.email,
                uid: user.uid,
                lastLogin: new Date().toISOString(),
                role: role
            }, { merge: true });

            if (role === 'doctor') {
                router.push('/doctor');
            } else {
                router.push('/dashboard');
            }
        } catch (err: unknown) {
            console.error(err);
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('Google sign-up failed');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full bg-gradient-to-br from-gray-100 via-gray-50 to-blue-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Decorative background blobs */}
            <div className="absolute top-[-10%] left-[-5%] w-96 h-96 bg-gradient-to-br from-violet-200/25 to-blue-200/20 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDuration: '7s' }} />
            <div className="absolute bottom-[-10%] right-[-5%] w-80 h-80 bg-gradient-to-tr from-blue-200/20 to-indigo-200/15 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDuration: '9s' }} />
            <div className="absolute top-[30%] right-[20%] w-40 h-40 bg-gradient-to-br from-teal-100/15 to-purple-100/10 rounded-full blur-2xl pointer-events-none" />

            <div className="w-full max-w-md flex flex-col items-center relative z-10 animate-fade-in">

                {/* Logo */}
                <div className="mb-6 w-16 h-16 bg-gradient-to-br from-gray-900 to-gray-700 rounded-2xl flex items-center justify-center shadow-xl shadow-gray-900/10 animate-slide-up relative">
                    <MdDescription className="text-white/50 text-3xl absolute -translate-x-1.5 -translate-y-0.5" />
                    <FaStethoscope className="text-white text-xl absolute translate-x-2 translate-y-2" />
                </div>

                {/* Header */}
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2 animate-slide-up" style={{ animationDelay: '0.1s' }}>
                    Welcome
                </h1>
                <p className="text-base text-gray-400 mb-8 animate-slide-up" style={{ animationDelay: '0.15s' }}>
                    Create an Account
                </p>

                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-4 w-full text-center text-sm border border-red-100 animate-fade-in">
                        {error}
                    </div>
                )}

                {/* Card Container */}
                <div className="w-full bg-white/70 backdrop-blur-xl rounded-3xl shadow-[0_8px_40px_rgba(0,0,0,0.06)] border border-white/80 p-8 animate-slide-up" style={{ animationDelay: '0.2s' }}>
                    <form onSubmit={handleSignup} className="w-full space-y-5">
                        <div className="space-y-4">
                            {/* Name */}
                            <div className="relative group">
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-200/50 to-violet-200/50 rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 blur-sm" />
                                <div className="relative bg-gray-50 rounded-2xl focus-within:bg-white focus-within:shadow-lg transition-all duration-300 border border-gray-100 focus-within:border-gray-200">
                                    <div className="flex items-center h-[60px] px-5">
                                        <div className="absolute top-2 left-5 text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Name</div>
                                        <input
                                            type="text"
                                            placeholder="Enter your name"
                                            className="w-full bg-transparent border-none outline-none text-sm mt-3 placeholder:text-gray-300 text-gray-800 font-medium"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            required
                                        />
                                        <MdPerson className="text-gray-300 text-lg ml-2 group-focus-within:text-blue-400 transition-colors" />
                                    </div>
                                </div>
                            </div>

                            {/* Email */}
                            <div className="relative group">
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-200/50 to-violet-200/50 rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 blur-sm" />
                                <div className="relative bg-gray-50 rounded-2xl focus-within:bg-white focus-within:shadow-lg transition-all duration-300 border border-gray-100 focus-within:border-gray-200">
                                    <div className="flex items-center h-[60px] px-5">
                                        <div className="absolute top-2 left-5 text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Email</div>
                                        <input
                                            type="email"
                                            placeholder="Enter your email"
                                            className="w-full bg-transparent border-none outline-none text-sm mt-3 placeholder:text-gray-300 text-gray-800 font-medium"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                        />
                                        <MdEmail className="text-gray-300 text-lg ml-2 group-focus-within:text-blue-400 transition-colors" />
                                    </div>
                                </div>
                            </div>

                            {/* Password */}
                            <div className="relative group">
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-200/50 to-violet-200/50 rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 blur-sm" />
                                <div className="relative bg-gray-50 rounded-2xl focus-within:bg-white focus-within:shadow-lg transition-all duration-300 border border-gray-100 focus-within:border-gray-200">
                                    <div className="flex items-center h-[60px] px-5">
                                        <div className="absolute top-2 left-5 text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Password</div>
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            placeholder="Enter your password"
                                            className="w-full bg-transparent border-none outline-none text-sm mt-3 placeholder:text-gray-300 text-gray-800 font-medium"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            minLength={6}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="text-gray-300 hover:text-gray-500 ml-2 transition-colors"
                                        >
                                            {showPassword ? <FaEyeSlash className="text-lg" /> : <FaEye className="text-lg" />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Role Selector */}
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setRole('patient')}
                                className={`flex-1 py-3.5 rounded-2xl border-2 font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${role === 'patient'
                                    ? 'bg-gradient-to-r from-gray-900 to-gray-800 text-white border-gray-900 shadow-lg shadow-gray-900/10 scale-[1.02]'
                                    : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200 hover:text-gray-600'}`}
                            >
                                <FaUserInjured className="text-base" />
                                Patient
                            </button>
                            <button
                                type="button"
                                onClick={() => setRole('doctor')}
                                className={`flex-1 py-3.5 rounded-2xl border-2 font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${role === 'doctor'
                                    ? 'bg-gradient-to-r from-gray-900 to-gray-800 text-white border-gray-900 shadow-lg shadow-gray-900/10 scale-[1.02]'
                                    : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200 hover:text-gray-600'}`}
                            >
                                <FaStethoscope className="text-base" />
                                Doctor
                            </button>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-[56px] bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-2xl text-base font-semibold hover:from-gray-800 hover:to-gray-700 hover:shadow-xl hover:shadow-gray-900/15 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center disabled:opacity-70 disabled:hover:scale-100"
                        >
                            {isLoading ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>Creating account...</span>
                                </div>
                            ) : "Sign Up"}
                        </button>
                    </form>

                    <div className="flex items-center gap-4 my-6">
                        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
                        <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">or</span>
                        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
                    </div>

                    {/* Google Sign Up */}
                    <button
                        onClick={handleGoogleSignup}
                        className="w-full h-[56px] bg-white border-2 border-gray-100 text-gray-700 rounded-2xl text-sm font-semibold hover:border-gray-200 hover:bg-gray-50 hover:shadow-lg hover:shadow-gray-100 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-3"
                    >
                        <FaGoogle className="text-lg" />
                        <span>Continue with Google</span>
                    </button>
                </div>

                {/* Login Link */}
                <div className="flex items-center gap-1.5 mt-8 animate-slide-up" style={{ animationDelay: '0.3s' }}>
                    <span className="text-sm text-gray-400">Already have an account?</span>
                    <Link href="/login" className="text-sm font-bold text-gray-900 hover:text-blue-600 transition-colors">
                        Login
                    </Link>
                </div>

            </div>
        </div>
    );
}
