import React, { useState, useRef, useEffect } from 'react';

export default function PokemonMusicPlayer({ playlist = [] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef(null);

  const currentTrack = playlist[currentIndex] || { title: "Aucune musique", url: "" };

  // Volume par défaut à 30% pour ne pas agresser les oreilles au chargement
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = 0.3;
    }
  }, []);

  const togglePlay = () => {
    if (!audioRef.current || !currentTrack.url) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(e => console.log("Erreur lecture audio:", e));
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const nextTrack = () => {
    if (playlist.length === 0) return;
    const nextIndex = (currentIndex + 1) % playlist.length;
    setCurrentIndex(nextIndex);
    setIsPlaying(true);
  };

  const prevTrack = () => {
    if (playlist.length === 0) return;
    const prevIndex = (currentIndex - 1 + playlist.length) % playlist.length;
    setCurrentIndex(prevIndex);
    setIsPlaying(true);
  };

  // Lancer automatiquement la lecture si on change de piste et que c'était déjà en train de jouer
  useEffect(() => {
    if (isPlaying && audioRef.current) {
      audioRef.current.play().catch(e => console.log("Erreur lecture audio:", e));
    }
  }, [currentIndex]);

  return (
    <div className="fixed bottom-4 right-4 bg-slate-900/90 backdrop-blur-md text-white border border-slate-700/60 p-3 rounded-2xl shadow-2xl flex items-center gap-3 z-40 max-w-xs w-full">
      <audio 
        ref={audioRef} 
        src={currentTrack.url} 
        onEnded={nextTrack} 
      />
      
      {/* Icône / Miniature style Pokéball */}
      <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0 shadow-inner">
        <span className="text-base">🎵</span>
      </div>

      {/* Titre avec effet défilant */}
      <div className="flex-1 overflow-hidden">
        <div className="text-[9px] text-indigo-300 font-bold uppercase tracking-wider">Radio Pokémon</div>
        <div className="overflow-hidden whitespace-nowrap relative w-full">
          <div className="inline-block animate-marquee text-xs font-semibold text-slate-100">
            {currentTrack.title}
          </div>
        </div>
      </div>

      {/* Boutons de contrôle */}
      <div className="flex items-center gap-1 shrink-0">
        <button 
          onClick={prevTrack} 
          className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer" 
          title="Musique précédente"
        >
          ⏮
        </button>
        <button 
          onClick={togglePlay} 
          className="w-8 h-8 bg-indigo-600 hover:bg-indigo-500 rounded-xl flex items-center justify-center text-white transition-colors cursor-pointer shadow-sm" 
          title={isPlaying ? "Pause" : "Lecture"}
        >
          {isPlaying ? "⏸" : "▶"}
        </button>
        <button 
          onClick={nextTrack} 
          className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer" 
          title="Musique suivante"
        >
          ⏭
        </button>
        <button 
          onClick={toggleMute} 
          className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer" 
          title={isMuted ? "Activer le son" : "Couper le son"}
        >
          {isMuted ? "🔇" : "🔊"}
        </button>
      </div>
    </div>
  );
}