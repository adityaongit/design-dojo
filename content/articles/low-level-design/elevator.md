---
slug: elevator
title: Elevator
type: low-level-design
difficulty: medium
askedAt: []
videoUrl: ""
updatedAt: 2026-05-03
author: ""
focusTag: "Dispatch & State Machines"
---

## Understanding the Problem

🔗 **What is Elevator?**
> Design a multi-elevator control system that dispatches requests intelligently and manages state transitions.

You're building the brains of a building. The ElevatorController receives requests from passengers (internal buttons inside elevators, external up/down buttons at each floor) and decides which elevator handles each one. Each elevator is a state machine: it's idle, moving up, or moving down. Doors open only at stops. This is a meaty problem because dispatch strategy directly impacts user wait time — pick the wrong elevator, and someone waits unnecessarily.

### Requirements

**In scope**

- Multi-elevator system (typically 3–5 elevators serving 1–15 floors)
- External hall buttons (up/down per floor) and internal destination buttons (inside each elevator)
- Elevator states: IDLE, UP, DOWN; door states: OPEN, CLOSED
- Capacity limit per elevator (typically 8 passengers)
- Request acceptance only when doors are closed and elevator is idle
- Intelligent dispatch to minimize average wait time

**Out of scope**

- Real-time visualization, mechanical failures, emergency brakes, power loss, persistent state logging, authentication

## The Set Up

### Entities & Relationships

- **ElevatorController** (orchestrator): receives requests from buttons, dispatches each to the best available elevator
- **Elevator**: owns current floor, direction, door state, passenger count, request queue. Moves between floors and opens/closes doors
- **Request**: a pair (sourceFloor, destinationFloor) with an optional direction for hall button requests
- **Floor**: owns external up/down buttons; pressing them triggers `controller.dispatch()`
- **Direction** enum: UP, DOWN, IDLE
- **DoorState** enum: OPEN, CLOSED

### Class Design

```
enum Direction { UP, DOWN, IDLE }
enum DoorState { OPEN, CLOSED }

class Request:
  sourceFloor: int
  destinationFloor: int
  direction: Direction

class Elevator:
  currentFloor: int
  direction: Direction
  doorState: DoorState
  capacity: int = 8
  passengerCount: int = 0
  requestQueue: Queue<Request>

  canAcceptRequest() -> bool:
    return doorState == CLOSED and direction == IDLE

  addRequest(request: Request) -> bool:
    if passengerCount >= capacity: return false
    requestQueue.enqueue(request)
    if direction == IDLE: updateDirection()
    return true

  move():
    if direction == IDLE or requestQueue.isEmpty(): return
    if direction == UP: currentFloor += 1
    else: currentFloor -= 1
    if isAtRequestFloor(): openDoor()

  isAtRequestFloor() -> bool:
    for req in requestQueue:
      if req.destinationFloor == currentFloor: return true
    return false

  openDoor():
    doorState = OPEN
    // Simulate passenger exit/entry
    passengerCount -= countExiting()  // requests reaching this floor
    passengerCount += countEntering()
    requestQueue.removeAll(r => r.destinationFloor == currentFloor)
    closeDoor()

  closeDoor():
    doorState = CLOSED
    updateDirection()

  updateDirection():
    if requestQueue.isEmpty():
      direction = IDLE
    else:
      minFloor = requestQueue.map(r => r.destinationFloor).min()
      maxFloor = requestQueue.map(r => r.destinationFloor).max()
      if minFloor > currentFloor: direction = UP
      else if maxFloor < currentFloor: direction = DOWN
      else: direction = UP  // arbitrary tiebreaker

  getNextStop() -> int:
    return requestQueue.isEmpty() ? -1 : requestQueue.peek().destinationFloor

class ElevatorController:
  elevators: List<Elevator>
  floors: List<Floor>

  dispatch(request: Request) -> Elevator:
    best = selectBestElevator(request)
    if best: best.addRequest(request)
    return best

  selectBestElevator(request: Request) -> Elevator:
    bestElevator = null
    bestScore = infinity

    for elevator in elevators:
      if elevator.passengerCount >= elevator.capacity: continue
      if not elevator.canAcceptRequest(): continue

      distance = abs(elevator.currentFloor - request.sourceFloor)
      penalty = 0

      if elevator.direction != IDLE:
        if elevator.direction == UP and request.sourceFloor < elevator.currentFloor:
          penalty += 5  // moving away, opposite direction
        else if elevator.direction == DOWN and request.sourceFloor > elevator.currentFloor:
          penalty += 5
        else if elevator.direction == request.direction:
          penalty = 0  // moving toward request, same direction

      score = distance + penalty
      if score < bestScore:
        bestScore = score
        bestElevator = elevator

    return bestElevator

class HallButton:
  floor: int
  direction: Direction

  press(controller: ElevatorController):
    request = Request(floor, floor + direction.sign(), direction)
    controller.dispatch(request)

class ElevatorButton:
  floor: int
  elevator: Elevator

  press():
    request = Request(elevator.currentFloor, floor, IDLE)
    elevator.addRequest(request)
```

## Implementation

The core logic lives in two methods: **dispatch()** and **move()**.

**dispatch()** scores each elevator and picks the best fit. The score balances distance (how far the elevator is) and direction alignment (is it already moving toward the request?). An elevator moving away in the opposite direction gets a large penalty; an idle elevator or one moving toward the request gets a low score.

