// ast.cpp
#include "ast.h"
#include <iostream>

static void printASTHelper(const ASTNode* node, int depth,
                            const std::string& prefix, bool isLast)
{
    if (!node) return;

    std::cout << prefix;
    if (depth > 0)
        std::cout << (isLast ? "\\-- " : "|-- ");

    std::cout << nodeKindName(node->kind);
    if (!node->value.empty()) std::cout << " [" << node->value << "]";
    if (node->line > 0)       std::cout << "  (line " << node->line << ")";
    std::cout << "\n";

    std::string childPrefix = prefix
        + (depth > 0 ? (isLast ? "    " : "|   ") : "");

    for (std::size_t i = 0; i < node->children.size(); i++) {
        bool last = (i == node->children.size() - 1);
        printASTHelper(node->children[i].get(), depth + 1, childPrefix, last);
    }
}

void printAST(const ASTNode* node, int depth)
{
    (void)depth;
    printASTHelper(node, 0, "", true);
}
