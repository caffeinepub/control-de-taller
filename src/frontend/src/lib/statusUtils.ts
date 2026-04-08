import { WorkOrderStatus } from "../backend";

export function statusLabel(status: WorkOrderStatus): string {
  switch (status) {
    case WorkOrderStatus.pending:
      return "Pendiente";
    case WorkOrderStatus.inProgress:
      return "En Progreso";
    case WorkOrderStatus.awaitingParts:
      return "En Espera de Partes";
    case WorkOrderStatus.completed:
      return "Completado";
    case WorkOrderStatus.cancelled:
      return "Cancelado";
    default:
      return status;
  }
}

export function statusColor(status: WorkOrderStatus): string {
  switch (status) {
    case WorkOrderStatus.pending:
      return "bg-gray-100 text-gray-700";
    case WorkOrderStatus.inProgress:
      return "bg-amber-100 text-amber-800";
    case WorkOrderStatus.awaitingParts:
      return "bg-blue-100 text-blue-800";
    case WorkOrderStatus.completed:
      return "bg-emerald-100 text-emerald-800";
    case WorkOrderStatus.cancelled:
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}
