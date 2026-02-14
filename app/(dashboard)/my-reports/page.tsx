"use client";

import React, { useState, useEffect, useRef } from 'react';
import {
    MdArrowBack,
    MdAdd,
    MdClose,
    MdCloudUpload,
    MdCalendarMonth,
    MdDelete,
    MdImage,
    MdZoomIn,
} from 'react-icons/md';
import { FaFileMedical } from 'react-icons/fa';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { auth, db } from '../../../lib/firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, query, where, orderBy, Timestamp } from 'firebase/firestore';

const REPORT_CATEGORIES = [
    { label: 'Blood Test (CBC)', icon: '🩸' },
    { label: 'Lipid Profile', icon: '🫀' },
    { label: 'Thyroid Panel', icon: '🦋' },
    { label: 'Liver Function (LFT)', icon: '🟤' },
    { label: 'Kidney Function (KFT)', icon: '🫘' },
    { label: 'Blood Sugar / HbA1c', icon: '🍬' },
    { label: 'ECG', icon: '💓' },
    { label: 'ECHO', icon: '❤️' },
    { label: 'TMT / Stress Test', icon: '🏃' },
    { label: 'Urine Test', icon: '🧪' },
    { label: 'X-Ray', icon: '🦴' },
    { label: 'MRI / CT Scan', icon: '🧠' },
    { label: 'Vitamin Panel', icon: '💊' },
    { label: 'Ultrasound', icon: '📡' },
    { label: 'Eye Test', icon: '👁️' },
    { label: 'Other', icon: '📋' },
];

