import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';

export default function NotificationBell({ currentUserId, onOpenConversation, onOpenListing }) {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  
  useEffect(() => {
    if (!currentUserId) return;
    
    const fetchNotifs = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*, listings(*)')
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false })
        .limit(10);
      if (data) setNotifications(data);
    };

    fetchNotifs();

    const channelName = `notifications_user_${currentUserId}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${currentUserId}`
        },
        (payload) => {
          if (payload.new) {
            setNotifications((prev) => [payload.new, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  // Fonction pour ouvrir/fermer le menu et marquer comme lu
  const toggleDropdown = async () => {
    setIsOpen(!isOpen);
    if (unreadCount > 0) {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', currentUserId)
        .eq('is_read', false);
      
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
    }
  };

  const handleNotificationClick = (notif) => {
    setIsOpen(false);
    
    if (notif.conversation_id && onOpenConversation) {
      onOpenConversation(notif.conversation_id);
    } else if (notif.listing_id && onOpenListing) {
      onOpenListing(notif.listing_id);
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={toggleDropdown}
        className="relative bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold w-9 h-9 rounded-xl transition-colors shadow-sm cursor-pointer flex items-center justify-center border border-slate-700"
        title="Notifications"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-black animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-[#1e222b] rounded-2xl shadow-2xl border border-slate-700/80 p-4 z-50 text-white">
          <h3 className="font-black text-white text-sm mb-3">Notifications</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {notifications.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">Aucune notification pour le moment.</p>
            ) : (
              notifications.map(notif => {
                const isClickable = notif.conversation_id || notif.listing_id;
                return (
                  <div 
                    key={notif.id} 
                    onClick={() => handleNotificationClick(notif)}
                    className={`p-3 rounded-xl text-xs transition-all border ${
                      isClickable ? 'cursor-pointer hover:border-indigo-500/50' : 'border-transparent'
                    } ${
                      notif.is_read 
                        ? 'bg-[#16181d] text-slate-400 border-slate-800' 
                        : 'bg-indigo-950/40 text-indigo-200 border-indigo-800/60 font-medium'
                    }`}
                  >
                    {notif.title && <p className="font-bold text-white mb-0.5">{notif.title}</p>}
                    <p>{notif.message}</p>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-[10px] text-slate-500">{new Date(notif.created_at).toLocaleDateString()}</span>
                      {notif.conversation_id && <span className="text-[10px] text-indigo-400 font-bold">Voir la discussion →</span>}
                      {notif.listing_id && <span className="text-[10px] text-indigo-400 font-bold">Voir l'annonce →</span>}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}