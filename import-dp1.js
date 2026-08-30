import { createClient } from '@supabase/supabase-js';
import TCGdex from '@tcgdex/sdk';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const tcgdex = new TCGdex('fr');

async function importDp1Images() {
  console.log("📥 Récupération des images de la série dp1...");
  const set = await tcgdex.set.get('dp1');
  
  if (!set || !set.cards) {
    console.error("❌ Série dp1 introuvable sur l'API.");
    return;
  }

  for (const cardBrief of set.cards) {
    const card = await tcgdex.card.get(cardBrief.id);
    
    if (card) {
      let imageUrl = null;
      if (card.image) {
        imageUrl = `${card.image}/high.png`;
      } else if (card.images?.high) {
        imageUrl = card.images.high;
      }

      if (imageUrl) {
        const { error } = await supabase
          .from('cards')
          .update({ image_url: imageUrl })
          .eq('id', card.id);

        if (error) {
          console.error(`  ❌ Erreur carte ${card.name}:`, error.message);
        } else {
          console.log(`  ✅ Mis à jour : ${card.name}`);
        }
      }
    }
  }
  console.log("\n✨ Importation des images de dp1 terminée !");
}

importDp1Images();