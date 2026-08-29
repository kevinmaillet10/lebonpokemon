import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import MondialRelayModal from './MondialRelayModal';

export default function Checkout({ listingId, itemPrice = 0, sellerId, onSuccessfulCheckout }) {
  const [loading, setLoading] = useState(false);

  // 1. Récupération sécurisée des données du localStorage
  const [pendingData, setPendingData] = useState(() => {
    if (itemPrice && itemPrice > 0) return {};
    try {
      const saved = localStorage.getItem('pendingCheckout');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  // 2. Détection du mode échange
  const isTrade = pendingData.isTrade === true;

  // 3. Extraction du prix/valeur (prend en compte itemPrice, value, cardsTotal ou price transmis par le chat/panier)
  const finalItemPrice = Number(
    itemPrice > 0 
      ? itemPrice 
      : (pendingData.itemPrice ?? pendingData.value ?? pendingData.cardPrice ?? pendingData.cardsTotal ?? pendingData.price ?? 0)
  );

  // 4. Écouter l'événement global pour rafraîchir le panier en direct
  useEffect(() => {
    const handleStorageUpdate = () => {
      try {
        const saved = localStorage.getItem('pendingCheckout');
        if (saved) {
          setPendingData(JSON.parse(saved));
        }
      } catch (e) {}
    };

    window.addEventListener('open-checkout', handleStorageUpdate);
    window.addEventListener('storage', handleStorageUpdate);
    return () => {
      window.removeEventListener('open-checkout', handleStorageUpdate);
      window.removeEventListener('storage', handleStorageUpdate);
    };
  }, []);

  const finalSellerId = pendingData?.sellerId || sellerId;
  const finalListingId = pendingData?.listingId || listingId;

  const [deliveryMode, setDeliveryMode] = useState('mondial'); 
  const [selectedRelay, setSelectedRelay] = useState(pendingData?.pointRelais || null);
  const [isRelayModalOpen, setIsRelayModalOpen] = useState(false);

  const handleSelectRelayPoint = (id, relay) => {
    setSelectedRelay(relay);
    setIsRelayModalOpen(false);
    const updated = { ...pendingData, pointRelais: relay };
    localStorage.setItem('pendingCheckout', JSON.stringify(updated));
  };
  
  let parsedShippingFee = 2.99;
  let currentCarrier = "Mondial Relay";

  if (deliveryMode === 'postal') {
    parsedShippingFee = 2.50;
    currentCarrier = "Envoi postal";
  } else if (deliveryMode === 'hand') {
    parsedShippingFee = 0.00;
    currentCarrier = "Remise en main propre";
  } else {
    parsedShippingFee = 2.99;
    currentCarrier = selectedRelay ? `Mondial Relay (${selectedRelay.name || selectedRelay.Nom})` : "Mondial Relay";
  }

  // RÈGLE DE PROTECTION UNIVERSELLE : 
  // 0 € uniquement si Remise en main propre. 
  // Partout ailleurs (Achats, Offres, Échanges envoyés par la poste), c'est 10% avec un minimum de 0.80 €.
  const isHandDelivery = deliveryMode === 'hand' || parsedShippingFee === 0;
  const buyerProtection = isHandDelivery ? 0 : Math.max(0.80, finalItemPrice * 0.10);
  
  const totalAmount = Number((finalItemPrice + parsedShippingFee + buyerProtection).toFixed(2));

  const handleCheckoutSubmit = async () => {
    try {
      if (deliveryMode === 'mondial' && !selectedRelay) {
        alert("Veuillez sélectionner un Point Relais Mondial Relay avant de confirmer.");
        return;
      }

      setLoading(true);
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("Vous devez être connecté pour valider.");

      const { data, error } = await supabase
        .from('orders')
        .insert([
          {
            buyer_id: user.id,
            seller_id: finalSellerId,
            item_price: finalItemPrice,
            shipping_fee: parsedShippingFee,
            shipping_method: currentCarrier,
            platform_fee: buyerProtection, 
            total_amount: totalAmount, 
            status: 'pending'          
          }
        ])
        .select();

      if (error) throw error;

      if (finalListingId) {
        const { data: listingData, error: fetchError } = await supabase
          .from('listings')
          .select('quantity')
          .eq('id', finalListingId)
          .single();

        if (!fetchError && listingData) {
          const newQuantity = Math.max(0, (listingData.quantity || 1) - 1);
          await supabase
            .from('listings')
            .update({ quantity: newQuantity })
            .eq('id', finalListingId);
        }
      }

      localStorage.removeItem('pendingCheckout');
      alert("🎉 Commande validée avec succès !");
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
      <div className={`border p-3 rounded-xl text-xs text-center font-medium ${
        isTrade ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
      }`}>
        {isTrade ? (
          <>🧪 **Validation d'échange :** Échange équitable enregistré. Choisissez votre option de livraison.</>
        ) : (
          <>💳 **Validation de la commande :** Panier / Achat direct. Finalisez votre règlement.</>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button type="button" onClick={() => setDeliveryMode('postal')} className={`py-2 px-2 rounded-xl text-xs font-bold border text-center cursor-pointer ${deliveryMode === 'postal' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-[#1A2331] border-slate-800 text-slate-400'}`}>✉️ Postal (2.50€)</button>
        <button type="button" onClick={() => setDeliveryMode('mondial')} className={`py-2 px-2 rounded-xl text-xs font-bold border text-center cursor-pointer ${deliveryMode === 'mondial' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-[#1A2331] border-slate-800 text-slate-400'}`}>📦 Mondial (2.99€)</button>
        <button type="button" onClick={() => setDeliveryMode('hand')} className={`py-2 px-2 rounded-xl text-xs font-bold border text-center cursor-pointer ${deliveryMode === 'hand' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-[#1A2331] border-slate-800 text-slate-400'}`}>🤝 Main Propre (0€)</button>
      </div>

      {deliveryMode === 'mondial' && (
        <div className="bg-[#1A2331] border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-300">Point Relais sélectionné :</span>
            <button type="button" onClick={() => setIsRelayModalOpen(true)} className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-semibold cursor-pointer">
              {selectedRelay ? "Changer" : "Choisir un point relais"}
            </button>
          </div>
          {selectedRelay ? (
            <div className="text-xs text-emerald-400 font-medium bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-lg">
              <p className="font-bold">{selectedRelay.name || selectedRelay.Nom}</p>
              <p className="text-slate-400">{selectedRelay.address || `${selectedRelay.Adresse1} - ${selectedRelay.CP} ${selectedRelay.Ville}`}</p>
            </div>
          ) : (
            <p className="text-xs text-amber-400">⚠️ Aucun point relais sélectionné.</p>
          )}
        </div>
      )}

      <div className="bg-[#1A2331] border border-slate-800 rounded-2xl p-5 space-y-3 text-sm">
        <h3 className="font-bold text-white mb-2">Récapitulatif de la commande</h3>
        <div className="flex justify-between text-slate-400">
          <span>{isTrade ? "Valeur échangée" : "Prix de l'article"}</span>
          <span className="font-semibold text-slate-200">{finalItemPrice.toFixed(2)} €</span>
        </div>
        <div className="flex justify-between text-slate-400">
          <span>Mode choisi</span>
          <span className="font-semibold text-slate-200 truncate">{currentCarrier}</span>
        </div>
        <div className="flex justify-between text-slate-400">
          <span>Frais de port</span>
          <span className="font-semibold text-slate-200">{parsedShippingFee.toFixed(2)} €</span>
        </div>
        <div className="flex justify-between text-slate-400">
          <span>Protection acheteur</span>
          <span className="font-semibold text-slate-200">{buyerProtection.toFixed(2)} €</span>
        </div>
        <div className="border-t border-slate-800 pt-3 mt-3 flex justify-between items-center">
          <span className="font-black text-white text-base">Total à régler</span>
          <span className="font-black text-emerald-400 text-lg">{totalAmount.toFixed(2)} €</span>
        </div>
      </div>

      <button onClick={handleCheckoutSubmit} disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-xl cursor-pointer transition-colors shadow-md disabled:opacity-50 text-xs uppercase tracking-wider">
        {loading ? "Traitement en cours..." : `Confirmer et régler (${totalAmount.toFixed(2)} €)`}
      </button>

      <MondialRelayModal isOpen={isRelayModalOpen} sellerId={finalSellerId} onClose={() => setIsRelayModalOpen(false)} onSelectPoint={handleSelectRelayPoint} />
    </div>
  );
}