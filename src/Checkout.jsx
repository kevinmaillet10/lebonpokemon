import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import MondialRelayModal from './MondialRelayModal';
import { loadStripe } from '@stripe/stripe-js';

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

  // Synchronisation des événements de stockage et de l'événement personnalisé open-checkout
  useEffect(() => {
    const handleStorageUpdate = (e) => {
      try {
        if (e?.detail) {
          setPendingData(e.detail);
          return;
        }
        const saved = localStorage.getItem('pendingCheckout');
        if (saved) {
          setPendingData(JSON.parse(saved));
        }
      } catch (err) {}
    };

    window.addEventListener('open-checkout', handleStorageUpdate);
    window.addEventListener('storage', handleStorageUpdate);
    return () => {
      window.removeEventListener('open-checkout', handleStorageUpdate);
      window.removeEventListener('storage', handleStorageUpdate);
    };
  }, []);

  const isTrade = pendingData.isTrade === true;

  const finalItemPrice = Number(
    itemPrice > 0 
      ? itemPrice 
      : (pendingData.itemPrice ?? pendingData.value ?? pendingData.cardPrice ?? pendingData.cardsTotal ?? pendingData.price ?? 0)
  );

  const finalSellerId = pendingData?.sellerId || sellerId;
  const finalListingId = pendingData?.listingId || listingId;
  
  // Récupération de la taille du colis depuis pendingData (ou valeur par défaut 'small')
  const parcelSize = pendingData?.parcel_size || pendingData?.parcelSize || 'small';

  const [deliveryMode, setDeliveryMode] = useState('mondial'); 
  
  // Initialisation du point relais
  const [selectedRelay, setSelectedRelay] = useState(() => {
    const relay = pendingData?.pointRelais;
    if (relay && (relay.id || relay.Id || relay.Num || relay.code || relay.Code || relay.name || relay.Nom || relay.nom)) {
      return relay;
    }
    return null;
  });

  // Synchronisation dynamique si pendingData change en arrière-plan
  useEffect(() => {
    const relay = pendingData?.pointRelais;
    if (relay && (relay.id || relay.Id || relay.Num || relay.code || relay.Code || relay.name || relay.Nom || relay.nom)) {
      setSelectedRelay(relay);
    }
  }, [pendingData]);

  const [isRelayModalOpen, setIsRelayModalOpen] = useState(false);

  // Fonction de validation stricte pour le Point Relais
  const isValidRelay = (relay) => {
    if (!relay || typeof relay !== 'object') return false;
    const relayId = relay.id || relay.Id || relay.Num || relay.code || relay.Code;
    const relayName = relay.name || relay.Nom || relay.nom;
    return Boolean(relayId || relayName);
  };

  const isMondialMissing = deliveryMode === 'mondial' && !isValidRelay(selectedRelay);

  const handleSelectRelayPoint = (id, relay) => {
    setSelectedRelay(relay);
    setIsRelayModalOpen(false);
    const updated = { ...pendingData, pointRelais: relay };
    localStorage.setItem('pendingCheckout', JSON.stringify(updated));
    setPendingData(updated);
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
    const relayName = selectedRelay?.name || selectedRelay?.Nom || selectedRelay?.nom;
    currentCarrier = relayName ? `Mondial Relay (${relayName})` : "Mondial Relay";
  }

  const isHandDelivery = deliveryMode === 'hand' || parsedShippingFee === 0;
  const buyerProtection = isHandDelivery ? 0 : Math.max(0.80, finalItemPrice * 0.10);
  
  const totalAmount = Number((finalItemPrice + parsedShippingFee + buyerProtection).toFixed(2));

  const handleCheckoutSubmit = async () => {
    if (deliveryMode === 'mondial' && !isValidRelay(selectedRelay)) {
      alert("BLOQUÉ : Veuillez sélectionner un point de retrait Mondial Relay avant de continuer.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("Vous devez être connecté pour valider.");

      const cartItems = [
        {
          name: pendingData?.title || pendingData?.name || pendingData?.cardName || 'Carte Pokémon',
          price: finalItemPrice,
          quantity: 1
        }
      ];

      // Transmission de la taille du colis vers l'Edge Function (qui créera l'entrée dans 'orders')
      const { data: sessionData, error: sessionError } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          items: cartItems,
          shippingFee: parsedShippingFee,
          shippingMethod: currentCarrier,
          buyerProtection: buyerProtection,
          totalAmount,
          sellerId: finalSellerId,
          listingId: finalListingId,
          buyerId: user.id,
          pointRelais: selectedRelay,
          parcelSize: parcelSize
        }
      });

      if (sessionError) throw sessionError;
      
      if (sessionData?.url) {
        window.location.href = sessionData.url;
      } else if (sessionData?.sessionId) {
        const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
        if (!stripeKey) throw new Error("Clé publique Stripe introuvable.");
        const stripe = await loadStripe(stripeKey);
        if (!stripe) throw new Error("Erreur d'initialisation de Stripe.");
        await stripe.redirectToCheckout({ sessionId: sessionData.sessionId });
      } else {
        throw new Error("Impossible de créer la session de paiement Stripe.");
      }

    } catch (err) {
      console.error("Erreur lors du checkout Stripe :", err.message);
      alert("Erreur : " + err.message);
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
          <>💳 **Validation de la commande :** Panier / Achat direct. Finalisez votre règlement sécurisé par carte.</>
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
            <button type="button" onClick={() => setIsRelayModalOpen(true)} className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg font-semibold cursor-pointer transition-colors">
              {isValidRelay(selectedRelay) ? "Changer" : "Choisir un point relais"}
            </button>
          </div>
          {isValidRelay(selectedRelay) ? (
            <div className="text-xs text-emerald-400 font-medium bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-lg">
              <p className="font-bold">{selectedRelay.name || selectedRelay.Nom || selectedRelay.nom}</p>
              <p className="text-slate-400">{selectedRelay.address || `${selectedRelay.Adresse1 || ''} - ${selectedRelay.CP || ''} ${selectedRelay.Ville || ''}`}</p>
            </div>
          ) : (
            <p className="text-xs text-amber-400 font-semibold bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-lg">⚠️ Aucun point relais sélectionné.</p>
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

      <button 
        onClick={handleCheckoutSubmit} 
        disabled={loading || isMondialMissing} 
        className={`w-full font-bold py-3.5 rounded-xl transition-all shadow-md text-xs uppercase tracking-wider ${
          isMondialMissing 
            ? 'bg-slate-800 border border-amber-500/30 text-amber-400 cursor-not-allowed opacity-80' 
            : 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer'
        }`}
      >
        {loading 
          ? "Redirection vers Stripe..." 
          : isMondialMissing 
            ? "⚠️ Veuillez choisir un Point Relais" 
            : `Payer par carte (${totalAmount.toFixed(2)} €)`
        }
      </button>

      <MondialRelayModal isOpen={isRelayModalOpen} sellerId={finalSellerId} onClose={() => setIsRelayModalOpen(false)} onSelectPoint={handleSelectRelayPoint} />
    </div>
  );
}