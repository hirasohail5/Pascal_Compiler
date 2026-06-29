// App.jsx
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import Home from './pages/Home';
import Lexer from './pages/Lexer';
import Parser from './pages/Parser';
import LRParser from './pages/LRParser';
import Symbols from './pages/Symbols';
import Compiler from './pages/Compiler';
import Navbar from './components/Navbar';
import LL1Parser from './pages/LL1Parser';
function App() {
  return (
    <Router>
      <div style={{ minHeight: '100vh', background: 'var(--bg-0)' }}>
        <Navbar />
        <main style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 32px' }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/lexer" element={<Lexer />} />
            <Route path="/parser" element={<Parser />} />
            <Route path="/lr-parser" element={<LRParser />} />
            <Route path="/symbols" element={<Symbols />} />
            <Route path="/compiler" element={<Compiler />} />
            <Route path="/ll1-parser" element={<LL1Parser />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}// Add LL1Parser import and route


// Add route


export default App;