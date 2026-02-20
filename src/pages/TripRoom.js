import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, onSnapshot, query, where, orderBy, doc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { minimizeTransactions } from '../utils/settlement';
import { QRCodeSVG } from 'qrcode.react';

const TripRoom = () => {
  // 1. Room Access States
  const [roomKey, setRoomKey] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [members, setMembers] = useState([]);
  const [newMember, setNewMember] = useState({ name: '', upi: '' });

  // 2. Transaction & Tab States
  const [expenses, setExpenses] = useState([]);
  const [activeTab, setActiveTab] = useState(null); // ID of the selected expense
  const [showAddForm, setShowAddForm] = useState(false);
  const [tx, setTx] = useState({ 
    title: '', totalAmount: 0, category: 'Food', 
    payers: {}, splitBetween: [] 
  });

  // 3. Real-time Firebase Sync
  useEffect(() => {
    if (isJoined && roomKey) {
      // Sync Expenses
      const q = query(collection(db, "trip-expenses"), where("roomKey", "==", roomKey), orderBy("timestamp", "asc"));
      const unsubExpenses = onSnapshot(q, (snapshot) => {
        const docs = [];
        snapshot.forEach(d => docs.push({ id: d.id, ...d.data() }));
        setExpenses(docs);
        if (docs.length > 0 && !activeTab) setActiveTab(docs[0].id);
      });
      // Sync Members from Room Doc
      const unsubRoom = onSnapshot(doc(db, "rooms", roomKey), (d) => {
        if(d.exists()) setMembers(d.data().members || []);
      });
      return () => { unsubExpenses(); unsubRoom(); };
    }
  }, [isJoined, roomKey]);

  // 4. Balance Engine
  const calculateBalances = () => {
    let balances = {};
    members.forEach(m => balances[m.name] = 0);
    expenses.forEach(exp => {
      // Credit Payers
      Object.entries(exp.payers).forEach(([name, amt]) => { balances[name] += Number(amt); });
      // Debit Consumers
      const consumers = exp.splitBetween.length > 0 ? exp.splitBetween : members.map(m => m.name);
      const share = Number(exp.totalAmount) / consumers.length;
      consumers.forEach(name => { balances[name] -= share; });
    });
    return balances;
  };

  const handleCreateRoom = async () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    await addDoc(collection(db, "rooms"), { roomCode: code, members: [], createdAt: new Date() });
    setRoomKey(code);
    setIsJoined(true);
  };

  const handleAddMember = async () => {
    const roomRef = doc(db, "rooms", roomKey);
    await updateDoc(roomRef, { members: arrayUnion(newMember) });
    setNewMember({ name: '', upi: '' });
  };

  const balances = calculateBalances();
  const settlements = minimizeTransactions(balances);

  if (!isJoined) {
    return (
      <div style={{ padding: '50px 20px', textAlign: 'center', background: '#f8f9fa', minHeight: '100vh' }}>
        <h1 style={{ color: '#6c5ce7' }}>SplitMint 🏔️</h1>
        <p>Collaborative Trip Mode</p>
        <button onClick={handleCreateRoom} style={{ width: '100%', padding: '15px', background: '#6c5ce7', color: 'white', border: 'none', borderRadius: '12px', marginBottom: '10px' }}>Create New Room</button>
        <div style={{ margin: '20px 0' }}>— OR —</div>
        <input placeholder="Enter Room Code" value={roomKey} onChange={(e) => setRoomKey(e.target.value.toUpperCase())} style={{ padding: '15px', width: '100%', borderRadius: '12px', border: '1px solid #ddd', boxSizing: 'border-box' }} />
        <button onClick={() => setIsJoined(true)} style={{ width: '100%', padding: '15px', background: '#2d3436', color: 'white', border: 'none', marginTop: '10px', borderRadius: '12px' }}>Join Room</button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '600px', margin: 'auto', background: '#fff', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      {/* Horizontal Tabs: Transactions */}
      <div style={{ display: 'flex', overflowX: 'auto', background: '#2d3436', padding: '10px', gap: '10px', borderBottom: '4px solid #6c5ce7' }}>
        {expenses.map(e => (
          <button 
            key={e.id} 
            onClick={() => setActiveTab(e.id)}
            style={{ 
              padding: '8px 15px', borderRadius: '20px', border: 'none', whiteSpace: 'nowrap',
              background: activeTab === e.id ? '#6c5ce7' : '#4b4b4b', color: 'white'
            }}
          >
            {e.title}
          </button>
        ))}
        <button onClick={() => setShowAddForm(true)} style={{ padding: '8px 15px', borderRadius: '20px', border: 'none', background: '#00b894', color: 'white' }}>+ Add Tab</button>
      </div>

      {/* Live Leaderboard */}
      <div style={{ display: 'flex', overflowX: 'auto', padding: '15px', gap: '10px', background: '#f1f2f6' }}>
        {Object.entries(balances).map(([name, bal]) => (
          <div key={name} style={{ flex: '0 0 100px', textAlign: 'center', background: 'white', padding: '10px', borderRadius: '12px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: '10px', fontWeight: 'bold' }}>{name}</div>
            <div style={{ color: bal >= 0 ? '#00b894' : '#ff7675', fontSize: '12px' }}>₹{bal.toFixed(0)}</div>
          </div>
        ))}
      </div>

      {/* Active Tab Content */}
      {activeTab && (
        <div style={{ padding: '20px' }}>
          {expenses.filter(e => e.id === activeTab).map(e => (
            <div key={e.id}>
              <h2 style={{ margin: 0 }}>{e.title} 🧾</h2>
              <p style={{ color: '#6c5ce7', fontWeight: 'bold' }}>Total: ₹{e.totalAmount}</p>
              <div style={{ marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '10px' }}>
                <h4>Payer Details</h4>
                {Object.entries(e.payers).map(([name, amt]) => (
                  <div key={name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                    <span>{name}</span><span>₹{amt}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Floating Action: Settle Mode */}
      <div style={{ position: 'fixed', bottom: '20px', right: '20px', left: '20px' }}>
        <button 
          onClick={() => alert("Check Settle Instructions in History")} 
          style={{ width: '100%', padding: '15px', background: '#00b894', color: 'white', borderRadius: '30px', border: 'none', fontWeight: 'bold', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}
        >
          🤝 Settle Trip
        </button>
      </div>

      {/* Final Settlement Logic Displayed at Bottom */}
      <div style={{ padding: '20px', marginBottom: '80px', background: '#f9f9f9', borderRadius: '20px' }}>
        <h4>Settlement Instructions</h4>
        {settlements.map((s, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', background: 'white', padding: '10px', borderRadius: '10px' }}>
            <span style={{ fontSize: '12px' }}>{s.from} → {s.to}</span>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontWeight: 'bold' }}>₹{s.amount.toFixed(0)}</span>
              <QRCodeSVG value={`upi://pay?pa=${members.find(m => m.name === s.to)?.upi}&am=${s.amount}`} size={40} style={{ marginLeft: '10px' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TripRoom;