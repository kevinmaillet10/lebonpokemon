import { createClient } from '@supabase/supabase-js';
import TCGdex from '@tcgdex/sdk';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const tcgdex = new TCGdex('fr');

async function updateAllSeriesLogos() {
  console.log("🔄 Mise à jour globale des logos via TCGdex...");

  const { data: seriesList, error: fetchError } = await supabase.from('series').select('id, name');

  if (fetchError) {
    console.error("❌ Erreur de récupération:", fetchError.message);
    return;
  }

  for (const row of seriesList) {
    // 🚫 Ignore les séries Pokémon Pocket (commençant par A, B ou P-)
    if (row.id.startsWith('A') || row.id.startsWith('B') || row.id.startsWith('P-')) {
      console.log(`⏩ Ignoré (Pokémon Pocket) : ${row.name} (${row.id})`);
      continue;
    }

    const set = await tcgdex.set.get(row.id);
    
    if (set && set.logo) {
      let logoUrl = set.logo;
      if (!logoUrl.endsWith('.png')) {
        logoUrl = `${logoUrl}.png`;
      }

      const { error: updateError } = await supabase
        .from('series')
        .update({ logo_url: logoUrl })
        .eq('id', row.id);

      if (updateError) {
        console.error(`❌ Erreur pour ${row.name}:`, updateError.message);
      } else {
        console.log(`✅ Logo mis à jour : ${row.name} -> ${logoUrl}`);
      }
    } else {
      console.warn(`⚠️ Pas de logo dispo sur TCGdex pour : ${row.name} (${row.id})`);
    }
  }

  console.log("\n🚀 Synchronisation des logos terminée !");
}

updateAllSeriesLogos();