export default function MyReportsPage() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [reports, setReports] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showUpload, setShowUpload] = useState(false);
    const [viewingReport, setViewingReport] = useState<any>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Upload form state
    const [reportName, setReportName] = useState('');
    const [reportCategory, setReportCategory] = useState('');
    const [reportDate, setReportDate] = useState('');
    const [imageBase64, setImageBase64] = useState<string | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');

    // Fetch all saved reports
    const fetchReports = async () => {
        if (!auth.currentUser) return;
        try {
            const q = query(
                collection(db, "patient_reports"),
                where("userId", "==", auth.currentUser.uid)
            );
            const snap = await getDocs(q);
            const docs = snap.docs.map(d => ({
                id: d.id,
                ...d.data(),
                createdAt: d.data().createdAt?.toDate?.() || new Date(d.data().createdAt)
            }));
            // Sort by date (newest first)
            docs.sort((a: any, b: any) => {
                const dateA = new Date(a.reportDate || a.createdAt).getTime();
                const dateB = new Date(b.reportDate || b.createdAt).getTime();
                return dateB - dateA;
            });
            setReports(docs);
        } catch (err) {
            console.error("Error fetching reports:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReports();
    }, []);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
        if (!allowedTypes.includes(file.type)) {
            setUploadError('Please upload a JPG, PNG, or WebP image.');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            setUploadError('File size must be under 5MB.');
            return;
        }

        setUploadError('');
        const reader = new FileReader();
        reader.onload = (event) => {
            const result = event.target?.result as string;
            setImageBase64(result);
            setImagePreview(result);
        };
        reader.readAsDataURL(file);
    };

    const handleUpload = async () => {
        if (!auth.currentUser) return;
        if (!reportCategory) { setUploadError('Please select a report type.'); return; }
        if (!imageBase64) { setUploadError('Please upload a report image.'); return; }
        if (!reportDate) { setUploadError('Please enter the test date.'); return; }

        setUploading(true);
        setUploadError('');

        try {
            await addDoc(collection(db, "patient_reports"), {
                userId: auth.currentUser.uid,
                reportName: reportName.trim() || reportCategory,
                reportCategory,
                reportDate,
                imageBase64,
                createdAt: Timestamp.now()
            });

            // Reset form
            setReportName('');
            setReportCategory('');
            setReportDate('');
            setImageBase64(null);
            setImagePreview(null);
            setShowUpload(false);
            if (fileInputRef.current) fileInputRef.current.value = '';

            // Refresh list
            setLoading(true);
            await fetchReports();
        } catch (err: any) {
            console.error("Error saving report:", err);
            setUploadError('Failed to save report. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (reportId: string) => {
        const confirmed = window.confirm("Delete this report? This cannot be undone.");
        if (!confirmed) return;

        setDeletingId(reportId);
        try {
            await deleteDoc(doc(db, "patient_reports", reportId));
            setReports(prev => prev.filter(r => r.id !== reportId));
        } catch (err) {
            console.error("Error deleting report:", err);
            alert("Failed to delete report.");
        } finally {
            setDeletingId(null);
        }
    };

    const getCategoryIcon = (category: string) => {
        return REPORT_CATEGORIES.find(c => c.label === category)?.icon || '📋';
    };

    const formatDate = (dateStr: string) => {
        try {
            return new Date(dateStr).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short', year: 'numeric'
            });
        } catch { return dateStr; }
    };

    // Group reports by category
    const groupedReports = reports.reduce((acc: Record<string, any[]>, report) => {
        const cat = report.reportCategory || 'Other';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(report);
        return acc;
    }, {});

    return (
        <div className="p-4 sm:p-6 max-w-3xl mx-auto w-full pb-32 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="p-2 -ml-2 text-black/87 hover:bg-gray-100 rounded-full transition-colors">
                        <MdArrowBack className="text-2xl" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">My Reports</h1>
                        <p className="text-xs text-gray-400">{reports.length} report{reports.length !== 1 ? 's' : ''} saved</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowUpload(true)}
                    className="bg-gray-900 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-800 transition-all flex items-center gap-2 shadow-lg shadow-gray-900/10"
                >
                    <MdAdd className="text-lg" />
                    Add Report
                </button>
            </div>

            {/* AI Analyzer Banner */}
            <Link href="/report-analyzer" className="flex items-center gap-3 bg-gradient-to-r from-blue-50 to-violet-50 rounded-2xl p-4 mb-6 border border-blue-100 hover:shadow-md transition-all group">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                    <span className="text-lg">🤖</span>
                </div>
                <div className="flex-1">
                    <div className="text-sm font-bold text-blue-900">AI Report Analysis</div>
                    <div className="text-xs text-blue-600">Upload any report for instant AI-powered explanation</div>
                </div>
                <span className="text-blue-400 text-lg">→</span>
            </Link>

            {/* Upload Modal */}
            {showUpload && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in" onClick={() => setShowUpload(false)}>
                    <div
                        className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl p-6 max-h-[90vh] overflow-y-auto animate-slide-up"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-lg font-bold text-gray-900">Upload Report</h2>
                            <button onClick={() => setShowUpload(false)} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors">
                                <MdClose className="text-xl" />
                            </button>
                        </div>

                        {/* Report Type (Category) */}
                        <div className="mb-4">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Report Type *</label>
                            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                                {REPORT_CATEGORIES.map(cat => (
                                    <button
                                        key={cat.label}
                                        type="button"
                                        onClick={() => { setReportCategory(cat.label); setUploadError(''); }}
                                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all border-2 text-left ${reportCategory === cat.label
                                            ? 'bg-gray-900 text-white border-gray-900'
                                            : 'bg-white text-gray-600 border-gray-100 hover:border-gray-200'
                                            }`}
                                    >
                                        <span className="text-sm">{cat.icon}</span>
                                        {cat.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Custom Name (optional) */}
                        <div className="mb-4">
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Report Label <span className="text-gray-400 font-normal">(optional)</span></label>
                            <input
                                type="text"
                                value={reportName}
                                onChange={e => setReportName(e.target.value)}
                                placeholder="e.g. Annual checkup CBC, Post-surgery ECG"
                                className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-gray-300 text-sm"
                            />
                        </div>

                        {/* Test Date */}
                        <div className="mb-4">
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Test Date *</label>
                            <input
                                type="date"
                                value={reportDate}
                                onChange={e => { setReportDate(e.target.value); setUploadError(''); }}
                                max={new Date().toISOString().split('T')[0]}
                                className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-gray-300 text-sm font-medium"
                            />
                        </div>

                        {/* Image Upload */}
                        <div className="mb-4">
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Report Image *</label>
                            {!imagePreview ? (
                                <label
                                    htmlFor="report-file"
                                    className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
                                >
                                    <MdCloudUpload className="text-3xl text-gray-400 mb-2" />
                                    <p className="text-xs font-semibold text-gray-500">Tap to upload</p>
                                    <p className="text-[10px] text-gray-400 mt-0.5">JPG, PNG, WebP • Max 5MB</p>
                                    <input
                                        ref={fileInputRef}
                                        id="report-file"
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleFileSelect}
                                    />
                                </label>
                            ) : (
                                <div className="relative">
                                    <img src={imagePreview} alt="Preview" className="w-full h-36 object-contain bg-gray-50 rounded-2xl border border-gray-200" />
                                    <button
                                        onClick={() => { setImageBase64(null); setImagePreview(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                                        className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full shadow-md hover:bg-red-600 transition-colors"
                                    >
                                        <MdClose className="text-sm" />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Error */}
                        {uploadError && (
                            <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-4 text-xs text-center border border-red-100">
                                {uploadError}
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            onClick={handleUpload}
                            disabled={uploading}
                            className="w-full h-12 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                        >
                            {uploading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <MdCloudUpload className="text-lg" />
                                    Save Report
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* Image Viewer Modal */}
            {viewingReport && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setViewingReport(null)}>
                    <div className="relative max-w-3xl w-full max-h-[90vh]" onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => setViewingReport(null)}
                            className="absolute -top-12 right-0 text-white/80 hover:text-white bg-white/10 p-2 rounded-full transition-colors"
                        >
                            <MdClose className="text-2xl" />
                        </button>
                        <div className="text-white text-center mb-3">
                            <div className="font-bold">{viewingReport.reportName}</div>
                            <div className="text-xs text-white/60">{formatDate(viewingReport.reportDate)}</div>
                        </div>
                        <img
                            src={viewingReport.imageBase64}
                            alt={viewingReport.reportName}
                            className="w-full max-h-[75vh] object-contain rounded-2xl bg-white"
                        />
                    </div>
                </div>
            )}

            {/* Content */}
            {loading ? (
                <div className="text-center py-20">
                    <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-sm text-gray-400">Loading reports...</p>
                </div>
            ) : reports.length === 0 ? (
                /* Empty State */
                <div className="text-center py-16">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FaFileMedical className="text-3xl text-gray-300" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">No reports saved yet</h3>
                    <p className="text-sm text-gray-400 max-w-xs mx-auto mb-6">
                        Upload photos of your medical reports to keep them organized in one place.
                    </p>
                    <button
                        onClick={() => setShowUpload(true)}
                        className="bg-gray-900 text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-gray-800 transition-all"
                    >
                        Upload Your First Report
                    </button>
                </div>
            ) : (
                /* Reports List - Grouped by category */
                <div className="space-y-6">
                    {Object.entries(groupedReports).map(([category, categoryReports]) => (
                        <div key={category}>
                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-lg">{getCategoryIcon(category)}</span>
                                <h2 className="text-sm font-bold text-gray-700">{category}</h2>
                                <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{categoryReports.length}</span>
                            </div>
                            <div className="space-y-2">
                                {categoryReports.map((report: any) => (
                                    <div
                                        key={report.id}
                                        className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 group"
                                    >
                                        <div className="flex items-center gap-4">
                                            {/* Thumbnail */}
                                            <button
                                                onClick={() => setViewingReport(report)}
                                                className="w-16 h-16 rounded-xl bg-gray-50 border border-gray-100 flex-shrink-0 overflow-hidden hover:border-gray-300 transition-colors relative group/thumb"
                                            >
                                                {report.imageBase64 ? (
                                                    <>
                                                        <img
                                                            src={report.imageBase64}
                                                            alt={report.reportName}
                                                            className="w-full h-full object-cover"
                                                        />
                                                        <div className="absolute inset-0 bg-black/0 group-hover/thumb:bg-black/30 transition-colors flex items-center justify-center">
                                                            <MdZoomIn className="text-white text-lg opacity-0 group-hover/thumb:opacity-100 transition-opacity" />
                                                        </div>
                                                    </>
                                                ) : (
                                                    <MdImage className="text-2xl text-gray-300 m-auto" />
                                                )}
                                            </button>

                                            {/* Details */}
                                            <div className="flex-1 min-w-0">
                                                <div className="font-bold text-sm text-gray-900 truncate">
                                                    {report.reportName}
                                                </div>
                                                <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-400">
                                                    <MdCalendarMonth className="text-sm" />
                                                    <span>{formatDate(report.reportDate)}</span>
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => setViewingReport(report)}
                                                    className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="View full image"
                                                >
                                                    <MdZoomIn className="text-lg" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(report.id)}
                                                    disabled={deletingId === report.id}
                                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                                    title="Delete report"
                                                >
                                                    {deletingId === report.id ? (
                                                        <div className="w-4 h-4 border-2 border-red-300 border-t-red-500 rounded-full animate-spin" />
                                                    ) : (
                                                        <MdDelete className="text-lg" />
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
