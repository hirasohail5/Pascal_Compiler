// components/ASTTree.jsx
// Parses the text AST from the compiler and renders it as an
// interactive top-down tree with collapsible nodes.
//
// Input format (from C++ backend):
//   Program [example]  (line 2)
//   |-- IdentifierList  (line 2)
//   |   |-- Variable [input]  (line 2)
//   |   \-- Variable [output]  (line 2)
//   \-- Declarations  (line 3)
//       \-- VarDecl  (line 3)

import { useState, useCallback } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

// ─── Colour map per node kind ────────────────────────────────
const KIND_COLOR = {
  Program:         '#5b8af0',
  CompoundStmt:    '#5b8af0',
  SubprogramDecl:  '#5b8af0',
  SubprogramDecls: '#5b8af0',
  SubprogramHead:  '#7c9ef5',
  Declarations:    '#7c9ef5',
  VarDecl:         '#7c9ef5',
  StatementList:   '#8888aa',
  IdentifierList:  '#8888aa',
  ParameterList:   '#8888aa',
  Arguments:       '#8888aa',
  IfStmt:          '#e0b94a',
  WhileStmt:       '#e0b94a',
  AssignStmt:      '#e0b94a',
  ProcedureCall:   '#e07a3a',
  FuncCall:        '#e07a3a',
  BinaryExpr:      '#c97be8',
  UnaryExpr:       '#c97be8',
  Variable:        '#4caf7d',
  ArrayAccess:     '#4caf7d',
  NumberLiteral:   '#4caf7d',
  StandardType:    '#6bd4d4',
  ArrayType:       '#6bd4d4',
  Empty:           '#555',
};

function nodeColor(kind) {
  return KIND_COLOR[kind] || '#b0b8cc';
}

// ─── Parse the flat text into a tree structure ───────────────
// Each line has an indentation prefix that encodes depth.
// We strip  |-- , \-- , |   ,     prefixes and compute depth.
function parseTextAST(text) {
  if (!text || !text.trim()) return null;
  const lines = text.split('\n').filter(l => l.trim());

  // Compute depth of each line by counting prefix chars (groups of 4)
  function lineDepth(line) {
    let i = 0;
    let depth = 0;
    while (i < line.length) {
      const chunk = line.slice(i, i + 4);
      if (chunk === '|   ' || chunk === '    ') { depth++; i += 4; }
      else if (line.slice(i, i + 4) === '|-- ' || line.slice(i, i + 4) === '\\-- ') { depth++; i += 4; break; }
      else break;
    }
    return depth;
  }

  // Strip prefix, extract kind, value, line number
  function parseLine(raw) {
    // Remove tree-drawing characters
    const text = raw.replace(/^[\|\\  \-]+/, '').trim();
    // Match:  Kind [value]  (line N)  or  Kind  (line N)  or just Kind
    const m = text.match(/^(\S+)(?:\s+\[([^\]]*)\])?(?:\s+\(line (\d+)\))?/);
    if (!m) return { kind: text, value: '', line: 0 };
    return { kind: m[1] || text, value: m[2] || '', line: parseInt(m[3]) || 0 };
  }

  const nodes = lines.map((raw, idx) => ({
    id: idx,
    depth: idx === 0 ? 0 : lineDepth(raw),
    ...parseLine(raw),
    children: [],
  }));

  // Build tree using a depth stack
  const root = nodes[0];
  const stack = [root];
  for (let i = 1; i < nodes.length; i++) {
    const node = nodes[i];
    while (stack.length > 1 && stack[stack.length - 1].depth >= node.depth) {
      stack.pop();
    }
    stack[stack.length - 1].children.push(node);
    stack.push(node);
  }
  return root;
}

