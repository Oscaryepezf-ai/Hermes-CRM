import { cn } from "@/lib/utils";

type NmCardVariant = "default" | "inset" | "flat";

interface NmCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: NmCardVariant;
  hover?: boolean;
}

export function NmCard({
  children,
  className,
  variant = "default",
  hover = false,
  ...props
}: NmCardProps) {
  return (
    <div
      className={cn(
        "rounded-nm-xl p-5 transition-shadow duration-200",
        variant === "default" && [
          "bg-nm-base shadow-nm-card",
          hover && "hover:shadow-nm-card-hover",
        ],
        variant === "inset" && "bg-nm-surface shadow-nm-inset",
        variant === "flat"  && "bg-nm-base rounded-nm-lg border border-nm-border p-4",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
