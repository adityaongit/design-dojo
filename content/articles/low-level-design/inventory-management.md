---
slug: inventory-management
title: Inventory Management
type: low-level-design
difficulty: hard
askedAt: [Amazon, Flipkart, Shopify]
videoUrl: ""
updatedAt: 2026-05-03
author: "Aditya Jindal"
focusTag: "Reservation Pattern"
---

## Understanding the Problem

🔗 **What is inventory management?**
> A system that tracks product stock across multiple warehouses, handles reservations, prevents overselling, and provides an audit trail for all inventory movements.

You're designing the core object model for an e-commerce platform's inventory system. The challenge isn't just tracking numbers — it's enforcing the *reservation pattern* (available vs reserved buckets) so that concurrent operations can't oversell. You'll need to decide how to structure the entities, where to place the business rules, and how to keep the audit trail immutable without tangling it with live inventory logic. This is a classic problem for mid-level engineers because it requires careful state encapsulation; it's a high-bar problem for staff engineers because the concurrency and failure modes are subtle.

### Requirements

**In scope**

- Add stock to a warehouse for a given product (e.g., restocking from a supplier).
- Remove stock from a warehouse (e.g., damaged goods, returned shipment reconciliation).
- Reserve stock: atomically move qty from available to reserved; fail if insufficient.
- Confirm a reservation (reserved qty becomes final/sold); release a reservation (return reserved qty to available).
- Query available and reserved counts per product per warehouse.
- Transfer stock between warehouses atomically (verify source, deduct, add to destination, log as single transaction).
- Prevent negative inventory at all times.
- Audit all movements: every add, remove, reserve, confirm, release, transfer is logged with timestamp and metadata.

**Out of scope**

- Payment processing or order fulfillment workflows.
- Pricing, discounts, or promotion logic.
- UI, API gateway, or authentication.
- Distributed consensus across data centers (assume single-process or thread-safe in-memory design).
- Reservation timeout enforcement (you can assume a background job or lazy expiry; the core mechanics are the same).

*Assumptions:* Each warehouse is a fixed location (no dynamic creation). Reservations expire after a TTL, but you don't need to implement the cleanup routine — just the mechanism. All operations are single-threaded in your initial design unless asked to handle concurrency.

## The Set Up

### Entities & Relationships

The orchestrator is **InventoryManager** — it owns all warehouses and coordinates operations. **Warehouse** is the hub for a single location; it owns a map of products to their **StockLevel** records. **StockLevel** owns the available/reserved counts for one product in one warehouse, plus the set of pending reservations. **Reservation** is an immutable record of a hold on inventory. **AuditLog** is append-only and decoupled from live inventory.

Dependency flow:

```
InventoryManager
  ├─ Warehouse (map by ID)
  │   ├─ StockLevel (map by productId)
  │   │   └─ Reservation (map by reservationId)
  │   └─ AuditLog (append-only)
```

