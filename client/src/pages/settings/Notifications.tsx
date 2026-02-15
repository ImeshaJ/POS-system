import { useCallback, useEffect, useMemo, useState } from "react"
import PageTitle from "@/components/common/PageTitle"
import Loader from "@/components/common/Loader"
import { ReportHero } from "@/components/reports/ReportHero"
import { ReportConsole } from "@/components/reports/ReportConsole"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Bell, CheckCheck, RefreshCcw, Archive, Inbox, Filter, Search } from "lucide-react"
import { apiGet, apiPatch } from "@/lib/api"

type NotificationStatus = "unread" | "read" | "archived"
type NotificationType = "warning" | "success" | "info" | "error"

type NotificationItem = {
  id: number
  message: string
  type: NotificationType
  status: NotificationStatus
  createdAt: string
  readAt?: string | null
  metadata?: Record<string, unknown> | null
}

type NotificationPayload = {
  notifications: NotificationItem[]
  summary: {
    total: number
    unread: number
  }
}

const typeStyles: Record<NotificationType, string> = {
  warning: "brand-pill brand-pill-warning",
  success: "brand-pill brand-pill-success",
  info: "brand-pill brand-pill-primary",
  error: "brand-pill brand-pill-neutral text-destructive",
}

const statusStyles: Record<NotificationStatus, string> = {
  unread: "border-l-4 border-l-[#6a11cb] bg-secondary/40",
  read: "border-l-4 border-l-primary/40 bg-card",
  archived: "border-l-4 border-l-border bg-muted/30 opacity-80",
}

const statusLabel: Record<NotificationStatus, string> = {
  unread: "Unread",
  read: "Read",
  archived: "Archived",
}

const statusPillClass: Record<NotificationStatus, string> = {
  unread: "brand-pill brand-pill-primary",
  read: "brand-pill brand-pill-success",
  archived: "brand-pill brand-pill-neutral",
}

const statusFilterOptions: Array<{ label: string; value: NotificationStatus | "all" }> = [
  { label: "All statuses", value: "all" },
  { label: "Unread", value: "unread" },
  { label: "Read", value: "read" },
  { label: "Archived", value: "archived" },
]

const typeFilterOptions: Array<{ label: string; value: NotificationType | "all" }> = [
  { label: "All types", value: "all" },
  { label: "Warnings", value: "warning" },
  { label: "Success", value: "success" },
  { label: "Info", value: "info" },
  { label: "Errors", value: "error" },
]

