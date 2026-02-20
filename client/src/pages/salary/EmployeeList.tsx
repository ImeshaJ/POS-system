import { useState, useEffect } from "react"
import PageTitle from "@/components/common/PageTitle"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ArrowUpRight, Briefcase, ClipboardCheck, Filter, Search, Sparkles, UserPlus, Users, Wallet } from "lucide-react"
import { useToast } from "@/components/common/Toast"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"

type Employee = {
  id: string
  name: string
  email: string
  phone: string
  role: string
  department: string
  salary: number
  joinDate: string
  status: "Active" | "Inactive" | "Leave"
  address: string
  bankAccount: string
  createdAt: string
}

const DEPARTMENTS = ["HR", "Medical", "Surgery", "Pharmacy", "Reception", "Nursing", "Lab", "Support"]
const ROLES = ["Veterinarian", "Nurse", "Assistant", "Receptionist", "Manager", "Pharmacist", "Lab Technician", "Other"]

export default function EmployeeList() {
  const toast = useToast()
  const [employees, setEmployees] = useState<Employee[]>(() => {
    const saved = localStorage.getItem("employees")
    if (saved) {
      try {
        return JSON.parse(saved) as Employee[]
      } catch (e) {
        console.error("Failed to load employees", e)
      }
    }
    return []
  })
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState("")
  const [filterDepartment, setFilterDepartment] = useState("All")
  const [filterStatus, setFilterStatus] = useState("All")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [employeeToDelete, setEmployeeToDelete] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    role: "",
    department: "",
    salary: "" as string | number,
    joinDate: new Date().toISOString().split("T")[0],
    status: "Active" as "Active" | "Inactive" | "Leave",
    address: "",
    bankAccount: "",
  })

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem("employees", JSON.stringify(employees))
  }, [employees])

  const departments = ["All", ...Array.from(new Set(employees.map((e) => e.department))).filter(Boolean)]
  const statuses = ["All", "Active", "Inactive", "Leave"]

  const filtered = employees.filter((e) => {
    const matchesSearch =
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.id.includes(search) ||
      e.email.toLowerCase().includes(search.toLowerCase())
    const matchesDept = filterDepartment === "All" || e.department === filterDepartment
    const matchesStatus = filterStatus === "All" || e.status === filterStatus
    return matchesSearch && matchesDept && matchesStatus
  })

  const filteredSalaryTotal = filtered.reduce((sum, e) => sum + e.salary, 0)
  const departmentCount = new Set(employees.map((e) => e.department)).size

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!form.name || !form.email || !form.phone || !form.role || !form.department || !form.salary) {
      toast.warning("Please fill all required fields")
      return
    }

    if (editingId) {
      setEmployees((prev) =>
        prev.map((emp) =>
          emp.id === editingId
            ? {
                ...emp,
                name: form.name,
                email: form.email,
                phone: form.phone,
                role: form.role,
                department: form.department,
                salary: Number(form.salary),
                joinDate: form.joinDate,
                status: form.status,
                address: form.address,
                bankAccount: form.bankAccount,
              }
            : emp
        )
      )
      toast.success("Employee updated successfully")
      setEditingId(null)
    } else {
      const newId = "EMP-" + String(employees.length + 1).padStart(3, "0")
      const newEmployee: Employee = {
        id: newId,
        name: form.name,
        email: form.email,
        phone: form.phone,
        role: form.role,
        department: form.department,
        salary: Number(form.salary),
        joinDate: form.joinDate,
        status: form.status,
        address: form.address,
        bankAccount: form.bankAccount,
        createdAt: new Date().toISOString(),
      }

      setEmployees((prev) => [newEmployee, ...prev])
      toast.success("Employee added successfully")
    }

    resetForm()
    setShowForm(false)
  }

  function handleToggleForm() {
    if (showForm) {
      resetForm()
      setEditingId(null)
      setShowForm(false)
    } else {
      setShowForm(true)
    }
  }

  function resetFilters() {
    setSearch("")
    setFilterDepartment("All")
    setFilterStatus("All")
  }

  function resetForm() {
    setForm({
      name: "",
      email: "",
      phone: "",
      role: "",
      department: "",
      salary: "",
      joinDate: new Date().toISOString().split("T")[0],
      status: "Active",
      address: "",
      bankAccount: "",
    })
  }

  function handleDeleteClick(id: string) {
    setEmployeeToDelete(id)
    setDeleteDialogOpen(true)
  }

  function handleDeleteConfirm() {
    if (!employeeToDelete) return
    setEmployees((prev) => prev.filter((e) => e.id !== employeeToDelete))
    toast.success("Employee deleted successfully")
    setDeleteDialogOpen(false)
    setEmployeeToDelete(null)
  }

  function editEmployee(emp: Employee) {
    setForm({
      name: emp.name,
      email: emp.email,
      phone: emp.phone,
      role: emp.role,
      department: emp.department,
      salary: emp.salary,
      joinDate: emp.joinDate,
      status: emp.status,
      address: emp.address,
      bankAccount: emp.bankAccount,
    })
    setEditingId(emp.id)
    setShowForm(true)
  }

  function updateStatus(id: string, status: "Active" | "Inactive" | "Leave") {
    setEmployees((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status } : e))
    )
    toast.success("Status updated successfully")
  }


  const totalSalary = employees.reduce((sum, e) => sum + (e.status === "Active" ? e.salary : 0), 0)
  const activeCount = employees.filter((e) => e.status === "Active").length
  const inactiveCount = employees.filter((e) => e.status === "Inactive").length
  const leaveCount = employees.filter((e) => e.status === "Leave").length
  const avgActiveSalary = activeCount ? Math.round(totalSalary / activeCount) : 0

  const STATUS_TONES: Record<Employee["status"], string> = {
    Active: "bg-emerald-50 text-emerald-700",
    Inactive: "bg-rose-50 text-rose-700",
    Leave: "bg-amber-50 text-amber-700",
  }

  const heroMetrics = [
    {
      label: "Total headcount",
      value: employees.length,
      hint: `${departmentCount || 0} departments covered`,
      gradient: "from-[#0f172a] to-[#1d4ed8]",
      icon: Users,
    },
    {
      label: "Active roster",
      value: activeCount,
      hint: `${inactiveCount} inactive · ${leaveCount} on leave`,
      gradient: "from-[#134e4a] to-[#10b981]",
      icon: Sparkles,
    },
    {
      label: "Payroll ready",
      value: `Rs. ${totalSalary.toLocaleString()}`,
      hint: avgActiveSalary ? `Avg Rs. ${avgActiveSalary.toLocaleString()}/FTE` : "No active salaries",
      gradient: "from-[#4c0519] to-[#db2777]",
      icon: Wallet,
    },
    {
      label: "Filtered payroll",
      value: `Rs. ${filteredSalaryTotal.toLocaleString()}`,
      hint: `${filtered.length} employees in view`,
      gradient: "from-[#0f172a] to-[#36a2eb]",
      icon: ArrowUpRight,
    },
  ]

  return (
    <div className="space-y-6">
      <PageTitle title="Employee Management" />

      <Card className="brand-card brand-card-hover overflow-hidden">
        <CardContent className="p-0">
          <div className="bg-linear-to-r from-[#0f172a] via-[#1d4ed8] to-[#7c3aed] p-6 text-white">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/70">People operations</p>
                <h2 className="text-3xl font-bold">Headcount cockpit</h2>
                <p className="text-sm text-white/80">Mirror the revenue dashboards with live payroll intelligence and inline actions.</p>
              </div>
              <div className="flex flex-col items-end gap-3 text-right">
                <Badge className="brand-pill border border-white/30 bg-white/10 text-white">{employees.length ? `${employees.length} in roster` : "No employees yet"}</Badge>
                <Button onClick={handleToggleForm} className="rounded-2xl bg-white/90 px-5 py-2 text-[#0f172a] hover:bg-white">
                  <UserPlus className="mr-2 h-4 w-4" /> {showForm ? "Close" : "New"} hire form
                </Button>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-white/80">
              <span className="rounded-2xl bg-white/10 px-3 py-1">Active · {activeCount}</span>
              <span className="rounded-2xl bg-white/10 px-3 py-1">Inactive · {inactiveCount}</span>
              <span className="rounded-2xl bg-white/10 px-3 py-1">On Leave · {leaveCount}</span>
              <span className="rounded-2xl bg-white/10 px-3 py-1">Filtered payroll Rs. {filteredSalaryTotal.toLocaleString()}</span>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2 xl:grid-cols-4">
            {heroMetrics.map(({ label, value, hint, gradient, icon: Icon }) => (
              <div key={label} className={`rounded-2xl border border-white/10 bg-linear-to-br ${gradient} p-4 text-white shadow-lg`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-white/70">{label}</p>
                    <p className="mt-2 text-2xl font-bold">{value}</p>
                    <p className="text-xs text-white/80">{hint}</p>
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

      {showForm && (
        <Card className="brand-card brand-card-hover">
          <CardContent className="space-y-6 p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="rounded-2xl bg-muted/60 p-2 text-primary">
                  <Briefcase className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{editingId ? "Update" : "Add"} employee</p>
                  <h2 className="text-2xl font-bold text-foreground">People intake</h2>
                  <p className="text-sm text-muted-foreground">Auto IDs, contextual dropdowns, and consistent payroll data.</p>
                </div>
              </div>
              <Badge className="brand-pill border border-primary/20 bg-primary/5 text-primary">
                {editingId ? `Editing · ${editingId}` : `Next ID · EMP-${String(employees.length + 1).padStart(3, "0")}`}
              </Badge>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground">Name*</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" className="h-12 rounded-2xl" required />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground">Email*</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" className="h-12 rounded-2xl" required />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground">Phone*</Label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone number" className="h-12 rounded-2xl" required />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground">Role*</Label>
                  <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="h-12 w-full rounded-2xl border border-border bg-background/70 px-3" required>
                    <option value="">Select Role</option>
                    {ROLES.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground">Department*</Label>
                  <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className="h-12 w-full rounded-2xl border border-border bg-background/70 px-3" required>
                    <option value="">Select Department</option>
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground">Base Salary (Rs.)*</Label>
                  <Input type="number" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} placeholder="Monthly salary" className="h-12 rounded-2xl" required />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground">Join Date*</Label>
                  <Input type="date" value={form.joinDate} onChange={(e) => setForm({ ...form, joinDate: e.target.value })} className="h-12 rounded-2xl" required />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground">Status</Label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Employee["status"] })} className="h-12 w-full rounded-2xl border border-border bg-background/70 px-3">
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Leave">On Leave</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground">Bank Account</Label>
                  <Input value={form.bankAccount} onChange={(e) => setForm({ ...form, bankAccount: e.target.value })} placeholder="Account number" className="h-12 rounded-2xl" />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground">Address</Label>
                <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Residential address" className="h-12 rounded-2xl" />
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <Button type="submit" className="flex-1 rounded-2xl bg-[#0f172a] text-white hover:bg-[#020617]">
                  <ClipboardCheck className="mr-2 h-4 w-4" />
                  {editingId ? "Update employee" : "Save employee"}
                </Button>
                <Button type="button" variant="outline" onClick={handleToggleForm} className="rounded-2xl border-border/60">
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="brand-card brand-card-hover">
        <CardContent className="space-y-6 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="rounded-2xl bg-muted/60 p-2 text-primary">
                <Filter className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Roster filters</p>
                <h2 className="text-2xl font-bold text-foreground">People console</h2>
                <p className="text-sm text-muted-foreground">Focus by department, status, or live search before exporting.</p>
              </div>
            </div>
            <Badge className="brand-pill border border-[#bfdbfe] bg-[#eff6ff] text-[#1d4ed8]">
              {filtered.length} employees · Rs. {filteredSalaryTotal.toLocaleString()}
            </Badge>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="space-y-2 md:col-span-2">
              <Label className="text-sm font-semibold text-foreground">Search directory</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, ID, or email" className="h-12 rounded-2xl border border-border bg-background/70 pl-9" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">Department</Label>
              <select value={filterDepartment} onChange={(e) => setFilterDepartment(e.target.value)} className="h-12 w-full rounded-2xl border border-border bg-background/70 px-3">
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">Status</Label>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="h-12 w-full rounded-2xl border border-border bg-background/70 px-3">
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={resetFilters} className="rounded-2xl border-border/60 text-muted-foreground">
              Clear filters
            </Button>
            <Button onClick={handleToggleForm} className="rounded-2xl bg-[#1d4ed8] text-white hover:bg-[#1e3a8a]">
              <UserPlus className="mr-2 h-4 w-4" />
              {showForm ? "Close form" : "Add employee"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="brand-card brand-card-hover">
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Employee ledger</p>
              <h2 className="text-2xl font-bold text-foreground">Captured roster</h2>
              <p className="text-sm text-muted-foreground">Inline status controls keep HR approvals fast.</p>
            </div>
            <Badge className="brand-pill border border-[#c7d2fe] bg-[#e0e7ff] text-[#312e81]">{filtered.length} employees</Badge>
          </div>

          <div className="rounded-3xl border border-border/40 bg-card">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-linear-to-r from-[#e0f2fe] to-[#eef2ff] text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3">Contact</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3 text-right">Salary</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3">Join Date</th>
                    <th className="px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                        {employees.length === 0 ? "No employees found" : "No employees match the current filters."}
                      </td>
                    </tr>
                  ) : (
                    filtered.map((emp, idx) => (
                      <tr key={emp.id} className={`border-b border-border/70 ${idx % 2 === 0 ? "bg-card" : "bg-card/80"} transition hover:bg-muted/50`}>
                        <td className="px-4 py-4 align-top">
                          <p className="font-semibold text-foreground">{emp.name}</p>
                          <p className="text-xs text-muted-foreground">{emp.id}</p>
                        </td>
                        <td className="px-4 py-4 align-top text-sm text-muted-foreground">
                          <p>{emp.email}</p>
                          <p>{emp.phone}</p>
                        </td>
                        <td className="px-4 py-4">
                          <Badge className="brand-pill border border-[#f5d0fe] bg-[#fdf4ff] text-[#86198f]">{emp.role}</Badge>
                        </td>
                        <td className="px-4 py-4">
                          <Badge className="brand-pill border border-[#bfdbfe] bg-[#eff6ff] text-[#1d4ed8]">{emp.department}</Badge>
                        </td>
                        <td className="px-4 py-4 text-right font-semibold text-[#0f172a]">Rs. {emp.salary.toLocaleString()}</td>
                        <td className="px-4 py-4 text-center">
                          <select value={emp.status} onChange={(e) => updateStatus(emp.id, e.target.value as Employee["status"])} className={`rounded-2xl border border-transparent px-3 py-1 text-xs font-semibold focus:outline-none ${STATUS_TONES[emp.status]}`}>
                            <option value="Active">Active</option>
                            <option value="Leave">On Leave</option>
                            <option value="Inactive">Inactive</option>
                          </select>
                        </td>
                        <td className="px-4 py-4 text-sm text-muted-foreground">{emp.joinDate}</td>
                        <td className="px-4 py-4 text-center">
                          <div className="flex justify-center gap-2">
                            <Button size="sm" onClick={() => editEmployee(emp)} className="rounded-2xl bg-[#1d4ed8] px-4 text-xs text-white hover:bg-[#1e3a8a]">
                              Edit
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleDeleteClick(emp.id)} className="rounded-2xl px-4 text-xs">
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      {filtered.length > 0 && (
        <Card className="brand-card brand-card-hover">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="rounded-2xl border border-border/50 bg-muted/40 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Filtered employees</p>
                <p className="mt-2 text-3xl font-bold text-foreground">{filtered.length}</p>
                <p className="text-xs text-muted-foreground">Current ledger selection</p>
              </div>
              <div className="rounded-2xl border border-border/50 bg-muted/40 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Filtered payroll</p>
                <p className="mt-2 text-3xl font-bold text-[#0f172a]">Rs. {filteredSalaryTotal.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Monthly commitment</p>
              </div>
              <div className="rounded-2xl border border-border/50 bg-muted/40 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Status breakdown</p>
                <div className="mt-2 space-y-1 text-sm">
                  <p className="text-emerald-600">Active · {filtered.filter((e) => e.status === "Active").length}</p>
                  <p className="text-amber-600">On Leave · {filtered.filter((e) => e.status === "Leave").length}</p>
                  <p className="text-rose-600">Inactive · {filtered.filter((e) => e.status === "Inactive").length}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Employee"
        description="Are you sure you want to delete this employee? This action cannot be undone."
        confirmText="Delete"
        onConfirm={handleDeleteConfirm}
        variant="destructive"
      />
    </div>
  )
}
