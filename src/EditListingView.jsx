import React, { useState, useEffect } from 'react';
import { supabase } from './supabase.js';

export default function EditListingModal({ listing, onClose, onUpdated }) {
  const [price, setPrice] = useState(listing?.price || '');
  const [condition, setCondition] = useState(listing?.condition || 'Mint');
  const [finish, setFinish] = useState(listing?.finish || 'Normale');
  const [quantity, setQuantity] = useState(listing?.quantity || 1);
  const [notes, setNotes] = useState(listing?.notes || '');
  const [loading, setLoading] = useState(false);

  async function handleSave(e) {
    e.preventDefault();
    setLoading(true);

    try {
      const parsedQuantity = parseInt(quantity, 10);
      
      const updateData = {
        price: parseFloat(price),
        condition,
        finish,
        quantity: parsedQuantity,
        notes
      };

      const { error } = await supabase
        .from('listings')
        .update(updateData)
        .eq('id', listing.id);

      if (error) throw error;

      if (onUpdated) onUpdated(); 
      onClose(); 
    } catch (err) {
      console.error("Erreur complète :", err);
      alert("Erreur Supabase : " + (err.message || JSON.stringify(err)));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b border-slate-100 pb-4">
          <h3 className="text-lg font-bold text-slate-900">Modifier l'annonce</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer">✕</button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Prix (€)</label>
            <input 
              type="number" 
              step="0.01" 
              value={price} 
              onChange={(e) => setPrice(e.target.value)} 
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required 
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">État</label>
            <select 
              value={condition} 
              onChange={(e) => setCondition(e.target.value)} 
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="Mint">Mint (Neuf)</option>
              <option value="Near Mint">Near Mint (Presque neuf)</option>
              <option value="Excellent">Excellent</option>
              <option value="Good">Good (Bon)</option>
              <option value="Played">Played (Joué)</option>
              <option value="Poor">Poor (Mauvais)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Finition / Version</label>
            <select 
              value={finish} 
              onChange={(e) => setFinish(e.target.value)} 
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="Normale">Normale</option>
              <option value="Reverse">Reverse</option>
              <option value="Cosmo">Cosmo</option>
              <option value="Holo ligne">Holo ligne</option>
              <option value="Holo étoile">Holo étoile</option>
              <option value="Holo mirage">Holo mirage</option>
              <option value="Master Ball">Master Ball</option>
              <option value="Poké Ball">Poké Ball</option>
              <option value="Stamp">Stamp</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Quantité</label>
            <input 
              type="number" 
              min="1" 
              value={quantity} 
              onChange={(e) => setQuantity(e.target.value)} 
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Notes / Description</label>
            <textarea 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)} 
              rows="3"
              placeholder="Précisions sur la carte..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" 
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Annuler
            </button>
            <button 
              type="submit" 
              disabled={loading} 
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-colors cursor-pointer shadow-sm"
            >
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}