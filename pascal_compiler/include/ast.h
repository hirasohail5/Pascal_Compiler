#pragma once
// ============================================================
// ast.h  –  Abstract Syntax Tree node types
//
// A simple union-less hierarchy using std::unique_ptr.
// Every node records its source line for error messages.
// ============================================================

#include <string>
#include <vector>
#include <memory>

// ─────────────────────────────────────────────────────────────
// Forward declarations
// ─────────────────────────────────────────────────────────────
struct ASTNode;
using ASTNodePtr = std::unique_ptr<ASTNode>;

// ─────────────────────────────────────────────────────────────
// Node kinds
// ─────────────────────────────────────────────────────────────
enum class NodeKind {
    // Program structure
    PROGRAM,
    DECLARATIONS,
    VAR_DECL,
    SUBPROGRAM_DECLS,
    SUBPROGRAM_DECL,
    SUBPROGRAM_HEAD,
    ARGUMENTS,
    PARAMETER_LIST,
    COMPOUND_STMT,
    STATEMENT_LIST,

    // Statements
    ASSIGN_STMT,
    IF_STMT,
    WHILE_STMT,
    PROCEDURE_CALL,

    // Expressions
    BINARY_EXPR,
    UNARY_EXPR,
    VARIABLE,
    ARRAY_ACCESS,
    FUNC_CALL,
    NUMBER_LITERAL,
    IDENTIFIER_LIST,

    // Types
    STANDARD_TYPE,
    ARRAY_TYPE,

    // Misc
    EMPTY
};

// ─────────────────────────────────────────────────────────────
// ASTNode  –  generic tree node
// ─────────────────────────────────────────────────────────────
struct ASTNode {
    NodeKind                    kind;
    std::string                 value;   // lexeme / operator / type name
    int                         line = 0;
    std::vector<ASTNodePtr>     children;

    ASTNode(NodeKind k, std::string v = "", int ln = 0)
        : kind(k), value(std::move(v)), line(ln) {}

    void addChild(ASTNodePtr child) {
        if (child) children.push_back(std::move(child));
    }
};

// ─────────────────────────────────────────────────────────────
// Pretty-print helpers
// ─────────────────────────────────────────────────────────────
inline std::string nodeKindName(NodeKind k)
{
    switch (k) {
    case NodeKind::PROGRAM:           return "Program";
    case NodeKind::DECLARATIONS:      return "Declarations";
    case NodeKind::VAR_DECL:          return "VarDecl";
    case NodeKind::SUBPROGRAM_DECLS:  return "SubprogramDecls";
    case NodeKind::SUBPROGRAM_DECL:   return "SubprogramDecl";
    case NodeKind::SUBPROGRAM_HEAD:   return "SubprogramHead";
    case NodeKind::ARGUMENTS:         return "Arguments";
    case NodeKind::PARAMETER_LIST:    return "ParameterList";
    case NodeKind::COMPOUND_STMT:     return "CompoundStmt";
    case NodeKind::STATEMENT_LIST:    return "StatementList";
    case NodeKind::ASSIGN_STMT:       return "AssignStmt";
    case NodeKind::IF_STMT:           return "IfStmt";
    case NodeKind::WHILE_STMT:        return "WhileStmt";
    case NodeKind::PROCEDURE_CALL:    return "ProcedureCall";
    case NodeKind::BINARY_EXPR:       return "BinaryExpr";
    case NodeKind::UNARY_EXPR:        return "UnaryExpr";
    case NodeKind::VARIABLE:          return "Variable";
    case NodeKind::ARRAY_ACCESS:      return "ArrayAccess";
    case NodeKind::FUNC_CALL:         return "FuncCall";
    case NodeKind::NUMBER_LITERAL:    return "NumberLiteral";
    case NodeKind::IDENTIFIER_LIST:   return "IdentifierList";
    case NodeKind::STANDARD_TYPE:     return "StandardType";
    case NodeKind::ARRAY_TYPE:        return "ArrayType";
    case NodeKind::EMPTY:             return "Empty";
    default:                           return "?";
    }
}

void printAST(const ASTNode* node, int depth = 0);
