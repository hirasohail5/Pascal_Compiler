// ============================================================
// server/index.js  –  Express API wrapping pascal_compiler CLI
// ============================================================

const express  = require('express');
const multer   = require('multer');
const cors     = require('cors');
const { execFile } = require('child_process');
const path     = require('path');
const fs       = require('fs');
const os       = require('os');

const app  = express();
const PORT = process.env.PORT || 3001;

// Resolve path to the compiled binary (one level up from server/)
// On Windows, we need .exe extension
const binaryName = process.platform === 'win32' ? 'pascal_compiler.exe' : 'pascal_compiler';
const COMPILER_BIN = path.join(__dirname, '..', binaryName);

console.log('Looking for compiler at:', COMPILER_BIN);
console.log('Binary exists:', fs.existsSync(COMPILER_BIN));

app.use(cors());
app.use(express.json());

// Multer: store uploads in OS temp dir
const upload = multer({
  dest: os.tmpdir(),
  fileFilter: (_req, file, cb) => {
    if (file.originalname.endsWith('.pas')) cb(null, true);
    else cb(new Error('Only .pas files are accepted'));
  },
  limits: { fileSize: 1 * 1024 * 1024 } // 1 MB
});

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/** Run the compiler binary and return parsed JSON results */
function runCompiler(filePath, args = []) {
  return new Promise((resolve) => {
    console.log('Running compiler:', COMPILER_BIN, 'with args:', [filePath, ...args]);
    // Add MSYS2 DLL path so the compiled .exe works on Windows
    const env = Object.assign({}, process.env, {
      PATH: 'C:\\msys64\\mingw64\\bin;' + (process.env.PATH || '')
    });
    execFile(COMPILER_BIN, [filePath, ...args], { timeout: 15000, env }, (err, stdout, stderr) => {
      if (err) {
        console.error('Compiler error:', err.message);
        console.error('stderr:', stderr);
      }
      resolve({ stdout: stdout || '', stderr: stderr || '', exitCode: err ? err.code || 1 : 0 });
    });
  });
}

/** Parse token stream section from compiler stdout */
function parseTokens(stdout) {
  const tokens = [];
  const lines  = stdout.split('\n');
  let inTable  = false;

  for (const line of lines) {
    if (line.includes('TOKEN STREAM'))  { inTable = true;  continue; }
    if (inTable && line.startsWith('Line')) continue; // header
    if (inTable && line.startsWith('---')) continue;  // separator
    if (inTable && line.startsWith('Total tokens')) { inTable = false; continue; }
    if (inTable && line.trim() === '') continue;

    if (inTable) {
      // Format: Line  Col   Type  Lexeme  Attribute
      const parts = line.trim().split(/\s{2,}/);
      if (parts.length >= 4) {
        tokens.push({
          line:      parseInt(parts[0]) || 0,
          column:    parseInt(parts[1]) || 0,
          type:      parts[2] || '',
          lexeme:    parts[3] || '',
          attribute: parts[4] || '-'
        });
      }
    }
  }
  return tokens;
}

/** Parse AST section from compiler stdout */
function parseAST(stdout) {
  const lines    = stdout.split('\n');
  const astLines = [];
  let inAST      = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect the AST heading line
    if (line.includes('ABSTRACT SYNTAX TREE')) {
      // Skip the next === separator line right after the heading
      if (i + 1 < lines.length && lines[i + 1].startsWith('=')) i++;
      inAST = true;
      continue;
    }

    if (!inAST) continue;

    // Stop when we hit the next === section separator (SUMMARY, SYMBOL TABLE, etc.)
    if (line.startsWith('==') && line.trim().endsWith('==')) {
      inAST = false;
      continue;
    }

    astLines.push(line);
  }
  return astLines.join('\n').trim();
}

/** Parse buffer stats section */
function parseBufferStats(stdout) {
  const stats = {};
  const rx = /Buffer size\s*:\s*(\d+)|Total chars read\s*:\s*(\d+)|Buffer switches\s*:\s*(\d+)|fill time\s*:\s*([\d.]+)|lexing time\s*:\s*([\d.]+)/g;
  let m;
  while ((m = rx.exec(stdout)) !== null) {
    if (m[1]) stats.bufferSize       = parseInt(m[1]);
    if (m[2]) stats.totalCharsRead   = parseInt(m[2]);
    if (m[3]) stats.bufferSwitches   = parseInt(m[3]);
    if (m[4]) stats.fillTimeMs       = parseFloat(m[4]);
    if (m[5]) stats.lexingTimeMs     = parseFloat(m[5]);
  }
  return stats;
}

