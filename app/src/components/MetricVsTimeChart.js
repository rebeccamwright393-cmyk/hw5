import { useState, useRef } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const LINE_COLOR = '#818cf8';

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(15, 15, 35, 0.92)',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: 10,
      padding: '0.65rem 0.9rem',
      fontSize: '0.82rem',
      fontFamily: 'Inter, sans-serif',
      color: '#e2e8f0',
      boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
    }}>
      <p style={{ margin: '0 0 0.4rem', fontWeight: 700, color: '#fff' }}>{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ margin: '0.15rem 0', color: p.stroke }}>
          {p.name}: <strong>{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}</strong>
        </p>
      ))}
    </div>
  );
}

function ChartContent({ data, field }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart
        data={data}
        margin={{ top: 8, right: 16, left: 0, bottom: 64 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="rgba(255,255,255,0.07)"
          vertical={false}
        />
        <XAxis
          dataKey="name"
          tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11, fontFamily: 'Inter,sans-serif' }}
          axisLine={{ stroke: 'rgba(255,255,255,0.12)' }}
          tickLine={false}
          angle={-30}
          textAnchor="end"
          interval={0}
        />
        <YAxis
          tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11, fontFamily: 'Inter,sans-serif' }}
          axisLine={false}
          tickLine={false}
          width={55}
          tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v))}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
        <Line
          type="monotone"
          dataKey="value"
          name={field}
          stroke={LINE_COLOR}
          strokeWidth={2}
          dot={{ fill: LINE_COLOR, r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

function downloadSvg(containerRef, filename) {
  const svg = containerRef.current?.querySelector('svg');
  if (!svg) return;
  const svgData = new XMLSerializer().serializeToString(svg);
  const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'chart.svg';
  a.click();
  URL.revokeObjectURL(url);
}

function downloadPng(containerRef, filename) {
  const svg = containerRef.current?.querySelector('svg');
  if (!svg) return;
  const svgData = new XMLSerializer().serializeToString(svg);
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    const w = img.naturalWidth || img.width || 800;
    const h = img.naturalHeight || img.height || 400;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgb(15, 15, 35)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    canvas.toBlob((blob) => {
      const pngUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = pngUrl;
      a.download = filename || 'chart.png';
      a.click();
      URL.revokeObjectURL(pngUrl);
    }, 'image/png');
    URL.revokeObjectURL(url);
  };
  img.src = url;
}

export default function MetricVsTimeChart({ data, field }) {
  const [modalOpen, setModalOpen] = useState(false);
  const chartRef = useRef(null);
  const modalRef = useRef(null);

  if (!data?.length) return null;

  const baseName = `metric-vs-time-${(field || 'chart').replace(/\s+/g, '-')}`;

  return (
    <div className="metric-vs-time-chart-wrap">
      <p className="metric-vs-time-chart-label">
        {field || 'Metric'} vs time
      </p>
      <div
        ref={chartRef}
        className="metric-vs-time-chart-clickable"
        onClick={() => setModalOpen(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && setModalOpen(true)}
        aria-label="Click to enlarge chart"
      >
        <ChartContent data={data} field={field} />
      </div>
      <div className="metric-vs-time-chart-actions">
        <button
          type="button"
          className="metric-vs-time-chart-download"
          onClick={(e) => {
            e.stopPropagation();
            downloadSvg(chartRef, `${baseName}.svg`);
          }}
        >
          Download SVG
        </button>
        <button
          type="button"
          className="metric-vs-time-chart-download"
          onClick={(e) => {
            e.stopPropagation();
            downloadPng(chartRef, `${baseName}.png`);
          }}
        >
          Download PNG
        </button>
      </div>

      {modalOpen && (
        <div
          className="metric-vs-time-modal-overlay"
          onClick={() => setModalOpen(false)}
          role="presentation"
        >
          <div
            className="metric-vs-time-modal"
            onClick={(e) => e.stopPropagation()}
            ref={modalRef}
          >
            <button
              type="button"
              className="metric-vs-time-modal-close"
              onClick={() => setModalOpen(false)}
              aria-label="Close"
            >
              ×
            </button>
            <h3 className="metric-vs-time-modal-title">{field || 'Metric'} vs time</h3>
            <div className="metric-vs-time-modal-chart">
              <ChartContent data={data} field={field} />
            </div>
            <div className="metric-vs-time-chart-actions">
              <button
                type="button"
                className="metric-vs-time-chart-download"
                onClick={() => downloadSvg(modalRef, `${baseName}.svg`)}
              >
                Download SVG
              </button>
              <button
                type="button"
                className="metric-vs-time-chart-download"
                onClick={() => downloadPng(modalRef, `${baseName}.png`)}
              >
                Download PNG
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
