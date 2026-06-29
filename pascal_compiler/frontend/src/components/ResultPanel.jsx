// components/ResultPanel.jsx
import { useState } from 'react';
import { Copy, Check, ChevronDown, ChevronRight } from 'lucide-react';

export function TerminalPanel({ title, children, defaultOpen = true }) {
  const [open, setOpen]   = useState(defaultOpen);
  const [copied, setCopy] = useState(false);
  const text = typeof children === 'string' ? children : '';

  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopy(true); setTimeout(() => setCopy(false), 1500);
    });
  }

  return (
    <div style={{
      border:'1px solid var(--border)', borderRadius:'var(--radius)',
      background:'var(--bg-1)', overflow:'hidden',
    }}>
      {/* Header bar */}
      <div style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'8px 14px', background:'var(--bg-2)',
        borderBottom: open ? '1px solid var(--border)' : 'none',
        cursor:'pointer', userSelect:'none',
      }} onClick={() => setOpen(o => !o)}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          {/* Traffic lights */}
          <span style={{ width:10, height:10, borderRadius:'50%', background:'#ff5f57', display:'inline-block' }} />
          <span style={{ width:10, height:10, borderRadius:'50%', background:'#ffbd2e', display:'inline-block' }} />
          <span style={{ width:10, height:10, borderRadius:'50%', background:'#28ca42', display:'inline-block' }} />
          <span style={{ fontSize:11, color:'var(--text-2)', marginLeft:6, fontFamily:'var(--font-mono)' }}>{title}</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          {text && open && (
            <button onClick={e => { e.stopPropagation(); copy(); }}
              style={{ background:'none', border:'none', color:'var(--text-2)', display:'flex', alignItems:'center', gap:4, fontSize:11 }}>
              {copied ? <Check size={12} color="var(--green)" /> : <Copy size={12} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          )}
          {open ? <ChevronDown size={14} color="var(--text-2)" /> : <ChevronRight size={14} color="var(--text-2)" />}
        </div>
      </div>

      {/* Content */}
      {open && (
        <pre style={{
          padding:'16px', margin:0, overflowX:'auto',
          fontFamily:'var(--font-mono)', fontSize:12, lineHeight:1.65,
          color:'var(--text-1)', whiteSpace:'pre-wrap', wordBreak:'break-word',
          maxHeight:480, overflowY:'auto',
        }}>
          {children || <span style={{ color:'var(--text-3)' }}>— empty —</span>}
        </pre>
      )}
    </div>
  );
}

export function SummaryRow({ label, value, color }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
      padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
      <span style={{ color:'var(--text-2)', fontSize:12 }}>{label}</span>
      <span style={{ fontFamily:'var(--font-mono)', fontSize:12, color: color || 'var(--text-0)', fontWeight:500 }}>{value}</span>
    </div>
  );
}
