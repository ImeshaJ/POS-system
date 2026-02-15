import { useEffect, useMemo, useState, type ReactNode } from "react"
import { NavLink } from "react-router-dom"
import PageTitle from "@/components/common/PageTitle"
import { Card, CardContent } from "@/components/ui/card"
import { apiGet } from "@/lib/api"
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area,
  BarChart,
  Bar,
} from "recharts"
import {
  Users,
  Calendar as CalendarIcon,
  Box,
  DollarSign,
  TrendingUp,
  AlertTriangle,
} from "lucide-react"
import { useAuth } from "@/lib/authContext"
import StaffDashboard from "@/pages/dashboard/StaffDashboard"

type DashboardSummary = {
  generatedAt: string
  kpis: {
    todaySales: number
    totalClients: number
    appointmentsToday: number
    lowStockItems: number
  }
  counts: {
    clients: number
    activeClients: number
    pets: number
    products: number
    suppliers: number
    employees: number
  }
  appointments: {
    total: number
    today: number
    upcoming: number
    completed: number
    scheduled: number
    upcomingList: Array<{
      id: number
      date: string | null
      time: string | null
      clientName: string | null
      petName: string | null
      petType: string | null
      doctor: string | null
      status: string | null
    }>
  }
  sales: {
    totalRevenue: number
    todayRevenue: number
    weekRevenue: number
    monthRevenue: number
    totalInvoices: number
    todayInvoices: number
    trend: Array<{
      date: string
      invoices: number
      total: number
    }>
    recent: Array<{
      id: number
      invoiceNo: string
      customer: string
      date: string | null
      total: number
      paymentType: string
      status: string
      items: number
    }>
  }
  purchases: {
    purchaseCount: number
    totalSpent: number
    monthSpent: number
    pendingTotal: number
    trend: Array<{
      date: string
      purchases: number
      total: number
    }>
    recent: Array<{
      id: number
      invoiceNo: string
      supplier: string
      date: string | null
      total: number
      status: string
      items: number
    }>
  }
  inventory: {
    skuCount: number
    totalUnits: number
    stockValue: number
    lowStock: number
    expiring: number
    expired: number
  }
  dues: {
    clients: number
    suppliers: number
  }
  profitTrend: Array<{
    month: string | null
    revenue: number
    costOfGoods: number
    expenses: number
    netProfit: number
  }>
  categorySales: Array<{
    category: string
    units: number
    sales: number
  }>
  topProducts: Array<{
    name: string
    units: number
    revenue: number
  }>
  quickStats: {
    monthlyRevenue: number
    stockValue: number
    activeClients: number
    pendingDues: number
  }
}

const EMPTY_SUMMARY: DashboardSummary = {
  generatedAt: "",
  kpis: {
    todaySales: 0,
    totalClients: 0,
    appointmentsToday: 0,
    lowStockItems: 0,
  },
  counts: {
    clients: 0,
    activeClients: 0,
    pets: 0,
    products: 0,
    suppliers: 0,
    employees: 0,
  },
  appointments: {
    total: 0,
    today: 0,
    upcoming: 0,
    completed: 0,
    scheduled: 0,
    upcomingList: [],
  },
  sales: {
    totalRevenue: 0,
    todayRevenue: 0,
    weekRevenue: 0,
    monthRevenue: 0,
    totalInvoices: 0,
    todayInvoices: 0,
    trend: [],
    recent: [],
  },
  purchases: {
    purchaseCount: 0,
    totalSpent: 0,
    monthSpent: 0,
    pendingTotal: 0,
    trend: [],
    recent: [],
  },
  inventory: {
    skuCount: 0,
    totalUnits: 0,
    stockValue: 0,
    lowStock: 0,
    expiring: 0,
    expired: 0,
  },
  dues: {
    clients: 0,
    suppliers: 0,
  },
  profitTrend: [],
  categorySales: [],
  topProducts: [],
  quickStats: {
    monthlyRevenue: 0,
    stockValue: 0,
    activeClients: 0,
    pendingDues: 0,
  },
}

const formatNumber = (value: number) => Number(value || 0).toLocaleString("en-LK")
const formatCurrency = (value: number) =>
  `Rs. ${Number(value || 0).toLocaleString("en-LK", { maximumFractionDigits: 0 })}`