/** Parse summary section */
function parseSummary(stdout) {
  const lexMs    = stdout.match(/Lexing time\s*:\s*([\d.]+)/)?.[1];
  const parseMs  = stdout.match(/Parsing time\s*:\s*([\d.]+)/)?.[1];
  const lexErr   = stdout.match(/Lex errors\s*:\s*(\d+)/)?.[1];
  const parseErr = stdout.match(/Parse errors\s*:\s*(\d+)/)?.[1];
  const success  = stdout.includes('SUCCESS');
  return {
    lexingTimeMs:  lexMs   ? parseFloat(lexMs)   : null,
    parsingTimeMs: parseMs ? parseFloat(parseMs) : null,
    lexErrors:     lexErr   ? parseInt(lexErr)   : 0,
    parseErrors:   parseErr ? parseInt(parseErr) : 0,
    success
  };
}

/** Extract error lines from output */
function parseErrors(stdout) {
  const errors = [];
  const lines  = stdout.split('\n');
  for (const line of lines) {
    const m = line.match(/Line (\d+), Col (\d+):\s*(.+)/);
    if (m) errors.push({ line: parseInt(m[1]), column: parseInt(m[2]), message: m[3].trim() });
  }
  return errors;
}

// ============================================================
// LL(1) SPECIFIC PARSERS
// ============================================================

/** Parse FIRST sets from LL(1) output */
function parseFirstSets(stdout) {
  const firstSets = {};
  const lines = stdout.split('\n');
  for (const line of lines) {
    const match = line.match(/FIRST\(([^)]+)\)\s*=\s*\{\s*([^}]+)\s*\}/);
    if (match) {
      const values = match[2].split(',').map(s => s.trim());
      firstSets[match[1]] = values;
    }
  }
  return firstSets;
}

/** Parse FOLLOW sets from LL(1) output */
function parseFollowSets(stdout) {
  const followSets = {};
  const lines = stdout.split('\n');
  for (const line of lines) {
    const match = line.match(/FOLLOW\(([^)]+)\)\s*=\s*\{\s*([^}]+)\s*\}/);
    if (match) {
      const values = match[2].split(',').map(s => s.trim());
      followSets[match[1]] = values;
    }
  }
  return followSets;
}

/** Parse grammar from LL(1) output */
function parseGrammar(stdout) {
  const grammar = [];
  const lines = stdout.split('\n');
  let inGrammar = false;
  for (const line of lines) {
    if (line.includes('GRAMMAR PRODUCTIONS')) {
      inGrammar = true;
      continue;
    }
    if (inGrammar && (line.includes('FIRST SETS') || line.includes('==='))) {
      inGrammar = false;
      continue;
    }
    if (inGrammar && line.trim()) {
      const match = line.match(/^\s*(\d+):\s*([^\s]+)\s*->\s*(.+)$/);
      if (match) {
        grammar.push({
          index: parseInt(match[1]),
          lhs: match[2],
          rhs: match[3].trim()
        });
      }
    }
  }
  return grammar;
}

/** Parse LL(1) stack trace */
function parseLL1Trace(stdout) {
  const trace = [];
  const lines = stdout.split('\n');
  let inTrace = false;
  for (const line of lines) {
    if (line.includes('STACK TRACE')) {
      inTrace = true;
      continue;
    }
    if (inTrace && line.includes('===')) break;
    if (!inTrace) continue;
    if (line.includes('Step') || line.includes('Stack') || line.includes('---')) continue;
    if (line.trim() === '') continue;

    const parts = line.trim().split(/\s{2,}/);
    if (parts.length >= 4) {
      trace.push({
        step: parseInt(parts[0]) || 0,
        stack: parts[1] || '',
        input: parts[2] || '',
        action: parts[3] || ''
      });
    }
  }
  return trace;
}

/** Parse LL(1) parsing table entries */
function parseParsingTableEntries(stdout) {
  const entries = [];
  const lines = stdout.split('\n');
  let inTable = false;
  for (const line of lines) {
    if (line.includes('PARSING TABLE')) {
      inTable = true;
      continue;
    }
    if (inTable && line.includes('===')) break;
    if (!inTable) continue;
    if (line.includes('Non-terminal') || line.includes('---')) continue;
    if (line.trim() === '') continue;

    const parts = line.trim().split(/\s{2,}/);
    if (parts.length >= 3) {
      entries.push({
        nonTerminal: parts[0],
        terminal: parts[1],
        production: parts[2]
      });
    }
  }
  return entries;
}

// ============================================================
// LR SPECIFIC PARSERS
// ============================================================

