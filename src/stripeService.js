// src/stripeService.js
import stripePromise from './stripeClient';
import { supabase } from './supabase';

export async function redirectToStripeCheckout(sellerGroup, currentShipping, finalTotal) {
  const stripe = await stripePromise;

  if (!stripe) {
    alert("Impossible d'initialiser Stripe.");
    return;
  }

  // 1. Validation de sécurité du montant total
  const safeTotal = typeof finalTotal === 'number' && !isNaN(finalTotal) ? finalTotal : 0;
  
  if (safeTotal <= 0) {
    alert("Le montant total du panier est invalide.");
    return;
  }

  // 2. Préparation des articles pour Stripe
  const itemsSummary = sellerGroup?.items ? sellerGroup.items.map(item => ({
    name: item.cards?.name || item.title || 'Carte Pokémon',
    price: item.price || 0,
    quantity: item.quantity || 1,
  })) : [{
    name: 'Article / Carte Pokémon',
    price: sellerGroup?.itemPrice || safeTotal,
    quantity: 1,
  }];

  if (currentShipping && currentShipping.price > 0) {
    itemsSummary.push({
      name: `Frais de port (${currentShipping.name})`,
      price: currentShipping.price,
      quantity: 1,
    });
  }

  try {
    console.log("Articles envoyés à Stripe :", itemsSummary);

    // 3. Appel de la fonction Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('create-checkout-session', {
      body: { 
        items: itemsSummary, 
        sellerId: sellerGroup?.sellerId, 
        listingId: sellerGroup?.listingId,
        total: safeTotal,
        shippingFee: currentShipping?.price || 0,
        shippingMethod: currentShipping?.name || 'Standard'
      }
    });
    
    if (error) throw error;
    
    if (data?.url) {
      // Redirection vers la page de paiement sécurisée Stripe
      window.location.href = data.url;
    } else {
      throw new Error("Aucune URL de redirection Stripe reçue.");
    }

  } catch (err) {
    console.error("Erreur lors de la redirection Stripe :", err);
    alert("Une erreur est survenue lors de la communication avec le service de paiement : " + err.message);
  }
}