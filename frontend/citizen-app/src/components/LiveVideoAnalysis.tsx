'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Play, Pause, Video, AlertTriangle, CheckCircle, Loader2, Eye, Zap, MapPin } from 'lucide-react';

interface Detection {
    class: string;
    confidence: number;
    bbox: number[];
}

interface FrameResult {
    status: string;
    trash_count: number;
    total_detections: number;
    inference_time_ms: number;
    detections: Detection[];
    frame_width?: number;
    frame_height?: number;
    incident_id?: string;
}

interface CameraFeed {
    id: string;
    name: string;
    lat: number;
    lng: number;
    area: string;
    type: string;
    videoUrl: string;
    status: string;
    totalDetections: number;
    lastDetectionAt: string | null;
}

interface LiveVideoAnalysisProps {
    open: boolean;
    onClose: () => void;
    camera: CameraFeed | null;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

// Bounding box colors per class type
const CLASS_COLORS: Record<string, string> = {
    bottle: '#ef4444',
    cup: '#f97316',
    bowl: '#eab308',
    banana: '#84cc16',
    backpack: '#06b6d4',
    handbag: '#8b5cf6',
    suitcase: '#ec4899',
    person: '#3b82f6',
    car: '#6366f1',
    truck: '#14b8a6',
    default: '#f97316',
};

function getClassColor(cls: string): string {
    return CLASS_COLORS[cls] || CLASS_COLORS.default;
}

export default function LiveVideoAnalysis({ open, onClose, camera }: LiveVideoAnalysisProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
    const analysisIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [isPlaying, setIsPlaying] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [currentResult, setCurrentResult] = useState<FrameResult | null>(null);
    const [analysisStats, setAnalysisStats] = useState({
        framesAnalyzed: 0,
        totalTrash: 0,
        avgInferenceMs: 0,
        incidentsCreated: 0,
    });
    const [error, setError] = useState<string | null>(null);
    const [videoLoaded, setVideoLoaded] = useState(false);
    const [videoSrc, setVideoSrc] = useState<string | null>(null);
    const [analysisLog, setAnalysisLog] = useState<Array<{
        time: string;
        trash: number;
        total: number;
        ms: number;
        incident?: string;
    }>>([]);

    // Reset state when camera changes or modal opens
    useEffect(() => {
        if (open && camera) {
            setCurrentResult(null);
            setAnalysisStats({ framesAnalyzed: 0, totalTrash: 0, avgInferenceMs: 0, incidentsCreated: 0 });
            setAnalysisLog([]);
            setError(null);
            setIsPlaying(false);
            setIsAnalyzing(false);
            setVideoLoaded(false);
            // Auto-load sample video for all cameras
            setVideoSrc('/videos/sample-feed.mp4');
        }
    }, [open, camera]);

    // Force video element to load when src changes
    useEffect(() => {
        if (videoSrc) {
            const timer = setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.src = videoSrc;
                    videoRef.current.load();
                    console.log('Video load() called for:', videoSrc);
                }
            }, 150);
            return () => clearTimeout(timer);
        }
    }, [videoSrc]);

    // Clean up only on unmount
    useEffect(() => {
        return () => {
            stopAnalysis();
            if (videoRef.current) {
                videoRef.current.pause();
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const stopAnalysis = useCallback(() => {
        if (analysisIntervalRef.current) {
            clearInterval(analysisIntervalRef.current);
            analysisIntervalRef.current = null;
        }
        setIsAnalyzing(false);
    }, []);

    // Capture current video frame as base64
    const captureFrame = useCallback((): string | null => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || video.paused || video.ended) return null;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        ctx.drawImage(video, 0, 0);
        // Convert to JPEG base64 (strip data:image/jpeg;base64, prefix)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        return dataUrl.split(',')[1]; // Return just the base64 part
    }, []);

    // Draw bounding boxes on the overlay canvas
    const drawDetections = useCallback((detections: Detection[], frameW: number, frameH: number) => {
        const overlay = overlayCanvasRef.current;
        const video = videoRef.current;
        if (!overlay || !video) return;

        // Match overlay to video display size
        const rect = video.getBoundingClientRect();
        overlay.width = rect.width;
        overlay.height = rect.height;

        const ctx = overlay.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, overlay.width, overlay.height);

        // Scale factors from model coords to display coords
        const scaleX = overlay.width / frameW;
        const scaleY = overlay.height / frameH;

        detections.forEach((det) => {
            const [x1, y1, x2, y2] = det.bbox;
            const dx = x1 * scaleX;
            const dy = y1 * scaleY;
            const dw = (x2 - x1) * scaleX;
            const dh = (y2 - y1) * scaleY;
            const color = getClassColor(det.class);
            const isTrash = [
                'bottle', 'cup', 'bowl', 'banana', 'apple', 'sandwich', 'orange',
                'donut', 'cake', 'fork', 'knife', 'spoon', 'wine glass',
                'backpack', 'handbag', 'suitcase', 'umbrella', 'frisbee',
                'book', 'vase', 'scissors', 'toothbrush', 'cell phone', 'remote',
            ].includes(det.class);

            // Bounding box
            ctx.strokeStyle = color;
            ctx.lineWidth = isTrash ? 3 : 2;
            ctx.setLineDash(isTrash ? [] : [4, 4]);
            ctx.strokeRect(dx, dy, dw, dh);

            // Label background
            const label = `${det.class} ${Math.round(det.confidence * 100)}%`;
            ctx.font = 'bold 11px Inter, system-ui, sans-serif';
            const textWidth = ctx.measureText(label).width;
            ctx.fillStyle = color;
            ctx.fillRect(dx, dy - 18, textWidth + 8, 18);

            // Label text
            ctx.fillStyle = '#ffffff';
            ctx.fillText(label, dx + 4, dy - 5);

            // Trash indicator
            if (isTrash) {
                ctx.fillStyle = '#ef4444';
                ctx.beginPath();
                ctx.arc(dx + dw - 6, dy + 6, 5, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 8px sans-serif';
                ctx.fillText('!', dx + dw - 8.5, dy + 9);
            }
        });

        // HUD overlay
        ctx.setLineDash([]);
    }, []);

    // Send frame to AI for analysis
    const analyzeFrame = useCallback(async () => {
        const frame = captureFrame();
        if (!frame || !camera) return;

        try {
            const res = await fetch(`${API_URL}/video/analyze/frame`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    frame,
                    confidence: 0.4,
                    camera_id: camera.id,
                }),
            });

            if (!res.ok) throw new Error(`Analysis failed (${res.status})`);

            const json = await res.json();
            const result: FrameResult = json.data || json;
            setCurrentResult(result);

            // Draw bounding boxes
            drawDetections(
                result.detections || [],
                result.frame_width || 416,
                result.frame_height || 416
            );

            // Update stats
            setAnalysisStats(prev => ({
                framesAnalyzed: prev.framesAnalyzed + 1,
                totalTrash: prev.totalTrash + (result.trash_count || 0),
                avgInferenceMs: prev.framesAnalyzed === 0
                    ? result.inference_time_ms
                    : Math.round((prev.avgInferenceMs * prev.framesAnalyzed + result.inference_time_ms) / (prev.framesAnalyzed + 1)),
                incidentsCreated: prev.incidentsCreated + (result.incident_id ? 1 : 0),
            }));

            // Add to log
            setAnalysisLog(prev => [{
                time: new Date().toLocaleTimeString(),
                trash: result.trash_count || 0,
                total: result.total_detections || 0,
                ms: result.inference_time_ms || 0,
                incident: result.incident_id,
            }, ...prev].slice(0, 20));

            setError(null);
        } catch (err) {
            console.error('Frame analysis error:', err);
            setError('Analysis failed — AI engine may be offline');
        }
    }, [captureFrame, camera, drawDetections]);

    // Start live analysis loop
    const startAnalysis = useCallback(() => {
        if (analysisIntervalRef.current) return;
        setIsAnalyzing(true);
        // Analyze every 2.5 seconds
        analyzeFrame(); // First frame immediately
        analysisIntervalRef.current = setInterval(analyzeFrame, 2500);
    }, [analyzeFrame]);

    // Handle video file selection (since we may not have real camera URLs)
    const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const validTypes = ['video/mp4', 'video/webm', 'video/avi', 'video/quicktime'];
        if (!validTypes.includes(file.type) && !file.name.match(/\.(mp4|webm|avi|mov|mkv)$/i)) {
            setError('Please select a valid video file (MP4, WebM, AVI, MOV)');
            return;
        }

        if (videoSrc && videoSrc.startsWith('blob:')) {
            URL.revokeObjectURL(videoSrc);
        }
        const url = URL.createObjectURL(file);
        setVideoSrc(url);
        setVideoLoaded(false);
        setError(null);
    };

    // Play/Pause toggle
    const togglePlayPause = () => {
        const video = videoRef.current;
        if (!video || !videoSrc) return;

        if (video.paused) {
            video.play();
            setIsPlaying(true);
            startAnalysis();
        } else {
            video.pause();
            setIsPlaying(false);
            stopAnalysis();
        }
    };

    const handleClose = () => {
        stopAnalysis();
        if (videoRef.current) {
            videoRef.current.pause();
        }
        if (videoSrc && videoSrc.startsWith('blob:')) {
            URL.revokeObjectURL(videoSrc);
        }
        setVideoSrc(null);
        onClose();
    };

    if (!open || !camera) return null;

    return (
        <div className="fixed inset-0 z-[2000] flex flex-col">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={handleClose} />

            <div className="relative flex flex-col h-full max-h-screen overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-3 md:p-4 bg-[#0d0d1a]/95 border-b border-white/10 z-10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-500/20 rounded-lg">
                            <Video size={18} className="text-red-400" />
                        </div>
                        <div>
                            <h3 className="text-sm md:text-base font-bold text-white flex items-center gap-2">
                                {camera.name}
                                {isAnalyzing && (
                                    <span className="flex items-center gap-1 px-2 py-0.5 bg-red-500/20 rounded-full">
                                        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                                        <span className="text-[10px] text-red-400 font-semibold">LIVE</span>
                                    </span>
                                )}
                            </h3>
                            <p className="text-[10px] md:text-xs text-slate-500 flex items-center gap-1">
                                <MapPin size={10} />
                                {camera.area} • {camera.lat.toFixed(4)}, {camera.lng.toFixed(4)}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                    {/* Video Panel */}
                    <div className="flex-1 relative bg-black flex items-center justify-center">
                        {/* Hidden canvas for frame capture */}
                        <canvas ref={canvasRef} className="hidden" />

                        {videoSrc ? (
                            <div className="relative w-full h-full flex items-center justify-center">
                                {/* Loading indicator while video buffers */}
                                {!videoLoaded && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                                        <Loader2 size={32} className="text-purple-400 animate-spin mb-3" />
                                        <p className="text-xs text-slate-400">Loading video feed...</p>
                                    </div>
                                )}
                                <video
                                    ref={videoRef}
                                    src={videoSrc}
                                    className="max-w-full max-h-full object-contain"
                                    preload="auto"
                                    onLoadedData={() => {
                                        console.log('Video loaded successfully');
                                        setVideoLoaded(true);
                                    }}
                                    onCanPlay={() => {
                                        if (!videoLoaded) setVideoLoaded(true);
                                    }}
                                    onError={(e) => {
                                        console.error('Video load error:', e);
                                        setError('Failed to load video. Try uploading a local file.');
                                        setVideoLoaded(false);
                                    }}
                                    onEnded={() => {
                                        setIsPlaying(false);
                                        stopAnalysis();
                                    }}
                                    loop
                                    playsInline
                                    muted
                                />
                                {/* Detection overlay canvas — positioned on top of video */}
                                <canvas
                                    ref={overlayCanvasRef}
                                    className="absolute inset-0 w-full h-full pointer-events-none"
                                    style={{ objectFit: 'contain' }}
                                />

                                {/* Play/Pause + Load Video Buttons */}
                                <div className="absolute bottom-4 left-4 flex items-center gap-2 z-20">
                                    {videoLoaded && (
                                        <button
                                            onClick={togglePlayPause}
                                            className="flex items-center gap-2 px-4 py-2 bg-black/70 backdrop-blur-sm rounded-xl border border-white/20 hover:bg-black/90 transition-all"
                                        >
                                            {isPlaying ? (
                                                <>
                                                    <Pause size={16} className="text-red-400" />
                                                    <span className="text-xs font-semibold text-white">Pause Analysis</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Play size={16} className="text-emerald-400" />
                                                    <span className="text-xs font-semibold text-white">Start Analysis</span>
                                                </>
                                            )}
                                        </button>
                                    )}
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex items-center gap-1.5 px-3 py-2 bg-black/70 backdrop-blur-sm rounded-xl border border-white/20 hover:bg-black/90 transition-all"
                                    >
                                        <Video size={14} className="text-purple-400" />
                                        <span className="text-xs font-semibold text-white">Load Video</span>
                                    </button>
                                </div>

                                {/* Live Stats HUD */}
                                {isAnalyzing && currentResult && (
                                    <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-sm rounded-lg p-2 border border-white/10">
                                        <div className="flex items-center gap-3 text-[10px] font-mono text-white">
                                            <span className="text-cyan-400">
                                                <Zap size={10} className="inline mr-1" />
                                                {currentResult.inference_time_ms}ms
                                            </span>
                                            <span className="text-orange-400">
                                                🗑 {currentResult.trash_count}
                                            </span>
                                            <span className="text-slate-400">
                                                <Eye size={10} className="inline mr-1" />
                                                {currentResult.total_detections} obj
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {/* Frame counter */}
                                {isAnalyzing && (
                                    <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-sm rounded-lg px-2 py-1 border border-red-500/30">
                                        <span className="text-[10px] font-mono text-red-400">
                                            ● REC — Frame #{analysisStats.framesAnalyzed}
                                        </span>
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* Upload prompt — shown only if videoSrc somehow empty */
                            <div className="flex flex-col items-center gap-4 p-8">
                                <div className="p-6 bg-white/5 rounded-2xl border-2 border-dashed border-white/20 hover:border-purple-500/50 transition-colors cursor-pointer"
                                    onClick={() => fileInputRef.current?.click()}>
                                    <Video size={48} className="text-slate-500 mx-auto mb-3" />
                                    <p className="text-sm text-slate-300 font-medium text-center">
                                        Load video for <span className="text-cyan-400">{camera.name}</span>
                                    </p>
                                    <p className="text-xs text-slate-500 mt-1 text-center">
                                        Select an MP4/WebM video to start AI analysis
                                    </p>
                                </div>
                            </div>
                        )}

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="video/mp4,video/webm,video/avi,video/quicktime,.mp4,.webm,.avi,.mov,.mkv"
                            onChange={handleVideoSelect}
                            className="hidden"
                        />
                    </div>

                    {/* Side Panel — Analysis Results */}
                    <div className="w-full md:w-80 bg-[#0d0d1a] border-t md:border-t-0 md:border-l border-white/10 flex flex-col overflow-hidden max-h-[40vh] md:max-h-full">
                        {/* Stats Grid */}
                        <div className="p-3 border-b border-white/5">
                            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                                Analysis Summary
                            </h4>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="bg-white/5 rounded-lg p-2 text-center">
                                    <p className="text-lg font-black text-cyan-400">{analysisStats.framesAnalyzed}</p>
                                    <p className="text-[9px] text-slate-500">Frames</p>
                                </div>
                                <div className="bg-white/5 rounded-lg p-2 text-center">
                                    <p className="text-lg font-black text-orange-400">{analysisStats.totalTrash}</p>
                                    <p className="text-[9px] text-slate-500">Trash Found</p>
                                </div>
                                <div className="bg-white/5 rounded-lg p-2 text-center">
                                    <p className="text-lg font-black text-purple-400">{analysisStats.avgInferenceMs}ms</p>
                                    <p className="text-[9px] text-slate-500">Avg Speed</p>
                                </div>
                                <div className="bg-white/5 rounded-lg p-2 text-center">
                                    <p className="text-lg font-black text-emerald-400">{analysisStats.incidentsCreated}</p>
                                    <p className="text-[9px] text-slate-500">Incidents</p>
                                </div>
                            </div>
                        </div>

                        {/* Current Detections */}
                        {currentResult && currentResult.detections.length > 0 && (
                            <div className="p-3 border-b border-white/5">
                                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                                    Current Frame Detections
                                </h4>
                                <div className="space-y-1 max-h-32 overflow-y-auto">
                                    {currentResult.detections.slice(0, 8).map((det, i) => (
                                        <div key={i} className="flex items-center justify-between px-2 py-1.5 bg-white/5 rounded-lg">
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className="w-2 h-2 rounded-full"
                                                    style={{ backgroundColor: getClassColor(det.class) }}
                                                />
                                                <span className="text-xs text-white capitalize">{det.class}</span>
                                            </div>
                                            <span className="text-[10px] text-cyan-400 font-mono">
                                                {Math.round(det.confidence * 100)}%
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Analysis Log */}
                        <div className="flex-1 p-3 overflow-y-auto">
                            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                                Detection Log
                            </h4>
                            {analysisLog.length === 0 ? (
                                <div className="text-center py-6">
                                    <Eye size={24} className="text-slate-700 mx-auto mb-2" />
                                    <p className="text-xs text-slate-600">
                                        {videoSrc ? 'Press play to start analysis' : 'Load a video to begin'}
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {analysisLog.map((entry, i) => (
                                        <div
                                            key={i}
                                            className={`flex items-center justify-between px-2 py-1.5 rounded-lg text-[10px] ${
                                                entry.trash > 0
                                                    ? 'bg-orange-500/10 border border-orange-500/10'
                                                    : 'bg-white/[0.02]'
                                            }`}
                                        >
                                            <span className="text-slate-500 font-mono">{entry.time}</span>
                                            <div className="flex items-center gap-2">
                                                {entry.incident && (
                                                    <span className="text-emerald-400">⚡ incident</span>
                                                )}
                                                <span className={entry.trash > 0 ? 'text-orange-400 font-bold' : 'text-slate-600'}>
                                                    🗑 {entry.trash}
                                                </span>
                                                <span className="text-slate-500">{entry.total} obj</span>
                                                <span className="text-cyan-400/50">{entry.ms}ms</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Result Banner */}
                        {analysisStats.framesAnalyzed > 0 && !isAnalyzing && (
                            <div className={`p-3 border-t ${
                                analysisStats.totalTrash > 0
                                    ? 'bg-orange-500/10 border-orange-500/20'
                                    : 'bg-emerald-500/10 border-emerald-500/20'
                            }`}>
                                <div className="flex items-center gap-2">
                                    {analysisStats.totalTrash > 0 ? (
                                        <AlertTriangle size={16} className="text-orange-400" />
                                    ) : (
                                        <CheckCircle size={16} className="text-emerald-400" />
                                    )}
                                    <div>
                                        <p className="text-xs font-bold text-white">
                                            {analysisStats.totalTrash > 0
                                                ? `${analysisStats.totalTrash} trash items detected across ${analysisStats.framesAnalyzed} frames`
                                                : `Area clean — ${analysisStats.framesAnalyzed} frames analyzed`}
                                        </p>
                                        {analysisStats.incidentsCreated > 0 && (
                                            <p className="text-[10px] text-emerald-400 mt-0.5">
                                                ✓ {analysisStats.incidentsCreated} incident(s) auto-reported
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Error Toast */}
                {error && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 bg-red-500/90 backdrop-blur-md text-white px-4 py-2 rounded-xl shadow-lg flex items-center gap-2 border border-red-400/30">
                        <AlertTriangle size={14} />
                        <span className="text-xs font-semibold">{error}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
