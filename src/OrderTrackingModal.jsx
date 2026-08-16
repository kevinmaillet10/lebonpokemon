import React, { useState, useEffect } from 'react';
import { X, Check, Copy, ExternalLink, ArrowRight, Star, ThumbsUp } from 'lucide-react';
import RatingModal from './RatingModal';
import ReportModal from './ReportModal';
import { supabase } from './supabase';

export default function OrderTrackingModal({ 
  isOpen, 
  onClose, 
  currentStep = "pending", 
  sellerName = "Le vendeur", 
  sellerId,
  orderId,
  trackingNumber = "61934580",
  carrier = "Mondial Relay",
  estimatedDate = "6 août - 10 août",
  onUpdate 
}) {
  const [copied, setCopied] = useState(false);
  const [isRatingOpen, setIsRatingOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [validating, setValidating] = useState(false);
  
  const [localStep, setLocalStep] = useState(currentStep);

  // Synchronisation forcée à chaque ouverture ou changement de currentStep
  useEffect(() => {
    if (isOpen) {
      setLocalStep(currentStep);
    }
  }, [isOpen, currentStep]);

  if (!isOpen) return null;

  // Convertit les statuts texte de Supabase en numéros d'étape (1 à 6)
  const getStepNumber = (st) => {
    if (typeof st === 'number') return st;
    if (!st) return 1;

    const cleanSt = String(st).toLowerCase().trim();

    switch (cleanSt) {
      case 'pending': return 1;
      case 'available': return 2;
      case 'shipped': return 3;
      case 'delivered': return 4;
      case 'verification': return 5;
      case 'completed': return 6;
      default: return 1;
    }
  };

  const currentStatut = getStepNumber(localStep);
  const name = sellerName;

  const steps = [
    {
      title: "Commandé",
      subtitle: "Transaction validée",
      headerText: "Votre Transaction sécurisée est validée !",
      desc: `${name} a maintenant 48 heures pour confirmer la disponibilité de votre commande. Rassurez-vous, si le vendeur ne confirme pas, votre compte ne sera pas débité.`,
      actionText: "Voir ma transaction"
    },
    {
      title: "Disponible",
      subtitle: "En attente d'envoi",
      headerText: "Votre commande est disponible !",
      desc: `${name} a confirmé la disponibilité de votre commande et doit maintenant confirmer l'envoi de votre colis. Si le vendeur ne confirme pas l'envoi, votre achat vous sera intégralement remboursé sous 7 jours maximum.`,
      actionText: "Voir plus de détails"
    },
    {
      title: "Expédié",
      subtitle: "Colis en route",
      headerText: "Commande envoyée !",
      desc: `${name} a envoyé votre commande. Votre colis sera disponible en point de retrait dans un délai moyen de 3 à 5 jours ouvrés.`,
      actionText: "Suivez-le à toutes les étapes de son acheminement."
    },
    {
      title: "Arrivé",
      subtitle: "En point de retrait",
      headerText: "Votre commande est arrivée !",
      desc: "Votre colis est disponible en point de retrait, allez vite le chercher.",
      actionText: "Confirmez la réception du colis dès que possible"
    },
    {
      title: "Vérification",
      subtitle: "Délai de contrôle",
      headerText: "Dites-nous si tout va bien",
      desc: "Maintenant que vous avez reçu votre commande, dites-nous si elle vous convient. Vous avez 3 jours pour nous signaler tout problème. Passé ce délai, l'argent sera automatiquement versé au vendeur.",
      actionText: "Signaler un problème sur la commande"
    },
    {
      title: "Terminé",
      subtitle: "Évaluation",
      headerText: "Félicitations pour votre achat !",
      desc: `Recommandez-vous ce vendeur (${name}) aux autres membres ? Sans action de votre part, une note automatique de 5 étoiles sera appliquée.`,
      actionText: "Noter la transaction et le vendeur"
    }
  ];

  const activeStepData = steps[currentStatut - 1] || steps[0];

  const handleCopy = () => {
    navigator.clipboard.writeText(trackingNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleValidateEverythingOk = async () => {
    if (!orderId) {
      setLocalStep('completed');
      if (onUpdate) onUpdate();
      return;
    }

    setValidating(true);
    try {
      const { error } = await supabase
        .from('orders') 
        .update({ status: 'completed' }) 
        .eq('id', orderId);

      if (error) {
        console.error("Erreur lors de la validation de la commande :", error.message);
      } else {
        setLocalStep('completed');
        if (onUpdate) onUpdate();
      }
    } catch (err) {
      console.error("Erreur inattendue :", err);
    } finally {
      setValidating(false);
    }
  };

  const handleActionClick = () => {
    if (currentStatut === 1) {
    } else if (currentStatut === 5) {
      setIsReportOpen(true);
    } else if (currentStatut === 6 && sellerId) {
      setIsRatingOpen(true);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
        <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between relative bg-slate-50">
            <div className="mx-auto text-center">
              <h2 className="text-base font-bold text-slate-900">{activeStepData.title}</h2>
              <p className="text-xs text-slate-500">{activeStepData.subtitle}</p>
            </div>
            <button 
              onClick={onClose}
              className="absolute right-5 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto space-y-6">
            
            <div className="py-2">
              <div className="relative flex items-center justify-between max-w-lg mx-auto">
                <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-slate-200 z-0"></div>
                <div 
                  className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-indigo-600 z-0 transition-all duration-500"
                  style={{ width: `${((currentStatut - 1) / (steps.length - 1)) * 100}%` }}
                ></div>

                {steps.map((step, idx) => {
                  const stepNum = idx + 1;
                  const isCompleted = stepNum < currentStatut;
                  const isCurrent = stepNum === currentStatut;

                  return (
                    <div key={idx} className="relative z-10 flex flex-col items-center">
                      <div 
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                          isCompleted || isCurrent
                            ? 'bg-indigo-600 text-white ring-4 ring-indigo-50 shadow-sm'
                            : 'bg-white border-2 border-slate-300 text-slate-400'
                        }`}
                      >
                        {isCompleted ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : stepNum}
                      </div>
                      <span className={`text-[10px] mt-1.5 font-medium whitespace-nowrap ${isCurrent ? 'text-indigo-600 font-bold' : 'text-slate-500'}`}>
                        {step.title}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">{activeStepData.headerText}</h3>
                <p className="text-xs text-slate-600 leading-relaxed mt-1">{activeStepData.desc}</p>
              </div>

              {currentStatut === 5 && (
                <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                  <button
                    onClick={handleValidateEverythingOk}
                    disabled={validating}
                    className="w-full sm:flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-4 rounded-xl transition-colors cursor-pointer text-xs shadow-sm flex items-center justify-center gap-2"
                  >
                    <ThumbsUp className="w-4 h-4" />
                    <span>{validating ? "Validation..." : "Tout est OK, valider la commande"}</span>
                  </button>

                  <button
                    onClick={() => setIsReportOpen(true)}
                    className="w-full sm:w-auto text-xs font-bold text-rose-600 hover:text-rose-800 py-2.5 px-4 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 transition-colors cursor-pointer flex items-center justify-center"
                  >
                    <span>Signaler un problème</span>
                  </button>
                </div>
              )}

              {currentStatut !== 5 && activeStepData.actionText && (
                <div 
                  onClick={handleActionClick}
                  className={`pt-2 flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 ${
                    currentStatut === 1 || currentStatut === 6 ? 'cursor-pointer' : 'cursor-default'
                  }`}
                >
                  {currentStatut === 6 && <Star className="w-3.5 h-3.5 fill-indigo-600 text-indigo-600" />}
                  <span>{activeStepData.actionText}</span>
                  {currentStatut !== 6 && <ArrowRight className="w-3.5 h-3.5" />}
                </div>
              )}
            </div>

            {currentStatut === 6 && sellerId && (
              <button
                onClick={() => setIsRatingOpen(true)}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-colors cursor-pointer text-xs shadow-sm flex items-center justify-center gap-2"
              >
                <Star className="w-4 h-4 fill-white" /> Noter le vendeur ({name})
              </button>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-slate-200 rounded-xl p-4 flex items-center justify-between bg-white">
                <div>
                  <span className="text-[11px] text-slate-400 font-medium block">Numéro de suivi</span>
                  <span className="text-xs font-bold text-slate-900">{trackingNumber} ({carrier})</span>
                </div>
                <button 
                  onClick={handleCopy}
                  className="flex items-center gap-1 text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? "Copié" : "Copier"}</span>
                </button>
              </div>

              <div className="border border-slate-200 rounded-xl p-4 flex items-center justify-between bg-white">
                <div>
                  <span className="text-[11px] text-slate-400 font-medium block">Livraison estimée</span>
                  <span className="text-xs font-bold text-slate-900">{estimatedDate}</span>
                </div>
                <ExternalLink className="w-4 h-4 text-slate-400" />
              </div>
            </div>

          </div>
        </div>
      </div>

      {isReportOpen && (
        <ReportModal 
          isOpen={isReportOpen}
          targetId={orderId}
          targetType="order" 
          onClose={() => setIsReportOpen(false)} 
        />
      )}

      {isRatingOpen && (
        <RatingModal 
          isOpen={isRatingOpen}
          transactionId={orderId}
          sellerId={sellerId} 
          onClose={() => {
            setIsRatingOpen(false);
            setLocalStep('completed');
            if (onUpdate) onUpdate();
          }} 
        />
      )}
    </>
  );
}

// Fonction utilitaire pour formater et afficher joliment les statuts dans ton tableau en arrière-plan
export const getStatusBadge = (status) => {
  const cleanStatus = String(status || 'pending').toLowerCase().trim();

  switch (cleanStatus) {
    case 'pending': return { label: 'En attente', bg: 'bg-amber-500/10 text-amber-500' };
    case 'available': return { label: 'Disponible', bg: 'bg-blue-500/10 text-blue-500' };
    case 'shipped': return { label: 'Expédié', bg: 'bg-indigo-500/10 text-indigo-500' };
    case 'delivered': return { label: 'Arrivé', bg: 'bg-purple-500/10 text-purple-500' };
    case 'verification': return { label: 'Vérification', bg: 'bg-orange-500/10 text-orange-500' };
    case 'completed': return { label: 'Terminé', bg: 'bg-emerald-500/10 text-emerald-500' };
    default: return { label: status, bg: 'bg-slate-500/10 text-slate-500' };
  }
};