"use client";

import React, { useState, useRef } from 'react';
import {
    MdCloudUpload,
    MdArrowBack,
    MdCheckCircle,
    MdWarning,
    MdError,
    MdInfo,
    MdDescription,
    MdDelete,
    MdContentPaste,
    MdAutoAwesome,
    MdLocalHospital,
} from 'react-icons/md';
import { FaHeartbeat, FaStethoscope, FaFileMedical } from 'react-icons/fa';
import { useRouter } from 'next/navigation';
import { useUserData } from '../../../hooks/useUserData';

const REPORT_TYPES = [
    { label: 'Blood Test (CBC)', value: 'Complete Blood Count (CBC)' },
    { label: 'Lipid Profile', value: 'Lipid Profile / Cholesterol' },
    { label: 'Thyroid Panel', value: 'Thyroid Function Test' },
    { label: 'Liver Function', value: 'Liver Function Test (LFT)' },
    { label: 'Kidney Function', value: 'Kidney Function Test (KFT)' },
    { label: 'Blood Sugar / HbA1c', value: 'Blood Sugar / HbA1c / Diabetes Panel' },
    { label: 'ECG', value: 'Electrocardiogram (ECG/EKG)' },
    { label: 'ECHO', value: 'Echocardiogram (ECHO)' },
    { label: 'TMT / Stress Test', value: 'Treadmill Test (TMT) / Stress Test' },
    { label: 'Urine Test', value: 'Urine Routine & Microscopy' },
    { label: 'X-Ray', value: 'X-Ray Report' },
    { label: 'MRI / CT Scan', value: 'MRI / CT Scan Report' },
    { label: 'Vitamin Panel', value: 'Vitamin D / B12 / Iron Panel' },
    { label: 'Other', value: 'General Medical Report' },
];

