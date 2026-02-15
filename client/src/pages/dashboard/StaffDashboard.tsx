import React, { useEffect, useState } from "react";
import PageTitle from "@/components/common/PageTitle";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, ShoppingCart, Users, AlertTriangle } from "lucide-react";
import { apiGet } from "@/lib/api";
import { useNavigate } from "react-router-dom";

const StaffDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [kpis, setKpis] = useState({
    todayAppointments: 0,
    todaySales: 0,
    totalClients: 0,
    lowStock: 0,
    loading: true,
  });

  type KpisResponse = {
    data: {
      kpis?: {
        appointmentsToday?: number;
        todaySales?: number;
        totalClients?: number;
        lowStockItems?: number;
      };
    };
  };

  useEffect(() => {
    let mounted = true;
    async function fetchKpis() {
      try {
        setKpis((prev) => ({ ...prev, loading: true }));
        const res: KpisResponse = await apiGet("/api/dashboard/summary");
        if (!mounted) return;
        setKpis({
          todayAppointments: res.data?.kpis?.appointmentsToday || 0,
          todaySales: res.data?.kpis?.todaySales || 0,
          totalClients: res.data?.kpis?.totalClients || 0,
          lowStock: res.data?.kpis?.lowStockItems || 0,
          loading: false,
        });
      } catch {
        setKpis((prev) => ({ ...prev, loading: false }));
      }
    }
    fetchKpis();
    return () => { mounted = false; };
  }, []);

  return (
    <>
      <PageTitle title="Dashboard" subtitle="Quick access to daily tasks and key information." />
      <div className="space-y-8 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <Card className="brand-card brand-card-hover bg-linear-to-r from-[#6a11cb] to-[#2575fc] text-white">
            <CardContent className="p-6 flex flex-col gap-2 items-start">
              <div className="rounded-2xl bg-white/20 p-2 text-white mb-2">
                <Calendar className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold">Today's Appointments</h3>
              <p className="text-2xl font-mono font-bold">{kpis.loading ? '--' : kpis.todayAppointments}</p>
              <p className="text-xs">View and manage your schedule</p>
              <Button variant="outline" className="mt-2 border-white text-black hover:bg-white/10" size="sm" onClick={() => navigate("/appointments/calendar")}>Go to Appointments</Button>
            </CardContent>
          </Card>
          <Card className="brand-card brand-card-hover bg-linear-to-r from-[#00b09b] to-[#96c93d] text-white">
            <CardContent className="p-6 flex flex-col gap-2 items-start">
              <div className="rounded-2xl bg-white/20 p-2 text-white mb-2">
                <ShoppingCart className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold">Sales Today</h3>
              <p className="text-2xl font-mono font-bold">{kpis.loading ? '--' : kpis.todaySales}</p>
              <p className="text-xs">Record and review sales</p>
              <Button variant="outline" className="mt-2 border-white text-black hover:bg-white/10" size="sm" onClick={() => navigate("/sales/new")}>New Sale</Button>
            </CardContent>
          </Card>
          <Card className="brand-card brand-card-hover bg-linear-to-r from-[#ff512f] to-[#dd2476] text-white">
            <CardContent className="p-6 flex flex-col gap-2 items-start">
              <div className="rounded-2xl bg-white/20 p-2 text-white mb-2">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold">Clients & Pets</h3>
              <p className="text-2xl font-mono font-bold">{kpis.loading ? '--' : kpis.totalClients}</p>
              <p className="text-xs">Access client and pet info</p>
              <Button variant="outline" className="mt-2 border-white text-black hover:bg-white/10" size="sm" onClick={() => navigate("/clients/list")}>View Clients</Button>
            </CardContent>
          </Card>
          <Card className="brand-card brand-card-hover bg-linear-to-r from-[#f7971e] to-[#ffd200] text-white">
            <CardContent className="p-6 flex flex-col gap-2 items-start">
              <div className="rounded-2xl bg-white/20 p-2 text-white mb-2">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold">Low Stock</h3>
              <p className="text-2xl font-mono font-bold">{kpis.loading ? '--' : kpis.lowStock}</p>
              <p className="text-xs">Monitor items needing restock</p>
              <Button variant="outline" className="mt-2 border-white text-black hover:bg-white/10" size="sm" onClick={() => navigate("/purchases/low")}>View Low Stock</Button>
            </CardContent>
          </Card>
        </div>
        {/* Add more staff-specific widgets or quick links here */}
      </div>
    </>
  );
};

export default StaffDashboard;
