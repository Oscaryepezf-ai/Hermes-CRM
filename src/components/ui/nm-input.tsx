import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface NmInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: LucideIcon;
}

export function NmInput({
  label,
  icon: Icon,
  className,
  id,
  ...props
}: NmInputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={id}
          className="text-nm-sm text-nm-text-secondary font-medium"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-nm-text-muted" />
        )}
        <input
          id={id}
          className={cn(
            "w-full bg-nm-surface rounded-nm-md py-2.5 text-nm-base text-nm-text-primary",
            "shadow-nm-input border-none outline-none",
            "placeholder:text-nm-text-muted",
            "focus:ring-2 focus:ring-nm-blue focus:ring-offset-0",
            "transition-all duration-150",
            Icon ? "pl-10 pr-4" : "px-4",
            className
          )}
          {...props}
        />
      </div>
    </div>
  );
}
