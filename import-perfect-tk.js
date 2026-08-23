import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://antapclcscsywdileetm.supabase.co', 
  'sb_publishable_FGPhBEowiqCo_-30bR7DMw_8-DtYIfS'
);

const targetSetIds = [
  'tk-bw-e', 'tk-bw-z', 'tk-dp-l', 'tk-dp-m', 
  'tk-ex-latia', 'tk-ex-latio', 'tk-ex-m', 'tk-ex-p', 
  'tk-hs-g', 'tk-hs-r', 'tk-sm-l', 'tk-sm-r', 
  'tk-xy-b', 'tk-xy-latia', 'tk-xy-latio', 'tk-xy-n', 
  'tk-xy-p', 'tk-xy-su', 'tk-xy-sy', 'tk-xy-w'
];

async function perfectMatchTrainerKits() {
  console.log("🧹 Étape 1 : Nettoyage de toutes les mauvaises images pour ces 20 kits...");
  for (const userSetId of targetSetIds) {
    await supabase
      .from('cards')
      .update({ image_url: null })
      .eq('set_id', userSetId);
  }
  console.log("✓ Nettoyage terminé.\n");

  console.log("🔍 Étape 2 : Récupération de tous les sets TCGdex...");
  const res = await fetch('https://api.tcgdex.net/v2/fr/sets');
  const allSets = await res.json();
  
  if (!allSets || !Array.isArray(allSets)) {
    console.error("❌ Erreur API TCGdex.");
    return;
  }

  const setCache = {};
  async function getSetCards(setId) {
    if (setCache[setId]) return setCache[setId];
    try {
      const r = await fetch(`https://api.tcgdex.net/v2/fr/sets/${setId}`);
      const d = await r.json();
      if (d && d.cards) {
        setCache[setId] = d.cards;
        return d.cards;
      }
    } catch (e) {}
    setCache[setId] = [];
    return [];
  }

  let totalUpdated = 0;

  for (const userSetId of targetSetIds) {
    console.log(`\n-----------------------------------------`);
    console.log(`🎯 Analyse du set_id en base : ${userSetId}`);

    const { data: dbCards, error: dbErr } = await supabase
      .from('cards')
      .select('id, name, number')
      .eq('set_id', userSetId);

    if (dbErr || !dbCards || dbCards.length === 0) {
      console.log(`⚠️ Aucune carte trouvée en base pour ${userSetId}`);
      continue;
    }

    const gen = userSetId.split('-')[1]; // bw, dp, ex, hs, sm, xy

    // Filtrer les candidats par génération pour être ultra efficace
    const candidates = allSets.filter(s => {
      const sId = s.id.toLowerCase();
      const sName = s.name.toLowerCase();
      return sId.includes(gen) || sName.includes(gen) || sId.includes('tk') || sId.includes('kit') || sId.includes('trainer');
    });

    let bestMatchSetId = null;
    let bestMatchCards = [];
    let maxScore = -1;

    // Tester chaque candidat pour trouver celui qui correspond le mieux aux cartes de la base
    for (const candidate of candidates) {
      const apiCards = await getSetCards(candidate.id);
      if (!apiCards || apiCards.length === 0) continue;

      let score = 0;
      for (const dbCard of dbCards) {
        const dbName = (dbCard.name || '').trim().toLowerCase();
        const dbNum = (dbCard.number || '').trim().toUpperCase();

        const found = apiCards.find(api => {
          const apiName = (api.name || '').trim().toLowerCase();
          const apiNum = (api.localId || '').trim().toUpperCase();
          
          const nameMatch = dbName && apiName && (dbName === apiName || apiName.includes(dbName) || dbName.includes(apiName));
          const numMatch = dbNum && apiNum && (dbNum === apiNum || dbNum.replace(/[^0-9]/g, '') === apiNum.replace(/[^0-9]/g, ''));
          
          return nameMatch || numMatch;
        });

        if (found) score++;
      }

      if (score > maxScore) {
        maxScore = score;
        bestMatchSetId = candidate.id;
        bestMatchCards = apiCards;
      }
    }

    if (!bestMatchSetId || maxScore === 0) {
      console.log(`❌ Aucun set TCGdex correspondant trouvé pour ${userSetId}`);
      continue;
    }

    console.log(`✓ Vrai set TCGdex identifié : "${bestMatchSetId}" (Score : ${maxScore}/${dbCards.length})`);

    // Injection propre des images
    let updatedCount = 0;
    for (const dbCard of dbCards) {
      const dbNum = (dbCard.number || '').trim().toUpperCase();
      const dbName = (dbCard.name || '').trim().toLowerCase();

      const apiMatch = bestMatchCards.find(api => {
        const apiNum = (api.localId || '').trim().toUpperCase();
        const apiName = (api.name || '').trim().toLowerCase();

        const numMatch = dbNum && apiNum && (dbNum === apiNum || dbNum.replace(/[^0-9]/g, '') === apiNum.replace(/[^0-9]/g, ''));
        const nameMatch = dbName && apiName && (dbName === apiName);

        return numMatch || nameMatch;
      });

      if (apiMatch && apiMatch.image) {
        const imageUrl = `${apiMatch.image}/high.webp`;
        const { error: updateErr } = await supabase
          .from('cards')
          .update({ image_url: imageUrl })
          .eq('id', dbCard.id);

        if (!updateErr) {
          updatedCount++;
          totalUpdated++;
        }
      }
    }

    console.log(`✨ ${updatedCount} / ${dbCards.length} images mises à jour pour ${userSetId}.`);
  }

  console.log(`\n🏁 Terminé ! ${totalUpdated} illustrations parfaitement synchronisées au total.`);
}

perfectMatchTrainerKits();