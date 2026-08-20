import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../supabase';

export default function WhosThatPokemon({ isOpen, onClose, onSelectProfile }) {
  const [pokemon, setPokemon] = useState(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [guess, setGuess] = useState('');
  const [message, setMessage] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [userRankData, setUserRankData] = useState(null);
  const [isDisabled, setIsDisabled] = useState(false);

  const getWeekIdentifier = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getFullYear()}-W${String(weekNo).padStart(2, '0')}`;
  };

  useEffect(() => {
    if (isOpen) {
      loadNewPokemon();
      loadLeaderboard();
    }
  }, [isOpen]);

  async function loadNewPokemon() {
    setIsRevealed(false);
    setMessage(null);
    setGuess('');
    setIsDisabled(false);

    const { data, error } = await supabase
      .from('pokedex')
      .select('*');

    if (error || !data || data.length === 0) return;

    const randomPokemon = data[Math.floor(Math.random() * data.length)];
    setPokemon(randomPokemon);
  }

  async function loadLeaderboard() {
    try {
      const weekId = getWeekIdentifier();
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('pokemon_game_scores')
        .select('score, user_id, profiles (username, avatar_url)')
        .eq('week_identifier', weekId)
        .order('score', { ascending: false })
        .limit(10);

      if (!error && data) {
        setLeaderboard(data);

        if (user) {
          const userInTop = data.findIndex(row => row.user_id === user.id);
          
          if (userInTop === -1) {
            const { data: myScoreData } = await supabase
              .from('pokemon_game_scores')
              .select('score, profiles (username)')
              .eq('user_id', user.id)
              .eq('week_identifier', weekId)
              .maybeSingle();

            if (myScoreData) {
              const { count } = await supabase
                .from('pokemon_game_scores')
                .select('*', { count: 'exact', head: true })
                .eq('week_identifier', weekId)
                .gt('score', myScoreData.score);

              setUserRankData({
                rank: (count || 0) + 1,
                score: myScoreData.score,
                username: myScoreData.profiles?.username || 'Vous'
              });
            } else {
              setUserRankData(null);
            }
          } else {
            setUserRankData(null);
          }
        }
      }
    } catch (err) {
      console.error("Erreur classement:", err);
      setLeaderboard([]);
    }
  }

  async function handleGuess(e) {
    e.preventDefault();
    if (!guess.trim() || !pokemon || isDisabled) return;

    setIsDisabled(true);
    setIsRevealed(true);

    const normalize = (str) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    
    if (normalize(guess) === normalize(pokemon.name)) {
      setMessage({ type: 'success', text: `🎉 Gagnant ! C'était bien ${pokemon.name}` });

      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) return;

        const weekId = getWeekIdentifier();

        const { data: existing } = await supabase
          .from('pokemon_game_scores')
          .select('id, score')
          .eq('user_id', user.id)
          .eq('week_identifier', weekId)
          .maybeSingle();

        if (existing) {
          await supabase
            .from('pokemon_game_scores')
            .update({ score: existing.score + 1, updated_at: new Date() })
            .eq('id', existing.id);
        } else {
          await supabase
            .from('pokemon_game_scores')
            .insert({ 
              user_id: user.id, 
              score: 1, 
              week_identifier: weekId,
              updated_at: new Date() 
            });
        }

        loadLeaderboard();
      } catch (err) {
        console.error("Erreur score:", err);
      }

    } else {
      setMessage({ type: 'error', text: `❌ Perdu ! C'était ${pokemon.name}` });
    }

    setTimeout(() => {
      loadNewPokemon();
    }, 3000);
  }

  const pokemonImg = pokemon?.image_url || pokemon?.image || pokemon?.sprite;

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl p-6 md:p-8 text-white shadow-2xl relative animate-in zoom-in-95 duration-200">
        
        {/* En-tête */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
          <h3 className="text-xl font-black text-amber-400 flex items-center gap-2">
            ⚡ Qui est ce Pokémon ?
          </h3>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 p-2.5 rounded-xl transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Corps principal */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Bloc Jeu */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between shadow-inner">
            <div className="relative bg-gradient-to-b from-sky-400 to-blue-600 rounded-xl p-4 flex items-center justify-center h-64 overflow-hidden shadow-inner mb-4">
              {pokemonImg ? (
                <img 
                  src={pokemonImg} 
                  alt="Pokémon mystère" 
                  className={`h-48 w-48 object-contain transition-all duration-300 ${isRevealed ? '' : 'filter brightness-0'}`}
                />
              ) : (
                <div className="text-sm text-white/85 animate-pulse font-bold">Chargement...</div>
              )}
              {message && (
                <div className={`absolute inset-0 bg-slate-950/90 flex items-center justify-center text-center p-4 text-lg font-bold ${message.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                  {message.text}
                </div>
              )}
            </div>

            <form onSubmit={handleGuess} className="flex gap-2">
              <input 
                type="text" 
                value={guess}
                onChange={(e) => setGuess(e.target.value)}
                placeholder="Nom du Pokémon..." 
                disabled={isDisabled}
                className="bg-slate-900 text-sm rounded-xl px-4 py-3.5 w-full border border-slate-700 focus:outline-none focus:border-amber-400 text-white disabled:opacity-50"
              />
              <button type="submit" disabled={isDisabled} className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-6 py-3.5 rounded-xl text-sm transition cursor-pointer disabled:opacity-50 shadow-lg whitespace-nowrap">
                Valider
              </button>
            </form>
          </div>

          {/* Bloc Classement */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                🏆 Classement de la semaine
              </h4>
              <div className="space-y-2 text-sm overflow-y-auto max-h-72 pr-1">
                {leaderboard.length === 0 ? (
                  <div className="text-xs text-slate-500 text-center py-16">Aucun score pour le moment</div>
                ) : (
                  leaderboard.map((row, index) => {
                    const username = row.profiles?.username || `Dresseur #${row.user_id?.slice(0, 5)}`;
                    const avatar = row.profiles?.avatar_url;

                    return (
                      <div 
                        key={index} 
                          onClick={() => {
                            console.log("Clic sur l'utilisateur ID:", row.user_id); // Ajoute ce log
                            if (onSelectProfile && row.user_id) {
                                onSelectProfile(row.user_id);
                            } else {
                                console.log("Erreur : onSelectProfile n'est pas défini ou l'ID est manquant");
                            }
                          }}
                        className="flex items-center justify-between bg-slate-900 hover:bg-slate-800 p-3 rounded-xl border border-slate-800/60 transition cursor-pointer group"
                      >
                        <div className="flex items-center gap-3 truncate">
                          <span className="text-xs font-bold text-slate-500 w-5">#{index + 1}</span>
                          {avatar ? (
                            <img src={avatar} alt={username} className="w-8 h-8 rounded-full object-cover border border-slate-700" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-amber-400 border border-slate-700">
                              {username.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className="text-slate-200 font-medium truncate group-hover:text-amber-300 transition">{username}</span>
                        </div>
                        <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-full whitespace-nowrap">{row.score} pts</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Encart position personnelle si hors du top 10 */}
            {userRankData && (
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between bg-amber-500/5 border border-amber-500/20 p-3 rounded-xl">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-amber-400">Votre position :</span>
                  <span className="text-sm font-bold text-white">#{userRankData.rank}</span>
                </div>
                <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full">{userRankData.score} pts</span>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>,
    document.body
  );
}