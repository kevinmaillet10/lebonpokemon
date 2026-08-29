import { createClient } from '@supabase/supabase-js';
import TCGdex from '@tcgdex/sdk';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const tcgdex = new TCGdex('fr');

async function updateCardImagesOnly() {
  console.log("🔄 Récupération de la liste des séries depuis TCGdex...");
  const sets = await tcgdex.set.list();

  if (!sets) {
    console.error("❌ Impossible de récupérer les séries.");
    return;
  }

  for (const setBrief of sets) {
    // 🚫 Ignore les séries Pokémon Pocket
    if (setBrief.id.startsWith('A') || setBrief.id.startsWith('B') || setBrief.id.startsWith('P-') || setBrief.name.toLowerCase().includes('pocket')) {
      continue;
    }

    console.log(`\n📥 Mise à jour des images pour la série : ${setBrief.name} (${setBrief.id})...`);
    
    const set = await tcgdex.set.get(setBrief.id);
    if (!set || !set.cards) continue;

    for (const cardBrief of set.cards) {
      const card = await tcgdex.card.get(cardBrief.id);
      
      if (card && card.id) {
        // Construction propre de l'URL au format PNG haute définition
        let imageUrl = null;
        if (card.image) {
          imageUrl = `${card.image}/high.png`;
        } else if (card.images?.high) {
          imageUrl = card.images.high;
        }

        if (imageUrl) {
          // MISE À JOUR CIBLÉE : Ne touche QUE la colonne image_url pour cette carte
          const { error } = await supabase
            .from('cards')
            .update({ image_url: imageUrl })
            .eq('id', card.id);

          if (error) {
            console.error(`  ❌ Erreur pour la carte ${card.name} (${card.id}):`, error.message);
          }
        }
      }
    }
    console.log(`  ✅ Série ${set.name} mise à jour.`);
  }
  console.log("\n✨ Mise à jour de toutes les images terminée avec succès !");
}

updateCardImagesOnly();