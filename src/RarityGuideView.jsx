import React, { useState } from 'react';
import { ArrowLeft, BookOpen, Sparkles, Image as ImageIcon, X } from 'lucide-react';

// --- IMPORTS BASÉS SUR LES ID ---
import img1 from './assets/rarities/1.png';
import img2 from './assets/rarities/2.png';
import img3 from './assets/rarities/3.png';
import img4 from './assets/rarities/4.png';
import img5 from './assets/rarities/5.png';
import img6 from './assets/rarities/6.png';
import img7 from './assets/rarities/7.png';
import img8 from './assets/rarities/8.png';
import img9 from './assets/rarities/9.png';
import img10 from './assets/rarities/10.png';
import img11 from './assets/rarities/11.png';
import img12 from './assets/rarities/12.png';
import img13 from './assets/rarities/13.png';
import img14 from './assets/rarities/14.png';
import img15 from './assets/rarities/15.png';
import img16 from './assets/rarities/16.png';
import imgTop from './assets/rarities/top.png';

export default function RarityGuideView({ setCurrentView }) {
  // État pour gérer l'image actuellement affichée en grand (modal)
  const [activeModalImage, setActiveModalImage] = useState(null);
  const [activeModalTitle, setActiveModalTitle] = useState("");

  const topExample = {
    title: "Comment lire une carte Pokémon ?",
    description: "Le symbole de rareté se situe généralement tout en bas à gauche ou en bas à droite de la carte, juste à côté du numéro de collection.",
    image: imgTop
  };

  const rarities = [
    {
      id: 1,
      name: "Commune",
      symbol: "●",
      color: "text-slate-600 bg-slate-200 border-slate-300",
      description: "Ces cartes sont les plus faciles à trouver dans un booster. Elles incluent souvent des Pokémon basiques ou des objets standards.",
      image: img1
    },
    {
      id: 2,
      name: "Peu Commune",
      symbol: "◆",
      color: "text-zinc-600 bg-zinc-200 border-zinc-300",
      description: "Elles représentent souvent des Pokémon évolués ou des cartes dresseurs avec des capacités plus complexes.",
      image: img2
    },
    {
      id: 3,
      name: "Rare Holo",
      symbol: "★ Holo",
      color: "text-indigo-600 bg-indigo-100 border-indigo-300",
      description: "Les cartes rares incluent des Pokémon plus puissants ou des objets stratégiques. Elles peuvent être holographiques ou non.",
      image: img3
    },
    {
      id: 4,
      name: "Reverse",
      symbol: "Brillant global",
      color: "text-cyan-600 bg-cyan-100 border-cyan-300",
      description: "Brille partout sauf sur l'illustration principale avec un petit encart blanc en bas à droite. Elles se retrouvent sur les co/unco et holo",
      image: img4
    },
    {
      id: 5,
      name: "Reverse Pokeball-Masterball",
      symbol: "Brillant Global",
      color: "text-sky-600 bg-sky-100 border-sky-100",
      description: "Quasi identiques aux reverses, mais avec une Pokéball ou autres dans la partie brillant de la carte.",
      image: img5
    },
    {
      id: 6,
      name: "Ultra-Rare EX",
      symbol: "★★ NOIRES",
      color: "text-amber-600 bg-amber-100 border-amber-300",
      description: "Ces cartes sont souvent des Pokémon-ex ou des Pokémon-ex Téracristal. Elles représentent un bond stratégique et esthétique par rapport aux rares classiques.",
      image: img6
    },
    {
      id: 7,
      name: "Illustration Rare (AR)",
      symbol: "★ DORÉE",
      color: "text-emerald-600 bg-emerald-100 border-emerald-300",
      description: "Ces cartes se concentrent sur des illustrations immersives mettant en valeur le Pokémon dans son environnement",
      image: img7
    },    
    {
      id: 8,
      name: "Full-Art (FA)",
      symbol: "★★ Argentées",
      color: "text-rose-600 bg-rose-100 border-rose-300",
      description: "Ces cartes Full Art offrent des illustrations complètes et incluent souvent des Pokémon-ex ou des cartes Dresseur",
      image: img8
    },
    {
      id: 9,
      name: "Special Illustration Rare (SAR)",
      symbol: "★★ DORÉE",
      color: "text-purple-600 bg-purple-100 border-purple-300",
      description: "Version ultime des cartes Illustration Rare, elles associent esthétisme, rareté extrême et l'effet empreinte digitale.",
      image: img9
    },
    {
      id: 10,
      name: "Gold / Hyper Rare",
      symbol: "★★★ Dorée",
      color: "text-amber-500 bg-yellow-50 border-amber-400",
      description: "Ces cartes Full Art totalement dorée offrent des illustrations complètes et incluent souvent des Pokémon-ex ou des cartes Dresseur. Elles aussi possèdent l'effet empreinte digitale.",
      image: img10
    },
    {
      id: 11,
      name: "Promo (Black Star)",
      symbol: "Étoile Noire + PROMO",
      color: "text-neutral-800 bg-neutral-200 border-neutral-400",
      description: "Cartes distribuées lors d'événements ou dans des produits spéciaux.",
      image: img11
    },
    {
      id: 12,
      name: "VMAX / VSTAR",
      symbol: "★ VMAX/VSTAR",
      color: "text-violet-600 bg-violet-100 border-violet-300",
      description: "Évolution Gigamax ou puissance cosmique introduite dans Épée & Bouclier.",
      image: img12
    },
    {
      id: 13,
      name: "Méga attaque",
      symbol: "★★ rose et verte",
      color: "text-teal-600 bg-teal-100 border-teal-300",
      description: "Esthétiquement elles ressemblent a une Full-Art mais avec une grosse écriture japonaise dessus.",
      image: img13
    },
    {
      id: 14,
      name: "High-Tech",
      symbol: "★ ROSE",
      color: "text-orange-600 bg-orange-100 border-orange-300",
      description: "Ces cartes très reconnaissable par leurs couleurs entièrement rose.",
      image: img14
    },
    {
      id: 15,
      name: "STAMP",
      symbol: "Logo Série",
      color: "text-fuchsia-600 bg-fuchsia-100 border-fuchsia-300",
      description: "Reconnaissable avec le logo de la serie sur le bas droite de l'illustration du Pokémon.",
      image: img15
    },
    {
      id: 16,
      name: "COSMO",
      symbol: "Étoiles/Points",
      color: "text-yellow-600 bg-yellow-100 border-yellow-300",
      description: "Généralement vendu dans des duo-pack, tri-pack ou coffret, les Cosmos Holo présentent de petites étoiles ou des points lumineux dispersés sur toute la surface.",
      image: img16
    },
  ];

  // Composant interne sécurisé pour le chargement des images d'illustration
  const GuideImage = ({ src, alt, className }) => {
    const [hasError, setHasError] = useState(false);

    if (hasError || !src) {
      return (
        <div className="flex flex-col items-center justify-center p-4 text-slate-400">
          <ImageIcon size={24} className="mx-auto mb-1 text-slate-300" />
          <span className="text-[10px] uppercase font-semibold text-slate-400">{alt}</span>
        </div>
      );
    }

    return (
      <img 
        src={src} 
        alt={alt} 
        onError={() => setHasError(true)}
        className={className} 
      />
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 relative">
      {/* Bouton de retour */}
      <button 
        onClick={() => setCurrentView('home')}
        className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6 font-medium transition-colors cursor-pointer"
      >
        <ArrowLeft size={20} />
        Retour à l'accueil
      </button>

      {/* En-tête principal */}
      <div className="bg-gradient-to-r from-emerald-900 to-teal-900 rounded-2xl p-8 text-white shadow-xl mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-3 bg-emerald-800/60 rounded-xl">
            <BookOpen size={28} className="text-emerald-300" />
          </div>
          <span className="text-xs font-bold tracking-wider uppercase bg-emerald-800/80 text-emerald-200 px-3 py-1 rounded-full">
            Guide Complet & Illustré
          </span>
        </div>
        <h1 className="text-3xl font-extrabold mb-2">Encyclopédie des Raretés Pokémon</h1>
        <p className="text-emerald-100 max-w-2xl">
          Découvrez l'intégralité des catégories de raretés pour identifier, trier et valoriser chaque carte de votre collection. Clique sur n'importe quelle image pour l'agrandir en grand format.
        </p>
      </div>

      {/* Grand encart cliquable pour rediriger vers le guide des états */}
      <div 
        onClick={() => setCurrentView('condition-guide')} // Remplace 'condition-guide' par le nom de vue de ton choix
        className="bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 border border-emerald-900/40 p-6 sm:p-8 rounded-2xl shadow-xl mb-6 cursor-pointer group hover:border-emerald-500 transition-all duration-300"
      >
        <div className="flex items-center gap-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold px-3.5 py-1.5 rounded-full w-fit mb-4">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          GUIDE DES ÉTATS & QUALITÉS
        </div>
        
        <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2 group-hover:text-emerald-400 transition-colors flex items-center justify-between">
          <span>Tout savoir sur l'état des cartes</span>
          <span className="text-emerald-400 text-xl transform group-hover:translate-x-2 transition-transform">&rarr;</span>
        </h3>
        
        <p className="text-slate-300 text-sm sm:text-base max-w-3xl leading-relaxed">
          De Mint à Poor, découvrez comment évaluer précisément la condition physique de vos cartes Pokémon pour sécuriser vos achats et vos ventes sur la plateforme. Clique ici pour accéder au guide détaillé.
        </p>
      </div>

      {/* Section tout en haut pour l'exemple visuel global */}
      <div className="bg-white rounded-2xl p-6 border border-emerald-200 shadow-sm mb-10 flex flex-col md:flex-row items-center gap-6">
        <div 
          onClick={() => { if(topExample.image) { setActiveModalImage(topExample.image); setActiveModalTitle(topExample.title); }}}
          className="w-full md:w-1/3 h-48 bg-slate-100 rounded-xl border border-dashed border-slate-300 overflow-hidden flex items-center justify-center text-slate-400 group cursor-pointer hover:border-emerald-500 transition-colors relative"
        >
          <GuideImage 
            src={topExample.image} 
            alt="Exemple" 
            className="h-full w-full object-contain rounded-xl transition-transform duration-300 group-hover:scale-110" 
          />
          {topExample.image && (
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold px-2 py-1 rounded bg-black/40">
              🔍 Cliquer pour agrandir
            </div>
          )}
        </div>
        <div className="w-full md:w-2/3">
          <div className="inline-block bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full mb-2">
            Astuce de repérage
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">{topExample.title}</h2>
          <p className="text-slate-600 text-sm leading-relaxed">
            {topExample.description}
          </p>
        </div>
      </div>

      {/* Grille des parties distinctes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rarities.map((item) => (
          <div key={item.id} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
            <div>
              {/* Cadre photo cliquable pour affichage grand format */}
              <div 
                onClick={() => { if(item.image) { setActiveModalImage(item.image); setActiveModalTitle(item.name); }}}
                className="mb-4 h-36 bg-slate-50 rounded-xl overflow-hidden border border-slate-100 flex items-center justify-center text-slate-400 group cursor-pointer hover:border-emerald-400 transition-colors relative"
              >
                <GuideImage 
                  src={item.image} 
                  alt={item.name} 
                  className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-110" 
                />
                {item.image && (
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">
                    🔍 Agrandir
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-black text-slate-400">#{item.id}</span>
                {item.symbol && (
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${item.color}`}>
                    {item.symbol}
                  </span>
                )}
              </div>

              <h3 className="text-base font-bold text-slate-800 mb-2">{item.name}</h3>
              <p className="text-slate-600 text-xs mb-4 leading-relaxed">
                {item.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Fenêtre Modale (Zoom Plein Écran) */}
      {activeModalImage && (
        <div 
          onClick={() => setActiveModalImage(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="relative bg-white rounded-2xl max-w-2xl w-full p-4 md:p-6 shadow-2xl flex flex-col items-center max-h-[90vh]"
          >
            <button 
              onClick={() => setActiveModalImage(null)}
              className="absolute top-4 right-4 bg-slate-100 hover:bg-slate-200 text-slate-700 p-2 rounded-full transition-colors cursor-pointer z-10"
            >
              <X size={20} />
            </button>
            <h3 className="text-lg font-bold text-slate-800 mb-4 text-center pr-8">{activeModalTitle}</h3>
            <div className="w-full h-[70vh] flex items-center justify-center bg-slate-900 rounded-xl overflow-hidden">
              <img src={activeModalImage} alt="Zoom carte" className="max-h-full max-w-full object-contain" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}