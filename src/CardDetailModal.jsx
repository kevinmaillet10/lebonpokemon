import React, { useState, useEffect } from 'react';
import { supabase } from './supabase.js'; 
import SellerProfile from './SellerProfile'; 
import UserStoreModal from './UserStoreModal'; 
import SecurityBanner from './SecurityBanner';
import ReportModal from './ReportModal';

export default function CardDetailModal({ listing, onClose, onOpenInboxWithConversation, onAddToCart, currentUserId, favoriteSellers, toggleFavoriteSeller }) { 
  if (!listing || !listing.id) return null;
  
  const [showStoreModal, setShowStoreModal] = useState(false);
  const [isStartingChat, setIsStartingChat] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);

  const [quantity, setQuantity] = useState(1);
  const maxStock = listing?.stock || listing?.quantity || 1;

  const [marketData, setMarketData] = useState({
    standard: { avg: null, d1: null, d7: null, d30: null, variation: 0 },
    reverse: { avg: null, d1: null, d7: null, d30: null, variation: 0 }
  });
  
  const [rawHistory, setRawHistory] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('15J');
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [isFetchingPrice, setIsFetchingPrice] = useState(false);

  console.log("DONNÉES DE L'ANNONCE REÇUES :", listing);

  const specificCardId = listing?.card_id || listing?.cards?.id || listing?.id;
  const cardName = listing?.cards?.name || listing?.title || 'Carte sans nom';
  const cardNumber = listing?.cards?.card_number || listing?.card_number;
  const cardExtension = listing?.cards?.set_code || listing?.cards?.series || '';
  const cardData = Array.isArray(listing?.cards) ? listing.cards[0] : listing?.cards;
  // Récupération de l'illustrateur
  const illustrator = cardData?.illustrator;

  // Gestion propre du tableau de types (ex: ['Obscurité'] -> "Obscurité")
  const rawTypes = cardData?.types;
  const cardTypes = Array.isArray(rawTypes) 
    ? rawTypes.join(', ') 
    : (rawTypes ? String(rawTypes) : '');

  useEffect(() => {
    const card = listing?.cards || listing?.card || listing;
    if (!card) return;

    setIsFetchingPrice(false);

    const cardVersion = listing?.version || listing?.variant || 'standard';
    const isHolo = cardVersion === 'reverse' || cardVersion === 'holo' || cardVersion === 'Holo';
    
    const currentAvg = isHolo ? card.avg_holo : card.avg;
    const currentLow = isHolo ? card.low_holo : card.low;
    const currentTrend = isHolo ? card.trend_holo : card.trend;
    const currentAvg1 = isHolo ? card.avg1_holo : card.avg1;
    const currentAvg7 = isHolo ? card.avg7_holo : card.avg7;
    const currentAvg30 = isHolo ? card.avg30_holo : card.avg30;

    // Calcul ou récupération propre des variations en pourcentage
    const calcVariation = (current, past) => {
      if (!current || !past || past === 0) return 0;
      return Number((((current - past) / past) * 100).toFixed(1));
    };

    const standardVar = card.variation ?? calcVariation(card.avg, card.avg30);
    const reverseVar = card.variation_holo ?? calcVariation(card.avg_holo, card.avg30_holo);

    // Alimente les données avec les variations incluses
    setMarketData({
      standard: { 
        avg: card.avg ?? null,
        low: card.low ?? null,
        trend: card.trend ?? null,
        d1: card.avg1 ?? null, 
        d7: card.avg7 ?? null, 
        d30: card.avg30 ?? null,
        variation: standardVar,
      },
      reverse: { 
        avg: card.avg_holo ?? null, 
        low: card.low_holo ?? null, 
        trend: card.trend_holo ?? null, 
        d1: card.avg1_holo ?? null, 
        d7: card.avg7_holo ?? null, 
        d30: card.avg30_holo ?? null,
        variation: reverseVar,
      }
    });

    // Utilitaire pour obtenir une date propre au format YYYY-MM-DD sans décalage horaire
    const formatDateString = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const today = new Date();
    const generatedHistory = [];
    
    const d30 = new Date(); d30.setDate(today.getDate() - 30);
    const d7 = new Date(); d7.setDate(today.getDate() - 7);
    const d1 = new Date(); d1.setDate(today.getDate() - 1);

    if (currentAvg30) generatedHistory.push({ price: Number(currentAvg30), recorded_at: formatDateString(d30) });
    if (currentAvg7) generatedHistory.push({ price: Number(currentAvg7), recorded_at: formatDateString(d7) });
    if (currentAvg1) generatedHistory.push({ price: Number(currentAvg1), recorded_at: formatDateString(d1) });

    if (currentAvg) {
      generatedHistory.push({
        price: Number(currentAvg),
        recorded_at: formatDateString(today)
      });
    }

    // Tri chronologique indispensable
    generatedHistory.sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at));
    setRawHistory(generatedHistory);

  }, [listing]);