**InventoryManager** drives the workflow; it routes operations to the appropriate Warehouse. **StockLevel** enforces the reservation contract (can't reserve more than available). **Reservation** records the hold with a unique ID, timestamp, and expiry. Rules live where the state lives: StockLevel owns the reserve/confirm/release logic; Warehouse owns the add/remove logic.

### Class Design

```
enum ReservationStatus {
  PENDING
  CONFIRMED
  RELEASED
  EXPIRED
}

enum AdjustmentType {
  RECEIVED
  SOLD
  RETURNED
  DAMAGED
  TRANSFERRED_OUT
  TRANSFERRED_IN
}

class Reservation:
  id: string                    // UUID
  productId: string
  qty: int
  createdAt: long               // milliseconds since epoch
  expiresAt: long
  status: ReservationStatus

class StockLevel:
  productId: string
  warehouseId: string
  available: int                // qty available for reservation
  reserved: int                 // qty held in active reservations
  reservations: Map<reservationId, Reservation>
  
  reserve(qty: int, expiryMs: long) -> Reservation:
    // Atomically move qty from available to reserved
    // Throws if qty > available
  
  confirm(reservationId: string) -> void:
    // Mark a pending reservation as confirmed
    // reserved stays the same (was already deducted)
    // Throws if not found or not PENDING
  
  release(reservationId: string) -> void:
    // Return reserved qty to available; mark as released
    // Idempotent: no-op if already released or expired
    // Throws if not found

class Warehouse:
  id: string
  name: string
  stock: Map<productId, StockLevel>
  capacity: long
  reorderThreshold: int
  listeners: List<StockAlertListener>
  
  addStock(productId: string, qty: int, source: string) -> void:
    // Increment available; append audit; notify listeners
  
  removeStock(productId: string, qty: int, reason: string) -> void:
    // Decrement available; throws if qty > available
    // Append audit
  
  getAvailable(productId: string) -> int:
    // Return current available qty (read-only)
  
  registerAlertListener(listener: StockAlertListener) -> void

interface StockAlertListener:
  onLowStock(warehouseId: string, productId: string, availableQty: int) -> void

class AuditEntry:
  id: string
  type: AdjustmentType
  productId: string
  warehouseId: string
  fromWarehouseId: string       // null except for TRANSFER
  qty: int
  timestamp: long
  metadata: Map<string, string>

class AuditLog:
  entries: List<AuditEntry>     // append-only
  
  append(type: AdjustmentType, productId: string, warehouseId: string,
         qty: int, metadata: Map) -> void

class InventoryManager:
  warehouses: Map<warehouseId, Warehouse>
  auditLog: AuditLog
  
  transfer(fromWarehouseId: string, toWarehouseId: string, 
           productId: string, qty: int) -> void:
    // Atomically deduct from source, add to dest
    // Throws if source not found, dest not found, or qty insufficient
  
  reserve(warehouseId: string, productId: string, qty: int, 
          expiryMs: long) -> Reservation:
    // Get warehouse, get/create StockLevel, call reserve
  
  confirm(reservationId: string) -> void
  
  release(reservationId: string) -> void
```

## Implementation

The meaty methods here are **reserve()**, **confirm()**, **release()**, and **transfer()**. These four functions embody the reservation pattern and cross-warehouse atomicity — the core challenges of inventory design.

```
reserve(productId: string, qty: int, expiryMs: long) -> Reservation:
  // Called on StockLevel; owned by Warehouse
  if qty <= 0:
    throw InvalidQtyError("qty must be > 0")
  
  if qty > available:
    throw InsufficientStockError("Need " + qty + ", have " + available)
  
  // Atomic: move qty from available to reserved, create Reservation
  available -= qty
  reserved += qty
  
  res = new Reservation(
    id: uuid(),
    productId: productId,
    qty: qty,
    createdAt: now(),
    expiresAt: now() + expiryMs,
    status: PENDING
  )
  
  reservations[res.id] = res
  return res

confirm(reservationId: string) -> void:
  // Called on StockLevel
  res = reservations.get(reservationId)
  
  if not res:
    throw ReservationNotFoundError(reservationId)
  
  if res.status != PENDING:
    throw InvalidReservationStateError("Can't confirm " + res.status)
  
  // Mark confirmed; reserved stays deducted (it was already moved from available)
  res.status = CONFIRMED
  auditLog.append(
    type: SOLD,
    productId: productId,
    warehouseId: warehouseId,
    qty: res.qty,
    metadata: {"reservationId": reservationId}
  )

release(reservationId: string) -> void:
  // Called on StockLevel; idempotent
  res = reservations.get(reservationId)
  
  if not res:
    return  // No-op if never existed
  
  if res.status == RELEASED or res.status == EXPIRED:
    return  // Already released; idempotent
  
  if res.status == PENDING:
    // Return reserved qty to available
    available += res.qty
    reserved -= res.qty
    res.status = RELEASED
    auditLog.append(
      type: RETURNED,
      productId: productId,
      warehouseId: warehouseId,
      qty: res.qty,
      metadata: {"reservationId": reservationId}
    )
  else if res.status == CONFIRMED:
    // Already committed (sold); can't release a confirmed reservation
    throw InvalidReservationStateError("Can't release CONFIRMED reservation")

transfer(fromWarehouseId: string, toWarehouseId: string, 
         productId: string, qty: int) -> void:
  // Called on InventoryManager; atomic at object level
  fromWh = warehouses.get(fromWarehouseId)
  toWh = warehouses.get(toWarehouseId)
  
  if not fromWh or not toWh:
    throw WarehouseNotFoundError
  
  // Phase 1: Verify both sides
  fromSl = fromWh.stock.get(productId)
  if not fromSl or fromSl.available < qty:
    throw InsufficientStockError(
      "Warehouse " + fromWarehouseId + " has insufficient stock for " + productId
    )
  
  // Phase 2: Commit atomically (in practice, guard with lock on both Warehouses)
  fromSl.available -= qty
  auditLog.append(
    type: TRANSFERRED_OUT,
    productId: productId,
    warehouseId: fromWarehouseId,
    qty: qty,
    metadata: {"toWarehouse": toWarehouseId}
  )
  
  toSl = toWh.stock.getOrCreate(productId)
  toSl.available += qty
  auditLog.append(
    type: TRANSFERRED_IN,
    productId: productId,
    warehouseId: toWarehouseId,
    qty: qty,
    metadata: {"fromWarehouse": fromWarehouseId}
  )

addStock(productId: string, qty: int, source: string) -> void:
  // Called on Warehouse
  if qty <= 0:
    throw InvalidQtyError
  
  sl = stock.getOrCreate(productId)
  sl.available += qty
  
  auditLog.append(
    type: RECEIVED,
    productId: productId,
    warehouseId: id,
    qty: qty,
    metadata: {"source": source}
  )
  
  // Notify listeners if stock is low (still >= threshold)
  if sl.available <= reorderThreshold:
    for listener in listeners:
      listener.onLowStock(id, productId, sl.available)
```

**Trace through a scenario:**

1. **addStock(warehouse=SF, product=LAPTOP, qty=10, source=SUPPLIER)**
   - StockLevel created with available=10, reserved=0.
   - AuditLog: `[RECEIVED, LAPTOP, SF, 10, source=SUPPLIER, t=1000]`

2. **reserve(warehouse=SF, product=LAPTOP, qty=3, expiryMs=60000)**
   - Check: 3 <= 10 ✓
   - StockLevel: available=7, reserved=3.
   - Reservation(id=RES-001, qty=3, expiresAt=61000, status=PENDING) created.
   - AuditLog: no entry yet (reserve doesn't audit; only confirm/release do).

3. **confirm(RES-001)**
   - Lookup StockLevel for RES-001 (found in SF).
   - Check status: PENDING ✓
   - Reservation.status = CONFIRMED.
   - AuditLog: `[SOLD, LAPTOP, SF, 3, reservationId=RES-001, t=1001]`
   - Note: available stays 7, reserved stays 3 (already accounted for).

4. **release(RES-001)**  [hypothetically, after checkout abandonment]
   - Lookup: found, status=CONFIRMED.
   - Since status != PENDING, throw InvalidReservationStateError.
   - A confirmed reservation can't be released; it's final.

5. **New flow: reserve(SF, LAPTOP, qty=2, expiryMs=30000)**
   - Check: 2 <= 7 ✓
   - StockLevel: available=5, reserved=5.
   - Reservation(id=RES-002, qty=2, expiresAt=31000, status=PENDING).

6. **release(RES-002)**  [user cancels]
   - Lookup: found, status=PENDING.
   - StockLevel: available=5+2=7, reserved=5-2=3.
   - Reservation.status = RELEASED.
   - AuditLog: `[RETURNED, LAPTOP, SF, 2, reservationId=RES-002, t=1002]`

7. **transfer(fromWh=SF, toWh=NYC, product=LAPTOP, qty=4)**
   - Phase 1: SF.available=7, check 4 <= 7 ✓
   - Phase 2: SF.available=7-4=3. NYC.available=0+4=4.
   - AuditLog: `[TRANSFERRED_OUT, LAPTOP, SF, 4, toWarehouse=NYC, t=1003]`
   - AuditLog: `[TRANSFERRED_IN, LAPTOP, NYC, 4, fromWarehouse=SF, t=1003]`

At the end of the trace: SF has 3 available + 3 reserved = 6 units accounted for (lost 4 to transfer). NYC has 4 available. Total accounted: 10 ✓

## Extensibility

Likely follow-ups in the interview:

- **Low-stock auto-reorder:** Introduce a `ReorderStrategy` interface with `shouldReorder(available, threshold) -> bool` and `calculateOrderQty(available, threshold) -> int`. When `Warehouse.addStock()` notifies listeners, a `ReorderListener` invokes the strategy and places an auto-purchase order with the supplier system. The core reserve/confirm/release logic is unchanged.

- **Reservation timeout handling:** You've stored `expiresAt` on each Reservation. A background job periodically scans all StockLevels and calls `release()` on expired PENDING reservations. Alternatively, use lazy expiry: on `confirm()` or `getAvailable()`, check if `now() > expiresAt` and auto-release before proceeding. Both approaches preserve the immutability of the audit trail.

- **Multi-warehouse fulfillment (split shipment):** New method `fulfillAcrossWarehouses(productId, qty, warehouseOrder: List<Warehouse>) -> List<Reservation>`. Iterate the prioritized warehouse list, reserve from each until qty is satisfied. If reserve fails (insufficient stock), move to the next warehouse. If total reserved < qty, release all partial reservations and throw InsufficientStockError. This builds on the core reserve pattern without modifying StockLevel.

- **Approval workflow for transfers:** `Transfer` becomes a first-class entity with status PENDING_APPROVAL | APPROVED | REJECTED. `InventoryManager.transfer()` creates a Transfer record but doesn't mutate warehouses yet. Only `InventoryManager.approveTransfer(transferId)` applies the mutation. Approvals can be manual (admin portal) or automatic (policy-based). The two-phase commit logic is the same; Transfer just adds a business gate.

## What is Expected at Each Level?

### Mid-level

- Identifies the four core entities (InventoryManager, Warehouse, StockLevel, Reservation) and their ownership structure.
- Implements reserve/confirm/release with correct state transitions (available → reserved → sold or back to available).
- Prevents negative inventory with bounds checks.
- Sketches the transfer method and acknowledges the two-source/two-dest problem.
- Audit logging is mentioned but may be rough (timestamps and types sufficient).

### Senior

- Designs rich enums (ReservationStatus, AdjustmentType) and uses them in return types and method signatures, not bare bools.
- Encapsulates the reservation contract within StockLevel; the caller (Warehouse or InventoryManager) doesn't directly mutate available/reserved.
- Separates audit concerns: AuditLog is append-only and decoupled from live inventory. Understand why mixing them is a bad idea (audit can't be corrected; inventory needs to be snappy).
- Handles the confirm/release idempotency: release() is safe to call multiple times.
- Sketches a locking strategy for transfer (acknowledges race between verify and commit).
- Answers at least one extensibility follow-up (e.g., low-stock reorder) by pointing at the seams (ReorderStrategy interface, listener pattern) without rewriting the core.

### Staff+

- Pushes back on under-specified requirements: "What's the SLA for a reservation TTL? 10 seconds or 10 minutes?" "Can we have negative reserved (e.g., double-confirms)?" "Is a transfer between two warehouses a financial transaction (requires ledger) or a pure stock move?"
- Names the design patterns: Reservation is a State pattern (PENDING → CONFIRMED or RELEASED). Audit logging is an Event Sourcing pattern (immutable append-only log). StockAlertListener is an Observer. Transfer is a two-phase commit.
- Discusses concurrency deeply: identifies the critical sections (reserve, confirm, release, transfer), proposes per-warehouse or per-StockLevel locking vs a global lock, and reasons about deadlock avoidance (e.g., lock in consistent order: fromWh, then toWh, always by ID).
- Considers failure modes: what if an audit write fails after a mutation? What if a Warehouse is unavailable mid-transfer? How do you recover? (Redo logs, transactions, or accept eventual consistency.)
- Thinks about testability: how would you unit-test this without a full database? (Mock AuditLog, inject a FakeWarehouse, test StockLevel in isolation with a test harness.)

