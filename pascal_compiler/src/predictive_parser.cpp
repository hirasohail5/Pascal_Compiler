#include "predictive_parser.h"

#include <algorithm>
#include <cctype>
#include <iomanip>
#include <iostream>
#include <sstream>

namespace {
const std::string EPS = "EPS";

class TokenAstBuilder {
public:
    TokenAstBuilder(const std::vector<Token>& tokens, std::vector<ParseError>& errors)
        : tokens_(tokens), errors_(errors) {}

    ASTNodePtr parseProgram()
    {
        int ln = peek().line;
        consume(TokenType::KW_PROGRAM, "'program'");
        Token name = consume(TokenType::ID, "program name");
        auto node = std::make_unique<ASTNode>(NodeKind::PROGRAM, name.lexeme, ln);

        consume(TokenType::LPAREN, "'('");
        node->addChild(parseIdentifierList());
        consume(TokenType::RPAREN, "')'");
        consume(TokenType::SEMICOLON, "';'");
        node->addChild(parseDeclarations());
        node->addChild(parseSubprogramDeclarations());
        node->addChild(parseCompoundStatement());
        consume(TokenType::DOT, "'.'");
        return node;
    }

private:
    const std::vector<Token>& tokens_;
    std::vector<ParseError>& errors_;
    size_t pos_ = 0;

    const Token& peek() const
    {
        static Token eof(TokenType::END_OF_FILE, "", "", 0, 0);
        return pos_ < tokens_.size() ? tokens_[pos_] : eof;
    }

    bool check(TokenType type) const { return peek().type == type; }

    Token consume(TokenType expected, const std::string& what)
    {
        Token current = peek();
        if (current.type == expected) {
            ++pos_;
            return current;
        }
        std::ostringstream msg;
        msg << "AST builder expected " << what << " but found '"
            << current.lexeme << "'";
        errors_.push_back({msg.str(), current.line, current.column});
        return current;
    }

    ASTNodePtr parseIdentifierList()
    {
        int ln = peek().line;
        auto node = std::make_unique<ASTNode>(NodeKind::IDENTIFIER_LIST, "", ln);
        Token id = consume(TokenType::ID, "identifier");
        node->addChild(std::make_unique<ASTNode>(NodeKind::VARIABLE, id.lexeme, id.line));
        while (check(TokenType::COMMA)) {
            consume(TokenType::COMMA, "','");
            Token next = consume(TokenType::ID, "identifier");
            node->addChild(std::make_unique<ASTNode>(NodeKind::VARIABLE, next.lexeme, next.line));
        }
        return node;
    }

    ASTNodePtr parseDeclarations()
    {
        int ln = peek().line;
        auto node = std::make_unique<ASTNode>(NodeKind::DECLARATIONS, "", ln);
        while (check(TokenType::KW_VAR)) {
            consume(TokenType::KW_VAR, "'var'");
            while (check(TokenType::ID)) {
                int declLine = peek().line;
                auto decl = std::make_unique<ASTNode>(NodeKind::VAR_DECL, "", declLine);
                decl->addChild(parseIdentifierList());
                consume(TokenType::COLON, "':'");
                decl->addChild(parseType());
                consume(TokenType::SEMICOLON, "';'");
                node->addChild(std::move(decl));
            }
        }
        return node;
    }

    ASTNodePtr parseType()
    {
        if (check(TokenType::KW_ARRAY)) {
            int ln = peek().line;
            consume(TokenType::KW_ARRAY, "'array'");
            consume(TokenType::LBRACKET, "'['");
            Token low = consume(TokenType::NUM, "number");
            consume(TokenType::DOTDOT, "'..'");
            Token high = consume(TokenType::NUM, "number");
            consume(TokenType::RBRACKET, "']'");
            consume(TokenType::KW_OF, "'of'");
            auto arr = std::make_unique<ASTNode>(
                NodeKind::ARRAY_TYPE, low.lexeme + ".." + high.lexeme, ln);
            arr->addChild(parseStandardType());
            return arr;
        }
        return parseStandardType();
    }

