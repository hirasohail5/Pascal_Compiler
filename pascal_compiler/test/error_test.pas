{ Program with intentional syntax errors for error testing }
program badprog(input, output);
var x : integer;
begin
    x := ;          { error: missing expression }
    if x > 0        { error: missing then }
        write(x)
    while x < 10 do { error: missing begin/end around body }
        x := x + 1
end.
