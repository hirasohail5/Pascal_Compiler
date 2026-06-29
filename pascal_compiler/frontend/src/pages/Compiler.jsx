// pages/Compiler.jsx  –  Full compiler pipeline
import { useState } from 'react';
import { Play, RotateCcw, ChevronDown, ChevronRight, CheckCircle, AlertCircle } from 'lucide-react';
import FileUploader from '../components/FileUploader';
import CompilerPipeline from '../components/CompilerPipeline';
import { TerminalPanel, SummaryRow } from '../components/ResultPanel';
import DataTable from '../components/DataTable';
import ASTTree from '../components/ASTTree';
import { ErrorAlert, Loader } from '../components/StatusBadge';
import api from '../services/api';

// ─── helpers ────────────────────────────────────────────────────────────────

function phaseDelay(ms) { return new Promise(r => setTimeout(r, ms)); }

const TOKEN_COLS = [
  { key:'line',      label:'Line',      mono:true, color:()=>'var(--text-2)' },
  { key:'column',    label:'Col',       mono:true, color:()=>'var(--text-2)' },
  { key:'type',      label:'Type',      mono:true, color:v=>v==='ID'?'var(--accent)':v==='NUM'?'var(--green)':v.includes('OP')||v==='RELOP'?'var(--yellow)':'var(--text-1)' },
  { key:'lexeme',    label:'Lexeme',    mono:true },
  { key:'attribute', label:'Attribute', mono:true, color:()=>'var(--text-2)' },
];

// ─── Collapsible section wrapper ────────────────────────────────────────────

function Section({ title, badge, accent, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ border:'1px solid var(--border)', borderRadius:'var(--radius)', overflow:'hidden', marginBottom:16 }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display:'flex', alignItems:'center', gap:8, padding:'10px 14px',
          background:'var(--bg-2)', cursor:'pointer', userSelect:'none',
        }}
      >
        {open ? <ChevronDown size={13}/> : <ChevronRight size={13}/>}
        <span style={{ fontWeight:700, fontSize:13, color: accent || 'var(--text-1)' }}>{title}</span>
        {badge && (
          <span style={{ marginLeft:'auto', fontSize:11, fontFamily:'var(--font-mono)',
            background:'var(--bg-3)', padding:'1px 8px', borderRadius:10, color:'var(--text-2)' }}>
            {badge}
          </span>
        )}
      </div>
      {open && <div style={{ padding:14 }}>{children}</div>}
    </div>
  );
}

// ─── Symbol table sub-components ────────────────────────────────────────────

function kindColor(k) {
  if (k==='function'||k==='procedure') return 'var(--accent)';
  if (k==='array')    return 'var(--yellow)';
  if (k==='parameter') return '#a78bfa';
  if (k==='program')   return 'var(--green)';
  return 'var(--text-1)';
}
function KindBadge({ kind }) {
  return <span style={{ fontSize:10, fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase',
    padding:'2px 7px', borderRadius:20, background:'var(--bg-2)', border:'1px solid var(--border)',
    color:kindColor(kind) }}>{kind}</span>;
}
const SYM_TH = { padding:'7px 12px', textAlign:'left', fontFamily:'var(--font-mono)', fontSize:10,
  fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase', color:'var(--text-2)',
  borderBottom:'1px solid var(--border)' };
