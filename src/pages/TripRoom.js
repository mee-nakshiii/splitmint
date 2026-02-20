import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot, updateDoc, arrayUnion, getDoc, setDoc } from "firebase/firestore";
import { minimizeTransactions } from '../utils/settlement';
import { scanItemizedBill } from '../utils/gemini';
import { QRCodeSVG } from 'qrcode.react';

const TripRoom = () => {
  const fileInputRef = useRef(null);
  const [view, setView] = useState('entry');
  const [roomCode, setRoomCode] = useState('');
  const [currentUser, setCurrentUser] = useState(localStorage.getItem('sm_user') || '');
  const [roomData, setRoomData] = useState(null);
  const [activeReceiptId, setActiveReceiptId] = useState(null);
  const [isScanning, setIsScanning] = useState(false);

  // Safety Check: Real-Time Sync
  useEffect(() => {
    if (view === 'dashboard' && roomCode && roomCode.trim() !== "") {
      const unsub = onSnapshot(doc(db, "rooms", roomCode), (d) => {
        if (d.exists()) {
          const data = d.data();
          setRoomData(data);
          if (!activeReceiptId && data.receipts?.length > 0) {
            setActiveReceiptId(data.receipts[0].id);
          }
        }
      });
      return () => unsub();
    }
  }, [view, roomCode, activeReceiptId]);

  // Create Room Logic
  const handleCreate = async () => {
    if (!roomCode || !currentUser) return alert("Enter Title and Name");
    const code = Math.random().toString(36).substr(2, 6).toUpperCase();
    await setDoc(doc(db, "rooms", code), {
      title: roomCode,
      admin: currentUser,
      members: [{ name: currentUser, upi: '' }],
      receipts: [],
      createdAt: new Date()
    });
    setRoomCode(code);
    setView('dashboard');
  };

  const addNewReceipt = async () => {
    const name = prompt("Name this bill (e.g., Dinner at Coorg):");
    if (!name) return;
    const newId = Math.random().toString(36).substr(2, 9);
    const newReceipt = { id: newId, name, items: [], payments: {}, timestamp: Date.now() };
    await updateDoc(doc(db, "rooms", roomCode), { receipts: arrayUnion(newReceipt) });
    setActiveReceiptId(newId);
  };

  const handleScan = async (e) => {
    const file = e.target.files[0];
    if (!file || !activeReceiptId) return;
    setIsScanning(true);
    try {
      const scanned = await scanItemizedBill(file);
      if (scanned) {
        const updatedReceipts = roomData.receipts.map(r => {
          if (r.id === activeReceiptId) {
            const newItems = scanned.map(item => ({ 
              ...item, price: Number(item.price), consumers: [], id: Math.random().toString(36).substr(2, 5) 
            }));
            return { ...r, items: [...r.items, ...newItems] };
          }
          return r;
        });
        await updateDoc(doc(db, "rooms", roomCode), { receipts: updatedReceipts });
      }
    } finally { setIsScanning(false); }
  };

  const toggleConsumer = async (itemId, personName) => {
    const updatedReceipts = roomData.receipts.map(r => {
      if (r.id === activeReceiptId) {
        const updatedItems = r.items.map(item => {
          if (item.id === itemId) {
            const consumers = item.consumers.includes(personName)
              ? item.consumers.filter(p => p !== personName) : [...item.consumers, personName];
            return { ...item, consumers };
          }
          return item;
        });
        return { ...r, items: updatedItems };
      }
      return r;
    });
    await updateDoc(doc(db, "rooms", roomCode), { receipts: updatedReceipts });
  };

  const calculateTotalBalances = () => {
    const balances = {};
    if (!roomData) return balances;
    roomData.members.forEach(m => balances[m.name] = 0);
    roomData.receipts?.forEach(r => {
      Object.entries(r.payments || {}).forEach(([name, amt]) => { if (balances[name] !== undefined) balances[name] += Number(amt); });
      r.items.forEach(item => {
        const unitPrice = Number(item.price);
        item.consumers.forEach(p => { if (balances[p] !== undefined) balances[p] -= unitPrice; });
      });
    });
    return balances;
  };

  const currentReceipt = roomData?.receipts?.find(r => r.id === activeReceiptId);
  const settlements = minimizeTransactions(calculateTotalBalances());

  if (view === 'entry') return (
    <div style={styles.entry}>
      <h1 style={{color: '#6366f1'}}>SplitMint Room 🏔️</h1>
      <input placeholder="Nickname" value={currentUser} onChange={e => setCurrentUser(e.target.value)} style={styles.input}/>
      <input placeholder="Trip Title" value={roomCode} onChange={e => setRoomCode(e.target.value)} style={styles.input}/>
      <button onClick={handleCreate} style={styles.btn}>Launch Trip Room</button>
    </div>
  );

  return (
    <div style={styles.dash}>
      <header style={styles.header}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <h3 style={{margin:0}}>{roomData?.title} <small style={styles.code}>#{roomCode}</small></h3>
          <button onClick={addNewReceipt} style={styles.addBtn}>+ New Bill</button>
        </div>
        <div style={styles.tabBar}>
          {roomData?.receipts?.map(r => (
            <button key={r.id} onClick={() => setActiveReceiptId(r.id)} style={activeReceiptId === r.id ? styles.activeTab : styles.tab}>{r.name}</button>
          ))}
        </div>
      </header>

      {currentReceipt ? (
        <main style={{padding: '20px'}}>
          <section style={styles.card}>
            <p style={styles.label}>Step 1: Who paid at counter?</p>
            {roomData.members.map(m => (
              <div key={m.name} style={{display:'flex', justifyContent:'space-between', marginBottom: '8px'}}>
                <span>{m.name}:</span>
                <input type="number" placeholder="₹ 0" value={currentReceipt.payments[m.name] || ''} onChange={async (e) => {
                  const updated = roomData.receipts.map(r => r.id === activeReceiptId ? {...r, payments: {...r.payments, [m.name]: Number(e.target.value)}} : r);
                  await updateDoc(doc(db, "rooms", roomCode), { receipts: updated });
                }} style={styles.smallInput}/>
              </div>
            ))}
          </section>

          <section style={styles.card}>
            <p style={styles.label}>Step 2: Scan Bill (QuickSplit Style)</p>
            <div onClick={() => fileInputRef.current.click()} style={styles.scanBox}>
              <h4>{isScanning ? "🤖 AI Scanning..." : "📸 Tap to Scan"}</h4>
              <input type="file" ref={fileInputRef} onChange={handleScan} style={{display:'none'}}/>
            </div>
          </section>

          <section style={styles.card}>
            <p style={styles.label}>Step 3: Who had what?</p>
            {currentReceipt.items.map(item => (
              <div key={item.id} style={{padding:'10px 0', borderBottom:'1px solid #eee'}}>
                <div style={{display:'flex', justifyContent:'space-between'}}><strong>{item.name}</strong><span>₹{item.price}</span></div>
                <div style={{display:'flex', flexWrap:'wrap', gap:'5px', marginTop:'8px'}}>
                  {roomData.members.map(m => (
                    <button key={m.name} onClick={() => toggleConsumer(item.id, m.name)} style={{...styles.tag, background: item.consumers.includes(m.name) ? '#6366f1' : 'white', color: item.consumers.includes(m.name) ? 'white' : '#6366f1'}}>{m.name}</button>
                  ))}
                </div>
              </div>
            ))}
          </section>

          <div style={styles.settleCard}>
            <h4>Optimized Settlements (All Bills)</h4>
            {settlements.map((s, i) => (
              <div key={i} style={styles.settleRow}><span>{s.from} → {s.to}</span><strong>₹{s.amount.toFixed(2)}</strong><QRCodeSVG value={`upi://pay?pa=user@upi&am=${s.amount}`} size={35} /></div>
            ))}
          </div>
        </main>
      ) : <div style={{padding:'50px', textAlign:'center', color:'#888'}}>Tap "+ New Bill" to add your first receipt!</div>}
    </div>
  );
};

