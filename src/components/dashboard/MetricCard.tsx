import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title:           string;
  value:           string;
  change?:         string;
  changePositive?: boolean;
  subtitle?:       string;
  icon:            LucideIcon;
}

export function MetricCard({
  title,
  value,
  change,
  changePositive = true,
  subtitle,
  icon: Icon,
}: MetricCardProps) {
  return (
    <Card className="bg-white shadow-sm border-gray-100">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-gray-500 font-medium">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {change && (
              <p className={cn(
                "text-xs font-medium",
                changePositive ? "text-emerald-600" : "text-red-500"
              )}>
                {changePositive ? "↑" : "↓"} {change}
              </p>
            )}
            {subtitle && (
              <p className="text-xs text-gray-400">{subtitle}</p>
            )}
          </div>
          <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
            <Icon className="w-5 h-5 text-indigo-600" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
