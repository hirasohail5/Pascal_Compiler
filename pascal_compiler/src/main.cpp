// ============================================================
// main.cpp  –  Driver for the Pascal-subset mini compiler
//              (Modules 1 & 2: Lexer + Recursive Descent Parser)
//              (Modules 3 & 4: LL(1) Predictive + LALR(1) Parser)
//
// Usage:
//   ./pascal_compiler <source.pas> [--tokens-only] [--ll1] [--lr]
// ============================================================

#include "lexer.h"
#include "parser.h"
#include "predictive_parser.h"
#include "lr_parser.h"
#include "ast.h"
#include <iostream>
#include <iomanip>
#include <fstream>
#include <string>
#include <chrono>
#include "symbol_table.h"
#include "symbol_table_builder.h"


// ─────────────────────────────────────────────────────────────
// Print token stream with aligned columns
// ─────────────────────────────────────────────────────────────
void printTokenStream(const std::vector<Token>& tokens)
{
    std::cout << "\n==================================================\n";
    std::cout << "  TOKEN STREAM\n";
    std::cout << "==================================================\n";
    std::cout << std::left
              << std::setw(6)  << "Line"
              << std::setw(6)  << "Col"
              << std::setw(16) << "Type"
              << std::setw(20) << "Lexeme"
              << "Attribute\n";
    std::cout << std::string(70, '-') << "\n";

    for (const auto& t : tokens) {
        // Build a meaningful attribute string
        std::string attr;
        switch (t.type) {
        case TokenType::RELOP:
            attr = "relop(" + t.lexeme + ")"; break;
        case TokenType::ADDOP:
            attr = "addop(" + t.lexeme + ")"; break;
        case TokenType::MULOP:
            attr = "mulop(" + t.lexeme + ")"; break;
        case TokenType::ASSIGNOP:
            attr = "assignop";                break;
        case TokenType::NUM:
            attr = "val=" + t.lexeme;         break;
        case TokenType::ID:
            attr = "name=" + t.lexeme;        break;
        default:
            attr = "-";                       break;
        }

        std::cout << std::left
                  << std::setw(6)  << t.line
                  << std::setw(6)  << t.column
                  << std::setw(16) << tokenTypeName(t.type)
                  << std::setw(20) << t.lexeme
                  << attr          << "\n";
    }
    std::cout << std::string(70, '-') << "\n";
    std::cout << "Total tokens: " << tokens.size() << "\n";
}

// ─────────────────────────────────────────────────────────────
// Print buffer performance statistics
// ─────────────────────────────────────────────────────────────
void printBufferStats(const BufferStats& s, double totalMs)
{
    std::cout << "\n==================================================\n";
    std::cout << "  DOUBLE-BUFFER STATISTICS\n";
    std::cout << "==================================================\n";
    std::cout << "  Buffer size          : " << BUFFER_SIZE << " bytes\n";
    std::cout << "  Total chars read     : " << s.totalCharsRead << "\n";
    std::cout << "  Buffer switches      : " << s.totalBufferSwitches << "\n";
    std::cout << "  Cumulative fill time : " << std::fixed << std::setprecision(3)
              << s.fillTimeMs << " ms\n";
    std::cout << "  Total lexing time    : " << totalMs << " ms\n";
    std::cout << "==================================================\n";
}

// ─────────────────────────────────────────────────────────────
// Print parse errors
// ─────────────────────────────────────────────────────────────
void printErrors(const std::string& phase,
                 const std::vector<ParseError>& errors)
{
    if (errors.empty()) return;
    std::cout << "\n[" << phase << " ERRORS]\n";
    for (const auto& e : errors)
        std::cout << "  Line " << e.line << ", Col " << e.column
                  << ": " << e.message << "\n";
}

void printLexErrors(const std::vector<LexError>& errors)
{
    if (errors.empty()) return;
    std::cout << "\n[LEXER ERRORS]\n";
    for (const auto& e : errors)
        std::cout << "  Line " << e.line << ", Col " << e.column
                  << ": " << e.message << "\n";
}

// ─────────────────────────────────────────────────────────────
// Print summary for any parser
// ─────────────────────────────────────────────────────────────
void printSummary(double lexMs, double parseMs, int lexErrors, int parseErrors)
{
    std::cout << "\n==================================================\n";
    std::cout << "  SUMMARY\n";
    std::cout << "==================================================\n";
    std::cout << "  Lexing time  : " << std::fixed << std::setprecision(3) << lexMs << " ms\n";
    std::cout << "  Parsing time : " << parseMs << " ms\n";
    std::cout << "  Lex errors   : " << lexErrors << "\n";
    std::cout << "  Parse errors : " << parseErrors << "\n";

    bool ok = (lexErrors == 0 && parseErrors == 0);
    std::cout << "\n  Status: " << (ok ? "SUCCESS ✓" : "FAILED  ✗") << "\n";
    std::cout << "==================================================\n\n";
}

