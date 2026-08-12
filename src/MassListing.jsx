import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';

export default function MassListing({ selectedSeries, onBack, userId, onListingsCreated }) {
  const [cards, setCards] = useState([]);
  const [loadingCards, setLoadingCards] = useState(true);
  const [quantities, setQuantities] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

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
    } catch (err) {
      console.error("Erreur chargement cartes :", err);
    } finally {
      setLoadingCards(false);
    }
  }

  const handleVariantChange = (cardId, slot, field, value) => {
    setQuantities(prev => {
      const cardSlots = prev[cardId] || {
        v1: { finish: 'Normal', quantity: '', price: '' },
        v2: { finish: 'Reverse', quantity: '', price: '' },
        v3: { finish: 'Holo', quantity: '', price: '' }
      };

      return {
        ...prev,
        [cardId]: {
          ...cardSlots,
          [slot]: {
            ...cardSlots[slot],
            [field]: value
          }
        }
      };
    });
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
        const cardTitle = cardInfo ? cardInfo.name : 'Carte sans titre';
        
        const cardImage = cardInfo ? (Array.isArray(cardInfo.image_url) ? cardInfo.image_url[0] : cardInfo.image_url) : null;
        const extensionId = cardInfo ? cardInfo.set_id : null;

        for (const slotKey of ['v1', 'v2', 'v3']) {
          const slotData = slots[slotKey];
          if (!slotData) continue;

          const qty = parseInt(slotData.quantity, 10);
          const price = parseFloat(slotData.price);

          if (qty > 0 && !isNaN(price)) {
            const finishValue = slotData.finish || (slotKey === 'v2' ? 'Reverse' : slotKey === 'v3' ? 'Holo' : 'Normal');
            const formattedTitle = finishValue !== 'Normal' 
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

      // On force le rechargement propre de la page pour actualiser l'affichage instantanément
      setTimeout(() => {
        window.location.reload();
      }, 600);

    } catch (err) {
      console.error("Erreur lors de l'ajout en masse :", err);
      const errorMsg = err?.message || err?.error_description || err?.details || String(err);
      setErrorMessage(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#424542] text-white w-full px-6 py-4 space-y-6">
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

      {loadingCards ? (
        <div className="text-center py-12 text-slate-400 font-medium">Chargement des cartes de la série...</div>
      ) : cards.length === 0 ? (
        <div className="text-center py-12 bg-[#1e222b] rounded-2xl border border-slate-700/60 p-6 text-slate-400 font-medium">
          Aucune carte trouvée pour cette série.
        </div>
      ) : (
        <form onSubmit={handleBulkSubmit} className="space-y-6">
          <div className="bg-[#1e222b] rounded-2xl shadow-sm border border-slate-700/60 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#16181d] border-b border-slate-800 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Carte</th>
                    <th className="py-3 px-4">Nom</th>
                    <th className="py-3 px-4 text-emerald-400">Normale (Qté / Prix)</th>
                    <th className="py-3 px-4 text-cyan-400">Reverse (Qté / Prix)</th>
                    <th className="py-3 px-4 text-indigo-400">Variante Spéciale (Type / Qté / Prix)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-sm">
                  {cards.map((card) => {
                    const cardSlots = quantities[card.id] || {
                      v1: { finish: 'Normal', quantity: '', price: '' },
                      v2: { finish: 'Reverse', quantity: '', price: '' },
                      v3: { finish: 'Holo', quantity: '', price: '' }
                    };

                    return (
                      <tr key={card.id} className="hover:bg-[#16181d]/50 transition-colors">
                        {/* Image */}
                        <td className="py-3 px-4 w-16 relative">
                          <img 
                            src={Array.isArray(card.image_url) ? card.image_url[0] : card.image_url} 
                            alt={card.name} 
                            className="w-12 h-16 object-contain rounded-md shadow-md transition-transform duration-200 hover:scale-[2.5] hover:z-50 relative origin-left cursor-pointer bg-slate-900/50 p-0.5 border border-slate-700/50" 
                          />
                        </td>
                        
                        {/* Nom */}
                        <td className="py-3 px-4 font-semibold text-slate-200 w-48">
                          {card.name} <span className="text-xs text-slate-400 font-normal">#{card.number}</span>
                        </td>

                        {/* SLOT 1 : NORMALE */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="bg-[#16181d] border border-slate-700 text-slate-300 rounded-lg px-3 py-1.5 text-xs inline-block text-center font-medium">
                              Normale
                            </span>
                            <input
                              type="number"
                              min="0"
                              placeholder="Qté"
                              value={cardSlots.v1.quantity}
                              onChange={(e) => handleVariantChange(card.id, 'v1', 'quantity', e.target.value)}
                              className="w-14 text-center bg-[#16181d] border border-slate-700 text-white rounded-lg px-1 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                            <div className="relative flex items-center w-24">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                                value={cardSlots.v1.price}
                                onChange={(e) => handleVariantChange(card.id, 'v1', 'price', e.target.value)}
                                className="w-full bg-[#16181d] border border-slate-700 text-white rounded-lg pl-2 pr-6 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 text-right"
                              />
                              <span className="absolute right-2 text-slate-400 text-[10px] font-bold">€</span>
                            </div>
                          </div>
                        </td>

                        {/* SLOT 2 : REVERSE */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="bg-[#16181d] border border-slate-700 text-slate-300 rounded-lg px-3 py-1.5 text-xs inline-block text-center font-medium">
                              Reverse
                            </span>
                            <input
                              type="number"
                              min="0"
                              placeholder="Qté"
                              value={cardSlots.v2.quantity}
                              onChange={(e) => handleVariantChange(card.id, 'v2', 'quantity', e.target.value)}
                              className="w-14 text-center bg-[#16181d] border border-slate-700 text-white rounded-lg px-1 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                            <div className="relative flex items-center w-24">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                                value={cardSlots.v2.price}
                                onChange={(e) => handleVariantChange(card.id, 'v2', 'price', e.target.value)}
                                className="w-full bg-[#16181d] border border-slate-700 text-white rounded-lg pl-2 pr-6 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 text-right"
                              />
                              <span className="absolute right-2 text-slate-400 text-[10px] font-bold">€</span>
                            </div>
                          </div>
                        </td>

                        {/* SLOT 3 : VARIANTE SPÉCIALE */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <select
                              value={cardSlots.v3.finish}
                              onChange={(e) => handleVariantChange(card.id, 'v3', 'finish', e.target.value)}
                              className="bg-[#16181d] border border-slate-700 text-white rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            >
                              <option value="Holo cosmo">Holo cosmo</option>
                              <option value="Holo étoile">Holo étoile</option>
                              <option value="Holo ligne">Holo ligne</option>
                              <option value="Holo mirage">Holo mirage</option>
                              <option value="Pokéball">Pokéball</option>
                              <option value="Masterball">Masterball</option>
                              <option value="Stamp">Stamp</option>
                            </select>
                            <input
                              type="number"
                              min="0"
                              placeholder="Qté"
                              value={cardSlots.v3.quantity}
                              onChange={(e) => handleVariantChange(card.id, 'v3', 'quantity', e.target.value)}
                              className="w-14 text-center bg-[#16181d] border border-slate-700 text-white rounded-lg px-1 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                            <div className="relative flex items-center w-24">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                                value={cardSlots.v3.price}
                                onChange={(e) => handleVariantChange(card.id, 'v3', 'price', e.target.value)}
                                className="w-full bg-[#16181d] border border-slate-700 text-white rounded-lg pl-2 pr-6 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 text-right"
                              />
                              <span className="absolute right-2 text-slate-400 text-[10px] font-bold">€</span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-between sticky bottom-4 bg-[#1e222b]/95 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-slate-700/60 z-40">
            <div>
              {successMessage && <span className="text-xs font-bold text-emerald-400">{successMessage}</span>}
              {errorMessage && <span className="text-xs font-bold text-rose-400">{errorMessage}</span>}
              {!successMessage && !errorMessage && (
                <span className="text-xs text-slate-400">Remplissez les variantes souhaitées puis validez l'enregistrement.</span>
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