const SYM_HEADS = ['Name','Kind','Type','Scope Level','Scope Name','Line','Extra'];
function SymRow({ sym, i }) {
  return (
    <tr style={{ background: i%2===0?'var(--bg-0)':'var(--bg-1)' }}>
      <td style={{ padding:'7px 12px', fontFamily:'var(--font-mono)', fontWeight:700, color:'var(--accent)' }}>{sym.name}</td>
      <td style={{ padding:'7px 12px' }}><KindBadge kind={sym.kind}/></td>
      <td style={{ padding:'7px 12px', fontFamily:'var(--font-mono)', color:'var(--green)' }}>{sym.type}</td>
      <td style={{ padding:'7px 12px', fontFamily:'var(--font-mono)', color:'var(--text-2)' }}>{sym.scopeLevel}</td>
      <td style={{ padding:'7px 12px', fontFamily:'var(--font-mono)', color:'var(--text-2)' }}>{sym.scopeName}</td>
      <td style={{ padding:'7px 12px', fontFamily:'var(--font-mono)', color:'var(--yellow)' }}>{sym.line}</td>
      <td style={{ padding:'7px 12px', fontFamily:'var(--font-mono)', fontSize:11, color:'var(--text-3)' }}>{sym.arrayInfo||'—'}</td>
    </tr>
  );
}
function ScopeCard({ scope }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ border:'1px solid var(--border)', borderRadius:'var(--radius)', overflow:'hidden', marginBottom:10 }}>
      <div onClick={()=>setOpen(o=>!o)} style={{ display:'flex', alignItems:'center', gap:8,
        padding:'9px 14px', background:'var(--bg-2)', cursor:'pointer', userSelect:'none' }}>
        {open?<ChevronDown size={13}/>:<ChevronRight size={13}/>}
        <span style={{ fontWeight:700, fontSize:13, fontFamily:'var(--font-mono)', color:'var(--accent)' }}>{scope.name}</span>
        <span style={{ fontSize:11, color:'var(--text-2)' }}>level {scope.level}</span>
        <span style={{ marginLeft:'auto', fontSize:11, fontFamily:'var(--font-mono)',
          background:'var(--bg-3)', padding:'1px 8px', borderRadius:10, color:'var(--text-2)' }}>
          {scope.symbols.length} symbol{scope.symbols.length!==1?'s':''}
        </span>
      </div>
      {open && scope.symbols.length>0 && (
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
            <thead><tr style={{ background:'var(--bg-1)' }}>{SYM_HEADS.map(h=><th key={h} style={SYM_TH}>{h}</th>)}</tr></thead>
            <tbody>{scope.symbols.map((s,i)=><SymRow key={i} sym={s} i={i}/>)}</tbody>
          </table>
        </div>
      )}
      {open && scope.symbols.length===0 && (
        <div style={{ padding:14, color:'var(--text-3)', fontSize:12 }}>No symbols in this scope.</div>
      )}
    </div>
  );
}
function FlatTable({ scopes }) {
  const all = scopes.flatMap(s=>s.symbols);
  if (!all.length) return null;
  return (
    <div style={{ border:'1px solid var(--border)', borderRadius:'var(--radius)', overflow:'hidden', marginTop:12 }}>
      <div style={{ padding:'9px 14px', background:'var(--bg-2)', fontSize:11, fontWeight:700,
        letterSpacing:'0.06em', textTransform:'uppercase', color:'var(--text-2)' }}>
        All Symbols — Flat View ({all.length})
      </div>
      <div style={{ overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
          <thead><tr style={{ background:'var(--bg-1)' }}>{SYM_HEADS.map(h=><th key={h} style={SYM_TH}>{h}</th>)}</tr></thead>
          <tbody>{all.map((s,i)=><SymRow key={i} sym={s} i={i}/>)}</tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Phase result header bar ─────────────────────────────────────────────────

function PhaseBar({ ok, label, file, meta }) {
  return (
    <div style={{
      display:'flex', alignItems:'center', gap:8, padding:'9px 14px',
      borderRadius:'var(--radius)',
      background: ok ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
      border:`1px solid ${ok?'var(--green)':'var(--red)'}`,
      marginBottom:14, fontSize:13,
    }}>
      {ok ? <CheckCircle size={15} color="var(--green)"/> : <AlertCircle size={15} color="var(--red)"/>}
      <span style={{ fontWeight:600 }}>{label}</span>
      {file && <span style={{ color:'var(--text-2)', marginLeft:4 }}>{file}</span>}
      {meta && <span style={{ marginLeft:'auto', fontFamily:'var(--font-mono)', fontSize:12, color:'var(--text-2)' }}>{meta}</span>}
    </div>
  );
}

// ─── Errors list ─────────────────────────────────────────────────────────────

function ErrorsList({ errors }) {
  if (!errors?.length) return null;
  return (
    <div style={{ background:'var(--bg-1)', border:'1px solid var(--red)',
      borderRadius:'var(--radius)', overflow:'hidden', marginBottom:12 }}>
      {errors.map((e,i) => (
        <div key={i} style={{ display:'flex', gap:12, padding:'8px 14px',
          borderBottom:i<errors.length-1?'1px solid var(--border)':'none',
          fontFamily:'var(--font-mono)', fontSize:12 }}>
          <span style={{ color:'var(--text-2)', minWidth:80 }}>L{e.line} C{e.column}</span>
          <span style={{ color:'var(--red)' }}>{e.message}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function Compiler() {
  const [file,      setFile]      = useState(null);
  const [phases,    setPhases]    = useState({});
  const [lexResult, setLexResult] = useState(null);
  const [rdResult,  setRdResult]  = useState(null);
  const [ll1Result, setLl1Result] = useState(null);
  const [lrResult,  setLrResult]  = useState(null);
  const [symResult, setSymResult] = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');

  function setPhase(id, status) { setPhases(p => ({ ...p, [id]: status })); }

  function reset() {
    setFile(null); setPhases({});
    setLexResult(null); setRdResult(null);
    setLl1Result(null); setLrResult(null); setSymResult(null);
    setError(''); setLoading(false);
  }

  async function run() {
    if (!file) return;
    setError('');
    setLexResult(null); setRdResult(null);
    setLl1Result(null); setLrResult(null); setSymResult(null);
    setLoading(true);
    setPhases({ upload:'running' });

    try {
      await phaseDelay(200);
      setPhase('upload','done');

      // ── 1. Lexer ──────────────────────────────────────────
      setPhase('lex','running');
      await phaseDelay(200);
      const lexRes = await api.lex(file);
      const lex = lexRes.data;
      setLexResult(lex);
      setPhase('lex', lex.success ? 'done' : 'failed');

      // ── 2. RD Parser ──────────────────────────────────────
      setPhase('parse','running');
      await phaseDelay(200);
      const rdRes = await api.parse(file);
      const rd = rdRes.data;
      setRdResult(rd);
      setPhase('parse', (rd.summary?.parseErrors ?? 0) === 0 ? 'done' : 'failed');

      // ── 3. LL(1) Parser ───────────────────────────────────
      setPhase('ll1','running');
      await phaseDelay(200);
      const ll1Res = await api.ll1Parse(file);
      const ll1 = ll1Res.data;
      setLl1Result(ll1);
      setPhase('ll1', ll1.success ? 'done' : 'failed');

      // ── 4. LR Parser ──────────────────────────────────────
      setPhase('lr','running');
      await phaseDelay(200);
      const lrRes = await api.lrParse(file);
      const lr = lrRes.data;
      setLrResult(lr);
      setPhase('lr', lr.success ? 'done' : 'failed');

      // ── 5. Symbol Table ───────────────────────────────────
      setPhase('symbols','running');
      await phaseDelay(200);
      const symRes = await api.symbols(file);
      const sym = symRes.data;
      setSymResult(sym);
      setPhase('symbols', sym.success ? 'done' : 'failed');

      // ── Final output ──────────────────────────────────────
      const allOk = lex.success &&
        (rd.summary?.parseErrors ?? 0) === 0 &&
        ll1.success && lr.success && sym.success;
      setPhase('output', allOk ? 'done' : 'failed');

    } catch (err) {
      setError(err.message);
      setPhases(p => {
        const u = { ...p };
        for (const k of Object.keys(u)) if (u[k]==='running') u[k]='failed';
        return u;
      });
    } finally {
      setLoading(false);
    }
  }

  const label = { fontSize:11, fontWeight:700, letterSpacing:'0.07em',
    textTransform:'uppercase', color:'var(--text-2)', marginBottom:10 };
  const hasAnyResult = lexResult || rdResult || ll1Result || lrResult || symResult;

  return (
    <div style={{ animation:'fadeUp 0.35s ease both' }}>

      {/* Header */}
      <div style={{ marginBottom:28 }}>
        <h1 style={{ fontSize:24, fontWeight:800, letterSpacing:'-0.01em' }}>Mini Compiler</h1>
        <p style={{ color:'var(--text-2)', marginTop:4, fontSize:13 }}>
          Run the full compiler pipeline on a Pascal source file.
        </p>
      </div>

      <ErrorAlert message={error} onClose={() => setError('')} />
      {error && <div style={{ height:16 }}/>}

      <div style={{ display:'grid', gridTemplateColumns:'300px minmax(0,1fr)', gap:24, alignItems:'start' }}>

        {/* ── Left column ──────────────────────────────────── */}
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

          <div>
            <div style={label}>Source File</div>
            <FileUploader file={file} onChange={setFile}/>
          </div>

          <button onClick={run} disabled={!file||loading} style={{
            display:'flex', alignItems:'center', justifyContent:'center', gap:8,
            padding:'12px', borderRadius:'var(--radius)',
            background: file&&!loading ? 'var(--accent)' : 'var(--bg-3)',
            border:'none', color: file&&!loading ? '#fff' : 'var(--text-2)',
            fontFamily:'var(--font-ui)', fontWeight:700, fontSize:14,
            transition:'all var(--transition)',
            cursor: file&&!loading ? 'pointer' : 'not-allowed',
          }}>
            {loading ? <><Loader size={16}/> Running...</> : <><Play size={16}/> Run Compiler</>}
          </button>

          {hasAnyResult && (
            <button onClick={reset} style={{
              display:'flex', alignItems:'center', justifyContent:'center', gap:6,
              padding:'8px', borderRadius:'var(--radius)', background:'var(--bg-2)',
              border:'1px solid var(--border)', color:'var(--text-2)',
              fontFamily:'var(--font-ui)', fontSize:12, fontWeight:600, cursor:'pointer',
            }}>
              <RotateCcw size={13}/> Reset
            </button>
          )}

          <div>
            <div style={label}>Compiler Pipeline</div>
            <div style={{ background:'var(--bg-1)', border:'1px solid var(--border)',
              borderRadius:'var(--radius-lg)', padding:'20px' }}>
              <CompilerPipeline phases={phases}/>
            </div>
          </div>
        </div>

        {/* ── Right column ─────────────────────────────────── */}
        <div style={{ display:'flex', flexDirection:'column', gap:0, minWidth:0 }}>

          {!hasAnyResult && !loading && (
            <div style={{ border:'1px dashed var(--border)', borderRadius:'var(--radius-lg)',
              padding:'64px 32px', textAlign:'center', color:'var(--text-3)' }}>
              <div style={{ fontSize:36, marginBottom:12 }}>⚙</div>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:13 }}>
                Upload a .pas file and click Run Compiler
              </div>
            </div>
          )}

          {/* ══ 1. LEXER ══════════════════════════════════════ */}
          {lexResult && (
            <Section
              title="① Lexical Analysis"
              badge={`${lexResult.tokens?.length ?? 0} tokens`}
              accent="var(--accent)"
            >
              <PhaseBar
                ok={lexResult.success}
                label={lexResult.success ? 'Lexer passed' : 'Lexer errors found'}
                file={file?.name}
                meta={`${lexResult.bufferStats?.lexingTimeMs?.toFixed(3) ?? '—'} ms`}
              />
              <ErrorsList errors={lexResult.errors}/>
              <DataTable columns={TOKEN_COLS} rows={lexResult.tokens||[]} searchKeys={['type','lexeme']}/>
              <details style={{ marginTop:12 }}>
                <summary style={{ cursor:'pointer', fontSize:12, color:'var(--text-2)', fontWeight:600, padding:'4px 0' }}>Raw output</summary>
                <pre style={{ marginTop:8, padding:12, background:'var(--bg-1)', border:'1px solid var(--border)',
                  borderRadius:'var(--radius)', fontSize:11, fontFamily:'var(--font-mono)', color:'var(--text-2)',
                  overflowX:'auto', maxHeight:300, overflowY:'auto', whiteSpace:'pre-wrap' }}>
                  {lexResult.rawOutput}
                </pre>
              </details>
            </Section>
          )}

          {/* ══ 2. RD PARSER ══════════════════════════════════ */}
          {rdResult && (
            <Section
              title="② Recursive Descent Parser"
              badge={`${rdResult.summary?.parseErrors ?? 0} errors`}
              accent="var(--green)"
            >
              <PhaseBar
                ok={(rdResult.summary?.parseErrors ?? 0) === 0}
                label={(rdResult.summary?.parseErrors ?? 0) === 0 ? 'RD Parser passed' : 'Parse errors found'}
                meta={`${rdResult.summary?.parsingTimeMs?.toFixed(3) ?? '—'} ms`}
              />
              <ErrorsList errors={rdResult.errors}/>
              {rdResult.ast && (
                <>
                  <div style={{ ...label, marginBottom:8 }}>Abstract Syntax Tree</div>
                  <ASTTree text={rdResult.ast}/>
                </>
              )}
              <details style={{ marginTop:12 }}>
                <summary style={{ cursor:'pointer', fontSize:12, color:'var(--text-2)', fontWeight:600, padding:'4px 0' }}>Raw output</summary>
                <pre style={{ marginTop:8, padding:12, background:'var(--bg-1)', border:'1px solid var(--border)',
                  borderRadius:'var(--radius)', fontSize:11, fontFamily:'var(--font-mono)', color:'var(--text-2)',
                  overflowX:'auto', maxHeight:300, overflowY:'auto', whiteSpace:'pre-wrap' }}>
                  {rdResult.rawOutput}
                </pre>
              </details>
            </Section>
          )}

          {/* ══ 3. LL(1) PARSER ═══════════════════════════════ */}
          {ll1Result && (
            <Section
              title="③ LL(1) Predictive Parser"
              badge={`${ll1Result.errors?.length ?? 0} errors`}
              accent="var(--yellow)"
            >
              <PhaseBar
                ok={ll1Result.success}
                label={ll1Result.success ? 'LL(1) Parser passed' : 'Parse errors found'}
                meta={`${ll1Result.summary?.parsingTimeMs?.toFixed(3) ?? '—'} ms`}
              />
              <ErrorsList errors={ll1Result.errors}/>

              {/* FIRST sets */}
              {ll1Result.firstSets && Object.keys(ll1Result.firstSets).length > 0 && (
                <details style={{ marginBottom:10 }}>
                  <summary style={{ cursor:'pointer', fontSize:12, color:'var(--text-2)', fontWeight:600, padding:'4px 0' }}>
                    FIRST Sets ({Object.keys(ll1Result.firstSets).length})
                  </summary>
                  <div style={{ marginTop:8, display:'flex', flexWrap:'wrap', gap:6 }}>
                    {Object.entries(ll1Result.firstSets).map(([nt, set]) => (
                      <div key={nt} style={{ background:'var(--bg-2)', border:'1px solid var(--border)',
                        borderRadius:'var(--radius)', padding:'6px 10px', fontSize:11, fontFamily:'var(--font-mono)' }}>
                        <span style={{ color:'var(--accent)', fontWeight:700 }}>{nt}</span>
                        <span style={{ color:'var(--text-2)' }}> → {'{'}  {Array.isArray(set) ? set.join(', ') : set}  {'}'}</span>
                      </div>
                    ))}
                  </div>
                </details>
              )}

              {/* FOLLOW sets */}
              {ll1Result.followSets && Object.keys(ll1Result.followSets).length > 0 && (
                <details style={{ marginBottom:10 }}>
                  <summary style={{ cursor:'pointer', fontSize:12, color:'var(--text-2)', fontWeight:600, padding:'4px 0' }}>
                    FOLLOW Sets ({Object.keys(ll1Result.followSets).length})
                  </summary>
                  <div style={{ marginTop:8, display:'flex', flexWrap:'wrap', gap:6 }}>
                    {Object.entries(ll1Result.followSets).map(([nt, set]) => (
                      <div key={nt} style={{ background:'var(--bg-2)', border:'1px solid var(--border)',
                        borderRadius:'var(--radius)', padding:'6px 10px', fontSize:11, fontFamily:'var(--font-mono)' }}>
                        <span style={{ color:'var(--yellow)', fontWeight:700 }}>{nt}</span>
                        <span style={{ color:'var(--text-2)' }}> → {'{'}  {Array.isArray(set) ? set.join(', ') : set}  {'}'}</span>
                      </div>
                    ))}
                  </div>
                </details>
              )}

              {/* Parse trace */}
              {ll1Result.parseTrace?.length > 0 && (
                <details style={{ marginBottom:10 }}>
                  <summary style={{ cursor:'pointer', fontSize:12, color:'var(--text-2)', fontWeight:600, padding:'4px 0' }}>
                    Parse Stack Trace ({ll1Result.parseTrace.length} steps)
                  </summary>
                  <div style={{ overflowX:'auto', marginTop:8 }}>
                    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11, fontFamily:'var(--font-mono)' }}>
                      <thead>
                        <tr style={{ background:'var(--bg-2)' }}>
                          {['Step','Stack','Input','Action'].map(h=>(
                            <th key={h} style={{ padding:'6px 10px', textAlign:'left', color:'var(--text-2)',
                              borderBottom:'1px solid var(--border)', fontWeight:700, letterSpacing:'0.05em', textTransform:'uppercase', fontSize:10 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {ll1Result.parseTrace.slice(0,200).map((row,i)=>(
                          <tr key={i} style={{ background:i%2===0?'var(--bg-0)':'var(--bg-1)' }}>
                            <td style={{ padding:'5px 10px', color:'var(--text-2)' }}>{row.step}</td>
                            <td style={{ padding:'5px 10px', color:'var(--accent)', maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{row.stack||row.symbolStack}</td>
                            <td style={{ padding:'5px 10px', color:'var(--green)', maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{row.input||row.remainingInput}</td>
                            <td style={{ padding:'5px 10px', color:'var(--yellow)' }}>{row.action}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {ll1Result.parseTrace.length > 200 && (
                      <div style={{ padding:'8px 10px', fontSize:11, color:'var(--text-2)' }}>
                        … {ll1Result.parseTrace.length - 200} more steps
                      </div>
                    )}
                  </div>
                </details>
              )}

              <details style={{ marginTop:4 }}>
                <summary style={{ cursor:'pointer', fontSize:12, color:'var(--text-2)', fontWeight:600, padding:'4px 0' }}>Raw output</summary>
                <pre style={{ marginTop:8, padding:12, background:'var(--bg-1)', border:'1px solid var(--border)',
                  borderRadius:'var(--radius)', fontSize:11, fontFamily:'var(--font-mono)', color:'var(--text-2)',
                  overflowX:'auto', maxHeight:300, overflowY:'auto', whiteSpace:'pre-wrap' }}>
                  {ll1Result.rawOutput}
                </pre>
              </details>
            </Section>
          )}

          {/* ══ 4. LR PARSER ══════════════════════════════════ */}
          {lrResult && (
            <Section
              title="④ LALR(1) Parser"
              badge={`${lrResult.errors?.length ?? 0} errors`}
              accent="#a78bfa"
            >
              <PhaseBar
                ok={lrResult.success}
                label={lrResult.success ? 'LALR(1) Parser passed' : 'Parse errors found'}
                meta={`${lrResult.summary?.parsingTimeMs?.toFixed(3) ?? '—'} ms`}
              />
              <ErrorsList errors={lrResult.errors}/>

              {/* Stack trace */}
              {lrResult.stackTrace?.length > 0 && (
                <details style={{ marginBottom:10 }}>
                  <summary style={{ cursor:'pointer', fontSize:12, color:'var(--text-2)', fontWeight:600, padding:'4px 0' }}>
                    Shift-Reduce Stack Trace ({lrResult.stackTrace.length} steps)
                  </summary>
                  <div style={{ overflowX:'auto', marginTop:8 }}>
                    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11, fontFamily:'var(--font-mono)' }}>
                      <thead>
                        <tr style={{ background:'var(--bg-2)' }}>
                          {['Step','Stack','Input','Action'].map(h=>(
                            <th key={h} style={{ padding:'6px 10px', textAlign:'left', color:'var(--text-2)',
                              borderBottom:'1px solid var(--border)', fontWeight:700, letterSpacing:'0.05em', textTransform:'uppercase', fontSize:10 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {lrResult.stackTrace.slice(0,200).map((row,i)=>(
                          <tr key={i} style={{ background:i%2===0?'var(--bg-0)':'var(--bg-1)' }}>
                            <td style={{ padding:'5px 10px', color:'var(--text-2)' }}>{row.step}</td>
                            <td style={{ padding:'5px 10px', color:'#a78bfa', maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{row.stack||row.symbolStack}</td>
                            <td style={{ padding:'5px 10px', color:'var(--green)', maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{row.input||row.remainingInput}</td>
                            <td style={{ padding:'5px 10px', color:'var(--yellow)' }}>{row.action}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {lrResult.stackTrace.length > 200 && (
                      <div style={{ padding:'8px 10px', fontSize:11, color:'var(--text-2)' }}>
                        … {lrResult.stackTrace.length - 200} more steps
                      </div>
                    )}
                  </div>
                </details>
              )}

              <details style={{ marginTop:4 }}>
                <summary style={{ cursor:'pointer', fontSize:12, color:'var(--text-2)', fontWeight:600, padding:'4px 0' }}>Raw output</summary>
                <pre style={{ marginTop:8, padding:12, background:'var(--bg-1)', border:'1px solid var(--border)',
                  borderRadius:'var(--radius)', fontSize:11, fontFamily:'var(--font-mono)', color:'var(--text-2)',
                  overflowX:'auto', maxHeight:300, overflowY:'auto', whiteSpace:'pre-wrap' }}>
                  {lrResult.rawOutput}
                </pre>
              </details>
            </Section>
          )}

          {/* ══ 5. SYMBOL TABLE ═══════════════════════════════ */}
          {symResult && (
            <Section
              title="⑤ Symbol Table"
              badge={`${symResult.totalSymbols} symbols`}
              accent="var(--green)"
            >
              <PhaseBar
                ok={symResult.success}
                label={symResult.success ? 'Symbol table built successfully' : 'Built with errors'}
                meta={`${symResult.timeMs?.toFixed(2) ?? '—'} ms · ${symResult.scopes?.length ?? 0} scopes`}
              />
              {symResult.scopes?.map((sc,i) => <ScopeCard key={i} scope={sc}/>)}
              {symResult.scopes?.length > 0 && <FlatTable scopes={symResult.scopes}/>}
              <details style={{ marginTop:12 }}>
                <summary style={{ cursor:'pointer', fontSize:12, color:'var(--text-2)', fontWeight:600, padding:'4px 0' }}>Raw output</summary>
                <pre style={{ marginTop:8, padding:12, background:'var(--bg-1)', border:'1px solid var(--border)',
                  borderRadius:'var(--radius)', fontSize:11, fontFamily:'var(--font-mono)', color:'var(--text-2)',
                  overflowX:'auto', maxHeight:300, overflowY:'auto', whiteSpace:'pre-wrap' }}>
                  {symResult.rawOutput}
                </pre>
              </details>
            </Section>
          )}

        </div>
      </div>
    </div>
  );
}