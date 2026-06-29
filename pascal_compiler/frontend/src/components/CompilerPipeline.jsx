// components/CompilerPipeline.jsx
import { CheckCircle, Circle, XCircle } from 'lucide-react';
import { StatusBadge } from './StatusBadge';

const PHASES = [
  { id: 'upload',  label: 'Source Upload',    desc: 'Pascal source file received' },
  { id: 'lex',     label: 'Lexical Analysis', desc: 'Tokenising source characters' },
  { id: 'parse',   label: 'RD Parser',        desc: 'Recursive Descent — builds AST' },
  { id: 'll1',     label: 'LL(1) Parser',     desc: 'Predictive top-down parsing' },
  { id: 'lr',      label: 'LALR(1) Parser',   desc: 'Shift-reduce bottom-up parsing' },
  { id: 'symbols', label: 'Symbol Table',     desc: 'Resolving identifiers & scopes' },
  { id: 'output',  label: 'Output',           desc: 'Compilation complete' },
];

function PhaseIcon({ status }) {
  const s = 16;
  if (status === 'done')    return <CheckCircle size={s} color="var(--green)" />;
  if (status === 'failed')  return <XCircle     size={s} color="var(--red)"   />;
  if (status === 'running') return (
    <span style={{ display:'inline-block', width:s, height:s,
      border:'2px solid var(--border-lit)', borderTopColor:'var(--yellow)',
      borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
  );
  return <Circle size={s} color="var(--text-3)" />;
}

export default function CompilerPipeline({ phases = {} }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
      {PHASES.map((ph, i) => {
        const status = phases[ph.id] || 'pending';
        const isLast = i === PHASES.length - 1;

        return (
          <div key={ph.id} style={{ display:'flex', gap:0 }}>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', width:32, flexShrink:0 }}>
              <div style={{
                width:28, height:28, borderRadius:'50%', flexShrink:0,
                background: status==='done'    ? 'var(--green-dim)'  :
                            status==='failed'  ? 'var(--red-dim)'    :
                            status==='running' ? 'var(--yellow-dim)' : 'var(--bg-3)',
                border:`1.5px solid ${
                            status==='done'    ? 'var(--green)'  :
                            status==='failed'  ? 'var(--red)'    :
                            status==='running' ? 'var(--yellow)' : 'var(--border)'}`,
                display:'flex', alignItems:'center', justifyContent:'center',
                transition:'all 0.3s ease',
              }}>
                <PhaseIcon status={status} />
              </div>
              {!isLast && (
                <div style={{
                  width:1.5, flex:1, minHeight:24,
                  background: status==='done' ? 'var(--green)' : 'var(--border)',
                  opacity:0.5, transition:'background 0.3s ease',
                }} />
              )}
            </div>

            <div style={{ paddingLeft:12, paddingBottom:isLast?0:20, paddingTop:4, flex:1 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontWeight:600, fontSize:13, color:status==='pending'?'var(--text-2)':'var(--text-0)' }}>
                  {ph.label}
                </span>
                <StatusBadge status={status} />
              </div>
              <div style={{ fontSize:11, color:'var(--text-2)', marginTop:2 }}>{ph.desc}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}