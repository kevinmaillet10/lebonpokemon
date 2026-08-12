import React, { useEffect, useState, useMemo, useRef } from 'react';
import { supabase } from './supabase';
import AuthModal from './AuthModal';
import CreateListingModal from './CreateListingModal';
import CardDetailModal from './CardDetailModal';
import MassListing from './MassListing';
import FranceFilter from './FranceFilter';
import SingleListing from './SingleListing';
import InboxView from './InboxView';

// ==========================================
// COMPOSANT MODALE DE MODIFICATION D'ANNONCE
// ==========================================
function EditListingModal({ listing, onClose, onUpdated }) {
  const [price, setPrice] = useState(listing.price || '');
  const [condition, setCondition] = useState(listing.condition || 'Mint');
  const [language, setLanguage] = useState(listing.language || 'Français');
  const [finish, setFinish] = useState(listing.finish || 'Normale');
  const [quantity, setQuantity] = useState(listing.quantity || 1);
  const [notes, setNotes] = useState(listing.notes || '');
  const [loading, setLoading] = useState(false);

  async function handleSave(e) {
    e.preventDefault();
    
    if (!listing || !listing.id) {
      console.error("Erreur : Aucun ID d'annonce trouvé");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('listings')
        .update({
          price: parseFloat(price),
          condition,
          language,
          finish,
          quantity: parseInt(quantity),
          notes
        })
        .eq('id', listing.id);

      if (error) throw error;

      onUpdated(); 
      onClose(); 
    } catch (err) {
      console.error("Erreur lors de la modification :", err);
      alert("Erreur lors de la mise à jour de l'annonce.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b border-slate-100 pb-4">
          <h3 className="text-lg font-bold text-slate-900">Modifier l'annonce</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer">✕</button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Prix (€)</label>
            <input 
              type="number" 
              step="0.01" 
              value={price} 
              onChange={(e) => setPrice(e.target.value)} 
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required 
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">État</label>
            <select 
              value={condition} 
              onChange={(e) => setCondition(e.target.value)} 
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="Mint">Mint (Neuf)</option>
              <option value="Near Mint">Near Mint (Presque neuf)</option>
              <option value="Excellent">Excellent</option>
              <option value="Good">Good (Bon)</option>
              <option value="Played">Played (Joué)</option>
              <option value="Poor">Poor (Mauvais)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Finition / Version</label>
            <select 
              value={finish} 
              onChange={(e) => setFinish(e.target.value)} 
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="Normale">Normale</option>
              <option value="Reverse">Reverse</option>
              <option value="Holo">Holo</option>
              <option value="Cosmo">Cosmo</option>
              <option value="Holo ligne">Holo ligne</option>
              <option value="Holo étoile">Holo étoile</option>
              <option value="Master Ball">Master Ball</option>
              <option value="Poké Ball">Poké Ball</option>
              <option value="Stamp">Stamp</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Langue</label>
              <input 
                type="text" 
                value={language} 
                onChange={(e) => setLanguage(e.target.value)} 
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Quantité</label>
              <input 
                type="number" 
                min="1" 
                value={quantity} 
                onChange={(e) => setQuantity(e.target.value)} 
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Notes / Description</label>
            <textarea 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)} 
              rows="3"
              placeholder="Précisions sur la carte..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" 
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Annuler
            </button>
            <button 
              type="submit" 
              disabled={loading} 
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-colors cursor-pointer shadow-sm"
            >
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ==========================================
// COMPOSANT PRINCIPAL APP
// ==========================================
export default function App() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState(null);
  const [editingListing, setEditingListing] = useState(null);

  const [currentView, setCurrentView] = useState('home');
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // État du panier multi-vendeurs
  const [cart, setCart] = useState({});

  const [seriesList, setSeriesList] = useState([]);
  const [selectedSeries, setSelectedSeries] = useState(null);
  const [loadingSeries, setLoadingSeries] = useState(false);

  const [profile, setProfile] = useState({
    username: '',
    department_code: '',
    avatar_url: '',
    bio: '',
    phone: '',
    real_name: '',
    country: 'France',
    city: '',
    show_city: true,
    language: 'Français (French)'
  });
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  
  const fileInputRef = useRef(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCondition, setSelectedCondition] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile({ username: '', department_code: '', avatar_url: '', bio: '', phone: '', real_name: '', country: 'France', city: 'Belleville-sur-Loire', show_city: true, language: 'Français (French)' });
        setCurrentView('home');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    fetchListings();
  }, []);

  // Fonctions de gestion du panier
  const addToCart = (listing) => {
    setCart(prevCart => {
      const newCart = { ...prevCart };
      const sellerId = listing.user_id;
      const sellerName = listing.profiles?.username || "Vendeur";

      if (!newCart[sellerId]) {
        newCart[sellerId] = {
          sellerName: sellerName,
          items: []
        };
      }

      const existingIndex = newCart[sellerId].items.findIndex(item => item.id === listing.id);
      if (existingIndex === -1) {
        newCart[sellerId].items.push(listing);
      }

      return newCart;
    });
    alert("Article ajouté au panier !");
  };

  const removeFromCart = (sellerId, listingId) => {
    setCart(prevCart => {
      const newCart = { ...prevCart };
      if (!newCart[sellerId]) return newCart;

      newCart[sellerId].items = newCart[sellerId].items.filter(item => item.id !== listingId);

      if (newCart[sellerId].items.length === 0) {
        delete newCart[sellerId];
      }

      return newCart;
    });
  };

  const totalCartItemsCount = useMemo(() => {
    return Object.values(cart).reduce((total, sellerGroup) => {
      return total + sellerGroup.items.reduce((subTotal, item) => subTotal + (item.quantity || 1), 0);
    }, 0);
  }, [cart]);

  async function fetchListings() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('listings')
        .select(`
          *,
          profiles:user_id (username, department_code, avatar_url),
          cards (name, image_url)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setListings(data || []);
    } catch (err) {
      console.error("Erreur chargement annonces :", err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchSeries() {
    try {
      setLoadingSeries(true);
      const { data, error } = await supabase
        .from('series')
        .select('*')
        .order('release_date', { ascending: false });

      if (error) throw error;
      setSeriesList(data || []);
    } catch (err) {
      console.error("Erreur chargement des séries :", err);
    } finally {
      setLoadingSeries(false);
    }
  }

  async function fetchProfile(userId) {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (data) {
        setProfile({
          username: data.username || '',
          department_code: data.department_code || '',
          avatar_url: data.avatar_url || '',
          bio: data.bio || '',
          phone: data.phone || '',
          real_name: data.real_name || '',
          country: data.country || 'France',
          city: data.city || 'Belleville-sur-Loire',
          show_city: data.show_city ?? true,
          language: data.language || 'Français (French)'
        });
      }
    } catch (err) {
      console.error("Erreur chargement profil :", err);
    }
  }

  async function handleAvatarUpload(e) {
    try {
      const file = e.target.files?.[0];
      if (!file || !user) return;

      setUploadingAvatar(true);
      setProfileMessage("Téléversement de l'image...");

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setProfile(prev => ({ ...prev, avatar_url: data.publicUrl }));
      setProfileMessage("Photo sélectionnée ! Pensez à enregistrer.");
      setTimeout(() => setProfileMessage(''), 3000);
    } catch (err) {
      console.error("Erreur upload avatar :", err);
      setProfileMessage("Erreur lors du téléversement de l'image.");
    } finally {
      setUploadingAvatar(false);
    }
  }

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!user) return;

    setSavingProfile(true);
    setProfileMessage('');

    try {
      const updates = {
        id: user.id,
        username: profile.username,
        department_code: profile.department_code,
        avatar_url: profile.avatar_url,
        bio: profile.bio,
        phone: profile.phone,
        real_name: profile.real_name,
        country: profile.country,
        city: profile.city,
        show_city: profile.show_city,
        language: profile.language,
        updated_at: new Date(),
      };

      const { error } = await supabase.from('profiles').upsert(updates);
      if (error) throw error;

      setProfileMessage('Profil mis à jour avec succès !');
      setTimeout(() => setProfileMessage(''), 3000);
    } catch (err) {
      console.error("Erreur mise à jour profil :", err);
      setProfileMessage('Erreur lors de la mise à jour.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleDeleteListing = async (listingId) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette annonce ?")) return;
    
    try {
      const { error } = await supabase.from('listings').delete().eq('id', listingId);
      if (error) throw error;
      
      // Met à jour le catalogue global
      setListings(listings.filter((item) => item.id !== listingId));
      
      // Met à jour la liste personnelle affichée dans le profil (si tu utilises un état séparé)
      setUserListings((prevListings) => prevListings.filter((item) => item.id !== listingId));
    } catch (err) {
      console.error("Erreur suppression :", err);
      alert("Impossible de supprimer cette annonce.");
    }
  };

  const filteredListings = useMemo(() => {
    if (!listings) return [];
    return listings.filter((item) => {
      const cardTitle = item?.cards?.name || item?.title || '';
      const matchesSearch = cardTitle.toLowerCase().includes(searchQuery.toLowerCase().trim());
      const matchesCondition = selectedCondition ? item?.condition?.toUpperCase() === selectedCondition.toUpperCase() : true;
      const matchesDept = selectedDept ? (item?.profiles?.department_code === selectedDept || item?.department_code === selectedDept) : true;
      const matchesPrice = maxPrice !== '' ? Number(item?.price || 0) <= Number(maxPrice) : true;
      return matchesSearch && matchesCondition && matchesDept && matchesPrice;
    });
  }, [listings, searchQuery, selectedCondition, selectedDept, maxPrice]);

  const userListings = useMemo(() => {
    if (!user || !listings) return [];
    return listings.filter((item) => item.user_id === user.id);
  }, [listings, user]);

  const groupedSeries = useMemo(() => {
    return seriesList.reduce((acc, item) => {
      const block = item.block_name && item.block_name.trim() !== "" ? item.block_name.trim() : "Autres séries";
      if (!acc[block]) {
        acc[block] = [];
      }
      acc[block].push(item);
      return acc;
    }, {});
  }, [seriesList]);

  const handleLogout = async () => {
    setIsUserMenuOpen(false);
    await supabase.auth.signOut();
    setCurrentView('home');
  };

  const openMassListingSelector = () => {
    setCurrentView('series-select');
    fetchSeries();
  };

  const handleOpenInboxWithConversation = (conversationId) => {
    setActiveConversationId(conversationId);
    setCurrentView('inbox');
    setSelectedListing(null);
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-800" onClick={() => isUserMenuOpen && setIsUserMenuOpen(false)}>
      
      {/* HEADER */}
      <header className="bg-slate-900 text-white py-4 px-6 shadow-md border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 
            onClick={() => { setCurrentView('home'); setSelectedSeries(null); }}
            className="text-xl font-black tracking-wider text-indigo-400 cursor-pointer"
          >
            POKÉ<span className="text-white">MARKET</span>
          </h1>

          <div className="flex items-center gap-3">
            {/* BOUTON PANIER */}
            <button
              onClick={() => setCurrentView('cart')}
              className="relative bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-colors shadow-sm cursor-pointer flex items-center gap-1.5 border border-slate-700"
            >
              <span>🛒</span> Panier
              {totalCartItemsCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-indigo-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-black">
                  {totalCartItemsCount}
                </span>
              )}
            </button>

            {user ? (
              <>
                <button
                  onClick={openMassListingSelector}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-colors shadow-sm cursor-pointer flex items-center gap-1"
                >
                  <span>⚡</span> Ajout en masse
                </button>

                <button
                  onClick={() => setIsCreateOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-colors shadow-sm cursor-pointer flex items-center gap-1"
                >
                  <span>+</span> Vendre à l'unité
                </button>

                <div className="relative" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 py-1.5 px-3 rounded-full border border-slate-700 transition-colors cursor-pointer"
                  >
                    {profile.avatar_url ? (
                      <img src={profile.avatar_url} alt="Avatar" className="w-6 h-6 rounded-full object-cover" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] font-bold text-white">
                        {profile.username ? profile.username[0].toUpperCase() : user.email[0].toUpperCase()}
                      </div>
                    )}
                    <span className="text-xs font-semibold text-slate-200">
                      {profile.username || 'Mon Compte'}
                    </span>
                  </button>

                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 text-slate-700">
                      <div className="px-4 py-2 border-b border-slate-100">
                        <p className="text-xs font-bold text-slate-900 truncate">{profile.username || 'Mon Compte'}</p>
                        <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                      </div>
                      
                      <button
                        onClick={() => { setCurrentView('account'); setSelectedSeries(null); setIsUserMenuOpen(false); }}
                        className="w-full text-left px-4 py-2.5 text-xs font-medium hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        ⚙️ Paramètres du profil
                      </button>

                      <button
                        onClick={() => { setCurrentView('account'); setSelectedSeries(null); setIsUserMenuOpen(false); }}
                        className="w-full text-left px-4 py-2.5 text-xs font-medium hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        📦 Mes annonces ({userListings.length})
                      </button>

                      <button
                        onClick={() => { setCurrentView('inbox'); setSelectedSeries(null); setIsUserMenuOpen(false); }}
                        className="w-full text-left px-4 py-2.5 text-xs font-medium hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        💬 Messagerie
                      </button>

                      <div className="border-t border-slate-100 my-1"></div>

                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        Déconnexion
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <button
                onClick={() => setIsAuthOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors shadow-sm cursor-pointer"
              >
                Se connecter
              </button>
            )}
          </div>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="max-w-7xl mx-auto p-6">
        {currentView === 'inbox' ? (
          <InboxView 
            currentUserId={user?.id} 
            activeConversationId={activeConversationId} 
            onBack={() => setCurrentView('home')} 
          />
        ) : currentView === 'cart' ? (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <button
                onClick={() => setCurrentView('home')}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
              >
                ← Continuer mes achats
              </button>
              <h2 className="text-xl font-bold text-slate-900">Mon Panier Multi-Vendeurs</h2>
            </div>

            {Object.keys(cart).length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-slate-200 space-y-3">
                <span className="text-4xl">🛒</span>
                <p className="text-slate-500 text-sm font-medium">Votre panier est vide pour le moment.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(cart).map(([sellerId, group]) => {
                  const subtotal = group.items.reduce((sum, item) => sum + Number(item.price || 0), 0);

                  return (
                    <div key={sellerId} className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 space-y-4">
                      <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                        <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                          <span>📦</span> Expédié par : <span className="text-indigo-600">{group.sellerName}</span>
                        </h3>
                        <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
                          {group.items.length} article{group.items.length > 1 ? 's' : ''}
                        </span>
                      </div>

                      <div className="divide-y divide-slate-100">
                        {group.items.map(item => (
                          <div key={item.id} className="py-3 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              {item.cards?.image_url && (
                                <img src={item.cards.image_url} alt="" className="w-12 h-16 object-contain rounded-lg bg-slate-50 border border-slate-100" />
                              )}
                              <div>
                                <h4 className="font-bold text-xs text-slate-900">{item.cards?.name || item.title}</h4>
                                <p className="text-[11px] text-slate-500">État : {item.condition} • Langue : {item.language}</p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-4">
                              <span className="font-black text-sm text-slate-900">{Number(item.price).toFixed(2)} €</span>
                              <button
                                onClick={() => removeFromCart(sellerId, item.id)}
                                className="text-rose-400 hover:text-rose-600 text-xs font-bold p-1 cursor-pointer"
                                title="Retirer"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                        <div>
                          <span className="text-xs text-slate-500 block">Sous-total pour ce vendeur :</span>
                          <span className="font-black text-lg text-indigo-600">{subtotal.toFixed(2)} €</span>
                        </div>
                        <button
                          onClick={() => alert(`Validation de la commande séparée pour ${group.sellerName} !`)}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-colors cursor-pointer shadow-sm"
                        >
                          Commander auprès de ce vendeur
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : selectedSeries ? (
          <MassListing 
            selectedSeries={selectedSeries} 
            onBack={() => setSelectedSeries(null)} 
            userId={user?.id} 
          />
        ) : currentView === 'series-select' ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <button
                onClick={() => setCurrentView('home')}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
              >
                ← Retour à l'accueil
              </button>
              <h2 className="text-xl font-bold text-slate-900">Sélectionnez une série pour l'ajout en masse</h2>
            </div>

            {loadingSeries ? (
              <div className="text-center py-12 text-slate-400">Chargement des séries...</div>
            ) : Object.keys(groupedSeries).length === 0 ? (
              <div className="text-center py-12 text-slate-400">Aucune série trouvée.</div>
            ) : (
              <div className="space-y-10">
                {Object.entries(groupedSeries).map(([blockName, extensions]) => (
                  <div key={blockName} className="bg-white rounded-2xl shadow-md border border-slate-100 p-6">
                    <h2 className="text-2xl font-black text-indigo-600 mb-6 pb-3 border-b-2 border-indigo-100 uppercase tracking-wide">
                      Bloc {blockName}
                    </h2>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {extensions.map((series) => (
                        <div
                          key={series.id}
                          onClick={() => setSelectedSeries(series)}
                          className="bg-slate-50 p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col items-center text-center justify-between gap-3"
                        >
                          <div className="h-16 flex items-center justify-center">
                            {series.logo_url ? (
                              <img src={series.logo_url} alt={series.name} className="max-h-full object-contain" />
                            ) : (
                              <span className="text-xs text-slate-400">Pas de logo</span>
                            )}
                          </div>
                          <span className="text-xs font-bold text-slate-800">{series.name}</span>
                          <span className="text-[10px] text-slate-400">{series.release_date || ''}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : currentView === 'account' ? (
          <div className="space-y-6">
            <form onSubmit={handleUpdateProfile} className="space-y-6">
              
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <span className="text-gray-800 font-medium text-sm">Ta photo de profil</span>
                  
                  <div className="flex items-center gap-4">
                    {profile.avatar_url ? (
                      <img src={profile.avatar_url} alt="Avatar" className="w-12 h-12 rounded-full object-cover border border-gray-200 shadow-sm" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-teal-600 flex items-center justify-center text-sm font-bold text-white shadow-sm">
                        {profile.username ? profile.username[0].toUpperCase() : 'U'}
                      </div>
                    )}

                    <input 
                      type="file" 
                      ref={fileInputRef}
                      onChange={handleAvatarUpload}
                      accept="image/*"
                      className="hidden" 
                    />

                    <button 
                      type="button"
                      onClick={() => fileInputRef.current.click()}
                      disabled={uploadingAvatar}
                      className="px-4 py-2 text-sm font-medium text-teal-700 bg-white border border-teal-600 rounded-lg hover:bg-teal-50 transition-colors cursor-pointer shadow-sm"
                    >
                      {uploadingAvatar ? 'Téléversement...' : 'Choisir une photo'}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-gray-100 gap-4">
                  <span className="text-gray-800 font-medium text-sm shrink-0">Nom d'utilisateur</span>
                  <input
                    type="text"
                    value={profile.username}
                    onChange={(e) => setProfile({...profile, username: e.target.value})}
                    placeholder="Votre pseudo"
                    className="max-w-xs w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div className="py-3 space-y-2">
                  <span className="text-gray-800 font-medium text-sm block">À propos de toi</span>
                  <input 
                    type="text" 
                    value={profile.bio}
                    onChange={(e) => setProfile({...profile, bio: e.target.value})}
                    placeholder="Présente-toi aux autres membres" 
                    className="w-full text-sm text-gray-700 border-b border-gray-200 pb-2 focus:outline-none focus:border-teal-600 bg-transparent"
                  />
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Ma position</h3>

                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <span className="text-gray-800 font-medium text-sm">Pays</span>
                  <select 
                    value={profile.country}
                    onChange={(e) => setProfile({...profile, country: e.target.value})}
                    className="text-sm text-gray-700 bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
                  >
                    <option value="France">France</option>
                    <option value="Belgique">Belgique</option>
                    <option value="Suisse">Suisse</option>
                  </select>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <span className="text-gray-800 font-medium text-sm">Ville / Département</span>
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      maxLength="3"
                      value={profile.department_code}
                      onChange={(e) => setProfile({...profile, department_code: e.target.value})}
                      placeholder="Dép. (ex: 18)"
                      className="w-28 bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 text-center"
                    />
                    <input 
                      type="text"
                      value={profile.city}
                      onChange={(e) => setProfile({...profile, city: e.target.value})}
                      placeholder="Ville"
                      className="w-44 bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between py-3">
                  <span className="text-gray-800 font-medium text-sm">Afficher la ville dans le profil</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={profile.show_city}
                      onChange={(e) => setProfile({...profile, show_city: e.target.checked})}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                  </label>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
                <div className="flex items-center justify-between py-2">
                  <span className="text-gray-800 font-medium text-sm">Langue</span>
                  <select 
                    value={profile.language}
                    onChange={(e) => setProfile({...profile, language: e.target.value})}
                    className="text-sm text-gray-700 bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
                  >
                    <option value="Français (French)">Français (French)</option>
                    <option value="English">English</option>
                  </select>
                </div>

                <div className="bg-amber-50/70 border border-amber-200 p-5 rounded-xl space-y-4 mt-4">
                  <span className="text-amber-800 font-bold text-xs uppercase tracking-wider block">
                    🔒 Informations personnelles (Visibles uniquement par vous)
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Nom / Prénom</label>
                      <input
                        type="text"
                        value={profile.real_name}
                        onChange={(e) => setProfile({...profile, real_name: e.target.value})}
                        className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Téléphone</label>
                      <input
                        type="text"
                        value={profile.phone}
                        onChange={(e) => setProfile({...profile, phone: e.target.value})}
                        className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-4">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-6 py-3 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl shadow-sm transition-colors cursor-pointer"
                >
                  {savingProfile ? 'Enregistrement...' : 'Enregistrer les modifications'}
                </button>
              </div>

              {profileMessage && (
                <p className="text-center text-xs font-medium text-teal-700 mt-2">{profileMessage}</p>
              )}
            </form>

            {/* Section des annonces du profil */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
              <h3 className="text-base font-bold text-slate-900">Mes annonces en ligne ({userListings.length})</h3>
              {userListings.length === 0 ? (
                <p className="text-slate-400 text-xs">Vous n'avez posté aucune annonce pour l'instant.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {userListings.map((item) => (
                    <div key={item.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {item.cards?.image_url && (
                          <img src={item.cards.image_url} alt="" className="w-12 h-16 object-contain rounded bg-white border" />
                        )}
                        <div>
                          <h4 className="font-bold text-xs text-slate-900">{item.cards?.name || 'Carte'}</h4>
                          <p className="text-xs font-black text-indigo-600">{item.price} €</p>
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end pt-2 border-t border-slate-200">
                        <button
                          onClick={() => setEditingListing(item)}
                          className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-[11px] rounded-lg cursor-pointer"
                        >
                          Modifier
                        </button>
                        <button
                          onClick={() => handleDeleteListing(item.id)}
                          className="px-3 py-1 bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold text-[11px] rounded-lg cursor-pointer"
                        >
                          Supprimer
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ACCUEIL / LISTINGS CATALOGUE */
          <div className="space-y-6">
            <FranceFilter 
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              selectedCondition={selectedCondition}
              setSelectedCondition={setSelectedCondition}
              selectedDept={selectedDept}
              setSelectedDept={setSelectedDept}
              maxPrice={maxPrice}
              setMaxPrice={setMaxPrice}
            />

            {loading ? (
              <div className="text-center py-12 text-slate-400">Chargement des annonces...</div>
            ) : filteredListings.length === 0 ? (
              <div className="text-center py-12 text-slate-400">Aucune annonce ne correspond à vos critères.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {filteredListings.map((listing) => (
                  <SingleListing
                    key={listing.id}
                    listing={listing}
                    currentUserId={user?.id}
                    onOpenDetails={(l) => setSelectedListing(l)}
                    onOpenConversation={handleOpenInboxWithConversation}
                    onAddToCart={addToCart}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* MODALES GLOBALES */}
      {isAuthOpen && <AuthModal onClose={() => setIsAuthOpen(false)} />}
      {isCreateOpen && (
        <CreateListingModal 
          onClose={() => setIsCreateOpen(false)} 
          onCreated={() => { fetchListings(); fetchUserListings(); }} 
          userId={user?.id} 
        />
      )}
      {selectedListing && (
        <CardDetailModal 
          listing={selectedListing} 
          onClose={() => setSelectedListing(null)} 
          currentUserId={user?.id} 
          onOpenConversation={handleOpenInboxWithConversation} 
          onAddToCart={addToCart} 
        />
      )}
      {editingListing && (
        <EditListingModal 
          listing={editingListing} 
          onClose={() => setEditingListing(null)} 
          onUpdated={() => { fetchListings(); fetchUserListings(); }} 
        />
      )}
    </div>
  );
}