    ASTNodePtr parseStandardType()
    {
        int ln = peek().line;
        if (check(TokenType::KW_INTEGER)) {
            consume(TokenType::KW_INTEGER, "'integer'");
            return std::make_unique<ASTNode>(NodeKind::STANDARD_TYPE, "integer", ln);
        }
        if (check(TokenType::KW_REAL)) {
            consume(TokenType::KW_REAL, "'real'");
            return std::make_unique<ASTNode>(NodeKind::STANDARD_TYPE, "real", ln);
        }
        errors_.push_back({"Expected 'integer' or 'real' type", peek().line, peek().column});
        return std::make_unique<ASTNode>(NodeKind::EMPTY, "", ln);
    }

    ASTNodePtr parseSubprogramDeclarations()
    {
        int ln = peek().line;
        auto node = std::make_unique<ASTNode>(NodeKind::SUBPROGRAM_DECLS, "", ln);
        while (check(TokenType::KW_FUNCTION) || check(TokenType::KW_PROCEDURE)) {
            node->addChild(parseSubprogramDeclaration());
            consume(TokenType::SEMICOLON, "';'");
        }
        return node;
    }

    ASTNodePtr parseSubprogramDeclaration()
    {
        int ln = peek().line;
        auto node = std::make_unique<ASTNode>(NodeKind::SUBPROGRAM_DECL, "", ln);
        node->addChild(parseSubprogramHead());
        node->addChild(parseDeclarations());
        node->addChild(parseCompoundStatement());
        return node;
    }

    ASTNodePtr parseSubprogramHead()
    {
        int ln = peek().line;
        std::string kind = check(TokenType::KW_FUNCTION) ? "function" : "procedure";
        consume(kind == "function" ? TokenType::KW_FUNCTION : TokenType::KW_PROCEDURE,
                kind == "function" ? "'function'" : "'procedure'");
        Token name = consume(TokenType::ID, "subprogram name");
        auto node = std::make_unique<ASTNode>(
            NodeKind::SUBPROGRAM_HEAD, kind + " " + name.lexeme, ln);
        node->addChild(parseArguments());
        if (kind == "function") {
            consume(TokenType::COLON, "':'");
            node->addChild(parseStandardType());
        }
        consume(TokenType::SEMICOLON, "';'");
        return node;
    }

    ASTNodePtr parseArguments()
    {
        int ln = peek().line;
        auto node = std::make_unique<ASTNode>(NodeKind::ARGUMENTS, "", ln);
        if (check(TokenType::LPAREN)) {
            consume(TokenType::LPAREN, "'('");
            node->addChild(parseParameterList());
            consume(TokenType::RPAREN, "')'");
        }
        return node;
    }

    ASTNodePtr parseParameterList()
    {
        int ln = peek().line;
        auto node = std::make_unique<ASTNode>(NodeKind::PARAMETER_LIST, "", ln);
        do {
            if (check(TokenType::SEMICOLON)) consume(TokenType::SEMICOLON, "';'");
            auto param = std::make_unique<ASTNode>(NodeKind::VAR_DECL, "", peek().line);
            param->addChild(parseIdentifierList());
            consume(TokenType::COLON, "':'");
            param->addChild(parseType());
            node->addChild(std::move(param));
        } while (check(TokenType::SEMICOLON));
        return node;
    }

    ASTNodePtr parseCompoundStatement()
    {
        int ln = peek().line;
        consume(TokenType::KW_BEGIN, "'begin'");
        auto node = std::make_unique<ASTNode>(NodeKind::COMPOUND_STMT, "", ln);
        node->addChild(parseOptionalStatements());
        consume(TokenType::KW_END, "'end'");
        return node;
    }

    ASTNodePtr parseOptionalStatements()
    {
        if (check(TokenType::KW_END))
            return std::make_unique<ASTNode>(NodeKind::EMPTY, "", peek().line);
        return parseStatementList();
    }

    ASTNodePtr parseStatementList()
    {
        int ln = peek().line;
        auto node = std::make_unique<ASTNode>(NodeKind::STATEMENT_LIST, "", ln);
        node->addChild(parseStatement());
        while (check(TokenType::SEMICOLON)) {
            consume(TokenType::SEMICOLON, "';'");
            if (check(TokenType::KW_END)) break;
            node->addChild(parseStatement());
        }
        return node;
    }

