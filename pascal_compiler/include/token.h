#pragma once
// ============================================================
// token.h  –  Token definitions for the Pascal subset
//
// Based on the grammar in Dragon Book Appendix A (Pascal subset).
// ============================================================

#include <string>

// ─────────────────────────────────────────────────────────────
// All token kinds
// ─────────────────────────────────────────────────────────────
enum class TokenType {
    // ── Literals / generic ───────────────────────────────────
    ID,         // identifier
    NUM,        // integer or real literal

    // ── Keywords ─────────────────────────────────────────────
    KW_PROGRAM,
    KW_VAR,
    KW_ARRAY,
    KW_OF,
    KW_INTEGER,
    KW_REAL,
    KW_FUNCTION,
    KW_PROCEDURE,
    KW_BEGIN,
    KW_END,
    KW_IF,
    KW_THEN,
    KW_ELSE,
    KW_WHILE,
    KW_DO,
    KW_NOT,
    KW_AND,
    KW_OR,
    KW_DIV,
    KW_MOD,

    // ── Operators ────────────────────────────────────────────
    ASSIGNOP,   // :=
    RELOP,      // =  <>  <  <=  >=  >
    ADDOP,      // +  -  or
    MULOP,      // *  /  div  mod  and

    // ── Punctuation ──────────────────────────────────────────
    LPAREN,     // (
    RPAREN,     // )
    LBRACKET,   // [
    RBRACKET,   // ]
    COMMA,      // ,
    SEMICOLON,  // ;
    COLON,      // :
    DOT,        // .
    DOTDOT,     // ..
    PLUS,       // + (unary sign, also covered by ADDOP)
    MINUS,      // - (unary sign)

    // ── Special ──────────────────────────────────────────────
    END_OF_FILE,
    UNKNOWN
};

// ─────────────────────────────────────────────────────────────
// Token – carries type, lexeme, and source location
// ─────────────────────────────────────────────────────────────
struct Token {
    TokenType   type;
    std::string lexeme;     // raw text from source
    std::string attribute;  // extra semantic value (e.g. which relop, num value)
    int         line;
    int         column;

    Token() : type(TokenType::UNKNOWN), line(0), column(0) {}
    Token(TokenType t, std::string lex, std::string attr, int ln, int col)
        : type(t), lexeme(std::move(lex)), attribute(std::move(attr)),
          line(ln), column(col) {}
};

// ─────────────────────────────────────────────────────────────
// Utility: token type → human-readable name
// ─────────────────────────────────────────────────────────────
inline std::string tokenTypeName(TokenType t)
{
    switch (t) {
    case TokenType::ID:           return "ID";
    case TokenType::NUM:          return "NUM";
    case TokenType::KW_PROGRAM:   return "PROGRAM";
    case TokenType::KW_VAR:       return "VAR";
    case TokenType::KW_ARRAY:     return "ARRAY";
    case TokenType::KW_OF:        return "OF";
    case TokenType::KW_INTEGER:   return "INTEGER";
    case TokenType::KW_REAL:      return "REAL";
    case TokenType::KW_FUNCTION:  return "FUNCTION";
    case TokenType::KW_PROCEDURE: return "PROCEDURE";
    case TokenType::KW_BEGIN:     return "BEGIN";
    case TokenType::KW_END:       return "END";
    case TokenType::KW_IF:        return "IF";
    case TokenType::KW_THEN:      return "THEN";
    case TokenType::KW_ELSE:      return "ELSE";
    case TokenType::KW_WHILE:     return "WHILE";
    case TokenType::KW_DO:        return "DO";
    case TokenType::KW_NOT:       return "NOT";
    case TokenType::KW_AND:       return "AND";
    case TokenType::KW_OR:        return "OR";
    case TokenType::KW_DIV:       return "DIV";
    case TokenType::KW_MOD:       return "MOD";
    case TokenType::ASSIGNOP:     return "ASSIGNOP";
    case TokenType::RELOP:        return "RELOP";
    case TokenType::ADDOP:        return "ADDOP";
    case TokenType::MULOP:        return "MULOP";
    case TokenType::LPAREN:       return "LPAREN";
    case TokenType::RPAREN:       return "RPAREN";
    case TokenType::LBRACKET:     return "LBRACKET";
    case TokenType::RBRACKET:     return "RBRACKET";
    case TokenType::COMMA:        return "COMMA";
    case TokenType::SEMICOLON:    return "SEMICOLON";
    case TokenType::COLON:        return "COLON";
    case TokenType::DOT:          return "DOT";
    case TokenType::DOTDOT:       return "DOTDOT";
    case TokenType::PLUS:         return "PLUS";
    case TokenType::MINUS:        return "MINUS";
    case TokenType::END_OF_FILE:  return "EOF";
    default:                       return "UNKNOWN";
    }
}
