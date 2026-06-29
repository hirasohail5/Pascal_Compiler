// pages/Lexer.jsx
import { useState } from 'react';
import { Play } from 'lucide-react';
import FileUploader from '../components/FileUploader';
import DataTable from '../components/DataTable';
import { TerminalPanel, SummaryRow } from '../components/ResultPanel';
import { ErrorAlert, Loader } from '../components/StatusBadge';
import { StatusBadge } from '../components/StatusBadge';
import api from '../services/api';

const TOKEN_COLS = [
  { key:'line',      label:'Line',      mono:true, color:() => 'var(--text-2)' },
  { key:'column',    label:'Col',       mono:true, color:() => 'var(--text-2)' },
  {
    key:'type', label:'Type', mono:true,
    color: v => {
      if (v === 'ID')      return 'var(--accent)';
      if (v === 'NUM')     return 'var(--green)';
      if (v?.includes('OP') || v === 'RELOP') return 'var(--yellow)';
      if (['BEGIN','END','IF','THEN','ELSE','WHILE','DO','PROGRAM',
           'VAR','FUNCTION','PROCEDURE','INTEGER','REAL','ARRAY','OF'].includes(v))
        return 'var(--orange)';
      return 'var(--text-1)';
    }
  },
  { key:'lexeme',    label:'Lexeme',    mono:true },
  { key:'attribute', label:'Attribute', mono:true, color:() => 'var(--text-2)' },
];

export default function LexerPage() {
  const [file,    setFile]    = useState(null);
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  async function run() {
    if (!file) return;
    setError(''); setResult(null); setLoading(true);
    try {
      const res = await api.lex(file);
      setResult(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const label = { fontSize:11, fontWeight:700, letterSpacing:'0.07em', textTransform:'uppercase',
                  color:'var(--text-2)', marginBottom:10 };

  // Group tokens by type for stats
  const typeCount = {};
  if (result?.tokens) {
    result.tokens.forEach(t => { typeCount[t.type] = (typeCount[t.type] || 0) + 1; });
  }

  return (
    <div style={{ animation:'fadeUp 0.35s ease both' }}>
      <div style={{ marginBottom:28 }}>
        <h1 style={{ fontSize:24, fontWeight:800, letterSpacing:'-0.01em' }}>Lexical Analyser</h1>
        <p style={{ color:'var(--text-2)', marginTop:4, fontSize:13 }}>
          Tokenise Pascal source code using double-buffered character scanning.
        </p>
      </div>

      <ErrorAlert message={error} onClose={() => setError('')} />
      {error && <div style={{ height:16 }} />}

      <div style={{ display:'grid', gridTemplateColumns:'300px 1fr', gap:24, alignItems:'start' }}>

        {/* Left */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div>
            <div style={label}>Source File</div>
            <FileUploader file={file} onChange={setFile} />
          </div>
          <button onClick={run} disabled={!file || loading} style={{
            display:'flex', alignItems:'center', justifyContent:'center', gap:8,
            padding:'11px', borderRadius:'var(--radius)',
            background: file && !loading ? 'var(--accent)' : 'var(--bg-3)',
            border:'none', color: file && !loading ? '#fff' : 'var(--text-2)',
            fontFamily:'var(--font-ui)', fontWeight:700, fontSize:13,
            cursor: file && !loading ? 'pointer' : 'not-allowed',
          }}>
            {loading ? <><Loader size={15} /> Analysing...</> : <><Play size={15} /> Run Lexer</>}
          </button>

          {result && (
            <div style={{ background:'var(--bg-1)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'0 14px' }}>
              <div style={{ padding:'10px 0', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:11, color:'var(--text-2)' }}>Status</span>
                <StatusBadge status={result.success ? 'success' : 'failed'} />
              </div>
              <SummaryRow label="Total tokens"    value={result.tokens?.length} />
              <SummaryRow label="Lex errors"       value={result.errors?.length} color={result.errors?.length > 0 ? 'var(--red)' : 'var(--green)'} />
              <SummaryRow label="Buffer size"      value={`${result.bufferStats?.bufferSize ?? '—'} B`} />
              <SummaryRow label="Chars read"       value={result.bufferStats?.totalCharsRead} />
              <SummaryRow label="Buffer switches"  value={result.bufferStats?.bufferSwitches} />
              <SummaryRow label="Lex time"         value={result.bufferStats?.lexingTimeMs != null ? `${result.bufferStats.lexingTimeMs.toFixed(3)} ms` : '—'} />
            </div>
          )}

          {/* Token type breakdown */}
          {Object.keys(typeCount).length > 0 && (
            <div>
              <div style={label}>Token Types</div>
              <div style={{ background:'var(--bg-1)', border:'1px solid var(--border)', borderRadius:'var(--radius)', maxHeight:240, overflowY:'auto' }}>
                {Object.entries(typeCount).sort((a,b) => b[1]-a[1]).map(([type, count]) => (
                  <div key={type} style={{
                    display:'flex', justifyContent:'space-between', padding:'6px 12px',
                    borderBottom:'1px solid var(--border)', fontSize:11, fontFamily:'var(--font-mono)',
                  }}>
                    <span style={{ color:'var(--text-1)' }}>{type}</span>
                    <span style={{ color:'var(--text-2)' }}>{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right */}
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
          {!result && !loading && (
            <div style={{
              border:'1px dashed var(--border)', borderRadius:'var(--radius-lg)',
              padding:'64px 32px', textAlign:'center', color:'var(--text-3)',
            }}>
              <div style={{ fontSize:32, marginBottom:12, fontFamily:'var(--font-mono)' }}>{'{ }'}</div>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:13 }}>Upload a .pas file and run the lexer</div>
            </div>
          )}

          {result && (
            <>
              {result.errors?.length > 0 && (
                <div>
                  <div style={label}>Lexer Errors</div>
                  <div style={{ background:'var(--bg-1)', border:'1px solid var(--red)', borderRadius:'var(--radius)' }}>
                    {result.errors.map((e, i) => (
                      <div key={i} style={{
                        display:'flex', gap:12, padding:'8px 14px', fontFamily:'var(--font-mono)', fontSize:12,
                        borderBottom: i < result.errors.length-1 ? '1px solid var(--border)' : 'none',
                      }}>
                        <span style={{ color:'var(--text-2)', minWidth:80 }}>L{e.line} C{e.column}</span>
                        <span style={{ color:'var(--red)' }}>{e.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <div style={label}>Token Stream ({result.tokens?.length} tokens)</div>
                <DataTable columns={TOKEN_COLS} rows={result.tokens || []} searchKeys={['type','lexeme','attribute']} />
              </div>

              <TerminalPanel title="raw lexer output" defaultOpen={false}>
                {result.rawOutput}
              </TerminalPanel>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
