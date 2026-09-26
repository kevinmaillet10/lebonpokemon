import { createClient } from '@supabase/supabase-js';
import TCGdex from '@tcgdex/sdk';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const tcgdex = new TCGdex('fr');

async function importTargetSet() {
  // Récupère l'ID passé en paramètre dans le terminal (ex: 30c)
  const targetId = process.argv[2];

  console.log("🔄 Récupération de la liste des extensions depuis TCGdex...");
  const sets = await tcgdex.set.list();
  
  if (!sets || sets.length === 0) {
    console.log("❌ Aucune extension trouvée.");
    return;
  }

  // Si aucun ID n'est fourni, on liste les 10 dernières pour voir leurs vrais IDs
  if (!targetId) {
    console.log("\nℹ️ Aucun ID spécifié. Voici les 10 dernières extensions connues de TCGdex :");
    sets.slice(-10).forEach(s => console.log(`   - Nom : ${s.name} | ID : ${s.id} | Date : ${s.releaseDate || 'N/A'}`));
    console.log("\n💡 Pour importer la série '30c' (ou une autre), lance simplement :");
    console.log("   node --env-file=.env src/import-latest-series.js 30c\n");
    return;
  }

  console.log(`🎯 Ciblage de la série : ${targetId}`);
  
  const set = await tcgdex.set.get(targetId);
  if (!set) {
    console.error(`❌ Impossible de trouver la série avec l'ID '${targetId}' sur TCGdex.`);
    return;
  }

  console.log(`\n📥 Importation de : ${set.name} (${set.id})`);

  // Insertion ou mise à jour de la série
  const { error: seriesError } = await supabase.from('series').upsert({
    id: set.id,
    name: set.name,
    block_name: set.serie?.name || 'Autres séries',
    release_date: set.releaseDate || '2000-01-01',
    logo_url: set.logo ? `${set.logo}.png` : null,
    symbol_url: set.symbol ? `${set.symbol}.png` : null
  }, { onConflict: 'id' });

  if (seriesError) {
    console.error(`❌ Erreur série ${set.name}:`, seriesError.message);
    return;
  }

  // Synchronisation des cartes
  if (set.cards) {
    let successCount = 0;
    for (const cardBrief of set.cards) {
      try {
        const card = await tcgdex.card.get(cardBrief.id);
        
        if (card && card.name) {
          const { error: cardError } = await supabase.from('cards').upsert({
            id: card.id,
            set_id: set.id,
            name: card.name, 
            number: card.localId,
            image_url: card.image ? `${card.image}/high.png` : null
          }, { onConflict: 'id' });

          if (!cardError) successCount++;
        }
      } catch (cardErr) {
        // Ignore les erreurs isolées
      }
    }
    console.log(`  📦 ${successCount}/${set.cards.length} cartes importées pour ${set.name}`);
  }

  console.log("\n✨ Importation de la série ciblée terminée avec succès !");
}

importTargetSet();