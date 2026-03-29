import { useState } from "react";

const cravingsList = [
    "Spicy",
    "Sweet",
    "Light",
    "Heavy",
    "Drinks",
    "Snacks",
    "Diabetic",
    "Niramish",
    "Halal",
    "Vegan",
];

export default function BadgesVariant({ selected, onChange }) {
    const toggle = (craving) => {
        if (selected.includes(craving)) {
            onChange(selected.filter((c) => c !== craving));
        } else {
            onChange([...selected, craving]);
        }
    };

    return (
        <div className="flex flex-wrap gap-2">
            {cravingsList.map((craving) => {
                const isSelected = selected.includes(craving);
                return (
                    <button
                        key={craving}
                        onClick={() => toggle(craving)}
                        className={`px-4 py-1.5 text-xs font-bold tracking-widest uppercase rounded-full border transition-all ${
                            isSelected
                                ? "bg-black text-white border-black"
                                : "bg-white border-gray-300 hover:border-black text-gray-600"
                        }`}
                    >
                        {craving}
                    </button>
                );
            })}
        </div>
    );
}
