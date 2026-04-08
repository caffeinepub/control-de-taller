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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2, User } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Client, backendInterface } from "../backend";

interface Props {
  actor: backendInterface;
}

export default function Clients({ actor }: Props) {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<{
    index: number;
    client: Client;
  } | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "" });

  const { data: clients = [], isLoading } = useQuery<Client[]>({
    queryKey: ["allClients"],
    queryFn: () => actor.getAllClients(),
  });

  const createMutation = useMutation({
    mutationFn: () => actor.createClient(form.name, form.phone, form.email),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allClients"] });
      toast.success("Cliente creado");
      setDialogOpen(false);
    },
    onError: () => toast.error("Error al crear el cliente"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, client }: { id: bigint; client: Client }) =>
      actor.updateClient(id, client),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allClients"] });
      toast.success("Cliente actualizado");
      setDialogOpen(false);
      setEditTarget(null);
    },
    onError: () => toast.error("Error al actualizar"),
  });

  const deleteMutation = useMutation({
    mutationFn: (index: number) => actor.deleteClient(BigInt(index)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allClients"] });
      toast.success("Cliente eliminado");
    },
    onError: () => toast.error("Error al eliminar"),
  });

  const openCreate = () => {
    setForm({ name: "", phone: "", email: "" });
    setEditTarget(null);
    setDialogOpen(true);
  };

  const openEdit = (index: number, client: Client) => {
    setForm({ name: client.name, phone: client.phone, email: client.email });
    setEditTarget({ index, client });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (editTarget) {
      const now = BigInt(Date.now()) * BigInt(1_000_000);
      updateMutation.mutate({
        id: BigInt(editTarget.index),
        client: { ...form, createdAt: editTarget.client.createdAt ?? now },
      });
    } else {
      createMutation.mutate();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Clientes</h1>
        <Button type="button" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" /> Nuevo Cliente
        </Button>
      </div>

      <Card className="shadow-xs">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground">
              Cargando...
            </div>
          ) : clients.length === 0 ? (
            <div className="py-12 text-center">
              <User className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">
                No hay clientes registrados.
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 text-muted-foreground">
                  <th className="text-left px-5 py-3 font-medium">Nombre</th>
                  <th className="text-left px-4 py-3 font-medium">Teléfono</th>
                  <th className="text-left px-4 py-3 font-medium">Correo</th>
                  <th className="text-right px-5 py-3 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client, i) => (
                  <tr
                    key={`${client.name}-${client.phone}`}
                    className="border-t border-border hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-5 py-3 font-medium">{client.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {client.phone}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {client.email}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex gap-1 justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => openEdit(i, client)}
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
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>
              {editTarget ? "Editar Cliente" : "Nuevo Cliente"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-1.5">
              <Label>Nombre completo</Label>
              <Input
                placeholder="Juan Pérez"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Teléfono</Label>
              <Input
                placeholder="55 1234 5678"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Correo electrónico</Label>
              <Input
                type="email"
                placeholder="juan@email.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
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
