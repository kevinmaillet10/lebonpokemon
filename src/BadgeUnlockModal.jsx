import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';

export default function BadgeUnlockModal({ badge, onClose }) {
  useEffect(() => {
    try {
      const confettiOptions = { 
        particleCount: 150, 
        spread: 90, 
        origin: { y: 0.5 },
        zIndex: 9999,
        colors: ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4']
      };

      if (typeof confetti === 'function') {
        confetti(confettiOptions);
      } else if (confetti && typeof confetti.default === 'function') {
        confetti.default(confettiOptions);
      }
    } catch (err) {
      console.error("Erreur lors du lancement des confettis :", err);
    }
  }, []);

  if (!badge) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl p-8 max-w-sm w-full mx-4 text-center shadow-2xl border-4 border-amber-400">
        
        <span className="inline-block bg-amber-100 text-amber-800 text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full mb-4">
          Nouveau Badge Débloqué !
        </span>

        <div className="relative w-32 h-32 mx-auto mb-6 flex items-center justify-center">
          <div className="absolute inset-0 bg-amber-400/20 rounded-full blur-xl animate-pulse"></div>
          <img 
            src={badge.icon_url || '/default-badge.png'} 
            alt={badge.name} 
            className="relative w-28 h-28 object-contain drop-shadow-lg"
          />
        </div>

        <h3 className="text-2xl font-black text-slate-800 mb-2">{badge.name}</h3>
        <p className="text-sm text-slate-600 mb-6 leading-relaxed">
          {badge.description || "Tu as accompli un nouvel exploit sur la plateforme ! Continue comme ça."}
        </p>

        <button
          onClick={onClose}
          className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg cursor-pointer hover:from-amber-600 hover:to-amber-700 transition-all"
        >
          Incroyable, merci !
        </button>

      </div>
    </div>
  );
}