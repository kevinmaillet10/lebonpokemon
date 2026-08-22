import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://antapclcscsywdileetm.supabase.co', 
  'sb_publishable_FGPhBEowiqCo_-30bR7DMw_8-DtYIfS'
);

async function updateSvpOnlyFromApi() {
  console.log("🔄 Interrogation de l'API TCGdex UNIQUEMENT pour le set 'svp'...");
  
  // On appelle explicitement l'URL de l'API pour le set svp
  const response = await fetch('https://api.tcgdex.net/v2/fr/sets/svp');
  const setData = await response.json();
  
  if (!setData || !setData.cards) {
    console.error("❌ Erreur : Impossible de récupérer le set 'svp' depuis l'API.");
    return;
  }

  console.log(`📦 ${setData.cards.length} cartes trouvées sur l'API pour svp.`);

  for (const card of setData.cards) {
    if (!card.image) continue;
    
    const imageUrl = `${card.image}/high.webp`;
    const cardId = card.id; // ex: svp-175

    // Double sécurité : on met à jour SEULEMENT si l'id correspond ET que le set_id en base est bien 'svp'
    const { error } = await supabase
      .from('cards')
      .update({ image_url: imageUrl })
      .eq('id', cardId)
      .eq('set_id', 'svp');

    if (error) {
      console.error(`❌ Erreur pour ${cardId}:`, error.message);
    }
  }

  console.log("✨ Terminé ! Seul le set 'svp' a été mis à jour via l'API. Les autres sets n'ont pas bougé.");
}

updateSvpOnlyFromApi();