export default function ReportAnalyzerPage() {
    const router = useRouter();
    const { userData } = useUserData();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [reportType, setReportType] = useState('');
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imageBase64, setImageBase64] = useState<string | null>(null);
    const [textContent, setTextContent] = useState('');
    const [inputMode, setInputMode] = useState<'upload' | 'text'>('upload');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysis, setAnalysis] = useState<any>(null);
    const [error, setError] = useState('');

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];
        if (!allowedTypes.includes(file.type)) {
            setError('Please upload a JPG, PNG, WebP, or PDF file.');
            return;
        }

        // Validate size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            setError('File size must be under 10MB.');
            return;
        }

        setError('');
        const reader = new FileReader();
        reader.onload = (event) => {
            const result = event.target?.result as string;
            setImageBase64(result);
            setImagePreview(result);
        };
        reader.readAsDataURL(file);
    };

    const handleAnalyze = async () => {
        if (!imageBase64 && !textContent.trim()) {
            setError('Please upload a report image or paste report text.');
            return;
        }
        if (!reportType) {
            setError('Please select the report type.');
            return;
        }

        setIsAnalyzing(true);
        setError('');
        setAnalysis(null);

        try {
            const response = await fetch('/api/gemini/report-analysis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    reportType,
                    imageBase64: inputMode === 'upload' ? imageBase64 : null,
                    textContent: inputMode === 'text' ? textContent : null,
                    patientInfo: {
                        age: userData?.age,
                        gender: userData?.gender,
                        preExistingDiseases: userData?.preExistingDiseases,
                    }
                })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Analysis failed');
            }

            const data = await response.json();
            setAnalysis(data);
        } catch (err: any) {
            setError(err.message || 'Failed to analyze report. Please try again.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const clearReport = () => {
        setImageBase64(null);
        setImagePreview(null);
        setTextContent('');
        setAnalysis(null);
        setError('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const getStatusIcon = (status: string) => {
        switch (status?.toUpperCase()) {
            case 'NORMAL': return <MdCheckCircle className="text-emerald-500 text-lg" />;
            case 'HIGH': case 'ABNORMAL': return <MdError className="text-red-500 text-lg" />;
            case 'LOW': return <MdWarning className="text-amber-500 text-lg" />;
            default: return <MdInfo className="text-blue-500 text-lg" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status?.toUpperCase()) {
            case 'NORMAL': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case 'HIGH': case 'ABNORMAL': return 'bg-red-50 text-red-700 border-red-200';
            case 'LOW': return 'bg-amber-50 text-amber-700 border-amber-200';
            default: return 'bg-blue-50 text-blue-700 border-blue-200';
        }
    };

    const getOverallStatusConfig = (status: string) => {
        switch (status?.toUpperCase()) {
            case 'NORMAL': return { bg: 'from-emerald-500 to-green-600', icon: <MdCheckCircle className="text-3xl" />, label: 'All Normal' };
            case 'CRITICAL': return { bg: 'from-red-500 to-rose-600', icon: <MdError className="text-3xl" />, label: 'Needs Attention' };
            default: return { bg: 'from-amber-500 to-orange-600', icon: <MdWarning className="text-3xl" />, label: 'Review Recommended' };
        }
    };

    const getSeverityColor = (severity: string) => {
        switch (severity?.toUpperCase()) {
            case 'SEVERE': return 'bg-red-100 text-red-700';
            case 'MODERATE': return 'bg-orange-100 text-orange-700';
            case 'MILD': return 'bg-yellow-100 text-yellow-700';
            default: return 'bg-green-100 text-green-700';
        }
    };

    return (
        <div className="p-4 sm:p-6 max-w-3xl mx-auto w-full pb-32 animate-fade-in">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <button onClick={() => router.back()} className="p-2 -ml-2 text-black/87 hover:bg-gray-100 rounded-full transition-colors">
                    <MdArrowBack className="text-2xl" />
                </button>
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Medical Report Analyzer</h1>
                    <p className="text-xs text-gray-400">AI-powered analysis • Easy to understand</p>
                </div>
            </div>

            {/* Show results or upload form */}
            {!analysis ? (
                <>
                    {/* Info Banner */}
                    <div className="bg-gradient-to-r from-blue-50 to-violet-50 rounded-2xl p-4 mb-6 border border-blue-100 flex items-start gap-3">
                        <MdAutoAwesome className="text-blue-500 text-xl shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-semibold text-blue-900">How it works</p>
                            <p className="text-xs text-blue-700 mt-1">Upload a photo of your medical report or paste the text. Our AI will read every value, compare it to normal ranges, and explain what each result means in simple language.</p>
                        </div>
                    </div>

                    {/* Report Type Selector */}
                    <div className="mb-6">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">What type of report is this?</label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {REPORT_TYPES.map(rt => (
                                <button
                                    key={rt.value}
                                    onClick={() => { setReportType(rt.value); setError(''); }}
                                    className={`px-3 py-2.5 rounded-xl text-xs font-semibold transition-all border-2 ${reportType === rt.value
                                            ? 'bg-gray-900 text-white border-gray-900 shadow-lg shadow-gray-900/10 scale-[1.02]'
                                            : 'bg-white text-gray-600 border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                                        }`}
                                >
                                    {rt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Input Mode Toggle */}
                    <div className="flex gap-2 mb-4">
                        <button
                            onClick={() => setInputMode('upload')}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all border-2 ${inputMode === 'upload'
                                    ? 'bg-gray-900 text-white border-gray-900'
                                    : 'bg-white text-gray-500 border-gray-100 hover:border-gray-200'
                                }`}
                        >
                            <MdCloudUpload className="text-lg" />
                            Upload Image
                        </button>
                        <button
                            onClick={() => setInputMode('text')}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all border-2 ${inputMode === 'text'
                                    ? 'bg-gray-900 text-white border-gray-900'
                                    : 'bg-white text-gray-500 border-gray-100 hover:border-gray-200'
                                }`}
                        >
                            <MdContentPaste className="text-lg" />
                            Paste Text
                        </button>
                    </div>

                    {/* Upload Area */}
                    {inputMode === 'upload' ? (
                        <div className="mb-6">
                            {!imagePreview ? (
                                <label
                                    htmlFor="report-upload"
                                    className="flex flex-col items-center justify-center w-full h-56 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer bg-gray-50 hover:bg-gray-100 hover:border-gray-300 transition-all group"
                                >
                                    <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-violet-100 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                        <FaFileMedical className="text-2xl text-blue-500" />
                                    </div>
                                    <p className="text-sm font-semibold text-gray-700">Tap to upload report</p>
                                    <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP, or PDF • Max 10MB</p>
                                    <input
                                        ref={fileInputRef}
                                        id="report-upload"
                                        type="file"
                                        accept="image/*,.pdf"
                                        className="hidden"
                                        onChange={handleFileSelect}
                                    />
                                </label>
                            ) : (
                                <div className="relative">
                                    <img
                                        src={imagePreview}
                                        alt="Report preview"
                                        className="w-full rounded-2xl border border-gray-200 shadow-sm max-h-80 object-contain bg-white"
                                    />
                                    <button
                                        onClick={clearReport}
                                        className="absolute top-3 right-3 bg-red-500 text-white p-2 rounded-full shadow-lg hover:bg-red-600 transition-colors"
                                    >
                                        <MdDelete className="text-lg" />
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="mb-6">
                            <textarea
                                value={textContent}
                                onChange={(e) => setTextContent(e.target.value)}
                                placeholder="Paste your medical report text here... e.g. Hemoglobin: 14.2 g/dL, WBC: 7500/cumm, Platelet: 2.5 lakhs..."
                                className="w-full h-48 p-4 bg-gray-50 rounded-2xl border border-gray-200 outline-none focus:border-gray-300 focus:ring-2 focus:ring-gray-100 resize-none text-sm text-gray-800 placeholder:text-gray-300 transition-all"
                            />
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-4 text-sm text-center border border-red-100 animate-fade-in">
                            {error}
                        </div>
                    )}

                    {/* Analyze Button */}
                    <button
                        onClick={handleAnalyze}
                        disabled={isAnalyzing}
                        className="w-full h-14 bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-2xl text-base font-bold hover:from-gray-800 hover:to-gray-700 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:hover:scale-100"
                    >
                        {isAnalyzing ? (
                            <div className="flex items-center gap-3">
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>Analyzing your report...</span>
                            </div>
                        ) : (
                            <>
                                <MdAutoAwesome className="text-lg" />
                                Analyze Report
                            </>
                        )}
                    </button>

                    {/* Analyzing animation */}
                    {isAnalyzing && (
                        <div className="mt-6 bg-white rounded-2xl p-8 border border-gray-100 shadow-sm text-center animate-fade-in">
                            <div className="relative inline-flex mb-4">
                                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-100 to-violet-100 flex items-center justify-center">
                                    <FaStethoscope className="text-2xl text-blue-500 animate-pulse" />
                                </div>
                                <div className="absolute -inset-2 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
                            </div>
                            <p className="text-sm font-bold text-gray-900">AI is reading your report</p>
                            <p className="text-xs text-gray-400 mt-1">Extracting values, checking ranges, preparing explanations...</p>
                        </div>
                    )}
                </>
            ) : (
                /* ============ RESULTS VIEW ============ */
                <div className="space-y-6 animate-fade-in">
                    {/* Overall Status Banner */}
                    {(() => {
                        const config = getOverallStatusConfig(analysis.overallStatus);
                        return (
                            <div className={`bg-gradient-to-r ${config.bg} rounded-2xl p-6 text-white shadow-lg relative overflow-hidden`}>
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10" />
                                <div className="flex items-center gap-4 relative z-10">
                                    {config.icon}
                                    <div>
                                        <div className="text-lg font-bold">{config.label}</div>
                                        <div className="text-sm text-white/80 font-medium">{analysis.reportTitle}</div>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    {/* Summary */}
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                        <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                            <MdDescription className="text-blue-500" />
                            What does this report say?
                        </h3>
                        <p className="text-sm text-gray-600 leading-relaxed">{analysis.summary}</p>
                    </div>

                    {/* Parameters Table */}
                    {analysis.parameters && analysis.parameters.length > 0 && (
                        <div>
                            <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                                <FaHeartbeat className="text-red-500" />
                                Your Results Explained
                            </h3>
                            <div className="space-y-3">
                                {analysis.parameters.map((param: any, i: number) => (
                                    <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                                        <div className="flex items-start justify-between gap-3 mb-2">
                                            <div className="flex items-center gap-2">
                                                {getStatusIcon(param.status)}
                                                <span className="font-bold text-sm text-gray-900">{param.name}</span>
                                            </div>
                                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${getStatusColor(param.status)}`}>
                                                {param.status}
                                            </span>
                                        </div>
                                        <div className="flex items-baseline gap-3 mb-2 ml-7">
                                            <span className="text-lg font-bold text-gray-900">{param.value}</span>
                                            <span className="text-xs text-gray-400">Normal: {param.normalRange}</span>
                                        </div>
                                        <p className="text-xs text-gray-500 ml-7 leading-relaxed">{param.explanation}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Key Findings */}
                    {analysis.keyFindings && analysis.keyFindings.length > 0 && (
                        <div>
                            <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                                <MdInfo className="text-blue-500" />
                                Key Findings
                            </h3>
                            <div className="space-y-2">
                                {analysis.keyFindings.map((finding: any, i: number) => (
                                    <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                                        <div className="flex items-start gap-3">
                                            <span className={`mt-0.5 px-2 py-0.5 text-[10px] font-bold rounded-full shrink-0 ${getSeverityColor(finding.severity)}`}>
                                                {finding.severity}
                                            </span>
                                            <div>
                                                <div className="text-sm font-semibold text-gray-900">{finding.finding}</div>
                                                <p className="text-xs text-gray-500 mt-1">{finding.explanation}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Recommendations */}
                    {analysis.recommendations && analysis.recommendations.length > 0 && (
                        <div className="bg-gradient-to-br from-blue-50 to-violet-50 rounded-2xl p-5 border border-blue-100">
                            <h3 className="text-sm font-bold text-blue-900 mb-3 flex items-center gap-2">
                                <MdLocalHospital className="text-blue-500" />
                                Recommendations for You
                            </h3>
                            <ul className="space-y-2">
                                {analysis.recommendations.map((rec: string, i: number) => (
                                    <li key={i} className="flex items-start gap-2 text-sm text-blue-800">
                                        <MdCheckCircle className="text-blue-500 shrink-0 mt-0.5" />
                                        {rec}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Important Notes */}
                    {analysis.importantNotes && analysis.importantNotes.length > 0 && (
                        <div className="bg-amber-50 rounded-2xl p-5 border border-amber-200">
                            <h3 className="text-sm font-bold text-amber-900 mb-3 flex items-center gap-2">
                                <MdWarning className="text-amber-500" />
                                Important Notes
                            </h3>
                            <ul className="space-y-2">
                                {analysis.importantNotes.map((note: string, i: number) => (
                                    <li key={i} className="text-sm text-amber-800 flex items-start gap-2">
                                        <span className="w-1.5 h-1.5 bg-amber-500 rounded-full shrink-0 mt-1.5" />
                                        {note}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Doctor Review Alert */}
                    {analysis.needsDoctorReview && (
                        <div className="bg-red-50 rounded-2xl p-5 border border-red-200">
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                                    <FaStethoscope className="text-red-500" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-red-900">Doctor Consultation Recommended</h3>
                                    <p className="text-xs text-red-700 mt-1">{analysis.doctorReviewReason}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button
                            onClick={clearReport}
                            className="flex-1 h-12 bg-white border-2 border-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 hover:border-gray-200 transition-all flex items-center justify-center gap-2"
                        >
                            Analyze Another Report
                        </button>
                    </div>

                    {/* Disclaimer */}
                    <p className="text-[10px] text-gray-400 text-center leading-relaxed">
                        ⚠️ This AI analysis is for informational purposes only and is not a substitute for professional medical advice. Always consult your doctor before making health decisions.
                    </p>
                </div>
            )}
        </div>
    );
}
