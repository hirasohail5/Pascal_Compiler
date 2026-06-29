#include "lr_parser.h"
#include <algorithm>
#include <iomanip>
#include <iostream>
#include <queue>
#include <sstream>

namespace {
const std::string EPSILON = "epsilon";
const std::string END_MARKER = "$";
const std::string AUGMENTED_START = "S'";
const std::string START_SYMBOL = "program";

std::string join(const std::vector<std::string>& values, const std::string& sep)
{
    std::ostringstream out;
    for (size_t i = 0; i < values.size(); ++i) {
        if (i) out << sep;
        out << values[i];
    }
    return out.str();
}

std::string actionToString(const LRTableEntry& entry)
{
    switch (entry.kind) {
    case LRTableEntry::Kind::Shift:
        return "s" + std::to_string(entry.value);
    case LRTableEntry::Kind::Reduce:
        return "r" + std::to_string(entry.value);
    case LRTableEntry::Kind::Accept:
        return "acc";
    default:
        return "";
    }
}
}

bool LRParser::Item::operator<(const Item& other) const
{
    if (production != other.production) return production < other.production;
    if (dot != other.dot) return dot < other.dot;
    return lookahead < other.lookahead;
}

bool LRParser::Item::operator==(const Item& other) const
{
    return production == other.production &&
           dot == other.dot &&
           lookahead == other.lookahead;
}

LRParser::LRParser(Lexer& lexer) : lexer_(lexer)
{
    buildGrammar();
    buildFirstSets();
    buildFollowSets();
    buildLALRCollection();
    buildTables();
}

void LRParser::buildGrammar()
{
    auto add = [this](const std::string& lhs, std::initializer_list<std::string> rhs) {
        productions_.push_back({lhs, std::vector<std::string>(rhs)});
        nonterminals_.insert(lhs);
    };

    add(AUGMENTED_START, {START_SYMBOL});
    add("program", {"PROGRAM", "ID", "LPAREN", "identifier_list", "RPAREN", "SEMICOLON",
                    "declarations", "subprogram_declarations", "compound_statement", "DOT"});
    add("identifier_list", {"identifier_list", "COMMA", "ID"});
    add("identifier_list", {"ID"});
    add("declarations", {"VAR", "declaration_lines"});
    add("declarations", {});
    add("declaration_lines", {"declaration_lines", "identifier_list", "COLON", "type", "SEMICOLON"});
    add("declaration_lines", {"identifier_list", "COLON", "type", "SEMICOLON"});
    add("type", {"standard_type"});
    add("type", {"ARRAY", "LBRACKET", "NUM", "DOTDOT", "NUM", "RBRACKET", "OF", "standard_type"});
    add("standard_type", {"INTEGER"});
    add("standard_type", {"REAL"});
    add("subprogram_declarations", {"subprogram_declarations", "subprogram_declaration", "SEMICOLON"});
    add("subprogram_declarations", {});
    add("subprogram_declaration", {"subprogram_head", "declarations", "compound_statement"});
    add("subprogram_head", {"FUNCTION", "ID", "arguments", "COLON", "standard_type", "SEMICOLON"});
    add("subprogram_head", {"PROCEDURE", "ID", "arguments", "SEMICOLON"});
    add("arguments", {"LPAREN", "parameter_list", "RPAREN"});
    add("arguments", {});
    add("parameter_list", {"parameter_list", "SEMICOLON", "identifier_list", "COLON", "type"});
    add("parameter_list", {"identifier_list", "COLON", "type"});
    add("compound_statement", {"BEGIN", "optional_statements", "END"});
    add("optional_statements", {"statement_list"});
    add("optional_statements", {});
    add("statement_list", {"statement_list", "SEMICOLON", "statement"});
    add("statement_list", {"statement"});
    add("statement", {"ID", "statement_id_tail"});
    add("statement", {"compound_statement"});
    add("statement", {"IF", "expression", "THEN", "statement"});
    add("statement", {"IF", "expression", "THEN", "statement", "ELSE", "statement"});
    add("statement", {"WHILE", "expression", "DO", "statement"});
    add("statement_id_tail", {"variable_tail", "ASSIGNOP", "expression"});
    add("statement_id_tail", {"LPAREN", "expression_list", "RPAREN"});
    add("statement_id_tail", {});
    add("variable_tail", {"LBRACKET", "expression", "RBRACKET"});
    add("variable_tail", {});
    add("expression_list", {"expression_list", "COMMA", "expression"});
    add("expression_list", {"expression"});
    add("expression", {"simple_expression", "RELOP", "simple_expression"});
    add("expression", {"simple_expression"});
    add("simple_expression", {"simple_expression", "ADDOP", "term"});
    add("simple_expression", {"ADDOP", "term"});
    add("simple_expression", {"term"});
    add("term", {"term", "MULOP", "factor"});
    add("term", {"factor"});
    add("factor", {"ID", "factor_id_tail"});
    add("factor", {"NUM"});
    add("factor", {"LPAREN", "expression", "RPAREN"});
    add("factor", {"NOT", "factor"});
    add("factor_id_tail", {"LPAREN", "expression_list", "RPAREN"});
    add("factor_id_tail", {"LBRACKET", "expression", "RBRACKET"});
    add("factor_id_tail", {});

    for (const auto& production : productions_) {
        for (const auto& symbol : production.rhs) {
            if (!nonterminals_.count(symbol)) terminals_.insert(symbol);
        }
    }
    terminals_.insert(END_MARKER);
}

