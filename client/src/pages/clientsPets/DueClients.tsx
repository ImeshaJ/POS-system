import { useEffect, useMemo, useState } from "react"
import PageTitle from "@/components/common/PageTitle"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { LucideIcon } from "lucide-react"
import {
  AlertCircle,
  Calendar,
  Clock,
  Download,
  Filter,
  LayoutGrid,
  List,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  ShieldCheck,
  TrendingUp,
  Wallet,
} from "lucide-react"
import { apiGet } from "@/lib/api"

type ApiDueClient = {
  id: number
  code?: string | null
  name: string
  email?: string | null
  phone?: string | null
  address?: string | null
  due_amount?: string | number | null
  invoice_no?: string | null
  invoice_date?: string | null
  invoice_total?: string | number | null
  payment_type?: string | null
  invoice_status?: string | null
  days_since_invoice?: number | null
  pet_name?: string | null
  pet_type?: string | null
  pet_breed?: string | null
  pet_age?: string | null
  pet_weight?: string | null
}

type DueClient = {
  id: number
  clientCode: string
  clientName: string
  email: string
  phone: string
  address: string
  petName: string
  petType: string
  petBreed: string
  petAge: string
  petWeight: string
  invoiceNo: string
  invoiceDate: string
  invoiceTotal: number
  paymentType: string
  invoiceStatus: string
  dueAmount: number
  daysDue: number
  status: "Due" | "Overdue" | "Paid"
}

type ViewMode = "grid" | "table"

type DueDateFilter = "all" | "overdue" | "this-week" | "this-month"

type SortOption = "due-amount" | "days-due" | "client-name" | "due-date"

const VIEW_OPTIONS: Array<{ value: ViewMode; label: string; icon: LucideIcon }> = [
  { value: "grid", label: "Relationship Cards", icon: LayoutGrid },
  { value: "table", label: "Ledger Table", icon: List },
]

const STATUS_LABELS: Record<DueClient["status"], string> = {
  Due: "Payment Pending",
  Overdue: "Needs Attention",
  Paid: "Settled",
}

const CURRENCY = new Intl.NumberFormat("en-LK", {
  style: "currency",
  currency: "LKR",
  maximumFractionDigits: 2,
})

const formatCurrency = (value: number) => CURRENCY.format(value || 0)

