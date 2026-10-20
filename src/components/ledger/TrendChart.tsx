import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatShortWon, formatWon, type MonthKey } from '../../utils/ledger';
import type { TrendPoint } from '../../utils/ledgerAnalysis';

const INCOME = '#3b82f6';
const EXPENSE = '#6366f1';
const AXIS = '#9ca3af';

const monthLabel = (month: MonthKey) => `${Number(month.slice(5))}월`;

/** 월별 수입·지출 막대. recharts가 커서 TrendCard에서 따로 불러온다. 고른 달 막대만 진하게. */
export default function TrendChart({ points, selected }: { points: TrendPoint[]; selected: MonthKey }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={points} margin={{ top: 4, right: 0, bottom: 0, left: 0 }} barGap={2}>
        <XAxis dataKey="month" tickFormatter={monthLabel} tick={{ fontSize: 11, fill: AXIS }} axisLine={false} tickLine={false} />
        <YAxis
          tickFormatter={(v: number) => (v === 0 ? '0' : formatShortWon(v))}
          tick={{ fontSize: 10, fill: AXIS }}
          axisLine={false}
          tickLine={false}
          width={40}
        />
        <Tooltip
          cursor={{ fill: 'rgba(156, 163, 175, 0.15)' }}
          labelFormatter={(label) => monthLabel(String(label))}
          formatter={(value, name) => [formatWon(Number(value)), name === 'income' ? '수입' : '지출']}
          contentStyle={{ borderRadius: 12, fontSize: 12 }}
        />
        <Bar dataKey="income" fill={INCOME} radius={[4, 4, 0, 0]} maxBarSize={16}>
          {points.map((p) => (
            <Cell key={p.month} fillOpacity={p.month === selected ? 1 : 0.45} />
          ))}
        </Bar>
        <Bar dataKey="expense" fill={EXPENSE} radius={[4, 4, 0, 0]} maxBarSize={16}>
          {points.map((p) => (
            <Cell key={p.month} fillOpacity={p.month === selected ? 1 : 0.45} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