void LRParser::buildFirstSets()
{
    for (const auto& terminal : terminals_) first_[terminal].insert(terminal);
    for (const auto& nonterminal : nonterminals_) first_[nonterminal];

    bool changed = true;
    while (changed) {
        changed = false;
        for (const auto& production : productions_) {
            auto before = first_[production.lhs].size();
            if (production.rhs.empty()) {
                first_[production.lhs].insert(EPSILON);
            } else {
                bool allNullable = true;
                for (const auto& symbol : production.rhs) {
                    for (const auto& value : first_[symbol]) {
                        if (value != EPSILON) first_[production.lhs].insert(value);
                    }
                    if (!first_[symbol].count(EPSILON)) {
                        allNullable = false;
                        break;
                    }
                }
                if (allNullable) first_[production.lhs].insert(EPSILON);
            }
            if (first_[production.lhs].size() != before) changed = true;
        }
    }
}

void LRParser::buildFollowSets()
{
    // Initialize FOLLOW sets
    for (const auto& nonterminal : nonterminals_) {
        follow_[nonterminal];
    }
    
    // Add $ to FOLLOW of start symbol
    follow_[START_SYMBOL].insert(END_MARKER);
    
    bool changed = true;
    while (changed) {
        changed = false;
        
        for (const auto& production : productions_) {
            for (size_t i = 0; i < production.rhs.size(); ++i) {
                const std::string& symbol = production.rhs[i];
                if (!isNonterminal(symbol)) continue;
                
                // Compute FIRST of beta (the rest after symbol)
                std::vector<std::string> beta;
                for (size_t j = i + 1; j < production.rhs.size(); ++j) {
                    beta.push_back(production.rhs[j]);
                }
                
                std::set<std::string> firstBeta = firstOfSequence(beta);
                bool hasEpsilon = firstBeta.count(EPSILON) > 0;
                
                // Add FIRST(beta) - {epsilon} to FOLLOW(symbol)
                size_t before = follow_[symbol].size();
                for (const auto& term : firstBeta) {
                    if (term != EPSILON) {
                        follow_[symbol].insert(term);
                    }
                }
                if (follow_[symbol].size() != before) changed = true;
                
                // If beta is nullable, add FOLLOW(lhs) to FOLLOW(symbol)
                if (hasEpsilon) {
                    before = follow_[symbol].size();
                    for (const auto& term : follow_[production.lhs]) {
                        follow_[symbol].insert(term);
                    }
                    if (follow_[symbol].size() != before) changed = true;
                }
            }
        }
    }
}

std::set<std::string> LRParser::firstOfSequence(const std::vector<std::string>& sequence) const
{
    std::set<std::string> result;
    if (sequence.empty()) {
        result.insert(EPSILON);
        return result;
    }

    bool allNullable = true;
    for (const auto& symbol : sequence) {
        auto it = first_.find(symbol);
        if (it == first_.end()) continue;
        for (const auto& value : it->second) {
            if (value != EPSILON) result.insert(value);
        }
        if (!it->second.count(EPSILON)) {
            allNullable = false;
            break;
        }
    }
    if (allNullable) result.insert(EPSILON);
    return result;
}

