import { useMemo, useState, useEffect } from "react"
import PageTitle from "@/components/common/PageTitle"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { apiDelete, apiGet, apiPatch } from "@/lib/api"
import { PawPrint, Heart, ShieldCheck, Ban, Search as SearchIcon, ListFilter } from "lucide-react"
import { useToast } from "@/components/common/Toast"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"

type ApiClient = {
  id: number
  name: string
}

type ApiPet = {
  id: number
  client_id: number | null
  name: string
  type: "Dog" | "Cat" | "Other" | string
  breed: string
  gender: "Male" | "Female" | string
  age: string
  weight: string
  status: "Active" | "Inactive" | string
}

type Pet = {
  id: number
  clientId: number
  name: string
  type: "Dog" | "Cat" | "Other"
  breed: string
  gender: "Male" | "Female"
  age: string
  weight: string
  owner: string
  status: "Active" | "Inactive"
}

export default function PetsList() {
  const [pets, setPets] = useState<Pet[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [clientsMap, setClientsMap] = useState<Map<number, string>>(new Map())

  const [search, setSearch] = useState("")
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [petToDelete, setPetToDelete] = useState<number | null>(null)
  const toast = useToast()

  async function loadData() {
    setLoading(true)
    setError("")
    try {
      const [clientsRes, petsRes] = await Promise.all([
        apiGet<ApiClient[]>("/api/clients?page=1&limit=200"),
        apiGet<ApiPet[]>("/api/pets?page=1&limit=500"),
      ])

      const map = new Map<number, string>()
      clientsRes.data.forEach((c) => map.set(c.id, c.name))
      setClientsMap(map)

      const mapped: Pet[] = petsRes.data
        .filter((p) => p.client_id)
        .map((p) => ({
          id: p.id,
          clientId: p.client_id as number,
          name: p.name,
          type: (p.type || "Other") as Pet["type"],
          breed: p.breed || "-",
          gender: (p.gender || "Male") as Pet["gender"],
          age: p.age || "-",
          weight: p.weight || "-",
          owner: map.get(p.client_id as number) || "-",
          status: (p.status || "Active") as Pet["status"],
        }))

      setPets(mapped)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load pets")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const filteredPets = useMemo(() => {
    const key = search.toLowerCase()
    return pets.filter(
      (p) =>
        p.name.toLowerCase().includes(key) ||
        p.owner.toLowerCase().includes(key) ||
        p.breed.toLowerCase().includes(key) ||
        p.type.toLowerCase().includes(key)
    )
  }, [search, pets])

  const suggestions = useMemo(() => {
    if (!search) return []
    return filteredPets.slice(0, 5)
  }, [filteredPets, search])

  const activeCount = pets.filter((p) => p.status === "Active").length
  const inactiveCount = pets.filter((p) => p.status === "Inactive").length
  const dogsCount = pets.filter((p) => p.type === "Dog").length
  const catsCount = pets.filter((p) => p.type === "Cat").length
  const totalPets = pets.length

  const getStatusBadgeClass = (status: Pet["status"]) =>
    status === "Active" ? "brand-pill bg-emerald-100 text-emerald-700" : "brand-pill bg-slate-200 text-slate-700"

  const handleSave = async () => {
    if (!selectedPet) return
    try {
      const ownerId =
        selectedPet.owner && selectedPet.owner !== "-"
          ? [...clientsMap.entries()].find(([, name]) => name === selectedPet.owner)?.[0]
          : selectedPet.clientId

      const res = await apiPatch<ApiPet>(`/api/pets/${selectedPet.id}`, {
        client_id: ownerId || selectedPet.clientId,
        name: selectedPet.name,
        type: selectedPet.type,
        breed: selectedPet.breed,
        gender: selectedPet.gender,
        age: selectedPet.age,
        weight: selectedPet.weight,
        status: selectedPet.status,
      })

      setPets((prev) =>
        prev.map((p) =>
          p.id === selectedPet.id
            ? {
                ...p,
                name: res.data.name,
                type: (res.data.type || p.type) as Pet["type"],
                breed: res.data.breed || p.breed,
                gender: (res.data.gender || p.gender) as Pet["gender"],
                age: res.data.age || p.age,
                weight: res.data.weight || p.weight,
                status: (res.data.status || p.status) as Pet["status"],
                clientId: (res.data.client_id as number) || p.clientId,
                owner: clientsMap.get((res.data.client_id as number) || p.clientId) || p.owner,
              }
            : p
        )
      )
      setIsEditing(false)
      toast.success("Pet saved successfully")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save pet")
    }
  }

  const handleDeleteClick = (id: number) => {
    setPetToDelete(id)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!petToDelete) return
    try {
      await apiDelete(`/api/pets/${petToDelete}`)
      setPets((prev) => prev.filter((p) => p.id !== petToDelete))
      setSelectedPet(null)
      toast.success("Pet deleted successfully")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete pet")
    } finally {
      setDeleteDialogOpen(false)
      setPetToDelete(null)
    }
  }

  return (
    <>
      <PageTitle title="Pets" />

      <Card className="brand-card brand-card-hover mb-6 overflow-hidden">
        <CardContent className="p-0">
          <div className="bg-linear-to-r from-[#0f172a] via-[#4c1d95] to-[#db2777] p-6 text-white">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/70">Pet Engagement Console</p>
                <h2 className="text-3xl font-bold">Companion Portfolio</h2>
                <p className="text-sm text-white/80">Monitor pet wellness mix, owner loyalty, and clinic workload in one glance.</p>
              </div>
              <div className="rounded-3xl bg-white/15 p-3">
                <PawPrint className="h-10 w-10 text-white" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ---------- STATS ---------- */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="relative overflow-hidden rounded-2xl border border-transparent bg-linear-to-br from-[#312e81] to-[#4338ca] p-5 text-white shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-white/70">Total Pets</p>
              <p className="mt-2 text-3xl font-bold">{pets.length}</p>
              <p className="text-xs text-white/80">Linked to registered clients</p>
            </div>
            <PawPrint className="h-10 w-10 text-white/70" />
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-transparent bg-linear-to-br from-[#10b981] to-[#22d3ee] p-5 text-white shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-white/70">Active Care Plans</p>
              <p className="mt-2 text-3xl font-bold">{activeCount}</p>
              <p className="text-xs text-white/80">Currently serviced</p>
            </div>
            <Heart className="h-10 w-10 text-white/70" />
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-transparent bg-linear-to-br from-[#f97316] to-[#facc15] p-5 text-white shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-white/70">Dogs vs Cats</p>
              <p className="mt-2 text-3xl font-bold">{dogsCount} / {catsCount}</p>
              <p className="text-xs text-white/80">Species mix</p>
            </div>
            <ShieldCheck className="h-10 w-10 text-white/70" />
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-transparent bg-linear-to-br from-[#4b5563] to-[#0f172a] p-5 text-white shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-white/70">Inactive Profiles</p>
              <p className="mt-2 text-3xl font-bold">{inactiveCount}</p>
              <p className="text-xs text-white/80">Re-engage owners</p>
            </div>
            <Ban className="h-10 w-10 text-white/70" />
          </div>
        </div>
      </div>

      {/* ---------- SEARCH ---------- */}
      <Card className="brand-card brand-card-hover relative mb-6">
        <CardContent className="space-y-6 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="rounded-2xl bg-muted/60 p-2 text-primary">
                <ListFilter className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Search & filter</p>
                <h2 className="text-2xl font-bold text-foreground">Locate pets instantly</h2>
                <p className="text-sm text-muted-foreground">Filter by pet name, owner, or breed to drill into medical histories quickly.</p>
              </div>
            </div>
            <div className="brand-soft-panel rounded-2xl px-4 py-3 text-right">
              <p className="text-xs font-semibold text-gray-500">Matching records</p>
              <p className="text-2xl font-bold text-primary">{filteredPets.length}</p>
              <p className="text-xs text-gray-500">of {totalPets}</p>
            </div>
          </div>

          {error && <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}

          <div className="space-y-2">
            <Label className="font-semibold text-foreground">Search pets</Label>
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setShowSuggestions(true)
                }}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                placeholder="Name, owner, breed..."
                className="h-12 rounded-2xl bg-background/70 pl-9 text-base"
              />

              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute left-0 right-0 z-20 mt-2 rounded-2xl border border-border/70 bg-card shadow-xl">
                  {suggestions.map((p) => (
                    <button
                      type="button"
                      key={p.id}
                      className="flex w-full flex-col items-start gap-1 border-b border-border/60 px-4 py-3 text-left last:border-b-0 hover:bg-muted/50"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        setSelectedPet(p)
                        setSearch(p.name)
                        setShowSuggestions(false)
                      }}
                    >
                      <p className="font-semibold text-foreground">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.owner} · {p.breed}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            Showing <span className="font-semibold text-foreground">{filteredPets.length}</span> of {totalPets} pets
          </p>
        </CardContent>
      </Card>

      {/* ---------- PET DETAILS ---------- */}
      {selectedPet && (
        <Card className="mb-6 border-l-4 border-l-blue-600 shadow-lg">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <span className="w-1 h-5 bg-blue-600 rounded"></span>
                Pet Details
              </h2>
              <Button size="sm" variant="ghost" onClick={() => setSelectedPet(null)}>
                ✕
              </Button>
            </div>

            {/* Client ID Badge */}
            <div className="mb-6 p-4 bg-linear-to-r from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide">Client ID</p>
                  <p className="text-2xl font-bold text-blue-600 mt-1">#{selectedPet.clientId.toString().padStart(4, "0")}</p>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-4xl">🆔</span>
                  <p className="text-xs text-gray-500 mt-1">Owner: {selectedPet.owner}</p>
                </div>
              </div>
            </div>

            {/* Pet Information */}
            <div className="mb-6">
              <h3 className="text-sm font-bold text-gray-700 mb-4 pb-2 border-b-2 border-gray-200">
                Pet Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {([
                  "name",
                  "breed",
                  "age",
                  "weight",
                ] as Array<keyof Pet>).map((field) => (
                  <div key={field}>
                    <Label className="text-gray-700 text-sm font-semibold capitalize">{field}</Label>
                    <input
                      className="w-full mt-2 h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                      disabled={!isEditing}
                      value={selectedPet[field] as string}
                      onChange={(e) =>
                        setSelectedPet((prev) =>
                          prev ? ({ ...prev, [field]: e.target.value } as Pet) : prev
                        )
                      }
                    />
                  </div>
                ))}

                <div>
                  <Label className="text-gray-700 text-sm font-semibold">Type</Label>
                  <select
                    className="w-full mt-2 h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                    disabled={!isEditing}
                    value={selectedPet.type}
                    onChange={(e) =>
                      setSelectedPet((prev) =>
                        prev ? ({ ...prev, type: e.target.value as Pet["type"] } as Pet) : prev
                      )
                    }
                  >
                    <option>Dog</option>
                    <option>Cat</option>
                    <option>Other</option>
                  </select>
                </div>

                <div>
                  <Label className="text-gray-700 text-sm font-semibold">Gender</Label>
                  <select
                    className="w-full mt-2 h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                    disabled={!isEditing}
                    value={selectedPet.gender}
                    onChange={(e) =>
                      setSelectedPet((prev) =>
                        prev ? ({ ...prev, gender: e.target.value as Pet["gender"] } as Pet) : prev
                      )
                    }
                  >
                    <option>Male</option>
                    <option>Female</option>
                  </select>
                </div>

                <div>
                  <Label className="text-gray-700 text-sm font-semibold">Status</Label>
                  <select
                    className="w-full mt-2 h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                    disabled={!isEditing}
                    value={selectedPet.status}
                    onChange={(e) =>
                      setSelectedPet((prev) =>
                        prev ? ({ ...prev, status: e.target.value as Pet["status"] } as Pet) : prev
                      )
                    }
                  >
                    <option>Active</option>
                    <option>Inactive</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              {!isEditing ? (
                <Button size="sm" onClick={() => setIsEditing(true)} className="bg-blue-600 hover:bg-blue-700">
                  ✏️ Edit
                </Button>
              ) : (
                <>
                  <Button size="sm" onClick={handleSave} className="bg-green-600 hover:bg-green-700">
                    ✓ Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                </>
              )}

              <Button size="sm" variant="destructive" onClick={() => handleDeleteClick(selectedPet.id)}>
                Delete
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ---------- PETS TABLE ---------- */}
      <Card className="brand-card brand-card-hover">
        <CardContent className="p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-5">
            <div>
              <h2 className="brand-section-title">Pets List</h2>
              <p className="text-sm text-muted-foreground">
                {loading ? "Loading pet roster..." : `Showing ${filteredPets.length} of ${totalPets} profiles`}
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
                  <th className="px-4 py-3">Client ID</th>
                  <th className="px-4 py-3">Pet</th>
                  <th className="px-4 py-3 text-center">Type</th>
                  <th className="px-4 py-3 text-center">Breed</th>
                  <th className="px-4 py-3 text-center">Gender</th>
                  <th className="px-4 py-3 text-center">Age</th>
                  <th className="px-4 py-3 text-center">Weight</th>
                  <th className="px-4 py-3">Owner</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredPets.map((pet, idx) => (
                  <tr
                    key={pet.id}
                    className={`border-b border-border/70 ${idx % 2 === 0 ? "bg-card" : "bg-card/80"} transition hover:bg-muted/50`}
                  >
                    <td className="px-4 py-3 font-mono text-sm font-semibold text-primary">
                      #{pet.clientId.toString().padStart(4, "0")}
                    </td>
                    <td
                      className="px-4 py-3 font-semibold text-foreground hover:text-primary"
                      onClick={() => {
                        setSelectedPet(pet)
                        setIsEditing(false)
                      }}
                    >
                      {pet.name}
                    </td>
                    <td className="px-4 py-3 text-center text-muted-foreground">{pet.type}</td>
                    <td className="px-4 py-3 text-center text-muted-foreground">{pet.breed}</td>
                    <td className="px-4 py-3 text-center">
                      <Badge className={pet.gender === "Male" ? "bg-blue-100 text-blue-700" : "bg-pink-100 text-pink-700"}>
                        {pet.gender}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-center text-muted-foreground">{pet.age}</td>
                    <td className="px-4 py-3 text-center font-semibold text-foreground">{pet.weight}</td>
                    <td className="px-4 py-3 text-foreground">{pet.owner}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={getStatusBadgeClass(pet.status)}>{pet.status}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-gray-200 text-primary"
                        onClick={() => {
                          setSelectedPet(pet)
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

          {filteredPets.length === 0 && (
            <div className="py-12 text-center text-muted-foreground">
              <p className="text-lg font-medium">No pets found</p>
              <p className="text-sm">Try adjusting search criteria.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Pet"
        description="Are you sure you want to delete this pet? This action cannot be undone."
        confirmText="Delete"
        onConfirm={handleDeleteConfirm}
        variant="destructive"
      />
    </>
  )
}
