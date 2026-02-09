'use client';

import { Activity, AlertTriangle, BarChart, Bell, Clock, MapPin, Menu, Users, Wifi, WifiOff, X, Zap } from 'lucide-react';
import { useState } from 'react';

interface SidebarProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
    isConnected: boolean;
}

export default function Sidebar({ activeTab, setActiveTab, isConnected }: SidebarProps) {
    const [mobileOpen, setMobileOpen] = useState(false);

    const menuItems = [
        { id: 'Live Monitor', icon: <Activity className="w-5 h-5" />, label: 'Live Monitor' },
        { id: 'Map Simulation', icon: <MapPin className="w-5 h-5" />, label: 'City Map' },
        { id: 'Alerts', icon: <Bell className="w-5 h-5" />, label: 'Alerts' },
        { id: 'Incidents', icon: <AlertTriangle className="w-5 h-5" />, label: 'Incidents' },
        { id: 'History', icon: <Clock className="w-5 h-5" />, label: 'History' },
        { id: 'Analytics', icon: <BarChart className="w-5 h-5" />, label: 'Analytics' },
        { id: 'Resources', icon: <Users className="w-5 h-5" />, label: 'Resources' },
    ];

    const handleTabChange = (tabId: string) => {
        setActiveTab(tabId);
        setMobileOpen(false);
    };

    const sidebarContent = (
        <>
            {/* Header */}
            <div className="p-6 lg:p-8 border-b border-white/5">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-lg shadow-lg shadow-cyan-500/20">
                        <Zap className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-lg lg:text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                            Public Pulse
                        </h1>
                        <p className="text-[10px] text-slate-400 tracking-wider uppercase">Civic Intelligence</p>
                    </div>
                    {/* Mobile close button */}
                    <button
                        onClick={() => setMobileOpen(false)}
                        className="lg:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/10"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Status Indicator */}
                <div className={`mt-4 flex items-center gap-2 text-xs py-1.5 px-3 rounded-full border ${isConnected
                        ? 'bg-green-500/10 border-green-500/20 text-green-400'
                        : 'bg-red-500/10 border-red-500/20 text-red-400'
                    }`}>
                    {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                    <span className="font-medium">{isConnected ? 'System Online' : 'Connecting...'}</span>
                    {isConnected && <span className="ml-auto w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>}
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-3 lg:p-4 space-y-1.5 lg:space-y-2 overflow-y-auto">
                <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 mt-2">Menu</p>
                {menuItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => handleTabChange(item.id)}
                        className={`relative flex items-center gap-3 w-full p-3 lg:p-3.5 rounded-xl transition-all duration-300 group
                        ${activeTab === item.id
                                ? 'bg-gradient-to-r from-blue-600/20 to-cyan-600/20 border border-blue-500/30 text-white shadow-lg shadow-blue-900/20'
                                : 'text-slate-400 hover:bg-white/5 hover:text-white border border-transparent'
                            }`}
                    >
                        <span className={`${activeTab === item.id ? 'text-cyan-400' : 'text-slate-500 group-hover:text-cyan-400 transition-colors'}`}>
                            {item.icon}
                        </span>
                        <span className="font-medium text-sm">{item.label}</span>
                        {activeTab === item.id && (
                            <span className="w-1 h-8 bg-cyan-400 rounded-full blur-[2px] opacity-50 absolute left-0 top-1/2 -translate-y-1/2"></span>
                        )}
                    </button>
                ))}
            </nav>

            {/* User Profile Footer */}
            <div className="p-3 lg:p-4 border-t border-white/5">
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xs font-bold text-white shadow-lg">AS</div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">Ankur Singh</p>
                        <p className="text-xs text-slate-400 truncate">Admin Access</p>
                    </div>
                </div>
            </div>
        </>
    );

    return (
        <>
            {/* Mobile hamburger button */}
            <button
                onClick={() => setMobileOpen(true)}
                className="lg:hidden fixed top-5 left-4 z-[60] p-2 bg-slate-800/90 backdrop-blur-md rounded-xl border border-white/10 text-white shadow-lg"
            >
                <Menu className="w-5 h-5" />
            </button>

            {/* Mobile overlay */}
            {mobileOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[55]"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Desktop Sidebar - hidden on mobile */}
            <aside className="hidden lg:flex w-72 h-screen fixed left-0 top-0 glass border-r border-white/10 flex-col z-50">
                {sidebarContent}
            </aside>

            {/* Mobile Sidebar Drawer */}
            <aside className={`lg:hidden fixed top-0 left-0 h-screen w-72 max-w-[85vw] glass border-r border-white/10 flex flex-col z-[60] transform transition-transform duration-300 ease-in-out ${
                mobileOpen ? 'translate-x-0' : '-translate-x-full'
            }`}>
                {sidebarContent}
            </aside>
        </>
    );
}

