#pragma once
// ============================================================
// lexer.h  –  Lexical analyser for the Pascal subset
//
// Reads character-by-character through BufferManager.
// Returns (token, attribute) pairs one at a time.
// Tracks line and column numbers for every token.
// Skips whitespace and { } comments.
// ============================================================

#include "buffer_manager.h"
#include "token.h"
#include <vector>
#include <string>
#include <unordered_map>

// ─────────────────────────────────────────────────────────────
// Lexer error
// ─────────────────────────────────────────────────────────────
struct LexError {
    std::string message;
    int line;
    int column;
};

// ─────────────────────────────────────────────────────────────
// Lexer
// ─────────────────────────────────────────────────────────────
class Lexer {
public:
    explicit Lexer(const std::string& filename);

    // Return the next token from the stream (called by the parser)
    Token nextToken();

    // Peek at the next token without consuming it
    Token peek();

    bool hasErrors() const { return !errors_.empty(); }
    const std::vector<LexError>& getErrors() const { return errors_; }

    // Full token stream (for debug / module output)
    std::vector<Token> tokenize();

    const BufferStats& getBufferStats() const { return buffer_.getStats(); }

private:
    BufferManager buffer_;
    std::unordered_map<std::string, TokenType> keywords_;
    std::vector<LexError> errors_;

    Token   lookahead_;         // one-token lookahead for peek()
    bool    hasPeeked_ = false;

    // ── helpers ──────────────────────────────────────────────
    void    initKeywords();
    Token   scanToken();        // core scanning routine
    Token   scanId();
    Token   scanNumber();
    Token   skipWhitespaceAndComments();
    void    recordError(const std::string& msg, int line, int col);
};
