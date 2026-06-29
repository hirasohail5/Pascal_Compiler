#pragma once
// ============================================================
// predictive_parser.h – LL(1 Non-Recursive Predictive Parser
// Pascal Subset (LL(1) cleaned version)
// ============================================================

#include "lexer.h"
#include "ast.h"
#include "parse_error.h"
#include <stack>
#include <unordered_map>
#include <set>
#include <map>
#include <vector>
#include <string>

// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
struct Production {
    std::string lhs;
    std::vector<std::string> rhs;
};

struct TraceStep {
    std::string stack;
    std::string input;
    std::string action;
};

// ─────────────────────────────────────────────────────────────
class PredictiveParser {
public:
    explicit PredictiveParser(Lexer& lexer);

    ASTNodePtr parse();

    void printFirstSets(std::ostream& out) const;
    void printFollowSets(std::ostream& out) const;
    void printParsingTable(std::ostream& out) const;
    void printTrace(std::ostream& out) const;
    void printErrors(std::ostream& out) const;
    void printStructuredOutput(std::ostream& out) const;
    void printFullOutput(std::ostream& out) const;

    const std::map<std::string, std::set<std::string>>& getFirstSets() const { return FIRST; }
    const std::map<std::string, std::set<std::string>>& getFollowSets() const { return FOLLOW; }
    const std::map<std::string, std::map<std::string, int>>& getParsingTable() const { return table; }
    const std::vector<TraceStep>& getTrace() const { return trace; }
    const std::vector<ParseError>& getErrors() const { return errors; }
    const std::vector<Production>& getGrammar() const { return grammar; }

private:
    Lexer& lexer;
    Token lookahead;

    std::vector<Production> grammar;
    std::map<std::string, std::set<std::string>> FIRST;
    std::map<std::string, std::set<std::string>> FOLLOW;
    std::map<std::string, std::map<std::string, int>> table;
    std::vector<ParseError> errors;
    std::vector<TraceStep> trace;
    std::vector<Token> matchedTokens;

private:
    void advance();
    void buildGrammar();
    void computeFirst();
    void computeFollow();
    void buildTable();
    std::set<std::string> firstOf(const std::vector<std::string>& symbols);
    bool isTerminal(const std::string& s);
    void syncError(const std::string& msg);
    std::string terminalOf(const Token& token) const;
    std::string productionToString(const Production& production) const;
    std::string stackToString(std::stack<std::string> stack) const;
    ASTNodePtr buildAstFromMatchedTokens();
    std::string escapeJson(const std::string& str) const;
};
