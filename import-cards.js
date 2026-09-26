import { createClient } from '@supabase/supabase-js';
import TCGdex from '@tcgdex/sdk';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const tcgdex = new TCGdex('fr');

// Ajout du paramètre optionnel targetSetId pour forcer une seule série si besoin
async function importSeriesAndCards(targetSetId = null) {
  console.log("🔄 Récupération de la liste des séries depuis TCGdex...");
  
  let sets = [];
  if (targetSetId) {
    const singleSet = await tcgdex.set.get(targetSetId);
    if (singleSet) sets = [{ id: singleSet.id, name: singleSet.name }];
  } else {
    sets = await tcgdex.set.list();
  }

  if (!sets || sets.length === 0) {
    console.error("❌ Impossible de récupérer les séries.");
    return;
  }

  console.log("🔍 Vérification des séries déjà présentes dans Supabase...");
  const { data: existingCards, error: dbError } = await supabase
    .from('cards')
    .select('set_id');

  if (dbError) {
    console.error("❌ Erreur lors de la lecture de Supabase :", dbError.message);
    return;
  }

  const importedSetIds = new Set(existingCards.map(card => card.set_id));
  console.log(`📊 ${importedSetIds.size} séries trouvées en base comme déjà importées.\n`);

  for (const setBrief of sets) {
    // 🚫 Ignore les séries Pokémon Pocket
    if (setBrief.id.startsWith('A') || setBrief.id.startsWith('B') || setBrief.id.startsWith('P-') || setBrief.name.toLowerCase().includes('pocket')) {
      console.log(`⏩ Ignoré (Pokémon Pocket) : ${setBrief.name} (${setBrief.id})`);
      continue;
    }

    // 🚨 LA CORRECTION EST ICI : Si la série est déjà importée et qu'on ne force pas l'import, on passe au suivant !
    if (!targetSetId && importedSetIds.has(setBrief.id)) {
      console.log(`✅ Déjà importée, on ignore : ${setBrief.name} (${setBrief.id})`);
      continue;
    }

    console.log(`\n📥 Traitement de la série : ${setBrief.name} (${setBrief.id})...`);
    
    const set = await tcgdex.set.get(setBrief.id);
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

    // 2. Traitement complet des cartes de la série
    if (set.cards) {
      for (const cardBrief of set.cards) {
        const card = await tcgdex.card.get(cardBrief.id);
        
        if (card && card.name) {
          let imageUrl = null;
          if (set.id === 'ecard3') {
            imageUrl = `/cartes pokemon/ecard3/${card.localId}.webp`;
          } else {
            // Comportement standard TCGdex pour les autres sets
            if (card.image) {
              imageUrl = `${card.image}/high.png`;
            } else if (card.images?.high) {
              imageUrl = card.images.high;
            }
          }

          const cardPayload = {
            id: card.id,
            set_id: set.id,
            name: card.name, 
            number: card.localId,
            rarity: card.rarity || 'Common',
            image_url: imageUrl,
            supertype: card.category || 'Pokémon',
            variants: card.variants || null,
            hp: card.hp ? parseInt(card.hp, 10) : null,
            illustrator: card.illustrator || null,
            category: card.category || null,
            stage: card.stage || null,
            regulation_mark: card.regulationMark || null,
            types: card.types || [],
            dex_id: card.dexId || (card.dexIds ? card.dexIds[0] : null)
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

// LANCE LE SCRIPT :
// Option A : Mode 100% Automatique (va scanner très vite et ne télécharger que la/les nouvelles manquantes)
importSeriesAndCards();

// Option B : Si tu veux forcer une série précise (décommente la ligne ci-dessous et commente l'autre)
// importSeriesAndCards('ID_DE_LA_SERIE');