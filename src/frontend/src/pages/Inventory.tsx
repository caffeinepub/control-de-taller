import { Badge } from "@/components/ui/badge";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  History,
  Package,
  Pencil,
  Plus,
  ShoppingCart,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type {
  Part,
  PartEntry,
  StockMovement,
  UUID,
  backendInterface as backendInterfaceExtended,
} from "../backend.d";

interface Props {
  actor: backendInterfaceExtended;
}

function formatTimestamp(ts: bigint): string {
  return new Date(Number(ts / 1_000_000n)).toLocaleString("es-MX");
}

// Wrapper to avoid biome's useHookAtTopLevel false positive on actor.useStock
function consumePartStock(
  actor: backendInterfaceExtended,
  id: UUID,
  qty: bigint,
  reason: string,
) {
  // biome-ignore lint/correctness/useHookAtTopLevel: actor.useStock is not a React hook
  return actor.useStock(id, qty, reason, "Manual");
}

export default function Inventory({ actor }: Props) {
  const qc = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<{
    id: bigint | null;
    part: Part;
  } | null>(null);

  const [form, setForm] = useState({
    name: "",
    partNumber: "",
    quantity: "0",
    minStock: "5",
    unitCost: "0",
    category: "",
    description: "",
    location: "",
  });

  const [stockModal, setStockModal] = useState<{
    open: boolean;
    mode: "add" | "use";
    partId: bigint | null;
    partNumber: string;
    partName: string;
  }>({
    open: false,
    mode: "add",
    partId: null,
    partNumber: "",
    partName: "",
  });
  const [stockQty, setStockQty] = useState("1");
  const [stockReason, setStockReason] = useState("");

  // Lista de compra: set de IDs (como string) marcados para comprar
  const [shoppingList, setShoppingList] = useState<Set<string>>(new Set());
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(
    new Set(),
  );

  const { data: entries = [], isLoading } = useQuery<PartEntry[]>({
    queryKey: ["allPartsWithIds"],
    queryFn: () => actor.getAllPartsWithIds(),
  });

  const { data: movements = [], isLoading: movementsLoading } = useQuery<
    StockMovement[]
  >({
    queryKey: ["allMovements"],
    queryFn: () => actor.getAllMovements(),
  });

  // Build map: id string -> part name  (for history rendering)
  const partNameByIdStr = new Map<string, string>();
  for (const entry of entries) {
    partNameByIdStr.set(entry.id.toString(), entry.part.name);
  }

  const createMutation = useMutation({
    mutationFn: (p: Part) => actor.createPart(p),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allPartsWithIds"] });
      toast.success("Parte registrada");
      setDialogOpen(false);
    },
    onError: () => toast.error("Error al registrar parte"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, p }: { id: bigint; p: Part }) => actor.updatePart(id, p),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allPartsWithIds"] });
      toast.success("Parte actualizada");
      setDialogOpen(false);
      setEditTarget(null);
    },
    onError: () => toast.error("Error al actualizar"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: bigint) => actor.deletePart(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allPartsWithIds"] });
      toast.success("Parte eliminada");
    },
    onError: () => toast.error("Error al eliminar"),
  });

  const addStockMutation = useMutation({
    mutationFn: ({
      id,
      qty,
      reason,
    }: {
      id: bigint;
      qty: bigint;
      reason: string;
    }) => actor.addStock(id, qty, reason, "Manual"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allPartsWithIds"] });
      qc.invalidateQueries({ queryKey: ["allMovements"] });
      toast.success("Stock agregado");
      setStockModal((m) => ({ ...m, open: false }));
    },
    onError: () => toast.error("Error al agregar stock"),
  });

  const stockConsumeMutation = useMutation({
    mutationFn: ({
      id,
      qty,
      reason,
    }: {
      id: bigint;
      qty: bigint;
      reason: string;
    }) => consumePartStock(actor, id, qty, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allPartsWithIds"] });
      qc.invalidateQueries({ queryKey: ["allMovements"] });
      toast.success("Stock descontado");
      setStockModal((m) => ({ ...m, open: false }));
    },
    onError: () => toast.error("Error al descontar stock"),
  });

  const openCreate = () => {
    setForm({
      name: "",
      partNumber: "",
      quantity: "0",
      minStock: "5",
      unitCost: "0",
      category: "",
      description: "",
      location: "",
    });
    setEditTarget(null);
    setDialogOpen(true);
  };

  const openEdit = (part: Part, id: bigint | null) => {
    setForm({
      name: part.name,
      partNumber: part.partNumber,
      quantity: Number(part.quantity).toString(),
      minStock: Number(part.minStock).toString(),
      unitCost: Number(part.unitCost).toString(),
      category: part.category,
      description: part.description ?? "",
      location: part.location ?? "",
    });
    setEditTarget({ id, part });
    setDialogOpen(true);
  };

  const handleSave = () => {
    const partData: Part = {
      name: form.name,
      partNumber: form.partNumber,
      quantity: BigInt(Number.parseInt(form.quantity) || 0),
      minStock: BigInt(Number.parseInt(form.minStock) || 0),
      unitCost: BigInt(Math.round(Number.parseFloat(form.unitCost) * 100)),
      category: form.category,
      description: form.description,
      location: form.location,
    };
    if (editTarget && editTarget.id !== null) {
      updateMutation.mutate({ id: editTarget.id, p: partData });
    } else {
      createMutation.mutate(partData);
    }
  };

  const openStockModal = (mode: "add" | "use", entry: PartEntry) => {
    setStockModal({
      open: true,
      mode,
      partId: entry.id,
      partNumber: entry.part.partNumber,
      partName: entry.part.name,
    });
    setStockQty("1");
    setStockReason("");
  };

  const handleStockSubmit = () => {
    if (!stockModal.partId) {
      toast.error("ID de pieza no disponible");
      return;
    }
    const qty = BigInt(Number.parseInt(stockQty) || 0);
    if (qty <= 0n) {
      toast.error("La cantidad debe ser mayor a 0");
      return;
    }
    if (stockModal.mode === "add") {
      addStockMutation.mutate({
        id: stockModal.partId,
        qty,
        reason: stockReason,
      });
    } else {
      stockConsumeMutation.mutate({
        id: stockModal.partId,
        qty,
        reason: stockReason,
      });
    }
  };

  // Piezas con stock bajo (cantidad <= minStock y minStock > 0)
  const lowStock = entries.filter(
    (e) => Number(e.part.minStock) > 0 && e.part.quantity <= e.part.minStock,
  );

  // Alertas visibles: bajo stock y no descartadas
  const visibleAlerts = lowStock.filter(
    (e) => !dismissedAlerts.has(e.id.toString()),
  );

  const addToShoppingList = (idStr: string) => {
    setShoppingList((prev) => new Set([...prev, idStr]));
    setDismissedAlerts((prev) => new Set([...prev, idStr]));
    toast.success("Agregado a la lista de compra");
  };

  const removeFromShoppingList = (idStr: string) => {
    setShoppingList((prev) => {
      const next = new Set(prev);
      next.delete(idStr);
      return next;
    });
  };

  const dismissAlert = (idStr: string) => {
    setDismissedAlerts((prev) => new Set([...prev, idStr]));
  };

  // Entradas de la lista de compra
  const shoppingListEntries = entries.filter((e) =>
    shoppingList.has(e.id.toString()),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inventario</h1>
          {lowStock.length > 0 && (
            <p className="text-sm text-amber-600 flex items-center gap-1 mt-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              {lowStock.length} parte(s) con stock bajo
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {shoppingListEntries.length > 0 && (
            <Button
              type="button"
              variant="outline"
              className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50"
              onClick={() => {
                // Mostrar modal lista de compra
                const names = shoppingListEntries
                  .map(
                    (e) =>
                      `• ${e.part.name}${
                        e.part.partNumber ? ` (${e.part.partNumber})` : ""
                      } — necesitas min ${Number(e.part.minStock)}, tienes ${Number(e.part.quantity)}`,
                  )
                  .join("\n");
                alert(`Lista de compra:\n\n${names}`);
              }}
            >
              <ShoppingCart className="w-4 h-4" />
              Lista de compra ({shoppingListEntries.length})
            </Button>
          )}
          <Button
            type="button"
            data-ocid="inventory.primary_button"
            onClick={openCreate}
          >
            <Plus className="w-4 h-4 mr-2" /> Agregar Parte
          </Button>
        </div>
      </div>

      {/* Alertas de stock bajo */}
      {visibleAlerts.length > 0 && (
        <div className="space-y-2">
          {visibleAlerts.map((entry) => {
            const idStr = entry.id.toString();
            const inList = shoppingList.has(idStr);
            return (
              <div
                key={idStr}
                className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  <span className="font-medium text-amber-900 truncate">
                    {entry.part.name}
                  </span>
                  <span className="text-amber-600 whitespace-nowrap">
                    — quedan <strong>{Number(entry.part.quantity)}</strong>,
                    mínimo <strong>{Number(entry.part.minStock)}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {inList ? (
                    <span className="flex items-center gap-1 text-xs text-emerald-700 font-medium">
                      <ShoppingCart className="w-3.5 h-3.5" /> En lista
                    </span>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      className="h-7 text-xs gap-1 bg-amber-600 hover:bg-amber-700 text-white"
                      onClick={() => addToShoppingList(idStr)}
                    >
                      <ShoppingCart className="w-3 h-3" /> Añadir para comprar
                    </Button>
                  )}
                  <button
                    type="button"
                    className="text-amber-400 hover:text-amber-600"
                    onClick={() => dismissAlert(idStr)}
                    aria-label="Cerrar alerta"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lista de compra detallada (si tiene items) */}
      {shoppingListEntries.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/40">
          <CardContent className="py-4 px-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-amber-800 flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" /> Lista de compra
              </h2>
              <button
                type="button"
                className="text-xs text-amber-600 hover:underline"
                onClick={() => setShoppingList(new Set())}
              >
                Limpiar lista
              </button>
            </div>
            <ul className="space-y-1">
              {shoppingListEntries.map((entry) => {
                const idStr = entry.id.toString();
                const needed =
                  Number(entry.part.minStock) - Number(entry.part.quantity);
                return (
                  <li
                    key={idStr}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-amber-900">
                      <strong>{entry.part.name}</strong>
                      {entry.part.partNumber && (
                        <span className="text-amber-600 font-mono text-xs ml-1">
                          ({entry.part.partNumber})
                        </span>
                      )}
                      <span className="text-amber-600 ml-2">
                        — comprar al menos{" "}
                        <strong>{needed > 0 ? needed : 1}</strong> unidad(es)
                      </span>
                    </span>
                    <button
                      type="button"
                      className="text-amber-400 hover:text-red-500 ml-3"
                      onClick={() => removeFromShoppingList(idStr)}
                      aria-label="Quitar de lista"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="parts">
        <TabsList data-ocid="inventory.tab">
          <TabsTrigger value="parts">
            <Package className="w-4 h-4 mr-1.5" /> Piezas
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="w-4 h-4 mr-1.5" /> Historial
          </TabsTrigger>
        </TabsList>

        <TabsContent value="parts" className="mt-4">
          <Card className="shadow-xs">
            <CardContent className="p-0">
              {isLoading ? (
                <div
                  className="py-12 text-center text-muted-foreground"
                  data-ocid="inventory.loading_state"
                >
                  Cargando...
                </div>
              ) : entries.length === 0 ? (
                <div
                  className="py-12 text-center"
                  data-ocid="inventory.empty_state"
                >
                  <Package className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    No hay partes en el inventario.
                  </p>
                  <Button
                    type="button"
                    className="mt-4"
                    data-ocid="inventory.empty_state.primary_button"
                    onClick={openCreate}
                  >
                    <Plus className="w-4 h-4 mr-2" /> Agregar primera parte
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50 text-muted-foreground">
                        <th className="text-left px-5 py-3 font-medium">
                          Nombre
                        </th>
                        <th className="text-left px-4 py-3 font-medium">
                          N Parte
                        </th>
                        <th className="text-left px-4 py-3 font-medium">
                          Categoria
                        </th>
                        <th className="text-left px-4 py-3 font-medium">
                          Ubicacion
                        </th>
                        <th className="text-left px-4 py-3 font-medium">
                          Cantidad
                        </th>
                        <th className="text-left px-4 py-3 font-medium">
                          Costo
                        </th>
                        <th className="text-right px-5 py-3 font-medium">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {entries.map((entry, i) => {
                        const { part, id } = entry;
                        const isLow =
                          Number(part.minStock) > 0 &&
                          part.quantity <= part.minStock;
                        const rowIndex = i + 1;
                        const idStr = id.toString();
                        return (
                          <tr
                            key={idStr}
                            data-ocid={`inventory.item.${rowIndex}`}
                            className={`border-t border-border transition-colors ${
                              isLow ? "bg-amber-50/50" : "hover:bg-muted/30"
                            }`}
                          >
                            <td className="px-5 py-3 font-medium">
                              <div className="flex flex-col gap-0.5">
                                <div className="flex items-center gap-1.5">
                                  {isLow && (
                                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                                  )}
                                  {part.name}
                                </div>
                                {part.description && (
                                  <span className="text-xs text-muted-foreground font-normal">
                                    {part.description}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                              {part.partNumber}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {part.category}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground text-xs">
                              {part.location || (
                                <span className="italic opacity-50">-</span>
                              )}
                            </td>
                            <td
                              className={`px-4 py-3 font-medium ${
                                isLow ? "text-amber-600" : ""
                              }`}
                            >
                              <div className="flex flex-col gap-0.5">
                                <span>
                                  {Number(part.quantity)}{" "}
                                  <span className="text-muted-foreground font-normal text-xs">
                                    / min {Number(part.minStock)}
                                  </span>
                                </span>
                                {isLow && !shoppingList.has(idStr) && (
                                  <button
                                    type="button"
                                    className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-800 font-medium"
                                    onClick={() => {
                                      addToShoppingList(idStr);
                                    }}
                                  >
                                    <ShoppingCart className="w-3 h-3" /> Añadir
                                    para comprar
                                  </button>
                                )}
                                {isLow && shoppingList.has(idStr) && (
                                  <span className="flex items-center gap-1 text-xs text-emerald-600">
                                    <ShoppingCart className="w-3 h-3" /> En
                                    lista
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              ${(Number(part.unitCost) / 100).toFixed(2)}
                            </td>
                            <td className="px-5 py-3">
                              <div className="flex gap-1 justify-end flex-wrap">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs gap-1 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                                  data-ocid={`inventory.item.${rowIndex}.button`}
                                  onClick={() => openStockModal("add", entry)}
                                >
                                  <ArrowUpCircle className="w-3 h-3" /> Agregar
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs gap-1 text-red-600 border-red-200 hover:bg-red-50"
                                  data-ocid={`inventory.item.${rowIndex}.delete_button`}
                                  onClick={() => openStockModal("use", entry)}
                                >
                                  <ArrowDownCircle className="w-3 h-3" />{" "}
                                  Descontar
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => openEdit(part, id)}
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive"
                                  onClick={() => deleteMutation.mutate(id)}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card className="shadow-xs">
            <CardContent className="p-0">
              {movementsLoading ? (
                <div
                  className="py-12 text-center text-muted-foreground"
                  data-ocid="inventory.history.loading_state"
                >
                  Cargando historial...
                </div>
              ) : movements.length === 0 ? (
                <div
                  className="py-12 text-center"
                  data-ocid="inventory.history.empty_state"
                >
                  <History className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    No hay movimientos registrados.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50 text-muted-foreground">
                        <th className="text-left px-5 py-3 font-medium">
                          Fecha
                        </th>
                        <th className="text-left px-4 py-3 font-medium">
                          Tipo
                        </th>
                        <th className="text-left px-4 py-3 font-medium">
                          Pieza
                        </th>
                        <th className="text-left px-4 py-3 font-medium">
                          Cantidad
                        </th>
                        <th className="text-left px-4 py-3 font-medium">
                          Motivo
                        </th>
                        <th className="text-left px-4 py-3 font-medium">
                          Referencia
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...movements]
                        .sort((a, b) => Number(b.timestamp - a.timestamp))
                        .map((mv, i) => {
                          const isEntry = mv.movementType.__kind__ === "entry";
                          const partName =
                            partNameByIdStr.get(mv.partId.toString()) ??
                            `ID: ${mv.partId}`;
                          return (
                            <tr
                              key={`${mv.partId}-${mv.timestamp}`}
                              data-ocid={`inventory.history.item.${i + 1}`}
                              className="border-t border-border hover:bg-muted/30"
                            >
                              <td className="px-5 py-3 text-muted-foreground text-xs">
                                {formatTimestamp(mv.timestamp)}
                              </td>
                              <td className="px-4 py-3">
                                <Badge
                                  className={`text-xs border ${
                                    isEntry
                                      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                                      : "bg-red-100 text-red-700 border-red-200"
                                  }`}
                                >
                                  {isEntry ? "Entrada" : "Salida"}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 font-medium">
                                {partName}
                              </td>
                              <td className="px-4 py-3 font-mono">
                                {Number(mv.quantity)}
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">
                                {mv.reason || "-"}
                              </td>
                              <td className="px-4 py-3 text-muted-foreground text-xs">
                                {mv.reference || "-"}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog: Agregar / Editar Parte */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          className="sm:max-w-[540px]"
          data-ocid="inventory.dialog"
        >
          <DialogHeader>
            <DialogTitle>
              {editTarget ? "Editar Parte" : "Agregar Parte al Inventario"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="col-span-2 grid gap-1.5">
              <Label>Nombre de la parte</Label>
              <Input
                data-ocid="inventory.input"
                placeholder="Filtro de aceite"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Numero de parte</Label>
              <Input
                placeholder="OEM-12345"
                value={form.partNumber}
                onChange={(e) =>
                  setForm({ ...form, partNumber: e.target.value })
                }
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Categoria</Label>
              <Input
                placeholder="Filtros"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Cantidad actual</Label>
              <Input
                type="number"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Stock minimo (alerta de compra)</Label>
              <Input
                type="number"
                value={form.minStock}
                onChange={(e) => setForm({ ...form, minStock: e.target.value })}
              />
            </div>
            <div className="col-span-2 grid gap-1.5">
              <Label>Costo unitario (MXN)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={form.unitCost}
                onChange={(e) => setForm({ ...form, unitCost: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Ubicacion</Label>
              <Input
                placeholder="Cajon A3, Estante 2..."
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Descripcion</Label>
              <Textarea
                placeholder="Notas adicionales..."
                value={form.description}
                rows={2}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              data-ocid="inventory.cancel_button"
              onClick={() => setDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              data-ocid="inventory.save_button"
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

      {/* Dialog: Agregar / Descontar Stock */}
      <Dialog
        open={stockModal.open}
        onOpenChange={(o) => setStockModal((m) => ({ ...m, open: o }))}
      >
        <DialogContent
          className="sm:max-w-[400px]"
          data-ocid="inventory.stock.dialog"
        >
          <DialogHeader>
            <DialogTitle>
              {stockModal.mode === "add" ? (
                <span className="flex items-center gap-2">
                  <ArrowUpCircle className="w-5 h-5 text-emerald-600" />
                  Agregar Stock
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <ArrowDownCircle className="w-5 h-5 text-red-600" />
                  Descontar Stock
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <p className="text-sm font-medium">
              {stockModal.partName}{" "}
              <span className="text-muted-foreground font-mono text-xs">
                ({stockModal.partNumber})
              </span>
            </p>
            <div className="grid gap-1.5">
              <Label>Cantidad</Label>
              <Input
                type="number"
                min="1"
                value={stockQty}
                data-ocid="inventory.stock.input"
                onChange={(e) => setStockQty(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Motivo</Label>
              <Input
                placeholder={
                  stockModal.mode === "add" ? "Compra proveedor" : "Orden #123"
                }
                value={stockReason}
                data-ocid="inventory.stock.input"
                onChange={(e) => setStockReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              data-ocid="inventory.stock.cancel_button"
              onClick={() => setStockModal((m) => ({ ...m, open: false }))}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              data-ocid="inventory.stock.confirm_button"
              className={
                stockModal.mode === "use"
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
              }
              onClick={handleStockSubmit}
              disabled={
                addStockMutation.isPending || stockConsumeMutation.isPending
              }
            >
              {addStockMutation.isPending || stockConsumeMutation.isPending
                ? "Procesando..."
                : stockModal.mode === "add"
                  ? "Agregar Stock"
                  : "Descontar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
