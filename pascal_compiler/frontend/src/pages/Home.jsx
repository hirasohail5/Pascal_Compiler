// pages/Home.jsx
import { useNavigate } from 'react-router-dom';
import { Terminal, Zap, GitBranch, BookOpen, ArrowRight, Lock } from 'lucide-react';

const FEATURE_CARDS = [
  {
    icon: Terminal, label:'Lexer', color:'var(--accent)',
    desc:'Tokenise Pascal source code. View token types, lexemes, and attributes with line/column tracking.',
    to:'/lexer', cta:'Open Lexer',
  },
  {
    icon: GitBranch, label:'Parser', color:'var(--green)',
    desc:'Recursive descent parsing over the token stream. Produces an annotated Abstract Syntax Tree.',
    to:'/parser', cta:'Open Parser',
  },
  {
    icon: BookOpen, label:'Symbol Table', color:'var(--yellow)',
    desc:'Inspect declared identifiers, their types, scope levels, and source locations.',
    to:'/symbols', cta:'Open Symbol Table', soon:true,
  },
];

const COMING_SOON = [
  'Semantic Analyzer',
  'Intermediate Code Generator',
  'Peephole Optimizer',
  'Code Generator',
];

export default function Home() {
  const nav = useNavigate();

  return (
    <div style={{ animation:'fadeUp 0.4s ease both' }}>

      {/* ── Hero ─────────────────────────────────────────── */}
      <div style={{
        borderRadius:'var(--radius-lg)', border:'1px solid var(--border)',
        background:'var(--bg-1)', padding:'64px 48px',
        marginBottom:32, position:'relative', overflow:'hidden',
      }}>
        {/* Background grid pattern */}
        <div style={{
          position:'absolute', inset:0, opacity:0.035,
          backgroundImage:`repeating-linear-gradient(var(--text-0) 0 1px, transparent 1px 100%),
                           repeating-linear-gradient(90deg, var(--text-0) 0 1px, transparent 1px 100%)`,
          backgroundSize:'32px 32px',
          pointerEvents:'none',
        }} />

        <div style={{ position:'relative' }}>
          <div style={{
            display:'inline-flex', alignItems:'center', gap:8,
            padding:'4px 12px', borderRadius:20,
            background:'var(--accent-glow)', border:'1px solid var(--accent-dim)',
            color:'var(--accent)', fontSize:11, fontFamily:'var(--font-mono)',
            fontWeight:600, letterSpacing:'0.06em', marginBottom:20,
          }}>
            <span style={{ width:5, height:5, borderRadius:'50%', background:'var(--accent)' }} />
            CS-471L · Compiler Construction Lab
          </div>

          <h1 style={{
            fontSize:48, fontWeight:800, lineHeight:1.1, letterSpacing:'-0.02em',
            color:'var(--text-0)', marginBottom:16,
          }}>
            Mini Compiler<br />
            <span style={{ color:'var(--accent)' }}>System</span>
          </h1>

          <p style={{ fontSize:16, color:'var(--text-1)', maxWidth:520, lineHeight:1.7, marginBottom:32 }}>
            Visualise and execute compiler phases from Pascal source code to complete analysis.
            Inspect tokens, syntax trees, and symbol tables in real time.
          </p>

          <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
            <button
              onClick={() => nav('/compiler')}
              style={{
                display:'flex', alignItems:'center', gap:8,
                padding:'12px 24px', borderRadius:'var(--radius)',
                background:'var(--accent)', border:'none', color:'#fff',
                fontFamily:'var(--font-ui)', fontWeight:700, fontSize:14,
                transition:'all var(--transition)',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-dim)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--accent)'}
            >
              <Zap size={16} /> Launch Compiler
            </button>
            <button
              onClick={() => nav('/lexer')}
              style={{
                display:'flex', alignItems:'center', gap:8,
                padding:'12px 24px', borderRadius:'var(--radius)',
                background:'transparent', border:'1px solid var(--border-lit)',
                color:'var(--text-1)', fontFamily:'var(--font-ui)', fontWeight:600, fontSize:14,
                transition:'all var(--transition)',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor='var(--text-1)'; e.currentTarget.style.color='var(--text-0)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border-lit)'; e.currentTarget.style.color='var(--text-1)'; }}
            >
              Explore Modules <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Mini Compiler Feature Card (main) ───────────── */}
      <div style={{
        borderRadius:'var(--radius-lg)', border:'1px solid var(--accent-dim)',
        background:'linear-gradient(135deg, var(--bg-2) 0%, rgba(91,138,240,0.06) 100%)',
        padding:'28px 32px', marginBottom:16,
        display:'flex', alignItems:'center', justifyContent:'space-between', gap:24, flexWrap:'wrap',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          <div style={{
            width:48, height:48, borderRadius:'var(--radius)',
            background:'var(--accent)', display:'flex', alignItems:'center', justifyContent:'center',
          }}>
            <Terminal size={24} color="#fff" />
          </div>
          <div>
            <div style={{ fontWeight:700, fontSize:16, color:'var(--text-0)' }}>Mini Compiler</div>
            <div style={{ fontSize:13, color:'var(--text-2)', marginTop:2 }}>
              Run the complete compiler pipeline — lexer → parser → symbol table — on any Pascal source file.
            </div>
          </div>
        </div>
        <button
          onClick={() => nav('/compiler')}
          style={{
            display:'flex', alignItems:'center', gap:8, padding:'10px 20px',
            borderRadius:'var(--radius)', background:'var(--accent)',
            border:'none', color:'#fff', fontWeight:700, fontSize:13,
            fontFamily:'var(--font-ui)', flexShrink:0, transition:'all var(--transition)',
          }}
          onMouseEnter={e => e.currentTarget.style.background='var(--accent-dim)'}
          onMouseLeave={e => e.currentTarget.style.background='var(--accent)'}
        >
          Open Compiler <ArrowRight size={14} />
        </button>
      </div>

      {/* ── Module Cards ─────────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:12, marginBottom:16 }}>
        {FEATURE_CARDS.map(({ icon: Icon, label, color, desc, to, cta, soon }) => (
          <div key={label} style={{
            borderRadius:'var(--radius-lg)', border:'1px solid var(--border)',
            background:'var(--bg-1)', padding:'24px',
            display:'flex', flexDirection:'column', gap:14,
            transition:'border-color var(--transition)',
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor='var(--border-lit)'}
          onMouseLeave={e => e.currentTarget.style.borderColor='var(--border)'}
          >
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{
                width:36, height:36, borderRadius:'var(--radius-sm)',
                background: color.replace(')', ', 0.15)').replace('var(', 'rgba(').replace('--',''),
                border:`1px solid ${color}`,
                display:'flex', alignItems:'center', justifyContent:'center',
              }}>
                <Icon size={17} color={color} />
              </div>
              <span style={{ fontWeight:700, fontSize:14 }}>{label}</span>
              {soon && (
                <span style={{ fontSize:10, padding:'2px 7px', borderRadius:20,
                  background:'var(--bg-3)', color:'var(--text-2)', border:'1px solid var(--border)',
                  fontFamily:'var(--font-mono)', marginLeft:'auto' }}>
                  partial
                </span>
              )}
            </div>
            <p style={{ fontSize:12, color:'var(--text-2)', lineHeight:1.65, flex:1 }}>{desc}</p>
            <button
              onClick={() => nav(to)}
              style={{
                display:'flex', alignItems:'center', justifyContent:'center', gap:6,
                padding:'8px 0', borderRadius:'var(--radius-sm)',
                background:'var(--bg-3)', border:'1px solid var(--border-lit)',
                color:'var(--text-1)', fontWeight:600, fontSize:12,
                fontFamily:'var(--font-ui)', transition:'all var(--transition)',
              }}
              onMouseEnter={e => { e.currentTarget.style.background='var(--bg-4)'; e.currentTarget.style.color='var(--text-0)'; }}
              onMouseLeave={e => { e.currentTarget.style.background='var(--bg-3)'; e.currentTarget.style.color='var(--text-1)'; }}
            >
              {cta} <ArrowRight size={12} />
            </button>
          </div>
        ))}
      </div>

      {/* ── Coming Soon ──────────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:12 }}>
        {COMING_SOON.map(name => (
          <div key={name} style={{
            borderRadius:'var(--radius)', border:'1px dashed var(--border)',
            background:'var(--bg-1)', padding:'18px 20px',
            display:'flex', alignItems:'center', gap:10, opacity:0.5,
          }}>
            <Lock size={14} color="var(--text-3)" />
            <div>
              <div style={{ fontSize:12, fontWeight:600, color:'var(--text-2)' }}>{name}</div>
              <div style={{ fontSize:10, color:'var(--text-3)', fontFamily:'var(--font-mono)', marginTop:1 }}>coming soon</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
