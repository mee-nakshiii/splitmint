import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';

// We will build these components in the next step
const Home = () => (
  <div style={{ textAlign: 'center', padding: '50px', fontFamily: 'sans-serif' }}>
    <h1 style={{ color: '#00b894', fontSize: '3rem' }}>SplitMint 🍃</h1>
    <p style={{ fontSize: '1.2rem', color: '#636e72' }}>No login. No friction. Just split.</p>
    
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', marginTop: '40px' }}>
      <Link to="/quick-split">
        <button style={{ 
          padding: '20px 40px', fontSize: '1.1rem', cursor: 'pointer', 
          borderRadius: '12px', border: 'none', background: '#0984e3', color: 'white',
          width: '280px', fontWeight: 'bold' 
        }}>
          ⚡ Quick Split (Instant)
        </button>
      </Link>

      <Link to="/trip-room">
        <button style={{ 
          padding: '20px 40px', fontSize: '1.1rem', cursor: 'pointer', 
          borderRadius: '12px', border: 'none', background: '#6c5ce7', color: 'white',
          width: '280px', fontWeight: 'bold' 
        }}>
          ✈️ Trip Room (Collaborative)
        </button>
      </Link>
    </div>
  </div>
);

// Temporary "Under Construction" views
const QuickSplitPlaceholder = () => (
  <div style={{ padding: '20px', textAlign: 'center' }}>
    <h2>⚡ Quick Split Mode</h2>
    <p>Building this right now...</p>
    <Link to="/">← Back to Home</Link>
  </div>
);

const TripRoomPlaceholder = () => (
  <div style={{ padding: '20px', textAlign: 'center' }}>
    <h2>✈️ Trip Room Mode</h2>
    <p>Saira and Meenakshi are working on this!</p>
    <Link to="/">← Back to Home</Link>
  </div>
);

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/quick-split" element={<QuickSplitPlaceholder />} />
        <Route path="/trip-room" element={<TripRoomPlaceholder />} />
      </Routes>
    </Router>
  );
}

export default App;
