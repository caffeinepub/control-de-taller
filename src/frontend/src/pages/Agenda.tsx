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
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Calendar,
  CheckCircle,
  Clock,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Appointment, backendInterface } from "../backend";

interface Props {
  actor: backendInterface;
}

function formatDateTime(time: bigint): string {
  try {
    const date = new Date(Number(time) / 1_000_000);
    return date.toLocaleString("es-MX", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return "-";
  }
}

export default function Agenda({ actor }: Props) {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<{
    index: number;
    appointment: Appointment;
  } | null>(null);
  const [form, setForm] = useState({
    description: "",
    date: "",
    time: "09:00",
    confirmed: false,
  });

  const { data: appointments = [], isLoading } = useQuery<Appointment[]>({
    queryKey: ["allAppointments"],
    queryFn: () => actor.getAllAppointments(),
  });

  const createMutation = useMutation({
    mutationFn: (a: Appointment) => actor.createAppointment(a),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allAppointments"] });
      toast.success("Cita agendada");
      setDialogOpen(false);
    },
    onError: () => toast.error("Error al agendar la cita"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, a }: { id: bigint; a: Appointment }) =>
      actor.updateAppointment(id, a),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allAppointments"] });
      toast.success("Cita actualizada");
      setDialogOpen(false);
      setEditTarget(null);
    },
    onError: () => toast.error("Error al actualizar"),
  });

  const deleteMutation = useMutation({
    mutationFn: (index: number) => actor.deleteAppointment(BigInt(index)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allAppointments"] });
      toast.success("Cita eliminada");
    },
    onError: () => toast.error("Error al eliminar"),
  });

  const openCreate = () => {
    const today = new Date().toISOString().split("T")[0];
    setForm({ description: "", date: today, time: "09:00", confirmed: false });
    setEditTarget(null);
    setDialogOpen(true);
  };

  const openEdit = (index: number, appointment: Appointment) => {
    const d = new Date(Number(appointment.date) / 1_000_000);
    setForm({
      description: appointment.description,
      date: d.toISOString().split("T")[0],
      time: d.toTimeString().slice(0, 5),
      confirmed: appointment.confirmed,
    });
    setEditTarget({ index, appointment });
    setDialogOpen(true);
  };

  const handleSave = () => {
    const dateMs = new Date(`${form.date}T${form.time}`).getTime();
    const appData: Appointment = {
      description: form.description,
      date: BigInt(dateMs) * BigInt(1_000_000),
      confirmed: form.confirmed,
      clientId: editTarget?.appointment.clientId ?? 0n,
      vehicleId: editTarget?.appointment.vehicleId ?? 0n,
    };
    if (editTarget) {
      updateMutation.mutate({ id: BigInt(editTarget.index), a: appData });
    } else {
      createMutation.mutate(appData);
    }
  };

  const sorted = [...appointments].sort((a, b) => Number(a.date - b.date));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Agenda</h1>
        <Button type="button" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" /> Nueva Cita
        </Button>
      </div>

      <Card className="shadow-xs">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground">
              Cargando...
            </div>
          ) : sorted.length === 0 ? (
            <div className="py-12 text-center">
              <Calendar className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No hay citas programadas.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 text-muted-foreground">
                  <th className="text-left px-5 py-3 font-medium">
                    Descripción
                  </th>
                  <th className="text-left px-4 py-3 font-medium">
                    Fecha y Hora
                  </th>
                  <th className="text-left px-4 py-3 font-medium">Estado</th>
                  <th className="text-right px-5 py-3 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((app, i) => (
                  <tr
                    key={`${app.description}-${String(app.date)}`}
                    className="border-t border-border hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-5 py-3 font-medium">{app.description}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDateTime(app.date)}
                    </td>
                    <td className="px-4 py-3">
                      {app.confirmed ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                          <CheckCircle className="w-3 h-3" /> Confirmada
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                          <Clock className="w-3 h-3" /> Pendiente
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex gap-1 justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => openEdit(i, app)}
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
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>
              {editTarget ? "Editar Cita" : "Nueva Cita"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-1.5">
              <Label>Descripción</Label>
              <Textarea
                placeholder="Revisión general, cambio de aceite..."
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label>Fecha</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Hora</Label>
                <Input
                  type="time"
                  value={form.time}
                  onChange={(e) => setForm({ ...form, time: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="confirmed"
                checked={form.confirmed}
                onChange={(e) =>
                  setForm({ ...form, confirmed: e.target.checked })
                }
                className="rounded border-border"
              />
              <Label htmlFor="confirmed" className="cursor-pointer">
                Cita confirmada
              </Label>
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
    </div>
  );
}
