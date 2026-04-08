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
import { Car, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Vehicle, backendInterface } from "../backend";

interface Props {
  actor: backendInterface;
}

export default function Vehicles({ actor }: Props) {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<{
    index: number;
    vehicle: Vehicle;
  } | null>(null);
  const [form, setForm] = useState({
    brand: "",
    model: "",
    year: "",
    licensePlate: "",
    vin: "",
    notes: "",
  });

  const { data: vehicles = [], isLoading } = useQuery<Vehicle[]>({
    queryKey: ["allVehicles"],
    queryFn: () => actor.getAllVehicles(),
  });

  const createMutation = useMutation({
    mutationFn: (v: Vehicle) => actor.createVehicle(v),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allVehicles"] });
      toast.success("Vehículo registrado");
      setDialogOpen(false);
    },
    onError: () => toast.error("Error al registrar vehículo"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, v }: { id: bigint; v: Vehicle }) =>
      actor.updateVehicle(id, v),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allVehicles"] });
      toast.success("Vehículo actualizado");
      setDialogOpen(false);
      setEditTarget(null);
    },
    onError: () => toast.error("Error al actualizar"),
  });

  const deleteMutation = useMutation({
    mutationFn: (index: number) => actor.deleteVehicle(BigInt(index)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allVehicles"] });
      toast.success("Vehículo eliminado");
    },
    onError: () => toast.error("Error al eliminar"),
  });

  const openCreate = () => {
    setForm({
      brand: "",
      model: "",
      year: new Date().getFullYear().toString(),
      licensePlate: "",
      vin: "",
      notes: "",
    });
    setEditTarget(null);
    setDialogOpen(true);
  };

  const openEdit = (index: number, vehicle: Vehicle) => {
    setForm({
      brand: vehicle.brand,
      model: vehicle.model,
      year: Number(vehicle.year).toString(),
      licensePlate: vehicle.licensePlate,
      vin: vehicle.vin,
      notes: vehicle.notes,
    });
    setEditTarget({ index, vehicle });
    setDialogOpen(true);
  };

  const handleSave = () => {
    const vehicleData: Vehicle = {
      brand: form.brand,
      model: form.model,
      year: BigInt(Number.parseInt(form.year) || 2024),
      licensePlate: form.licensePlate,
      vin: form.vin,
      notes: form.notes,
      clientId: editTarget?.vehicle.clientId ?? 0n,
    };
    if (editTarget) {
      updateMutation.mutate({ id: BigInt(editTarget.index), v: vehicleData });
    } else {
      createMutation.mutate(vehicleData);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Vehículos</h1>
        <Button type="button" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" /> Registrar Vehículo
        </Button>
      </div>

      <Card className="shadow-xs">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground">
              Cargando...
            </div>
          ) : vehicles.length === 0 ? (
            <div className="py-12 text-center">
              <Car className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">
                No hay vehículos registrados.
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 text-muted-foreground">
                  <th className="text-left px-5 py-3 font-medium">
                    Marca / Modelo
                  </th>
                  <th className="text-left px-4 py-3 font-medium">Año</th>
                  <th className="text-left px-4 py-3 font-medium">Placa</th>
                  <th className="text-left px-4 py-3 font-medium">VIN</th>
                  <th className="text-right px-5 py-3 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.map((v, i) => (
                  <tr
                    key={
                      v.licensePlate ||
                      `${v.brand}-${v.model}-${String(v.year)}`
                    }
                    className="border-t border-border hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-5 py-3 font-medium">
                      {v.brand} {v.model}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {Number(v.year)}
                    </td>
                    <td className="px-4 py-3">{v.licensePlate}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs font-mono">
                      {v.vin || "-"}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex gap-1 justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => openEdit(i, v)}
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
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>
              {editTarget ? "Editar Vehículo" : "Registrar Vehículo"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="grid gap-1.5">
              <Label>Marca</Label>
              <Input
                placeholder="Toyota"
                value={form.brand}
                onChange={(e) => setForm({ ...form, brand: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Modelo</Label>
              <Input
                placeholder="Corolla"
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Año</Label>
              <Input
                type="number"
                placeholder="2020"
                value={form.year}
                onChange={(e) => setForm({ ...form, year: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Placa</Label>
              <Input
                placeholder="ABC-123"
                value={form.licensePlate}
                onChange={(e) =>
                  setForm({ ...form, licensePlate: e.target.value })
                }
              />
            </div>
            <div className="col-span-2 grid gap-1.5">
              <Label>Número de serie (VIN)</Label>
              <Input
                placeholder="1HGCM82633A004352"
                value={form.vin}
                onChange={(e) => setForm({ ...form, vin: e.target.value })}
              />
            </div>
            <div className="col-span-2 grid gap-1.5">
              <Label>Notas</Label>
              <Textarea
                placeholder="Notas del vehículo..."
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
    </div>
  );
}
