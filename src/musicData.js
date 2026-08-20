
export const pokemonPlaylist = [
  {
    "folder": "Disc 1",
    "files": [
      "1.00 Pokemon generique 1 14 Français.mp3",
      "1.01 Aim to be a Pokémon Master.mp3",
      "1.02 Rivals!.mp3",
      "1.03 OK!.mp3",
      "1.04 Aim to be a Pokémon Master.mp3",
      "1.05 Ready Go!.mp3",
      "1.06 One Hundred Fifty-One.mp3",
      "1.07 Meowth's Song.mp3",
      "1.08 Fantasy in My Pocket.mp3",
      "1.09 Pokémon Ondo.mp3",
      "1.10 Type- Wild.mp3",
      "1.11 Riding on Lapras.mp3",
      "1.12 Meowth's Party.mp3",
      "1.13 Exciting Pokémon Relay.mp3",
      "1.14 Takeshi's Paradise.mp3",
      "1.15 To My Best Friend.mp3",
      "1.16 Face Forward Team Rocket!.mp3",
      "1.17 Pocket-ering Monster-ing.mp3"
    ]
  },
  {
    "folder": "Disc 2",
    "files": [
      "2.01 Advance Adventure.mp3",
      "2.02 Mega V.mp3",
      "2.03 Pokemon Symphonic Medley.mp3",
      "2.04 Battle Frontier.mp3",
      "2.05 Spurt!.mp3",
      "2.06 Because the Sky is There.mp3",
      "2.07 Polka O Dolka.mp3",
      "2.08 Peace Smile!.mp3",
      "2.09 Full of Summer!!.mp3",
      "2.10 Glory Day ~That Shining Day~.mp3",
      "2.11 Pokémon Counting Song.mp3",
      "2.12 I Won't Lose! ~Haruka's Theme~.mp3"
    ]
  },
  {
    "folder": "Disc 3",
    "files": [
      "3.01 Together.mp3",
      "3.02 High Five!.mp3",
      "3.03 The Greatest - Everyday!.mp3",
      "3.04 By Your Side ~Hikari's Theme~.mp3",
      "3.05 Message of the Wind.mp3",
      "3.06 Surely Tomorrow.mp3",
      "3.07 Get Fired Up, Spiky-eared Pichu!.mp3",
      "3.08 Which One ~ Is It.mp3",
      "3.09 In Your Heart, LaLaLa.mp3"
    ]
  },
  {
    "folder": "Disc 4",
    "files": [
      "4.01 Best Wishes!.mp3",
      "4.02 Be an Arrow!.mp3",
      "4.03 Be an Arrow! 2013.mp3",
      "4.04 Summerly Slope.mp3",
      "4.05 Fanfare of the Heart.mp3",
      "4.06 Can You Name All the Pokémon BW.mp3",
      "4.07 Seven-colored Arch.mp3",
      "4.08 Team Rocket Forever.mp3",
      "4.09 Sakura Go-Round.mp3",
      "4.10 Sakura Go-Round.mp3"
    ]
  },
  {
    "folder": "Disc 5",
    "files": [
      "5.01 V (Volt).mp3",
      "5.02 Mega V (Mega Volt).mp3",
      "5.03 Mad-Paced Getter.mp3",
      "5.04 X Strait Y Scenery.mp3",
      "5.05 Peace Smile!.mp3",
      "5.06 DreamDream.mp3",
      "5.07 Roaring All-Stars.mp3"
    ]
  },
  {
    "folder": "Disc 6",
    "files": [
      "6.01 XY&Z.mp3",
      "6.02 Squishy's Song.mp3",
      "6.03 Team Rocket's Team Song.mp3",
      "6.04 DreamDream.mp3",
      "6.05 Glittering.mp3",
      "6.06 Pikachu's Song.mp3",
      "6.07 Meowth's Ballad.mp3"
    ]
  },
  {
    "folder": "Disc 7",
    "files": [
      "7.01 Alola!!.mp3",
      "7.02 Aim to Be a Pokémon Master -20th Anniversary-.mp3",
      "7.03 Future Connection.mp3",
      "7.04 Your Adventure.mp3",
      "7.05 Pose.mp3",
      "7.06 Jariboy Jarigirl.mp3",
      "7.07 Bless.mp3",
      "7.08 Notebook of the Heart.mp3",
      "7.09 Type- Wild.mp3"
    ]
  },
  {
    "folder": "Disc 8",
    "files": [
      "8.01 1・2・3.mp3",
      "8.02 1・2・3.mp3",
      "8.03 1・2・3.mp3",
      "8.04 1・2・3.mp3",
      "8.05 Pokémon Shiritori.mp3",
      "8.06 Supereffective Type.mp3",
      "8.07 Aim to Be a Pokémon Master -with my friends-.mp3"
    ]
  }
];

export const getFlattenedPlaylist = () => {
  let list = [];
  pokemonPlaylist.forEach(category => {
    category.files.forEach(file => {
      list.push({
        title: file.replace(/\.[^/.]+$/, "").replace(/_/g, ' '),
        url: `/music/${encodeURIComponent(category.folder)}/${encodeURIComponent(file)}`
      });
    });
  });
  return list;
};
