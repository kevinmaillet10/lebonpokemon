import React, { useState, useRef, useEffect } from 'react';
import SingleListing from './SingleListing';
import { ChevronLeft, ChevronRight, Zap, ShoppingBag, BookOpen } from 'lucide-react';

export default function Home({
  setCurrentView,
  searchQuery,
  setSearchQuery,
  selectedBlock,
  setSelectedBlock,
  selectedSeriesFilter,
  setSelectedSeriesFilter,
  selectedRegion,
  setSelectedRegion,
  filterFinish,      
  setFilterFinish,
  filterCondition, 
  setFilterCondition,
  filteredListings,
  setSelectedListing,
  blocks = [],
  seriesList = [],
  listings = [],
  favoriteListings = [],
  onToggleFavorite,
  onAddToCart,
  onOpenCreateSingleListing,
  currentUserId
}) {
  const [isSeriesDropdownOpen, setIsSeriesDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // --- États pour l'autocomplétion de la recherche principale ---
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const searchDropdownRef = useRef(null);

  // --- État pour le carrousel de la bannière Hero ---
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      id: 'mass-add',
      tag: 'AJOUT EN MASSE',
      title: 'Vendez vos cartes en toute simplicité',
      description: "Rentrer vos cartes à vendre en toute simplicité avec l'ajout en masse pour vos series",
      buttonText: 'Commencer un Ajout en Masse',
      buttonIcon: <Zap size={18} className="text-amber-300" />,
      gradient: 'from-slate-900 via-purple-950 to-slate-900',
      buttonBg: 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20',
      action: () => setCurrentView('series-select')
    },
    {
      id: 'single-sell',
      tag: 'VENTE RAPIDE',
      title: "Vendez vos cartes à l'unité sans effort",
      description: "Créez une annonce unitaire optimisée en quelques secondes",
      buttonText: "Vendre une carte à l'unité",
      buttonIcon: <ShoppingBag size={18} className="text-blue-300" />,
      gradient: 'from-blue-950 via-indigo-950 to-slate-900',
      buttonBg: 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/20',
      action: () => {
        if (typeof onOpenCreateSingleListing === 'function') {
          onOpenCreateSingleListing(true);
        } else {
          console.warn("La prop onOpenCreateSingleListing n'est pas définie dans le parent.");
        }
      }
    },
    {
      id: 'rarity-guide',
      tag: 'GUIDE & TUTORIEL POUR LES DÉBUTANTS',
      title: 'Comprendre les raretés, symboles et état',
      description: 'Commune, Peu commune ou Rare ou bien Near Mint, Poor : apprenez à identifier rapidement le type et l\'état de vos cartes Pokémon.',
      buttonText: 'Découvrir le guide des raretés et des états',
      buttonIcon: <BookOpen size={18} className="text-emerald-300" />,
      gradient: 'from-emerald-950 via-teal-950 to-slate-900',
      buttonBg: 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/20',
      action: () => setCurrentView('rarity-guide')
    }
  ];

  const nextSlide = () => setCurrentSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
  const prevSlide = () => setCurrentSlide((prev) => (prev === 0 ? slides.length - 1 : prev - 1));

  const slide = slides[currentSlide];

  // Fermer les menus déroulants si on clique en dehors
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsSeriesDropdownOpen(false);
      }
      if (searchDropdownRef.current && !searchDropdownRef.current.contains(event.target)) {
        setIsSearchDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filtrer les séries selon le bloc sélectionné ET ce qui est tapé dans l'input
  const filteredSeriesOptions = seriesList.filter(series => {
    const sName = typeof series === 'string' ? series : series.name;
    const sBlock = typeof series === 'string' ? null : series.block;

    const matchesBlock = !selectedBlock || (sBlock === selectedBlock);
    const matchesInput = sName.toLowerCase().includes(selectedSeriesFilter.toLowerCase());
    
    return matchesBlock && matchesInput;
  });

  // --- Générer les suggestions dynamiques pour la recherche textuelle ---
  const searchSuggestions = searchQuery.trim().length > 0 ? [...new Set(
    listings
      .map(item => item.cards?.name || item.title || '')
      .filter(name => name.toLowerCase().includes(searchQuery.toLowerCase()))
  )].slice(0, 6) : [];

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8 bg-[#16181d] text-white min-h-screen">
      
      {/* 1. Hero Banner principal en mode Carrousel */}
      <div className="relative w-full">
        
        {/* Bouton Flèche Gauche */}
        <button 
          onClick={prevSlide}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-20 bg-slate-800/80 hover:bg-slate-700 text-white p-3 rounded-full backdrop-blur-md transition-all border border-slate-700 cursor-pointer shadow-lg -ml-4 hidden sm:flex items-center justify-center"
          aria-label="Précédent"
        >
          <ChevronLeft size={24} />
        </button>

        {/* Bouton Flèche Droite */}
        <button 
          onClick={nextSlide}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-20 bg-slate-800/80 hover:bg-slate-700 text-white p-3 rounded-full backdrop-blur-md transition-all border border-slate-700 cursor-pointer shadow-lg -mr-4 hidden sm:flex items-center justify-center"
          aria-label="Suivant"
        >
          <ChevronRight size={24} />
        </button>

        {/* Conteneur de la slide active */}
        <div className={`relative overflow-hidden bg-gradient-to-r ${slide.gradient} rounded-2xl p-8 md:p-12 text-white shadow-sm border border-slate-700/60 transition-all duration-500`}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.15),transparent_50%))]"></div>
          
          <div className="relative z-10 max-w-2xl space-y-4">
            <span className="inline-block bg-[#16181d]/60 text-purple-400 font-bold text-xs uppercase tracking-widest px-3 py-1 rounded-full border border-slate-700/60 backdrop-blur-sm">
              {slide.tag}
            </span>

            <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight text-white">
              {slide.title}
            </h1>

            <p className="text-slate-300 text-sm md:text-base leading-relaxed">
              {slide.description}
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                onClick={slide.action}
                className={`font-bold text-xs md:text-sm px-6 py-3.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 transform hover:scale-105 ${slide.buttonBg}`}
              >
                {slide.buttonIcon}
                {slide.buttonText}
              </button>
            </div>
          </div>

          {/* Indicateurs de points (Pagination du carrousel) */}
          <div className="absolute bottom-6 right-8 flex items-center gap-2 z-20">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`h-2.5 rounded-full transition-all cursor-pointer ${
                  currentSlide === index ? 'w-8 bg-emerald-400' : 'w-2.5 bg-slate-700 hover:bg-slate-600'
                }`}
                aria-label={`Aller à la diapositive ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* 2. Barre de recherche et Filtres Avancés */}
      <div className="bg-[#1e222b] p-6 rounded-2xl border border-slate-700/60 shadow-sm space-y-4">
        
        {/* Barre de recherche avec autocomplétion */}
        <div className="relative w-full" ref={searchDropdownRef}>
          <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 z-10">🔍</span>
          <input
            type="text"
            placeholder="Rechercher une carte, un Pokémon..."
            value={searchQuery}
            onFocus={() => { if (searchQuery.trim().length > 0) setIsSearchDropdownOpen(true); }}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsSearchDropdownOpen(true);
            }}
            className="w-full bg-[#16181d] border border-slate-700 rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white font-medium relative z-0"
          />

          {isSearchDropdownOpen && searchSuggestions.length > 0 && (
            <div className="absolute z-50 left-0 right-0 mt-1 bg-[#1e222b] border border-slate-700 rounded-xl shadow-xl max-h-60 overflow-y-auto">
              {searchSuggestions.map((name, index) => (
                <div
                  key={index}
                  onClick={() => {
                    setSearchQuery(name);
                    setIsSearchDropdownOpen(false);
                  }}
                  className="px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-emerald-400 cursor-pointer font-medium border-b border-slate-800 last:border-none"
                >
                  {name}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Bloc */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Bloc</label>
            <select
              value={selectedBlock}
              onChange={(e) => {
                setSelectedBlock(e.target.value);
                setSelectedSeriesFilter('');
              }}
              className="w-48 bg-[#16181d] border border-slate-700 text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="">Tous les blocs</option>
              {blocks.map((block, index) => (
                <option key={index} value={typeof block === 'string' ? block : block.name}>
                  {typeof block === 'string' ? block : block.name}
                </option>
              ))}
            </select>
          </div>

          {/* Série avec Recherche / Autocomplete */}
          <div className="relative" ref={dropdownRef}>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Série</label>
            <input
              type="text"
              placeholder="Taper pour chercher une série..."
              value={selectedSeriesFilter}
              onFocus={() => setIsSeriesDropdownOpen(true)}
              onChange={(e) => {
                setSelectedSeriesFilter(e.target.value);
                setIsSeriesDropdownOpen(true);
              }}
              className="w-48 bg-[#16181d] border border-slate-700 text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-500 cursor-pointer"
            />

            {isSeriesDropdownOpen && (
              <div className="absolute z-50 left-0 right-0 mt-1 bg-[#1e222b] border border-slate-700 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                <div
                  onClick={() => {
                    setSelectedSeriesFilter('');
                    setIsSeriesDropdownOpen(false);
                  }}
                  className="px-4 py-2.5 text-xs text-emerald-400 font-bold hover:bg-slate-800 cursor-pointer border-b border-slate-800"
                >
                  Toutes les séries
                </div>
                {filteredSeriesOptions.length === 0 ? (
                  <div className="px-4 py-3 text-xs text-slate-400 text-center">Aucune série trouvée</div>
                ) : (
                  filteredSeriesOptions.map((series, index) => {
                    const sName = typeof series === 'string' ? series : series.name;
                    return (
                      <div
                        key={index}
                        onClick={() => {
                          setSelectedSeriesFilter(sName);
                          setIsSeriesDropdownOpen(false);
                        }}
                        className="px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-emerald-400 cursor-pointer font-medium"
                      >
                        {sName}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Département groupé par Région */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Département</label>
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="w-48 bg-[#16181d] border border-slate-700 text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="">Tous les départements</option>
              
              <optgroup label="Auvergne-Rhône-Alpes" className="bg-[#1e222b] text-white">
                <option value="01">01 - Ain</option>
                <option value="03">03 - Allier</option>
                <option value="07">07 - Ardèche</option>
                <option value="15">15 - Cantal</option>
                <option value="26">26 - Drôme</option>
                <option value="38">38 - Isère</option>
                <option value="42">42 - Loire</option>
                <option value="43">43 - Haute-Loire</option>
                <option value="63">63 - Puy-de-Dôme</option>
                <option value="69">69 - Rhône</option>
                <option value="73">73 - Savoie</option>
                <option value="74">74 - Haute-Savoie</option>
              </optgroup>

              <optgroup label="Bourgogne-Franche-Comté" className="bg-[#1e222b] text-white">
                <option value="21">21 - Côte-d'Or</option>
                <option value="25">25 - Doubs</option>
                <option value="39">39 - Jura</option>
                <option value="58">58 - Nièvre</option>
                <option value="70">70 - Haute-Saône</option>
                <option value="71">71 - Saône-et-Loire</option>
                <option value="89">89 - Yonne</option>
                <option value="90">90 - Territoire de Belfort</option>
              </optgroup>

              <optgroup label="Bretagne" className="bg-[#1e222b] text-white">
                <option value="22">22 - Côtes-d'Armor</option>
                <option value="29">29 - Finistère</option>
                <option value="35">35 - Ille-et-Vilaine</option>
                <option value="56">56 - Morbihan</option>
              </optgroup>

              <optgroup label="Centre-Val de Loire" className="bg-[#1e222b] text-white">
                <option value="18">18 - Cher</option>
                <option value="28">28 - Eure-et-Loir</option>
                <option value="36">36 - Indre</option>
                <option value="37">37 - Indre-et-Loire</option>
                <option value="41">41 - Loir-et-Cher</option>
                <option value="45">45 - Loiret</option>
              </optgroup>

              <optgroup label="Corse" className="bg-[#1e222b] text-white">
                <option value="2A">2A - Corse-du-Sud</option>
                <option value="2B">2B - Haute-Corse</option>
              </optgroup>

              <optgroup label="Grand Est" className="bg-[#1e222b] text-white">
                <option value="08">08 - Ardennes</option>
                <option value="10">10 - Aube</option>
                <option value="51">51 - Marne</option>
                <option value="52">52 - Haute-Marne</option>
                <option value="54">54 - Meurthe-et-Moselle</option>
                <option value="55">55 - Meuse</option>
                <option value="57">57 - Moselle</option>
                <option value="67">67 - Bas-Rhin</option>
                <option value="68">68 - Haut-Rhin</option>
                <option value="88">88 - Vosges</option>
              </optgroup>

              <optgroup label="Hauts-de-France" className="bg-[#1e222b] text-white">
                <option value="02">02 - Aisne</option>
                <option value="59">59 - Nord</option>
                <option value="60">60 - Oise</option>
                <option value="62">62 - Pas-de-Calais</option>
                <option value="80">80 - Somme</option>
              </optgroup>

              <optgroup label="Île-de-France" className="bg-[#1e222b] text-white">
                <option value="75">75 - Paris</option>
                <option value="77">77 - Seine-et-Marne</option>
                <option value="78">78 - Yvelines</option>
                <option value="91">91 - Essonne</option>
                <option value="92">92 - Hauts-de-Seine</option>
                <option value="93">93 - Seine-Saint-Denis</option>
                <option value="94">94 - Val-de-Marne</option>
                <option value="95">95 - Val-d'Oise</option>
              </optgroup>

              <optgroup label="Normandie" className="bg-[#1e222b] text-white">
                <option value="14">14 - Calvados</option>
                <option value="27">27 - Eure</option>
                <option value="50">50 - Manche</option>
                <option value="61">61 - Orne</option>
                <option value="76">76 - Seine-Maritime</option>
              </optgroup>

              <optgroup label="Nouvelle-Aquitaine" className="bg-[#1e222b] text-white">
                <option value="16">16 - Charente</option>
                <option value="17">17 - Charente-Maritime</option>
                <option value="19">19 - Corrèze</option>
                <option value="23">23 - Creuse</option>
                <option value="24">24 - Dordogne</option>
                <option value="33">33 - Gironde</option>
                <option value="40">40 - Landes</option>
                <option value="47">47 - Lot-et-Garonne</option>
                <option value="64">64 - Pyrénées-Atlantiques</option>
                <option value="79">79 - Deux-Sèvres</option>
                <option value="86">86 - Vienne</option>
                <option value="87">87 - Haute-Vienne</option>
              </optgroup>

              <optgroup label="Occitanie" className="bg-[#1e222b] text-white">
                <option value="09">09 - Ariège</option>
                <option value="11">11 - Aude</option>
                <option value="12">12 - Aveyron</option>
                <option value="30">30 - Gard</option>
                <option value="31">31 - Haute-Garonne</option>
                <option value="32">32 - Gers</option>
                <option value="34">34 - Hérault</option>
                <option value="46">46 - Lot</option>
                <option value="48">48 - Lozère</option>
                <option value="65">65 - Hautes-Pyrénées</option>
                <option value="66">66 - Pyrénées-Orientales</option>
                <option value="81">81 - Tarn</option>
                <option value="82">82 - Tarn-et-Garonne</option>
              </optgroup>

              <optgroup label="Pays de la Loire" className="bg-[#1e222b] text-white">
                <option value="44">44 - Loire-Atlantique</option>
                <option value="49">49 - Maine-et-Loire</option>
                <option value="53">53 - Mayenne</option>
                <option value="72">72 - Sarthe</option>
                <option value="85">85 - Vendée</option>
              </optgroup>

              <optgroup label="Provence-Alpes-Côte d'Azur" className="bg-[#1e222b] text-white">
                <option value="04">04 - Alpes-de-Haute-Provence</option>
                <option value="05">05 - Hautes-Alpes</option>
                <option value="06">06 - Alpes-Maritimes</option>
                <option value="13">13 - Bouches-du-Rhône</option>
                <option value="83">83 - Var</option>
                <option value="84">84 - Vaucluse</option>
              </optgroup>

              <optgroup label="Drom-Com (Outre-Mer)" className="bg-[#1e222b] text-white">
                <option value="971">971 - Guadeloupe</option>
                <option value="972">972 - Martinique</option>
                <option value="973">973 - Guyane</option>
                <option value="974">974 - La Réunion</option>
                <option value="976">976 - Mayotte</option>
              </optgroup>
            </select>
          </div>
        </div>

        {/* Filtres Finition et État côte à côte */}
        <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center gap-6">
          
          {/* Finitions */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Finitions :</span>
            <select
              value={filterFinish}
              onChange={(e) => setFilterFinish(e.target.value)}
              className="w-48 bg-[#16181d] border border-slate-700 text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="">Toutes</option>
              <option value="Normale">Normale</option>
              <option value="Reverse">Reverse</option>
              <option value="Cosmo">Cosmo</option>
              <option value="Holo ligne">Holo ligne</option>
              <option value="Holo étoile">Holo étoile</option>
              <option value="Holo mirage">Holo mirage</option>
              <option value="Master Ball">Master Ball</option>
              <option value="Poké Ball">Poké Ball</option>
              <option value="Stamp">Stamp</option>
            </select>
          </div>

          {/* État */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">État :</span>
            <select
              value={filterCondition}
              onChange={(e) => setFilterCondition(e.target.value)}
              className="w-48 bg-[#16181d] border border-slate-700 text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="">Tous les états</option>
              <option value="Mint">Mint</option>
              <option value="Near Mint">Near Mint</option>
              <option value="Excellent">Excellent</option>
              <option value="Good">Good</option>
              <option value="Played">Played</option>
              <option value="Poor">Poor</option>
            </select>
          </div>

        </div>
      </div>

      {/* 3. Grille des derniers ajouts de cartes */}
      <div className="bg-[#1e222b] p-6 md:p-8 rounded-2xl border border-slate-700/60 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-xl font-extrabold text-white">Derniers ajouts de cartes</h2>
            <p className="text-xs text-slate-400">Parcourez les dernières annonces mises en ligne sur la plateforme</p>
          </div>
          <span className="text-xs font-bold bg-slate-800 text-emerald-400 border border-slate-700 px-3 py-1 rounded-full">
            {filteredListings.length} {filteredListings.length > 1 ? 'annonces' : 'annonce'}
          </span>
        </div>

        {filteredListings.length === 0 ? (
          <div className="text-center py-16 bg-[#16181d] rounded-2xl border border-dashed border-slate-800 p-6 space-y-3">
            <p className="text-slate-400 font-medium text-sm">Aucune annonce active ne correspond à vos critères.</p>
            <button
              onClick={() => { 
                setSearchQuery(''); 
                setSelectedBlock('');
                setSelectedSeriesFilter('');
                setSelectedRegion('');
                setFilterFinish('');
              }}
              className="inline-block bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-colors cursor-pointer"
            >
              Réinitialiser les filtres
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredListings.slice(0, 90).map((item) => (
              <SingleListing 
                key={item?.id} 
                listing={item} 
                onClick={() => setSelectedListing(item)}
                isFavorite={favoriteListings.some(fav => fav.id === item.id)}
                onToggleFavorite={onToggleFavorite}
                onAddToCart={onAddToCart}
                currentUserId={currentUserId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}