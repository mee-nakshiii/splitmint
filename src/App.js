import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';

// Importing the components you and Saira have built
import Home from './pages/Home';
import QuickSplit from './pages/QuickSplit';
import TripRoom from './pages/TripRoom';

// Navbar for easy navigation between your AI and Database tools
const Navbar = () => (
  <nav style={{ 
    padding: '15px 20px', 
    backgroundColor: '#fff', 
    borderBottom: '1px solid #eee',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'sticky',
    top: 0,
    zIndex: 1000
  }}>
    <Link to="/" style={{ textDecoration: 'none', color: '#00b894', fontWeight: 'bold', fontSize: '1.2rem' }}>
      SplitMint 🍃
    </Link>
    <div style={{ display: 'flex', gap: '20px' }}>
      <Link to="/quick-split" style={{ textDecoration: 'none', color: '#636e72', fontSize: '0.9rem', fontWeight: '500' }}>Quick Split</Link>
      <Link to="/trip-room" style={{ textDecoration: 'none', color: '#636e72', fontSize: '0.9rem', fontWeight: '500' }}>Trip Room</Link>
    </div>
  </nav>
);

function App() {
  return (
    <Router>
      <div style={{ backgroundColor: '#f9f9f9', minHeight: '100vh' }}>
        <Routes>
          {/* Main Landing Page */}
          <Route path="/" element={<Home />} />
          
          {/* Quick Split Route - with your fixed Gemini Scanner logic */}
          <Route path="/quick-split" element={
            <>
              <Navbar />
              <QuickSplit />
            </>
          } />
          
          {/* Trip Room Route - Saira's Firebase Collaborative Mode */}
          <Route path="/trip-room" element={
            <>
              <Navbar />
              <TripRoom />
            </>
          } />
        </Routes>
      </div>
    </Router>
  );
}

export default App;