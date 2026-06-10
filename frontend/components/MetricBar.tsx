'use client';

import React from 'react';

interface MetricBarProps {
  label: string;
  value: number;
  total: number;
  colorClass: string; // Tailwind background color class, e.g. 'bg-emerald-500'
  suffix?: string;
}

export default function MetricBar({ label, value, total, colorClass, suffix = '' }: MetricBarProps) {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  const percentageFormatted = percentage.toFixed(1);

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs font-semibold">
        <span className="text-slate-400">{label}</span>
        <span className="text-white">
          {value} / {total} {suffix && <span className="text-slate-500 font-normal">({suffix})</span>}
          <span className="ml-2 text-brand-400 font-bold">{percentageFormatted}%</span>
        </span>
      </div>
      
      <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800/80">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-out ${colorClass}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
