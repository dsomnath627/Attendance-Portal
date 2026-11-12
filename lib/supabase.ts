import { createClient } from "@supabase/supabase-js";

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();

const isPlaceholderValue = (value: string) => {
  if (!value) return true;
  return (
    value.includes("placeholder") ||
    value.includes("YOUR_PROJECT") ||
    value.includes("YOUR_SUPABASE") ||
    value.includes("example.supabase.co")
  );
};

export const isSupabaseConfigured =
  !!supabaseUrl &&
  !!supabaseAnonKey &&
  !isPlaceholderValue(supabaseUrl) &&
  !isPlaceholderValue(supabaseAnonKey) &&
  /^https?:\/\//i.test(supabaseUrl);

if (!isSupabaseConfigured) {
  console.warn(
    "⚠️ Supabase environment variables are missing or invalid. Please add a real NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local and restart the app."
  );
}

export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl : "https://placeholder.supabase.co",
  isSupabaseConfigured ? supabaseAnonKey : "placeholder-anon-key"
);

