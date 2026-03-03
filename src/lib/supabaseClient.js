import { createClient } from '@supabase/supabase-js';
const SUPABASE_URL = 'https://sucuonebmfhemebscmlo.supabase.co'; // الرابط بتاعك من سوبابيز
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1Y3VvbmVibWZoZW1lYnNjbWxvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NzEwMjEsImV4cCI6MjA4ODA0NzAyMX0.xMLP110xEWRZ0C5Wt69EhXox8i7CynnS5JMvRAYIPtg'; // المفتاح الطويل بتاعك



// التحقق من وجود البيانات
const hasSupabaseConfig = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

let supabase;

if (hasSupabaseConfig) {
  // ده السطر اللي هينور الشاشة يا قائد
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else {
  console.error('[Supabase] البيانات ناقصة يا قائد!');
  // ده لضمان إن الموقع ما يضربش لو الداتا مش موجودة
  supabase = {
    from: () => ({
      select: () => ({ order: () => Promise.resolve({ data: [], error: null }) }),
      insert: () => Promise.resolve({ error: null }),
      update: () => ({ eq: () => Promise.resolve({ error: null }) }),
      eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) })
    })
  };
}

// تصدير الكلاينت والـ flags اللي الكود بتاعك بيحتاجها
export { supabase, hasSupabaseConfig };
export const hasSupabaseClient = hasSupabaseConfig;
