import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { WorkOrder, backendInterface } from "../backend";
import { WorkOrderStatus } from "../backend";
import { statusColor, statusLabel } from "../lib/statusUtils";

interface Props {
  actor: backendInterface;
}

const ALL_STATUSES = Object.values(WorkOrderStatus);

export default function WorkOrders({ actor }: Props) {
  const qc = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<{
    index: number;
    wo: WorkOrder;
  } | null>(null);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [statusTarget, setStatusTarget] = useState<{
    index: number;
    current: WorkOrderStatus;
  } | null>(null);

  const [form, setForm] = useState({
    description: "",
    assignedTech: "",
    notes: "",
    totalCost: "0",
  });

  const { data: workOrders = [], isLoading } = useQuery<WorkOrder[]>({
    queryKey: ["allWorkOrders"],
    queryFn: () => actor.getAllWorkOrders(),
  });

  const createMutation = useMutation({
    mutationFn: (wo: WorkOrder) => actor.createWorkOrder(wo),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allWorkOrders"] });
      toast.success("Orden creada");
      setDialogOpen(false);
    },
    onError: () => toast.error("Error al crear la orden"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, wo }: { id: bigint; wo: WorkOrder }) =>
      actor.updateWorkOrder(id, wo),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allWorkOrders"] });
      toast.success("Orden actualizada");
      setDialogOpen(false);
      setEditTarget(null);
    },
    onError: () => toast.error("Error al actualizar"),
  });

  const deleteMutation = useMutation({
    mutationFn: (index: number) => actor.deleteWorkOrder(BigInt(index)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allWorkOrders"] });
      toast.success("Orden eliminada");
    },
    onError: () => toast.error("Error al eliminar"),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: bigint; status: WorkOrderStatus }) =>
      actor.updateWorkOrderStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allWorkOrders"] });
      toast.success("Estado actualizado");
      setStatusDialogOpen(false);
    },
    onError: () => toast.error("Error al actualizar estado"),
  });

  const openCreate = () => {
    setForm({ description: "", assignedTech: "", notes: "", totalCost: "0" });
    setEditTarget(null);
    setDialogOpen(true);
  };

  const openEdit = (index: number, wo: WorkOrder) => {
    setForm({
      description: wo.description,
      assignedTech: wo.assignedTech,
      notes: wo.notes,
      totalCost: Number(wo.totalCost).toString(),
    });
    setEditTarget({ index, wo });
    setDialogOpen(true);
  };

  const handleSave = () => {
    const now = BigInt(Date.now()) * BigInt(1_000_000);
    const base = editTarget?.wo ?? workOrders[0];
    const wo: WorkOrder = {
      clientId: base?.clientId ?? 0n,
      vehicleId: base?.vehicleId ?? 0n,
      description: form.description,
      assignedTech: form.assignedTech,
      notes: form.notes,
      status: editTarget?.wo.status ?? WorkOrderStatus.pending,
      createdAt: editTarget?.wo.createdAt ?? now,
      totalCost: BigInt(Math.round(Number.parseFloat(form.totalCost) * 100)),
    };
    if (editTarget) {
      updateMutation.mutate({ id: BigInt(editTarget.index), wo });
    } else {
      createMutation.mutate(wo);
    }
  };

  const filtered =
    filterStatus === "all"
      ? workOrders
      : workOrders.filter((wo) => wo.status === filterStatus);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Órdenes de Trabajo</h1>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" /> Nueva Orden
        </Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button
          type="button"
          variant={filterStatus === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterStatus("all")}
        >
          Todas
        </Button>
        {ALL_STATUSES.map((s) => (
          <Button
            key={s}
            type="button"
            variant={filterStatus === s ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterStatus(s)}
          >
            {statusLabel(s)}
          </Button>
        ))}
      </div>

      <Card className="shadow-xs">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground">
              Cargando...
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No hay órdenes. ¡Crea la primera!
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 text-muted-foreground">
                  <th className="text-left px-5 py-3 font-medium">
                    Descripción
                  </th>
                  <th className="text-left px-4 py-3 font-medium">Técnico</th>
                  <th className="text-left px-4 py-3 font-medium">Estado</th>
                  <th className="text-left px-4 py-3 font-medium">Costo</th>
                  <th className="text-right px-5 py-3 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((wo, i) => (
                  <tr
                    key={`${wo.description}-${String(wo.createdAt)}`}
                    className="border-t border-border hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-5 py-3 font-medium">{wo.description}</td>
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
                    <td className="px-4 py-3 text-muted-foreground">
                      ${(Number(wo.totalCost) / 100).toFixed(2)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex gap-1 justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => {
                            setStatusTarget({ index: i, current: wo.status });
                            setStatusDialogOpen(true);
                          }}
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => openEdit(i, wo)}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => deleteMutation.mutate(i)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editTarget ? "Editar Orden" : "Nueva Orden de Trabajo"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-1.5">
              <Label>Descripción del trabajo</Label>
              <Textarea
                placeholder="Ej. Cambio de aceite y filtros..."
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                rows={3}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Técnico asignado</Label>
              <Input
                placeholder="Nombre del técnico"
                value={form.assignedTech}
                onChange={(e) =>
                  setForm({ ...form, assignedTech: e.target.value })
                }
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Costo total (MXN)</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={form.totalCost}
                onChange={(e) =>
                  setForm({ ...form, totalCost: e.target.value })
                }
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Notas</Label>
              <Textarea
                placeholder="Notas adicionales..."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending
                ? "Guardando..."
                : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent className="sm:max-w-[350px]">
          <DialogHeader>
            <DialogTitle>Actualizar Estado</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label>Nuevo estado</Label>
            <Select
              value={statusTarget?.current}
              onValueChange={(val) => {
                if (statusTarget) {
                  updateStatusMutation.mutate({
                    id: BigInt(statusTarget.index),
                    status: val as WorkOrderStatus,
                  });
                }
              }}
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {statusLabel(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
