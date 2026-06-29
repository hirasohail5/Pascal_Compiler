// pages/LL1Parser.jsx
import { useState } from 'react';
import { Play, ChevronDown, ChevronRight, Table, Hash, List, Layers, Terminal, AlertCircle, Code, BookOpen, TreePine } from 'lucide-react';
import FileUploader from '../components/FileUploader';
import { TerminalPanel, SummaryRow } from '../components/ResultPanel';
import { ErrorAlert, Loader, StatusBadge } from '../components/StatusBadge';
import DataTable from '../components/DataTable';
import ASTTree from '../components/ASTTree';
import api from '../services/api';

function CollapsibleSection({ title, defaultOpen = true, children, badge, icon: Icon }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ 
      border: '1px solid var(--border)', 
      borderRadius: 'var(--radius)', 
      overflow: 'hidden',
      background: 'var(--bg-1)'
    }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px',
          background: 'var(--bg-2)', cursor: 'pointer', userSelect: 'none',
          borderBottom: open ? '1px solid var(--border)' : 'none',
        }}
      >
        {Icon && <Icon size={16} color="var(--accent)" />}
        {open ? <ChevronDown size={14} color="var(--text-2)" /> : <ChevronRight size={14} color="var(--text-2)" />}
        <span style={{ fontWeight: 600, fontSize: 13, flex: 1 }}>{title}</span>
        {badge && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'var(--bg-3)', color: 'var(--text-2)' }}>{badge}</span>}
      </div>
      {open && <div style={{ padding: '16px' }}>{children}</div>}
    </div>
  );
}

function FirstSetDisplay({ firstSets }) {
  if (!firstSets || Object.keys(firstSets).length === 0) {
    return <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-3)' }}>No FIRST sets available</div>;
  }
  
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 10 }}>
      {Object.entries(firstSets).map(([nonterm, values]) => (
        <div key={nonterm} style={{ 
          background: 'var(--bg-0)', 
          borderRadius: 'var(--radius-sm)', 
          padding: '10px 14px',
          border: '1px solid var(--border-lit)',
          fontFamily: 'var(--font-mono)'
        }}>
          <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 12 }}>FIRST({nonterm})</span>
          <span style={{ color: 'var(--text-2)', margin: '0 8px' }}>=</span>
          <span style={{ fontSize: 11 }}>{'{ '}{values.join(', ')}{' }'}</span>
        </div>
      ))}
    </div>
  );
}

function FollowSetDisplay({ followSets }) {
  if (!followSets || Object.keys(followSets).length === 0) {
    return <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-3)' }}>No FOLLOW sets available</div>;
  }
  
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 10 }}>
      {Object.entries(followSets).map(([nonterm, values]) => (
        <div key={nonterm} style={{ 
          background: 'var(--bg-0)', 
          borderRadius: 'var(--radius-sm)', 
          padding: '10px 14px',
          border: '1px solid var(--border-lit)',
          fontFamily: 'var(--font-mono)'
        }}>
          <span style={{ color: 'var(--green)', fontWeight: 700, fontSize: 12 }}>FOLLOW({nonterm})</span>
          <span style={{ color: 'var(--text-2)', margin: '0 8px' }}>=</span>
          <span style={{ fontSize: 11 }}>{'{ '}{values.join(', ')}{' }'}</span>
        </div>
      ))}
    </div>
  );
}

