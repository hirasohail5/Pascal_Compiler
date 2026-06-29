// components/DataTable.jsx
import { useState, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE = 25;

export default function DataTable({ columns, rows, searchKeys }) {
  const [query, setQuery] = useState('');
  const [page,  setPage]  = useState(1);

  const filtered = useMemo(() => {
    if (!query.trim()) return rows;
    const q = query.toLowerCase();
    return rows.filter(row =>
      (searchKeys || columns.map(c => c.key)).some(k =>
        String(row[k] ?? '').toLowerCase().includes(q)
      )
    );
  }, [rows, query, columns, searchKeys]);

  const pages    = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pages);
  const slice    = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const cell = { padding:'8px 12px', borderBottom:'1px solid var(--border)', fontSize:12 };
  const head = { ...cell, background:'var(--bg-2)', color:'var(--text-2)', fontWeight:600,
                  letterSpacing:'0.05em', fontSize:11, textTransform:'uppercase',
                  fontFamily:'var(--font-mono)', position:'sticky', top:0 };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      {/* Search */}
      <div style={{ position:'relative' }}>
        <Search size={13} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-2)' }} />
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setPage(1); }}
          placeholder="Search..."
          style={{
            width:'100%', padding:'7px 12px 7px 30px',
            background:'var(--bg-2)', border:'1px solid var(--border)',
            borderRadius:'var(--radius-sm)', color:'var(--text-0)',
            fontFamily:'var(--font-mono)', fontSize:12, outline:'none',
          }}
        />
      </div>

      {/* Table */}
      <div style={{ overflowX:'auto', borderRadius:'var(--radius)', border:'1px solid var(--border)' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr>
              {columns.map(c => <th key={c.key} style={head}>{c.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {slice.length === 0 ? (
              <tr><td colSpan={columns.length} style={{ ...cell, textAlign:'center', color:'var(--text-2)', padding:24 }}>No results</td></tr>
            ) : slice.map((row, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? 'var(--bg-1)' : 'var(--bg-0)' }}>
                {columns.map(c => (
                  <td key={c.key} style={{ ...cell, fontFamily: c.mono ? 'var(--font-mono)' : 'inherit', color: c.color?.(row[c.key]) || 'var(--text-1)' }}>
                    {c.render ? c.render(row[c.key], row) : row[c.key] ?? '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', fontSize:11, color:'var(--text-2)' }}>
          <span>{filtered.length} rows &nbsp;·&nbsp; page {safePage} of {pages}</span>
          <div style={{ display:'flex', gap:4 }}>
            <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={safePage===1}
              style={{ padding:'4px 8px', background:'var(--bg-3)', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', color:'var(--text-1)', display:'flex', alignItems:'center' }}>
              <ChevronLeft size={13} />
            </button>
            <button onClick={() => setPage(p => Math.min(pages, p+1))} disabled={safePage===pages}
              style={{ padding:'4px 8px', background:'var(--bg-3)', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', color:'var(--text-1)', display:'flex', alignItems:'center' }}>
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
