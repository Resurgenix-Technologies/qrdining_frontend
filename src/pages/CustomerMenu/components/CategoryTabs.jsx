export default function CategoryTabs({ menu, activeCategory, setActiveCategory }) {
  if (!menu || menu.length === 0) return null;
  
  return (
    <div className="border-b border-border sticky top-0 bg-white z-40 flex-shrink-0">
      <div className="max-w-2xl mx-auto px-4">
        <div className="flex gap-0.5 overflow-x-auto hide-scrollbar py-2">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-3 py-1.5 text-[10px] font-bold tracking-widest uppercase whitespace-nowrap transition-colors ${activeCategory === 'all' ? 'bg-black text-white' : 'text-muted hover:text-black'}`}
          >
            All
          </button>
          {menu.map(cat => (
            <button
              key={cat._id}
              onClick={() => setActiveCategory(cat._id)}
              className={`px-3 py-1.5 text-[10px] font-bold tracking-widest uppercase whitespace-nowrap transition-colors ${activeCategory === cat._id ? 'bg-black text-white' : 'text-muted hover:text-black'}`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
