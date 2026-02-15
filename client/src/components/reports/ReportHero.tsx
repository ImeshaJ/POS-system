import { type ReactNode } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export type ReportHeroMetric = {
  label: string
  value: string
  hint?: string
  icon: LucideIcon
  gradient?: string
}

interface ReportHeroProps {
  kicker?: string
  title: string
  subtitle: string
  badgeLabel?: string
  metrics: ReportHeroMetric[]
  actions?: ReactNode
  className?: string
  gradient?: string
}

const DEFAULT_HEADER_GRADIENT = "from-[#0f172a] via-[#1d4ed8] to-[#7c3aed]"

export function ReportHero({
  kicker = "Console",
  title,
  subtitle,
  badgeLabel,
  metrics,
  actions,
  className,
  gradient = DEFAULT_HEADER_GRADIENT,
}: ReportHeroProps) {
  return (
    <Card className={cn("brand-card brand-card-hover overflow-hidden", className)}>
      <CardContent className="p-0">
        <div className={cn("bg-linear-to-r p-6 text-white", gradient)}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/70">{kicker}</p>
              <h2 className="text-3xl font-bold">{title}</h2>
              <p className="text-sm text-white/80">{subtitle}</p>
            </div>
            <div className="flex flex-col items-end gap-3 text-right">
              {badgeLabel && (
                <Badge className="brand-pill border border-white/30 bg-white/10 text-white">{badgeLabel}</Badge>
              )}
              {actions}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2 xl:grid-cols-4">
          {metrics.map(({ label, value, hint, gradient: metricGradient, icon: Icon }) => (
            <div
              key={label}
              className={cn(
                "rounded-2xl border border-white/10 bg-linear-to-br p-4 text-white shadow-lg",
                metricGradient || "from-[#0f172a] to-[#38bdf8]"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-white/70">{label}</p>
                  <p className="mt-2 text-2xl font-bold">{value}</p>
                  {hint && <p className="text-xs text-white/80">{hint}</p>}
                </div>
                <span className="rounded-2xl bg-white/20 p-2">
                  <Icon className="h-5 w-5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
