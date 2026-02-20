import React from 'react';

const TripSummary = ({ roomData }) => {
  if (!roomData) return null;

  // Total expenses across all receipts (sum of item price * quantity or consumer count fallback)
  const tripItemsTotal = (roomData.receipts || []).reduce((rtotal, r) => {
    const rSum = (r.items || []).reduce((isum, it) => {
      const unit = Number(it.price || 0);
      const qty = (it.quantity ?? it.qty) ?? ((it.consumers && it.consumers.length > 0) ? it.consumers.length : 1);
      return isum + unit * qty;
    }, 0);
    return rtotal + rSum;
  }, 0);

  // Who paid how much across all receipts
  const paidMap = {};
  (roomData.members || []).forEach(m => { paidMap[m.name] = 0; });
  (roomData.receipts || []).forEach(r => {
    Object.entries(r.payments || {}).forEach(([name, amount]) => {
      if (paidMap[name] === undefined) paidMap[name] = 0;
      paidMap[name] += Number(amount) || 0;
    });
  });

  return (
    <div style={{ background: 'white', padding: '12px', borderRadius: '12px', marginBottom: '12px', border: '1px solid #eee' }}>
      <h4 style={{ margin: '0 0 8px 0' }}>Trip Summary</h4>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ color: '#555' }}>Total Expenses</div>
        <div style={{ fontWeight: 700 }}>₹{tripItemsTotal.toFixed(2)}</div>
      </div>

      <div style={{ marginTop: '8px' }}>
        <div style={{ fontSize: '13px', color: '#666', marginBottom: '6px' }}>Paid at Counter (by member)</div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {(roomData.members || []).map(m => (
            <div key={m.name} style={{ background: '#f3f4f6', padding: '8px 10px', borderRadius: '10px' }}>
              <div style={{ fontSize: '11px', color: '#555' }}>{m.name}</div>
              <div style={{ fontWeight: 600 }}>₹{(paidMap[m.name] || 0).toFixed(2)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TripSummary;
