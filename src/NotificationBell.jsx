import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';

export default function NotificationBell({ currentUserId, onOpenConversation }) {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  
  useEffect(() => {
    if (!currentUserId) return;
    
    const fetchNotifs = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false })
        .limit(10);
      if (data) setNotifications(data);
    };

    fetchNotifs();

    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          if (payload.new && payload.new.user_id === currentUserId) {
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
    // Si la notification possède un ID de conversation, on ouvre directement le chat associé
    if (notif.conversation_id && onOpenConversation) {
      setIsOpen(false);
      onOpenConversation(notif.conversation_id);
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
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 z-50 text-slate-800">
          <h3 className="font-black text-slate-900 text-sm mb-3">Notifications</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">Aucune notification pour le moment.</p>
            ) : (
              notifications.map(notif => (
                <div 
                  key={notif.id} 
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-3 rounded-xl text-xs transition-all ${notif.conversation_id ? 'cursor-pointer hover:bg-indigo-100/60' : ''} ${notif.is_read ? 'bg-slate-50 text-slate-600' : 'bg-indigo-50/60 text-indigo-900 font-medium'}`}
                >
                  {notif.title && <p className="font-bold mb-0.5">{notif.title}</p>}
                  <p>{notif.message}</p>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-[10px] text-slate-400">{new Date(notif.created_at).toLocaleDateString()}</span>
                    {notif.conversation_id && <span className="text-[10px] text-indigo-600 font-bold">Voir la discussion →</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}