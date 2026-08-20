import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabase';
import { Capacitor } from '@capacitor/core';
import { BookOpen } from 'lucide-react';

export default function Navbar({ 
  currentUserId, 
  user, 
  currentView, 
  setCurrentView, 
  isUserMenuOpen, 
  setIsUserMenuOpen, 
  onOpenInbox, 
  onOpenNotifications, 
  onOpenAuth,
  onOpenMassListing,
  userListings = []
}) {
  const [unreadCount, setUnreadCount] = useState(0);
  const menuRef = useRef(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Fermer le menu si on clique en dehors
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setIsUserMenuOpen]);

  // Logique de comptage des messages non lus
  useEffect(() => {
    if (!currentUserId) return;

    async function fetchUnreadMessagesCount() {
      try {
        const { data: convs, error: convError } = await supabase
          .from('conversations')
          .select('id')
          .or(`buyer_id.eq.${currentUserId},seller_id.eq.${currentUserId}`);

        if (convError) throw convError;

        if (convs && convs.length > 0) {
          const convIds = convs.map(c => c.id);

          const { count, error: msgError } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .in('conversation_id', convIds)
            .neq('sender_id', currentUserId)
            .eq('is_read', false);

          if (!msgError) {
            setUnreadCount(count || 0);
          }
        }
      } catch (err) {
        console.error("Erreur lors du calcul des messages non lus :", err);
      }
    }

    fetchUnreadMessagesCount();

    const channel = supabase
      .channel('navbar-unread-messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          if (payload.new.sender_id !== currentUserId) {
            fetchUnreadMessagesCount();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  // Vérification si le Badge Roche est débloqué (>= 5 cartes dans userListings)
  const isBadgeRocheUnlocked = userListings.length >= 5;

  return (
    <>
      {Capacitor.isNativePlatform() ? (
        /* --- VERSION MOBILE (Menu Burger) --- */
        <header className="bg-slate-900 text-white py-3 px-4 border-b border-slate-800 flex justify-between items-center relative z-50">
          {/* Logo sur Mobile avec style et sous-titre */}
          <div 
            onClick={() => { setCurrentView('home'); setIsMobileMenuOpen(false); }}
            className="cursor-pointer flex flex-col"
          >
            <span className="font-black text-lg bg-gradient-to-r from-amber-400 to-emerald-400 bg-clip-text text-transparent flex items-center gap-1.5">
              <span>⚡</span> Le Bon Pokémon
            </span>
            <span className="text-[10px] text-slate-400 font-medium tracking-wide">
              Marketplace & Collection
            </span>
          </div>

          {/* Bouton Menu Burger ☰ / ✕ */}
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-2xl text-white focus:outline-none cursor-pointer"
          >
            {isMobileMenuOpen ? '✕' : '☰'}
          </button>

          {/* Menu déroulant vertical complet */}
          {isMobileMenuOpen && (
            <div className="absolute top-full left-0 w-full bg-slate-900 border-b border-slate-800 flex flex-col p-4 gap-3 shadow-2xl z-50 max-h-[85vh] overflow-y-auto">
              
              {/* Navigation principale */}
              <div className="flex flex-col gap-2 pb-3 border-b border-slate-800">
                <button 
                  onClick={() => { setCurrentView('home'); setIsMobileMenuOpen(false); }}
                  className="text-left py-2.5 px-4 bg-slate-800/80 hover:bg-slate-800 rounded-xl font-medium text-slate-200 flex items-center gap-2.5"
                >
                  <span>🏠</span> Accueil
                </button>
                <button 
                  onClick={() => { setCurrentView('pokedex'); setIsMobileMenuOpen(false); }}
                  className="text-left py-2.5 px-4 bg-slate-800/80 hover:bg-slate-800 rounded-xl font-medium text-slate-200 flex items-center gap-2.5"
                >
                  <span>📖</span> Pokédex
                </button>
                <button 
                  onClick={() => { setCurrentView('collection'); setIsMobileMenuOpen(false); }}
                  className="text-left py-2.5 px-4 bg-slate-800/80 hover:bg-slate-800 rounded-xl font-medium text-slate-200 flex items-center gap-2.5"
                >
                  <span>📚</span> Ma collection
                </button>
                <button 
                  onClick={() => { setCurrentView('vente-masse'); setIsMobileMenuOpen(false); }}
                  className="text-left py-2.5 px-4 bg-slate-800/80 hover:bg-slate-800 rounded-xl font-medium text-slate-200 flex items-center gap-2.5"
                >
                  <span>⚡</span> Ajout en masse
                </button>
                <button 
                  onClick={() => { setCurrentView('vente-unite'); setIsMobileMenuOpen(false); }}
                  className="text-left py-2.5 px-4 bg-slate-800/80 hover:bg-slate-800 rounded-xl font-medium text-slate-200 flex items-center gap-2.5"
                >
                  <span>➕</span> Vendre à l'unité
                </button>
              </div>

              {/* Partie Mon Compte / Profil mobile */}
              <div className="flex flex-col gap-2 pt-1">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">Mon Compte</p>
                {user ? (
                  <>
                    <div className="flex items-center gap-3 px-3 py-2.5 bg-slate-800/50 rounded-xl border border-slate-700/50">
                      <div className="relative inline-block shrink-0">
                        <div className="w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center overflow-hidden font-bold text-slate-900">
                          {user.user_metadata?.avatar_url ? (
                            <img src={user.user_metadata.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                          ) : (
                            <span>⚡</span>
                          )}
                        </div>
                        {isBadgeRocheUnlocked && (
                          <div className="absolute -bottom-0.5 -right-0.5 bg-gradient-to-r from-emerald-500 to-teal-400 text-white font-black text-[8px] w-3.5 h-3.5 rounded-full border border-white flex items-center justify-center">
                            💎
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col truncate">
                        <span className="text-xs font-bold text-white truncate">{user.user_metadata?.full_name || 'Utilisateur'}</span>
                        <span className="text-[10px] text-slate-400 truncate">{user.email}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => { setCurrentView('settings'); setIsMobileMenuOpen(false); }}
                      className="text-left py-2 px-3 text-xs font-medium text-slate-300 hover:bg-slate-800 rounded-lg flex items-center gap-2"
                    >
                      ⚙️ Paramètres du profil
                    </button>
                    <button
                      onClick={() => { setCurrentView('account'); setIsMobileMenuOpen(false); }}
                      className="text-left py-2 px-3 text-xs font-medium text-slate-300 hover:bg-slate-800 rounded-lg flex items-center gap-2"
                    >
                      📦 Mes annonces ({userListings.length})
                    </button>
                    <button
                      onClick={() => { setCurrentView('purchases'); setIsMobileMenuOpen(false); }}
                      className="text-left py-2 px-3 text-xs font-medium text-slate-300 hover:bg-slate-800 rounded-lg flex items-center gap-2"
                    >
                      🛍️ Mes achats
                    </button>
                    <button
                      onClick={() => { setCurrentView('favorites'); setIsMobileMenuOpen(false); }}
                      className="text-left py-2 px-3 text-xs font-medium text-slate-300 hover:bg-slate-800 rounded-lg flex items-center gap-2"
                    >
                      ❤️ Mes favoris
                    </button>
                    <button
                      onClick={async () => {
                        await supabase.auth.signOut();
                        setIsMobileMenuOpen(false);
                        setCurrentView('home');
                      }}
                      className="text-left py-2 px-3 text-xs font-bold text-red-400 hover:bg-red-500/10 rounded-lg flex items-center gap-2 mt-1"
                    >
                      🚪 Déconnexion
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => { onOpenAuth(); setIsMobileMenuOpen(false); }}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 px-4 rounded-xl font-bold text-xs transition-colors text-center shadow-sm"
                  >
                    Connexion / Inscription
                  </button>
                )}
              </div>

            </div>
          )}
        </header>
      ) : (
        /* --- VERSION SITE WEB PC --- */
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-2xs relative z-50">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCurrentView('home')}>
            <span className="text-xl font-black text-indigo-600">Pokémon Marketplace</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Bouton Ajout en masse */}
            {user && onOpenMassListing && (
              <button
                onClick={onOpenMassListing}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3.5 py-2.5 rounded-2xl transition-colors shadow-sm cursor-pointer flex items-center gap-1.5"
              >
                <span>⚡</span> Ajout en masse
              </button>
            )}

            {/* Bouton Notifications */}
            <button
              onClick={onOpenNotifications}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 w-11 h-11 rounded-full font-bold transition-colors cursor-pointer flex items-center justify-center text-lg relative"
              title="Notifications"
            >
              🔔
            </button>
            
            {/* BOUTON MA COLLECTION */}
            <button 
              onClick={() => setCurrentView('my-collection-series')}
              className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-colors shadow-sm cursor-pointer flex items-center gap-1.5 border border-slate-700"
            >
              <BookOpen className="text-emerald-400" size={16} />
              Ma collection
            </button>

            {/* Bouton Messages avec compteur non lu */}
            <button
              onClick={onOpenInbox}
              className="relative bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-4 py-2.5 rounded-2xl font-bold transition-colors cursor-pointer flex items-center gap-2 text-sm"
            >
              <span>💬</span>
              <span>Messages</span>
              
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-xs font-black px-2 py-0.5 rounded-full shadow-xs animate-pulse">
                  {unreadCount} non lu{unreadCount > 1 ? 's' : ''}
                </span>
              )}
            </button>

            {/* Menu Profil / Utilisateur */}
            {user ? (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2.5 bg-slate-900 hover:bg-slate-800 text-white pl-1.5 pr-3 py-1.5 rounded-full transition-colors cursor-pointer shadow-sm"
                >
                  <div className="relative inline-block shrink-0">
                    <div className="w-9 h-9 rounded-full bg-amber-400 flex items-center justify-center overflow-hidden font-bold text-slate-900">
                      {user.user_metadata?.avatar_url ? (
                        <img src={user.user_metadata.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <span>⚡</span>
                      )}
                    </div>

                    <div className={`absolute inset-0 rounded-full border-2 pointer-events-none transition-all ${
                      isBadgeRocheUnlocked 
                        ? 'border-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]' 
                        : 'border-slate-600 opacity-50'
                    }`}></div>

                    {isBadgeRocheUnlocked && (
                      <div className="absolute -bottom-0.5 -right-0.5 bg-gradient-to-r from-emerald-500 to-teal-400 text-white font-black text-[9px] w-4 h-4 rounded-full border border-white shadow-sm flex items-center justify-center">
                        💎
                      </div>
                    )}
                  </div>

                  <span className="text-xs font-bold pr-1">{user.user_metadata?.full_name || user.email}</span>
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50">
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="text-xs font-bold text-slate-900">{user.user_metadata?.full_name || 'Utilisateur'}</p>
                      <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                    </div>

                    <div className="py-1">
                      <button
                        onClick={() => {
                          setCurrentView('settings');
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer flex items-center gap-2"
                      >
                        ⚙️ Paramètres du profil
                      </button>

                      <button
                        onClick={() => {
                          setCurrentView('account');
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer flex items-center gap-2"
                      >
                        📦 Mes annonces ({userListings.length})
                      </button>

                      <button
                        onClick={() => {
                          setCurrentView('purchases');
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer flex items-center gap-2"
                      >
                        🛍️ Mes achats
                      </button>

                      <button
                        onClick={() => {
                          setCurrentView('favorites');
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer flex items-center gap-2"
                      >
                        ❤️ Mes favoris
                      </button>
                    </div>

                    <div className="border-t border-slate-100 pt-1">
                      <button
                        onClick={async () => {
                          await supabase.auth.signOut();
                          setIsUserMenuOpen(false);
                          setCurrentView('home');
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                      >
                        Déconnexion
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-2xl font-bold transition-colors cursor-pointer text-sm shadow-sm"
              >
                Connexion
              </button>
            )}
          </div>
        </header>
      )}
    </>
  );
}