LRParser::ItemSet LRParser::closure(const ItemSet& items) const
{
    ItemSet result = items;
    bool changed = true;
    while (changed) {
        changed = false;
        std::vector<Item> snapshot(result.begin(), result.end());
        for (const auto& item : snapshot) {
            const auto& production = productions_[item.production];
            if (item.dot >= static_cast<int>(production.rhs.size())) continue;

            const std::string& next = production.rhs[item.dot];
            if (!isNonterminal(next)) continue;

            std::vector<std::string> beta;
            for (size_t i = item.dot + 1; i < production.rhs.size(); ++i)
                beta.push_back(production.rhs[i]);
            beta.push_back(item.lookahead);

            auto lookaheads = firstOfSequence(beta);
            for (size_t p = 0; p < productions_.size(); ++p) {
                if (productions_[p].lhs != next) continue;
                for (const auto& lookahead : lookaheads) {
                    if (lookahead == EPSILON) continue;
                    Item candidate{static_cast<int>(p), 0, lookahead};
                    if (result.insert(candidate).second) changed = true;
                }
            }
        }
    }
    return result;
}

LRParser::ItemSet LRParser::goTo(const ItemSet& items, const std::string& symbol) const
{
    ItemSet moved;
    for (const auto& item : items) {
        const auto& production = productions_[item.production];
        if (item.dot < static_cast<int>(production.rhs.size()) &&
            production.rhs[item.dot] == symbol) {
            moved.insert({item.production, item.dot + 1, item.lookahead});
        }
    }
    return closure(moved);
}

void LRParser::buildLALRCollection()
{
    std::vector<ItemSet> canonicalStates;
    std::map<std::pair<int, std::string>, int> canonicalTransitions;

    auto canonicalStateIndex = [&canonicalStates](const ItemSet& items) {
        for (size_t i = 0; i < canonicalStates.size(); ++i) {
            if (canonicalStates[i] == items) return static_cast<int>(i);
        }
        return -1;
    };

    ItemSet start = closure(ItemSet{{0, 0, END_MARKER}});
    canonicalStates.push_back(start);

    std::queue<int> pending;
    pending.push(0);

    std::vector<std::string> symbols;
    symbols.insert(symbols.end(), terminals_.begin(), terminals_.end());
    symbols.insert(symbols.end(), nonterminals_.begin(), nonterminals_.end());

    while (!pending.empty()) {
        int state = pending.front();
        pending.pop();

        for (const auto& symbol : symbols) {
            if (symbol == END_MARKER) continue;
            ItemSet next = goTo(canonicalStates[state], symbol);
            if (next.empty()) continue;
            int existing = canonicalStateIndex(next);
            if (existing == -1) {
                canonicalStates.push_back(next);
                existing = static_cast<int>(canonicalStates.size()) - 1;
                pending.push(existing);
            }
            canonicalTransitions[{state, symbol}] = existing;
        }
    }

    std::map<std::string, int> coreToMergedState;
    std::vector<int> canonicalToMerged(canonicalStates.size(), -1);

    for (size_t i = 0; i < canonicalStates.size(); ++i) {
        std::string key = coreKey(canonicalStates[i]);
        auto it = coreToMergedState.find(key);
        if (it == coreToMergedState.end()) {
            int mergedState = static_cast<int>(states_.size());
            coreToMergedState[key] = mergedState;
            states_.push_back(canonicalStates[i]);
            canonicalToMerged[i] = mergedState;
        } else {
            int mergedState = it->second;
            canonicalToMerged[i] = mergedState;
            states_[mergedState].insert(canonicalStates[i].begin(), canonicalStates[i].end());
        }
    }

    for (const auto& transition : canonicalTransitions) {
        int from = canonicalToMerged[transition.first.first];
        const std::string& symbol = transition.first.second;
        int to = canonicalToMerged[transition.second];
        auto key = std::make_pair(from, symbol);
        auto existing = transitions_.find(key);
        if (existing != transitions_.end() && existing->second != to) {
            std::ostringstream note;
            note << "Merged-state transition conflict from state " << from
                 << " on " << displaySymbol(symbol)
                 << ": kept " << existing->second << ", ignored " << to;
            conflictNotes_.push_back(note.str());
            continue;
        }
        transitions_[key] = to;
    }
}

