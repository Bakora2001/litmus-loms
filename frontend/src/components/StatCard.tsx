import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string;
  trend?: string;
  trendUp?: boolean;
  trendLabel?: string;
}

export default function StatCard({
  icon: Icon,
  iconBg,
  iconColor,
  label,
  value,
  trend,
  trendUp,
  trendLabel,
}: StatCardProps) {
  return (
    <div className="card flex flex-col gap-3 min-w-0">
      <div className="flex items-center justify-between">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconBg}`}>
          <Icon size={18} className={iconColor} />
        </div>
      </div>
      <div>
        <div className="text-xs font-medium text-gray-500">{label}</div>
        <div className="text-2xl font-bold text-litmus-black mt-0.5 truncate">{value}</div>
      </div>
      {trend && (
        <div className="text-xs">
          <span className={`font-semibold ${trendUp ? 'text-emerald-600' : 'text-litmus-red'}`}>
            {trendUp ? '↑' : '↓'} {trend}
          </span>{' '}
          <span className="text-gray-400">{trendLabel}</span>
        </div>
      )}
    </div>
  );
}
