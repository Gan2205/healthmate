"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FaGoogle, FaUserMd, FaEye, FaEyeSlash, FaStethoscope } from 'react-icons/fa';
import { MdEmail, MdDescription } from 'react-icons/md';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth, db } from '../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function LoginScreen() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));
            const userData = userDoc.data();

            if (userData?.role === 'doctor') {
                router.push('/doctor');
            } else {
                router.push('/dashboard');
            }
        } catch (err: any) {
            console.error(err);
            if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
                setError('Invalid email or password.');
            } else if (err.code === 'auth/network-request-failed') {
                setError('Network error. Please check your internet connection.');
            } else if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('Failed to login');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        setError('');
        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);

            const userDoc = await getDoc(doc(db, "users", result.user.uid));
            const userData = userDoc.data();

            if (userData?.role === 'doctor') {
                router.push('/doctor');
            } else {
                router.push('/dashboard');
            }
        } catch (err: unknown) {
            console.error(err);
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('Google sign-in failed');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full bg-gradient-to-br from-gray-100 via-gray-50 to-blue-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Decorative background blobs */}
            <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-gradient-to-br from-blue-200/30 to-violet-200/20 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDuration: '6s' }} />
            <div className="absolute bottom-[-10%] left-[-5%] w-80 h-80 bg-gradient-to-tr from-indigo-200/20 to-purple-200/15 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDuration: '8s' }} />
            <div className="absolute top-[40%] left-[60%] w-40 h-40 bg-gradient-to-br from-teal-100/20 to-blue-100/10 rounded-full blur-2xl pointer-events-none" />

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
                    Please login to continue.
                </p>

                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-4 w-full text-center text-sm border border-red-100 animate-fade-in">
                        {error}
                    </div>
                )}

                {/* Card Container */}
                <div className="w-full bg-white/70 backdrop-blur-xl rounded-3xl shadow-[0_8px_40px_rgba(0,0,0,0.06)] border border-white/80 p-8 animate-slide-up" style={{ animationDelay: '0.2s' }}>
                    <form onSubmit={handleLogin} className="w-full space-y-5">
                        <div className="space-y-4">
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

                        <div className="flex justify-end">
                            <button type="button" className="text-sm text-gray-500 font-semibold hover:text-gray-900 transition-colors">
                                Forgot Password?
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
                                    <span>Logging in...</span>
                                </div>
                            ) : "Login"}
                        </button>
                    </form>

                    <div className="flex items-center gap-4 my-6">
                        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
                        <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">or</span>
                        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
                    </div>

                    {/* Google Sign In */}
                    <button
                        onClick={handleGoogleLogin}
                        className="w-full h-[56px] bg-white border-2 border-gray-100 text-gray-700 rounded-2xl text-sm font-semibold hover:border-gray-200 hover:bg-gray-50 hover:shadow-lg hover:shadow-gray-100 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-3"
                    >
                        <FaGoogle className="text-lg" />
                        <span>Continue with Google</span>
                    </button>
                </div>

                {/* Sign Up Link */}
                <div className="flex items-center gap-1.5 mt-8 animate-slide-up" style={{ animationDelay: '0.3s' }}>
                    <span className="text-sm text-gray-400">Don&apos;t have an account?</span>
                    <Link href="/signup" className="text-sm font-bold text-gray-900 hover:text-blue-600 transition-colors">
                        Sign Up
                    </Link>
                </div>

            </div>
        </div>
    );
}