// ─── Single tree node ────────────────────────────────────────
function TreeNode({ node, isRoot = false }) {
  const [open, setOpen] = useState(true);
  const hasChildren = node.children && node.children.length > 0;
  const color = nodeColor(node.kind);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      position: 'relative',
    }}>
      {/* Node box */}
      <div
        onClick={() => hasChildren && setOpen(o => !o)}
        title={node.line ? `line ${node.line}` : undefined}
        style={{
          display: 'inline-flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '6px 10px',
          borderRadius: 6,
          border: `1.5px solid ${color}`,
          background: `${color}18`,
          cursor: hasChildren ? 'pointer' : 'default',
          transition: 'all 0.15s ease',
          userSelect: 'none',
          minWidth: 90,
          maxWidth: 160,
          position: 'relative',
          zIndex: 1,
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = `${color}30`;
          e.currentTarget.style.borderColor = color;
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = `${color}18`;
          e.currentTarget.style.borderColor = color;
        }}
      >
        {/* Kind label */}
        <span style={{
          fontSize: 11,
          fontWeight: 700,
          color,
          fontFamily: 'var(--font-mono)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: 140,
        }}>
          {node.kind}
        </span>

        {/* Value badge */}
        {node.value && (
          <span style={{
            fontSize: 10,
            color: '#fff',
            background: `${color}55`,
            borderRadius: 3,
            padding: '1px 5px',
            marginTop: 2,
            fontFamily: 'var(--font-mono)',
            maxWidth: 140,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {node.value}
          </span>
        )}

        {/* Collapse indicator */}
        {hasChildren && (
          <span style={{
            position: 'absolute',
            bottom: -8,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--bg-2)',
            border: `1px solid ${color}`,
            borderRadius: '50%',
            width: 14,
            height: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2,
          }}>
            {open
              ? <ChevronDown  size={9} color={color} />
              : <ChevronRight size={9} color={color} />}
          </span>
        )}
      </div>

      {/* Children row */}
      {hasChildren && open && (
        <div style={{ position: 'relative', marginTop: 20, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {/* Vertical line down from parent */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 1.5,
            height: 16,
            background: `${color}60`,
          }} />

          <div style={{ marginTop: 16, display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'nowrap' }}>
            {node.children.map((child, idx) => (
              <div key={child.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                {/* Horizontal line to each child (connector) */}
                {node.children.length > 1 && (
                  <>
                    {/* Top horizontal bar segment */}
                    <div style={{
                      position: 'absolute',
                      top: -8,
                      left: idx === 0 ? '50%' : 0,
                      right: idx === node.children.length - 1 ? '50%' : 0,
                      height: 1.5,
                      background: `${nodeColor(child.kind)}60`,
                    }} />
                    {/* Vertical drop to node */}
                    <div style={{
                      position: 'absolute',
                      top: -8,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: 1.5,
                      height: 8,
                      background: `${nodeColor(child.kind)}60`,
                    }} />
                  </>
                )}
                <TreeNode node={child} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Legend ──────────────────────────────────────────────────
const LEGEND = [
  { label: 'Structure',   color: '#5b8af0', kinds: 'Program, CompoundStmt, SubprogramDecl' },
  { label: 'Declaration', color: '#7c9ef5', kinds: 'Declarations, VarDecl, SubprogramHead' },
  { label: 'Statement',   color: '#e0b94a', kinds: 'IfStmt, WhileStmt, AssignStmt' },
  { label: 'Call',        color: '#e07a3a', kinds: 'ProcedureCall, FuncCall' },
  { label: 'Expression',  color: '#c97be8', kinds: 'BinaryExpr, UnaryExpr' },
  { label: 'Terminal',    color: '#4caf7d', kinds: 'Variable, NumberLiteral, ArrayAccess' },
  { label: 'Type',        color: '#6bd4d4', kinds: 'StandardType, ArrayType' },
];

// ─── Public component ─────────────────────────────────────────
export default function ASTTree({ text }) {
  const root = parseTextAST(text);
  const [zoom, setZoom] = useState(1);

  if (!root) {
    return (
      <div style={{
        padding: '48px 32px', textAlign: 'center',
        color: 'var(--text-3)', fontFamily: 'var(--font-mono)', fontSize: 13,
      }}>
        (no AST produced)
      </div>
    );
  }

  return (
    <div style={{
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      background: 'var(--bg-1)',
      overflow: 'hidden',
    }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 14px', background: 'var(--bg-2)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f57', display: 'inline-block' }} />
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ffbd2e', display: 'inline-block' }} />
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#28ca42', display: 'inline-block' }} />
          <span style={{ fontSize: 11, color: 'var(--text-2)', marginLeft: 6, fontFamily: 'var(--font-mono)' }}>
            abstract syntax tree — click nodes to collapse
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--text-2)' }}>zoom</span>
          {[0.6, 0.8, 1, 1.2].map(z => (
            <button key={z} onClick={() => setZoom(z)} style={{
              padding: '2px 7px', fontSize: 11,
              borderRadius: 4, border: '1px solid var(--border)',
              background: zoom === z ? 'var(--accent)' : 'var(--bg-3)',
              color: zoom === z ? '#fff' : 'var(--text-2)',
              fontFamily: 'var(--font-mono)',
            }}>
              {z === 1 ? '1×' : `${z}×`}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 10, padding: '8px 14px',
        borderBottom: '1px solid var(--border)', background: 'var(--bg-2)',
      }}>
        {LEGEND.map(({ label, color }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: color, display: 'inline-block' }} />
            <span style={{ fontSize: 10, color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Scrollable canvas */}
      <div style={{
        overflowX: 'auto', overflowY: 'auto',
        padding: '32px 24px',
        maxHeight: 600,
        minHeight: 200,
      }}>
        <div style={{
          transform: `scale(${zoom})`,
          transformOrigin: 'top center',
          transition: 'transform 0.2s ease',
          display: 'inline-block',
          minWidth: '100%',
        }}>
          <TreeNode node={root} isRoot />
        </div>
      </div>
    </div>
  );
}
