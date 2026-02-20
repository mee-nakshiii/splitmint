import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { minimizeTransactions } from '../utils/settlement';
import { scanBill } from '../utils/gemini';
import { QRCodeSVG } from 'qrcode.react';

const QuickSplit = () => {
  const [amount, setAmount] = useState('');
  const [names, setNames] = useState(['Meenakshi', 'Saira']);
  const [results, setResults] = useState([]);
  const [isScanning, setIsScanning] = useState(false);

  const addPerson = () => {
    setNames([...names, '']);
  };

  const handleScan = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsScanning(true);
    try {
      const detectedAmount = await scanBill(file);
      if (detectedAmount) {
        const cleanAmount = detectedAmount.replace(/[^0-9.]/g, '');
        setAmount(cleanAmount);
      }
    } catch (error) {
      console.error("Scanning failed", error);
      alert("Gemini couldn't read the bill. Please enter manually.");
    }
    setIsScanning(false);
  };

  const handleCalculate = () => {
    if (!amount || names.some(n => n === '')) {
      alert("Please enter a total amount and all names.");
      return;
    }

    const total = parseFloat(amount);
    const share = total / names.length;
    const balances = {};

    names.forEach((name, i) => {
      balances[name] = i === 0 ? total - share : -share;
    });

    const settlements = minimizeTransactions(balances);
    setResults(settlements);
  };

  return (
    <div style={{ 
      padding: '40px 20px', 
      maxWidth: '600px', 
      margin: 'auto', 
      fontFamily: '"Inter", sans-serif',
      backgroundColor: '#fff',
      minHeight: '100vh'
    }}>
      <Link to="/" style={{ 
        textDecoration: 'none', 
        color: '#00b894', 
        fontWeight: '600',
        display: 'flex',
        alignItems: 'center',
        gap: '5px',
        marginBottom: '20px'
      }}>
        ← Back to Home
      </Link>

      <h2 style={{ fontSize: '2rem', color: '#2d3436', marginBottom: '10px' }}>⚡ Quick Split</h2>
      <p style={{ color: '#636e72', marginBottom: '30px' }}>One-time bills, instant settlements.</p>

      <div style={{ 
        border: '2px dashed #00b894', 
        padding: '30px', 
        borderRadius: '16px', 
        marginBottom: '30px',
        textAlign: 'center',
        backgroundColor: '#f0fff4'
      }}>
        <p style={{ margin: '0 0 15px 0', fontWeight: 'bold', color: '#00b894' }}>
          {isScanning ? "🤖 Gemini is reading your bill..." : "📸 Auto-fill with AI Scan"}
        </p>
        <input 
          type="file" 
          accept="image/*" 
          onChange={handleScan} 
          disabled={isScanning} 
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <label style={{ fontWeight: '600', color: '#2d3436' }}>Total Bill Amount (₹)</label>
          <input 
            type="number" 
            placeholder="0.00" 
            value={amount} 
            onChange={(e) => setAmount(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '15px', 
              marginTop: '8px', 
              borderRadius: '12px', 
              border: '1px solid #dfe6e9',
              fontSize: '1.1rem',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div>
          <label style={{ fontWeight: '600', color: '#2d3436' }}>Participants</label>
          <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {names.map((name, i) => (
              <div key={i} style={{ display: 'flex', gap: '10px' }}>
                <input 
                  placeholder={i === 0 ? "Payer (e.g. Meenakshi)" : "Friend's name"}
                  value={name}
                  onChange={(e) => {
                    const newNames = [...names];
                    newNames[i] = e.target.value;
                    setNames(newNames);
                  }}
                  style={{ 
                    flex: 1, 
                    padding: '12px', 
                    borderRadius: '10px', 
                    border: '1px solid #dfe6e9'
                  }}
                />
                {i === 0 && (
                  <span style={{ 
                    backgroundColor: '#00b894', 
                    color: 'white', 
                    padding: '8px 12px', 
                    borderRadius: '8px', 
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    PAYER
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        <button onClick={addPerson} style={{ 
          background: 'none', 
          border: '2px dashed #b2bec3', 
          padding: '12px', 
          width: '100%', 
          cursor: 'pointer', 
          borderRadius: '12px', 
          color: '#636e72',
          fontWeight: '600'
        }}>
          + Add Friend
        </button>

        <button onClick={handleCalculate} style={{ 
          width: '100%', 
          padding: '18px', 
          background: '#00b894', 
          color: 'white', 
          border: 'none', 
          borderRadius: '14px', 
          fontWeight: 'bold', 
          fontSize: '1.1rem', 
          cursor: 'pointer'
        }}>
          Calculate Split
        </button>
      </div>

      {results.length > 0 && (
        <div style={{ marginTop: '40px' }}>
          <h3 style={{ color: '#2d3436', marginBottom: '20px' }}>Settlements</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {results.map((res, i) => (
              <div key={i} style={{ 
                padding: '25px', 
                background: '#f8f9fa', 
                borderRadius: '20px', 
                textAlign: 'center', 
                border: '1px solid #eee'
              }}>
                <p style={{ fontSize: '1rem', color: '#2d3436', margin: '0' }}>
                  <span style={{ fontWeight: 'bold', color: '#d63031' }}>{res.from}</span> pays <span style={{ fontWeight: 'bold', color: '#00b894' }}>{res.to}</span>
                </p>
                <h2 style={{ fontSize: '2rem', color: '#2d3436', margin: '15px 0' }}>₹{res.amount}</h2>
                
                <div style={{ 
                  marginTop: '15px', 
                  background: 'white', 
                  padding: '20px', 
                  display: 'inline-block', 
                  borderRadius: '16px',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.05)'
                }}>
                  <QRCodeSVG 
                    value={`upi://pay?pa=meenakshi@upi&pn=${res.to}&am=${res.amount}&cu=INR`} 
                    size={160} 
                  />
                  <p style={{ fontSize: '0.75rem', color: '#b2bec3', marginTop: '10px' }}>
                    Scan to pay via UPI
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default QuickSplit;