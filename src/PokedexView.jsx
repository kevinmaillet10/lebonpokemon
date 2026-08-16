import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { ArrowLeft, Search, Check, ImageOff, X, Store, TrendingUp } from 'lucide-react';

const REGIONS = [
  { id: 'national', name: 'National', range: [1, 1025] },
  { id: 'kanto', name: 'Kanto', range: [1, 151] },
  { id: 'johto', name: 'Johto', range: [152, 251] },
  { id: 'hoenn', name: 'Hoenn', range: [252, 386] },
  { id: 'sinnoh', name: 'Sinnoh', range: [387, 493] },
  { id: 'unys', name: 'Unys', range: [494, 649] },
  { id: 'kalos', name: 'Kalos', range: [650, 721] },
  { id: 'alola', name: 'Alola', range: [722, 809] },
  { id: 'galar', name: 'Galar', range: [810, 898] },
  { id: 'hisui', name: 'Hisui', range: [899, 905] },
  { id: 'paldea', name: 'Paldea', range: [906, 1025] },
];

export default function PokedexView({ user, onBack, onNavigateToShop }) {
  const [selectedPokemon, setSelectedPokemon] = useState(null);
  const [pokemonCards, setPokemonCards] = useState([]);
  const [selectedCard, setSelectedCard] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const [pokedexList, setPokedexList] = useState([]);
  const [allCardsList, setAllCardsList] = useState([]);
  const [userCollection, setUserCollection] = useState({});
  const [pokemonStatsMap, setPokemonStatsMap] = useState({});
  
  const [selectedRegion, setSelectedRegion] = useState('national');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      // 1. Récupération du Pokédex
      const { data: pokedexData } = await supabase
        .from('pokedex')
        .select('*')
        .order('id', { ascending: true })
        .range(0, 2000);

      if (pokedexData) {
        setPokedexList(pokedexData);
      }

      // 2. Récupération de TOUTES les cartes (Pagination par blocs de 1000)
      let allPokedexData = [];
      let page = 0;
      const pageSize = 1000;
      let fetchMore = true;

      try {
          while (fetchMore) {
              const { data, error } = await supabase
                  .from('pokedex')
                  .select('*')
                  .range(page * pageSize, (page + 1) * pageSize - 1);

              if (error || !data || data.length === 0) {
                  fetchMore = false;
              } else {
                  allPokedexData = [...allPokedexData, ...data];
                  if (data.length < pageSize) {
                      fetchMore = false;
                  } else {
                      page++;
                  }
              }
          }
          
          // Remplace "setPokedexList" par le nom exact de ton state pour le Pokédex
          setPokedexList(allPokedexData);

      } catch (err) {
          console.error("Erreur chargement pokédex:", err);
      }

      // 3. Récupération de la collection utilisateur
      if (user) {
        const { data: collData } = await supabase
          .from('user_collection')
          .select('*')
          .eq('user_id', user.id);

        if (collData) {
          const userCollMap = {};
          collData.forEach(item => {
            const variantKey = item.variant ? item.variant : 'normal';
            userCollMap[`${item.card_id}_${variantKey}`] = true;
          });
          setUserCollection(userCollMap);
        }
      }

      setLoading(false);
    }

    fetchData();
  }, [user]);

  // Calcul unique et optimisé des stats pour éviter les lags et plantages
  useEffect(() => {
    if (allCardsList.length === 0 || pokedexList.length === 0) return;

    const statsMap = {};
    pokedexList.forEach(poke => {
      const pokeNameLower = poke.name.toLowerCase();
      const matchingCards = allCardsList.filter(c => c.name && c.name.toLowerCase().includes(pokeNameLower));
      const total = matchingCards.length;
      
      let owned = 0;
      matchingCards.forEach(card => {
        if (userCollection[`${card.id}_normal`] || userCollection[`${card.id}_reverse`]) {
          owned++;
        }
      });

      statsMap[poke.name] = { total, owned };
    });

    setPokemonStatsMap(statsMap);
  }, [allCardsList, pokedexList, userCollection]);

  // Chargement des cartes détaillées pour un Pokémon cliqué
  useEffect(() => {
    async function fetchCardsForPokemon() {
      if (!selectedPokemon) return;
      setLoading(true);

      const { data } = await supabase
        .from('cards')
        .select(`
          *,
          series (
            block_name,
            name
          )
        `)
        .ilike('name', `%${selectedPokemon.name}%`)
        .order('release_date', { ascending: false });

      setPokemonCards(data || []);
      setLoading(false);
    }

    if (selectedPokemon) {
      fetchCardsForPokemon();
    }
  }, [selectedPokemon]);

  const handleCardSelect = async (card) => {
    setSelectedCard(card);
    try {
      const response = await fetch(`https://api.tcgdex.net/v2/fr/cards/${card.id}`);
      if (response.ok) {
        const fullCard = await response.json();
        if (fullCard && fullCard.pricing) {
          setSelectedCard(prev => ({ ...prev, pricing: fullCard.pricing }));
        }
      }
    } catch (err) {
      console.error("Erreur TCGdex :", err);
    }
  };

  const handleToggleVariant = async (cardId, variant) => {
    if (!user) return;
    
    const dbVariant = variant === 'normal' ? null : variant;
    const key = `${cardId}_${variant}`;
    const isCurrentlyOwned = !!userCollection[key];

    setUserCollection(prev => ({ ...prev, [key]: !isCurrentlyOwned }));

    try {
      if (isCurrentlyOwned) {
        let query = supabase.from('user_collection').delete().eq('user_id', user.id).eq('card_id', cardId);
        if (dbVariant === null) query = query.is('variant', null);
        else query = query.eq('variant', dbVariant);
        await query;
      } else {
        await supabase.from('user_collection').insert([{ user_id: user.id, card_id: cardId, variant: dbVariant }]);
      }
    } catch (err) {
      console.error("Erreur synchro Supabase:", err);
      setUserCollection(prev => ({ ...prev, [key]: isCurrentlyOwned }));
    }
  };

  const getPokemonStats = (pokeName) => {
    return pokemonStatsMap[pokeName] || { total: 0, owned: 0 };
  };

  const getRegionStats = (reg) => {
    const regionPokemons = pokedexList.filter(p => p.id >= reg.range[0] && p.id <= reg.range[1]);
    const totalCount = regionPokemons.length;
    
    let caughtCount = 0;
    regionPokemons.forEach(poke => {
      const stats = pokemonStatsMap[poke.name] || { total: 0, owned: 0 };
      if (stats.owned > 0) {
        caughtCount++;
      }
    });

    const percentage = totalCount > 0 ? (caughtCount / totalCount) * 100 : 0;
    return { caught: caughtCount, total: totalCount, percentage };
  };

  const currentRegionObj = REGIONS.find(r => r.id === selectedRegion) || REGIONS[0];
  const nationalStats = getRegionStats(REGIONS[0]);
  
  const filteredPokedex = pokedexList.filter(poke => {
    const inRegion = poke.id >= currentRegionObj.range[0] && poke.id <= currentRegionObj.range[1];
    if (!inRegion) return false;

    const matchesSearch = poke.name.toLowerCase().includes(searchQuery.toLowerCase()) || poke.id.toString().includes(searchQuery);
    if (!matchesSearch) return false;

    const stats = getPokemonStats(poke.name);
    
    if (filterStatus === 'caught' && stats.owned === 0) return false;
    if (filterStatus === 'missing' && stats.owned > 0) return false;

    return true;
  });

  if (selectedPokemon) {
    const totalCardsCount = pokemonCards.length;

    return (
      <div className="min-h-screen bg-[#16181d] text-white w-full px-6 py-4 relative">
        <div className="flex items-center justify-between mb-6 bg-[#1e222b] p-3.5 rounded-2xl border border-slate-700/60">
          <button 
            type="button"
            onClick={() => setSelectedPokemon(null)}
            className="flex items-center gap-1 text-xs font-bold text-slate-300 hover:text-white cursor-pointer bg-slate-800 border border-slate-700 px-3 py-2 rounded-xl transition-colors"
          >
            <ArrowLeft size={14} /> Retour au Pokédex
          </button>
          <span className="text-sm font-extrabold text-purple-400">
            #{selectedPokemon.id} - {selectedPokemon.name} ({totalCardsCount} carte{totalCardsCount > 1 ? 's' : ''})
          </span>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400">Chargement des cartes...</div>
        ) : pokemonCards.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">Aucune carte trouvée pour {selectedPokemon.name} dans la base.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {pokemonCards.map((card) => {
              const isOwnedNormal = !!userCollection[`${card.id}_normal`];
              const isOwnedReverse = !!userCollection[`${card.id}_reverse`];
              const isOwned = isOwnedNormal || isOwnedReverse;

              return (
                <div 
                  key={card.id}
                  onClick={() => handleCardSelect(card)}
                  className={`border rounded-2xl p-4 flex flex-col items-center transition-all relative cursor-pointer hover:border-indigo-500 hover:scale-[1.02] ${
                    isOwned ? 'border-emerald-500 bg-[#1e222b]' : 'border-slate-800 bg-[#1e222b]/40 opacity-70'
                  }`}
                >
                  {isOwned && (
                    <span className="absolute top-3 right-3 bg-emerald-500 text-white p-1 rounded-full z-10 shadow-md">
                      <Check size={12} />
                    </span>
                  )}

                  {card.image_url ? (
                    <img 
                      src={card.image_url} 
                      alt={card.name} 
                      className="w-full h-64 object-contain rounded-lg mb-4"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}

                  <div className={`w-full h-64 bg-slate-900/60 rounded-lg mb-4 flex-col items-center justify-center gap-2 border border-slate-800 ${card.image_url ? 'hidden' : 'flex'}`}>
                    <ImageOff size={32} className="text-slate-600" />
                    <span className="text-[10px] text-slate-500 text-center px-2">Image non disponible</span>
                  </div>

                  <div className="w-full flex justify-between items-center bg-[#16181d] px-3 py-2 rounded-xl border border-slate-800">
                    <span className="text-xs font-bold text-slate-200 truncate">{card.name}</span>
                    <span className="text-xs font-mono text-slate-400">{card.number || ''}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {selectedCard && (
          <div className="fixed inset-0 z-50 bg-[#0f1115]/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-[#1a1d23] border border-slate-800 w-full max-w-3xl rounded-2xl p-8 relative flex flex-col md:flex-row gap-8 shadow-2xl my-auto">
              <button onClick={() => setSelectedCard(null)} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors cursor-pointer">
                <X size={20} />
              </button>

              <div className="md:w-5/12 flex items-start justify-center bg-[#14161b] p-4 rounded-xl border border-slate-800/80">
                <img src={selectedCard.image_url} alt={selectedCard.name} className="max-h-[380px] w-auto object-contain rounded-lg shadow-xl" />
              </div>

              <div className="md:w-7/12 flex flex-col justify-between gap-6">
                <div>
                  <h2 className="text-2xl font-bold text-white tracking-tight">{selectedCard.name}</h2>
                  <div className="text-sm text-slate-500 font-medium mt-1">
                    {selectedCard.series?.name || selectedCard.set_name || 'Extension'} • #{selectedCard.number || '000'}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm bg-[#14161b] p-4 rounded-xl border border-slate-800/80">
                  <div className="flex flex-col"><span className="text-[10px] uppercase tracking-wider text-slate-600 font-bold">Bloc</span><span className="text-slate-300">{selectedCard.series?.block_name || selectedCard.block || '—'}</span></div>
                  <div className="flex flex-col"><span className="text-[10px] uppercase tracking-wider text-slate-600 font-bold">Série</span><span className="text-slate-300 truncate">{selectedCard.series?.name || selectedCard.set_name || '—'}</span></div>
                  <div className="flex flex-col"><span className="text-[10px] uppercase tracking-wider text-slate-600 font-bold">Type</span><span className="text-slate-300">{Array.isArray(selectedCard.types) ? selectedCard.types.join(', ') : (selectedCard.type || '—')}</span></div>
                  <div className="flex flex-col"><span className="text-[10px] uppercase tracking-wider text-slate-600 font-bold">Rareté</span><span className="text-indigo-400 font-medium">{selectedCard.rarity || '—'}</span></div>
                </div>

                {(() => {
                  const cm = selectedCard.pricing?.cardmarket;
                  const cardPrice = cm?.trend || cm?.avg || cm?.avg1 || selectedCard.market_price || selectedCard.price || 0;
                  const formattedPrice = typeof cardPrice === 'number' ? `${cardPrice.toFixed(2)} €` : `${cardPrice} €`;

                  return (
                    <div className="bg-[#14161b] border border-slate-800/80 p-4 rounded-xl space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                        <TrendingUp size={14} className="text-indigo-400" /> Côte Cardmarket
                      </div>
                      <span className="text-2xl font-black text-white">{formattedPrice}</span>
                    </div>
                  );
                })()}

                <div className="border-t border-slate-800 pt-4 space-y-3">
                  <label className="flex items-center justify-between cursor-pointer group">
                    <span className="text-sm text-slate-400 group-hover:text-white transition-colors">Possédé (Standard)</span>
                    <input type="checkbox" checked={!!userCollection[`${selectedCard.id}_normal`]} onChange={() => handleToggleVariant(selectedCard.id, 'normal')} className="w-5 h-5 rounded border-slate-700 bg-slate-800 checked:bg-indigo-600 cursor-pointer" />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer group">
                    <span className="text-sm text-slate-400 group-hover:text-white transition-colors">Possédé (Reverse)</span>
                    <input type="checkbox" checked={!!userCollection[`${selectedCard.id}_reverse`]} onChange={() => handleToggleVariant(selectedCard.id, 'reverse')} className="w-5 h-5 rounded border-slate-700 bg-slate-800 checked:bg-indigo-600 cursor-pointer" />
                  </label>
                </div>

                <button onClick={() => onNavigateToShop && onNavigateToShop(selectedCard.name)} className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold border border-slate-700 transition-all flex items-center justify-center gap-2 cursor-pointer">
                  <Store size={15} /> Rechercher dans les annonces de la boutique
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#16181d] text-white w-full px-6 py-6 space-y-6">
      
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-black text-white tracking-tight">Pokédex</h1>
        <button type="button" onClick={onBack} className="flex items-center gap-1 text-xs font-bold text-slate-300 hover:text-white cursor-pointer bg-slate-800 border border-slate-700 px-3 py-2 rounded-xl transition-colors">
          <ArrowLeft size={14} /> Retour
        </button>
      </div>

      {/* SÉLECTEUR DE RÉGIONS AVEC STATS DYNAMIQUES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {REGIONS.map((reg) => {
          const isSelected = selectedRegion === reg.id;
          const stats = getRegionStats(reg);
          return (
            <div 
              key={reg.id}
              onClick={() => setSelectedRegion(reg.id)}
              className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between gap-3 ${
                isSelected 
                  ? 'bg-[#1e222b] border-purple-500 shadow-lg shadow-purple-950/20' 
                  : 'bg-[#1a1d24]/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-white">{reg.name}</span>
                <span className="text-xs font-mono text-slate-400">
                  {stats.caught}/{stats.total}
                </span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-purple-500 to-indigo-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${stats.percentage}%` }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>

      {/* BARRE DE PROGRESSION GLOBALE (NATIONAL) */}
      <div className="bg-[#1e222b] border border-slate-800 p-6 rounded-2xl flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <span className="text-base font-black text-white">National</span>
          <span className="text-sm font-mono text-purple-400 font-bold">{nationalStats.caught} / {nationalStats.total}</span>
        </div>
        <div className="w-full bg-slate-900 h-3 rounded-full overflow-hidden p-0.5 border border-slate-800">
          <div 
            className="bg-gradient-to-r from-purple-600 via-indigo-500 to-pink-500 h-full rounded-full transition-all duration-300"
            style={{ width: `${nationalStats.percentage}%` }}
          ></div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-[#1e222b] p-4 rounded-2xl border border-slate-800">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-3 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder="Rechercher un Pokémon par nom ou n°..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#16181d] border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <button 
            onClick={() => setFilterStatus('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${filterStatus === 'all' ? 'bg-indigo-600 text-white' : 'bg-[#16181d] text-slate-400 border border-slate-800 hover:text-white'}`}
          >
            Tous les Pokémon
          </button>
          <button 
            onClick={() => setFilterStatus('caught')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${filterStatus === 'caught' ? 'bg-indigo-600 text-white' : 'bg-[#16181d] text-slate-400 border border-slate-800 hover:text-white'}`}
          >
            Capturés
          </button>
          <button 
            onClick={() => setFilterStatus('missing')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${filterStatus === 'missing' ? 'bg-indigo-600 text-white' : 'bg-[#16181d] text-slate-400 border border-slate-800 hover:text-white'}`}
          >
            Manquants
          </button>
        </div>
      </div>

      {loading && pokedexList.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-sm">Chargement du Pokédex...</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {filteredPokedex.map((poke) => {
            const stats = getPokemonStats(poke.name);

            return (
              <div 
                key={poke.id}
                onClick={() => setSelectedPokemon(poke)}
                className="bg-[#1e222b] border border-slate-800 hover:border-purple-500 cursor-pointer rounded-2xl p-4 flex flex-col items-center transition-all group relative"
              >
                <div className="w-full flex justify-between items-center mb-1">
                  <span className="text-[10px] font-mono text-slate-500">#{poke.id}</span>
                  <span className={`text-[10px] font-mono font-bold ${stats.owned > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {stats.owned}/{stats.total}
                  </span>
                </div>

                <img 
                  src={poke.image_url} 
                  alt={poke.name} 
                  className="w-24 h-24 object-contain group-hover:scale-105 transition-transform my-2" 
                  loading="lazy"
                />
                
                <span className="text-xs font-bold text-slate-200 text-center truncate w-full mt-1">{poke.name}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}