const formatPercent = (value: number) => {
  if (!Number.isFinite(value)) return "0%"
  const rounded = Math.round(value * 10) / 10
  const sign = rounded > 0 ? "+" : ""
  return `${sign}${rounded}%`
}

const formatMonthLabel = (value?: string | null) => {
  if (!value) return ""
  const [year, month] = value.split("-")
  const monthIndex = Number(month) - 1
  if (!year || Number.isNaN(monthIndex)) return value
  const date = new Date(Number(year), monthIndex, 1)
  return date.toLocaleString("en-US", { month: "short" })
}

const formatTime = (value?: string | null) => {
  if (!value) return "TBD"
  const [hourRaw, minuteRaw] = value.split(":")
  const hour = Number(hourRaw)
  const minute = Number(minuteRaw)
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return value
  const period = hour >= 12 ? "PM" : "AM"
  const normalizedHour = ((hour + 11) % 12) + 1
  return `${normalizedHour}:${String(minute).padStart(2, "0")} ${period}`
}

const resolveAppointmentColor = (status?: string | null) => {
  const normalized = (status || "").toLowerCase()
  if (normalized.includes("complete") || normalized.includes("checked")) {
    return "bg-green-100 text-green-800"
  }
  if (normalized.includes("cancel")) {
    return "bg-red-100 text-red-800"
  }
  return "bg-yellow-100 text-yellow-800"
}

