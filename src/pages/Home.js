import React from 'react';
import { Link } from 'react-router-dom';

const Home = () => (
  <div style={{ 
    textAlign: 'center', 
    padding: '80px 20px', 
    fontFamily: '"Inter", sans-serif'
  }}>
    <h1 style={{ color: '#00b894', fontSize: '3.5rem', marginBottom: '10px' }}>SplitMint 🍃</h1>
    <p style={{ fontSize: '1.2rem', color: '#636e72', marginBottom: '50px' }}>
      Smart expense sharing for your next big adventure.
    </p>
    
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      gap: '20px' 
    }}>
      <Link to="/quick-split" style={{ textDecoration: 'none' }}>
        <button style={{ 
          padding: '20px 40px', 
          fontSize: '1.1rem', 
          cursor: 'pointer', 
          borderRadius: '15px', 
          border: 'none', 
          background: '#0984e3', 
          color: 'white',
          width: '320px', 
          fontWeight: 'bold',
          boxShadow: '0 4px 15px rgba(9, 132, 227, 0.3)'
        }}>
          ⚡ Quick Split
          <div style={{ fontSize: '0.8rem', fontWeight: '400', marginTop: '5px' }}>Instant AI Bill Scanning</div>
        </button>
      </Link>

      <Link to="/trip-room" style={{ textDecoration: 'none' }}>
        <button style={{ 
          padding: '20px 40px', 
          fontSize: '1.1rem', 
          cursor: 'pointer', 
          borderRadius: '15px', 
          border: 'none', 
          background: '#6c5ce7', 
          color: 'white',
          width: '320px', 
          fontWeight: 'bold',
          boxShadow: '0 4px 15px rgba(108, 92, 231, 0.3)'
        }}>
          ✈️ Trip Room
          <div style={{ fontSize: '0.8rem', fontWeight: '400', marginTop: '5px' }}>Collaborative Trip Ledger</div>
        </button>
      </Link>
    </div>
  </div>
);

export default Home;