// ─────────────────────────────────────────────────────────────
// main
// ─────────────────────────────────────────────────────────────
int main(int argc, char* argv[])
{
    if (argc < 2) {
        std::cerr << "Usage: " << argv[0] << " <source.pas> [--tokens-only] [--ll1] [--lr] [--symbols]\n";
        std::cerr << "  --tokens-only : Only run lexer, print tokens\n";
        std::cerr << "  --ll1         : Use LL(1) Predictive Parser (default: Recursive Descent)\n";
        std::cerr << "  --lr          : Use LALR(1) Parser\n";
        return 1;
    }

    std::string filename  = argv[1];
    bool tokensOnly = false;
    bool useLL1 = false;
    bool useLR = false;
    bool useSymbols = false;
    
    // Parse command line arguments
    for (int i = 2; i < argc; i++) {
        std::string arg = argv[i];
        if (arg == "--tokens-only") tokensOnly = true;
        else if (arg == "--ll1") useLL1 = true;
        else if (arg == "--lr") useLR = true;
        else if (arg == "--symbols") useSymbols = true;
    }

    std::cout << "Pascal Subset Mini Compiler  –  Modules 1 & 2\n";
    std::cout << "Source file: " << filename << "\n";
    if (useLL1) std::cout << "Parser mode: LL(1) Predictive Parser\n";
    else if (useLR) std::cout << "Parser mode: LALR(1) Parser\n";
    else std::cout << "Parser mode: Recursive Descent Parser\n";

    // ── Module 1: Lexer ──────────────────────────────────────
    try {
        auto t0 = std::chrono::high_resolution_clock::now();

        Lexer lexer(filename);
        std::vector<Token> tokens = lexer.tokenize();

        auto t1 = std::chrono::high_resolution_clock::now();
        double lexMs = std::chrono::duration<double, std::milli>(t1 - t0).count();

        printTokenStream(tokens);
        printLexErrors(lexer.getErrors());
        printBufferStats(lexer.getBufferStats(), lexMs);

        if (tokensOnly) return lexer.hasErrors() ? 1 : 0;

        if (lexer.hasErrors()) {
            std::cout << "\nLexical errors found. Attempting to parse anyway...\n";
        }

        // ── Parser Selection ──────────────────────────────────
        double parseMs = 0;
        int parseErrors = 0;
        
        if (useLL1) {
            // ── Module 3: LL(1) Predictive Parser ──────────────
            Lexer lexerLL1(filename);
            PredictiveParser parser(lexerLL1);

            auto t2 = std::chrono::high_resolution_clock::now();
            ASTNodePtr ast = parser.parse();
            auto t3 = std::chrono::high_resolution_clock::now();
            parseMs = std::chrono::duration<double, std::milli>(t3 - t2).count();
            parseErrors = parser.getErrors().size();

            // Print LL(1) specific outputs
            parser.printFullOutput(std::cout);
            
            // Print AST
            if (ast) {
                std::cout << "\n==================================================\n";
                std::cout << "  ABSTRACT SYNTAX TREE (LL(1))\n";
                std::cout << "==================================================\n";
                printAST(ast.get());
            }
            
            printErrors("LL(1) PARSER", parser.getErrors());
            
        } else if (useLR) {
            // ── Module 4: LALR(1) Parser ───────────────────────
            Lexer lexerLR(filename);
            LRParser parser(lexerLR);

            auto t2 = std::chrono::high_resolution_clock::now();
            bool success = parser.parse();
            auto t3 = std::chrono::high_resolution_clock::now();
            parseMs = std::chrono::duration<double, std::milli>(t3 - t2).count();
            parseErrors = parser.getErrors().size();

            // Print LR specific outputs
            parser.printFullOutput(std::cout);
            
            printErrors("LR PARSER", parser.getErrors());
            
        } else {
            // ── Module 2: Recursive Descent Parser (Original) ───
            Lexer lexer2(filename);
            Parser parser(lexer2);

            auto t2 = std::chrono::high_resolution_clock::now();
            ASTNodePtr ast = parser.parse();
            auto t3 = std::chrono::high_resolution_clock::now();
            parseMs = std::chrono::duration<double, std::milli>(t3 - t2).count();
            parseErrors = parser.getErrors().size();

            std::cout << "\n==================================================\n";
            std::cout << "  ABSTRACT SYNTAX TREE\n";
            std::cout << "==================================================\n";
            printAST(ast.get());

            printErrors("PARSER", parser.getErrors());
        }


        // ── Module 5: Symbol Table ───────────────────────────
        if (useSymbols) {
            // Build AST via Recursive Descent parser
            Lexer lexerSym(filename);
            Parser parserSym(lexerSym);
            ASTNodePtr astSym = parserSym.parse();

            // Walk AST and populate symbol table
            SymbolTable symTable;
            SymbolTableBuilder builder(symTable);
            builder.build(astSym.get());

            // Human-readable dump
            symTable.printDump(std::cout);

            // JSON output (parsed by the server)
            symTable.printJSON(std::cout);

            auto t2 = std::chrono::high_resolution_clock::now();
            double symMs = std::chrono::duration<double, std::milli>(t2 - t0).count();
            std::cout << "\nSymbol Table Time: " << std::fixed << std::setprecision(4) << symMs << " ms\n";
            std::cout << "Status: " << (parserSym.getErrors().empty() ? "SUCCESS" : "BUILT WITH ERRORS") << "\n";
            return parserSym.getErrors().empty() ? 0 : 1;
        }

        // Print summary
        printSummary(lexMs, parseMs, lexer.getErrors().size(), parseErrors);

        return (lexer.hasErrors() || parseErrors > 0) ? 1 : 0;

    } catch (const std::exception& ex) {
        std::cerr << "Fatal error: " << ex.what() << "\n";
        return 2;
    }
}