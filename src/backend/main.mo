import Map "mo:core/Map";
import Array "mo:core/Array";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Iter "mo:core/Iter";
import Int "mo:core/Int";
import List "mo:core/List";
import Nat "mo:core/Nat";
import Order "mo:core/Order";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";
import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";

actor {
  // TYPES

  type UUID = Nat;

  // User Profile
  public type UserProfile = {
    name : Text;
    role : Text; // "admin", "manager", "technician"
  };

  // Clients
  type Client = {
    name : Text;
    phone : Text;
    email : Text;
    createdAt : Time.Time;
  };

  // Vehicles
  type Vehicle = {
    clientId : UUID;
    brand : Text;
    model : Text;
    year : Nat;
    licensePlate : Text;
    vin : Text;
    notes : Text;
  };

  // Work Orders
  type WorkOrderStatus = {
    #pending;
    #inProgress;
    #awaitingParts;
    #completed;
    #cancelled;
  };

  type WorkOrder = {
    clientId : UUID;
    vehicleId : UUID;
    description : Text;
    status : WorkOrderStatus;
    assignedTech : Text;
    createdAt : Time.Time;
    dueDate : ?Time.Time;
    totalCost : Nat;
    notes : Text;
  };

  // Parts/Inventory - legacy type kept for migration
  type PartV1 = {
    name : Text;
    partNumber : Text;
    quantity : Nat;
    minStock : Nat;
    unitCost : Nat;
    category : Text;
  };

  // Parts/Inventory - current type
  type Part = {
    name : Text;
    partNumber : Text;
    quantity : Nat;
    minStock : Nat;
    unitCost : Nat;
    category : Text;
    description : Text;
    location : Text;
  };

  // Part with its ID
  type PartEntry = {
    id : UUID;
    part : Part;
  };

  // Stock Movement
  type MovementType = { #entry; #exit };

  type StockMovement = {
    partId : UUID;
    movementType : MovementType;
    quantity : Nat;
    reason : Text;
    reference : Text;
    timestamp : Time.Time;
  };

  // Catalog Page
  type CatalogPage = {
    title : Text;
    blobId : Text;
    uploadedAt : Time.Time;
    notes : Text;
  };

  // Appointments
  type Appointment = {
    clientId : UUID;
    vehicleId : UUID;
    date : Time.Time;
    description : Text;
    confirmed : Bool;
  };

  // COMPARISON MODULES

  module Client {
    public func compare(c1 : Client, c2 : Client) : Order.Order {
      Text.compare(c1.name, c2.name);
    };
  };

  module Vehicle {
    public func compare(v1 : Vehicle, v2 : Vehicle) : Order.Order {
      Text.compare(v1.licensePlate, v2.licensePlate);
    };
  };

  module WorkOrder {
    public func compare(wo1 : WorkOrder, wo2 : WorkOrder) : Order.Order {
      Text.compare(wo1.description, wo2.description);
    };
  };

  module Part {
    public func compare(p1 : Part, p2 : Part) : Order.Order {
      Text.compare(p1.name, p2.name);
    };
  };

  module StockMovement {
    public func compare(m1 : StockMovement, m2 : StockMovement) : Order.Order {
      Int.compare(m2.timestamp, m1.timestamp);
    };
  };

  module Appointment {
    public func compare(a1 : Appointment, a2 : Appointment) : Order.Order {
      Text.compare(a1.description, a2.description);
    };
  };

  // STATE

  var nextId = 0;

  func generateId() : UUID {
    nextId += 1;
    nextId;
  };

  // ACTOR STATE
  // "parts" keeps the old PartV1 type so the upgrade is compatible.
  // "partsV2" holds the new Part type with extra fields.
  // On postupgrade we migrate any entries in "parts" to "partsV2".

  let clients    = Map.empty<UUID, Client>();
  let vehicles   = Map.empty<UUID, Vehicle>();
  let workOrders = Map.empty<UUID, WorkOrder>();
  let parts      = Map.empty<UUID, PartV1>();   // legacy — do not use directly after migration
  let partsV2    = Map.empty<UUID, Part>();     // current
  let appointments  = Map.empty<UUID, Appointment>();
  let movements     = Map.empty<UUID, StockMovement>();
  let catalogPages  = Map.empty<UUID, CatalogPage>();

  // Migration flag so we only run once
  var partsMigrated = false;

  system func postupgrade() {
    if (not partsMigrated) {
      for ((id, p) in parts.entries()) {
        partsV2.add(id, {
          name        = p.name;
          partNumber  = p.partNumber;
          quantity    = p.quantity;
          minStock    = p.minStock;
          unitCost    = p.unitCost;
          category    = p.category;
          description = "";
          location    = "";
        });
      };
      partsMigrated := true;
    };
  };

  // Authorization Mixin
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // User Profiles
  let userProfiles = Map.empty<Principal, UserProfile>();

  func isTechnician(caller : Principal) : Bool {
    switch (userProfiles.get(caller)) {
      case (?profile) { profile.role == "technician" };
      case (null) { false };
    };
  };

  func _canManageAllEntities(caller : Principal) : Bool {
    if (AccessControl.isAdmin(accessControlState, caller)) return true;
    switch (userProfiles.get(caller)) {
      case (?profile) { profile.role == "manager" or profile.role == "admin" };
      case (null) { false };
    };
  };

  // USER PROFILE MANAGEMENT

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    userProfiles.add(caller, profile);
  };

  // CLIENTS

  public shared ({ caller }) func createClient(name : Text, phone : Text, email : Text) : async UUID {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) Runtime.trap("Unauthorized");
    if (isTechnician(caller)) Runtime.trap("Unauthorized");
    let id = generateId();
    clients.add(id, { name; phone; email; createdAt = Time.now() });
    id;
  };

  public shared ({ caller }) func updateClient(id : UUID, client : Client) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) Runtime.trap("Unauthorized");
    if (isTechnician(caller)) Runtime.trap("Unauthorized");
    if (not clients.containsKey(id)) Runtime.trap("Client does not exist");
    clients.add(id, client);
  };

  public shared ({ caller }) func deleteClient(id : UUID) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) Runtime.trap("Unauthorized");
    clients.remove(id);
  };

  public query ({ caller }) func getClient(id : UUID) : async Client {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) Runtime.trap("Unauthorized");
    switch (clients.get(id)) {
      case (?c) { c };
      case (null) { Runtime.trap("Client does not exist") };
    };
  };

  public query ({ caller }) func getAllClients() : async [Client] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) Runtime.trap("Unauthorized");
    clients.values().toArray().sort();
  };

  // VEHICLES

  public shared ({ caller }) func createVehicle(vehicle : Vehicle) : async UUID {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) Runtime.trap("Unauthorized");
    if (isTechnician(caller)) Runtime.trap("Unauthorized");
    let id = generateId();
    vehicles.add(id, vehicle);
    id;
  };

  public shared ({ caller }) func updateVehicle(id : UUID, vehicle : Vehicle) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) Runtime.trap("Unauthorized");
    if (isTechnician(caller)) Runtime.trap("Unauthorized");
    if (not vehicles.containsKey(id)) Runtime.trap("Vehicle does not exist");
    vehicles.add(id, vehicle);
  };

  public shared ({ caller }) func deleteVehicle(id : UUID) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) Runtime.trap("Unauthorized");
    vehicles.remove(id);
  };

  public query ({ caller }) func getVehicle(id : UUID) : async Vehicle {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) Runtime.trap("Unauthorized");
    switch (vehicles.get(id)) {
      case (?v) { v };
      case (null) { Runtime.trap("Vehicle does not exist") };
    };
  };

  public query ({ caller }) func getAllVehicles() : async [Vehicle] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) Runtime.trap("Unauthorized");
    vehicles.values().toArray().sort();
  };

  // WORK ORDERS

  public shared ({ caller }) func createWorkOrder(workOrder : WorkOrder) : async UUID {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) Runtime.trap("Unauthorized");
    if (isTechnician(caller)) Runtime.trap("Unauthorized");
    let id = generateId();
    workOrders.add(id, { workOrder with createdAt = Time.now() });
    id;
  };

  public shared ({ caller }) func updateWorkOrder(id : UUID, workOrder : WorkOrder) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) Runtime.trap("Unauthorized");
    if (not workOrders.containsKey(id)) Runtime.trap("Work order does not exist");
    workOrders.add(id, workOrder);
  };

  public shared ({ caller }) func updateWorkOrderStatus(id : UUID, status : WorkOrderStatus) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) Runtime.trap("Unauthorized");
    switch (workOrders.get(id)) {
      case (?wo) { workOrders.add(id, { wo with status }) };
      case (null) { Runtime.trap("Work order does not exist") };
    };
  };

  public shared ({ caller }) func deleteWorkOrder(id : UUID) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) Runtime.trap("Unauthorized");
    workOrders.remove(id);
  };

  public query ({ caller }) func getWorkOrder(id : UUID) : async WorkOrder {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) Runtime.trap("Unauthorized");
    switch (workOrders.get(id)) {
      case (?wo) { wo };
      case (null) { Runtime.trap("Work order does not exist") };
    };
  };

  public query ({ caller }) func getAllWorkOrders() : async [WorkOrder] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) Runtime.trap("Unauthorized");
    workOrders.values().toArray().sort();
  };

  public query ({ caller }) func getWorkOrdersByStatus(status : WorkOrderStatus) : async [WorkOrder] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) Runtime.trap("Unauthorized");
    workOrders.values().toList<WorkOrder>().filter(func(wo) { wo.status == status }).toArray();
  };

  public query ({ caller }) func getWorkOrdersByClient(clientId : UUID) : async [WorkOrder] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) Runtime.trap("Unauthorized");
    workOrders.values().toList<WorkOrder>().filter(func(wo) { wo.clientId == clientId }).toArray();
  };

  // PARTS / INVENTORY  (all operations use partsV2)

  public shared ({ caller }) func createPart(part : Part) : async UUID {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) Runtime.trap("Unauthorized");
    if (isTechnician(caller)) Runtime.trap("Unauthorized");
    let id = generateId();
    partsV2.add(id, part);
    id;
  };

  public shared ({ caller }) func updatePart(id : UUID, part : Part) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) Runtime.trap("Unauthorized");
    if (isTechnician(caller)) Runtime.trap("Unauthorized");
    if (not partsV2.containsKey(id)) Runtime.trap("Part does not exist");
    partsV2.add(id, part);
  };

  public shared ({ caller }) func deletePart(id : UUID) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) Runtime.trap("Unauthorized");
    partsV2.remove(id);
  };

  public query ({ caller }) func getPart(id : UUID) : async Part {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) Runtime.trap("Unauthorized");
    switch (partsV2.get(id)) {
      case (?p) { p };
      case (null) { Runtime.trap("Part does not exist") };
    };
  };

  public query ({ caller }) func getAllParts() : async [Part] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) Runtime.trap("Unauthorized");
    partsV2.values().toArray().sort();
  };

  // Returns all parts with their IDs so the frontend can use them directly
  public query ({ caller }) func getAllPartsWithIds() : async [PartEntry] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) Runtime.trap("Unauthorized");
    let entries = partsV2.entries().toArray();
    entries.map(func((id, part) : (UUID, Part)) : PartEntry { { id; part } });
  };

  public query ({ caller }) func getPartsBelowMinStock() : async [Part] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) Runtime.trap("Unauthorized");
    partsV2.values().toList<Part>().filter(func(p) { p.quantity < p.minStock }).toArray();
  };

  // STOCK MOVEMENTS

  public shared ({ caller }) func addStock(partId : UUID, quantity : Nat, reason : Text, reference : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) Runtime.trap("Unauthorized");
    switch (partsV2.get(partId)) {
      case (?p) {
        partsV2.add(partId, { p with quantity = p.quantity + quantity });
        let mid = generateId();
        movements.add(mid, { partId; movementType = #entry; quantity; reason; reference; timestamp = Time.now() });
      };
      case (null) { Runtime.trap("Part does not exist") };
    };
  };

  public shared ({ caller }) func useStock(partId : UUID, quantity : Nat, reason : Text, reference : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) Runtime.trap("Unauthorized");
    switch (partsV2.get(partId)) {
      case (?p) {
        if (p.quantity < quantity) Runtime.trap("Insufficient stock");
        partsV2.add(partId, { p with quantity = Nat.sub(p.quantity, quantity) });
        let mid = generateId();
        movements.add(mid, { partId; movementType = #exit; quantity; reason; reference; timestamp = Time.now() });
      };
      case (null) { Runtime.trap("Part does not exist") };
    };
  };

  public query ({ caller }) func getMovementsByPart(partId : UUID) : async [StockMovement] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) Runtime.trap("Unauthorized");
    movements.values().toList<StockMovement>().filter(func(m) { m.partId == partId }).toArray().sort();
  };

  public query ({ caller }) func getAllMovements() : async [StockMovement] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) Runtime.trap("Unauthorized");
    movements.values().toArray().sort();
  };

  // CATALOG PAGES

  public shared ({ caller }) func createCatalogPage(title : Text, blobId : Text, notes : Text) : async UUID {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) Runtime.trap("Unauthorized");
    let id = generateId();
    catalogPages.add(id, { title; blobId; uploadedAt = Time.now(); notes });
    id;
  };

  public shared ({ caller }) func deleteCatalogPage(id : UUID) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) Runtime.trap("Unauthorized");
    catalogPages.remove(id);
  };

  public query ({ caller }) func getAllCatalogPages() : async [CatalogPage] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) Runtime.trap("Unauthorized");
    catalogPages.values().toArray();
  };

  // APPOINTMENTS

  public shared ({ caller }) func createAppointment(appointment : Appointment) : async UUID {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) Runtime.trap("Unauthorized");
    if (isTechnician(caller)) Runtime.trap("Unauthorized");
    let id = generateId();
    appointments.add(id, appointment);
    id;
  };

  public shared ({ caller }) func updateAppointment(id : UUID, appointment : Appointment) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) Runtime.trap("Unauthorized");
    if (isTechnician(caller)) Runtime.trap("Unauthorized");
    if (not appointments.containsKey(id)) Runtime.trap("Appointment does not exist");
    appointments.add(id, appointment);
  };

  public shared ({ caller }) func deleteAppointment(id : UUID) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) Runtime.trap("Unauthorized");
    appointments.remove(id);
  };

  public query ({ caller }) func getAppointment(id : UUID) : async Appointment {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) Runtime.trap("Unauthorized");
    switch (appointments.get(id)) {
      case (?a) { a };
      case (null) { Runtime.trap("Appointment does not exist") };
    };
  };

  public query ({ caller }) func getAllAppointments() : async [Appointment] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) Runtime.trap("Unauthorized");
    appointments.values().toArray().sort();
  };

  // KPIs

  public query ({ caller }) func getActiveJobsCount() : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) Runtime.trap("Unauthorized");
    workOrders.values().toList<WorkOrder>().filter(func(wo) { wo.status == #inProgress }).toArray().size();
  };

  public query ({ caller }) func getVehiclesInShop() : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) Runtime.trap("Unauthorized");
    workOrders.values().toList<WorkOrder>().filter(
      func(wo) { wo.status == #inProgress or wo.status == #pending }
    ).toArray().size();
  };

  public query ({ caller }) func getTodayAppointments() : async [Appointment] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) Runtime.trap("Unauthorized");
    let today = Time.now();
    appointments.values().toList<Appointment>().filter(
      func(app) { Int.abs(app.date - today) < 86400_000_000_000 }
    ).toArray();
  };
};
