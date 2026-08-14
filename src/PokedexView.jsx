import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { ArrowLeft, Search, Check, ImageOff, X, Store, TrendingUp } from 'lucide-react';
import tcgdex from '@tcgdex/sdk'; // Import du SDK TCGdex

export default function PokedexView({ user, onBack, onNavigateToShop }) {
  const [selectedPokemon, setSelectedPokemon] = useState(null);
  const [pokemonCards, setPokemonCards] = useState([]);
  const [selectedCard, setSelectedCard] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const [pokedexList, setPokedexList] = useState([]);
  const [cardCounts, setCardCounts] = useState({});
  const [userCollection, setUserCollection] = useState({});

  useEffect(() => {
    async function fetchPokedexData() {
      setLoading(true);

      const { data: pokedexData } = await supabase
        .from('pokedex')
        .select('*')
        .order('id', { ascending: true });

      if (pokedexData) {
        setPokedexList(pokedexData);
      }

      if (user) {
        const { data: collData } = await supabase
          .from('user_collection')
          .select('*')
          .eq('user_id', user.id);

        if (collData) {
          const collMap = {};
          collData.forEach(item => {
            // Si le variant en base est null ou vide, on le considère comme 'normal'
            const variantKey = item.variant ? item.variant : 'normal';
            collMap[`${item.card_id}_${variantKey}`] = true;
          });
          setUserCollection(collMap);
        }
      }
      
      const { data: allCards } = await supabase.from('cards').select('id, name');
      
      if (allCards) {
        const counts = {};
        allCards.forEach(card => {
          const cardName = card.name ? card.name.trim().toLowerCase() : '';
          if (cardName) {
            counts[cardName] = (counts[cardName] || 0) + 1;
          }
        });
        setCardCounts(counts);
      }

      setLoading(false);
    }

    fetchPokedexData();
  }, [user]);

  // Chargement des cartes avec la jointure sur la table series (block_name, name)
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
        .ilike('name', selectedPokemon.name)
        .order('release_date', { ascending: false });

      setPokemonCards(data || []);
      setLoading(false);
    }

    if (selectedPokemon) {
      fetchCardsForPokemon();
    }
  }, [selectedPokemon]);

  // Fonction pour charger la carte et récupérer les prix frais via le SDK TCGdex
  const handleCardSelect = async (card) => {
    setSelectedCard(card);
    try {
      console.log("Tentative de fetch direct pour l'ID :", card.id);
      
      // Appel direct à l'API REST de TCGdex (en français)
      const response = await fetch(`https://api.tcgdex.net/v2/fr/cards/${card.id}`);
      
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      
      const fullCard = await response.json();
      console.log("Données reçues de TCGdex :", fullCard);

      if (fullCard && fullCard.pricing) {
        setSelectedCard(prev => ({ ...prev, pricing: fullCard.pricing }));
      } else {
        console.warn("Pas de pricing trouvé pour cette carte.");
      }
    } catch (err) {
      console.error("Erreur détaillée TCGdex :", err);
    }
  };

  const handleToggleVariant = async (cardId, variant) => {
    console.log("CLIC DÉTECTÉ sur la carte :", cardId, "variant :", variant);
    console.log("Utilisateur actuel :", user);

    if (!user) {
      console.warn("Bloqué : Aucun utilisateur détecté (user est null/undefined)");
      return;
    }
    
    const dbVariant = variant === 'normal' ? null : variant;
    const key = `${cardId}_${variant}`;
    const isCurrentlyOwned = !!userCollection[key];

    // Mise à jour visuelle immédiate (Optimiste)
    setUserCollection(prev => {
      const updated = {
        ...prev,
        [key]: !isCurrentlyOwned
      };
      return updated;
    });

    try {
      if (isCurrentlyOwned) {
        // Suppression en base
        let query = supabase
          .from('user_collection')
          .delete()
          .eq('user_id', user.id)
          .eq('card_id', cardId);

        if (dbVariant === null) {
          query = query.is('variant', null);
        } else {
          query = query.eq('variant', dbVariant);
        }

        const { error } = await query;
        if (error) {
          console.error("Erreur suppression collection :", error);
          setUserCollection(prev => ({ ...prev, [key]: true })); // Rollback UI
        }
      } else {
        // Ajout en base
        const { error } = await supabase
          .from('user_collection')
          .insert([{ 
            user_id: user.id, 
            card_id: cardId, 
            variant: dbVariant 
          }]);

        if (error) {
          console.error("Erreur insertion collection :", error);
          setUserCollection(prev => ({ ...prev, [key]: false })); // Rollback UI
        }
      }
    } catch (err) {
      console.error("Erreur synchro Supabase:", err);
      setUserCollection(prev => ({ ...prev, [key]: isCurrentlyOwned })); // Rollback UI
    }
  };

  const filteredPokedex = pokedexList.filter(poke => 
    poke.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    poke.id.toString().includes(searchQuery)
  );

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

        {/* MODALE DE DÉTAILS DE LA CARTE */}
        {selectedCard && (
          <div className="fixed inset-0 z-50 bg-[#0f1115]/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-[#1a1d23] border border-slate-800 w-full max-w-3xl rounded-2xl p-8 relative flex flex-col md:flex-row gap-8 shadow-2xl my-auto">
              
              <button 
                onClick={() => setSelectedCard(null)}
                className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>

              <div className="md:w-5/12 flex items-start justify-center bg-[#14161b] p-4 rounded-xl border border-slate-800/80">
                <img 
                  src={selectedCard.image_url} 
                  alt={selectedCard.name} 
                  className="max-h-[380px] w-auto object-contain rounded-lg shadow-xl"
                />
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
                  <div className="flex flex-col col-span-2"><span className="text-[10px] uppercase tracking-wider text-slate-600 font-bold">Illustrateur</span><span className="text-slate-300 truncate">{selectedCard.illustrator || '—'}</span></div>
                </div>

                {/* Bloc Côte Cardmarket branché sur le SDK */}
                {(() => {
                  const cm = selectedCard.pricing?.cardmarket;
                  const cardPrice = cm?.trend || cm?.avg || cm?.avg1 || selectedCard.market_price || selectedCard.price || 0;
                  const formattedPrice = typeof cardPrice === 'number' ? `${cardPrice.toFixed(2)} €` : `${cardPrice} €`;

                  return (
                    <div className="bg-[#14161b] border border-slate-800/80 p-4 rounded-xl space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                        <TrendingUp size={14} className="text-indigo-400" /> Côte Cardmarket (Indicative)
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-white">{formattedPrice}</span>
                        <span className="text-xs text-slate-500">moyenne générale</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Sélection Possession (Ma Collection) */}
                <div className="border-t border-slate-800 pt-4 space-y-3">
                  <label className="flex items-center justify-between cursor-pointer group">
                    <span className="text-sm text-slate-400 group-hover:text-white transition-colors">Possédé dans ma collection (Standard)</span>
                    <input 
                      type="checkbox" 
                      checked={!!userCollection[`${selectedCard.id}_normal`]}
                      onChange={() => handleToggleVariant(selectedCard.id, 'normal')}
                      className="w-5 h-5 rounded border-slate-700 bg-slate-800 checked:bg-indigo-600 focus:ring-0 cursor-pointer"
                    />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer group">
                    <span className="text-sm text-slate-400 group-hover:text-white transition-colors">Possédé dans ma collection (Reverse)</span>
                    <input 
                      type="checkbox" 
                      checked={!!userCollection[`${selectedCard.id}_reverse`]}
                      onChange={() => handleToggleVariant(selectedCard.id, 'reverse')}
                      className="w-5 h-5 rounded border-slate-700 bg-slate-800 checked:bg-indigo-600 focus:ring-0 cursor-pointer"
                    />
                  </label>
                </div>

                {/* CTA Boutique globale */}
                <button
                  onClick={() => {
                    if (onNavigateToShop) {
                      onNavigateToShop(selectedCard.name);
                    }
                  }}
                  className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold border border-slate-700 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                >
                  <Store size={15} /> Rechercher dans les annonces de toute la boutique
                </button>

              </div>
            </div>
          </div>
        )}

      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#16181d] text-white w-full px-6 py-4">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6 bg-[#1e222b] p-4 rounded-2xl border border-slate-700/65">
        <h1 className="text-lg font-black text-white">Pokédex National ({pokedexList.length})</h1>
        
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder="Rechercher par nom ou numéro..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#16181d] border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
          />
        </div>

        <button type="button" onClick={onBack} className="flex items-center gap-1 text-xs font-bold text-slate-300 hover:text-white cursor-pointer bg-slate-800 border border-slate-700 px-3 py-2 rounded-xl transition-colors">
          <ArrowLeft size={14} /> Retour
        </button>
      </div>

      {loading && pokedexList.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-sm">Chargement du Pokédex...</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-4">
          {filteredPokedex.map((poke) => {
            const pokeKey = poke.name.trim().toLowerCase();
            const count = cardCounts[pokeKey] || 0;

            return (
              <div 
                key={poke.id}
                onClick={() => setSelectedPokemon(poke)}
                className="bg-[#1e222b] border border-slate-700/60 hover:border-purple-500 cursor-pointer rounded-2xl p-3 flex flex-col items-center transition-all group"
              >
                <span className="text-[10px] font-mono text-slate-400 self-start mb-1">#{poke.id}</span>
                <img 
                  src={poke.image_url} 
                  alt={poke.name} 
                  className="w-24 h-24 object-contain group-hover:scale-105 transition-transform my-2" 
                  loading="lazy"
                />
                <span className="text-xs font-bold text-slate-200 text-center truncate w-full mt-1">{poke.name}</span>
                <span className={`text-[10px] mt-1 ${count > 0 ? 'text-purple-400 font-bold' : 'text-slate-500'}`}>
                  {count} carte{count > 1 ? 's' : ''}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}