    ASTNodePtr parseStatement()
    {
        int ln = peek().line;
        if (check(TokenType::KW_BEGIN)) return parseCompoundStatement();
        if (check(TokenType::KW_IF)) {
            consume(TokenType::KW_IF, "'if'");
            auto node = std::make_unique<ASTNode>(NodeKind::IF_STMT, "", ln);
            node->addChild(parseExpression());
            consume(TokenType::KW_THEN, "'then'");
            node->addChild(parseStatement());
            if (check(TokenType::KW_ELSE)) {
                consume(TokenType::KW_ELSE, "'else'");
                node->addChild(parseStatement());
            }
            return node;
        }
        if (check(TokenType::KW_WHILE)) {
            consume(TokenType::KW_WHILE, "'while'");
            auto node = std::make_unique<ASTNode>(NodeKind::WHILE_STMT, "", ln);
            node->addChild(parseExpression());
            consume(TokenType::KW_DO, "'do'");
            node->addChild(parseStatement());
            return node;
        }
        if (check(TokenType::ID)) {
            Token id = consume(TokenType::ID, "identifier");
            if (check(TokenType::ASSIGNOP) || check(TokenType::LBRACKET)) {
                auto varNode = std::make_unique<ASTNode>(NodeKind::VARIABLE, id.lexeme, id.line);
                if (check(TokenType::LBRACKET)) {
                    consume(TokenType::LBRACKET, "'['");
                    varNode->kind = NodeKind::ARRAY_ACCESS;
                    varNode->addChild(parseExpression());
                    consume(TokenType::RBRACKET, "']'");
                }
                consume(TokenType::ASSIGNOP, "':='");
                auto assign = std::make_unique<ASTNode>(NodeKind::ASSIGN_STMT, ":=", ln);
                assign->addChild(std::move(varNode));
                assign->addChild(parseExpression());
                return assign;
            }
            auto call = std::make_unique<ASTNode>(NodeKind::PROCEDURE_CALL, id.lexeme, id.line);
            if (check(TokenType::LPAREN)) {
                consume(TokenType::LPAREN, "'('");
                if (!check(TokenType::RPAREN)) call->addChild(parseExpressionList());
                consume(TokenType::RPAREN, "')'");
            }
            return call;
        }
        return std::make_unique<ASTNode>(NodeKind::EMPTY, "", ln);
    }

    ASTNodePtr parseExpressionList()
    {
        int ln = peek().line;
        auto node = std::make_unique<ASTNode>(NodeKind::STATEMENT_LIST, "", ln);
        node->addChild(parseExpression());
        while (check(TokenType::COMMA)) {
            consume(TokenType::COMMA, "','");
            node->addChild(parseExpression());
        }
        return node;
    }

    ASTNodePtr parseExpression()
    {
        auto left = parseSimpleExpression();
        if (check(TokenType::RELOP)) {
            Token op = consume(TokenType::RELOP, "relational operator");
            auto right = parseSimpleExpression();
            auto node = std::make_unique<ASTNode>(NodeKind::BINARY_EXPR, op.lexeme, op.line);
            node->addChild(std::move(left));
            node->addChild(std::move(right));
            return node;
        }
        return left;
    }

    ASTNodePtr parseSimpleExpression()
    {
        ASTNodePtr signNode;
        if (check(TokenType::ADDOP) && (peek().lexeme == "+" || peek().lexeme == "-")) {
            Token sign = consume(TokenType::ADDOP, "sign");
            signNode = std::make_unique<ASTNode>(NodeKind::UNARY_EXPR, sign.lexeme, sign.line);
        }
        auto left = parseTerm();
        if (signNode) {
            signNode->addChild(std::move(left));
            left = std::move(signNode);
        }
        while (check(TokenType::ADDOP)) {
            Token op = consume(TokenType::ADDOP, "additive operator");
            auto right = parseTerm();
            auto bin = std::make_unique<ASTNode>(NodeKind::BINARY_EXPR, op.lexeme, op.line);
            bin->addChild(std::move(left));
            bin->addChild(std::move(right));
            left = std::move(bin);
        }
        return left;
    }

    ASTNodePtr parseTerm()
    {
        auto left = parseFactor();
        while (check(TokenType::MULOP)) {
            Token op = consume(TokenType::MULOP, "multiplicative operator");
            auto right = parseFactor();
            auto bin = std::make_unique<ASTNode>(NodeKind::BINARY_EXPR, op.lexeme, op.line);
            bin->addChild(std::move(left));
            bin->addChild(std::move(right));
            left = std::move(bin);
        }
        return left;
    }

