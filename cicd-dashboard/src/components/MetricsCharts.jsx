import React from 'react';
import { BarChart3, TrendingUp } from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import { Card } from './ui';

function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="p-3 rounded-xl bg-slate-950/95 text-white border border-slate-800 shadow-elevated backdrop-blur-md text-xs font-mono">
        <p className="font-heading font-bold text-slate-300 mb-1">{label}</p>
        <p className="text-brand-300 font-medium">
          Duration:{' '}
          <span className="text-white font-bold">{data.value}s</span>
        </p>
      </div>
    );
  }
  return null;
}

export default function MetricsCharts({ data = [] }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Duration Time Series */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-heading font-bold text-content-primary">
              Pipeline Duration Velocity
            </h3>
            <p className="text-xs text-content-secondary">
              Execution duration trend across recent pipeline runs (seconds)
            </p>
          </div>
          <div className="w-8 h-8 rounded-xl bg-surface-subtle border border-border-subtle flex items-center justify-center text-brand-500">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>

        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="durationBrandGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                stroke="transparent"
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                stroke="transparent"
                unit="s"
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="duration"
                stroke="#6366f1"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#durationBrandGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Outcome Distribution Bar Chart */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-heading font-bold text-content-primary">
              Run Status Distribution
            </h3>
            <p className="text-xs text-content-secondary">
              Pass / Fail outcome per pipeline run
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs font-medium">
            <span className="flex items-center gap-1.5 text-content-secondary">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Success
            </span>
            <span className="flex items-center gap-1.5 text-content-secondary">
              <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> Failed
            </span>
          </div>
        </div>

        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                stroke="transparent"
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                stroke="transparent"
                unit="s"
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="duration" radius={[6, 6, 0, 0]}>
                {data.map((entry, index) => {
                  const isSuccess = entry.status === 'success';
                  const isRunning = entry.status === 'running';
                  return (
                    <Cell
                      key={`cell-${index}`}
                      fill={isSuccess ? '#10b981' : isRunning ? '#6366f1' : '#ef4444'}
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
