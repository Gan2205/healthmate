"use client";

import React, { useState, useRef, useEffect } from 'react';
import { MdSend, MdSmartToy, MdPerson, MdAttachFile, MdClose, MdImage, MdDeleteOutline } from 'react-icons/md';
import {
    collection,
    addDoc,
    query,
    orderBy,
    onSnapshot,
    deleteDoc,
    getDocs,
    serverTimestamp,
    Timestamp
} from 'firebase/firestore';
import { db, auth } from '../../../lib/firebase';
import { usePatientData } from '../../../hooks/usePatientData';

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'ai';
    timestamp: Date;
    imageBase64?: string;
}

export default function ChatScreen() {
    const patientData = usePatientData(); // Use new hook
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // Subscribe to Firestore Chat History
    useEffect(() => {
        if (!auth.currentUser) return;

        const q = query(
            collection(db, "users", auth.currentUser.uid, "chats"),
            orderBy("timestamp", "asc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedMessages = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                timestamp: doc.data().timestamp?.toDate() || new Date()
            })) as Message[];

            // If empty, add welcome message (locally only, or save it if preferred)
            if (fetchedMessages.length === 0) {
                setMessages([{
                    id: 'welcome',
                    text: "Hello! I'm your AI Medical Assistant. How can I help you today?",
                    sender: 'ai',
                    timestamp: new Date()
                }]);
            } else {
                setMessages(fetchedMessages);
            }
            setLoading(false);
        }, (error) => {
            console.error("Error fetching chat history:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping, loading]);

    const handleSend = async () => {
        if (!inputText.trim() && !selectedImage) return;
        if (!auth.currentUser) return;

        const textToSend = inputText;
        const imageToSend = selectedImage;

        setInputText('');
        setSelectedImage(null);
        setIsTyping(true);

        try {
            // 1. Save User Message to Firestore
            await addDoc(collection(db, "users", auth.currentUser.uid, "chats"), {
                text: textToSend,
                sender: 'user',
                timestamp: serverTimestamp(),
                imageBase64: imageToSend || null
            });

            // 2. Call Gemini API
            const response = await fetch('/api/gemini/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: textToSend,
                    imageBase64: imageToSend,
                    patientData: patientData // Send full patient dashboard data
                }),
            });

            if (!response.ok) throw new Error('Failed to get response');

            const data = await response.json();
            const aiResponseText = data.response || "I didn't understand that.";

            // 3. Save AI Response to Firestore
            await addDoc(collection(db, "users", auth.currentUser.uid, "chats"), {
                text: aiResponseText,
                sender: 'ai',
                timestamp: serverTimestamp()
            });

        } catch (error) {
            console.error("Chat Error:", error);
            // Optionally save error message to Firestore or just show alert
            await addDoc(collection(db, "users", auth.currentUser.uid, "chats"), {
                text: "Sorry, I'm having trouble connecting right now. Please try again.",
                sender: 'ai',
                timestamp: serverTimestamp()
            });
        } finally {
            setIsTyping(false);
        }
    };

    const handleClearHistory = async () => {
        if (!auth.currentUser) return;
        if (!confirm("Are you sure you want to clear your entire chat history?")) return;

        try {
            const q = query(collection(db, "users", auth.currentUser.uid, "chats"));
            const snapshot = await getDocs(q);

            const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
            await Promise.all(deletePromises);

            setMessages([{
                id: 'welcome_reset',
                text: "Chat history cleared. How can I help you now?",
                sender: 'ai',
                timestamp: new Date()
            }]);
        } catch (error) {
            console.error("Error clearing history:", error);
            alert("Failed to clear history");
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-80px)] max-w-2xl mx-auto w-full bg-gray-50 animate-fade-in">
            {/* AppBar */}
            <div className="bg-white p-4 shadow-sm z-10 sticky top-0 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <MdSmartToy className="text-xl text-blue-600" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-black/87">AI Medical Assistant</h1>
                        <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            <span className="text-xs text-gray-500">Online</span>
                        </div>
                    </div>
                </div>

                {/* Clear History Button */}
                <button
                    onClick={handleClearHistory}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                    title="Clear Chat History"
                >
                    <MdDeleteOutline className="text-2xl" />
                </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {loading ? (
                    <div className="flex justify-center items-center h-full text-gray-400 text-sm">
                        Loading history...
                    </div>
                ) : (
                    <>
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div className={`flex max-w-[85%] ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'} gap-2`}>
                                    <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${msg.sender === 'user' ? 'bg-[#1A1A1A]' : 'bg-blue-100'}`}>
                                        {msg.sender === 'user' ? <MdPerson className="text-white text-sm" /> : <MdSmartToy className="text-blue-600 text-sm" />}
                                    </div>

                                    <div className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                                        <div className={`p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm ${msg.sender === 'user'
                                            ? 'bg-[#1A1A1A] text-white rounded-tr-none'
                                            : 'bg-white text-black/87 rounded-tl-none border border-gray-100'
                                            }`}>

                                            {/* Image rendering */}
                                            {msg.imageBase64 && (
                                                <img
                                                    src={msg.imageBase64}
                                                    alt="User upload"
                                                    className="max-w-full h-auto rounded-lg mb-2 border border-gray-600/30"
                                                    style={{ maxHeight: '200px' }}
                                                />
                                            )}

                                            {msg.text}
                                        </div>
                                        <div className="text-[10px] mt-1 text-gray-400 px-1">
                                            {msg.timestamp?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {isTyping && (
                            <div className="flex justify-start">
                                <div className="flex max-w-[80%] gap-2">
                                    <div className="w-8 h-8 rounded-full bg-blue-100 flex-shrink-0 flex items-center justify-center">
                                        <MdSmartToy className="text-blue-600 text-sm" />
                                    </div>
                                    <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-gray-100 shadow-sm flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </>
                )}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-gray-100">
                {selectedImage && (
                    <div className="mb-3 relative inline-block">
                        <img src={selectedImage} alt="Preview" className="h-20 w-auto rounded-lg border border-gray-200" />
                        <button
                            onClick={() => setSelectedImage(null)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600"
                        >
                            <MdClose className="text-xs" />
                        </button>
                    </div>
                )}

                <div className="flex gap-2">
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                    setSelectedImage(reader.result as string);
                                };
                                reader.readAsDataURL(file);
                            }
                        }}
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className={`p-3 rounded-full transition-colors ${selectedImage ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
                    >
                        <MdAttachFile className="text-xl" />
                    </button>
                    <div className="flex-1 bg-gray-100 rounded-[24px] flex items-center px-4">
                        <input
                            type="text"
                            placeholder="Type a message..."
                            className="w-full bg-transparent border-none outline-none text-sm py-3 placeholder:text-gray-500"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        />
                    </div>
                    <button
                        onClick={handleSend}
                        disabled={!inputText.trim() && !selectedImage}
                        className="p-3 bg-[#1A1A1A] text-white rounded-full hover:bg-black/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
                    >
                        <MdSend className="text-lg ml-0.5" />
                    </button>
                </div>
            </div>

        </div>
    );
}
