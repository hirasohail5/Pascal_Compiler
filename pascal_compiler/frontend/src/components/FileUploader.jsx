// components/FileUploader.jsx
import { useRef, useState } from 'react';
import { Upload, FileCode, X } from 'lucide-react';

export default function FileUploader({ file, onChange, accept = '.pas' }) {
  const inputRef  = useRef();
  const [drag, setDrag] = useState(false);

  function handleDrop(e) {
    e.preventDefault(); setDrag(false);
    const f = e.dataTransfer.files[0];
    if (f) onChange(f);
  }

  function handleFile(e) {
    const f = e.target.files[0];
    if (f) onChange(f);
  }

  const area = {
    border: `1.5px dashed ${drag ? 'var(--accent)' : file ? 'var(--green)' : 'var(--border-lit)'}`,
    borderRadius: 'var(--radius-lg)',
    background:   drag ? 'var(--accent-glow)' : file ? 'var(--green-dim)' : 'var(--bg-2)',
    padding: '32px 24px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    gap: 12, cursor: 'pointer', transition: 'all var(--transition)',
    textAlign: 'center', minHeight: 160,
  };

  return (
    <div
      style={area}
      onClick={() => !file && inputRef.current?.click()}
      onDragOver={e => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={handleDrop}
    >
      <input ref={inputRef} type="file" accept={accept} onChange={handleFile} style={{ display:'none' }} />

      {file ? (
        <>
          <FileCode size={28} color="var(--green)" />
          <div>
            <div style={{ fontWeight:600, color:'var(--text-0)', fontSize:14 }}>{file.name}</div>
            <div style={{ fontSize:11, color:'var(--text-2)', fontFamily:'var(--font-mono)', marginTop:2 }}>
              {(file.size / 1024).toFixed(1)} KB
            </div>
          </div>
          <button
            onClick={e => { e.stopPropagation(); onChange(null); }}
            style={{
              display:'flex', alignItems:'center', gap:4, padding:'4px 10px',
              borderRadius:'var(--radius-sm)', border:'1px solid var(--border-lit)',
              background:'var(--bg-3)', color:'var(--text-1)', fontSize:11,
            }}
          >
            <X size={12} /> Change file
          </button>
        </>
      ) : (
        <>
          <Upload size={28} color="var(--text-2)" />
          <div>
            <div style={{ fontWeight:600, color:'var(--text-1)', fontSize:14 }}>
              Drop a <span style={{ fontFamily:'var(--font-mono)', color:'var(--accent)' }}>.pas</span> file here
            </div>
            <div style={{ fontSize:12, color:'var(--text-2)', marginTop:4 }}>or click to browse</div>
          </div>
        </>
      )}
    </div>
  );
}
