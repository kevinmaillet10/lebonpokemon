import React, { useEffect, useState, useRef } from 'react';
import { supabase } from './supabase';
import OrderTrackingModal from './OrderTrackingModal';

export default function InboxView({ currentUserId, activeConversationId, onBack }) {
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [zoomedImage, setZoomedImage] = useState(null);

  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [filterType, setFilterType] = useState('all');

  const [selectedConversations, setSelectedConversations] = useState([]);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const [isTrackingOpen, setIsTrackingOpen] = useState(false);
  const isFinished = (activeConv?.order_step || 1) === 6;

  useEffect(() => {
    if (!currentUserId) return;
    fetchConversations();
  }, [currentUserId]);

  useEffect(() => {
    if (!activeConversationId) return;

    if (conversations.length > 0) {
      const found = conversations.find(c => c.id === activeConversationId);
      if (found) {
        setActiveConv(found);
        return;
      }
    }

    async function fetchSingleConversation() {
      const { data: conv, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', activeConversationId)
        .single();

      if (error || !conv) return;

      const otherUserId = conv.buyer_id === currentUserId ? conv.seller_id : conv.buyer_id;
      
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .eq('id', otherUserId)
        .single();

      let listingData = null;
      if (conv.listing_id) {
        const { data: foundListing } = await supabase
          .from('listings')
          .select('id, price, condition, description, cards(name, image_url)')
          .eq('id', conv.listing_id)
          .single();
        listingData = foundListing;
      }

      const enriched = {
        ...conv,
        buyer: conv.buyer_id === currentUserId ? { id: currentUserId } : profileData,
        seller: conv.seller_id === currentUserId ? { id: currentUserId } : profileData,
        listing: listingData,
        unreadCount: 0,
        lastMessage: null
      };

      setConversations(prev => {
        const map = new Map(prev.map(c => [c.id, c]));
        map.set(enriched.id, enriched);
        return Array.from(map.values());
      });
      setActiveConv(enriched);
    }

    fetchSingleConversation();
  }, [activeConversationId, conversations.length, currentUserId]);

  useEffect(() => {
    if (!activeConv) return;
    fetchMessages(activeConv.id);
    markMessagesAsRead(activeConv.id);

    const channel = supabase
      .channel(`room:${activeConv.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${activeConv.id}`
      }, (payload) => {
        setMessages(prev => [...prev, payload.new]);
        if (payload.new.sender_id !== currentUserId) {
          markMessagesAsRead(activeConv.id);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeConv]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function fetchConversations() {
    try {
      setLoadingConversations(true);
      
      const { data: convsData, error: convsError } = await supabase
        .from('conversations')
        .select('*')
        .or(`buyer_id.eq.${currentUserId},seller_id.eq.${currentUserId}`)
        .order('updated_at', { ascending: false });

      if (convsError) throw convsError;
      if (!convsData || convsData.length === 0) {
        setConversations([]);
        return;
      }

      const enrichedConversations = await Promise.all(
        convsData.map(async (conv) => {
          const otherUserId = conv.buyer_id === currentUserId ? conv.seller_id : conv.buyer_id;
          
          const { data: profileData } = await supabase
            .from('profiles')
            .select('id, username, avatar_url')
            .eq('id', otherUserId)
            .single();

          let listingData = null;
          if (conv.listing_id) {
            const { data: foundListing } = await supabase
              .from('listings')
              .select('id, price, condition, description, cards(name, image_url)')
              .eq('id', conv.listing_id)
              .single();
            listingData = foundListing;
          }

          const { data: msgsData } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: true });

          const unreadCount = (msgsData || []).filter(
            m => m.sender_id !== currentUserId && !m.is_read
          ).length;

          const lastMessage = msgsData && msgsData.length > 0 ? msgsData[msgsData.length - 1] : null;

          return {
            ...conv,
            buyer: conv.buyer_id === currentUserId ? { id: currentUserId } : profileData,
            seller: conv.seller_id === currentUserId ? { id: currentUserId } : profileData,
            listing: listingData,
            unreadCount,
            lastMessage
          };
        })
      );

      const uniqueMap = new Map();
      enrichedConversations.forEach(c => {
        uniqueMap.set(c.id, c);
      });
      setConversations(Array.from(uniqueMap.values()));

      if (uniqueMap.size > 0 && !activeConversationId && !activeConv) {
        setActiveConv(Array.from(uniqueMap.values())[0]);
      }
    } catch (err) {
      console.error("Erreur chargement conversations :", err);
    } finally {
      setLoadingConversations(false);
    }
  }

  async function fetchMessages(convId) {
    try {
      setLoadingMessages(true);
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true });

      if (!error) {
        setMessages(data || []);
      }
    } catch (err) {
      console.error("Erreur catch messages :", err);
    } finally {
      setLoadingMessages(false);
    }
  }

  async function markMessagesAsRead(convId) {
    try {
      const { data: unreadMsgs, error: fetchError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', convId)
        .eq('is_read', false);

      if (fetchError) throw fetchError;

      if (unreadMsgs && unreadMsgs.length > 0) {
        const idsToUpdate = unreadMsgs
          .filter(m => m.sender_id !== currentUserId)
          .map(m => m.id);

        if (idsToUpdate.length > 0) {
          await supabase
            .from('messages')
            .update({ is_read: true })
            .in('id', idsToUpdate);
        }
      }

      setConversations(prev => prev.map(c => c.id === convId ? { ...c, unreadCount: 0 } : c));
    } catch (err) {
      console.error("Erreur marquage lecture :", err);
    }
  }

  async function handleSendMessage(e) {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedFile) || !activeConv || !currentUserId) return;

    const textToSend = newMessage.trim();
    let imageUrl = null;

    setUploadingImage(true);

    try {
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
        const filePath = `${activeConv.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('messages-images')
          .upload(filePath, selectedFile);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('messages-images')
          .getPublicUrl(filePath);

        imageUrl = publicUrlData.publicUrl;
      }

      const { error } = await supabase.from('messages').insert({
        conversation_id: activeConv.id,
        sender_id: currentUserId,
        content: textToSend,
        image_url: imageUrl,
        is_read: false
      });

      if (error) throw error;

      await supabase
        .from('conversations')
        .update({ updated_at: new Date() })
        .eq('id', activeConv.id);

      const recipientId = activeConv.buyer_id === currentUserId ? activeConv.seller_id : activeConv.buyer_id;

      await supabase.from('notifications').insert([
        {
          user_id: recipientId,
          title: "Nouveau message",
          message: `Vous a envoyé un message.`,
          is_read: false
        }
      ]);

      setNewMessage('');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      fetchMessages(activeConv.id);
    } catch (err) {
      console.error("Erreur envoi message :", err);
      alert("Impossible d'envoyer le message ou l'image. Vérifiez que le bucket 'messages-images' existe bien dans Supabase.");
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleDeleteSelected() {
    if (selectedConversations.length === 0) return;

    if (!window.confirm(`Voulez-vous vraiment supprimer les ${selectedConversations.length} conversation(s) sélectionnée(s) ?`)) {
      return;
    }

    const idsToDelete = [...selectedConversations];

    try {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .in('id', idsToDelete);

      if (error) throw error;

      setConversations(prev => prev.filter(c => !idsToDelete.includes(c.id)));
      
      if (activeConv && idsToDelete.includes(activeConv.id)) {
        setActiveConv(null);
        setMessages([]);
      }

      setSelectedConversations([]);
    } catch (err) {
      console.error("Erreur lors de la suppression des conversations :", err);
      alert("Impossible de supprimer les conversations.");
    }
  }

  const getOtherUser = (conv) => {
    if (!conv) return { username: 'Utilisateur' };
    return conv.buyer_id === currentUserId ? conv.seller : conv.buyer;
  };

  const filteredConversations = conversations.filter(conv => {
    if (filterType === 'unread') return conv.unreadCount > 0;
    return true;
  });

return (
    <div className="space-y-4 max-w-7xl mx-auto relative">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
        >
          ← Retour au marché
        </button>
        <h2 className="text-xl font-bold text-slate-900">Messagerie</h2>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[650px]">
        
        {/* COLONNE GAUCHE */}
        <div className="md:col-span-4 border-r border-slate-200 flex flex-col bg-slate-50/40">
          <div className="p-4 border-b border-slate-200 flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                <button
                  onClick={() => setFilterType('all')}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                    filterType === 'all' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Tout ({conversations.length})
                </button>
                <button
                  onClick={() => setFilterType('unread')}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                    filterType === 'unread' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Non lus ({conversations.filter(c => c.unreadCount > 0).length})
                </button>
              </div>
            </div>

            {selectedConversations.length > 0 && (
              <div className="flex items-center justify-between bg-red-50 p-2.5 rounded-xl border border-red-200">
                <span className="text-xs text-red-700 font-bold">
                  {selectedConversations.length} sélectionnée(s)
                </span>
                <button
                  onClick={handleDeleteSelected}
                  className="flex items-center gap-1.5 bg-red-600 text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-red-700 transition cursor-pointer"
                >
                  Supprimer
                </button>
              </div>
            )}
          </div>

          <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
            {loadingConversations ? (
              <div className="p-6 text-center text-xs text-slate-400">Chargement...</div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">Aucune conversation trouvée.</div>
            ) : (
              filteredConversations.map((conv) => {
                const other = getOtherUser(conv);
                const isSelected = activeConv?.id === conv.id;
                const isChecked = selectedConversations.includes(conv.id);
                const card = conv.listing?.cards;
                const hasUnread = conv.unreadCount > 0;
                
                const isConvFinished = (conv?.order_step || 1) === 6;

                return (
                  <div
                    key={conv.id}
                    onClick={() => setActiveConv(conv)}
                    className={`p-3.5 cursor-pointer transition-colors flex items-center gap-3 relative ${
                      isChecked ? 'bg-red-50/50' : isSelected ? 'bg-indigo-50/80 border-l-4 border-indigo-600' : 'hover:bg-slate-100/70'
                    }`}
                  >
                    <input 
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        e.stopPropagation();
                        if (e.target.checked) {
                          setSelectedConversations([...selectedConversations, conv.id]);
                        } else {
                          setSelectedConversations(selectedConversations.filter(id => id !== conv.id));
                        }
                      }}
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 shrink-0 cursor-pointer"
                    />

                    <div className={`relative w-12 h-12 rounded-xl overflow-hidden bg-slate-200 shrink-0 border border-slate-200 ${isConvFinished ? 'opacity-60 grayscale' : ''}`}>
                      {card?.image_url ? (
                        <img src={card.image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400">Card</div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between items-center mb-0.5">
                        <p className={`text-xs truncate ${isConvFinished ? 'text-slate-400 font-normal' : hasUnread ? 'font-black text-slate-900 text-[13px]' : 'font-bold text-slate-800'}`}>
                          {card?.name || 'Annonce'}
                        </p>
                      </div>
                      <p className={`text-[11px] truncate ${isConvFinished ? 'text-slate-400 italic' : hasUnread ? 'font-bold text-slate-900' : 'text-slate-500'}`}>
                        {isConvFinished ? (
                          <span className="text-slate-400 font-medium">Transaction terminée</span>
                        ) : (
                          <>
                            <span className="text-indigo-600 font-semibold">{other?.username || 'Membre'}</span> : {conv.lastMessage?.content || (conv.lastMessage?.image_url ? '📷 [Image]' : 'Démarrer la discussion...')}
                          </>
                        )}
                      </p>
                    </div>

                    {hasUnread && !isConvFinished && (
                      <span className="bg-indigo-600 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shrink-0 shadow-sm">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div> 

        {/* COLONNE CENTRALE */}
        <div className={`md:col-span-5 flex flex-col bg-white border-r border-slate-200 ${!activeConv ? 'hidden md:flex' : ''}`}>
          {activeConv ? (
            <>
              <div className="p-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/30">
                <div className="flex items-center gap-2.5">
                  {(() => {
                    const other = getOtherUser(activeConv);
                    return (
                      <>
                        {other?.avatar_url ? (
                          <img src={other.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] font-bold text-white">
                            {other?.username ? other.username[0].toUpperCase() : 'U'}
                          </div>
                        )}
                        <span className="text-xs font-bold text-slate-900">{other?.username || 'Membre'}</span>
                      </>
                    );
                  })()}
                </div>
              </div>

              <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/20 max-h-[480px]">
                {loadingMessages ? (
                  <div className="text-center text-xs text-slate-400 py-8">Chargement...</div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-xs text-slate-400 py-8">Envoyez votre premier message !</div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.sender_id === currentUserId;
                    const isSystemOrder = msg.content?.includes("Achat validé") || msg.content?.includes("Commande") || msg.content?.includes("colis");

                    if (isSystemOrder) {
                      return (
                        <div key={msg.id} className="flex justify-center my-3">
                          <div className="w-full max-w-md bg-white border border-indigo-100 rounded-2xl p-4 shadow-xs relative">
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 font-bold text-sm">
                                📦
                              </div>
                              <div className="flex-1">
                                <h4 className="font-bold text-slate-900 text-xs mb-1">Suivi de commande</h4>
                                <p className="text-slate-600 text-xs mb-3">{msg.content}</p>
                                <button
                                  type="button"
                                  onClick={() => setIsTrackingOpen(true)}
                                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 transition-colors"
                                >
                                  <span>Suivez-le à toutes les étapes de son acheminement &rarr;</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-xs rounded-2xl p-3 text-xs shadow-sm space-y-2 ${
                            isMe ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
                          }`}
                        >
                          {msg.image_url && (
                            <div 
                              onClick={() => setZoomedImage(msg.image_url)}
                              className="relative group cursor-pointer overflow-hidden rounded-xl border border-white/20"
                            >
                              <img 
                                src={msg.image_url} 
                                alt="Pièce jointe" 
                                className="w-full h-36 object-cover transition-transform duration-300 group-hover:scale-105 block"
                              />
                              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] font-bold text-white pointer-events-none">
                                Cliquer pour zoomer
                              </div>
                            </div>
                          )}

                          {msg.content && <p>{msg.content}</p>}

                          <span className={`block text-[9px] text-right ${isMe ? 'text-indigo-200' : 'text-slate-400'}`}>
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {(activeConv?.order_step || 1) === 6 ? (
                <div className="p-4 bg-slate-100 border-t border-slate-200 text-center">
                  <p className="text-xs font-bold text-slate-500">
                    🔒 Cette transaction est terminée. La messagerie est désormais archivée.
                  </p>
                </div>
              ) : (
                <div className="p-3 border-t border-slate-200 bg-white flex flex-col gap-2">
                  {selectedFile && (
                    <div className="flex items-center justify-between bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-200 animate-fadeIn">
                      <span className="text-xs text-indigo-700 font-bold truncate">
                        📎 {selectedFile.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFile(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="text-xs text-red-600 font-bold hover:underline shrink-0 ml-2"
                      >
                        Supprimer
                      </button>
                    </div>
                  )}

                  <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
                    <input 
                      type="file"
                      ref={fileInputRef}
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setSelectedFile(e.target.files[0]);
                        }
                      }}
                      accept="image/*"
                      className="hidden"
                    />

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 rounded-xl border bg-slate-50 border-slate-300 text-slate-600 hover:bg-slate-100 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                      title="Envoyer une photo depuis le PC"
                    >
                      📷 Joindre
                    </button>

                    <input
                      type="text"
                      placeholder="Écrivez votre message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="submit"
                      disabled={uploadingImage}
                      className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-300 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors cursor-pointer shadow-sm shrink-0"
                    >
                      {uploadingImage ? 'Envoi...' : 'Envoyer'}
                    </button>
                  </form>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-6 text-slate-400 text-xs">
              Sélectionnez une conversation.
            </div>
          )}
        </div>

        {/* COLONNE DROITE */}
        <div className="md:col-span-3 bg-white p-4 flex flex-col justify-between hidden md:flex">
          {activeConv && activeConv.listing ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                {(() => {
                  const other = getOtherUser(activeConv);
                  return (
                    <>
                      <div className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">
                        {other?.username ? other.username[0].toUpperCase() : 'U'}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">{other?.username}</p>
                        <p className="text-[10px] text-slate-400">Membre actif</p>
                      </div>
                    </>
                  );
                })()}
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-3">
                <div className="h-32 rounded-xl overflow-hidden bg-white flex items-center justify-center border border-slate-200 relative group cursor-pointer">
                  {activeConv.listing.cards?.image_url ? (
                    <img 
                      src={activeConv.listing.cards.image_url} 
                      alt="" 
                      className="h-full object-contain transition-transform group-hover:scale-105" 
                      onClick={() => setZoomedImage(activeConv.listing.cards.image_url)}
                    />
                  ) : (
                    <span className="text-xs text-slate-400">Pas d'image</span>
                  )}
                </div>
                <div>
                  <p className="text-xs font-black text-slate-900">{activeConv.listing.cards?.name}</p>
                  <p className="text-sm font-black text-indigo-600 mt-0.5">{activeConv.listing.price} €</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-xs text-slate-400 my-auto">
              Sélectionnez une discussion pour voir l'annonce associée.
            </div>
          )}
        </div>

      </div>

      {/* MODALE DE ZOOM D'IMAGE (LIGHTBOX) */}
      {zoomedImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setZoomedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl bg-black p-2 border border-white/10 shadow-2xl">
            <button 
              onClick={() => setZoomedImage(null)}
              className="absolute top-4 right-4 z-10 bg-black/60 hover:bg-black text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm cursor-pointer border border-white/20"
            >
              ✕
            </button>
            <img 
              src={zoomedImage} 
              alt="Zoom grand format" 
              className="max-w-full max-h-[85vh] object-contain rounded-xl mx-auto"
            />
          </div>
        </div>
      )}

      {/* MODALE DE SUIVI DE COMMANDE */}
      <OrderTrackingModal 
        isOpen={isTrackingOpen} 
        onClose={() => setIsTrackingOpen(false)} 
        currentStep={activeConv?.order_step || 1} 
        sellerName={activeConv ? getOtherUser(activeConv)?.username : "Le vendeur"} 
        trackingInfo={activeConv?.tracking_number ? { number: activeConv.tracking_number, carrier: activeConv.carrier } : null}
      />
    </div>
  );
}