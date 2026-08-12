import React, { useState, useEffect } from 'react';

// Import de tous les badges et du trophée depuis ton dossier assets
import rocheImg from './assets/badges/roche.png';
import cascadeImg from './assets/badges/cascade.png';
import foudreImg from './assets/badges/foudre.png';
import prismeImg from './assets/badges/prisme.png';
import ameImg from './assets/badges/âme.png';
import maraisImg from './assets/badges/marais.png';
import volcanImg from './assets/badges/volcan.png';
import terreImg from './assets/badges/terre.png';
import olgaImg from './assets/badges/Olga.png';
import aldoImg from './assets/badges/Aldo.png';
import agathaImg from './assets/badges/Agatha.png';
import peterImg from './assets/badges/Peter.png';
import championImg from './assets/badges/champion.png'; 

export default function KantoLeagueTab({ totalCards = 0, user }) {
  // Récupération sécurisée de l'ID utilisateur pour éviter les conflits entre comptes
  const userId = user?.id || 'guest';

  // 1. On charge les badges déjà débloqués liés à cet utilisateur spécifique
  const [permanentlyUnlocked, setPermanentlyUnlocked] = useState(() => {
    const saved = localStorage.getItem(`kanto_unlocked_badges_${userId}`);
    return saved ? JSON.parse(saved) : [];
  });

  // 2. On gère un record historique permanent lié à cet utilisateur
  const [maxCardsReached, setMaxCardsReached] = useState(() => {
    const savedMax = localStorage.getItem(`kanto_max_cards_${userId}`);
    const parsedMax = savedMax ? parseInt(savedMax, 10) : 0;
    
    // Sécurité : si des badges sont déjà validés, le max ne peut pas être inférieur à leur cible
    const targetsMap = {
      'roche': 20,
      'cascade': 200,
      'ame': 700,
      'terre': 1200,
      'maitre-kanto': 5000
    };
    
    let minFromUnlocked = 0;
    permanentlyUnlocked.forEach(id => {
      if (targetsMap[id] && targetsMap[id] > minFromUnlocked) {
        minFromUnlocked = targetsMap[id];
      }
    });

    const finalMax = Math.max(parsedMax, totalCards, minFromUnlocked);
    localStorage.setItem(`kanto_max_cards_${userId}`, finalMax.toString());
    return finalMax;
  });

  // 3. Dès que totalCards augmente, on met à jour le record historique de l'utilisateur
  useEffect(() => {
    if (totalCards > maxCardsReached) {
      setMaxCardsReached(totalCards);
      localStorage.setItem(`kanto_max_cards_${userId}`, totalCards.toString());
    }
  }, [totalCards, maxCardsReached, userId]);;

  const leagueSteps = [
    // --- CATEGORIE 1 : LES 8 BADGES D'ARÈNE ---
    {
      id: 'roche',
      category: 'badges',
      title: 'Badge Roche',
      description: 'Enregistrer ses 20 premières cartes.',
      target: 20,
      current: maxCardsReached,
      icon: rocheImg,
    },
    {
      id: 'cascade',
      category: 'badges',
      title: 'Badge Cascade',
      description: 'Atteindre 200 cartes enregistrées.',
      target: 200,
      current: maxCardsReached,
      icon: cascadeImg,
    },
    {
      id: 'foudre',
      category: 'badges',
      title: 'Badge Foudre',
      description: 'Utiliser les filtres de tri ou organiser ses doublons par versions (Standard / Reverse).',
      target: 1,
      current: 0,
      icon: foudreImg,
    },
    {
      id: 'prisme',
      category: 'badges',
      title: 'Badge Prisme',
      description: "Mettre à jour les données Cardmarket ou consulter l'historique des prix d'une carte.",
      target: 1,
      current: 0,
      icon: prismeImg,
    },
    {
      id: 'ame',
      category: 'badges',
      title: 'Badge Âme',
      description: 'Atteindre le palier de 700 cartes enregistrées.',
      target: 700,
      current: maxCardsReached,
      icon: ameImg,
    },
    {
      id: 'marais',
      category: 'badges',
      title: 'Badge Marais',
      description: 'Classer et organiser un volume important de cartes par séries.',
      target: 100,
      current: 0,
      icon: maraisImg,
    },
    {
      id: 'volcan',
      category: 'badges',
      title: 'Badge Volcan',
      description: 'Analyser et comparer les fluctuations de prix sur 30 jours de 10 cartes différentes.',
      target: 10,
      current: 0,
      icon: volcanImg,
    },
    {
      id: 'terre',
      category: 'badges',
      title: 'Badge Terre',
      description: 'Atteindre et enregistrer 1200 cartes.',
      target: 1200,
      current: maxCardsReached,
      icon: terreImg,
    },

    // --- CATEGORIE 2 : LE CONSEIL DES 4 ---
    {
      id: 'conseil-olga',
      category: 'elite4',
      title: 'Conseil 4 - Olga',
      description: 'Réaliser un suivi régulier des prix du marché pour optimiser ses fiches de vente.',
      target: 1,
      current: 0,
      icon: olgaImg,
    },
    {
      id: 'conseil-aldo',
      category: 'elite4',
      title: 'Conseil 4 - Aldo',
      description: 'Maître du tri de masse — Avoir trié et catalogué avec succès plus de 100 doublons de cartes du bloc Écarlate et Violet.',
      target: 100,
      current: 0,
      icon: aldoImg,
    },
    {
      id: 'conseil-agatha',
      category: 'elite4',
      title: 'Conseil 4 - Agatha',
      description: "Maître des Flux de Données — Assurer la synchronisation et le bon paramétrage des historiques de prix.",
      target: 1,
      current: 0,
      icon: agathaImg,
    },
    {
      id: 'conseil-peter',
      category: 'elite4',
      title: 'Conseil 4 - Peter',
      description: 'Maintenir une base de données parfaitement à jour avec un suivi rigoureux Standard / Reverse sur un très large volume.',
      target: 1,
      current: 0,
      icon: peterImg,
    },

    // --- CATEGORIE 3 : LE MAÎTRE DE LA LIGUE ---
    {
      id: 'maitre-kanto',
      category: 'champion',
      title: 'Maître de la Région de Kanto',
      description: "L'accomplissement suprême : décrocher tous les badges, vaincre le Conseil et franchir 5000 cartes enregistrées.",
      target: 5000,
      current: maxCardsReached,
      icon: championImg,
    },
  ];

  // 4. Dès que le max historique change, on vérifie si de nouveaux badges sont atteints et on les verrouille pour toujours
  useEffect(() => {
    let updated = [...permanentlyUnlocked];
    let hasChanged = false;

    leagueSteps.forEach(step => {
      if (step.current >= step.target && !updated.includes(step.id)) {
        updated.push(step.id);
        hasChanged = true;
      }
    });

    if (hasChanged) {
      setPermanentlyUnlocked(updated);
      localStorage.setItem('kanto_unlocked_badges', JSON.stringify(updated));
    }
  }, [maxCardsReached]);

  const unlockedCount = leagueSteps.filter(step => permanentlyUnlocked.includes(step.id) || step.current >= step.target).length;
  const globalPercentage = Math.round((unlockedCount / leagueSteps.length) * 100);

  // Composant interne pour sécuriser le chargement de chaque icône
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
      <img 
        src={step.icon} 
        alt={step.title} 
        onError={() => setHasError(true)}
        className="w-full h-full object-contain drop-shadow" 
      />
    );
  };

  // Fonction de rendu d'une grille pour éviter de répéter le code HTML
  const renderStepsGrid = (stepsArray) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {stepsArray.map((step) => {
        const isUnlocked = permanentlyUnlocked.includes(step.id) || step.current >= step.target;
        const displayCurrent = Math.min(step.current, step.target);
        const stepPercentage = Math.min(Math.round((step.current / step.target) * 100), 100);

        return (
          <div 
            key={step.id} 
            className={`bg-white rounded-2xl p-5 border transition-all shadow-sm flex flex-col justify-between gap-4 ${
              isUnlocked ? 'border-amber-300 bg-amber-50/20' : 'border-slate-200 opacity-90'
            }`}
          >
            <div className="flex items-start gap-4">
              {/* Icône du Badge */}
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border overflow-hidden p-1 ${
                isUnlocked ? 'bg-amber-100 border-amber-300 shadow-sm' : 'bg-slate-100 border-slate-200 grayscale opacity-60'
              }`}>
                <BadgeIcon step={step} />
              </div>

              {/* Informations de l'étape */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-black text-slate-900 truncate">{step.title}</h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isUnlocked ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {isUnlocked ? 'Débloqué' : `${displayCurrent} / ${step.target}`}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{step.description}</p>
              </div>
            </div>

            {/* Barre de progression individuelle */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <div className="flex justify-between items-center text-[11px] font-semibold text-slate-600">
                <span>Progression de l'étape</span>
                <span>{stepPercentage}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-300 ${
                    isUnlocked ? 'bg-emerald-500' : 'bg-orange-500'
                  }`} 
                  style={{ width: `${stepPercentage}%` }}
                ></div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* En-tête de la Ligue */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-600 rounded-3xl p-8 text-white shadow-sm flex flex-col sm:flex-row justify-between items-center gap-6">
        <div>
          <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
            Progression Officielle
          </span>
          <h2 className="text-2xl sm:text-3xl font-black mt-2">Ligue Pokémon — Région de Kanto ⚡</h2>
          <p className="text-orange-100 text-sm mt-1">
            Progressez à travers les arènes, affrontez le Conseil des 4 et devenez Maître de Kanto.
          </p>
        </div>
        <div className="bg-white/10 border border-white/20 rounded-2xl p-4 text-center min-w-[140px]">
          <span className="text-3xl font-black block">{unlockedCount} / {leagueSteps.length}</span>
          <span className="text-xs font-bold text-orange-200 uppercase tracking-wider">Étapes validées</span>
        </div>
      </div>

      {/* Barre de progression globale */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-2">
        <div className="flex justify-between items-center text-xs font-bold text-slate-700">
          <span>Avancement global de la Ligue</span>
          <span>{globalPercentage}%</span>
        </div>
        <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
          <div 
            className="bg-orange-500 h-full rounded-full transition-all duration-500" 
            style={{ width: `${globalPercentage}%` }}
          ></div>
        </div>
      </div>

      {/* SECTION 1 : LES 8 BADGES D'ARÈNE */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-orange-500"></span>
          <h3 className="text-lg font-black text-slate-900">1. Les 8 Badges d'Arène</h3>
        </div>
        {renderStepsGrid(leagueSteps.filter(s => s.category === 'badges'))}
      </div>

      {/* SECTION 2 : LE CONSEIL DES 4 */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-amber-500"></span>
          <h3 className="text-lg font-black text-slate-900">2. Le Conseil des 4</h3>
        </div>
        {renderStepsGrid(leagueSteps.filter(s => s.category === 'elite4'))}
      </div>

      {/* SECTION 3 : LE MAÎTRE DE LA LIGUE */}
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