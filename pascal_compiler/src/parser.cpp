// ============================================================
// parser.cpp  –  Recursive Descent Parser (Dragon Book §2.4, §4.3)
//
// Grammar (left-recursion removed / left-factored):
//
//  program → program id ( identifier_list ) ; declarations
//             subprogram_declarations compound_statement .
//
//  identifier_list → id { , id }
//
//  declarations → { var identifier_list : type ; }
//
//  type → standard_type
//       | array [ num .. num ] of standard_type
//
//  standard_type → integer | real
//
//  subprogram_declarations → { subprogram_declaration ; }
//
//  subprogram_declaration → subprogram_head declarations compound_statement
//
//  subprogram_head → function  id arguments : standard_type ;
//                  | procedure id arguments ;
//
//  arguments → ( parameter_list ) | ε
//
//  parameter_list → identifier_list : type { ; identifier_list : type }
//
//  compound_statement → begin optional_statements end
//
//  optional_statements → statement_list | ε
//
//  statement_list → statement { ; statement }
//
//  statement → variable assignop expression
//            | procedure_statement
//            | compound_statement
//            | if expression then statement [ else statement ]
//            | while expression do statement
//            | ε
//
//  variable → id [ [ expression ] ]
//
//  procedure_statement → id [ ( expression_list ) ]
//
//  expression_list → expression { , expression }
//
//  expression → simple_expression [ relop simple_expression ]
//
//  simple_expression → [ sign ] term { addop term }
//
//  term → factor { mulop factor }
//
//  factor → id [ ( expression_list ) ]
//          | id [ [ expression ] ]
//          | num
//          | ( expression )
//          | not factor
// ============================================================

#include "parser.h"
#include <sstream>
#include <iostream>

// ─────────────────────────────────────────────────────────────
// Constructor
// ─────────────────────────────────────────────────────────────
Parser::Parser(Lexer& lexer) : lexer_(lexer)
{
    advance();   // prime the look-ahead
}

// ─────────────────────────────────────────────────────────────
// Token management helpers
// ─────────────────────────────────────────────────────────────
void Parser::advance()
{
    current_ = lexer_.nextToken();
}

bool Parser::check(TokenType t) const
{
    return current_.type == t;
}

bool Parser::checkLexeme(const std::string& lex) const
{
    std::string lower = current_.lexeme;
    for (char& c : lower) c = (char)std::tolower((unsigned char)c);
    return lower == lex;
}

Token Parser::consume(TokenType expected, const std::string& what)
{
    if (current_.type == expected) {
        Token t = current_;
        advance();
        return t;
    }
    std::ostringstream oss;
    oss << "Expected " << what
        << " but found '" << current_.lexeme << "'"
        << " at line " << current_.line
        << ", col "    << current_.column;
    syncError(oss.str());
    return current_;   // return current to allow recovery
}

void Parser::syncError(const std::string& msg)
{
    errors_.push_back({msg, current_.line, current_.column});
}

// ─────────────────────────────────────────────────────────────
// Entry point
// ─────────────────────────────────────────────────────────────
ASTNodePtr Parser::parse()
{
    ASTNodePtr root = parseProgram();
    if (!check(TokenType::END_OF_FILE)) {
        syncError("Unexpected tokens after program end");
    }
    return root;
}

