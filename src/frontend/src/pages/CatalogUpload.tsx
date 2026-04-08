import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  BookImage,
  CheckCircle2,
  FileImage,
  Loader2,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { CatalogPage, Part, backendInterface } from "../backend.d";
import type { StorageClient } from "../utils/StorageClient";

interface Props {
  actor: backendInterface;
  storageClient: StorageClient | null;
}

const PART_IDS_KEY = "taller_part_ids";

function loadPartIds(): Map<string, bigint> {
  try {
    const raw = localStorage.getItem(PART_IDS_KEY);
    if (!raw) return new Map();
    const entries: [string, string][] = JSON.parse(raw);
    return new Map(entries.map(([k, v]) => [k, BigInt(v)]));
  } catch {
    return new Map();
  }
}

function formatDate(ts: bigint): string {
  return new Date(Number(ts / 1_000_000n)).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Per-card component to async-load the actual blob image URL
function CatalogCardImage({
  blobId,
  storageClient,
  title,
}: {
  blobId: string;
  storageClient: StorageClient;
  title: string;
}) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    storageClient
      .getDirectURL(blobId)
      .then((url) => {
        if (!cancelled) {
          setImageUrl(url);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [blobId, storageClient]);

  if (loading) {
    return <Skeleton className="w-full h-full" />;
  }

  if (error || !imageUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted">
        <FileImage className="w-10 h-10 text-muted-foreground/50" />
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={title}
      className="w-full h-full object-cover"
      onError={() => setError(true)}
    />
  );
}

// Stock action modal
function StockModal({
  open,
  mode,
  onClose,
  actor,
}: {
  open: boolean;
  mode: "add" | "use";
  onClose: () => void;
  actor: backendInterface;
}) {
  const qc = useQueryClient();
  const [selectedPartNumber, setSelectedPartNumber] = useState("");
  const [qty, setQty] = useState("1");
  const [reason, setReason] = useState("");

  const { data: parts = [], isLoading: partsLoading } = useQuery<Part[]>({
    queryKey: ["allParts"],
    queryFn: () => actor.getAllParts(),
    enabled: open,
  });

  const stockMutation = useMutation({
    mutationFn: async () => {
      const partIds = loadPartIds();
      const partId = partIds.get(selectedPartNumber);
      if (!partId)
        throw new Error("ID de pieza no encontrado. Recarga la app.");
      const quantity = BigInt(Math.max(1, Number.parseInt(qty) || 1));
      const stockFn =
        mode === "add"
          ? actor.addStock.bind(actor)
          : actor.useStock.bind(actor);
      await stockFn(partId, quantity, reason.trim(), "Catálogo");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allParts"] });
      qc.invalidateQueries({ queryKey: ["allMovements"] });
      toast.success("Stock actualizado");
      onClose();
      setSelectedPartNumber("");
      setQty("1");
      setReason("");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Error al actualizar stock");
    },
  });

  const handleClose = () => {
    if (!stockMutation.isPending) {
      onClose();
      setSelectedPartNumber("");
      setQty("1");
      setReason("");
    }
  };

  const isAdd = mode === "add";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent
        className="sm:max-w-[440px]"
        data-ocid="catalog.stock.modal"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isAdd ? (
              <ArrowUpCircle className="w-5 h-5 text-emerald-500" />
            ) : (
              <ArrowDownCircle className="w-5 h-5 text-destructive" />
            )}
            {isAdd ? "Agregar Stock" : "Quitar Stock"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="grid gap-1.5">
            <Label htmlFor="stock-part">Pieza *</Label>
            {partsLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : parts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                No hay piezas registradas en el almacén.
              </p>
            ) : (
              <Select
                value={selectedPartNumber}
                onValueChange={setSelectedPartNumber}
              >
                <SelectTrigger id="stock-part" data-ocid="catalog.stock.select">
                  <SelectValue placeholder="Seleccionar pieza..." />
                </SelectTrigger>
                <SelectContent>
                  {parts.map((p) => (
                    <SelectItem key={p.partNumber} value={p.partNumber}>
                      {p.name}{" "}
                      <span className="text-muted-foreground text-xs">
                        ({p.partNumber})
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="stock-qty">Cantidad *</Label>
            <Input
              id="stock-qty"
              type="number"
              min="1"
              value={qty}
              data-ocid="catalog.stock.input"
              onChange={(e) => setQty(e.target.value)}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="stock-reason">Motivo (opcional)</Label>
            <Input
              id="stock-reason"
              placeholder={isAdd ? "Compra proveedor" : "Orden #123"}
              value={reason}
              data-ocid="catalog.stock.textarea"
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={stockMutation.isPending}
            data-ocid="catalog.stock.cancel_button"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => stockMutation.mutate()}
            disabled={
              !selectedPartNumber ||
              !qty ||
              Number.parseInt(qty) < 1 ||
              stockMutation.isPending
            }
            className={`${
              isAdd
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            }`}
            data-ocid="catalog.stock.submit_button"
          >
            {stockMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : isAdd ? (
              <ArrowUpCircle className="w-4 h-4 mr-2" />
            ) : (
              <ArrowDownCircle className="w-4 h-4 mr-2" />
            )}
            {stockMutation.isPending
              ? "Actualizando..."
              : isAdd
                ? "Agregar"
                : "Quitar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function CatalogUpload({ actor, storageClient }: Props) {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    pageTitle: string;
  }>({
    open: false,
    pageTitle: "",
  });
  const [stockModal, setStockModal] = useState<{
    open: boolean;
    mode: "add" | "use";
  }>({
    open: false,
    mode: "add",
  });

  const { data: pages = [], isLoading } = useQuery<CatalogPage[]>({
    queryKey: ["catalogPages"],
    queryFn: () => actor.getAllCatalogPages(),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!storageClient) throw new Error("Storage no disponible");
      if (!selectedFile) throw new Error("Selecciona un archivo");
      if (!title.trim()) throw new Error("El titulo es obligatorio");
      setUploadProgress(0);
      const bytes = new Uint8Array(await selectedFile.arrayBuffer());
      const { hash } = await storageClient.putFile(bytes, (pct) => {
        setUploadProgress(pct);
      });
      await actor.createCatalogPage(title.trim(), hash, notes.trim());
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["catalogPages"] });
      toast.success("Pagina guardada en el catalogo");
      setSelectedFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setTitle("");
      setNotes("");
      setUploadProgress(0);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 6000);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Error al guardar");
      setUploadProgress(0);
    },
  });

  const handleFileSelect = useCallback(
    (file: File) => {
      setSelectedFile(file);
      setShowSuccess(false);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      if (!title) {
        const base = file.name.replace(/\.[^.]+$/, "");
        setTitle(base);
      }
    },
    [previewUrl, title],
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  const clearFile = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const isImageFile =
    selectedFile?.type.startsWith("image/") ||
    ["jpg", "jpeg", "png", "webp", "gif"].includes(
      selectedFile?.name.split(".").pop()?.toLowerCase() ?? "",
    );

  if (!storageClient) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p>Inicializando almacenamiento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <div className="bg-primary/10 rounded-xl p-2.5">
          <BookImage className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Catálogo de Piezas</h1>
          <p className="text-sm text-muted-foreground">
            Sube fotos de catálogos y manuales para referencia
          </p>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">
            Subir nueva página
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            data-ocid="catalog.dropzone"
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-xl transition-colors cursor-pointer ${
              isDragging
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50 hover:bg-muted/30"
            }`}
            onClick={() => !selectedFile && fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                if (!selectedFile) fileInputRef.current?.click();
              }
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf,.jpg,.jpeg,.png,.webp,.pdf"
              className="sr-only"
              data-ocid="catalog.upload_button"
              onChange={handleInputChange}
            />
            {selectedFile ? (
              <div className="p-4 flex gap-4 items-start">
                <div className="flex-shrink-0 w-32 h-32 rounded-lg overflow-hidden bg-muted flex items-center justify-center border border-border">
                  {isImageFile && previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <FileImage className="w-10 h-10 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                  {saveMutation.isPending && uploadProgress > 0 && (
                    <div className="mt-3">
                      <Progress value={uploadProgress} className="h-1.5" />
                      <p className="text-xs text-muted-foreground mt-1">
                        Subiendo... {uploadProgress}%
                      </p>
                    </div>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearFile();
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 py-10">
                <div className="rounded-full bg-muted p-4">
                  <UploadCloud className="w-7 h-7 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">
                    Arrastra una imagen o haz clic para seleccionar
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    JPG, PNG, WEBP, PDF
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                >
                  Seleccionar archivo
                </Button>
              </div>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="catalog-title">Título de la página *</Label>
              <Input
                id="catalog-title"
                placeholder="Catálogo Bosch 2024 - pag 45"
                value={title}
                data-ocid="catalog.input"
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="catalog-notes">Notas</Label>
              <Textarea
                id="catalog-notes"
                placeholder="Filtros de aceite compatibles con VW..."
                value={notes}
                rows={2}
                data-ocid="catalog.textarea"
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          {showSuccess && (
            <div
              className="flex items-start gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200"
              data-ocid="catalog.success_state"
            >
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-emerald-800">
                  ¡Foto guardada exitosamente!
                </p>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Ahora puedes usar los botones{" "}
                  <strong>Agregar / Quitar</strong> en cada foto para actualizar
                  el stock del almacén.
                </p>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={clearFile}
            disabled={!selectedFile || saveMutation.isPending}
            data-ocid="catalog.cancel_button"
          >
            Limpiar
          </Button>
          <Button
            type="button"
            data-ocid="catalog.primary_button"
            onClick={() => saveMutation.mutate()}
            disabled={!selectedFile || !title.trim() || saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <UploadCloud className="w-4 h-4 mr-2" />
                Guardar en Catálogo
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      <div>
        <h2 className="text-lg font-semibold mb-4">
          Páginas guardadas
          {pages.length > 0 && (
            <Badge variant="secondary" className="ml-2 text-xs">
              {pages.length}
            </Badge>
          )}
        </h2>

        {isLoading ? (
          <div
            className="text-center text-muted-foreground py-12"
            data-ocid="catalog.loading_state"
          >
            <Loader2 className="w-7 h-7 animate-spin mx-auto mb-2" />
            Cargando catálogo...
          </div>
        ) : pages.length === 0 ? (
          <div
            className="text-center text-muted-foreground py-16 border-2 border-dashed border-border rounded-xl"
            data-ocid="catalog.empty_state"
          >
            <BookImage className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No hay páginas en el catálogo</p>
            <p className="text-sm mt-1">Sube la primera foto de un manual</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pages.map((page, i) => (
              <Card
                key={`${page.title}-${i}`}
                className="shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                data-ocid={`catalog.item.${i + 1}`}
              >
                <CardContent className="p-0">
                  {/* Actual photo from blob storage */}
                  <div className="h-44 bg-muted relative overflow-hidden">
                    <CatalogCardImage
                      blobId={page.blobId}
                      storageClient={storageClient}
                      title={page.title}
                    />
                  </div>

                  <div className="p-4 pb-3">
                    <p className="font-semibold text-sm leading-snug line-clamp-2">
                      {page.title}
                    </p>
                    {page.notes && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {page.notes}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      {formatDate(page.uploadedAt)}
                    </p>
                  </div>

                  {/* Stock action buttons */}
                  <div className="px-4 pb-3 grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white w-full"
                      data-ocid={`catalog.item.${i + 1}.primary_button`}
                      onClick={() => setStockModal({ open: true, mode: "add" })}
                    >
                      <ArrowUpCircle className="w-3.5 h-3.5 mr-1.5" />
                      Agregar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      className="w-full"
                      data-ocid={`catalog.item.${i + 1}.delete_button`}
                      onClick={() => setStockModal({ open: true, mode: "use" })}
                    >
                      <ArrowDownCircle className="w-3.5 h-3.5 mr-1.5" />
                      Quitar
                    </Button>
                  </div>

                  {/* Delete page button */}
                  <div className="px-4 pb-4">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 text-xs h-7"
                      data-ocid={`catalog.item.${i + 1}.secondary_button`}
                      onClick={() =>
                        setDeleteConfirm({
                          open: true,
                          pageTitle: page.title,
                        })
                      }
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Eliminar página
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Stock modal */}
      <StockModal
        open={stockModal.open}
        mode={stockModal.mode}
        onClose={() => setStockModal((s) => ({ ...s, open: false }))}
        actor={actor}
      />

      {/* Delete confirm dialog */}
      <Dialog
        open={deleteConfirm.open}
        onOpenChange={(o) => setDeleteConfirm((d) => ({ ...d, open: o }))}
      >
        <DialogContent className="sm:max-w-[400px]" data-ocid="catalog.dialog">
          <DialogHeader>
            <DialogTitle>Eliminar página del catálogo</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Esta acción eliminará <strong>"{deleteConfirm.pageTitle}"</strong>{" "}
            del catálogo. No se puede deshacer.
          </p>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              data-ocid="catalog.cancel_button"
              onClick={() => setDeleteConfirm({ open: false, pageTitle: "" })}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              data-ocid="catalog.confirm_button"
              onClick={() => {
                toast.error(
                  "Para eliminar necesitas el ID de la página. Recarga y vuelve a intentar.",
                );
                setDeleteConfirm({ open: false, pageTitle: "" });
              }}
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
