import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { ShoppingCart, Info, CheckSquare, Square, X } from 'lucide-react';
import UserStoreModal from './UserStoreModal'; 

export default function MissingCardsOptimizer({ user, userId, onAddToCart, onViewAllCards }) {
  const [rankedSellers, setRankedSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [selectedCardsMap, setSelectedCardsMap] = useState({});
  const [hoveredImage, setHoveredImage] = useState(null);
  
  const [selectedSellerIdForStore, setSelectedSellerIdForStore] = useState(null);
  const [selectedVendorForFullList, setSelectedVendorForFullList] = useState(null);

  useEffect(() => {
    async function processOptimizer() {
      try {
        setLoading(true);
        setError(null);

        let currentUserId = typeof user === 'string' ? user : (user?.id || userId);
        
        if (!currentUserId) {
          const { data: sessionData } = await supabase.auth.getSession();
          currentUserId = sessionData?.session?.user?.id;
        }

        if (!currentUserId) {
          setError("Utilisateur non identifié. Veuillez vous reconnecter.");
          setLoading(false);
          return;
        }

        // 1. Charger toutes les cartes de référence depuis pokemon_cards (contient release_date et set_name)
        let allCardsMap = {};
        let step = 1000;
        let start = 0;
        let fetchMore = true;

        while (fetchMore) {
          const { data: batch, error: cardsError } = await supabase
            .from('pokemon_cards')
            .select('*')
            .order('tcgdex_id', { ascending: true })
            .range(start, start + step - 1);

          if (cardsError) throw cardsError;

          if (batch && batch.length > 0) {
            batch.forEach(card => {
              if (card?.tcgdex_id) {
                allCardsMap[card.tcgdex_id] = card;
              }
            });
            start += step;
            if (batch.length < step) fetchMore = false;
          } else {
            fetchMore = false;
          }
        }

        // 2. Récupérer la collection de l'utilisateur
        const { data: userCollection, error: collError } = await supabase
          .from('user_collection')
          .select('card_id, is_owned')
          .eq('user_id', currentUserId);

        if (collError) throw collError;

        const ownedSet = new Set();
        if (Array.isArray(userCollection)) {
          userCollection.forEach(item => {
            if (item?.card_id && item?.is_owned) {
              ownedSet.add(item.card_id);
            }
          });
        }

        // 3. Identifier les cartes manquantes
        const missingCardIds = new Set();
        Object.keys(allCardsMap).forEach(cardId => {
          if (!ownedSet.has(cardId)) {
            missingCardIds.add(cardId);
          }
        });

        // 4. Interroger les annonces
        const { data: listings, error: listingsError } = await supabase
          .from('listings')
          .select('*');

        if (listingsError) throw listingsError;

        if (!listings || listings.length === 0 || missingCardIds.size === 0) {
          setRankedSellers([]);
          setLoading(false);
          return;
        }

        // 5. Récupérer les profils des vendeurs
        const sellerIds = [...new Set(listings.map(l => l?.seller_id).filter(Boolean))];
        let profilesMap = {};
        
        if (sellerIds.length > 0) {
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, username')
            .in('id', sellerIds);

          if (Array.isArray(profilesData)) {
            profilesData.forEach(p => {
              if (p?.id) profilesMap[p.id] = p.username;
            });
          }
        }

        // 6. Grouper par vendeur et récupérer les infos directement depuis pokemon_cards
        const sellerMap = {};
        const initialSelections = {};

        listings.forEach((listing, index) => {
          if (!listing || listing.seller_id === currentUserId) return;

          const cardRef = listing.tcgdex_card_id;
          if (!cardRef || !missingCardIds.has(cardRef)) return;
          if (Number(listing.quantity || 1) <= 0) return;

          const sellerId = listing.seller_id;
          if (!sellerMap[sellerId]) {
            sellerMap[sellerId] = {
              id: sellerId,
              name: profilesMap[sellerId] || 'Vendeur',
              rating: '500',
              cards: []
            };
            initialSelections[sellerId] = {};
          }

          const uniqueKey = listing.id || `${sellerId}-${cardRef}-${index}`;

          let resolvedImageUrl = null;
          try {
            const rawImg = listing.image_url || listing.card_image_url;
            if (rawImg) {
              const parsed = typeof rawImg === 'string' ? JSON.parse(rawImg) : rawImg;
              resolvedImageUrl = Array.isArray(parsed) ? parsed[0] : parsed;
            }
          } catch (e) {
            resolvedImageUrl = listing.image_url || listing.card_image_url;
          }

          const cardInfo = allCardsMap[cardRef] || {};
          const releaseDate = cardInfo.release_date || null;
          const setNames = cardInfo.set_name || '';

          const enrichedCard = {
            ...listing,
            uniqueKey,
            tcgdex_card_id: cardRef,
            image_url: resolvedImageUrl,
            seriesName: setNames,
            cardName: cardInfo.name || listing.title || listing.name || 'Carte Pokémon',
            quantity: 1,
            release_date: releaseDate, 
          };

          sellerMap[sellerId].cards.push(enrichedCard);
          initialSelections[sellerId][uniqueKey] = true;
        });

        // 7. Tri strict : Date de sortie décroissante (du plus récent au plus ancien), puis par ID TCGdex
        Object.values(sellerMap).forEach(vendor => {
          vendor.cards.sort((a, b) => {
            const dateA = a.release_date ? new Date(a.release_date).getTime() : 0;
            const dateB = b.release_date ? new Date(b.release_date).getTime() : 0;

            if (dateB !== dateA) {
              return dateB - dateA; // Du plus récent au plus ancien
            }

            const idA = a.tcgdex_card_id || '';
            const idB = b.tcgdex_card_id || '';
            return idB.localeCompare(idA, undefined, { numeric: true, sensitivity: 'base' });
          });
        });

        const sortedSellers = Object.values(sellerMap).sort(
          (a, b) => b.cards.length - a.cards.length
        );

        setRankedSellers(sortedSellers);
        setSelectedCardsMap(initialSelections);

      } catch (err) {
        console.error("Erreur critique :", err);
        setError("Erreur technique : " + (err.message || JSON.stringify(err)));
      } finally {
        setLoading(false);
      }
    }

    processOptimizer();
  }, [user, userId]);

  const toggleCardSelection = (vendorId, uniqueKey) => {
    setSelectedCardsMap(prev => ({
      ...prev,
      [vendorId]: {
        ...(prev[vendorId] || {}),
        [uniqueKey]: !(prev[vendorId]?.[uniqueKey])
      }
    }));
  };

  const toggleAllVendorCards = (vendor, selectAll) => {
    const newVendorSelection = {};
    vendor.cards.forEach(card => {
      newVendorSelection[card.uniqueKey] = selectAll;
    });
    setSelectedCardsMap(prev => ({
      ...prev,
      [vendor.id]: newVendorSelection
    }));
  };

  if (loading) {
    return <div className="p-6 text-center text-slate-300">Analyse de votre collection et recherche des meilleurs vendeurs...</div>;
  }

  if (error) {
    return <div className="p-6 text-center text-red-400 font-medium mt-6">{error}</div>;
  }

  if (!Array.isArray(rankedSellers) || rankedSellers.length === 0) {
    return (
      <div className="p-6 max-w-4xl mx-auto text-center text-slate-400 bg-slate-800/50 rounded-2xl border border-slate-700 mt-6">
        <p className="text-lg font-medium">Aucun vendeur ne propose vos cartes manquantes pour le moment.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 text-white relative">
      <h2 className="text-2xl font-bold mb-2 text-slate-100">
        Optimiseur de paniers (Vendeurs recommandés)
      </h2>
      <p className="text-slate-400 mb-6">
        Classement des vendeurs proposant le plus grand nombre de cartes qu'il vous manque, pour optimiser vos frais de port.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {rankedSellers.map((vendor) => {
          const vendorSelections = selectedCardsMap[vendor.id] || {};
          
          const checkedCards = vendor.cards.filter(card => vendorSelections[card.uniqueKey]);
          
          const totalCardPrice = checkedCards.reduce((sum, card) => {
            const quantity = card.quantity || 1; 
            return sum + (Number(card.price || 0) * quantity);
          }, 0);

          const shippingFee = checkedCards.length > 0 ? 2.50 : 0;
          const grandTotal = totalCardPrice + shippingFee;

          const allSelected = vendor.cards.length > 0 && vendor.cards.every(card => vendorSelections[card.uniqueKey]);
          
          const maxVisibleCards = 20;
          const hasMoreThan20 = vendor.cards.length > maxVisibleCards;
          const displayedCards = vendor.cards.slice(0, maxVisibleCards);

          return (
            <div key={vendor.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
              
              <div className="flex justify-between items-start mb-4 border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400 font-bold text-sm">★ {vendor.rating}</span>
                    <span className="text-xs bg-slate-800 px-2 py-0.5 rounded text-slate-300">🇫🇷</span>
                    
                    <button 
                      onClick={() => setSelectedSellerIdForStore(vendor.id)}
                      className="font-extrabold text-indigo-400 text-base hover:underline text-left cursor-pointer bg-transparent border-none p-0"
                    >
                      {vendor.name}
                    </button>
                  </div>
                  <span className="inline-block bg-emerald-950/80 text-emerald-400 border border-emerald-500/30 text-xs font-semibold px-2.5 py-0.5 rounded-lg mt-2">
                    {checkedCards.length} / {vendor.cards.length} carte(s) sélectionnée(s)
                  </span>
                </div>
                
                <button 
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    
                    const safeCards = Array.isArray(checkedCards) ? checkedCards.filter(Boolean) : [];
                    
                    const vendorPayload = { 
                      id: vendor?.id || 'unknown_vendor',
                      name: vendor?.name || 'Vendeur',
                      rating: vendor?.rating || '500',
                      items: safeCards,  // Format attendu par App.jsx (.reduce)
                      cards: safeCards,  
                      totalCardPrice: Number(totalCardPrice || 0), 
                      shippingFee: Number(shippingFee || 2.50)
                    };

                    // 1. Sauvegarde dans le localStorage
                    const cartKey = 'pokemarket_cart';
                    let currentCart = {};
                    try {
                      const saved = localStorage.getItem(cartKey);
                      if (saved) {
                        const parsed = JSON.parse(saved);
                        if (parsed && typeof parsed === 'object') {
                          currentCart = parsed;
                        }
                      }
                    } catch (err) {
                      console.error("Erreur lecture localStorage", err);
                    }

                    if (!Array.isArray(currentCart)) {
                      currentCart[vendorPayload.id] = vendorPayload;
                    } else {
                      currentCart = [vendorPayload];
                    }

                    localStorage.setItem(cartKey, JSON.stringify(currentCart));

                    // 2. Mémorise l'onglet actif sur "cart" si ton app utilise le localStorage pour les onglets
                    localStorage.setItem('active_tab', 'cart');

                    // 3. Appel de la prop si elle existe
                    if (onAddToCart) {
                      onAddToCart(vendorPayload);
                    }

                    // 4. Recharge la page : App.jsx va relire le localStorage à l'allumage et affichera enfin le panier rempli !
                    window.location.reload();
                  }}
                  disabled={!checkedCards || checkedCards.length === 0}
                  style={{ position: 'relative', zIndex: 50 }}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white p-2.5 rounded-xl transition-colors cursor-pointer flex items-center justify-center shadow-lg"
                  title="Mettre la sélection dans le panier"
                >
                  <ShoppingCart size={16} />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-1.5 text-xs font-medium text-slate-300 mb-4 bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
                <div className="flex justify-between">
                  <span className="text-slate-400">♥ Articles sélectionnés</span>
                  <span className="font-bold text-white">{checkedCards.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">⚙ Valeur des articles</span>
                  <span className="font-bold text-white">{totalCardPrice.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 flex items-center gap-1">
                    📦 Frais de port <Info size={12} className="text-slate-500 cursor-help" />
                  </span>
                  <span className="font-bold text-white">{shippingFee.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-800 text-sm">
                  <span className="font-extrabold text-slate-200">Total</span>
                  <span className="font-black text-indigo-400">{grandTotal.toFixed(2)} €</span>
                </div>
              </div>

              <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden mb-3">
                <div className="grid grid-cols-12 bg-slate-900/90 px-3 py-2 text-[11px] font-bold text-slate-400 border-b border-slate-800 items-center">
                  <div className="col-span-1 text-center flex justify-center">
                    <button 
                      onClick={() => toggleAllVendorCards(vendor, !allSelected)}
                      className="text-emerald-500 cursor-pointer bg-transparent border-none p-0"
                      title={allSelected ? "Tout décocher" : "Tout cocher"}
                    >
                      {allSelected ? <CheckSquare size={14} /> : <Square size={14} className="text-slate-500" />}
                    </button>
                  </div>
                  <div className="col-span-1 text-center">📷</div>
                  <div className="col-span-1 text-center">Qté</div>
                  <div className="col-span-6">Nom de carte / Série</div>
                  <div className="col-span-3 text-right">Prix</div>
                </div>

                <div className="divide-y divide-slate-900">
                  {displayedCards.map((card) => {
                    const isChecked = !!vendorSelections[card.uniqueKey];

                    return (
                      <div key={card.uniqueKey} className="grid grid-cols-12 items-center px-3 py-2 text-xs hover:bg-slate-900/50 transition-colors">
                        
                        <div className="col-span-1 text-center flex justify-center">
                          <button 
                            onClick={() => toggleCardSelection(vendor.id, card.uniqueKey)}
                            className="cursor-pointer bg-transparent border-none p-0 text-emerald-500"
                          >
                            {isChecked ? <CheckSquare size={14} /> : <Square size={14} className="text-slate-600" />}
                          </button>
                        </div>

                        <div className="col-span-1 text-center relative flex justify-center">
                          {card?.image_url ? (
                            <span 
                              onMouseEnter={(e) => setHoveredImage({ url: card.image_url, x: e.clientX, y: e.clientY })}
                              onMouseLeave={() => setHoveredImage(null)}
                              className="cursor-pointer text-indigo-400 hover:text-indigo-300 font-bold"
                            >
                              📷
                            </span>
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </div>

                        <div className="col-span-1 text-center font-mono text-slate-300">{card?.quantity || 1}</div>
                        
                        <div className="col-span-6 truncate pr-2 flex flex-col">
                          <span className={`font-bold ${isChecked ? 'text-slate-200' : 'text-slate-500 line-through'}`}>
                            {card?.cardName}
                          </span>
                          {card?.seriesName && (
                            <span className={`text-[10px] ${isChecked ? 'text-slate-400' : 'text-slate-600'}`}>
                              {card.seriesName}
                            </span>
                          )}
                        </div>

                        <div className={`col-span-3 text-right font-mono font-bold ${isChecked ? 'text-indigo-300' : 'text-slate-600 line-through'}`}>
                          {Number(card?.price || 0).toFixed(2)} €
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {hasMoreThan20 && (
                <button
                  onClick={() => {
                    if (onViewAllCards) {
                      onViewAllCards(vendor);
                    } else {
                      setSelectedVendorForFullList(vendor);
                    }
                  }}
                  className="w-full py-2.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-xs font-bold text-indigo-300 rounded-xl transition-colors flex items-center justify-center gap-1 cursor-pointer border border-indigo-500/30 shadow-sm"
                >
                  Voir les {vendor.cards.length} cartes disponibles sur la page dédiée →
                </button>
              )}

            </div>
          );
        })}
      </div>

      {selectedVendorForFullList && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-fade-in">
            <div className="flex justify-between items-center p-5 border-b border-slate-800 bg-slate-950">
              <div>
                <h3 className="text-lg font-bold text-white">
                  Cartes disponibles de {selectedVendorForFullList.name}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selectedVendorForFullList.cards.length} carte(s) correspondante(s) dans cette liste
                </p>
              </div>
              <button 
                onClick={() => setSelectedVendorForFullList(null)}
                className="text-slate-400 hover:text-white bg-slate-800 p-2 rounded-xl cursor-pointer transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 divide-y divide-slate-900">
              <div className="grid grid-cols-12 bg-slate-950 px-3 py-2 text-[11px] font-bold text-slate-400 border-b border-slate-800 items-center rounded-lg mb-2">
                <div className="col-span-1 text-center flex justify-center">
                  <button 
                    onClick={() => {
                      const vendor = selectedVendorForFullList;
                      const vendorSelections = selectedCardsMap[vendor.id] || {};
                      const allSelected = vendor.cards.every(card => vendorSelections[card.uniqueKey]);
                      toggleAllVendorCards(vendor, !allSelected);
                    }}
                    className="text-emerald-500 cursor-pointer bg-transparent border-none p-0"
                  >
                    <CheckSquare size={14} />
                  </button>
                </div>
                <div className="col-span-1 text-center">📷</div>
                <div className="col-span-1 text-center">Qté</div>
                <div className="col-span-6">Nom de carte / Série</div>
                <div className="col-span-3 text-right">Prix</div>
              </div>

              {selectedVendorForFullList.cards.map((card) => {
                const vendorSelections = selectedCardsMap[selectedVendorForFullList.id] || {};
                const isChecked = !!vendorSelections[card.uniqueKey];

                return (
                  <div key={card.uniqueKey} className="grid grid-cols-12 items-center px-3 py-3 text-xs hover:bg-slate-950/60 transition-colors">
                    <div className="col-span-1 text-center flex justify-center">
                      <button 
                        onClick={() => toggleCardSelection(selectedVendorForFullList.id, card.uniqueKey)}
                        className="cursor-pointer bg-transparent border-none p-0 text-emerald-500"
                      >
                        {isChecked ? <CheckSquare size={16} /> : <Square size={16} className="text-slate-600" />}
                      </button>
                    </div>

                    <div className="col-span-1 text-center relative flex justify-center">
                      {card?.image_url ? (
                        <span 
                          onMouseEnter={(e) => setHoveredImage({ url: card.image_url, x: e.clientX, y: e.clientY })}
                          onMouseLeave={() => setHoveredImage(null)}
                          className="cursor-pointer text-indigo-400 hover:text-indigo-300 font-bold text-sm"
                        >
                          📷
                        </span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </div>

                    <div className="col-span-1 text-center font-mono text-slate-300">{card?.quantity || 1}</div>
                    
                    <div className="col-span-6 truncate pr-2 flex flex-col">
                      <span className={`font-bold ${isChecked ? 'text-slate-200' : 'text-slate-500 line-through'}`}>
                        {card?.cardName}
                      </span>
                      {card?.seriesName && (
                        <span className={`text-[10px] ${isChecked ? 'text-slate-400' : 'text-slate-600'}`}>
                          {card.seriesName}
                        </span>
                      )}
                    </div>

                    <div className={`col-span-3 text-right font-mono font-bold ${isChecked ? 'text-indigo-300' : 'text-slate-600 line-through'}`}>
                      {Number(card?.price || 0).toFixed(2)} €
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedVendorForFullList(null)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-5 py-2 rounded-xl text-xs transition-colors cursor-pointer shadow-md"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {hoveredImage && (
        <div 
          className="fixed z-50 pointer-events-none bg-slate-950 border border-indigo-500/50 p-2 rounded-2xl shadow-2xl animate-fade-in"
          style={{ top: Math.min(hoveredImage.y - 200, window.innerHeight - 300), left: Math.min(hoveredImage.x + 20, window.innerWidth - 220) }}
        >
          <img 
            src={hoveredImage.url} 
            alt="Aperçu carte" 
            className="w-44 h-auto rounded-xl object-contain shadow-md"
          />
        </div>
      )}

      {selectedSellerIdForStore && (
        <UserStoreModal 
          sellerId={selectedSellerIdForStore} 
          onClose={() => setSelectedSellerIdForStore(null)} 
          onSelectListing={(item) => {
            console.log("Annonce sélectionnée depuis la modale :", item);
          }}
        />
      )}
    </div>
  );
}