import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Fonction pour mettre à jour le prix d'une carte via l'Edge Function
export const updateCardPrice = async (cardId) => {
  try {
    const response = await fetch(
      "https://antapclcscsywdileetm.supabase.co/functions/v1/get-cardmarket-price",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ cardId }),
      }
    );

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || "Erreur lors de la mise à jour du prix");
    }

    return result.data;
  } catch (error) {
    console.error("Erreur updateCardPrice:", error.message);
    return null;
  }
};