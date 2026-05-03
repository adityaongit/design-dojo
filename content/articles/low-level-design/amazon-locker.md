---
slug: amazon-locker
title: Amazon Locker
type: low-level-design
difficulty: easy
askedAt: []
videoUrl: ""
updatedAt: 2026-05-03
author: "Aditya Jindal"
focusTag: "State Machines"
---

## Understanding the Problem

🔗 **What is Amazon Locker?**
> A self-service package pickup system where customers retrieve packages from secure compartments using OTP codes, with automatic expiry after 3 days.

Amazon Locker asks you to design a slot-assignment engine and a state machine for package lifecycle. The core challenge is matching package dimensions to compartment sizes without wasting space, and managing a multistate workflow—from assignment through storage to pickup or expiry. You'll practice ownership of rules (where does best-fit logic live?), state transitions (enum design), and validation (OTP checks).

### Requirements

**In scope**

- Packages with physical dimensions (length, width, height) must fit into sized compartments (SMALL, MEDIUM, LARGE).
- Best-fit assignment: prefer the smallest slot that fits the package.
- OTP generation and validation for secure pickup; code valid for 1 hour.
- Package state machine: ASSIGNED → STORED → PICKED_UP or EXPIRED.
- Automatic expiry 3 days after assignment; customers cannot pick up expired packages.
- Delivery agent scans barcode and marks package as STORED.

**Out of scope**

- Multi-locker network orchestration or fallback routing.
- Persistent database schema or transactions.
- Customer notification logic (email, SMS, push).
- Admin refund or return-logistics handling.

State your assumptions: Will you hard-code the 3-day window, or make it configurable? Are size thresholds fixed or parameterized? Most interviewers appreciate that flexibility—ask first, then design accordingly.

## The Set Up

### Entities & Relationships

Extract the meaningful nouns. Your orchestrator manages the workflow.

- **AmazonLocker**: orchestrator. Owns slots, packages, and OTP registry. Drives assignment, storage, and pickup.
- **Slot**: a compartment with a fixed size class (SMALL, MEDIUM, LARGE) and availability flag.
- **Package**: represents a parcel with dimensions, state, assigned slot, and expiry time.
- **OTP**: a single-use security code tied to a slot; valid for 1 hour.
- **Dimension**: encapsulates length, width, height; knows whether it fits in a size class.
- **Size**: enum (SMALL, MEDIUM, LARGE) with volume ranges.
- **PackageState**: enum (ASSIGNED, STORED, PICKED_UP, EXPIRED).

**Dependency sketch**: AmazonLocker depends on Slot, Package, Dimension, OTP. Package owns a reference to its assigned Slot. Slot tracks its assigned Package. OTP is tied to a Slot and is consumed on valid pickup.

### Class Design

For each class, define state (fields) and behavior (methods). Keep rules with the entity that owns the relevant state.

```
enum Size { SMALL, MEDIUM, LARGE }
enum PackageState { ASSIGNED, STORED, PICKED_UP, EXPIRED }

class Dimension:
  length: int
  width: int
  height: int
  
  fitsInSize(size: Size) -> bool:
    // SMALL: all dims <= 12cm; MEDIUM: all dims <= 20cm; LARGE: all dims <= 30cm

class Slot:
  slotId: string
  size: Size
  available: bool
  assignedPackageId: string?

class Package:
  packageId: string
  dimension: Dimension
  state: PackageState
  assignedSlotId: string?
  createdTime: long
  expiryTime: long         // now + 3 days

class OTP:
  code: string             // 6 random digits
  slotId: string
  expiryTime: long         // now + 1 hour
  
  isValid(code: string, now: long) -> bool

class AmazonLocker:
  slots: Map<string, Slot>
  packages: Map<string, Package>
  otpMap: Map<string, OTP>
  sizeStrategy: SlotAssignmentStrategy
  
  assignPackage(pkg: Package) -> (Slot, OTP):
    // Find available slots that fit dimension, apply best-fit, assign, generate OTP
  
  storePackage(barcode: string, slotId: string) -> void:
    // Verify package is assigned to slot, transition to STORED
  
  pickupPackage(slotId: string, otpCode: string) -> Package:
    // Validate OTP, check expiry, transition to PICKED_UP, free slot
  
  generateOTP(slotId: string) -> OTP:
    // Create 6-digit code, store with 1-hour expiry
```

## Implementation

The meaty method is **assignPackage**—the best-fit algorithm. Write it carefully.

