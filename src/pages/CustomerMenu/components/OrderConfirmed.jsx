import { ShoppingBag } from 'lucide-react';

export default function OrderConfirmed({ placedOrder, tableNumber, resetOrder }) {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
      <div className="w-16 h-16 bg-black flex items-center justify-center mx-auto mb-6">
        <ShoppingBag className="w-8 h-8 text-white" />
      </div>
      <h1 className="text-3xl font-black mb-2">Order Placed!</h1>
      <p className="text-muted text-sm mb-6">Your order is being prepared.</p>
      <div className="border border-border p-6 w-full max-w-sm">
        <p className="text-[10px] font-bold tracking-widest uppercase text-muted mb-4">Order Summary</p>
        {(placedOrder.items || []).map((item, i) => (
          <div key={i} className="flex justify-between text-sm mb-1">
            <span>{item.quantity}× {item.name}</span>
            <span className="font-bold">₹{(item.unitPrice * item.quantity).toFixed(0)}</span>
          </div>
        ))}
        <div className="flex justify-between text-sm font-black pt-3 border-t border-border mt-3">
          <span>Total</span><span>₹{(placedOrder.totalAmount || 0).toFixed(0)}</span>
        </div>
        <p className="text-[10px] font-bold tracking-widest uppercase text-muted mt-4">
          Order ID: #{placedOrder.orderIdString || (placedOrder._id ? placedOrder._id.toString().slice(-6).toUpperCase() : 'N/A')}
        </p>
        <p className="text-xs text-muted mt-1">Payment confirmed through Cashfree.</p>
        {tableNumber && <p className="text-xs text-muted mt-1">Table {tableNumber} • Pay at counter</p>}
      </div>
      <button onClick={resetOrder} className="btn-primary mt-6">
        Order More
      </button>
    </div>
  );
}