export default function Dashboard() {
  const { role } = useAuth();
  if (role === "staff") {
    return <StaffDashboard />;
  }

  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let mounted = true
    const fetchSummary = async () => {
      setLoading(true)
      setError("")
      try {
        const res = await apiGet<DashboardSummary>("/api/dashboard/summary")
        if (!mounted) return
        setSummary(res.data)
      } catch (err) {
        if (!mounted) return
        setError("Failed to load dashboard data")
      } finally {
        if (mounted) setLoading(false)
      }
    }

    fetchSummary()
    return () => {
      mounted = false
    }
  }, [])

  const data = summary ?? EMPTY_SUMMARY
  const dailyAverage = data.sales.weekRevenue ? data.sales.weekRevenue / 7 : 0
  const salesDelta = dailyAverage ? ((data.sales.todayRevenue - dailyAverage) / dailyAverage) * 100 : 0
  const netProfit = data.profitTrend[data.profitTrend.length - 1]?.netProfit ?? 0

  const profitLossData = useMemo(
    () =>
      data.profitTrend.map((row) => ({
        month: formatMonthLabel(row.month),
        amount: row.revenue,
      })),
    [data.profitTrend]
  )

  const categoryData = useMemo(
    () =>
      data.categorySales.slice(0, 4).map((row) => ({
        category: row.category,
        sales: row.sales,
      })),
    [data.categorySales]
  )

  return (
    <>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <PageTitle title="Dashboard" />
        <div className="flex gap-2 w-full sm:w-auto">
          <NavLink
            to="/sales/new"
            className="flex-1 sm:flex-none px-5 py-2.5 bg-linear-to-r from-[#6a11cb] to-[#2575fc] hover:from-[#5a0fb8] hover:to-[#1d5edb] text-white rounded-lg shadow-md hover:shadow-lg font-medium text-xs transition-all duration-200 text-center"
          >
            + New Sale
          </NavLink>
          <NavLink
            to="/appointments/calendar"
            className="flex-1 sm:flex-none px-5 py-2.5 bg-linear-to-r from-[#00b09b] to-[#96c93d] hover:from-[#00a08a] hover:to-[#85b72f] text-white rounded-lg shadow-md hover:shadow-lg font-medium text-xs transition-all duration-200 text-center"
          >
            + Appointment
          </NavLink>
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPI
          color="from-[#6a11cb] to-[#2575fc]"
          icon={<DollarSign size={22} className="text-white" />}
          title="Today Sales"
          value={loading ? "..." : formatCurrency(data.kpis.todaySales)}
          change={loading ? undefined : formatPercent(salesDelta)}
          positive={loading ? undefined : salesDelta >= 0}
        />
        <KPI
          color="from-[#00b09b] to-[#96c93d]"
          icon={<Users size={22} className="text-white" />}
          title="Total Clients"
          value={loading ? "..." : formatNumber(data.kpis.totalClients)}
          change={loading ? undefined : `Active: ${formatNumber(data.counts.activeClients)}`}
        />
        <KPI
          color="from-[#ff512f] to-[#dd2476]"
          icon={<CalendarIcon size={22} className="text-white" />}
          title="Today Appointments"
          value={loading ? "..." : formatNumber(data.kpis.appointmentsToday)}
          change={loading ? undefined : `Upcoming: ${formatNumber(data.appointments.upcoming)}`}
        />
        <KPI
          color="from-[#f7971e] to-[#ffd200]"
          icon={<AlertTriangle size={22} className="text-white" />}
          title="Low Stock"
          value={loading ? "..." : `${formatNumber(data.kpis.lowStockItems)} Items`}
          change={
            loading
              ? undefined
              : data.kpis.lowStockItems > 0
                ? "Action Required"
                : "Stock Healthy"
          }
          alert={!loading && data.kpis.lowStockItems > 0}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Profit/Loss Chart */}
        <Card className="lg:col-span-2 shadow-lg hover:shadow-xl transition-shadow duration-300 border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Revenue Overview</h3>
                <p className="text-sm text-gray-500 mt-1">Last 6 months performance</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-green-600">
                  {loading ? "..." : formatCurrency(netProfit)}
                </p>
                <p className="text-sm text-gray-500">Net Profit</p>
              </div>
            </div>

            <div className="h-80 min-h-80w-0 -mx-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={profitLossData}>
                  <defs>
                    <linearGradient id="grad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#6a11cb" stopOpacity={0.85} />
                      <stop offset="50%" stopColor="#2575fc" stopOpacity={0.8} />
                      <stop offset="100%" stopColor="#00b09b" stopOpacity={0.6} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      borderRadius: "8px",
                      color: "#2563eb",
                      boxShadow: "0 4px 12px rgba(30, 64, 175, 0.3)",
                    }}
                  />
                  <Area type="monotone" dataKey="amount" stroke="#002366" fill="url(#grad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Appointments */}
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 border-gray-200">
          <CardContent className="p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Upcoming Appointments</h3>
            <div className="space-y-3">
              {data.appointments.upcomingList.map((appointment) => (
                <AppointmentItem
                  key={appointment.id}
                  name={appointment.petName || "Unassigned"}
                  kind={appointment.petType || "Pet"}
                  time={formatTime(appointment.time)}
                  vet={appointment.doctor || "Unassigned"}
                  status={appointment.status || "Scheduled"}
                  color={resolveAppointmentColor(appointment.status)}
                />
              ))}
              {!loading && data.appointments.upcomingList.length === 0 && (
                <p className="text-sm text-gray-500">No upcoming appointments yet.</p>
              )}
            </div>
            <NavLink
              to="/appointments/list"
              className="block text-center mt-4 text-sm font-semibold text-[#002366] hover:text-[#001f58] transition-colors"
            >
              View All &gt;
            </NavLink>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales by Category */}
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 border-gray-200 ">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Sales by Category</h3>
                <p className="text-xs text-gray-500 mt-1">Performance across all categories</p>
              </div>
              <div className="px-3 py-1 bg-blue-100 rounded-full text-xs font-semibold text-blue-700">
                Top 4
              </div>
            </div>
            <div className="h-72 min-h-72 min-w-0 -mx-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6a11cb" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#2575fc" stopOpacity={0.7} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="category"
                    stroke="#d1d5db"
                    tick={{ fill: "#374151", fontSize: 12, fontWeight: 500 }}
                  />
                  <YAxis stroke="#d1d5db" tick={{ fill: "#6b7280", fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      borderRadius: "8px",
                      color: "#2563eb",
                      boxShadow: "0 4px 12px rgba(30, 64, 175, 0.2)",
                    }}
                    cursor={{ fill: "rgba(107, 17, 203, 0.1)" }}
                  />
                  <Bar dataKey="sales" fill="url(#barGradient)" radius={[8, 8, 0, 0]} isAnimationActive={true} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Quick Statistics</h3>
                <p className="text-xs text-gray-500 mt-1">Key metrics overview</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <StatRow
                icon={<TrendingUp size={20} className="text-blue-600" />}
                label="Monthly Revenue"
                value={loading ? "..." : formatCurrency(data.quickStats.monthlyRevenue)}
                color="blue"
              />
              <StatRow
                icon={<Box size={20} className="text-purple-600" />}
                label="Stock Value"
                value={loading ? "..." : formatCurrency(data.quickStats.stockValue)}
                color="purple"
              />
              <StatRow
                icon={<Users size={20} className="text-green-600" />}
                label="Active Clients"
                value={loading ? "..." : formatNumber(data.quickStats.activeClients)}
                color="green"
              />
              <StatRow
                icon={<DollarSign size={20} className="text-orange-600" />}
                label="Pending Dues"
                value={loading ? "..." : formatCurrency(data.quickStats.pendingDues)}
                color="orange"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}