void LRParser::buildTables()
{
    for (size_t i = 0; i < states_.size(); ++i) {
        for (const auto& item : states_[i]) {
            const auto& production = productions_[item.production];
            if (item.dot < static_cast<int>(production.rhs.size())) {
                const std::string& symbol = production.rhs[item.dot];
                auto transition = transitions_.find({static_cast<int>(i), symbol});
                if (transition == transitions_.end()) continue;
                int targetState = transition->second;
                if (isTerminal(symbol)) {
                    setAction(static_cast<int>(i), symbol,
                              {LRTableEntry::Kind::Shift, targetState});
                } else if (isNonterminal(symbol)) {
                    goto_[{static_cast<int>(i), symbol}] = targetState;
                }
            } else if (production.lhs == AUGMENTED_START && item.lookahead == END_MARKER) {
                setAction(static_cast<int>(i), END_MARKER, {LRTableEntry::Kind::Accept, 0});
            } else {
                setAction(static_cast<int>(i), item.lookahead,
                          {LRTableEntry::Kind::Reduce, item.production});
            }
        }
    }
}

void LRParser::setAction(int state, const std::string& terminal, LRTableEntry entry)
{
    auto key = std::make_pair(state, terminal);
    auto it = action_.find(key);
    if (it == action_.end() || it->second.kind == LRTableEntry::Kind::Error) {
        action_[key] = entry;
        return;
    }
    if (it->second.kind == entry.kind && it->second.value == entry.value) return;

    std::ostringstream note;
    note << "State " << state << ", terminal " << displaySymbol(terminal)
         << ": kept " << actionToString(it->second)
         << ", ignored " << actionToString(entry);

    if (it->second.kind == LRTableEntry::Kind::Shift ||
        entry.kind == LRTableEntry::Kind::Shift) {
        if (entry.kind == LRTableEntry::Kind::Shift) action_[key] = entry;
        note << " (shift chosen)";
    } else {
        int chosen = std::min(it->second.value, entry.value);
        action_[key] = {LRTableEntry::Kind::Reduce, chosen};
        note << " (lower-numbered reduction chosen)";
    }
    conflictNotes_.push_back(note.str());
}

bool LRParser::parse()
{
    input_.clear();
    trace_.clear();
    errors_.clear();

    while (true) {
        Token token = lexer_.nextToken();
        if (token.type != TokenType::UNKNOWN) input_.push_back(token);
        if (token.type == TokenType::END_OF_FILE) break;
    }

    std::vector<int> stateStack{0};
    std::vector<std::string> symbolStack{END_MARKER};
    size_t pos = 0;
    int recoveryCount = 0;

    while (true) {
        int state = stateStack.back();
        std::string lookahead = tokenToTerminal(input_[pos]);
        auto it = action_.find({state, lookahead});
        LRTableEntry action = (it == action_.end()) ? LRTableEntry{} : it->second;

        if (action.kind == LRTableEntry::Kind::Shift) {
            std::ostringstream act;
            act << "shift " << action.value;
            trace_.push_back({formatStates(stateStack), formatSymbols(symbolStack),
                              formatRemaining(pos), act.str()});
            symbolStack.push_back(lookahead);
            stateStack.push_back(action.value);
            if (pos + 1 < input_.size()) ++pos;
            recoveryCount = 0;
            continue;
        }

        if (action.kind == LRTableEntry::Kind::Reduce) {
            const auto& production = productions_[action.value];
            std::ostringstream act;
            act << "reduce r" << action.value << ": " << production.lhs << " -> ";
            act << (production.rhs.empty() ? EPSILON : join(production.rhs, " "));
            trace_.push_back({formatStates(stateStack), formatSymbols(symbolStack),
                              formatRemaining(pos), act.str()});

            if (!production.rhs.empty()) {
                for (size_t i = 0; i < production.rhs.size(); ++i) {
                    if (stateStack.size() > 1) stateStack.pop_back();
                    if (symbolStack.size() > 1) symbolStack.pop_back();
                }
            }
            symbolStack.push_back(production.lhs);
            auto g = goto_.find({stateStack.back(), production.lhs});
            if (g == goto_.end()) {
                errors_.push_back({"No goto entry after reducing " + production.lhs,
                                   input_[pos].line, input_[pos].column});
                return false;
            }
            stateStack.push_back(g->second);
            recoveryCount = 0;
            continue;
        }

        if (action.kind == LRTableEntry::Kind::Accept) {
            trace_.push_back({formatStates(stateStack), formatSymbols(symbolStack),
                              formatRemaining(pos), "accept"});
            return errors_.empty();
        }

        std::ostringstream msg;
        msg << "LR syntax error near '" << input_[pos].lexeme << "'. Expected one of: "
            << expectedTerminals(state);
        errors_.push_back({msg.str(), input_[pos].line, input_[pos].column});
        trace_.push_back({formatStates(stateStack), formatSymbols(symbolStack),
                          formatRemaining(pos), "error: discard lookahead"});

        if (lookahead == END_MARKER || ++recoveryCount > 25) return false;
        ++pos;
    }
}

