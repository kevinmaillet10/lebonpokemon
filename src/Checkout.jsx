import React, { useState } from 'react';
import { supabase } from './supabase';

export default function Checkout({ listingId, itemPrice = 0, shippingFee = 0, selectedCarrier = "Standard", sellerId, onSuccessfulCheckout }) {
  const [loading, setLoading] = useState(false);

  // 1. Calculs dynamiques pour l'affichage et la base de données
  const parsedItemPrice = Number(itemPrice);
  const parsedShippingFee = Number(shippingFee);
  
  // Commission de 5% appliquée sur le prix de l'article (frais de service / protection)
  const platformFee = Number((parsedItemPrice * 0.05).toFixed(2)); 
  
  // Nouveau total : Article + Port + Commission
  const totalAmount = Number((parsedItemPrice + parsedShippingFee + platformFee).toFixed(2));

  const handleCheckoutSubmit = async () => {
    try {
      setLoading(true);

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("Vous devez être connecté pour acheter.");

      // 2. Insérer la commande avec les champs financiers exacts
      const { data, error } = await supabase
        .from('orders')
        .insert([
          {
            buyer_id: user.id,
            seller_id: sellerId,
            item_price: parsedItemPrice,
            shipping_fee: parsedShippingFee,
            platform_fee: platformFee, 
            total_amount: totalAmount, 
            status: 'pending'          
          }
        ])
        .select();

      if (error) throw error;

      // 3. Décrémenter la quantité dans la table 'listings'
      if (listingId) {
        const { data: listingData, error: fetchError } = await supabase
          .from('listings')
          .select('quantity')
          .eq('id', listingId)
          .single();

        if (!fetchError && listingData) {
          const newQuantity = Math.main ? Math.max(0, (listingData.quantity || 1) - 1) : Math.max(0, (listingData.quantity || 1) - 1);

          const { error: updateError } = await supabase
            .from('listings')
            .update({ quantity: newQuantity })
            .eq('id', listingId);

          if (updateError) {
            console.error("Erreur lors de la mise à jour du stock :", updateError);
          }
        }
      }

      alert("🎉 Commande simulée avec succès ! (Mode Bêta)");
      if (onSuccessfulCheckout) onSuccessfulCheckout(data[0]);

    } catch (err) {
      console.error("Erreur lors du checkout :", err.message);
      alert("Erreur : " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col space-y-4 w-full max-w-md mx-auto mt-6 text-white">
      
      {/* --- BANDEAU MODE BÊTA --- */}
      <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 p-3 rounded-xl text-xs text-center font-medium">
        🧪 **Mode Bêta :** Aucun paiement réel ne sera prélevé. C'est une simulation de commande.
      </div>

      {/* --- BLOC RÉCAPITULATIF DES FRAIS --- */}
      <div className="bg-[#1A2331] border border-slate-800 rounded-2xl p-5 space-y-3 text-sm">
        <h3 className="font-bold text-white mb-2">Récapitulatif de la commande</h3>
        
        <div className="flex justify-between text-slate-400">
          <span>Sous-total de la commande</span>
          <span className="font-semibold text-slate-200">{parsedItemPrice.toFixed(2)} €</span>
        </div>
        
        <div className="flex justify-between text-slate-400">
          <span>Frais de port ({selectedCarrier})</span>
          <span className="font-semibold text-slate-200">{parsedShippingFee.toFixed(2)} €</span>
        </div>

        <div className="flex justify-between text-slate-400">
          <span>Protection acheteur (5%)</span>
          <span className="font-semibold text-slate-200">{platformFee.toFixed(2)} €</span>
        </div>

        <div className="border-t border-slate-800 pt-3 mt-3 flex justify-between items-center">
          <span className="font-black text-white text-base">Total simulé</span>
          <span className="font-black text-emerald-400 text-lg">{totalAmount.toFixed(2)} €</span>
        </div>
      </div>

      {/* --- BOUTON DE VALIDATION --- */}
      <button 
        onClick={handleCheckoutSubmit} 
        disabled={loading}
        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-xl cursor-pointer transition-colors shadow-md disabled:opacity-50 text-xs uppercase tracking-wider"
      >
        {loading ? "Traitement en cours..." : `Simuler l'achat (${totalAmount.toFixed(2)} €)`}
      </button>

    </div>
  );
}