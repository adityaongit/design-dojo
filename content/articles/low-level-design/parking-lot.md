---
slug: parking-lot
title: Parking Lot
type: low-level-design
difficulty: medium
askedAt: [Amazon, Google, Microsoft]
videoUrl: ""
updatedAt: 2026-05-03
author: "Aditya Jindal"
focusTag: "Hierarchies & Strategy Pattern"
---

## Understanding the Problem

🔗 **What is a Parking Lot Management System?**
> A system that assigns vehicles to parking spots, tracks occupancy, issues tickets, and calculates exit fees based on vehicle type and duration.

You'll design a parking lot orchestrator that handles multiple levels, three spot types (compact, regular, oversized), and three vehicle types (motorcycle, car, truck). The interviewer wants to see how you model vehicle/spot hierarchies, decouple pricing logic, and handle spot assignment constraints. This is a classic object-oriented design problem — expect to name design patterns and explain encapsulation choices.

### Requirements

**In scope**

- Multi-level parking lot. Each level has compact, regular, and oversized spots.
- Vehicle types: motorcycle, car, truck. Each fits certain spot sizes (motorcycle fits all; car fits regular and oversized; truck fits oversized only).
- Entry gate: assign the first available spot matching vehicle size, issue a `ParkingTicket` with entry time.
- Exit gate: validate ticket, calculate fee based on vehicle type and duration, mark spot free.
- Configurable pricing strategies (hourly rates, daily flat rates, peak surcharges).

**Out of scope**

- Real payment processing. Assume a payment service exists.
- Reservations or waiting lists.
- Vehicle license plate OCR or license checking.
- Persistence or distributed systems.

State your assumptions clearly with the interviewer: "I'm assuming we track entry time as a Unix timestamp, duration in minutes, and pricing strategy is plugged in at lot initialization."

## The Set Up

### Entities & Relationships

Extract the meaningful nouns and pick your orchestrator — the entity that drives entry/exit:

- **ParkingLot** (orchestrator): coordinates entry and exit, holds multiple levels, delegates spot-finding.
- **Level**: owns three lists of spots (compact, regular, oversized), finds the first available spot matching vehicle size.
- **ParkingSpot** (hierarchy): base class with subclasses `CompactSpot`, `RegularSpot`, `OversizedSpot`. Each tracks occupancy and knows which vehicle types fit.
- **Vehicle** (hierarchy): base class with subclasses `Motorcycle`, `Car`, `Truck`. Each carries a size enum to determine which spots fit.
- **ParkingTicket**: issued at entry, validated at exit. Holds `vehicleId`, `entryTime`, `spotId`, `levelId`.
- **PricingStrategy** (interface): `calculateFee(vehicleType, durationMinutes) -> double`. Plugged into the lot for flexibility.

Sketch the dependency: `ParkingLot` depends on `Level`, which depends on `ParkingSpot`. `Vehicle` is independent. `ParkingTicket` is a value object. `PricingStrategy` is injected into `ParkingLot`.

### Class Design

For each class, define state (fields) and behavior (methods). Keep rules with the entity that owns the relevant state:

