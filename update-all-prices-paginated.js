import { createClient } from '@supabase/supabase-js';

// Utilise les variables d'environnement de GitHub, ou tes clés par défaut en local
const supabaseUrl = process.env.SUPABASE_URL || 'https://antapclcscsywdileetm.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'sb_publishable_FGPhBEowiqCo_-30bR7DMw_8-DtYIfS';

const supabase = createClient(supabaseUrl, supabaseKey);
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function updateAllPricesPaginated() {
  console.log("💰 Récupération de TOUTES les cartes (pagination par blocs de 1000)...");

  let allCards = [];
  let page = 0;
  const pageSize = 1000;
  let fetchMore = true;

  // 1. Récupérer toutes les cartes de la base par paquets de 1000 pour contourner la limite Supabase
  while (fetchMore) {
    const { data, error } = await supabase
      .from('cards')
      .select('id, set_id, number')
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      console.log("❌ Erreur Supabase :", error.message);
      break;
    }

    if (data && data.length > 0) {
      allCards = allCards.concat(data);
      console.log(`📥 Chargé ${allCards.length} cartes depuis Supabase...`);
      if (data.length < pageSize) {
        fetchMore = false;
      } else {
        page++;
      }
    } else {
      fetchMore = false;
    }
  }

  console.log(`\n📦 Total récupéré : ${allCards.length} cartes. Lancement de la mise à jour des prix...`);
  let updatedCount = 0;
  let currentIndex = 0;

  for (const dbCard of allCards) {
    currentIndex++;
    const cardApiId = dbCard.id || `${dbCard.set_id}-${dbCard.number}`;

    try {
      const res = await fetch(`https://api.tcgdex.net/v2/fr/cards/${cardApiId}`);
      if (res.ok) {
        const cardData = await res.json();

        if (cardData && cardData.pricing && cardData.pricing.cardmarket) {
          const cm = cardData.pricing.cardmarket;

          const updateData = {};
          if (cm.avg !== undefined) updateData.avg = cm.avg;
          if (cm.low !== undefined) updateData.low = cm.low;
          if (cm.trend !== undefined) updateData.trend = cm.trend;
          if (cm.avg1 !== undefined) updateData.avg1 = cm.avg1;
          if (cm.avg7 !== undefined) updateData.avg7 = cm.avg7;
          if (cm.avg30 !== undefined) updateData.avg30 = cm.avg30;
          if (cm['avg-holo'] !== undefined) updateData.avg_holo = cm['avg-holo'];
          if (cm['low-holo'] !== undefined) updateData.low_holo = cm['low-holo'];
          if (cm['trend-holo'] !== undefined) updateData.trend_holo = cm['trend-holo'];
          if (cm['avg1-holo'] !== undefined) updateData.avg1_holo = cm['avg1-holo'];
          if (cm['avg7-holo'] !== undefined) updateData.avg7_holo = cm['avg7-holo'];
          if (cm['avg30-holo'] !== undefined) updateData.avg30_holo = cm['avg30-holo'];

          if (Object.keys(updateData).length > 0) {
            const { error: upErr } = await supabase
              .from('cards')
              .update(updateData)
              .eq('id', dbCard.id);

            if (!upErr) {
              updatedCount++;
            }
          }
        }
      }
    } catch (e) {
      // Ignore les erreurs réseau isolées
    }

    // Afficher un log tous les 500 éléments pour suivre l'avancement en direct
    if (currentIndex % 500 === 0) {
      console.log(`⏳ Progression : ${currentIndex} / ${allCards.length} cartes traitées (${updatedCount} mises à jour)...`);
    }

    await sleep(25); // Petite pause pour l'API
  }

  console.log(`\n✨ Terminé ! ${updatedCount} / ${allCards.length} cartes ont leurs prix mis à jour sur l'ensemble de ta base.`);
}

updateAllPricesPaginated();