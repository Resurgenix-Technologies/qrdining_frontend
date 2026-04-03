import React from 'react';
import { Menu, Plus, Edit, Trash2 } from 'lucide-react';

export default function MenuTab({
  categories,
  menuItems,
  setIsSidebarOpen,
  setShowCategoryModal,
  setShowItemModal,
  setEditingCategoryId,
  setNewCategory,
  setEditingItemId,
  setNewItem,
  handleDeleteCategory,
  handleDeleteItem,
  isReadOnly
}) {
  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2.5 bg-black text-white rounded-lg flex-shrink-0">
            <Menu className="w-5 h-5" />
          </button>
          <h2 className="text-xl md:text-2xl font-black tracking-tighter uppercase leading-none">Menu</h2>
        </div>
        {!isReadOnly && (
          <div className="flex gap-2">
            <button onClick={() => setShowCategoryModal(true)} className="bg-white border border-border text-black px-4 py-2 font-bold uppercase text-[10px] tracking-widest flex items-center gap-2 rounded-lg hover:bg-gray-50 transition shadow-sm">
              <Plus size={14} /> Add Category
            </button>
            <button onClick={() => { setEditingItemId(null); setNewItem({ name: '', price: '', categoryId: '', description: '', dietType: 'veg', tags: [], imageFile: null }); setShowItemModal(true); }} className="bg-black text-white px-4 py-2 font-bold uppercase text-[10px] tracking-widest flex items-center gap-2 rounded-lg hover:bg-gray-800 transition shadow-sm">
              <Plus size={14} /> Add Item
            </button>
          </div>
        )}
      </div>

      <div className="space-y-8">
        {categories.map(cat => (
          <div key={cat._id} className="pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-sm uppercase tracking-widest text-gray-800">{cat.name}</h3>
              {!isReadOnly && (
                <div className="flex items-center gap-1">
                  <button onClick={() => { setEditingCategoryId(cat._id); setNewCategory(cat.name); setShowCategoryModal(true); }} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded transition flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest border border-transparent hover:border-blue-100"><Edit size={12} /> Edit</button>
                  <button onClick={() => handleDeleteCategory(cat._id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest border border-transparent hover:border-red-100"><Trash2 size={12} /> Drop</button>
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {menuItems.filter(i => i.categoryId === cat._id).map(item => (
                <div key={item._id} className="bg-white border border-border p-4 rounded-lg flex flex-col hover:shadow-sm transition shadow-sm">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-bold text-sm text-gray-900 truncate pr-2">{item.name}</h4>
                    <span className="font-black text-sm text-green-600">₹{item.price}</span>
                  </div>
                  <p className="text-[10px] text-gray-400 mb-3 line-clamp-2 min-h-[1.5rem] leading-tight">{item.description || '...'}</p>
                  <div className="flex items-center justify-between pt-3 border-t border-gray-50 mt-auto">
                    <div className="flex items-center gap-2">
                      {/* Diet indicator */}
                      {item.dietType === 'veg' && (
                        <span title="Vegetarian" className="inline-flex items-center justify-center w-3.5 h-3.5 border border-green-600 flex-shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-600" />
                        </span>
                      )}
                      {item.dietType === 'non-veg' && (
                        <span title="Non-Vegetarian" className="inline-flex items-center justify-center w-3.5 h-3.5 border border-red-600 flex-shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                        </span>
                      )}
                      {item.dietType === 'vegan' && (
                        <span title="Vegan" className="inline-flex items-center justify-center w-3.5 h-3.5 border border-emerald-600 flex-shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                        </span>
                      )}
                      <span className={`text-[8px] font-bold uppercase tracking-widest ${item.isAvailable ? 'text-green-500' : 'text-red-400'}`}>
                        ● {item.isAvailable ? 'Online' : 'Offline'}
                      </span>
                    </div>
                    {!isReadOnly && (
                      <div className="flex items-center gap-1">
                        <button onClick={() => { setEditingItemId(item._id); setNewItem({ name: item.name, price: item.price, categoryId: item.categoryId, description: item.description || '', dietType: item.dietType || 'veg', tags: Array.isArray(item.tags) ? item.tags : [], imageFile: null }); setShowItemModal(true); }} className="text-gray-400 hover:text-blue-500 transition p-1 rounded-md hover:bg-blue-50"><Edit size={12} /></button>
                        <button onClick={() => handleDeleteItem(item._id)} className="text-gray-400 hover:text-red-500 transition p-1 rounded-md hover:bg-red-50"><Trash2 size={12} /></button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
