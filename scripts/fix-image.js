// scripts/fix-image.js
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ Erreur : Variables VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY introuvables dans le fichier .env !");
  process.exit(1);
}

async function fixImages() {
  console.log("🚀 Démarrage du nettoyage des images (sans doublons)...");

  let processedTotal = 0;
  let hasMore = true;

  while (hasMore) {
    // 1. On récupère UNIQUEMENT les cartes qui n'ont jamais été touchées (image_url est NULL)
    const response = await fetch(`${SUPABASE_URL}/rest/v1/cards?image_url=is.null&select=id,name&limit=50`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("❌ Erreur lecture Supabase :", errText);
      break;
    }

    const cards = await response.json();

    if (!cards || cards.length === 0) {
      console.log("✨ Toutes les cartes ont été traitées ! Plus aucune image manquante à analyser.");
      hasMore = false;
      break;
    }

    console.log(`📦 Traitement d'un lot de ${cards.length} nouvelles cartes...`);

    for (const card of cards) {
      try {
        let imageUrl = ""; 

        // 2. Interroger pokemontcg.io
        const apiRes = await fetch(`https://api.pokemontcg.io/v2/cards/${card.id}`);

        if (apiRes.ok) {
          const json = await apiRes.json();
          if (json.data && json.data.images) {
            imageUrl = json.data.images.large || json.data.images.small || "";
          }
        }

        // 3. Mettre à jour Supabase (si trouvée -> URL, si non trouvée -> "" pour ne plus jamais la revoir)
        const updateRes = await fetch(`${SUPABASE_URL}/rest/v1/cards?id=eq.${card.id}`, {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({ image_url: imageUrl })
        });

        if (updateRes.ok) {
          if (imageUrl !== "") {
            console.log(`✅ Image trouvée : ${card.name} (${card.id})`);
            processedTotal++;
          } else {
            console.log(`⚠️ Introuvable : ${card.name} (${card.id}) - Archivée.`);
          }
        } else {
          const updateErr = await updateRes.text();
          console.error(`❌ Erreur mise à jour Supabase pour ${card.id}:`, updateErr);
        }

        // Petite pause pour être gentil avec l'API
        await new Promise(resolve => setTimeout(resolve, 150));

      } catch (err) {
        console.error(`❌ Erreur technique sur la carte ${card.id}:`, err.message);
      }
    }

    await new Promise(resolve => setTimeout(resolve, 300));
  }

  console.log(`🎉 Terminé ! Total d'images valides ajoutées : ${processedTotal}`);
}

fixImages();