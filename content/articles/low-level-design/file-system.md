---
slug: file-system
title: File System
type: low-level-design
difficulty: medium
askedAt: []
videoUrl: ""
updatedAt: 2026-05-03
author: ""
focusTag: "Hierarchical Trees"
---

## Understanding the Problem

🔗 **What is a file system?**
> An in-memory hierarchical file system with directory creation, listing, file I/O, and path resolution semantics.

You're building an in-memory file tree — think of the directory structure on your laptop, but without persistence or the OS. Your job is to implement four core operations: create directories recursively, list sorted contents, write to files with auto-creating parent paths, and read file content. The tricky part is handling intermediate directories that don't exist yet, validating paths (making sure you can't read a directory as a file), and thinking through what happens when multiple threads touch the tree at once.

### Requirements

**In scope**

- `mkdir(path)`: create directories along an absolute path, auto-creating intermediates if needed.
- `ls(path)`: return a lexicographically sorted list of file and directory names in a directory; if the path is a file, return just `[filename]`.
- `addContentToFile(path, content)`: create a file with content or append to an existing file; auto-create parent directories.
- `readContentFromFile(path)`: return the full text content of a file.
- Path format: absolute paths like `/a/b/c`; root is `/`.
- Error handling: throw exceptions when reading a directory as a file, accessing non-existent paths, or traversing through a file in the middle of a path.

**Out of scope**

- File deletion or move/rename operations.
- Symbolic links or hard links.
- Permissions, ownership, or access control.
- Disk quotas or size limits.
- Concurrency control (you'll discuss it in a deep dive, but core design is single-threaded).

## The Set Up

### Entities & Relationships

You have five key classes:

- **FileSystem** (orchestrator): holds the root node, exposes the four main operations. Routes all path traversals through itself.
- **Node** (abstract base class): represents both files and directories; owns a name field. File and Directory both inherit from this.
- **File** (Node subclass): owns a content string. Append operations mutate this.
- **Directory** (Node subclass): owns a `Map<String, Node>` of children, keyed by name.
- **Path resolution helper**: a private method that walks the tree from root, splitting the path by `/`, validating at each step, and optionally creating missing directories.

The core dependency: FileSystem depends on Node hierarchy. Within the tree, each Directory can reference any mix of Files and Directories as children.

### Class Design

```
abstract class Node:
  name: String
  
  constructor(name: String):
    this.name = name

class File(Node):
  content: String = ""
  
  constructor(name: String):
    super(name)
  
  append(text: String) -> void:
    content += text

class Directory(Node):
  children: Map<String, Node> = {}
  
  constructor(name: String):
    super(name)
  
  addChild(node: Node) -> void:
    children[node.name] = node
  
  getChild(name: String) -> Node?:
    return children.get(name)
  
  removeChild(name: String) -> void:
    children.remove(name)

class FileSystem:
  root: Directory = Directory("/")
  
  mkdir(path: String) -> void:
    // Create directories along path, recursively
  
  ls(path: String) -> List<String>:
    // Return sorted names of children; special case if path is a file
  
  addContentToFile(path: String, content: String) -> void:
    // Ensure parent dirs exist, then create or append to file
  
  readContentFromFile(path: String) -> String:
    // Retrieve file content; throw if path is a directory
  
  // Private helper:
  getNode(path: String) -> Node?:
    // Walk from root, return target node or None
  
  ensurePath(path: String, createDirs: boolean) -> Directory:
    // Walk from root, creating missing directories if needed
```

## Implementation

The meaty method is **path resolution**. Write it once and reuse it across all four operations.

```
getNode(path: String) -> Node?:
  parts = path.split('/').filter(p => p != '')  // split and remove empty parts
  current = root
  for part in parts:
    if current is File:
      return None  // can't traverse into a file
    if not current.children.contains(part):
      return None  // component missing
    current = current.children[part]
  return current

ensurePath(path: String, createDirs: boolean) -> Directory:
  parts = path.split('/').filter(p => p != '')
  current = root
  for part in parts:
    if current is File:
      throw NotADirectoryException("Cannot traverse through " + current.name)
    if not current.children.contains(part):
      if not createDirs:
        throw FileNotFoundException(path)
      newDir = Directory(part)
      current.addChild(newDir)
      current = newDir
    else:
      next = current.children[part]
      if next is File:
        throw NotADirectoryException("File in path: " + part)
      current = next
  return current

mkdir(path: String) -> void:
  ensurePath(path, createDirs=true)

addContentToFile(path: String, content: String) -> void:
  lastSlash = path.lastIndexOf('/')
  if lastSlash == -1:
    throw InvalidPathException(path)
  parentPath = path.substring(0, lastSlash)
  if parentPath == '':
    parentPath = '/'
  fileName = path.substring(lastSlash + 1)
  
  parentDir = ensurePath(parentPath, createDirs=true)
  if parentDir.children.contains(fileName):
    node = parentDir.children[fileName]
    if node is Directory:
      throw NotAFileException("Cannot write to directory " + fileName)
    ((File) node).append(content)
  else:
    file = File(fileName)
    file.append(content)
    parentDir.addChild(file)

readContentFromFile(path: String) -> String:
  node = getNode(path)
  if node == None:
    throw FileNotFoundException(path)
  if node is Directory:
    throw NotAFileException("Cannot read directory: " + path)
  return ((File) node).content

ls(path: String) -> List<String>:
  node = getNode(path)
  if node == None:
    throw FileNotFoundException(path)
  if node is File:
    return [node.name]
  names = ((Directory) node).children.keySet()
  return names.sorted()
```

**Trace through a scenario:**
1. `mkdir("/a/b")`: ensurePath splits into ["a", "b"], creates Directory("a") under root, then Directory("b") under "a". Tree is now `root -> a -> b`.
2. `addContentToFile("/a/b/file.txt", "hello")`: parentPath is "/a/b", ensurePath returns existing Directory("b"), creates File("file.txt"), appends "hello". Tree: `root -> a -> b -> file.txt [content: "hello"]`.
3. `addContentToFile("/a/b/file.txt", " world")`: ensurePath returns existing "b", finds existing File("file.txt"), appends " world". Content is now "hello world".
4. `readContentFromFile("/a/b/file.txt")`: getNode returns File, returns "hello world".
5. `ls("/a/b")`: getNode returns Directory("b"), returns sorted(["file.txt"]) = `["file.txt"]`.

## Extensibility

Likely follow-ups during the interview:

- **File deletion (`rm(path)`)**: Add `Directory.removeChild(name: String) -> void`. Then `rm(path)` parses the path, gets the parent directory, and calls `removeChild(filename)`. The deleted Directory's entire subtree is immediately unreachable, and the garbage collector cleans it up — no explicit recursive walk needed.

- **Move/rename operations**: If you add parent pointers to each node, or track both parent and name, you can implement `mv(fromPath, toPath)` by removing the node from the old parent's children map and inserting it into the new parent. Rename is just updating the node's name field and re-parenting.

- **Symbolic links**: Create a `Link(Node target)` subclass of Node. When resolving a path, if you hit a Link, follow `link.getTarget()` and continue from there. Track visited nodes during resolution to detect cycles.

- **Permissions**: Add a `permissions: Perms` field to every Node (e.g., `{ owner, group, rwx }`). Check permissions at the start of each operation before proceeding. The field lives on the entity that owns the data (Node itself).

## What is Expected at Each Level?

### Mid-level

- Identifies the three primary entities: FileSystem (orchestrator), Node hierarchy (File/Directory), and path resolution.
- Implements getNode and ensurePath correctly for the happy path (creating directories, reading files).
- Handles at least one error case: reading a file as a directory, or a directory as a file.
- Returns the right types: `List<String>` for ls, `String` for read, `void` for write.

### Senior

- Encapsulates path splitting logic into a reusable helper (getNode or ensurePath).
- Distinguishes between read operations (should fail on missing components) and write operations (should auto-create).
- Throws specific exception types (FileNotFoundException, NotADirectoryException, NotAFileException) to signal different errors.
- Traces through a multi-step scenario: mkdir, add, add again, read, ls — catching off-by-one or type errors.
- Discusses why Directory.removeChild makes cascading deletion trivial (no explicit recursion).

### Staff+

- Challenges the vague parts of the spec upfront: "Does mkdir on an existing directory succeed or fail? Is addContentToFile idempotent?" and adjusts the implementation accordingly.
- Recognizes the composite pattern in the Node hierarchy and speaks to why it's clean for this problem.
- Identifies thread-safety concerns (race conditions in concurrent mkdir, concurrent read/append) and proposes a concrete fix (single ReentrantReadWriteLock on FileSystem, or per-directory locks with careful ordering).
- Sketches how to extend for deletion, links, or permissions without rewriting the core tree logic.
- Considers testability: "How would I unit test path resolution in isolation?"
