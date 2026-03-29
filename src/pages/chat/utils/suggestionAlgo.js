export const getSuggestions = (userChoices, menuItems) => {
    const {
        people = 1,
        diet = "Veg",
        time = 30,
        occasion = "Friends",
        cravings = [], // array of strings like "Spicy", "Sweet"
    } = userChoices;

    return menuItems
        .map((item) => {
            let score = 0;

            // People match
            if (
                item.amountOfPeople &&
                Math.abs(item.amountOfPeople - people) <= 2
            )
                score += 30;

            // Diet / tags match
            const itemTags = item.tags || [];
            if (
                diet === "Veg" &&
                itemTags.some((t) => ["Veg", "Paneer"].includes(t))
            )
                score += 25;
            if (
                diet === "Non-veg" &&
                itemTags.some((t) => ["Chicken", "Mutton", "Fish"].includes(t))
            )
                score += 25;
            if (diet === "Egg" && itemTags.includes("Egg")) score += 20;

            // Time match
            if (item.makingTime && item.makingTime <= time) score += 20;

            // Cravings match (multi)
            const cravingMatches = cravings.filter((c) =>
                itemTags.includes(c),
            ).length;
            score += cravingMatches * 15;

            // Occasion bonus
            if (itemTags.includes(occasion)) score += 10;

            return { ...item, score };
        })
        .sort((a, b) => b.score - a.score || a.displayOrder - b.displayOrder)
        .slice(0, 6); // top 6 recommendations
};
