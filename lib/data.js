// Picks the data source: LIVE (Supabase) if keys are set, otherwise DEMO (browser only).
import { demo } from "./demo";
import { live } from "./live";

export const isLive = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
export const db = isLive ? live : demo;