```
enum VehicleType { MOTORCYCLE, CAR, TRUCK }
enum SpotSize { COMPACT, REGULAR, OVERSIZED }
enum SpotStatus { FREE, OCCUPIED }

class Vehicle:
  id: String
  type: VehicleType
  size: SpotSize
  
  constructor(id: String, type: VehicleType):
    this.id = id
    this.type = type
    this.size = mapTypeToSize(type)  // motorcycle → COMPACT, car → REGULAR, truck → OVERSIZED

class ParkingSpot:
  id: String
  spotSize: SpotSize
  status: SpotStatus = FREE
  occupiedBy: Vehicle? = null
  
  canFit(vehicle: Vehicle) -> bool:
    if status == OCCUPIED:
      return false
    return vehicle.size <= spotSize

class CompactSpot extends ParkingSpot:
  constructor(id: String):
    super(id, SpotSize.COMPACT)

class RegularSpot extends ParkingSpot:
  constructor(id: String):
    super(id, SpotSize.REGULAR)

class OversizedSpot extends ParkingSpot:
  constructor(id: String):
    super(id, SpotSize.OVERSIZED)

class Level:
  levelNumber: int
  compactSpots: List<CompactSpot>
  regularSpots: List<RegularSpot>
  oversizedSpots: List<OversizedSpot>
  
  findAvailableSpot(vehicle: Vehicle) -> ParkingSpot?:
    if vehicle.size == SpotSize.COMPACT:
      return findInOrder([compactSpots, regularSpots, oversizedSpots], vehicle)
    elif vehicle.size == SpotSize.REGULAR:
      return findInOrder([regularSpots, oversizedSpots], vehicle)
    else:  // OVERSIZED
      return findInOrder([oversizedSpots], vehicle)
  
  private findInOrder(spotLists: List<List<ParkingSpot>>, vehicle: Vehicle) -> ParkingSpot?:
    for spotList in spotLists:
      for spot in spotList:
        if spot.canFit(vehicle):
          return spot
    return null

class ParkingTicket:
  id: String
  vehicleId: String
  entryTime: long  // milliseconds
  spotId: String
  levelId: int
  
  constructor(id: String, vehicleId: String, entryTime: long, spotId: String, levelId: int):
    this.id = id
    this.vehicleId = vehicleId
    this.entryTime = entryTime
    this.spotId = spotId
    this.levelId = levelId

interface PricingStrategy:
  calculateFee(vehicleType: VehicleType, durationMinutes: long) -> double

class HourlyPricingStrategy implements PricingStrategy:
  rates: Map<VehicleType, double> = {
    MOTORCYCLE: 2.0,
    CAR: 4.0,
    TRUCK: 6.0
  }
  
  calculateFee(vehicleType: VehicleType, durationMinutes: long) -> double:
    hours = ceil(durationMinutes / 60.0)
    return hours * rates[vehicleType]

class ParkingLot:
  id: String
  levels: List<Level>
  pricingStrategy: PricingStrategy
  ticketMap: Map<String, ParkingTicket> = {}
  
  parkVehicle(vehicle: Vehicle) -> ParkingTicket throws NoAvailableSpotException:
    for level in levels:
      spot = level.findAvailableSpot(vehicle)
      if spot != null:
        spot.status = SpotStatus.OCCUPIED
        spot.occupiedBy = vehicle
        ticket = new ParkingTicket(generateId(), vehicle.id, now(), spot.id, level.levelNumber)
        ticketMap[ticket.id] = ticket
        return ticket
    throw NoAvailableSpotException("All levels full")
  
  unparkVehicle(ticket: ParkingTicket) -> double throws InvalidTicketException:
    if !ticketMap.containsKey(ticket.id):
      throw InvalidTicketException("Ticket not found")
    
    level = findLevel(ticket.levelId)
    spot = level.findSpotById(ticket.spotId)
    
    if spot == null or spot.status == SpotStatus.FREE:
      throw InvalidTicketException("Spot already freed")
    
    vehicle = spot.occupiedBy
    durationMinutes = (now() - ticket.entryTime) / 1000 / 60
    fee = pricingStrategy.calculateFee(vehicle.type, durationMinutes)
    
    spot.status = SpotStatus.FREE
    spot.occupiedBy = null
    ticketMap.remove(ticket.id)
    
    return fee
  
  getAvailableSpotCount() -> Map<SpotSize, int>:
    counts = { COMPACT: 0, REGULAR: 0, OVERSIZED: 0 }
    for level in levels:
      counts[COMPACT] += level.compactSpots.count(s => s.status == FREE)
      counts[REGULAR] += level.regularSpots.count(s => s.status == FREE)
      counts[OVERSIZED] += level.oversizedSpots.count(s => s.status == FREE)
    return counts
```

## Implementation

The meaty methods here are **`parkVehicle`** and **`unparkVehicle`** — they orchestrate spot assignment and payment. Write them carefully.

```
parkVehicle(vehicle: Vehicle) -> ParkingTicket:
  // Iterate levels in order; first level with a free spot wins
  for each level in levels:
    availableSpot = level.findAvailableSpot(vehicle)
    if availableSpot != null:
      availableSpot.status = OCCUPIED
      availableSpot.occupiedBy = vehicle
      // Create and store ticket; return it
      ticket = new ParkingTicket(
        id = generateUniqueId(),
        vehicleId = vehicle.id,
        entryTime = System.currentTimeMillis(),
        spotId = availableSpot.id,
        levelId = level.levelNumber
      )
      ticketMap[ticket.id] = ticket
      return ticket
  // No spot found across all levels
  throw NoAvailableSpotException("Lot full for " + vehicle.type)

unparkVehicle(ticket: ParkingTicket) -> double:
  // Validate ticket exists
  if ticket not in ticketMap:
    throw InvalidTicketException("Ticket " + ticket.id + " not found")
  
  // Locate the spot and vehicle
  level = findLevel(ticket.levelId)
  spot = level.findSpotById(ticket.spotId)
  
  if spot == null or spot.status == FREE:
    throw InvalidTicketException("Spot already freed or invalid")
  
  // Calculate duration and fee
  vehicle = spot.occupiedBy
  durationMinutes = (System.currentTimeMillis() - ticket.entryTime) / 1000 / 60
  fee = pricingStrategy.calculateFee(vehicle.type, durationMinutes)
  
  // Free the spot
  spot.status = FREE
  spot.occupiedBy = null
  ticketMap.remove(ticket.id)
  
  return fee
```

