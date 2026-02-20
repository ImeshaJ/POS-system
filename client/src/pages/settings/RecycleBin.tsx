import { useCallback, useEffect, useState } from "react"
import PageTitle from "@/components/common/PageTitle"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Trash2,
  RotateCcw,
  Loader2,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckSquare,
  Square,
  Trash,
  RefreshCw
} from "lucide-react"
import { apiGet, apiPost, apiDelete } from "@/lib/api"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"
import { useToast } from "@/components/common/Toast"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface DeletedItem {
  id: number
  type: string
  name: string
  deletedAt: string
  createdAt?: string
  tableSource?: string
}

interface ItemDetails {
  [key: string]: unknown
}

const TYPE_COLORS: Record<string, string> = {
  Client: "bg-blue-100 text-blue-700 border-blue-200",
  Pet: "bg-purple-100 text-purple-700 border-purple-200",
  Product: "bg-green-100 text-green-700 border-green-200",
  Appointment: "bg-amber-100 text-amber-700 border-amber-200",
  Employee: "bg-rose-100 text-rose-700 border-rose-200",
  Service: "bg-cyan-100 text-cyan-700 border-cyan-200",
  Sale: "bg-indigo-100 text-indigo-700 border-indigo-200",
  Purchase: "bg-orange-100 text-orange-700 border-orange-200",
}

const ITEM_TYPES = ["All", "Client", "Pet", "Product", "Appointment", "Employee", "Service", "Sale", "Purchase"]

