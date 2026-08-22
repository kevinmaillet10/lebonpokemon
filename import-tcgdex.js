import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY; // On utilise ta clé anon

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function importTcgdexData(targetSetId = null) {
  console.log("🚀 Début de l'importation TCGDex...");
  
  try {
    let setsToProcess = [];

    if (targetSetId) {
      // Si on veut cibler un seul set (ex: 'mep')
      const res = await fetch(`https://api.tcgdex.net/v2/fr/sets/${targetSetId}`);
      const setData = await res.json();
      setsToProcess = [setData];
    } else {
      // Sinon, on prend tout
      const res = await fetch('https://api.tcgdex.net/v2/fr/sets');
      setsToProcess = await res.json();
    }

    for (const set of setsToProcess) {
      console.log(`📦 Traitement de l'extension : ${set.name} (${set.id})`);

      // 1. Insertion de l'extension
      await supabase.from('extensions').upsert({
        id: set.id,
        name: set.name,
        logo: set.logo,
        symbol: set.symbol
      }, { onConflict: 'id' });

      // 2. Récupérer le détail complet du set
      const detailRes = await fetch(`https://api.tcgdex.net/v2/fr/sets/${set.id}`);
      const setDetail = await detailRes.json();

      if (setDetail && setDetail.cards && setDetail.cards.length > 0) {
        const cardsToInsert = [];
        
        console.log(`🔍 Récupération des détails pour ${setDetail.cards.length} cartes de ${set.id}...`);

        for (const basicCard of setDetail.cards) {
          try {
            const cardRes = await fetch(`https://api.tcgdex.net/v2/fr/cards/${basicCard.id}`);
            if (!cardRes.ok) continue;
            const card = await cardRes.json();

            cardsToInsert.push({
              id: card.id,
              name: card.name,
              set_id: set.id, // ⚠️ Corrigé : 'set_id' au lieu de 'extension_id'
              image_url: card.image ? `${card.image}/high.webp` : null, // ⚠️ En HD (.webp)
              rarity: card.rarity || 'Commune',
              variants: card.variants || {},
              number: card.localId || card.number || '1', // ⚠️ Corrigé : 'number' au lieu de 'local_id'
              hp: card.hp ? parseInt(card.hp, 10) : null,
              illustrator: card.illustrator || null,
              category: card.category || 'Pokémon',
              stage: card.stage || null,
              regulation_mark: card.regulationMark || null,
              types: card.types || [],
              dex_id: card.dexId || (card.dexIds ? card.dexIds[0] : null)
            });
          } catch (cardErr) {
            console.warn(`⚠️ Erreur sur la carte ${basicCard.id}:`, cardErr.message);
          }
        }

        // Insertion par lots dans Supabase
        if (cardsToInsert.length > 0) {
          const { error: cardError } = await supabase
            .from('cards')
            .upsert(cardsToInsert, { onConflict: 'id' });

          if (cardError) {
            console.error(`❌ Erreur SQL pour ${set.id}:`, cardError.message);
          } else {
            console.log(`✨ ${cardsToInsert.length} cartes enregistrées pour ${set.name}.`);
          }
        }
      }

      await new Promise(r => setTimeout(r, 200));
    }

    console.log("✅ Importation terminée avec succès !");
  } catch (err) {
    console.error("❌ Erreur critique :", err);
  }
}

// Pour tester tout de suite uniquement sur le set "mep" qui posait problème :
importTcgdexData('mee');