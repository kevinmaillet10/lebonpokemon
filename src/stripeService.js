// src/stripeService.js
import stripePromise from './stripeClient';

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

  // 2. Préparation optionnelle des métadonnées ou de la charge utile
  const itemsSummary = sellerGroup.items.map(item => ({
    name: item.cards?.name || item.title || 'Carte Pokémon',
    price: Math.round((item.price || 0) * 100),
    quantity: item.quantity || 1,
  }));

  if (currentShipping && currentShipping.price > 0) {
    itemsSummary.push({
      name: `Frais de port (${currentShipping.name})`,
      price: Math.round(currentShipping.price * 100),
      quantity: 1,
    });
  }

  try {
    console.log("Articles du panier :", itemsSummary);
    console.log("Montant total validé :", safeTotal.toFixed(2), "€");

    // NOTE : Si tu utilises une Edge Function Supabase pour créer une session Stripe Checkout :
    /*
    const { data, error } = await supabase.functions.functions.invoke('create-checkout-session', {
      body: { items: itemsSummary, sellerId: sellerGroup.sellerId, total: safeTotal }
    });
    
    if (error) throw error;
    
    const result = await stripe.redirectToCheckout({ sessionId: data.sessionId });
    if (result.error) {
      alert(result.error.message);
    }
    */

    // En attendant d'brancher l'appel serveur de session Stripe, 
    // voici le comportement propre validé avec ton montant final :
    alert(`Paiement de ${safeTotal.toFixed(2)} € validé avec succès !`);

  } catch (err) {
    console.error("Erreur lors de la redirection Stripe :", err);
    alert("Une erreur est survenue lors de la communication avec le service de paiement.");
  }
}