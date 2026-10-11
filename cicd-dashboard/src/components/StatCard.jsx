import React from 'react';
import { Card } from './ui';

export default function StatCard({
  title,
  value,
  subtext,
  icon: Icon,
  trend,
  trendUp = true,
  sparklineData = [12, 19, 14, 25, 22, 30, 28, 35],
  className = '',
}) {
  // Generate simple sparkline SVG path
  const min = Math.min(...sparklineData);
  const max = Math.max(...sparklineData);
  const range = max - min || 1;
  const width = 80;
  const height = 28;

  const points = sparklineData
    .map((val, idx) => {
      const x = (idx / (sparklineData.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 6) - 3;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <Card hoverable className={`p-5 flex flex-col justify-between ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold tracking-wider uppercase text-content-muted">
          {title}
        </span>
        {Icon && (
          <div className="w-8 h-8 rounded-xl bg-surface-subtle border border-border-subtle flex items-center justify-center text-brand-600 dark:text-brand-400 shadow-sm">
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="mt-3 flex items-end justify-between">
        <div>
          <span className="text-2xl font-heading font-extrabold text-content-primary tracking-tight">
            {value}
          </span>
          {trend && (
            <span
              className={`ml-2 text-xs font-medium px-2 py-0.5 rounded-lg inline-flex items-center ${
                trendUp
                  ? 'text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/40'
                  : 'text-rose-700 bg-rose-50 dark:text-rose-300 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/40'
              }`}
            >
              {trend}
            </span>
          )}
        </div>

        {/* Inline SVG Sparkline */}
        <div className="w-20 h-7 opacity-80" aria-hidden="true">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
            <polyline
              fill="none"
              stroke={trendUp ? '#10b981' : '#f43f5e'}
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={points}
            />
          </svg>
        </div>
      </div>

      {subtext && (
        <p className="mt-2 text-xs text-content-secondary leading-relaxed">
          {subtext}
        </p>
      )}
    </Card>
  );
}
