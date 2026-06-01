"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ConversionChartProps {
  data: { source: string; count: number }[];
}

export function ConversionChart({ data }: ConversionChartProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const dark = mounted && resolvedTheme === "dark";

  const grid       = dark ? "#232736" : "#f1f5f9";
  const tick       = dark ? "#5C6680" : "#94a3b8";
  const tooltipBg  = dark ? "#1A1D27" : "#ffffff";
  const tooltipBrd = dark ? "#2A2F42" : "#e2e8f0";
  const tooltipTxt = dark ? "#F0F2F8" : "#1A1D23";

  return (
    <Card className="bg-surface shadow-card border-line-subtle">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-ink-secondary">
          Leads por fuente
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
            <XAxis
              dataKey="source"
              tick={{ fontSize: 11, fill: tick }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: tick }}
              axisLine={false}
              tickLine={false}
              width={25}
            />
            <Tooltip
              formatter={(value) => [Number(value), "Leads"]}
              contentStyle={{
                borderRadius: "8px",
                border:     `1px solid ${tooltipBrd}`,
                fontSize:   "12px",
                background: tooltipBg,
                color:      tooltipTxt,
              }}
            />
            <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
