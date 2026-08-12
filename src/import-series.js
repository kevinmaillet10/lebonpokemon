import { createClient } from '@supabase/supabase-js';
import TCGdex from '@tcgdex/sdk';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const tcgdex = new TCGdex();
tcgdex.setLang('fr');

async function importSeriesAndCards() {
  console.log("🔄 Récupération de la liste des séries depuis TCGdex...");
  const sets = await tcgdex.sets.list({ lang: 'fr' });

  if (!sets) {
    console.error("❌ Impossible de récupérer les séries.");
    return;
  }

  // OPTIMISATION CRITIQUE : On récupère la liste de tous les set_id déjà en base en UNE seule requête
  // pour éviter de saturer Supabase avec des centaines de requêtes individuelles.
  console.log("🔍 Vérification des séries déjà présentes dans Supabase...");
  const { data: existingCards, error: dbError } = await supabase
    .from('cards')
    .select('set_id');

  if (dbError) {
    console.error("❌ Erreur lors de la lecture de Supabase :", dbError.message);
    return;
  }

  // On crée un Set JavaScript contenant les IDs des séries déjà enregistrées pour une recherche instantanée
  const importedSetIds = new Set(existingCards.map(card => card.set_id));
  console.log(`📊 ${importedSetIds.size} séries trouvées en base comme déjà importées.\n`);

  for (const setBrief of sets) {
    // Si la série est déjà connue en base, on la saute immédiatement sans appeler l'API TCGdex
    if (importedSetIds.has(setBrief.id)) {
      console.log(`⏩ Série déjà importée : ${setBrief.name} (${setBrief.id}) - Ignorée.`);
      continue;
    }

    console.log(`\n📥 Traitement de la série : ${setBrief.name} (${setBrief.id})...`);
    
    const set = await tcgdex.sets.get(setBrief.id, { lang: 'fr' });
    if (!set) continue;

    // 1. Insertion de la série
    const seriesPayload = {
      id: set.id,
      name: set.name,
      block_name: set.serie?.name || 'Autres séries',
      release_date: set.releaseDate || '2000-01-01',
      logo_url: set.logo ? `${set.logo}.png` : null,
      symbol_url: set.symbol ? `${set.symbol}.png` : null
    };

    const { error: seriesError } = await supabase
      .from('series')
      .upsert(seriesPayload, { onConflict: 'id' });

    if (seriesError) {
      console.error(`❌ Erreur série ${set.name}:`, seriesError.message);
      continue;
    }

    // 2. Traitement des cartes de la série
    if (set.cards) {
      for (const cardBrief of set.cards) {
        const card = await tcgdex.cards.get(cardBrief.id, { lang: 'fr' });
        
        if (card && card.name) {
          const cardPayload = {
            id: card.id,
            set_id: set.id,
            name: card.name, 
            number: card.localId,
            image_url: card.image ? `${card.image}/high.png` : null
          };

          const { error: cardError } = await supabase
            .from('cards')
            .upsert(cardPayload, { onConflict: 'id' });

          if (cardError) {
            console.error(`  ❌ Erreur carte ${card.name}:`, cardError.message);
          }
        }
      }
      console.log(`  📦 ${set.cards.length} cartes importées pour ${set.name}`);
    }
  }
  console.log("\n✨ Synchronisation intelligente terminée !");
}

importSeriesAndCards();