/** Parse LR ACTION table */
function parseLRActionTable(stdout) {
  const actionTable = {};
  const lines = stdout.split('\n');
  let inAction = false;
  let headers = [];
  
  for (const line of lines) {
    if (line.includes('ACTION TABLE')) {
      inAction = true;
      headers = [];
      continue;
    }
    if (inAction && line.includes('GOTO TABLE')) break;
    if (!inAction) continue;
    
    if (line.includes('State') && headers.length === 0) {
      const parts = line.trim().split(/\s+/);
      headers = parts.filter(p => p && p !== '');
      continue;
    }
    
    if (line.includes('-')) continue;
    
    const parts = line.trim().split(/\s+/);
    if (parts.length >= 2 && !isNaN(parseInt(parts[0]))) {
      const state = parseInt(parts[0]);
      actionTable[state] = {};
      for (let j = 1; j < parts.length && j < headers.length; j++) {
        if (parts[j] && parts[j] !== '') {
          actionTable[state][headers[j]] = parts[j];
        }
      }
    }
  }
  return actionTable;
}

/** Parse LR GOTO table */
function parseLRGotoTable(stdout) {
  const gotoTable = {};
  const lines = stdout.split('\n');
  let inGoto = false;
  let headers = [];
  
  for (const line of lines) {
    if (line.includes('GOTO TABLE')) {
      inGoto = true;
      headers = [];
      continue;
    }
    if (inGoto && line.includes('LR SHIFT-REDUCE')) break;
    if (!inGoto) continue;
    
    if (line.includes('State') && headers.length === 0) {
      const parts = line.trim().split(/\s+/);
      headers = parts.filter(p => p && p !== '');
      continue;
    }
    
    if (line.includes('-')) continue;
    
    const parts = line.trim().split(/\s+/);
    if (parts.length >= 2 && !isNaN(parseInt(parts[0]))) {
      const state = parseInt(parts[0]);
      gotoTable[state] = {};
      for (let j = 1; j < parts.length && j < headers.length; j++) {
        if (parts[j] && parts[j] !== '' && !isNaN(parseInt(parts[j]))) {
          gotoTable[state][headers[j]] = parseInt(parts[j]);
        }
      }
    }
  }
  return gotoTable;
}

/** Parse LR stack trace */
function parseLRStackTrace(stdout) {
  const trace = [];
  const lines = stdout.split('\n');
  let inTrace = false;
  
  for (const line of lines) {
    if (line.includes('SHIFT-REDUCE TRACE')) {
      inTrace = true;
      continue;
    }
    if (inTrace && line.includes('===') && trace.length > 0) break;
    if (!inTrace) continue;
    if (line.includes('State stack') || line.includes('#')) continue;
    if (line.trim() === '' || line.includes('---')) continue;
    
    const parts = line.trim().split(/\s{2,}/);
    if (parts.length >= 5) {
      trace.push({
        step: parseInt(parts[0]) || 0,
        stateStack: parts[1] || '',
        symbolStack: parts[2] || '',
        remainingInput: parts[3] || '',
        action: parts[4] || ''
      });
    }
  }
  return trace;
}

// ─────────────────────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────────────────────

// Health check
app.get('/api/health', (_req, res) => {
  const binExists = fs.existsSync(COMPILER_BIN);
  res.json({
    status: 'ok',
    compiler: binExists ? 'ready' : 'binary not found',
    binaryPath: COMPILER_BIN,
    timestamp: new Date().toISOString()
  });
});

// ── POST /api/compile  – full pipeline (Recursive Descent) ──
app.post('/api/compile', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const filePath = req.file.path;

  try {
    const { stdout, stderr, exitCode } = await runCompiler(filePath);
    const tokens      = parseTokens(stdout);
    const ast         = parseAST(stdout);
    const summary     = parseSummary(stdout);
    const errors      = parseErrors(stdout);
    const bufferStats = parseBufferStats(stdout);

    res.json({
      filename:   req.file.originalname,
      success:    summary.success,
      exitCode,
      summary,
      tokens,
      ast,
      bufferStats,
      errors,
      rawOutput:  stdout,
      stderr
    });
  } finally {
    fs.unlink(filePath, () => {});
  }
});

// ── POST /api/lex  – lexer only ─────────────────────────────
app.post('/api/lex', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const filePath = req.file.path;

  try {
    const { stdout, stderr, exitCode } = await runCompiler(filePath, ['--tokens-only']);
    const tokens      = parseTokens(stdout);
    const bufferStats = parseBufferStats(stdout);
    const errors      = parseErrors(stdout);

    res.json({
      filename:   req.file.originalname,
      success:    exitCode === 0,
      exitCode,
      tokens,
      bufferStats,
      errors,
      rawOutput:  stdout,
      stderr
    });
  } finally {
    fs.unlink(filePath, () => {});
  }
});