// --- Styles ---
const styles = {
  entry: { padding: '80px 20px', maxWidth: '400px', margin: 'auto', textAlign: 'center' },
  input: { width: '100%', padding: '12px', marginBottom: '10px', borderRadius: '10px', border: '1px solid #ddd' },
  btn: { width: '100%', padding: '15px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold' },
  dash: { background: '#f9fafb', minHeight: '100vh', fontFamily: 'sans-serif' },
  header: { background: 'white', padding: '20px', borderBottom: '1px solid #eee' },
  tabBar: { display: 'flex', gap: '8px', marginTop: '15px', overflowX: 'auto' },
  tab: { padding: '6px 15px', borderRadius: '8px', border: '1px solid #ddd', background: '#f8f9fa', whiteSpace: 'nowrap' },
  activeTab: { padding: '6px 15px', borderRadius: '8px', border: '1px solid #6366f1', background: '#eef2ff', color: '#6366f1', whiteSpace: 'nowrap', fontWeight: 'bold' },
  addBtn: { padding: '6px 12px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold' },
  card: { background: 'white', padding: '15px', borderRadius: '15px', marginBottom: '15px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  label: { margin: '0 0 10px 0', fontSize: '11px', fontWeight: 'bold', color: '#888', textTransform: 'uppercase' },
  smallInput: { width: '80px', padding: '6px', borderRadius: '6px', border: '1px solid #ddd' },
  scanBox: { border: '2px dashed #6366f1', padding: '20px', borderRadius: '12px', textAlign: 'center', background: '#f9f9ff', cursor: 'pointer' },
  tag: { fontSize: '10px', padding: '4px 8px', borderRadius: '12px', border: '1px solid #6366f1', cursor: 'pointer' },
  code: { fontSize: '10px', color: '#666', background: '#eee', padding: '2px 5px', borderRadius: '4px' },
  settleCard: { marginTop: '20px', background: '#1f2937', color: 'white', padding: '20px', borderRadius: '20px' },
  settleRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px' }
};

export default TripRoom;