    ASTNodePtr parseFactor()
    {
        int ln = peek().line;
        if (check(TokenType::ID)) {
            Token id = consume(TokenType::ID, "identifier");
            if (check(TokenType::LPAREN)) {
                consume(TokenType::LPAREN, "'('");
                auto call = std::make_unique<ASTNode>(NodeKind::FUNC_CALL, id.lexeme, id.line);
                if (!check(TokenType::RPAREN)) call->addChild(parseExpressionList());
                consume(TokenType::RPAREN, "')'");
                return call;
            }
            if (check(TokenType::LBRACKET)) {
                consume(TokenType::LBRACKET, "'['");
                auto arr = std::make_unique<ASTNode>(NodeKind::ARRAY_ACCESS, id.lexeme, id.line);
                arr->addChild(parseExpression());
                consume(TokenType::RBRACKET, "']'");
                return arr;
            }
            return std::make_unique<ASTNode>(NodeKind::VARIABLE, id.lexeme, id.line);
        }
        if (check(TokenType::NUM)) {
            Token num = consume(TokenType::NUM, "number");
            return std::make_unique<ASTNode>(NodeKind::NUMBER_LITERAL, num.lexeme, num.line);
        }
        if (check(TokenType::LPAREN)) {
            consume(TokenType::LPAREN, "'('");
            auto expr = parseExpression();
            consume(TokenType::RPAREN, "')'");
            return expr;
        }
        if (check(TokenType::KW_NOT)) {
            Token notTok = consume(TokenType::KW_NOT, "'not'");
            auto node = std::make_unique<ASTNode>(NodeKind::UNARY_EXPR, "not", notTok.line);
            node->addChild(parseFactor());
            return node;
        }
        errors_.push_back({"Expected factor (id, number, '(' or 'not')", peek().line, peek().column});
        return std::make_unique<ASTNode>(NodeKind::EMPTY, "", ln);
    }
};

std::string lowerName(const std::string& value)
{
    std::string result = value;
    std::transform(result.begin(), result.end(), result.begin(),
                   [](unsigned char c) { return static_cast<char>(std::tolower(c)); });
    return result;
}

void declareName(const ASTNode* node, std::set<std::string>& symbols,
                 std::vector<ParseError>& errors)
{
    if (!node || node->value.empty()) return;
    std::string name = lowerName(node->value);
    if (symbols.count(name)) {
        errors.push_back({"Semantic error: duplicate declaration of '" + node->value + "'",
                          node->line, 1});
    } else {
        symbols.insert(name);
    }
}

void collectDeclarations(const ASTNode* node, std::set<std::string>& symbols,
                         std::vector<ParseError>& errors)
{
    if (!node) return;

    if (node->kind == NodeKind::PROGRAM) {
        declareName(node, symbols, errors);
    }

    if (node->kind == NodeKind::SUBPROGRAM_HEAD && !node->value.empty()) {
        std::istringstream in(node->value);
        std::string kind;
        std::string name;
        in >> kind >> name;
        if (!name.empty()) {
            ASTNode synthetic(NodeKind::VARIABLE, name, node->line);
            declareName(&synthetic, symbols, errors);
        }
    }

    if (node->kind == NodeKind::IDENTIFIER_LIST) {
        for (const auto& child : node->children) {
            declareName(child.get(), symbols, errors);
        }
    }

    for (const auto& child : node->children) {
        collectDeclarations(child.get(), symbols, errors);
    }
}

void checkIdentifierUses(const ASTNode* node, const std::set<std::string>& symbols,
                         std::vector<ParseError>& errors, bool inDeclaration = false)
{
    if (!node) return;

    bool declarationContext = inDeclaration || node->kind == NodeKind::IDENTIFIER_LIST;
    bool identifierUse = node->kind == NodeKind::VARIABLE ||
                         node->kind == NodeKind::ARRAY_ACCESS ||
                         node->kind == NodeKind::FUNC_CALL ||
                         node->kind == NodeKind::PROCEDURE_CALL;

    if (!declarationContext && identifierUse && !node->value.empty()) {
        std::string name = lowerName(node->value);
        if (name != "read" && name != "write" && !symbols.count(name)) {
            errors.push_back({"Semantic error: undeclared identifier '" + node->value + "'",
                              node->line, 1});
        }
    }

    for (const auto& child : node->children) {
        checkIdentifierUses(child.get(), symbols, errors, declarationContext);
    }
}

void runSemanticChecks(const ASTNode* root, std::vector<ParseError>& errors)
{
    std::set<std::string> symbols;
    collectDeclarations(root, symbols, errors);
    checkIdentifierUses(root, symbols, errors);
}
}