const getFilteredHistory = () => {
    const daysMap = { '1J': 1, '7J': 7, '15J': 15, '30J': 30 };
    const daysLimit = daysMap[selectedPeriod] || 30;    
    
    // 1. Calcule la date limite au format texte "YYYY-MM-DD"
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysLimit);
    const year = cutoffDate.getFullYear();
    const month = String(cutoffDate.getMonth() + 1).padStart(2, '0');
    const day = String(cutoffDate.getDate()).padStart(2, '0');
    const cutoffString = `${year}-${month}-${day}`;

    // 2. Si rawHistory est vide, on génère un faux historique de secours
    if (!rawHistory || rawHistory.length === 0) {
      const baseAvg = marketData.standard.avg || 1;
      const history = [];
      
      for (let i = daysLimit; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        history.push({
          price: baseAvg,
          recorded_at: `${y}-${m}-${d}`
        });
      }
      return history;
    }
    
    // 3. Filtrage direct par texte (zéro décalage horaire, les points s'affichent nickel)
    return rawHistory.filter(item => item.recorded_at >= cutoffString);
  };

  const standardHistory = getFilteredHistory();

  const seller = listing?.profiles;
  const sellerId = listing?.user_id || listing?.profiles?.id;
  const sellerName = seller?.username || listing?.seller_name || 'Vendeur';
    
  const getEbaySoldUrl = (name, number, series) => {
    const query = encodeURIComponent(`Pokemon ${name} ${number || ''} ${series || ''}`);
    return `https://www.ebay.fr/sch/i.html?_nkw=${query}&_sacat=0&LH_Sold=1&LH_Complete=1`;
  };

  // 1. Déclaration des hooks
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  let imagesList = [];

  // Si image_url existe, on sépare les différentes URL par une virgule
  if (listing?.image_url) {
    if (typeof listing.image_url === 'string') {
      imagesList = listing.image_url
        .split(',')
        .map(url => url.trim().replace(/^["\[]+|["\]]+$/g, '')) // Nettoyage des guillemets ou crochets éventuels
        .filter(url => url.startsWith('http'));
    } else if (Array.isArray(listing.image_url)) {
      imagesList = listing.image_url.filter(url => typeof url === 'string' && url.startsWith('http'));
    }
  }

  // Si rien dans image_url, on regarde dans image_url_backup
  if (imagesList.length === 0 && listing?.image_url_backup) {
    if (typeof listing.image_url_backup === 'string') {
      try {
        const parsed = JSON.parse(listing.image_url_backup);
        if (Array.isArray(parsed)) {
          imagesList = parsed.filter(url => typeof url === 'string' && url.startsWith('http'));
        }
      } catch (e) {
        imagesList = listing.image_url_backup
          .split(',')
          .map(url => url.trim().replace(/^["\[]+|["\]]+$/g, ''))
          .filter(url => url.startsWith('http'));
      }
    }
  }

  // Image de secours si la liste est vide
  if (imagesList.length === 0) {
    imagesList = ['https://via.placeholder.com/500x700?text=Pas+d%27image'];
  }

  const nextImage = (e) => {
    if (e) e.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % imagesList.length);
  };

  const prevImage = (e) => {
    if (e) e.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + imagesList.length) % imagesList.length);
  };

  if (!listing) return null;

  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleContactClick = async () => {
    if (!currentUserId) {
      alert("Vous devez être connecté pour envoyer un message.");
      return;
    }

    if (sellerId === currentUserId) {
      alert("Vous ne pouvez pas vous envoyer un message à vous-même.");
      return;
    }

    if (!onOpenInboxWithConversation) return;

    setIsStartingChat(true);
    try {
      const { data: existingConvs, error: searchError } = await supabase
        .from('conversations')
        .select('id')
        .eq('listing_id', listing.id)
        .or(`and(buyer_id.eq.${currentUserId},seller_id.eq.${sellerId}),and(buyer_id.eq.${sellerId},seller_id.eq.${currentUserId})`);

      if (searchError) throw searchError;

      if (existingConvs && existingConvs.length > 0) {
        onOpenInboxWithConversation(existingConvs[0].id);
        onClose();
        return;
      }

      const { data: newConv, error: createError } = await supabase
        .from('conversations')
        .insert({
          listing_id: listing.id,
          buyer_id: currentUserId,
          seller_id: sellerId,
          updated_at: new Date()
        })
        .select('id')
        .single();

      if (createError) throw createError;

      if (newConv) {
        onOpenInboxWithConversation(newConv.id);
        onClose();
      }
    } catch (err) {
      console.error("Erreur lors de l'ouverture/création de la conversation :", err);
      alert("Impossible d'ouvrir la conversation pour le moment.");
    } finally {
      setIsStartingChat(false);
    }
  };

  const svgWidth = 500;
  const svgHeight = 180;
  const paddingLeft = 55;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 35;

  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  const allPrices = standardHistory.map(p => Number(p.price)).filter(p => !isNaN(p) && p > 0);
  if (marketData.standard.avg) allPrices.push(marketData.standard.avg);
  if (marketData.standard.d7) allPrices.push(marketData.standard.d7);
  if (marketData.standard.d30) allPrices.push(marketData.standard.d30);

  const minRawPrice = allPrices.length > 0 ? Math.min(...allPrices) : 0;
  const maxRawPrice = allPrices.length > 0 ? Math.max(...allPrices) : 100;
  
  const minPrice = Math.max(0, Math.floor(minRawPrice * 0.9));
  const maxPrice = Math.ceil(maxRawPrice * 1.1);
  const priceRange = maxPrice - minPrice || 1;

  const daysMap = { '1J': 1, '7J': 7, '15J': 15, '30J': 30 };
  const daysCount = daysMap[selectedPeriod] || 30;   
  const chartEndDate = new Date();
  const chartStartDate = new Date();
  chartStartDate.setDate(chartEndDate.getDate() - daysCount);

  const getCoordinates = (historyList) => {
    if (!historyList || historyList.length === 0) return '';
    const startTime = chartStartDate.getTime();
    const totalDuration = chartEndDate.getTime() - startTime;

    return historyList.map((pt, i) => {
      const val = Number(pt.price) || 0;
      const ptTime = new Date(pt.recorded_at).getTime();
      const ratioX = totalDuration === 0 ? 0.5 : Math.max(0, Math.min(1, (ptTime - startTime) / totalDuration));
      const x = paddingLeft + ratioX * chartWidth;
      const y = paddingTop + chartHeight - ((val - minPrice) / priceRange) * chartHeight;
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
  };

  const handleMouseMove = (e) => {
    if (standardHistory.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const svgX = (mouseX / rect.width) * svgWidth;

    if (svgX < paddingLeft || svgX > svgWidth - paddingRight) {
      setHoveredPoint(null);
      return;
    }

    const startTime = chartStartDate.getTime();
    const totalDuration = chartEndDate.getTime() - startTime;

    let closest = standardHistory[0];
    let minDistance = Infinity;

    standardHistory.forEach((pt) => {
      const ptTime = new Date(pt.recorded_at).getTime();
      const ratioX = totalDuration === 0 ? 0.5 : (ptTime - startTime) / totalDuration;
      const ptX = paddingLeft + ratioX * chartWidth;
      const dist = Math.abs(ptX - svgX);
      if (dist < minDistance) {
        minDistance = dist;
        const val = Number(pt.price) || 0;
        const ptY = paddingTop + chartHeight - ((val - minPrice) / priceRange) * chartHeight;
        closest = { ...pt, x: ptX, y: ptY };
      }
    });

    setHoveredPoint(closest);
  };

  const formatDate = (dateObj) => {
    try {
      if (!isNaN(dateObj.getTime())) {
        return dateObj.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      }
    } catch (e) {}
    return '';
  };

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div 
          className="bg-white rounded-3xl max-w-6xl w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col md:flex-row max-h-[90vh]" 
          onClick={(e) => e.stopPropagation()}
        >
          {/* Image */}
          <div className="md:w-7/12 bg-slate-950 p-8 flex flex-col items-center justify-between relative min-h-[450px] md:min-h-[600px]">
            <button 
              onClick={onClose}
              className="absolute top-4 left-4 md:hidden bg-slate-800 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm cursor-pointer z-20"
            >
              ✕
            </button>

            {/* Espace image centré */}
            <div className="flex-1 flex items-center justify-center w-full my-auto">
              <img 
                src={imagesList[currentImageIndex]} 
                alt={cardName} 
                onClick={() => setIsFullscreen(true)}
                className="max-h-[75vh] w-auto object-contain rounded-xl shadow-2xl transition-all duration-300 cursor-zoom-in hover:scale-[1.02]"
                title="Cliquer pour afficher en plein écran"
              />
            </div>

            {/* Barre de navigation forcée pour test */}
            <div className="w-full flex items-center justify-center gap-6 mt-4 z-10">
              <button 
                onClick={prevImage}
                className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl font-bold text-sm cursor-pointer transition-colors shadow-md flex items-center gap-1"
              >
                &larr; Précédent
              </button>
              
              <span className="text-slate-300 text-xs font-bold tracking-wider bg-slate-900 px-3 py-1.5 rounded-full border border-slate-800">
                {currentImageIndex + 1} / {imagesList.length}
              </span>

              <button 
                onClick={nextImage}
                className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl font-bold text-sm cursor-pointer transition-colors shadow-md flex items-center gap-1"
              >
                Suivant &rarr;
              </button>
            </div>
          </div>

          {/* Détails */}
          <div className="md:w-5/12 p-6 flex flex-col justify-between space-y-6 overflow-y-auto">
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  {/* Nom du Pokémon + Numéro de la carte */}
                  <h2 className="text-2xl font-black text-slate-900 mb-1">
                    {cardName} <span className="text-slate-400 font-normal text-lg">— {listing.cards?.local_id || listing.cards?.number || ''}</span>
                  </h2>

                  {/* Bloc et Série avec logo */}
                  <div className="flex items-center gap-2.5 text-sm font-medium text-slate-700 mt-2 bg-slate-100 py-2 px-4 rounded-xl border border-slate-200 w-fit">
                    {/* Nom du bloc */}
                    <span className="font-bold text-slate-900">
                      {listing.cards?.extensions?.block_name || 'Bloc inconnu'}
                    </span>
                    
                    <span className="text-slate-400">›</span>
                    
                    {/* Logo de la série (agrandi à h-5 ou h-6) */}
                    {listing.cards?.extensions?.symbol_url && (
                      <img src={listing.cards.extensions.symbol_url} alt="Logo série" className="h-5 object-contain" />
                    )}
                    
                    {/* Nom de la série / extension */}
                    <span className="font-semibold text-slate-800">
                      {listing.cards?.extensions?.name || 'Série inconnue'}
                    </span>
                  </div>
                </div>

                <button 
                  onClick={onClose}
                  className="hidden md:flex text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {(illustrator || cardTypes) && (
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-3 pt-3 border-t border-slate-700/50">
                  {illustrator && (
                    <div>
                      <span className="font-semibold text-slate-500">Illustrateur :</span> {illustrator}
                    </div>
                  )}
                  {cardTypes && (
                    <div>
                      <span className="font-semibold text-slate-500">Type :</span> <span className="font-medium text-indigo-400">{cardTypes}</span>
                    </div>
                  )}
                </div>
              )}

              <SecurityBanner />

              {/* ENCART DES VERSIONS DE LA CARTE */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Version de la carte</label>
                <div className="flex flex-wrap gap-2">
                  {(() => {
                    const finish = (listing.finish || 'normal').toLowerCase();
                    let badgeColor = 'bg-red-600';

                    if (finish.includes('reverse')) badgeColor = 'bg-amber-500';
                    else if (finish.includes('cosmo')) badgeColor = 'bg-pink-500';
                    else if (finish.includes('ligne')) badgeColor = 'bg-blue-600';
                    else if (finish.includes('étoile') || finish.includes('etoile')) badgeColor = 'bg-yellow-500 text-slate-900';
                    else if (finish.includes('mirage')) badgeColor = 'bg-teal-600';
                    else if (finish.includes('masterball') || finish.includes('master')) badgeColor = 'bg-purple-700 border-2 border-white';
                    else if (finish.includes('pokeball') || finish.includes('poke')) badgeColor = 'bg-red-600 border-2 border-white';
                    else if (finish.includes('stamp')) badgeColor = 'bg-emerald-600';

                    return (
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white shadow-sm ${badgeColor}`}>
                        <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                        {listing.finish || 'Normal'}
                      </span>
                    );
                  })()}
                </div>
              </div>

              <div className="flex items-baseline justify-between">
                <p className="text-2xl font-black text-indigo-600">{listing.price} €</p>
                <span className="text-xs font-bold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg">
                  {listing.condition || 'Non spécifié'}
                </span>
              </div>

              {/* SECTION PRIX INDICATIF CARDMARKET (Ajouté ici) */}
              <div className="bg-slate-900 text-white border border-slate-800 rounded-2xl p-3">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span className="flex items-center gap-1 font-medium text-slate-300">
                    <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    Cote Cardmarket (Indicative)
                  </span>
                  {marketData?.standard?.variation !== 0 && marketData?.standard?.variation != null && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      marketData.standard.variation >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                    }`}>
                      {marketData.standard.variation > 0 ? `+${marketData.standard.variation}%` : `${marketData.standard.variation}%`} (7j)
                    </span>
                  )}
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-extrabold text-white">
                    {marketData?.standard?.avg != null ? `${marketData.standard.avg} €` : 'N/C'}
                  </span>
                  <span className="text-xs text-slate-400">moyenne générale</span>
                </div>

                {/* Détails rapides (1j, 7j, 30j) */}
                <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-slate-800 text-center text-xs">
                  <div>
                    <span className="block text-[10px] text-slate-500">1 Jour</span>
                    <span className="font-semibold text-slate-300">
                      {marketData?.standard?.d1 != null ? `${marketData.standard.d1} €` : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-500">7 Jours</span>
                    <span className="font-semibold text-slate-300">
                      {marketData?.standard?.d7 != null ? `${marketData.standard.d7} €` : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-500">30 Jours</span>
                    <span className="font-semibold text-slate-300">
                      {marketData?.standard?.d30 != null ? `${marketData.standard.d30} €` : '-'}
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTION STOCK & AJOUT AU PANIER (Masqué si c'est votre propre annonce) */}
              {currentUserId && sellerId === currentUserId ? (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
                  <p className="text-xs font-bold text-amber-800">
                    C'est l'une de vos propres annonces. Vous ne pouvez pas l'acheter.
                  </p>
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-green-700">
                      En stock ({maxStock})
                    </span>
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="quantity-select" className="block text-xs font-semibold text-slate-600">
                      Quantité :
                    </label>
                    <select
                      id="quantity-select"
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value))}
                      className="w-full bg-white border border-slate-300 rounded-xl p-2 text-xs font-bold text-slate-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    >
                      {Array.from({ length: maxStock }, (_, i) => i + 1).map((num) => (
                        <option key={num} value={num}>
                          {num}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={() => {
                      if (onAddToCart) {
                        onAddToCart({
                          ...listing,
                          quantity: quantity
                        });
                      }
                      onClose();
                    }}
                    className="w-full bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-black py-2.5 px-4 rounded-xl transition-colors cursor-pointer text-xs shadow-sm flex items-center justify-center gap-2 mt-2"
                  >
                    <span>🛒</span> Ajouter au panier
                  </button>
                </div>
              )}

              {/* SECTION COTES & TENDANCES STYLE CARDMARKET */}
              <div className="bg-slate-900 text-white rounded-2xl p-4 space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <span className="text-xs font-black tracking-wider text-slate-400 uppercase">Cardmarket</span>
                  <span className="bg-slate-800 px-2 py-0.5 rounded text-[10px] font-bold text-slate-300">
                    {isFetchingPrice ? "Synchronisation..." : "Temps réel"}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-800 text-[10px] uppercase">
                        <th className="pb-2 font-semibold">Version</th>
                        <th className="pb-2 font-semibold text-right">Moy. vente</th>
                        <th className="pb-2 font-semibold text-right">~1j.</th>
                        <th className="pb-2 font-semibold text-right">~7j.</th>
                        <th className="pb-2 font-semibold text-right">~30j.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-medium">
                      <tr>
                        <td className="py-2.5 flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded bg-red-600 inline-block"></span>
                          Standard
                        </td>
                        <td className="py-2.5 text-right font-bold">{marketData.standard.avg !== null ? `${marketData.standard.avg} €` : '-'}</td>
                        <td className="py-2.5 text-right text-slate-300">{marketData.standard.d1 !== null ? `${marketData.standard.d1} €` : '-'}</td>
                        <td className="py-2.5 text-right text-slate-300">{marketData.standard.d7 !== null ? `${marketData.standard.d7} €` : '-'}</td>
                        <td className="py-2.5 text-right text-slate-300">{marketData.standard.d30 !== null ? `${marketData.standard.d30} €` : '-'}</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded bg-amber-500 inline-block"></span>
                          Reverse
                        </td>
                        <td className="py-2.5 text-right font-bold">{marketData.reverse.avg !== null ? `${marketData.reverse.avg} €` : '-'}</td>
                        <td className="py-2.5 text-right text-slate-300">{marketData.reverse.d1 !== null ? `${marketData.reverse.d1} €` : '-'}</td>
                        <td className="py-2.5 text-right text-slate-300">{marketData.reverse.d7 !== null ? `${marketData.reverse.d7} €` : '-'}</td>
                        <td className="py-2.5 text-right text-slate-300">{marketData.reverse.d30 !== null ? `${marketData.reverse.d30} €` : '-'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-2.5 flex items-center justify-between">
                    <span className="w-2 h-2 rounded bg-red-600 inline-block"></span>
                    <span className={`text-xs font-bold ${marketData.standard.variation >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {marketData.standard.variation > 0 ? `+${marketData.standard.variation}%` : `${marketData.standard.variation}%`}
                    </span>
                  </div>
                  <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-2.5 flex items-center justify-between">
                    <span className="w-2 h-2 rounded bg-amber-500 inline-block"></span>
                    <span className={`text-xs font-bold ${marketData.reverse.variation >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {marketData.reverse.variation > 0 ? `+${marketData.reverse.variation}%` : `${marketData.reverse.variation}%`}
                    </span>
                  </div>
                </div>

                {/* GRAPHIQUE PROFESSIONNEL STYLE CARDMARKET */}
                <div className="bg-slate-950 rounded-2xl p-4 space-y-3 border border-slate-800">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                    <div className="flex items-center gap-2">
                      <span className="text-indigo-400">📈</span>
                      <span>Historique des prix</span>
                    </div>
                    <div className="flex gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                      {['1J', '7J', '15J', '30J'].map((period) => (
                        <button
                          key={period}
                          onClick={() => setSelectedPeriod(period)}
                          className={`text-[10px] px-2.5 py-1 rounded-lg transition-all cursor-pointer font-bold ${selectedPeriod === period ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                        >
                          {period}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="inline-flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-600"></span>
                    <span className="text-xs font-bold text-rose-400 flex items-center gap-1">
                      <span>📉</span> {marketData.standard.variation}%
                    </span>
                  </div>

                  <div 
                    className="w-full relative cursor-crosshair pt-2 select-none"
                    onMouseMove={handleMouseMove}
                    onMouseLeave={() => setHoveredPoint(null)}
                  >
                    <svg className="w-full h-44 overflow-visible" viewBox={`0 0 ${svgWidth} ${svgHeight}`} preserveAspectRatio="none">
                      {[0, 0.33, 0.66, 1].map((ratio, idx) => {
                        const y = paddingTop + chartHeight * ratio;
                        const priceVal = (maxPrice - (ratio * priceRange)).toFixed(0);
                        return (
                          <g key={idx}>
                            <line 
                              x1={paddingLeft} 
                              y1={y} 
                              x2={svgWidth - paddingRight} 
                              y2={y} 
                              stroke="#334155" 
                              strokeWidth="1" 
                              strokeDasharray="4 4" 
                              opacity="0.5"
                            />
                            <text 
                              x={paddingLeft - 10} 
                              y={y + 3} 
                              fill="#94a3b8" 
                              fontSize="10" 
                              textAnchor="end"
                              fontWeight="600"
                            >
                              {priceVal} €
                            </text>
                          </g>
                        );
                      })}

                      {[0.25, 0.5, 0.75].map((ratio, idx) => {
                        const x = paddingLeft + chartWidth * ratio;
                        return (
                          <line 
                            key={idx}
                            x1={x} 
                            y1={paddingTop} 
                            x2={x} 
                            y2={paddingTop + chartHeight} 
                            stroke="#334155" 
                            strokeWidth="1" 
                            strokeDasharray="4 4" 
                            opacity="0.3"
                          />
                        );
                      })}

                      {standardHistory.length > 0 && (
                        <path
                          d={getCoordinates(standardHistory)}
                          fill="none"
                          stroke="#ef4444"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      )}

                      {hoveredPoint && (
                        <g>
                          <line 
                            x1={hoveredPoint.x} 
                            y1={paddingTop} 
                            x2={hoveredPoint.x} 
                            y2={paddingTop + chartHeight} 
                            stroke="#ffffff" 
                            strokeWidth="1.5" 
                            strokeDasharray="3 3"
                            opacity="0.8"
                          />
                          <circle 
                            cx={hoveredPoint.x} 
                            cy={hoveredPoint.y} 
                            r="5" 
                            fill="#ef4444" 
                            stroke="#ffffff" 
                            strokeWidth="2" 
                          />
                        </g>
                      )}

                      <line 
                        x1={paddingLeft} 
                        y1={paddingTop + chartHeight} 
                        x2={svgWidth - paddingRight} 
                        y2={paddingTop + chartHeight} 
                        stroke="#475569" 
                        strokeWidth="1.5" 
                      />

                      {/* Repères de dates dynamiques */}
                      {[0, 0.33, 0.66, 1].map((ratio, idx) => {
                        const startTime = chartStartDate.getTime();
                        const totalDuration = chartEndDate.getTime() - startTime;
                        const targetTime = startTime + ratio * totalDuration;
                        const dateObj = new Date(targetTime);
                        const x = paddingLeft + ratio * chartWidth;

                        return (
                          <text 
                            key={idx} 
                            x={x} 
                            y={svgHeight - 10} 
                            fill="#94a3b8" 
                            fontSize="9" 
                            textAnchor="middle"
                            fontWeight="600"
                          >
                            {formatDate(dateObj)}
                          </text>
                        );
                      })}
                    </svg>

                    {hoveredPoint && (
                      <div 
                        className="absolute z-20 bg-slate-900 border border-slate-700 text-white px-3 py-2 rounded-xl shadow-2xl text-xs pointer-events-none transform -translate-x-1/2 -translate-y-full mb-3"
                        style={{ left: `${(hoveredPoint.x / svgWidth) * 100}%`, top: `${hoveredPoint.y}px` }}
                      >
                        <div className="font-bold text-slate-300 mb-1 border-b border-slate-800 pb-1">
                          {hoveredPoint.recorded_at}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-red-600"></span>
                          <span className="font-medium text-slate-300">Standard</span>
                          <span className="font-black text-indigo-400">{hoveredPoint.price} €</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {(() => {
                  const cardmarketUrl = `https://www.cardmarket.com/fr/Pokemon/Products/Search?searchString=${encodeURIComponent(cardName)}`;
                  return (
                    <a 
                      href={cardmarketUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 font-bold py-2.5 px-3 rounded-xl transition-all text-xs flex items-center justify-between shadow-2xs group cursor-pointer"
                    >
                      <span className="text-slate-600 font-medium group-hover:text-slate-900">Voir la fiche sur Cardmarket</span>
                      <span className="text-indigo-600 font-bold text-sm">&rarr;</span>
                    </a>
                  );
                })()}

                {(() => {
                  const ebayUrl = getEbaySoldUrl(cardName, cardNumber, cardExtension);
                  return (
                    <a 
                      href={ebayUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 font-bold py-2.5 px-3 rounded-xl transition-all text-xs flex items-center justify-between shadow-2xs group cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-black italic text-blue-600 tracking-tighter text-sm">eb<span className="text-red-500">a</span><span className="text-yellow-500">y</span></span>
                        <span className="text-slate-600 font-medium group-hover:text-slate-900">Ventes réussies</span>
                      </div>
                      <span className="text-indigo-600 font-bold text-sm">&rarr;</span>
                    </a>
                  );
                })()}
              </div>

              <div className="space-y-2 text-xs text-slate-600 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="flex justify-between">
                  <span className="font-semibold">Langue :</span>
                  <span className="font-bold text-slate-800">{listing.language || 'Français'}</span>
                </div>
                {listing.comment && (
                  <div className="pt-2 border-t border-slate-200">
                    <span className="font-semibold block mb-1">Commentaire du vendeur :</span>
                    <p className="italic text-slate-700">{listing.comment}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={handleContactClick}
                disabled={isStartingChat}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-xl transition-colors cursor-pointer text-xs shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span>💬</span> {isStartingChat ? "Ouverture..." : "Envoyer un message au vendeur"}
              </button>

              {sellerId && (
                <button
                  onClick={() => setShowStoreModal(true)}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-xl transition-colors cursor-pointer text-xs flex items-center justify-center gap-2"
                >
                  <span>🛍️</span> Voir la boutique de {sellerName}
                </button>
              )}

              <button
                onClick={() => setIsReportOpen(true)}
                className="w-full text-rose-600 hover:text-rose-700 font-semibold py-2 transition-colors cursor-pointer text-[11px] flex items-center justify-center gap-1"
              >
                <span>⚠️</span> Signaler cette annonce ou ce vendeur
              </button>
            </div>

            {sellerId && (
              <div className="pt-4 border-t border-slate-100">
                <SellerProfile 
                  sellerId={sellerId} 
                  favoriteSellers={favoriteSellers} 
                  toggleFavoriteSeller={toggleFavoriteSeller} 
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {showStoreModal && sellerId && (
        <UserStoreModal 
          sellerId={sellerId} 
          sellerName={sellerName}
          onClose={() => setShowStoreModal(false)} 
          onSelectListing={() => setShowStoreModal(false)}
          onOpenInboxWithConversation={onOpenInboxWithConversation}
          currentUserId={currentUserId}
        />
      )}

      {isReportOpen && (
        <ReportModal 
          targetId={listing.id}
          targetType="listing" 
          onClose={() => setIsReportOpen(false)} 
        />
      )}

      {isFullscreen && (
        <div 
          className="fixed inset-0 bg-black/95 flex items-center justify-center z-[60] p-4 cursor-zoom-out"
          onClick={() => setIsFullscreen(false)}
        >
          <button 
            onClick={() => setIsFullscreen(false)}
            className="absolute top-6 right-6 bg-white/10 hover:bg-white/20 text-white w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl cursor-pointer transition-colors"
          >
            ✕
          </button>
          
          <img 
            src={imagesList[currentImageIndex]} 
            alt={cardName} 
            className="h-[90vh] w-auto max-w-none object-contain shadow-2xl rounded-xl"
          />

          {imagesList.length > 1 && (
            <div className="absolute bottom-6 flex gap-4" onClick={(e) => e.stopPropagation()}>
              <button onClick={prevImage} className="bg-white/25 hover:bg-white/40 text-white px-6 py-3 rounded-full font-bold cursor-pointer transition-colors">
                &larr; Précédente
              </button>
              <span className="text-white flex items-center font-bold text-sm">
                {currentImageIndex + 1} / {imagesList.length}
              </span>
              <button onClick={nextImage} className="bg-white/25 hover:bg-white/40 text-white px-6 py-3 rounded-full font-bold cursor-pointer transition-colors">
                Suivante &rarr;
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
} 