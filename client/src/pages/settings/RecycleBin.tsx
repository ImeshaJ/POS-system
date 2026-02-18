import React, { useEffect, useState } from "react";
import PageTitle from "@/components/common/PageTitle";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, RotateCcw, Loader2 } from "lucide-react";
import { apiGet, apiPost } from "@/lib/api";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { useToast } from "@/components/common/Toast";

interface DeletedItem {
  id: number;
  type: string;
  name: string;
  deletedAt: string;
}

const RecycleBin: React.FC = () => {
  const [items, setItems] = useState<DeletedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);
  const toast = useToast();

  useEffect(() => {
    loadItems();
    // eslint-disable-next-line
  }, []);

  const loadItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet<DeletedItem[]>("/api/recycle-bin");
      setItems(res.data || []);
    } catch (err) {
      setError("Failed to load deleted items");
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (id: number) => {
    setRestoringId(id);
    try {
      await apiPost(`/api/recycle-bin/${id}/restore`, {});
      setItems((prev) => prev.filter((item) => item.id !== id));
      toast.success("Item restored successfully");
    } catch (err) {
      toast.error("Failed to restore item");
    } finally {
      setRestoringId(null);
    }
  };

  const openDeleteDialog = (id: number) => {
    setItemToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handlePermanentDelete = async () => {
    if (!itemToDelete) return;
    setDeletingId(itemToDelete);
    setDeleteDialogOpen(false);
    try {
      await apiPost(`/api/recycle-bin/${itemToDelete}/delete`, {});
      setItems((prev) => prev.filter((item) => item.id !== itemToDelete));
      toast.success("Item permanently deleted");
    } catch (err) {
      toast.error("Failed to delete item");
    } finally {
      setDeletingId(null);
      setItemToDelete(null);
    }
  };

  return (
    <>
      <PageTitle title="Recycle Bin" />
      <div className="space-y-6 pb-10">
        <Card className="brand-card brand-card-hover">
          <CardContent className="p-6">
            <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
              <Trash2 className="w-6 h-6 text-rose-600" />
              Deleted Items
            </h2>
            <p className="text-gray-600 mb-4">Restore or permanently delete items removed from the system.</p>
            {loading ? (
              <div className="flex items-center gap-2 text-gray-500"><Loader2 className="animate-spin" /> Loading...</div>
            ) : error ? (
              <div className="text-red-600">{error}</div>
            ) : items.length === 0 ? (
              <div className="text-gray-500">No deleted items found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-slate-50">
                      <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide text-gray-600">Type</th>
                      <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide text-gray-600">Name</th>
                      <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide text-gray-600">Deleted At</th>
                      <th className="px-4 py-3 text-center font-semibold uppercase tracking-wide text-gray-600">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={item.id} className={`${idx % 2 === 0 ? "bg-white" : "bg-slate-50"} border-b border-gray-100`}>
                        <td className="px-4 py-3 text-gray-800">{item.type}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{item.name}</td>
                        <td className="px-4 py-3 text-gray-600">{new Date(item.deletedAt).toLocaleString()}</td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex flex-wrap justify-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs"
                              disabled={restoringId === item.id}
                              onClick={() => handleRestore(item.id)}
                            >
                              {restoringId === item.id ? <Loader2 className="animate-spin w-4 h-4 mr-1" /> : <RotateCcw className="w-4 h-4 mr-1" />}
                              Restore
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-8 text-xs"
                              disabled={deletingId === item.id}
                              onClick={() => openDeleteDialog(item.id)}
                            >
                              {deletingId === item.id ? <Loader2 className="animate-spin w-4 h-4 mr-1" /> : <Trash2 className="w-4 h-4 mr-1" />}
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Permanently Delete Item"
        description="This action cannot be undone. The item will be permanently removed from the system."
        confirmText="Delete"
        variant="destructive"
        onConfirm={handlePermanentDelete}
      />
    </>
  );
};

export default RecycleBin;
