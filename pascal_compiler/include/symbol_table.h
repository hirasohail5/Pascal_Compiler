#pragma once
// ============================================================
// symbol_table.h  –  Hash-based Symbol Table Manager (Module 5)
//
// Supports: insert, lookup, delete
// Stores:   name, kind, type, scope level, source line
// Handles nested scopes via a stack of hash tables
// ============================================================

#include <string>
#include <vector>
#include <unordered_map>
#include <iostream>
#include <iomanip>

// ── Symbol kind ───────────────────────────────────────────────
enum class SymKind { Variable, Constant, Function, Procedure, Parameter, Array, Program };

inline std::string symKindStr(SymKind k) {
    switch (k) {
        case SymKind::Variable:  return "variable";
        case SymKind::Constant:  return "constant";
        case SymKind::Function:  return "function";
        case SymKind::Procedure: return "procedure";
        case SymKind::Parameter: return "parameter";
        case SymKind::Array:     return "array";
        case SymKind::Program:   return "program";
        default:                 return "unknown";
    }
}

// ── One symbol entry ──────────────────────────────────────────
struct SymEntry {
    std::string name;
    SymKind     kind;
    std::string type;       // "integer", "real", "array[1..n] of integer", etc.
    int         scopeLevel; // 0 = global
    std::string scopeName;
    int         line;
    int         column;
    std::string arrayInfo;  // extra: "array[lo..hi] of T" when kind==Array
};

// ── Scope (one hash table) ────────────────────────────────────
struct Scope {
    std::string name;
    int         level;
    std::unordered_map<std::string, SymEntry> table;
};

// ── SymbolTable ───────────────────────────────────────────────
class SymbolTable {
public:
    SymbolTable() { scopes_.push_back({ "global", 0, {} }); }

    // Scope management
    void enterScope(const std::string& name = "") {
        int lv = (int)scopes_.size();
        scopes_.push_back({ name.empty() ? "scope_"+std::to_string(lv) : name, lv, {} });
    }
    void exitScope() {
        if (scopes_.size() > 1) scopes_.pop_back();
    }
    int  currentLevel() const { return (int)scopes_.size() - 1; }
    std::string currentScopeName() const { return scopes_.back().name; }

    // Core operations
    bool insert(const SymEntry& e) {
        auto& t = scopes_.back().table;
        if (t.count(e.name)) return false;
        t[e.name] = e;
        return true;
    }

    // Lookup: search from innermost scope outward
    const SymEntry* lookup(const std::string& name) const {
        for (int i = (int)scopes_.size()-1; i >= 0; --i) {
            auto it = scopes_[i].table.find(name);
            if (it != scopes_[i].table.end()) return &it->second;
        }
        return nullptr;
    }

    bool remove(const std::string& name) {
        return scopes_.back().table.erase(name) > 0;
    }

    const std::vector<Scope>& scopes() const { return scopes_; }

    // ── Pretty print (human readable) ────────────────────────
    void printDump(std::ostream& out) const {
        out << "\n==================================================\n";
        out << "  SYMBOL TABLE DUMP\n";
        out << "==================================================\n";
        out << std::left
            << std::setw(20) << "Name"
            << std::setw(12) << "Kind"
            << std::setw(12) << "Type"
            << std::setw(8)  << "Scope"
            << std::setw(14) << "Scope Name"
            << std::setw(6)  << "Line"
            << "Extra\n";
        out << std::string(90, '-') << "\n";

        int total = 0;
        for (auto& sc : scopes_) {
            for (auto& [nm, e] : sc.table) {
                out << std::left
                    << std::setw(20) << e.name
                    << std::setw(12) << symKindStr(e.kind)
                    << std::setw(12) << e.type
                    << std::setw(8)  << e.scopeLevel
                    << std::setw(14) << e.scopeName
                    << std::setw(6)  << e.line
                    << (e.arrayInfo.empty() ? "" : e.arrayInfo) << "\n";
                ++total;
            }
        }
        out << std::string(90, '-') << "\n";
        out << "Total symbols: " << total << "\n";
    }

    // ── JSON output (parsed by server) ───────────────────────
    void printJSON(std::ostream& out) const {
        out << "===SYMBOL_TABLE_JSON_START===\n";
        out << "{\n";

        // scopes array
        out << "  \"scopes\": [\n";
        for (size_t si = 0; si < scopes_.size(); ++si) {
            auto& sc = scopes_[si];
            out << "    {\n";
            out << "      \"name\": \""  << esc(sc.name) << "\",\n";
            out << "      \"level\": "   << sc.level << ",\n";
            out << "      \"symbols\": [\n";

            size_t cnt = 0;
            for (auto& [nm, e] : sc.table) {
                out << "        {"
                    << "\"name\": \""     << esc(e.name)           << "\", "
                    << "\"kind\": \""     << esc(symKindStr(e.kind)) << "\", "
                    << "\"type\": \""     << esc(e.type)           << "\", "
                    << "\"scopeLevel\": " << e.scopeLevel           << ", "
                    << "\"scopeName\": \"" << esc(e.scopeName)      << "\", "
                    << "\"line\": "       << e.line                 << ", "
                    << "\"column\": "     << e.column               << ", "
                    << "\"arrayInfo\": \"" << esc(e.arrayInfo)      << "\""
                    << "}";
                ++cnt;
                if (cnt < sc.table.size()) out << ",";
                out << "\n";
            }
            out << "      ]\n";
            out << "    }";
            if (si + 1 < scopes_.size()) out << ",";
            out << "\n";
        }
        out << "  ],\n";

        // flat total
        int total = 0;
        for (auto& sc : scopes_) total += (int)sc.table.size();
        out << "  \"totalSymbols\": " << total << "\n";
        out << "}\n";
        out << "===SYMBOL_TABLE_JSON_END===\n";
    }

private:
    std::vector<Scope> scopes_;

    static std::string esc(const std::string& s) {
        std::string r;
        for (char c : s) {
            if (c == '"')  r += "\\\"";
            else if (c == '\\') r += "\\\\";
            else r += c;
        }
        return r;
    }
};
