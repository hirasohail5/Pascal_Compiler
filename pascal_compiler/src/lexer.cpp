// ============================================================
// lexer.cpp  –  Lexical analyser implementation
// ============================================================

#include "lexer.h"
#include <cctype>
#include <stdexcept>
#include <sstream>

// ─────────────────────────────────────────────────────────────
// Constructor
// ─────────────────────────────────────────────────────────────
Lexer::Lexer(const std::string& filename)
    : buffer_(filename)
{
    initKeywords();
}

// ─────────────────────────────────────────────────────────────
// Keyword table
// ─────────────────────────────────────────────────────────────
void Lexer::initKeywords()
{
    keywords_["program"]   = TokenType::KW_PROGRAM;
    keywords_["var"]       = TokenType::KW_VAR;
    keywords_["array"]     = TokenType::KW_ARRAY;
    keywords_["of"]        = TokenType::KW_OF;
    keywords_["integer"]   = TokenType::KW_INTEGER;
    keywords_["real"]      = TokenType::KW_REAL;
    keywords_["function"]  = TokenType::KW_FUNCTION;
    keywords_["procedure"] = TokenType::KW_PROCEDURE;
    keywords_["begin"]     = TokenType::KW_BEGIN;
    keywords_["end"]       = TokenType::KW_END;
    keywords_["if"]        = TokenType::KW_IF;
    keywords_["then"]      = TokenType::KW_THEN;
    keywords_["else"]      = TokenType::KW_ELSE;
    keywords_["while"]     = TokenType::KW_WHILE;
    keywords_["do"]        = TokenType::KW_DO;
    keywords_["not"]       = TokenType::KW_NOT;
    keywords_["and"]       = TokenType::KW_AND;
    keywords_["or"]        = TokenType::KW_OR;
    keywords_["div"]       = TokenType::KW_DIV;
    keywords_["mod"]       = TokenType::KW_MOD;
}

// ─────────────────────────────────────────────────────────────
// nextToken – public interface
// ─────────────────────────────────────────────────────────────
Token Lexer::nextToken()
{
    if (hasPeeked_) {
        hasPeeked_ = false;
        return lookahead_;
    }
    return scanToken();
}

// ─────────────────────────────────────────────────────────────
// peek – look ahead without consuming
// ─────────────────────────────────────────────────────────────
Token Lexer::peek()
{
    if (!hasPeeked_) {
        lookahead_ = scanToken();
        hasPeeked_ = true;
    }
    return lookahead_;
}

// ─────────────────────────────────────────────────────────────
// tokenize – consume entire file and return token stream
// ─────────────────────────────────────────────────────────────
std::vector<Token> Lexer::tokenize()
{
    std::vector<Token> tokens;
    while (true) {
        Token t = nextToken();
        tokens.push_back(t);
        if (t.type == TokenType::END_OF_FILE) break;
    }
    return tokens;
}

// ─────────────────────────────────────────────────────────────
// recordError
// ─────────────────────────────────────────────────────────────
void Lexer::recordError(const std::string& msg, int line, int col)
{
    errors_.push_back({msg, line, col});
}

// ─────────────────────────────────────────────────────────────
// scanToken – core DFA
// ─────────────────────────────────────────────────────────────
Token Lexer::scanToken()
{
    // Skip whitespace and comments before every token
    while (true) {
        if (buffer_.isEOF())
            return Token(TokenType::END_OF_FILE, "", "", buffer_.getLine(), buffer_.getColumn());

        buffer_.resetLexemeBegin();
        char c = buffer_.getNextChar();

        // ── Whitespace ───────────────────────────────────────
        if (std::isspace((unsigned char)c)) {
            continue;
        }

        // ── Comment  { ... } ─────────────────────────────────
        if (c == '{') {
            int startLine = buffer_.getLine();
            int startCol  = buffer_.getColumn();
            while (true) {
                if (buffer_.isEOF()) {
                    recordError("Unterminated comment", startLine, startCol);
                    break;
                }
                char cc = buffer_.getNextChar();
                if (cc == '}') break;
                if (cc == '{') {
                    recordError("Nested { inside comment", buffer_.getLine(), buffer_.getColumn());
                }
            }
            continue;
        }

        int tokLine = buffer_.getLine();
        int tokCol  = buffer_.getColumn();
        buffer_.resetLexemeBegin();

        // ── Identifier / keyword ─────────────────────────────
        if (std::isalpha((unsigned char)c) || c == '_') {
            buffer_.ungetChar();   // let scanId consume from the start
            buffer_.resetLexemeBegin();
            return scanId();
        }

        // ── Number ───────────────────────────────────────────
        if (std::isdigit((unsigned char)c)) {
            buffer_.ungetChar();
            buffer_.resetLexemeBegin();
            return scanNumber();
        }

        // ── Two-character tokens ─────────────────────────────
        switch (c) {
        case ':': {
            char next = buffer_.getNextChar();
            if (next == '=')
                return Token(TokenType::ASSIGNOP, ":=", ":=", tokLine, tokCol);
            buffer_.ungetChar();
            return Token(TokenType::COLON, ":", ":", tokLine, tokCol);
        }
        case '<': {
            char next = buffer_.getNextChar();
            if (next == '=')
                return Token(TokenType::RELOP, "<=", "<=", tokLine, tokCol);
            if (next == '>')
                return Token(TokenType::RELOP, "<>", "<>", tokLine, tokCol);
            buffer_.ungetChar();
            return Token(TokenType::RELOP, "<", "<", tokLine, tokCol);
        }
        case '>': {
            char next = buffer_.getNextChar();
            if (next == '=')
                return Token(TokenType::RELOP, ">=", ">=", tokLine, tokCol);
            buffer_.ungetChar();
            return Token(TokenType::RELOP, ">", ">", tokLine, tokCol);
        }
        case '.': {
            char next = buffer_.getNextChar();
            if (next == '.')
                return Token(TokenType::DOTDOT, "..", "..", tokLine, tokCol);
            buffer_.ungetChar();
            return Token(TokenType::DOT, ".", ".", tokLine, tokCol);
        }

        // ── Single-character tokens ───────────────────────────
        case '=':  return Token(TokenType::RELOP,     "=",  "=",  tokLine, tokCol);
        case '+':  return Token(TokenType::ADDOP,     "+",  "+",  tokLine, tokCol);
        case '-':  return Token(TokenType::ADDOP,     "-",  "-",  tokLine, tokCol);
        case '*':  return Token(TokenType::MULOP,     "*",  "*",  tokLine, tokCol);
        case '/':  return Token(TokenType::MULOP,     "/",  "/",  tokLine, tokCol);
        case '(':  return Token(TokenType::LPAREN,    "(",  "(",  tokLine, tokCol);
        case ')':  return Token(TokenType::RPAREN,    ")",  ")",  tokLine, tokCol);
        case '[':  return Token(TokenType::LBRACKET,  "[",  "[",  tokLine, tokCol);
        case ']':  return Token(TokenType::RBRACKET,  "]",  "]",  tokLine, tokCol);
        case ',':  return Token(TokenType::COMMA,     ",",  ",",  tokLine, tokCol);
        case ';':  return Token(TokenType::SEMICOLON, ";",  ";",  tokLine, tokCol);

        case (char)EOF:
        case '\0':
            return Token(TokenType::END_OF_FILE, "", "", tokLine, tokCol);

        default: {
            std::ostringstream oss;
            oss << "Illegal character '" << c << "' (ASCII " << (int)(unsigned char)c << ")";
            recordError(oss.str(), tokLine, tokCol);
            // skip and continue to next token
            continue;
        }
        }
    }
}

