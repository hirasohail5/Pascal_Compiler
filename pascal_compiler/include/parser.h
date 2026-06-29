#pragma once
// ============================================================
// parser.h  –  Recursive Descent Parser for the Pascal subset
//
// One parsing routine per non-terminal.
// Grammar is left-recursion-free and left-factored.
// Builds an AST and reports syntax errors.
// ============================================================

#include "lexer.h"
#include "ast.h"
#include "parse_error.h"
#include <vector>
#include <string>
#include <stdexcept>

// ─────────────────────────────────────────────────────────────
// Parse error record
// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
// Parser
// ─────────────────────────────────────────────────────────────
class Parser {
public:
    explicit Parser(Lexer& lexer);

    // Entry point – returns the AST root (or nullptr on fatal error)
    ASTNodePtr parse();

    bool hasErrors() const { return !errors_.empty(); }
    const std::vector<ParseError>& getErrors() const { return errors_; }

private:
    Lexer& lexer_;
    Token  current_;            // current look-ahead token
    std::vector<ParseError> errors_;

    // ── token management ─────────────────────────────────────
    void      advance();
    Token     consume(TokenType expected, const std::string& what);
    bool      check(TokenType t) const;
    bool      checkLexeme(const std::string& lex) const;
    void      syncError(const std::string& msg);

    // ── grammar productions ──────────────────────────────────
    ASTNodePtr parseProgram();
    ASTNodePtr parseIdentifierList();
    ASTNodePtr parseDeclarations();
    ASTNodePtr parseType();
    ASTNodePtr parseStandardType();
    ASTNodePtr parseSubprogramDeclarations();
    ASTNodePtr parseSubprogramDeclaration();
    ASTNodePtr parseSubprogramHead();
    ASTNodePtr parseArguments();
    ASTNodePtr parseParameterList();
    ASTNodePtr parseCompoundStatement();
    ASTNodePtr parseOptionalStatements();
    ASTNodePtr parseStatementList();
    ASTNodePtr parseStatement();
    ASTNodePtr parseVariable();
    ASTNodePtr parseProcedureStatement();
    ASTNodePtr parseExpressionList();
    ASTNodePtr parseExpression();
    ASTNodePtr parseSimpleExpression();
    ASTNodePtr parseTerm();
    ASTNodePtr parseFactor();
    ASTNodePtr parseSign();
};
