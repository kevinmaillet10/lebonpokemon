import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';

export default function FairTradeView({ currentUserId, onOpenConversation }) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUserId) {
      calculateFairTrades();
    }
  }, [currentUserId]);

  const calculateFairTrades = async () => {
    setLoading(true);
    try {
      // 1. Récupérer TOUTES les wishlists
      const { data: allWishlist, error: wishError } = await supabase.from('wishlist').select('*');
      if (wishError) throw wishError;

      // 2. Récupérer TOUTES les annonces en stock (> 0) avec les profils
      const { data: allListings, error: listingsError } = await supabase
        .from('listings')
        .select('*, profiles(id, username, avatar_url)')
        .gt('quantity', 0);
      if (listingsError) throw listingsError;

      // 3. Récupérer TOUTES les cartes
      const { data: allCards, error: cardsError } = await supabase.from('cards').select('*');
      if (cardsError) throw cardsError;

      const cardsMap = {};
      if (allCards) {
        allCards.forEach(c => {
          if (c.id) cardsMap[String(c.id).trim()] = c;
        });
      }

      const getCardmarketPrice = (cardId, variant) => {
        const cardData = cardsMap[String(cardId).trim()];
        if (!cardData) return 10;
        const cm = cardData.cardmarket_prices || cardData.cardmarket || {};
        if (variant === 'reverse' && cm.reverseTrend) return Number(cm.reverseTrend);
        if (variant === 'holo' && cm.holoTrend) return Number(cm.holoTrend);
        return Number(cm.trend || cm.averageSellPrice || cardData.price || 10);
      };

      const myWishlist = allWishlist?.filter(w => w.user_id === currentUserId) || [];
      const myListings = allListings?.filter(l => l.user_id === currentUserId) || [];

      const myWishlistCardIds = myWishlist.map(w => String(w.card_id || w.tcgdex_card_id || w.id || '').trim()).filter(Boolean);
      const myListingCardIds = myListings.map(l => String(l.tcgdex_card_id || l.card_id || '').trim()).filter(Boolean);

      const partnersMap = {};

      // A. Ce que les autres ont et que VOUS voulez
      allListings.forEach(listing => {
        if (listing.user_id === currentUserId) return;
        const partnerId = listing.user_id;
        if (!partnerId || !listing.profiles) return;

        const cardId = String(listing.tcgdex_card_id || listing.card_id || '').trim();

        if (!partnersMap[partnerId]) {
          partnersMap[partnerId] = {
            partner: listing.profiles,
            cardsTheyHaveForMe: [],
            cardsIHaveForThem: [],
            totalThemValue: 0,
            totalMyValue: 0
          };
        }

        if (myWishlistCardIds.includes(cardId)) {
          const price = Number(listing.price || getCardmarketPrice(cardId, listing.variant));
          partnersMap[partnerId].cardsTheyHaveForMe.push({ ...listing, calculatedValue: price });
          partnersMap[partnerId].totalThemValue += price;
        }
      });

      // B. Ce que vous avez et que les autres VEULENT
      allWishlist.forEach(wish => {
        if (wish.user_id === currentUserId) return;
        const partnerId = wish.user_id;
        const partnerWishCardId = String(wish.card_id || wish.tcgdex_card_id || wish.id || '').trim();

        if (partnersMap[partnerId] && myListingCardIds.includes(partnerWishCardId)) {
          const myListing = myListings.find(l => String(l.tcgdex_card_id || l.card_id || '').trim() === partnerWishCardId);
          if (myListing && !partnersMap[partnerId].cardsIHaveForThem.some(c => String(c.tcgdex_card_id || c.card_id || '').trim() === partnerWishCardId)) {
            const price = Number(myListing.price || getCardmarketPrice(partnerWishCardId, myListing.variant));
            partnersMap[partnerId].cardsIHaveForThem.push({ ...myListing, calculatedValue: price });
            partnersMap[partnerId].totalMyValue += price;
          }
        }
      });

      const validMatches = Object.values(partnersMap).filter(m => m.cardsTheyHaveForMe.length > 0);
      setMatches(validMatches);
    } catch (err) {
      console.error("Erreur dans calculateFairTrades :", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartConversation = async (match) => {
    try {
      const partnerId = match.partner.id;
      const firstListingId = match.cardsTheyHaveForMe[0]?.id;

      // 1. Chercher si une conversation existe déjà entre les deux utilisateurs pour cette annonce
      const { data: existingConvos } = await supabase
        .from('conversations')
        .select('id')
        .eq('listing_id', firstListingId)
        .or(`and(buyer_id.eq.${currentUserId},seller_id.eq.${partnerId}),and(buyer_id.eq.${partnerId},seller_id.eq.${currentUserId})`);

      let conversationId;
      if (existingConvos && existingConvos.length > 0) {
        conversationId = existingConvos[0].id;
      } else {
        // Créer la conversation si elle n'existe pas
        const { data: newConvo, error: insertError } = await supabase
          .from('conversations')
          .insert([{ listing_id: firstListingId, buyer_id: currentUserId, seller_id: partnerId }])
          .select('id')
          .single();
        if (insertError) throw insertError;
        conversationId = newConvo.id;
      }

      // 2. Formater le contenu du message récapitulatif de l'échange de lot
      const themNames = match.cardsTheyHaveForMe.map(c => c.cards?.name || c.name || 'Carte').join(', ');
      const myNames = match.cardsIHaveForThem.length > 0 
        ? match.cardsIHaveForThem.map(c => c.cards?.name || c.name || 'Carte').join(', ') 
        : "Aucune carte spécifique";

      const messageContent = `🤝 **Proposition d'échange de lot équilibré**\n` +
        `• Il/Elle vous propose : ${themNames} (~${match.totalThemValue.toFixed(2)} €)\n` +
        `• Vous lui proposez en échange : ${myNames} (~${match.totalMyValue.toFixed(2)} €)`;

      // 3. Envoyer le message dans la table messages
      const { error: msgError } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: currentUserId,
        content: messageContent,
        is_read: false
      });
      if (msgError) throw msgError;

      // 4. Mettre à jour la date de la conversation pour la faire remonter en haut
      await supabase
        .from('conversations')
        .update({ updated_at: new Date() })
        .eq('id', conversationId);

      // 5. Ouvrir la conversation dans l'interface
      if (onOpenConversation) {
        onOpenConversation(conversationId);
      }
    } catch (err) {
      console.error("Erreur ouverture conversation et envoi du lot :", err);
      alert("Impossible d'envoyer la proposition d'échange.");
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 text-white">
      <div className="mb-8">
        <h2 className="text-2xl font-black flex items-center gap-3">
          <span>⚖️</span> Troc & Échange Équitable (Cote Cardmarket)
        </h2>
        <p className="text-slate-400 text-sm mt-1">
          Analyse croisée basée sur les ID de cartes, les cotes Cardmarket et vos wishlists croisées.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500 animate-pulse">Analyse des correspondances de troc...</div>
      ) : matches.length === 0 ? (
        <div className="bg-[#16181d] border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
          <p className="text-lg font-bold mb-2">Aucun match de troc trouvé pour l'instant.</p>
          <p className="text-xs text-slate-500">Vérifiez que les cartes croisent bien vos wishlists et les stocks des autres comptes.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {matches.map((match, idx) => {
            const diff = Math.abs(match.totalThemValue - match.totalMyValue);
            const isBalanced = diff <= 15 || (match.totalMyValue > 0 && diff / match.totalThemValue <= 0.2);

            return (
              <div key={idx} className="bg-[#16181d] border border-slate-800 rounded-2xl p-5 flex flex-col justify-between shadow-xl">
                <div>
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800/80">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-pink-600 to-purple-600 flex items-center justify-center font-bold text-white text-sm shadow-md">
                        {match.partner.username?.[0]?.toUpperCase() || 'M'}
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-base">{match.partner.username}</h3>
                        <p className="text-xs text-slate-400">Partenaire de troc</p>
                      </div>
                    </div>
                    <div>
                      {isBalanced && match.totalMyValue > 0 ? (
                        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                          ⚖️ Lot Équilibré (~{match.totalThemValue.toFixed(2)} €)
                        </span>
                      ) : (
                        <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 text-xs font-bold px-3 py-1.5 rounded-xl">
                          🎯 {match.cardsTheyHaveForMe.length} carte(s) dispo
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/50">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Il/Elle a pour vous</p>
                      <p className="text-sm font-black text-pink-400">{match.cardsTheyHaveForMe.length} carte(s)</p>
                      <p className="text-xs font-bold text-slate-300 mt-0.5">Cote CM : {match.totalThemValue.toFixed(2)} €</p>
                    </div>

                    <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/50">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Il/Elle veut de vous</p>
                      <p className="text-sm font-black text-purple-400">{match.cardsIHaveForThem.length} carte(s)</p>
                      <p className="text-xs font-bold text-slate-300 mt-0.5">Cote CM : {match.totalMyValue.toFixed(2)} €</p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleStartConversation(match)}
                  className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white text-xs font-bold py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 mt-2 cursor-pointer"
                >
                  💬 Proposer cet échange de lot
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}