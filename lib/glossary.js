// Plain-English notes for tourists. Matched against menu item names.
const G = [
  ["lamprais", "Rice and curry baked in a banana leaf parcel, a Dutch Burgher classic."],
  ["kottu", "Chopped flatbread stir-fried with veg, egg or meat and spices. Loud and delicious."],
  ["string hopper", "Steamed rice-noodle nests, eaten with curry and sambol."],
  ["idiyappam", "Steamed rice-noodle nests, eaten with curry and sambol."],
  ["hopper", "Bowl-shaped crispy pancake. Often with an egg in the middle."],
  ["appa", "Bowl-shaped crispy pancake. Often with an egg in the middle."],
  ["pol sambol", "Fresh coconut, chilli and lime. Spicy and bright."],
  ["lunu miris", "A fiery onion and chilli paste. Use a little."],
  ["watalappan", "Steamed coconut custard with jaggery, cardamom and nutmeg."],
  ["rice and curry", "A plate of rice with several small curries (veg, dhal, fish or chicken) and sambol."],
  ["mallum", "Finely chopped leaves mixed with coconut. Mild and fresh."],
  ["parippu", "Red lentil curry. Mild, creamy and comforting."],
  ["devilled", "Stir-fried in a sweet, spicy and tangy sauce."],
  ["kiribath", "Rice cooked in coconut milk and cut in diamonds. Eaten at celebrations."],
  ["isso", "Crispy prawn fritter. A popular street snack."],
  ["wade", "Crispy lentil fritter. A popular street snack."],
  ["curd and treacle", "Buffalo curd with sweet palm syrup. A local dessert."],
  ["faluda", "Cold milk drink with jelly, basil seeds, ice cream and rose syrup."],
  ["short eats", "Small savoury snacks like rolls, patties and cutlets."],
  ["roti", "Soft flatbread, sometimes stuffed with veg or egg."],
  ["pittu", "Steamed rice flour and coconut cylinders."],
  ["biriyani", "Spiced rice layered with meat. Check the spice level."],
];
export function dishNote(name) {
  const n = String(name || "").toLowerCase();
  const hit = G.find(([k]) => n.includes(k));
  return hit ? hit[1] : "";
}
