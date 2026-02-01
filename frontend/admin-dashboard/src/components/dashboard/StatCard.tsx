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
        blue: 'text-cyan-400',
        red: 'text-rose-400',
        purple: 'text-purple-400',
        amber: 'text-amber-400',
        green: 'text-emerald-400'
    };

    const bgColors: Record<string, string> = {
        blue: 'bg-blue-500/10',
        red: 'bg-red-500/10',
        purple: 'bg-purple-500/10',
        amber: 'bg-amber-500/10',
        green: 'bg-emerald-500/10'
    };

    return (
        <div className="glass-card rounded-2xl p-6 relative overflow-hidden group">
            {/* Background Glow */}
            <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full blur-3xl opacity-20 group-hover:opacity-30 transition-opacity bg-gradient-to-br ${gradients[color]}`}></div>

            <div className="flex justify-between items-start mb-4">
                <div>
                    <p className="text-sm font-medium text-slate-400 tracking-wide">{label}</p>
                    <h3 className="text-3xl font-bold text-white mt-1 tracking-tight text-glow">{value}</h3>
                </div>
                {Icon && (
                    <div className={`p-3 rounded-xl ${bgColors[color]} border border-white/5`}>
                        <Icon className={`w-6 h-6 ${textColors[color]}`} />
                    </div>
                )}
            </div>

            {trend && (
                <div className="flex items-center gap-2 text-xs">
                    <span className={`font-semibold ${trendUp ? 'text-green-400' : 'text-red-400'}`}>
                        {trendUp ? '↑' : '↓'} {trend}
                    </span>
                    <span className="text-slate-500">vs last hour</span>
                </div>
            )}

            {/* Bottom Gradient Line */}
            <div className={`absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r ${gradients[color]} opacity-50`}></div>
        </div>
    );
}
