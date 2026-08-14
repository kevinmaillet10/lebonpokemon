import { createClient } from '@supabase/supabase-js';

// ⚠️ Remplis ces deux constantes avec tes vraies informations Supabase
// (Il est conseillé d'utiliser la clé "service_role" pour contourner le RLS lors des insertions massives)
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function importTcgdexData() {
  console.log("🚀 Début de l'importation des extensions et des cartes TCGDex...");
  
  try {
    // 1. Récupérer toutes les extensions françaises
    const res = await fetch('https://api.tcgdex.net/v2/fr/sets');
    const sets = await res.json();

    if (!Array.isArray(sets)) {
      throw new Error("Impossible de récupérer la liste des extensions depuis l'API TCGDex.");
    }

    console.log(`-> ${sets.length} extensions trouvées. Traitement en cours...`);

    for (const set of sets) {
      console.log(`📦 Import de l'extension : ${set.name} (${set.id})`);

      // Insertion de l'extension
      const { error: setError } = await supabase.from('extensions').upsert({
        id: set.id,
        name: set.name,
        logo: set.logo,
        symbol: set.symbol
      });

      if (setError) {
        console.error(`Erreur pour l'extension ${set.id}:`, setError.message);
        continue;
      }

      // 2. Récupérer le détail de l'extension
      const detailRes = await fetch(`https://api.tcgdex.net/v2/fr/sets/${set.id}`);
      const setDetail = await detailRes.json();

      if (setDetail && setDetail.cards && setDetail.cards.length > 0) {
        const cardsToInsert = [];
        
        console.log(`🔍 Récupération des détails pour ${setDetail.cards.length} cartes...`);

        for (const basicCard of setDetail.cards) {
          // On appelle l'API pour CHAQUE carte afin d'avoir les infos complètes
          const cardRes = await fetch(`https://api.tcgdex.net/v2/fr/cards/${basicCard.id}`);
          const card = await cardRes.json();

          cardsToInsert.push({
            id: card.id,
            name: card.name,
            extension_id: set.id,
            image_url: card.image ? `${card.image}/low.webp` : null,
            rarity: card.rarity || null,
            variants: card.variants || {}, // TCGdex renvoie souvent un objet, pas un tableau
            local_id: card.localId || card.number || null,
            hp: card.hp ? parseInt(card.hp, 10) : null,
            illustrator: card.illustrator || null,
            category: card.category || null,
            stage: card.stage || null,
            regulation_mark: card.regulationMark || null,
            types: card.types || [],
            dex_id: card.dexId || (card.dexIds ? card.dexIds[0] : null) // dex_id est souvent un tableau ou un chiffre
          });
        }

        // Insertion par lots (batch) des cartes pour aller plus vite
        const { error: cardError } = await supabase
          .from('cards')
          .upsert(cardsToInsert, { onConflict: 'id' });

        if (cardError) {
          console.error(`Erreur pour les cartes de l'extension ${set.id}:`, cardError.message);
        } else {
          console.log(`   ✨ ${cardsToInsert.length} cartes enregistrées pour ${set.name}.`);
        }
      }

      // Petite pause de sécurité pour ne pas saturer l'API TCGDex
      await new Promise(r => setTimeout(r, 300));
    }

    console.log("✅ Importation de toutes les données TCGDex terminée avec succès !");
  } catch (err) {
    console.error("❌ Erreur critique lors de l'import :", err);
  }
}

importTcgdexData();