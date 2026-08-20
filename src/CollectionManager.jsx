import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { ArrowLeft, Search, Check, Sparkles } from 'lucide-react';

export default function CollectionManager({ user, onBack }) {
  const [step, setStep] = useState('series');
  const [seriesList, setSeriesList] = useState([]);
  const [selectedSeries, setSelectedSeries] = useState(null);
  const [cards, setCards] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlyMissing, setShowOnlyMissing] = useState(false);
  const [userCollection, setUserCollection] = useState({});
  const [seriesStats, setSeriesStats] = useState({});
  const [loading, setLoading] = useState(true);

  // 1. Charger les séries et calculer les stats proprement
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      
      const { data: seriesData } = await supabase.from('series').select('*');
      if (seriesData) setSeriesList(seriesData);

      let userCollMap = {};
      if (user) {
        const { data: collData } = await supabase
          .from('user_collection')
          .select('*')
          .eq('user_id', user.id);

        if (collData) {
          collData.forEach(item => {
            const variant = item.variant || 'normal';
            userCollMap[`${item.card_id}_${variant}`] = true;
          });
          setUserCollection(userCollMap);
        }
      }

      if (seriesData) {
        const stats = {};
        
        for (const serie of seriesData) {
          const { data: serieCards } = await supabase
            .from('cards')
            .select('id, variants, special_variants')
            .eq('set_id', serie.id);

          const totalCardsInSet = serieCards ? serieCards.length : 0;
          
          let ownedCount = 0;
          if (serieCards) {
            serieCards.forEach(card => {
              const cardVariants = getCardVariantsList(card);
              const hasOneOwned = cardVariants.some(v => userCollMap[`${card.id}_${v}`]);
              if (hasOneOwned) {
                ownedCount++;
              }
            });
          }

          stats[serie.id] = {
            total: totalCardsInSet,
            owned: ownedCount,
            percent: totalCardsInSet > 0 ? Math.round((ownedCount / totalCardsInSet) * 100) : 0
          };
        }
        
        setSeriesStats(stats);
      }

      setLoading(false);
    }
    fetchData();
  }, [user]);

  const getCardVariantsList = (cardOrVariants) => {
    let variants = [];
    
    // Supporte soit l'objet carte complet, soit directement les données de variantes (rétrocompatibilité)
    const variantsData = cardOrVariants?.variants !== undefined ? cardOrVariants.variants : cardOrVariants;
    const specialVariants = cardOrVariants?.special_variants;

    if (!variantsData) {
      variants = ['normal', 'reverse'];
    } else if (typeof variantsData === 'object' && !Array.isArray(variantsData)) {
      variants = Object.keys(variantsData).filter(key => variantsData[key] === true);
    } else if (Array.isArray(variantsData)) {
      variants = [...variantsData];
    } else {
      variants = ['normal'];
    }

    // Ajout dynamique des variantes spéciales (special_variants)
    if (specialVariants && Array.isArray(specialVariants)) {
      specialVariants.forEach(sv => {
        if (!variants.includes(sv)) {
          variants.push(sv);
        }
      });
    }
    
    return variants;
  };

  // 2. Charger les cartes de la série sélectionnée
  useEffect(() => {
    async function fetchSeriesCards() {
      if (!selectedSeries) return;
      setLoading(true);

      const { data: cardsData, error } = await supabase
        .from('cards')
        .select('*')
        .eq('set_id', selectedSeries.id)
        .order('number', { ascending: true });

      if (error) {
        console.error("Erreur chargement cartes:", error);
      }

      setCards(cardsData || []);
      setLoading(false);
    }

    if (step === 'grid') {
      fetchSeriesCards();
    }
  }, [step, selectedSeries]);

  async function toggleCardOwnership(cardId, variant) {
    if (!user) return;

    const existingKey = `${cardId}_${variant}`;
    const isCurrentlyOwned = !!userCollection[existingKey];

    setUserCollection(prev => {
      const copy = { ...prev };
      if (isCurrentlyOwned) {
        delete copy[existingKey];
      } else {
        copy[existingKey] = true;
      }
      return copy;
    });

    if (selectedSeries) {
      const serieCards = cards;
      const updatedCollMap = { ...userCollection };
      if (isCurrentlyOwned) {
        delete updatedCollMap[existingKey];
      } else {
        updatedCollMap[existingKey] = true;
      }

      let ownedCount = 0;
      serieCards.forEach(c => {
        const cVariants = getCardVariantsList(c);
        const hasOneOwned = cVariants.some(v => updatedCollMap[`${c.id}_${v}`]);
        if (hasOneOwned) {
          ownedCount++;
        }
      });

      const totalCardsInSet = serieCards.length;
      setSeriesStats(prev => ({
        ...prev,
        [selectedSeries.id]: {
          total: totalCardsInSet,
          owned: ownedCount,
          percent: totalCardsInSet > 0 ? Math.round((ownedCount / totalCardsInSet) * 100) : 0
        }
      }));
    }

    if (isCurrentlyOwned) {
      const { error } = await supabase
        .from('user_collection')
        .delete()
        .match({ 
          user_id: user.id, 
          card_id: cardId, 
          variant: variant 
        });

      if (error) console.error("Erreur suppression Supabase :", error);
    } else {
      const { error } = await supabase
        .from('user_collection')
        .upsert([{ 
          user_id: user.id, 
          card_id: cardId, 
          variant: variant, 
          is_owned: true 
        }], { onConflict: 'user_id, card_id, variant' });

      if (error) console.error("Erreur insertion Supabase :", error);
    }
  }

  const renderableCards = [];
  cards.forEach(card => {
    const cardVariants = getCardVariantsList(card);
    cardVariants.forEach(variant => {
      renderableCards.push({ ...card, displayVariant: variant });
    });
  });

  const filteredCards = renderableCards.filter(item => {
    const matchesSearch = 
      item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.number?.toString().includes(searchQuery);

    if (!matchesSearch) return false;

    if (showOnlyMissing) {
      const isOwned = !!userCollection[`${item.id}_${item.displayVariant}`];
      if (isOwned) return false;
    }

    return true;
  });

  const getVariantBadgeStyle = (variant) => {
    const lower = variant.toLowerCase();
    switch (lower) {
      case 'reverse':
        return { label: 'Reverse', bg: 'bg-amber-500 text-slate-950' };
      case 'holo':
      case 'holofoil':
        return { label: 'Holo', bg: 'bg-purple-600 text-white' };
      case 'cosmos':
      case 'holocosmos':
        return { label: 'Holo Cosmos', bg: 'bg-blue-600 text-white' };
      case 'nonholo':
      case 'normal':
        return { label: 'Standard', bg: 'bg-red-600 text-white' };
      default:
        // S'adapte automatiquement pour les variantes spéciales (Pokéball, Masterball, etc.)
        return { label: variant, bg: 'bg-emerald-600 text-white' };
    }
  };

  // Vue Liste des Séries
  if (step === 'series') {
    const sortedSeries = [...seriesList].sort((a, b) => new Date(b.release_date || 0) - new Date(a.release_date || 0));
    const groupedByBlock = sortedSeries.reduce((acc, serie) => {
      const blockName = serie.block_name || "Autres";
      if (!acc[blockName]) acc[blockName] = [];
      acc[blockName].push(serie);
      return acc;
    }, {});

    return (
      <div className="min-h-screen bg-[#16181d] text-white w-full px-6 py-4">
        <div className="w-full">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-xl font-black text-white tracking-tight">Ma Collection - Séries</h1>
            <button type="button" onClick={onBack} className="flex items-center gap-1 text-xs font-bold text-slate-300 hover:text-white cursor-pointer bg-[#1e222b] border border-slate-700/60 px-3 py-1.5 rounded-xl transition-colors shadow-sm">
              <ArrowLeft size={14} /> Retour à l'accueil
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12 text-slate-400 font-medium">Chargement des séries et des statistiques...</div>
          ) : (
            Object.entries(groupedByBlock).map(([blockName, series]) => (
              <div key={blockName} className="mb-8">
                <h2 className="text-base font-extrabold text-purple-400 tracking-wider mb-4 pb-1.5 border-b border-slate-800/80">{blockName}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {series.map((serie) => {
                    const stat = seriesStats[serie.id] || { total: 0, owned: 0, percent: 0 };
                    const isCompleted = stat.percent === 100 && stat.total > 0;
                    const logoUrl = serie.logo_url || serie.logo || serie.images?.logo;

                    return (
                      <div
                        key={serie.id}
                        onClick={() => {
                          setSelectedSeries(serie);
                          setStep('grid');
                        }}
                        className="bg-[#1e222b] border border-slate-700/60 hover:border-purple-500/60 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col items-center text-center justify-between group relative text-white backdrop-blur-sm"
                      >
                        {isCompleted && (
                          <span className="absolute top-3 right-3 text-cyan-400 bg-cyan-950/60 p-1 rounded-full border border-cyan-500/30">
                            <Check size={14} />
                          </span>
                        )}

                        <div className="flex flex-col items-center text-center w-full">
                          <div className="h-24 w-full flex items-center justify-center mb-3">
                            {logoUrl ? (
                              <img 
                                src={logoUrl} 
                                alt={serie.name} 
                                className="max-h-24 max-w-full object-contain group-hover:scale-105 transition-transform duration-200" 
                              />
                            ) : (
                              <span className="text-base font-extrabold text-slate-200 uppercase tracking-wider">
                                {serie.name}
                              </span>
                            )}
                          </div>
                          {logoUrl && (
                            <h3 className="font-extrabold text-slate-100 text-lg line-clamp-2">{serie.name}</h3>
                          )}
                        </div>

                        <div className="mt-4 w-full">
                          <div className="flex justify-between text-[11px] font-bold text-slate-400 mb-1">
                            <span>{serie.code || 'SERIE'}</span>
                            <span>{stat.owned}/{stat.total} | <strong className="text-white">{stat.percent}%</strong></span>
                          </div>
                          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400 transition-all duration-500"
                              style={{ width: `${stat.percent}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // Vue Grille des Cartes d'une série sélectionnée
  return (
    <div className="min-h-screen bg-[#16181d] text-white w-full px-6 py-4">
      <div className="w-full flex flex-col md:flex-row justify-between items-center gap-4 mb-6 bg-[#1e222b] p-3.5 rounded-2xl border border-slate-700/60 shadow-sm">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <button 
            type="button"
            onClick={() => setStep('series')} 
            className="flex items-center gap-1 text-xs font-bold text-slate-300 hover:text-white cursor-pointer bg-slate-800 border border-slate-700 px-3 py-2 rounded-xl transition-colors"
          >
            <ArrowLeft size={14} /> Retour aux séries
          </button>
          <span className="text-sm font-extrabold text-purple-400">
            {selectedSeries?.name} ({filteredCards.length} déclinaisons affichées)
          </span>

        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Case à cocher Cartes manquantes */}
          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none bg-[#16181d] px-3.5 py-2 rounded-xl border border-slate-700 hover:border-purple-500/50 transition-colors shrink-0">
            <input 
              type="checkbox" 
              checked={showOnlyMissing} 
              onChange={(e) => setShowOnlyMissing(e.target.checked)}
              className="rounded border-slate-700 text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
            />
            <span className="font-medium">Cartes manquantes</span>
          </label>

          <div className="relative w-full md:w-80">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Nom de la carte ou numéro..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#16181d] border border-slate-700 text-white text-xs rounded-xl pl-9 pr-4 py-2 focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>
      </div>

      <div className="w-full">
        {loading ? (
          <div className="text-center py-20 text-slate-400 font-medium">Chargement des cartes de la série...</div>
        ) : filteredCards.length === 0 ? (
          <div className="text-center py-20 text-slate-400 font-medium">Aucune carte trouvée pour cette série.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {filteredCards.map((card, index) => {
              const variant = card.displayVariant;
              const isOwned = !!userCollection[`${card.id}_${variant}`];
              const badgeInfo = getVariantBadgeStyle(variant);

              return (
                <div 
                  key={`${card.id}_${variant}_${index}`}
                  onClick={() => toggleCardOwnership(card.id, variant)}
                  className={`border rounded-2xl p-4 flex flex-col items-center transition-all relative group cursor-pointer ${
                    isOwned 
                      ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-[#1e222b] opacity-100 grayscale-0 shadow-lg' 
                      : 'border-slate-800 bg-[#1e222b]/40 opacity-50 grayscale hover:grayscale-0 hover:opacity-100'
                  }`}
                >
                  <div className="absolute top-3 left-3 z-10 pointer-events-none">
                    <span className={`${badgeInfo.bg} text-[10px] font-extrabold px-2.5 py-1 rounded-lg shadow-md`}>
                      {badgeInfo.label}
                    </span>
                  </div>

                  {isOwned && (
                    <span className="absolute top-3 right-3 bg-emerald-500 text-white p-1.5 rounded-full shadow-md z-10 pointer-events-none">
                      <Check size={12} />
                    </span>
                  )}

                  {card.image_url ? (
                    <img 
                      src={card.image_url} 
                      alt={card.name} 
                      className="w-full h-64 object-contain rounded-lg mb-4 transition-transform group-hover:scale-105 pointer-events-none" 
                    />
                  ) : (
                    <div className="w-full h-64 bg-[#16181d] rounded-lg mb-4 flex items-center justify-center text-xs text-slate-500">
                      Pas d'image
                    </div>
                  )}

                  <div className="w-full flex justify-between items-center bg-[#16181d] px-3 py-2 rounded-xl border border-slate-800/80 pointer-events-none">
                    <span className="text-xs font-bold text-slate-200 truncate">{card.name}</span>
                    <span className="text-xs font-mono text-slate-400">{card.number}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}