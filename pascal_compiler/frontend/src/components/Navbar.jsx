// components/Navbar.jsx
import { NavLink } from 'react-router-dom';
import { Home, FileCode, Workflow, Table2, Layers, Code2, GitBranch, Hash } from 'lucide-react';

export default function Navbar() {
  const linkStyle = ({ isActive }) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 14px',
    borderRadius: 'var(--radius-sm)',
    background: isActive ? 'var(--accent-glow)' : 'transparent',
    color: isActive ? 'var(--accent)' : 'var(--text-2)',
    fontSize: 13,
    fontWeight: 500,
    transition: 'all var(--transition)',
  });

  return (
    <nav style={{
      background: 'var(--bg-1)',
      borderBottom: '1px solid var(--border)',
      padding: '0 32px',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        maxWidth: 1400,
        margin: '0 auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 24 }}>
          <Code2 size={20} color="var(--accent)" />
          <span style={{ fontWeight: 700, fontSize: 16 }}>Pascal<span style={{ color: 'var(--accent)' }}>Compiler</span></span>
        </div>
        
        <div style={{ display: 'flex', gap: 4 }}>
          <NavLink to="/" style={linkStyle} end>
            <Home size={14} /> Home
          </NavLink>
          
          <NavLink to="/lexer" style={linkStyle}>
            <FileCode size={14} /> Lexer
          </NavLink>
          
          {/* Recursive Descent Parser */}
          <NavLink to="/parser" style={linkStyle}>
            <Workflow size={14} /> RD Parser
          </NavLink>
          
          {/* LL(1) Predictive Parser */}
          <NavLink to="/ll1-parser" style={linkStyle}>
            <Hash size={14} /> LL(1) Parser
          </NavLink>
          
          {/* LALR(1) Parser */}
          <NavLink to="/lr-parser" style={linkStyle}>
            <GitBranch size={14} /> LALR(1)
          </NavLink>
          
          <NavLink to="/symbols" style={linkStyle}>
            <Table2 size={14} /> Symbols
          </NavLink>
          
          <NavLink to="/compiler" style={linkStyle}>
            <Layers size={14} /> Compiler
          </NavLink>
        </div>
      </div>
    </nav>
  );
}