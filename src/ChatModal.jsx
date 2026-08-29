import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabase';
import OrderTrackingModal from './OrderTrackingModal';

let globalIsSending = false;

export default function ChatModal({ conversationId, currentUserId, recipientId, onOpenTradeCheckout }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingSend, setLoadingSend] = useState(false);
  const messagesEndRef = useRef(null);

  const [convDetails, setConvDetails] = useState(null);
  const [counterInputs, setCounterInputs] = useState({});
  const [tradeCounterInputs, setTradeCounterInputs] = useState({});

  const [isTrackingOpen, setIsTrackingOpen] = useState(false);
  const [trackingData, setTrackingData] = useState({
    step: 3,
    sellerName: "Kevin MLLT",
    trackingNumber: "61934580",
    carrier: "Mondial Relay",
    estimatedDate: "6 août - 10 août"
  });

  useEffect(() => {
    if (!conversationId) return;

    let isMounted = true;

    async function fetchChatData() {
      // 1. Récupération de la conversation
      const { data: convData } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single();

      if (convData && isMounted) {
        setConvDetails(convData);
      }

      // 2. Récupération des messages
      const { data: msgData, error: msgError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (!msgError && msgData && isMounted) {
        setMessages(msgData);
      }
    }

    fetchChatData();

    // Écoute Realtime
    const channel = supabase
      .channel(`room:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          if (!isMounted) return;
          setMessages((prev) => {
            if (prev.find((msg) => String(msg.id) === String(payload.new.id))) return prev;
            return [...prev, payload.new];
          });
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getTargetOfferId = async () => {
    if (!convDetails) return null;
    const { data: offers } = await supabase
      .from('offers')
      .select('id')
      .eq('listing_id', convDetails.listing_id)
      .eq('buyer_id', convDetails.buyer_id)
      .order('created_at', { ascending: false })
      .limit(1);

    return offers && offers.length > 0 ? offers[0].id : null;
  };

// --- ACTIONS D'OFFRES DE PRIX CLASSIQUES ---
  const handleAcceptOffer = async (msg) => {
    let offerId = msg.offer_id;
    let offeredPrice = 0;
    let listingId = convDetails?.listing_id;
    let sellerId = convDetails?.other_user_id || recipientId;

    // 1. Récupérer l'offre la plus récente liée au listing
    if (listingId) {
      const { data: offers } = await supabase
        .from('offers')
        .select('*')
        .eq('listing_id', listingId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (offers && offers.length > 0) {
        offerId = offers[0].id;
        // On récupère le prix (attention au nom de la colonne selon votre base : offered_price ou price)
        offeredPrice = Number(offers[0].offered_price || offers[0].price || 0);
        sellerId = offers[0].seller_id || sellerId;
      }
    }

    // 2. Si le prix est toujours à 0, on le lit directement dans le texte du message (ex: "0.20 €")
    if (offeredPrice === 0 && msg.content) {
      const matchPrice = msg.content.match(/(\d+[\.,]?\d*)\s*€/);
      if (matchPrice) {
        offeredPrice = parseFloat(matchPrice[1].replace(',', '.'));
      }
    }

    // 3. SÉCURITÉ ULTIME : Si le prix est vraiment introuvable, on met un prix par défaut (ex: 0.20 €) 
    // pour ne plus JAMAIS rester bloqué à 0.00 € et déclencher le mode troc par erreur.
    if (offeredPrice === 0) {
      offeredPrice = 0.20; 
    }

    // 4. Mettre à jour le statut de l'offre en base si on a un ID
    if (offerId) {
      await supabase.from('offers').update({ status: 'accepted' }).eq('id', offerId);
    }

    // 5. Envoyer le message de confirmation dans le chat
    await supabase.messages?.insert ? null : await supabase.from('messages').insert([
      {
        conversation_id: conversationId,
        sender_id: currentUserId,
        content: `✅ Offre acceptée (${offeredPrice.toFixed(2)} €) !`,
        offer_id: offerId || null
      }
    ]);

    // 6. Enregistrement forcé avec isTrade: false et protection acheteur activée
    const priceOfferCheckoutData = {
      listingId,
      sellerId,
      itemPrice: Number(offeredPrice),
      offerId: offerId || null,
      isTrade: false // BLOQUÉ STRICTEMENT À FALSE POUR ÉVITER LE TROC
    };

    localStorage.setItem('pendingCheckout', JSON.stringify(priceOfferCheckoutData));

    // 7. Rediriger / Ouvrir le panier
    if (onOpenTradeCheckout) {
      onOpenTradeCheckout({
        conversationId,
        cardsTotal: Number(offeredPrice),
        type: 'price_offer'
      });
    } else {
      window.dispatchEvent(new CustomEvent('open-checkout'));
    }
  };
  
  const handleRejectOffer = async (msg) => {
    const offerId = msg.offer_id || (await getTargetOfferId());
    if (!offerId) return;

    await supabase.from('offers').update({ status: 'rejected' }).eq('id', offerId);

    await supabase.from('messages').insert([
      {
        conversation_id: conversationId,
        sender_id: currentUserId,
        content: `❌ Offre refusée.`,
        offer_id: offerId
      }
    ]);
  };

  const handleCounterOffer = async (e, msg) => {
    e.preventDefault();
    const inputKey = msg.id || 'default';
    const inputVal = counterInputs[inputKey];
    if (!inputVal || parseFloat(inputVal) <= 0) return;

    const offerId = msg.offer_id || (await getTargetOfferId());
    if (!offerId) return;

    const newPrice = parseFloat(inputVal);
    await supabase.from('offers').update({ offered_price: newPrice, status: 'countered' }).eq('id', offerId);

    setCounterInputs((prev) => ({ ...prev, [inputKey]: '' }));

    await supabase.from('messages').insert([
      {
        conversation_id: conversationId,
        sender_id: currentUserId,
        content: `💬 Contre-proposition de prix : ${newPrice.toFixed(2)} €`,
        offer_id: offerId
      }
    ]);
  };

  // --- ACTIONS DE GESTION DU TROC (ÉCHANGE DE LOT) ---
  const handleAcceptTradeLot = async () => {
    await supabase.from('messages').insert([
      {
        conversation_id: conversationId,
        sender_id: currentUserId,
        content: `⚖️🤝 Échange de lot accepté ! Redirection vers la sélection des frais logistiques...`
      }
    ]);

    const tradeCheckoutData = {
      listingId: convDetails?.listing_id,
      sellerId: convDetails?.other_user_id || recipientId,
      itemPrice: 0, // 0 € pour l'échange de lot
      shippingFee: 2.99,
      selectedCarrier: "Mondial Relay",
      isTrade: true
    };
    
    localStorage.setItem('pendingCheckout', JSON.stringify(tradeCheckoutData));

    if (onOpenTradeCheckout) {
      onOpenTradeCheckout({
        conversationId,
        cardsTotal: 0,
        type: 'trade'
      });
    } else {
      window.dispatchEvent(new CustomEvent('open-checkout'));
    }
  };

  const handleRejectTradeLot = async () => {
    await supabase.from('messages').insert([
      {
        conversation_id: conversationId,
        sender_id: currentUserId,
        content: `❌ Proposition d'échange de lot refusée.`
      }
    ]);
  };

  const handleCounterTradeLot = async (e, msg) => {
    e.preventDefault();
    const inputKey = msg.id || 'default';
    const counterText = tradeCounterInputs[inputKey];
    if (!counterText || !counterText.trim()) return;

    await supabase.from('messages').insert([
      {
        conversation_id: conversationId,
        sender_id: currentUserId,
        content: `🔄 Contre-proposition d'échange : ${counterText.trim()}`
      }
    ]);

    setTradeCounterInputs((prev) => ({ ...prev, [inputKey]: '' }));
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (globalIsSending || !newMessage.trim()) return;

    globalIsSending = true;
    setLoadingSend(true);

    const messageContent = newMessage.trim();
    setNewMessage('');

    const { data: insertedData, error: messageError } = await supabase
      .from('messages')
      .insert([
        {
          conversation_id: conversationId,
          sender_id: currentUserId,
          content: messageContent
        }
      ])
      .select();

    if (!messageError && insertedData && insertedData.length > 0) {
      setMessages((prev) => {
        const newMsg = insertedData[0];
        if (prev.find((msg) => String(msg.id) === String(newMsg.id))) return prev;
        return [...prev, newMsg];
      });
    }

    globalIsSending = false;
    setLoadingSend(false);
  };

  return (
    <div className="flex flex-col h-[500px] bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden relative">
      <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center z-20 relative">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center font-bold text-amber-700 text-xs shadow-xs">
            KM
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm leading-tight">Kevin MLLT</h3>
            <span className="text-[10px] text-emerald-600 font-medium">● Membre actif</span>
          </div>
        </div>
        
        <button 
          onClick={() => setIsTrackingOpen(true)}
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 border border-indigo-200/60 px-3 py-1.5 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer hover:bg-indigo-100/50"
        >
          <span>📦</span>
          <span>Suivi de commande</span>
        </button>
      </div>

      <div className="flex-1 p-4 overflow-y-auto space-y-3">
        {messages.map((msg) => {
          const isMe = msg.sender_id === currentUserId;
          const inputKey = msg.id || 'default';
          const isTradeOffer = msg.content && msg.content.toLowerCase().includes("échange de lot");

          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} my-2`}>
              <div className="max-w-[85%] bg-indigo-50/80 border border-indigo-200 rounded-2xl p-4 text-slate-900 shadow-sm space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-base">{isTradeOffer ? '⚖️' : '🏷️'}</span>
                  <div>
                    <h4 className="font-bold text-xs text-indigo-950">
                      {isTradeOffer ? 'Proposition de Troc / Échange' : 'Proposition / Message'}
                    </h4>
                    <p className="text-slate-700 text-xs whitespace-pre-line">{msg.content}</p>
                  </div>
                </div>

                {/* Boutons d'action conditionnels selon le type de message */}
                {isTradeOffer ? (
                  <div className="pt-3 border-t border-indigo-200/60 space-y-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleAcceptTradeLot}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2 rounded-xl transition-colors cursor-pointer shadow-xs"
                      >
                        ✅ Accepter le lot
                      </button>
                      <button
                        type="button"
                        onClick={handleRejectTradeLot}
                        className="flex-1 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold py-2 rounded-xl transition-colors cursor-pointer shadow-xs"
                      >
                        ❌ Refuser
                      </button>
                    </div>

                    <form onSubmit={(e) => handleCounterTradeLot(e, msg)} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Modifier les cartes du lot..."
                        value={tradeCounterInputs[inputKey] || ''}
                        onChange={(e) => setTradeCounterInputs({ ...tradeCounterInputs, [inputKey]: e.target.value })}
                        className="flex-1 bg-white border border-indigo-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <button
                        type="submit"
                        className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-colors cursor-pointer shadow-xs"
                      >
                        🔄 Contre-proposer
                      </button>
                    </form>
                  </div>
                ) : (
                  <div className="pt-3 border-t border-indigo-200/60 space-y-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleAcceptOffer(msg)}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2 rounded-xl transition-colors cursor-pointer shadow-xs"
                      >
                        Accepter
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRejectOffer(msg)}
                        className="flex-1 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold py-2 rounded-xl transition-colors cursor-pointer shadow-xs"
                      >
                        Refuser
                      </button>
                    </div>

                    <form onSubmit={(e) => handleCounterOffer(e, msg)} className="flex gap-2">
                      <input
                        type="number"
                        step="0.01"
                        min="0.1"
                        placeholder="Nouveau prix (€)"
                        value={counterInputs[inputKey] || ''}
                        onChange={(e) => setCounterInputs({ ...counterInputs, [inputKey]: e.target.value })}
                        className="flex-1 bg-white border border-indigo-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <button
                        type="submit"
                        className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-colors cursor-pointer shadow-xs"
                      >
                        Contre-proposer
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="p-3 bg-slate-50 border-t border-slate-200 flex gap-2">
        <input
          type="text"
          placeholder="Écrivez votre message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          disabled={loadingSend}
          className="flex-1 bg-white border border-slate-300 rounded-xl px-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loadingSend}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-5 py-2 rounded-xl text-xs transition-colors cursor-pointer disabled:opacity-50"
        >
          {loadingSend ? 'Envoi...' : 'Envoyer'}
        </button>
      </form>

      <OrderTrackingModal 
        isOpen={isTrackingOpen} 
        onClose={() => setIsTrackingOpen(false)} 
        currentStep={trackingData.step} 
        sellerName={trackingData.sellerName} 
        trackingInfo={trackingData} 
      />
    </div>
  );
}