int LRParser::stateIndex(const ItemSet& items) const
{
    for (size_t i = 0; i < states_.size(); ++i) {
        if (states_[i] == items) return static_cast<int>(i);
    }
    return -1;
}

std::string LRParser::coreKey(const ItemSet& items) const
{
    std::set<std::pair<int, int>> core;
    for (const auto& item : items) {
        core.insert({item.production, item.dot});
    }

    std::ostringstream out;
    for (const auto& item : core) {
        out << item.first << ":" << item.second << ";";
    }
    return out.str();
}

bool LRParser::isNonterminal(const std::string& symbol) const
{
    return nonterminals_.count(symbol) > 0;
}

bool LRParser::isTerminal(const std::string& symbol) const
{
    return terminals_.count(symbol) > 0;
}

bool LRParser::isEpsilonProduction(const LRProduction& production) const
{
    return production.rhs.empty();
}

std::string LRParser::tokenToTerminal(const Token& token) const
{
    if (token.type == TokenType::END_OF_FILE) return END_MARKER;
    return tokenTypeName(token.type);
}

std::string LRParser::displaySymbol(const std::string& symbol) const
{
    if (symbol == END_MARKER) return "$";
    return symbol;
}

std::string LRParser::formatStates(const std::vector<int>& stack) const
{
    std::ostringstream out;
    for (size_t i = 0; i < stack.size(); ++i) {
        if (i) out << ' ';
        out << stack[i];
    }
    return out.str();
}

std::string LRParser::formatSymbols(const std::vector<std::string>& stack) const
{
    std::ostringstream out;
    for (size_t i = 0; i < stack.size(); ++i) {
        if (i) out << ' ';
        out << displaySymbol(stack[i]);
    }
    return out.str();
}

std::string LRParser::formatRemaining(size_t pos) const
{
    std::ostringstream out;
    size_t limit = std::min(input_.size(), pos + 12);
    for (size_t i = pos; i < limit; ++i) {
        if (i > pos) out << ' ';
        std::string terminal = tokenToTerminal(input_[i]);
        out << displaySymbol(terminal);
        if (!input_[i].lexeme.empty() && terminal != input_[i].lexeme)
            out << "(" << input_[i].lexeme << ")";
    }
    if (limit < input_.size()) out << " ...";
    return out.str();
}

std::string LRParser::expectedTerminals(int state) const
{
    std::vector<std::string> expected;
    for (const auto& entry : action_) {
        if (entry.first.first == state && entry.second.kind != LRTableEntry::Kind::Error) {
            expected.push_back(displaySymbol(entry.first.second));
        }
    }
    if (expected.empty()) return "<none>";
    return join(expected, ", ");
}

void LRParser::printGrammar(std::ostream& out) const
{
    out << "\n==================================================\n";
    out << "  LALR(1) GRAMMAR PRODUCTIONS\n";
    out << "==================================================\n";
    out << "Parser choice: LALR(1). It is used because the Pascal subset has nullable\n";
    out << "productions, expression precedence, nested statements, and if-then-else\n";
    out << "constructs, while keeping a much smaller table than canonical LR(1).\n";
    out << "The implementation builds LR(1) item sets, merges states with identical\n";
    out << "LR(0) cores, and unions their lookaheads to form the LALR(1) table.\n";
    out << "Dangling-else shift/reduce conflicts are resolved by shifting ELSE.\n\n";
    for (size_t i = 0; i < productions_.size(); ++i) {
        out << std::setw(3) << i << ": " << productions_[i].lhs << " -> ";
        out << (isEpsilonProduction(productions_[i]) ? EPSILON : join(productions_[i].rhs, " "));
        out << "\n";
    }
    if (!conflictNotes_.empty()) {
        out << "\nConflict notes:\n";
        for (const auto& note : conflictNotes_) out << "  " << note << "\n";
    }
}

