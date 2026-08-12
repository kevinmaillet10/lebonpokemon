import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import SellerBadgeAndReviews from './SellerBadgeAndReviews';
import KantoLeagueTab from './KantoLeagueTab';
import BadgeUnlockModal from './BadgeUnlockModal';

export default function SellerProfile({ sellerId, favoriteSellers, toggleFavoriteSeller, totalCards: propTotalCards }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [fetchedCards, setFetchedCards] = useState(0);
  const [sellerInfo, setSellerInfo] = useState(null);
  
  // État pour gérer la pop-up de déblocage de badge
  const [unlockedBadge, setUnlockedBadge] = useState(null);

  // Utilise la prop si elle existe, sinon utilise le résultat des requêtes de secours
const totalCards = (propTotalCards !== undefined && propTotalCards > 0) ? propTotalCards : fetchedCards;
  useEffect(() => {
    if (sellerId) {
      if (!propTotalCards || propTotalCards === 0) {
        fetchUserCardCount();
      }
      fetchSellerDetails();
    }
  }, [sellerId, propTotalCards]);

  // Récupérer les informations du vendeur (dont le statut MFA)
  async function fetchSellerDetails() {
    if (!sellerId) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', sellerId)
        .maybeSingle();

      if (!error && data) {
        setSellerInfo(data);
      }
    } catch (err) {
      console.error("Erreur chargement profil vendeur :", err);
    }
  }

  // Fonction pour vérifier et attribuer les badges selon le nombre de cartes
  const checkAndUnlockBadges = async (count) => {
    try {
      if (count >= 200) {
        const badgeName = "Badge Cascade";

        const { data: existingBadge, error: fetchError } = await supabase
          .from('user_badges')
          .select('*')
          .eq('user_id', sellerId)
          .eq('badge_name', badgeName)
          .maybeSingle();

        if (!existingBadge && !fetchError) {
          await supabase.from('user_badges').insert([
            { user_id: sellerId, badge_name: badgeName, unlocked_at: new Date() }
          ]);

          setUnlockedBadge({
            name: badgeName,
            description: "Tu as atteint 200 cartes enregistrées ! Maître de l'eau.",
            icon_url: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png"
          });
        }
      }
    } catch (err) {
      console.error("Erreur lors de la vérification du badge:", err);
    }
  };

  const fetchUserCardCount = async () => {
    try {
      // 1. Test avec seller_id
      let { count, error } = await supabase
        .from('listings')
        .select('*', { count: 'exact', head: true })
        .eq('seller_id', sellerId);
      
      if (!error && count !== null && count > 0) {
        setFetchedCards(count);
        checkAndUnlockBadges(count);
        return;
      }

      // 2. Test alternatif avec user_id
      let { count: countAlt, error: errorAlt } = await supabase
        .from('listings')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', sellerId);

      if (!errorAlt && countAlt !== null && countAlt > 0) {
        setFetchedCards(countAlt);
        checkAndUnlockBadges(countAlt);
        return;
      }

      // 3. Dernier test alternatif (ex: profile_id si applicable)
      let { count: countProfile, error: errorProfile } = await supabase
        .from('listings')
        .select('*', { count: 'exact', head: true })
        .eq('profile_id', sellerId);

      if (!errorProfile && countProfile !== null && countProfile > 0) {
        setFetchedCards(countProfile);
        checkAndUnlockBadges(countProfile);
        return;
      }

      setFetchedCards(0);

    } catch (err) {
      console.error("Erreur inattendue lors du comptage des cartes:", err);
      setFetchedCards(0);
    }
  };

  const isFav = favoriteSellers?.includes(sellerId);

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      
      {/* En-tête du profil avec le badge de certification */}
      <div className="bg-[#1A2331] border border-slate-800 p-6 rounded-2xl flex flex-col sm:flex-row items-center gap-5 text-white shadow-xl">
        <div className="relative">
          <img 
            src={sellerInfo?.avatar_url || "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png"} 
            alt="Avatar" 
            className="w-20 h-20 rounded-full object-cover border-2 border-cyan-400 bg-slate-900 shadow-md"
          />
        </div>

        <div className="flex-1 text-center sm:text-left space-y-1">
          <h2 className="text-xl font-bold text-white">
            {sellerInfo?.username || sellerInfo?.full_name || "Vendeur"}
          </h2>

          <p className="text-xs text-slate-300">
            📦 {totalCards} annonce{totalCards > 1 ? 's' : ''} en ligne
          </p>

          <div>
            {sellerInfo?.mfa_enabled ? (
              <div className="flex items-center justify-center sm:justify-start gap-1.5 mt-1">
                <span className="text-cyan-400 text-sm">🛡️</span>
                <span className="text-xs font-bold text-cyan-400">
                  Profil Vérifié & Certifié
                </span>
              </div>
            ) : (
              <span className="text-xs text-slate-400 font-medium">
                Compte Standard
              </span>
            )}
          </div>
        </div>
      </div>

      {/* En-tête avec les onglets ET le bouton Favori vendeur */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-2xl font-bold text-xs transition-all ${
              activeTab === 'overview'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            👤 Profil & Avis
          </button>

          <button
            onClick={() => setActiveTab('league')}
            className={`px-4 py-2 rounded-2xl font-bold text-xs transition-all flex items-center gap-1.5 ${
              activeTab === 'league'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            ⚡ Ligue Pokémon (Kanto)
          </button>
        </div>

        {sellerId && toggleFavoriteSeller && (
          <button
            onClick={() => toggleFavoriteSeller(sellerId)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer shadow-sm ${
              isFav
                ? 'bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {isFav ? '❤️ Vendeur favori' : '🤍 Ajouter aux favoris'}
          </button>
        )}
      </div>

      {activeTab === 'overview' ? (
        <SellerBadgeAndReviews 
          sellerId={sellerId} 
          favoriteSellers={favoriteSellers} 
          toggleFavoriteSeller={toggleFavoriteSeller} 
          totalCards={totalCards}
        />
      ) : (
        <KantoLeagueTab totalCards={totalCards} />
      )}

      {/* --- Affichage de la Modale de Déblocage des Confettis --- */}
      {unlockedBadge && (
        <BadgeUnlockModal 
          badge={unlockedBadge} 
          onClose={() => setUnlockedBadge(null)} 
        />
      )}

    </div>
  );
}