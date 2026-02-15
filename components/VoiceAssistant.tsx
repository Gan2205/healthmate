"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { MdMic, MdMicOff, MdClose, MdVolumeUp, MdLanguage } from 'react-icons/md';

interface VoiceAssistantProps {
    userName?: string;
    sugarLevel?: string;
    heartRate?: string;
}

const LANGUAGES = [
    { code: 'en-US', label: 'English', shortLabel: 'EN', flag: '🇺🇸' },
    { code: 'hi-IN', label: 'हिन्दी', shortLabel: 'HI', flag: '🇮🇳' },
    { code: 'te-IN', label: 'తెలుగు', shortLabel: 'TE', flag: '🇮🇳' },
    { code: 'ta-IN', label: 'தமிழ்', shortLabel: 'TA', flag: '🇮🇳' },
    { code: 'kn-IN', label: 'ಕನ್ನಡ', shortLabel: 'KN', flag: '🇮🇳' },
    { code: 'bn-IN', label: 'বাংলা', shortLabel: 'BN', flag: '🇮🇳' },
    { code: 'mr-IN', label: 'मराठी', shortLabel: 'MR', flag: '🇮🇳' },
    { code: 'gu-IN', label: 'ગુજરાતી', shortLabel: 'GU', flag: '🇮🇳' },
];

