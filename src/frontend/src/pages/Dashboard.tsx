import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Calendar,
  Car,
  CheckCircle,
  ClipboardList,
  FileText,
  Wrench,
} from "lucide-react";
import type { WorkOrder, backendInterface } from "../backend";
import { WorkOrderStatus } from "../backend";
import { statusColor, statusLabel } from "../lib/statusUtils";

type Page = string;

interface DashboardProps {
  actor: backendInterface;
  onNavigate: (page: Page) => void;
}

export default function Dashboard({ actor, onNavigate }: DashboardProps) {
  const { data: activeJobs = 0n } = useQuery({
    queryKey: ["activeJobs"],
    queryFn: () => actor.getActiveJobsCount(),
  });

  const { data: vehiclesInShop = 0n } = useQuery({
    queryKey: ["vehiclesInShop"],
    queryFn: () => actor.getVehiclesInShop(),
  });

  const { data: workOrders = [] } = useQuery<WorkOrder[]>({
    queryKey: ["allWorkOrders"],
    queryFn: () => actor.getAllWorkOrders(),
  });

  const { data: lowStockParts = [] } = useQuery({
    queryKey: ["lowStockParts"],
    queryFn: () => actor.getPartsBelowMinStock(),
  });

  const { data: todayApps = [] } = useQuery({
    queryKey: ["todayAppointments"],
    queryFn: () => actor.getTodayAppointments(),
  });

  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();

  const completedThisMonth = workOrders.filter((wo) => {
    const date = new Date(Number(wo.createdAt) / 1_000_000);
    return (
      wo.status === WorkOrderStatus.completed &&
      date.getMonth() === thisMonth &&
      date.getFullYear() === thisYear
    );
  }).length;

  const pendingCount = workOrders.filter(
    (wo) => wo.status === WorkOrderStatus.pending,
  ).length;

  const recentOrders = workOrders.slice(0, 5);

  const kpis = [
    {
      label: "Trabajos Activos",
      value: Number(activeJobs).toString(),
      icon: Wrench,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
    },
    {
      label: "Vehículos en Taller",
      value: Number(vehiclesInShop).toString(),
      icon: Car,
      iconBg: "bg-indigo-100",
      iconColor: "text-indigo-600",
    },
    {
      label: "Cotizaciones Pendientes",
      value: pendingCount.toString(),
      icon: FileText,
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
    },
    {
      label: "Órdenes del Mes",
      value: completedThisMonth.toString(),
      icon: CheckCircle,
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Resumen general de tu taller
          </p>
        </div>
        <Button type="button" onClick={() => onNavigate("workorders")}>
          <ClipboardList className="w-4 h-4 mr-2" />
          Nueva Orden de Trabajo
        </Button>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="shadow-xs">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">
                    {kpi.label}
                  </p>
                  <p className="text-3xl font-bold text-foreground mt-1">
                    {kpi.value}
                  </p>
                </div>
                <div className={`p-2.5 rounded-full ${kpi.iconBg}`}>
                  <kpi.icon className={`w-5 h-5 ${kpi.iconColor}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <Card className="shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">
                Órdenes Recientes
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {recentOrders.length === 0 ? (
                <div className="px-6 py-8 text-center text-muted-foreground text-sm">
                  No hay órdenes de trabajo aún.
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 text-muted-foreground">
                      <th className="text-left px-6 py-2.5 font-medium">
                        Descripción
                      </th>
                      <th className="text-left px-4 py-2.5 font-medium">
                        Técnico
                      </th>
                      <th className="text-left px-4 py-2.5 font-medium">
                        Estado
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((wo) => (
                      <tr
                        key={`${wo.description}-${String(wo.createdAt)}`}
                        className="border-t border-border hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-6 py-3 font-medium truncate max-w-[200px]">
                          {wo.description}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {wo.assignedTech || "-"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor(wo.status)}`}
                          >
                            {statusLabel(wo.status)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">
                Acciones Rápidas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <button
                type="button"
                onClick={() => onNavigate("workorders")}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border hover:bg-muted/50 transition-colors text-sm font-medium"
              >
                <ClipboardList className="w-4 h-4 text-primary" />
                Crear Orden de Trabajo
              </button>
              <button
                type="button"
                onClick={() => onNavigate("agenda")}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border hover:bg-muted/50 transition-colors text-sm font-medium"
              >
                <Calendar className="w-4 h-4 text-primary" />
                Agendar Cita
              </button>
              <button
                type="button"
                onClick={() => onNavigate("clients")}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border hover:bg-muted/50 transition-colors text-sm font-medium"
              >
                <Car className="w-4 h-4 text-primary" />
                Registrar Cliente
              </button>
            </CardContent>
          </Card>

          <Card className="shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">
                Citas de Hoy
              </CardTitle>
            </CardHeader>
            <CardContent>
              {todayApps.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Sin citas programadas hoy.
                </p>
              ) : (
                <div className="space-y-2">
                  {todayApps.map((app) => (
                    <div
                      key={`${app.description}-${String(app.date)}`}
                      className="text-sm p-2 rounded-lg bg-muted/40"
                    >
                      <p className="font-medium">{app.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {lowStockParts.length > 0 && (
            <Card className="shadow-xs border-amber-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Alertas de Inventario
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1.5">
                  {lowStockParts.map((part) => (
                    <div
                      key={part.partNumber || part.name}
                      className="text-sm flex justify-between"
                    >
                      <span className="text-foreground">{part.name}</span>
                      <span className="text-destructive font-medium">
                        Stock bajo: {Number(part.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
