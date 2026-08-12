import React, { useState } from 'react';
import { ArrowLeft, ShieldCheck, Image as ImageIcon, X } from 'lucide-react';

// --- IMPORTS DES IMAGES ---
import imgMint from './assets/conditions/1.webp';
import imgEx from './assets/conditions/2.webp';
import imgGd from './assets/conditions/3.webp';
import imgLp from './assets/conditions/4.webp';
import imgPoor from './assets/conditions/5.webp';
import imgGrade from './assets/conditions/6.jpg';
import imgSleeve from './assets/conditions/7.webp';
import imgToploader from './assets/conditions/8.webp';

export default function ConditionGuideView({ setCurrentView }) {
  const [activeModalImage, setActiveModalImage] = useState(null);
  const [activeModalTitle, setActiveModalTitle] = useState("");

  const conditions = [
    {
      id: 1,
      code: "M / NM",
      name: "Mint / Near Mint (Quasi Neuve)",
      badgeColor: "text-emerald-700 bg-emerald-100 border-emerald-300",
      description: "La carte est dans un état parfait ou quasi-parfait. Aucun pli, bordure impeccable sans aucun blanchiment, surface intacte.",
      details: ["Bords nets sans aucun point blanc", "Surface brillante sans rayure", "Coins parfaitement coupés"],
      image: imgMint
    },
    {
      id: 2,
      code: "EX",
      name: "Excellent (Très Bon État)",
      badgeColor: "text-blue-700 bg-blue-100 border-blue-300",
      description: "La carte présente de très légères traces d'usure visibles de près, comme 1 ou 2 minuscules points blancs au dos sur la tranche.",
      details: ["Légères traces d'usure minimes au dos", "Pas de pliure ni de rayure majeure", "Idéal pour collectionneurs exigeants"],
      image: imgEx
    },
    {
      id: 3,
      code: "GD",
      name: "Good (Bon État)",
      badgeColor: "text-amber-700 bg-amber-100 border-amber-300",
      description: "Usure normale de jeu. Plusieurs points blancs visibles sur les bords arrières ou micro-rayures légères en surface.",
      details: ["Blanchiment léger sur plusieurs bords", "Micro-rayures visibles à la lumière", "Aucune pliure importante"],
      image: imgGd
    },
    {
      id: 4,
      code: "LP / PL",
      name: "Played / Light Played (Joué)",
      badgeColor: "text-orange-700 bg-orange-100 border-orange-300",
      description: "Usure prononcée liée au jeu. Bords bien blanchis, coins émoussés ou rayures de surface bien visibles.",
      details: ["Tranches fort blanchies", "Coins légèrement abîmés", "Rayures de surface visibles"],
      image: imgLp
    },
    {
      id: 5,
      code: "POOR",
      name: "Poor / Damaged (Abîmé)",
      badgeColor: "text-rose-700 bg-rose-100 border-rose-300",
      description: "Carte fortement endommagée : pliures nettes, taches, décollement du plastifiage ou coins cornés.",
      details: ["Pliures ou marques structurelles", "Bords très abîmés", "Usage recommandé uniquement pour le jeu"],
      image: imgPoor
    },
    {
      id: 6,
      code: "GRADÉE",
      name: "Carte Gradée (Certifiée par un tiers)",
      badgeColor: "text-purple-700 bg-purple-100 border-purple-300",
      description: "La carte a été authentifiée, notée et scellée dans un boîtier de protection rigide par une société professionnelle (PCA, PSA, Beckett, etc.).",
      details: ["Note officielle attribuée (ex: 9, 9.5, 10)", "Boîtier inviolable garantissant l'authentification", "Protection maximale contre l'usure"],
      image: imgGrade
    },
    {
      id: 7,
      code: "SLEEVE",
      name: "Sleeve (Protège-cartes souple)",
      badgeColor: "text-indigo-700 bg-indigo-100 border-indigo-300",
      description: "Première ligne de défense indispensable. Fine pochette plastique souple qui protège la surface et les bords de la poussière et des frottements.",
      details: ["Protection de base indispensable", "Idéal pour le classement en classeur (binder)", "Transparent pour une visibilité totale"],
      image: imgSleeve
    },
    {
      id: 8,
      code: "TOPLOADER",
      name: "Top Loader (Protecteur rigide)",
      badgeColor: "text-cyan-700 bg-cyan-100 border-cyan-300",
      description: "Étui en plastique rigide et épais conçu pour recevoir une carte déjà protégée par une sleeve. Offre une sécurité maximale contre les torsions.",
      details: ["Protection rigide anti-pliure", "Utilisé obligatoirement avec une sleeve", "Parfait pour le stockage sécurisé ou l'envoi postal"],
      image: imgToploader
    }
  ];

  const GuideImage = ({ src, alt, className }) => {
    const [hasError, setHasError] = useState(false);
    if (hasError || !src) {
      return (
        <div className="flex flex-col items-center justify-center p-6 text-slate-400 h-full bg-slate-50">
          <ImageIcon size={32} className="mb-2 text-slate-300" />
          <span className="text-xs uppercase font-semibold text-slate-400">Photo à venir</span>
        </div>
      );
    }
    return <img src={src} alt={alt} onError={() => setHasError(true)} className={className} />;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 relative">
      <button 
        onClick={() => setCurrentView('rarity-guide')}
        className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6 font-medium transition-colors cursor-pointer"
      >
        <ArrowLeft size={20} />
        Retour au guide des raretés
      </button>

      <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-slate-900 rounded-2xl p-8 text-white shadow-xl mb-8 border border-emerald-900/40">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-3 bg-emerald-800/60 rounded-xl">
            <ShieldCheck size={28} className="text-emerald-300" />
          </div>
          <span className="text-xs font-bold tracking-wider uppercase bg-emerald-800/80 text-emerald-200 px-3 py-1 rounded-full">
            Standard d'Évaluation & Protection
          </span>
        </div>
        <h1 className="text-3xl font-extrabold mb-2">Guide des États & Accessoires de Protection</h1>
        <p className="text-emerald-100 max-w-2xl leading-relaxed text-sm sm:text-base">
          Afin de garantir des transactions transparentes, utilisez ce guide pour évaluer avec précision l'état physique de vos cartes et comprendre les différents niveaux de protection. Clique sur une image pour l'agrandir.
        </p>
      </div>

      <div className="space-y-6">
        {conditions.map((item) => (
          <div key={item.id} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row gap-6 items-center">
            
            <div 
              onClick={() => { if(item.image) { setActiveModalImage(item.image); setActiveModalTitle(item.name); }}}
              className="w-full md:w-64 h-40 bg-slate-100 rounded-xl overflow-hidden border border-slate-200 flex-shrink-0 flex items-center justify-center relative group cursor-pointer"
            >
              <GuideImage src={item.image} alt={item.name} className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105" />
              {item.image && (
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">
                  🔍 Agrandir
                </div>
              )}
            </div>

            <div className="flex-1 w-full">
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-extrabold px-3 py-1 rounded-lg border ${item.badgeColor}`}>
                  {item.code}
                </span>
                <span className="text-xs font-bold text-slate-400">Niveau #{item.id}</span>
              </div>

              <h2 className="text-xl font-bold text-slate-800 mb-2">{item.name}</h2>
              <p className="text-slate-600 text-sm mb-4 leading-relaxed">{item.description}</p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-100">
                {item.details.map((detail, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    {detail}
                  </div>
                ))}
              </div>
            </div>

          </div>
        ))}
      </div>

      {activeModalImage && (
        <div onClick={() => setActiveModalImage(null)} className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div onClick={(e) => e.stopPropagation()} className="relative bg-white rounded-2xl max-w-2xl w-full p-4 md:p-6 shadow-2xl flex flex-col items-center max-h-[90vh]">
            <button onClick={() => setActiveModalImage(null)} className="absolute top-4 right-4 bg-slate-100 hover:bg-slate-200 text-slate-700 p-2 rounded-full transition-colors cursor-pointer z-10">
              <X size={20} />
            </button>
            <h3 className="text-lg font-bold text-slate-800 mb-4 text-center pr-8">{activeModalTitle}</h3>
            <div className="w-full h-[70vh] flex items-center justify-center bg-slate-900 rounded-xl overflow-hidden">
              <img src={activeModalImage} alt="Zoom" className="max-h-full max-w-full object-contain" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}