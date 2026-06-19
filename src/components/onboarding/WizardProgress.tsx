import { cn } from "@/lib/utils"

export function WizardProgress({ step }: { step: number }) {
  return (
    <div className="flex gap-1.5 mb-6">
      {[1, 2, 3, 4].map((n) => (
        <div
          key={n}
          className={cn("h-1.5 flex-1 rounded-full", n <= step ? "bg-indigo-600" : "bg-gray-200")}
        />
      ))}
    </div>
  )
}