PredictiveParser::PredictiveParser(Lexer& l) : lexer(l)
{
    advance();
    buildGrammar();
    computeFirst();
    computeFollow();
    buildTable();
}

void PredictiveParser::advance()
{
    lookahead = lexer.nextToken();
}

void PredictiveParser::buildGrammar()
{
    grammar = {
        {"program", {"PROGRAM", "ID", "(", "id_list", ")", ";", "decls", "subprograms", "compound", "."}},
        {"id_list", {"ID", "id_list_tail"}},
        {"id_list_tail", {",", "ID", "id_list_tail"}},
        {"id_list_tail", {EPS}},

        {"decls", {"VAR", "decl_list", "decls"}},
        {"decls", {EPS}},
        {"decl_list", {"ID", "id_list_tail", ":", "type", ";", "decl_list_tail"}},
        {"decl_list_tail", {"ID", "id_list_tail", ":", "type", ";", "decl_list_tail"}},
        {"decl_list_tail", {EPS}},
        {"type", {"standard_type"}},
        {"type", {"ARRAY", "[", "NUM", "..", "NUM", "]", "OF", "standard_type"}},
        {"standard_type", {"INTEGER"}},
        {"standard_type", {"REAL"}},

        {"subprograms", {"subprogram", ";", "subprograms"}},
        {"subprograms", {EPS}},
        {"subprogram", {"sub_head", "decls", "compound"}},
        {"sub_head", {"FUNCTION", "ID", "args", ":", "standard_type", ";"}},
        {"sub_head", {"PROCEDURE", "ID", "args", ";"}},
        {"args", {"(", "param_list", ")"}},
        {"args", {EPS}},
        {"param_list", {"id_list", ":", "type", "param_tail"}},
        {"param_tail", {";", "id_list", ":", "type", "param_tail"}},
        {"param_tail", {EPS}},

        {"compound", {"BEGIN", "optional_statements", "END"}},
        {"optional_statements", {"stmt_list"}},
        {"optional_statements", {EPS}},
        {"stmt_list", {"stmt", "stmt_list_tail"}},
        {"stmt_list_tail", {";", "stmt_list_tail_after_semicolon"}},
        {"stmt_list_tail", {EPS}},
        {"stmt_list_tail_after_semicolon", {"stmt", "stmt_list_tail"}},
        {"stmt_list_tail_after_semicolon", {EPS}},

        {"stmt", {"ID", "stmt_id_tail"}},
        {"stmt", {"compound"}},
        {"stmt", {"IF", "expr", "THEN", "stmt", "else_part"}},
        {"stmt", {"WHILE", "expr", "DO", "stmt"}},
        {"stmt", {EPS}},
        {"stmt_id_tail", {":=", "expr"}},
        {"stmt_id_tail", {"[", "expr", "]", ":=", "expr"}},
        {"stmt_id_tail", {"(", "expr_list_opt", ")"}},
        {"stmt_id_tail", {EPS}},
        {"else_part", {"ELSE", "stmt"}},
        {"else_part", {EPS}},

        {"expr_list_opt", {"expr_list"}},
        {"expr_list_opt", {EPS}},
        {"expr_list", {"expr", "expr_list_tail"}},
        {"expr_list_tail", {",", "expr", "expr_list_tail"}},
        {"expr_list_tail", {EPS}},
        {"expr", {"simple", "expr_tail"}},
        {"expr_tail", {"RELOP", "simple"}},
        {"expr_tail", {EPS}},
        {"simple", {"ADDOP", "term", "simple_tail"}},
        {"simple", {"term", "simple_tail"}},
        {"simple_tail", {"ADDOP", "term", "simple_tail"}},
        {"simple_tail", {EPS}},
        {"term", {"factor", "term_tail"}},
        {"term_tail", {"MULOP", "factor", "term_tail"}},
        {"term_tail", {EPS}},
        {"factor", {"ID", "factor_id_tail"}},
        {"factor", {"NUM"}},
        {"factor", {"(", "expr", ")"}},
        {"factor", {"NOT", "factor"}},
        {"factor_id_tail", {"(", "expr_list_opt", ")"}},
        {"factor_id_tail", {"[", "expr", "]"}},
        {"factor_id_tail", {EPS}}
    };
}

