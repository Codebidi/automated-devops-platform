import React from 'react';
import { BarChart3 } from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  Tooltip, BarChart, Bar, Cell
} from 'recharts';

export default function MetricsCharts({ data = [] }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Duration Time Series */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Pipeline Duration Trend
            </h3>
            <p className="text-xs text-slate-500">Last 20 runs (duration in seconds)</p>
          </div>
          <BarChart3 className="w-4 h-4 text-slate-400" aria-hidden="true" />
        </div>
        <div className="h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="durationGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0284c7" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#0284c7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} stroke="#cbd5e1" />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} stroke="#cbd5e1" unit="s" />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                formatter={(val) => [`${val}s`, 'Duration']}
              />
              <Area type="monotone" dataKey="duration" stroke="#0284c7" strokeWidth={2} fillOpacity={1} fill="url(#durationGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Pass / Fail Outcome Chart */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Recent Run Statuses
            </h3>
            <p className="text-xs text-slate-500">Green = Success, Red = Failed, Blue = Running</p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1 text-slate-500">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Pass
            </span>
            <span className="flex items-center gap-1 text-slate-500">
              <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> Fail
            </span>
          </div>
        </div>
        <div className="h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} stroke="#cbd5e1" />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} stroke="#cbd5e1" unit="s" />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                formatter={(val, name, item) => [`${val}s (${item.payload.status})`, 'Duration']}
              />
              <Bar dataKey="duration" radius={[4, 4, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.status === 'success' ? '#10b981' : entry.status === 'failed' ? '#f43f5e' : '#0284c7'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