// ─────────────────────────────────────────────────────────────
// program → program id ( identifier_list ) ;
//            declarations subprogram_declarations compound_statement .
// ─────────────────────────────────────────────────────────────
ASTNodePtr Parser::parseProgram()
{
    int ln = current_.line;
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

// ─────────────────────────────────────────────────────────────
// identifier_list → id { , id }
// ─────────────────────────────────────────────────────────────
ASTNodePtr Parser::parseIdentifierList()
{
    int ln = current_.line;
    auto node = std::make_unique<ASTNode>(NodeKind::IDENTIFIER_LIST, "", ln);

    Token id = consume(TokenType::ID, "identifier");
    node->addChild(std::make_unique<ASTNode>(NodeKind::VARIABLE, id.lexeme, id.line));

    while (check(TokenType::COMMA)) {
        advance();
        Token next = consume(TokenType::ID, "identifier");
        node->addChild(std::make_unique<ASTNode>(NodeKind::VARIABLE, next.lexeme, next.line));
    }
    return node;
}

// ─────────────────────────────────────────────────────────────
// declarations → { var identifier_list : type ; }
// ─────────────────────────────────────────────────────────────
ASTNodePtr Parser::parseDeclarations()
{
    int ln = current_.line;
    auto node = std::make_unique<ASTNode>(NodeKind::DECLARATIONS, "", ln);

    while (check(TokenType::KW_VAR)) {
        advance();   // consume 'var'

        // One var block can have multiple  identifier_list : type ;  lines
        // until the next keyword that is not an identifier
        while (check(TokenType::ID)) {
            int declLine = current_.line;
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

// ─────────────────────────────────────────────────────────────
// type → standard_type | array [ num .. num ] of standard_type
// ─────────────────────────────────────────────────────────────
ASTNodePtr Parser::parseType()
{
    if (check(TokenType::KW_ARRAY)) {
        int ln = current_.line;
        advance();   // consume 'array'
        consume(TokenType::LBRACKET, "'['");

        Token low = consume(TokenType::NUM, "number");
        consume(TokenType::DOTDOT, "'..'");
        Token high = consume(TokenType::NUM, "number");

        consume(TokenType::RBRACKET, "']'");
        consume(TokenType::KW_OF, "'of'");

        auto typeNode = parseStandardType();
        auto arr = std::make_unique<ASTNode>(NodeKind::ARRAY_TYPE,
            low.lexeme + ".." + high.lexeme, ln);
        arr->addChild(std::move(typeNode));
        return arr;
    }
    return parseStandardType();
}

// ─────────────────────────────────────────────────────────────
// standard_type → integer | real
// ─────────────────────────────────────────────────────────────
ASTNodePtr Parser::parseStandardType()
{
    int ln = current_.line;
    if (check(TokenType::KW_INTEGER)) {
        advance();
        return std::make_unique<ASTNode>(NodeKind::STANDARD_TYPE, "integer", ln);
    }
    if (check(TokenType::KW_REAL)) {
        advance();
        return std::make_unique<ASTNode>(NodeKind::STANDARD_TYPE, "real", ln);
    }
    syncError("Expected 'integer' or 'real' type");
    return std::make_unique<ASTNode>(NodeKind::EMPTY, "", ln);
}

// ─────────────────────────────────────────────────────────────
// subprogram_declarations → { subprogram_declaration ; }
// ─────────────────────────────────────────────────────────────
ASTNodePtr Parser::parseSubprogramDeclarations()
{
    int ln = current_.line;
    auto node = std::make_unique<ASTNode>(NodeKind::SUBPROGRAM_DECLS, "", ln);

    while (check(TokenType::KW_FUNCTION) || check(TokenType::KW_PROCEDURE)) {
        node->addChild(parseSubprogramDeclaration());
        consume(TokenType::SEMICOLON, "';'");
    }
    return node;
}

// ─────────────────────────────────────────────────────────────
// subprogram_declaration → subprogram_head declarations compound_statement
// ─────────────────────────────────────────────────────────────
ASTNodePtr Parser::parseSubprogramDeclaration()
{
    int ln = current_.line;
    auto node = std::make_unique<ASTNode>(NodeKind::SUBPROGRAM_DECL, "", ln);
    node->addChild(parseSubprogramHead());
    node->addChild(parseDeclarations());
    node->addChild(parseCompoundStatement());
    return node;
}

// ─────────────────────────────────────────────────────────────
// subprogram_head → function  id arguments : standard_type ;
//                 | procedure id arguments ;
// ─────────────────────────────────────────────────────────────
ASTNodePtr Parser::parseSubprogramHead()
{
    int ln = current_.line;
    std::string kind;

    if (check(TokenType::KW_FUNCTION)) {
        kind = "function";
        advance();
    } else {
        kind = "procedure";
        consume(TokenType::KW_PROCEDURE, "'procedure'");
    }

    Token name = consume(TokenType::ID, "subprogram name");
    auto node = std::make_unique<ASTNode>(NodeKind::SUBPROGRAM_HEAD,
        kind + " " + name.lexeme, ln);

    node->addChild(parseArguments());

    if (kind == "function") {
        consume(TokenType::COLON, "':'");
        node->addChild(parseStandardType());
    }
    consume(TokenType::SEMICOLON, "';'");
    return node;
}

// ─────────────────────────────────────────────────────────────
// arguments → ( parameter_list ) | ε
// ─────────────────────────────────────────────────────────────
ASTNodePtr Parser::parseArguments()
{
    int ln = current_.line;
    auto node = std::make_unique<ASTNode>(NodeKind::ARGUMENTS, "", ln);

    if (check(TokenType::LPAREN)) {
        advance();
        node->addChild(parseParameterList());
        consume(TokenType::RPAREN, "')'");
    }
    return node;
}

// ─────────────────────────────────────────────────────────────
// parameter_list → identifier_list : type { ; identifier_list : type }
// ─────────────────────────────────────────────────────────────
ASTNodePtr Parser::parseParameterList()
{
    int ln = current_.line;
    auto node = std::make_unique<ASTNode>(NodeKind::PARAMETER_LIST, "", ln);

    auto param = std::make_unique<ASTNode>(NodeKind::VAR_DECL, "", ln);
    param->addChild(parseIdentifierList());
    consume(TokenType::COLON, "':'");
    param->addChild(parseType());
    node->addChild(std::move(param));

    while (check(TokenType::SEMICOLON)) {
        advance();
        int pln = current_.line;
        auto p2 = std::make_unique<ASTNode>(NodeKind::VAR_DECL, "", pln);
        p2->addChild(parseIdentifierList());
        consume(TokenType::COLON, "':'");
        p2->addChild(parseType());
        node->addChild(std::move(p2));
    }
    return node;
}

// ─────────────────────────────────────────────────────────────
// compound_statement → begin optional_statements end
// ─────────────────────────────────────────────────────────────
ASTNodePtr Parser::parseCompoundStatement()
{
    int ln = current_.line;
    consume(TokenType::KW_BEGIN, "'begin'");
    auto node = std::make_unique<ASTNode>(NodeKind::COMPOUND_STMT, "", ln);
    node->addChild(parseOptionalStatements());
    consume(TokenType::KW_END, "'end'");
    return node;
}

// ─────────────────────────────────────────────────────────────
// optional_statements → statement_list | ε
// ─────────────────────────────────────────────────────────────
ASTNodePtr Parser::parseOptionalStatements()
{
    // FIRST(statement_list) = FIRST(statement) = { id, begin, if, while }
    // statement can also be ε but  end  follows optional_statements
    if (check(TokenType::KW_END))
        return std::make_unique<ASTNode>(NodeKind::EMPTY);
    return parseStatementList();
}

// ─────────────────────────────────────────────────────────────
// statement_list → statement { ; statement }
// ─────────────────────────────────────────────────────────────
ASTNodePtr Parser::parseStatementList()
{
    int ln = current_.line;
    auto node = std::make_unique<ASTNode>(NodeKind::STATEMENT_LIST, "", ln);
    node->addChild(parseStatement());

    while (check(TokenType::SEMICOLON)) {
        advance();
        // After the last statement there may be  end  immediately
        if (check(TokenType::KW_END)) break;
        node->addChild(parseStatement());
    }
    return node;
}

// ─────────────────────────────────────────────────────────────
// statement → variable assignop expression
//           | procedure_statement
//           | compound_statement
//           | if expression then statement [ else statement ]
//           | while expression do statement
//           | ε
//
// Disambiguation: when we see  id  we read it and then decide:
//   if next is  :=  or  [   → assignment
//   else                    → procedure call
// ─────────────────────────────────────────────────────────────
ASTNodePtr Parser::parseStatement()
{
    int ln = current_.line;

    if (check(TokenType::KW_BEGIN))
        return parseCompoundStatement();

    if (check(TokenType::KW_IF)) {
        advance();
        auto node = std::make_unique<ASTNode>(NodeKind::IF_STMT, "", ln);
        node->addChild(parseExpression());
        consume(TokenType::KW_THEN, "'then'");
        node->addChild(parseStatement());
        if (check(TokenType::KW_ELSE)) {
            advance();
            node->addChild(parseStatement());
        }
        return node;
    }

    if (check(TokenType::KW_WHILE)) {
        advance();
        auto node = std::make_unique<ASTNode>(NodeKind::WHILE_STMT, "", ln);
        node->addChild(parseExpression());
        consume(TokenType::KW_DO, "'do'");
        node->addChild(parseStatement());
        return node;
    }

    if (check(TokenType::ID)) {
        Token id = current_;
        advance();

        // Assignment:  variable := expression
        if (check(TokenType::ASSIGNOP) || check(TokenType::LBRACKET)) {
            // variable → id  |  id [ expression ]
            auto varNode = std::make_unique<ASTNode>(NodeKind::VARIABLE, id.lexeme, id.line);
            if (check(TokenType::LBRACKET)) {
                advance();
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

        // Procedure call:  id  |  id ( expression_list )
        auto call = std::make_unique<ASTNode>(NodeKind::PROCEDURE_CALL, id.lexeme, id.line);
        if (check(TokenType::LPAREN)) {
            advance();
            call->addChild(parseExpressionList());
            consume(TokenType::RPAREN, "')'");
        }
        return call;
    }

    // ε  – empty statement
    return std::make_unique<ASTNode>(NodeKind::EMPTY, "", ln);
}

// ─────────────────────────────────────────────────────────────
// expression_list → expression { , expression }
// ─────────────────────────────────────────────────────────────
ASTNodePtr Parser::parseExpressionList()
{
    int ln = current_.line;
    auto node = std::make_unique<ASTNode>(NodeKind::STATEMENT_LIST, "", ln);
    node->addChild(parseExpression());
    while (check(TokenType::COMMA)) {
        advance();
        node->addChild(parseExpression());
    }
    return node;
}

// ─────────────────────────────────────────────────────────────
// expression → simple_expression [ relop simple_expression ]
// ─────────────────────────────────────────────────────────────
ASTNodePtr Parser::parseExpression()
{
    auto left = parseSimpleExpression();

    if (check(TokenType::RELOP)) {
        Token op = current_;
        advance();
        auto right = parseSimpleExpression();
        auto node = std::make_unique<ASTNode>(NodeKind::BINARY_EXPR, op.lexeme, op.line);
        node->addChild(std::move(left));
        node->addChild(std::move(right));
        return node;
    }
    return left;
}

// ─────────────────────────────────────────────────────────────
// simple_expression → [ sign ] term { addop term }
//
// Left-recursion eliminated: simple_expression' → addop term simple_expression'
// ─────────────────────────────────────────────────────────────
ASTNodePtr Parser::parseSimpleExpression()
{
    // Optional leading sign
    std::unique_ptr<ASTNode> signNode;
    if (check(TokenType::ADDOP) &&
        (current_.lexeme == "+" || current_.lexeme == "-")) {
        Token sign = current_;
        advance();
        signNode = std::make_unique<ASTNode>(NodeKind::UNARY_EXPR, sign.lexeme, sign.line);
    }

    auto left = parseTerm();

    if (signNode) {
        signNode->addChild(std::move(left));
        left = std::move(signNode);
    }

    // { addop term }
    while (check(TokenType::ADDOP)) {
        Token op = current_;
        advance();
        auto right = parseTerm();
        auto bin = std::make_unique<ASTNode>(NodeKind::BINARY_EXPR, op.lexeme, op.line);
        bin->addChild(std::move(left));
        bin->addChild(std::move(right));
        left = std::move(bin);
    }
    return left;
}

// ─────────────────────────────────────────────────────────────
// term → factor { mulop factor }
// ─────────────────────────────────────────────────────────────
ASTNodePtr Parser::parseTerm()
{
    auto left = parseFactor();

    while (check(TokenType::MULOP)) {
        Token op = current_;
        advance();
        auto right = parseFactor();
        auto bin = std::make_unique<ASTNode>(NodeKind::BINARY_EXPR, op.lexeme, op.line);
        bin->addChild(std::move(left));
        bin->addChild(std::move(right));
        left = std::move(bin);
    }
    return left;
}

// ─────────────────────────────────────────────────────────────
// factor → id
//         | id ( expression_list )
//         | id [ expression ]
//         | num
//         | ( expression )
//         | not factor
// ─────────────────────────────────────────────────────────────
ASTNodePtr Parser::parseFactor()
{
    int ln = current_.line;

    if (check(TokenType::ID)) {
        Token id = current_;
        advance();

        if (check(TokenType::LPAREN)) {
            // Function call
            advance();
            auto call = std::make_unique<ASTNode>(NodeKind::FUNC_CALL, id.lexeme, id.line);
            if (!check(TokenType::RPAREN))
                call->addChild(parseExpressionList());
            consume(TokenType::RPAREN, "')'");
            return call;
        }
        if (check(TokenType::LBRACKET)) {
            // Array access
            advance();
            auto arr = std::make_unique<ASTNode>(NodeKind::ARRAY_ACCESS, id.lexeme, id.line);
            arr->addChild(parseExpression());
            consume(TokenType::RBRACKET, "']'");
            return arr;
        }
        // Simple variable
        return std::make_unique<ASTNode>(NodeKind::VARIABLE, id.lexeme, id.line);
    }

    if (check(TokenType::NUM)) {
        Token num = current_;
        advance();
        return std::make_unique<ASTNode>(NodeKind::NUMBER_LITERAL, num.lexeme, num.line);
    }

    if (check(TokenType::LPAREN)) {
        advance();
        auto expr = parseExpression();
        consume(TokenType::RPAREN, "')'");
        return expr;
    }

    if (check(TokenType::KW_NOT)) {
        Token notTok = current_;
        advance();
        auto node = std::make_unique<ASTNode>(NodeKind::UNARY_EXPR, "not", notTok.line);
        node->addChild(parseFactor());
        return node;
    }

    syncError("Expected factor (id, number, '(' or 'not')");
    return std::make_unique<ASTNode>(NodeKind::EMPTY, "", ln);
}
