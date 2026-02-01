import { Home, Bell, User, Map, AlertTriangle } from 'lucide-react';

interface BottomNavProps {
    activeTab: 'map' | 'alerts' | 'profile';
    onTabChange: (tab: 'map' | 'alerts' | 'profile') => void;
    alertCount?: number;
}

export default function BottomNav({ activeTab, onTabChange, alertCount = 0 }: BottomNavProps) {
    const navItems = [
        { id: 'map', icon: Map, label: 'Live Map' },
        { id: 'alerts', icon: AlertTriangle, label: 'Alerts' },
        { id: 'profile', icon: User, label: 'Profile' }
    ] as const;

    return (
        <div className="absolute bottom-6 left-6 right-6 z-[900]">
            <div className="bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl p-2 shadow-2xl shadow-black/50 flex justify-between items-center relative overflow-hidden">
                {/* Neon Glow Background */}
                <div className="absolute inset-0 bg-gradient-to-t from-cyan-900/20 to-transparent pointer-events-none" />

                {navItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => onTabChange(item.id)}
                        className={`flex-1 relative flex flex-col items-center justify-center py-2 rounded-xl transition-all duration-300 ${activeTab === item.id
                                ? 'text-cyan-400 bg-white/5 shadow-[0_0_15px_rgba(34,211,238,0.2)]'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                            }`}
                    >
                        <div className="relative">
                            <item.icon
                                size={24}
                                strokeWidth={activeTab === item.id ? 2.5 : 2}
                                className={`transition-transform duration-300 ${activeTab === item.id ? 'scale-110 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]' : ''}`}
                            />
                            {item.id === 'alerts' && alertCount > 0 && (
                                <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full border border-slate-900 animate-pulse" />
                            )}
                        </div>
                        <span className={`text-[10px] font-bold mt-1 tracking-wide ${activeTab === item.id ? 'opacity-100' : 'opacity-60'}`}>
                            {item.label}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}
