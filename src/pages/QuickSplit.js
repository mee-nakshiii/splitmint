import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { minimizeTransactions } from '../utils/settlement';
// We will use this for the QR code in the next sub-step
import { QRCodeSVG } from 'qrcode.react'; 

const QuickSplit = () => {
  const [amount, setAmount] = useState('');
  const [names, setNames] = useState(['Meenakshi', 'Saira']);
  const [results, setResults] = useState([]);

  // Function to add a new input box for another friend
  const addPerson = () => {
    setNames([...names, '']);
  };

  const handleCalculate = () => {
    if (!amount || names.some(n => n === '')) {
      alert("Please enter an amount and all names!");
      return;
    }
    
    const total = parseFloat(amount);
    const share = total / names.length;
    const balances = {};
    
    // Logic: The first person in the list is the one who paid
    names.forEach((name, index) => {
      balances[name] = index === 0 ? total - share : -share;
    });

    setResults(minimizeTransactions(balances));
  };

  return (
    <div style={{ padding: '20px', maxWidth: '500px', margin: 'auto', fontFamily: 'sans-serif' }}>
      <Link to="/" style={{ textDecoration: 'none', color: '#0984e3' }}>← Back to Home</Link>
      <h2 style={{ color: '#2d3436', marginTop: '20px' }}>⚡ Quick Split</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <label>Total Bill Amount (₹):</label>
        <input 
          type="number" 
          placeholder="0.00" 
          value={amount} 
          onChange={(e) => setAmount(e.target.value)} 
          style={{ width: '100%', padding: '12px', marginTop: '8px', borderRadius: '8px', border: '1px solid #dfe6e9' }}
        />
      </div>

      <label>Who is splitting?</label>
      {names.map((name, i) => (
        <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
          <input 
            placeholder={i === 0 ? "Payer's Name" : "Friend's Name"}
            value={name}
            onChange={(e) => {
              const newNames = [...names];
              newNames[i] = e.target.value;
              setNames(newNames);
            }}
            style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #dfe6e9' }}
          />
          {i === 0 && <span style={{ fontSize: '0.8rem', color: '#00b894' }}>Paid 💳</span>}
        </div>
      ))}

      <button onClick={addPerson} style={{ background: 'none', border: '1px dashed #b2bec3', padding: '10px', width: '100%', cursor: 'pointer', borderRadius: '8px', marginBottom: '20px' }}>
        + Add Another Person
      </button>

      <button onClick={handleCalculate} style={{ width: '100%', padding: '15px', background: '#00b894', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '1rem' }}>
        Calculate & Split
      </button>

      {results.map((res, i) => (
        <div key={i} style={{ marginTop: '20px', padding: '20px', background: '#fff', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', textAlign: 'center' }}>
          <p style={{ fontSize: '1.1rem' }}><b>{res.from}</b> pays <b>{res.to}</b></p>
          <h3 style={{ color: '#d63031', margin: '10px 0' }}>₹{res.amount}</h3>
          
          {/* UPI Payment Button Placeholder */}
          <button style={{ padding: '8px 15px', borderRadius: '20px', border: '1px solid #0984e3', background: 'white', color: '#0984e3', cursor: 'pointer' }}>
            Generate Payment QR
          </button>
        </div>
      ))}
    </div>
  );
};

export default QuickSplit;