import { useCallback, useEffect, useMemo, useState } from "react"
import PageTitle from "@/components/common/PageTitle"
import Loader from "@/components/common/Loader"
import { ReportHero } from "@/components/reports/ReportHero"
import { ReportConsole } from "@/components/reports/ReportConsole"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Users, Shield, Trash2, Edit2, Plus, AlertTriangle, UserCheck, RefreshCw, Filter, Search } from "lucide-react"
import { apiDelete, apiGet, apiPatch } from "@/lib/api"

type Role = "admin" | "staff" | string
type Status = "Active" | "Inactive"

type User = {
  id: number
  username: string
  email: string
  role: Role
  status: Status
  fullName: string
  createdAt: string
}

const roleOptions: { label: string; value: Role }[] = [
  { label: "Admin", value: "admin" },
  { label: "Staff", value: "staff" },
]

const statusFilters: Array<{ label: string; value: Status | "all" }> = [
  { label: "All statuses", value: "all" },
  { label: "Active", value: "Active" },
  { label: "Inactive", value: "Inactive" },
]

const RECENT_WINDOW_DAYS = 30

export default function UsersRoles() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAddingUser, setIsAddingUser] = useState(false)
  const [updatingId, setUpdatingId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState<Role | "all">("all")
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all")

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await apiGet<User[]>("/api/settings/users")
      setUsers(response.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleRoleChange = async (userId: number, nextRole: Role) => {
    setUpdatingId(userId)
    setError(null)
    try {
      const response = await apiPatch<User>(`/api/settings/users/${userId}`, { role: nextRole })
      setUsers((prev) => prev.map((user) => (user.id === userId ? response.data : user)))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update role")
    } finally {
      setUpdatingId(null)
    }
  }

  const handleStatusToggle = async (user: User) => {
    const nextStatus: Status = user.status === "Active" ? "Inactive" : "Active"
    setUpdatingId(user.id)
    setError(null)
    try {
      const response = await apiPatch<User>(`/api/settings/users/${user.id}`, { status: nextStatus })
      setUsers((prev) => prev.map((u) => (u.id === user.id ? response.data : u)))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update status")
    } finally {
      setUpdatingId(null)
    }
  }

  const handleDelete = async (userId: number) => {
    if (!window.confirm("Delete this user? This action cannot be undone.")) {
      return
    }
    setDeletingId(userId)
    setError(null)
    try {
      await apiDelete(`/api/settings/users/${userId}`)
      setUsers((prev) => prev.filter((u) => u.id !== userId))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete user")
    } finally {
      setDeletingId(null)
    }
  }

  const formatDate = (value: string) => {
    return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(value))
  }

  const totalUsers = users.length
  const totalActive = useMemo(() => users.filter((u) => u.status === "Active").length, [users])
  const totalAdmins = useMemo(() => users.filter((u) => u.role === "admin").length, [users])
  const totalStaff = useMemo(() => users.filter((u) => u.role === "staff").length, [users])
  const recentJoiners = useMemo(() => {
    const threshold = new Date()
    threshold.setDate(threshold.getDate() - RECENT_WINDOW_DAYS)
    return users.filter((user) => {
      const joined = new Date(user.createdAt)
      return !Number.isNaN(joined.valueOf()) && joined >= threshold
    }).length
  }, [users])

  const visibleUsers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    return users
      .filter((user) => {
        if (roleFilter !== "all" && user.role !== roleFilter) return false
        if (statusFilter !== "all" && user.status !== statusFilter) return false
        if (!term) return true
        return (
          user.username.toLowerCase().includes(term) ||
          user.email.toLowerCase().includes(term) ||
          (user.fullName || "").toLowerCase().includes(term)
        )
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [users, searchTerm, roleFilter, statusFilter])

  const roleFilterLabel = roleFilter === "all" ? "Any role" : roleOptions.find((option) => option.value === roleFilter)?.label ?? roleFilter
  const statusFilterLabel = statusFilter === "all" ? "Any status" : statusFilter

  const handleResetFilters = () => {
    setSearchTerm("")
    setRoleFilter("all")
    setStatusFilter("all")
  }

  const adminShare = totalUsers ? (totalAdmins / totalUsers) * 100 : 0
  const inactiveCount = totalUsers - totalActive

  const heroMetrics = [
    {
      label: "Directory size",
      value: `${totalUsers} users`,
      hint: `${totalActive} active`,
      gradient: "from-[#0f172a] via-[#3730a3] to-[#22d3ee]",
      icon: Users,
    },
    {
      label: "Admin share",
      value: `${totalAdmins} admins`,
      hint: `${adminShare.toFixed(1)}% of org`,
      gradient: "from-[#14532d] to-[#22c55e]",
      icon: Shield,
    },
    {
      label: "Staff coverage",
      value: `${totalStaff} staff`,
      hint: `${inactiveCount} inactive`,
      gradient: "from-[#4c0519] to-[#fb7185]",
      icon: UserCheck,
    },
    {
      label: "Recent joiners",
      value: `${recentJoiners} new`,
      hint: `Last ${RECENT_WINDOW_DAYS} days`,
      gradient: "from-[#0f172a] to-[#38bdf8]",
      icon: Plus,
    },
  ]

  const highlightStats = [
    {
      label: "Role focus",
      value: roleFilterLabel,
      accent: "text-sky-400",
    },
    {
      label: "Status scope",
      value: statusFilterLabel,
      accent: "text-emerald-400",
    },
    {
      label: "Search",
      value: searchTerm ? `"${searchTerm}"` : "Full directory",
      accent: "text-amber-400",
    },
    {
      label: "Visible records",
      value: `${visibleUsers.length} users`,
      accent: "text-pink-400",
    },
  ]

  const consoleFooter = (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <span className="text-muted-foreground">{visibleUsers.length} users in view</span>
      <Badge variant="secondary" className="rounded-2xl border-dashed text-xs">
        {inactiveCount} inactive queued
      </Badge>
    </div>
  )

  return (
    <div className="space-y-6">
      <PageTitle title="Users & Roles Management" subtitle="Neon access cockpit for who can operate the clinic." />

      <ReportHero
        kicker="Access control"
        title="Directory command deck"
        subtitle="Monitor active coverage, highlight admins, and surface recent joiners."
        badgeLabel={totalUsers ? `${totalUsers} total accounts` : "No users"}
        metrics={heroMetrics}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setIsAddingUser(true)} className="rounded-2xl bg-white/90 px-5 py-2 text-[#0f172a] hover:bg-white">
              <Plus className="mr-2 h-4 w-4" /> Provision user
            </Button>
            <Button variant="outline" onClick={fetchUsers} disabled={loading} className="rounded-2xl border-white/60 text-white">
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Reload directory
            </Button>
          </div>
        }
      />

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      <ReportConsole
        icon={Filter}
        title="Filters & spotlight"
        description="Search the directory, constrain by role or status, and reload the live feed."
        footer={consoleFooter}
      >
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">Search directory</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Name, username, or email"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="h-11 rounded-2xl border-0 bg-muted/30 pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">Role filter</Label>
              <Select value={roleFilter} onValueChange={(value) => setRoleFilter(value as Role | "all")}>
                <SelectTrigger className="h-11 rounded-2xl">
                  <SelectValue placeholder="All roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  {roleOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">Status</Label>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as Status | "all")}>
                <SelectTrigger className="h-11 rounded-2xl">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  {statusFilters.map((option) => (
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
            <Button onClick={fetchUsers} disabled={loading} className="h-11 rounded-2xl bg-[#0f172a] text-white">
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh data
            </Button>
            <div className="flex items-center text-xs text-muted-foreground">Filters cascade into the directory table below.</div>
          </div>
        </>
      </ReportConsole>

      {isAddingUser && (
        <Card className="brand-card border-dashed border-border/60 bg-secondary/30">
          <CardContent className="flex flex-col gap-4 pt-6 text-sm text-muted-foreground">
            <div>
              <p className="font-semibold text-foreground">Provisioning preview</p>
              <p>Upcoming onboarding flow will live here. For now, manage existing accounts via role and status controls.</p>
            </div>
            <div>
              <Button variant="outline" size="sm" className="rounded-2xl" onClick={() => setIsAddingUser(false)}>
                Dismiss
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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
          <div>
            <CardTitle className="text-foreground">Directory table</CardTitle>
            <CardDescription className="text-muted-foreground">Live feed from /api/settings/users</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12">
              <Loader label="Loading users" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">User</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">Email</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-muted-foreground">Role</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-muted-foreground">Join Date</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleUsers.map((user) => (
                    <tr key={user.id} className="border-b border-border/70 hover:bg-secondary/30">
                      <td className="px-4 py-3 font-medium text-foreground">
                        <div className="text-sm font-semibold">{user.fullName || user.username}</div>
                        <p className="text-xs text-muted-foreground">{user.username}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{user.email}</td>
                      <td className="px-4 py-3 text-center">
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          disabled={updatingId === user.id}
                          className="rounded-full border border-border bg-background px-3 py-1 text-sm font-semibold capitalize text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          {roleOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-muted-foreground">{formatDate(user.createdAt)}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge
                          className={`brand-pill ${
                            user.status === "Active"
                              ? "brand-pill-success"
                              : "brand-pill-neutral"
                          }`}
                        >
                          {user.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="ghost"
                            className="gap-1 text-primary hover:text-foreground"
                            onClick={() => handleStatusToggle(user)}
                            disabled={updatingId === user.id}
                            title="Toggle status"
                          >
                            <Edit2 className="h-4 w-4" />
                            {user.status === "Active" ? "Disable" : "Activate"}
                          </Button>
                          <Button
                            variant="ghost"
                            className="gap-1 text-destructive hover:text-destructive/80"
                            onClick={() => handleDelete(user.id)}
                            disabled={deletingId === user.id || updatingId === user.id}
                            title="Delete user"
                          >
                            <Trash2 className="h-4 w-4" />
                            Remove
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!visibleUsers.length && (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                        No users match this filter set.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="brand-card brand-card-hover">
        <CardHeader>
          <CardTitle className="text-foreground">Role Permissions</CardTitle>
          <CardDescription className="text-muted-foreground">
            Quick reminder of what each role controls
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="brand-soft-panel rounded-xl border border-border p-4">
              <p
                className="mb-2 flex items-center gap-2 font-semibold text-foreground"
                style={{ color: "rgb(var(--brand-purple-rgb))" }}
              >
                <Shield className="h-4 w-4" /> Admin
              </p>
              <p className="text-sm text-muted-foreground">
                Full access to every module, including billing, inventory, and application settings.
              </p>
            </div>
            <div className="brand-soft-panel rounded-xl border border-border p-4">
              <p
                className="mb-2 flex items-center gap-2 font-semibold text-foreground"
                style={{ color: "rgb(var(--brand-success-rgb))" }}
              >
                <UserCheck className="h-4 w-4" /> Staff
              </p>
              <p className="text-sm text-muted-foreground">
                Operational access covering clients, appointments, and sales workflows.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
