import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { db } from '../firebase';
import { doc, onSnapshot, updateDoc, arrayUnion, getDoc, setDoc } from "firebase/firestore";
import { minimizeTransactions } from '../utils/settlement';
import { scanItemizedBill } from '../utils/gemini';
import { QRCodeSVG } from 'qrcode.react';
// TripSummary moved to Combined Report page

const TripRoom = () => {
  const fileInputRef = useRef(null);
  const [view, setView] = useState('entry');
  const [roomCode, setRoomCode] = useState('');
  const [currentUser, setCurrentUser] = useState(localStorage.getItem('sm_user') || '');
  const [roomData, setRoomData] = useState(null);
  const [activeReceiptId, setActiveReceiptId] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [paymentsLocal, setPaymentsLocal] = useState({});
  const [entryChoice, setEntryChoice] = useState('create');
  const [joinCode, setJoinCode] = useState('');
  const [initialMembers, setInitialMembers] = useState([]);
  const [newInitialMember, setNewInitialMember] = useState('');
  const [showCombined, setShowCombined] = useState(false);
  const [editingUpiName, setEditingUpiName] = useState(null);
  const [editingUpiValue, setEditingUpiValue] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  // Restore room/receipt when navigated back from CombinedReport
  useEffect(() => {
    const s = location.state || {};
    if (s.roomCode) {
      setRoomCode(s.roomCode);
      setView('dashboard');
      if (s.activeReceiptId) setActiveReceiptId(s.activeReceiptId);
    }
  }, [location]);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberUpi, setNewMemberUpi] = useState('');
  const [entryMode, setEntryMode] = useState('scan');
  const [manualItem, setManualItem] = useState({ name: '', price: '', quantity: 1 });

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

  // Sync local payments buffer when the active receipt changes
  useEffect(() => {
    const current = roomData?.receipts?.find(r => r.id === activeReceiptId);
    setPaymentsLocal(current?.payments ? { ...current.payments } : {});
  }, [activeReceiptId, roomData]);

  // Create Room Logic
  const handleCreate = async () => {
    if (!roomCode || !currentUser) return alert("Enter Title and Name");
    const code = Math.random().toString(36).substr(2, 6).toUpperCase();
    const members = [{ name: currentUser, upi: '' }, ...initialMembers.filter(n => n && n.trim()).map(n => ({ name: n.trim(), upi: '' }))];
    await setDoc(doc(db, "rooms", code), {
      title: roomCode,
      admin: currentUser,
      members,
      receipts: [],
      createdAt: new Date()
    });
    setRoomCode(code);
    setView('dashboard');
  };

  const handleJoin = async () => {
    const code = joinCode.trim().toUpperCase();
    if (!code || !currentUser) return alert('Enter room code and name');
    const roomRef = doc(db, 'rooms', code);
    const snapshot = await getDoc(roomRef);
    if (!snapshot.exists()) return alert('Room not found');
    await updateDoc(roomRef, { members: arrayUnion({ name: currentUser, upi: '' }) });
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
      console.log('TripRoom.handleScan: file selected', file.name);
      const scanned = await scanItemizedBill(file);
      console.log('TripRoom.handleScan: scanned result', scanned);
      if (scanned && scanned.length > 0) {
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
      } else {
        alert('AI returned no items. Check the browser console for details.');
      }
    } catch (err) {
      console.error('TripRoom.handleScan error', err);
      alert('Scan failed: ' + (err?.message || err));
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

  const selectAllConsumers = async (itemId) => {
    const members = (roomData?.members || []).map(m => m.name);
    const updatedReceipts = roomData.receipts.map(r => {
      if (r.id === activeReceiptId) {
        const updatedItems = r.items.map(item => {
          if (item.id === itemId) {
            // if already all selected, clear; otherwise set all
            const allSelected = (item.consumers || []).length === members.length && members.length > 0;
            return { ...item, consumers: allSelected ? [] : members };
          }
          return item;
        });
        return { ...r, items: updatedItems };
      }
      return r;
    });
    await updateDoc(doc(db, "rooms", roomCode), { receipts: updatedReceipts });
  };

  // Edit / Delete items
  const [editingItemId, setEditingItemId] = useState(null);
  const [editingValues, setEditingValues] = useState({ name: '', price: '' });

  const askConfirm = (msg) => window.confirm(msg);

  const startEditItem = (item) => {
    setEditingItemId(item.id);
    setEditingValues({ name: item.name, price: item.price });
  };

  const saveEditItem = async (itemId) => {
    const updatedReceipts = roomData.receipts.map(r => {
      if (r.id === activeReceiptId) {
        const updatedItems = r.items.map(it => it.id === itemId ? { ...it, name: editingValues.name, price: Number(editingValues.price) } : it);
        return { ...r, items: updatedItems };
      }
      return r;
    });
    await updateDoc(doc(db, "rooms", roomCode), { receipts: updatedReceipts });
    setEditingItemId(null);
  };

  const deleteItem = async (itemId) => {
    if (!askConfirm('Delete this item?')) return;
    const updatedReceipts = roomData.receipts.map(r => {
      if (r.id === activeReceiptId) {
        const updatedItems = r.items.filter(it => it.id !== itemId);
        return { ...r, items: updatedItems };
      }
      return r;
    });
    await updateDoc(doc(db, "rooms", roomCode), { receipts: updatedReceipts });
  };

  // Remove member (and clean up receipts/payments)
  const removeMember = async (memberName) => {
    if (!askConfirm(`Remove ${memberName} from trip? This will remove their payments and consumer tags.`)) return;
    const updatedMembers = (roomData.members || []).filter(m => m.name !== memberName);
    const updatedReceipts = (roomData.receipts || []).map(r => {
      const payments = { ...(r.payments || {}) };
      delete payments[memberName];
      const items = (r.items || []).map(it => ({ ...it, consumers: (it.consumers || []).filter(p => p !== memberName) }));
      return { ...r, payments, items };
    });
    await updateDoc(doc(db, 'rooms', roomCode), { members: updatedMembers, receipts: updatedReceipts });
    setPaymentsLocal(prev => {
      const copy = { ...prev };
      delete copy[memberName];
      return copy;
    });
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

  // Receipt totals
  const receiptItemsTotal = currentReceipt?.items?.reduce((sum, it) => {
    const unit = Number(it.price || 0);
    const qty = (it.quantity ?? it.qty) ?? ((it.consumers && it.consumers.length > 0) ? it.consumers.length : 1);
    return sum + unit * qty;
  }, 0) || 0;
  // Split total = sum of item totals (price * quantity). Do NOT compute by summing member balances.
  const receiptSplitTotal = receiptItemsTotal;
  const totalPaidAtCounter = Object.values(currentReceipt?.payments || {}).reduce((sum, v) => sum + (Number(v) || 0), 0);

  // Per-person amount for the current receipt (sum of item prices they consumed)
  const perPersonBill = {};
  roomData?.members?.forEach(m => { perPersonBill[m.name] = 0; });
  currentReceipt?.items?.forEach(item => {
    const unitPrice = Number(item.price || 0);
    const qty = Number(item.quantity || item.qty) || 1;
    const consumers = item.consumers || [];
    if (consumers.length > 0) {
      const share = (unitPrice * qty) / consumers.length;
      consumers.forEach(p => {
        if (perPersonBill[p] !== undefined) perPersonBill[p] += share;
      });
    } else {
      // no consumers: do nothing
    }
  });

  if (view === 'entry') return (
    <div style={styles.entry}>
      <h1 style={{color: '#6366f1'}}>SplitMint Room 🏔️</h1>
      <div style={{display:'flex', gap:'8px', marginBottom:'12px'}}>
        <button onClick={() => setEntryChoice('create')} style={{flex:1, padding: '10px', borderRadius: '8px', background: entryChoice === 'create' ? '#6366f1' : '#f1f5f9', color: entryChoice === 'create' ? 'white' : '#333', border: 'none'}}>Create Room</button>
        <button onClick={() => setEntryChoice('join')} style={{flex:1, padding: '10px', borderRadius: '8px', background: entryChoice === 'join' ? '#6366f1' : '#f1f5f9', color: entryChoice === 'join' ? 'white' : '#333', border: 'none'}}>Join Room</button>
      </div>
      <input placeholder="Your Name" value={currentUser} onChange={e => setCurrentUser(e.target.value)} style={styles.input}/>
      {entryChoice === 'create' ? (
        <>
          <input placeholder="Trip Title" value={roomCode} onChange={e => setRoomCode(e.target.value)} style={styles.input}/>
          <div style={{display:'flex', gap:'8px', marginBottom:'8px'}}>
            <input placeholder="Add member name" value={newInitialMember} onChange={e => setNewInitialMember(e.target.value)} style={{flex:1, padding:'10px', borderRadius:'8px', border:'1px solid #ddd'}} />
            <button onClick={() => { if (newInitialMember.trim()) { setInitialMembers([...initialMembers, newInitialMember.trim()]); setNewInitialMember(''); } }} style={{padding:'10px', borderRadius:'8px', background:'#6c5ce7', color:'white', border:'none'}}>Add</button>
          </div>
          <div style={{display:'flex', gap:'8px', flexWrap:'wrap', marginBottom:'12px'}}>
            {initialMembers.map((m, i) => (<div key={i} style={{background:'#eef2ff', padding:'6px 8px', borderRadius:'12px'}}>{m} <button onClick={() => setInitialMembers(initialMembers.filter((_,j)=>j!==i))} style={{marginLeft:'6px'}}>x</button></div>))}
          </div>
          <button onClick={handleCreate} style={styles.btn}>Create Room</button>
        </>
      ) : (
        <>
          <input placeholder="Room Code" value={joinCode} onChange={e => setJoinCode(e.target.value)} style={styles.input}/>
          <button onClick={handleJoin} style={styles.btn}>Join Room</button>
        </>
      )}
    </div>
  );

  return (
    <div style={styles.dash}>
      <header style={styles.header}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <h3 style={{margin:0}}>{roomData?.title} <small style={styles.code}>#{roomCode}</small></h3>
          <div style={{display:'flex', gap:'8px'}}>
            <button onClick={() => navigate('/trip-room/combined', { state: { roomData, settlements, roomCode, activeReceiptId } })} style={{padding:'6px 12px', background: '#f3f4f6', border: 'none', borderRadius: '6px'}}>Combined Report</button>
            <button onClick={addNewReceipt} style={styles.addBtn}>+ New Bill</button>
          </div>
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
            <p style={styles.label}>Step 1: Scan Bill (QuickSplit Style) or Manual Entry</p>
            <div style={{display: 'flex', gap: '10px', marginBottom: '12px'}}>
              <button onClick={() => setEntryMode('scan')} style={{flex:1, padding: '8px', borderRadius: '8px', background: entryMode === 'scan' ? '#6366f1' : '#f1f5f9', color: entryMode === 'scan' ? 'white' : '#333', border: 'none'}}>Scan</button>
              <button onClick={() => setEntryMode('manual')} style={{flex:1, padding: '8px', borderRadius: '8px', background: entryMode === 'manual' ? '#6366f1' : '#f1f5f9', color: entryMode === 'manual' ? 'white' : '#333', border: 'none'}}>Manual</button>
            </div>

            {entryMode === 'scan' ? (
              <div style={{...styles.scanBox, position: 'relative'}} onClick={() => fileInputRef.current?.click()}>
                <h4>{isScanning ? "🤖 AI Scanning..." : "📸 Tap to Scan"}</h4>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onClick={() => { if (fileInputRef.current) fileInputRef.current.value = null; }}
                  onChange={handleScan}
                  style={{position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer'}}
                />
              </div>
            ) : (
              <div style={{ background: '#fff', padding: '12px', borderRadius: '12px', border: '1px solid #eee' }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                  <input placeholder="Item" value={manualItem.name} onChange={(e) => setManualItem({...manualItem, name: e.target.value})} style={{ flex: 2, padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }} />
                  <input placeholder="Qty" type="number" min={1} value={manualItem.quantity} onChange={(e) => setManualItem({...manualItem, quantity: Number(e.target.value) || 1})} style={{ width: '80px', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }} />
                  <input placeholder="₹ Price" type="number" value={manualItem.price} onChange={(e) => setManualItem({...manualItem, price: e.target.value})} style={{ width: '120px', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }} />
                  <button onClick={async () => {
                    if (!manualItem.name || manualItem.price === '') return alert('Enter name, quantity and price');
                    if (!activeReceiptId) return alert('Create or select a receipt first');
                    const newItem = { id: Math.random().toString(36).substr(2,5), name: manualItem.name, price: Number(manualItem.price), quantity: Number(manualItem.quantity) || 1, consumers: [] };
                    const updatedReceipts = roomData.receipts.map(r => r.id === activeReceiptId ? { ...r, items: [...r.items, newItem] } : r);
                    try {
                      await updateDoc(doc(db, "rooms", roomCode), { receipts: updatedReceipts });
                      setManualItem({ name: '', price: '', quantity: 1 });
                    } catch (err) {
                      console.error('addManualItem error', err);
                      alert('Failed to add item: ' + (err?.message || err));
                    }
                  }} style={{ background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', padding: '10px' }}>Add</button>
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>Tip: use Scan for receipts; use Manual for quick edits or adding missed items.</div>
              </div>
            )}
          </section>

          <section style={styles.card}>
            <p style={styles.label}>Step 2: Who had what?</p>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom: '12px', fontSize: '14px'}}>
              <div>Items Total: <strong>₹{receiptItemsTotal.toFixed(2)}</strong></div>
              <div>Split Total: <strong>₹{receiptSplitTotal.toFixed(2)}</strong></div>
              <div>Paid at Counter: <strong>₹{totalPaidAtCounter.toFixed(2)}</strong></div>
            </div>
            <div style={{display:'flex', gap:'10px', flexWrap:'wrap', marginBottom:'12px'}}>
              {roomData?.members?.map(m => (
                <div key={m.name} style={{background:'#f3f4f6', padding:'8px 12px', borderRadius:'10px', fontSize:'13px'}}>
                  <div style={{fontSize:'11px', color:'#555'}}>{m.name}</div>
                  <div style={{fontWeight:'600'}}>₹{(perPersonBill[m.name] || 0).toFixed(2)}</div>
                </div>
              ))}
            </div>
            {currentReceipt.items.map(item => (
              <div key={item.id} style={{padding:'10px 0', borderBottom:'1px solid #eee'}}>
                {editingItemId === item.id ? (
                  <div style={{display:'flex', gap:'8px', alignItems:'center'}}>
                    <input value={editingValues.name} onChange={e => setEditingValues({...editingValues, name: e.target.value})} style={{flex:2, padding:'6px', borderRadius:'6px', border:'1px solid #ddd'}} />
                    <input value={editingValues.price} onChange={e => setEditingValues({...editingValues, price: e.target.value})} style={{width:'100px', padding:'6px', borderRadius:'6px', border:'1px solid #ddd'}} />
                    <button onClick={() => saveEditItem(item.id)} style={{padding:'6px 10px', background:'#10b981', color:'white', border:'none', borderRadius:'6px'}}>Save</button>
                    <button onClick={() => setEditingItemId(null)} style={{padding:'6px 10px', borderRadius:'6px'}}>Cancel</button>
                  </div>
                ) : (
                  <>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                      <strong>{item.name}</strong>
                      <div style={{display:'flex', gap:'8px', alignItems:'center'}}>
                        <span>₹{item.price}</span>
                        <button onClick={() => startEditItem(item)} style={{padding:'4px 8px', borderRadius:'6px', border:'none', background:'#f1f5f9'}}>Edit</button>
                        <button onClick={() => deleteItem(item.id)} style={{padding:'4px 8px', borderRadius:'6px', border:'none', background:'#fee2e2'}}>Delete</button>
                        <button onClick={() => selectAllConsumers(item.id)} style={{padding:'4px 8px', borderRadius:'6px', border:'none', background:'#f8fafc'}}>Select All</button>
                      </div>
                    </div>
                    <div style={{display:'flex', flexWrap:'wrap', gap:'5px', marginTop:'8px'}}>
                      {roomData.members.map(m => (
                        <button key={m.name} onClick={() => toggleConsumer(item.id, m.name)} style={{...styles.tag, background: item.consumers.includes(m.name) ? '#6366f1' : 'white', color: item.consumers.includes(m.name) ? 'white' : '#6366f1'}}>{m.name}</button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}
          </section>

          <section style={styles.card}>
            <p style={styles.label}>Step 3: Who paid at counter?</p>
            {roomData.members.map(m => (
              <div key={m.name} style={{display:'flex', justifyContent:'space-between', marginBottom: '8px', alignItems:'center'}}>
                <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                  <span>{m.name}:</span>
                  <input
                    type="number"
                    placeholder="₹ 0"
                    value={paymentsLocal[m.name] !== undefined ? paymentsLocal[m.name] : ''}
                    onChange={(e) => setPaymentsLocal({ ...paymentsLocal, [m.name]: e.target.value })}
                    onBlur={async (e) => {
                      const val = Number(e.target.value) || 0;
                      const updated = roomData.receipts.map(r => r.id === activeReceiptId ? { ...r, payments: { ...r.payments, [m.name]: val } } : r);
                      await updateDoc(doc(db, "rooms", roomCode), { receipts: updated });
                    }}
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter') {
                        const val = Number(e.target.value) || 0;
                        const updated = roomData.receipts.map(r => r.id === activeReceiptId ? { ...r, payments: { ...r.payments, [m.name]: val } } : r);
                        await updateDoc(doc(db, "rooms", roomCode), { receipts: updated });
                      }
                    }}
                    style={styles.smallInput}
                  />
                </div>
                <div style={{display:'flex', gap:8, alignItems:'center'}}>
                  {editingUpiName === m.name ? (
                    <>
                      <input value={editingUpiValue} onChange={e => setEditingUpiValue(e.target.value)} style={{padding:'6px', borderRadius:'6px', border:'1px solid #ddd'}} placeholder="Enter UPI" />
                      <button onClick={async () => {
                        const newUpi = editingUpiValue.trim();
                        const updatedMembers = (roomData.members || []).map(mem => mem.name === m.name ? { ...mem, upi: newUpi } : mem);
                        try {
                          await updateDoc(doc(db, 'rooms', roomCode), { members: updatedMembers });
                          setEditingUpiName(null); setEditingUpiValue('');
                        } catch (err) {
                          console.error('update upi error', err);
                          alert('Failed to update UPI: ' + (err?.message || err));
                        }
                      }} style={{padding:'6px 8px', background:'#6c5ce7', color:'white', border:'none', borderRadius:'6px'}}>Save</button>
                      <button onClick={() => { setEditingUpiName(null); setEditingUpiValue(''); }} style={{padding:'6px 8px', borderRadius:'6px'}}>Cancel</button>
                    </>
                  ) : (
                    <>
                      <div style={{fontSize:12, color:'#666'}}>{m.upi || 'No UPI'}</div>
                      <button onClick={() => { setEditingUpiName(m.name); setEditingUpiValue(m.upi || ''); }} style={{padding:'6px 8px', borderRadius:'6px'}}>Edit UPI</button>
                      <button onClick={() => removeMember(m.name)} style={{padding:'6px 8px', borderRadius:'6px', background:'#fee2e2', border:'none'}}>Remove</button>
                    </>
                  )}
                </div>
              </div>
            ))}
            <div style={{display:'flex', gap: '8px', marginTop: '10px'}}>
              <input placeholder="Name" value={newMemberName} onChange={e => setNewMemberName(e.target.value)} style={{flex:1, padding:'8px', borderRadius:'8px', border:'1px solid #ddd'}} />
              <input placeholder="UPI (optional)" value={newMemberUpi} onChange={e => setNewMemberUpi(e.target.value)} style={{flex:1, padding:'8px', borderRadius:'8px', border:'1px solid #ddd'}} />
              <button onClick={async () => {
                if (!newMemberName.trim()) return alert('Enter a name');
                if (!roomCode) return alert('Room not initialized');
                const upi = newMemberUpi.trim() || '';
                const existing = (roomData.members || []).find(m => m.name === newMemberName.trim());
                try {
                  if (existing) {
                    // update existing member's upi
                    const updatedMembers = (roomData.members || []).map(m => m.name === existing.name ? { ...m, upi: upi || m.upi } : m);
                    await updateDoc(doc(db, 'rooms', roomCode), { members: updatedMembers });
                  } else {
                    await updateDoc(doc(db, 'rooms', roomCode), { members: arrayUnion({ name: newMemberName.trim(), upi: upi || '' }) });
                  }
                  setNewMemberName(''); setNewMemberUpi('');
                  setPaymentsLocal(prev => ({ ...prev, [newMemberName.trim()]: prev[newMemberName.trim()] || '' }));
                } catch (err) {
                  console.error('addMember error', err);
                  alert('Failed to add/update member: ' + (err?.message || err));
                }
              }} style={{background:'#6c5ce7', color:'white', border:'none', borderRadius:'8px', padding:'8px'}}>Add</button>
            </div>
          </section>

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