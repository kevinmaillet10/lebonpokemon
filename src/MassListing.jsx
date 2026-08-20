import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';

export default function MassListing({ selectedSeries, onBack, userId, onListingsCreated }) {
  const [cards, setCards] = useState([]);
  const [loadingCards, setLoadingCards] = useState(true);
  const [quantities, setQuantities] = useState({});
  const [selectedCards, setSelectedCards] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // États pour la tarification globale en haut de page
  const [globalNormalePrice, setGlobalNormalePrice] = useState('');
  const [globalRarePrice, setGlobalRarePrice] = useState('');
  const [globalReversePrice, setGlobalReversePrice] = useState('');

  useEffect(() => {
    if (selectedSeries?.id) {
      fetchCardsForSeries(selectedSeries.id);
    }
  }, [selectedSeries]);

  async function fetchCardsForSeries(seriesId) {
    try {
      setLoadingCards(true);
      const { data, error } = await supabase
        .from('cards')
        .select('*')
        .eq('set_id', seriesId);

      if (error) throw error;

      const sortedData = (data || []).sort((a, b) => {
        const numA = parseInt(a.number, 10);
        const numB = parseInt(b.number, 10);

        if (!isNaN(numA) && !isNaN(numB)) {
          return numA - numB;
        }
        return String(a.number).localeCompare(String(b.number));
      });

      setCards(sortedData);
      setSelectedCards({});

    } catch (err) {
      console.error("Erreur chargement cartes :", err);
    } finally {
      setLoadingCards(false);
    }
  }

  // Gérer la sélection d'une carte unique
  const handleToggleCardSelection = (cardId) => {
    setSelectedCards(prev => ({
      ...prev,
      [cardId]: !prev[cardId]
    }));
  };

  // Tout cocher / Tout décocher
  const handleToggleSelectAll = () => {
    const allChecked = cards.every(c => selectedCards[c.id]);
    const newSelection = {};
    cards.forEach(c => {
      newSelection[c.id] = !allChecked;
    });
    setSelectedCards(newSelection);
  };

  // Détermine dynamiquement les options de la 3ème variante (Spéciale) par carte (priorité BDD puis repli série)
  const getCardSpecialVariantsOptions = (card, seriesName) => {
    // 1. Si la carte possède des variantes spécifiques configurées en BDD
    if (card?.special_variants && Array.isArray(card.special_variants) && card.special_variants.length > 0) {
      return card.special_variants.map(v => ({ value: v, label: v }));
    }

    // 2. Sinon, repli sur la logique globale par nom de série
    const name = (seriesName || '').toLowerCase();

    const isPrismaticOrBlackLightningWhiteFlame = 
      name.includes('évolution prismatique') || 
      name.includes('foudre noire') || 
      name.includes('flammes blanche');

    const isTranscendentHeroes = name.includes('héros transcendant');

    const baseOptions = [
      { value: 'Holo cosmo', label: 'Holo cosmo' },
      { value: 'Holo ligne', label: 'Holo ligne' },
      { value: 'Holo mirage', label: 'Holo mirage' },
      { value: 'Holo étoile', label: 'Holo étoile' },
      { value: 'Stamp', label: 'Stamp' }
    ];

    if (isPrismaticOrBlackLightningWhiteFlame) {
      return [
        ...baseOptions,
        { value: 'Pokéball', label: 'Pokéball' },
        { value: 'Masterball', label: 'Masterball' }
      ];
    }

    if (isTranscendentHeroes) {
      return [
        ...baseOptions,
        { value: 'Pokéball', label: 'Pokéball' },
        { value: 'Copain ball', label: 'Copain ball' },
        { value: 'Love ball', label: 'Love ball' },
        { value: 'Sombre ball', label: 'Sombre ball' },
        { value: 'Rapide ball', label: 'Rapide ball' },
        { value: 'Rocket', label: 'Rocket' }
      ];
    }

    // Par défaut pour toutes les autres séries
    return baseOptions;
  };

  // Détermine dynamiquement les lignes de variantes autorisées selon la rareté
  const getCardSlotsConfig = (card) => {
    const rarity = (card?.rarity || '').toLowerCase();
    
    const highRarities = [
      'double rare',
      'méga hyper rare',
      'illustration spéciale rare',
      'ultra rare',
      'illustration rare',
      'high-tecg rare',
      'shiny rare'
    ];

    const isHighRarity = highRarities.some(r => rarity.includes(r));

    if (isHighRarity) {
      return [
        { key: 'v1', finish: 'Normale', label: 'Normale', type: 'fixed', color: 'text-emerald-400' }
      ];
    }

    return [
      { key: 'v1', finish: 'Normale', label: 'Normale', type: 'fixed', color: 'text-emerald-400' },
      { key: 'v2', finish: 'Reverse', label: 'Reverse', type: 'fixed', color: 'text-cyan-400' },
      { key: 'v3', finish: 'Holo cosmo', label: 'Spéciale', type: 'select', color: 'text-indigo-300' }
    ];
  };

  const handleVariantChange = (cardId, slot, field, value, defaultFinish = 'Normale') => {
    setQuantities(prev => {
      const cardSlots = prev[cardId] || {};
      const currentSlotData = cardSlots[slot] || { finish: defaultFinish, quantity: '', price: '' };

      return {
        ...prev,
        [cardId]: {
          ...cardSlots,
          [slot]: {
            ...currentSlotData,
            [field]: value
          }
        }
      };
    });
  };

  const handleApplyGlobalPrices = () => {
    const hasAnySelected = cards.some(c => selectedCards[c.id]);
    if (!hasAnySelected) {
      setErrorMessage("Veuillez cocher au moins une carte pour appliquer les prix.");
      return;
    }
    setErrorMessage('');

    setQuantities(prev => {
      const updated = { ...prev };

      cards.forEach(card => {
        if (!selectedCards[card.id]) return;

        const rarity = (card.rarity || '').toLowerCase();
        const isCommonOrUncommon = rarity.includes('commune') || rarity.includes('peu commune');
        const isRare = rarity.includes('rare') && !rarity.includes('double') && !rarity.includes('ultra') && !rarity.includes('illustration') && !rarity.includes('hyper') && !rarity.includes('shiny') && !rarity.includes('special');

        const cardSlots = updated[card.id] || {
          v1: { finish: 'Normale', quantity: '', price: '' },
          v2: { finish: 'Reverse', quantity: '', price: '' },
          v3: { finish: 'Holo cosmo', quantity: '', price: '' }
        };

        if (globalNormalePrice !== '' && isCommonOrUncommon && cardSlots.v1) {
          cardSlots.v1 = { ...cardSlots.v1, price: globalNormalePrice };
        }

        if (globalRarePrice !== '' && isRare && cardSlots.v1) {
          cardSlots.v1 = { ...cardSlots.v1, price: globalRarePrice };
        }

        if (globalReversePrice !== '' && cardSlots.v2) {
          cardSlots.v2 = { ...cardSlots.v2, price: globalReversePrice };
        }

        updated[card.id] = cardSlots;
      });

      return updated;
    });

    setSuccessMessage("Prix appliqués aux cartes sélectionnées !");
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!userId) {
      setErrorMessage("Erreur : Utilisateur non identifié.");
      return;
    }

    setSubmitting(true);

    try {
      let totalUpdatedOrCreated = 0;

      for (const [cardId, slots] of Object.entries(quantities)) {
        const cardInfo = cards.find(c => c.id === cardId);
        if (!cardInfo) continue;

        const cardTitle = cardInfo.name;
        const cardImage = Array.isArray(cardInfo.image_url) ? cardInfo.image_url[0] : cardInfo.image_url;
        const extensionId = cardInfo.set_id;

        const slotsConfig = getCardSlotsConfig(cardInfo);

        for (const config of slotsConfig) {
          const slotData = slots[config.key];
          if (!slotData) continue;

          const qty = parseInt(slotData.quantity, 10);
          const price = parseFloat(slotData.price);

          if (qty > 0 && !isNaN(price)) {
            const finishValue = slotData.finish || config.finish;
            const formattedTitle = finishValue !== 'Normale' 
              ? `${cardTitle} (${finishValue})` 
              : cardTitle;

            const { data: existingListings, error: fetchError } = await supabase
              .from('listings')
              .select('id, quantity')
              .eq('user_id', userId)
              .eq('tcgdex_card_id', cardId)
              .eq('finish', finishValue)
              .eq('condition', 'Near Mint');

            if (fetchError) throw fetchError;

            if (existingListings && existingListings.length > 0) {
              const existing = existingListings[0];
              const currentQty = typeof existing.quantity === 'number' ? existing.quantity : 1;
              const newQty = currentQty + qty;

              const { error: updateError } = await supabase
                .from('listings')
                .update({ 
                  quantity: newQty,
                  price: price 
                })
                .eq('id', existing.id);

              if (updateError) throw updateError;
            } else {
              const { error: insertError } = await supabase
                .from('listings')
                .insert({
                  user_id: userId,
                  seller_id: userId,
                  tcgdex_card_id: cardId,
                  title: formattedTitle,
                  price: price,
                  condition: 'Near Mint',
                  language: 'Français',
                  finish: finishValue,
                  image_url: cardImage,
                  extension_id: extensionId,
                  quantity: qty
                });

              if (insertError) throw insertError;
            }

            totalUpdatedOrCreated++;
          }
        }
      }

      if (totalUpdatedOrCreated === 0) {
        setErrorMessage("Veuillez renseigner au moins une quantité et un prix valide.");
        setSubmitting(false);
        return;
      }

      setSuccessMessage(`${totalUpdatedOrCreated} référence(s) enregistrée(s) ou mise(s) à jour avec succès !`);
      setQuantities({});

      setTimeout(() => {
        window.location.reload();
      }, 600);

    } catch (err) {
      console.error("Erreur lors de l'ajout en masse :", err);
      setErrorMessage(err?.message || String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#424542] text-white w-full px-6 py-4 space-y-6">
      {/* En-tête */}
      <div className="w-full flex items-center justify-between pb-4 border-b border-slate-800/80 bg-[#1e222b] p-4 rounded-2xl border border-slate-700/60 shadow-sm">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-xs font-bold text-slate-300 hover:text-white cursor-pointer bg-slate-800 border border-slate-700 px-3 py-2 rounded-xl transition-colors shadow-sm"
        >
          ← Retour aux séries
        </button>
        <div className="text-right">
          <h2 className="text-xl font-bold text-white">Ajout en masse : {selectedSeries?.name}</h2>
          <p className="text-xs text-slate-400">Renseignez vos quantités et prix pour chaque variante</p>
        </div>
      </div>

      {/* Barre de prix globaux et Sélection */}
      <div className="bg-[#1e222b] border border-slate-700/60 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleToggleSelectAll}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-3 py-2 rounded-xl transition-colors border border-slate-700 cursor-pointer shadow-sm"
          >
            Tout cocher / décocher
          </button>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-white">Application ciblée</span>
            <span className="text-[10px] text-slate-400">Applique les tarifs uniquement aux cartes cochées</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 px-2.5 py-1.5 rounded-lg">
            <span className="text-[11px] text-emerald-400 font-semibold">Normale (C/PC)</span>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="Prix"
              value={globalNormalePrice}
              onChange={(e) => setGlobalNormalePrice(e.target.value)}
              className="w-16 text-right bg-slate-800 text-white rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <span className="text-[10px] text-slate-400">€</span>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 px-2.5 py-1.5 rounded-lg">
            <span className="text-[11px] text-amber-400 font-semibold">Rare (Étoile)</span>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="Prix"
              value={globalRarePrice}
              onChange={(e) => setGlobalRarePrice(e.target.value)}
              className="w-16 text-right bg-slate-800 text-white rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
            <span className="text-[10px] text-slate-400">€</span>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 px-2.5 py-1.5 rounded-lg">
            <span className="text-[11px] text-cyan-400 font-semibold">Reverse</span>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="Prix"
              value={globalReversePrice}
              onChange={(e) => setGlobalReversePrice(e.target.value)}
              className="w-16 text-right bg-slate-800 text-white rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
            <span className="text-[10px] text-slate-400">€</span>
          </div>

          <button
            type="button"
            onClick={handleApplyGlobalPrices}
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors cursor-pointer shadow-sm"
          >
            Appliquer à la sélection
          </button>
        </div>
      </div>

      {loadingCards ? (
        <div className="text-center py-12 text-slate-400 font-medium">Chargement des cartes de la série...</div>
      ) : cards.length === 0 ? (
        <div className="text-center py-12 bg-[#1e222b] rounded-2xl border border-slate-700/60 p-6 text-slate-400 font-medium">
          Aucune carte trouvée pour cette série.
        </div>
      ) : (
        <form onSubmit={handleBulkSubmit} className="space-y-4">
          {/* Grille de cartes */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {cards.map((card) => {
              const slotsConfig = getCardSlotsConfig(card);
              const cardSlots = quantities[card.id] || {};
              const isChecked = !!selectedCards[card.id];
              const cardSpecialOptions = getCardSpecialVariantsOptions(card, selectedSeries?.name);

              return (
                <div 
                  key={card.id} 
                  className={`bg-[#1e222b] border rounded-2xl p-3 flex flex-col gap-3 transition-all shadow-sm ${
                    isChecked ? 'border-emerald-500/70 bg-[#1e222b]' : 'border-slate-700/60 opacity-75'
                  }`}
                >
                  {/* En-tête de la carte avec Checkbox */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative group w-24 h-32 flex-shrink-0 flex items-center justify-center">
                        <img 
                          src={Array.isArray(card.image_url) ? card.image_url[0] : card.image_url} 
                          alt={card.name} 
                          className="w-24 h-32 object-contain rounded-lg shadow-md transition-all duration-300 ease-in-out group-hover:scale-[2] group-hover:z-50 group-hover:shadow-2xl absolute left-0 top-0 cursor-zoom-in bg-slate-900/90 p-1 border border-slate-700/50" 
                        />
                      </div>
                      <div className="flex flex-col overflow-hidden">
                        <div className="text-white font-bold text-sm truncate">{card.name}</div>
                        <div className="text-xs text-slate-400 font-medium mt-0.5">#{card.number}</div>
                        <div className="text-[10px] text-slate-500 truncate mt-1">{selectedSeries?.name}</div>
                      </div>
                    </div>

                    {/* Checkbox de sélection */}
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleCardSelection(card.id)}
                      className="w-5 h-5 accent-emerald-500 rounded cursor-pointer self-start mt-1"
                    />
                  </div>

                  {/* Lignes de variantes */}
                  <div className="flex flex-col gap-2">
                    {slotsConfig.map((config) => {
                      const slotData = cardSlots[config.key] || { finish: config.finish, quantity: '', price: '' };

                      return (
                        <div key={config.key} className="bg-[#16181d] px-2.5 py-1.5 rounded-lg border border-slate-800 flex items-center justify-between gap-1">
                          {config.type === 'select' ? (
                            <select
                              value={slotData.finish}
                              onChange={(e) => handleVariantChange(card.id, config.key, 'finish', e.target.value, config.finish)}
                              className="bg-slate-900 border border-slate-700 text-indigo-300 rounded px-1 py-1 text-[10px] focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold w-24"
                            >
                              {cardSpecialOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                          ) : (
                            <span className={`text-[11px] font-semibold ${config.color}`}>{config.label}</span>
                          )}

                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="0"
                              placeholder="Qté"
                              value={slotData.quantity}
                              onChange={(e) => handleVariantChange(card.id, config.key, 'quantity', e.target.value, config.finish)}
                              className="w-12 text-center bg-slate-900 border border-slate-700 text-white rounded px-1 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                            <div className="relative flex items-center">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="Prix"
                                value={slotData.price}
                                onChange={(e) => handleVariantChange(card.id, config.key, 'price', e.target.value, config.finish)}
                                className="w-16 text-right bg-slate-900 border border-slate-700 text-white rounded pl-1 pr-4 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                              <span className="absolute right-1.5 text-[10px] text-slate-400">€</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Barre d'action sticky en bas */}
          <div className="flex items-center justify-between sticky bottom-4 bg-[#1e222b]/95 backdrop-blur-md p-4 rounded-xl shadow-xl border border-slate-700/60 z-40">
            <div>
              {successMessage && <span className="text-xs font-bold text-emerald-400">{successMessage}</span>}
              {errorMessage && <span className="text-xs font-bold text-rose-400">{errorMessage}</span>}
              {!successMessage && !errorMessage && (
                <span className="text-xs text-slate-400">Cochez vos cartes, définissez vos prix puis validez l'enregistrement.</span>
              )}
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="bg-[#00B884] hover:bg-[#00a273] text-white text-xs font-bold px-6 py-3 rounded-xl transition-colors shadow-md cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Enregistrement en cours...' : 'Publier les sélections'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}