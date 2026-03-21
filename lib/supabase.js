require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn("⚠️ Faltan las variables de entorno de Supabase. Asegúrate de configurar SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY o SUPABASE_ANON_KEY en .env");
}

const supabaseUrlStr = supabaseUrl || '';
const supabaseKeyStr = supabaseKey || '';

const supabase = createClient(supabaseUrlStr, supabaseKeyStr);

module.exports = { supabase };
