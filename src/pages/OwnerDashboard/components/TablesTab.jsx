import React from 'react';
import { Menu, Printer, Trash2, RefreshCw, Download, Minus, Plus } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function TablesTab({
  tables,
  restaurant,
  addTableCount,
  setAddTableCount,
  actionLoading,
  setIsSidebarOpen,
  handleAddTables,
  handleDeleteTable,
  handleDeleteAllTables,
  handlePrintAllQRs,
  downloadQR,
  isReadOnly
}) {
  return (
    <div className="animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2.5 bg-black text-white rounded-lg flex-shrink-0">
            <Menu className="w-5 h-5" />
          </button>
          <h2 className="text-xl md:text-2xl font-black tracking-tighter uppercase leading-none">Tables</h2>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button onClick={handlePrintAllQRs} className="flex-1 md:flex-none bg-white border border-border text-gray-700 px-3 py-1.5 font-bold uppercase text-[9px] tracking-widest flex items-center justify-center gap-2 rounded-lg hover:bg-gray-50 transition shadow-sm">
            <Printer size={12} /> Print
          </button>
          {!isReadOnly && (
            <button onClick={handleDeleteAllTables} className="flex-1 md:flex-none bg-red-50 border border-red-100 text-red-600 px-3 py-1.5 font-bold uppercase text-[9px] tracking-widest flex items-center justify-center gap-2 rounded-lg hover:bg-red-100 transition shadow-sm">
              <Trash2 size={12} /> Clear
            </button>
          )}
        </div>
      </div>

      {!isReadOnly && (
        <div className="bg-white border border-border p-4 mb-6 flex flex-col sm:flex-row gap-3 items-end rounded-xl shadow-sm">
          <div className="flex-1 w-full flex flex-col items-start">
            <label className="text-[9px] font-bold uppercase tracking-widest text-gray-400 block mb-1.5">Batch Count</label>
            <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden bg-white w-full sm:max-w-[120px] h-[34px]">
              <button onClick={() => setAddTableCount(Math.max(1, addTableCount - 1))} disabled={tables.length >= 10} className="w-10 h-full flex items-center justify-center bg-gray-50 hover:bg-gray-100 text-gray-600 transition border-r border-gray-200 outline-none disabled:opacity-50">
                <Minus size={14} />
              </button>
              <input type="text" value={addTableCount} readOnly className="flex-1 px-2 text-xs font-black text-center outline-none bg-transparent w-full" />
              <button onClick={() => setAddTableCount(Math.min(Math.max(1, 10 - tables.length), addTableCount + 1))} disabled={tables.length >= 10 || addTableCount >= (10 - tables.length)} className="w-10 h-full flex items-center justify-center bg-gray-50 hover:bg-gray-100 text-gray-600 transition border-l border-gray-200 outline-none disabled:opacity-50">
                <Plus size={14} />
              </button>
            </div>
          </div>
          <button onClick={handleAddTables} disabled={actionLoading || tables.length >= 10} className="w-full sm:w-auto bg-black text-white px-6 py-1.5 h-[34px] font-bold uppercase text-[9px] tracking-widest flex items-center justify-center gap-2 rounded-lg hover:bg-gray-800 transition disabled:opacity-50">
            <RefreshCw size={12} className={actionLoading ? 'animate-spin' : ''} /> {tables.length >= 10 ? 'Limit Reached' : 'Generate'}
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {tables.map(table => (
          <div key={table._id} className="bg-white border border-border p-3 rounded-lg flex flex-col items-center hover:shadow-sm transition shadow-sm group">
            <div className="bg-gray-50 p-2 mb-3 rounded-md border border-gray-100 qr-container">
              <QRCodeSVG id={`qr-svg-${table._id}`} value={`${window.location.origin}/chat/${restaurant?.slug || 'default'}/${table.qrToken}`} size={84} level="H" />
            </div>
            <div className="w-full mt-auto">
              <p className="font-black text-xs tracking-tight border-t border-gray-50 pt-2 text-center mb-2">T-{table.tableNumber}</p>
              <div className="flex justify-between items-center gap-1">
                <button onClick={() => downloadQR(table.tableNumber, `qr-svg-${table._id}`)} className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200 py-1 rounded text-[8px] font-bold uppercase tracking-widest transition flex items-center justify-center gap-1">
                  <Download size={10} /> Save
                </button>
                {!isReadOnly && (
                  <button onClick={() => handleDeleteTable(table._id)} className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition">
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
