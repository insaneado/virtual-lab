/**
 * client/src/components/panels/AnalyticsDashboard.jsx
 * ────────────────────────────────────────────────────────
 * Live physics analytics with Recharts line charts.
 * Shows kinetic energy, average speed, and collision
 * force over time. Collapsible panel.
 * ────────────────────────────────────────────────────────
 */

import React, { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Area, AreaChart,
} from 'recharts';

const CHART_COLORS = {
  ke:       '#6366f1',
  speed:    '#22d3ee',
  force:    '#f43f5e',
};

// custom tooltip styling
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      {payload.map((entry, i) => (
        <div key={i} style={{ color: entry.color, fontSize: 11 }}>
          {entry.name}: <strong>{entry.value}</strong>
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsDashboard({ telemetry, bodyVectors, isOpen, onToggle }) {
  const [activeChart, setActiveChart] = useState('ke'); // ke | speed | force

  const latestSample = telemetry[telemetry.length - 1] || {};

  return (
    <div className={`analytics-panel glass-panel-solid ${isOpen ? 'open' : 'collapsed'}`}>
      {/* Header toggle */}
      <button className="analytics-header" onClick={onToggle}>
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="22,12 18,12 15,21 9,3 6,12 2,12" />
          </svg>
          <span className="text-xs font-semibold">ANALYTICS</span>
        </div>
        <div className="flex items-center gap-3">
          {/* live stats badges */}
          <span className="stat-badge" style={{ borderColor: CHART_COLORS.ke }}>
            KE: {latestSample.ke?.toFixed(1) || '0.0'}
          </span>
          <span className="stat-badge" style={{ borderColor: CHART_COLORS.speed }}>
            v̄: {latestSample.avgSpeed?.toFixed(1) || '0.0'}
          </span>
          <span className="stat-badge" style={{ borderColor: CHART_COLORS.force }}>
            F: {latestSample.maxForce?.toFixed(1) || '0.0'}
          </span>
          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2"
            style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
          >
            <polyline points="6,9 12,15 18,9" />
          </svg>
        </div>
      </button>

      {isOpen && (
        <div className="analytics-body">
          {/* Chart selector tabs */}
          <div className="chart-tabs">
            {[
              { key: 'ke', label: 'Kinetic Energy' },
              { key: 'speed', label: 'Avg Speed' },
              { key: 'force', label: 'Collision Force' },
            ].map(tab => (
              <button
                key={tab.key}
                className={`chart-tab ${activeChart === tab.key ? 'active' : ''}`}
                style={{ '--tab-color': CHART_COLORS[tab.key] }}
                onClick={() => setActiveChart(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Chart */}
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={telemetry} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id={`grad-${activeChart}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS[activeChart]} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={CHART_COLORS[activeChart]} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.15)" />
                <XAxis
                  dataKey="t" tick={false} axisLine={{ stroke: 'rgba(100,116,139,0.2)' }}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  axisLine={false} tickLine={false} width={35}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey={activeChart === 'ke' ? 'ke' : activeChart === 'speed' ? 'avgSpeed' : 'maxForce'}
                  name={activeChart === 'ke' ? 'Kinetic Energy' : activeChart === 'speed' ? 'Avg Speed' : 'Max Force'}
                  stroke={CHART_COLORS[activeChart]}
                  fill={`url(#grad-${activeChart})`}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Body count and vector summary */}
          <div className="analytics-footer">
            <span>Bodies: <strong>{latestSample.bodyCount || 0}</strong></span>
            <span>Vectors tracked: <strong>{bodyVectors.length}</strong></span>
          </div>
        </div>
      )}
    </div>
  );
}
