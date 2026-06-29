// components/StatusBadge.jsx
export function StatusBadge({ status }) {
  const map = {
    pending:   { color:'var(--text-2)',  bg:'var(--bg-3)',        label:'Pending'   },
    running:   { color:'var(--yellow)',  bg:'var(--yellow-dim)',  label:'Running'   },
    done:      { color:'var(--green)',   bg:'var(--green-dim)',   label:'Complete'  },
    success:   { color:'var(--green)',   bg:'var(--green-dim)',   label:'Success'   },
    failed:    { color:'var(--red)',     bg:'var(--red-dim)',     label:'Failed'    },
    error:     { color:'var(--red)',     bg:'var(--red-dim)',     label:'Error'     },
    soon:      { color:'var(--text-2)',  bg:'var(--bg-3)',        label:'Coming Soon'},
  };
  const s = map[status] || map.pending;
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:5,
      padding:'2px 8px', borderRadius:20,
      background: s.bg, color: s.color,
      fontSize:11, fontWeight:600, letterSpacing:'0.03em',
      fontFamily:'var(--font-mono)',
    }}>
      <span style={{
        width:5, height:5, borderRadius:'50%', background:'currentColor',
        animation: status === 'running' ? 'pulse 1.2s infinite' : 'none',
      }} />
      {s.label}
    </span>
  );
}

// components/Loader.jsx
export function Loader({ size = 18 }) {
  return (
    <span style={{
      display:'inline-block', width:size, height:size,
      border:`2px solid var(--border-lit)`,
      borderTopColor:'var(--accent)',
      borderRadius:'50%',
      animation:'spin 0.7s linear infinite',
      flexShrink:0,
    }} />
  );
}

// components/ErrorAlert.jsx
import { AlertTriangle, X } from 'lucide-react';
export function ErrorAlert({ message, onClose }) {
  if (!message) return null;
  return (
    <div style={{
      display:'flex', alignItems:'flex-start', gap:10,
      padding:'12px 16px', borderRadius:'var(--radius)',
      background:'var(--red-dim)', border:'1px solid var(--red)',
      color:'var(--red)', fontSize:13,
    }}>
      <AlertTriangle size={15} style={{ flexShrink:0, marginTop:2 }} />
      <span style={{ flex:1 }}>{message}</span>
      {onClose && (
        <button onClick={onClose} style={{ background:'none', border:'none', color:'inherit', padding:0 }}>
          <X size={14} />
        </button>
      )}
    </div>
  );
}
