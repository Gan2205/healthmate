"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FaGoogle, FaEye, FaEyeSlash } from 'react-icons/fa';
import { MdEmail, MdPerson } from 'react-icons/md';
import { createUserWithEmailAndPassword, updateProfile, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth, db } from '../../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

export default function SignupScreen() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<'patient' | 'doctor'>('patient'); // Default to patient
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            // Step 1: Authentication
            console.log("Starting sign up...");
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            console.log("User created:", user.uid);

            await updateProfile(user, { displayName: name });

            // Step 2: Firestore
            console.log("Saving user data to Firestore...");
            // Create user document in Firestore
            await setDoc(doc(db, "users", user.uid), {
                name: name,
                email: email,
                uid: user.uid,
                createdAt: new Date().toISOString(),
                role: role // Use state value
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
                // If it's a Firestore error that doesn't have a code, it often hangs or throws generic
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

            // Check if user doc exists, if not create it
            // For simplicity in this demo, we'll just overwrite or merge
            await setDoc(doc(db, "users", user.uid), {
                name: user.displayName || 'Unknown',
                email: user.email,
                uid: user.uid,
                lastLogin: new Date().toISOString(),
                role: role // Add role for Google signup as well
            }, { merge: true });

            // Step 3: Redirect
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
        <div className="min-h-screen w-full bg-[#F0F0F0] flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-md flex flex-col items-center">

                {/* Header */}
                <h1 className="text-3xl sm:text-4xl font-bold text-black/87 mb-2">
                    Welcome
                </h1>
                <p className="text-lg sm:text-xl text-black/54 mb-10">
                    Create an Account
                </p>

                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 w-full text-center text-sm">
                        {error}
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSignup} className="w-full space-y-6">
                    <div className="space-y-4">
                        {/* Name Input */}
                        <div className="relative group">
                            <div className="absolute inset-0 bg-white rounded-[30px] shadow-[0_4px_12px_rgba(0,0,0,0.1)] transition-shadow group-focus-within:shadow-[0_4px_16px_rgba(0,0,0,0.15)] pointer-events-none" />
                            <div className="relative flex items-center h-[65px] px-6">
                                <div className="absolute top-2 left-6 text-xs text-gray-500 font-medium">Name</div>
                                <input
                                    type="text"
                                    placeholder="Enter your name"
                                    className="w-full bg-transparent border-none outline-none text-base mt-3 placeholder:text-gray-400/50"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                />
                                <MdPerson className="text-gray-400 text-xl ml-2" />
                            </div>
                        </div>

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
                                    minLength={6}
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

                    <div className="flex gap-4 mb-6">
                        <button
                            type="button"
                            onClick={() => setRole('patient')}
                            className={`flex-1 py-3 rounded-xl border font-medium text-sm transition-all ${role === 'patient'
                                ? 'bg-black text-white border-black'
                                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}
                        >
                            Patient
                        </button>
                        <button
                            type="button"
                            onClick={() => setRole('doctor')}
                            className={`flex-1 py-3 rounded-xl border font-medium text-sm transition-all ${role === 'doctor'
                                ? 'bg-black text-white border-black'
                                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}
                        >
                            Doctor
                        </button>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full h-[65px] bg-[#1A1A1A] text-white rounded-[30px] text-lg font-medium hover:bg-black/90 transition-colors flex items-center justify-center disabled:opacity-70 mt-4"
                    >
                        {isLoading ? "creating account..." : "Sign Up"}
                    </button>
                </form>

                <div className="my-4 text-black/87 font-medium text-lg">OR</div>

                {/* Google Sign Up */}
                <button
                    onClick={handleGoogleSignup}
                    className="w-full h-[65px] bg-[#1A1A1A] text-white rounded-[30px] text-lg font-medium hover:bg-black/90 transition-colors flex items-center justify-center gap-3 mb-6"
                >
                    <FaGoogle className="text-xl" />
                    <span>Sign in with Google</span>
                </button>

                {/* Login Link */}
                <div className="flex items-center gap-1">
                    <span className="text-black/54">Already have an account?</span>
                    <Link href="/login" className="font-bold text-black/87 hover:underline">
                        login
                    </Link>
                </div>

            </div>
        </div>
    );
}
