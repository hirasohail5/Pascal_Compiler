// layouts/MainLayout.jsx
import Navbar from '../components/Navbar';

export default function MainLayout({ children }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', minHeight:'100vh' }}>
      <Navbar />
      <main style={{ flex:1, padding:'32px 24px', maxWidth:1200, width:'100%', margin:'0 auto' }}>
        {children}
      </main>
      <footer style={{
        borderTop:'1px solid var(--border)', padding:'14px 24px',
        display:'flex', justifyContent:'center',
        fontSize:11, color:'var(--text-3)', fontFamily:'var(--font-mono)',
      }}>
        CS-471L Pascal Subset Mini Compiler &nbsp;·&nbsp; UET Lahore &nbsp;·&nbsp; Spring 2026
      </footer>
    </div>
  );
}
