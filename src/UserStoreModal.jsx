import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import SellerProfile from './SellerProfile';

export default function UserStoreModal({ sellerId, listings: initialListings = [], onClose, onSelectListing }) {
  const [activeTab, setActiveTab] = useState('profile'); // 'profile', 'store' ou 'inbox'
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [listings, setListings] = useState(initialListings);

  // Charger les annonces du vendeur si elles ne sont pas passées en prop ou si le tableau est vide
  useEffect(() => {
    if (initialListings && initialListings.length > 0) {
      setListings(initialListings);
    } else if (sellerId) {
      fetchSellerListings();
    }
  }, [sellerId, initialListings]);

  async function fetchSellerListings() {
    try {
      // On teste les différentes colonnes possibles pour lier l'annonce au vendeur
      let { data, error } = await supabase
        .from('listings')
        .select('*, cards(*)')
        .eq('seller_id', sellerId);

      if (!error && data && data.length > 0) {
        setListings(data);
        return;
      }

      let { data: dataAlt, error: errorAlt } = await supabase
        .from('listings')
        .select('*, cards(*)')
        .eq('user_id', sellerId);

      if (!errorAlt && dataAlt && dataAlt.length > 0) {
        setListings(dataAlt);
        return;
      }

      let { data: dataProfile, error: errorProfile } = await supabase
        .from('listings')
        .select('*, cards(*)')
        .eq('profile_id', sellerId);

      if (!errorProfile && dataProfile) {
        setListings(dataProfile);
      }
    } catch (err) {
      console.error("Erreur lors du chargement des annonces du vendeur :", err);
    }
  }

  // Regroupement et tri automatique par Bloc puis par Série basés sur les listings récupérés
  const groupedListings = listings.reduce((acc, item) => {
    const block = item.cards?.block || item.block || 'Autres / Divers';
    const series = item.cards?.series || item.series || 'Série non classée';

    if (!acc[block]) acc[block] = {};
    if (!acc[block][series]) acc[block][series] = [];
    
    acc[block][series].push(item);
    return acc;
  }, {});

  // Fonction appelée quand on clique sur "Envoyer un message" depuis une annonce
  const handleOpenInboxWithConversation = async (listingId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("Vous devez être connecté pour envoyer un message.");
        return;
      }

      // 1. Récupérer le vendeur (user_id) de l'annonce
      const { data: listingData, error: listingError } = await supabase
        .from('listings')
        .select('user_id')
        .eq('id', listingId)
        .single();

      if (listingError || !listingData) {
        console.error("Erreur récupération annonce :", listingError);
        return;
      }

      const targetSellerId = listingData.user_id;

      // Optionnel : Empêcher de s'écrire à soi-même
      if (targetSellerId === user.id) {
        alert("Vous ne pouvez pas vous envoyer un message à vous-même.");
        return;
      }

      // 2. Vérifier si une conversation existe déjà pour ce listing entre l'acheteur et le vendeur
      const { data: existingConvs, error: convError } = await supabase
        .from('conversations')
        .select('id')
        .eq('listing_id', listingId)
        .eq('buyer_id', user.id)
        .eq('seller_id', targetSellerId);

      if (convError) throw convError;

      let targetConvId;

      if (existingConvs && existingConvs.length > 0) {
        // La conversation existe déjà
        targetConvId = existingConvs[0].id;
      } else {
        // 3. Sinon, on crée la ligne dans la table conversations
        const { data: newConv, error: createError } = await supabase
          .from('conversations')
          .insert([
            {
              listing_id: listingId,
              buyer_id: user.id,
              seller_id: targetSellerId
            }
          ])
          .select('id')
          .single();

        if (createError) throw createError;
        targetConvId = newConv.id;
      }

      // 4. Mettre à jour l'état pour basculer vers l'InboxView en sélectionnant cette conversation
      setActiveConversationId(targetConvId);
      setActiveTab('inbox');

    } catch (err) {
      console.error("Erreur lors de l'ouverture de la conversation :", err);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Navigation par onglets */}
        <div className="flex justify-between items-center border-b border-slate-100 pb-4">
          <div className="flex gap-2">
            <button 
              onClick={() => setActiveTab('profile')}
              className={`px-4 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                activeTab === 'profile' 
                  ? 'bg-indigo-600 text-white shadow-sm' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Profil & Avis
            </button>
            <button 
              onClick={() => setActiveTab('store')}
              className={`px-4 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'store' 
                  ? 'bg-indigo-600 text-white shadow-sm' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>🛍️ Boutique du vendeur</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'store' ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-700'}`}>
                {listings.length}
              </span>
            </button>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold text-lg p-2 cursor-pointer">✕</button>
        </div>

        {/* Onglet 1 : Profil, Badges et Avis */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            <SellerProfile sellerId={sellerId} totalCards={listings.length} />
            
            {listings.length > 0 && (
              <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-indigo-900 text-xs">Ce vendeur propose d'autres cartes !</h4>
                  <p className="text-[11px] text-indigo-700">Découvrez l'intégralité de son stock classé par séries.</p>
                </div>
                <button 
                  onClick={() => setActiveTab('store')}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-colors cursor-pointer shadow-sm"
                >
                  Voir mes autres cartes à vendre &rarr;
                </button>
              </div>
            )}
          </div>
        )}

        {/* Onglet 2 : Boutique triée par Blocs et Séries */}
        {activeTab === 'store' && (
          <div className="space-y-6">
            {Object.keys(groupedListings).length > 0 ? (
              Object.entries(groupedListings).map(([blockName, seriesMap]) => (
                <div key={blockName} className="space-y-4">
                  <div className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider shadow-sm">
                    📦 Bloc : {blockName}
                  </div>

                  {Object.entries(seriesMap).map(([seriesName, items]) => (
                    <div key={seriesName} className="pl-2 space-y-3">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide border-b border-slate-100 pb-1 flex items-center justify-between">
                        <span>✨ Série : {seriesName}</span>
                        <span className="text-[11px] font-normal text-slate-400">({items.length} carte{items.length > 1 ? 's' : ''})</span>
                      </h4>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {items.map((item) => {
                          const cardName = item.cards?.name || item.title || 'Carte';
                          let imageUrl = 'https://via.placeholder.com/300x400?text=Pas+d%27image';
                          try {
                            if (item.image_url) {
                              const parsed = typeof item.image_url === 'string' ? JSON.parse(item.image_url) : item.image_url;
                              imageUrl = Array.isArray(parsed) ? parsed[0] : parsed;
                            } else if (item.cards?.image_url) {
                              imageUrl = Array.isArray(item.cards.image_url) ? item.cards.image_url[0] : item.cards.image_url;
                            }
                          } catch (e) {
                            imageUrl = item.image_url || imageUrl;
                          }

                          return (
                            <div 
                              key={item.id} 
                              onClick={() => {
                                onClose();
                                if (onSelectListing) onSelectListing(item);
                              }}
                              className="bg-slate-50 border border-slate-200 rounded-2xl p-3 cursor-pointer hover:shadow-md hover:border-indigo-300 transition-all flex flex-col justify-between"
                            >
                              <img src={imageUrl} alt={cardName} className="h-36 object-contain mx-auto mb-2 rounded-lg" />
                              <div>
                                <h5 className="font-bold text-xs text-slate-800 truncate">{cardName}</h5>
                                <div className="flex justify-between items-center mt-2">
                                  <span className="text-indigo-600 font-black text-sm">{item.price} €</span>
                                  <span className="text-[10px] text-slate-400 font-medium">{item.condition || 'N/C'}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 italic text-center py-8">Ce vendeur n'a aucune autre carte en vente pour le moment.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}