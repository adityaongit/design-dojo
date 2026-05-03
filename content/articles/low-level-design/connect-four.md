---
slug: connect-four
title: Connect Four
type: low-level-design
difficulty: easy
askedAt: []
videoUrl: ""
updatedAt: 2026-05-03
author: "Aditya Jindal"
focusTag: "State Management"
---

## Understanding the Problem

🔗 **What is Connect Four?**
> A two-player turn-based game where you drop colored discs into a 7-column × 6-row grid to align four in a row—horizontally, vertically, or diagonally.

Connect Four is a straightforward game, but implementing it cleanly teaches you state ownership, turn management, and efficient win detection. You'll often see this in entry-level interviews as a warmup before jumping into more complex system design. The key challenge is deciding where rules live (on the Board? the Game? both?) and how to represent state transitions richly enough that a UI can render them.

### Requirements

**In scope**

- Two human players, alternating turns (Player 1 = RED, Player 2 = YELLOW).
- 7 columns × 6 rows; discs fall to the lowest empty cell in a chosen column.
- Win condition: four same-colored discs in a row (horizontal, vertical, or diagonal).
- Draw when the grid fills with no winner.
- Reject moves into a full column with a clear error signal.

**Out of scope**

- AI opponent (stays human vs. human).
- UI rendering, graphics, or input validation at the controller level.
- Networked or persistent game history.
- Undo moves or game reset (implied but not the focus).

State your assumptions out loud. Ask: "Should dimensions be fixed at 7×6, or configurable?" Most interviewers appreciate it if you design for parameterized board size—it's a bonus signal without extra complexity.

## The Set Up

### Entities & Relationships

Extract the meaningful nouns. Your orchestrator is the entity that drives the game loop.

- **Game**: orchestrator. Owns the Board and the two Players. Manages turn order. Reports the game state after each move.
- **Board**: owns the 2D grid of cells. Knows how to drop a disc into a column and check whether a newly-placed disc completes a winning line.
- **Player**: { name, color }. Represents each player's identity.
- **Color**: enum (RED, YELLOW). Marks which player owns a disc.
- **Cell**: holds an optional Color (empty or occupied).

**Dependency sketch**: Game depends on Board and Player. Board is the keeper of placement rules and win-detection logic. Player is a lightweight data holder.

### Class Design

For each class, define state (fields) and behavior (methods). Keep rules with the entity that owns the relevant state.

```
enum Color { RED, YELLOW }
enum GameState { IN_PROGRESS, RED_WINS, YELLOW_WINS, DRAW }

class Board:
  cells: Color?[rows][cols]
  heights: int[cols]              // next empty row per column
  rows: int
  cols: int
  winLength: int                  // default 4; can be parameterized

  dropDisc(col: int, color: Color) -> (int, int):
    // Drop disc into column; return (row, col) of placed cell or throw

  checkWin(row: int, col: int) -> bool:
    // From newly-placed cell, check 4 directions for a winning line

  isFull() -> bool:
    // True if all cells occupied (draw condition)

class Player:
  name: string
  color: Color

class Game:
  board: Board
  players: [Player, Player]
  turn: int                       // current player index (0 or 1)
  state: GameState

  playMove(col: int) -> GameState:
    // Drop disc, check win/draw, advance turn, return new state
```

## Implementation

The meaty method here is **checkWin** — write it carefully.

```
checkWin(row: int, col: int) -> bool:
  color = cells[row][col]
  directions = [(0, 1), (1, 0), (1, 1), (1, -1)]  // horiz, vert, diag1, diag2
  
  for (dr, dc) in directions:
    count = 1  // the cell itself
    count += walk(row, col, dr, dc, color)    // forward
    count += walk(row, col, -dr, -dc, color)  // backward
    if count >= winLength:
      return true
  
  return false

walk(row: int, col: int, dr: int, dc: int, color: Color) -> int:
  count = 0
  r, c = row + dr, col + dc
  while 0 <= r < rows and 0 <= c < cols and cells[r][c] == color:
    count += 1
    r += dr
    c += dc
  return count
```

**Trace through**: P1 (RED) drops col=3 → lands at (row=0, col=3). checkWin walks all four directions from (0,3); each walk finds only the single cell, so count=1 < 4. Game remains IN_PROGRESS; turn flips to P2. P2 (YELLOW) drops col=3 → lands at (1,3). Moves alternate. Eventually RED has placed discs at (0,0), (1,1), (2,2), (3,3)—a diagonal. When RED plays (3,3), checkWin walks the (1,1) direction backward and finds 3 more RED cells; total count = 4. Returns true. Game state → RED_WINS.

## Extensibility

Likely follow-ups in the interview:

- **AI opponent**: Lift Player to an interface with a `chooseColumn(board: Board) -> int` method. HumanPlayer prompts a UI for input. AIPlayer runs minimax or a heuristic. Game.playMove just calls `currentPlayer.chooseColumn(board)`, agnostic to the source.
- **N-in-a-row variant** (e.g., Connect 5): Your Board constructor already accepts winLength as a parameter. Swap `new Board(6, 7, 4)` for `new Board(9, 9, 5)`. No code changes elsewhere.
- **Networked play**: Introduce a MoveSource abstraction. LocalMoveSource reads from keyboard; RemoteMoveSource blocks until a move arrives from the peer over WebSocket. Game.playMove doesn't change; only the source of the column number changes. Authoritative state lives server-side; clients receive state diffs.

## What is Expected at Each Level?

### Mid-level

- Identifies the primary entities (Game, Board, Player, Color) and their state.
- Implements dropDisc and the happy path correctly.
- Win-check considers all four directions.
- Bounds-checked array access; no off-by-one errors in walks.
- Clear method signatures that return structured results (enum, tuple), not bare booleans.

### Senior

- Designs Board to own placement and win-detection logic; Game orchestrates turns but doesn't recompute state.
- Uses an O(winLength) win-check that walks only from the newly-placed cell, not a naive O(rows×cols) full-board scan.
- Distinguishes error cases: column out-of-bounds (throw), column full (throw with a specific exception), game already finished (return current state).
- Parameterizes board dimensions and win length in the constructor; validates invariants once at construction.
- Mentions the heights array as an optimization for O(1) column-drop lookup.

### Staff+

- Pushes back on under-specified requirements: "Should dimensions be fixed? Configurable? What if someone tries to drop in column 99 on a 7-wide board?"
- Identifies the design pattern at play: *Strategy* (Player interface for AI vs. human), *State* machine (GameState enum), *Repository* or *Aggregate* (Board as the root entity for grid state).
- Speaks to testability: "I'd test Board.checkWin independently with synthetic cell grids. Game.playMove as an integration test that traces a full game."
- Discusses the heights array trade-off: faster dropDisc (O(1)) vs. extra space (O(cols)) and synchronization risk if cells are mutated elsewhere.
- Considers trace-ability: returning the winning cell coordinates (not just a bool) so the UI can highlight the four cells.

