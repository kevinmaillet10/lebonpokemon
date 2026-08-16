import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const API_KEY = 'e59a8260ba8561ae4a0a936d641b27e30679920f181aca688b5985a829e66103';

// Liste exacte des séries en échec (IDs de l'API Pokémon TCG)
const TARGET_SERIES = [
  'neo2', 'sm1', 'xy11', 'dc1', 'xy5', 'xy4', 'xyp', 'bw9', 
  'mcd12', 'hgss2', 'swsh45', 'swshp', 'sm12', 'sm115', 'sm9', 
  'mcd14', 'sv2', 'me5', 'sv8pt5', 'sv7', 'sv3pt5'
];

async function fetchWithRetry(url, retries = 5, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, { headers: { 'X-Api-Key': API_KEY } });
      if (res.ok) return res;
      if (res.status === 500 && i < retries - 1) {
        console.warn(`   ⚠️ Erreur 500, nouvelle tentative (${i + 1}/${retries})...`);
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
        continue;
      }
      return res;
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
    }
  }
}

async function importMissingCards() {
  for (const seriesId of TARGET_SERIES) {
    
    let page = 1;
    let pageSize = 250;
    let hasMore = true;

    while (hasMore) {
      const url = `https://api.pokemontcg.io/v2/cards?q=set.id:${seriesId}&page=${page}&pageSize=${pageSize}`;
      
      try {
        const res = await fetchWithRetry(url);

        if (!res || !res.ok) {
          console.error(`❌ Échec définitif pour la série ${seriesId} (HTTP ${res ? res.status : 'Pas de réponse'})`);
          break;
        }

        const data = await res.json();
        const cards = data.data;

        if (!cards || cards.length === 0) {
          hasMore = false;
          break;
        }

        const payload = cards.map(card => ({
          id: card.id,
          set_id: seriesId,
          name: card.name,
          number: card.number,
          rarity: card.rarity || 'Common',
          image_url: card.images?.large || card.images?.small || null,
          supertype: card.supertype || 'Pokémon',
          hp: card.hp || null
        }));

        const { error: upsertError } = await supabase
          .from('cards')
          .upsert(payload, { onConflict: 'id' });

        if (upsertError) {
          console.error(`❌ Erreur insertion Supabase (${seriesId} - Page ${page}):`, upsertError.message);
        } else {
        }

        if (page * pageSize >= data.totalCount) {
          hasMore = false;
        } else {
          page++;
        }

        // Pause de sécurité de 2 secondes entre les pages
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (err) {
        console.error(`❌ Erreur réseau critique sur ${seriesId}:`, err.message);
        break;
      }
    }
    
    // Pause de 3 secondes entre chaque série
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
}

importMissingCards();