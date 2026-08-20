import React, { useState, useEffect, useRef, useMemo } from 'react';
import WelcomeSplash from './WelcomeSplash';
import Home from './Home';
import { supabase } from './supabase';
import AuthModal from './AuthModal';
import CardDetailModal from './CardDetailModal';
import ChatModal from './ChatModal';
import CreateListingModal from './CreateListingModal';
import EditListingView from './EditListingView';
import InboxView from './InboxView';
import MassListing from './MassListing';
import MyListingsView from './MyListingsView';
import MyPurchasesView from './MyPurchasesView';
import SellerProfile from './SellerProfile';
import SingleListing from './SingleListing';
import UserStoreModal from './UserStoreModal';
import { groupSeriesByBlock } from './seriesUtils';
import MondialRelayModal from "./MondialRelayModal";
import stripePromise from './stripeClient';
import { redirectToStripeCheckout } from './stripeService';
import NotificationBell from './NotificationBell';
import KantoLeagueTab from './KantoLeagueTab';
import Favorites from './Favorites';
import NavBar from './NavBar';
import rocheImg from './assets/badges/roche.png';
import cascadeImg from './assets/badges/cascade.png';
import foudreImg from './assets/badges/foudre.png';
import prismeImg from './assets/badges/prisme.png';
import ameImg from './assets/badges/âme.png';
import maraisImg from './assets/badges/marais.png';
import volcanImg from './assets/badges/volcan.png';
import terreImg from './assets/badges/terre.png';
import olgaImg from './assets/badges/Olga.png';
import aldoImg from './assets/badges/Aldo.png';
import agathaImg from './assets/badges/Agatha.png';
import peterImg from './assets/badges/Peter.png';
import championImg from './assets/badges/champion.png';
import BadgeUnlockModal from './BadgeUnlockModal';
import RarityGuideView from './RarityGuideView';
import CollectionManager from './CollectionManager';
import MissingCardsOptimizer from './MissingCardsOptimizer';
import Checkout from './Checkout';
import Footer from './Footer';
import MfaSetupModal from './MfaSetupModal';
import TutorialModal from "./TutorialModal";
import ConditionGuideView from './ConditionGuideView';
import PokedexView from './PokedexView';
import { leagueSteps } from './constants/kantoLeague';
import { leagueSteps as baseLeagueSteps } from './constants/kantoLeague';
import { Capacitor } from '@capacitor/core';
import WhosThatPokemon from './components/WhosThatPokemon';
import { getFlattenedPlaylist } from './musicData';
import PokemonMusicPlayer from "./components/PokemonMusicPlayer";

export default function App() {
  const [showSplash, setShowSplash] = useState(() => {
    return !localStorage.getItem('hasSeenSplash');
  });
  const [showTutorial, setShowTutorial] = useState(false); // AJOUTEZ CETTE LIGNE
  const [currentView, setCurrentView] = useState('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBlock, setSelectedBlock] = useState('');
  const [selectedSeriesFilter, setSelectedSeriesFilter] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [filterFinish, setFilterFinish] = useState('');
  const [filterCondition, setFilterCondition] = useState('');
  const [user, setUser] = useState(null);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unlockedBadgeModal, setUnlockedBadgeModal] = useState(null);
  const [selectedIllustrator, setSelectedIllustrator] = useState('');
  const [isMinigameOpen, setIsMinigameOpen] = useState(false);
  
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showMfaSetupModal, setShowMfaSetupModal] = useState(false);
  const [mfaUser, setMfaUser] = useState(null);
  
  const [selectedListing, setSelectedListing] = useState(null);
  const [editingListing, setEditingListing] = useState(null);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [isMassListingOpen, setIsMassListingOpen] = useState(false);
  
  const [favoriteListings, setFavoriteListings] = useState([]);
  const [favoriteSellers, setFavoriteSellers] = useState([]);
  const [sellerId, setSellerId] = useState(null);

  const [totalCards, setTotalCards] = useState(0);
  const [totalCardsCount, setTotalCardsCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedSellerId, setSelectedSellerId] = useState(null);
  const fullPlaylist = getFlattenedPlaylist();

      // --- AJOUT POUR LE TUTORIEL ---
      useEffect(() => {
        const hasSeenTutorial = localStorage.getItem('has_seen_tutorial');
        
        if (!hasSeenTutorial) {
          setTimeout(() => {
            setShowTutorial(true);
          }, 1000);
        }
      }, []);
      
  // Fonction unique et robuste pour vérifier et synchroniser les badges
  const checkBadgesFromSupabase = async () => {
    try {
      if (!user) return;

      // On récupère la quantité en vérifiant les deux colonnes possibles
      const { data, error } = await supabase
        .from('listings') 
        .select('quantity')
        .or(`user_id.eq.${user.id},seller_id.eq.${user.id}`);

      if (error) throw error;

      if (data) {
        // On calcule la vraie somme totale
        const count = data.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);

        // On récupère les badges actuels directement depuis Supabase (évite les données obsolètes)
        const { data: profileData } = await supabase
          .from('profiles')
          .select('badges')
          .eq('id', user.id)
          .single();

        const currentBadges = profileData?.badges || [];

        // Liste des paliers de badges
        const cardCountBadges = [
          { id: 'roche', threshold: 20, name: 'Badge Roche', desc: 'Enregistrer ses 20 premières cartes.', img: rocheImg },
          { id: 'cascade', threshold: 200, name: 'Badge Cascade', desc: 'Atteindre 200 cartes enregistrées.', img: cascadeImg },
          { id: 'ame', threshold: 700, name: 'Badge Âme', desc: 'Atteindre le palier de 700 cartes enregistrées.', img: ameImg },
          { id: 'terre', threshold: 1200, name: 'Badge Terre', desc: 'Atteindre et enregistrer 1200 cartes.', img: terreImg },
          { id: 'maitre-kanto', threshold: 5000, name: 'Maître de la Région de Kanto', desc: "L'accomplissement suprême : franchir 5000 cartes enregistrées.", img: championImg },
        ];

        for (const badge of cardCountBadges) {
          if (count >= badge.threshold) {
            const storageKey = `popup_shown_${badge.id}_${user.id}`;
            
            // Si le palier est atteint, que la popup n'a jamais été montrée, et que l'user ne l'a pas
            if (!localStorage.getItem(storageKey) && !currentBadges.includes(badge.id)) {
              setUnlockedBadgeModal({
                name: badge.name,
                description: badge.desc,
                icon_url: badge.img
              });
              localStorage.setItem(storageKey, 'true');
              
              // Mise à jour immédiate dans Supabase
              const updatedBadges = [...currentBadges, badge.id];
              await supabase
                .from('profiles')
                .update({ badges: updatedBadges })
                .eq('id', user.id);
              
              break; // On traite un badge à la fois pour laisser la modale s'afficher
            }
          }
        }
      }
    } catch (err) {
      console.error("Erreur lors de la vérification des badges :", err);
    }
  };

  const handleAddCard = async (rawCardData) => {
    // On s'assure que la quantité par défaut est de 1 si elle est absente
    const cardData = {
      ...rawCardData,
      quantity: rawCardData.quantity || 1,
    };

    // 1. On insère dans Supabase
    const { error } = await supabase.from('listings').insert(cardData);

    if (error) {
      console.error("Erreur lors de l'ajout :", error);
      return;
    }

    // 2. Rafraîchissement des listes
    await fetchListings();
  };

  const handleSplashFinish = () => {
    localStorage.setItem('hasSeenSplash', 'true'); 
    setShowSplash(false);       // Ferme l'animation de démarrage
    setIsAuthOpen(true);        // Ouvre le modal de connexion
  };
  
  // Fonction pour basculer (ajouter/retirer) une carte des favoris avec Supabase
  const toggleFavoriteListing = async (listing) => {
    if (!user) {
      alert("Veuillez vous connecter pour gérer vos favoris.");
      return;
    }

    const isFav = favoriteListings.some(item => item.id === listing.id);

    if (isFav) {
      // Suppression dans Supabase
      const { error } = await supabase
        .from('user_favorites') // Remplace par le nom exact de ta table si besoin
        .delete()
        .eq('user_id', user.id)
        .eq('listing_id', listing.id);

      if (!error) {
        setFavoriteListings(favoriteListings.filter(item => item.id !== listing.id));
      } else {
        console.error("Erreur suppression favori:", error);
      }
    } else {
      // Ajout dans Supabase
      const { error } = await supabase
        .from('user_favorites')
        .insert([{ user_id: user.id, listing_id: listing.id }]);

      if (!error) {
        setFavoriteListings([...favoriteListings, listing]);
      } else {
        console.error("Erreur ajout favori:", error);
      }
    }
  };

  const toggleFavoriteSeller = async (sellerName) => {
    if (!user) {
      alert("Vous devez être connecté pour gérer vos favoris.");
      return;
    }

    const isFav = favoriteSellers.includes(sellerName);

    if (isFav) {
      // Supprimer des favoris
      const { error } = await supabase
        .from('user_favorite_sellers')
        .delete()
        .eq('user_id', user.id)
        .eq('seller_name', sellerName);

      if (error) {
        console.error("Erreur suppression vendeur favori:", error);
      } else {
        setFavoriteSellers(favoriteSellers.filter(s => s !== sellerName));
      }
    } else {
      // Ajouter aux favoris
      const { error } = await supabase
        .from('user_favorite_sellers')
        .insert({ user_id: user.id, seller_name: sellerName });

      if (error) {
        console.error("Erreur ajout vendeur favori:", error);
      } else {
        setFavoriteSellers([...favoriteSellers, sellerName]);
      }
    }
  };
  
  const [blocks, setBlocks] = useState([]);
  // Récupération des blocs et des séries depuis Supabase au démarrage
  useEffect(() => {
    async function fetchBlocksAndSeries() {
      // 1. Récupérer toutes les séries depuis Supabase
      const { data, error } = await supabase.from('series').select('*');
      
      if (!error && data) {
        setSeriesList(data); 

        // 2. Extraire la liste unique des blocs grâce à la colonne exacte 'block_name'
        const uniqueBlocks = [
          ...new Set(
            data.map(item => item.block_name)
                .filter(Boolean)
          )
        ];
        
        setBlocks(uniqueBlocks);
      } else {
        console.error("Erreur chargement blocs/séries:", error?.message);
      }
    }

    fetchBlocksAndSeries();
  }, []);
  