export default function Notifications() {
  const [payload, setPayload] = useState<NotificationPayload>({
    notifications: [],
    summary: { total: 0, unread: 0 },
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<number | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<NotificationStatus | "all">("all")
  const [typeFilter, setTypeFilter] = useState<NotificationType | "all">("all")

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await apiGet<NotificationPayload>("/api/settings/notifications")
      setPayload(response.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notifications")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const updateStatus = async (id: number, status: NotificationStatus) => {
    setUpdatingId(id)
    setError(null)
    try {
      const response = await apiPatch<NotificationItem>(`/api/settings/notifications/${id}`, { status })
      setPayload((prev) => {
        const notifications = prev.notifications.map((note) =>
          note.id === id ? { ...note, ...response.data } : note
        )
        const unread = notifications.filter((note) => note.status === "unread").length
        return {
          summary: { total: notifications.length, unread },
          notifications,
        }
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update notification")
    } finally {
      setUpdatingId(null)
    }
  }

  const formatDate = (value?: string | null) => {
    if (!value) return ""
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value))
  }

  const statusBreakdown = useMemo(
    () =>
      payload.notifications.reduce(
        (acc, note) => {
          acc[note.status] += 1
          return acc
        },
        { unread: 0, read: 0, archived: 0 } as Record<NotificationStatus, number>
      ),
    [payload.notifications]
  )

  const latestActivity = useMemo(() => {
    if (!payload.notifications.length) return null
    return payload.notifications.reduce((latest, note) => {
      return new Date(note.createdAt) > new Date(latest.createdAt) ? note : latest
    })
  }, [payload.notifications])

  const visibleNotifications = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    return payload.notifications
      .filter((note) => {
        if (statusFilter !== "all" && note.status !== statusFilter) return false
        if (typeFilter !== "all" && note.type !== typeFilter) return false
        if (!term) return true
        return note.message.toLowerCase().includes(term)
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [payload.notifications, searchTerm, statusFilter, typeFilter])

  const handleResetFilters = () => {
    setSearchTerm("")
    setStatusFilter("all")
    setTypeFilter("all")
  }

  const totalCount = payload.summary.total || payload.notifications.length
  const unreadCount = statusBreakdown.unread || payload.summary.unread
  const readCount = statusBreakdown.read
  const archivedCount = statusBreakdown.archived
  const visibleCount = visibleNotifications.length

  const heroMetrics = [
    {
      label: "Alert backlog",
      value: `${unreadCount} unread`,
      hint: `${totalCount} total`,
      gradient: "from-[#0f172a] via-[#3730a3] to-[#22d3ee]",
      icon: Bell,
    },
    {
      label: "Read receipts",
      value: `${readCount} cleared`,
      hint: totalCount ? `${((readCount / totalCount) * 100).toFixed(1)}% processed` : "No data",
      gradient: "from-[#14532d] to-[#22c55e]",
      icon: CheckCheck,
    },
    {
      label: "Archived queue",
      value: `${archivedCount} filed`,
      hint: totalCount ? `${((archivedCount / totalCount) * 100).toFixed(1)}% of feed` : "No data",
      gradient: "from-[#4c0519] to-[#fb7185]",
      icon: Archive,
    },
    {
      label: "Latest activity",
      value: latestActivity ? formatDate(latestActivity.createdAt) : "No alerts",
      hint: latestActivity ? latestActivity.type : "Waiting for signals",
      gradient: "from-[#0f172a] to-[#38bdf8]",
      icon: Inbox,
    },
  ]

  const statusFilterLabel = statusFilter === "all" ? "Any status" : statusLabel[statusFilter]
  const typeFilterLabel =
    typeFilter === "all"
      ? "Any type"
      : typeFilterOptions.find((option) => option.value === typeFilter)?.label ?? typeFilter

  const highlightStats = [
    {
      label: "Status filter",
      value: statusFilterLabel,
      accent: "text-sky-400",
    },
    {
      label: "Type filter",
      value: typeFilterLabel,
      accent: "text-emerald-400",
    },
    {
      label: "Search scope",
      value: searchTerm ? `"${searchTerm}"` : "Full feed",
      accent: "text-amber-400",
    },
    {
      label: "Visible alerts",
      value: `${visibleCount} notifications`,
      accent: "text-pink-400",
    },
  ]

  const consoleFooter = (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <span className="text-muted-foreground">{visibleCount} notifications in view</span>
      <Badge variant="secondary" className="rounded-2xl border-dashed text-xs">
        {statusBreakdown.archived} archived total
      </Badge>
    </div>
  )

  return (
    <div className="space-y-6">
      <PageTitle title="Notifications" subtitle="Live feed from inventory, appointments, and billing automations." />

      <ReportHero
        kicker="Operations watch"
        title="Notification runway"
        subtitle="Track unread backlog, processed acknowledgements, and archived receipts."
        badgeLabel={totalCount ? `${totalCount} total alerts` : "No alerts"}
        metrics={heroMetrics}
        actions={
          <Button
            onClick={fetchNotifications}
            disabled={loading}
            className="rounded-2xl bg-white/90 px-5 py-2 text-[#0f172a] hover:bg-white"
          >
            <RefreshCcw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Reload feed
          </Button>
        }
      />

      <ReportConsole
        icon={Filter}
        title="Filters & spotlight"
        description="Search messages, focus on a status, or narrow to a notification type."
        footer={consoleFooter}
      >
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">Search notifications</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Message text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="h-11 rounded-2xl border-0 bg-muted/30 pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">Status filter</Label>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as NotificationStatus | "all")}>
                <SelectTrigger className="h-11 rounded-2xl">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  {statusFilterOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">Type filter</Label>
              <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as NotificationType | "all")}>
                <SelectTrigger className="h-11 rounded-2xl">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  {typeFilterOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-3 lg:grid-cols-[auto_auto_1fr]">
            <Button variant="outline" onClick={handleResetFilters} className="h-11 rounded-2xl border-dashed">
              Reset filters
            </Button>
            <Button onClick={fetchNotifications} disabled={loading} className="h-11 rounded-2xl bg-[#0f172a] text-white">
              <RefreshCcw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh feed
            </Button>
            <div className="flex items-center text-xs text-muted-foreground">Filters cascade into the cards below.</div>
          </div>
        </>
      </ReportConsole>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {highlightStats.map((stat) => (
          <Card key={stat.label} className="brand-card text-center">
            <CardContent className="space-y-2 p-5">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{stat.label}</p>
              <p className={`text-3xl font-bold ${stat.accent}`}>{stat.value}</p>
              <p className="text-xs text-muted-foreground">Live filter context</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="brand-card brand-card-hover">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Bell className="h-5 w-5 text-primary" />
            Notification Summary
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Latest alerts from inventory, appointments, and billing
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="brand-soft-panel rounded-xl border border-border p-4">
            <p className="brand-muted">Total Notifications</p>
            <p className="brand-kpi-value text-primary">{payload.summary.total}</p>
          </div>
          <div className="rounded-xl border border-transparent p-4 text-white shadow-md brand-gradient-warning">
            <p className="text-sm font-semibold text-white/80">Unread</p>
            <p className="mt-1 text-3xl font-bold">{payload.summary.unread}</p>
          </div>
          <div className="rounded-xl border border-transparent p-4 text-white shadow-md brand-gradient-success">
            <p className="text-sm font-semibold text-white/80">Read</p>
            <p className="mt-1 text-3xl font-bold">
              {Math.max(payload.summary.total - payload.summary.unread, 0)}
            </p>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="py-12">
          <Loader label="Loading notifications" />
        </div>
      ) : payload.notifications.length === 0 ? (
        <Card className="brand-card">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <Inbox className="h-10 w-10 text-muted-foreground/50" />
            <p className="mt-3 font-semibold">You're all caught up</p>
            <p className="text-sm">No notifications to display</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {visibleNotifications.length === 0 ? (
            <Card className="brand-card">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <Inbox className="h-10 w-10 text-muted-foreground/50" />
                <p className="mt-3 font-semibold">No matches</p>
                <p className="text-sm">Adjust filters or search criteria to see notifications.</p>
              </CardContent>
            </Card>
          ) : (
            visibleNotifications.map((notification) => (
              <Card
                key={notification.id}
                className={`brand-card brand-card-hover ${statusStyles[notification.status]}`}
              >
                <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className={`${typeStyles[notification.type]} capitalize`}>
                        {notification.type}
                      </span>
                      <span className={`${statusPillClass[notification.status]} capitalize`}>
                        {statusLabel[notification.status]}
                      </span>
                      {notification.status === "unread" && (
                        <span className="text-xs font-semibold uppercase tracking-wide text-primary">
                          New
                        </span>
                      )}
                    </div>
                    <p className="mt-3 text-sm text-foreground md:text-base">{notification.message}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Received {formatDate(notification.createdAt)}
                      {notification.readAt ? ` · Read ${formatDate(notification.readAt)}` : ""}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {notification.status !== "read" && (
                      <Button
                        variant="secondary"
                        className="gap-2"
                        onClick={() => updateStatus(notification.id, "read")}
                        disabled={updatingId === notification.id}
                      >
                        <CheckCheck className="h-4 w-4" />
                        Mark read
                      </Button>
                    )}
                    {notification.status !== "unread" && notification.status !== "archived" && (
                      <Button
                        variant="outline"
                        className="gap-2"
                        onClick={() => updateStatus(notification.id, "unread")}
                        disabled={updatingId === notification.id}
                      >
                        <RefreshCcw className="h-4 w-4" />
                        Re-open
                      </Button>
                    )}
                    {notification.status !== "archived" && (
                      <Button
                        variant="ghost"
                        className="gap-2 text-muted-foreground hover:text-foreground"
                        onClick={() => updateStatus(notification.id, "archived")}
                        disabled={updatingId === notification.id}
                      >
                        <Archive className="h-4 w-4" />
                        Archive
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  )
}
