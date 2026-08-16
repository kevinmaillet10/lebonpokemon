import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { leagueSteps as baseLeagueSteps } from './constants/kantoLeague';

export default function KantoLeagueTab({ totalCards = 0, user }) {
  const userId = user?.id || 'guest';

  // 1. Chargement des badges débloqués
  const [permanentlyUnlocked, setPermanentlyUnlocked] = useState(() => {
    const saved = localStorage.getItem(`kanto_unlocked_badges_${userId}`);
    return saved ? JSON.parse(saved) : [];
  });

  // 2. Compteur de la ligue
  const [leagueCardCount, setLeagueCardCount] = useState(() => {
    const saved = localStorage.getItem(`kanto_league_count_${userId}`);
    return saved !== null ? parseInt(saved, 10) : totalCards;
  });

  // 3. Références de suivi
  const [prevStockCount, setPrevStockCount] = useState(() => {
    const savedPrev = localStorage.getItem(`kanto_prev_stock_${userId}`);
    return savedPrev !== null ? parseInt(savedPrev, 10) : null;
  });

  // 4. État pour la modale d'animation de déblocage de badge
  const [unlockedBadgeModal, setUnlockedBadgeModal] = useState(null);

  useEffect(() => {
    async function syncListings() {
      if (!user?.id) {
        processCardUpdate(totalCards);
        return;
      }
      
      let totalFromSupabase = 0;
      const { data: dataSeller, error: errSeller } = await supabase
        .from('listings')
        .select('quantity')
        .eq('seller_id', user.id);

      if (!errSeller && dataSeller && dataSeller.length > 0) {
        totalFromSupabase = dataSeller.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);
      } else {
        const { data: dataUser, error: errUser } = await supabase
          .from('listings')
          .select('quantity')
          .eq('user_id', user.id);

        if (!errUser && dataUser) {
          totalFromSupabase = dataUser.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);
        }
      }

      const currentActualStock = totalFromSupabase > 0 ? totalFromSupabase : totalCards;
      processCardUpdate(currentActualStock);
    }

    syncListings();
  }, [totalCards, user, userId]);

  function processCardUpdate(newStock) {
    const savedPrev = localStorage.getItem(`kanto_prev_stock_${userId}`);
    const savedLastProcessed = localStorage.getItem(`kanto_last_processed_${userId}`);

    if (savedPrev === null) {
      setLeagueCardCount(newStock);
      setPrevStockCount(newStock);
      localStorage.setItem(`kanto_league_count_${userId}`, newStock.toString());
      localStorage.setItem(`kanto_prev_stock_${userId}`, newStock.toString());
      localStorage.setItem(`kanto_last_processed_${userId}`, newStock.toString());
      return;
    }

    const prevStock = parseInt(savedPrev, 10);
    const lastProcessed = savedLastProcessed !== null ? parseInt(savedLastProcessed, 10) : prevStock;

    if (newStock === lastProcessed) return;

    if (newStock > prevStock) {
      const diff = newStock - prevStock;
      setLeagueCardCount(prev => {
        const newCount = prev + diff;
        localStorage.setItem(`kanto_league_count_${userId}`, newCount.toString());
        return newCount;
      });
    }

    setPrevStockCount(newStock);
    localStorage.setItem(`kanto_prev_stock_${userId}`, newStock.toString());
    localStorage.setItem(`kanto_last_processed_${userId}`, newStock.toString());
  }

  // Association des valeurs dynamiques aux étapes importées
  const leagueSteps = baseLeagueSteps.map(step => {
    let currentVal = 0;
    if (step.id === 'roche' || step.id === 'cascade' || step.id === 'ame' || step.id === 'terre' || step.id === 'maitre-kanto') {
      currentVal = leagueCardCount;
    }
    return {
      ...step,
      current: currentVal,
    };
  });

  // Détection des nouveaux unlocks pour déclencher l'animation de la modale
  useEffect(() => {
    let updated = [...permanentlyUnlocked];
    let hasChanged = false;
    let newlyUnlocked = null;

    leagueSteps.forEach(step => {
      if (step.current >= step.target && !updated.includes(step.id)) {
        updated.push(step.id);
        hasChanged = true;
        newlyUnlocked = step;
      }
    });

    if (hasChanged) {
      setPermanentlyUnlocked(updated);
      localStorage.setItem(`kanto_unlocked_badges_${userId}`, JSON.stringify(updated));
      
      if (newlyUnlocked) {
        setUnlockedBadgeModal(newlyUnlocked);
      }
    }
  }, [leagueCardCount, userId]);

  const unlockedCount = leagueSteps.filter(step => permanentlyUnlocked.includes(step.id) || step.current >= step.target).length;
  const globalPercentage = Math.round((unlockedCount / leagueSteps.length) * 100);

  const BadgeIcon = ({ step }) => {
    const [hasError, setHasError] = useState(false);
    if (hasError || !step.icon) {
      return (
        <span className="text-[10px] font-black text-center px-1 text-slate-600">
          {step.title.replace('Badge ', '').replace('Conseil 4 - ', '')}
        </span>
      );
    }
    return (
      <img src={step.icon} alt={step.title} onError={() => setHasError(true)} className="w-full h-full object-contain drop-shadow" />
    );
  };

  const renderStepsGrid = (stepsArray) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {stepsArray.map((step) => {
        const isUnlocked = permanentlyUnlocked.includes(step.id) || step.current >= step.target;
        const displayCurrent = Math.min(step.current, step.target);
        const stepPercentage = Math.min(Math.round((step.current / step.target) * 100), 100);

        return (
          <div key={step.id} className={`bg-white rounded-2xl p-5 border transition-all shadow-sm flex flex-col justify-between gap-4 ${isUnlocked ? 'border-amber-300 bg-amber-50/20' : 'border-slate-200 opacity-90'}`}>
            <div className="flex items-start gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border overflow-hidden p-1 ${isUnlocked ? 'bg-amber-100 border-amber-300 shadow-sm' : 'bg-slate-100 border-slate-200 grayscale opacity-60'}`}>
                <BadgeIcon step={step} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-black text-slate-900 truncate">{step.title}</h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isUnlocked ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {isUnlocked ? 'Débloqué' : `${displayCurrent} / ${step.target}`}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{step.description}</p>
              </div>
            </div>
            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <div className="flex justify-between items-center text-[11px] font-semibold text-slate-600">
                <span>Progression de l'étape</span>
                <span>{stepPercentage}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-300 ${isUnlocked ? 'bg-emerald-500' : 'bg-orange-500'}`} style={{ width: `${stepPercentage}%` }}></div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8 relative">
      {/* Modale de déblocage de badge */}
      {unlockedBadgeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl border border-amber-200">
            <div className="w-20 h-20 mx-auto bg-amber-100 rounded-2xl flex items-center justify-center p-2 border border-amber-300 shadow-inner">
              <img src={unlockedBadgeModal.icon} alt={unlockedBadgeModal.title} className="w-full h-full object-contain drop-shadow-md" />
            </div>
            <div>
              <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Nouvelle Étape Franchie !</span>
              <h3 className="text-xl font-black text-slate-900 mt-1">{unlockedBadgeModal.title}</h3>
              <p className="text-xs text-slate-500 mt-1">{unlockedBadgeModal.description}</p>
            </div>
            <button
              onClick={() => setUnlockedBadgeModal(null)}
              className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-600 text-white font-bold rounded-xl shadow-lg hover:opacity-90 transition-all"
            >
              Continuer l'aventure ⚡
            </button>
          </div>
        </div>
      )}

      <div className="bg-gradient-to-r from-orange-500 to-amber-600 rounded-3xl p-8 text-white shadow-sm flex flex-col sm:flex-row justify-between items-center gap-6">
        <div>
          <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Progression Officielle</span>
          <h2 className="text-2xl sm:text-3xl font-black mt-2">Ligue Pokémon — Région de Kanto ⚡</h2>
          <p className="text-orange-100 text-sm mt-1">Progressez à travers les arènes, affrontez le Conseil des 4 et devenez Maître de Kanto.</p>
        </div>
        <div className="bg-white/10 border border-white/20 rounded-2xl p-4 text-center min-w-[140px]">
          <span className="text-3xl font-black block">{unlockedCount} / {leagueSteps.length}</span>
          <span className="text-xs font-bold text-orange-200 uppercase tracking-wider">Étapes validées</span>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-2">
        <div className="flex justify-between items-center text-xs font-bold text-slate-700">
          <span>Avancement global de la Ligue</span>
          <span>{globalPercentage}%</span>
        </div>
        <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
          <div className="bg-orange-500 h-full rounded-full transition-all duration-500" style={{ width: `${globalPercentage}%` }}></div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-orange-500"></span>
          <h3 className="text-lg font-black text-slate-900">1. Les 8 Badges d'Arène</h3>
        </div>
        {renderStepsGrid(leagueSteps.filter(s => s.category === 'badges'))}
      </div>

      <div className="space-y-4 pt-4">
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-amber-500"></span>
          <h3 className="text-lg font-black text-slate-900">2. Le Conseil des 4</h3>
        </div>
        {renderStepsGrid(leagueSteps.filter(s => s.category === 'elite4'))}
      </div>

      <div className="space-y-4 pt-4">
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
          <h3 className="text-lg font-black text-slate-900">3. Le Maître de la Ligue</h3>
        </div>
        {renderStepsGrid(leagueSteps.filter(s => s.category === 'champion'))}
      </div>
    </div>
  );
}