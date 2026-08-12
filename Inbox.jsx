import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import ChatModal from './ChatModal';

export default function Inbox({ currentUserId, onBack }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedChat, setSelectedChat] = useState(null);

  useEffect(() => {
    if (currentUserId) {
      fetchConversations();
    }

    // Écoute les nouveaux messages en temps réel pour actualiser la boîte de réception
    const channel = supabase
      .channel('public:messages_inbox')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `or(sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId})`,
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  async function fetchConversations() {
    try {
      setLoading(true);
      // Récupère tous les messages de l'utilisateur
      const { data: messagesData, error: msgError } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
        .order('created_at', { ascending: false });

      if (msgError) throw msgError;

      // Regrouper par interlocuteur unique
      const convMap = new Map();
      const userIdsToFetch = new Set();

      (messagesData || []).forEach(msg => {
        const otherUserId = msg.sender_id === currentUserId ? msg.receiver_id : msg.sender_id;
        userIdsToFetch.add(otherUserId);

        if (!convMap.has(otherUserId)) {
          convMap.set(otherUserId, {
            otherUserId,
            lastMessage: msg.content,
            created_at: msg.created_at,
          });
        }
      });

      // Récupérer les profils (pseudos) des interlocuteurs d'un coup
      let profilesMap = new Map();
      if (userIdsToFetch.size > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', Array.from(userIdsToFetch));

        if (profilesData) {
          profilesData.forEach(p => profilesMap.set(p.id, p));
        }
      }

      // Fusionner les données
      const formattedConversations = Array.from(convMap.values()).map(conv => {
        const profile = profilesMap.get(conv.otherUserId);
        return {
          ...conv,
          recipientName: profile?.username || `Utilisateur ${conv.otherUserId.slice(0, 6)}`,
          avatarUrl: profile?.avatar_url || null,
        };
      });

      setConversations(formattedConversations);
    } catch (err) {
      console.error("Erreur chargement conversations :", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
        >
          ← Retour au marché
        </button>
        <h2 className="text-xl font-bold text-slate-900">Messagerie</h2>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Chargement de vos messages...</div>
      ) : conversations.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-6 text-slate-500 shadow-xs">
          Aucune conversation trouvée.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs divide-y divide-slate-100">
          {conversations.map(conv => (
            <div 
              key={conv.otherUserId}
              onClick={() => setSelectedChat(conv)}
              className="p-4 hover:bg-slate-50 transition-colors cursor-pointer flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                {conv.avatarUrl ? (
                  <img src={conv.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                    {conv.recipientName[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">{conv.recipientName}</h4>
                  <p className="text-xs text-slate-500 mt-0.5 truncate max-w-md">{conv.lastMessage}</p>
                </div>
              </div>
              <span className="text-[10px] text-slate-400">
                {new Date(conv.created_at).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Modal de discussion si on clique sur une conversation */}
      {selectedChat && (
        <ChatModal
          currentUserId={currentUserId}
          recipientId={selectedChat.otherUserId}
          recipientName={selectedChat.recipientName}
          onClose={() => {
            setSelectedChat(null);
            fetchConversations();
          }}
        />
      )}
    </div>
  );
}