const formatDateLabel = (value: string) => {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

const computeStatus = (dueAmount: number, daysDue: number): DueClient["status"] => {
  if (dueAmount <= 0) return "Paid"
  if (daysDue > 30) return "Overdue"
  return "Due"
}

const getStatusColor = (status: DueClient["status"]) => {
  switch (status) {
    case "Overdue":
      return "bg-red-100 text-red-800 border-red-200"
    case "Due":
      return "bg-yellow-100 text-yellow-800 border-yellow-200"
    case "Paid":
      return "bg-green-100 text-green-800 border-green-200"
    default:
      return "bg-gray-100 text-gray-800 border-gray-200"
  }
}

const getStatusIcon = (status: DueClient["status"]) => {
  switch (status) {
    case "Overdue":
      return <AlertCircle className="w-4 h-4" />
    case "Due":
      return <Clock className="w-4 h-4" />
    case "Paid":
      return <TrendingUp className="w-4 h-4" />
    default:
      return <Calendar className="w-4 h-4" />
  }
}

const mapApiDueClient = (client: ApiDueClient): DueClient => {
  const dueAmount = Number(client.due_amount || 0)
  const daysDue = Math.max(0, client.days_since_invoice || 0)
  return {
    id: client.id,
    clientCode: client.code || `CLT-${client.id.toString().padStart(4, "0")}`,
    clientName: client.name,
    email: client.email || "-",
    phone: client.phone || "-",
    address: client.address || "-",
    petName: client.pet_name || "-",
    petType: client.pet_type || "-",
    petBreed: client.pet_breed || "-",
    petAge: client.pet_age || "-",
    petWeight: client.pet_weight || "-",
    invoiceNo: client.invoice_no || "-",
    invoiceDate: client.invoice_date || "",
    invoiceTotal: Number(client.invoice_total || 0),
    paymentType: client.payment_type || "-",
    invoiceStatus: client.invoice_status || "-",
    dueAmount,
    daysDue,
    status: computeStatus(dueAmount, daysDue),
  }
}

const GridCard = ({ client }: { client: DueClient }) => (
  <Card className="brand-card brand-card-hover overflow-hidden">
    <CardContent className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-2xl font-semibold text-foreground">{client.clientName}</h3>
            <Badge className="brand-pill bg-muted/40 text-xs font-semibold text-foreground">
              {client.clientCode}
            </Badge>
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Mail className="h-4 w-4" />
              {client.email}
            </span>
            <span className="flex items-center gap-1">
              <Phone className="h-4 w-4" />
              {client.phone}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {client.address}
            </span>
          </div>
        </div>
        <div className="rounded-3xl border border-red-200 bg-red-50 px-6 py-4 text-right">
          <p className="text-xs font-semibold uppercase tracking-wide text-red-500">Outstanding</p>
          <p className="text-3xl font-bold text-red-600">{formatCurrency(client.dueAmount)}</p>
          <p className="text-xs text-red-500">Invoice {client.invoiceNo}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-border/40 bg-muted/40 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pet Profile</p>
          <p className="mt-1 text-base font-semibold text-foreground">{client.petName}</p>
          <p className="text-sm text-muted-foreground">{client.petType}</p>
          <p className="text-sm text-muted-foreground">{client.petBreed}</p>
          <p className="text-xs text-muted-foreground mt-1">Age {client.petAge} · {client.petWeight}</p>
        </div>
        <div className="rounded-2xl border border-border/40 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Invoice</p>
          <p className="mt-1 text-base font-semibold text-foreground">{formatDateLabel(client.invoiceDate)}</p>
          <p className="text-sm text-muted-foreground">Total {formatCurrency(client.invoiceTotal)}</p>
          <p className="text-sm text-muted-foreground">Payment {client.paymentType}</p>
        </div>
        <div className="rounded-2xl border border-border/40 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge
              className={`brand-pill flex items-center gap-1 border px-3 py-1 text-xs font-semibold ${getStatusColor(client.status)}`}
            >
              {getStatusIcon(client.status)}
              {STATUS_LABELS[client.status]}
            </Badge>
            {client.daysDue > 0 && client.status !== "Paid" && (
              <Badge className="brand-pill border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-600">
                {client.daysDue} days
              </Badge>
            )}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {client.status === "Paid" ? "Cleared account" : `${client.daysDue} days outstanding`}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" className="rounded-2xl border-border/60">
          Send Reminder
        </Button>
        <Button variant="outline" size="sm" className="rounded-2xl border-border/60">
          Update Status
        </Button>
        <Button size="sm" className="rounded-2xl bg-[#4338ca] text-white hover:bg-[#312e81]">
          Record Payment
        </Button>
      </div>
    </CardContent>
  </Card>
)

const ClientsTable = ({ clients }: { clients: DueClient[] }) => (
  <div className="rounded-3xl border border-border/40 bg-card shadow-sm">
    {clients.length === 0 ? (
      <div className="flex flex-col items-center gap-3 px-6 py-16 text-center text-muted-foreground">
        <AlertCircle className="h-10 w-10" />
        <p>No due clients match your filters.</p>
      </div>
    ) : (
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-linear-to-r from-[#0f172a] via-[#4338ca] to-[#db2777] text-white">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Client</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Pet</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Invoice</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide">Due Amount</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Days</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr key={client.id} className="border-t border-border/60 bg-card even:bg-muted/30 hover:bg-muted/50">
                <td className="px-4 py-4">
                  <div className="text-sm font-semibold text-foreground">{client.clientName}</div>
                  <div className="text-xs text-muted-foreground">{client.email}</div>
                </td>
                <td className="px-4 py-4 text-sm text-muted-foreground">
                  <div className="text-foreground">{client.petName}</div>
                  <div className="text-xs text-muted-foreground">{client.petType}</div>
                </td>
                <td className="px-4 py-4 text-sm text-muted-foreground">
                  <div className="text-foreground">{client.invoiceNo}</div>
                  <div className="text-xs text-muted-foreground">{formatDateLabel(client.invoiceDate)}</div>
                </td>
                <td className="px-4 py-4 text-right text-base font-semibold text-red-600">
                  {formatCurrency(client.dueAmount)}
                </td>
                <td className="px-4 py-4">
                  <Badge
                    className={`brand-pill flex items-center justify-center gap-1 border px-3 py-1 text-xs font-semibold ${getStatusColor(client.status)}`}
                  >
                    {getStatusIcon(client.status)}
                    {client.status}
                  </Badge>
                </td>
                <td className="px-4 py-4 text-sm font-semibold text-foreground">
                  {client.daysDue > 0 ? `${client.daysDue}d` : "-"}
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" className="rounded-2xl border-border/60">
                      Remind
                    </Button>
                    <Button variant="outline" size="sm" className="rounded-2xl border-border/60">
                      Update
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
)

export default function DueClients() {
  const [dueClients, setDueClients] = useState<DueClient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [dueDateFilter, setDueDateFilter] = useState<DueDateFilter>("all")
  const [sortBy, setSortBy] = useState<SortOption>("due-amount")
  const [viewMode, setViewMode] = useState<ViewMode>("grid")

  useEffect(() => {
    fetchDueClients()
  }, [])

  const fetchDueClients = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiGet<ApiDueClient[]>("/api/clients/due")
      setDueClients(response.data.map(mapApiDueClient))
    } catch (err) {
      console.error("Failed to fetch due clients", err)
      setError(err instanceof Error ? err.message : "Failed to load due clients")
    } finally {
      setLoading(false)
    }
  }

  const filteredClients = useMemo(() => {
    let filtered = [...dueClients]

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter((client) =>
        [
          client.clientName,
          client.clientCode,
          client.email,
          client.phone,
          client.petName,
          client.invoiceNo,
        ]
          .filter(Boolean)
          .some((field) => field.toLowerCase().includes(term))
      )
    }

    if (filterStatus !== "all") {
      filtered = filtered.filter((client) => client.status === filterStatus)
    }

    if (dueDateFilter !== "all") {
      filtered = filtered.filter((client) => {
        if (dueDateFilter === "overdue") return client.status === "Overdue"
        if (dueDateFilter === "this-week") return client.daysDue <= 7
        if (dueDateFilter === "this-month") return client.daysDue <= 30
        return true
      })
    }

    const sorted = [...filtered]
    sorted.sort((a, b) => {
      switch (sortBy) {
        case "due-amount":
          return b.dueAmount - a.dueAmount
        case "days-due":
          return b.daysDue - a.daysDue
        case "client-name":
          return a.clientName.localeCompare(b.clientName)
        case "due-date": {
          const aDate = a.invoiceDate ? new Date(a.invoiceDate).getTime() : 0
          const bDate = b.invoiceDate ? new Date(b.invoiceDate).getTime() : 0
          return aDate - bDate
        }
        default:
          return 0
      }
    })

    return sorted
  }, [dueClients, searchTerm, filterStatus, dueDateFilter, sortBy])

  const filteredTotalDue = filteredClients.reduce((sum, client) => sum + client.dueAmount, 0)
  const overdueCount = dueClients.filter((client) => client.status === "Overdue").length
  const dueSoonCount = dueClients.filter((client) => client.status === "Due").length
  const paidCount = dueClients.filter((client) => client.status === "Paid").length
  const totalPortfolioDue = dueClients.reduce((sum, client) => sum + client.dueAmount, 0)
  const clientsTracked = dueClients.length
  const highRiskRate = clientsTracked ? Math.round((overdueCount / clientsTracked) * 100) : 0
  const collectionRate = clientsTracked ? Math.round((paidCount / Math.max(clientsTracked, 1)) * 100) : 0
  const portfolioAverageDays = clientsTracked
    ? Math.round(dueClients.reduce((sum, client) => sum + client.daysDue, 0) / Math.max(clientsTracked, 1))
    : 0

  const exportToCSV = () => {
    const headers = [
      "Client Name",
      "Client Code",
      "Email",
      "Phone",
      "Pet",
      "Invoice",
      "Invoice Date",
      "Due Amount",
      "Days Due",
      "Status",
    ]

    const rows = filteredClients.map((client) => [
      client.clientName,
      client.clientCode,
      client.email,
      client.phone,
      client.petName,
      client.invoiceNo,
      formatDateLabel(client.invoiceDate),
      client.dueAmount.toFixed(2),
      client.daysDue.toString(),
      client.status,
    ])

    const csvContent = [headers, ...rows].map((line) => line.join(",")).join("\n")
    const filename = `due_clients_${new Date().toISOString().split("T")[0]}.csv`
    const link = document.createElement("a")
    link.setAttribute("href", `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`)
    link.setAttribute("download", filename)
    link.style.display = "none"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <>
      <PageTitle title="Due Clients" />

      <Card className="brand-card brand-card-hover mb-6 overflow-hidden">
        <CardContent className="p-0">
          <div className="bg-linear-to-r from-[#0f172a] via-[#4338ca] to-[#db2777] p-6 text-white">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/70">Receivables Control</p>
                <h2 className="text-3xl font-bold">Due Clients Command Center</h2>
                <p className="text-sm text-white/80">
                  Keep finance dashboards aligned with the Sales List aesthetic while tracking exposure, risk, and recovery momentum.
                </p>
              </div>
              <div className="rounded-3xl bg-white/15 px-6 py-4 text-right">
                <p className="text-xs font-semibold text-white/70">Portfolio exposure</p>
                <p className="text-3xl font-bold">{formatCurrency(totalPortfolioDue)}</p>
                <p className="text-xs text-white/80">Across {clientsTracked || 0} clients</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="relative overflow-hidden rounded-2xl border border-transparent bg-linear-to-br from-[#312e81] to-[#4338ca] p-5 text-white shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-white/70">Total Exposure</p>
              <p className="mt-2 text-3xl font-bold">{formatCurrency(totalPortfolioDue)}</p>
              <p className="text-xs text-white/80">Live receivables</p>
            </div>
            <Wallet className="h-10 w-10 text-white/70" />
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-transparent bg-linear-to-br from-[#b91c1c] to-[#f97316] p-5 text-white shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-white/70">Overdue Accounts</p>
              <p className="mt-2 text-3xl font-bold">{overdueCount}</p>
              <p className="text-xs text-white/80">{highRiskRate}% of monitored</p>
            </div>
            <AlertCircle className="h-10 w-10 text-white/70" />
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-transparent bg-linear-to-br from-[#f59e0b] to-[#f97316] p-5 text-white shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-white/70">Due &lt; 30 Days</p>
              <p className="mt-2 text-3xl font-bold">{dueSoonCount}</p>
              <p className="text-xs text-white/80">Avg aging {portfolioAverageDays}d</p>
            </div>
            <Clock className="h-10 w-10 text-white/70" />
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-transparent bg-linear-to-br from-[#059669] to-[#10b981] p-5 text-white shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-white/70">Cleared Accounts</p>
              <p className="mt-2 text-3xl font-bold">{paidCount}</p>
              <p className="text-xs text-white/80">{collectionRate}% collection rate</p>
            </div>
            <ShieldCheck className="h-10 w-10 text-white/70" />
          </div>
        </div>
      </div>

      <Card className="brand-card brand-card-hover relative mb-6">
        <CardContent className="space-y-6 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="rounded-2xl bg-muted/60 p-2 text-primary">
                <Filter className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Receivable filters</p>
                <h2 className="text-2xl font-bold text-foreground">Collection control console</h2>
                <p className="text-sm text-muted-foreground">
                  Blend search, statuses, and aging windows just like the refreshed Sales List view.
                </p>
              </div>
            </div>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:items-end">
              <div className="brand-soft-panel rounded-2xl px-4 py-3 text-right">
                <p className="text-xs font-semibold text-muted-foreground">Matching clients</p>
                <p className="text-2xl font-bold text-[#4338ca]">{filteredClients.length}</p>
                <p className="text-xs text-muted-foreground">{formatCurrency(filteredTotalDue)}</p>
              </div>
              <div className="flex flex-wrap gap-2 sm:justify-end">
                {VIEW_OPTIONS.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setViewMode(value)}
                    className={`flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-semibold transition ${
                      viewMode === value
                        ? "border-[#4338ca] bg-[#4338ca]/10 text-[#4338ca] shadow-sm"
                        : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
            <div className="space-y-2 xl:col-span-2">
              <Label className="text-sm font-semibold text-foreground">Search clients</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Client, pet, invoice..."
                  className="h-12 rounded-2xl border-border bg-background/70 pl-9 text-base"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">Status</Label>
              <select
                value={filterStatus}
                onChange={(event) => setFilterStatus(event.target.value)}
                className="h-12 w-full rounded-2xl border border-border bg-background/70 px-4 text-sm focus:border-primary focus:outline-none"
              >
                <option value="all">All status</option>
                <option value="Overdue">Overdue</option>
                <option value="Due">Due soon</option>
                <option value="Paid">Paid</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">Due window</Label>
              <select
                value={dueDateFilter}
                onChange={(event) => setDueDateFilter(event.target.value as DueDateFilter)}
                className="h-12 w-full rounded-2xl border border-border bg-background/70 px-4 text-sm focus:border-primary focus:outline-none"
              >
                <option value="all">All dates</option>
                <option value="overdue">Overdue</option>
                <option value="this-week">This week</option>
                <option value="this-month">This month</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">Sort by</Label>
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as SortOption)}
                className="h-12 w-full rounded-2xl border border-border bg-background/70 px-4 text-sm focus:border-primary focus:outline-none"
              >
                <option value="due-amount">Due amount</option>
                <option value="days-due">Days due</option>
                <option value="client-name">Client name</option>
                <option value="due-date">Invoice date</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">Actions</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-12 min-w-35 flex-1 rounded-2xl border-border/60"
                  onClick={fetchDueClients}
                  disabled={loading}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
                <Button
                  size="sm"
                  className="h-12 min-w-35 flex-1 rounded-2xl bg-[#4338ca] text-white hover:bg-[#312e81]"
                  onClick={exportToCSV}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </div>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            Showing <span className="font-semibold text-foreground">{filteredClients.length}</span> of {clientsTracked} monitored clients.
          </p>
        </CardContent>
      </Card>

      {loading ? (
        <Card className="brand-card brand-card-hover">
          <CardContent className="p-12 text-center text-muted-foreground">Analyzing receivables…</CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        filteredClients.length === 0 ? (
          <Card className="brand-card brand-card-hover">
            <CardContent className="flex flex-col items-center gap-3 p-12 text-center text-muted-foreground">
              <AlertCircle className="h-12 w-12" />
              <p>No due clients found.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredClients.map((client) => (
              <GridCard key={client.id} client={client} />
            ))}
          </div>
        )
      ) : (
        <ClientsTable clients={filteredClients} />
      )}
    </>
  )
}
