import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { minimizeTransactions } from '../utils/settlement';
import { scanItemizedBill } from '../utils/gemini';
import { QRCodeSVG } from 'qrcode.react';

const QuickSplit = () => {
  const fileInputRef = useRef(null);
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
  // include quantity for manual entry
  const [manualItemQty, setManualItemQty] = useState(1);
  const [editingItemIdx, setEditingItemIdx] = useState(null);
  const [editingItem, setEditingItem] = useState({ name: '', price: '' });
  const [editingParticipantIdx, setEditingParticipantIdx] = useState(null);
  const [editingParticipant, setEditingParticipant] = useState({ name: '', upi: '', paid: 0 });

  const handleScan = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsScanning(true);
    try {
      console.log('QuickSplit.handleScan: file selected', file.name);
      const scanned = await scanItemizedBill(file);
      console.log('QuickSplit.handleScan: scanned result', scanned);
      if (scanned && scanned.length > 0) {
        setItems(scanned.map(item => ({ 
          ...item, 
          price: Number(item.price), 
          consumers: [] 
        })));
      } else {
        alert('AI returned no items. Check the browser console for details.');
      }
    } catch (error) {
      console.error("QuickSplit.scan error:", error);
      alert("Failed to read receipt: " + (error?.message || error) + " — try manual entry.");
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

  const startEditParticipant = (idx) => {
    setEditingParticipantIdx(idx);
    const p = participants[idx];
    setEditingParticipant({ name: p.name, upi: p.upi, paid: p.paid });
  };

  const saveEditParticipant = (idx) => {
    const updated = [...participants];
    updated[idx] = { name: editingParticipant.name, upi: editingParticipant.upi, paid: Number(editingParticipant.paid) || 0 };
    setParticipants(updated);
    setEditingParticipantIdx(null);
  };

  const removeParticipant = (name) => {
    if (!window.confirm(`Remove ${name}?`)) return;
    setParticipants(prev => prev.filter(p => p.name !== name));
    setItems(prev => prev.map(it => ({ ...it, consumers: (it.consumers || []).filter(c => c !== name) })));
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

  const selectAllForItem = (idx) => {
    const members = participants.map(p => p.name);
    const item = items[idx];
    const allSelected = (item.consumers || []).length === members.length && members.length > 0;
    const updated = [...items];
    updated[idx] = { ...item, consumers: allSelected ? [] : members };
    setItems(updated);
  };

  const startEditItem = (idx) => {
    setEditingItemIdx(idx);
    const it = items[idx];
    setEditingItem({ name: it.name, price: it.price });
  };

  const saveEditItem = (idx) => {
    const updated = [...items];
    updated[idx] = { ...updated[idx], name: editingItem.name, price: Number(editingItem.price) || 0 };
    setItems(updated);
    setEditingItemIdx(null);
  };

  const deleteItem = (idx) => {
    if (!window.confirm('Delete this item?')) return;
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleCalculate = () => {
    if (items.length === 0) return;
    const balances = {};
    participants.forEach(p => { balances[p.name] = 0; });
    
    items.forEach(item => {
      if (item.consumers.length > 0) {
        const unitPrice = Number(item.price);
        item.consumers.forEach(p => { 
          balances[p] -= unitPrice; 
        });
      }
    });

    participants.forEach(p => {
      balances[p.name] += Number(p.paid);
    });
    
    setResults(minimizeTransactions(balances));
  };

  const dynamicTotal = items.reduce((sum, item) => {
    return sum + (Number(item.price) * item.consumers.length);
  }, 0);

  const totalPaidAtCounter = participants.reduce((sum, p) => sum + (Number(p.paid) || 0), 0);

  return (
    <div style={{ padding: '20px', maxWidth: '500px', margin: 'auto', fontFamily: 'sans-serif' }}>
      <Link to="/" style={{ textDecoration: 'none', color: '#00b894', fontWeight: 'bold' }}>← Back</Link>
      <h2 style={{ color: '#2d3436', marginTop: '10px' }}>⚡ Quick Split</h2>

      {/* Step 1: Participants */}
      <div style={{ background: '#fff', padding: '15px', borderRadius: '15px', border: '1px solid #eee', marginBottom: '20px' }}>
        <p style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 'bold' }}>Step 1: Add Friends</p>
        <div style={{ display: 'flex', gap: '5px', marginBottom: '10px' }}>
          <input placeholder="Name" value={newPersonName} onChange={(e) => setNewPersonName(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }} />
          <button onClick={addParticipant} style={{ padding: '10px 15px', background: '#6c5ce7', color: 'white', border: 'none', borderRadius: '8px' }}>Add</button>
        </div>
      </div>

      {/* Step 2: Payments */}
      <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '15px', marginBottom: '20px' }}>
        <p style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 'bold' }}>Step 2: Who paid at the counter?</p>
        {participants.map((p, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            {editingParticipantIdx === idx ? (
              <>
                <input value={editingParticipant.name} onChange={e => setEditingParticipant({...editingParticipant, name: e.target.value})} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }} />
                <input value={editingParticipant.upi} onChange={e => setEditingParticipant({...editingParticipant, upi: e.target.value})} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }} />
                <input type="number" value={editingParticipant.paid || ''} onChange={e => setEditingParticipant({...editingParticipant, paid: e.target.value})} style={{ width: '110px', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }} />
                <button onClick={() => saveEditParticipant(idx)} style={{ padding: '10px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px' }}>Save</button>
                <button onClick={() => setEditingParticipantIdx(null)} style={{ padding: '10px', borderRadius: '8px' }}>Cancel</button>
              </>
            ) : (
              <>
                <span style={{ flex: 1, fontSize: '14px' }}>{p.name}</span>
                <input type="number" value={p.paid || ''} onChange={(e) => updatePaidAmount(idx, e.target.value)} placeholder="₹ 0" style={{ width: '110px', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }} />
                <button onClick={() => startEditParticipant(idx)} style={{ padding: '10px', borderRadius: '8px' }}>Edit</button>
                <button onClick={() => removeParticipant(p.name)} style={{ padding: '10px', borderRadius: '8px', background: '#fee2e2', border: 'none' }}>Remove</button>
              </>
            )}
          </div>
        ))}
        <div style={{ fontSize: '12px', textAlign: 'right', fontWeight: 'bold', color: Math.abs(totalPaidAtCounter - dynamicTotal) > 1 ? '#e74c3c' : '#27ae60' }}>
          Total Paid: ₹{totalPaidAtCounter.toFixed(2)} / Split Total: ₹{dynamicTotal.toFixed(2)}
        </div>
      </div>

      {/* Step 3: Input Mode */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
        <button onClick={() => setEntryMode('scan')} style={{ flex: 1, padding: '10px', borderRadius: '10px', background: entryMode === 'scan' ? '#6c5ce7' : '#eee', color: entryMode === 'scan' ? 'white' : '#333', border: 'none' }}>Scan Bill</button>
        <button onClick={() => setEntryMode('manual')} style={{ flex: 1, padding: '10px', borderRadius: '10px', background: entryMode === 'manual' ? '#6c5ce7' : '#eee', color: entryMode === 'manual' ? 'white' : '#333', border: 'none' }}>Manual Entry</button>
      </div>

      {entryMode === 'scan' ? (
        <div 
          style={{ border: '2px dashed #6c5ce7', padding: '30px', borderRadius: '15px', textAlign: 'center', background: '#f9f9ff', cursor: 'pointer', position: 'relative' }}
          onClick={() => fileInputRef.current?.click()}
        >
          <h4>{isScanning ? "🤖 AI is reading..." : "📸 Tap to Scan Bill"}</h4>
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onClick={() => { if (fileInputRef.current) fileInputRef.current.value = null; }}
            onChange={handleScan}
            style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
          />
        </div>
      ) : (
        <div style={{ background: '#fff', padding: '15px', borderRadius: '15px', border: '1px solid #eee' }}>
          <div style={{ display: 'flex', gap: '5px' }}>
            <input placeholder="Item" value={manualItem.name} onChange={(e) => setManualItem({...manualItem, name: e.target.value})} style={{ flex: 2, padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }} />
            <input placeholder="Qty" type="number" min={1} value={manualItemQty} onChange={(e) => setManualItemQty(Number(e.target.value) || 1)} style={{ width: '80px', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }} />
            <input placeholder="₹ Price" type="number" value={manualItem.price} onChange={(e) => setManualItem({...manualItem, price: e.target.value})} style={{ width: '120px', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }} />
            <button onClick={() => { if(manualItem.name && manualItem.price) { setItems([...items, { name: manualItem.name, price: Number(manualItem.price), quantity: Number(manualItemQty) || 1, consumers: [] }]); setManualItem({ name: '', price: '' }); setManualItemQty(1); }}} style={{ background: '#00b894', color: 'white', border: 'none', borderRadius: '8px', padding: '0 15px' }}>Add</button>
          </div>
        </div>
      )}

      {/* Step 4: Split Grid */}
      {items.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <h4 style={{ color: '#6c5ce7' }}>Step 3: Who had what?</h4>
          {items.map((item, idx) => (
            <div key={idx} style={{ background: '#fff', padding: '12px', borderRadius: '12px', marginBottom: '10px', border: '1px solid #eee' }}>
              {editingItemIdx === idx ? (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input value={editingItem.name} onChange={e => setEditingItem({...editingItem, name: e.target.value})} style={{ flex: 2, padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }} />
                  <input value={editingItem.price} onChange={e => setEditingItem({...editingItem, price: e.target.value})} style={{ width: '100px', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }} />
                  <button onClick={() => saveEditItem(idx)} style={{ padding: '10px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px' }}>Save</button>
                  <button onClick={() => setEditingItemIdx(null)} style={{ padding: '10px', borderRadius: '8px' }}>Cancel</button>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 'bold' }}>{item.name}</span>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span>₹{Number(item.price)} each</span>
                      <button onClick={() => startEditItem(idx)} style={{ padding: '8px', borderRadius: '8px' }}>Edit</button>
                      <button onClick={() => deleteItem(idx)} style={{ padding: '8px', borderRadius: '8px', background: '#fee2e2', border: 'none' }}>Delete</button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '10px' }}>
                    {participants.map(p => (
                      <button key={p.name} onClick={() => toggleConsumer(idx, p.name)} style={{ fontSize: '11px', padding: '5px 10px', borderRadius: '15px', border: '1px solid #6c5ce7', background: item.consumers.includes(p.name) ? '#6c5ce7' : 'white', color: item.consumers.includes(p.name) ? 'white' : '#6c5ce7' }}>
                        {p.name}
                      </button>
                    ))}
                    <button onClick={() => selectAllForItem(idx)} style={{ fontSize: '11px', padding: '5px 10px', borderRadius: '15px', border: '1px solid #ddd', background: '#f8fafc' }}>Select All</button>
                  </div>
                </>
              )}
            </div>
          ))}
          <button onClick={handleCalculate} style={{ width: '100%', padding: '15px', background: '#00b894', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', marginTop: '10px' }}>Calculate Final Split</button>
        </div>
      )}

      {/* Step 5: Results */}
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