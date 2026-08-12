import { createClient } from '@supabase/supabase-js';
import TCGdex from '@tcgdex/sdk';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const tcgdex = new TCGdex('fr');

async function importBaseSet2() {
  const seriesId = 'base-set-2';
  console.log(`\n📥 Tentative d'importation pour la série : ${seriesId}...`);
  
  const set = await tcgdex.set.get(seriesId);
  if (!set) {
    console.warn(`⚠️ Série toujours introuvable avec le slug : ${seriesId}`);
    return;
  }

  const seriesPayload = {
    id: set.id,
    name: set.name,
    block_name: set.serie?.name || 'Autres séries',
    release_date: set.releaseDate || '2000-01-01',
    logo_url: set.logo ? `${set.logo}.png` : null,
    symbol_url: set.symbol ? `${set.symbol}.png` : null
  };

  await supabase.from('series').upsert(seriesPayload, { onConflict: 'id' });

  if (set.cards && set.cards.length > 0) {
    console.log(`   ➔ Importation de ${set.cards.length} cartes pour ${set.name}...`);
    
    for (const cardBrief of set.cards) {
      const card = await tcgdex.card.get(cardBrief.id);
      if (card && card.name) {
        const cardPayload = {
          id: card.id,
          set_id: set.id,
          name: card.name, 
          number: card.localId,
          rarity: card.rarity || 'Common',
          image_url: card.image ? `${card.image}/high.png` : null,
          supertype: card.category || 'Pokémon'
        };
        await supabase.from('cards').upsert(cardPayload, { onConflict: 'id' });
      }
    }
    console.log(`   ✨ ${set.name} synchronisée avec succès !`);
  }
}

importBaseSet2();