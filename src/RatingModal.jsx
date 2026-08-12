import React, { useState } from 'react';
import { supabase } from './supabase';

export default function RatingModal({ isOpen, onClose, transactionId, sellerId, buyerId }) {
  const [globalRating, setGlobalRating] = useState(5);
  const [communication, setCommunication] = useState(5);
  const [description, setDescription] = useState(5);
  const [quality, setQuality] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Récupère l'utilisateur connecté si buyerId n'est pas fourni
      let currentBuyerId = buyerId;
      if (!currentBuyerId) {
        const { data: { user } } = await supabase.auth.getUser();
        currentBuyerId = user?.id;
      }

      const { error } = await supabase.from('ratings').insert({
        transaction_id: transactionId,
        seller_id: sellerId,
        buyer_id: currentBuyerId,
        rating: globalRating,
        communication,
        description_match: description,
        package_quality: quality,
        comment
      });

      if (error) throw error;
      alert('Avis publié avec succès !');
      onClose();
    } catch (err) {
      alert("Erreur lors de l'envoi de l'avis : " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-bold cursor-pointer">✕</button>
        
        <h2 className="text-xl font-black text-slate-800 mb-6">Noter la transaction</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Note globale */}
          <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl">
            <span className="font-bold text-sm text-slate-700">Note globale</span>
            <select 
              value={globalRating} 
              onChange={(e) => setGlobalRating(Number(e.target.value))}
              className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 font-bold text-amber-600 focus:outline-none cursor-pointer"
            >
              {[5, 4, 3, 2, 1].map(num => <option key={num} value={num}>⭐ {num} / 5</option>)}
            </select>
          </div>

          {/* Sous-critères */}
          <div className="grid grid-cols-1 gap-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-slate-600 font-medium">💬 Communication</span>
              <input type="range" min="1" max="5" value={communication} onChange={(e) => setCommunication(Number(e.target.value))} className="accent-indigo-600 cursor-pointer" />
              <span className="font-bold text-slate-800">{communication}/5</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600 font-medium">📄 Description du produit</span>
              <input type="range" min="1" max="5" value={description} onChange={(e) => setDescription(Number(e.target.value))} className="accent-indigo-600 cursor-pointer" />
              <span className="font-bold text-slate-800">{description}/5</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600 font-medium">📦 Qualité du colis</span>
              <input type="range" min="1" max="5" value={quality} onChange={(e) => setQuality(Number(e.target.value))} className="accent-indigo-600 cursor-pointer" />
              <span className="font-bold text-slate-800">{quality}/5</span>
            </div>
          </div>

          {/* Commentaire */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Commentaire</label>
            <textarea 
              rows="3" 
              placeholder="Parfait rien à dire..." 
              value={comment} 
              onChange={(e) => setComment(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-slate-900 hover:bg-indigo-600 text-white font-bold py-3 rounded-xl transition-colors text-sm shadow-md cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Publication...' : "Publier l'avis"}
          </button>
        </form>
      </div>
    </div>
  );
}