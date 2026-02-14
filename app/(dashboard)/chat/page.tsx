"use client";

import React, { useState, useRef, useEffect } from 'react';
import { MdSend, MdSmartToy, MdPerson, MdAttachFile } from 'react-icons/md';

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'ai';
    timestamp: Date;
}

export default function ChatScreen() {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            text: "Hello! I'm your AI Medical Assistant. How can I help you today?",
            sender: 'ai',
            timestamp: new Date()
        }
    ]);
    const [inputText, setInputText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    const handleSend = async () => {
        if (!inputText.trim()) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            text: inputText,
            sender: 'user',
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInputText('');
        setIsTyping(true);

        try {
            const response = await fetch('/api/gemini/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: inputText }),
            });

            if (!response.ok) throw new Error('Failed to get response');

            const data = await response.json();

            const aiMessage: Message = {
                id: (Date.now() + 1).toString(),
                text: data.response || "I didn't understand that.",
                sender: 'ai',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, aiMessage]);

        } catch (error) {
            console.error("Chat Error:", error);
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                text: "Sorry, I'm having trouble connecting right now.",
                sender: 'ai',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-80px)] max-w-2xl mx-auto w-full bg-gray-50">
            {/* Height calculation accounts for bottom nav roughly */}

            {/* AppBar */}
            <div className="bg-white p-4 shadow-sm z-10 sticky top-0 flex items-center gap-3">
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

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div className={`flex max-w-[80%] ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'} gap-2`}>
                            <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${msg.sender === 'user' ? 'bg-[#1A1A1A]' : 'bg-blue-100'}`}>
                                {msg.sender === 'user' ? <MdPerson className="text-white text-sm" /> : <MdSmartToy className="text-blue-600 text-sm" />}
                            </div>

                            <div className={`p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm ${msg.sender === 'user'
                                ? 'bg-[#1A1A1A] text-white rounded-tr-none'
                                : 'bg-white text-black/87 rounded-tl-none border border-gray-100'
                                }`}>
                                {msg.text}
                                <div className={`text-[10px] mt-1 text-right ${msg.sender === 'user' ? 'text-white/70' : 'text-gray-400'}`}>
                                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-gray-100">
                <div className="flex gap-2">
                    <button className="p-3 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
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
                        disabled={!inputText.trim()}
                        className="p-3 bg-[#1A1A1A] text-white rounded-full hover:bg-black/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
                    >
                        <MdSend className="text-lg ml-0.5" />
                    </button>
                </div>
            </div>

        </div>
    );
}