void LRParser::printFirstSets(std::ostream& out) const
{
    out << "\n==================================================\n";
    out << "  FIRST SETS\n";
    out << "==================================================\n";
    for (const auto& symbol : nonterminals_) {
        auto it = first_.find(symbol);
        if (it != first_.end() && !it->second.empty()) {
            out << "  FIRST(" << symbol << ") = { ";
            bool first = true;
            for (const auto& term : it->second) {
                if (!first) out << ", ";
                out << term;
                first = false;
            }
            out << " }\n";
        }
    }
}

void LRParser::printFollowSets(std::ostream& out) const
{
    out << "\n==================================================\n";
    out << "  FOLLOW SETS\n";
    out << "==================================================\n";
    for (const auto& symbol : nonterminals_) {
        auto it = follow_.find(symbol);
        if (it != follow_.end() && !it->second.empty()) {
            out << "  FOLLOW(" << symbol << ") = { ";
            bool first = true;
            for (const auto& term : it->second) {
                if (!first) out << ", ";
                out << (term == END_MARKER ? "$" : term);
                first = false;
            }
            out << " }\n";
        }
    }
}

void LRParser::printActionTable(std::ostream& out) const
{
    std::vector<std::string> terminals(terminals_.begin(), terminals_.end());
    out << "\n==================================================\n";
    out << "  LALR(1) ACTION TABLE\n";
    out << "==================================================\n";
    out << std::left << std::setw(7) << "State";
    for (const auto& terminal : terminals) out << std::setw(12) << displaySymbol(terminal);
    out << "\n" << std::string(7 + terminals.size() * 12, '-') << "\n";
    for (size_t state = 0; state < states_.size(); ++state) {
        out << std::left << std::setw(7) << state;
        for (const auto& terminal : terminals) {
            auto it = action_.find({static_cast<int>(state), terminal});
            out << std::setw(12) << (it == action_.end() ? "" : actionToString(it->second));
        }
        out << "\n";
    }
}

void LRParser::printGotoTable(std::ostream& out) const
{
    std::vector<std::string> nonterminals(nonterminals_.begin(), nonterminals_.end());
    nonterminals.erase(std::remove(nonterminals.begin(), nonterminals.end(), AUGMENTED_START),
                       nonterminals.end());

    out << "\n==================================================\n";
    out << "  LALR(1) GOTO TABLE\n";
    out << "==================================================\n";
    out << std::left << std::setw(7) << "State";
    for (const auto& nonterminal : nonterminals) out << std::setw(24) << nonterminal;
    out << "\n" << std::string(7 + nonterminals.size() * 24, '-') << "\n";
    for (size_t state = 0; state < states_.size(); ++state) {
        out << std::left << std::setw(7) << state;
        for (const auto& nonterminal : nonterminals) {
            auto it = goto_.find({static_cast<int>(state), nonterminal});
            out << std::setw(24) << (it == goto_.end() ? "" : std::to_string(it->second));
        }
        out << "\n";
    }
}

void LRParser::printTrace(std::ostream& out) const
{
    out << "\n==================================================\n";
    out << "  LR SHIFT-REDUCE TRACE\n";
    out << "==================================================\n";
    out << std::left << std::setw(5) << "#"
        << std::setw(28) << "State stack"
        << std::setw(42) << "Symbol stack"
        << std::setw(62) << "Remaining input"
        << "Action\n";
    out << std::string(160, '-') << "\n";
    for (size_t i = 0; i < trace_.size(); ++i) {
        out << std::left << std::setw(5) << i
            << std::setw(28) << trace_[i].stateStack.substr(0, 27)
            << std::setw(42) << trace_[i].symbolStack.substr(0, 41)
            << std::setw(62) << trace_[i].remainingInput.substr(0, 61)
            << trace_[i].action << "\n";
    }
}

void LRParser::printErrors(std::ostream& out) const
{
    if (errors_.empty()) return;
    out << "\n[LR PARSER ERRORS]\n";
    for (const auto& error : errors_) {
        out << "  Line " << error.line << ", Col " << error.column
            << ": " << error.message << "\n";
    }
}

