// pages/LRParser.jsx
import { useState, useEffect } from 'react';
import { Play, ChevronDown, ChevronRight, Table, Hash, List, Layers, Terminal, AlertCircle, Code, BookOpen } from 'lucide-react';
import FileUploader from '../components/FileUploader';
import { TerminalPanel, SummaryRow } from '../components/ResultPanel';
import { ErrorAlert, Loader, StatusBadge } from '../components/StatusBadge';
import DataTable from '../components/DataTable';
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

function ActionTableDisplay({ actionTable }) {
  if (!actionTable || Object.keys(actionTable).length === 0) {
    return <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-3)' }}>No ACTION table available</div>;
  }
  
  const states = Object.keys(actionTable).map(Number).sort((a, b) => a - b);
  const terminals = new Set();
  Object.values(actionTable).forEach(row => {
    Object.keys(row).forEach(term => terminals.add(term));
  });
  const sortedTerminals = Array.from(terminals).sort();
  
  return (
    <div style={{ overflowX: 'auto', maxHeight: 500, overflowY: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, fontFamily: 'var(--font-mono)' }}>
        <thead>
          <tr style={{ background: 'var(--bg-2)', position: 'sticky', top: 0 }}>
            <th style={{ padding: '10px', border: '1px solid var(--border)', textAlign: 'center' }}>State</th>
            {sortedTerminals.map(term => (
              <th key={term} style={{ padding: '10px', border: '1px solid var(--border)', textAlign: 'center' }}>{term}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {states.map(state => (
            <tr key={state}>
              <td style={{ padding: '8px', border: '1px solid var(--border)', textAlign: 'center', fontWeight: 600, background: 'var(--bg-1)' }}>{state}</td>
              {sortedTerminals.map(term => {
                const action = actionTable[state]?.[term];
                let color = 'var(--text-1)';
                let display = action || '-';
                if (action?.startsWith('s')) color = 'var(--accent)';
                else if (action?.startsWith('r')) color = 'var(--green)';
                else if (action === 'acc') color = 'var(--green)';
                return (
                  <td key={term} style={{ padding: '8px', border: '1px solid var(--border)', textAlign: 'center', color, fontWeight: action ? 600 : 400 }}>
                    {display}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GotoTableDisplay({ gotoTable }) {
  if (!gotoTable || Object.keys(gotoTable).length === 0) {
    return <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-3)' }}>No GOTO table available</div>;
  }
  
  const states = Object.keys(gotoTable).map(Number).sort((a, b) => a - b);
  const nonterms = new Set();
  Object.values(gotoTable).forEach(row => {
    Object.keys(row).forEach(nt => nonterms.add(nt));
  });
  const sortedNonterms = Array.from(nonterms).sort();
  
  return (
    <div style={{ overflowX: 'auto', maxHeight: 500, overflowY: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, fontFamily: 'var(--font-mono)' }}>
        <thead>
          <tr style={{ background: 'var(--bg-2)', position: 'sticky', top: 0 }}>
            <th style={{ padding: '10px', border: '1px solid var(--border)', textAlign: 'center' }}>State</th>
            {sortedNonterms.map(nonterm => (
              <th key={nonterm} style={{ padding: '10px', border: '1px solid var(--border)', textAlign: 'center' }}>{nonterm}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {states.map(state => (
            <tr key={state}>
              <td style={{ padding: '8px', border: '1px solid var(--border)', textAlign: 'center', fontWeight: 600, background: 'var(--bg-1)' }}>{state}</td>
              {sortedNonterms.map(nonterm => {
                const gotoState = gotoTable[state]?.[nonterm];
                return (
                  <td key={nonterm} style={{ padding: '8px', border: '1px solid var(--border)', textAlign: 'center' }}>
                    {gotoState !== undefined ? gotoState : '-'}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StackTraceDisplay({ trace }) {
  if (!trace || trace.length === 0) {
    return <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-3)' }}>No stack trace available</div>;
  }
  
  return (
    <div style={{ overflowX: 'auto', maxHeight: 500, overflowY: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, fontFamily: 'var(--font-mono)' }}>
        <thead>
          <tr style={{ background: 'var(--bg-2)', position: 'sticky', top: 0 }}>
            <th style={{ padding: '12px', borderBottom: '2px solid var(--border)', textAlign: 'left' }}>#</th>
            <th style={{ padding: '12px', borderBottom: '2px solid var(--border)', textAlign: 'left' }}>State Stack</th>
            <th style={{ padding: '12px', borderBottom: '2px solid var(--border)', textAlign: 'left' }}>Symbol Stack</th>
            <th style={{ padding: '12px', borderBottom: '2px solid var(--border)', textAlign: 'left' }}>Remaining Input</th>
            <th style={{ padding: '12px', borderBottom: '2px solid var(--border)', textAlign: 'left' }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {trace.map((step, idx) => (
            <tr key={idx} style={{ background: idx % 2 === 0 ? 'var(--bg-0)' : 'var(--bg-1)' }}>
              <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-lit)' }}>{step.step}</td>
              <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-lit)' }}>{step.stateStack}</td>
              <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-lit)' }}>{step.symbolStack}</td>
              <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-lit)', color: 'var(--text-2)' }}>{step.remainingInput}</td>
              <td style={{ 
                padding: '10px 12px', 
                borderBottom: '1px solid var(--border-lit)',
                color: step.action?.includes('shift') ? 'var(--accent)' : 
                       step.action?.includes('reduce') ? 'var(--green)' : 
                       step.action === 'accept' ? 'var(--green)' : 'var(--text-1)',
                fontWeight: 600
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

export default function LRParserPage() {
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
      const res = await api.lrParse(file);
      console.log('API Response:', res.data);
      console.log('First Sets:', res.data.firstSets);
      console.log('Action Table:', res.data.parsingTable?.action);
      console.log('GOTO Table:', res.data.parsingTable?.goto);
      console.log('Stack Trace:', res.data.stackTrace);
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
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>LALR(1) Parser</h1>
        <p style={{ color: 'var(--text-2)', marginTop: 4, fontSize: 13 }}>
          Look-Ahead LR parser with FIRST/FOLLOW sets, ACTION/GOTO tables, and shift-reduce trace
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
            {loading ? <><Loader size={15} /> Parsing...</> : <><Play size={15} /> Run LALR(1) Parser</>}
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
        </div>

        {/* Right Panel - Results */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {!result && !loading && (
            <div style={{ border: '1px dashed var(--border)', borderRadius: 'var(--radius-lg)', padding: '64px 32px', textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>LALR(1)</div>
              <div>Upload a .pas file and run the LALR(1) parser</div>
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

              {/* ACTION Table */}
              {result.parsingTable?.action && Object.keys(result.parsingTable.action).length > 0 && (
                <CollapsibleSection title="ACTION Table" badge="Shift/Reduce" icon={Table}>
                  <ActionTableDisplay actionTable={result.parsingTable.action} />
                </CollapsibleSection>
              )}

              {/* GOTO Table */}
              {result.parsingTable?.goto && Object.keys(result.parsingTable.goto).length > 0 && (
                <CollapsibleSection title="GOTO Table" badge="State Transitions" icon={Table}>
                  <GotoTableDisplay gotoTable={result.parsingTable.goto} />
                </CollapsibleSection>
              )}

              {/* Stack Trace */}
              {result.stackTrace && result.stackTrace.length > 0 && (
                <CollapsibleSection title="Shift-Reduce Stack Trace" badge={`${result.stackTrace.length} steps`} icon={Layers}>
                  <StackTraceDisplay trace={result.stackTrace} />
                </CollapsibleSection>
              )}

              {/* AST */}
              {result.ast && (
                <CollapsibleSection title="Abstract Syntax Tree" badge="AST" icon={Code}>
                  <pre style={{ fontFamily: 'var(--font-mono)', fontSize: 11, lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap', maxHeight: 400, overflowY: 'auto' }}>
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

              {/* Raw Output - Shows exactly like the txt file */}
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