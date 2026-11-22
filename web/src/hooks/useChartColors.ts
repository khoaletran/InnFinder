import { useMemo } from 'react';

export interface ChartColorTokens {
  primary: string;
  grid: string;
  textMuted: string;
  border: string;
  surface: string;
  pieSeries: string[];
}

const readVar = (name: string, fallback: string): string => {
  if (typeof window === 'undefined') return fallback;
  const val = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return val || fallback;
};

export function useChartColors(): ChartColorTokens {
  return useMemo(
    () => ({
      primary: readVar('--chart-primary', 'var(--accent)'),
      grid: readVar('--chart-grid', 'var(--border)'),
      textMuted: readVar('--text-muted', 'var(--text-secondary)'),
      border: readVar('--border', 'var(--border-strong)'),
      surface: readVar('--surface', 'var(--bg)'),
      pieSeries: [
        readVar('--chart-primary', 'var(--accent)'),
        readVar('--chart-series-5', 'var(--text-secondary)'),
        readVar('--chart-series-2', 'var(--text-muted)'),
        readVar('--chart-series-3', 'var(--text-subtle)'),
        readVar('--chart-series-4', 'var(--border-strong)'),
      ],
    }),
    [],
  );
}
