// scripts/fix-series-logos.js
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ Erreur : Variables Supabase introuvables dans le fichier .env !");
  process.exit(1);
}

async function fixSeriesSymbolsTCGdex() {
  console.log("🚀 Recherche des logos et symboles de remplacement via TCGdex...");

  // 1. Récupérer toutes les séries qui n'ont toujours pas de logo_url
  const response = await fetch(`${SUPABASE_URL}/rest/v1/series?or=(logo_url.is.null,logo_url.eq.)&select=id,name`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  });

  if (!response.ok) {
    console.error("❌ Erreur lecture Supabase :", await response.text());
    return;
  }

  const seriesList = await response.json();

  if (!seriesList || seriesList.length === 0) {
    console.log("✨ Toutes les séries ont déjà une image !");
    return;
  }

  console.log(`📦 ${seriesList.length} séries sans image. Analyse en cours...`);
  let updatedCount = 0;

  for (const serie of seriesList) {
    try {
      let imageUrl = "";

      // 2. Interroger TCGdex
      const apiRes = await fetch(`https://api.tcgdex.net/v2/fr/sets/${serie.id}`);

      if (apiRes.ok) {
        const json = await apiRes.json();
        
        // Priorité 1 : Le logo s'il existe
        if (json.logo) {
          imageUrl = `${json.logo}.png`;
        } 
        // Priorité 2 (Plan B) : Le symbole/icône du set s'il existe
        else if (json.symbol) {
          imageUrl = `${json.symbol}.png`;
        }
      }

      if (imageUrl) {
        // 3. Mettre à jour Supabase avec l'image trouvée (logo ou symbole)
        const updateRes = await fetch(`${SUPABASE_URL}/rest/v1/series?id=eq.${serie.id}`, {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({ logo_url: imageUrl })
        });

        if (updateRes.ok) {
          console.log(`✅ Image ajoutée pour : ${serie.name} (${serie.id})`);
          updatedCount++;
        } else {
          console.error(`❌ Erreur mise à jour Supabase pour ${serie.id}`);
        }
      } else {
        console.log(`⚠️ Vraiment rien dispo sur TCGdex pour : ${serie.name} (${serie.id})`);
      }

      // Petite pause pour être poli avec l'API
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (err) {
      console.error(`❌ Erreur technique sur la série ${serie.id}:`, err.message);
    }
  }

  console.log(`🎉 Fin ! Total d'images de remplacement ajoutées : ${updatedCount}`);
}

fixSeriesSymbolsTCGdex();