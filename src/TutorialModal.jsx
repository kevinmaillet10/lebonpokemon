import React, { useState } from 'react'

const steps = [
  { title: "Bienvenue sur Le Bon Pokémon !", text: "La plateforme dédiée aux dresseurs et collectionneurs." },
  { title: "Vendre à l'unité", text: "Utilisez le bouton 'Vendre à l'unité', pour ce qui on du temps à perdre." },
  { title: "Vendre en masse", text: "Idéal pour vos doublons, listez vos cartes par lots et par serie en un clin d'œil." },
  { title: "Ma collection", text: "Gère ta collection en temps réelle" },
  { title: "optimiser vos achat", text: "On s'occupe de trouver vos manquants à votre place" },
  { title: "À vous de jouer !", text: "Commencez votre collection ou vos ventes dès maintenant. Bonne chasse !" }
];

export default function TutorialModal({ onClose }) {
  const [step, setStep] = useState(0);

  const nextStep = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      // On marque le tuto comme vu dans le localStorage
      localStorage.setItem('has_seen_tutorial', 'true');
      onClose();
    }
  };

  // Ne rien afficher si le modal n'est pas ouvert (bien que le parent gère cela)
  if (!onClose) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-950 border border-slate-800 rounded-3xl p-10 max-w-lg w-full shadow-2xl text-center relative transform transition-all scale-100 opacity-100">
        
        {/* Bouton fermer (pour les impatients) */}
        <button 
            onClick={() => { localStorage.setItem('has_seen_tutorial', 'true'); onClose(); }}
            className="absolute top-5 right-5 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
            title="Fermer le tutoriel"
        >
            ✕
        </button>

        {/* Indicateur d'étape */}
        <div className="flex justify-center gap-1.5 mb-6">
            {steps.map((_, index) => (
                <div 
                    key={index} 
                    className={`h-1.5 w-6 rounded-full transition-colors ${index <= step ? 'bg-yellow-500' : 'bg-slate-700'}`}
                />
            ))}
        </div>
            
        <h2 className="text-3xl font-black text-white mb-5 leading-tight">
            {steps[step].title}
        </h2>
        
        <p className="text-slate-300 mb-10 text-base font-medium leading-relaxed">
            {steps[step].text}
        </p>

        <button 
          onClick={nextStep}
          className="w-full bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-black py-4 px-8 rounded-2xl transition-all text-lg shadow-lg shadow-yellow-500/20 cursor-pointer"
        >
          {step === steps.length - 1 ? "C'est parti !" : "Suivant"}
        </button>

        {/* Bouton retour (uniquement à partir de la 2ème étape) */}
        {step > 0 && (
            <button 
                onClick={() => setStep(step - 1)}
                className="absolute left-4 bottom-4 text-slate-500 hover:text-slate-300 transition-colors text-sm font-medium cursor-pointer"
            >
                ← Précédent
            </button>
        )}
      </div>
    </div>
  );
}