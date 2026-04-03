export const CHATBOT_CRAVING_TAGS = [
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

export function normalizeChatbotTags(tags = []) {
  if (!Array.isArray(tags)) return [];

  const seen = new Set();
  return tags
    .map((tag) => String(tag || "").trim())
    .filter(Boolean)
    .filter((tag) => {
      const key = tag.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}
