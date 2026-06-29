{ Bubble sort using arrays and while loop }
program bubble(input, output);
var
    data : array [1..10] of integer;
    i, j, temp, n : integer;
begin
    n := 10;
    i := 1;
    while i <= n do
    begin
        read(data[i]);
        i := i + 1
    end;
    i := 1;
    while i <= n - 1 do
    begin
        j := 1;
        while j <= n - i do
        begin
            if data[j] > data[j + 1] then
            begin
                temp := data[j];
                data[j] := data[j + 1];
                data[j + 1] := temp
            end;
            j := j + 1
        end;
        i := i + 1
    end;
    i := 1;
    while i <= n do
    begin
        write(data[i]);
        i := i + 1
    end
end.
