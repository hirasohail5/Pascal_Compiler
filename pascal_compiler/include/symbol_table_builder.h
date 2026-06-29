#pragma once
// ============================================================
// symbol_table_builder.h
// Walks the AST and populates a SymbolTable.
// ============================================================

#include "ast.h"
#include "symbol_table.h"
#include <vector>
#include <string>

class SymbolTableBuilder {
public:
    explicit SymbolTableBuilder(SymbolTable& st);
    void build(const ASTNode* root);

private:
    SymbolTable& st_;

    void visit(const ASTNode* n);
    void visitProgram(const ASTNode* n);
    void visitDeclarations(const ASTNode* n);
    void visitVarDecl(const ASTNode* n);
    void visitSubprogramDecl(const ASTNode* n);
    void registerParams(const ASTNode* n);
};
