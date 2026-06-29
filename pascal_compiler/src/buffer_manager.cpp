// ============================================================
// buffer_manager.cpp
// Double buffering without threading – works on MinGW GCC 6.x
// ============================================================

#include "buffer_manager.h"
#include <stdexcept>

BufferManager::BufferManager(const std::string& filename)
{
    fp_ = fopen(filename.c_str(), "rb");
    if (!fp_)
        throw std::runtime_error("Cannot open file: " + filename);

    fillBuffer(activeBuf_);
    if (bufLen_[activeBuf_] == 0) { eof_ = true; return; }

    // Pre-fill idle buffer so the first switch is instant
    fillBuffer(idleBuf_);
}

BufferManager::~BufferManager()
{
    if (fp_) fclose(fp_);
}

void BufferManager::fillBuffer(int idx)
{
    if (fileEOF_) { bufLen_[idx] = 0; buf_[idx][0] = SENTINEL; return; }

    bufLen_[idx] = (int)fread(buf_[idx], 1, BUFFER_SIZE, fp_);
    buf_[idx][bufLen_[idx]] = SENTINEL;

    if (bufLen_[idx] < (int)BUFFER_SIZE) fileEOF_ = true;
}

void BufferManager::switchBuffers()
{
    if (bufLen_[idleBuf_] == 0) { eof_ = true; return; }

    int tmp    = activeBuf_;
    activeBuf_ = idleBuf_;
    idleBuf_   = tmp;

    stats_.totalBufferSwitches++;
    forward_  = 0;
    lexBegin_ = 0;

    // Synchronously refill the new idle buffer
    fillBuffer(idleBuf_);
}

char BufferManager::getNextChar()
{
    if (eof_) return (char)EOF;

    char c = buf_[activeBuf_][forward_];
    if (c == SENTINEL) {
        switchBuffers();
        if (eof_) return (char)EOF;
        c = buf_[activeBuf_][forward_];
    }

    forward_++;
    stats_.totalCharsRead++;

    if (c == '\n') { line_++; column_ = 0; }
    else            { column_++; }

    return c;
}

void BufferManager::ungetChar()
{
    if (forward_ > 0) {
        forward_--;
        stats_.totalCharsRead--;
        if (column_ > 0) column_--;
    }
}

std::string BufferManager::getLexeme() const
{
    if (lexBegin_ <= forward_)
        return std::string(buf_[activeBuf_] + lexBegin_,
                           buf_[activeBuf_] + forward_);
    return "";
}

void BufferManager::resetLexemeBegin()
{
    lexBegin_ = forward_;
}
