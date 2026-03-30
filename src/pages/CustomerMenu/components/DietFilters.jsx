export default function DietFilters({ menu, categoryItems, dietFilter, setDietFilter }) {
  if (!menu || menu.length === 0 || !categoryItems || categoryItems.length === 0) return null;

  return (
    <div className="bg-gray-50 border-b border-border z-30 flex-shrink-0">
      <div className="max-w-2xl mx-auto px-4 py-2 flex items-center gap-3 overflow-x-auto hide-scrollbar">
        {['all', 'veg', 'non-veg', 'vegan'].map((type) => (
          <button
            key={type}
            onClick={() => setDietFilter(type)}
            className={`flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold uppercase tracking-widest border transition-colors rounded ${dietFilter === type ? 'bg-black text-white border-black' : 'bg-white text-muted border-border hover:bg-gray-100'}`}
          >
            {type === 'veg' && <span className="w-2 h-2 rounded-full bg-green-500" />}
            {type === 'non-veg' && <span className="w-2 h-2 rounded-full bg-red-500" />}
            {type === 'vegan' && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
            {type}
          </button>
        ))}
      </div>
    </div>
  );
}
