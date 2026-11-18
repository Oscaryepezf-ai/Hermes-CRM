"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface RevenueChartProps {
  data: { month: string; value: number }[];
}

function formatValue(value: number) {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000)    return `$${(value / 1000).toFixed(0)}K`;
  return `$${value}`;
}

export function RevenueChart({ data }: RevenueChartProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const dark = mounted && resolvedTheme === "dark";

  const grid       = dark ? "#232736" : "#E9ECF7";
  const tick       = dark ? "#8A94AE" : "#66728C";
  const tooltipBg  = dark ? "#1A1D27" : "#ffffff";
  const tooltipTxt = dark ? "#F0F2F8" : "#1B1E3A";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[15px] font-semibold text-ink-primary">
          Ingresos · últimos 6 meses
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity={0.28} />
                <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="4 4" stroke={grid} vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12, fill: tick }}
              axisLine={false}
              tickLine={false}
              dy={6}
            />
            <YAxis
              tickFormatter={formatValue}
              tick={{ fontSize: 12, fill: tick }}
              axisLine={false}
              tickLine={false}
              width={60}
            />
            <Tooltip
              formatter={(value) => [formatValue(Number(value)), "Ingresos"]}
              cursor={{ stroke: "#6366f1", strokeOpacity: 0.25, strokeWidth: 1 }}
              contentStyle={{
                borderRadius: "12px",
                border:     "none",
                fontSize:   "12px",
                background: tooltipBg,
                color:      tooltipTxt,
                boxShadow:  "0 12px 32px rgba(41,50,120,0.16)",
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#6366f1"
              strokeWidth={2.5}
              fill="url(#revenueFill)"
              dot={false}
              activeDot={{ r: 5, fill: "#6366f1", stroke: "#fff", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
