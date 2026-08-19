// config.js
// Reemplaza con los valores de tu proyecto en Supabase (Project Settings > API)
const SUPABASE_URL = "https://oktjgrpzmxiulprfwxon.supabase.co/rest/v1/";
const SUPABASE_ANON_KEY = "sb_publishable_20SQMXITL-fZx9x6lertgw_wwPj-Tqq";

// Inicializar cliente de Supabase
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Configuración general
const APP_CONFIG = {
  adminWhatsApp: "527221017160",
  neighborhoods: ["Crueles", "Dráculas"]
};