std::string LRParser::escapeJson(const std::string& str) const
{
    std::ostringstream out;
    for (char c : str) {
        switch (c) {
            case '"': out << "\\\""; break;
            case '\\': out << "\\\\"; break;
            case '\n': out << "\\n"; break;
            case '\r': out << "\\r"; break;
            case '\t': out << "\\t"; break;
            default: out << c; break;
        }
    }
    return out.str();
}

void LRParser::printStructuredOutput(std::ostream& out) const
{
    out << "\n---STRUCTURED_OUTPUT_START---\n";
    out << "{\n";
    
    // FIRST sets
    out << "  \"firstSets\": {\n";
    bool first = true;
    for (const auto& symbol : nonterminals_) {
        auto it = first_.find(symbol);
        if (it != first_.end() && !it->second.empty()) {
            if (!first) out << ",\n";
            out << "    \"" << symbol << "\": [";
            bool firstTerm = true;
            for (const auto& term : it->second) {
                if (!firstTerm) out << ", ";
                out << "\"" << term << "\"";
                firstTerm = false;
            }
            out << "]";
            first = false;
        }
    }
    out << "\n  },\n";
    
    // FOLLOW sets
    out << "  \"followSets\": {\n";
    first = true;
    for (const auto& symbol : nonterminals_) {
        auto it = follow_.find(symbol);
        if (it != follow_.end() && !it->second.empty()) {
            if (!first) out << ",\n";
            out << "    \"" << symbol << "\": [";
            bool firstTerm = true;
            for (const auto& term : it->second) {
                if (!firstTerm) out << ", ";
                out << "\"" << term << "\"";
                firstTerm = false;
            }
            out << "]";
            first = false;
        }
    }
    out << "\n  },\n";
    
    // Parsing Table (ACTION)
    out << "  \"parsingTable\": {\n";
    out << "    \"action\": {\n";
    first = true;
    for (const auto& entry : action_) {
        if (entry.second.kind != LRTableEntry::Kind::Error) {
            if (!first) out << ",\n";
            out << "      \"" << entry.first.first << "_" << entry.first.second << "\": \"" 
                << actionToString(entry.second) << "\"";
            first = false;
        }
    }
    out << "\n    },\n";
    
    // Parsing Table (GOTO)
    out << "    \"goto\": {\n";
    first = true;
    for (const auto& entry : goto_) {
        if (!first) out << ",\n";
        out << "      \"" << entry.first.first << "_" << entry.first.second << "\": " << entry.second;
        first = false;
    }
    out << "\n    }\n";
    out << "  },\n";
    
    // Stack Trace
    out << "  \"stackTrace\": [\n";
    for (size_t i = 0; i < trace_.size(); ++i) {
        out << "    {\n";
        out << "      \"step\": " << i << ",\n";
        out << "      \"stateStack\": \"" << escapeJson(trace_[i].stateStack) << "\",\n";
        out << "      \"symbolStack\": \"" << escapeJson(trace_[i].symbolStack) << "\",\n";
        out << "      \"remainingInput\": \"" << escapeJson(trace_[i].remainingInput) << "\",\n";
        out << "      \"action\": \"" << escapeJson(trace_[i].action) << "\"\n";
        out << "    }" << (i < trace_.size() - 1 ? "," : "");
    }
    out << "\n  ],\n";
    
    // Grammar productions
    out << "  \"grammar\": [\n";
    for (size_t i = 0; i < productions_.size(); ++i) {
        out << "    {\n";
        out << "      \"index\": " << i << ",\n";
        out << "      \"lhs\": \"" << productions_[i].lhs << "\",\n";
        out << "      \"rhs\": \"" << (productions_[i].rhs.empty() ? "ε" : join(productions_[i].rhs, " ")) << "\"\n";
        out << "    }" << (i < productions_.size() - 1 ? "," : "");
    }
    out << "\n  ]\n";
    out << "}\n";
    out << "---STRUCTURED_OUTPUT_END---\n";
}

void LRParser::printFullOutput(std::ostream& out) const
{
    printGrammar(out);
    printFirstSets(out);
    printFollowSets(out);
    printActionTable(out);
    printGotoTable(out);
    printTrace(out);
    printErrors(out);
    printStructuredOutput(out);
}