void PredictiveParser::computeFirst()
{
    FIRST.clear();
    for (const auto& p : grammar) FIRST[p.lhs];

    bool changed = true;
    while (changed) {
        changed = false;
        for (const auto& p : grammar) {
            auto before = FIRST[p.lhs].size();
            auto seqFirst = firstOf(p.rhs);
            FIRST[p.lhs].insert(seqFirst.begin(), seqFirst.end());
            changed = changed || FIRST[p.lhs].size() != before;
        }
    }
}

void PredictiveParser::computeFollow()
{
    FOLLOW.clear();
    for (const auto& p : grammar) FOLLOW[p.lhs];
    FOLLOW["program"].insert("$");

    bool changed = true;
    while (changed) {
        changed = false;
        for (const auto& p : grammar) {
            for (size_t i = 0; i < p.rhs.size(); ++i) {
                const std::string& B = p.rhs[i];
                if (FIRST.find(B) == FIRST.end()) continue;

                std::vector<std::string> beta(p.rhs.begin() + i + 1, p.rhs.end());
                auto firstBeta = firstOf(beta);
                auto before = FOLLOW[B].size();
                for (const auto& x : firstBeta) {
                    if (x != EPS) FOLLOW[B].insert(x);
                }
                if (beta.empty() || firstBeta.count(EPS)) {
                    FOLLOW[B].insert(FOLLOW[p.lhs].begin(), FOLLOW[p.lhs].end());
                }
                changed = changed || FOLLOW[B].size() != before;
            }
        }
    }
}

void PredictiveParser::buildTable()
{
    table.clear();
    for (int i = 0; i < static_cast<int>(grammar.size()); ++i) {
        const auto& p = grammar[i];
        auto first = firstOf(p.rhs);
        for (const auto& t : first) {
            if (t != EPS) table[p.lhs][t] = i;
        }
        if (first.count(EPS)) {
            for (const auto& f : FOLLOW[p.lhs]) {
                if (!table[p.lhs].count(f)) table[p.lhs][f] = i;
            }
        }
    }
}

ASTNodePtr PredictiveParser::parse()
{
    trace.clear();
    errors.clear();
    matchedTokens.clear();

    std::stack<std::string> st;
    st.push("$");
    st.push("program");

    while (!st.empty()) {
        std::string top = st.top();
        std::string input = terminalOf(lookahead);
        std::string stackText = stackToString(st);

        if (top == "$") {
            if (input == "$") {
                trace.push_back({stackText, "$",
                                 errors.empty() ? "accept" : "recovered parse finished with errors"});
                break;
            }
            syncError("Extra token after program end: '" + lookahead.lexeme + "'");
            trace.push_back({stackText, input, "error: discard extra input"});
            advance();
            continue;
        }

        if (isTerminal(top)) {
            if (top == input) {
                st.pop();
                trace.push_back({stackText, lookahead.lexeme.empty() ? input : lookahead.lexeme,
                                 "match " + top});
                if (lookahead.type != TokenType::END_OF_FILE) matchedTokens.push_back(lookahead);
                advance();
            } else {
                std::ostringstream msg;
                msg << "Expected " << top << " but found '"
                    << (lookahead.lexeme.empty() ? input : lookahead.lexeme) << "'";
                errors.push_back({msg.str(), lookahead.line, lookahead.column});
                trace.push_back({stackText, input, "phrase recovery: insert missing " + top});
                st.pop();
            }
            continue;
        }

        auto row = table.find(top);
        if (row != table.end() && row->second.count(input)) {
            int prodIndex = row->second[input];
            const auto& prod = grammar[prodIndex];
            st.pop();
            if (!(prod.rhs.size() == 1 && prod.rhs[0] == EPS)) {
                for (auto it = prod.rhs.rbegin(); it != prod.rhs.rend(); ++it) st.push(*it);
            }
            trace.push_back({stackText, input, productionToString(prod)});
            continue;
        }

        if (FOLLOW[top].count(input) || input == "$") {
            errors.push_back({"Synchronizing on FOLLOW(" + top + "); skipped non-terminal",
                              lookahead.line, lookahead.column});
            trace.push_back({stackText, input, "panic recovery: pop " + top});
            st.pop();
        } else {
            std::ostringstream msg;
            msg << "No LL(1) rule for " << top << " on '"
                << (lookahead.lexeme.empty() ? input : lookahead.lexeme)
                << "'; skipping token";
            errors.push_back({msg.str(), lookahead.line, lookahead.column});
            trace.push_back({stackText, input, "panic recovery: discard token"});
            advance();
        }
    }

    return buildAstFromMatchedTokens();
}

