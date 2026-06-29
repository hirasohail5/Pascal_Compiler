// pages/Symbols.jsx  –  Symbol Table Module 5
import { useState } from 'react';
import { BookOpen, Zap, CheckCircle, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';
import FileUploader from '../components/FileUploader';
import { ErrorAlert } from '../components/StatusBadge';
import api from '../services/api';

// ── Small helpers ─────────────────────────────────────────────
function kindColor(kind) {
  if (kind === 'function' || kind === 'procedure') return 'var(--accent)';
  if (kind === 'array')    return 'var(--yellow)';
  if (kind === 'parameter') return '#a78bfa';
  if (kind === 'program')   return 'var(--green)';
  return 'var(--text-1)';
}

function KindBadge({ kind }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
      textTransform: 'uppercase', padding: '2px 7px', borderRadius: 20,
      background: 'var(--bg-2)', border: '1px solid var(--border)',
      color: kindColor(kind),
    }}>{kind}</span>
  );
}

// ── One scope card ────────────────────────────────────────────
function ScopeCard({ scope }) {
  const [open, setOpen] = useState(true);

  return (
    <div style={{
      border: '1px solid var(--border)', borderRadius: 'var(--radius)',
      overflow: 'hidden', marginBottom: 12,
    }}>
      {/* Header */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '9px 14px', background: 'var(--bg-2)',
          cursor: 'pointer', userSelect: 'none',
        }}
      >
        {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        <span style={{ fontWeight: 700, fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>
          {scope.name}
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-2)' }}>level {scope.level}</span>
        <span style={{
          marginLeft: 'auto', fontSize: 11, fontFamily: 'var(--font-mono)',
          background: 'var(--bg-3)', padding: '1px 8px', borderRadius: 10,
          color: 'var(--text-2)',
        }}>
          {scope.symbols.length} symbol{scope.symbols.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      {open && scope.symbols.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: 'var(--bg-1)' }}>
                {['Name', 'Kind', 'Type', 'Scope Level', 'Scope Name', 'Line', 'Extra'].map(h => (
                  <th key={h} style={{
                    padding: '7px 12px', textAlign: 'left', fontFamily: 'var(--font-mono)',
                    fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                    color: 'var(--text-2)', borderBottom: '1px solid var(--border)',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {scope.symbols.map((sym, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? 'var(--bg-0)' : 'var(--bg-1)' }}>
                  <td style={{ padding: '7px 12px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent)' }}>{sym.name}</td>
                  <td style={{ padding: '7px 12px' }}><KindBadge kind={sym.kind} /></td>
                  <td style={{ padding: '7px 12px', fontFamily: 'var(--font-mono)', color: 'var(--green)' }}>{sym.type}</td>
                  <td style={{ padding: '7px 12px', fontFamily: 'var(--font-mono)', color: 'var(--text-2)' }}>{sym.scopeLevel}</td>
                  <td style={{ padding: '7px 12px', fontFamily: 'var(--font-mono)', color: 'var(--text-2)' }}>{sym.scopeName}</td>
                  <td style={{ padding: '7px 12px', fontFamily: 'var(--font-mono)', color: 'var(--yellow)' }}>{sym.line}</td>
                  <td style={{ padding: '7px 12px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-3)' }}>{sym.arrayInfo || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {open && scope.symbols.length === 0 && (
        <div style={{ padding: '14px', color: 'var(--text-3)', fontSize: 12 }}>No symbols in this scope.</div>
      )}
    </div>
  );
}

// ── Flat view table ───────────────────────────────────────────
function FlatTable({ scopes }) {
  const all = scopes.flatMap(s => s.symbols);
  if (all.length === 0) return null;
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
      <div style={{ padding: '9px 14px', background: 'var(--bg-2)', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-2)' }}>
        All Symbols (Flat View)
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: 'var(--bg-1)' }}>
              {['Name', 'Kind', 'Type', 'Scope', 'Scope Name', 'Line', 'Extra'].map(h => (
                <th key={h} style={{
                  padding: '7px 12px', textAlign: 'left', fontFamily: 'var(--font-mono)',
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                  color: 'var(--text-2)', borderBottom: '1px solid var(--border)',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {all.map((sym, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? 'var(--bg-0)' : 'var(--bg-1)' }}>
                <td style={{ padding: '7px 12px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent)' }}>{sym.name}</td>
                <td style={{ padding: '7px 12px' }}><KindBadge kind={sym.kind} /></td>
                <td style={{ padding: '7px 12px', fontFamily: 'var(--font-mono)', color: 'var(--green)' }}>{sym.type}</td>
                <td style={{ padding: '7px 12px', fontFamily: 'var(--font-mono)', color: 'var(--text-2)' }}>{sym.scopeLevel}</td>
                <td style={{ padding: '7px 12px', fontFamily: 'var(--font-mono)', color: 'var(--text-2)' }}>{sym.scopeName}</td>
                <td style={{ padding: '7px 12px', fontFamily: 'var(--font-mono)', color: 'var(--yellow)' }}>{sym.line}</td>
                <td style={{ padding: '7px 12px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-3)' }}>{sym.arrayInfo || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────
export default function SymbolsPage() {
  const [file,    setFile]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [result,  setResult]  = useState(null);

  const label = {
    fontSize: 11, fontWeight: 700, letterSpacing: '0.07em',
    textTransform: 'uppercase', color: 'var(--text-2)', marginBottom: 10,
  };

  async function run() {
    if (!file) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const { data } = await api.symbols(file);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ animation: 'fadeUp 0.35s ease both' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.01em' }}>Symbol Table</h1>
        <p style={{ color: 'var(--text-2)', marginTop: 4, fontSize: 13 }}>
          Inspect declared identifiers, types, scope levels, and source locations.
        </p>
      </div>

      <ErrorAlert message={error} onClose={() => setError('')} />
      {error && <div style={{ height: 16 }} />}

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 24, alignItems: 'start' }}>

        {/* ── Left panel ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div style={label}>Source File</div>
            <FileUploader file={file} onChange={setFile} />
          </div>

          <button
            onClick={run}
            disabled={!file || loading}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '11px', borderRadius: 'var(--radius)',
              background: file && !loading ? 'var(--yellow)' : 'var(--bg-3)',
              border: 'none', color: file && !loading ? '#000' : 'var(--text-2)',
              fontFamily: 'var(--font-ui)', fontWeight: 700, fontSize: 13,
              cursor: file && !loading ? 'pointer' : 'not-allowed',
            }}
          >
            <Zap size={15} />
            {loading ? 'Building…' : 'Run Symbol Table'}
          </button>

          {/* Info box */}
          <div style={{
            background: 'var(--bg-1)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', padding: '14px',
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-2)', marginBottom: 10 }}>
              What will be shown
            </div>
            {['Identifier name', 'Kind (var / func / proc / array)', 'Data type (integer / real)', 'Scope level', 'Source line number'].map(item => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', fontSize: 12, color: 'var(--text-1)', borderBottom: '1px solid var(--border)' }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--yellow)', flexShrink: 0 }} />
                {item}
              </div>
            ))}
          </div>

          {/* Stats */}
          {result && (
            <div style={{
              background: 'var(--bg-1)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', padding: '14px',
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-2)', marginBottom: 10 }}>
                Stats
              </div>
              {[
                ['Total symbols', result.totalSymbols],
                ['Scopes', result.scopes?.length ?? 0],
                ['Time', result.timeMs?.toFixed(2) + ' ms'],
                ['Status', result.success ? '✓ Success' : '⚠ With errors'],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 12, borderBottom: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--text-2)' }}>{k}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-1)' }}>{v}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Right panel ── */}
        <div>
          {/* Status bar */}
          {result && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '9px 14px', borderRadius: 'var(--radius)',
              background: result.success ? 'rgba(34,197,94,0.08)' : 'rgba(234,179,8,0.08)',
              border: `1px solid ${result.success ? 'var(--green)' : 'var(--yellow)'}`,
              marginBottom: 16, fontSize: 13,
            }}>
              {result.success
                ? <CheckCircle size={15} color="var(--green)" />
                : <AlertCircle size={15} color="var(--yellow)" />}
              <span style={{ fontWeight: 600 }}>
                {result.success ? 'Symbol table built successfully' : 'Built with errors'}
              </span>
              {file && <span style={{ color: 'var(--text-2)', marginLeft: 4 }}>{file.name}</span>}
            </div>
          )}

          {/* Scope cards */}
          {result && result.scopes && result.scopes.length > 0 && (
            <>
              <div style={label}>Symbol Table by Scope</div>
              {result.scopes.map((sc, i) => <ScopeCard key={i} scope={sc} />)}
              <div style={{ marginTop: 24 }}>
                <FlatTable scopes={result.scopes} />
              </div>
            </>
          )}

          {/* Raw output */}
          {result && (
            <details style={{ marginTop: 20 }}>
              <summary style={{ cursor: 'pointer', fontSize: 12, color: 'var(--text-2)', fontWeight: 600, padding: '6px 0' }}>
                Raw compiler output
              </summary>
              <pre style={{
                marginTop: 8, padding: 14, background: 'var(--bg-1)',
                border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-2)',
                overflowX: 'auto', maxHeight: 400, overflowY: 'auto', whiteSpace: 'pre-wrap',
              }}>{result.rawOutput}</pre>
            </details>
          )}

          {/* Empty state */}
          {!result && !loading && (
            <div style={{
              border: '1px dashed var(--border)', borderRadius: 'var(--radius-lg)',
              padding: '60px 32px', textAlign: 'center',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: 'var(--radius-lg)',
                background: 'var(--bg-2)', border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <BookOpen size={24} color="var(--text-3)" />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-1)', marginBottom: 6 }}>
                  Upload a .pas file and click Run
                </div>
                <div style={{ color: 'var(--text-2)', fontSize: 13, maxWidth: 360, lineHeight: 1.6 }}>
                  The symbol table will show all declared identifiers with their kind, type, scope level, and line number.
                </div>
              </div>
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div style={{
              border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
              padding: '60px 32px', textAlign: 'center', color: 'var(--text-2)', fontSize: 14,
            }}>
              Building symbol table…
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