function ParsingTableDisplay({ entries }) {
  if (!entries || entries.length === 0) {
    return <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-3)' }}>No parsing table available</div>;
  }
  
  return (
    <div style={{ overflowX: 'auto', maxHeight: 500, overflowY: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, fontFamily: 'var(--font-mono)' }}>
        <thead>
          <tr style={{ background: 'var(--bg-2)', position: 'sticky', top: 0 }}>
            <th style={{ padding: '10px', border: '1px solid var(--border)', textAlign: 'left' }}>Non-Terminal</th>
            <th style={{ padding: '10px', border: '1px solid var(--border)', textAlign: 'left' }}>Terminal</th>
            <th style={{ padding: '10px', border: '1px solid var(--border)', textAlign: 'left' }}>Production</th>
           </tr>
        </thead>
        <tbody>
          {entries.map((entry, idx) => (
            <tr key={idx} style={{ background: idx % 2 === 0 ? 'var(--bg-0)' : 'var(--bg-1)' }}>
              <td style={{ padding: '8px', border: '1px solid var(--border)' }}>{entry.nonTerminal}</td>
              <td style={{ padding: '8px', border: '1px solid var(--border)' }}>{entry.terminal}</td>
              <td style={{ padding: '8px', border: '1px solid var(--border)', color: 'var(--accent)' }}>{entry.production}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ParseTraceDisplay({ trace }) {
  if (!trace || trace.length === 0) {
    return <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-3)' }}>No parse trace available</div>;
  }
  
  return (
    <div style={{ overflowX: 'auto', maxHeight: 500, overflowY: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, fontFamily: 'var(--font-mono)' }}>
        <thead>
          <tr style={{ background: 'var(--bg-2)', position: 'sticky', top: 0 }}>
            <th style={{ padding: '12px', borderBottom: '2px solid var(--border)', textAlign: 'left', width: '8%' }}>Step</th>
            <th style={{ padding: '12px', borderBottom: '2px solid var(--border)', textAlign: 'left', width: '42%' }}>Stack</th>
            <th style={{ padding: '12px', borderBottom: '2px solid var(--border)', textAlign: 'left', width: '20%' }}>Input</th>
            <th style={{ padding: '12px', borderBottom: '2px solid var(--border)', textAlign: 'left', width: '30%' }}>Action</th>
           </tr>
        </thead>
        <tbody>
          {trace.map((step, idx) => (
            <tr key={idx} style={{ background: idx % 2 === 0 ? 'var(--bg-0)' : 'var(--bg-1)' }}>
              <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-lit)' }}>{step.step}</td>
              <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-lit)', fontFamily: 'var(--font-mono)', fontSize: 10, wordBreak: 'break-all' }}>{step.stack}</td>
              <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-lit)' }}>{step.input}</td>
              <td style={{ 
                padding: '10px 12px', 
                borderBottom: '1px solid var(--border-lit)', 
                color: step.action?.includes('->') ? 'var(--green)' : 
                       step.action?.includes('match') ? 'var(--accent)' : 
                       step.action?.includes('accept') ? 'var(--green)' : 
                       step.action?.includes('error') ? 'var(--red)' : 'var(--text-1)'
              }}>
                {step.action}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GrammarDisplay({ grammar }) {
  if (!grammar || grammar.length === 0) {
    return <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-3)' }}>No grammar available</div>;
  }
  
  return (
    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, maxHeight: 400, overflowY: 'auto' }}>
      {grammar.map((prod, idx) => (
        <div key={idx} style={{ padding: '6px 0', borderBottom: '1px solid var(--border-lit)', display: 'flex' }}>
          <span style={{ color: 'var(--text-2)', width: 40 }}>{prod.index}:</span>
          <span style={{ color: 'var(--accent)', fontWeight: 600, minWidth: 120 }}>{prod.lhs}</span>
          <span style={{ color: 'var(--text-2)', margin: '0 8px' }}>→</span>
          <span style={{ color: prod.rhs === 'ε' ? 'var(--yellow)' : 'var(--text-1)' }}>{prod.rhs}</span>
        </div>
      ))}
    </div>
  );
}

export default function LL1ParserPage() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const tokenColumns = [
    { key: 'line', label: 'Line', mono: true },
    { key: 'column', label: 'Col', mono: true },
    { key: 'type', label: 'Type', mono: true },
    { key: 'lexeme', label: 'Lexeme', mono: true },
    { key: 'attribute', label: 'Attribute', mono: true }
  ];

  async function run() {
    if (!file) return;
    setError(''); 
    setResult(null); 
    setLoading(true);
    try {
      const res = await api.ll1Parse(file);
      console.log('LL(1) API Response:', res.data);
      setResult(res.data);
    } catch (err) {
      console.error('Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ animation: 'fadeUp 0.35s ease both' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>LL(1) Predictive Parser</h1>
        <p style={{ color: 'var(--text-2)', marginTop: 4, fontSize: 13 }}>
          Non-recursive predictive parser using FIRST/FOLLOW sets and a parsing table.
          Handles the Pascal subset grammar with left recursion removed and left factoring applied.
        </p>
      </div>

      <ErrorAlert message={error} onClose={() => setError('')} />
      {error && <div style={{ height: 16 }} />}

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 24, alignItems: 'start' }}>
        {/* Left Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 10 }}>Source File</div>
            <FileUploader file={file} onChange={setFile} />
          </div>
          
          <button onClick={run} disabled={!file || loading} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '12px', borderRadius: 'var(--radius)',
            background: file && !loading ? 'var(--accent)' : 'var(--bg-3)',
            border: 'none', color: file && !loading ? '#fff' : 'var(--text-2)',
            fontWeight: 700, fontSize: 13,
            cursor: file && !loading ? 'pointer' : 'not-allowed',
          }}>
            {loading ? <><Loader size={15} /> Parsing...</> : <><Play size={15} /> Run LL(1) Parser</>}
          </button>

          {result && (
            <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0 14px' }}>
              <div style={{ padding: '12px 0', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, fontWeight: 600 }}>Parse Summary</span>
                <StatusBadge status={result.success ? 'success' : 'failed'} />
              </div>
              <SummaryRow label="Lex errors" value={result.summary?.lexErrors || 0} />
              <SummaryRow label="Parse errors" value={result.summary?.parseErrors || 0} />
              <SummaryRow label="Total tokens" value={result.tokens?.length || 0} />
              <SummaryRow label="Lexing time" value={result.summary?.lexingTimeMs != null ? `${result.summary.lexingTimeMs.toFixed(3)} ms` : '—'} />
              <SummaryRow label="Parsing time" value={result.summary?.parsingTimeMs != null ? `${result.summary.parsingTimeMs.toFixed(3)} ms` : '—'} />
            </div>
          )}
          
          {/* Quick Stats */}
          {result && (
            <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '12px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 10, color: 'var(--text-2)' }}>Parser Statistics</div>
              <SummaryRow label="FIRST Sets" value={Object.keys(result.firstSets || {}).length} />
              <SummaryRow label="FOLLOW Sets" value={Object.keys(result.followSets || {}).length} />
              <SummaryRow label="Grammar Rules" value={result.grammar?.length || 0} />
              <SummaryRow label="Parse Steps" value={result.parseTrace?.length || 0} />
              <SummaryRow label="Table Entries" value={result.parsingTableEntries?.length || 0} />
            </div>
          )}
        </div>

        {/* Right Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {!result && !loading && (
            <div style={{ border: '1px dashed var(--border)', borderRadius: 'var(--radius-lg)', padding: '64px 32px', textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>LL(1)</div>
              <div>Upload a .pas file and run the LL(1) predictive parser</div>
              <div style={{ fontSize: 11, marginTop: 12, color: 'var(--text-3)' }}>
                Displays FIRST/FOLLOW sets, parsing table, stack trace, and AST visualization
              </div>
            </div>
          )}

          {loading && (
            <div style={{ textAlign: 'center', padding: 64 }}>
              <Loader size={32} />
              <div style={{ marginTop: 16, color: 'var(--text-2)' }}>Parsing...</div>
            </div>
          )}

          {result && (
            <>
              {/* Token Stream */}
              {result.tokens && result.tokens.length > 0 && (
                <CollapsibleSection title="Token Stream" badge={`${result.tokens.length} tokens`} icon={List}>
                  <DataTable columns={tokenColumns} rows={result.tokens} searchKeys={['lexeme', 'type']} />
                </CollapsibleSection>
              )}

              {/* Grammar */}
              {result.grammar && result.grammar.length > 0 && (
                <CollapsibleSection title="Grammar Productions" badge={`${result.grammar.length} rules`} icon={BookOpen}>
                  <GrammarDisplay grammar={result.grammar} />
                </CollapsibleSection>
              )}

              {/* FIRST Sets */}
              {result.firstSets && Object.keys(result.firstSets).length > 0 && (
                <CollapsibleSection title="FIRST Sets" badge={`${Object.keys(result.firstSets).length} sets`} icon={Hash}>
                  <FirstSetDisplay firstSets={result.firstSets} />
                </CollapsibleSection>
              )}

              {/* FOLLOW Sets */}
              {result.followSets && Object.keys(result.followSets).length > 0 && (
                <CollapsibleSection title="FOLLOW Sets" badge={`${Object.keys(result.followSets).length} sets`} icon={Hash}>
                  <FollowSetDisplay followSets={result.followSets} />
                </CollapsibleSection>
              )}

              {/* Parsing Table */}
              {result.parsingTableEntries && result.parsingTableEntries.length > 0 && (
                <CollapsibleSection title="LL(1) Parsing Table" badge={`${result.parsingTableEntries.length} entries`} icon={Table}>
                  <ParsingTableDisplay entries={result.parsingTableEntries} />
                </CollapsibleSection>
              )}

              {/* Parse Trace */}
              {result.parseTrace && result.parseTrace.length > 0 && (
                <CollapsibleSection title="Parse Stack Trace" badge={`${result.parseTrace.length} steps`} icon={Layers}>
                  <ParseTraceDisplay trace={result.parseTrace} />
                </CollapsibleSection>
              )}

              {/* AST Visualization - Using ASTTree component */}
              {result.ast && result.ast !== "No AST available" && result.ast !== "" && (
                <CollapsibleSection title="Abstract Syntax Tree" badge="Interactive Tree" icon={TreePine}>
                  <ASTTree text={result.ast} />
                </CollapsibleSection>
              )}

              {/* AST Raw Text - Fallback */}
              {result.ast && (
                <CollapsibleSection title="Raw AST Output" badge="Text" icon={Code} defaultOpen={false}>
                  <pre style={{ 
                    fontFamily: 'var(--font-mono)', 
                    fontSize: 11, 
                    lineHeight: 1.6, 
                    margin: 0, 
                    whiteSpace: 'pre-wrap', 
                    maxHeight: 400, 
                    overflowY: 'auto',
                    background: 'var(--bg-0)',
                    padding: '16px',
                    borderRadius: 'var(--radius-sm)'
                  }}>
                    {result.ast}
                  </pre>
                </CollapsibleSection>
              )}

              {/* Errors */}
              {result.errors && result.errors.length > 0 && (
                <CollapsibleSection title="Parser Errors" badge={`${result.errors.length} errors`} icon={AlertCircle}>
                  {result.errors.map((e, i) => (
                    <div key={i} style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: 12, borderBottom: i < result.errors.length - 1 ? '1px solid var(--border)' : 'none', background: 'var(--bg-0)' }}>
                      <span style={{ color: 'var(--text-2)' }}>Line {e.line}, Col {e.column}:</span>
                      <span style={{ color: 'var(--red)', marginLeft: 12 }}>{e.message}</span>
                    </div>
                  ))}
                </CollapsibleSection>
              )}

              {/* Raw Output */}
              <TerminalPanel title="Compiler Raw Output" defaultOpen={false}>
                <pre style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  lineHeight: 1.5,
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  background: '#0a0a0a',
                  color: '#d4d4d4',
                  padding: '16px',
                  borderRadius: 'var(--radius-sm)',
                  maxHeight: 600,
                  overflowY: 'auto'
                }}>
                  {result.rawOutput || 'No raw output available'}
                </pre>
              </TerminalPanel>
            </>
          )}
        </div>
      </div>
    </div>
  );
}