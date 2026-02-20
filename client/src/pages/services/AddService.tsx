import { useState, useEffect, useCallback } from "react";
import PageTitle from "@/components/common/PageTitle";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Stethoscope, Boxes, Package, TrendingUp, Edit2, Trash2, PlusCircle, Eye, EyeOff, RefreshCw } from "lucide-react";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";
import { useToast } from "@/components/common/Toast";
import Loader from "@/components/common/Loader";

type ServiceType = {
  id: number;
  code: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  status: string;
  display_order: number;
};

type ServicePackage = {
  id?: number;
  package_id?: string;
  name: string;
  price: string;
  description?: string;
  status?: string;
  duration_days?: number;
  duration_hours?: number;
  duration_minutes?: number;
  service_type_code?: string;
  service_type_name?: string;
};

type AddOnService = {
  id?: number;
  addon_id?: string;
  name: string;
  price: string;
  description?: string;
  duration_days?: number;
  duration_hours?: number;
  duration_minutes?: number;
  service_type_code?: string;
  service_type_name?: string;
  status?: string;
};

const AddService = () => {
  const toast = useToast();

  // Service types from API
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);

  // Packages and Add-ons from API
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [addOns, setAddOns] = useState<AddOnService[]>([]);
  const [packagesLoading, setPackagesLoading] = useState(true);
  const [addOnsLoading, setAddOnsLoading] = useState(true);

  // Form state
  const [newPackage, setNewPackage] = useState<ServicePackage>({
    package_id: "",
    name: "",
    price: "",
    description: "",
    status: "active",
    duration_days: 0,
    duration_hours: 0,
    duration_minutes: 0,
    service_type_code: ""
  });
  const [newAddOn, setNewAddOn] = useState<AddOnService>({
    addon_id: "",
    name: "",
    price: "",
    description: "",
    duration_days: 0,
    duration_hours: 0,
    duration_minutes: 0,
    service_type_code: "",
    status: "active"
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("");

  // Edit state for packages and add-ons
  const [editingPackageId, setEditingPackageId] = useState<number | null>(null);
  const [editingPackage, setEditingPackage] = useState<ServicePackage | null>(null);
  const [editingAddOnId, setEditingAddOnId] = useState<number | null>(null);
  const [editingAddOn, setEditingAddOn] = useState<AddOnService | null>(null);
  const [showPackageForm, setShowPackageForm] = useState(false);
  const [showAddOnForm, setShowAddOnForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Fetch service types
  const fetchServiceTypes = useCallback(async () => {
    try {
      const res = await apiGet<ServiceType[]>("/api/service-types");
      setServiceTypes(res.data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load service types");
    }
  }, [toast]);

  // Fetch packages
  const fetchPackages = useCallback(async () => {
    setPackagesLoading(true);
    try {
      const res = await apiGet<ServicePackage[]>("/api/service-types/packages");
      setPackages(res.data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load packages");
    } finally {
      setPackagesLoading(false);
    }
  }, [toast]);

  // Fetch add-ons
  const fetchAddOns = useCallback(async () => {
    setAddOnsLoading(true);
    try {
      const res = await apiGet<AddOnService[]>("/api/service-types/addons");
      setAddOns(res.data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load add-ons");
    } finally {
      setAddOnsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchServiceTypes();
    fetchPackages();
    fetchAddOns();
  }, [fetchServiceTypes, fetchPackages, fetchAddOns]);

  // Compute filtered packages
  const filteredPackages = packages.filter(p => {
    const matchesSearch = !searchTerm || p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = !filterType || p.service_type_code === filterType;
    return matchesSearch && matchesType;
  });

  // Compute filtered add-ons
  const filteredAddOns = addOns.filter(a => {
    const matchesSearch = !searchTerm || a.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = !filterType || a.service_type_code === filterType;
    return matchesSearch && matchesType;
  });

  // Group packages by service type
  const packagesByType = filteredPackages.reduce((acc, pkg) => {
    const typeCode = pkg.service_type_code || "uncategorized";
    if (!acc[typeCode]) acc[typeCode] = [];
    acc[typeCode].push(pkg);
    return acc;
  }, {} as Record<string, ServicePackage[]>);

  // Group add-ons by service type
  const addonsByType = filteredAddOns.reduce((acc, addon) => {
    const typeCode = addon.service_type_code || "uncategorized";
    if (!acc[typeCode]) acc[typeCode] = [];
    acc[typeCode].push(addon);
    return acc;
  }, {} as Record<string, AddOnService[]>);

  const resetPackageForm = () => {
    setNewPackage({
      package_id: "",
      name: "",
      price: "",
      description: "",
      status: "active",
      duration_days: 0,
      duration_hours: 0,
      duration_minutes: 0,
      service_type_code: ""
    });
  };

  const resetAddOnForm = () => {
    setNewAddOn({
      addon_id: "",
      name: "",
      price: "",
      description: "",
      duration_days: 0,
      duration_hours: 0,
      duration_minutes: 0,
      service_type_code: "",
      status: "active"
    });
  };

  // Save package to database
  const handleSavePackage = async () => {
    if (!newPackage.name || !newPackage.price || !newPackage.service_type_code) {
      toast.warning("Please fill in name, price, and service type");
      return;
    }
    setSaving(true);
    try {
      await apiPost("/api/service-types/packages", {
        service_type_code: newPackage.service_type_code,
        package_id: newPackage.package_id,
        name: newPackage.name,
        price: parseFloat(newPackage.price),
        description: newPackage.description,
        status: newPackage.status,
        duration_days: newPackage.duration_days || 0,
        duration_hours: newPackage.duration_hours || 0,
        duration_minutes: newPackage.duration_minutes || 0
      });
      toast.success("Package added successfully");
      resetPackageForm();
      setShowPackageForm(false);
      fetchPackages();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save package");
    } finally {
      setSaving(false);
    }
  };

  // Update package
  const handleUpdatePackage = async () => {
    if (!editingPackage || !editingPackageId) return;
    if (!editingPackage.name || !editingPackage.price) {
      toast.warning("Please fill in name and price");
      return;
    }
    setSaving(true);
    try {
      await apiPut(`/api/service-types/packages/${editingPackageId}`, {
        service_type_code: editingPackage.service_type_code,
        package_id: editingPackage.package_id,
        name: editingPackage.name,
        price: parseFloat(editingPackage.price),
        description: editingPackage.description,
        status: editingPackage.status,
        duration_days: editingPackage.duration_days || 0,
        duration_hours: editingPackage.duration_hours || 0,
        duration_minutes: editingPackage.duration_minutes || 0
      });
      toast.success("Package updated successfully");
      setEditingPackageId(null);
      setEditingPackage(null);
      fetchPackages();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update package");
    } finally {
      setSaving(false);
    }
  };

  // Delete package
  const handleDeletePackage = async (id: number) => {
    try {
      await apiDelete(`/api/service-types/packages/${id}`);
      toast.success("Package deleted");
      fetchPackages();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete package");
    }
  };

  // Save add-on to database
  const handleSaveAddOn = async () => {
    if (!newAddOn.name || !newAddOn.price || !newAddOn.service_type_code) {
      toast.warning("Please fill in name, price, and service type");
      return;
    }
    setSaving(true);
    try {
      await apiPost("/api/service-types/addons", {
        service_type_code: newAddOn.service_type_code,
        addon_id: newAddOn.addon_id,
        name: newAddOn.name,
        price: parseFloat(newAddOn.price),
        description: newAddOn.description,
        status: newAddOn.status,
        duration_days: newAddOn.duration_days || 0,
        duration_hours: newAddOn.duration_hours || 0,
        duration_minutes: newAddOn.duration_minutes || 0
      });
      toast.success("Add-on added successfully");
      resetAddOnForm();
      setShowAddOnForm(false);
      fetchAddOns();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save add-on");
    } finally {
      setSaving(false);
    }
  };

  // Update add-on
  const handleUpdateAddOn = async () => {
    if (!editingAddOn || !editingAddOnId) return;
    if (!editingAddOn.name || !editingAddOn.price) {
      toast.warning("Please fill in name and price");
      return;
    }
    setSaving(true);
    try {
      await apiPut(`/api/service-types/addons/${editingAddOnId}`, {
        service_type_code: editingAddOn.service_type_code,
        addon_id: editingAddOn.addon_id,
        name: editingAddOn.name,
        price: parseFloat(editingAddOn.price),
        description: editingAddOn.description,
        status: editingAddOn.status,
        duration_days: editingAddOn.duration_days || 0,
        duration_hours: editingAddOn.duration_hours || 0,
        duration_minutes: editingAddOn.duration_minutes || 0
      });
      toast.success("Add-on updated successfully");
      setEditingAddOnId(null);
      setEditingAddOn(null);
      fetchAddOns();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update add-on");
    } finally {
      setSaving(false);
    }
  };

  // Delete add-on
  const handleDeleteAddOn = async (id: number) => {
    try {
      await apiDelete(`/api/service-types/addons/${id}`);
      toast.success("Add-on deleted");
      fetchAddOns();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete add-on");
    }
  };

  // Toggle add-on status
  const handleToggleAddOnStatus = async (addon: AddOnService) => {
    if (!addon.id) return;
    try {
      await apiPut(`/api/service-types/addons/${addon.id}`, {
        ...addon,
        price: parseFloat(addon.price),
        status: addon.status === 'active' ? 'inactive' : 'active'
      });
      fetchAddOns();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    }
  };

  // Get service type name by code
  const getServiceTypeName = (code: string) => {
    const type = serviceTypes.find(t => t.code === code);
    return type?.name || code;
  };

  return (
    <>
      <PageTitle title="Add New Service" subtitle="Create, customize, and track professional service offerings." />
      <div className="space-y-8 pb-10">
        {/* KPI Cards Section */}
        <Card className="brand-card brand-card-hover overflow-hidden">
          <CardContent className="p-0">
            <div className="bg-linear-to-r from-[#0f172a] via-[#4338ca] to-[#ec4899] p-6 text-white">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-white/70">Service intelligence</p>
                  <h2 className="text-3xl font-bold">Service dashboard</h2>
                  <p className="text-sm text-white/80">
                    Manage service packages and add-ons across all service categories.
                  </p>
                </div>
                <div className="flex flex-col items-end gap-3 text-right">
                  <Badge className="brand-pill border border-white/30 bg-white/10 text-white">
                    {serviceTypes.length} service types
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-2xl border-white/60 text-white hover:bg-white/20"
                    onClick={() => { fetchPackages(); fetchAddOns(); }}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" /> Refresh
                  </Button>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-linear-to-br from-[#0f172a] via-[#4338ca] to-[#ec4899] p-4 text-white shadow-lg">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-white/70">Service Types</p>
                    <p className="mt-2 text-2xl font-bold">{serviceTypes.length}</p>
                    <p className="text-xs text-white/80">Available categories</p>
                  </div>
                  <span className="rounded-2xl bg-white/20 p-2">
                    <Stethoscope className="h-5 w-5" />
                  </span>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-linear-to-br from-[#14532d] to-[#22d3ee] p-4 text-white shadow-lg">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-white/70">Total Packages</p>
                    <p className="mt-2 text-2xl font-bold">{packages.length}</p>
                    <p className="text-xs text-white/80">Package offerings</p>
                  </div>
                  <span className="rounded-2xl bg-white/20 p-2">
                    <Boxes className="h-5 w-5" />
                  </span>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-linear-to-br from-[#ff512f] to-[#f97316] p-4 text-white shadow-lg">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-white/70">Total Add-ons</p>
                    <p className="mt-2 text-2xl font-bold">{addOns.length}</p>
                    <p className="text-xs text-white/80">Additional services</p>
                  </div>
                  <span className="rounded-2xl bg-white/20 p-2">
                    <Package className="h-5 w-5" />
                  </span>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-linear-to-br from-[#0f172a] to-[#38bdf8] p-4 text-white shadow-lg">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-white/70">Revenue Potential</p>
                    <p className="mt-2 text-2xl font-bold">Rs. {(packages.reduce((sum, p) => sum + parseFloat(p.price || '0'), 0) + addOns.reduce((sum, a) => sum + parseFloat(a.price || '0'), 0)).toLocaleString()}</p>
                    <p className="text-xs text-white/80">Estimated value</p>
                  </div>
                  <span className="rounded-2xl bg-white/20 p-2">
                    <TrendingUp className="h-5 w-5" />
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Search and Filter Bar */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row md:items-center md:gap-4 gap-2">
              <Input
                type="text"
                placeholder="Search packages and add-ons..."
                className="w-full md:w-64"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
              <select
                className="h-10 w-full md:w-48 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
              >
                <option value="">All Service Types</option>
                {serviceTypes.map(type => (
                  <option key={type.code} value={type.code}>{type.name}</option>
                ))}
              </select>
              <Button
                type="button"
                variant="outline"
                className="h-10 px-6"
                onClick={() => { setSearchTerm(""); setFilterType(""); }}
              >
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Service Packages Section */}
        <Card className="mt-8 brand-card brand-card-hover">
          <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-2xl">Service Packages</CardTitle>
              <p className="text-sm text-muted-foreground">Manage service packages with proper categorization</p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="flex items-center gap-2 text-emerald-700 hover:text-emerald-900 border-emerald-200 hover:bg-emerald-50"
              onClick={() => setShowPackageForm(!showPackageForm)}
            >
              <PlusCircle className="w-4 h-4" /> Add Package
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* New Package Form */}
            {showPackageForm && (
              <div className="bg-linear-to-br from-emerald-50 to-teal-50 rounded-2xl shadow-md p-6 border-2 border-emerald-200">
                <h5 className="text-sm font-semibold text-gray-700 mb-4">New Package Details</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-gray-600">Service Type *</Label>
                    <select
                      className="h-10 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
                      value={newPackage.service_type_code || ""}
                      onChange={e => setNewPackage({ ...newPackage, service_type_code: e.target.value })}
                    >
                      <option value="">Select Service Type</option>
                      {serviceTypes.map(type => (
                        <option key={type.code} value={type.code}>{type.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-gray-600">Package ID</Label>
                    <Input
                      type="text"
                      className="h-10 w-full"
                      value={newPackage.package_id || ""}
                      onChange={e => setNewPackage({ ...newPackage, package_id: e.target.value })}
                      placeholder="Optional unique ID"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-gray-600">Package Name *</Label>
                    <Input
                      type="text"
                      className="h-10 w-full"
                      value={newPackage.name}
                      onChange={e => setNewPackage({ ...newPackage, name: e.target.value })}
                      placeholder="e.g. Basic Grooming Package"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-gray-600">Price (Rs.) *</Label>
                    <Input
                      type="number"
                      className="h-10 w-full"
                      value={newPackage.price}
                      onChange={e => setNewPackage({ ...newPackage, price: e.target.value })}
                      min="0"
                      step="0.01"
                      placeholder="e.g. 2500"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-xs font-semibold text-gray-600">Description</Label>
                    <Input
                      type="text"
                      className="h-10 w-full"
                      value={newPackage.description || ""}
                      onChange={e => setNewPackage({ ...newPackage, description: e.target.value })}
                      placeholder="Brief description of the package"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-gray-600">Duration</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        className="h-10 w-20"
                        value={newPackage.duration_days || ""}
                        onChange={e => setNewPackage({ ...newPackage, duration_days: parseInt(e.target.value) || 0 })}
                        min="0"
                        placeholder="Days"
                      />
                      <Input
                        type="number"
                        className="h-10 w-20"
                        value={newPackage.duration_hours || ""}
                        onChange={e => setNewPackage({ ...newPackage, duration_hours: parseInt(e.target.value) || 0 })}
                        min="0"
                        placeholder="Hours"
                      />
                      <Input
                        type="number"
                        className="h-10 w-20"
                        value={newPackage.duration_minutes || ""}
                        onChange={e => setNewPackage({ ...newPackage, duration_minutes: parseInt(e.target.value) || 0 })}
                        min="0"
                        max="59"
                        placeholder="Minutes"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-gray-600">Status</Label>
                    <select
                      className="h-10 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
                      value={newPackage.status || "active"}
                      onChange={e => setNewPackage({ ...newPackage, status: e.target.value })}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    type="button"
                    className="bg-emerald-600 text-white hover:bg-emerald-700 flex-1"
                    onClick={handleSavePackage}
                    disabled={saving}
                  >
                    <PlusCircle className="w-4 h-4 mr-2" /> {saving ? "Saving..." : "Add Package"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => { setShowPackageForm(false); resetPackageForm(); }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Packages List - Grouped by Service Type */}
            {packagesLoading ? (
              <div className="flex justify-center py-8"><Loader /></div>
            ) : filteredPackages.length > 0 ? (
              <div className="space-y-6">
                {Object.entries(packagesByType).map(([typeCode, typePackages]) => (
                  <div key={typeCode} className="space-y-3">
                    <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground border-b pb-2">
                      {getServiceTypeName(typeCode)} ({typePackages.length})
                    </h4>
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                      {typePackages.map((pkg) => (
                        <div
                          key={pkg.id}
                          className="rounded-2xl border border-border/60 bg-card/60 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                        >
                          {editingPackageId === pkg.id ? (
                            <div className="space-y-2">
                              <Label className="text-xs font-semibold text-gray-600">Service Type</Label>
                              <select
                                className="h-10 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
                                value={editingPackage?.service_type_code || ""}
                                onChange={e => setEditingPackage({ ...(editingPackage as ServicePackage), service_type_code: e.target.value })}
                              >
                                <option value="">Select Service Type</option>
                                {serviceTypes.map(type => (
                                  <option key={type.code} value={type.code}>{type.name}</option>
                                ))}
                              </select>
                              <Label className="text-xs font-semibold text-gray-600">Package Name</Label>
                              <Input
                                type="text"
                                className="h-10 w-full"
                                value={editingPackage?.name || ""}
                                onChange={e => setEditingPackage({ ...(editingPackage as ServicePackage), name: e.target.value })}
                              />
                              <Label className="text-xs font-semibold text-gray-600">Price (Rs.)</Label>
                              <Input
                                type="number"
                                className="h-10 w-full"
                                value={editingPackage?.price || ""}
                                onChange={e => setEditingPackage({ ...(editingPackage as ServicePackage), price: e.target.value })}
                              />
                              <Label className="text-xs font-semibold text-gray-600">Description</Label>
                              <Input
                                type="text"
                                className="h-10 w-full"
                                value={editingPackage?.description || ""}
                                onChange={e => setEditingPackage({ ...(editingPackage as ServicePackage), description: e.target.value })}
                              />
                              <Label className="text-xs font-semibold text-gray-600">Status</Label>
                              <select
                                className="h-10 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
                                value={editingPackage?.status || "active"}
                                onChange={e => setEditingPackage({ ...(editingPackage as ServicePackage), status: e.target.value })}
                              >
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                              </select>
                              <div className="flex gap-2 mt-2">
                                <Button
                                  type="button"
                                  className="bg-emerald-600 text-white hover:bg-emerald-700 flex-1"
                                  onClick={handleUpdatePackage}
                                  disabled={saving}
                                >
                                  {saving ? "Saving..." : "Save"}
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => { setEditingPackageId(null); setEditingPackage(null); }}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2">
                                  <h3 className="text-lg font-semibold text-foreground">{pkg.name}</h3>
                                  <Badge className={`rounded-full px-2 py-0.5 text-xs ${pkg.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                                    {pkg.status === 'active' ? "Active" : "Inactive"}
                                  </Badge>
                                </div>
                                <div className="flex gap-2">
                                  <Button size="icon" variant="outline" className="h-9 w-9 rounded-2xl" title="Edit"
                                    onClick={() => { setEditingPackageId(pkg.id!); setEditingPackage(pkg); }}
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="outline"
                                    className="h-9 w-9 rounded-2xl text-rose-600"
                                    title="Remove"
                                    onClick={() => pkg.id && handleDeletePackage(pkg.id)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                              <p className="mt-2 text-2xl font-bold text-purple-600">Rs. {parseFloat(pkg.price).toLocaleString()}</p>
                              <p className="text-sm text-muted-foreground">{pkg.description}</p>
                              {(pkg.duration_days || pkg.duration_hours || pkg.duration_minutes) && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Duration: {pkg.duration_days ? `${pkg.duration_days}d ` : ""}{pkg.duration_hours ? `${pkg.duration_hours}h ` : ""}{pkg.duration_minutes ? `${pkg.duration_minutes}m` : ""}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic text-center py-8">No packages added yet. Click "Add Package" to create one.</p>
            )}
          </CardContent>
        </Card>

              {/* Add-on Services Section */}
        <Card className="brand-card brand-card-hover">
          <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-2xl">Add-on Services</CardTitle>
              <p className="text-sm text-muted-foreground">Optional services that can be added to packages</p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="flex items-center gap-2 text-blue-700 hover:text-blue-900 border-blue-200 hover:bg-blue-50"
              onClick={() => setShowAddOnForm(!showAddOnForm)}
            >
              <PlusCircle className="w-4 h-4" /> Add Service
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* New Add-on Form */}
            {showAddOnForm && (
              <div className="bg-linear-to-br from-blue-50 to-cyan-50 rounded-2xl shadow-md p-6 border-2 border-blue-200">
                <h5 className="text-sm font-semibold text-gray-700 mb-4">New Add-on Details</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-gray-600">Service Type *</Label>
                    <select
                      className="h-10 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                      value={newAddOn.service_type_code || ""}
                      onChange={e => setNewAddOn({ ...newAddOn, service_type_code: e.target.value })}
                    >
                      <option value="">Select Service Type</option>
                      {serviceTypes.map(type => (
                        <option key={type.code} value={type.code}>{type.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-gray-600">Add-on ID</Label>
                    <Input
                      type="text"
                      className="h-10 w-full"
                      value={newAddOn.addon_id || ""}
                      onChange={e => setNewAddOn({ ...newAddOn, addon_id: e.target.value })}
                      placeholder="Optional unique ID"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-gray-600">Add-on Name *</Label>
                    <Input
                      type="text"
                      className="h-10 w-full"
                      value={newAddOn.name}
                      onChange={e => setNewAddOn({ ...newAddOn, name: e.target.value })}
                      placeholder="e.g. Nail Trimming"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-gray-600">Price (Rs.) *</Label>
                    <Input
                      type="number"
                      className="h-10 w-full"
                      value={newAddOn.price}
                      onChange={e => setNewAddOn({ ...newAddOn, price: e.target.value })}
                      min="0"
                      step="0.01"
                      placeholder="e.g. 500"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-xs font-semibold text-gray-600">Description</Label>
                    <Input
                      type="text"
                      className="h-10 w-full"
                      value={newAddOn.description || ""}
                      onChange={e => setNewAddOn({ ...newAddOn, description: e.target.value })}
                      placeholder="Brief description of the add-on service"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-gray-600">Duration</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        className="h-10 w-20"
                        value={newAddOn.duration_days || ""}
                        onChange={e => setNewAddOn({ ...newAddOn, duration_days: parseInt(e.target.value) || 0 })}
                        min="0"
                        placeholder="Days"
                      />
                      <Input
                        type="number"
                        className="h-10 w-20"
                        value={newAddOn.duration_hours || ""}
                        onChange={e => setNewAddOn({ ...newAddOn, duration_hours: parseInt(e.target.value) || 0 })}
                        min="0"
                        placeholder="Hours"
                      />
                      <Input
                        type="number"
                        className="h-10 w-20"
                        value={newAddOn.duration_minutes || ""}
                        onChange={e => setNewAddOn({ ...newAddOn, duration_minutes: parseInt(e.target.value) || 0 })}
                        min="0"
                        max="59"
                        placeholder="Minutes"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-gray-600">Status</Label>
                    <select
                      className="h-10 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                      value={newAddOn.status || "active"}
                      onChange={e => setNewAddOn({ ...newAddOn, status: e.target.value })}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    type="button"
                    className="bg-blue-600 text-white hover:bg-blue-700 flex-1"
                    onClick={handleSaveAddOn}
                    disabled={saving}
                  >
                    <PlusCircle className="w-4 h-4 mr-2" /> {saving ? "Saving..." : "Add Add-on"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => { setShowAddOnForm(false); resetAddOnForm(); }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Add-ons List - Grouped by Service Type */}
            {addOnsLoading ? (
              <div className="flex justify-center py-8"><Loader /></div>
            ) : filteredAddOns.length > 0 ? (
              <div className="space-y-6">
                {Object.entries(addonsByType).map(([typeCode, typeAddons]) => (
                  <div key={typeCode} className="space-y-3">
                    <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground border-b pb-2">
                      {getServiceTypeName(typeCode)} ({typeAddons.length})
                    </h4>
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                      {typeAddons.map((addon) => (
                        <div
                          key={addon.id}
                          className="rounded-2xl border border-border/60 bg-card/60 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                        >
                          {editingAddOnId === addon.id ? (
                            <div className="space-y-2">
                              <Label className="text-xs font-semibold text-gray-600">Service Type</Label>
                              <select
                                className="h-10 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                                value={editingAddOn?.service_type_code || ""}
                                onChange={e => setEditingAddOn({ ...(editingAddOn as AddOnService), service_type_code: e.target.value })}
                              >
                                <option value="">Select Service Type</option>
                                {serviceTypes.map(type => (
                                  <option key={type.code} value={type.code}>{type.name}</option>
                                ))}
                              </select>
                              <Label className="text-xs font-semibold text-gray-600">Add-on Name</Label>
                              <Input
                                type="text"
                                className="h-10 w-full"
                                value={editingAddOn?.name || ""}
                                onChange={e => setEditingAddOn({ ...(editingAddOn as AddOnService), name: e.target.value })}
                              />
                              <Label className="text-xs font-semibold text-gray-600">Price (Rs.)</Label>
                              <Input
                                type="number"
                                className="h-10 w-full"
                                value={editingAddOn?.price || ""}
                                onChange={e => setEditingAddOn({ ...(editingAddOn as AddOnService), price: e.target.value })}
                              />
                              <Label className="text-xs font-semibold text-gray-600">Description</Label>
                              <Input
                                type="text"
                                className="h-10 w-full"
                                value={editingAddOn?.description || ""}
                                onChange={e => setEditingAddOn({ ...(editingAddOn as AddOnService), description: e.target.value })}
                              />
                              <Label className="text-xs font-semibold text-gray-600">Status</Label>
                              <select
                                className="h-10 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                                value={editingAddOn?.status || "active"}
                                onChange={e => setEditingAddOn({ ...(editingAddOn as AddOnService), status: e.target.value })}
                              >
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                              </select>
                              <div className="flex gap-2 mt-2">
                                <Button
                                  type="button"
                                  className="bg-blue-600 text-white hover:bg-blue-700 flex-1"
                                  onClick={handleUpdateAddOn}
                                  disabled={saving}
                                >
                                  {saving ? "Saving..." : "Save"}
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => { setEditingAddOnId(null); setEditingAddOn(null); }}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2">
                                  <h3 className="text-lg font-semibold text-foreground">{addon.name}</h3>
                                  <Badge className={`rounded-full px-2 py-0.5 text-xs ${addon.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                                    {addon.status === 'active' ? "Active" : "Inactive"}
                                  </Badge>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    size="icon"
                                    variant="outline"
                                    title="Toggle Active"
                                    className="h-9 w-9 rounded-2xl"
                                    onClick={() => handleToggleAddOnStatus(addon)}
                                  >
                                    {addon.status === 'active' ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                  </Button>
                                  <Button size="icon" variant="outline" className="h-9 w-9 rounded-2xl" title="Edit"
                                    onClick={() => { setEditingAddOnId(addon.id!); setEditingAddOn(addon); }}
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="outline"
                                    className="h-9 w-9 rounded-2xl text-rose-600"
                                    title="Remove"
                                    onClick={() => addon.id && handleDeleteAddOn(addon.id)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                              <p className="mt-2 text-2xl font-bold text-blue-600">Rs. {parseFloat(addon.price).toLocaleString()}</p>
                              <p className="text-sm text-muted-foreground">{addon.description}</p>
                              {(addon.duration_days || addon.duration_hours || addon.duration_minutes) && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Duration: {addon.duration_days ? `${addon.duration_days}d ` : ""}{addon.duration_hours ? `${addon.duration_hours}h ` : ""}{addon.duration_minutes ? `${addon.duration_minutes}m` : ""}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic text-center py-8">No add-on services yet. Click "Add Service" to create one.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default AddService;

