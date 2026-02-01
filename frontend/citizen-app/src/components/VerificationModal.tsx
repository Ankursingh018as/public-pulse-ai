'use client';

import { useState } from 'react';
import { Camera, Check, X, AlertTriangle, HelpCircle } from 'lucide-react';

interface VerificationModalProps {
    prediction: any;
    onClose: () => void;
    onSubmit: (response: string, hasPhoto: boolean) => void;
}

export default function VerificationModal({ prediction, onClose, onSubmit }: VerificationModalProps) {
    const [submitting, setSubmitting] = useState(false);

    const handleVote = (response: string) => {
        setSubmitting(true);
        // Simulate API delay or submit immediately
        setTimeout(() => {
            onSubmit(response, false);
            setSubmitting(false);
        }, 500);
    };

    if (!prediction) return null;

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[2000] flex items-end sm:items-center justify-center p-4">
            <div className="bg-[#1a1a2e] w-full max-w-md rounded-3xl p-6 shadow-2xl border border-cyan-500/20 animate-slide-up">
                <div className="flex justify-between items-start mb-5">
                    <div>
                        <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Verification Request</span>
                        <h2 className="text-xl font-bold text-white mt-1">Is this happening now?</h2>
                    </div>
                    <button onClick={onClose} className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                <div className="bg-[#0a0a1a] p-4 rounded-xl border border-orange-500/20 mb-6 flex items-start gap-3">
                    <div className="bg-orange-500/20 p-2.5 rounded-lg">
                        <AlertTriangle className="w-6 h-6 text-orange-400" />
                    </div>
                    <div>
                        <h3 className="font-bold text-white">{prediction.issue || prediction.event_type}</h3>
                        <p className="text-sm text-slate-400">{prediction.area || prediction.area_name}</p>
                        <p className="text-xs text-slate-500 mt-1">Reported {prediction.time_ago || 'just now'}</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                    <button
                        onClick={() => handleVote('yes')}
                        disabled={submitting}
                        className="flex flex-col items-center justify-center p-4 bg-emerald-500/10 border-2 border-emerald-500/20 rounded-2xl hover:bg-emerald-500/20 hover:border-emerald-500/40 transition-all active:scale-95"
                    >
                        <div className="bg-emerald-500 text-white p-2 rounded-full mb-2 shadow-lg shadow-emerald-500/30">
                            <Check className="w-6 h-6" />
                        </div>
                        <span className="font-bold text-emerald-400">YES</span>
                        <span className="text-[10px] text-emerald-500/70">+0.25 Trust</span>
                    </button>

                    <button
                        onClick={() => handleVote('no')}
                        disabled={submitting}
                        className="flex flex-col items-center justify-center p-4 bg-red-500/10 border-2 border-red-500/20 rounded-2xl hover:bg-red-500/20 hover:border-red-500/40 transition-all active:scale-95"
                    >
                        <div className="bg-red-500 text-white p-2 rounded-full mb-2 shadow-lg shadow-red-500/30">
                            <X className="w-6 h-6" />
                        </div>
                        <span className="font-bold text-red-400">NO</span>
                        <span className="text-[10px] text-red-500/70">-0.30 Trust</span>
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={() => handleVote('partial')}
                        disabled={submitting}
                        className="flex items-center justify-center gap-2 p-3 bg-white/5 rounded-xl font-medium text-slate-400 hover:bg-white/10 hover:text-white transition-colors border border-white/10"
                    >
                        <HelpCircle className="w-4 h-4" /> Not Sure
                    </button>
                    <button
                        onClick={() => alert("Camera feature would open here")}
                        disabled={submitting}
                        className="flex items-center justify-center gap-2 p-3 bg-cyan-500/10 text-cyan-400 rounded-xl font-bold hover:bg-cyan-500/20 transition-colors border border-cyan-500/20"
                    >
                        <Camera className="w-4 h-4" /> Add Photo
                    </button>
                </div>
            </div>
        </div>
    );
}