// ─────────────────────────────────────────────────────────────
// scanId – letter (letter | digit)*
// ─────────────────────────────────────────────────────────────
Token Lexer::scanId()
{
    int tokLine = buffer_.getLine();
    int tokCol  = buffer_.getColumn();
    std::string lexeme;

    char c = buffer_.getNextChar();
    while (std::isalnum((unsigned char)c) || c == '_') {
        lexeme += c;
        c = buffer_.getNextChar();
    }
    if (c != (char)EOF && c != '\0')
        buffer_.ungetChar();

    // Convert to lower-case for case-insensitive keyword matching
    std::string lower = lexeme;
    for (char& ch : lower) ch = (char)std::tolower((unsigned char)ch);

    auto it = keywords_.find(lower);
    if (it != keywords_.end()) {
        // Keywords: and / or / div / mod are also operators
        TokenType kw = it->second;
        if (kw == TokenType::KW_AND || kw == TokenType::KW_OR)
            return Token(TokenType::ADDOP, lexeme, lower, tokLine, tokCol);
        if (kw == TokenType::KW_DIV || kw == TokenType::KW_MOD)
            return Token(TokenType::MULOP, lexeme, lower, tokLine, tokCol);
        return Token(kw, lexeme, lower, tokLine, tokCol);
    }
    return Token(TokenType::ID, lexeme, lexeme, tokLine, tokCol);
}

// ─────────────────────────────────────────────────────────────
// scanNumber – digits optional_fraction optional_exponent
//   integer  → digit+
//   real     → digit+ . digit+  (E(+|-)? digit+)?
// ─────────────────────────────────────────────────────────────
Token Lexer::scanNumber()
{
    int tokLine = buffer_.getLine();
    int tokCol  = buffer_.getColumn();
    std::string lexeme;
    bool isReal = false;

    // Integer part
    char c = buffer_.getNextChar();
    while (std::isdigit((unsigned char)c)) {
        lexeme += c;
        c = buffer_.getNextChar();
    }

    // Optional fraction
    if (c == '.') {
        // Peek ahead to distinguish  ..  (DOTDOT) from  1.5
        char next = buffer_.getNextChar();
        if (std::isdigit((unsigned char)next)) {
            isReal = true;
            lexeme += '.';
            lexeme += next;
            c = buffer_.getNextChar();
            while (std::isdigit((unsigned char)c)) {
                lexeme += c;
                c = buffer_.getNextChar();
            }
        } else {
            // It was  num  followed by  ..  – put both chars back
            buffer_.ungetChar();   // put back 'next'
            buffer_.ungetChar();   // put back '.'
            c = '\0';              // stop
        }
    }

    // Optional exponent
    if ((c == 'E' || c == 'e') && isReal) {
        lexeme += c;
        c = buffer_.getNextChar();
        if (c == '+' || c == '-') {
            lexeme += c;
            c = buffer_.getNextChar();
        }
        if (!std::isdigit((unsigned char)c)) {
            recordError("Expected digit after exponent", buffer_.getLine(), buffer_.getColumn());
        } else {
            while (std::isdigit((unsigned char)c)) {
                lexeme += c;
                c = buffer_.getNextChar();
            }
        }
    }

    if (c != '\0' && c != (char)EOF)
        buffer_.ungetChar();

    return Token(TokenType::NUM, lexeme, lexeme, tokLine, tokCol);
}
