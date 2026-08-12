import React, { useState, useEffect } from 'react';

export default function WelcomeSplash({ onFinish }) {
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    // Lance le fondu de sortie à 4 secondes
    const fadeTimer = setTimeout(() => {
      setIsFading(true);
    }, 4000);

    // Disparition totale après 5 secondes
    const finishTimer = setTimeout(() => {
    localStorage.setItem('hasSeenSplash', 'true');
    onFinish(); 
    }, 5000);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(finishTimer);
    };
  }, [onFinish]);

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-950 transition-all duration-1000 ${isFading ? 'opacity-0 blur-lg' : 'opacity-100 blur-0'}`}>
      <div className="text-center">
        <h1 className="text-5xl font-extrabold text-white tracking-wider animate-pulse">
          Bienvenue sur <span className="text-yellow-500">Le Bon Pokémon</span>
        </h1>
        <p className="mt-4 text-slate-400 text-lg">Votre marketplace de collection</p>
      </div>
    </div>
  );
}