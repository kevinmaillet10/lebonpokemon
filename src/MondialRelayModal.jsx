import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';

export default function MondialRelayModal({ isOpen, sellerId, onClose, onSelectPoint }) {
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  useEffect(() => {
    if (!isOpen || !sellerId) return;

    setLoadingTimeout(false);
    let isMounted = true;
    let checkInterval = null;
    let fallbackTimer = null;

    // Sécurité : si au bout de 4 secondes le widget ne s'affiche pas, on propose un mode simulation
    fallbackTimer = setTimeout(() => {
      if (isMounted) setLoadingTimeout(true);
    }, 4000);

    const tryInitWidget = () => {
      if (!isMounted) return false;

      if (window.$ && typeof window.$("#zone-widget-mondial-relay").MR_RechercheRelais === "function") {
        try {
          window.$("#zone-widget-mondial-relay").MR_RechercheRelais({
            Client: "BDTEST",
            Country: "FR",
            Target: "zone-widget-mondial-relay",
            OnSelect: (data) => {
              if (isMounted) {
                if (fallbackTimer) clearTimeout(fallbackTimer);
                onSelectPoint(sellerId, data);
              }
            }
          });
          if (fallbackTimer) clearTimeout(fallbackTimer);
          return true;
        } catch (error) {
          console.error("Erreur d'initialisation du widget Mondial Relay :", error);
        }
      }
      return false;
    };

    const startPolling = () => {
      if (tryInitWidget()) return;

      checkInterval = setInterval(() => {
        if (tryInitWidget()) {
          clearInterval(checkInterval);
        }
      }, 50);
    };

    if (!window.jQuery) {
      const jqScript = document.createElement("script");
      jqScript.src = "https://ajax.googleapis.com/ajax/libs/jquery/2.2.4/jquery.min.js";
      jqScript.async = true;
      jqScript.onload = () => {
        if (!isMounted) return;
        loadMondialRelayScript();
      };
      document.body.appendChild(jqScript);
    } else {
      loadMondialRelayScript();
    }

    function loadMondialRelayScript() {
      if (!window.jQuery.fn.MR_RechercheRelais) {
        const mrScript = document.createElement("script");
        mrScript.src = "https://widget.mondialrelay.com/parcelshop-picker/jquery.plugin.mondialrelay.parcelshoppicker.min.js";
        mrScript.async = true;
        mrScript.onload = () => {
          if (!isMounted) return;
          startPolling();
        };
        document.body.appendChild(mrScript);
      } else {
        startPolling();
      }
    }

    return () => {
      isMounted = false;
      if (checkInterval) clearInterval(checkInterval);
      if (fallbackTimer) clearTimeout(fallbackTimer);
    };
  }, [isOpen, sellerId, onSelectPoint]);

  // Fonction de simulation pour contourner le blocage du widget si besoin
  const handleSimulateSelect = () => {
    const fakeRelayData = {
      ID: "FR-99999",
      Nom: "Point Relais Simulation Bêta",
      Adresse1: "12 Rue du Test",
      CP: "75001",
      Ville: "Paris"
    };
    onSelectPoint(sellerId, fakeRelayData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* En-tête de la modale */}
        <div className="flex justify-between items-center px-6 py-4 border-b">
          <h3 className="text-lg font-semibold text-slate-800">Sélectionnez votre Point Relais</h3>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 font-bold text-xl cursor-pointer"
          >
            &times;
          </button>
        </div>

        {/* Corps de la modale */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col items-center justify-center">
          <div id="zone-widget-mondial-relay" className="min-h-[400px] w-full">
            {/* Le widget s'injectera ici */}
          </div>

          {/* Bouton de secours si le widget met trop de temps à charger */}
          {loadingTimeout && (
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl w-full text-center space-y-2">
              <p className="text-xs text-amber-800">
                ⚠️ Le widget officiel met du temps à répondre (bloqueur de publicité ou réseau local). Tu peux utiliser le relais de simulation pour valider ton test :
              </p>
              <button
                onClick={handleSimulateSelect}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-bold shadow-sm cursor-pointer"
              >
                Sélectionner le Point Relais de test (Simulation)
              </button>
            </div>
          )}
        </div>

        {/* Pied de page */}
        <div className="flex justify-end px-6 py-3 border-t bg-slate-50">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 text-slate-700 rounded-md hover:bg-slate-300 text-sm font-medium cursor-pointer"
          >
            Fermer
          </button>
        </div>

      </div>
    </div>
  );
}