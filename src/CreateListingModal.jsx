import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabase';
import SecurityBanner from './SecurityBanner';
import TCGdex from '@tcgdex/sdk';

// Initialisation du SDK TCGdex en français
const tcgdex = new TCGdex('fr');

export default function CreateListingModal({ isOpen, onClose, onCreated, userId, onListingCreated }) {
  const [currentUserId, setCurrentUserId] = useState(userId);
  const [mode, setMode] = useState('details'); 

  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [condition, setCondition] = useState('MINT');
  const [finish, setFinish] = useState('Normale');
  
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const fileInputRef = useRef(null);

  const [selectedCard, setSelectedCard] = useState(null);

  const [blocks, setBlocks] = useState([]);
  const [selectedBlock, setSelectedBlock] = useState('');
  const [seriesList, setSeriesList] = useState([]);
  const [selectedSeriesId, setSelectedSeriesId] = useState('');
  const [cardsList, setCardsList] = useState([]);
  const [loadingCards, setLoadingCards] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fallbackSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="240" height="330" viewBox="0 0 240 330"><rect width="100%" height="100%" fill="%231e293b"/><text x="50%" y="50%" fill="%2394a3b8" font-family="sans-serif" font-size="14" font-weight="bold" text-anchor="middle" dominant-baseline="middle">Pas d'image</text></svg>`;

  const getCardImageUrl = (card) => {
    if (!card) return null;

    // 1. Si card.image_url existe (venant de tes annonces ou d'une sélection précédente)
    if (card.image_url) {
      if (Array.isArray(card.image_url)) return card.image_url[0];
      if (typeof card.image_url === 'string' && card.image_url.trim() !== '') return card.image_url;
    }

    // 2. Si card.image est un objet (ex: { low, high } de TCGdex) -> on privilégie high puis low pour la qualité
    if (card.image && typeof card.image === 'object') {
      return card.image.high || card.image.low || null;
    }

    // 3. Si card.image est une chaîne HTTP directe
    if (typeof card.image === 'string' && card.image.startsWith('http')) {
      // Si l'URL se termine déjà par un format ou slashe, on la renvoie, sinon on ajoute /low.webp comme tu le faisais
      if (card.image.endsWith('.webp') || card.image.endsWith('.jpg') || card.image.endsWith('.png')) {
        return card.image;
      }
      return `${card.image}/low.webp`;
    }

    // 4. Construction dynamique de secours via les IDs TCGdex (avec ton format d'origine)
    const setId = card.set_id || card.set?.id;
    const localId = card.localId || card.id;
    if (setId && localId) {
      return `https://assets.tcgdex.net/fr/${setId}/${localId}/low.webp`;
    }

    return null;
  };

  useEffect(() => {
    setCurrentUserId(userId);
    if (!userId && isOpen) {
      const getActiveUser = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setCurrentUserId(session.user.id);
        }
      };
      getActiveUser();
    }
  }, [userId, isOpen]);

  useEffect(() => {
    if (isOpen) {
      fetchBlocks();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedBlock) {
      fetchSeriesByBlock(selectedBlock);
    } else {
      setSeriesList([]);
      setSelectedSeriesId('');
    }
  }, [selectedBlock]);

  useEffect(() => {
    if (selectedSeriesId) {
      fetchCardsBySeries(selectedSeriesId);
    } else {
      setCardsList([]);
    }
  }, [selectedSeriesId]);

  async function fetchBlocks() {
    try {
      const response = await tcgdex.fetch('series');
      if (response) {
        const uniqueBlocks = [...new Set(response.map(item => item.block || item.block_name || item.name).filter(Boolean))];
        setBlocks(uniqueBlocks);
      }
    } catch (err) {
      console.error("Erreur chargement blocs TCGdex :", err);
    }
  }

  async function fetchSeriesByBlock(blockName) {
    try {
      const response = await tcgdex.fetch('series', blockName.toLowerCase());
      if (response && response.sets) {
        setSeriesList(response.sets);
      } else {
        const allSets = await tcgdex.fetch('sets');
        if (allSets) {
          const filtered = allSets.filter(s => s.serie?.name === blockName || s.block === blockName);
          setSeriesList(filtered);
        } else {
          setSeriesList([]);
        }
      }
    } catch (err) {
      console.error("Erreur chargement séries TCGdex :", err);
      setSeriesList([]);
    }
  }

  async function fetchCardsBySeries(seriesId) {
    try {
      setLoadingCards(true);
      const setInfo = await tcgdex.fetch('sets', seriesId);

      if (setInfo && setInfo.cards) {
        const blockMatch = seriesId.match(/^([a-zA-Z]+)/);
        const block = blockMatch ? blockMatch[1].toLowerCase() : seriesId;

        const formattedCards = setInfo.cards.map(card => {
          const localId = card.localId || (card.id && card.id.includes('-') ? card.id.split('-').pop() : card.id);
          const directImageUrl = `https://assets.tcgdex.net/fr/${block}/${seriesId}/${localId}/low.webp`;

          return {
            id: card.id,
            set_id: seriesId,
            name: card.name,
            local_id: localId,
            image: directImageUrl
          };
        });

        setCardsList(formattedCards);
      } else {
        setCardsList([]);
      }
    } catch (err) {
      console.error("Erreur chargement cartes TCGdex :", err);
      setCardsList([]);
    } finally {
      setLoadingCards(false);
    }
  }

  const handleSelectCard = async (cardItem) => {
    try {
      const fullCard = await tcgdex.fetch('cards', cardItem.id);
      const cardToUse = fullCard || cardItem;

      let resolvedSetId = cardToUse.set_id || cardItem.set_id;
      if (!resolvedSetId && cardToUse.set && cardToUse.set.id) {
        resolvedSetId = cardToUse.set.id;
      }
      if (!resolvedSetId && cardToUse.id && cardToUse.id.includes('-')) {
        resolvedSetId = cardToUse.id.split('-')[0];
      }

      const enrichedCard = {
        ...cardToUse,
        set_id: resolvedSetId
      };

      setSelectedCard(enrichedCard);

      if (enrichedCard.pricing && enrichedCard.pricing.cardmarket) {
        const cm = enrichedCard.pricing.cardmarket;
        const suggestedPrice = cm.trend || cm.avg || cm.avg1;
        if (suggestedPrice) {
          setPrice(suggestedPrice.toString());
        }
      }

      setMode('details');
    } catch (err) {
      console.error("Erreur lors de la récupération des détails de la carte :", err);
      setSelectedCard(cardItem);
      setMode('details');
    }
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files || []).slice(0, 5);
    if (files.length > 0) {
      setImageFiles(files);
      const previews = files.map(file => URL.createObjectURL(file));
      setImagePreviews(previews);
      setSelectedCard(null);
    }
  };

  const removeImage = (index) => {
    const newFiles = imageFiles.filter((_, i) => i !== index);
    const newPreviews = imagePreviews.filter((_, i) => i !== index);
    setImageFiles(newFiles);
    setImagePreviews(newPreviews);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUserId) {
      setErrorMsg("Vous devez être connecté pour publier une annonce.");
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');

      let imageUrls = [];
      if (selectedCard) {
        const resolvedUrl = getCardImageUrl(selectedCard);
        imageUrls = [resolvedUrl];
      }

      if (imageFiles.length > 0) {
        for (const file of imageFiles) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${currentUserId}-${Math.random()}.${fileExt}`;
          const { error: uploadError } = await supabase.storage
            .from('card-images')
            .upload(fileName, file);

          if (uploadError) throw uploadError;

          const { data: publicUrlData } = supabase.storage
            .from('card-images')
            .getPublicUrl(fileName);

          imageUrls.push(publicUrlData.publicUrl);
        }
      }

      const listingPayload = {
        user_id: currentUserId,
        seller_id: currentUserId,
        tcgdex_card_id: selectedCard ? selectedCard.id : null,
        extension_id: selectedCard ? selectedCard.set_id : null,
        title: selectedCard ? `${selectedCard.name} (${finish})` : `${title} (${finish})`,
        price: parseFloat(price),
        quantity: parseInt(quantity, 10) || 1,
        condition: condition,
        finish: finish,
        image_url: selectedCard ? getCardImageUrl(selectedCard) : (imageUrls.length > 0 ? imageUrls[0] : null),
      };

      const { error: insertError } = await supabase
        .from('listings')
        .insert([listingPayload]);

      if (insertError) {
        console.error("Erreur détaillée listings :", JSON.stringify(insertError, null, 2));
        throw insertError;
      }

      // Déclenchement de la fonction parent pour rafraîchir l'affichage sans recharger la page
      // À la fin de votre fonction handleSubmit (après l'upload et l'insertion en BDD) :
      if (typeof onCreated === 'function') {
        onCreated(); // Rafraîchit la liste automatiquement
      }
      onClose();     // Ferme la modale
    } catch (err) {
      console.error("Erreur création annonce :", err);
      setErrorMsg("Une erreur est survenue lors de la création de l'annonce.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-6 relative border border-slate-100 my-8">
        
        <div className="flex justify-between items-center pb-4 mb-4 border-b border-slate-100">
          <h2 className="text-lg font-black text-slate-900">
            {mode === 'details' && "Créer une annonce à l'unité"}
            {mode === 'card-select' && "Sélectionner une carte (Bloc > Série)"}
          </h2>
          <button 
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 font-bold transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-600 text-xs rounded-xl font-medium">
            {errorMsg}
          </div>
        )}

        {mode === 'details' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            
            <SecurityBanner />

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                Visuels de la carte (Jusqu'à 5 photos)
              </label>

              {selectedCard ? (
                <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-indigo-200 shadow-xs">
                  <div className="flex items-center gap-3">
                    <img 
                      src={getCardImageUrl(selectedCard)} 
                      alt={selectedCard.name} 
                      className="w-12 h-16 object-contain rounded" 
                      onError={(e) => { 
                        e.target.onerror = null; 
                        e.target.src = fallbackSvg; 
                      }}
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-900">{selectedCard.name}</p>
                      <p className="text-[10px] text-indigo-600 font-medium">Carte officielle TCGdex sélectionnée</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedCard(null)}
                    className="text-xs text-rose-600 hover:underline font-semibold cursor-pointer"
                  >
                    Changer
                  </button>
                </div>
              ) : imagePreviews.length > 0 ? (
                <div className="space-y-3 bg-white p-3 rounded-xl border border-emerald-200 shadow-xs">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-900">Photos personnelles ({imagePreviews.length}/5)</p>
                    <button
                      type="button"
                      onClick={() => { setImageFiles([]); setImagePreviews([]); if(fileInputRef.current) fileInputRef.current.value=''; }}
                      className="text-xs text-rose-600 hover:underline font-semibold cursor-pointer"
                    >
                      Tout supprimer
                    </button>
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {imagePreviews.map((preview, idx) => (
                      <div key={idx} className="relative group aspect-[3/4] bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                        <img src={preview} alt={`Aperçu ${idx + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          className="absolute top-1 right-1 bg-slate-900/70 hover:bg-rose-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] transition-colors"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    {imagePreviews.length < 5 && (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current.click()}
                        className="aspect-[3/4] border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-lg flex flex-col items-center justify-center text-slate-400 hover:text-indigo-600 transition-colors"
                      >
                        <span className="text-lg">+</span>
                        <span className="text-[9px]">Ajouter</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setMode('card-select')}
                    className="py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-2"
                  >
                    <span>🔍</span> Choisir via TCGdex (Bloc / Série)
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current.click()}
                    className="py-3 px-4 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-2"
                  >
                    <span>📁</span> Importer depuis mon ordi (Max 5)
                  </button>
                </div>
              )}

              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageChange} 
                accept="image/*" 
                multiple
                className="hidden" 
              />
            </div>

            {!selectedCard && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Titre de l'annonce</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Dracaufeu 1er édition..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Prix (€)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {selectedCard?.pricing?.cardmarket && (
                  <p className="text-[11px] text-slate-500 mt-1">
                    💡 Tendance Cardmarket : <span className="font-bold text-slate-700">{selectedCard.pricing.cardmarket.trend ?? selectedCard.pricing.cardmarket.avg} €</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Quantité</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">État</label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="MINT">Mint</option>
                <option value="NM">Near Mint</option>
                <option value="EX">Excellent</option>
                <option value="GD">Good</option>
                <option value="PL">Played</option>
                <option value="P">Poor</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Version</label>
              <select
                value={finish}
                onChange={(e) => setFinish(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer font-semibold text-indigo-600"
              >
                <option value="Normale">Normale</option>
                <option value="Reverse">Reverse</option>
                <option value="Cosmo">Cosmo</option>
                <option value="Holo ligne">Holo ligne</option>
                <option value="Holo etoile">Holo étoile</option>
                <option value="Holo mirage">Holo mirage</option>
                <option value="Master Ball">Master Ball</option>
                <option value="Poké Ball">Poké Ball</option>
                <option value="Stamp">Stamp</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-colors shadow-sm cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Publication...' : "Publier l'annonce"}
              </button>
            </div>
          </form>
        )}

        {mode === 'card-select' && (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setMode('details')}
              className="text-xs text-indigo-600 font-bold hover:underline cursor-pointer flex items-center gap-1"
            >
              ← Retour au formulaire
            </button>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">1. Choisir le Bloc</label>
              <select
                value={selectedBlock}
                onChange={(e) => {
                  setSelectedBlock(e.target.value);
                  setSelectedSeriesId('');
                }}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="">-- Sélectionnez un bloc --</option>
                {blocks.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            {selectedBlock && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">2. Choisir la Série</label>
                <select
                  value={selectedSeriesId}
                  onChange={(e) => setSelectedSeriesId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="">-- Sélectionnez une série --</option>
                  {seriesList.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}

            {selectedSeriesId && (
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">3. Choisir la Carte</label>
                {loadingCards ? (
                  <div className="text-center py-8 text-slate-400 text-xs">Chargement des cartes depuis TCGdex...</div>
                ) : cardsList.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <p className="font-semibold text-slate-600 mb-1">Aucune carte trouvée pour cette série.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-60 overflow-y-auto p-1">
                    {cardsList.map((card) => (
                      <div
                        key={card.id}
                        onClick={() => handleSelectCard(card)}
                        className="bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 p-3 rounded-xl cursor-pointer transition-all flex flex-col items-center text-center gap-2"
                      >
                        <img 
                          src={getCardImageUrl(card)} 
                          alt={card.name} 
                          className="h-20 object-contain" 
                          onError={(e) => { 
                            e.target.onerror = null; 
                            e.target.src = fallbackSvg; 
                          }}
                        />
                        <span className="text-[11px] font-bold text-slate-800 truncate w-full">{card.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}