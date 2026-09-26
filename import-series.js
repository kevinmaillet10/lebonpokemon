import { createClient } from '@supabase/supabase-js';
import TCGdex from '@tcgdex/sdk';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const tcgdex = new TCGdex('fr');

async function syncAllSeriesAndLogos() {
  console.log("🔄 Synchronisation globale des extensions et logos via TCGdex...");

  try {
    const sets = await tcgdex.set.list();

    if (!sets || sets.length === 0) {
      console.log("❌ Aucune extension trouvée sur l'API TCGdex.");
      return;
    }

    for (const set of sets) {
      if (set.id.startsWith('A') || set.id.startsWith('B') || set.id.startsWith('P-')) {
        console.log(`⏩ Ignoré (Pokémon Pocket) : ${set.name} (${set.id})`);
        continue;
      }

      let logoUrl = set.logo || null;
      if (logoUrl && !logoUrl.endsWith('.png')) {
        logoUrl = `${logoUrl}.png`;
      }

      const { error: upsertError } = await supabase
        .from('series')
        .upsert({
          id: set.id,
          name: set.name,
          logo_url: logoUrl,
          card_count: set.cardCount?.total || 0
        }, { onConflict: 'id' });

      if (upsertError) {
        console.error(`❌ Erreur pour ${set.name} (${set.id}):`, upsertError.message);
      } else {
        console.log(`✅ Synchronisé : ${set.name} (${set.id})`);
      }
    }

    console.log("\n🚀 Synchronisation des extensions et logos terminée avec succès !");
  } catch (err) {
    console.error("❌ Erreur critique lors de la récupération TCGdex :", err);
  }
}

syncAllSeriesAndLogos();