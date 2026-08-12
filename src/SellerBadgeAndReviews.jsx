import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';

export default function SellerBadgeAndReviews({ sellerId, favoriteSellers, toggleFavoriteSeller, totalCards }) {
  const [profile, setProfile] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sellerId) {
      fetchSellerData();
    } else {
      setLoading(false);
    }
  }, [sellerId]);

  const [selectedReview, setSelectedReview] = useState(null);
  const fetchSellerData = async () => {
    if (!sellerId) return;
    setLoading(true);
    try {
      const [profileRes, reviewsRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('id', sellerId)
          .maybeSingle(), // Évite l'erreur 406 si le profil n'existe pas encore
        
        supabase
          .from('ratings')
          .select('*, buyer:profiles!ratings_buyer_id_fkey(username)')
          .eq('seller_id', sellerId),
      ]);

      if (profileRes.data) {
        setProfile(profileRes.data);
      }

      if (reviewsRes.data && reviewsRes.data.length > 0) {
        setReviews(reviewsRes.data);
        const total = reviewsRes.data.reduce((acc, curr) => acc + (curr.rating || 0), 0);
        setAverageRating((total / reviewsRes.data.length).toFixed(1));
      } else {
        setReviews([]);
        setAverageRating(0);
      }

    } catch (err) {
      console.error("Erreur lors de la récupération des données du vendeur :", err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex items-center justify-center py-12">
        <div className="text-xs font-semibold text-slate-400 animate-pulse">Chargement du profil...</div>
      </div>
    );
  }

  const sellerName = profile?.username;
  const isFav = favoriteSellers?.includes(sellerId);
  const currentCards = totalCards !== undefined ? totalCards : 0;
  const isBadgeRocheUnlocked = currentCards >= 5;

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-6">
      
      {/* En-tête avec Avatar et Cadre RPG dynamique du Badge Roche */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pb-4 border-b border-slate-100">
        
        {/* --- CADRE RPG & PHOTO DE PROFIL --- */}
        <div className="relative inline-block shrink-0">
          {profile?.avatar_url ? (
            <img 
              src={profile.avatar_url} 
              alt={sellerName || 'Vendeur'} 
              className="w-20 h-20 rounded-full object-cover border-2 border-emerald-400 shadow-inner"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 text-white font-black text-2xl flex items-center justify-center shadow-inner uppercase">
              {sellerName ? sellerName.charAt(0) : 'V'}
            </div>
          )}

          {/* Cadre lumineux activé si le Badge Roche est débloqué */}
          <div className={`absolute inset-0 rounded-full border-4 pointer-events-none transition-all ${
            isBadgeRocheUnlocked 
              ? 'border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.6)]' 
              : 'border-slate-300 opacity-50'
          }`}></div>

          {/* Petit badge incrusté dans le coin si débloqué */}
          {isBadgeRocheUnlocked && (
            <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-emerald-500 to-teal-400 text-white font-black text-[10px] px-2 py-0.5 rounded-full border-2 border-white shadow-md flex items-center gap-0.5">
              <span>💎</span>
              <span>Roche</span>
            </div>
          )}
        </div>
        {/* ---------------------------------- */}

        <div className="flex-1 text-center sm:text-left space-y-2 w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
              <h3 className="text-xl font-black text-slate-800">
                {sellerName || 'Vendeur'}
              </h3>
              
              {/* Statut dynamique selon la double authentification / certification */}
              {profile?.mfa_enabled || profile?.is_certified ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-cyan-400 text-sm">🛡️</span>
                  <span className="text-xs font-bold text-cyan-400">
                    Profil Vérifié & Certifié
                  </span>
                </div>
              ) : (
                <span className="bg-sky-50 text-sky-600 border border-sky-200 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                  ✓ Vendeur vérifié
                </span>
              )}

              {sellerId && toggleFavoriteSeller && (
                <button
                  onClick={() => toggleFavoriteSeller(sellerId)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm ${
                    isFav
                      ? 'bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  {isFav ? '❤️ Favori' : '🤍 Suivre'}
                </button>
              )}
            </div>

            <div className="flex items-center justify-center gap-1.5 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-2xl self-center sm:self-auto">
              <span className="text-amber-500 font-black">★</span>
              <span className="font-bold text-slate-800 text-sm">{averageRating}</span>
              <span className="text-xs text-slate-400">({reviews.length} avis)</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1 text-xs text-slate-500 font-medium">
            <span className="bg-slate-100 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
              📅 Membre depuis le {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : 'récemment'}
            </span>
            <span className="bg-slate-100 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
            </span>📦 {currentCards} cartes enregistrées
          </div>
        </div>

      </div>

      {/* Liste des avis récents */}
      <div className="pt-2">
        <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">
          Avis de la communauté (clique sur un avis pour le lire en entier)
        </h4>
        <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
          {reviews.length > 0 ? (
            reviews.map((rev) => (
              <div 
                key={rev.id} 
                onClick={() => setSelectedReview(rev)}
                className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all cursor-pointer shadow-xs"
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-xs text-slate-700">{rev.buyer?.username || 'Acheteur'}</span>
                  <div className="text-amber-500 text-xs font-bold">
                    {'★'.repeat(rev.rating)}{'☆'.repeat(5 - rev.rating)}
                  </div>
                </div>
                <p className="text-xs text-slate-600 font-medium line-clamp-2">
                  {rev.comment && rev.comment !== 'EMPTY' ? rev.comment : <span className="italic text-slate-400">Aucun commentaire écrit</span>}
                </p>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-400 italic">Aucun avis reçu pour l'instant.</p>
          )}
        </div>
      </div>

      {/* --- MODALE DE DÉTAIL D'UN AVIS --- */}
      {selectedReview && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative space-y-4">
            <button 
              onClick={() => setSelectedReview(null)} 
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
            >
              ✕
            </button>

            <h3 className="text-lg font-black text-slate-800">Détails de l'avis</h3>

            <div className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl">
              <span className="font-bold text-xs text-slate-700">Acheteur : {selectedReview.buyer?.username || 'Anonyme'}</span>
              <div className="text-amber-500 font-bold text-sm">
                {'★'.repeat(selectedReview.rating)}{'☆'.repeat(5 - selectedReview.rating)} ({selectedReview.rating}/5)
              </div>
            </div>

            {/* Sous-critères si enregistrés */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-slate-50 p-2 rounded-xl">
                <span className="block text-slate-400 text-[10px]">Communication</span>
                <span className="font-bold text-slate-700">{selectedReview.communication || '-'}/5</span>
              </div>
              <div className="bg-slate-50 p-2 rounded-xl">
                <span className="block text-slate-400 text-[10px]">Description</span>
                <span className="font-bold text-slate-700">{selectedReview.description_match || '-'}/5</span>
              </div>
              <div className="bg-slate-50 p-2 rounded-xl">
                <span className="block text-slate-400 text-[10px]">Colis</span>
                <span className="font-bold text-slate-700">{selectedReview.package_quality || '-'}/5</span>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Commentaire :</span>
              <p className="text-sm text-slate-700 font-medium whitespace-pre-wrap">
                {selectedReview.comment && selectedReview.comment !== 'EMPTY' ? selectedReview.comment : "Aucun commentaire écrit pour cet avis."}
              </p>
            </div>

            <button 
              onClick={() => setSelectedReview(null)}
              className="w-full bg-slate-900 text-white font-bold py-2.5 rounded-xl text-xs hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

    </div>
  );
}