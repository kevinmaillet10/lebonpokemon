import { createClient } from '@supabase/supabase-js';
import TCGdex from '@tcgdex/sdk';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const tcgdex = new TCGdex('fr'); // 🇫🇷 Initialise en français

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function importFrenchData() {
  console.log("🔄 Récupération de toutes les extensions (sets) en français depuis TCGdex...");
  
  // Récupère la liste de tous les sets/extensions
  const sets = await tcgdex.set.list();

  if (!sets) {
    console.error("❌ Impossible de récupérer les extensions.");
    return;
  }

  console.log(`📦 ${sets.length} extensions trouvées. Début de l'importation...\n`);

  for (const setBrief of sets) {
    console.log(`📥 Traitement de l'extension : ${setBrief.name} (${setBrief.id})...`);
    
    try {
      // Récupère les détails complets du set avec ses cartes
      const set = await tcgdex.set.get(setBrief.id);
      if (!set) continue;

      const seriesPayload = {
        id: set.id,
        name: set.name,
        block_name: set.serie?.name || 'Autres séries',
        release_date: set.releaseDate || '2000-01-01',
        logo_url: set.logo ? `${set.logo}.png` : null,
        symbol_url: set.symbol ? `${set.symbol}.png` : null
      };

      // Insertion/Mise à jour de l'extension dans la table 'series'
      const { error: seriesError } = await supabase
        .from('series')
        .upsert(seriesPayload, { onConflict: 'id' });

      if (seriesError) {
        console.error(`❌ Erreur extension ${set.name}:`, seriesError.message);
        continue;
      }

      if (set.cards && set.cards.length > 0) {
        for (const cardBrief of set.cards) {
          const card = await tcgdex.card.get(cardBrief.id);
          
          if (card && card.name) {
            const cardPayload = {
              id: card.id,
              set_id: set.id,
              name: card.name, // Nom en français (ex: Dracaufeu)
              number: card.localId,
              rarity: card.rarity || 'Commune',
              image_url: card.image ? `${card.image}/high.png` : null,
              supertype: card.category || 'Pokémon',
              hp: card.hp ? String(card.hp) : null
            };

            await supabase
              .from('cards')
              .upsert(cardPayload, { onConflict: 'id' });
          }
        }
        console.log(`  ➔ ${set.cards.length} cartes en français importées pour ${set.name}`);
      }
    } catch (err) {
      console.error(`❌ Erreur sur l'extension ${setBrief.name}:`, err.message);
    }

    // Petite pause pour ne pas saturer l'API
    await sleep(250);
  }

  console.log("\n✨ Importation francophone des séries et cartes terminée avec succès !");
}

importFrenchData();