bool PredictiveParser::isTerminal(const std::string& s)
{
    return s == "$" || FIRST.find(s) == FIRST.end();
}

std::set<std::string> PredictiveParser::firstOf(const std::vector<std::string>& symbols)
{
    std::set<std::string> result;
    if (symbols.empty()) {
        result.insert(EPS);
        return result;
    }
    for (const auto& s : symbols) {
        if (s == EPS) {
            result.insert(EPS);
            return result;
        }
        if (isTerminal(s)) {
            result.insert(s);
            return result;
        }
        for (const auto& x : FIRST[s]) {
            if (x != EPS) result.insert(x);
        }
        if (!FIRST[s].count(EPS)) return result;
    }
    result.insert(EPS);
    return result;
}

void PredictiveParser::syncError(const std::string& msg)
{
    errors.push_back({msg, lookahead.line, lookahead.column});
}

std::string PredictiveParser::terminalOf(const Token& token) const
{
    switch (token.type) {
    case TokenType::ID: return "ID";
    case TokenType::NUM: return "NUM";
    case TokenType::KW_PROGRAM: return "PROGRAM";
    case TokenType::KW_VAR: return "VAR";
    case TokenType::KW_ARRAY: return "ARRAY";
    case TokenType::KW_OF: return "OF";
    case TokenType::KW_INTEGER: return "INTEGER";
    case TokenType::KW_REAL: return "REAL";
    case TokenType::KW_FUNCTION: return "FUNCTION";
    case TokenType::KW_PROCEDURE: return "PROCEDURE";
    case TokenType::KW_BEGIN: return "BEGIN";
    case TokenType::KW_END: return "END";
    case TokenType::KW_IF: return "IF";
    case TokenType::KW_THEN: return "THEN";
    case TokenType::KW_ELSE: return "ELSE";
    case TokenType::KW_WHILE: return "WHILE";
    case TokenType::KW_DO: return "DO";
    case TokenType::KW_NOT: return "NOT";
    case TokenType::ASSIGNOP: return ":=";
    case TokenType::RELOP: return "RELOP";
    case TokenType::ADDOP: return "ADDOP";
    case TokenType::MULOP: return "MULOP";
    case TokenType::LPAREN: return "(";
    case TokenType::RPAREN: return ")";
    case TokenType::LBRACKET: return "[";
    case TokenType::RBRACKET: return "]";
    case TokenType::COMMA: return ",";
    case TokenType::SEMICOLON: return ";";
    case TokenType::COLON: return ":";
    case TokenType::DOT: return ".";
    case TokenType::DOTDOT: return "..";
    case TokenType::END_OF_FILE: return "$";
    default: return "UNKNOWN";
    }
}

std::string PredictiveParser::productionToString(const Production& production) const
{
    std::ostringstream out;
    out << production.lhs << " -> ";
    for (size_t i = 0; i < production.rhs.size(); ++i) {
        if (i) out << ' ';
        out << production.rhs[i];
    }
    return out.str();
}

std::string PredictiveParser::stackToString(std::stack<std::string> stack) const
{
    std::vector<std::string> items;
    while (!stack.empty()) {
        items.push_back(stack.top());
        stack.pop();
    }
    std::ostringstream out;
    for (auto it = items.rbegin(); it != items.rend(); ++it) {
        if (it != items.rbegin()) out << ' ';
        out << *it;
    }
    return out.str();
}

ASTNodePtr PredictiveParser::buildAstFromMatchedTokens()
{
    std::vector<Token> tokens = matchedTokens;
    tokens.push_back(Token(TokenType::END_OF_FILE, "", "", lookahead.line, lookahead.column));
    TokenAstBuilder builder(tokens, errors);
    ASTNodePtr root = builder.parseProgram();
    runSemanticChecks(root.get(), errors);
    return root;
}

std::string PredictiveParser::escapeJson(const std::string& str) const
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

void PredictiveParser::printFirstSets(std::ostream& out) const
{
    out << "\n================ FIRST SETS ================\n";
    for (const auto& p : FIRST) {
        out << "FIRST(" << p.first << ") = { ";
        bool first = true;
        for (const auto& x : p.second) {
            if (!first) out << ", ";
            out << x;
            first = false;
        }
        out << " }\n";
    }
}

