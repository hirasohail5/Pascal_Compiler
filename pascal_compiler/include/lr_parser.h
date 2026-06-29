#pragma once

#include "lexer.h"
#include "parser.h"
#include <map>
#include <set>
#include <string>
#include <vector>

struct LRProduction {
    std::string lhs;
    std::vector<std::string> rhs;
};

struct LRTraceStep {
    std::string stateStack;
    std::string symbolStack;
    std::string remainingInput;
    std::string action;
};

struct LRTableEntry {
    enum class Kind { Error, Shift, Reduce, Accept };
    Kind kind = Kind::Error;
    int value = -1;
};

class LRParser {
public:
    explicit LRParser(Lexer& lexer);

    bool parse();

    void printGrammar(std::ostream& out) const;
    void printFirstSets(std::ostream& out) const;
    void printFollowSets(std::ostream& out) const;
    void printActionTable(std::ostream& out) const;
    void printGotoTable(std::ostream& out) const;
    void printTrace(std::ostream& out) const;
    void printErrors(std::ostream& out) const;
    void printStructuredOutput(std::ostream& out) const;
    void printFullOutput(std::ostream& out) const;

    bool hasErrors() const { return !errors_.empty(); }
    const std::vector<ParseError>& getErrors() const { return errors_; }
    size_t stateCount() const { return states_.size(); }

private:
    struct Item {
        int production = 0;
        int dot = 0;
        std::string lookahead;

        bool operator<(const Item& other) const;
        bool operator==(const Item& other) const;
    };

    using ItemSet = std::set<Item>;

    Lexer& lexer_;
    std::vector<LRProduction> productions_;
    std::set<std::string> terminals_;
    std::set<std::string> nonterminals_;
    std::map<std::string, std::set<std::string>> first_;
    std::map<std::string, std::set<std::string>> follow_;
    std::vector<ItemSet> states_;
    std::map<std::pair<int, std::string>, int> transitions_;
    std::map<std::pair<int, std::string>, LRTableEntry> action_;
    std::map<std::pair<int, std::string>, int> goto_;
    std::vector<Token> input_;
    std::vector<LRTraceStep> trace_;
    std::vector<ParseError> errors_;
    std::vector<std::string> conflictNotes_;

    void buildGrammar();
    void buildFirstSets();
    void buildFollowSets();
    void buildLALRCollection();
    void buildTables();

    ItemSet closure(const ItemSet& items) const;
    ItemSet goTo(const ItemSet& items, const std::string& symbol) const;
    std::set<std::string> firstOfSequence(const std::vector<std::string>& sequence) const;

    int stateIndex(const ItemSet& items) const;
    std::string coreKey(const ItemSet& items) const;
    bool isNonterminal(const std::string& symbol) const;
    bool isTerminal(const std::string& symbol) const;
    bool isEpsilonProduction(const LRProduction& production) const;
    void setAction(int state, const std::string& terminal, LRTableEntry entry);

    std::string tokenToTerminal(const Token& token) const;
    std::string displaySymbol(const std::string& symbol) const;
    std::string formatStates(const std::vector<int>& stack) const;
    std::string formatSymbols(const std::vector<std::string>& stack) const;
    std::string formatRemaining(size_t pos) const;
    std::string expectedTerminals(int state) const;
    std::string escapeJson(const std::string& str) const;
};