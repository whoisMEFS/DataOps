/* ==========================================================
   DataOps | Cliente Supabase (único)

   Todas as telas usam ESTE cliente. Não crie outros.
   SDK oficial carregado como módulo, com versão fixa.
========================================================== */

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.109.0/+esm";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "../config/supabase-config.js";

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new Error("DataOps: configure a URL e a chave publicável em JS/config/supabase-config.js");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
    }
});
