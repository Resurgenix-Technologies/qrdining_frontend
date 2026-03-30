import React from 'react';
import { ArrowRight, Banknote, AlertCircle, ArrowLeft } from 'lucide-react';

export default function PaymentsTab({
  dailyEarnings,
  earningsSummary,
  totalReceived,
  thisMonthReceived,
  pendingAmount,
  lastPayment,
  filteredPayouts,
  payoutDateFilter,
  setPayoutDateFilter,
  payoutStatusFilter,
  setPayoutStatusFilter,
  setSelectedPayout,
  restaurant,
  setShowBankEdit,
  setActiveTab
}) {
  const maxEarning =
    dailyEarnings.length > 0
      ? Math.max(...dailyEarnings.map((d) => d.amount), 1)
      : 1;

  return (
    <div className="animate-fade-in space-y-6 px-1 md:px-2">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => setActiveTab('orders')} className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition text-gray-600 flex items-center justify-center">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-xl md:text-2xl font-extrabold tracking-tight text-gray-900">
              Payments Dashboard
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              Track your earnings, payouts & settlements in real-time
            </p>
          </div>
        </div>
      </div>

      {/* TOP CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">

        {/* TODAY */}
        <div className="lg:col-span-2 bg-gradient-to-br from-blue-600 to-blue-700 text-white p-5 rounded-2xl shadow-lg">
          <p className="text-xs opacity-80">Today's Sales</p>
          <h2 className="text-3xl font-bold mt-1">
            ₹{(earningsSummary?.today?.amount || 0).toLocaleString()}
          </h2>
          <p className="text-xs mt-1 opacity-80">
            {earningsSummary?.today?.orders || 0} orders
          </p>

          <div className="mt-3 text-xs font-semibold">
            {earningsSummary?.today?.payoutStatus === 'Paid'
              ? '✅ Money Sent'
              : '⏳ Awaiting Transfer'}
          </div>
        </div>

        {/* YESTERDAY */}
        <div className="lg:col-span-2 bg-white border rounded-2xl p-5 shadow-sm">
          <p className="text-xs text-gray-400">Yesterday</p>
          <h2 className="text-3xl font-bold text-gray-800 mt-1">
            ₹{(earningsSummary?.yesterday?.amount || 0).toLocaleString()}
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            {earningsSummary?.yesterday?.orders || 0} orders
          </p>
        </div>

        {/* SMALL CARDS */}
        <div className="bg-black text-white p-4 rounded-2xl">
          <p className="text-xs opacity-70">Total Received</p>
          <h3 className="text-lg font-bold">
            ₹{(totalReceived || 0).toLocaleString()}
          </h3>
        </div>

        <div className="bg-white border rounded-2xl p-4">
          <p className="text-xs text-gray-400">This Month</p>
          <h3 className="text-lg font-bold text-green-600">
            ₹{(thisMonthReceived || 0).toLocaleString()}
          </h3>
        </div>

        <div className="bg-white border rounded-2xl p-4">
          <p className="text-xs text-gray-400">Pending</p>
          <h3 className="text-lg font-bold text-yellow-500">
            ₹{(pendingAmount || 0).toLocaleString()}
          </h3>
        </div>

        <div className="bg-white border rounded-2xl p-4">
          <p className="text-xs text-gray-400">Last Payment</p>
          <h3 className="text-sm font-bold">
            {lastPayment
              ? new Date(lastPayment.updatedAt).toLocaleDateString('en-IN')
              : '—'}
          </h3>
        </div>
      </div>

      {/* CHART */}
      <div className="bg-white border rounded-2xl p-5 shadow-sm">
        <h3 className="text-sm font-bold text-gray-800 mb-3">
          Daily Sales (Last 30 Days)
        </h3>

        <div className="flex items-end gap-1 h-28">
          {dailyEarnings.map((day) => {
            const height =
              day.amount > 0
                ? Math.max((day.amount / maxEarning) * 100, 10)
                : 5;

            return (
              <div key={day.date} className="flex-1 group relative">
                <div
                  className={`rounded-t-md transition-all duration-300 ${
                    day.amount > 0
                      ? 'bg-green-500 hover:bg-green-600'
                      : 'bg-gray-200'
                  }`}
                  style={{ height: `${height}%` }}
                />

                {/* tooltip */}
                <div className="absolute hidden group-hover:block bottom-full left-1/2 -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded">
                  ₹{day.amount}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MAIN SECTION */}
      <div className="grid lg:grid-cols-3 gap-6">

        {/* TABLE */}
        <div className="lg:col-span-2 bg-white border rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 flex justify-between items-center border-b">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <ArrowRight size={16} /> Payment History
            </h3>

            <div className="flex gap-2">
              <select
                value={payoutDateFilter}
                onChange={(e) => setPayoutDateFilter(e.target.value)}
                className="text-xs border rounded px-2 py-1"
              >
                <option value="all">All</option>
                <option value="7_days">7 Days</option>
                <option value="this_month">Month</option>
              </select>

              <select
                value={payoutStatusFilter}
                onChange={(e) => setPayoutStatusFilter(e.target.value)}
                className="text-xs border rounded px-2 py-1"
              >
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
              </select>
            </div>
          </div>

          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-400 text-xs uppercase">
              <tr>
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-left">Type</th>
                <th className="p-3 text-right">Amount</th>
                <th className="p-3 text-right">Status</th>
              </tr>
            </thead>

            <tbody>
              {filteredPayouts.map((p) => (
                <tr
                  key={p._id}
                  onClick={() => setSelectedPayout(p)}
                  className="border-t hover:bg-gray-50 cursor-pointer"
                >
                  <td className="p-3">
                    {new Date(p.createdAt).toLocaleDateString()}
                  </td>

                  <td className="p-3 font-medium">
                    {p.type}
                    <div className="text-xs text-gray-400">
                      {p.referenceId || '—'}
                    </div>
                  </td>

                  <td className="p-3 text-right font-bold">
                    ₹{p.amount.toLocaleString()}
                  </td>

                  <td className="p-3 text-right">
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        p.status === 'Paid'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}

              {filteredPayouts.length === 0 && (
                <tr>
                  <td colSpan="4" className="text-center p-6 text-gray-400">
                    No Data Found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* BANK PANEL */}
        <div className="bg-white border rounded-2xl p-5 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold flex gap-2 items-center">
              <Banknote size={16} /> Bank Details
            </h3>

            <button
              onClick={() => setShowBankEdit(true)}
              className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded hover:bg-blue-100"
            >
              Edit
            </button>
          </div>

          {restaurant?.paymentInfo?.method ? (
            <div className="space-y-3 text-sm">
              <p className="text-gray-500">
                Method: <b>{restaurant.paymentInfo.method}</b>
              </p>

              {restaurant.paymentInfo.method === 'upi' ? (
                <p>
                  UPI: <b>{restaurant.paymentInfo.upiId}</b>
                </p>
              ) : (
                <>
                  <p>
                    Name: <b>{restaurant.paymentInfo.accountHolderName}</b>
                  </p>
                  <p>
                    Bank: <b>{restaurant.paymentInfo.bankName}</b>
                  </p>
                  <p>
                    Account: <b>••••{restaurant.paymentInfo.accountNumber?.slice(-4)}</b>
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="text-center py-6 text-yellow-600">
              <AlertCircle className="mx-auto mb-2" />
              No Bank Details Added
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

