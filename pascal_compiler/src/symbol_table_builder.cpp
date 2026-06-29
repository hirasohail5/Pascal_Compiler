// ============================================================
// symbol_table_builder.cpp
//
// Walks the AST produced by the existing Parser and fills
// a SymbolTable.  Does NOT touch any existing source files.
// ============================================================

#include "symbol_table_builder.h"
#include <set>

// Pascal built-ins — never flagged as undeclared
static bool isBuiltin(const std::string& n) {
    static const std::set<std::string> B = {
        "read","write","readln","writeln","abs","sqr","sqrt",
        "round","trunc","odd","chr","ord","pred","succ",
        "new","dispose","halt","true","false","maxint",
        "input","output"
    };
    return B.count(n) > 0;
}

// ─────────────────────────────────────────────────────────────
SymbolTableBuilder::SymbolTableBuilder(SymbolTable& st) : st_(st) {}

void SymbolTableBuilder::build(const ASTNode* root) {
    if (root) visit(root);
}

// ─────────────────────────────────────────────────────────────
static std::string resolveType(const ASTNode* n) {
    if (!n) return "unknown";
    return n->value.empty() ? "unknown" : n->value;
}

static void collectIds(const ASTNode* n, std::vector<std::string>& out) {
    if (!n) return;
    if (n->kind == NodeKind::IDENTIFIER_LIST) {
        for (auto& c : n->children)
            if (c && !c->value.empty()) out.push_back(c->value);
    } else if (!n->value.empty()) {
        out.push_back(n->value);
    }
}

// ─────────────────────────────────────────────────────────────
void SymbolTableBuilder::visit(const ASTNode* n) {
    if (!n) return;
    switch (n->kind) {
        case NodeKind::PROGRAM:         visitProgram(n);         return;
        case NodeKind::DECLARATIONS:    visitDeclarations(n);    return;
        case NodeKind::VAR_DECL:        visitVarDecl(n);         return;
        case NodeKind::SUBPROGRAM_DECLS:
            for (auto& c : n->children) visit(c.get());
            return;
        case NodeKind::SUBPROGRAM_DECL: visitSubprogramDecl(n); return;
        case NodeKind::SUBPROGRAM_HEAD: /* handled inside SubprogramDecl */ return;
        default:
            for (auto& c : n->children) visit(c.get());
            return;
    }
}

// ─────────────────────────────────────────────────────────────
void SymbolTableBuilder::visitProgram(const ASTNode* n) {
    // Insert program name
    SymEntry e;
    e.name       = n->value;
    e.kind       = SymKind::Program;
    e.type       = "program";
    e.scopeLevel = st_.currentLevel();
    e.scopeName  = st_.currentScopeName();
    e.line       = n->line;
    e.column     = 0;
    st_.insert(e);

    // children: [id_list(params), declarations, subprogram_decls, compound_stmt]
    // Skip child[0] (input/output program params — builtins)
    for (size_t i = 1; i < n->children.size(); ++i)
        visit(n->children[i].get());
}

// ─────────────────────────────────────────────────────────────
void SymbolTableBuilder::visitDeclarations(const ASTNode* n) {
    for (auto& c : n->children)
        if (c) visitVarDecl(c.get());
}

// ─────────────────────────────────────────────────────────────
void SymbolTableBuilder::visitVarDecl(const ASTNode* n) {
    if (!n || n->children.size() < 2) return;

    auto* idList   = n->children[0].get();
    auto* typeNode = n->children[1].get();

    std::string typeName = resolveType(typeNode);
    bool isArr = typeNode && typeNode->kind == NodeKind::ARRAY_TYPE;

    // Build arrayInfo string for arrays: "array[lo..hi] of T"
    std::string arrayInfo;
    std::string baseType = typeName; // default
    if (isArr) {
        // ArrayType->value = "1..10", child[0] = StandardType "integer"
        std::string range = typeNode->value;
        std::string elemType = "integer";
        if (!typeNode->children.empty() && typeNode->children[0])
            elemType = typeNode->children[0]->value.empty() ? "integer" : typeNode->children[0]->value;
        arrayInfo = "array[" + range + "] of " + elemType;
        baseType  = elemType; // show element type in Type column
        typeName  = baseType;
    }

    std::vector<std::string> names;
    collectIds(idList, names);

    for (auto& nm : names) {
        SymEntry e;
        e.name       = nm;
        e.kind       = isArr ? SymKind::Array : SymKind::Variable;
        e.type       = typeName;
        e.scopeLevel = st_.currentLevel();
        e.scopeName  = st_.currentScopeName();
        e.line       = n->line;
        e.column     = idList ? idList->line : n->line; // best we can do
        e.arrayInfo  = arrayInfo;
        st_.insert(e);   // silently ignores duplicates
    }
}

// ─────────────────────────────────────────────────────────────
void SymbolTableBuilder::visitSubprogramDecl(const ASTNode* n) {
    if (n->children.empty()) return;

    auto* head = n->children[0].get();
    if (!head) return;

    // ── Parse subprogram head ─────────────────────────────────
    // head->value = "function gcd" or "procedure foo"
    std::string fullVal = head->value;
    bool isFunc = (fullVal.size() >= 8 && fullVal.substr(0,8) == "function");
    std::string subName;
    size_t sp = fullVal.find(' ');
    subName = (sp != std::string::npos) ? fullVal.substr(sp+1) : fullVal;

    // Determine return type (last StandardType/ArrayType child of head)
    std::string retType = isFunc ? "integer" : "void";
    if (isFunc) {
        for (int i = (int)head->children.size()-1; i >= 0; --i) {
            auto* c = head->children[i].get();
            if (c && (c->kind == NodeKind::STANDARD_TYPE || c->kind == NodeKind::ARRAY_TYPE)) {
                retType = c->value.empty() ? "integer" : c->value;
                break;
            }
        }
    }

    // Insert into parent scope
    {
        SymEntry e;
        e.name       = subName;
        e.kind       = isFunc ? SymKind::Function : SymKind::Procedure;
        e.type       = retType;
        e.scopeLevel = st_.currentLevel();
        e.scopeName  = st_.currentScopeName();
        e.line       = head->line;
        e.column     = 0;
        st_.insert(e);
    }

    // Open new scope
    st_.enterScope(subName);

    // Register parameters from Arguments subtree
    for (auto& hc : head->children) {
        if (!hc) continue;
        registerParams(hc.get());
    }

    // Visit body (children[1..] of SubprogramDecl)
    for (size_t i = 1; i < n->children.size(); ++i)
        visit(n->children[i].get());

    st_.exitScope();
}

// ─────────────────────────────────────────────────────────────
void SymbolTableBuilder::registerParams(const ASTNode* n) {
    if (!n) return;
    if (n->kind == NodeKind::VAR_DECL) {
        // Treat as parameter
        if (n->children.size() < 2) return;
        auto* idList   = n->children[0].get();
        auto* typeNode = n->children[1].get();
        std::string typeName = resolveType(typeNode);
        std::vector<std::string> names;
        collectIds(idList, names);
        for (auto& nm : names) {
            SymEntry e;
            e.name       = nm;
            e.kind       = SymKind::Parameter;
            e.type       = typeName;
            e.scopeLevel = st_.currentLevel();
            e.scopeName  = st_.currentScopeName();
            e.line       = n->line;
            e.column     = 0;
            st_.insert(e);
        }
    } else {
        for (auto& c : n->children) registerParams(c.get());
    }
}
