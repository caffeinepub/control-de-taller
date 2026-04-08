import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Part {
    partNumber: string;
    name: string;
    minStock: bigint;
    quantity: bigint;
    category: string;
    unitCost: bigint;
    description: string;
    location: string;
}
export interface PartEntry {
    id: UUID;
    part: Part;
}
export type MovementType = { __kind__: "entry" } | { __kind__: "exit" };
export interface StockMovement {
    partId: UUID;
    movementType: MovementType;
    quantity: bigint;
    reason: string;
    reference: string;
    timestamp: Time;
}
export interface CatalogPage {
    title: string;
    blobId: string;
    uploadedAt: Time;
    notes: string;
}
export type Time = bigint;
export interface WorkOrder {
    status: WorkOrderStatus;
    clientId: UUID;
    createdAt: Time;
    dueDate?: Time;
    totalCost: bigint;
    description: string;
    notes: string;
    assignedTech: string;
    vehicleId: UUID;
}
export type UUID = bigint;
export interface Client {
    name: string;
    createdAt: Time;
    email: string;
    phone: string;
}
export interface Appointment {
    clientId: UUID;
    date: Time;
    description: string;
    confirmed: boolean;
    vehicleId: UUID;
}
export interface Vehicle {
    vin: string;
    model: string;
    clientId: UUID;
    licensePlate: string;
    year: bigint;
    notes: string;
    brand: string;
}
export interface UserProfile {
    name: string;
    role: string;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export enum WorkOrderStatus {
    awaitingParts = "awaitingParts",
    cancelled = "cancelled",
    pending = "pending",
    completed = "completed",
    inProgress = "inProgress"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    createAppointment(appointment: Appointment): Promise<UUID>;
    createClient(name: string, phone: string, email: string): Promise<UUID>;
    createPart(part: Part): Promise<UUID>;
    createVehicle(vehicle: Vehicle): Promise<UUID>;
    createWorkOrder(workOrder: WorkOrder): Promise<UUID>;
    deleteAppointment(id: UUID): Promise<void>;
    deleteClient(id: UUID): Promise<void>;
    deletePart(id: UUID): Promise<void>;
    deleteVehicle(id: UUID): Promise<void>;
    deleteWorkOrder(id: UUID): Promise<void>;
    deleteCatalogPage(id: UUID): Promise<void>;
    getActiveJobsCount(): Promise<bigint>;
    getAllAppointments(): Promise<Array<Appointment>>;
    getAllClients(): Promise<Array<Client>>;
    getAllParts(): Promise<Array<Part>>;
    getAllPartsWithIds(): Promise<Array<PartEntry>>;
    getAllVehicles(): Promise<Array<Vehicle>>;
    getAllWorkOrders(): Promise<Array<WorkOrder>>;
    getAllMovements(): Promise<Array<StockMovement>>;
    getAllCatalogPages(): Promise<Array<CatalogPage>>;
    getAppointment(id: UUID): Promise<Appointment>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getClient(id: UUID): Promise<Client>;
    getPart(id: UUID): Promise<Part>;
    getPartsBelowMinStock(): Promise<Array<Part>>;
    getMovementsByPart(partId: UUID): Promise<Array<StockMovement>>;
    getTodayAppointments(): Promise<Array<Appointment>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getVehicle(id: UUID): Promise<Vehicle>;
    getVehiclesInShop(): Promise<bigint>;
    getWorkOrder(id: UUID): Promise<WorkOrder>;
    getWorkOrdersByClient(clientId: UUID): Promise<Array<WorkOrder>>;
    getWorkOrdersByStatus(status: WorkOrderStatus): Promise<Array<WorkOrder>>;
    isCallerAdmin(): Promise<boolean>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    updateAppointment(id: UUID, appointment: Appointment): Promise<void>;
    updateClient(id: UUID, client: Client): Promise<void>;
    updatePart(id: UUID, part: Part): Promise<void>;
    updateVehicle(id: UUID, vehicle: Vehicle): Promise<void>;
    updateWorkOrder(id: UUID, workOrder: WorkOrder): Promise<void>;
    updateWorkOrderStatus(id: UUID, status: WorkOrderStatus): Promise<void>;
    addStock(partId: UUID, quantity: bigint, reason: string, reference: string): Promise<void>;
    useStock(partId: UUID, quantity: bigint, reason: string, reference: string): Promise<void>;
    createCatalogPage(title: string, blobId: string, notes: string): Promise<UUID>;
}