// ── POST /api/parse  – Recursive Descent parser ─────────────
app.post('/api/parse', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const filePath = req.file.path;

  try {
    const { stdout, stderr, exitCode } = await runCompiler(filePath);
    const ast     = parseAST(stdout);
    const summary = parseSummary(stdout);
    const errors  = parseErrors(stdout);

    res.json({
      filename:   req.file.originalname,
      success:    exitCode === 0,
      exitCode,
      ast,
      summary,
      errors,
      rawOutput:  stdout,
      stderr
    });
  } finally {
    fs.unlink(filePath, () => {});
  }
});

// ── POST /api/ll1-parse  – LL(1) Predictive Parser ──────────
app.post('/api/ll1-parse', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const filePath = req.file.path;

  try {
    const { stdout, stderr, exitCode } = await runCompiler(filePath, ['--ll1']);
    
    const tokens = parseTokens(stdout);
    const ast = parseAST(stdout);
    const summary = parseSummary(stdout);
    const bufferStats = parseBufferStats(stdout);
    const errors = parseErrors(stdout);
    const firstSets = parseFirstSets(stdout);
    const followSets = parseFollowSets(stdout);
    const grammar = parseGrammar(stdout);
    const parseTrace = parseLL1Trace(stdout);
    const parsingTableEntries = parseParsingTableEntries(stdout);

    const success = errors.length === 0 && exitCode === 0;

    res.json({
      filename: req.file.originalname,
      success,
      exitCode,
      tokens,
      ast,
      summary,
      bufferStats,
      firstSets,
      followSets,
      grammar,
      parseTrace,
      parsingTableEntries,
      errors,
      rawOutput: stdout,
      stderr
    });
  } finally {
    fs.unlink(filePath, () => {});
  }
});

// ── POST /api/lr-parse  – LALR(1) Parser ────────────────────
app.post('/api/lr-parse', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const filePath = req.file.path;

  try {
    const { stdout, stderr, exitCode } = await runCompiler(filePath, ['--lr']);
    
    const tokens = parseTokens(stdout);
    const ast = parseAST(stdout);
    const summary = parseSummary(stdout);
    const bufferStats = parseBufferStats(stdout);
    const errors = parseErrors(stdout);
    const firstSets = parseFirstSets(stdout);
    const followSets = parseFollowSets(stdout);
    const grammar = parseGrammar(stdout);
    const actionTable = parseLRActionTable(stdout);
    const gotoTable = parseLRGotoTable(stdout);
    const stackTrace = parseLRStackTrace(stdout);

    const success = errors.length === 0 && exitCode === 0;

    res.json({
      filename: req.file.originalname,
      success,
      exitCode,
      tokens,
      ast,
      summary,
      bufferStats,
      firstSets,
      followSets,
      grammar,
      parsingTable: {
        action: actionTable,
        goto: gotoTable
      },
      stackTrace,
      errors,
      rawOutput: stdout,
      stderr
    });
  } finally {
    fs.unlink(filePath, () => {});
  }
});

// ── POST /api/symbols  – Module 5: Symbol Table ─────────────
app.post('/api/symbols', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const filePath = req.file.path;
  try {
    const { stdout, stderr, exitCode } = await runCompiler(filePath, ['--symbols']);

    // Parse JSON block from stdout
    let symData = null;
    const jsonStart = stdout.indexOf('===SYMBOL_TABLE_JSON_START===');
    const jsonEnd   = stdout.indexOf('===SYMBOL_TABLE_JSON_END===');
    if (jsonStart !== -1 && jsonEnd !== -1) {
      const jsonStr = stdout.slice(jsonStart + '===SYMBOL_TABLE_JSON_START==='.length, jsonEnd).trim();
      try { symData = JSON.parse(jsonStr); } catch (e) { /* keep null */ }
    }

    // Parse status line
    const statusMatch = stdout.match(/Status:\s*(SUCCESS|BUILT WITH ERRORS)/);
    const success = statusMatch ? statusMatch[1] === 'SUCCESS' : exitCode === 0;

    // Parse timing
    const timeMatch = stdout.match(/Symbol Table Time:\s*([\d.]+)\s*ms/);
    const timeMs = timeMatch ? parseFloat(timeMatch[1]) : 0;

    res.json({
      success,
      timeMs,
      scopes:       symData ? symData.scopes       : [],
      totalSymbols: symData ? symData.totalSymbols  : 0,
      rawOutput:    stdout,
      stderr:       stderr || '',
    });
  } finally {
    fs.unlink(filePath, () => {});
  }
});

// Error handler
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(400).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log(`Pascal Compiler API running on http://localhost:${PORT}`);
  console.log(`Compiler binary: ${COMPILER_BIN}`);
  console.log(`Binary exists: ${fs.existsSync(COMPILER_BIN)}`);
});