// Change these to your own details.
export const CONFIG = {
  appName: "Fyndo",
  // Your WhatsApp number in international format, no + or spaces (e.g. 94771234567)
  whatsapp: "94770000000",
  email: "fyndolk.official@gmail.com",
  // Restaurant owners: yearly fee to verify and manage their page. Paid by bank transfer for now;
  // owners email us for the bank details. (The database also has 5000 in supabase/schema_v5.sql.)
  owner: { feeLkr: 5000, months: 12, payBy: "bank transfer" },
  // Used by the bill estimator (Sri Lanka: usually 10% service charge, then VAT on top). Estimates only.
  serviceCharge: 0.1,
  vat: 0.18,
  // Fallback LKR per 1 USD for Tourist mode, used only if the live rate cannot load.
  usdRate: 330,
};