export default function RecycleBin() {
  const [items, setItems] = useState<DeletedItem[]>([])
  const [filteredItems, setFilteredItems] = useState<DeletedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [restoringId, setRestoringId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<DeletedItem | null>(null)
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)
  const [emptyBinDialogOpen, setEmptyBinDialogOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [itemDetails, setItemDetails] = useState<ItemDetails | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState("All")
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const toast = useToast()

  const loadItems = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiGet<DeletedItem[]>("/api/recycle-bin")
      setItems(res.data || [])
    } catch {
      setError("Failed to load deleted items")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadItems()
  }, [loadItems])

  // Filter items based on search and type
  useEffect(() => {
    let result = items

    if (typeFilter !== "All") {
      result = result.filter(item => item.type === typeFilter)
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(item =>
        item.name?.toLowerCase().includes(query) ||
        item.type.toLowerCase().includes(query)
      )
    }

    setFilteredItems(result)
  }, [items, searchQuery, typeFilter])

  const handleRestore = async (item: DeletedItem) => {
    setRestoringId(item.id)
    try {
      await apiPost(`/api/recycle-bin/${item.type}/${item.id}/restore`, {})
      setItems(prev => prev.filter(i => !(i.id === item.id && i.type === item.type)))
      setSelectedIds(prev => {
        const next = new Set(prev)
        next.delete(item.id)
        return next
      })
      toast.success(`${item.type} restored successfully`)
    } catch {
      toast.error("Failed to restore item")
    } finally {
      setRestoringId(null)
    }
  }

  const openDeleteDialog = (item: DeletedItem) => {
    setItemToDelete(item)
    setDeleteDialogOpen(true)
  }

  const handlePermanentDelete = async () => {
    if (!itemToDelete) return
    setDeletingId(itemToDelete.id)
    setDeleteDialogOpen(false)
    try {
      await apiDelete(`/api/recycle-bin/${itemToDelete.type}/${itemToDelete.id}`)
      setItems(prev => prev.filter(i => !(i.id === itemToDelete.id && i.type === itemToDelete.type)))
      setSelectedIds(prev => {
        const next = new Set(prev)
        next.delete(itemToDelete.id)
        return next
      })
      toast.success("Item permanently deleted")
    } catch {
      toast.error("Failed to delete item")
    } finally {
      setDeletingId(null)
      setItemToDelete(null)
    }
  }

  const handleBulkDelete = async () => {
    setBulkDeleteDialogOpen(false)
    setBulkDeleting(true)

    const selectedItems = filteredItems.filter(item => selectedIds.has(item.id))
    const payload = selectedItems.map(item => ({ type: item.type, id: item.id }))

    try {
      // Using fetch directly since apiDelete doesn't support body
      const response = await fetch("/api/recycle-bin/bulk", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: payload })
      })
      const res = await response.json() as { deletedCount: number; errors?: string[] }

      if (res.deletedCount > 0) {
        setItems(prev => prev.filter(item => !selectedIds.has(item.id)))
        setSelectedIds(new Set())
        toast.success(`${res.deletedCount} item(s) permanently deleted`)
      }

      if (res.errors && res.errors.length > 0) {
        console.error("Bulk delete errors:", res.errors)
      }
    } catch {
      toast.error("Failed to delete selected items")
    } finally {
      setBulkDeleting(false)
    }
  }

  const handleEmptyBin = async () => {
    setEmptyBinDialogOpen(false)
    setBulkDeleting(true)
    try {
      const res = await apiPost<{ deletedCount: number }>("/api/recycle-bin/empty", {})
      setItems([])
      setSelectedIds(new Set())
      toast.success(`Recycle bin emptied. ${res.data.deletedCount} item(s) deleted.`)
    } catch {
      toast.error("Failed to empty recycle bin")
    } finally {
      setBulkDeleting(false)
    }
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredItems.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredItems.map(item => item.id)))
    }
  }

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const toggleExpanded = async (item: DeletedItem) => {
    if (expandedId === item.id) {
      setExpandedId(null)
      setItemDetails(null)
      return
    }

    setExpandedId(item.id)
    setDetailsLoading(true)
    setItemDetails(null)

    try {
      const res = await apiGet<ItemDetails>(`/api/recycle-bin/${item.type}/${item.id}`)
      setItemDetails(res.data)
    } catch {
      setItemDetails({ error: "Failed to load details" })
    } finally {
      setDetailsLoading(false)
    }
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-"
    try {
      return new Date(dateStr).toLocaleString()
    } catch {
      return dateStr
    }
  }

  const renderItemDetails = () => {
    if (!itemDetails) return null

    const excludeKeys = ["id", "is_deleted", "deleted_at", "tableSource", "type"]
    const entries = Object.entries(itemDetails).filter(([key]) => !excludeKeys.includes(key))

    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-lg mt-2">
        {entries.map(([key, value]) => (
          <div key={key}>
            <p className="text-xs text-gray-500 capitalize">{key.replace(/_/g, " ")}</p>
            <p className="text-sm font-medium text-gray-800 truncate">
              {value === null || value === undefined
                ? "-"
                : typeof value === "object"
                ? JSON.stringify(value).slice(0, 50)
                : String(value).slice(0, 100)}
            </p>
          </div>
        ))}
      </div>
    )
  }

  return (
    <>
      <PageTitle title="Recycle Bin" subtitle="Restore or permanently delete items removed from the system" />

      <div className="space-y-6 pb-10">
        {/* Actions Bar */}
        <Card className="brand-card">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* Search and Filter */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search deleted items..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-500" />
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                      {ITEM_TYPES.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Bulk Actions */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadItems}
                  disabled={loading}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                {selectedIds.size > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setBulkDeleteDialogOpen(true)}
                    disabled={bulkDeleting}
                  >
                    <Trash className="w-4 h-4 mr-2" />
                    Delete Selected ({selectedIds.size})
                  </Button>
                )}
                {items.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEmptyBinDialogOpen(true)}
                    disabled={bulkDeleting}
                    className="text-rose-600 hover:text-rose-700 border-rose-200 hover:border-rose-300"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Empty Bin
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Items List */}
        <Card className="brand-card brand-card-hover">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Trash2 className="w-6 h-6 text-rose-600" />
              <div>
                <h2 className="text-xl font-bold">Deleted Items</h2>
                <p className="text-sm text-gray-500">
                  {filteredItems.length} item(s) {typeFilter !== "All" ? `of type "${typeFilter}"` : ""}
                </p>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-gray-500">
                <Loader2 className="animate-spin w-5 h-5" />
                <span>Loading...</span>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center gap-2 py-12 text-rose-600">
                <AlertTriangle className="w-5 h-5" />
                <span>{error}</span>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <Trash2 className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-lg font-medium">Recycle bin is empty</p>
                <p className="text-sm">Deleted items will appear here</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-slate-50">
                      <th className="px-4 py-3 text-left w-12">
                        <button
                          onClick={toggleSelectAll}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          {selectedIds.size === filteredItems.length && filteredItems.length > 0 ? (
                            <CheckSquare className="w-5 h-5 text-blue-600" />
                          ) : (
                            <Square className="w-5 h-5" />
                          )}
                        </button>
                      </th>
                      <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide text-gray-600">Type</th>
                      <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide text-gray-600">Name</th>
                      <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide text-gray-600">Deleted At</th>
                      <th className="px-4 py-3 text-center font-semibold uppercase tracking-wide text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item, idx) => (
                      <>
                        <tr
                          key={`${item.type}-${item.id}`}
                          className={`${idx % 2 === 0 ? "bg-white" : "bg-slate-50"} border-b border-gray-100 hover:bg-blue-50/50 transition-colors`}
                        >
                          <td className="px-4 py-3">
                            <button
                              onClick={() => toggleSelect(item.id)}
                              className="text-gray-500 hover:text-gray-700"
                            >
                              {selectedIds.has(item.id) ? (
                                <CheckSquare className="w-5 h-5 text-blue-600" />
                              ) : (
                                <Square className="w-5 h-5" />
                              )}
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <Badge className={`${TYPE_COLORS[item.type] || "bg-gray-100 text-gray-700"} border`}>
                              {item.type}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => toggleExpanded(item)}
                              className="flex items-center gap-2 font-medium text-gray-900 hover:text-blue-600"
                            >
                              {expandedId === item.id ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                              {item.name || `${item.type} #${item.id}`}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-gray-600">{formatDate(item.deletedAt)}</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap justify-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs"
                                disabled={restoringId === item.id}
                                onClick={() => handleRestore(item)}
                              >
                                {restoringId === item.id ? (
                                  <Loader2 className="animate-spin w-4 h-4 mr-1" />
                                ) : (
                                  <RotateCcw className="w-4 h-4 mr-1" />
                                )}
                                Restore
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-8 text-xs"
                                disabled={deletingId === item.id}
                                onClick={() => openDeleteDialog(item)}
                              >
                                {deletingId === item.id ? (
                                  <Loader2 className="animate-spin w-4 h-4 mr-1" />
                                ) : (
                                  <Trash2 className="w-4 h-4 mr-1" />
                                )}
                                Delete
                              </Button>
                            </div>
                          </td>
                        </tr>
                        {expandedId === item.id && (
                          <tr key={`${item.type}-${item.id}-details`} className="bg-slate-50">
                            <td colSpan={5} className="px-4 py-2">
                              {detailsLoading ? (
                                <div className="flex items-center gap-2 p-4 text-gray-500">
                                  <Loader2 className="animate-spin w-4 h-4" />
                                  Loading details...
                                </div>
                              ) : (
                                renderItemDetails()
                              )}
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Single Delete Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Permanently Delete Item"
        description={`Are you sure you want to permanently delete "${itemToDelete?.name || 'this item'}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={handlePermanentDelete}
      />

      {/* Bulk Delete Dialog */}
      <ConfirmDialog
        open={bulkDeleteDialogOpen}
        onOpenChange={setBulkDeleteDialogOpen}
        title="Delete Selected Items"
        description={`Are you sure you want to permanently delete ${selectedIds.size} selected item(s)? This action cannot be undone.`}
        confirmText="Delete All"
        variant="destructive"
        onConfirm={handleBulkDelete}
      />

      {/* Empty Bin Dialog */}
      <ConfirmDialog
        open={emptyBinDialogOpen}
        onOpenChange={setEmptyBinDialogOpen}
        title="Empty Recycle Bin"
        description={`Are you sure you want to permanently delete ALL ${items.length} item(s) in the recycle bin? This action cannot be undone.`}
        confirmText="Empty Bin"
        variant="destructive"
        onConfirm={handleEmptyBin}
      />
    </>
  )
}
