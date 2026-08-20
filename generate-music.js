import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const musicDir = path.join(__dirname, 'public', 'music');
const outputFile = path.join(__dirname, 'src', 'musicData.js');

function generateMusicData() {
  if (!fs.existsSync(musicDir)) {
    console.error("❌ Le dossier public/music n'existe pas !");
    return;
  }

  const folders = fs.readdirSync(musicDir).filter(f => fs.statSync(path.join(musicDir, f)).isDirectory());
  
  let totalFiles = 0;
  const playlistData = folders.map(folder => {
    const folderPath = path.join(musicDir, folder);
    // Filtrage insensible à la casse (.mp3, .MP3, etc.)
    const files = fs.readdirSync(folderPath).filter(file => {
      const lower = file.toLowerCase();
      return lower.endsWith('.mp3') || lower.endsWith('.m4a') || lower.endsWith('.wav');
    });
    
    totalFiles += files.length;
    console.log(`📁 ${folder} : ${files.length} musiques trouvées`);
    return { folder: folder, files: files };
  });

  console.log(`🎯 TOTAL GÉNÉRAL : ${totalFiles} musiques détectées.`);

  const fileContent = `
export const pokemonPlaylist = ${JSON.stringify(playlistData, null, 2)};

export const getFlattenedPlaylist = () => {
  let list = [];
  pokemonPlaylist.forEach(category => {
    category.files.forEach(file => {
      list.push({
        title: file.replace(/\\.[^/.]+$/, "").replace(/_/g, ' '),
        url: \`/music/\${encodeURIComponent(category.folder)}/\${encodeURIComponent(file)}\`
      });
    });
  });
  return list;
};
`;

  fs.writeFileSync(outputFile, fileContent);
  console.log('✅ src/musicData.js mis à jour avec succès !');
}

generateMusicData();