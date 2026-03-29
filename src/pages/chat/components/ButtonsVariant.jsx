export default function ButtonsVariant({ options, onSelect, selected }) {
    return (
        <div className="flex flex-wrap gap-2">
            {options.map((opt) => (
                <button
                    key={opt}
                    onClick={() => onSelect(opt)}
                    className={`px-5 py-2.5 text-xs font-bold tracking-widest uppercase rounded-xl border transition ${
                        selected === opt
                            ? "bg-black text-white border-black"
                            : "bg-white border-gray-300 hover:border-black text-gray-700"
                    }`}
                >
                    {opt}
                </button>
            ))}
        </div>
    );
}
