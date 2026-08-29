import React, { useState } from 'react';
import { supabase } from './supabase';

export default function SingleListing({ 
  listing, 
  onClick, 
  onAddToCart, 
  isFavorite = false, 
  onToggleFavorite,
  currentUserId,
}) {
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offeredPrice, setOfferedPrice] = useState(listing.price || '');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  if (!listing) return null;

  // Détermine si l'annonce appartient à l'utilisateur connecté
  const isOwnListing = currentUserId && (listing.user_id === currentUserId || listing.seller_id === currentUserId);

  // Extraction et parsing ultra-robuste des images (gère le string JSON de Supabase)
  let rawImage = null;
  let imagesList = listing.image_url;

  if (typeof imagesList === 'string') {
    try {
      imagesList = JSON.parse(imagesList);
    } catch (e) {
      imagesList = [imagesList];
    }
  }

  if (Array.isArray(imagesList) && imagesList.length > 0) {
    rawImage = imagesList[0];
  } else if (listing.cards?.image_url) {
    rawImage = Array.isArray(listing.cards.image_url) ? listing.cards.image_url[0] : listing.cards.image_url;
  } else if (listing.card_image) {
    rawImage = listing.card_image;
  }

  const cardImage = rawImage;
  const cardName = listing.title || listing.cards?.name || listing.card_name;
  const seller = listing.profiles;

  const cardData = Array.isArray(listing.cards) ? listing.cards[0] : listing.cards;
  const illustrator = listing.illustrator || cardData?.illustrator;
  const rawTypes = listing.types || cardData?.types || [];
  const cardTypes = Array.isArray(rawTypes) ? rawTypes.join(', ') : rawTypes;

  // Fonction pour envoyer l'offre dans la table Supabase `offers`
  const handleSendOffer = async (e) => {
    e.preventDefault();
    if (!offeredPrice || offeredPrice <= 0) return;

    setLoading(true);
    try {
      const sellerId = listing.user_id || listing.seller_id;
      const parsedPrice = parseFloat(offeredPrice);

      // 1. Enregistrer l'offre
      const { error: offerError } = await supabase
        .from('offers')
        .insert([
          {
            listing_id: listing.id,
            buyer_id: currentUserId,
            offered_price: parsedPrice,
            status: 'pending'
          }
        ]);

      if (offerError) throw offerError;

      // 2. Gérer la conversation (Vérifier si elle existe ou la créer)
      let conversationId = null;

      const { data: existingConvs } = await supabase
        .from('conversations')
        .select('id')
        .eq('listing_id', listing.id)
        .eq('buyer_id', currentUserId)
        .eq('seller_id', sellerId)
        .limit(1);

      if (existingConvs && existingConvs.length > 0) {
        conversationId = existingConvs[0].id;
      } else {
        const { data: newConv, error: convError } = await supabase
          .from('conversations')
          .insert([
            {
              listing_id: listing.id,
              buyer_id: currentUserId,
              seller_id: sellerId
            }
          ])
          .select('id')
          .single();

        if (!convError && newConv) {
          conversationId = newConv.id;
        }
      }

      // 3. Envoyer un message automatique dans la messagerie
      if (conversationId) {
        await supabase
          .from('messages')
          .insert([
            {
              conversation_id: conversationId,
              sender_id: currentUserId,
              content: `🏷️ Proposition de prix : ${parsedPrice.toFixed(2)} € sur l'annonce "${cardName || 'Carte Pokémon'}".`
            }
          ]);
      }

      // 4. Créer la notification rattachée à la conversation
      if (sellerId) {
        await supabase
          .from('notifications')
          .insert([
            {
              user_id: sellerId,
              title: 'Nouvelle offre ! 🏷️',
              message: `Un acheteur propose ${parsedPrice.toFixed(2)} € sur "${cardName || 'Carte'}".`,
              conversation_id: conversationId, // Permet d'ouvrir le chat depuis la cloche
              is_read: false
            }
          ]);
      }

      setSuccessMsg('Offre envoyée avec succès ! 🎉');
      setTimeout(() => {
        setShowOfferModal(false);
        setSuccessMsg('');
      }, 2000);
    } catch (err) {
      console.error("Erreur lors de l'envoi de l'offre :", err.message);
      alert("Une erreur est survenue lors de l'envoi de l'offre.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="bg-slate-900 rounded-2xl border border-slate-200/85 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between group relative">
        
        {/* Bouton Favori (❤️) positionné en haut à droite */}
        {onToggleFavorite && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(listing);
            }}
            className="absolute top-3 right-3 bg-white/90 hover:bg-white text-slate-700 p-2 rounded-full shadow-md transition-all cursor-pointer z-20 backdrop-blur-sm"
            title={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
          >
            {isFavorite ? '❤️' : '🤍'}
          </button>
        )}

        {/* Partie cliquable pour voir les détails de l'annonce */}
        <div onClick={onClick} className="cursor-pointer">
          {/* Container Image */}
          <div className="bg-slate-900 p-4 relative aspect-[3/4] flex items-center justify-center border-b border-slate-100">
            {cardImage ? (
              <img 
                src={cardImage} 
                alt={cardName || 'Carte Pokémon'} 
                className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-200 drop-shadow-md"
                onError={(e) => {
                  e.target.style.display = 'none';
                  if (e.target.nextSibling) e.target.nextSibling.style.display = 'block';
                }}
              />
            ) : null}
            
            <div className="text-xs text-slate-400 font-medium text-center p-2" style={{ display: cardImage ? 'none' : 'block' }}>
              Pas d'image
            </div>

            {listing.condition && (
              <span className="absolute top-2.5 left-2.5 bg-slate-900/80 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider z-10">
                {listing.condition}
              </span>
            )}

            {Array.isArray(imagesList) && imagesList.length > 1 && (
              <span className="absolute top-2.5 right-14 bg-black/70 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shadow-md z-10">
                📸 {imagesList.length - 1}
              </span>
            )}
          </div>

          {/* Informations de l'annonce */}
          <div className="p-4 flex flex-col gap-2">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold text-indigo-600 tracking-wider uppercase bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 inline-block">
                  {seller?.department_code ? `Dept. ${seller.department_code}` : 'Pokémon'}
                </span>

                {seller?.is_certified && (
                  <span className="text-[10px] text-sky-600 font-bold flex items-center gap-0.5 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-100">
                    ✓ Certifié
                  </span>
                )}
              </div>

              <h3 className="font-bold text-slate-300 text-sm line-clamp-1 group-hover:text-indigo-600 transition-colors">
                {cardName || 'Carte Pokémon'}
              </h3>
              
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                Par {seller?.username || 'Vendeur'}
              </p>

              {(illustrator || cardTypes) && (
                <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500 space-y-0.5">
                  {illustrator && (
                    <div className="truncate">
                      <span className="font-semibold text-slate-400">Illus :</span> {illustrator}
                    </div>
                  )}
                  {cardTypes && (
                    <div className="truncate">
                      <span className="font-semibold text-slate-400">Type :</span> <span className="text-indigo-600 font-medium">{cardTypes}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-lg font-black text-slate-900">
                {Number(listing.price || 0).toFixed(2)} €
              </span>
              <span className="text-xs font-semibold text-slate-400 group-hover:text-indigo-600 transition-colors">
                Voir &rarr;
              </span>
            </div>
          </div>
        </div>

        {/* Boutons d'action (Panier + Négociation) */}
        <div className="p-4 pt-0 flex flex-col gap-2">
          {isOwnListing ? (
            <div className="w-full bg-slate-100 text-slate-500 text-xs font-bold py-2.5 rounded-2xl text-center border border-slate-200 select-none">
              Votre annonce
            </div>
          ) : (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (onAddToCart) onAddToCart(listing, 1);
                }}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2.5 rounded-2xl transition-colors shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>🛒</span> Ajouter au panier
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowOfferModal(true);
                }}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1"
              >
                <span>💬</span> Faire une offre
              </button>
            </>
          )}
        </div>
      </div>

      {/* MODALE DE NÉGOCIATION */}
      {showOfferModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={(e) => e.stopPropagation()}>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl relative animate-in fade-in zoom-in duration-200 text-white">
            <h3 className="text-xl font-bold mb-1">Proposer un prix</h3>
            <p className="text-slate-400 text-xs mb-4">
              Annonce de <span className="text-white font-semibold">{seller?.username || 'Vendeur'}</span> — Prix initial : <span className="text-indigo-400 font-semibold">{Number(listing.price || 0).toFixed(2)} €</span>
            </p>

            {successMsg ? (
              <div className="bg-emerald-500/20 border border-emerald-500 text-emerald-300 p-4 rounded-xl text-center font-medium">
                {successMsg}
              </div>
            ) : (
              <form onSubmit={handleSendOffer} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Votre offre (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.1"
                    value={offeredPrice}
                    onChange={(e) => setOfferedPrice(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowOfferModal(false)}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-semibold py-3 rounded-xl transition-all cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                  >
                    {loading ? 'Envoi...' : 'Envoyer l\'offre'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}