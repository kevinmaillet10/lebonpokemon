import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabase';
import OrderTrackingModal from './OrderTrackingModal';

// 🔒 Verrou global au niveau du fichier (survit aux démontages du composant)
let globalIsSending = false;

export default function ChatModal({ conversationId, currentUserId, recipientId }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingSend, setLoadingSend] = useState(false);
  const messagesEndRef = useRef(null);

  // États pour la modale de suivi de colis
  const [isTrackingOpen, setIsTrackingOpen] = useState(false);
  const [trackingData, setTrackingData] = useState({
    step: 3,
    sellerName: "Kevin MLLT",
    trackingNumber: "61934580",
    carrier: "Mondial Relay",
    estimatedDate: "6 août - 10 août"
  });

  // Charger l'historique des messages
  useEffect(() => {
    if (!conversationId) return;

    async function fetchMessages() {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error("Erreur chargement messages :", error);
      } else {
        setMessages(data || []);
      }
    }

    fetchMessages();

    // S'abonner aux nouveaux messages en temps réel
    const channel = supabase
      .channel(`room:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          setMessages((prev) => {
            // Empêche les doublons en comparant strictement les IDs en String
            if (prev.find((msg) => String(msg.id) === String(payload.new.id))) {
              return prev;
            }
            return [...prev, payload.new];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  // Scroll automatique vers le bas
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Envoyer un message propre et synchro
  const handleSend = async (e) => {
    e.preventDefault();
    
    if (globalIsSending || !newMessage.trim()) return;

    globalIsSending = true;
    setLoadingSend(true);

    const messageContent = newMessage.trim();
    setNewMessage('');

    // Insertion avec .select() pour récupérer immédiatement l'objet inséré (avec son vrai ID et created_at)
    const { data: insertedData, error: messageError } = await supabase
      .from('messages')
      .insert([
        {
          conversation_id: conversationId,
          sender_id: currentUserId,
          content: messageContent
        }
      ])
      .select();

    if (messageError) {
      console.error("❌ Erreur lors de l'envoi du message :", messageError.message);
    } else if (insertedData && insertedData.length > 0) {
      // Ajout immédiat pour l'expéditeur sans attendre le round-trip du Realtime (évite la latence)
      setMessages((prev) => {
        const newMsg = insertedData[0];
        if (prev.find((msg) => String(msg.id) === String(newMsg.id))) {
          return prev;
        }
        return [...prev, newMsg];
      });
    }

    if (recipientId) {
      const { error: notifError } = await supabase.from('notifications').insert([
        {
          user_id: recipientId,
          title: "Nouveau message",
          message: `Vous a envoyé un message : "${messageContent.substring(0, 40)}${messageContent.length > 40 ? '...' : ''}"`,
          is_read: false
        }
      ]);

      if (notifError) {
        console.error("❌ Erreur lors de la création de la notification :", notifError.message);
      }
    }

    globalIsSending = false;
    setLoadingSend(false);
  };

  return (
    <div className="flex flex-col h-[500px] bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden relative">
      {/* En-tête interne du ChatModal avec le bouton de suivi intégré */}
      <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center z-20 relative">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center font-bold text-amber-700 text-xs shadow-xs">
            KM
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm leading-tight">Kevin MLLT</h3>
            <span className="text-[10px] text-emerald-600 font-medium">● Membre actif</span>
          </div>
        </div>
        
        <button 
          onClick={() => setIsTrackingOpen(true)}
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 border border-indigo-200/60 px-3 py-1.5 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer hover:bg-indigo-100/50"
        >
          <span>📦</span>
          <span>Suivi de commande</span>
        </button>
      </div>

      {/* Liste des messages */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3">
        {messages.map((msg) => {
          const isMe = msg.sender_id === currentUserId;
          const isSystemOrder = msg.content.includes("Achat validé") || msg.content.includes("Commande") || msg.content.includes("montant de");

          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} my-2`}>
              {isSystemOrder ? (
                <div className="max-w-[85%] bg-white border border-slate-200 rounded-2xl p-4 shadow-xs relative">
                  <div className="absolute -left-2.5 top-4 w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs shadow-xs">
                    💶
                  </div>
                  <div className="pl-3">
                    <h4 className="font-bold text-slate-800 text-xs mb-1">Mise à jour de la commande</h4>
                    <p className="text-slate-600 text-xs mb-3">{msg.content}</p>
                    <button
                      onClick={() => setIsTrackingOpen(true)}
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                    >
                      <span>Suivez-le à toutes les étapes de son acheminement. &rarr;</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-xs ${
                    isMe
                      ? 'bg-indigo-600 text-white rounded-br-xs'
                      : 'bg-slate-100 text-slate-800 rounded-bl-xs'
                  }`}
                >
                  <p>{msg.content}</p>
                  <span
                    className={`block text-[9px] mt-1 text-right ${
                      isMe ? 'text-indigo-200' : 'text-slate-400'
                    }`}
                  >
                    {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : ''}
                  </span>
                </div>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Barre de saisie */}
      <form onSubmit={handleSend} className="p-3 bg-slate-50 border-t border-slate-200 flex gap-2">
        <input
          type="text"
          placeholder="Écrivez votre message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          disabled={loadingSend}
          className="flex-1 bg-white border border-slate-300 rounded-xl px-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loadingSend}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-5 py-2 rounded-xl text-xs transition-colors cursor-pointer disabled:opacity-50"
        >
          {loadingSend ? 'Envoi...' : 'Envoyer'}
        </button>
      </form>

      <OrderTrackingModal 
        isOpen={isTrackingOpen} 
        onClose={() => setIsTrackingOpen(false)} 
        currentStep={trackingData.step} 
        sellerName={trackingData.sellerName} 
        trackingInfo={trackingData} 
      />
    </div>
  );
}