function KPI({
  color,
  icon,
  title,
  value,
  change,
  positive,
  alert,
}: {
  color?: string
  icon: ReactNode
  title: string
  value: string
  change?: string
  positive?: boolean
  alert?: boolean
}) {
  return (
    <div className="group relative bg-white rounded-xl shadow-md hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-gray-100 overflow-hidden">
      {/* Background gradient accent */}
      <div
        className={`absolute inset-0 bg-linear-to-br ${color ?? "from-gray-100 to-gray-50"} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}
      ></div>

      <div className="relative p-6">
        {/* Top accent bar */}
        <div className={`absolute top-0 left-0 right-0 h-1 bg-linear-to-r ${color ?? "from-gray-200 to-gray-300"}`}></div>

        <div className="flex items-start justify-between mb-4">
          <div
            className={`p-3.5 rounded-2xl bg-linear-to-br ${color ?? "from-gray-200 to-gray-300"} shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300`}
          >
            {icon}
          </div>
          <div className="text-right">
            {change && (
              <p
                className={`text-xs font-bold uppercase tracking-wider ${
                  alert ? "text-red-600" : positive ? "text-green-600" : "text-gray-500"
                }`}
              >
                {change}
              </p>
            )}
            {positive !== undefined && (
              <span
                className={`inline-block mt-1 text-xs px-2.5 py-1 rounded-full font-semibold ${
                  alert
                    ? "bg-red-100 text-red-700"
                    : positive
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-700"
                }`}
              >
                {positive ? "Up" : "Down"} Performance
              </span>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs text-gray-500 uppercase font-bold tracking-wide">{title}</p>
          <p className={`text-3xl font-bold tracking-tight ${alert ? "text-red-600" : "text-gray-900"}`}>
            {value}
          </p>
        </div>

        {/* Bottom border animation */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-linear-to-r from-transparent via-blue-400 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      </div>
    </div>
  )
}

function AppointmentItem({
  name,
  kind,
  time,
  vet,
  status,
  color,
}: {
  name: string
  kind: string
  time: string
  vet: string
  status?: string
  color?: string
}) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
      <div>
        <p className="font-semibold text-gray-900">
          {name} <span className="text-xs text-gray-500 font-normal">({kind})</span>
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {time} - {vet}
        </p>
      </div>
      <div className={`text-xs px-3 py-1 rounded-full font-semibold ${color ?? "bg-gray-100 text-gray-800"}`}>
        {status}
      </div>
    </div>
  )
}

function StatRow({
  icon,
  label,
  value,
  color,
}: {
  icon: ReactNode
  label: string
  value: string
  color?: string
}) {
  const bgColors: Record<string, string> = {
    blue: "bg-blue-50 border-blue-100 hover:bg-blue-100",
    purple: "bg-purple-50 border-purple-100 hover:bg-purple-100",
    green: "bg-green-50 border-green-100 hover:bg-green-100",
    orange: "bg-orange-50 border-orange-100 hover:bg-orange-100",
  }

  const borderColors: Record<string, string> = {
    blue: "border-l-4 border-l-blue-500",
    purple: "border-l-4 border-l-purple-500",
    green: "border-l-4 border-l-green-500",
    orange: "border-l-4 border-l-orange-500",
  }

  return (
    <div
      className={`p-4 rounded-lg border transition-all duration-200 ${bgColors[color || "blue"]} ${borderColors[color || "blue"]}`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`p-2.5 rounded-lg ${
            color === "blue"
              ? "bg-blue-100"
              : color === "purple"
                ? "bg-purple-100"
                : color === "green"
                  ? "bg-green-100"
                  : "bg-orange-100"
          }`}
        >
          {icon}
        </div>
        <div className="flex-1">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{label}</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
      </div>
    </div>
  )
}
