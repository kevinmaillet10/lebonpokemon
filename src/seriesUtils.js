export const groupSeriesByBlock = (seriesList) => {
  // Optionnel : trier d'abord la liste globale si nécessaire
  const grouped = seriesList.reduce((acc, series) => {
    const blockName = series.block_name || 'Autres';
    if (!acc[blockName]) {
      acc[blockName] = [];
    }
    acc[blockName].push(series);
    return acc;
  }, {});

  // Optionnel : trier les séries à l'intérieur de chaque bloc (par ex. par date de sortie ou ordre croissant)
  Object.keys(grouped).forEach(blockName => {
    grouped[blockName].sort((a, b) => {
      // Ajuste selon le champ de tri disponible (ex: release_date, id, etc.)
      return new Date(a.release_date) - new Date(b.release_date);
    });
  });

  return grouped;
};