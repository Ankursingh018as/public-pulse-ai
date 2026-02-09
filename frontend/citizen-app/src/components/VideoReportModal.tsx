'use client';

import { useState, useRef } from 'react';
import { Camera, X, Loader2, CheckCircle, AlertTriangle, Upload, Trash2 } from 'lucide-react';

interface Detection {
    class: string;
    confidence: number;
    bbox: number[];
}

interface DetectionResult {
    status: string;
    trash_count: number;
    total_detections: number;
    inference_time_ms: number;
    detections: Detection[];
    incident_id?: string;
    confidence_threshold: number;
}

interface VideoReportModalProps {
    open: boolean;
    onClose: () => void;
    position: { lat: number; lng: number } | null;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

export default function VideoReportModal({ open, onClose, position }: VideoReportModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<DetectionResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!open) return null;

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        // Validate file type
        const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/bmp'];
        if (!validTypes.includes(selectedFile.type)) {
            setError('Please select a valid image file (JPEG, PNG, WebP, BMP)');
            return;
        }

        // Validate file size (max 20MB)
        if (selectedFile.size > 20 * 1024 * 1024) {
            setError('File size must be under 20MB');
            return;
        }

        setFile(selectedFile);
        setError(null);
        setResult(null);

        // Generate preview
        const reader = new FileReader();
        reader.onload = (ev) => setPreview(ev.target?.result as string);
        reader.readAsDataURL(selectedFile);
    };

    const handleSubmit = async () => {
        if (!file || submitting) return;

        setSubmitting(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('confidence', '0.5');

            const res = await fetch(`${API_URL}/video/detect/image`, {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || `Detection failed (${res.status})`);
            }

            const data = await res.json();
            setResult(data.data || data);
        } catch (err: unknown) {
            console.error('Image detection failed:', err);
            const message = err instanceof Error ? err.message : 'Detection failed. The AI service may be unavailable.';
            setError(message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleReset = () => {
        setFile(null);
        setPreview(null);
        setResult(null);
        setError(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleClose = () => {
        handleReset();
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[2000] flex items-end md:items-center justify-center">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleClose}></div>
            <div className="relative w-full max-w-md bg-[#1a1a2e] rounded-t-3xl md:rounded-2xl p-5 m-4 shadow-2xl border border-purple-500/20 max-h-[85vh] overflow-y-auto">

                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <Camera size={20} className="text-purple-400" />
                            AI Trash Detection
                        </h3>
                        <p className="text-xs text-slate-500">Upload an image for AI-powered garbage detection</p>
                    </div>
                    <button onClick={handleClose} className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Result View */}
                {result ? (
                    <div className="space-y-4">
                        {/* Detection Summary */}
                        <div className={`p-4 rounded-xl border ${
                            result.trash_count > 0
                                ? 'bg-orange-500/10 border-orange-500/20'
                                : 'bg-emerald-500/10 border-emerald-500/20'
                        }`}>
                            <div className="flex items-center gap-3 mb-2">
                                {result.trash_count > 0 ? (
                                    <Trash2 className="text-orange-400" size={24} />
                                ) : (
                                    <CheckCircle className="text-emerald-400" size={24} />
                                )}
                                <div>
                                    <h4 className="text-white font-bold">
                                        {result.trash_count > 0
                                            ? `${result.trash_count} trash item(s) detected`
                                            : 'No trash detected'}
                                    </h4>
                                    <p className="text-xs text-slate-400">
                                        {result.total_detections} total detection(s) • {result.inference_time_ms}ms
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Detections List */}
                        {result.detections && result.detections.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-xs font-semibold text-slate-400 uppercase">Detections</p>
                                {result.detections.slice(0, 10).map((det, i) => (
                                    <div key={i} className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                                        <span className="text-sm text-white capitalize">{det.class}</span>
                                        <span className="text-xs text-cyan-400 font-mono">{Math.round(det.confidence * 100)}%</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Auto-created Incident */}
                        {result.incident_id && (
                            <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                                <p className="text-xs text-purple-400 font-semibold">
                                    ✓ Incident automatically created and reported
                                </p>
                            </div>
                        )}

                        {/* Location */}
                        {position && (
                            <p className="text-xs text-slate-500 text-center">
                                📍 {position.lat.toFixed(4)}, {position.lng.toFixed(4)}
                            </p>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2 pt-2">
                            <button
                                onClick={handleReset}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 text-slate-300 font-semibold hover:bg-white/10 transition-colors border border-white/10"
                            >
                                Scan Another
                            </button>
                            <button
                                onClick={handleClose}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold hover:shadow-lg transition-all"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Upload Area */}
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                                preview
                                    ? 'border-purple-500/30'
                                    : 'border-slate-600 hover:border-purple-500/50 hover:bg-purple-500/5'
                            }`}
                        >
                            {preview ? (
                                <div className="relative">
                                    <img
                                        src={preview}
                                        alt="Preview"
                                        className="rounded-lg max-h-48 mx-auto object-contain"
                                    />
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleReset(); }}
                                        className="absolute top-2 right-2 p-1 bg-black/60 rounded-full text-white hover:bg-black/80"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ) : (
                                <div className="py-4">
                                    <Upload className="mx-auto text-slate-500 mb-3" size={32} />
                                    <p className="text-sm text-slate-300 font-medium">Tap to upload an image</p>
                                    <p className="text-xs text-slate-500 mt-1">JPEG, PNG, WebP • Max 20MB</p>
                                </div>
                            )}
                        </div>

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/bmp"
                            onChange={handleFileSelect}
                            className="hidden"
                        />

                        {/* Error */}
                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2">
                                <AlertTriangle size={16} className="text-red-400 shrink-0" />
                                <p className="text-xs text-red-300">{error}</p>
                            </div>
                        )}

                        {/* Submit */}
                        <div className="flex gap-2 pt-2">
                            <button
                                onClick={handleClose}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 text-slate-300 font-semibold hover:bg-white/10 transition-colors border border-white/10"
                                disabled={submitting}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={!file || submitting}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold hover:shadow-lg hover:shadow-purple-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        Analyzing...
                                    </>
                                ) : (
                                    <>
                                        <Camera size={18} />
                                        Detect Trash
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
