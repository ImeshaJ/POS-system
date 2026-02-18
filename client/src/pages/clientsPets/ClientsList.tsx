import { useMemo, useState, useEffect } from "react"
import PageTitle from "@/components/common/PageTitle"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api"
import { Users, AlertTriangle, Wallet, ShieldCheck, Search as SearchIcon, Package } from "lucide-react"
import { useToast } from "@/components/common/Toast"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"

type ApiClient = {
  id: number
  name: string
  phone?: string
  email?: string
  address?: string
  due_amount?: number
}

type ApiPet = {
  id: number
  client_id: number | null
  name: string
}

type PetSummary = {
  id: number
  name: string
}

type Client = {
  id: number
  name: string
  phone: string
  email: string
  pets: PetSummary[]
  due: number
  address: string
}

const formatCurrency = (value: number) =>
  `LKR ${Number(value || 0).toLocaleString("en-LK", { maximumFractionDigits: 0 })}`

const getClientStatusBadge = (due: number) =>
  due > 0 ? "brand-pill bg-red-100 text-red-700" : "brand-pill bg-emerald-100 text-emerald-700"

export default function ClientsList() {
  const toast = useToast()
  const [deleteClientId, setDeleteClientId] = useState<number | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [newPetName, setNewPetName] = useState("")

  const [search, setSearch] = useState("")
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [isEditing, setIsEditing] = useState(false)

  async function loadData() {
    setLoading(true)
    setError("")
    try {
      const [clientsRes, petsRes] = await Promise.all([
        apiGet<ApiClient[]>("/api/clients?page=1&limit=200"),
        apiGet<ApiPet[]>("/api/pets?page=1&limit=500"),
      ])

      const petsByClient = new Map<number, PetSummary[]>()
      petsRes.data.forEach((p) => {
        if (!p.client_id) return
        const list = petsByClient.get(p.client_id) || []
        list.push({ id: p.id, name: p.name })
        petsByClient.set(p.client_id, list)
      })

      const mapped: Client[] = clientsRes.data.map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone || "",
        email: c.email || "",
        address: c.address || "",
        due: Number(c.due_amount || 0),
        pets: petsByClient.get(c.id) || [],
      }))
      setClients(mapped)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load clients")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const filteredClients = useMemo(() => {
    const key = search.toLowerCase()
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(key) ||
        c.phone.includes(key) ||
        c.email.toLowerCase().includes(key) ||
        c.address.toLowerCase().includes(key) ||
        c.pets.some((p) => p.name.toLowerCase().includes(key))
    )
  }, [search, clients])

  const suggestions = useMemo(() => {
    if (!search) return []
    return filteredClients.slice(0, 5)
  }, [filteredClients, search])

  const dueCount = clients.filter(c => c.due > 0).length
  const activeCount = clients.length
  const totalDue = clients.reduce((sum, c) => sum + c.due, 0)

  const handleSave = async () => {
    if (!selectedClient) return
    try {
      const res = await apiPatch<ApiClient>(`/api/clients/${selectedClient.id}`, {
        name: selectedClient.name,
        phone: selectedClient.phone,
        email: selectedClient.email,
        address: selectedClient.address,
        due_amount: selectedClient.due,
      })
      setClients((prev) =>
        prev.map((c) =>
          c.id === selectedClient.id
            ? {
                ...c,
                name: res.data.name,
                phone: res.data.phone || "",
                email: res.data.email || "",
                address: res.data.address || "",
                due: Number(res.data.due_amount || 0),
              }
            : c
        )
      )
      setIsEditing(false)
      toast.success("Client saved successfully")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save client")
    }
  }

  const handleDeleteClick = (id: number) => {
    setDeleteClientId(id)
  }

  const handleDeleteConfirm = async () => {
    if (deleteClientId === null) return
    try {
      await apiDelete(`/api/clients/${deleteClientId}`)
      setClients((prev) => prev.filter((c) => c.id !== deleteClientId))
      setSelectedClient(null)
      toast.success("Client deleted successfully")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete client")
    } finally {
      setDeleteClientId(null)
    }
  }

  return (
    <>
      <PageTitle title="Clients" />

      <Card className="brand-card brand-card-hover overflow-hidden mb-6">
        <CardContent className="p-0">
          <div className="bg-linear-to-r from-[#111827] via-[#7c3aed] to-[#ec4899] p-6 text-white">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/70">Client Intelligence Hub</p>
                <h2 className="text-3xl font-bold">Relationship Portfolio</h2>
                <p className="text-sm text-white/80">
                  Monitor client value, engagement signals, and retention health in one glance.
                </p>
              </div>
              <div className="rounded-3xl bg-white/20 p-3">
                <Package className="h-10 w-10 text-white" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ---------- STATS ---------- */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="group relative overflow-hidden rounded-2xl border border-transparent bg-linear-to-br from-[#312e81] to-[#4338ca] p-5 text-white shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-white/70">Total Clients</p>
              <p className="mt-2 text-3xl font-bold">{activeCount}</p>
              <p className="text-xs text-white/80">Active + walk-ins managed</p>
            </div>
            <Users className="h-10 w-10 text-white/70" />
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-transparent bg-linear-to-br from-[#b45309] to-[#f97316] p-5 text-white shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-white/70">Clients With Due</p>
              <p className="mt-2 text-3xl font-bold">{dueCount}</p>
              <p className="text-xs text-white/80">{dueCount ? `${Math.round((dueCount / Math.max(activeCount, 1)) * 100)}% of base` : "Fully clear"}</p>
            </div>
            <AlertTriangle className="h-10 w-10 text-white/70" />
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-transparent bg-linear-to-br from-[#ef4444] to-[#b91c1c] p-5 text-white shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-white/70">Total Due Amount</p>
              <p className="mt-2 text-3xl font-bold">{formatCurrency(totalDue)}</p>
              <p className="text-xs text-white/80">Awaiting settlement</p>
            </div>
            <Wallet className="h-10 w-10 text-white/70" />
          </div>
        </div>

        <div className="brand-soft-panel p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-500">Clear Accounts</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{activeCount - dueCount}</p>
              <p className="text-xs text-gray-500">Ready for upsell</p>
            </div>
            <ShieldCheck className="h-10 w-10 text-[#4338ca]" />
          </div>
        </div>
      </div>

      {/* ---------- SEARCH ---------- */}
      <Card className="brand-card brand-card-hover relative mb-6">
        <CardContent className="space-y-6 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Search & filter</p>
              <h2 className="text-2xl font-bold text-foreground">Client lookup console</h2>
              <p className="text-sm text-muted-foreground">Find owners by phone, pet, or address to action dues faster.</p>
            </div>
            <div className="brand-soft-panel rounded-2xl px-4 py-3 text-right">
              <p className="text-xs font-semibold text-gray-500">Matching records</p>
              <p className="text-2xl font-bold text-[#4338ca]">{filteredClients.length}</p>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label className="font-semibold text-foreground">Search clients</Label>
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setShowSuggestions(true)
                }}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                placeholder="Name, phone, email, pet..."
                className="h-12 rounded-2xl border-border bg-background/70 pl-9 text-base"
              />

              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute left-0 right-0 z-20 mt-2 rounded-2xl border border-border/70 bg-card shadow-xl">
                  {suggestions.map((c) => (
                    <button
                      type="button"
                      key={c.id}
                      className="flex w-full flex-col items-start gap-1 border-b border-border/50 px-4 py-3 text-left last:border-b-0 hover:bg-muted/50"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        setSelectedClient(c)
                        setSearch(c.name)
                        setShowSuggestions(false)
                      }}
                    >
                      <p className="font-semibold text-foreground">{c.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.phone || "No phone"} · {c.pets.map((p) => p.name).join(", ") || "No pets"}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            Showing <span className="font-semibold text-foreground">{filteredClients.length}</span> of {clients.length} total clients
          </div>
        </CardContent>
      </Card>

      {/* ---------- CLIENT DETAILS ---------- */}
      {selectedClient && (
        <Card className="mb-6 border-l-4 border-l-blue-600 shadow-lg">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <span className="w-1 h-5 bg-blue-600 rounded"></span>
                Client Details
              </h2>
              <Button size="sm" variant="ghost" onClick={() => setSelectedClient(null)}>
                
              </Button>
            </div>

            {/* Client ID Section */}
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide">Client ID</p>
                  <p className="text-2xl font-bold text-blue-600 mt-1">#{selectedClient.id.toString().padStart(4, '0')}</p>
                </div>
                <div className="text-4xl"></div>
              </div>
            </div>

            {/* Basic Information */}
            <div className="mb-6">
              <h3 className="text-sm font-bold text-gray-700 mb-4 pb-2 border-b-2 border-gray-200">
                Basic Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {([
                  "name",
                  "phone",
                  "email",
                  "address",
                ] as Array<keyof Client>).map((field) => (
                  <div key={field}>
                    <Label className="text-gray-700 text-sm font-semibold capitalize">{field}</Label>
                    <input
                      className="w-full mt-2 h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                      disabled={!isEditing}
                      value={selectedClient![field] as string}
                      onChange={(e) =>
                        setSelectedClient((prev) =>
                          prev ? ({ ...prev, [field]: e.target.value } as Client) : prev
                        )
                      }
                    />
                  </div>
                ))}

                <div>
                  <Label className="text-gray-700 text-sm font-semibold">Due Amount</Label>
                  <input
                    type="number"
                    className="w-full mt-2 h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                    disabled={!isEditing}
                    value={selectedClient.due}
                    onChange={(e) =>
                      setSelectedClient({
                        ...selectedClient,
                        due: Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Pets Section */}
            <div className="mb-6">
              <h3 className="text-sm font-bold text-gray-700 mb-4 pb-2 border-b-2 border-gray-200">
                Pets ({selectedClient.pets.length})
              </h3>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                {selectedClient.pets.length > 0 ? (
                  <div className="space-y-2">
                    {selectedClient.pets.map((pet, idx) => (
                      <div key={pet.id} className="flex items-center justify-between p-3 bg-white rounded-lg border-l-4 border-l-purple-600">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl"></span>
                          <div>
                            <p className="font-semibold text-gray-800">{pet.name}</p>
                            <p className="text-xs text-gray-500">Pet #{idx + 1}</p>
                          </div>
                        </div>
                        {isEditing && (
                          <button
                            onClick={async () => {
                              try {
                                await apiDelete(`/api/pets/${pet.id}`)
                                await loadData()
                                setSelectedClient((prev) =>
                                  prev ? { ...prev, pets: prev.pets.filter((p) => p.id !== pet.id) } : prev
                                )
                              } catch (e) {
                                toast.error(e instanceof Error ? e.message : "Failed to delete pet")
                              }
                            }}
                            className="text-red-500 hover:text-red-700 font-bold"
                          >
                            
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <p className="text-lg"> No pets registered</p>
                  </div>
                )}
              </div>

              {isEditing && (
                <div className="mt-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <p className="text-xs text-purple-600 font-semibold mb-2">Add New Pet</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Enter pet name..."
                      className="flex-1 h-9 px-3 border border-purple-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      value={newPetName}
                      onChange={(e) => setNewPetName(e.target.value)}
                    />
                    <Button
                      size="sm"
                      className="bg-purple-600 hover:bg-purple-700"
                      onClick={async () => {
                        if (!newPetName.trim()) return
                        try {
                          await apiPost("/api/pets", {
                            client_id: selectedClient.id,
                            name: newPetName.trim(),
                            type: "Other",
                          })
                          setNewPetName("")
                          await loadData()
                          toast.success("Pet added successfully")
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : "Failed to add pet")
                        }
                      }}
                    >
                       Add Pet
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-6">
              {!isEditing ? (
                <Button size="sm" onClick={() => setIsEditing(true)} className="bg-blue-600 hover:bg-blue-700">
                   Edit
                </Button>
              ) : (
                <>
                  <Button size="sm" onClick={handleSave} className="bg-green-600 hover:bg-green-700">
                     Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                </>
              )}

              <Button size="sm" variant="destructive" onClick={() => handleDeleteClick(selectedClient.id)}>
                 Delete
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ---------- CLIENTS TABLE ---------- */}
      <Card className="brand-card brand-card-hover">
        <CardContent className="p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-5">
            <div>
              <h2 className="brand-section-title">Clients List</h2>
              <p className="text-sm text-muted-foreground">
                {loading ? "Loading roster..." : `Showing ${filteredClients.length} of ${clients.length} records`}
              </p>
            </div>
            <div className="rounded-full bg-muted/60 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Updated {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-linear-to-r from-[#eff6ff] to-[#eef2ff] text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Pets</th>
                  <th className="px-4 py-3 text-center">Due</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((c, idx) => (
                  <tr
                    key={c.id}
                    className={`border-b border-border/70 ${idx % 2 === 0 ? "bg-card" : "bg-card/80"} transition hover:bg-muted/50`}
                  >
                    <td className="px-4 py-3 font-mono text-sm font-semibold text-[#4338ca]">
                      #{c.id.toString().padStart(4, "0")}
                    </td>
                    <td
                      className="px-4 py-3 font-semibold text-foreground hover:text-[#4338ca]"
                      onClick={() => {
                        setSelectedClient(c)
                        setIsEditing(false)
                      }}
                    >
                      {c.name}
                    </td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">{c.phone || "-"}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {c.pets.length === 0 ? (
                          <span className="text-xs text-muted-foreground">No pets</span>
                        ) : (
                          c.pets.map((p) => (
                            <Badge key={p.id} className="bg-[#eef2ff] text-[#4338ca] text-xs">
                              {p.name}
                            </Badge>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-foreground">{formatCurrency(c.due)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={getClientStatusBadge(c.due)}>{c.due > 0 ? "Due" : "Clear"}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-gray-200 text-[#4338ca]"
                        onClick={() => {
                          setSelectedClient(c)
                          setIsEditing(false)
                        }}
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredClients.length === 0 && (
            <div className="py-12 text-center text-muted-foreground">
              <p className="text-lg font-medium">No clients found</p>
              <p className="text-sm">Adjust filters or sync new client data.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deleteClientId !== null}
        onOpenChange={(open) => !open && setDeleteClientId(null)}
        title="Delete Client"
        description="Are you sure you want to delete this client? This action cannot be undone."
        onConfirm={handleDeleteConfirm}
        variant="danger"
      />
    </>
  )
}


