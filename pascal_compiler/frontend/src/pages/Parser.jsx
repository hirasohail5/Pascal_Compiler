// pages/Parser.jsx
import { useState } from 'react';
import { Play, ChevronDown, ChevronRight } from 'lucide-react';
import FileUploader from '../components/FileUploader';
import { TerminalPanel, SummaryRow } from '../components/ResultPanel';
import ASTTree from '../components/ASTTree';
import { ErrorAlert, Loader, StatusBadge } from '../components/StatusBadge';
import api from '../services/api';

function CollapsibleSection({ title, defaultOpen = true, children, badge }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ border:'1px solid var(--border)', borderRadius:'var(--radius)', overflow:'hidden' }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display:'flex', alignItems:'center', gap:8, padding:'10px 14px',
          background:'var(--bg-2)', cursor:'pointer', userSelect:'none',
        }}
      >
        {open ? <ChevronDown size={14} color="var(--text-2)" /> : <ChevronRight size={14} color="var(--text-2)" />}
        <span style={{ fontWeight:600, fontSize:13, flex:1 }}>{title}</span>
        {badge}
      </div>
      {open && <div style={{ padding:'0' }}>{children}</div>}
    </div>
  );
}

export default function ParserPage() {
  const [file,    setFile]    = useState(null);
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  async function run() {
    if (!file) return;
    setError(''); setResult(null); setLoading(true);
    try {
      const res = await api.parse(file);
      setResult(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const label = { fontSize:11, fontWeight:700, letterSpacing:'0.07em', textTransform:'uppercase',
                  color:'var(--text-2)', marginBottom:10 };

  return (
    <div style={{ animation:'fadeUp 0.35s ease both' }}>
      <div style={{ marginBottom:28 }}>
        <h1 style={{ fontSize:24, fontWeight:800, letterSpacing:'-0.01em' }}>Recursive Descent Parser</h1>
        <p style={{ color:'var(--text-2)', marginTop:4, fontSize:13 }}>
          Syntax analysis over the token stream. Builds an Abstract Syntax Tree using the Pascal subset grammar.
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
            background: file && !loading ? 'var(--green)' : 'var(--bg-3)',
            border:'none', color: file && !loading ? '#fff' : 'var(--text-2)',
            fontFamily:'var(--font-ui)', fontWeight:700, fontSize:13,
            cursor: file && !loading ? 'pointer' : 'not-allowed',
          }}>
            {loading ? <><Loader size={15} /> Parsing...</> : <><Play size={15} /> Run Parser</>}
          </button>

          {result && (
            <div style={{ background:'var(--bg-1)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'0 14px' }}>
              <div style={{ padding:'10px 0', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:11, color:'var(--text-2)' }}>Parse Result</span>
                <StatusBadge status={result.success ? 'success' : 'failed'} />
              </div>
              <SummaryRow label="Lex errors"    value={result.summary?.lexErrors}   color={result.summary?.lexErrors > 0   ? 'var(--red)':'var(--green)'} />
              <SummaryRow label="Parse errors"  value={result.summary?.parseErrors} color={result.summary?.parseErrors > 0 ? 'var(--red)':'var(--green)'} />
              <SummaryRow label="Parsing time"  value={result.summary?.parsingTimeMs != null ? `${result.summary.parsingTimeMs.toFixed(3)} ms` : '—'} />
            </div>
          )}

          {/* Grammar reference */}
          <div style={{ background:'var(--bg-1)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'14px' }}>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase', color:'var(--text-2)', marginBottom:10 }}>Grammar (key rules)</div>
            {[
              'program → program id (id_list) ;',
              '  declarations subprogram_decls',
              '  compound_statement .',
              '',
              'statement → var := expr',
              '  | if expr then stmt [else stmt]',
              '  | while expr do stmt',
              '  | begin stmts end',
              '  | proc_call | ε',
              '',
              'expr → simple [relop simple]',
              'simple → [sign] term {addop term}',
              'term → factor {mulop factor}',
            ].map((line, i) => (
              <div key={i} style={{ fontFamily:'var(--font-mono)', fontSize:10, color: line === '' ? 'transparent' : 'var(--text-2)', lineHeight:1.7 }}>
                {line || '.'}
              </div>
            ))}
          </div>
        </div>

        {/* Right */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {!result && !loading && (
            <div style={{
              border:'1px dashed var(--border)', borderRadius:'var(--radius-lg)',
              padding:'64px 32px', textAlign:'center', color:'var(--text-3)',
            }}>
              <div style={{ fontSize:32, marginBottom:12, fontFamily:'var(--font-mono)' }}>AST</div>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:13 }}>Upload a .pas file and run the parser</div>
            </div>
          )}

          {result && (
            <>
              {/* Errors */}
              {result.errors?.length > 0 && (
                <CollapsibleSection
                  title={`Syntax Errors`}
                  badge={<span style={{ fontSize:11, padding:'1px 7px', borderRadius:20, background:'var(--red-dim)', color:'var(--red)', fontFamily:'var(--font-mono)' }}>{result.errors.length}</span>}
                >
                  <div>
                    {result.errors.map((e, i) => (
                      <div key={i} style={{
                        display:'flex', gap:12, padding:'9px 14px', fontFamily:'var(--font-mono)', fontSize:12,
                        borderBottom: i < result.errors.length-1 ? '1px solid var(--border)' : 'none',
                        background:'var(--bg-1)',
                      }}>
                        <span style={{ color:'var(--text-2)', minWidth:80, flexShrink:0 }}>L{e.line} C{e.column}</span>
                        <span style={{ color:'var(--red)' }}>{e.message}</span>
                      </div>
                    ))}
                  </div>
                </CollapsibleSection>
              )}

              {/* AST */}
              <CollapsibleSection title="Abstract Syntax Tree"
                badge={<StatusBadge status={result.success ? 'success' : 'failed'} />}
              >
                <ASTTree text={result.ast} />
              </CollapsibleSection>

              <TerminalPanel title="raw parser output" defaultOpen={false}>
                {result.rawOutput}
              </TerminalPanel>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
