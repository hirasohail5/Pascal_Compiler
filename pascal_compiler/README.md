# Pascal Subset Mini Compiler
**CS-471L Compiler Construction Lab - Spring 2026**  
University of Engineering and Technology, Lahore

---

## Project Overview

A complete Mini Compiler System for a subset of Pascal, built as an integrated lab project. The system includes a C++ compiler backend exposed via a Node.js REST API, and a React frontend for visualising all compiler phases.

**Modules implemented:**
- Module 1 — Lexical Analyser (double-buffered, tracks line/column)
- Module 2 — Recursive Descent Parser (builds AST)
- Module 3 — LL(1) Predictive Parser (FIRST/FOLLOW sets, parsing table, stack trace)
- Module 4 — LALR(1) Parser (action/goto tables + shift-reduce trace)
- Module 5 — Symbol Table Manager (nested scope support, kind/type tracking)

---

## Features

- Upload any `.pas` Pascal source file
- **Full compiler pipeline:** Lexer → RD Parser → LL(1) Parser → LALR(1) Parser → Symbol Table
- Animated phase-by-phase visualisation with live status indicators
- Token stream table with search and pagination
- Abstract Syntax Tree display
- LL(1) FIRST & FOLLOW sets, parsing table, and stack trace
- LALR(1) grammar productions, action table, goto table, and shift-reduce trace
- Symbol Table with nested scope cards and flat view (name, kind, type, line, scope level)
- Lexer-only, RD Parser-only, LL(1)-only, LALR(1)-only, and Symbol Table-only modes
- Dark, minimal, VS Code-inspired UI

---

## Prerequisites

- **C++ compiler:** g++ with C++17 support (MinGW-w64 on Windows via MSYS2, GCC 7+ on Linux)
- **Node.js:** v18 or higher
- **npm:** v8 or higher

---

## Installation & Running

### 1. Build the C++ compiler binary

**Windows — MSYS2 MinGW 64-bit terminal:**
```bash
cd "/c/Users/<YourName>/path/to/pascal_compiler"
mingw32-make clean
mingw32-make
```

**Linux / macOS:**
```bash
make
```

This produces `pascal_compiler.exe` (Windows) or `pascal_compiler` (Linux/macOS) in the project root.

**Verify the build:**
```bash
./pascal_compiler.exe test/gcd.pas --tokens-only
```

---

### 2. Start the API server

Open a CMD or PowerShell window:
```cmd
cd path\to\pascal_compiler\server
npm install
node index.js
```
Server runs on **http://localhost:3001**

You should see:
```
Binary exists: true
Pascal Compiler API running on http://localhost:3001
```

---

### 3. Start the frontend

Open a **second** CMD or PowerShell window:
```cmd
cd path\to\pascal_compiler\frontend
npm install
npm run dev
```
App runs on **http://localhost:5173**

---

## Environment Variables

Create `frontend/.env` to override the API URL:
```text
VITE_API_URL=http://localhost:3001
```
Default is `http://localhost:3001` if the file is absent.

---

## Compiler Pipeline

When you click **Run Compiler**, the system runs all five phases sequentially on your `.pas` file:

| # | Phase | Description |
|---|-------|-------------|
| 1 | Lexical Analysis | Tokenises the source using a double-buffered scanner |
| 2 | RD Parser | Recursive Descent parser builds the Abstract Syntax Tree |
| 3 | LL(1) Parser | Predictive top-down parser using FIRST/FOLLOW sets and a parsing table |
| 4 | LALR(1) Parser | Bottom-up shift-reduce parser with action/goto tables |
| 5 | Symbol Table | Builds a scoped symbol table (variables, functions, procedures, arrays) |

Each phase shows its own result section with full details as it completes.

---

## API Endpoints

| Method | Endpoint         | Description                              |
|--------|------------------|------------------------------------------|
| GET    | /api/health      | Health check, binary status              |
| POST   | /api/compile     | Full pipeline (lexer + RD parser)        |
| POST   | /api/lex         | Lexer only (`--tokens-only` mode)        |
| POST   | /api/parse       | RD Parser + AST                          |
| POST   | /api/ll1-parse   | LL(1) predictive parser                  |
| POST   | /api/lr-parse    | LALR(1) shift-reduce parser              |
| POST   | /api/symbols     | Symbol table with nested scope data      |

All POST endpoints accept `multipart/form-data` with a `file` field containing the `.pas` source file.

---

## Project Structure

```text
pascal_compiler/
├── include/                  C++ headers
│   ├── buffer_manager.h      Double-buffer interface
│   ├── token.h               Token types
│   ├── lexer.h               Lexer interface
│   ├── ast.h                 AST node types
│   ├── parser.h              Recursive descent parser interface
│   ├── predictive_parser.h   LL(1) parser interface
│   ├── lr_parser.h           LALR(1) parser interface
│   └── symbol_table_builder.h Symbol table builder interface
├── src/                      C++ source files
│   ├── buffer_manager.cpp
│   ├── lexer.cpp
│   ├── ast.cpp
│   ├── parser.cpp
│   ├── predictive_parser.cpp
│   ├── lr_parser.cpp
│   ├── symbol_table_builder.cpp
│   └── main.cpp              CLI driver
├── server/                   Node.js Express API
│   └── index.js              All routes
├── frontend/                 React + Vite UI
│   └── src/
│       ├── pages/            Home, Compiler, Lexer, Parser, LL1Parser, LRParser, Symbols
│       ├── components/       Navbar, FileUploader, CompilerPipeline, DataTable, ASTTree, ...
│       ├── services/         api.js (Axios)
│       └── layouts/          MainLayout
├── test/                     Sample .pas files
└── Makefile
```

---

## Team

Developed as part of CS-471L Compiler Construction Lab, Spring 2026  
University of Engineering and Technology (UET), Lahore