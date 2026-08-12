export const KANTO_STAGES = [
  // --- LES 8 BADGES D'ARÈNE ---
  {
    id: 'badge_roche',
    name: 'Badge Roche',
    category: 'arene',
    target: 5,
    metric: 'total_cards',
    description: 'Enregistrer ses 5 premières cartes.'
  },
  {
    id: 'badge_cascade',
    name: 'Badge Cascade',
    category: 'arene',
    target: 50,
    metric: 'total_cards',
    description: 'Atteindre 50 cartes enregistrées.'
  },
  {
    id: 'badge_foudre',
    name: 'Badge Foudre',
    category: 'arene',
    target: 1,
    metric: 'filter_or_variants_used',
    description: 'Utiliser les filtres de tri ou organiser ses doublons par versions (Standard / Reverse).'
  },
  {
    id: 'badge_prisme',
    name: 'Badge Prisme',
    category: 'arene',
    target: 1,
    metric: 'price_history_checked',
    description: 'Mettre à jour les données Cardmarket ou consulter l\'historique des prix d\'une carte.'
  },
  {
    id: 'badge_ame',
    name: 'Badge Âme',
    category: 'arene',
    target: 200,
    metric: 'total_cards',
    description: 'Atteindre le palier de 200 cartes enregistrées.'
  },
  {
    id: 'badge_marais',
    name: 'Badge Marais',
    category: 'arene',
    target: 1,
    metric: 'series_organized',
    description: 'Classer et organiser un volume important de cartes par séries.'
  },
  {
    id: 'badge_volcan',
    name: 'Badge Volcan',
    category: 'arene',
    target: 10,
    metric: 'price_trend_analyzed',
    description: 'Analyser et comparer les fluctuations de prix sur 30 jours de 10 cartes différentes.'
  },
  {
    id: 'badge_terre',
    name: 'Badge Terre',
    category: 'arene',
    target: 500,
    metric: 'total_cards',
    description: 'Atteindre et enregistrer 500 cartes.'
  },

  // --- LA LIGUE DES 4 ---
  {
    id: 'conseil_amza',
    name: 'Conseil 4 - Amza (Le Marchand)',
    category: 'ligue',
    target: 1,
    metric: 'market_tracking_active',
    description: 'Réaliser un suivi régulier des prix du marché pour optimiser ses fiches de vente.'
  },
  {
    id: 'conseil_oli',
    name: 'Conseil 4 - Oli (L\'Organisateur)',
    category: 'ligue',
    target: 100,
    metric: 'bulk_sorted_sv',
    description: 'Maître du tri de masse — Avoir trié et catalogué avec succès plus de 100 doublons de cartes du bloc Écarlate et Violet.'
  },
  {
    id: 'conseil_spectra',
    name: 'Conseil 4 - Spectra (L\'Analyste)',
    category: 'ligue',
    target: 1,
    metric: 'data_flux_synced',
    description: 'Maître des Flux de Données — Assurer la synchronisation et le bon paramétrage des historiques de prix.'
  },
  {
    id: 'conseil_aldo',
    name: 'Conseil 4 - Aldo (Le Collectionneur Ultime)',
    category: 'ligue',
    target: 1,
    metric: 'master_db_rigor',
    description: 'Maintenir une base de données parfaitement à jour avec un suivi rigoureux Standard / Reverse sur un très large volume.'
  },

  // --- MAÎTRE DE LA LIGUE ---
  {
    id: 'maitre_kanto',
    name: 'Maître de la Région de Kanto',
    category: 'maitre',
    target: 2000,
    metric: 'total_cards',
    description: 'L\'accomplissement suprême : décrocher tous les badges, vaincre le Conseil et franchir 2000 cartes enregistrées.'
  }
];