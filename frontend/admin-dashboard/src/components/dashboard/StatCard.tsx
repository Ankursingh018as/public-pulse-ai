import { LucideIcon } from 'lucide-react';

interface StatCardProps {
    label: string;
    value: string;
    icon?: LucideIcon;
    trend?: string;
    trendUp?: boolean;
    color?: string; // 'blue', 'red', 'purple', 'amber'
}

export default function StatCard({ label, value, icon: Icon, trend, trendUp, color = 'blue' }: StatCardProps) {
    const gradients: Record<string, string> = {
        blue: 'from-blue-500 to-cyan-500',
        red: 'from-red-500 to-rose-500',
        purple: 'from-purple-500 to-indigo-500',
        amber: 'from-amber-500 to-orange-500',
        green: 'from-emerald-500 to-teal-500'
    };

    const textColors: Record<string, string> = {
        blue: 'text-blue-600',
        red: 'text-red-600',
        purple: 'text-purple-600',
        amber: 'text-amber-600',
        green: 'text-emerald-600'
    };

    const bgColors: Record<string, string> = {
        blue: 'bg-blue-50',
        red: 'bg-red-50',
        purple: 'bg-purple-50',
        amber: 'bg-amber-50',
        green: 'bg-emerald-50'
    };

    return (
        <div className="glass-card rounded-[1.75rem] p-6 relative overflow-hidden group border border-slate-100">
            {/* Background Glow - More subtle for light mode */}
            <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full blur-3xl opacity-5 group-hover:opacity-10 transition-opacity bg-gradient-to-br ${gradients[color]}`}></div>

            <div className="flex justify-between items-start mb-4 relative z-10">
                <div>
                    <p className="text-[11px] font-bold text-slate-400 tracking-widest uppercase">{label}</p>
                    <h3 className="text-3xl font-black text-slate-900 mt-1.5 tracking-tight group-hover:scale-105 transition-transform origin-left">{value}</h3>
                </div>
                {Icon && (
                    <div className={`p-3.5 rounded-2xl ${bgColors[color]} flex items-center justify-center shadow-sm group-hover:shadow-md transition-all`}>
                        <Icon className={`w-6 h-6 ${textColors[color]}`} strokeWidth={2.5} />
                    </div>
                )}
            </div>

            {trend && (
                <div className="flex items-center gap-2 text-xs relative z-10">
                    <span className={`font-bold px-1.5 py-0.5 rounded-md ${trendUp ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                        {trendUp ? '↑' : '↓'} {trend}
                    </span>
                    <span className="text-slate-400 font-medium tracking-wide">vs last hour</span>
                </div>
            )}

            {/* Bottom Gradient Line */}
            <div className={`absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r ${gradients[color]} opacity-30 group-hover:opacity-60 transition-opacity`}></div>
        </div>
    );
}
