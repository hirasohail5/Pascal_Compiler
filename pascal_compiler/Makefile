# ============================================================
# Makefile – Pascal Subset Mini Compiler (Modules 1 & 2)
# ============================================================

CXX      = g++
CXXFLAGS = -std=c++17 -Wall -Wextra -O2 -Iinclude
LDFLAGS  = -lpthread

SRC_DIR  = src
BIN      = pascal_compiler

SRCS = $(SRC_DIR)/main.cpp              \
       $(SRC_DIR)/buffer_manager.cpp     \
       $(SRC_DIR)/lexer.cpp              \
       $(SRC_DIR)/ast.cpp                \
       $(SRC_DIR)/parser.cpp             \
       $(SRC_DIR)/predictive_parser.cpp  \
       $(SRC_DIR)/lr_parser.cpp          \
       $(SRC_DIR)/symbol_table_builder.cpp

OBJS = $(SRCS:.cpp=.o)

# ─────────────────────────────────────────────────────────────
.PHONY: all clean test test_lex test_symbols

all: $(BIN)

$(BIN): $(OBJS)
	$(CXX) $(CXXFLAGS) -o $@ $^ $(LDFLAGS)

$(SRC_DIR)/%.o: $(SRC_DIR)/%.cpp
	$(CXX) $(CXXFLAGS) -c -o $@ $<

# ── Quick test targets ────────────────────────────────────────
test: $(BIN)
	@echo "--- Running full compiler on test/gcd.pas ---"
	./$(BIN) test/gcd.pas

test_lex: $(BIN)
	@echo "--- Lexer-only mode on test/gcd.pas ---"
	./$(BIN) test/gcd.pas --tokens-only

test_symbols: $(BIN)
	@echo "--- Symbol Table on test/gcd.pas ---"
	./$(BIN) test/gcd.pas --symbols

clean:
	rm -f $(OBJS) $(BIN)
