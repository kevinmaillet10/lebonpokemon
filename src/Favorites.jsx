import React, { useState, useEffect } from 'react';
import { supabase } from './supabase.js';
import SingleListing from './SingleListing';

export default function Favorites({ 
  favoriteListings = [],
  favoriteSellers = [], // Ici, ce sont des IDs de vendeurs (UUID)
  onRemoveFavoriteListing,
  onRemoveFavoriteSeller,
  setSelectedListing,
  onViewSellerProfile
}) {
  const [activeTab, setActiveTab] = useState('listings');
  const [sellerDetails, setSellerDetails] = useState({}); // Dictionnaire { id: { username } }

  // Charger les vrais pseudos (usernames) à partir des IDs stockés en favoris
  useEffect(() => {
    async function fetchSellerProfiles() {
      if (!favoriteSellers || favoriteSellers.length === 0) return;

      const { data, error } = await supabase
        .from('profiles') // Ou ta table de profils/utilisateurs
        .select('id, username')
        .in('id', favoriteSellers);

      if (!error && data) {
        const map = {};
        data.forEach(profile => {
          map[profile.id] = profile.username || 'Vendeur';
        });
        setSellerDetails(map);
      }
    }

    fetchSellerProfiles();
  }, [favoriteSellers]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      
      {/* En-tête du profil / Favoris */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900">❤️ Mes Favoris</h1>
          <p className="text-slate-500 text-sm">Retrouvez rapidement vos cartes coups de cœur et vos vendeurs suivis.</p>
        </div>

        {/* Sous-onglets de bascule (Cartes / Vendeurs) */}
        <div className="flex bg-slate-100 p-1 rounded-2xl w-fit">
          <button
            onClick={() => setActiveTab('listings')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'listings'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Cartes ({favoriteListings.length})
          </button>
          <button
            onClick={() => setActiveTab('sellers')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'sellers'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Vendeurs ({favoriteSellers.length})
          </button>
        </div>
      </div>

      {/* Contenu : Cartes Favorites */}
      {activeTab === 'listings' && (
        <div>
          {favoriteListings.length === 0 ? (
            <div className="text-center py-16 bg-slate-50 rounded-3xl border border-dashed border-slate-200 p-6 space-y-3">
              <span className="text-4xl">🎴</span>
              <p className="text-slate-600 font-medium text-sm">Vous n'avez aucune carte en favori pour le moment.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {favoriteListings.map((item) => (
                <div key={item?.id} className="relative bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
                  <div onClick={() => setSelectedListing(item)} className="cursor-pointer">
                    <SingleListing listing={item} />
                  </div>
                  {/* Bouton pour retirer des favoris */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveFavoriteListing(item.id);
                    }}
                    className="absolute top-3 right-3 bg-white/90 hover:bg-red-50 text-slate-400 hover:text-red-500 p-2 rounded-full shadow-md transition-all cursor-pointer backdrop-blur-sm"
                    title="Retirer des favoris"
                  >
                    ❤️
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Contenu : Vendeurs Favoris */}
      {activeTab === 'sellers' && (
        <div>
          {favoriteSellers.length === 0 ? (
            <div className="text-center py-16 bg-slate-50 rounded-3xl border border-dashed border-slate-200 p-6 space-y-3">
              <span className="text-4xl">👤</span>
              <p className="text-slate-600 font-medium text-sm">Vous ne suivez aucun vendeur pour le moment.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {favoriteSellers.map((sellerId, index) => {
                const username = sellerDetails[sellerId] || "Chargement...";
                return (
                  <div key={index} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 font-bold flex items-center justify-center text-lg uppercase">
                        {username.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900">{username}</h3>
                        <p className="text-xs text-slate-500">Membre de la marketplace</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {/* Bouton Voir : Permet d'ouvrir le profil du vendeur */}
                      <button
                        onClick={() => onViewSellerProfile && onViewSellerProfile(sellerId)}
                        className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold text-xs px-3 py-2 rounded-xl transition-colors cursor-pointer"
                      >
                        Voir
                      </button>
                      <button
                        onClick={() => onRemoveFavoriteSeller(sellerId)}
                        className="bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 p-2 rounded-xl transition-colors cursor-pointer"
                        title="Ne plus suivre"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

    </div>
  );
}