export default function VoiceAssistant({ userName, sugarLevel, heartRate }: VoiceAssistantProps) {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [response, setResponse] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [selectedLang, setSelectedLang] = useState('en-US');
    const [showLangPicker, setShowLangPicker] = useState(false);
    const [error, setError] = useState('');

    const recognitionRef = useRef<any>(null);
    const synthRef = useRef<SpeechSynthesisUtterance | null>(null);

    // Check browser support
    const isSpeechSupported = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

    const stopSpeaking = useCallback(() => {
        if (typeof window !== 'undefined') {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
        }
    }, []);

    const speak = useCallback((text: string, lang: string) => {
        if (typeof window === 'undefined') return;
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        utterance.rate = 1.0;
        utterance.pitch = 1;

        // Enhanced voice selection
        const voices = window.speechSynthesis.getVoices();
        console.log(`Available voices for ${lang}:`, voices.filter(v => v.lang.includes(lang.split('-')[0])).map(v => v.name));

        // 1. Try exact match with "Google" (usually best quality)
        let matchingVoice = voices.find(v => v.lang === lang && v.name.includes('Google'));

        // 2. Try any exact locale match (e.g. hi-IN)
        if (!matchingVoice) {
            matchingVoice = voices.find(v => v.lang === lang);
        }

        // 3. Try match by language code only (e.g. hi)
        if (!matchingVoice) {
            matchingVoice = voices.find(v => v.lang.startsWith(lang.split('-')[0]));
        }

        if (matchingVoice) {
            utterance.voice = matchingVoice;
            console.log("Selected voice:", matchingVoice.name);
        } else {
            console.warn("No matching voice found for", lang);
        }

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = (e) => {
            console.error("TTS Error:", e);
            setIsSpeaking(false);
        };

        synthRef.current = utterance;
        window.speechSynthesis.speak(utterance);
    }, []);

    const processTranscript = useCallback(async (text: string, lang: string) => {
        setIsProcessing(true);
        setError('');

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: text,
                    // Keeping these for context if we enhance the backend later, though currently unused by the simple BLOOM backend
                    language: lang,
                    userContext: {
                        name: userName || 'User',
                        sugarLevel: sugarLevel || 'Unknown',
                        heartRate: heartRate || 'Unknown',
                    }
                })
            });

            const data = await res.json();

            if (data.error) {
                if (data.error.includes('429') || data.error.includes('Quota') || data.error.includes('Too Many Requests')) {
                    setError('System is currently overloaded. Please try again in a moment.');
                } else {
                    setError(typeof data.error === 'string' ? data.error : JSON.stringify(data.error));
                }
                return;
            }

            setResponse(data.reply);

            // Speak the response
            speak(data.reply, lang); // Using input lang as output lang for now since backend doesn't return language

            // Navigation action is removed as the simple backend doesn't support it
        } catch (err) {
            setError('Failed to process. Please try again.');
            console.error('Voice assistant error:', err);
        } finally {
            setIsProcessing(false);
        }
    }, [userName, sugarLevel, heartRate, speak]);

    const [retryCount, setRetryCount] = useState(0);
    const isStoppedRef = useRef(false);
    const isRetryingRef = useRef(false);

    const startListening = useCallback(() => {
        if (!isSpeechSupported) {
            setError('Speech recognition not supported in this browser. Please use Chrome.');
            return;
        }

        setTranscript('');
        setResponse('');
        setError('');
        stopSpeaking();
        isStoppedRef.current = false;
        isRetryingRef.current = false;
        setRetryCount(0);

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();

        recognition.lang = selectedLang;
        recognition.interimResults = true;
        recognition.continuous = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            if (isStoppedRef.current) {
                recognition.stop();
                return;
            }
            setIsListening(true);
        };

        recognition.onresult = (event: any) => {
            if (isStoppedRef.current) return;

            let interim = '';
            let final = '';

            for (let i = 0; i < event.results.length; i++) {
                if (event.results[i].isFinal) {
                    final += event.results[i][0].transcript;
                } else {
                    interim += event.results[i][0].transcript;
                }
            }

            setTranscript(final || interim);

            if (final) {
                isRetryingRef.current = false; // Success, no need to retry
                processTranscript(final, selectedLang);
            }
        };

        recognition.onerror = (event: any) => {
            if (isStoppedRef.current) return;

            // Handle 'no-speech' gracefully - it's common when waiting
            if (event.error === 'no-speech') {
                console.warn('Speech recognition: No speech detected.');
                if (retryCount < 2) {
                    isRetryingRef.current = true;
                    setRetryCount(prev => prev + 1);
                    console.log(`Retrying speech recognition (${retryCount + 1}/2)...`);
                    return;
                }
            } else {
                console.error('Speech recognition error:', event.error);
            }

            if (event.error === 'no-speech') {
                setError('No speech detected. Please try again.');
            } else if (event.error === 'not-allowed') {
                setError('Microphone access denied. Please allow microphone access.');
            } else {
                setError(`Error: ${event.error}`);
            }
            isRetryingRef.current = false;
            setIsListening(false);
        };

        recognition.onend = () => {
            if (isStoppedRef.current) {
                setIsListening(false);
                return;
            }

            if (isRetryingRef.current) {
                // Restart immediately for retry
                try {
                    recognition.start();
                } catch (e) {
                    console.error("Retry start error:", e);
                    setIsListening(false);
                    isRetryingRef.current = false;
                }
            } else {
                setIsListening(false);
            }
        };

        recognitionRef.current = recognition;
        try {
            recognition.start();
        } catch (e) {
            console.error("Start error", e);
        }
    }, [isSpeechSupported, selectedLang, stopSpeaking, processTranscript, retryCount]);

    const stopListening = useCallback(() => {
        isStoppedRef.current = true;
        isRetryingRef.current = false;
        if (recognitionRef.current) {
            recognitionRef.current.abort();
        }
        setIsListening(false);
    }, []);

    // Load voices
    useEffect(() => {
        const loadVoices = () => {
            const voices = window.speechSynthesis.getVoices();
            if (voices.length > 0) {
                console.log("Voices loaded:", voices.length);
            }
        };

        if (typeof window !== 'undefined') {
            loadVoices();
            window.speechSynthesis.onvoiceschanged = loadVoices;
        }
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.abort();
            }
            if (typeof window !== 'undefined') {
                window.speechSynthesis.cancel();
            }
        };
    }, []);

    const currentLang = LANGUAGES.find(l => l.code === selectedLang) || LANGUAGES[0];

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-24 right-5 z-50 w-14 h-14 bg-gradient-to-br from-purple-600 to-indigo-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center hover:scale-110 active:scale-95"
                aria-label="Open Voice Assistant"
            >
                <MdMic className="text-2xl" />
                {/* Subtle pulse */}
                <span className="absolute inset-0 rounded-full bg-purple-400 animate-ping opacity-20" />
            </button>
        );
    }

    return (
        <div className="fixed bottom-24 right-5 z-50 w-[340px] max-h-[480px] bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col"
            style={{ animation: 'slideUp 0.3s ease-out' }}
        >
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-700 px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                        <MdMic className="text-white text-lg" />
                    </div>
                    <div>
                        <div className="text-white text-sm font-bold">HealthMate Voice</div>
                        <div className="text-white/70 text-[10px]">Multilingual Health Assistant</div>
                    </div>
                </div>
                <button
                    onClick={() => {
                        setIsOpen(false);
                        stopListening();
                        stopSpeaking();
                        setTranscript('');
                        setResponse('');
                    }}
                    className="text-white/70 hover:text-white p-1"
                >
                    <MdClose className="text-xl" />
                </button>
            </div>

            {/* Language Selector */}
            <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                <div className="relative">
                    <button
                        onClick={() => setShowLangPicker(!showLangPicker)}
                        className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors w-full justify-between bg-white px-3 py-2 rounded-xl border border-gray-200"
                    >
                        <div className="flex items-center gap-2">
                            <MdLanguage className="text-purple-600" />
                            <span>{currentLang.flag} {currentLang.label}</span>
                        </div>
                        <span className="text-xs text-gray-400">▼</span>
                    </button>

                    {showLangPicker && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-200 z-10 max-h-[200px] overflow-y-auto">
                            {LANGUAGES.map(lang => (
                                <button
                                    key={lang.code}
                                    onClick={() => {
                                        setSelectedLang(lang.code);
                                        setShowLangPicker(false);
                                    }}
                                    className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 hover:bg-purple-50 transition-colors ${selectedLang === lang.code ? 'bg-purple-50 text-purple-700 font-bold' : 'text-gray-700'
                                        }`}
                                >
                                    <span>{lang.flag}</span>
                                    <span>{lang.label}</span>
                                    {selectedLang === lang.code && <span className="ml-auto text-purple-600">✓</span>}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 min-h-[160px]">
                {/* Idle State */}
                {!isListening && !transcript && !response && !isProcessing && !error && (
                    <div className="text-center py-6 text-gray-400">
                        <MdMic className="text-5xl mx-auto mb-3 text-gray-300" />
                        <p className="text-sm font-medium">Tap the mic to speak</p>
                        <p className="text-xs mt-1">Ask about health, book appointments, or check vitals</p>
                    </div>
                )}

                {/* Listening Animation */}
                {isListening && (
                    <div className="text-center py-4">
                        <div className="relative w-20 h-20 mx-auto mb-3">
                            <div className="absolute inset-0 rounded-full bg-purple-100 animate-ping" />
                            <div className="absolute inset-2 rounded-full bg-purple-200 animate-ping" style={{ animationDelay: '0.2s' }} />
                            <div className="absolute inset-4 rounded-full bg-purple-600 flex items-center justify-center">
                                <MdMic className="text-white text-2xl" />
                            </div>
                        </div>
                        <p className="text-sm font-bold text-purple-700">Listening...</p>
                    </div>
                )}

                {/* Transcript */}
                {transcript && (
                    <div className="flex justify-end">
                        <div className="bg-purple-600 text-white px-4 py-2.5 rounded-2xl rounded-br-sm max-w-[85%] text-sm">
                            {transcript}
                        </div>
                    </div>
                )}

                {/* Processing */}
                {isProcessing && (
                    <div className="flex justify-start">
                        <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-bl-sm">
                            <div className="flex gap-1.5">
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                            </div>
                        </div>
                    </div>
                )}

                {/* Response */}
                {response && (
                    <div className="flex justify-start">
                        <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-bl-sm max-w-[90%]">
                            <p className="text-sm text-gray-800 leading-relaxed">{response}</p>
                            {isSpeaking && (
                                <div className="flex items-center gap-1 mt-2 text-purple-600">
                                    <MdVolumeUp className="text-sm animate-pulse" />
                                    <span className="text-[10px] font-medium">Speaking...</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-100">
                        {error}
                    </div>
                )}
            </div>

            {/* Bottom Controls */}
            <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-center gap-4">
                {isSpeaking && (
                    <button
                        onClick={stopSpeaking}
                        className="w-10 h-10 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center hover:bg-gray-300 transition-colors"
                        title="Stop speaking"
                    >
                        <MdVolumeUp className="text-lg" />
                    </button>
                )}

                <button
                    onClick={isListening ? stopListening : startListening}
                    disabled={isProcessing}
                    className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ${isListening
                        ? 'bg-red-500 hover:bg-red-600 text-white scale-110'
                        : isProcessing
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-gradient-to-br from-purple-600 to-indigo-700 text-white hover:shadow-xl hover:scale-105 active:scale-95'
                        }`}
                >
                    {isListening ? (
                        <MdMicOff className="text-2xl" />
                    ) : (
                        <MdMic className="text-2xl" />
                    )}
                </button>

                {response && !isListening && !isProcessing && (
                    <button
                        onClick={() => speak(response, selectedLang)}
                        className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center hover:bg-purple-200 transition-colors"
                        title="Replay response"
                    >
                        <MdVolumeUp className="text-lg" />
                    </button>
                )}
            </div>

            <style jsx>{`
                @keyframes slideUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `}</style>
        </div>
    );
}
