'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, Send, X, Sparkles, MapPin, AlertTriangle, Shield, Bot, User, Loader2, ChevronDown } from 'lucide-react';

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    metadata?: {
        type?: string;
        incidents?: number;
        severity?: string;
    };
}

interface AIChatAssistantProps {
    incidents: any[];
    userLocation: { lat: number; lng: number } | null;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

// AI response templates based on intent detection
const INTENT_RESPONSES: Record<string, (ctx: any) => string> = {
    safety: (ctx) => {
        const nearbyCount = ctx.nearbyIncidents?.length || 0;
        const critical = ctx.nearbyIncidents?.filter((i: any) => i.severity >= 0.7).length || 0;
        if (nearbyCount === 0) return "✅ Your area looks safe! No active incidents reported nearby. Stay aware and report anything unusual.";
        if (critical > 0) return `⚠️ Caution: ${critical} critical incident${critical > 1 ? 's' : ''} near you. ${nearbyCount} total active issues. Consider alternative routes if traveling.`;
        return `📊 ${nearbyCount} minor incident${nearbyCount > 1 ? 's' : ''} reported in your area. Nothing critical — normal city conditions.`;
    },
    traffic: (ctx) => {
        const traffic = ctx.allIncidents?.filter((i: any) => (i.event_type || i.type) === 'traffic') || [];
        if (traffic.length === 0) return "🚗 Traffic is flowing smoothly across Vadodara. No congestion reported.";
        const areas = Array.from(new Set(traffic.map((i: any) => i.area_name).filter(Boolean)));
        return `🚗 ${traffic.length} traffic incident${traffic.length > 1 ? 's' : ''} active${areas.length > 0 ? ` in ${areas.slice(0, 3).join(', ')}` : ''}. Consider checking real-time maps for alternative routes.`;
    },
    water: (ctx) => {
        const water = ctx.allIncidents?.filter((i: any) => ['water', 'flood'].includes(i.event_type || i.type)) || [];
        if (water.length === 0) return "💧 No waterlogging or drainage issues reported. Roads are clear.";
        return `💧 ${water.length} water/drainage issue${water.length > 1 ? 's' : ''} reported. Avoid low-lying areas if possible.`;
    },
    report: () => "📝 To report an issue:\n1. Tap the red '+' button on the map\n2. Select the issue type\n3. Add a description\n4. Submit!\n\nYou can also use the 📷 camera button for AI-powered trash detection.",
    help: () => "🤖 I'm your AI city assistant! I can help with:\n\n• **\"Is it safe?\"** — Check nearby conditions\n• **\"Traffic update\"** — Current congestion\n• **\"Water issues\"** — Flooding/drainage status\n• **\"How to report\"** — Submit an incident\n• **\"City health\"** — Overall city status\n• **\"What's happening in [area]\"** — Area-specific info",
    city_health: (ctx) => {
        const total = ctx.allIncidents?.filter((i: any) => !i.resolved).length || 0;
        const critical = ctx.allIncidents?.filter((i: any) => i.severity >= 0.7 && !i.resolved).length || 0;
        let score = 100 - Math.min(30, total * 2) - Math.min(25, critical * 8);
        score = Math.max(0, Math.min(100, score));
        const label = score >= 85 ? 'Excellent' : score >= 70 ? 'Good' : score >= 55 ? 'Fair' : score >= 40 ? 'Concerning' : 'Critical';
        return `🏙️ **Vadodara City Health: ${score}/100 (${label})**\n\n• ${total} active incidents\n• ${critical} critical issues\n• AI monitoring all zones 24/7\n\n${score >= 70 ? 'City is functioning well.' : 'Some areas need attention.'}`;
    },
    area: (ctx) => {
        const area = ctx.detectedArea;
        const areaIncidents = ctx.allIncidents?.filter((i: any) => 
            (i.area_name || '').toLowerCase().includes(area?.toLowerCase() || '')
        ) || [];
        if (!area) return "Please specify an area name (e.g., 'What's happening in Gotri?')";
        if (areaIncidents.length === 0) return `✅ ${area} is clear! No active incidents reported.`;
        const types = areaIncidents.map((i: any) => i.event_type || i.type);
        const typeSummary = Array.from(new Set(types)).join(', ');
        return `📍 **${area}**: ${areaIncidents.length} active incident${areaIncidents.length > 1 ? 's' : ''}\nTypes: ${typeSummary}\n\n${areaIncidents.some((i: any) => i.severity >= 0.7) ? '⚠️ Some critical issues — use caution.' : 'Generally manageable conditions.'}`;
    },
};

function detectIntent(text: string): { intent: string; area?: string } {
    const lower = text.toLowerCase().trim();
    
    if (/safe|danger|risk|secure/.test(lower)) return { intent: 'safety' };
    if (/traffic|jam|congestion|road block/.test(lower)) return { intent: 'traffic' };
    if (/water|flood|rain|drain|waterlog/.test(lower)) return { intent: 'water' };
    if (/report|submit|how to|complaint/.test(lower)) return { intent: 'report' };
    if (/help|what can|commands|menu/.test(lower)) return { intent: 'help' };
    if (/health|status|overview|condition|overall/.test(lower)) return { intent: 'city_health' };
    
    // Area detection
    const areas = ['alkapuri', 'gotri', 'akota', 'fatehgunj', 'manjalpur', 'sayajigunj',
                   'karelibaug', 'waghodia', 'vasna', 'makarpura', 'gorwa', 'tandalja',
                   'subhanpura', 'nizampura', 'sama', 'chhani'];
    for (const area of areas) {
        if (lower.includes(area)) {
            return { intent: 'area', area: area.charAt(0).toUpperCase() + area.slice(1) };
        }
    }
    
    if (/what|happening|going on|update|news/.test(lower)) return { intent: 'city_health' };
    
    return { intent: 'help' };
}

export default function AIChatAssistant({ incidents, userLocation }: AIChatAssistantProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: 'welcome',
            role: 'assistant',
            content: '👋 Hi! I\'m your AI city assistant for Vadodara. Ask me about safety, traffic, incidents, or type "help" for all commands.',
            timestamp: new Date(),
        }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);

    const getNearbyIncidents = useCallback(() => {
        if (!userLocation || !incidents) return [];
        return incidents.filter(i => {
            const lat = i.lat || i.location?.lat;
            const lng = i.lng || i.location?.lng;
            if (!lat || !lng) return false;
            return Math.abs(lat - userLocation.lat) < 0.02 && Math.abs(lng - userLocation.lng) < 0.02;
        });
    }, [incidents, userLocation]);

    const handleSend = useCallback(async () => {
        const text = input.trim();
        if (!text) return;

        const userMsg: ChatMessage = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: text,
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);

        // Simulate natural response delay
        await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));

        const { intent, area } = detectIntent(text);
        const ctx = {
            allIncidents: incidents,
            nearbyIncidents: getNearbyIncidents(),
            userLocation,
            detectedArea: area,
        };

        const responseText = INTENT_RESPONSES[intent]?.(ctx) || INTENT_RESPONSES.help(ctx);

        // Try to get sentiment analysis on user input
        let sentimentData = null;
        try {
            const sentRes = await fetch(`${API_URL}/ai/sentiment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text }),
            });
            if (sentRes.ok) {
                const data = await sentRes.json();
                sentimentData = data.data;
            }
        } catch {
            // Sentiment analysis is optional
        }

        let finalResponse = responseText;
        // If the user seems distressed, add empathetic response
        if (sentimentData?.urgency === 'critical' || sentimentData?.emotion === 'fear') {
            finalResponse = "🚨 I understand this is urgent. " + finalResponse + "\n\nFor emergencies, please also call 112 (National Emergency).";
        }

        const assistantMsg: ChatMessage = {
            id: `asst-${Date.now()}`,
            role: 'assistant',
            content: finalResponse,
            timestamp: new Date(),
            metadata: {
                type: intent,
                incidents: incidents.length,
                severity: sentimentData?.urgency,
            },
        };

        setIsTyping(false);
        setMessages(prev => [...prev, assistantMsg]);
    }, [input, incidents, userLocation, getNearbyIncidents]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Quick action buttons
    const quickActions = [
        { label: '🛡️ Is it safe?', query: 'Is my area safe?' },
        { label: '🚗 Traffic', query: 'Traffic update' },
        { label: '🏙️ City health', query: 'City health status' },
        { label: '❓ Help', query: 'help' },
    ];

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="bg-gradient-to-br from-cyan-500 to-blue-600 text-white p-3.5 rounded-2xl shadow-lg shadow-cyan-500/30 hover:shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2 border border-cyan-400/20"
            >
                <MessageCircle size={20} />
                <span className="text-sm font-bold">AI Chat</span>
                <Sparkles size={14} className="text-cyan-200 animate-pulse" />
            </button>
        );
    }

    return (
        <div className="bg-[#0d0d1a]/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-cyan-500/20 w-80 max-h-[480px] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-3 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2 text-white">
                    <div className="p-1.5 bg-white/20 rounded-lg">
                        <Bot size={16} />
                    </div>
                    <div>
                        <h3 className="font-bold text-sm">AI City Assistant</h3>
                        <p className="text-[9px] text-white/70">Powered by Public Pulse AI</p>
                    </div>
                </div>
                <button onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
                    <X size={16} className="text-white" />
                </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.role === 'assistant' && (
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                                <Bot size={12} className="text-white" />
                            </div>
                        )}
                        <div className={`max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed whitespace-pre-line ${
                            msg.role === 'user'
                                ? 'bg-cyan-600 text-white rounded-br-sm'
                                : 'bg-white/10 text-slate-200 border border-white/10 rounded-bl-sm'
                        }`}>
                            {msg.content}
                        </div>
                        {msg.role === 'user' && (
                            <div className="w-6 h-6 rounded-full bg-slate-600 flex items-center justify-center shrink-0 mt-0.5">
                                <User size={12} className="text-white" />
                            </div>
                        )}
                    </div>
                ))}
                
                {isTyping && (
                    <div className="flex gap-2 items-center">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shrink-0">
                            <Bot size={12} className="text-white" />
                        </div>
                        <div className="bg-white/10 border border-white/10 px-3 py-2 rounded-xl rounded-bl-sm">
                            <div className="flex gap-1">
                                <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce [animation-delay:0ms]"></span>
                                <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce [animation-delay:150ms]"></span>
                                <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce [animation-delay:300ms]"></span>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Quick Actions */}
            {messages.length <= 2 && (
                <div className="px-3 pb-2 flex gap-1.5 overflow-x-auto no-scrollbar shrink-0">
                    {quickActions.map((action) => (
                        <button
                            key={action.label}
                            onClick={() => { setInput(action.query); }}
                            className="px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[10px] text-slate-300 whitespace-nowrap hover:bg-white/10 transition-colors"
                        >
                            {action.label}
                        </button>
                    ))}
                </div>
            )}

            {/* Input */}
            <div className="p-3 border-t border-white/10 shrink-0">
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask about your city..."
                        className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"
                        disabled={isTyping}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || isTyping}
                        className="p-1.5 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-white disabled:opacity-30 transition-colors"
                    >
                        <Send size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
}