void PredictiveParser::printFollowSets(std::ostream& out) const
{
    out << "\n================ FOLLOW SETS ================\n";
    for (const auto& p : FOLLOW) {
        out << "FOLLOW(" << p.first << ") = { ";
        bool first = true;
        for (const auto& x : p.second) {
            if (!first) out << ", ";
            out << x;
            first = false;
        }
        out << " }\n";
    }
}

void PredictiveParser::printParsingTable(std::ostream& out) const
{
    out << "\n================ LL(1) PARSING TABLE ================\n";
    out << std::left << std::setw(30) << "Non-terminal"
        << std::setw(16) << "Terminal" << "Production\n";
    out << std::string(92, '-') << "\n";
    for (const auto& row : table) {
        for (const auto& col : row.second) {
            out << std::left << std::setw(30) << row.first
                << std::setw(16) << col.first
                << productionToString(grammar[col.second]) << "\n";
        }
    }
}

void PredictiveParser::printTrace(std::ostream& out) const
{
    out << "\n================ LL(1) STACK TRACE ================\n";
    out << std::left << std::setw(6) << "Step"
        << std::setw(46) << "Stack"
        << std::setw(16) << "Input"
        << "Action\n";
    out << std::string(110, '-') << "\n";
    for (size_t i = 0; i < trace.size(); ++i) {
        std::string stackDisplay = trace[i].stack;
        if (stackDisplay.size() > 44) {
            stackDisplay = "..." + stackDisplay.substr(stackDisplay.size() - 41);
        }
        out << std::left << std::setw(6) << i
            << std::setw(46) << stackDisplay
            << std::setw(16) << trace[i].input
            << trace[i].action << "\n";
    }
}

void PredictiveParser::printErrors(std::ostream& out) const
{
    out << "\n================ ERROR SUMMARY ================\n";
    if (errors.empty()) {
        out << "No LL(1) syntactic errors detected.\n";
        return;
    }
    for (const auto& e : errors) {
        out << "Line " << e.line << ", Column " << e.column
            << ": " << e.message << "\n";
    }
    out << "Total LL(1) parse errors: " << errors.size() << "\n";
}

void PredictiveParser::printStructuredOutput(std::ostream& out) const
{
    out << "\n===STRUCTURED_OUTPUT_START===\n{\n";
    out << "  \"firstSets\": {\n";
    bool first = true;
    for (const auto& p : FIRST) {
        if (!first) out << ",\n";
        out << "    \"" << p.first << "\": [";
        bool firstTerm = true;
        for (const auto& x : p.second) {
            if (!firstTerm) out << ", ";
            out << "\"" << escapeJson(x) << "\"";
            firstTerm = false;
        }
        out << "]";
        first = false;
    }
    out << "\n  },\n  \"followSets\": {\n";
    first = true;
    for (const auto& p : FOLLOW) {
        if (!first) out << ",\n";
        out << "    \"" << p.first << "\": [";
        bool firstTerm = true;
        for (const auto& x : p.second) {
            if (!firstTerm) out << ", ";
            out << "\"" << escapeJson(x) << "\"";
            firstTerm = false;
        }
        out << "]";
        first = false;
    }
    out << "\n  },\n  \"errors\": [\n";
    for (size_t i = 0; i < errors.size(); ++i) {
        out << "    {\"line\": " << errors[i].line
            << ", \"column\": " << errors[i].column
            << ", \"message\": \"" << escapeJson(errors[i].message) << "\"}";
        if (i + 1 < errors.size()) out << ",";
        out << "\n";
    }
    out << "  ]\n}\n===STRUCTURED_OUTPUT_END===\n";
}

void PredictiveParser::printFullOutput(std::ostream& out) const
{
    out << "\n================ LL(1) PREDICTIVE PARSER OUTPUT ================\n";
    out << "Grammar: Dragon Book Pascal subset, left recursion removed and left factored.\n";
    out << "Recovery: panic-mode synchronization from FOLLOW sets, plus phrase-level missing-terminal insertion.\n";
    printFirstSets(out);
    printFollowSets(out);
    printParsingTable(out);
    printTrace(out);
    printErrors(out);
    printStructuredOutput(out);
}
