import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';

// Importing the pages we created
import QuickSplit from './pages/QuickSplit';

// Landing Page Component
const Home = () => (
  <div style={{ 
    textAlign: 'center', 
    padding: '50px 20px', 
    fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
    backgroundColor: '#f9f9f9',
    minHeight: '100vh'
  }}>
    <h1 style={{ color: '#00b894', fontSize: '3.5rem', marginBottom: '10px' }}>SplitMint 🍃</h1>
    <p style={{ fontSize: '1.2rem', color: '#636e72', marginBottom: '40px' }}>
      Simplified expense sharing for Meenakshi & Saira's Hackathon!
    </p>
    
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      gap: '20px' 
    }}>
      {/* Quick Split Button */}
      <Link to="/quick-split" style={{ textDecoration: 'none' }}>
        <div style={{ 
          padding: '20px 40px', 
          fontSize: '1.2rem', 
          cursor: 'pointer', 
          borderRadius: '15px', 
          background: '#0984e3', 
          color: 'white',
          width: '300px', 
          fontWeight: 'bold',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          transition: 'transform 0.2s'
        }}>
          ⚡ Quick Split
          <div style={{ fontSize: '0.8rem', fontWeight: 'normal', marginTop: '5px' }}>Instant math for one-time bills</div>
        </div>
      </Link>

      {/* Trip Room Button */}
      <Link to="/trip-room" style={{ textDecoration: 'none' }}>
        <div style={{ 
          padding: '20px 40px', 
          fontSize: '1.2rem', 
          cursor: 'pointer', 
          borderRadius: '15px', 
          background: '#6c5ce7', 
          color: 'white',
          width: '300px', 
          fontWeight: 'bold',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          transition: 'transform 0.2s'
        }}>
          ✈️ Trip Room
          <div style={{ fontSize: '0.8rem', fontWeight: 'normal', marginTop: '5px' }}>Collaborative group expenses</div>
        </div>
      </Link>
    </div>
    
    <footer style={{ marginTop: '60px', color: '#b2bec3', fontSize: '0.9rem' }}>
      Built with React & Firebase
    </footer>
  </div>
);

// Placeholder for Trip Room while Saira finishes setup
const TripRoomPlaceholder = () => (
  <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'sans-serif' }}>
    <h2>✈️ Trip Room Mode</h2>
    <div style={{ 
      padding: '20px', 
      backgroundColor: '#eee', 
      borderRadius: '10px', 
      display: 'inline-block',
      marginTop: '20px' 
    }}>
      <p>Waiting for Saira's <code>npm install</code> to finish! 🛠️</p>
    </div>
    <br /><br />
    <Link to="/" style={{ color: '#0984e3' }}>← Back to Home</Link>
  </div>
);

function App() {
  return (
    <Router>
      <Routes>
        {/* Main Route */}
        <Route path="/" element={<Home />} />
        
        {/* Quick Split Route */}
        <Route path="/quick-split" element={<QuickSplit />} />
        
        {/* Trip Room Route */}
        <Route path="/trip-room" element={<TripRoomPlaceholder />} />
      </Routes>
    </Router>
  );
}

export default App;