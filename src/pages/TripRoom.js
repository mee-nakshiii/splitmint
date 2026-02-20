import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { 
  collection, addDoc, onSnapshot, query, where, 
  orderBy, doc, serverTimestamp 
} from "firebase/firestore";
import { minimizeTransactions } from '../utils/settlement';
import { QRCodeSVG } from 'qrcode.react';

const TripRoom = () => {
  const [view, setView] = useState('entry'); 
  const [currentUser, setCurrentUser] = useState(localStorage.getItem('sm_user') || '');
  const [roomCode, setRoomCode] = useState('');
  const [roomData, setRoomData] = useState(null);
  const [members, setMembers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [activeTab, setActiveTab] = useState('General');
  const [showAddForm, setShowAddForm] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ title: '', amount: '' });

  useEffect(() => {
    if (view === 'dashboard' && roomCode) {
      const unsubRoom = onSnapshot(doc(db, "rooms", roomCode), (d) => {
        if(d.exists()) setRoomData(d.data());
      });
      const qMembers = query(collection(db, "members"), where("roomCode", "==", roomCode));
      const unsubMembers = onSnapshot(qMembers, (s) => setMembers(s.docs.map(d => d.data())));
      const qExp = query(collection(db, "expenses"), where("roomCode", "==", roomCode), orderBy("timestamp", "desc"));
      const unsubExp = onSnapshot(qExp, (s) => setExpenses(s.docs.map(d => ({id: d.id, ...d.data()}))));
      return () => { unsubRoom(); unsubMembers(); unsubExp(); };
    }
  }, [view, roomCode]);

  const handleAddExpense = async () => {
    if (!expenseForm.title || !expenseForm.amount) return alert("Please enter both title and amount");
    
    try {
      console.log("Attempting to add expense for:", currentUser); // Debugging line
      await addDoc(collection(db, "expenses"), {
        roomCode,
        tab: activeTab,
        title: expenseForm.title,
        amount: Number(expenseForm.amount),
        payers: { [currentUser]: Number(expenseForm.amount) },
        timestamp: serverTimestamp()
      });
      setShowAddForm(false);
      setExpenseForm({ title: '', amount: '' });
    } catch (error) {
      console.error("Firebase Add Error:", error);
      alert("Error adding item. Check your internet or console.");
    }
  };

  const calculateBalances = () => {
    let bal = {};
    members.forEach(m => bal[m.name] = 0);
    expenses.forEach(e => {
      Object.entries(e.payers || {}).forEach(([name, amt]) => { if(bal[name] !== undefined) bal[name] += Number(amt); });
      const share = Number(e.amount || 0) / (members.length || 1);
      members.forEach(m => { if(bal[m.name] !== undefined) bal[m.name] -= share; });
    });
    return bal;
  };

  const settlements = minimizeTransactions(calculateBalances());

  if (view === 'entry') return (
    <div style={{ padding: '80px 20px', maxWidth: '400px', margin: 'auto', textAlign: 'center' }}>
      <h1 style={{ color: '#6366f1' }}>SplitMint 🏔️</h1>
      <input placeholder="Enter Your Name" value={currentUser} onChange={(e) => { setCurrentUser(e.target.value); localStorage.setItem('sm_user', e.target.value); }} style={{ padding: '15px', width: '100%', marginBottom: '15px', borderRadius: '10px', border: '1px solid #ddd' }}/>
      <button onClick={() => setView('create')} style={{ width: '100%', padding: '15px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold' }}>Create New Trip</button>
      <button onClick={() => setView('join')} style={{ width: '100%', padding: '15px', background: 'white', color: '#6366f1', border: '2px solid #6366f1', borderRadius: '12px', fontWeight: 'bold', marginTop: '10px' }}>Join via Code</button>
    </div>
  );

  return (
    <div style={{ background: '#f9fafb', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <header style={{ background: 'white', padding: '20px', borderBottom: '1px solid #eee' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
           <h2>{roomData?.title} <small style={{ color: '#888', background: '#eee', padding: '3px 8px', borderRadius: '5px' }}>#{roomCode}</small></h2>
           <button onClick={() => setView('entry')} style={{ padding: '5px 10px', background: '#eee', border: 'none', borderRadius: '5px' }}>Exit</button>
        </div>
        <div style={{ display: 'flex', gap: '10px', marginTop: '15px', overflowX: 'auto' }}>
          {['General', 'Food', 'Travel', 'Stay'].map(t => (
            <button key={t} onClick={() => setActiveTab(t)} style={{ padding: '8px 18px', borderRadius: '20px', border: 'none', background: activeTab === t ? '#6366f1' : '#f1f2f6', color: activeTab === t ? 'white' : 'black' }}>{t}</button>
          ))}
        </div>
      </header>

      <main style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', padding: '20px' }}>
        <section style={{ background: 'white', padding: '25px', borderRadius: '18px', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>{activeTab} Items</h3>
            <button onClick={() => setShowAddForm(true)} style={{ background: '#10b981', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '8px', fontWeight: 'bold' }}>+ Add Item</button>
          </div>
          <div style={{ marginTop: '15px' }}>
            {expenses.filter(e => e.tab === activeTab).map(e => (
              <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f9fafb' }}>
                <span>{e.title}</span>
                <strong>₹{Number(e.amount).toFixed(2)}</strong>
              </div>
            ))}
          </div>
        </section>

        <section style={{ background: 'white', padding: '25px', borderRadius: '18px', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
          <h3>Settlements</h3>
          {settlements.map((s, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: '#f8fafc', borderRadius: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px' }}>{s.from} → {s.to}</span>
              <strong>₹{s.amount.toFixed(0)}</strong>
              <QRCodeSVG value={`upi://pay?pa=user@upi&am=${s.amount}`} size={32} />
            </div>
          ))}
        </section>
      </main>

      {showAddForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '20px', width: '90%', maxWidth: '400px' }}>
            <h3>New {activeTab} Expense</h3>
            <input placeholder="Expense Name (e.g. Dinner)" value={expenseForm.title} onChange={e => setExpenseForm({...expenseForm, title: e.target.value})} style={{ width: '100%', padding: '12px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #ddd' }}/>
            <input placeholder="Amount in ₹" type="number" value={expenseForm.amount} onChange={e => setExpenseForm({...expenseForm, amount: e.target.value})} style={{ width: '100%', padding: '12px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #ddd' }}/>
            <button onClick={handleAddExpense} style={{ width: '100%', padding: '15px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold' }}>Save Expense</button>
            <button onClick={() => setShowAddForm(false)} style={{ width: '100%', marginTop: '10px', background: 'none', border: 'none', color: '#888' }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TripRoom; // FIXED: Exporting default component