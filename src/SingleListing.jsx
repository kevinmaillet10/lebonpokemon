import React from 'react';

export default function SingleListing({ 
  listing, 
  onClick, 
  onAddToCart, 
  isFavorite = false, 
  onToggleFavorite,
  currentUserId 
}) {
  if (!listing) return null;

  // Détermine si l'annonce appartient à l'utilisateur connecté
  const isOwnListing = currentUserId && (listing.user_id === currentUserId || listing.seller_id === currentUserId);

  // Extraction et parsing ultra-robuste des images (gère le string JSON de Supabase)
  let rawImage = null;
  let imagesList = listing.image_url;

  if (typeof imagesList === 'string') {
    try {
      imagesList = JSON.parse(imagesList);
    } catch (e) {
      imagesList = [imagesList];
    }
  }

  if (Array.isArray(imagesList) && imagesList.length > 0) {
    rawImage = imagesList[0];
  } else if (listing.cards?.image_url) {
    rawImage = Array.isArray(listing.cards.image_url) ? listing.cards.image_url[0] : listing.cards.image_url;
  } else if (listing.card_image) {
    rawImage = listing.card_image;
  }

  const cardImage = rawImage;
  const cardName = listing.title || listing.cards?.name || listing.card_name;
  const seller = listing.profiles;

  const cardData = Array.isArray(listing.cards) ? listing.cards[0] : listing.cards;
  // Extraction de l'illustrateur et des types (depuis listing ou cards)
  const illustrator = listing.illustrator || cardData?.illustrator;
  const rawTypes = listing.types || cardData?.types || [];
  const cardTypes = Array.isArray(rawTypes) ? rawTypes.join(', ') : rawTypes;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/85 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between group relative">
      
      {/* Bouton Favori (❤️) positionné en haut à droite */}
      {onToggleFavorite && (
        <button
          onClick={(e) => {
            e.stopPropagation(); // Empêche l'ouverture des détails au clic
            onToggleFavorite(listing);
          }}
          className="absolute top-3 right-3 bg-white/90 hover:bg-white text-slate-700 p-2 rounded-full shadow-md transition-all cursor-pointer z-20 backdrop-blur-sm"
          title={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
        >
          {isFavorite ? '❤️' : '🤍'}
        </button>
      )}

      {/* Partie cliquable pour voir les détails de l'annonce */}
      <div onClick={onClick} className="cursor-pointer">
        {/* Container Image */}
        <div className="bg-slate-50 p-4 relative aspect-[3/4] flex items-center justify-center border-b border-slate-100">
          {cardImage ? (
            <img 
              src={cardImage} 
              alt={cardName || 'Carte Pokémon'} 
              className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-200 drop-shadow-md"
              onError={(e) => {
                e.target.style.display = 'none';
                if (e.target.nextSibling) e.target.nextSibling.style.display = 'block';
              }}
            />
          ) : null}
          
          <div className="text-xs text-slate-400 font-medium text-center p-2" style={{ display: cardImage ? 'none' : 'block' }}>
            Pas d'image
          </div>

          {listing.condition && (
            <span className="absolute top-2.5 left-2.5 bg-slate-900/80 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider z-10">
              {listing.condition}
            </span>
          )}

          {/* Badge du nombre de photos réelles ajoutées (s'il y en a plus d'une) */}
          {Array.isArray(imagesList) && imagesList.length > 1 && (
            <span className="absolute top-2.5 right-14 bg-black/70 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shadow-md z-10">
              📸 {imagesList.length - 1}
            </span>
          )}
        </div>

        {/* Informations de l'annonce */}
        <div className="p-4 flex flex-col gap-2">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold text-indigo-600 tracking-wider uppercase bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 inline-block">
                {seller?.department_code ? `Dept. ${seller.department_code}` : 'Pokémon'}
              </span>

              {/* Indicateur visuel de vendeur certifié de confiance */}
              {seller?.is_certified && (
                <span className="text-[10px] text-sky-600 font-bold flex items-center gap-0.5 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-100">
                  ✓ Certifié
                </span>
              )}
            </div>

            <h3 className="font-bold text-slate-800 text-sm line-clamp-1 group-hover:text-indigo-600 transition-colors">
              {cardName || 'Carte Pokémon'}
            </h3>
            
            {/* Nom du vendeur discret */}
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
              Par {seller?.username || 'Vendeur'}
            </p>

            {/* Affichage de l'illustrateur et du type */}
            {(illustrator || cardTypes) && (
              <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500 space-y-0.5">
                {illustrator && (
                  <div className="truncate">
                    <span className="font-semibold text-slate-400">Illus :</span> {illustrator}
                  </div>
                )}
                {cardTypes && (
                  <div className="truncate">
                    <span className="font-semibold text-slate-400">Type :</span> <span className="text-indigo-600 font-medium">{cardTypes}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <span className="text-lg font-black text-slate-900">
              {Number(listing.price || 0).toFixed(2)} €
            </span>
            <span className="text-xs font-semibold text-slate-400 group-hover:text-indigo-600 transition-colors">
              Voir &rarr;
            </span>
          </div>
        </div>
      </div>

      {/* Bouton d'ajout au panier ou Badge "Votre annonce" */}
      <div className="p-4 pt-0">
        {isOwnListing ? (
          <div className="w-full bg-slate-100 text-slate-500 text-xs font-bold py-2.5 rounded-2xl text-center border border-slate-200 select-none">
            Votre annonce
          </div>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onAddToCart) onAddToCart(listing, 1);
            }}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2.5 rounded-2xl transition-colors shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>🛒</span> Ajouter au panier
          </button>
        )}
      </div>

    </div>
  );
}