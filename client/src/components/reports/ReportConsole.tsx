import { type ReactNode } from "react"
import { Card, CardContent } from "@/components/ui/card"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface ReportConsoleProps {
  icon: LucideIcon
  kicker?: string
  title: string
  description: string
  children: ReactNode
  footer?: ReactNode
  className?: string
}

export function ReportConsole({ icon: Icon, kicker = "Console", title, description, children, footer, className }: ReportConsoleProps) {
  return (
    <Card className={cn("brand-card brand-card-hover", className)}>
      <CardContent className="space-y-6 p-6">
        <div className="flex items-start gap-3">
          <span className="rounded-2xl bg-muted/60 p-2 text-primary">
            <Icon className="h-4 w-4" />
          </span>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{kicker}</p>
            <h2 className="text-2xl font-bold text-foreground">{title}</h2>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        {children}
        {footer && <div>{footer}</div>}
      </CardContent>
    </Card>
  )
}
