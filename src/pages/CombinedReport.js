import React from 'react';
import TripSummary from '../components/TripSummary';
import { QRCodeSVG } from 'qrcode.react';
import { useLocation, useNavigate } from 'react-router-dom';

const CombinedReport = (props) => {
  const location = useLocation();
  const state = location.state || {};
  const roomData = state.roomData || null;
  const settlements = state.settlements || [];
    const navigate = useNavigate();
  if (!roomData) return <div style={{padding:40}}>No room selected. Open this from Trip Room to view the combined report.</div>;

  // Compute per-person expenditures across all receipts (split item cost among consumers)
  const expenditures = {};
  (roomData.members || []).forEach(m => { expenditures[m.name] = 0; });
  (roomData.receipts || []).forEach(r => {
    (r.items || []).forEach(item => {
      const unit = Number(item.price || 0);
      const qty = (item.quantity ?? item.qty) ?? ((item.consumers && item.consumers.length > 0) ? item.consumers.length : 1);
      const total = unit * qty;
      const consumers = item.consumers || [];
      if (consumers.length > 0) {
        const share = total / consumers.length;
        consumers.forEach(p => {
          if (expenditures[p] === undefined) expenditures[p] = 0;
          expenditures[p] += share;
        });
      }
    });
  });

  // Aggregate who paid at counter (across receipts)
  const paidMap = {};
  (roomData.members || []).forEach(m => { paidMap[m.name] = 0; });
  (roomData.receipts || []).forEach(r => {
    Object.entries(r.payments || {}).forEach(([name, amount]) => {
      if (paidMap[name] === undefined) paidMap[name] = 0;
      paidMap[name] += Number(amount) || 0;
    });
  });

  return (
    <div style={{padding:20}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <h2 style={{marginTop:0}}>{roomData.title} — Combined Report</h2>
        <div>
          <button onClick={() => {
            // Always navigate to Trip Room and restore the specific receipt view
            const rc = state.roomCode || null;
            const ar = state.activeReceiptId || null;
            navigate('/trip-room', { state: { roomCode: rc, activeReceiptId: ar } });
          }} style={{padding:'6px 10px', borderRadius:8, border:'none', background:'#f3f4f6'}}>Back to Bill</button>
        </div>
      </div>
      <div style={{display:'grid', gridTemplateColumns:'1fr 320px', gap:20}}>
        <div>
          <section style={{background:'#fff', padding:16, borderRadius:12, marginBottom:12}}>
            <h4>Trip Summary</h4>
            <TripSummary roomData={roomData} />
          </section>

          <section style={{background:'#fff', padding:16, borderRadius:12}}>
            <h4>Optimized Settlements</h4>
            {settlements.length === 0 ? <div style={{color:'#666'}}>No settlements needed.</div> : (
              settlements.map((s,i) => (
                <div key={i} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:'1px solid #eee'}}>
                  <div>{s.from} → {s.to}</div>
                  <div style={{display:'flex', alignItems:'center', gap:8}}>
                    <strong>₹{s.amount.toFixed(2)}</strong>
                    <QRCodeSVG value={`upi://pay?pa=${encodeURIComponent(s.to || '')}&am=${s.amount}`} size={40} />
                  </div>
                </div>
              ))
            )}
          </section>
        </div>

        <aside style={{background:'#fff', padding:16, borderRadius:12}}>
          <h4>Members</h4>
          {roomData.members.map(m => (
            <div key={m.name} style={{display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid #f3f4f6'}}>
              <div>
                <div style={{fontWeight:600}}>{m.name}</div>
                <div style={{fontSize:12, color:'#666'}}>{m.upi || 'No UPI set'}</div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontSize:14, fontWeight:600}}>₹{(expenditures[m.name] || 0).toFixed(2)}</div>
                <div style={{fontSize:12, color:'#666'}}>Paid ₹{(paidMap[m.name] || 0).toFixed(2)}</div>
              </div>
            </div>
          ))}
        </aside>
      </div>
    </div>
  );
};

export default CombinedReport;
