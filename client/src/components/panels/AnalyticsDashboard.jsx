import React, { memo, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import useAnalyticsStore from '../../stores/useAnalyticsStore.js';
import useCanvasStore from '../../stores/useCanvasStore.js';

const COLORS = ['#22d3ee', '#6366f1', '#10b981', '#f43f5e', '#f59e0b'];
const TABS = ['Velocity', 'Kinetic Energy', 'Forces'];

function makeChartData(seriesByBody, watchedBodyIds, tab) {
  const rows = new Map();
  watchedBodyIds.slice(0, 5).forEach((bodyId) => {
    (seriesByBody[bodyId] || []).forEach((sample) => {
      const key = sample.t;
      const row = rows.get(key) || { t: key };
      row[bodyId] = tab === 'Velocity' ? sample.velocity : tab === 'Kinetic Energy' ? sample.kineticEnergy : sample.force;
      rows.set(key, row);
    });
  });
  return Array.from(rows.values()).slice(-100);
}

function AnalyticsDashboard({ open, onToggle }) {
  const [tab, setTab] = useState('Velocity');
  const watchedBodyIds = useCanvasStore((state) => state.watchedBodyIds);
  const timeseriesData = useAnalyticsStore((state) => state.timeseriesData);
  const chartData = useMemo(
    () => makeChartData(timeseriesData, watchedBodyIds, tab),
    [timeseriesData, watchedBodyIds, tab]
  );

  return (
    <section className={`analytics-dock ${open ? 'open' : ''}`}>
      <button className="analytics-titlebar" type="button" onClick={onToggle}>
        <span>Analytics</span>
        <span>{open ? 'Hide' : 'Show'}</span>
      </button>
      {open && (
        <div className="analytics-content">
          <div className="chart-tabs" role="tablist" aria-label="Analytics view">
            {TABS.map((item) => (
              <button
                key={item}
                className={`chart-tab ${tab === item ? 'active' : ''}`}
                type="button"
                onClick={() => setTab(item)}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="rgba(148,163,184,0.16)" strokeDasharray="3 3" />
                <XAxis dataKey="t" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} width={34} />
                <Tooltip contentStyle={{ background: '#111827', border: '1px solid #334155' }} />
                {watchedBodyIds.slice(0, 5).map((bodyId, index) => (
                  <Line
                    key={bodyId}
                    type="monotone"
                    dataKey={bodyId}
                    name={bodyId}
                    stroke={COLORS[index % COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="analytics-footnote">
            Watching {watchedBodyIds.length} body{watchedBodyIds.length === 1 ? '' : 'ies'}.
          </p>
        </div>
      )}
    </section>
  );
}

AnalyticsDashboard.propTypes = {
  open: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
};

export default memo(AnalyticsDashboard);
