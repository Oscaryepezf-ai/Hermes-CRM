import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRelativeTime } from "@/lib/utils";
import { ArrowRight } from "lucide-react";

interface ActivityItem {
  id:         string;
  user:       string;
  action:     string;
  subject:    string;
  fromStage:  string | null;
  toStage:    string;
  time:       Date;
}

interface ActivityFeedProps {
  items: ActivityItem[];
}

export function ActivityFeed({ items }: ActivityFeedProps) {
  return (
    <Card className="bg-surface shadow-card border-line-subtle">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-ink-secondary">
          Actividad reciente
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-semibold text-brand-700">
                  {item.user[0]}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-ink-primary">
                  <span className="font-medium">{item.user}</span>{" "}
                  {item.action}{" "}
                  <span className="font-medium">{item.subject}</span>
                </p>
                {item.fromStage ? (
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-xs text-ink-tertiary">{item.fromStage}</span>
                    <ArrowRight className="w-3 h-3 text-ink-disabled" />
                    <span className="text-xs text-brand-600 font-medium">
                      {item.toStage}
                    </span>
                  </div>
                ) : (
                  <p className="text-xs text-ink-tertiary mt-0.5">{item.toStage}</p>
                )}
              </div>
              <span className="text-xs text-ink-tertiary flex-shrink-0">
                {formatRelativeTime(item.time)}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
