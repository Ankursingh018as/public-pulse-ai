"use client";

import { useState } from "react";
import { X, Loader2, CheckCircle, MapPin } from "lucide-react";
import dataService from "../services/dataService";

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: { event_type: string; lat: number; lng: number; description?: string }) => void | Promise<void>;
  position: { lat: number; lng: number } | null;
}

export default function ReportIssueModal({ open, onClose, onSubmit, position }: Props) {
  const [type, setType] = useState("traffic");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!open) return null;

  const handleSubmit = async () => {
    if (!position || submitting) return;
    setSubmitting(true);
    try {
      const payload = {
        event_type: type,
        lat: position.lat,
        lng: position.lng,
        description
      };

      // Primary: enqueue to local pending queue and attempt server sync
      await dataService.submitIncident({ ...payload, source: 'report-modal', userId: 'citizen_ui' });

      // Secondary: call parent handler if provided (keeps existing behavior)
      if (onSubmit) await onSubmit(payload);
      setSubmitted(true);
      setTimeout(() => {
        setDescription("");
        setType("traffic");
        setSubmitted(false);
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Submit failed', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative w-full max-w-md bg-[#1a1a2e] rounded-t-3xl md:rounded-2xl p-5 m-4 shadow-2xl border border-cyan-500/20">
        {submitted ? (
          <div className="py-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <CheckCircle size={40} className="text-emerald-400" />
            </div>
            <h3 className="text-lg font-bold text-white">Report Submitted!</h3>
            <p className="text-sm text-slate-400 mt-1">Thank you for helping your community.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-bold text-white">Report an Issue</h3>
                <p className="text-xs text-slate-500">Help improve your city</p>
              </div>
              <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors">
                <X size={20} />
              </button>
            </div>

            <label className="block text-xs font-semibold text-cyan-400 uppercase mb-2">Issue Type</label>
            <select 
              className="w-full p-3 mb-4 rounded-xl border border-cyan-500/20 bg-[#0a0a1a] text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none focus:border-cyan-500/50 appearance-none cursor-pointer" 
              value={type} 
              onChange={(e) => setType(e.target.value)}
            >
              <option value="traffic">🚗 Traffic Congestion</option>
              <option value="water">💧 Waterlogging/Flooding</option>
              <option value="garbage">🗑️ Garbage/Waste</option>
              <option value="light">💡 Streetlight Issue</option>
              <option value="road">🛣️ Road Damage</option>
              <option value="noise">🔊 Noise Complaint</option>
            </select>

            <label className="block text-xs font-semibold text-cyan-400 uppercase mb-2">Description (optional)</label>
            <textarea 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              className="w-full p-3 rounded-xl border border-cyan-500/20 bg-[#0a0a1a] text-white mb-4 focus:ring-2 focus:ring-cyan-500 focus:outline-none focus:border-cyan-500/50 resize-none placeholder:text-slate-600" 
              rows={3} 
              placeholder="Add more details about the issue..."
            />

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <div className="p-1.5 rounded-lg bg-cyan-500/10">
                  <MapPin size={14} className="text-cyan-400" />
                </div>
                {position ? `${position.lat.toFixed(4)}, ${position.lng.toFixed(4)}` : 'No location'}
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={onClose} 
                  className="px-4 py-2.5 rounded-xl bg-white/5 text-slate-300 font-semibold hover:bg-white/10 transition-colors border border-white/10"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSubmit} 
                  disabled={submitting || !position}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold hover:shadow-lg hover:shadow-cyan-500/25 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Report'
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
