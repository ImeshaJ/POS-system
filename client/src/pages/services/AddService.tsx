import { useState } from "react";
import PageTitle from "@/components/common/PageTitle";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Stethoscope, Boxes, Package, TrendingUp, Edit2, Trash2, PlusCircle, Eye, EyeOff } from "lucide-react";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type ServicePackage = {
  id?: string;
  name: string;
  price: string;
  description?: string;
  status?: string;
  durationDays?: string;
  durationHours?: string;
  durationMinutes?: string;
  serviceType?: string;
};

type AddOnService = {
  id?: string;
  name: string;
  price: string;
  description?: string;
  durationDays?: string;
  durationHours?: string;
  durationMinutes?: string;
  serviceType?: string;
  status?: string;
};


const initialPackages: ServicePackage[] = [];
const initialAddOns: AddOnService[] = [];

type ServiceEntry = {
  id: string;
  type: string;
  name: string;
  packages: ServicePackage[];
  addOns: AddOnService[];
  duration?: number;
};

const AddService = () => {
  const [serviceType, setServiceType] = useState("");
  const [serviceStatus, setServiceStatus] = useState("");
  const [packages, setPackages] = useState<ServicePackage[]>(initialPackages);
  const [addOns, setAddOns] = useState<AddOnService[]>(initialAddOns);
  const [services, setServices] = useState<ServiceEntry[]>([]);
  const [newPackage, setNewPackage] = useState<ServicePackage>({ id: "", name: "", price: "", description: "", status: "active", durationDays: "", durationHours: "", durationMinutes: "", serviceType: "" });
  const [newAddOn, setNewAddOn] = useState<AddOnService>({ id: "", name: "", price: "", description: "", durationDays: "", durationHours: "", durationMinutes: "", serviceType: "", status: "active" });
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("");

  // Compute filtered services
  const filteredServices = services.filter(s => {
    const matchesSearch = !searchTerm || s.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = !filterType || s.type === filterType;
    return matchesSearch && matchesType;
  });

  // Edit state for packages and add-ons
  const [editingPackageIdx, setEditingPackageIdx] = useState<number | null>(null);
  const [editingPackage, setEditingPackage] = useState<ServicePackage | null>(null);
  const [editingAddOnIdx, setEditingAddOnIdx] = useState<number | null>(null);
  const [editingAddOn, setEditingAddOn] = useState<AddOnService | null>(null);
  const [showPackageForm, setShowPackageForm] = useState(false);
  const [showAddOnForm, setShowAddOnForm] = useState(false);
  const [, setErrors] = useState<{[key:string]:string}>({});


  const resetForm = () => {
    setServiceType("");
    setServiceStatus("");
    setPackages(initialPackages);
    setAddOns(initialAddOns);
    setNewPackage({ id: "", name: "", price: "", description: "", status: "active", durationDays: "", durationHours: "", durationMinutes: "" });
    setNewAddOn({ id: "", name: "", price: "", description: "", durationDays: "", durationHours: "", durationMinutes: "" });
    setErrors({});
    // setErrors({});
  };

  const handleAddService = () => {
    const newErrors: {[key:string]:string} = {};
    if (!serviceType) newErrors.serviceType = "Service type is required.";
    if (!serviceStatus) newErrors.serviceStatus = "Status is required.";
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;
    setServices([
      ...services,
      {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: serviceType,
        name: serviceType,
        packages: [...packages],
        addOns: [...addOns],
      },
    ]);
    resetForm();
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
                    Hero tiles mirror the supplier console aesthetic and surface service, package, and add-on stats in one pass.
                  </p>
                </div>
                <div className="flex flex-col items-end gap-3 text-right">
                  <Badge className="brand-pill border border-white/30 bg-white/10 text-white">
                    {filteredServices.length ? `${filteredServices.length} services` : "No services"}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-linear-to-br from-[#0f172a] via-[#4338ca] to-[#ec4899] p-4 text-white shadow-lg">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-white/70">Total Services</p>
                    <p className="mt-2 text-2xl font-bold">{filteredServices.length}</p>
                    <p className="text-xs text-white/80">Active services catalog</p>
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
                    <p className="mt-2 text-2xl font-bold">{filteredServices.reduce((sum, s) => sum + s.packages.length, 0)}</p>
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
                    <p className="mt-2 text-2xl font-bold">{filteredServices.reduce((sum, s) => sum + s.addOns.length, 0)}</p>
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
                    <p className="mt-2 text-2xl font-bold">Rs. {filteredServices.reduce((sum, s) => sum + s.packages.reduce((pSum, p) => pSum + parseFloat(p.price || '0'), 0) + s.addOns.reduce((aSum, a) => aSum + parseFloat(a.price || '0'), 0), 0).toLocaleString()}</p>
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

        {/* Search and Filter Bar (moved below KPI cards) */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row md:items-center md:gap-4 gap-2">
              <Input
                type="text"
                placeholder="Search services..."
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
                {Array.from(new Set(services.map(s => s.type).filter(Boolean))).map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              <Button
                type="button"
                className="h-10 px-6"
                onClick={() => {/* Optionally trigger search/filter, but state is reactive */}}
              >
                Search
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Main Form Section */}
        <Card className="mt-8 brand-card brand-card-hover">
          <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-2xl">Add New Service</CardTitle>
              
            </div>
          </CardHeader>
          <CardContent className="space-y-8 p-8">
            <form
              onSubmit={e => {
                e.preventDefault();
                handleAddService();
              }}
              className="space-y-8"
              autoComplete="off"
            >
             
               
              {/* Packages Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-lg font-bold text-gray-800">Service Packages</h4>
                    <p className="text-sm text-gray-500">Add optional service packages with different pricing tiers</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex items-center gap-2 text-emerald-700 hover:text-emerald-900 border-emerald-200 hover:bg-emerald-50"
                    onClick={() => setShowPackageForm(!showPackageForm)}
                  >
                    <PlusCircle className="w-4 h-4" /> Add Package
                  </Button>
                </div>
                {showPackageForm && (
                  <div className="bg-linear-to-br from-emerald-50 to-teal-50 rounded-2xl shadow-md p-6 border-2 border-emerald-200">
                    <h5 className="text-sm font-semibold text-gray-700 mb-4">New Package Details</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Service Type for Package */}
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-gray-600">Service Type</Label>
                        <Input
                          type="text"
                          className="h-10 w-full"
                          value={newPackage.serviceType || ""}
                          onChange={e => setNewPackage({ ...newPackage, serviceType: e.target.value })}
                          placeholder="e.g. Consultation, Surgery, etc."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-gray-600">Package ID</Label>
                        <Input
                          type="text"
                          className="h-10 w-full"
                          value={newPackage.id}
                          onChange={e => setNewPackage({ ...newPackage, id: e.target.value })}
                          placeholder="Unique ID"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-gray-600">Package Name</Label>
                        <Input
                          type="text"
                          className="h-10 w-full"
                          value={newPackage.name}
                          onChange={e => setNewPackage({ ...newPackage, name: e.target.value })}
                          placeholder="e.g. Basic Care Package"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-gray-600">Price (Rs.)</Label>
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
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-gray-600">Description</Label>
                        <Input
                          type="text"
                          className="h-10 w-full"
                          value={newPackage.description}
                          onChange={e => setNewPackage({ ...newPackage, description: e.target.value })}
                          placeholder="Brief description"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-gray-600">Duration</Label>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            className="h-10 w-20"
                            value={newPackage.durationDays}
                            onChange={e => setNewPackage({ ...newPackage, durationDays: e.target.value })}
                            min="0"
                            placeholder="Days"
                          />
                          <Input
                            type="number"
                            className="h-10 w-20"
                            value={newPackage.durationHours}
                            onChange={e => setNewPackage({ ...newPackage, durationHours: e.target.value })}
                            min="0"
                            placeholder="Hours"
                          />
                          <Input
                            type="number"
                            className="h-10 w-20"
                            value={newPackage.durationMinutes}
                            onChange={e => setNewPackage({ ...newPackage, durationMinutes: e.target.value })}
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
                          value={newPackage.status}
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
                        onClick={() => {
                          if (!newPackage.name || !newPackage.price) return;
                          setPackages([...packages, newPackage]);
                          setNewPackage({ id: "", name: "", price: "", description: "", status: "active", durationDays: "", durationHours: "", durationMinutes: "", serviceType: "" });
                          setShowPackageForm(false);
                        }}
                      >
                        <PlusCircle className="w-4 h-4 mr-2" /> Add Package
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowPackageForm(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
                {packages.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {packages.map((pkg, idx) => (
                      <div
                        key={idx}
                        className="rounded-2xl border border-border/60 bg-card/60 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                      >
                        {editingPackageIdx === idx ? (
                          <div className="space-y-2">
                            <Label className="text-xs font-semibold text-gray-600">Service Type</Label>
                            <Input
                              type="text"
                              className="h-10 w-full"
                              value={editingPackage?.serviceType || ""}
                              onChange={e => setEditingPackage({ ...(editingPackage as ServicePackage), serviceType: e.target.value })}
                              placeholder="e.g. Consultation, Surgery, etc."
                            />
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
                            <Label className="text-xs font-semibold text-gray-600">Duration</Label>
                            <div className="flex gap-2">
                              <Input
                                type="number"
                                className="h-10 w-20"
                                value={editingPackage?.durationDays || ""}
                                onChange={e => setEditingPackage({ ...(editingPackage as ServicePackage), durationDays: e.target.value })}
                                min="0"
                                placeholder="Days"
                              />
                              <Input
                                type="number"
                                className="h-10 w-20"
                                value={editingPackage?.durationHours || ""}
                                onChange={e => setEditingPackage({ ...(editingPackage as ServicePackage), durationHours: e.target.value })}
                                min="0"
                                placeholder="Hours"
                              />
                              <Input
                                type="number"
                                className="h-10 w-20"
                                value={editingPackage?.durationMinutes || ""}
                                onChange={e => setEditingPackage({ ...(editingPackage as ServicePackage), durationMinutes: e.target.value })}
                                min="0"
                                max="59"
                                placeholder="Minutes"
                              />
                            </div>
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
                                onClick={() => {
                                  if (!editingPackage?.name || !editingPackage?.price) return;
                                  setPackages(packages.map((p, i) => i === idx ? (editingPackage as ServicePackage) : p));
                                  setEditingPackageIdx(null);
                                  setEditingPackage(null);
                                }}
                              >
                                Save
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                  setEditingPackageIdx(null);
                                  setEditingPackage(null);
                                }}
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
                                  onClick={() => {
                                    setEditingPackageIdx(idx);
                                    setEditingPackage(pkg);
                                  }}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="h-9 w-9 rounded-2xl text-rose-600"
                                  title="Remove"
                                  onClick={() => setPackages(packages.filter((_, i) => i !== idx))}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Service Type: {pkg.serviceType || '-'}</p>
                            <p className="mt-2 text-2xl font-bold text-purple-600">Rs. {pkg.price}</p>
                            <p className="text-sm text-muted-foreground">{pkg.description}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">No packages added yet.</p>
                )}
              </div>

              {/* Add-ons Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-lg font-bold text-gray-800">Add-on Services</h4>
                    <p className="text-sm text-gray-500">Optional services that can be added to the base service</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex items-center gap-2 text-blue-700 hover:text-blue-900 border-blue-200 hover:bg-blue-50"
                    onClick={() => setShowAddOnForm(!showAddOnForm)}
                  >
                    <PlusCircle className="w-4 h-4" /> Add Services
                  </Button>
                </div>
                {showAddOnForm && (
                  <div className="bg-linear-to-br from-blue-50 to-cyan-50 rounded-2xl shadow-md p-6 border-2 border-blue-200">
                    <h5 className="text-sm font-semibold text-gray-700 mb-4">New Add-on Details</h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Service Type for Add-on */}
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-gray-600">Service Type</Label>
                        <Input
                          type="text"
                          className="h-10 w-full"
                          value={newAddOn.serviceType || ""}
                          onChange={e => setNewAddOn({ ...newAddOn, serviceType: e.target.value })}
                          placeholder="e.g. Consultation, Surgery, etc."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-gray-600">Add-on ID</Label>
                        <Input
                          type="text"
                          className="h-10 w-full"
                          value={newAddOn.id}
                          onChange={e => setNewAddOn({ ...newAddOn, id: e.target.value })}
                          placeholder="Unique ID"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-gray-600">Add-on Name</Label>
                        <Input
                          type="text"
                          className="h-10 w-full"
                          value={newAddOn.name}
                          onChange={e => setNewAddOn({ ...newAddOn, name: e.target.value })}
                          placeholder="e.g. Nail Trimming"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-gray-600">Price (Rs.)</Label>
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
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-gray-600">Description</Label>
                        <Input
                          type="text"
                          className="h-10 w-full"
                          value={newAddOn.description}
                          onChange={e => setNewAddOn({ ...newAddOn, description: e.target.value })}
                          placeholder="Brief description"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-gray-600">Duration</Label>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            className="h-10 w-20"
                            value={newAddOn.durationDays}
                            onChange={e => setNewAddOn({ ...newAddOn, durationDays: e.target.value })}
                            min="0"
                            placeholder="Days"
                          />
                          <Input
                            type="number"
                            className="h-10 w-20"
                            value={newAddOn.durationHours}
                            onChange={e => setNewAddOn({ ...newAddOn, durationHours: e.target.value })}
                            min="0"
                            placeholder="Hours"
                          />
                          <Input
                            type="number"
                            className="h-10 w-20"
                            value={newAddOn.durationMinutes}
                            onChange={e => setNewAddOn({ ...newAddOn, durationMinutes: e.target.value })}
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
                        onClick={() => {
                          if (!newAddOn.name || !newAddOn.price) return;
                          setAddOns([...addOns, { ...newAddOn, status: newAddOn.status || "active" }]);
                          setNewAddOn({ id: "", name: "", price: "", description: "", durationDays: "", durationHours: "", durationMinutes: "", serviceType: "", status: "active" });
                          setShowAddOnForm(false);
                        }}
                      >
                        <PlusCircle className="w-4 h-4 mr-2" /> Add Add-on
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowAddOnForm(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
                {addOns.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {addOns.map((addon, idx) => (
                      <div
                        key={idx}
                        className="rounded-2xl border border-border/60 bg-card/60 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                      >
                        {editingAddOnIdx === idx ? (
                          <div className="space-y-2">
                            <Label className="text-xs font-semibold text-gray-600">Service Type</Label>
                            <Input
                              type="text"
                              className="h-10 w-full"
                              value={editingAddOn?.serviceType || ""}
                              onChange={e => setEditingAddOn({ ...(editingAddOn as AddOnService), serviceType: e.target.value })}
                              placeholder="e.g. Consultation, Surgery, etc."
                            />
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
                            <Label className="text-xs font-semibold text-gray-600">Duration</Label>
                            <div className="flex gap-2">
                              <Input
                                type="number"
                                className="h-10 w-20"
                                value={editingAddOn?.durationDays || ""}
                                onChange={e => setEditingAddOn({ ...(editingAddOn as AddOnService), durationDays: e.target.value })}
                                min="0"
                                placeholder="Days"
                              />
                              <Input
                                type="number"
                                className="h-10 w-20"
                                value={editingAddOn?.durationHours || ""}
                                onChange={e => setEditingAddOn({ ...(editingAddOn as AddOnService), durationHours: e.target.value })}
                                min="0"
                                placeholder="Hours"
                              />
                              <Input
                                type="number"
                                className="h-10 w-20"
                                value={editingAddOn?.durationMinutes || ""}
                                onChange={e => setEditingAddOn({ ...(editingAddOn as AddOnService), durationMinutes: e.target.value })}
                                min="0"
                                max="59"
                                placeholder="Minutes"
                              />
                            </div>
                            <div className="flex gap-2 mt-2">
                              <Button
                                type="button"
                                className="bg-blue-600 text-white hover:bg-blue-700 flex-1"
                                onClick={() => {
                                  if (!editingAddOn?.name || !editingAddOn?.price) return;
                                  setAddOns(addOns.map((a, i) => i === idx ? (editingAddOn as AddOnService) : a));
                                  setEditingAddOnIdx(null);
                                  setEditingAddOn(null);
                                }}
                              >
                                Save
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                  setEditingAddOnIdx(null);
                                  setEditingAddOn(null);
                                }}
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
                                  onClick={() => setAddOns(addOns.map((a, i) => i === idx ? { ...a, status: a.status === 'active' ? 'inactive' : 'active' } : a))}
                                >
                                  {addon.status === 'active' ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                </Button>
                                <Button size="icon" variant="outline" className="h-9 w-9 rounded-2xl" title="Edit"
                                  onClick={() => {
                                    setEditingAddOnIdx(idx);
                                    setEditingAddOn(addon);
                                  }}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="h-9 w-9 rounded-2xl text-rose-600"
                                  title="Remove"
                                  onClick={() => setAddOns(addOns.filter((_, i) => i !== idx))}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Service Type: {addon.serviceType || '-'}</p>
                            <p className="mt-2 text-2xl font-bold text-blue-600">Rs. {addon.price}</p>
                            <p className="text-sm text-muted-foreground">{addon.description}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">No add-ons added yet.</p>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default AddService;

