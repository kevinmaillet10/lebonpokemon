import rocheImg from '../assets/badges/roche.png';
import cascadeImg from '../assets/badges/cascade.png';
import foudreImg from '../assets/badges/foudre.png';
import prismeImg from '../assets/badges/prisme.png';
import ameImg from '../assets/badges/âme.png';
import maraisImg from '../assets/badges/marais.png';
import volcanImg from '../assets/badges/volcan.png';
import terreImg from '../assets/badges/terre.png';
import olgaImg from '../assets/badges/Olga.png';
import aldoImg from '../assets/badges/Aldo.png';
import agathaImg from '../assets/badges/Agatha.png';
import peterImg from '../assets/badges/Peter.png';
import championImg from '../assets/badges/champion.png';

export const leagueSteps = [
  {
    id: 'roche',
    category: 'badges',
    title: 'Badge Roche',
    description: 'Enregistrer ses 20 premières cartes.',
    target: 20,
    icon: rocheImg,
  },
  {
    id: 'cascade',
    category: 'badges',
    title: 'Badge Cascade',
    description: 'Atteindre 200 cartes enregistrées.',
    target: 200,
    icon: cascadeImg,
  },
  {
    id: 'foudre',
    category: 'badges',
    title: 'Badge Foudre',
    description: 'Utiliser les filtres de tri ou organiser ses doublons par versions (Standard / Reverse).',
    target: 1,
    icon: foudreImg,
  },
  {
    id: 'prisme',
    category: 'badges',
    title: 'Badge Prisme',
    description: "Mettre à jour les données Cardmarket ou consulter l'historique des prix d'une carte.",
    target: 1,
    icon: prismeImg,
  },
  {
    id: 'ame',
    category: 'badges',
    title: 'Badge Âme',
    description: 'Atteindre le palier de 700 cartes enregistrées.',
    target: 700,
    icon: ameImg,
  },
  {
    id: 'marais',
    category: 'badges',
    title: 'Badge Marais',
    description: 'Classer et organiser un volume important de cartes par séries.',
    target: 100,
    icon: maraisImg,
  },
  {
    id: 'volcan',
    category: 'badges',
    title: 'Badge Volcan',
    description: 'Analyser et comparer les fluctuations de prix sur 30 jours de 10 cartes différentes.',
    target: 10,
    icon: volcanImg,
  },
  {
    id: 'terre',
    category: 'badges',
    title: 'Badge Terre',
    description: 'Atteindre et enregistrer 1200 cartes.',
    target: 1200,
    icon: terreImg,
  },
  {
    id: 'conseil-olga',
    category: 'elite4',
    title: 'Conseil 4 - Olga',
    description: 'Réaliser un suivi régulier des prix du marché pour optimiser ses fiches de vente.',
    target: 1,
    icon: olgaImg,
  },
  {
    id: 'conseil-aldo',
    category: 'elite4',
    title: 'Conseil 4 - Aldo',
    description: 'Maître du tri de masse — Avoir trié et catalogué avec succès plus de 100 doublons de cartes du bloc Écarlate et Violet.',
    target: 100,
    icon: aldoImg,
  },
  {
    id: 'conseil-agatha',
    category: 'elite4',
    title: 'Conseil 4 - Agatha',
    description: "Maître des Flux de Données — Assurer la synchronisation et le bon paramétrage des historiques de prix.",
    target: 1,
    icon: agathaImg,
  },
  {
    id: 'conseil-peter',
    category: 'elite4',
    title: 'Conseil 4 - Peter',
    description: 'Maintenir une base de données parfaitement à jour avec un suivi rigoureux Standard / Reverse sur un très large volume.',
    target: 1,
    icon: peterImg,
  },
  {
    id: 'maitre-kanto',
    category: 'champion',
    title: 'Maître de la Région de Kanto',
    description: "L'accomplissement suprême : décrocher tous les badges, vaincre le Conseil et franchir 5000 cartes enregistrées.",
    target: 5000,
    icon: championImg,
  },
];