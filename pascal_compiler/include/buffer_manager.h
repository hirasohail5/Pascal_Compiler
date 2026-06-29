#pragma once
// ============================================================
// buffer_manager.h
// Double-buffered character stream for the Pascal-subset lexer.
// Compatible with MinGW GCC 6.x on Windows (no std::thread).
//
// Dragon Book §3.2 – Input Buffering
// ============================================================

#include <string>
#include <cstring>
#include <cstdio>

static constexpr std::size_t BUFFER_SIZE = 4096;
static constexpr char SENTINEL = '\0';

struct BufferStats {
    std::size_t totalCharsRead      = 0;
    std::size_t totalBufferSwitches = 0;
    double      fillTimeMs          = 0.0;
    double      processTimeMs       = 0.0;
};

class BufferManager {
public:
    explicit BufferManager(const std::string& filename);
    ~BufferManager();

    char        getNextChar();
    void        ungetChar();
    std::string getLexeme() const;
    void        resetLexemeBegin();
    bool        isEOF() const { return eof_; }

    int  getLine()   const { return line_;   }
    int  getColumn() const { return column_; }
    const BufferStats& getStats() const { return stats_; }

private:
    char buf_[2][BUFFER_SIZE + 1];
    int  bufLen_[2];
    int  activeBuf_ = 0;
    int  idleBuf_   = 1;

    int  forward_  = 0;
    int  lexBegin_ = 0;

    int  line_   = 1;
    int  column_ = 0;
    bool eof_    = false;

    FILE*       fp_      = nullptr;
    bool        fileEOF_ = false;

    BufferStats stats_;

    void fillBuffer(int idx);
    void switchBuffers();
};
