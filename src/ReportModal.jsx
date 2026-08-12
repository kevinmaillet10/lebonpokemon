import React, { useState } from 'react';
import { supabase } from './supabase';

export default function ReportModal({ targetId, targetType, onClose }) {
  const [reason, setReason] = useState('Contrefaçon / Fausse carte');
  const [details, setDetails] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Gestion de la sélection des fichiers (limité à 10 max)
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 10) {
      alert("Vous pouvez sélectionner un maximum de 10 photos.");
      return;
    }
    setSelectedFiles(files);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const imageUrls = [];

      // 1. Upload des photos sur le stockage Supabase
      for (const file of selectedFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${targetId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('reports') // Nom de ton bucket Supabase pour les pièces jointes
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Récupération de l'URL publique de l'image uploadée
        const { data: publicUrlData } = supabase.storage
          .from('reports')
          .getPublicUrl(filePath);

        if (publicUrlData?.publicUrl) {
          imageUrls.push(publicUrlData.publicUrl);
        }
      }

      // 2. Enregistrement du signalement avec les URLs des photos
      const { error } = await supabase.from('reports').insert({
        reporter_id: user ? user.id : null,
        target_id: targetId,
        target_type: targetType,
        reason: `${reason}: ${details}`,
        images: imageUrls // Stocke le tableau des liens des photos
      });

      if (error) throw error;

      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      console.error("Erreur lors de l'envoi du signalement :", err);
      alert("Erreur lors de l'envoi des photos ou du signalement.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center">
          <h3 className="font-black text-slate-800 text-base">Signaler un problème 🚨</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer">✕</button>
        </div>

        {success ? (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-2xl text-xs font-bold text-center">
            Signalement pris en compte. Notre équipe va examiner votre réclamation !
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Motif du problème</label>
              <select 
                value={reason} 
                onChange={(e) => setReason(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 cursor-pointer"
              >
                <optgroup label="Annonce / Vendeur">
                  <option value="Contrefaçon / Fausse carte">Contrefaçon / Fausse carte</option>
                  <option value="Prix trompeur ou abusif">Prix trompeur ou abusif</option>
                  <option value="Photos ou description non conformes">Photos ou description non conformes</option>
                  <option value="Vendeur suspect / Comportement frauduleux">Vendeur suspect / Comportement frauduleux</option>
                  <option value="Article déjà vendu / Annonce doublon">Article déjà vendu / Annonce doublon</option>
                </optgroup>

                <optgroup label="Commande / Livraison">
                  <option value="Colis non reçu / Perdu">Colis non reçu / Perdu</option>
                  <option value="Cartes endommagées ou abîmées">Cartes endommagées ou abîmées</option>
                  <option value="Contenu non conforme / Articles manquants">Contenu non conforme / Articles manquants</option>
                  <option value="Autre problème avec la commande">Autre problème avec la commande</option>
                </optgroup>

                <optgroup label="Autre">
                  <option value="Autre motif">Autre motif</option>
                </optgroup>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Détails (optionnel)</label>
              <textarea 
                rows="3"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Explique brièvement le problème rencontré..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium text-slate-800"
              />
            </div>

            {/* Input direct pour choisir des fichiers du PC (jusqu'à 10 photos) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Photos justificatives (10 max)
              </label>
              <input 
                type="file" 
                accept="image/*"
                multiple
                onChange={handleFileChange}
                className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
              />
              {selectedFiles.length > 0 && (
                <p className="text-[11px] text-emerald-600 mt-1 font-medium">
                  {selectedFiles.length} photo(s) sélectionnée(s)
                </p>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button 
                type="button" 
                onClick={onClose}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2.5 rounded-xl text-xs transition cursor-pointer"
              >
                Annuler
              </button>
              <button 
                type="submit" 
                disabled={loading}
                className="flex-1 bg-rose-500 hover:bg-rose-600 text-white font-bold py-2.5 rounded-xl text-xs shadow-sm transition cursor-pointer"
              >
                {loading ? "Envoi en cours..." : "Envoyer le signalement"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}