```
assignPackage(pkg: Package) -> (Slot, OTP):
  // Find slots that fit the package dimension
  candidates = []
  for each slot in slots.values():
    if slot.available and pkg.dimension.fitsInSize(slot.size):
      candidates.append(slot)
  
  if candidates.empty():
    throw NoAvailableSlotException("No compartment fits this package")
  
  // Best-fit: pick smallest slot by volume
  bestSlot = min(candidates, key=lambda s: s.size.volume())
  
  // Assign and transition state
  pkg.state = ASSIGNED
  pkg.assignedSlotId = bestSlot.slotId
  pkg.expiryTime = now() + 3 days
  bestSlot.available = false
  bestSlot.assignedPackageId = pkg.packageId
  
  // Generate single-use OTP
  otp = generateOTP(bestSlot.slotId)
  
  return (bestSlot, otp)

pickupPackage(slotId: string, otpCode: string) -> Package:
  // Validate OTP before unlock
  otp = otpMap.get(slotId)
  if otp == null or otp.code != otpCode or otp.expiryTime < now():
    throw InvalidOTPException("OTP invalid or expired")
  
  // Check package state
  slot = slots[slotId]
  pkg = packages[slot.assignedPackageId]
  
  if pkg.state == EXPIRED:
    throw PackageExpiredException("Package expired 3 days ago")
  
  if pkg.expiryTime < now():
    pkg.state = EXPIRED
    throw PackageExpiredException("Package expired")
  
  // Release
  pkg.state = PICKED_UP
  slot.available = true
  slot.assignedPackageId = null
  otpMap.remove(slotId)
  
  return pkg
```

**Trace through**: P1 (10cm × 8cm × 6cm) arrives. Locker has:
- SMALL (12cm × 10cm × 8cm) — available
- MEDIUM (20cm × 15cm × 12cm) — available
- LARGE (30cm × 20cm × 15cm) — occupied

1. assignPackage(P1): candidates = [SMALL, MEDIUM]. bestSlot = SMALL (smallest). P1.state = ASSIGNED, P1.expiryTime = now + 3 days, SMALL.available = false, SMALL.assignedPackageId = P1. otp = '543210'. Return (SMALL, '543210'). Customer gets SMS with code.

2. Delivery agent scans P1, calls storePackage('P1', 'SMALL'): P1.state = STORED.

3. Customer arrives, enters OTP '543210': pickupPackage('SMALL', '543210'): otp valid? yes. P1.expiryTime > now? yes. P1.state = PICKED_UP. SMALL.available = true. Return P1. Locker dispenses.

## Extensibility

Likely follow-ups in the interview:

- **Slot-assignment strategies**: Abstract SlotAssignmentStrategy with BestFitStrategy, FirstFitStrategy implementations. AmazonLocker.sizeStrategy swaps at runtime. assignPackage remains unchanged—just calls sizeStrategy.selectSlot(candidates).

- **Multi-size support**: Instead of discrete Size enum, parameterize dimension ranges per size in a config map. Dimension.fitsInSize becomes a registry lookup. Scales naturally without code duplication.

- **Priority packages**: Add priority field to Package. Sort candidates by (size, then priority) before selecting. Premium customers get medium slots even if large is available. seam: candidates sorted by custom comparator.

## What is Expected at Each Level?

### Mid-level

- Identifies primary entities: AmazonLocker, Slot, Package, Dimension, OTP.
- Implements assignPackage and pickupPackage correctly.
- Validates OTP on every pickup attempt; checks expiry.
- Bounds-checked slot lookups; no null dereference.
- Clear return types: assignPackage returns (Slot, OTP), not bare bool.

### Senior

- Designs Dimension as a class that owns the "fits in size" logic.
- Best-fit selection: avoids wasting large slots on small packages.
- OTP is single-use: deleted from otpMap after valid pickup.
- Package state machine enforced: ASSIGNED → STORED → PICKED_UP or EXPIRED.
- Encapsulates OTP validation—expiry checked on access, not cached.
- Distinguishes error cases: no slot (throw NoAvailableSlot), invalid OTP (throw InvalidOTP), expired package (throw PackageExpired).

### Staff+

- Pushes back: "Should size thresholds be fixed, or read from a config?" Designs constructor to accept dimension ranges.
- Identifies the design pattern: *Strategy* (SlotAssignmentStrategy interface for best-fit vs. first-fit), *State* machine (PackageState enum with enforced transitions).
- Testability: "I'd test Dimension.fitsInSize with synthetic bounds. Test assignPackage with mock Slots. Test OTP validation independently."
- Discusses the 3-day expiry window: lazy vs. eager cleanup. Lazy (check on access) saves a background job; eager (daily cleanup) surfaces expired packages immediately. Trade-off: memory vs. responsiveness.
- Considers return richness: assignPackage returns both Slot and OTP; pickupPackage returns the Package. UI gets actionable data.
