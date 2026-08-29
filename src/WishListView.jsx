import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { Heart, Trash2, ArrowLeft, Store, Bell, Layers } from 'lucide-react';

const ALL_VARIANTS = [
  { id: 'normal', label: 'Normale' },
  { id: 'reverse', label: 'Reverse' },
  { id: 'cosmo', label: 'Cosmo' },
  { id: 'holo_ligne', label: 'Holo ligne' },
  { id: 'holo_etoile', label: 'Holo étoile' },
  { id: 'holo_mirage', label: 'Holo mirage' },
  { id: 'master_ball', label: 'Master Ball' },
  { id: 'poke_ball', label: 'Poké Ball' },
  { id: 'copain_ball', label: 'Copain Ball' },
  { id: 'love_ball', label: 'Love Ball' },
  { id: 'sombre_ball', label: 'Sombre Ball' },
  { id: 'rapide_ball', label: 'Rapide Ball' },
  { id: 'rocket', label: 'Rocket' },
  { id: 'stamp', label: 'Stamp' },
];

const getAvailableVariants = (card) => {
  if (!card) return ALL_VARIANTS;
  const variantsField = card.variants || [];
  const specialField = card.special_variants || [];

  const cardVariantsRaw = [
    ...(Array.isArray(variantsField) ? variantsField : Object.keys(variantsField).filter(k => variantsField[k])),
    ...(Array.isArray(specialField) ? specialField : Object.keys(specialField).filter(k => specialField[k]))
  ].map(v => String(v).toLowerCase());

  const filtered = ALL_VARIANTS.filter(variant => {
    return cardVariantsRaw.some(cv => cv.includes(variant.id) || variant.id.includes(cv));
  });

  // Sécurité : si la base ne renvoie rien pour une raison x ou y, on retombe sur toutes pour ne pas bloquer
  return filtered.length > 0 ? filtered : ALL_VARIANTS;
};

export default function WishlistView({ user, onBack, onNavigateToShop }) {
  const [wishlistCards, setWishlistCards] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchWishlist() {
      if (!user) return;
      setLoading(true);

      const { data, error } = await supabase
        .from('wishlist')
        .select(`
          id,
          variant,
          target_price,
          cards (*)
        `)
        .eq('user_id', user.id);

      if (!error && data) {
        setWishlistCards(data);
      }
      setLoading(false);
    }

    fetchWishlist();
  }, [user]);

  const handleRemoveFromWishlist = async (wishId) => {
    setWishlistCards(prev => prev.filter(item => item.id !== wishId));
    await supabase.from('wishlist').delete().eq('id', wishId);
  };

  const handleUpdateVariant = async (wishId, newVariant) => {
    setWishlistCards(prev => prev.map(item => item.id === wishId ? { ...item, variant: newVariant } : item));

    await supabase
      .from('wishlist')
      .update({ variant: newVariant })
      .eq('id', wishId);
  };

  const handleUpdateTargetPrice = async (wishId, newPrice) => {
    const priceVal = newPrice === '' ? null : parseFloat(newPrice);
    
    setWishlistCards(prev => prev.map(item => item.id === wishId ? { ...item, target_price: priceVal } : item));

    await supabase
      .from('wishlist')
      .update({ target_price: priceVal })
      .eq('id', wishId);
  };

  return (
    <div className="min-h-screen bg-[#16181d] text-white w-full px-6 py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Heart className="text-pink-500" size={24} />
          <h1 className="text-xl font-black text-white tracking-tight">Ma Wishlist</h1>
        </div>
        
        <button type="button" onClick={onBack} className="flex items-center gap-1 text-xs font-bold text-slate-300 hover:text-white cursor-pointer bg-slate-800 border border-slate-700 px-3 py-2 rounded-xl transition-colors">
          <ArrowLeft size={14} /> Retour
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Chargement de la wishlist...</div>
      ) : wishlistCards.length === 0 ? (
        <div className="text-center py-16 bg-[#1a1d24] border border-slate-800 rounded-2xl space-y-3">
          <Heart size={40} className="mx-auto text-slate-600" />
          <p className="text-slate-400 text-sm">Ta wishlist est vide pour l'instant.</p>
          <p className="text-xs text-slate-500">Ajoute des cartes depuis le Pokédex en cochant les variants recherchés !</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {wishlistCards.map((item) => {
            const card = item.cards;
            if (!card) return null;

            const currentVariant = item.variant || 'normal';
            const availableVariants = getAvailableVariants(card);

            return (
              <div key={item.id} className="bg-[#1e222b] border border-slate-800 hover:border-pink-500/50 rounded-2xl p-4 flex flex-col justify-between transition-all group relative gap-4">
                <button 
                  onClick={() => handleRemoveFromWishlist(item.id)}
                  className="absolute top-3 right-3 bg-slate-900/80 hover:bg-red-500/20 text-slate-400 hover:text-red-400 p-1.5 rounded-lg transition-colors cursor-pointer z-10"
                  title="Retirer de la wishlist"
                >
                  <Trash2 size={14} />
                </button>

                <div className="flex gap-4 items-center">
                  <img src={card.image_url} alt={card.name} className="w-20 h-28 object-contain rounded-lg bg-[#16181d] p-1 border border-slate-800 shrink-0" />
                  
                  <div className="space-y-2 flex-1 min-w-0">
                    <span className="text-xs font-bold text-slate-200 block truncate">{card.name}</span>
                    
                    {/* Sélecteur de variante filtré */}
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Layers size={10} className="text-pink-400" /> Variante
                      </label>
                      <select
                        value={currentVariant}
                        onChange={(e) => handleUpdateVariant(item.id, e.target.value)}
                        className="w-full bg-[#16181d] border border-slate-700 rounded-lg px-2 py-1 text-xs text-pink-400 font-mono focus:outline-none focus:border-pink-500 cursor-pointer"
                      >
                        {availableVariants.map((v) => (
                          <option key={v.id} value={v.id} className="bg-[#16181d] text-white">
                            {v.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    {/* Alerte de prix / Prix max */}
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Bell size={10} className="text-pink-400" /> Prix max alerte (€)
                      </label>
                      <input 
                        type="number" 
                        step="0.01"
                        placeholder="Ex: 15.00"
                        value={item.target_price ?? ''}
                        onChange={(e) => handleUpdateTargetPrice(item.id, e.target.value)}
                        className="w-full bg-[#16181d] border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-pink-500 font-mono"
                      />
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => onNavigateToShop && onNavigateToShop(card.name)}
                  className="w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold border border-slate-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Store size={13} /> Rechercher dans les annonces
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}