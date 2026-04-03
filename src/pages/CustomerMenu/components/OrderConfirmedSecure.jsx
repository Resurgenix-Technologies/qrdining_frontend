import { CheckCircle2, Sparkles } from 'lucide-react';

export default function OrderConfirmedSecure({ placedOrder, tableNumber, resetOrder }) {
  return (
    <div className="surface-grid flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl border border-[#ddd5ca] bg-white p-8 text-[#111111] shadow-[0_24px_60px_rgba(0,0,0,0.08)] sm:p-10">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[#0c6b2d] bg-[#0c6b2d] text-white">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <p className="mt-6 text-center text-[11px] font-semibold uppercase tracking-[0.28em] text-[#6d655c]">Order Confirmed</p>
        <h1 className="mt-4 text-center text-3xl font-semibold sm:text-4xl">Order placed successfully</h1>
        <p className="mx-auto mt-4 max-w-xl text-center text-sm leading-7 text-[#5c564e]">
          Your payment is verified and the kitchen has the request. We emailed your customer PIN to the address used at checkout, and the waiter will ask for it before final handover.
        </p>

        <div className="mt-8 border border-[#ddd5ca] bg-[#fbf8f2] p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ddd5ca] pb-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#6d655c]">Order Summary</p>
              <p className="mt-2 text-lg font-semibold text-[#111111]">#{placedOrder.orderIdString || placedOrder.id || 'N/A'}</p>
            </div>
            {tableNumber && (
              <span className="border border-[#ddd5ca] bg-white px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#6d655c]">
                Table {tableNumber}
              </span>
            )}
          </div>

          <div className="mt-5 space-y-3">
            {(placedOrder.items || []).map((item, index) => (
              <div key={`${item.name}-${index}`} className="flex items-center justify-between border border-[#ddd5ca] bg-white px-4 py-3 text-sm">
                <span className="text-[#5c564e]">{item.quantity} x {item.name}</span>
                <span className="font-semibold text-[#111111]">₹{Math.round(item.unitPrice * item.quantity)}</span>
              </div>
            ))}
          </div>

          <div className="mt-5 flex items-center justify-between border border-[#ddd5ca] bg-white px-4 py-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#6d655c]">Final Amount</p>
              <p className="mt-1 text-2xl font-semibold text-[#111111]">₹{Math.round(placedOrder.totalAmount || 0)}</p>
            </div>
            <Sparkles className="h-6 w-6 text-[#111111]" />
          </div>
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button onClick={resetOrder} className="glass-button">
            Order More
          </button>
        </div>
      </div>
    </div>
  );
}
