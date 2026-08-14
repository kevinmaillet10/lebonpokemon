export const groupSeriesByBlock = (seriesList) => {
  // 1. Filtrer pour exclure les séries Pokémon Pocket (ID commençant par A, B ou P-)
  const filteredSeries = seriesList.filter(series => {
    const id = series.id || '';
    return !id.startsWith('A') && !id.startsWith('B') && !id.startsWith('P-');
  });

  // 2. Regrouper les séries filtrées par bloc
  const grouped = filteredSeries.reduce((acc, series) => {
    const blockName = series.block_name || 'Autres';
    if (!acc[blockName]) {
      acc[blockName] = [];
    }
    acc[blockName].push(series);
    return acc;
  }, {});

  // 3. Trier les séries à l'intérieur de chaque bloc par date de sortie
  Object.keys(grouped).forEach(blockName => {
    grouped[blockName].sort((a, b) => {
      return new Date(a.release_date) - new Date(b.release_date);
    });
  });

  return grouped;
};