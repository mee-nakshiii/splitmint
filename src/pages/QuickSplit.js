import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { minimizeTransactions } from '../utils/settlement';
import { scanItemizedBill } from '../utils/gemini';
import { QRCodeSVG } from 'qrcode.react';

const QuickSplit = () => {
  const [participants, setParticipants] = useState([
    { name: 'Meenakshi', upi: 'meenakshi@upi', paid: 0 },
    { name: 'Saira', upi: 'saira@upi', paid: 0 }
  ]);
  const [newPersonName, setNewPersonName] = useState('');
  const [newPersonUpi, setNewPersonUpi] = useState('');
  const [items, setItems] = useState([]); 
  const [isScanning, setIsScanning] = useState(false);
  const [results, setResults] = useState([]);
  const [entryMode, setEntryMode] = useState('scan');
  const [manualItem, setManualItem] = useState({ name: '', price: '' });

  const handleScan = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsScanning(true);
    try {
      const scanned = await scanItemizedBill(file);
      if (scanned && scanned.length > 0) {
        setItems(scanned.map(item => ({ ...item, price: Number(item.price), consumers: [] })));
      }
    } catch (error) {
      console.error("Scan error:", error);
    } finally {
      setIsScanning(false);
    }
  };

  const addParticipant = () => {
    if (!newPersonName.trim()) return;
    const upi = newPersonUpi.trim() || `${newPersonName.toLowerCase()}@upi`;
    setParticipants([...participants, { name: newPersonName, upi: upi, paid: 0 }]);
    setNewPersonName('');
    setNewPersonUpi('');
  };

  const updatePaidAmount = (index, amount) => {
    const updated = [...participants];
    updated[index].paid = Number(amount) || 0;
    setParticipants(updated);
  };

  const toggleConsumer = (itemIdx, personName) => {
    const updatedItems = [...items];
    const item = updatedItems[itemIdx];
    if (item.consumers.includes(personName)) {
      item.consumers = item.consumers.filter(p => p !== personName);
    } else {
      item.consumers.push(personName);
    }
    setItems(updatedItems);
  };

  const handleCalculate = () => {
    if (items.length === 0) return;
    const balances = {};
    participants.forEach(p => { balances[p.name] = 0; });
    
    // Logic: Each consumer adds the unit price to the total bill
    items.forEach(item => {
      if (item.consumers.length > 0) {
        const unitPrice = Number(item.price);
        item.consumers.forEach(p => { 
          // Each person pays the full price of 1 unit
          balances[p] -= unitPrice; 
        });
      }
    });

    participants.forEach(p => {
      balances[p.name] += Number(p.paid);
    });
    
    setResults(minimizeTransactions(balances));
  };

  // Logic Update: Grand total scales by the number of consumers per item
  const dynamicTotal = items.reduce((sum, item) => {
    return sum + (Number(item.price) * item.consumers.length);
  }, 0);

  const totalPaidAtCounter = participants.reduce((sum, p) => sum + (Number(p.paid) || 0), 0);

  return (
    <div style={{ padding: '20px', maxWidth: '500px', margin: 'auto', fontFamily: 'sans-serif' }}>
      <Link to="/" style={{ textDecoration: 'none', color: '#00b894', fontWeight: 'bold' }}>← Back</Link>
      <h2 style={{ color: '#2d3436', marginTop: '10px' }}>⚡ Quantity-Based Split</h2>

      <div style={{ background: '#fff', padding: '15px', borderRadius: '15px', border: '1px solid #eee', marginBottom: '20px' }}>
        <p style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 'bold' }}>Step 1: Friends</p>
        <div style={{ display: 'flex', gap: '5px', marginBottom: '10px' }}>
          <input placeholder="Name" value={newPersonName} onChange={(e) => setNewPersonName(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }} />
          <button onClick={addParticipant} style={{ padding: '10px 15px', background: '#6c5ce7', color: 'white', border: 'none', borderRadius: '8px' }}>Add</button>
        </div>
      </div>

      <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '15px', marginBottom: '20px' }}>
        <p style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 'bold' }}>Step 2: Payment at Counter</p>
        {participants.map((p, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <span style={{ flex: 1, fontSize: '14px' }}>{p.name}:</span>
            <input type="number" value={p.paid || ''} onChange={(e) => updatePaidAmount(idx, e.target.value)} placeholder="₹ 0" style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }} />
          </div>
        ))}
        <div style={{ fontSize: '12px', textAlign: 'right', fontWeight: 'bold', color: Math.abs(totalPaidAtCounter - dynamicTotal) > 1 ? '#e74c3c' : '#27ae60' }}>
          Total Paid: ₹{totalPaidAtCounter.toFixed(2)} / New Bill Total: ₹{dynamicTotal.toFixed(2)}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
        <button onClick={() => setEntryMode('scan')} style={{ flex: 1, padding: '10px', borderRadius: '10px', background: entryMode === 'scan' ? '#6c5ce7' : '#eee', color: entryMode === 'scan' ? 'white' : '#333', border: 'none' }}>Scan</button>
        <button onClick={() => setEntryMode('manual')} style={{ flex: 1, padding: '10px', borderRadius: '10px', background: entryMode === 'manual' ? '#6c5ce7' : '#eee', color: entryMode === 'manual' ? 'white' : '#333', border: 'none' }}>Manual</button>
      </div>

      {entryMode === 'scan' ? (
        <div style={{ border: '2px dashed #6c5ce7', padding: '25px', borderRadius: '15px', textAlign: 'center', background: '#f9f9ff' }}>
          <h4>{isScanning ? "🤖 Reading..." : "📸 Upload Receipt"}</h4>
          <input type="file" accept="image/*" onChange={handleScan} />
        </div>
      ) : (
        <div style={{ background: '#fff', padding: '15px', borderRadius: '15px', border: '1px solid #eee' }}>
          <div style={{ display: 'flex', gap: '5px' }}>
            <input placeholder="Item" value={manualItem.name} onChange={(e) => setManualItem({...manualItem, name: e.target.value})} style={{ flex: 2, padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }} />
            <input placeholder="₹ Price" type="number" value={manualItem.price} onChange={(e) => setManualItem({...manualItem, price: e.target.value})} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }} />
            <button onClick={() => { if(manualItem.name && manualItem.price) { setItems([...items, { name: manualItem.name, price: Number(manualItem.price), consumers: [] }]); setManualItem({ name: '', price: '' }); }}} style={{ background: '#00b894', color: 'white', border: 'none', borderRadius: '8px', padding: '0 15px' }}>Add</button>
          </div>
        </div>
      )}

      {items.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <h4 style={{ color: '#6c5ce7' }}>Step 3: Tick per unit</h4>
          {items.map((item, idx) => (
            <div key={idx} style={{ background: '#fff', padding: '12px', borderRadius: '12px', marginBottom: '10px', border: '1px solid #eee' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 'bold' }}>{item.name}</span>
                <span>₹{Number(item.price)}/ea</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '10px' }}>
                {participants.map(p => (
                  <button key={p.name} onClick={() => toggleConsumer(idx, p.name)} style={{ fontSize: '11px', padding: '5px 10px', borderRadius: '15px', border: '1px solid #6c5ce7', background: item.consumers.includes(p.name) ? '#6c5ce7' : 'white', color: item.consumers.includes(p.name) ? 'white' : '#6c5ce7' }}>
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <button onClick={handleCalculate} style={{ width: '100%', padding: '15px', background: '#00b894', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', marginTop: '10px' }}>Calculate (Qty x Price)</button>
        </div>
      )}

      {results.map((res, i) => (
        <div key={i} style={{ marginTop: '20px', padding: '20px', background: '#2d3436', color: 'white', borderRadius: '20px', textAlign: 'center' }}>
          <p>{res.from} owes {res.to}</p>
          <h2 style={{ color: '#00b894', margin: '5px 0' }}>₹{Number(res.amount).toFixed(2)}</h2>
          <div style={{ background: 'white', padding: '10px', display: 'inline-block', borderRadius: '10px', marginTop: '10px' }}>
            <QRCodeSVG value={`upi://pay?pa=${participants.find(p => p.name === res.to)?.upi}&am=${Number(res.amount).toFixed(2)}`} size={100} />
          </div>
        </div>
      ))}
    </div>
  );
};

export default QuickSplit;