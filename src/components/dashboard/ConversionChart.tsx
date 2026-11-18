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

  const grid       = dark ? "#232736" : "#E9ECF7";
  const tick       = dark ? "#8A94AE" : "#66728C";
  const tooltipBg  = dark ? "#1A1D27" : "#ffffff";
  const tooltipTxt = dark ? "#F0F2F8" : "#1B1E3A";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[15px] font-semibold text-ink-primary">
          Leads por fuente
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="barFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#7C5CF2" />
                <stop offset="100%" stopColor="#6366f1" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="4 4" stroke={grid} vertical={false} />
            <XAxis
              dataKey="source"
              tick={{ fontSize: 11, fill: tick }}
              axisLine={false}
              tickLine={false}
              dy={6}
            />
            <YAxis
              tick={{ fontSize: 12, fill: tick }}
              axisLine={false}
              tickLine={false}
              width={28}
              allowDecimals={false}
            />
            <Tooltip
              formatter={(value) => [Number(value), "Leads"]}
              cursor={{ fill: "#6366f1", fillOpacity: 0.06 }}
              contentStyle={{
                borderRadius: "12px",
                border:     "none",
                fontSize:   "12px",
                background: tooltipBg,
                color:      tooltipTxt,
                boxShadow:  "0 12px 32px rgba(41,50,120,0.16)",
              }}
            />
            <Bar dataKey="count" fill="url(#barFill)" radius={[8, 8, 0, 0]} maxBarSize={36} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
