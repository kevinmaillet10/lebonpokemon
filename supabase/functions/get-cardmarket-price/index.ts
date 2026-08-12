import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const secretKeysJson = Deno.env.get("SUPABASE_SECRET_KEYS");
let serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!serviceRoleKey && secretKeysJson) {
  try {
    const secrets = JSON.parse(secretKeysJson);
    serviceRoleKey = secrets.service_role;
  } catch (e) {
    console.error("Erreur parsing SUPABASE_SECRET_KEYS", e);
  }
}

const SUPABASE_SERVICE_ROLE_KEY = serviceRoleKey!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log("=== DEBUT DE LA FONCTION EDGE ===");
    
    let body: any = {};
    try {
      body = await req.json();
    } catch (e) {
      console.log("Body vide ou invalide.");
    }
    
    const { cardId, apiCardId, name, number, series } = body;

    let cardRecord = null;

    if (cardId) {
      let res = await supabase.from("pokemon_cards").select("id, name, tcgdex_id").eq("tcgdex_id", cardId).maybeSingle();
      if (!res.data) {
        res = await supabase.from("pokemon_cards").select("id, name, tcgdex_id").eq("id", cardId).maybeSingle();
      }
      cardRecord = res.data;
    } 
    
    if (!cardRecord && apiCardId) {
      const res = await supabase.from("pokemon_cards").select("id, name, tcgdex_id").eq("tcgdex_id", apiCardId).maybeSingle();
      cardRecord = res.data;
    }

    if (!cardRecord && name) {
      const res = await supabase.from("pokemon_cards").select("id, name, tcgdex_id").ilike("name", `%${name}%`).maybeSingle();
      cardRecord = res.data;
    }

    const cardName = cardRecord?.name || name || "Carte Inconnue";
    const targetCardUuid = cardRecord?.id || crypto.randomUUID();
    
    let fetchApiId = cardRecord?.tcgdex_id || apiCardId || cardId;
    if (!fetchApiId && number && series) {
      const cleanSeries = series.toLowerCase().replace(/[^a-z0-9]/g, '');
      fetchApiId = `${cleanSeries}-${number}`;
    }

    let priceTrend = 0;
    let reversePrice = 0;
    let cardData: any = {};

    if (fetchApiId) {
      try {
        const apiResponse = await fetch(`https://api.tcgdex.net/v2/fr/cards/${fetchApiId}`);
        if (apiResponse.ok) {
          cardData = await apiResponse.json();
          const cmPrices: any = cardData.pricing?.cardmarket || {};

          if (cmPrices) {
            priceTrend = cmPrices.trend || cmPrices.avg || cmPrices.avg30 || cmPrices.avg7 || cmPrices.avg1 || cmPrices.low || 0;
            reversePrice = cmPrices.trendHolo || cmPrices.avgHolo || cmPrices.avg30Holo || cmPrices.lowHolo || cmPrices.avg7Holo || 0;
          }
        }
      } catch (err) {
        console.log("Erreur lors de l'appel API TCGdex externe:", err);
      }
    }

    if (cardRecord?.id) {
      await supabase
        .from("pokemon_cards")
        .update({
          price_trend: priceTrend,
          reverse_price: reversePrice,
        })
        .eq("id", targetCardUuid);
    }

    const cmPrices: any = cardData.pricing?.cardmarket || {};
    const currentPrice = cmPrices.trend || cmPrices.avg || priceTrend;

    // Récupérer l'historique existant en base pour éviter les doublons sur la même journée
    const { data: existingHistory } = await supabase
      .from("card_price_history")
      .select("id, price, recorded_at")
      .eq("card_id", targetCardUuid)
      .order("recorded_at", { ascending: true });

    const entriesToInsert: Array<{
      id: string;
      card_id: string;
      version_type: string;
      price: number;
      recorded_at: string;
    }> = [];
    
    const todayStr = new Date().toISOString().split('T')[0];

    // Vérifier si on a déjà un point aujourd'hui
    const hasToday = existingHistory?.some(h => h.recorded_at.startsWith(todayStr));

    if (!hasToday && currentPrice > 0) {
      entriesToInsert.push({
        id: crypto.randomUUID(),
        card_id: targetCardUuid,
        version_type: "normal",
        price: currentPrice,
        recorded_at: new Date().toISOString(),
      });
    }

    // Fonction pour ajouter un point historique s'il n'existe pas déjà autour de cette date
    const addHistoricalPointIfNeeded = (price: number, daysAgo: number) => {
      if (!price || price <= 0) return;
      const targetDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
      const targetDateStr = targetDate.toISOString().split('T')[0];

      const exists = existingHistory?.some(h => h.recorded_at.startsWith(targetDateStr)) ||
                     entriesToInsert.some(e => e.recorded_at.startsWith(targetDateStr));

      if (!exists) {
        entriesToInsert.push({
          id: crypto.randomUUID(),
          card_id: targetCardUuid,
          version_type: "normal",
          price: price,
          recorded_at: targetDate.toISOString(),
        });
      }
    };

    if (cmPrices.avg1) addHistoricalPointIfNeeded(cmPrices.avg1, 1);
    if (cmPrices.avg7) addHistoricalPointIfNeeded(cmPrices.avg7, 7);
    if (cmPrices.avg30) addHistoricalPointIfNeeded(cmPrices.avg30, 30);

    if (entriesToInsert.length > 0) {
      await supabase.from("card_price_history").insert(entriesToInsert);
    }

// Récupération de tout l'historique consolidé
    const { data: fullHistory } = await supabase
      .from("card_price_history")
      .select("id, card_id, version_type, price, recorded_at")
      .eq("card_id", targetCardUuid)
      .order("recorded_at", { ascending: true });

    const now = new Date().getTime();
    const getPriceAtOrBefore = (timeLimit: number) => {
      const match = fullHistory?.find(h => new Date(h.recorded_at).getTime() <= timeLimit);
      return match ? match.price : (priceTrend > 0 ? priceTrend : (currentPrice > 0 ? currentPrice : 0));
    };

    const price1j = getPriceAtOrBefore(now - 24 * 60 * 60 * 1000);
    const price7j = getPriceAtOrBefore(now - 7 * 24 * 60 * 60 * 1000);
    const price15j = getPriceAtOrBefore(now - 15 * 24 * 60 * 60 * 1000);
    const price30j = getPriceAtOrBefore(now - 30 * 24 * 60 * 60 * 1000);

    const finalMoyVente = priceTrend > 0 ? priceTrend : currentPrice;

    const statsPayload = {
      card_id: targetCardUuid,
      card_name: cardName,
      moy_vente: finalMoyVente,
      // On garde des clés plates si ta table utilise des colonnes plates
      avg: finalMoyVente,
      d1: price1j,
      d7: price7j,
      d30: price30j,
      price_1j: price1j,
      price_7j: price7j,
      price_30j: price30j,
      variation_percentage: price30j ? Number((((finalMoyVente - price30j) / price30j) * 100).toFixed(1)) : 0,
      updated_at: new Date().toISOString(),
    };

    const { data: cachedStats } = await supabase
      .from("card_market_stats")
      .select("card_id")
      .eq("card_id", targetCardUuid)
      .maybeSingle();

    if (cachedStats) {
      await supabase.from("card_market_stats").update(statsPayload).eq("card_id", targetCardUuid);
    } else {
      await supabase.from("card_market_stats").insert({ id: crypto.randomUUID(), ...statsPayload });
    }

    return new Response(JSON.stringify({ 
      source: "api", 
      data: statsPayload, 
      history: fullHistory 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.log("ERREUR CRITIQUE DANS CATCH :", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});