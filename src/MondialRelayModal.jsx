import React, { useEffect, useState } from 'react';

export default function CustomRelayModal({ isOpen, sellerId, onClose, onSelectPoint }) {
  const [selectedRelay, setSelectedRelay] = useState(null);

  useEffect(() => {
    if (!isOpen) return;

    const loadMondialRelayWidget = async () => {
      if (!window.jQuery) {
        await new Promise((resolve) => {
          const script = document.createElement('script');
          script.src = 'https://code.jquery.com/jquery-3.6.0.min.js';
          script.onload = resolve;
          document.body.appendChild(script);
        });
      }

      if (!window.jQuery.fn.MR_ParcelShopPicker) {
        await new Promise((resolve) => {
          const script = document.createElement('script');
          script.src = 'https://widget.mondialrelay.com/parcelshop-picker/jquery.plugin.mondialrelay.parcelshoppicker.min.js';
          script.onload = resolve;
          document.body.appendChild(script);
        });
      }

      if (window.jQuery && window.jQuery.fn.MR_ParcelShopPicker) {
        window.jQuery('#Zone_Widget').empty();
        
        window.jQuery('#Zone_Widget').MR_ParcelShopPicker({
          Target: '#Retour_Widget',
          Brand: 'BDTEST', // Remplace par ton code enseigne en production
          Country: 'FR',
          Responsive: true,
          ShowResultsOnMap: true,
          EnableGmap: true,
          OnSelect: function (data) {
            console.log("Données reçues du widget :", data);
            if (typeof data === 'string') {
              setSelectedRelay({
                id: data,
                ID: data,
                Nom: `Point Relais (${data})`,
                Adresse1: '',
                CP: '',
                Ville: ''
              });
            } else if (data) {
              setSelectedRelay({
                id: data.ID || data.Id || data.id || '',
                ID: data.ID || data.Id || data.id || '',
                Nom: data.Nom || data.Name || data.nom || data.ID || 'Point Relais',
                Adresse1: data.Adresse1 || data.Adresse || data.address || '',
                CP: data.CP || data.PostalCode || data.cp || '',
                Ville: data.Ville || data.City || data.ville || '',
                Horaires: Array.isArray(data.Horaires) ? data.Horaires.join(' / ') : (data.Horaires || '')
              });
            }
          }
        });
      }
    };

    loadMondialRelayWidget();

    // Surveillance pour activer instantanément le bouton dès qu'un ID est injecté dans l'input caché
    const checkInterval = setInterval(() => {
      const input = document.getElementById('Retour_Widget');
      if (input && input.value && !selectedRelay) {
        const val = input.value.trim();
        if (val) {
          try {
            const parsed = JSON.parse(val);
            setSelectedRelay({
              id: parsed.ID || parsed.id || val,
              ID: parsed.ID || parsed.id || val,
              Nom: parsed.Nom || parsed.nom || `Point Relais (${val})`,
              Adresse1: parsed.Adresse1 || parsed.adresse || '',
              CP: parsed.CP || parsed.cp || '',
              Ville: parsed.Ville || parsed.ville || ''
            });
          } catch (e) {
            setSelectedRelay({
              id: val,
              ID: val,
              Nom: `Point Relais (${val})`,
              Adresse1: '',
              CP: '',
              Ville: ''
            });
          }
        }
      }
    }, 300);

    return () => {
      clearInterval(checkInterval);
    };
  }, [isOpen, selectedRelay]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]">
        
        <style>{`
          /* Empêche Tailwind de casser les cartes et les images du widget (Leaflet) */
          #Zone_Widget img,
          #Zone_Widget .leaflet-tile {
            max-width: none !important;
          }

          /* Cache les messages d'avertissement natifs du widget */
          #Zone_Widget .Avertissement,
          #Zone_Widget div[style*="color: red"],
          #Zone_Widget div[style*="color:red"] {
            display: none !important;
          }

          /* Restaure les listes du widget cassées par le reset Tailwind */
          #Zone_Widget ul, #Zone_Widget ol {
            list-style: disc outside !important;
            padding-left: revert !important;
            margin: revert !important;
          }

          /* Force un texte sombre et visible sur TOUS les éléments de la liste des points relais */
          #Zone_Widget li,
          #Zone_Widget li *,
          #Zone_Widget [class*="item"],
          #Zone_Widget [class*="item"] *,
          #Zone_Widget [class*="Item"],
          #Zone_Widget [class*="Item"] * {
            color: #1e293b !important;
          }

          /* Correction spécifique pour le menu déroulant des villes / codes postaux (.PR-City) */
          #Zone_Widget div[class*="PR-City"],
          #Zone_Widget .PR-City {
            color: #0f172a !important;
            background-color: #ffffff !important;
            padding: 8px 12px !important;
            cursor: pointer !important;
          }
          #Zone_Widget div[class*="PR-City"]:hover,
          #Zone_Widget .PR-City:hover {
            background-color: #f1f5f9 !important;
            color: #0f172a !important;
          }

          /* Popup de la carte */
          #Zone_Widget .leaflet-popup-content,
          #Zone_Widget .leaflet-popup-content * {
            color: #0f172a !important;
          }

          /* Champs de saisie du widget */
          #Zone_Widget input[type="text"],
          #Zone_Widget input[type="search"],
          #Zone_Widget input,
          #Zone_Widget select {
            color: #0f172a !important;
            background-color: #ffffff !important;
            -webkit-text-fill-color: #0f172a !important;
            opacity: 1 !important;
            border: 1px solid #cbd5e1 !important;
          }

          #Zone_Widget input::placeholder {
            color: #94a3b8 !important;
            -webkit-text-fill-color: #94a3b8 !important;
            opacity: 1 !important;
          }
        `}</style>

        <div className="flex justify-between items-center px-6 py-4 border-b bg-slate-50">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Choisissez votre Point Relais</h3>
            <p className="text-xs text-slate-500">Recherche officielle sur l'ensemble du réseau en France</p>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 font-bold text-2xl px-2 cursor-pointer transition-colors"
          >
            &times;
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col lg:flex-row gap-6">
          
          <div className="flex-1 min-h-[480px] border border-slate-200 rounded-xl p-3 bg-white relative overflow-y-auto shadow-xs">
            <div id="Zone_Widget" className="w-full min-h-[450px]"></div>
            <input type="hidden" id="Retour_Widget" />
          </div>

          <div className="w-full lg:w-80 flex flex-col justify-between bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <h4 className="font-bold text-slate-800 text-sm mb-3">Point sélectionné :</h4>
              {selectedRelay ? (
                <div className="space-y-2 text-xs text-slate-700 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <p className="font-bold text-blue-600 text-sm">{selectedRelay.Nom}</p>
                  {selectedRelay.Adresse1 && <p>{selectedRelay.Adresse1}</p>}
                  {(selectedRelay.CP || selectedRelay.Ville) && (
                    <p>{selectedRelay.CP} {selectedRelay.Ville}</p>
                  )}
                  {selectedRelay.Horaires && (
                    <p className="text-slate-500 mt-2 pt-2 border-t border-slate-100 italic">
                      {selectedRelay.Horaires}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">
                  Cliquez sur un point relais puis sur "Sélectionner ce point" pour valider.
                </p>
              )}
            </div>

            <button
              disabled={!selectedRelay}
              onClick={() => {
                if (selectedRelay) {
                  onSelectPoint(sellerId, selectedRelay);
                  onClose();
                }
              }}
              className="mt-4 w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold py-3.5 px-4 rounded-xl shadow-md transition-all cursor-pointer text-sm text-center"
            >
              Valider ce Point Relais
            </button>
          </div>

        </div>

        <div className="flex justify-end px-6 py-3 border-t bg-slate-50">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-sm font-semibold cursor-pointer transition-colors"
          >
            Fermer
          </button>
        </div>

      </div>
    </div>
  );
}