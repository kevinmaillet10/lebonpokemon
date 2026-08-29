import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { ArrowLeft, Search, Check, BookOpen, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Palette, ArrowUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CollectionManager({ user, onBack }) {
  const [step, setStep] = useState('series'); // 'series' | 'cover' | 'grid'
  const [seriesList, setSeriesList] = useState([]);
  const [selectedSeries, setSelectedSeries] = useState(null);
  const [cards, setCards] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlyMissing, setShowOnlyMissing] = useState(false);
  const [userCollection, setUserCollection] = useState({});
  const [seriesStats, setSeriesStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [isZipping, setIsZipping] = useState(false);
  const [isClosingBinder, setIsClosingBinder] = useState(false);

  // Configuration de la grille et des pages
  const [binderLayout, setBinderLayout] = useState('3x3');
  const [currentPage, setCurrentPage] = useState(0);
  const [pageDirection, setPageDirection] = useState(1);

  // Couleurs personnalisées des classeurs (stockées en local)
  const [binderColors, setBinderColors] = useState(() => {
    try {
      const saved = localStorage.getItem('poke_binder_colors');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [activeColorPicker, setActiveColorPicker] = useState(null);

  const handleCustomHexColor = (serieId, hexValue) => {
    const updated = { 
      ...binderColors, 
      [serieId]: { 
        bg: `linear-gradient(135deg, ${hexValue}ee, ${hexValue}aa 60%, #0a0c10)`, 
        hex: hexValue,
        accent: 'border-white/50' 
      } 
    };
    setBinderColors(updated);
    localStorage.setItem('poke_binder_colors', JSON.stringify(updated));
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
            .select('id, set_id, variants, special_variants')
            .eq('set_id', serie.id);

          const totalCardsInSet = serieCards ? serieCards.length : 0;
          let ownedCount = 0;
          if (serieCards) {
            serieCards.forEach(card => {
              const cardVariants = getCardVariantsList(card);
              const hasOneOwned = cardVariants.some(v => userCollMap[`${card.id}_${v}`]);
              if (hasOneOwned) ownedCount++;
            });
          }

          const shortSetCode = serie.id ? serie.id.toUpperCase() : 'SET';

          stats[serie.id] = {
            total: totalCardsInSet,
            owned: ownedCount,
            percent: totalCardsInSet > 0 ? Math.round((ownedCount / totalCardsInSet) * 100) : 0,
            shortCode: shortSetCode
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

    if (specialVariants && Array.isArray(specialVariants)) {
      specialVariants.forEach(sv => {
        if (!variants.includes(sv)) variants.push(sv);
      });
    }
    return variants;
  };

  useEffect(() => {
    async function fetchSeriesCards() {
      if (!selectedSeries) return;
      setLoading(true);

      const { data: cardsData } = await supabase
        .from('cards')
        .select('*')
        .eq('set_id', selectedSeries.id)
        .order('number', { ascending: true });

      // Tri numérique correct (gère 1, 2, ..., 10, 11 et les promos)
      const sortedCards = (cardsData || []).sort((a, b) => {
        const numA = parseInt(a.number, 10);
        const numB = parseInt(b.number, 10);

        if (!isNaN(numA) && !isNaN(numB)) {
          return numA - numB;
        }
        return String(a.number).localeCompare(String(b.number));
      });

      setCards(cardsData || []);
      setCurrentPage(0);
      setLoading(false);
    }

    if (step === 'cover' || step === 'grid') {
      fetchSeriesCards();
    }
  }, [selectedSeries]);

  async function toggleCardOwnership(cardId, variant) {
    if (!user) return;

    const existingKey = `${cardId}_${variant}`;
    const isCurrentlyOwned = !!userCollection[existingKey];

    setUserCollection(prev => {
      const copy = { ...prev };
      if (isCurrentlyOwned) delete copy[existingKey];
      else copy[existingKey] = true;
      return copy;
    });

    if (selectedSeries) {
      const serieCards = cards;
      const updatedCollMap = { ...userCollection };
      if (isCurrentlyOwned) delete updatedCollMap[existingKey];
      else updatedCollMap[existingKey] = true;

      let ownedCount = 0;
      serieCards.forEach(c => {
        const cVariants = getCardVariantsList(c);
        const hasOneOwned = cVariants.some(v => updatedCollMap[`${c.id}_${v}`]);
        if (hasOneOwned) ownedCount++;
      });

      const totalCardsInSet = serieCards.length;
      const currentStat = seriesStats[selectedSeries.id] || {};
      setSeriesStats(prev => ({
        ...prev,
        [selectedSeries.id]: {
          ...currentStat,
          total: totalCardsInSet,
          owned: ownedCount,
          percent: totalCardsInSet > 0 ? Math.round((ownedCount / totalCardsInSet) * 100) : 0
        }
      }));
    }

    if (isCurrentlyOwned) {
      await supabase.from('user_collection').delete().match({ user_id: user.id, card_id: cardId, variant: variant });
    } else {
      await supabase.from('user_collection').upsert([{ user_id: user.id, card_id: cardId, variant: variant, is_owned: true }], { onConflict: 'user_id, card_id, variant' });
    }
  }

  const getItemsPerPage = () => {
    switch (binderLayout) {
      case '3x3': return 9;
      case '4x3': return 12;
      case '4x4': return 16;
      case '4x5': return 20;
      case '5x5': return 25;
      default: return 9;
    }
  };

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

  const itemsPerPage = getItemsPerPage();
  const totalPages = Math.ceil(filteredCards.length / itemsPerPage) || 1;
  const paginatedCards = filteredCards.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage);

  const getVariantBadgeStyle = (variant) => {
    const lower = variant.toLowerCase();
    switch (lower) {
      case 'reverse': return { label: 'Reverse', bg: 'bg-amber-500 text-slate-950' };
      case 'holo':
      case 'holofoil': return { label: 'Holo', bg: 'bg-purple-600 text-white' };
      case 'cosmos':
      case 'holocosmos': return { label: 'Cosmos', bg: 'bg-blue-600 text-white' };
      case 'nonholo':
      case 'normal': return { label: 'Standard', bg: 'bg-red-600 text-white' };
      default: return { label: variant, bg: 'bg-emerald-600 text-white' };
    }
  };

  const getGridColumnsClass = () => {
    switch (binderLayout) {
      case '3x3': return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3';
      case '4x3': return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4';
      case '4x4': return 'grid-cols-2 sm:grid-cols-4 md:grid-cols-4';
      case '4x5': return 'grid-cols-2 sm:grid-cols-4 md:grid-cols-5';
      case '5x5': return 'grid-cols-3 sm:grid-cols-5 md:grid-cols-5';
      default: return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3';
    }
  };

  const handleReturnToShelf = () => {
    setIsClosingBinder(true);
    setTimeout(() => {
      setIsClosingBinder(false);
      setStep('series');
    }, 1000);
  };

  // ==========================================
  // VUE 1 : ÉTAGÈRE (BOIS FONCÉ)
  // ==========================================
  if (step === 'series') {
    const sortedSeries = [...seriesList].sort((a, b) => new Date(b.release_date || 0) - new Date(a.release_date || 0));
    const groupedByBlock = sortedSeries.reduce((acc, serie) => {
      const blockName = serie.block_name || "Autres Séries";
      if (!acc[blockName]) acc[blockName] = [];
      acc[blockName].push(serie);
      return acc;
    }, {});

    return (
      <div className="min-h-screen bg-[#0e1015] text-white w-full px-6 py-6 relative" onClick={() => setActiveColorPicker(null)}>
        <div className="w-full max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                <BookOpen className="text-amber-500" size={28} /> Ma Collection de Classeurs
              </h1>
              <p className="text-xs text-amber-200/60 mt-1">Survole un classeur pour le personnaliser ou clique dessus pour l'ouvrir.</p>
            </div>
            <button type="button" onClick={onBack} className="flex items-center gap-1.5 text-xs font-bold text-amber-200 hover:text-white cursor-pointer bg-[#26170d] border border-[#4a2e18] px-4 py-2 rounded-xl transition-colors shadow-sm">
              <ArrowLeft size={14} /> Retour à l'accueil
            </button>
          </div>

          {loading ? (
            <div className="text-center py-20 text-amber-300/60 font-medium">Chargement de la bibliothèque...</div>
          ) : (
            Object.entries(groupedByBlock).map(([blockName, series]) => (
              <div key={blockName} className="mb-16">
                
                {/* STRUCTURE DU MEUBLE DE RANGEMENT */}
                <div className="rounded-3xl shadow-[0_30px_70px_rgba(10,5,2,0.9)] relative overflow-hidden border border-[#26150a] bg-[#120804]">
                  
                  {/* Fond intérieur sombre du meuble */}
                  <div className="absolute inset-0 bg-gradient-to-b from-[#1a0e07] via-[#100703] to-[#080402] opacity-95 pointer-events-none"></div>

                  {/* PLANCHE SUPÉRIEURE AVEC TEXTURE BOIS ET NOM DU BLOC INCRUSTÉ */}
                  <div 
                    className="relative w-full h-16 z-20 flex items-center justify-center px-6 overflow-hidden"
                    style={{
                      backgroundColor: '#4a2814',
                      backgroundImage: `
                        url("data:image/svg+xml,%3Csvg viewBox='0 0 300 300' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='woodGrain'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.08 0.002' numOctaves='4' stitchTiles='stitch' result='noise'/%3E%3CfeColorMatrix type='matrix' values='0 0 0 0 0.2  0 0 0 0 0.1  0 0 0 0 0.05  0 0 0 1 0' in='noise'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23woodGrain)' opacity='0.6'/%3E%3C/svg%3E"),
                        linear-gradient(180deg, #6e3d1f 0%, #4a2814 40%, #2b1509 100%)
                      `,
                      boxShadow: 'inset 0 2px 4px rgba(255, 255, 255, 0.2), inset 0 -5px 10px rgba(0, 0, 0, 0.9), 0 10px 25px rgba(0,0,0,0.8)',
                      borderBottom: '2px solid #1a0d05',
                      borderTop: '1px solid #8c4e27'
                    }}
                  >
                    <h2 
                      className="text-lg md:text-xl font-black tracking-widest uppercase select-none"
                      style={{
                        color: '#1a0d05',
                        textShadow: '0 1px 1px rgba(255, 255, 255, 0.35), 0 -1px 1px rgba(0, 0, 0, 0.6)'
                      }}
                    >
                      {blockName}
                    </h2>
                  </div>

                  {/* CONTENEUR DES CLASSEURS POSÉS SUR LA PLANCHE */}
                  <div className="relative z-10 flex items-end gap-6 overflow-x-auto px-6 pt-10 pb-4 scrollbar-thin scrollbar-thumb-[#523118] scrollbar-track-transparent">
                    {series.map((serie) => {
                      const stat = seriesStats[serie.id] || { total: 0, owned: 0, percent: 0, shortCode: serie.id?.toUpperCase() || 'SET' };
                      const isCompleted = stat.percent === 100 && stat.total > 0;
                      const logoUrl = serie.logo_url || serie.logo || serie.images?.logo;
                      const binderStyle = binderColors[serie.id] || { 
                        bg: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', 
                        hex: '#3b82f6', 
                        accent: 'border-slate-700' 
                      };

                      return (
                        <div key={serie.id} className="relative shrink-0 flex flex-col items-center group pt-8">
                          
                          {/* BOUTON PALETTE FLOTTANT */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveColorPicker(activeColorPicker === serie.id ? null : serie.id);
                            }}
                            className="absolute top-0 left-1/2 -translate-x-1/2 z-40 bg-[#26170d] hover:bg-amber-600 text-amber-400 hover:text-white p-2 rounded-full border border-amber-500/50 shadow-xl transition-all cursor-pointer opacity-0 group-hover:opacity-100 flex items-center justify-center"
                            title="Changer la couleur"
                          >
                            <Palette size={14} />
                          </button>

                          {/* SÉLECTEUR DE COULEUR */}
                          {activeColorPicker === serie.id && (
                            <div 
                              className="absolute -top-12 left-1/2 -translate-x-1/2 z-50 bg-[#26170d] border border-[#4a2e18] rounded-2xl p-4 shadow-2xl flex flex-col gap-2 w-48"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <span className="text-[10px] font-bold text-amber-200 text-center uppercase tracking-wider">Couleur du classeur</span>
                              <div className="flex items-center justify-center gap-2 bg-[#150d08] p-2 rounded-xl border border-[#362317]">
                                <input 
                                  type="color" 
                                  value={binderStyle.hex || '#3b82f6'} 
                                  onChange={(e) => handleCustomHexColor(serie.id, e.target.value)}
                                  className="w-10 h-10 rounded-lg bg-transparent cursor-pointer border-0 p-0"
                                />
                                <span className="text-xs font-mono text-amber-200 uppercase">{binderStyle.hex}</span>
                              </div>
                            </div>
                          )}

                          {/* CLASSEUR SUR L'ÉTAGÈRE */}
                          <motion.div 
                            layoutId={`binder-${serie.id}`}
                            onClick={() => {
                              setSelectedSeries(serie);
                              setStep('cover');
                            }}
                            whileHover={{ scale: 1.03, y: -15 }}
                            whileTap={{ scale: 0.98 }}
                            transition={{ type: "spring", stiffness: 350, damping: 25 }}
                            className="cursor-pointer relative flex flex-col items-center"
                          >
                            {isCompleted && (
                              <span className="absolute -top-3 right-1 z-30 text-cyan-400 bg-cyan-950 p-1 rounded-full border border-cyan-500/50 shadow">
                                <Check size={10} />
                              </span>
                            )}

                            <div 
                              className={`w-36 h-[540px] rounded-t-xl border-t-2 border-l border-r ${binderStyle.accent} shadow-[0_25px_50px_rgba(0,0,0,0.9)] flex flex-col justify-between py-6 px-3 relative overflow-hidden group-hover:shadow-amber-500/20 transition-all`}
                              style={{ background: binderStyle.bg }}
                            >
                              <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-8 bg-black/30 border-x border-white/5 pointer-events-none"></div>

                              {/* LOGO SANS FOND BLANC */}
                              <div className="relative z-10 w-full p-2 flex flex-col items-center">
                                <div className="w-full h-16 flex items-center justify-center p-1 overflow-hidden">
                                  {logoUrl ? (
                                    <img src={logoUrl} alt={serie.name} className="w-full h-full object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]" />
                                  ) : (
                                    <span className="text-xs font-black text-white">{stat.shortCode}</span>
                                  )}
                                </div>
                              </div>

                              <div className="relative z-10 flex flex-col items-center my-auto py-4">
                                <span 
                                  className="text-sm font-black text-white tracking-wider truncate max-h-72 text-center drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)] uppercase"
                                  style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                                >
                                  {serie.name}
                                </span>
                              </div>

                              <div className="relative z-10 w-full bg-black/80 backdrop-blur-md p-2.5 rounded-lg border border-white/15 flex flex-col items-center gap-1">
                                <span className="text-[11px] font-mono font-black text-cyan-300 uppercase tracking-widest">
                                  {stat.shortCode}
                                </span>
                                <div className="text-xs font-black text-white text-center">
                                  {stat.percent}%
                                </div>
                                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-gradient-to-r from-pink-500 to-purple-500 transition-all duration-500"
                                    style={{ width: `${stat.percent}%` }}
                                  ></div>
                                </div>
                              </div>
                            </div>
                          </motion.div>

                          {/* Ombre portée au sol du classeur */}
                          <div className="w-32 h-3 bg-black/90 rounded-full blur-md -mt-1.5 z-10"></div>
                        </div>
                      );
                    })}
                  </div>

                  {/* LA PLANCHE INFÉRIEURE AVEC TEXTURE BOIS SVG */}
                  <div 
                    className="relative w-full h-14 z-20"
                    style={{
                      backgroundColor: '#4a2814',
                      backgroundImage: `
                        url("data:image/svg+xml,%3Csvg viewBox='0 0 300 300' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='woodGrain2'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.08 0.002' numOctaves='4' stitchTiles='stitch' result='noise'/%3E%3CfeColorMatrix type='matrix' values='0 0 0 0 0.2  0 0 0 0 0.1  0 0 0 0 0.05  0 0 0 1 0' in='noise'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23woodGrain2)' opacity='0.6'/%3E%3C/svg%3E"),
                        linear-gradient(180deg, #8c4e27 0%, #6e3d1f 25%, #4a2814 65%, #2b1509 100%)
                      `,
                      boxShadow: 'inset 0 4px 6px rgba(255, 255, 255, 0.25), inset 0 -6px 12px rgba(0, 0, 0, 0.9), 0 -15px 30px rgba(0,0,0,0.9)',
                      borderTop: '2px solid #a85e33',
                      borderBottom: '1px solid #080402'
                    }}
                  ></div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* FLOTTAISON REMONTER TOUT EN HAUT */}
        <button
          type="button"
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-[9999] bg-amber-600 hover:bg-amber-500 text-white p-3.5 rounded-2xl shadow-2xl border border-amber-400/30 cursor-pointer transition-all flex items-center justify-center group"
          title="Remonter en haut"
        >
          <ArrowUp size={20} className="group-hover:-translate-y-1 transition-transform" />
        </button>
      </div>
    );
  }

  // ==========================================
  // VUE 2 : POCHETTE DU CLASSEUR
  // ==========================================
  if (step === 'cover') {
    const stat = seriesStats[selectedSeries?.id] || { total: 0, owned: 0, percent: 0, shortCode: selectedSeries?.id?.toUpperCase() || 'SET' };
    const logoUrl = selectedSeries?.logo_url || selectedSeries?.logo || selectedSeries?.images?.logo;
    const binderStyle = binderColors[selectedSeries?.id] || { 
      bg: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', 
      hex: '#3b82f6', 
      accent: 'border-slate-700' 
    };

    const handleOpenWithZip = () => {
      setIsZipping(true);
      setTimeout(() => {
        setIsZipping(false);
        setStep('grid');
      }, 700);
    };

    return (
      <div className="min-h-screen bg-[#0e1015] text-white w-full px-6 py-6 flex flex-col items-center justify-center relative overflow-hidden">
        
        {/* ANIMATION DE ZIP OUVERTURE / FERMETURE */}
        {isZipping && (
          <div className="absolute inset-0 z-50 flex pointer-events-none">
            <motion.div 
              initial={{ x: 0 }}
              animate={{ x: '-100%' }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
              className="w-1/2 h-full bg-[#0e1015] border-r-4 border-amber-500 shadow-2xl flex items-center justify-end pr-4"
            />
            <motion.div 
              initial={{ x: 0 }}
              animate={{ x: '100%' }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
              className="w-1/2 h-full bg-[#0e1015] border-l-4 border-amber-500 shadow-2xl flex items-center justify-start pl-4"
            />
          </div>
        )}

        {isClosingBinder && (
          <div className="absolute inset-0 z-50 flex pointer-events-none">
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              transition={{ duration: 1.0, ease: "easeInOut" }}
              className="w-1/2 h-full bg-[#0e1015] border-r-4 border-amber-500 shadow-2xl"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              transition={{ duration: 1.0, ease: "easeInOut" }}
              className="w-1/2 h-full bg-[#0e1015] border-l-4 border-amber-500 shadow-2xl"
            />
          </div>
        )}

        <div className="w-full max-w-4xl mx-auto flex flex-col items-center">
          
          <div className="w-full max-w-[340px] sm:max-w-[420px] flex justify-between items-center mb-6">
            <button 
              type="button"
              onClick={handleReturnToShelf} 
              className="flex items-center gap-1.5 text-xs font-bold text-amber-200 hover:text-white cursor-pointer bg-[#26170d] border border-[#4a2e18] px-4 py-2.5 rounded-xl transition-colors shadow"
            >
              <ArrowLeft size={14} /> Retour à l'étagère
            </button>
          </div>

          <motion.div 
            layoutId={`binder-${selectedSeries?.id}`}
            onClick={handleOpenWithZip}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 200, damping: 25 }}
            className="w-[340px] sm:w-[420px] h-[520px] sm:h-[620px] rounded-3xl border-4 border-white/20 shadow-[0_35px_60px_-15px_rgba(0,0,0,0.9)] cursor-pointer relative flex flex-col justify-between p-8 sm:p-12 overflow-hidden group"
            style={{ background: binderStyle.bg }}
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-black/50 via-transparent to-white/10 pointer-events-none"></div>

            <div className="relative z-10"></div>

            <div className="relative z-10 flex flex-col items-center justify-center my-auto text-center gap-6">
              <div className="w-64 sm:w-80 h-40 sm:h-52 flex items-center justify-center drop-shadow-[0_10px_25px_rgba(0,0,0,0.8)] transform group-hover:scale-105 transition-transform">
                {logoUrl ? (
                  <img src={logoUrl} alt={selectedSeries?.name} className="w-full h-full object-contain filter drop-shadow-md" />
                ) : (
                  <span className="text-2xl font-black text-white">{selectedSeries?.name}</span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-wide uppercase drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)]">
                {selectedSeries?.name}
              </h1>
            </div>

            <div className="relative z-10 flex flex-col gap-2 w-full bg-black/60 backdrop-blur-md p-4 rounded-2xl border border-white/15">
              <div className="flex justify-between items-center text-xs">
                <span className="font-mono font-black text-cyan-300 uppercase tracking-widest text-sm">
                  {stat.shortCode}
                </span>
                <span className="font-bold text-white">
                  {stat.owned} / {stat.total} ({stat.percent}%)
                </span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-pink-500 to-purple-500 transition-all duration-500"
                  style={{ width: `${stat.percent}%` }}
                ></div>
              </div>
            </div>

          </motion.div>

        </div>
      </div>
    );
  }

  // ==========================================
  // VUE 3 : CLASSEUR OUVERT (GRILLE DE CARTES)
  // ==========================================
  return (
    <div className="min-h-screen bg-[#0e1015] text-white w-full px-6 py-6 relative">
      
      {/* ANIMATION DE FERMETURE LORSQU'ON RANGE LE CLASSEUR DEPUIS LA GRILLE */}
      {isClosingBinder && (
        <div className="fixed inset-0 z-50 flex pointer-events-none">
          <motion.div 
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            transition={{ duration: 1.0, ease: "easeInOut" }}
            className="w-1/2 h-full bg-[#0e1015] border-r-4 border-amber-500 shadow-2xl"
          />
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            transition={{ duration: 1.0, ease: "easeInOut" }}
            className="w-1/2 h-full bg-[#0e1015] border-l-4 border-amber-500 shadow-2xl"
          />
        </div>
      )}

      <div className="w-full max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row justify-between items-center gap-4 mb-6 bg-[#26170d] p-4 rounded-2xl border border-[#4a2e18] shadow-lg">
          <div className="flex items-center gap-4 w-full lg:w-auto">
            <button 
              type="button"
              onClick={() => {
                setIsClosingBinder(true);
                setTimeout(() => {
                  setIsClosingBinder(false);
                  setStep('cover');
                }, 1000);
              }} 
              className="flex items-center gap-1 text-xs font-bold text-amber-200 hover:text-white cursor-pointer bg-[#1c120c] border border-[#362317] px-3.5 py-2.5 rounded-xl transition-colors shadow"
            >
              <ArrowLeft size={14} /> Fermer le classeur
            </button>
            <div>
              <h2 className="text-sm font-black text-amber-400 flex items-center gap-2">
                <BookOpen size={16} /> {selectedSeries?.name} <span className="text-xs font-mono text-cyan-300">({selectedSeries?.id?.toUpperCase()})</span>
              </h2>
              <span className="text-[11px] text-amber-200/60 font-medium">
                Page {currentPage + 1} sur {totalPages} ({filteredCards.length} cartes)
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
            <div className="flex items-center bg-[#1c120c] border border-[#362317] rounded-xl p-1 shrink-0">
              <span className="text-[11px] font-bold text-amber-200/60 px-2.5 hidden sm:inline">Format :</span>
              {['3x3', '4x3', '4x4', '4x5', '5x5'].map((layout) => (
                <button
                  key={layout}
                  type="button"
                  onClick={() => {
                    setBinderLayout(layout);
                    setCurrentPage(0);
                  }}
                  className={`text-xs font-extrabold px-2.5 py-1.5 rounded-lg transition-all ${
                    binderLayout === layout 
                      ? 'bg-amber-600 text-white shadow' 
                      : 'text-amber-200/60 hover:text-white'
                  }`}
                >
                  {layout}
                </button>
              ))}
            </div>

            <label className="flex items-center gap-2 text-xs text-amber-200 cursor-pointer select-none bg-[#1c120c] px-3.5 py-2.5 rounded-xl border border-[#362317] hover:border-amber-500/50 transition-colors shrink-0">
              <input 
                type="checkbox" 
                checked={showOnlyMissing} 
                onChange={(e) => {
                  setShowOnlyMissing(e.target.checked);
                  setCurrentPage(0);
                }}
                className="rounded border-[#362317] text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
              />
              <span className="font-medium">Manquantes</span>
            </label>

            <div className="relative w-full sm:w-56">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-200/60" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(0);
                }}
                className="w-full bg-[#1c120c] border border-[#362317] text-white text-xs rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        <div className="bg-[#1c120c] border border-[#362317] rounded-3xl p-6 sm:p-10 shadow-2xl relative min-h-[580px] flex flex-col justify-between overflow-hidden">
          
          {loading ? (
            <div className="text-center py-32 text-amber-200/60 font-medium">Chargement des pages...</div>
          ) : filteredCards.length === 0 ? (
            <div className="text-center py-32 text-amber-200/60 font-medium">Aucune carte trouvée.</div>
          ) : (
            <div style={{ perspective: '1400px' }}>
              <AnimatePresence mode="wait">
                <motion.div 
                  key={currentPage + binderLayout}
                  initial={{ 
                    opacity: 0, 
                    rotateY: pageDirection > 0 ? 35 : -35, 
                    transformOrigin: pageDirection > 0 ? 'left center' : 'right center' 
                  }}
                  animate={{ opacity: 1, rotateY: 0, transformOrigin: 'center center' }}
                  exit={{ 
                    opacity: 0, 
                    rotateY: pageDirection > 0 ? -35 : 35, 
                    transformOrigin: pageDirection > 0 ? 'right center' : 'left center' 
                  }}
                  transition={{ duration: 0.35, ease: "easeInOut" }}
                  className={`grid ${getGridColumnsClass()} gap-4 sm:gap-6 mb-8`}
                >
                  {paginatedCards.map((card, index) => {
                    const variant = card.displayVariant;
                    const isOwned = !!userCollection[`${card.id}_${variant}`];
                    const badgeInfo = getVariantBadgeStyle(variant);

                    return (
                      <motion.div 
                        key={`${card.id}_${variant}_${index}`}
                        onClick={() => toggleCardOwnership(card.id, variant)}
                        whileHover={{ scale: 1.03, y: -4 }}
                        whileTap={{ scale: 0.95 }}
                        className={`border rounded-2xl p-3 sm:p-4 flex flex-col items-center transition-all relative group cursor-pointer backdrop-blur-md overflow-hidden ${
                          isOwned 
                            ? 'border-emerald-500/90 bg-[#26170d] shadow-2xl shadow-emerald-950/40 opacity-100 ring-2 ring-emerald-500/20' 
                            : 'border-[#362317] bg-[#150d08]/60 opacity-40 grayscale hover:grayscale-0 hover:opacity-100 hover:border-amber-500/50'
                        }`}
                      >
                        <div className="absolute top-3 left-3 z-10 pointer-events-none">
                          <span className={`${badgeInfo.bg} text-[10px] font-extrabold px-2 py-0.5 rounded-md shadow`}>
                            {badgeInfo.label}
                          </span>
                        </div>

                        {isOwned && (
                          <motion.span 
                            initial={{ scale: 0, rotate: -180, opacity: 0 }}
                            animate={{ scale: 1, rotate: 0, opacity: 1 }}
                            transition={{ type: "spring", stiffness: 500, damping: 25 }}
                            className="absolute top-3 right-3 bg-emerald-500 text-white p-1 rounded-full shadow-lg z-10 pointer-events-none"
                          >
                            <Check size={12} />
                          </motion.span>
                        )}

                        <motion.div
                          animate={isOwned ? { 
                            y: [-70, 0], 
                            opacity: [0, 1],
                            scale: [0.95, 1]
                          } : { y: 0, opacity: 1, scale: 1 }}
                          transition={{ type: "spring", stiffness: 300, damping: 22 }}
                          className="w-full flex flex-col items-center"
                        >
                          {card.image_url ? (
                            <img 
                              src={card.image_url} 
                              alt={card.name} 
                              className="w-full h-48 sm:h-56 object-contain rounded-lg mb-3 pointer-events-none transition-transform group-hover:scale-105" 
                            />
                          ) : (
                            <div className="w-full h-48 sm:h-56 bg-[#120d09] rounded-lg mb-3 flex items-center justify-center text-xs text-amber-200/40 border border-dashed border-[#362317]">
                              Pochette vide
                            </div>
                          )}

                          <div className="w-full flex justify-between items-center bg-[#150d08] px-3 py-2 rounded-xl border border-[#362317] pointer-events-none">
                            <span className="text-xs font-bold text-slate-200 truncate">{card.name}</span>
                            <span className="text-xs font-mono text-amber-200/60 shrink-0 ml-2">{card.number}</span>
                          </div>
                        </motion.div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              </AnimatePresence>
            </div>
          )}

          {/* BARRE DE PAGINATION COMPLÈTE */}
          {!loading && totalPages > 1 && (
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-t border-[#362317] pt-6 mt-auto">
              
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPageDirection(-1);
                    setCurrentPage(0);
                  }}
                  disabled={currentPage === 0}
                  className="flex items-center gap-1 px-3 py-2 rounded-xl bg-[#150d08] border border-[#362317] text-xs font-bold text-amber-200 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors shadow"
                  title="Retourner au début"
                >
                  <ChevronsLeft size={16} /> Début
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPageDirection(-1);
                    setCurrentPage(prev => Math.max(prev - 1, 0));
                  }}
                  disabled={currentPage === 0}
                  className="flex items-center gap-1 px-3 py-2 rounded-xl bg-[#150d08] border border-[#362317] text-xs font-bold text-amber-200 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors shadow"
                >
                  <ChevronLeft size={16} /> Précédente
                </button>
              </div>

              <div className="flex items-center gap-2 bg-[#150d08] px-4 py-2 rounded-xl border border-[#362317] shadow">
                <span className="text-xs text-amber-200/60 font-medium">Aller à :</span>
                <select
                  value={currentPage}
                  onChange={(e) => {
                    const newPage = Number(e.target.value);
                    setPageDirection(newPage > currentPage ? 1 : -1);
                    setCurrentPage(newPage);
                  }}
                  className="bg-[#26170d] border border-[#4a2e18] text-amber-400 font-black text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  {Array.from({ length: totalPages }, (_, i) => (
                    <option key={i} value={i}>
                      Page {i + 1}
                    </option>
                  ))}
                </select>
                <span className="text-xs font-extrabold text-amber-400">/ {totalPages}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPageDirection(1);
                    setCurrentPage(prev => Math.min(prev + 1, totalPages - 1));
                  }}
                  disabled={currentPage >= totalPages - 1}
                  className="flex items-center gap-1 px-3 py-2 rounded-xl bg-[#150d08] border border-[#362317] text-xs font-bold text-amber-200 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors shadow"
                >
                  Suivante <ChevronRight size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPageDirection(1);
                    setCurrentPage(totalPages - 1);
                  }}
                  disabled={currentPage >= totalPages - 1}
                  className="flex items-center gap-1 px-3 py-2 rounded-xl bg-[#150d08] border border-[#362317] text-xs font-bold text-amber-200 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors shadow"
                  title="Aller à la fin"
                >
                  Fin <ChevronsRight size={16} />
                </button>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}