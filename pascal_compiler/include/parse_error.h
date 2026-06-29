#pragma once

#include <string>

struct ParseError {
    std::string message;
    int line;
    int column;
};
