import React, { useState } from 'react';
import { X, ImagePlus, Trash2 } from 'lucide-react';

export default function ReportDisputeModal({ sellerId, orderId, onClose, onSuccess }) {
  const [reason, setReason] = useState('Colis ou emballage endommagé');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState([]); // Stocke les objets File et les URL d'aperçu

  // Gestion de l'ajout des fichiers locaux (maximum 10)
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Calculer combien on peut en rajouter pour ne pas dépasser la limite de 10
    const remainingSlots = 10 - photos.length;
    const filesToAdd = files.slice(0, remainingSlots);

    const newPhotos = filesToAdd.map((file) => ({
      file,
      preview: URL.createObjectURL(file) // Crée une URL locale pour l'aperçu miniature
    }));

    setPhotos((prev) => [...prev, ...newPhotos]);
    
    // Réinitialise l'input pour permettre de re-sélectionner le même fichier si besoin
    e.target.value = '';
  };

  // Suppression d'une photo de la liste
  const handleRemovePhoto = (indexToRemove) => {
    setPhotos((prev) => {
      // Libère l'URL pour éviter les fuites de mémoire
      URL.revokeObjectURL(prev[indexToRemove].preview);
      return prev.filter((_, index) => index !== indexToRemove);
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Ici, tu peux envoyer 'photos.map(p => p.file)' vers ton API ou ton state global
    console.log("Envoi du litige avec", photos.length, "photos.");
    if (onSuccess) onSuccess();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* En-tête */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span>📦</span> Signaler un problème de transport
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-200/60 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Problème rencontré
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full border border-slate-200 rounded-xl p-3 text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="Colis ou emballage endommagé">Colis ou emballage endommagé</option>
              <option value="Article manquant">Article manquant</option>
              <option value="Article cassé / non conforme">Article cassé / non conforme</option>
              <option value="Colis non reçu">Colis non reçu</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Description et détails du dégât
            </label>
            <textarea
              rows="3"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez précisément l'état du colis à réception..."
              className="w-full border border-slate-200 rounded-xl p-3 text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          {/* SECTION UPLOAD DE PHOTOS (Jusqu'à 10) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Photos justificatives ({photos.length}/10)
              </label>
              <span className="text-[10px] text-slate-400">Format accepté : JPG, PNG</span>
            </div>

            <div className="grid grid-cols-5 gap-2.5">
              {/* Miniatures des photos ajoutées */}
              {photos.map((item, index) => (
                <div key={index} className="relative aspect-square rounded-xl border border-slate-200 overflow-hidden bg-slate-100 group">
                  <img src={item.preview} alt={`Preuve ${index + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(index)}
                    className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              ))}

              {/* Bouton d'ajout si on est en dessous de 10 photos */}
              {photos.length < 10 && (
                <label className="aspect-square border-2 border-dashed border-slate-200 hover:border-indigo-500 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50/30 transition-colors cursor-pointer">
                  <ImagePlus className="w-5 h-5 mb-1" />
                  <span className="text-[9px] font-semibold">Ajouter</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* Boutons d'action */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-pink-500 hover:bg-pink-600 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-sm"
            >
              Envoyer la réclamation
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}