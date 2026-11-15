// Facilities people filter by, and "occasions" that map to moods.
export const FEATURES = [
  { id: "wheelchair", label: "Wheelchair access", emoji: "♿" },
  { id: "parking", label: "Parking", emoji: "🅿️" },
  { id: "kid_friendly", label: "Kid friendly", emoji: "🧒" },
  { id: "quiet", label: "Quiet to talk", emoji: "🤫" },
  { id: "wifi", label: "Wi-Fi", emoji: "📶" },
  { id: "plug_points", label: "Plug points", emoji: "🔌" },
  { id: "ac", label: "AC", emoji: "❄️" },
  { id: "outdoor_seating", label: "Outdoor seating", emoji: "🌿" },
  { id: "no_alcohol", label: "No alcohol", emoji: "🚫" },
  { id: "halal", label: "Halal", emoji: "☪️" },
  { id: "prayer_room", label: "Prayer room", emoji: "🕌" },
  { id: "pet_friendly", label: "Pet friendly", emoji: "🐾" },
];
export const featureOf = (id) => FEATURES.find((f) => f.id === id);

// moods: spot needs ANY of these. needs: spot must have ALL of these facilities.
export const OCCASIONS = [
  { id: "birthday", label: "Birthday", emoji: "🎂", moods: ["Lively", "With friends", "Date night"] },
  { id: "anniversary", label: "Anniversary", emoji: "💍", moods: ["Romantic", "Date night", "Quiet"] },
  { id: "first_date", label: "First date", emoji: "💞", moods: ["Date night", "Cozy café", "Quiet"] },
  { id: "office_lunch", label: "Office lunch", emoji: "💼", moods: ["Budget", "With friends"] },
  { id: "farewell", label: "Farewell", emoji: "🥂", moods: ["With friends", "Lively"] },
  { id: "parents", label: "Parents visiting", emoji: "👨‍👩‍👧", moods: ["Family", "Quiet"] },
  { id: "study", label: "Study session", emoji: "📚", moods: ["Cozy café", "Quiet"], needs: ["wifi"] },
];

// Review quick tags
export const REVIEW_TAGS = [
  { id: "food", label: "Great food" }, { id: "service", label: "Friendly service" },
  { id: "value", label: "Worth the price" }, { id: "vibe", label: "Nice vibe" },
  { id: "clean", label: "Clean" }, { id: "fast", label: "Quick" },
];

// Dish labels used in menus (Admin/owner type them as: Item | Price | veg, spicy2, star)
export const DISH_TAGS = { veg: "Vegetarian", vegan: "Vegan", halal: "Halal", nuts: "Contains nuts", star: "Signature",
  spicy1: "Mild", spicy2: "Spicy", spicy3: "Very spicy" };

// Who the review writer went with (shows "good for" from real visitors)
export const VISIT_TYPES = [
  { id: "date", label: "Date night" }, { id: "friends", label: "With friends" }, { id: "family", label: "Family" },
  { id: "solo", label: "Solo" }, { id: "quick", label: "Quick bite" },
];
export const visitLabel = (id) => (VISIT_TYPES.find((v) => v.id === id) || { label: "" }).label;