```
selectBestElevator(request: Request) -> Elevator:
  bestElevator = null
  bestScore = infinity

  for elevator in elevators:
    // Skip if full or not idle
    if elevator.passengerCount >= elevator.capacity: continue
    if elevator.doorState != CLOSED: continue

    // Score = distance + directional penalty
    distance = abs(elevator.currentFloor - request.sourceFloor)
    penalty = 0

    if elevator.direction == IDLE:
      penalty = 0  // idle is flexible
    else if elevator.direction == request.direction:
      // Moving toward the request in the same direction
      if (elevator.direction == UP and request.sourceFloor > elevator.currentFloor) or
         (elevator.direction == DOWN and request.sourceFloor < elevator.currentFloor):
        penalty = 0  // request is "ahead" on this path
      else:
        penalty = 3  // request is "behind"; will need a detour
    else:
      penalty = 5  // opposite direction: expensive

    score = distance + penalty
    if score < bestScore:
      bestScore = score
      bestElevator = elevator

  return bestElevator
```

**move()** advances the elevator and checks for stops. The key insight: move only when doors are closed and direction is not IDLE. When the elevator reaches a requested floor, it opens the door, passengers exit/enter, and it determines the next direction from remaining requests.

```
move():
  if direction == IDLE: return  // no pending requests

  // Advance one floor
  if direction == UP: currentFloor += 1
  else: currentFloor -= 1

  // Check if this is a stop
  for req in requestQueue:
    if req.destinationFloor == currentFloor:
      openDoor()
      break

openDoor():
  doorState = OPEN
  // Simulate passenger transitions (in real code, wait 2–3 seconds)
  requestQueue.removeAll(r => r.destinationFloor == currentFloor)
  closeDoor()

closeDoor():
  doorState = CLOSED
  updateDirection()  // recalculate based on remaining requests
```

**Trace through**: User presses UP at floor 2, destination floor 8.

1. HallButton(floor=2, direction=UP).press() → controller.dispatch(Request(2, 8, UP))
2. Controller scores elevators. Assume Elevator A is at floor 3, idle: distance=1, penalty=0, score=1. Assume Elevator B at floor 1, moving DOWN: distance=1, penalty=5, score=6. Pick Elevator A.
3. Elevator A.addRequest(Request(2, 8, UP)). direction becomes UP (since 8 > 3).
4. System loop: Elevator A.move(): 3 → 2. isAtRequestFloor()? Yes (destination 8 is queued, but we check current floor 2 against all requests). Actually, destination is 8, not 2. So isAtRequestFloor() returns false. Continue.
5. Elevator A.move(): 2 → 3 → 4 → 5 → 6 → 7 → 8. isAtRequestFloor()? Yes (destination 8 matches). openDoor().
6. Passenger exits. requestQueue becomes empty. closeDoor(). direction becomes IDLE.
7. Elevator A idles; next dispatch() sends it a new request.

## Extensibility

Likely follow-ups in the interview:

- **Pluggable dispatch strategies**: Refactor dispatch logic into a `DispatchStrategy` interface with implementations: `GreedyDispatchStrategy` (current), `SCANDispatchStrategy` (scan all floors in one direction before reversing), `LOOKDispatchStrategy` (SCAN but reverse only if no more requests in current direction). ElevatorController holds a strategy and calls `strategy.selectElevator(request, elevators)`. This decouples the dispatch algorithm from the controller and lets you swap strategies without touching other code.
- **Priority requests**: Add a `priority` field to Request (NORMAL, EXPRESS, EMERGENCY). Elevator.move() dequeues the highest-priority stop, not FIFO. No changes to addRequest() or dispatch() signatures.
- **Dynamic capacity and maintenance**: Store `currentMaxCapacity` on each Elevator (not a constant). A maintenance service can call `elevator.setMaxCapacity(4)`. dispatch() checks current capacity before accepting the request.
- **External request waitlists**: Instead of dispatching to a single elevator, route to a floor-level queue. Multiple elevators can drain the same floor's queue, reducing contention and load imbalance.

## What is Expected at Each Level?

### Mid-level

- Identifies the main entities: ElevatorController, Elevator, Request, Button.
- Implements dispatch with basic distance scoring; direction is optional.
- Implements move() and door open/close logic; doors close before move.
- Handles the happy path (request → dispatch → move → stop → door open/close).
- Avoids memory leaks: dequeues completed requests.

### Senior

- Designs dispatch to include direction alignment and penalty scoring.
- Explains why direction matters: turning around is expensive for passengers.
- Implements updateDirection() to recalculate from remaining requests; elevator doesn't reverse mid-queue unnecessarily.
- Discusses thread safety if move() and dispatch() run concurrently.
- Anticipates load imbalance and sketches a fix (SCAN or load-aware scoring).

### Staff+

- Identifies the dispatch strategy as a pluggable interface; proposes GreedyDispatchStrategy, SCANDispatchStrategy, LOOKDispatchStrategy.
- Articulates the tradeoff: greedy minimizes wait for one request but can starve other floors; SCAN/LOOK spreads load.
- Discusses fair scheduling and the fairness-vs-latency tradeoff with concrete metrics (e.g., 95th percentile wait time vs max imbalance).
- Addresses timing: door-open duration, stuck-door timeout, concurrent request safety with locks or condition variables.
- Proposes testability: mock Elevator behavior, trace dispatch decisions, unit-test the scoring formula.
