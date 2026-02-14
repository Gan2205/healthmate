"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FaGoogle, FaUserMd, FaEye, FaEyeSlash } from 'react-icons/fa';
import { MdEmail } from 'react-icons/md';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../../lib/firebase';

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
            await signInWithEmailAndPassword(auth, email, password);
            router.push('/dashboard');
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
            await signInWithPopup(auth, provider);
            router.push('/dashboard');
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
        <div className="min-h-screen w-full bg-[#F0F0F0] flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-md flex flex-col items-center">

                {/* Header */}
                <h1 className="text-3xl sm:text-4xl font-bold text-black/87 mb-2">
                    Welcome
                </h1>
                <p className="text-lg sm:text-xl text-black/54 mb-10">
                    Please login to continue.
                </p>

                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 w-full text-center text-sm">
                        {error}
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleLogin} className="w-full space-y-6">
                    <div className="space-y-4">
                        {/* Email Input */}
                        <div className="relative group">
                            <div className="absolute inset-0 bg-white rounded-[30px] shadow-[0_4px_12px_rgba(0,0,0,0.1)] transition-shadow group-focus-within:shadow-[0_4px_16px_rgba(0,0,0,0.15)] pointer-events-none" />
                            <div className="relative flex items-center h-[65px] px-6">
                                <div className="absolute top-2 left-6 text-xs text-gray-500 font-medium">Email</div>
                                <input
                                    type="email"
                                    placeholder="Enter your email"
                                    className="w-full bg-transparent border-none outline-none text-base mt-3 placeholder:text-gray-400/50"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                                <MdEmail className="text-gray-400 text-xl ml-2" />
                            </div>
                        </div>

                        {/* Password Input */}
                        <div className="relative group">
                            <div className="absolute inset-0 bg-white rounded-[30px] shadow-[0_4px_12px_rgba(0,0,0,0.1)] transition-shadow group-focus-within:shadow-[0_4px_16px_rgba(0,0,0,0.15)] pointer-events-none" />
                            <div className="relative flex items-center h-[65px] px-6">
                                <div className="absolute top-2 left-6 text-xs text-gray-500 font-medium">Password</div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Enter your password"
                                    className="w-full bg-transparent border-none outline-none text-base mt-3 placeholder:text-gray-400/50"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="text-gray-400 hover:text-gray-600 ml-2"
                                >
                                    {showPassword ? <FaEyeSlash className="text-xl" /> : <FaEye className="text-xl" />}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button type="button" className="text-black/87 font-medium hover:underline">
                            Forgot Password?
                        </button>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full h-[65px] bg-[#1A1A1A] text-white rounded-[30px] text-lg font-medium hover:bg-black/90 transition-colors flex items-center justify-center disabled:opacity-70"
                    >
                        {isLoading ? "Logging in..." : "Login"}
                    </button>
                </form>

                <div className="my-6 text-black/87 font-medium text-lg">OR</div>

                {/* Google Sign In */}
                <button
                    onClick={handleGoogleLogin}
                    className="w-full h-[65px] bg-[#1A1A1A] text-white rounded-[30px] text-lg font-medium hover:bg-black/90 transition-colors flex items-center justify-center gap-3 mb-6"
                >
                    <FaGoogle className="text-xl" />
                    <span>Sign in with Google</span>
                </button>

                {/* Sign Up Link */}
                <div className="flex items-center gap-1 mb-6">
                    <span className="text-black/54">Don&apos;t have an account?</span>
                    <Link href="/signup" className="font-bold text-black/87 hover:underline">
                        Sign Up
                    </Link>
                </div>

                {/* Doctor Login */}
                <Link
                    href="/doctor/login"
                    className="flex items-center gap-2 text-blue-700 font-medium hover:underline"
                >
                    <FaUserMd className="text-lg" />
                    <span>Doctor Login</span>
                </Link>

            </div>
        </div>
    );
}