**Trace through**: A motorcycle (id=M-42, size=COMPACT) enters at t=10,000ms into a lot with 2 levels.

1. `parkVehicle(M-42)` called. Level 0 is searched for available spots. `Level.findAvailableSpot(M-42)` tries compact spots first (motorcycle wants COMPACT). First compact spot C-01 is free, so it's returned.
2. C-01 is marked OCCUPIED and occupied by M-42. A ticket is created: `ParkingTicket(id=TKT-001, vehicleId=M-42, entryTime=10000, spotId=C-01, levelId=0)`. Ticket is stored and returned.
3. Motorcycle parks for 90 minutes (5,400,000ms elapsed).
4. At t=5,410,000ms, `unparkVehicle(TKT-001)` is called. Ticket is found. Level 0, spot C-01 is located and is OCCUPIED by M-42.
5. Duration = (5,410,000 - 10,000) / 1000 / 60 = 90 minutes. Fee = `HourlyPricingStrategy.calculateFee(MOTORCYCLE, 90)` = ceil(90/60) × $2 = 2 × $2 = **$4**.
6. C-01 is marked FREE. M-42 is removed. Ticket is deleted. $4 is returned to the exit gate.

## Extensibility

Likely follow-ups in the interview:

- **Reserved spots for EVs or disabled parking**: Extend `ParkingSpot` with an `isReservedFor` field (enum: NONE, ELECTRIC, DISABLED). In `Level.findAvailableSpot`, skip reserved spots unless the vehicle matches. This keeps the reservation logic inside Level, not the lot.
- **Dynamic pricing (peak hours, weekend surcharge)**: Change `PricingStrategy.calculateFee` to accept `entryTime` and `exitTime` as parameters. `PeakHourPricingStrategy` checks the hour-of-day and multiplies by 1.5x during 9am–6pm. `WeekendPricingStrategy` applies a 2x multiplier on Saturday/Sunday. No changes to the lot; only strategy implementations swap.
- **Spot compaction or fragmentation analysis**: Add a `Level.getFragmentationScore()` method that penalizes scattered free spots. Use this to prioritize which level to assign to (prefer compact-free levels). This is a follow-up to "How do we minimize wasted space?"
- **Concurrent entry/exit without race conditions**: Introduce `synchronized` blocks or fine-grained locks (per-spot locking). The simplest fix is to synchronize `parkVehicle` and `unparkVehicle` on the lot object, protecting all state transitions atomically.

## What is Expected at Each Level?

### Mid-level

- Names the core entities: Vehicle, ParkingSpot, Level, ParkingLot, ParkingTicket, PricingStrategy.
- Implements a vehicle/spot hierarchy (subclasses, not giant type-checking if-statements).
- Writes `parkVehicle` that finds an available spot and returns a ticket; `unparkVehicle` that calculates fee and frees the spot.
- Correctly computes duration from entry/exit timestamps and applies pricing (no off-by-one in minute/hour conversion).

### Senior

- Designs `canFit(vehicle)` as a polymorphic method on ParkingSpot, not a series of type checks in the lot.
- Recognizes the Strategy pattern for `PricingStrategy` and explains how to swap strategies at runtime without touching the lot.
- Returns structured types from methods (e.g., `ParkingTicket`, not a bare string ID). Handles exceptions explicitly (InvalidTicketException, NoAvailableSpotException).
- Anticipates at least one follow-up (e.g., reserved spots or dynamic pricing) and sketches the seam in the design that makes it clean.

### Staff+

- Pushes back on under-specified requirements: "What should happen if a ticket is used twice? Should we track which spot was assigned so we can validate a vehicle doesn't park in the wrong spot?"
- Names the design patterns in play: Strategy (pricing), Template Method (spot assignment), Inheritance (vehicle/spot hierarchies). Speaks to why encapsulation is critical (e.g., "Spot owns the canFit logic, not the lot, so new spot types don't require lot changes").
- Considers concurrency: "If two vehicles try to park simultaneously, how do we prevent double-booking the same spot? Synchronized methods or locks at the lot level?"
- Discusses testability: "How do I unit-test parkVehicle in isolation? I'd inject a mock PricingStrategy and mock Level, then verify the ticket is created and the spot is marked occupied."