// État du panier multi-vendeurs et des modes de livraison par vendeur (avec persistance localStorage)
  const [cart, setCart] = useState(() => {
    const savedCart = localStorage.getItem('pokemarket_cart');
    return savedCart ? JSON.parse(savedCart) : {};
  });
  
  useEffect(() => {
    localStorage.setItem('pokemarket_cart', JSON.stringify(cart));
  }, [cart]);

  const [activeSellerForRelay, setActiveSellerForRelay] = useState(null);
  const [shippingMethods, setShippingMethods] = useState({});

  // Fonction de callback pour enregistrer le point relais choisi
  const handleSelectPointRelais = (sellerId, pointData) => {
    setShippingMethods(prev => ({
      ...prev,
      [sellerId]: {
        ...prev[sellerId],
        pointRelais: {
          name: pointData.Nom,
          address: `${pointData.Adresse1} - ${pointData.CP} ${pointData.Ville}`
        }
      }
    }));
    setActiveSellerForRelay(null);
  };

  const handleCheckout = async (sellerId, sellerGroup, shipping, finalTotal) => {

    try {
      const shippingMethodName = shipping?.name || 'Lettre Suivante';
      const shippingCost = shipping?.price || 2.50;

      const itemPrice = sellerGroup.items.reduce((sum, item) => sum + (Number(item.price) * (Number(item.quantity) || 1)), 0);
      const platformFee = Number((itemPrice * 0.05).toFixed(2));

      // 1. Insertion de la commande principale
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          buyer_id: user.id,
          seller_id: sellerId,
          shipping_method: shippingMethodName,
          shipping_cost: shippingCost,
          item_price: itemPrice,
          shipping_fee: shippingCost,
          platform_fee: platformFee,
          total_amount: finalTotal,
          status: 'pending'
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // 2. Insertion des lignes d'articles
      const orderItems = sellerGroup.items.map(item => ({
        order_id: orderData.id,
        card_id: item.card_id || item.tcgdex_card_id || item.cards?.id,
        vendor_id: sellerId,
        quantity: item.quantity || 1,
        price: item.price
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // 3. Mise à jour des stocks via la fonction sécurisée Supabase (RPC)
      for (const item of sellerGroup.items) {
        const listingId = item.id; 
        if (!listingId) continue;

        const orderedQty = Number(item.quantity) || 1;

        const { error: rpcError } = await supabase.rpc('decrease_listing_stock', {
          row_id: listingId,
          qty_to_subtract: orderedQty
        });

        if (rpcError) throw rpcError;
      }

      // 4. Message automatique
      const firstItem = sellerGroup.items[0];
      const listingId = firstItem?.id;
      const cardNamesList = sellerGroup.items.map(item => item.cards?.name || 'Carte').join(', ');

      if (listingId) {
        let { data: existingConv } = await supabase
          .from('conversations')
          .select('id')
          .eq('listing_id', listingId)
          .eq('buyer_id', user.id)
          .eq('seller_id', sellerId)
          .single();

        let conversationId = existingConv?.id;

        if (!conversationId) {
          const { data: newConv } = await supabase
            .from('conversations')
            .insert({
              listing_id: listingId,
              buyer_id: user.id,
              seller_id: sellerId,
              updated_at: new Date()
            })
            .select()
            .single();

          if (newConv) conversationId = newConv.id;
        }

        if (conversationId) {
          await supabase.from('messages').insert({
            conversation_id: conversationId,
            sender_id: user.id,
            content: `[Achat validé] Commande passée pour un montant de ${finalTotal} € (Articles : ${cardNamesList}).`,
            is_read: false
          });
        }
      }

      // Succès
      alert("Commande validée avec succès !");
      
      // Nettoyage propre du panier pour ce vendeur uniquement
      setCart(prevCart => {
        const newCart = { ...prevCart };
        delete newCart[sellerId];
        return newCart;
      });

      // 🌟 AJOUTE CETTE LIGNE : Rafraîchit la liste des annonces pour faire disparaître l'article vendu
      if (typeof fetchListings === 'function') {
        fetchListings();
      }

    } catch (err) {
      console.error("Erreur détaillée lors du checkout :", err);
      alert("Erreur Supabase : " + (err.message || "Une erreur est survenue lors de la validation."));
    }
  };

  const [seriesList, setSeriesList] = useState([]);
  const [selectedSeries, setSelectedSeries] = useState(null);
  const [loadingSeries, setLoadingSeries] = useState(false);

  const [profile, setProfile] = useState({
    first_name: '',
    last_name: '',
    username: '',
    address: '',
    postal_code: '',
    city: '',
    country: 'France',
    birth_date: '',
    phone: '',
    avatar_url: '',
    bio: '',
    show_city: true,
    language: 'Français (French)'
  });
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  
  const fileInputRef = useRef(null);

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

  // Fonction appelée après une connexion réussie pour vérifier ou proposer le MFA
  const handleLoginSuccess = async (userData) => {
    const userObj = userData?.user || (await supabase.auth.getUser())?.data?.user;
    if (!userObj) return;

    setMfaUser(userObj);

    // Vérifier si l'utilisateur a déjà configuré un facteur MFA vérifié
    const { data: factors, error } = await supabase.auth.mfa.listFactors();
    if (!error) {
      const hasVerifiedMfa = factors?.totp?.some(f => f.status === 'verified');
      
      // S'il n'a pas de MFA configuré, on affiche la modale
      if (!hasVerifiedMfa) {
        setShowMfaSetupModal(true);
      }
    }
  };

  const addToCart = (listing, quantityToAdd = 1) => {
    
    const sellerId = listing.seller_id || listing.user_id || 'unknown_seller';
    const sellerName = listing.profiles?.username || listing.seller_name || "Vendeur";
    const maxStock = listing.quantity || 1; // Le stock réel max de l'annonce

    setCart(prevCart => {
      // Sécurité pour s'assurer que prevCart est bien un objet
      const cartObj = prevCart || {};
      
      // Récupère ou initialise le groupe du vendeur
      const existingGroup = cartObj[sellerId] || { sellerName, items: [] };
      
      // Vérifie si l'article est déjà dans le panier de ce vendeur
      const existingItemIndex = existingGroup.items.findIndex(item => item.id === listing.id);
      let updatedItems = [...existingGroup.items];

      if (existingItemIndex > -1) {
        // L'article existe déjà : on incrémente sans dépasser le stock max
        const currentItem = updatedItems[existingItemIndex];
        const newQty = Math.min((currentItem.quantity || 1) + quantityToAdd, maxStock);
        
        updatedItems[existingItemIndex] = { 
          ...currentItem, 
          quantity: newQty,
          maxStock: maxStock 
        };
      } else {
        // On extrait 'quantity' de l'annonce pour ignorer complètement le 3 initial
        const { quantity, ...listingClean } = listing;

        // Nouvel article dans le panier : on force la quantité à 1 (ou quantityToAdd)
        updatedItems.push({
          ...listingClean,
          card_id: listing.tcgdex_card_id,
          quantity: quantityToAdd, // <--- Forcé à 1
          maxStock: maxStock       // Stock max conservé pour les boutons + / -
        });
      }

      // On retourne le nouveau state mis à jour pour ce vendeur
      return {
        ...cartObj,
        [sellerId]: {
          ...existingGroup,
          items: updatedItems
        }
      };
    });

    alert("Article ajouté au panier !");
  };

  const updateQuantity = (sellerId, itemId, newQuantity, maxStock) => {
    if (newQuantity <= 0) {
      removeFromCart(sellerId, itemId);
      return;
    }
    
    // Sécurité stricte : empêche de dépasser le stock max réel
    if (maxStock && newQuantity > maxStock) {
      alert("Stock maximum atteint pour cette annonce.");
      return; 
    }

    setCart(prevCart => {
      const updatedCart = { ...prevCart };
      if (!updatedCart[sellerId]) return prevCart;

      const sellerGroup = { ...updatedCart[sellerId] };
      
      sellerGroup.items = sellerGroup.items.map(item => {
        if (item.id === itemId) {
          return { ...item, quantity: newQuantity };
        }
        return item;
      });

      updatedCart[sellerId] = sellerGroup;
      return updatedCart;
    });
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
          profiles:user_id (*),
          cards:tcgdex_card_id (
            *,
            illustrator, 
            types,
            extensions:set_id (*)
          )
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
        .not('name', 'ilike', '%Pocket%')
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
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          username: data.username || '',
          address: data.address || '',
          postal_code: data.postal_code || '',
          city: data.city || 'Belleville-sur-Loire',
          country: data.country || 'France',
          phone: data.phone || '',
          birth_date: data.birth || '',
          avatar_url: data.avatar_url || '',
          bio: data.bio || '',
          show_city: data.show_city ?? true,
          language: data.language || 'Français (French)',
          department_code: data.department_code || '',
        });
      }
    } catch (err) {
      console.error("Erreur chargement profil :", err);
    }
  }

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!user) return;
    setSavingProfile(true);
    setProfileMessage('');

    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          first_name: profile.first_name,
          last_name: profile.last_name,
          username: profile.username,
          address: profile.address,
          postal_code: profile.postal_code,
          city: profile.city,
          country: profile.country,
          phone: profile.phone,
          birth_date: profile.birth_date || null, // Corrigé ici
          avatar_url: profile.avatar_url,
          bio: profile.bio,
          show_city: profile.show_city,
          language: profile.language,
          department_code: profile.department_code,
          updated_at: new Date(),
        });

      if (error) throw error;
      setProfileMessage('Profil mis à jour avec succès !');
      setTimeout(() => setProfileMessage(''), 3000);
    } catch (err) {
      console.error("Erreur mise à jour profil :", err);
      alert("Erreur lors de la mise à jour du profil.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    try {
      const file = e.target.files?.[0];
      if (!file || !user) return;
      setUploadingAvatar(true);

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setProfile(prev => ({ ...prev, avatar_url: publicUrl }));

      await supabase
        .from('profiles')
        .upsert({ id: user.id, avatar_url: publicUrl, updated_at: new Date() });

    } catch (err) {
      console.error("Erreur upload avatar :", err);
      alert("Erreur lors du téléversement de l'avatar.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleDeleteListing = async (listingId) => {
    if (!window.confirm("Voulez-vous vraiment supprimer cette annonce ?")) return;

    try {
      const { error } = await supabase
        .from('listings')
        .delete()
        .eq('id', listingId);

      if (error) throw error;
      setListings(prev => prev.filter(item => item.id !== listingId));
    } catch (err) {
      console.error("Erreur suppression annonce :", err);
      alert("Erreur lors de la suppression de l'annonce.");
    }
  };

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

  const userListings = useMemo(() => {
    if (!user || !listings) return [];
    return listings.filter((item) => item.user_id === user.id);
  }, [listings, user]);

  const groupedSeries = useMemo(() => {
    const groups = {};
  
    (seriesList || []).forEach((series) => {
      const block = series.block_name && series.block_name.trim() !== '' 
        ? series.block_name 
        : 'Extensions Récentes';

      if (!groups[block]) {
        groups[block] = [];
      }
      groups[block].push(series);
    });

    return groups;
  }, [seriesList]);

  const filteredListings = useMemo(() => {
    return listings.filter(item => {
      // 1. Recherche textuelle
      const cardName = item.cards?.name || item.title || '';
      const pokemonName = item.cards?.pokemon_name || item.pokemon_name || '';
      const matchesSearch = searchQuery === '' || 
        cardName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pokemonName.toLowerCase().includes(searchQuery.toLowerCase());

      // Retrouver la série associée à l'annonce via son extension_id
      const matchingSeries = seriesList.find(s => s.id === item.extension_id || s.code === item.extension_id);
      const seriesName = matchingSeries ? matchingSeries.name : '';
      const blockName = matchingSeries ? matchingSeries.block_name : '';

      // 2. Filtre Bloc 
      const matchesBlock = !selectedBlock || 
        (blockName && blockName.toLowerCase() === selectedBlock.toLowerCase()) ||
        (item.extension_id && item.extension_id.toLowerCase().startsWith(selectedBlock.toLowerCase())) ||
        (item.tcgdex_card_id && item.tcgdex_card_id.toLowerCase().startsWith(selectedBlock.toLowerCase()));
      
      // 3. Filtre Série
      const matchesSeries = !selectedSeriesFilter || 
        seriesName.toLowerCase().includes(selectedSeriesFilter.toLowerCase()) ||
        (item.extension_id && item.extension_id.toLowerCase().includes(selectedSeriesFilter.toLowerCase()));

      // 3.5. Filtre Illustrateur (Ajouté ici)
      const cardData = Array.isArray(item.cards) ? item.cards[0] : item.cards;
      const itemIllustrator = cardData?.illustrator || item.illustrator || '';
      const matchesIllustrator = !selectedIllustrator || 
        itemIllustrator.toLowerCase().includes(selectedIllustrator.toLowerCase());

      // 4. Filtre Département
      const matchesDept = !selectedRegion || 
        item.profiles?.department_code === selectedRegion || 
        item.department_code === selectedRegion ||
        item.department === selectedRegion;
      
      // 5. Filtre de finition
      let matchesFinish = true;
      if (filterFinish) {
        const itemFinish = (item.finish || '').trim();
        const normalizedItemFinish = itemFinish === '' ? 'Normale' : itemFinish;
        matchesFinish = normalizedItemFinish.toLowerCase() === filterFinish.trim().toLowerCase();
      }

      // 6. Filtre d'état strict (différencie Mint de Near Mint)
      const itemCond = (item.condition || item.etat || '').trim().toLowerCase();
      const selectedCond = (filterCondition || '').trim().toLowerCase();
      const matchesCondition = !filterCondition || (itemCond !== '' && itemCond === selectedCond);

      return matchesSearch && matchesBlock && matchesSeries && matchesIllustrator && matchesDept && matchesFinish && matchesCondition;
    });
  }, [listings, searchQuery, selectedBlock, selectedSeriesFilter, selectedIllustrator, selectedRegion, filterFinish, filterCondition, seriesList]);

  useEffect(() => {
    async function fetchFavorites() {
      if (!user) {
        setFavoriteListings([]);
        return;
      }

      // 1. On récupère uniquement les IDs des favoris de l'utilisateur
      const { data, error } = await supabase
        .from('user_favorites')
        .select('listing_id')
        .eq('user_id', user.id);

      if (!error && data) {
        // 2. On extrait les IDs
        const favIds = data.map(fav => fav.listing_id);
        
        // 3. On retrouve les objets cartes complets dans la liste globale 'listings'
        const matchedListings = listings.filter(item => favIds.includes(item.id));
        setFavoriteListings(matchedListings);
      } else {
        console.error("Erreur chargement favoris:", error);
      }
    }

    if (listings && listings.length > 0) {
      fetchFavorites();
    }
  }, [user, listings]);

  useEffect(() => {
    async function fetchFavoriteSellers() {
      if (!user) {
        setFavoriteSellers([]);
        return;
      }

      // 1. On récupère les noms des vendeurs favoris de l'utilisateur
      const { data, error } = await supabase
        .from('user_favorite_sellers')
        .select('seller_name')
        .eq('user_id', user.id);

      if (!error && data) {
        // 2. On extrait directement les noms
        const sellers = data.map(fav => fav.seller_name);
        setFavoriteSellers(sellers);
      } else {
        console.error("Erreur chargement vendeurs favoris:", error);
      }
    }

    fetchFavoriteSellers();
  }, [user]);

  useEffect(() => {
    async function fetchCardCount() {
      if (!user) return;
      
      const { data, error } = await supabase.rpc('get_total_cards_quantity', { 
        p_user_id: user.id 
      });

      if (!error) {
        setTotalCardsCount(data || 0);
      } else {
        console.error("Erreur lors du comptage SQL :", error);
      }
    }

    fetchCardCount();
  }, [user, listings]);

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-800 relative bg-slate-900 pt-8 md:pt-0" onClick={() => isUserMenuOpen && setIsUserMenuOpen(false)}>
      
      {/* 1. L'animation de bienvenue se place en tout premier par-dessus tout */}
      {showSplash && (
        <WelcomeSplash onFinish={handleSplashFinish} />
      )}

      {/* Bandeau Mode Bêta Global */}
      <div className="bg-amber-500 text-slate-950 px-4 py-2 text-center font-bold text-sm shadow-md flex items-center justify-center gap-2">
        <span>🚧</span>
        <span>Mode Bêta / Simulation : Aucun paiement réel. Les annonces et les envois sont fictifs. Amusez-vous à tester !</span>
      </div>

      {/* HEADER */}
      {Capacitor.isNativePlatform() ? (
        /* --- VERSION MOBILE (Menu Burger Complet & Synchronisé) --- */
        <header className="bg-slate-900 text-white py-3 px-4 border-b border-slate-800 flex justify-between items-center relative z-50">
          {/* Logo sur Mobile */}
          <div 
            onClick={() => { setCurrentView('home'); setSelectedSeries(null); setIsMobileMenuOpen(false); }}
            className="font-bold text-lg cursor-pointer flex items-center gap-2"
          >
            <span>Le Bon Pokémon</span>
          </div>

          {/* Actions rapides à droite sur mobile (Notifs, Panier, Burger) */}
          <div className="flex items-center gap-2">
            {user && <NotificationBell currentUserId={user.id} onOpenConversation={handleOpenInboxWithConversation} />}

            <button
              onClick={() => { setCurrentView('cart'); setIsMobileMenuOpen(false); }}
              className="relative bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold p-2 rounded-xl transition-colors shadow-sm cursor-pointer flex items-center justify-center border border-slate-700"
            >
              <span>🛒</span>
              {totalCartItemsCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-indigo-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-black">
                  {totalCartItemsCount}
                </span>
              )}
            </button>

            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-2xl text-white focus:outline-none cursor-pointer"
            >
              {isMobileMenuOpen ? '✕' : '☰'}
            </button>
          </div>

          {/* Menu déroulant vertical complet quand on clique sur ☰ */}
          {isMobileMenuOpen && (
            <div className="absolute top-full left-0 w-full bg-slate-900 border-b border-slate-800 flex flex-col p-4 gap-3 shadow-2xl z-50 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              
              {/* Navigation principale mobile */}
              <div className="flex flex-col gap-2 pb-3 border-b border-slate-800">
                <button 
                  onClick={() => { setCurrentView('home'); setSelectedSeries(null); setIsMobileMenuOpen(false); }}
                  className="text-left py-2.5 px-4 bg-slate-800 rounded-xl font-medium text-slate-200 flex items-center gap-2.5 cursor-pointer"
                >
                  <span>🏠</span> Accueil
                </button>
                <button 
                  onClick={() => { setCurrentView('optimizer'); setIsMobileMenuOpen(false); }}
                  className="text-left py-2.5 px-4 bg-slate-800 rounded-xl font-medium text-slate-200 flex items-center gap-2.5 cursor-pointer"
                >
                  <span>🎯</span> Optimiser mes achats
                </button>
                <button 
                  onClick={() => { setCurrentView('pokedex'); setIsMobileMenuOpen(false); }}
                  className="text-left py-2.5 px-4 bg-slate-800 rounded-xl font-medium text-slate-200 flex items-center gap-2.5 cursor-pointer"
                >
                  <span>📖</span> Pokédex
                </button>
                <button 
                  onClick={() => { setCurrentView('my-collection'); setIsMobileMenuOpen(false); }}
                  className="text-left py-2.5 px-4 bg-slate-800 rounded-xl font-medium text-slate-200 flex items-center gap-2.5 cursor-pointer"
                >
                  <span>📚</span> Ma collection
                </button>

                {user && (
                  <>
                    <button 
                      onClick={() => { openMassListingSelector(); setIsMobileMenuOpen(false); }}
                      className="text-left py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-bold text-white flex items-center gap-2.5 cursor-pointer"
                    >
                      <span>⚡</span> Ajout en masse
                    </button>
                    <button 
                      onClick={() => { setIsCreateOpen(true); setIsMobileMenuOpen(false); }}
                      className="text-left py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold text-white flex items-center gap-2.5 cursor-pointer"
                    >
                      <span>+</span> Vendre à l'unité
                    </button>
                  </>
                )}
              </div>

              {/* Partie Mon Compte / Profil mobile synchronisée */}
              <div className="flex flex-col gap-2 pt-1">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">Mon Compte</p>
                {user ? (
                  <>
                    {/* En-tête profil mobile avec le style badge RPG */}
                    <div className="flex items-center gap-3 px-3 py-2.5 bg-slate-800/50 rounded-xl border border-slate-700/50">
                      {(() => {
                        const currentCount = typeof totalCardsCount !== 'undefined' ? totalCardsCount : (userListings?.length || 0);
                        const previousMax = parseInt(localStorage.getItem('max_cards_reached') || '0', 10);
                        const effectiveCardsCount = Math.max(currentCount, previousMax);
                        if (effectiveCardsCount > previousMax) {
                          localStorage.setItem('max_cards_reached', effectiveCardsCount.toString());
                        }

                        const leagueSteps = [
                          { id: 'roche', target: 20, current: Math.min(effectiveCardsCount, 20), icon: rocheImg },
                          { id: 'cascade', target: 200, current: Math.min(effectiveCardsCount, 200), icon: cascadeImg },
                          { id: 'foudre', target: 1, current: 0, icon: foudreImg },
                          { id: 'prisme', target: 1, current: 0, icon: prismeImg },
                          { id: 'ame', target: 700, current: Math.min(effectiveCardsCount, 700), icon: ameImg },
                          { id: 'marais', target: 100, current: 0, icon: maraisImg },
                          { id: 'volcan', target: 10, current: 0, icon: volcanImg },
                          { id: 'terre', target: 1200, current: Math.min(effectiveCardsCount, 1200), icon: terreImg },
                          { id: 'conseil-olga', target: 1, current: 0, icon: olgaImg },
                          { id: 'conseil-aldo', target: 100, current: 0, icon: aldoImg },
                          { id: 'conseil-agatha', target: 1, current: 0, icon: agathaImg },
                          { id: 'conseil-peter', target: 1, current: 0, icon: peterImg },
                          { id: 'maitre-kanto', target: 5000, current: Math.min(effectiveCardsCount, 5000), icon: championImg },
                        ];

                        const unlockedSteps = leagueSteps.filter(step => step.current >= step.target);
                        const hasUnlockedAny = unlockedSteps.length > 0;
                        const highestBadge = hasUnlockedAny ? unlockedSteps[unlockedSteps.length - 1] : null;

                        return (
                          <div className="relative inline-block shrink-0">
                            <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center overflow-hidden font-bold text-white">
                              {profile?.avatar_url ? (
                                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-xs">
                                  {profile?.username ? profile.username[0].toUpperCase() : user.email[0].toUpperCase()}
                                </span>
                              )}
                            </div>

                            <div className={`absolute inset-0 rounded-full border-2 pointer-events-none transition-all ${
                              hasUnlockedAny ? 'border-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]' : 'border-slate-600 opacity-50'
                            }`}></div>

                            {highestBadge && (
                              <div className="absolute -bottom-1 -right-1 bg-slate-900 text-white w-5 h-5 rounded-full border border-slate-700 shadow-sm flex items-center justify-center overflow-hidden p-0.5">
                                <img src={highestBadge.icon} alt="Badge" className="w-full h-full object-contain drop-shadow" />
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      <div className="flex flex-col truncate">
                        <span className="text-xs font-bold text-white truncate">{profile?.username || 'Mon Compte'}</span>
                        <span className="text-[10px] text-slate-400 truncate">{user.email}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => { setCurrentView('settings'); setIsMobileMenuOpen(false); }}
                      className="text-left py-2 px-3 text-xs font-medium text-slate-300 hover:bg-slate-800 rounded-lg flex items-center gap-2 cursor-pointer"
                    >
                      ⚙️ Paramètres du profil
                    </button>
                    <button
                      onClick={() => { setCurrentView('favorites'); setIsMobileMenuOpen(false); }}
                      className="text-left py-2 px-3 text-xs font-medium text-slate-300 hover:bg-slate-800 rounded-lg flex items-center gap-2 cursor-pointer"
                    >
                      ❤️ Mes favoris
                    </button>
                    <button
                      onClick={() => { setCurrentView('purchases'); setIsMobileMenuOpen(false); }}
                      className="text-left py-2 px-3 text-xs font-medium text-slate-300 hover:bg-slate-800 rounded-lg flex items-center gap-2 cursor-pointer"
                    >
                      🛍️ Mes achats
                    </button>
                    <button
                      onClick={() => { setCurrentView('league'); setIsMobileMenuOpen(false); }}
                      className="text-left py-2 px-3 text-xs font-bold text-amber-400 hover:bg-amber-500/10 rounded-lg flex items-center gap-2 cursor-pointer"
                    >
                      ⚡ Ligue Pokémon (Kanto)
                    </button>
                    <button
                      onClick={() => { setCurrentView('account'); setIsMobileMenuOpen(false); }}
                      className="text-left py-2 px-3 text-xs font-medium text-slate-300 hover:bg-slate-800 rounded-lg flex items-center gap-2 cursor-pointer"
                    >
                      📦 Mes annonces ({userListings.length})
                    </button>
                    <button
                      onClick={() => { setCurrentView('inbox'); setIsMobileMenuOpen(false); }}
                      className="text-left py-2 px-3 text-xs font-medium text-slate-300 hover:bg-slate-800 rounded-lg flex items-center gap-2 cursor-pointer"
                    >
                      💬 Messagerie
                    </button>

                    <button 
                      onClick={() => window.open('https://docs.google.com/forms/d/e/1FAIpQLSc3ReFe89UxRat7-0oStUYtN2BaI0EW7tWaR9hsJiYeQbzPgQ/viewform', '_blank')}
                      className="w-full text-left px-3 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg flex items-center gap-2 transition-colors my-1 cursor-pointer shadow-sm text-xs justify-center"
                    >
                      <span>📢</span> DONNEZ VOTRE AVIS
                    </button>

                    <div className="border-t border-slate-800 my-1"></div>

                    <button
                      onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }}
                      className="text-left py-2 px-3 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 rounded-lg flex items-center gap-2 cursor-pointer"
                    >
                      🚪 Déconnexion
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => { setIsAuthOpen(true); setIsMobileMenuOpen(false); }}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 px-4 rounded-xl font-bold text-xs transition-colors text-center shadow-sm cursor-pointer"
                  >
                    Se connecter
                  </button>
                )}
              </div>

            </div>
          )}
        </header>
      ) : (

      /* --- VERSION SITE WEB PC (Ton header d'origine) --- */
      <header className="bg-slate-900 text-white py-4 px-6 shadow-md border-b border-slate-800 sticky top-0 z-40">
        <div className="w-full flex justify-between items-center">

          {/* Logo et Nom du site */}
          <div 
            onClick={() => { setCurrentView('home'); setSelectedSeries(null); }}
            className="flex items-center gap-3.5 cursor-pointer group"
          >
            {/* Icône style Master Ball fidèle à la référence */}
            <div className="w-14 h-14 rounded-full relative overflow-hidden shadow-lg shadow-purple-500/30 border-2 border-slate-900 flex flex-col group-hover:scale-105 transition-transform">
              
              {/* Partie supérieure (Violette Master Ball) */}
              <div className="h-1/2 bg-purple-700 relative w-full flex items-center justify-center">
                
                {/* Cercle rose gauche avec reflet blanc */}
                <div className="absolute left-1 top-1 w-3 h-3 bg-fuchsia-500 rounded-full border border-fuchsia-600 overflow-hidden shadow-inner">
                  <div className="absolute top-0.5 left-0.5 w-1 h-1 bg-white rounded-full"></div>
                </div>
                
                {/* Cercle rose droit avec reflet blanc */}
                <div className="absolute right-1 top-1 w-3 h-3 bg-fuchsia-500 rounded-full border border-fuchsia-600 overflow-hidden shadow-inner">
                  <div className="absolute top-0.5 left-0.5 w-1 h-1 bg-white rounded-full"></div>
                </div>
                
                {/* Lettre M blanche stylisée */}
                <span className="text-white font-black text-[11px] tracking-tighter mt-1 drop-shadow-sm">M</span>
              </div>

              {/* Ligne / Ceinture noire centrale */}
              <div className="absolute inset-x-0 top-1/2 h-1 bg-slate-950 -translate-y-1/2 z-10"></div>

              {/* Partie inférieure (Grise / Blanche) */}
              <div className="h-1/2 bg-slate-200 w-full"></div>

              {/* Bouton central de la Pokéball */}
              <div className="absolute inset-0 m-auto w-3.5 h-3.5 rounded-full bg-white border-2 border-slate-950 flex items-center justify-center z-20 shadow-sm">
                <div className="w-1 h-1 rounded-full bg-slate-800"></div>
              </div>

            </div>
            
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white inline-block origin-left scale-x-125">
                Le Bon <span className="text-purple-400">Pokémon</span>
              </h1>
              <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                Marketplace & Petites Annonces de Cartes Pokémon entre particuliers
              </p>
            </div>
          </div>

          {/* --- TA NAVBAR --- */}
          <nav className="flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800">
            {/* Ton logo / liens à gauche ... */}
            
            {/* Le bouton Mini-jeu dans la Navbar */}
            <button 
              onClick={() => setIsMinigameOpen(true)}
              className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 px-6 py-3 rounded-xl font-bold text-xs flex items-center gap-2 transition cursor-pointer shadow-lg"
            >
              <span>⚡</span>
              <span>Minijeu</span>
              <span>⚡</span>
            </button>

            {/* Autres boutons à droite ... */}
          </nav>

          {/* --- LE RESTE DE TA PAGE --- */}
          <main>
            {/* Tes grilles, routes, etc. */}
          </main>

          {/* --- LA MODALE DU MINI-JEU --- */}
          <WhosThatPokemon
            isOpen={isMinigameOpen}
            onClose={() => setIsMinigameOpen(false)}
            onSelectProfile={(userId) => {
              setIsMinigameOpen(false);       // Ferme le mini-jeu
              setSelectedSellerId(userId);    // Ouvre la modale UserStoreModal avec l'ID du vendeur
            }}
          />

          <div className="flex items-center gap-3">
            {/* BOUTON NOTIFICATIONS CONNECTÉ */}
            {user && <NotificationBell currentUserId={user.id} onOpenConversation={handleOpenInboxWithConversation} />}

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

            {/* NOUVEAU BOUTON : Optimiseur de cartes manquantes */}
            <button
              onClick={() => { setCurrentView('optimizer'); setIsUserMenuOpen(false); }}
              className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-colors shadow-sm cursor-pointer flex items-center gap-1.5 border border-slate-700"
            >
              <span>🎯</span> Optimiser mes achats
            </button>

            <button
              onClick={() => setCurrentView('pokedex')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                currentView === 'pokedex'
                  ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-900/30'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
              }`}
            >
              📖 Pokédex
            </button>

            {/* BOUTON MA COLLECTION */}
            <button 
              onClick={() => setCurrentView('my-collection')}
              className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-colors shadow-sm cursor-pointer flex items-center gap-1.5 border border-slate-700"
            >
              <span>📖</span> Ma collection
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
                    className="flex items-center gap-2.5 bg-slate-800 hover:bg-slate-700 py-1.5 pl-1.5 pr-3 rounded-full border border-slate-700 transition-colors cursor-pointer"
                  >
                    {/* --- AVATAR AVEC CADRE RPG & BADGE DYNAMIQUE --- */}
                    {(() => {
                      const currentCount = typeof totalCardsCount !== 'undefined' ? totalCardsCount : (userListings?.length || 0);
                      const previousMax = parseInt(localStorage.getItem('max_cards_reached') || '0', 10);
                      const effectiveCardsCount = Math.max(currentCount, previousMax);
                      if (effectiveCardsCount > previousMax) {
                        localStorage.setItem('max_cards_reached', effectiveCardsCount.toString());
                      }

                      const leagueSteps = [
                        { id: 'roche', target: 20, current: Math.min(effectiveCardsCount, 20), icon: rocheImg },
                        { id: 'cascade', target: 200, current: Math.min(effectiveCardsCount, 200), icon: cascadeImg },
                        { id: 'foudre', target: 1, current: 0, icon: foudreImg },
                        { id: 'prisme', target: 1, current: 0, icon: prismeImg },
                        { id: 'ame', target: 700, current: Math.min(effectiveCardsCount, 700), icon: ameImg },
                        { id: 'marais', target: 100, current: 0, icon: maraisImg },
                        { id: 'volcan', target: 10, current: 0, icon: volcanImg },
                        { id: 'terre', target: 1200, current: Math.min(effectiveCardsCount, 1200), icon: terreImg },
                        { id: 'conseil-olga', target: 1, current: 0, icon: olgaImg },
                        { id: 'conseil-aldo', target: 100, current: 0, icon: aldoImg },
                        { id: 'conseil-agatha', target: 1, current: 0, icon: agathaImg },
                        { id: 'conseil-peter', target: 1, current: 0, icon: peterImg },
                        { id: 'maitre-kanto', target: 5000, current: Math.min(effectiveCardsCount, 5000), icon: championImg },
                      ];

                      const unlockedSteps = leagueSteps.filter(step => step.current >= step.target);
                      const hasUnlockedAny = unlockedSteps.length > 0;
                      const highestBadge = hasUnlockedAny ? unlockedSteps[unlockedSteps.length - 1] : null;

                      return (
                        <div className="relative inline-block shrink-0">
                          <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center overflow-hidden font-bold text-white">
                            {profile?.avatar_url ? (
                              <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-xs">
                                {profile?.username ? profile.username[0].toUpperCase() : user.email[0].toUpperCase()}
                              </span>
                            )}
                          </div>

                          <div className={`absolute inset-0 rounded-full border-2 pointer-events-none transition-all ${
                            hasUnlockedAny 
                              ? 'border-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]' 
                              : 'border-slate-600 opacity-50'
                          }`}></div>

                          {highestBadge && (
                            <div className="absolute -bottom-1 -right-1 bg-slate-900 text-white w-7 h-7 rounded-full border border-slate-700 shadow-sm flex items-center justify-center overflow-hidden p-0.5">
                              <img src={highestBadge.icon} alt="Badge" className="w-full h-full object-contain drop-shadow" />
                            </div>
                          )}
                        </div>
                      );
                    })()}

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
                        onClick={() => { setCurrentView('settings'); setIsUserMenuOpen(false); }}
                        className="w-full text-left px-4 py-2.5 text-xs font-medium hover:bg-slate-50 transition-colors cursor-pointer flex items-center gap-2"
                      >
                        ⚙️ Paramètres du profil
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
                        onClick={() => { setCurrentView('league'); setIsUserMenuOpen(false); }}
                        className="w-full text-left px-4 py-2.5 text-xs font-medium text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer flex items-center gap-2 font-bold"
                      >
                        ⚡ Ligue Pokémon (Kanto)
                      </button>

                      <button
                        onClick={() => { setCurrentView('account'); setIsUserMenuOpen(false); }}
                        className="w-full text-left px-4 py-2.5 text-xs font-medium hover:bg-slate-50 transition-colors cursor-pointer flex items-center gap-2"
                      >
                        📦 Mes annonces ({userListings.length})
                      </button>

                      <button
                        onClick={() => { setCurrentView('inbox'); setIsUserMenuOpen(false); }}
                        className="w-full text-left px-4 py-2.5 text-xs font-medium hover:bg-slate-50 transition-colors cursor-pointer flex items-center gap-2"
                      >
                        💬 Messagerie
                      </button>

                      <button 
                        onClick={() => window.open('https://docs.google.com/forms/d/e/1FAIpQLSc3ReFe89UxRat7-0oStUYtN2BaI0EW7tWaR9hsJiYeQbzPgQ/viewform', '_blank')}
                        className="w-full text-left px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg flex items-center gap-2 transition-colors my-2 cursor-pointer shadow-sm"
                      >
                        <span>📢</span> DONNEZ VOTRE AVIS
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
    )}

       

      {/* ================= CONTENEUR GLOBAL DES 3 COLONNES ================= */}
      <div className="relative bg-slate-900 max-w-[1920px] mx-auto flex justify-between px-4 flex-grow">
        {currentView === 'cart' && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                  <span>🛒</span> Mon Panier multi-vendeurs
                </h2>
                <button
                  onClick={() => setCurrentView('home')}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                >
                  ← Continuer mes achats
                </button>
              </div>

              {Object.keys(cart).length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm">
                  <p className="text-4xl mb-3">🛒</p>
                  <p className="text-slate-600 font-medium text-sm">Votre panier est vide pour le moment.</p>
                  <button
                    onClick={() => setCurrentView('home')}
                    className="mt-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-colors shadow-sm cursor-pointer"
                  >
                    Découvrir les annonces
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Le reste de ton code panier continue ici normalement */}
                </div>
              )}
            </div>
          )}
        {/* 1. BANNIÈRE GAUCHE (Fixée au bord tout à gauche de l'écran) */}
        <div className="hidden 2xl:block fixed left-0 top-[110px] w-[650px] h-[calc(100vh-110px)] z-0 pointer-events-none">
          <img 
            src="/banniere/pokemon%20gauche.png" 
            alt="Bannière Gauche" 
            className="w-full h-full object-cover opacity-100"
          />
        </div>
      </div>

      {/* ================= CONTENU CENTRAL ================= */}
      <main className="w-full xl:ml-[310px] xl:mr-[310px] xl:max-w-[calc(100%-620px)] mx-auto px-4 py-6 z-10 relative">
        {currentView === 'cart' ? (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                <span>🛒</span> Mon Panier multi-vendeurs
              </h2>
              <button 
                onClick={() => setCurrentView('home')}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
              >
                ← Continuer mes achats
              </button>
            </div>

            {Object.keys(cart).length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm">
                <p className="text-4xl mb-3">🛒</p>
                <p className="text-slate-600 font-medium text-sm">Votre panier est vide pour le moment.</p>
                <button
                  onClick={() => setCurrentView('home')}
                  className="mt-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-colors shadow-sm cursor-pointer"
                >
                  Découvrir les annonces
                </button>
              </div>
            ) : (
              <div className="space-y-6">
               {Object.entries(cart).map(([sellerId, sellerGroup]) => {
                // Calcule le sous-total des articles du vendeur
                const subTotal = sellerGroup.items.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0);
  
                // Définit proprement le mode de livraison actuel pour ce vendeur (avec valeurs par défaut)
                const currentShipping = shippingMethods[sellerId] || { name: 'Lettre Suivante', price: 2.50 };
  
                // Calcule le total final avec le port
                const totalWithShipping = subTotal + currentShipping.price;
                
                // --- AJOUTE CES CALCULS ICI ---
                const itemPrice = subTotal;
                const shippingCost = currentShipping.price;
                const platformFee = Number((itemPrice * 0.10).toFixed(2));
                const finalTotal = Number((itemPrice + shippingCost + platformFee).toFixed(2));

                return (
                    <div key={sellerId} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden mb-6">
                      <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                        <div>
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Expéditeur / Vendeur</span>
                          <h3 className="text-sm font-black text-slate-900">📦 Colis de : {sellerGroup.sellerName}</h3>
                        </div>
                        <span className="bg-indigo-50 text-indigo-700 text-xs font-bold px-3 py-1 rounded-full border border-indigo-100">
                          {sellerGroup.items.reduce((acc, item) => acc + (item.quantity || 1), 0)} article(s)
                        </span>
                      </div>

                      <div className="divide-y divide-slate-100">
                        {sellerGroup.items.map((item) => {
                          const maxStock = item.maxStock || item.stock || item.quantity || 1;
                          const currentQty = item.quantity || 1;

                          return (
                            <div key={item.id} className="p-4 sm:p-6 flex items-center justify-between gap-4 border-b border-slate-100 last:border-none">
                              {/* Infos de la carte (Image, Nom, État, Prix) */}
                              <div className="flex items-center gap-4">
                                <img 
                                  src={item.cards?.image_url || item.image_url || 'https://via.placeholder.com/60'} 
                                  alt={item.cards?.name || item.name} 
                                  className="w-14 h-20 object-cover rounded-xl border border-slate-200 shadow-sm"
                                />
                                <div>
                                  <h4 className="text-sm font-bold text-slate-900">{item.cards?.name || item.name}</h4>
                                  <p className="text-xs text-slate-500 mt-0.5">État : <span className="font-semibold text-slate-700">{item.condition || 'NM'}</span></p>
                                  <p className="text-xs font-black text-indigo-600 mt-1">{(Number(item.price) * currentQty).toFixed(2)} €</p>
                                </div>
                              </div>

                              {/* Partie Droite : Sélecteur de quantité + Bouton Retirer */}
                              <div className="flex items-center gap-3">
                                {/* Sélecteur de quantité (+ / -) */}
                                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-full px-3 py-1.5 gap-3 shadow-sm">
                                  <button 
                                    onClick={() => updateQuantity(sellerId, item.id, currentQty - 1, maxStock)}
                                    className="text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer font-bold text-lg leading-none"
                                    title="Diminuer la quantité"
                                  >
                                    -
                                  </button>

                                  <span className="text-sm font-bold text-slate-800 w-4 text-center">
                                    {currentQty}
                                  </span>

                                  <button 
                                    onClick={() => updateQuantity(sellerId, item.id, currentQty + 1, maxStock)}
                                    disabled={currentQty >= maxStock}
                                    className={`transition-colors font-bold ${currentQty >= maxStock ? 'text-slate-300 cursor-not-allowed' : 'text-slate-700 hover:text-indigo-600 cursor-pointer'}`}
                                    title={currentQty >= maxStock ? "Stock maximum atteint" : "Augmenter la quantité"}
                                  >
                                    +
                                  </button>
                                </div>

                                {/* Bouton "Retirer" dédié */}
                                <button 
                                  onClick={() => removeFromCart(sellerId, item.id)}
                                  className="text-xs font-semibold text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-xl transition-colors cursor-pointer"
                                  title="Supprimer l'article du panier"
                                >
                                  Retirer
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="px-6 py-4 space-y-4">
                        <span className="text-xs font-bold text-slate-700 block">Mode de livraison :</span>
 
                        {/* SECTION : EN POINT RETRAIT */}
                        <div className="space-y-2">
                          <span className="text-xs font-semibold text-slate-600 block">En point retrait</span>
    
                          <label className="flex items-center justify-between p-3 border border-slate-200 rounded-xl cursor-pointer hover:border-indigo-500 bg-white transition">
                            <div className="flex items-center gap-3">
                              <input 
                                type="radio" 
                                name={`shipping-${sellerId}`} 
                                checked={currentShipping?.name === 'Mondial Relay'}
                                onChange={() => {
                                  setShippingMethods({
                                    ...shippingMethods,
                                    [sellerId]: { 
                                      name: 'Mondial Relay', 
                                      price: 4.40, 
                                      pointRelais: currentShipping?.pointRelais || null 
                                    }
                                  });
                                }}
                                className="text-indigo-600 focus:ring-indigo-500" 
                              />
                              <div>
                                <p className="font-medium text-xs text-slate-900">Mondial Relay</p>
                                <p className="text-[11px] text-slate-500">Livraison en point de retrait</p>
                              </div>
                            </div>
                            <span className="font-bold text-xs text-slate-900">4,40 €</span>
                          </label>

                          {/* Bloc Point Relais Sélectionné / À choisir */}
                          {currentShipping?.name === 'Mondial Relay' && (
                            <div className="ml-7 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                              {currentShipping.pointRelais ? (
                                <div className="flex justify-between items-center text-xs">
                                  <div>
                                    <p className="font-bold text-slate-900">📍 {currentShipping.pointRelais.name}</p>
                                    <p className="text-slate-500 text-[11px]">{currentShipping.pointRelais.address}</p>
                                  </div>
                                  <button 
                                    type="button"
                                    onClick={() => setActiveSellerForRelay(sellerId)}
                                    className="text-indigo-600 font-semibold hover:underline cursor-pointer"
                                  >
                                    Modifier
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setActiveSellerForRelay(sellerId)}
                                  className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer border border-indigo-100"
                                >
                                  🗺️ Choisir un point retrait (Carte interactive)
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        {/* SECTION : À DOMICILE */}
                        <div className="space-y-2">
                          <span className="text-xs font-semibold text-slate-600 block">À domicile / Autre</span>
    
                          {/* Lettre Suivante */}
                          <label className="flex items-center justify-between p-3 border border-slate-200 rounded-xl cursor-pointer hover:border-indigo-500 bg-white transition">
                            <div className="flex items-center gap-3">
                              <input 
                                type="radio" 
                                name={`shipping-${sellerId}`} 
                                checked={currentShipping?.name === 'Lettre Suivante' || !currentShipping}
                                onChange={() => {
                                  setShippingMethods({
                                    ...shippingMethods,
                                    [sellerId]: { name: 'Lettre Suivante', price: 2.50 }
                                  });
                                }}
                                className="text-indigo-600 focus:ring-indigo-500" 
                              />
                              <div>
                                <p className="font-medium text-xs text-slate-900">Lettre Suivante</p>
                                <p className="text-[11px] text-slate-500">Idéal pour les cartes</p>
                              </div>
                            </div>
                            <span className="font-bold text-xs text-slate-900">2,50 €</span>
                          </label>

                          {/* Colissimo */}
                          <label className="flex items-center justify-between p-3 border border-slate-200 rounded-xl cursor-pointer hover:border-indigo-500 bg-white transition">
                            <div className="flex items-center gap-3">
                              <input 
                                type="radio" 
                                name={`shipping-${sellerId}`} 
                                checked={currentShipping?.name === 'Colissimo'}
                                onChange={() => {
                                  setShippingMethods({
                                    ...shippingMethods,
                                    [sellerId]: { name: 'Colissimo', price: 5.00 }
                                  });
                                }}
                                className="text-indigo-600 focus:ring-indigo-500" 
                              />
                              <div>
                                <p className="font-medium text-xs text-slate-900">Colissimo</p>
                                <p className="text-[11px] text-slate-500">Livré directement chez vous</p>
                              </div>
                            </div>
                            <span className="font-bold text-xs text-slate-900">5,00 €</span>
                          </label>

                          {/* Remise en main propre */}
                          <label className="flex items-center justify-between p-3 border border-slate-200 rounded-xl cursor-pointer hover:border-indigo-500 bg-white transition">
                            <div className="flex items-center gap-3">
                              <input 
                                type="radio" 
                                name={`shipping-${sellerId}`} 
                                checked={currentShipping?.name === 'Remise en main propre'}
                                onChange={() => {
                                  setShippingMethods({
                                    ...shippingMethods,
                                    [sellerId]: { name: 'Remise en main propre', price: 0.00 }
                                  });
                                }}
                                className="text-indigo-600 focus:ring-indigo-500" 
                              />
                              <div>
                                <p className="font-medium text-xs text-slate-900">Remise en main propre</p>
                                <p className="text-[11px] text-slate-500">Gratuit</p>
                              </div>
                            </div>
                            <span className="font-bold text-xs text-slate-900">0,00 €</span>
                          </label>
                        </div>

                      <div className="text-xs text-slate-600 text-right pt-2">
                        Frais de port : <span className="font-bold text-slate-900">{(currentShipping?.price ?? 2.50).toFixed(2)} €</span>
                      </div>
                    </div>

                    {/* --- BLOC RÉCAPITULATIF DES FRAIS & PROTECTION ACHETEUR (5%) --- */}
                    <div className="mx-6 mb-4 bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2 text-sm">
                      <div className="flex justify-between text-slate-600">
                        <span>Sous-total des articles</span>
                        <span className="font-semibold text-slate-900">{itemPrice.toFixed(2)} €</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Frais de port</span>
                        <span className="font-semibold text-slate-900">{shippingCost.toFixed(2)} €</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Protection acheteur (10%)</span>
                        <span className="font-semibold text-slate-900">{platformFee.toFixed(2)} €</span>
                      </div>
                      <div className="border-t border-slate-200 pt-2 flex justify-between items-center font-bold text-base">
                        <span className="text-slate-900">Total à payer</span>
                        <span className="text-indigo-600 text-lg">{finalTotal.toFixed(2)} €</span>
                      </div>
                    </div>

                    <div className="px-6 py-4 bg-white border-t border-slate-100 flex justify-end">
                      <button
                        onClick={() => handleCheckout(sellerId, sellerGroup, currentShipping, finalTotal)}
                        className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-colors shadow-sm cursor-pointer flex items-center justify-center gap-2"       >
                        <span>💳</span> Valider cet achat ({finalTotal.toFixed(2)} €)
                      </button>
                    </div>
                  </div>
                );
                })}
              </div>
            )}
          </div>

        ) : currentView === 'league' ? (
          <KantoLeagueTab totalCards={totalCards} user={user} />
        ) : currentView === 'series-select' && !selectedSeries ? (
          <div className="min-h-screen bg-[#16181d] text-white w-full px-6 py-6 space-y-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 bg-[#1e222b] p-4 rounded-2xl border border-slate-700/60 shadow-sm">
              <h2 className="text-xl font-bold text-white">Choisissez une série pour l'ajout en masse</h2>
              <button
                type="button"
                onClick={() => setCurrentView('home')}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl transition-colors cursor-pointer border border-slate-700"
              >
                ← Retour à l'accueil
              </button>
            </div>

            {loadingSeries ? (
              <div className="text-center py-12 text-slate-400 font-medium">Chargement des séries...</div>
            ) : seriesList.length === 0 ? (
              <div className="text-center py-12 bg-[#1e222b] rounded-2xl border border-slate-700/60 p-6 text-slate-400 font-medium">
                Aucune série disponible.
              </div>
            ) : (
              Object.entries(groupSeriesByBlock(seriesList)).map(([blockName, blockSeries]) => {
                const sortedBlockSeries = [...blockSeries].reverse();
                
                return (
                  <div key={blockName} className="space-y-4">
                    {/* Titre du bloc */}
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-extrabold text-white uppercase tracking-wide px-3 py-1 bg-[#1e222b] rounded-xl border-l-4 border-purple-500 border border-slate-700/60 shadow-sm">
                        {blockName}
                      </h3>
                      <span className="text-xs font-semibold text-slate-300 bg-[#1e222b] px-3 py-1 rounded-xl border border-slate-700/60">
                        {sortedBlockSeries.length} {sortedBlockSeries.length > 1 ? 'séries' : 'série'}
                      </span>
                    </div>

                    {/* Grille des séries du bloc */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {sortedBlockSeries.map((serie) => {
                        const logoUrl = serie.logo_url || serie.logo || serie.images?.logo;
                        
                        return (
                          <div
                            key={serie.id}
                            onClick={() => setSelectedSeries(serie)}
                            className="bg-[#1e222b] p-5 rounded-2xl border border-slate-700/60 shadow-sm hover:border-purple-500 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
                          >
                            <div className="flex flex-col items-center text-center">
                              {/* Conteneur logo agrandi */}
                              <div className="h-24 w-full flex items-center justify-center mb-3">
                                {logoUrl ? (
                                  <img 
                                    src={logoUrl} 
                                    alt={serie.name} 
                                    className="max-h-24 max-w-full object-contain group-hover:scale-105 transition-transform duration-200" 
                                  />
                                ) : (
                                  <span className="text-base font-extrabold text-slate-200 uppercase tracking-wider">
                                    {serie.name}
                                  </span>
                                )}
                              </div>
                              {logoUrl && (
                                <h3 className="font-extrabold text-slate-100 text-lg line-clamp-2">{serie.name}</h3>
                              )}
                            </div>

                            <span className="mt-4 text-center text-xs font-semibold text-purple-300 bg-purple-950/50 border border-purple-800/50 group-hover:bg-purple-600 group-hover:text-white group-hover:border-purple-600 py-1.5 rounded-xl transition-colors">
                              Sélectionner →
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        
        ) : selectedSeries ? (
          <MassListing 
            selectedSeries={selectedSeries} 
            onBack={() => {
              setSelectedSeries(null);
              setCurrentView('series-select');
            }} 
            userId={user?.id}  
          />
        ) : currentView === 'settings' || currentView === 'account' ? (
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
                    value={profile.username|| ''}
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
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Prénom</label>
                        <input
                          type="text"
                          value={profile.first_name || ''}
                          onChange={(e) => setProfile({...profile, first_name: e.target.value})}
                          className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Nom</label>
                        <input
                          type="text"
                          value={profile.last_name || ''}
                          onChange={(e) => setProfile({...profile, last_name: e.target.value})}
                          className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Téléphone</label>
                      <input
                        type="text"
                        value={profile.phone || ''}
                        onChange={(e) => setProfile({...profile, phone: e.target.value})}
                        placeholder="Ex: 0612345678"
                        className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Adresse de livraison</label>
                      <input
                        type="text"
                        value={profile.address || ''}
                        onChange={(e) => setProfile({...profile, address: e.target.value})}
                        placeholder="Numéro et nom de rue"
                        className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Code Postal</label>
                      <input
                        type="text"
                        value={profile.postal_code || ''}
                        onChange={(e) => setProfile({...profile, postal_code: e.target.value})}
                        placeholder="Ex: 18700"
                        className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Ville</label>
                      <input
                        type="text"
                        value={profile.city || ''}
                        onChange={(e) => setProfile({...profile, city: e.target.value})}
                        placeholder="Ex: Bourges"
                        className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                {profileMessage && <span className="text-xs font-semibold text-emerald-600">{profileMessage}</span>}
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="ml-auto bg-slate-900 hover:bg-teal-600 text-white text-xs font-bold px-6 py-3 rounded-xl transition-colors cursor-pointer shadow-sm"
                >
                  {savingProfile ? 'Enregistrement...' : 'Enregistrer les modifications'}
                </button>
              </div>
            </form>

            <div className="pt-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Mes annonces en ligne ({userListings.length})</h3>
              {userListings.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <p className="text-slate-600 font-medium">Vous n'avez publié aucune annonce.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">

                  {userListings.map((item) => (
                    <div key={item?.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col justify-between">
                      
                      <div className="p-3 bg-slate-50 border-b border-slate-100 flex gap-2">
                        <button 
                          onClick={() => setEditingListing(item)}
                          className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-semibold py-2 rounded-lg cursor-pointer transition-colors text-center"
                        >
                          Modifier
                        </button>
                        <button 
                          onClick={() => handleDeleteListing(item.id)}
                          className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-semibold py-2 rounded-lg cursor-pointer transition-colors text-center"
                        >
                          Supprimer
                        </button>
                      </div>

                      <div onClick={() => setSelectedListing(item)} className="cursor-pointer">
                        <SingleListing listing={item} />
                      </div>

                    </div>
                  ))}
              </div>
              )}
            </div>
          </div>
          
        ) : ( 
          <main className="w-full p-6 space-y-6">
            {/* 1. Vue Accueil (Home) */}
            {currentView === 'home' && (
              <Home 
                setCurrentView={setCurrentView}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                selectedBlock={selectedBlock}
                setSelectedBlock={setSelectedBlock}
                selectedSeriesFilter={selectedSeriesFilter}
                setSelectedSeriesFilter={setSelectedSeriesFilter}
                selectedRegion={selectedRegion}
                setSelectedRegion={setSelectedRegion}
                filterFinish={filterFinish}
                setFilterFinish={setFilterFinish}
                filteredListings={filteredListings}
                filterCondition={filterCondition}
                setFilterCondition={setFilterCondition}
                setSelectedListing={setSelectedListing}
                blocks={blocks}          
                seriesList={seriesList}
                listings={listings}
                favoriteListings={favoriteListings}
                onToggleFavorite={toggleFavoriteListing}
                onAddToCart={addToCart}
                onOpenCreateSingleListing={setIsCreateOpen}
                currentUserId={user?.id}
                selectedIllustrator={selectedIllustrator}
                setSelectedIllustrator={setSelectedIllustrator}
              />
            )}

            {currentView === 'inbox' && (
              <InboxView
                currentUserId={user?.id}
                activeConversationId={activeConversationId}
                onBack={() => setCurrentView('home')}
              />
            )}

            {currentView === 'rarity-guide' && (
              <RarityGuideView setCurrentView={setCurrentView} />
            )}
            
            {currentView === 'condition-guide' && (
              <ConditionGuideView setCurrentView={setCurrentView} />
            )}

            {/* 1. Bis : Vue Profil Vendeur */}
            {currentView === 'seller-profile' && (
              <SellerProfile 
                sellerId={sellerId} 
                favoriteSellers={favoriteSellers} 
                toggleFavoriteSeller={toggleFavoriteSeller} 
              />
            )}

            {currentView === 'my-collection' && (
              <CollectionManager 
                user={user} 
                onBack={() => setCurrentView('home')} 
              />
            )}

            {/* 🎯 AJOUT DE L'OPTIMISEUR ICI */}
            {currentView === 'optimizer' && (
              <MissingCardsOptimizer 
                user={user} 
              />
            )}

            {currentView === 'pokedex' && (
              <PokedexView 
                user={user} 
                currentUserId={user?.id} 
                onBack={() => setCurrentView('home')} 
              />
            )}

            {/* 2. Vue Mes Favoris */}
            {currentView === 'favorites' && (
              <Favorites
                favoriteListings={favoriteListings}
                favoriteSellers={favoriteSellers}
                onRemoveFavoriteListing={async (id) => {
                  if (user) {
                    await supabase
                      .from('user_favorites')
                      .delete()
                      .eq('user_id', user.id)
                      .eq('listing_id', id);
                  }
                  setFavoriteListings(favoriteListings.filter(i => i.id !== id));
                }}
                onRemoveFavoriteSeller={async (seller) => {
                  if (user) {
                    await supabase
                      .from('user_favorite_sellers')
                      .delete()
                      .eq('user_id', user.id)
                      .eq('seller_name', seller);
                  }
                  setFavoriteSellers(favoriteSellers.filter(s => s !== seller));
                }}
                setSelectedListing={setSelectedListing}
                onViewSellerProfile={(sellerId) => {
                  setSellerId(sellerId);
                  setCurrentView('seller-profile');
                }}
              />
            )}

            {/* 3. Modale de détail d'une carte */}
            {selectedListing && (
              <CardDetailModal
                listing={selectedListing}
                onClose={() => setSelectedListing(null)}
                favoriteSellers={favoriteSellers}
                toggleFavoriteSeller={toggleFavoriteSeller}
              />
            )}
          </main>
        )}
      </main>

      {/* 2. BANNIÈRE DROITE (Collée au bord tout à droite de l'écran - VÉRIFIE BIEN "droite.png") */}
      <div className="hidden 2xl:block fixed right-0 top-[110px] w-[650px] h-[calc(100vh-110px)] z-0 pointer-events-none">
        <img 
          src="/banniere/pokemon%20droite.png" 
          alt="Bannière Droite" 
          className="w-full h-full object-cover opacity-100"
        />
      </div>
      
      {/* Modales */}
      {isAuthOpen && (
        <AuthModal 
          isOpen={isAuthOpen} 
          onClose={() => setIsAuthOpen(false)} 
          onSuccess={handleLoginSuccess} 
        />
      )}

      {selectedSellerId && (
        <UserStoreModal
          sellerId={selectedSellerId}
          onClose={() => setSelectedSellerId(null)}
          onSelectListing={(listing) => setSelectedListing(listing)}
        />
      )}
      
      {/* --- AJOUTEZ CETTE PARTIE ICI --- */}
      {/* Tutoriel de bienvenue à la première connexion */}
      {showTutorial && (
        <TutorialModal 
          onClose={() => {
            localStorage.setItem('has_seen_tutorial', 'true'); // ⚡ Enregistre qu'il a été vu
            setShowTutorial(false); // ⚡ Ferme la modale
          }} 
        />
      )}

      {isCreateOpen && <CreateListingModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} onCreated={fetchListings} />}
      {selectedListing && (
        <CardDetailModal
          listing={selectedListing}
          currentUserId={user?.id}
          onClose={() => setSelectedListing(null)}
          onOpenInboxWithConversation={handleOpenInboxWithConversation}
          onAddToCart={addToCart}
          favoriteSellers={favoriteSellers}
          toggleFavoriteSeller={toggleFavoriteSeller}
        />
      )}
      {editingListing && (
        <EditListingView
          listing={editingListing}
          onClose={() => setEditingListing(null)}
          onUpdated={fetchListings}
        />
      )}

      {isCreateOpen && (
        <CreateListingModal 
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onCreated={async () => {
            await fetchListings();
            await checkBadgesFromSupabase(); // ⚡ Badge vérifié ici après l'ajout
          }}
        />
      )}

      {/* Modale d'ajout en masse */}
      {isMassListingOpen && (
        <MassListing 
          isOpen={isMassListingOpen}
          onClose={() => setIsMassListingOpen(false)}
          onCreated={async () => {
            await fetchListings();
            await checkBadgesFromSupabase(); // ⚡ Badge vérifié ici aussi après l'ajout en masse
          }}
        />
      )}

      {currentView === 'purchases' && (
        <MyPurchasesView 
          userId={user?.id} // Remplace 'user' par le nom de ta variable d'état (ex: session?.user?.id, profile?.id, etc.)
          onBack={() => setCurrentView('home')} 
        />
      )}

      {/* Appel du composant externe MondialRelayModal */}
      <MondialRelayModal 
        isOpen={Boolean(activeSellerForRelay)}
        sellerId={activeSellerForRelay}
        onClose={() => setActiveSellerForRelay(null)}
        onSelectPoint={(sellerId, data) => {
          setShippingMethods({
            ...shippingMethods,
            [sellerId]: {
              name: 'Mondial Relay',
              price: 4.40,
              pointRelais: {
                id: data.ID,
                name: data.Nom,
                address: `${data.Adresse1}, ${data.CP} ${data.Ville}`
              }
            }
          });
          setActiveSellerForRelay(null);
        }}
      />
      {/* --- Pop-up de déblocage de badge avec confettis --- */}
      {unlockedBadgeModal && (
        <BadgeUnlockModal 
          badge={unlockedBadgeModal} 
          onClose={() => setUnlockedBadgeModal(null)} 
        />
      )}
      {/* --- Modale de proposition de double authentification / certification --- */}
      {showMfaSetupModal && mfaUser && (
        <MfaSetupModal 
          user={user} 
          onClose={() => setShowMfaSetupModal(false)} 
          onCertified={() => {
            // 👈 On ferme la modale et on met à jour l'état local ou on recharge la page si besoin
            setShowMfaSetupModal(false);
            window.location.reload(); // Solution la plus rapide et propre pour rafraîchir tout le profil d'un coup
          }} 
        />
      )}
      {/* Lecteur de musique Pokémon flottant en bas à droite */}
      <PokemonMusicPlayer playlist={fullPlaylist} />
      {/* --- LE FOOTER S'INSTALLE ICI --- */}
      <Footer />
    </div>
  );
}