'use client';

import { Activity, AlertTriangle, BarChart, Bell, Clock, MapPin, Menu, Wifi, WifiOff, X } from 'lucide-react';
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
    ];

    const handleTabChange = (tabId: string) => {
        setActiveTab(tabId);
        setMobileOpen(false);
    };

    const sidebarContent = (
        <div className="flex flex-col h-full bg-white rounded-[2rem] shadow-sm border border-slate-100/50">
            {/* Header */}
            <div className="p-6 lg:p-8 border-b border-slate-50">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2.5 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl shadow-lg shadow-cyan-500/20 text-white">
                        <Activity className="w-5 h-5 lg:w-6 lg:h-6" strokeWidth={2.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                            Public Pulse
                        </h1>
                        <p className="text-[11px] text-slate-400 font-semibold tracking-wider uppercase">Admin Console</p>
                    </div>
                    {/* Mobile close button */}
                    <button
                        onClick={() => setMobileOpen(false)}
                        className="lg:hidden p-2 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Status Indicator */}
                <div className={`mt-5 flex items-center justify-between gap-2 text-xs py-2 px-3.5 rounded-xl border ${isConnected
                    ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                    : 'bg-rose-50 border-rose-100 text-rose-700'
                    }`}>
                    <div className="flex items-center gap-2">
                        {isConnected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
                        <span className="font-semibold">{isConnected ? 'System Online' : 'Connecting...'}</span>
                    </div>
                    {isConnected && <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.4)]"></span>}
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto no-scrollbar">
                <p className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 mt-1">Main Menu</p>
                {menuItems.map((item) => {
                    const isActive = activeTab === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => handleTabChange(item.id)}
                            className={`relative flex items-center gap-3 w-full p-3.5 rounded-2xl transition-all duration-300 group
                            ${isActive
                                    ? 'bg-gradient-to-r from-indigo-500 to-blue-600 text-white shadow-lg shadow-indigo-500/25'
                                    : 'text-slate-500 hover:bg-slate-50 hover:text-indigo-600'
                                }`}
                        >
                            <span className={`${isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-600 transition-colors'}`}>
                                {item.icon}
                            </span>
                            <span className="font-semibold text-sm tracking-wide">{item.label}</span>
                            {isActive && (
                                <span className="absolute right-3 w-1.5 h-1.5 bg-white rounded-full opacity-60"></span>
                            )}
                        </button>
                    );
                })}
            </nav>

            {/* User Profile Footer */}
            <div className="p-4 border-t border-slate-50">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3 hover:bg-indigo-50/50 hover:border-indigo-100 transition-colors cursor-pointer group">
                    <div className="w-10 h-10 rounded-full bg-white border-2 border-white shadow-md flex items-center justify-center overflow-hidden">
                        <div className="w-full h-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-white text-xs font-bold">
                            AS
                        </div>
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 group-hover:text-indigo-700 transition-colors truncate">Ankur Singh</p>
                        <p className="text-xs text-slate-500 truncate font-medium">Super Admin</p>
                    </div>
                    <div className="text-slate-300 group-hover:text-indigo-400">
                        <Menu size={16} />
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <>
            {/* Mobile hamburger button */}
            <button
                onClick={() => setMobileOpen(true)}
                className="lg:hidden fixed top-4 left-4 z-[60] p-2.5 bg-white rounded-xl shadow-md border border-slate-100 text-slate-600 active:scale-95 transition-all"
            >
                <Menu className="w-6 h-6" />
            </button>

            {/* Mobile overlay */}
            {mobileOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[55]"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Desktop Sidebar - Floating White Island */}
            <aside className="hidden lg:flex w-80 h-screen fixed left-0 top-0 p-5 z-50">
                {sidebarContent}
            </aside>

            {/* Mobile Sidebar Drawer */}
            <aside className={`lg:hidden fixed top-0 left-0 h-screen w-80 max-w-[85vw] bg-white z-[60] transform transition-transform duration-300 ease-in-out p-4 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'
                }`}>
                {sidebarContent}
            </aside>
        </>
    );
}

