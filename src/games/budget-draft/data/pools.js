/**
 * pools.js — Entity pools for Budget Draft
 * Party Hub game data
 *
 * Entity schema:
 *   id, name, category, role, value (1-20), tier (S/A/B/C),
 *   attributes {}, image: null
 */

export const POOLS = {

  // ================================================================
  // CRICKET
  // ================================================================
  cricket: [
    { id: 'cricket-virat-kohli', name: 'Virat Kohli', category: 'cricket', role: 'Batsman', value: 18, tier: 'S', attributes: { batting_avg: 54.0, format: 'All', nationality: 'India' }, image: null },
    { id: 'cricket-rohit-sharma', name: 'Rohit Sharma', category: 'cricket', role: 'Batsman', value: 16, tier: 'S', attributes: { batting_avg: 49.0, format: 'All', nationality: 'India' }, image: null },
    { id: 'cricket-ms-dhoni', name: 'MS Dhoni', category: 'cricket', role: 'Wicket-Keeper', value: 17, tier: 'S', attributes: { batting_avg: 50.6, format: 'All', nationality: 'India' }, image: null },
    { id: 'cricket-jasprit-bumrah', name: 'Jasprit Bumrah', category: 'cricket', role: 'Bowler', value: 17, tier: 'S', attributes: { bowling_avg: 21.6, format: 'All', nationality: 'India' }, image: null },
    { id: 'cricket-ben-stokes', name: 'Ben Stokes', category: 'cricket', role: 'All-Rounder', value: 16, tier: 'S', attributes: { batting_avg: 36.4, format: 'Test', nationality: 'England' }, image: null },
    { id: 'cricket-joe-root', name: 'Joe Root', category: 'cricket', role: 'Batsman', value: 16, tier: 'S', attributes: { batting_avg: 50.8, format: 'Test', nationality: 'England' }, image: null },
    { id: 'cricket-steve-smith', name: 'Steve Smith', category: 'cricket', role: 'Batsman', value: 15, tier: 'S', attributes: { batting_avg: 61.8, format: 'Test', nationality: 'Australia' }, image: null },
    { id: 'cricket-pat-cummins', name: 'Pat Cummins', category: 'cricket', role: 'Bowler', value: 15, tier: 'A', attributes: { bowling_avg: 21.4, format: 'All', nationality: 'Australia' }, image: null },
    { id: 'cricket-babar-azam', name: 'Babar Azam', category: 'cricket', role: 'Batsman', value: 15, tier: 'A', attributes: { batting_avg: 50.2, format: 'All', nationality: 'Pakistan' }, image: null },
    { id: 'cricket-kane-williamson', name: 'Kane Williamson', category: 'cricket', role: 'Batsman', value: 14, tier: 'A', attributes: { batting_avg: 54.9, format: 'Test', nationality: 'New Zealand' }, image: null },
    { id: 'cricket-david-warner', name: 'David Warner', category: 'cricket', role: 'Batsman', value: 13, tier: 'A', attributes: { batting_avg: 44.6, format: 'All', nationality: 'Australia' }, image: null },
    { id: 'cricket-rashid-khan', name: 'Rashid Khan', category: 'cricket', role: 'Spinner', value: 14, tier: 'A', attributes: { bowling_avg: 17.2, format: 'T20/ODI', nationality: 'Afghanistan' }, image: null },
    { id: 'cricket-jos-buttler', name: 'Jos Buttler', category: 'cricket', role: 'Wicket-Keeper', value: 13, tier: 'A', attributes: { batting_avg: 42.8, format: 'ODI/T20', nationality: 'England' }, image: null },
    { id: 'cricket-shakib-al-hasan', name: 'Shakib Al Hasan', category: 'cricket', role: 'All-Rounder', value: 13, tier: 'A', attributes: { batting_avg: 36.5, format: 'All', nationality: 'Bangladesh' }, image: null },
    { id: 'cricket-suryakumar-yadav', name: 'Suryakumar Yadav', category: 'cricket', role: 'Batsman', value: 14, tier: 'A', attributes: { batting_avg: 46.3, format: 'T20', nationality: 'India' }, image: null },
    { id: 'cricket-rishabh-pant', name: 'Rishabh Pant', category: 'cricket', role: 'Wicket-Keeper', value: 13, tier: 'A', attributes: { batting_avg: 43.0, format: 'All', nationality: 'India' }, image: null },
    { id: 'cricket-shubman-gill', name: 'Shubman Gill', category: 'cricket', role: 'Batsman', value: 11, tier: 'B', attributes: { batting_avg: 46.5, format: 'ODI', nationality: 'India' }, image: null },
    { id: 'cricket-mohammed-siraj', name: 'Mohammed Siraj', category: 'cricket', role: 'Bowler', value: 10, tier: 'B', attributes: { bowling_avg: 26.1, format: 'All', nationality: 'India' }, image: null },
    { id: 'cricket-hardik-pandya', name: 'Hardik Pandya', category: 'cricket', role: 'All-Rounder', value: 12, tier: 'A', attributes: { batting_avg: 30.0, format: 'ODI/T20', nationality: 'India' }, image: null },
    { id: 'cricket-ravindra-jadeja', name: 'Ravindra Jadeja', category: 'cricket', role: 'All-Rounder', value: 13, tier: 'A', attributes: { batting_avg: 36.2, format: 'All', nationality: 'India' }, image: null },
    { id: 'cricket-mitchell-starc', name: 'Mitchell Starc', category: 'cricket', role: 'Bowler', value: 12, tier: 'A', attributes: { bowling_avg: 27.6, format: 'All', nationality: 'Australia' }, image: null },
    { id: 'cricket-trent-boult', name: 'Trent Boult', category: 'cricket', role: 'Bowler', value: 11, tier: 'B', attributes: { bowling_avg: 27.1, format: 'All', nationality: 'New Zealand' }, image: null },
  ],

  // ================================================================
  // FOOTBALL
  // ================================================================
  football: [
    { id: 'football-messi', name: 'Lionel Messi', category: 'football', role: 'Forward', value: 20, tier: 'S', attributes: { goals: 672, club: 'Inter Miami', nationality: 'Argentina' }, image: null },
    { id: 'football-ronaldo', name: 'Cristiano Ronaldo', category: 'football', role: 'Forward', value: 20, tier: 'S', attributes: { goals: 741, club: 'Al Nassr', nationality: 'Portugal' }, image: null },
    { id: 'football-mbappe', name: 'Kylian Mbappé', category: 'football', role: 'Forward', value: 19, tier: 'S', attributes: { goals: 265, club: 'Real Madrid', nationality: 'France' }, image: null },
    { id: 'football-haaland', name: 'Erling Haaland', category: 'football', role: 'Striker', value: 19, tier: 'S', attributes: { goals: 184, club: 'Man City', nationality: 'Norway' }, image: null },
    { id: 'football-vinicius', name: 'Vinicius Jr', category: 'football', role: 'Forward', value: 17, tier: 'S', attributes: { goals: 90, club: 'Real Madrid', nationality: 'Brazil' }, image: null },
    { id: 'football-bellingham', name: 'Jude Bellingham', category: 'football', role: 'Midfielder', value: 17, tier: 'S', attributes: { goals: 55, club: 'Real Madrid', nationality: 'England' }, image: null },
    { id: 'football-de-bruyne', name: 'Kevin De Bruyne', category: 'football', role: 'Midfielder', value: 16, tier: 'S', attributes: { goals: 115, club: 'Man City', nationality: 'Belgium' }, image: null },
    { id: 'football-alisson', name: 'Alisson Becker', category: 'football', role: 'Goalkeeper', value: 14, tier: 'A', attributes: { clean_sheets: 134, club: 'Liverpool', nationality: 'Brazil' }, image: null },
    { id: 'football-van-dijk', name: 'Virgil van Dijk', category: 'football', role: 'Defender', value: 14, tier: 'A', attributes: { appearances: 310, club: 'Liverpool', nationality: 'Netherlands' }, image: null },
    { id: 'football-salah', name: 'Mohamed Salah', category: 'football', role: 'Forward', value: 16, tier: 'S', attributes: { goals: 230, club: 'Liverpool', nationality: 'Egypt' }, image: null },
    { id: 'football-neymar', name: 'Neymar Jr', category: 'football', role: 'Forward', value: 15, tier: 'A', attributes: { goals: 400, club: 'Al Hilal', nationality: 'Brazil' }, image: null },
    { id: 'football-yamal', name: 'Lamine Yamal', category: 'football', role: 'Forward', value: 15, tier: 'A', attributes: { goals: 25, club: 'Barcelona', nationality: 'Spain' }, image: null },
    { id: 'football-rodri', name: 'Rodri', category: 'football', role: 'Midfielder', value: 15, tier: 'A', attributes: { appearances: 243, club: 'Man City', nationality: 'Spain' }, image: null },
    { id: 'football-pedri', name: 'Pedri', category: 'football', role: 'Midfielder', value: 14, tier: 'A', attributes: { goals: 30, club: 'Barcelona', nationality: 'Spain' }, image: null },
    { id: 'football-ter-stegen', name: 'Marc-André ter Stegen', category: 'football', role: 'Goalkeeper', value: 13, tier: 'A', attributes: { clean_sheets: 155, club: 'Barcelona', nationality: 'Germany' }, image: null },
    { id: 'football-trent', name: 'Trent Alexander-Arnold', category: 'football', role: 'Defender', value: 14, tier: 'A', attributes: { assists: 93, club: 'Real Madrid', nationality: 'England' }, image: null },
    { id: 'football-bruno', name: 'Bruno Fernandes', category: 'football', role: 'Midfielder', value: 13, tier: 'A', attributes: { goals: 90, club: 'Man Utd', nationality: 'Portugal' }, image: null },
    { id: 'football-saka', name: 'Bukayo Saka', category: 'football', role: 'Forward', value: 14, tier: 'A', attributes: { goals: 85, club: 'Arsenal', nationality: 'England' }, image: null },
    { id: 'football-foden', name: 'Phil Foden', category: 'football', role: 'Midfielder', value: 14, tier: 'A', attributes: { goals: 97, club: 'Man City', nationality: 'England' }, image: null },
    { id: 'football-rashford', name: 'Marcus Rashford', category: 'football', role: 'Forward', value: 11, tier: 'B', attributes: { goals: 141, club: 'Man Utd', nationality: 'England' }, image: null },
    { id: 'football-lewandowski', name: 'Robert Lewandowski', category: 'football', role: 'Striker', value: 15, tier: 'A', attributes: { goals: 622, club: 'Barcelona', nationality: 'Poland' }, image: null },
  ],

  // ================================================================
  // SUPERHEROES
  // ================================================================
  superheroes: [
    { id: 'hero-spiderman', name: 'Spider-Man', category: 'superheroes', role: 'Street-Level', value: 14, tier: 'A', attributes: { power_level: 85, universe: 'Marvel', real_name: 'Peter Parker' }, image: null },
    { id: 'hero-ironman', name: 'Iron Man', category: 'superheroes', role: 'Tech Hero', value: 16, tier: 'S', attributes: { power_level: 90, universe: 'Marvel', real_name: 'Tony Stark' }, image: null },
    { id: 'hero-captain-america', name: 'Captain America', category: 'superheroes', role: 'Super Soldier', value: 13, tier: 'A', attributes: { power_level: 80, universe: 'Marvel', real_name: 'Steve Rogers' }, image: null },
    { id: 'hero-thor', name: 'Thor', category: 'superheroes', role: 'God', value: 17, tier: 'S', attributes: { power_level: 95, universe: 'Marvel', real_name: 'Thor Odinson' }, image: null },
    { id: 'hero-black-panther', name: 'Black Panther', category: 'superheroes', role: 'Warrior King', value: 14, tier: 'A', attributes: { power_level: 82, universe: 'Marvel', real_name: "T'Challa" }, image: null },
    { id: 'hero-doctor-strange', name: 'Doctor Strange', category: 'superheroes', role: 'Sorcerer', value: 17, tier: 'S', attributes: { power_level: 94, universe: 'Marvel', real_name: 'Stephen Strange' }, image: null },
    { id: 'hero-hulk', name: 'Hulk', category: 'superheroes', role: 'Powerhouse', value: 17, tier: 'S', attributes: { power_level: 97, universe: 'Marvel', real_name: 'Bruce Banner' }, image: null },
    { id: 'hero-batman', name: 'Batman', category: 'superheroes', role: 'Detective', value: 15, tier: 'A', attributes: { power_level: 78, universe: 'DC', real_name: 'Bruce Wayne' }, image: null },
    { id: 'hero-superman', name: 'Superman', category: 'superheroes', role: 'Kryptonian', value: 20, tier: 'S', attributes: { power_level: 100, universe: 'DC', real_name: 'Clark Kent' }, image: null },
    { id: 'hero-wonder-woman', name: 'Wonder Woman', category: 'superheroes', role: 'Demigoddess', value: 18, tier: 'S', attributes: { power_level: 96, universe: 'DC', real_name: 'Diana Prince' }, image: null },
    { id: 'hero-flash', name: 'The Flash', category: 'superheroes', role: 'Speedster', value: 17, tier: 'S', attributes: { power_level: 93, universe: 'DC', real_name: 'Barry Allen' }, image: null },
    { id: 'hero-aquaman', name: 'Aquaman', category: 'superheroes', role: 'Ocean King', value: 15, tier: 'A', attributes: { power_level: 88, universe: 'DC', real_name: 'Arthur Curry' }, image: null },
    { id: 'hero-black-widow', name: 'Black Widow', category: 'superheroes', role: 'Spy', value: 10, tier: 'B', attributes: { power_level: 70, universe: 'Marvel', real_name: 'Natasha Romanoff' }, image: null },
    { id: 'hero-hawkeye', name: 'Hawkeye', category: 'superheroes', role: 'Marksman', value: 8, tier: 'C', attributes: { power_level: 65, universe: 'Marvel', real_name: 'Clint Barton' }, image: null },
    { id: 'hero-scarlet-witch', name: 'Scarlet Witch', category: 'superheroes', role: 'Reality Warper', value: 19, tier: 'S', attributes: { power_level: 99, universe: 'Marvel', real_name: 'Wanda Maximoff' }, image: null },
    { id: 'hero-captain-marvel', name: 'Captain Marvel', category: 'superheroes', role: 'Cosmic', value: 18, tier: 'S', attributes: { power_level: 96, universe: 'Marvel', real_name: 'Carol Danvers' }, image: null },
    { id: 'hero-ant-man', name: 'Ant-Man', category: 'superheroes', role: 'Size Changer', value: 10, tier: 'B', attributes: { power_level: 72, universe: 'Marvel', real_name: 'Scott Lang' }, image: null },
    { id: 'hero-daredevil', name: 'Daredevil', category: 'superheroes', role: 'Street-Level', value: 11, tier: 'B', attributes: { power_level: 74, universe: 'Marvel', real_name: 'Matt Murdock' }, image: null },
    { id: 'hero-wolverine', name: 'Wolverine', category: 'superheroes', role: 'Mutant', value: 15, tier: 'A', attributes: { power_level: 87, universe: 'Marvel', real_name: 'Logan' }, image: null },
    { id: 'hero-deadpool', name: 'Deadpool', category: 'superheroes', role: 'Mercenary', value: 14, tier: 'A', attributes: { power_level: 83, universe: 'Marvel', real_name: 'Wade Wilson' }, image: null },
  ],

  // ================================================================
  // ANIME
  // ================================================================
  anime: [
    { id: 'anime-goku', name: 'Son Goku', category: 'anime', role: 'Fighter', value: 20, tier: 'S', attributes: { power_level: 100, series: 'Dragon Ball', form: 'Ultra Instinct' }, image: null },
    { id: 'anime-naruto', name: 'Naruto Uzumaki', category: 'anime', role: 'Ninja', value: 18, tier: 'S', attributes: { power_level: 96, series: 'Naruto', form: 'Baryon Mode' }, image: null },
    { id: 'anime-luffy', name: 'Monkey D. Luffy', category: 'anime', role: 'Pirate', value: 18, tier: 'S', attributes: { power_level: 95, series: 'One Piece', form: 'Gear 5' }, image: null },
    { id: 'anime-ichigo', name: 'Ichigo Kurosaki', category: 'anime', role: 'Soul Reaper', value: 17, tier: 'S', attributes: { power_level: 93, series: 'Bleach', form: 'True Bankai' }, image: null },
    { id: 'anime-saitama', name: 'Saitama', category: 'anime', role: 'Hero', value: 20, tier: 'S', attributes: { power_level: 100, series: 'One Punch Man', form: 'Serious Mode' }, image: null },
    { id: 'anime-zoro', name: 'Roronoa Zoro', category: 'anime', role: 'Swordsman', value: 15, tier: 'A', attributes: { power_level: 88, series: 'One Piece', form: 'Asura' }, image: null },
    { id: 'anime-sasuke', name: 'Sasuke Uchiha', category: 'anime', role: 'Ninja', value: 16, tier: 'S', attributes: { power_level: 91, series: 'Naruto', form: 'Rinnegan' }, image: null },
    { id: 'anime-levi', name: 'Levi Ackerman', category: 'anime', role: 'Soldier', value: 13, tier: 'A', attributes: { power_level: 82, series: 'Attack on Titan', form: 'Captain' }, image: null },
    { id: 'anime-gojo', name: 'Satoru Gojo', category: 'anime', role: 'Sorcerer', value: 19, tier: 'S', attributes: { power_level: 99, series: 'Jujutsu Kaisen', form: 'Infinity' }, image: null },
    { id: 'anime-itachi', name: 'Itachi Uchiha', category: 'anime', role: 'Ninja', value: 15, tier: 'A', attributes: { power_level: 87, series: 'Naruto', form: 'Susanoo' }, image: null },
    { id: 'anime-yusuke', name: 'Yusuke Urameshi', category: 'anime', role: 'Spirit Detective', value: 14, tier: 'A', attributes: { power_level: 84, series: 'Yu Yu Hakusho', form: 'Mazoku' }, image: null },
    { id: 'anime-kenshin', name: 'Himura Kenshin', category: 'anime', role: 'Swordsman', value: 13, tier: 'A', attributes: { power_level: 80, series: 'Rurouni Kenshin', form: 'Battousai' }, image: null },
    { id: 'anime-edward-elric', name: 'Edward Elric', category: 'anime', role: 'Alchemist', value: 14, tier: 'A', attributes: { power_level: 83, series: 'Fullmetal Alchemist', form: 'State Alchemist' }, image: null },
    { id: 'anime-vegeta', name: 'Vegeta', category: 'anime', role: 'Fighter', value: 18, tier: 'S', attributes: { power_level: 94, series: 'Dragon Ball', form: 'Ultra Ego' }, image: null },
    { id: 'anime-meruem', name: 'Meruem', category: 'anime', role: 'Chimera Ant', value: 18, tier: 'S', attributes: { power_level: 97, series: 'Hunter x Hunter', form: 'Post-Rose' }, image: null },
    { id: 'anime-killua', name: 'Killua Zoldyck', category: 'anime', role: 'Assassin', value: 14, tier: 'A', attributes: { power_level: 85, series: 'Hunter x Hunter', form: 'Godspeed' }, image: null },
    { id: 'anime-netero', name: 'Isaac Netero', category: 'anime', role: 'Hunter', value: 16, tier: 'S', attributes: { power_level: 90, series: 'Hunter x Hunter', form: '100-Type Guanyin' }, image: null },
    { id: 'anime-aizen', name: 'Sosuke Aizen', category: 'anime', role: 'Soul Reaper', value: 17, tier: 'S', attributes: { power_level: 93, series: 'Bleach', form: 'Transcendent' }, image: null },
    { id: 'anime-shanks', name: 'Shanks', category: 'anime', role: 'Pirate', value: 17, tier: 'S', attributes: { power_level: 92, series: 'One Piece', form: 'Haki Master' }, image: null },
    { id: 'anime-madara', name: 'Madara Uchiha', category: 'anime', role: 'Ninja', value: 18, tier: 'S', attributes: { power_level: 96, series: 'Naruto', form: 'Rinnegan Six Paths' }, image: null },
  ],

  // ================================================================
  // POKEMON
  // ================================================================
  pokemon: [
    { id: 'pokemon-mewtwo', name: 'Mewtwo', category: 'pokemon', role: 'Psychic', value: 19, tier: 'S', attributes: { base_stat_total: 680, type: 'Psychic', generation: 1 }, image: null },
    { id: 'pokemon-rayquaza', name: 'Rayquaza', category: 'pokemon', role: 'Dragon', value: 18, tier: 'S', attributes: { base_stat_total: 680, type: 'Dragon/Flying', generation: 3 }, image: null },
    { id: 'pokemon-arceus', name: 'Arceus', category: 'pokemon', role: 'Normal', value: 20, tier: 'S', attributes: { base_stat_total: 720, type: 'Normal (All-type)', generation: 4 }, image: null },
    { id: 'pokemon-lucario', name: 'Lucario', category: 'pokemon', role: 'Fighting', value: 13, tier: 'A', attributes: { base_stat_total: 525, type: 'Fighting/Steel', generation: 4 }, image: null },
    { id: 'pokemon-gengar', name: 'Gengar', category: 'pokemon', role: 'Ghost', value: 12, tier: 'A', attributes: { base_stat_total: 500, type: 'Ghost/Poison', generation: 1 }, image: null },
    { id: 'pokemon-dragonite', name: 'Dragonite', category: 'pokemon', role: 'Dragon', value: 14, tier: 'A', attributes: { base_stat_total: 600, type: 'Dragon/Flying', generation: 1 }, image: null },
    { id: 'pokemon-charizard', name: 'Charizard', category: 'pokemon', role: 'Fire', value: 14, tier: 'A', attributes: { base_stat_total: 534, type: 'Fire/Flying', generation: 1 }, image: null },
    { id: 'pokemon-pikachu', name: 'Pikachu', category: 'pokemon', role: 'Electric', value: 8, tier: 'C', attributes: { base_stat_total: 320, type: 'Electric', generation: 1 }, image: null },
    { id: 'pokemon-umbreon', name: 'Umbreon', category: 'pokemon', role: 'Dark', value: 11, tier: 'B', attributes: { base_stat_total: 525, type: 'Dark', generation: 2 }, image: null },
    { id: 'pokemon-garchomp', name: 'Garchomp', category: 'pokemon', role: 'Dragon', value: 15, tier: 'A', attributes: { base_stat_total: 600, type: 'Dragon/Ground', generation: 4 }, image: null },
    { id: 'pokemon-blastoise', name: 'Blastoise', category: 'pokemon', role: 'Water', value: 11, tier: 'B', attributes: { base_stat_total: 530, type: 'Water', generation: 1 }, image: null },
    { id: 'pokemon-venusaur', name: 'Venusaur', category: 'pokemon', role: 'Grass', value: 11, tier: 'B', attributes: { base_stat_total: 525, type: 'Grass/Poison', generation: 1 }, image: null },
    { id: 'pokemon-alakazam', name: 'Alakazam', category: 'pokemon', role: 'Psychic', value: 12, tier: 'A', attributes: { base_stat_total: 500, type: 'Psychic', generation: 1 }, image: null },
    { id: 'pokemon-machamp', name: 'Machamp', category: 'pokemon', role: 'Fighting', value: 10, tier: 'B', attributes: { base_stat_total: 505, type: 'Fighting', generation: 1 }, image: null },
    { id: 'pokemon-snorlax', name: 'Snorlax', category: 'pokemon', role: 'Normal', value: 10, tier: 'B', attributes: { base_stat_total: 540, type: 'Normal', generation: 1 }, image: null },
    { id: 'pokemon-gyarados', name: 'Gyarados', category: 'pokemon', role: 'Water', value: 13, tier: 'A', attributes: { base_stat_total: 540, type: 'Water/Flying', generation: 1 }, image: null },
    { id: 'pokemon-lapras', name: 'Lapras', category: 'pokemon', role: 'Ice', value: 11, tier: 'B', attributes: { base_stat_total: 535, type: 'Water/Ice', generation: 1 }, image: null },
    { id: 'pokemon-arcanine', name: 'Arcanine', category: 'pokemon', role: 'Fire', value: 12, tier: 'A', attributes: { base_stat_total: 555, type: 'Fire', generation: 1 }, image: null },
    { id: 'pokemon-vaporeon', name: 'Vaporeon', category: 'pokemon', role: 'Water', value: 10, tier: 'B', attributes: { base_stat_total: 525, type: 'Water', generation: 1 }, image: null },
    { id: 'pokemon-espeon', name: 'Espeon', category: 'pokemon', role: 'Psychic', value: 11, tier: 'B', attributes: { base_stat_total: 525, type: 'Psychic', generation: 2 }, image: null },
  ],

  // ================================================================
  // ACTORS
  // ================================================================
  actors: [
    { id: 'actor-tom-hanks', name: 'Tom Hanks', category: 'actors', role: 'Drama/Comedy', value: 16, tier: 'S', attributes: { oscars: 2, known_for: 'Forrest Gump, Cast Away', nationality: 'American' }, image: null },
    { id: 'actor-meryl-streep', name: 'Meryl Streep', category: 'actors', role: 'Drama', value: 18, tier: 'S', attributes: { oscars: 3, known_for: 'Sophie\'s Choice, The Iron Lady', nationality: 'American' }, image: null },
    { id: 'actor-leonardo-dicaprio', name: 'Leonardo DiCaprio', category: 'actors', role: 'Drama', value: 17, tier: 'S', attributes: { oscars: 1, known_for: 'Titanic, The Revenant', nationality: 'American' }, image: null },
    { id: 'actor-cate-blanchett', name: 'Cate Blanchett', category: 'actors', role: 'Drama', value: 17, tier: 'S', attributes: { oscars: 2, known_for: 'Blue Jasmine, Tar', nationality: 'Australian' }, image: null },
    { id: 'actor-denzel-washington', name: 'Denzel Washington', category: 'actors', role: 'Action/Drama', value: 17, tier: 'S', attributes: { oscars: 2, known_for: 'Training Day, Malcolm X', nationality: 'American' }, image: null },
    { id: 'actor-viola-davis', name: 'Viola Davis', category: 'actors', role: 'Drama', value: 16, tier: 'S', attributes: { oscars: 1, known_for: 'Fences, Ma Rainey', nationality: 'American' }, image: null },
    { id: 'actor-robert-de-niro', name: 'Robert De Niro', category: 'actors', role: 'Drama', value: 18, tier: 'S', attributes: { oscars: 2, known_for: 'Taxi Driver, Raging Bull', nationality: 'American' }, image: null },
    { id: 'actor-joaquin-phoenix', name: 'Joaquin Phoenix', category: 'actors', role: 'Drama', value: 16, tier: 'S', attributes: { oscars: 1, known_for: 'Joker, Her', nationality: 'American' }, image: null },
    { id: 'actor-natalie-portman', name: 'Natalie Portman', category: 'actors', role: 'Drama', value: 14, tier: 'A', attributes: { oscars: 1, known_for: 'Black Swan, Leon', nationality: 'Israeli-American' }, image: null },
    { id: 'actor-brad-pitt', name: 'Brad Pitt', category: 'actors', role: 'Action/Drama', value: 15, tier: 'A', attributes: { oscars: 1, known_for: 'Fight Club, Once Upon a Time', nationality: 'American' }, image: null },
    { id: 'actor-margot-robbie', name: 'Margot Robbie', category: 'actors', role: 'Drama/Comedy', value: 14, tier: 'A', attributes: { oscars: 0, known_for: 'Barbie, I, Tonya', nationality: 'Australian' }, image: null },
    { id: 'actor-ryan-gosling', name: 'Ryan Gosling', category: 'actors', role: 'Drama/Comedy', value: 14, tier: 'A', attributes: { oscars: 0, known_for: 'La La Land, Drive', nationality: 'Canadian' }, image: null },
    { id: 'actor-emma-stone', name: 'Emma Stone', category: 'actors', role: 'Drama/Comedy', value: 14, tier: 'A', attributes: { oscars: 2, known_for: 'La La Land, Poor Things', nationality: 'American' }, image: null },
    { id: 'actor-christian-bale', name: 'Christian Bale', category: 'actors', role: 'Drama/Action', value: 15, tier: 'A', attributes: { oscars: 1, known_for: 'The Dark Knight, American Psycho', nationality: 'British' }, image: null },
    { id: 'actor-amy-adams', name: 'Amy Adams', category: 'actors', role: 'Drama/Comedy', value: 13, tier: 'A', attributes: { oscars: 0, known_for: 'Arrival, American Hustle', nationality: 'American' }, image: null },
    { id: 'actor-morgan-freeman', name: 'Morgan Freeman', category: 'actors', role: 'Drama', value: 16, tier: 'S', attributes: { oscars: 1, known_for: 'Shawshank Redemption, Se7en', nationality: 'American' }, image: null },
    { id: 'actor-al-pacino', name: 'Al Pacino', category: 'actors', role: 'Drama', value: 17, tier: 'S', attributes: { oscars: 1, known_for: 'The Godfather, Scarface', nationality: 'American' }, image: null },
    { id: 'actor-charlize-theron', name: 'Charlize Theron', category: 'actors', role: 'Drama/Action', value: 14, tier: 'A', attributes: { oscars: 1, known_for: 'Monster, Mad Max', nationality: 'South African' }, image: null },
    { id: 'actor-tom-cruise', name: 'Tom Cruise', category: 'actors', role: 'Action', value: 15, tier: 'A', attributes: { oscars: 0, known_for: 'Mission Impossible, Top Gun', nationality: 'American' }, image: null },
    { id: 'actor-scarlett-johansson', name: 'Scarlett Johansson', category: 'actors', role: 'Action/Drama', value: 14, tier: 'A', attributes: { oscars: 0, known_for: 'Black Widow, Marriage Story', nationality: 'American' }, image: null },
  ],

  // ================================================================
  // VILLAINS
  // ================================================================
  villains: [
    { id: 'villain-thanos', name: 'Thanos', category: 'villains', role: 'Cosmic Warlord', value: 19, tier: 'S', attributes: { power_level: 97, universe: 'Marvel', motivation: 'Balance' }, image: null },
    { id: 'villain-joker', name: 'The Joker', category: 'villains', role: 'Anarchist', value: 16, tier: 'S', attributes: { power_level: 72, universe: 'DC', motivation: 'Chaos' }, image: null },
    { id: 'villain-darth-vader', name: 'Darth Vader', category: 'villains', role: 'Sith Lord', value: 18, tier: 'S', attributes: { power_level: 94, universe: 'Star Wars', motivation: 'Order' }, image: null },
    { id: 'villain-voldemort', name: 'Lord Voldemort', category: 'villains', role: 'Dark Wizard', value: 17, tier: 'S', attributes: { power_level: 91, universe: 'Harry Potter', motivation: 'Immortality' }, image: null },
    { id: 'villain-hannibal', name: 'Hannibal Lecter', category: 'villains', role: 'Genius Killer', value: 14, tier: 'A', attributes: { power_level: 70, universe: 'Silence of the Lambs', motivation: 'Aesthetics' }, image: null },
    { id: 'villain-anton-chigurh', name: 'Anton Chigurh', category: 'villains', role: 'Hitman', value: 13, tier: 'A', attributes: { power_level: 68, universe: 'No Country for Old Men', motivation: 'Fate' }, image: null },
    { id: 'villain-magneto', name: 'Magneto', category: 'villains', role: 'Mutant Supremacist', value: 17, tier: 'S', attributes: { power_level: 93, universe: 'Marvel', motivation: 'Mutant Rights' }, image: null },
    { id: 'villain-loki', name: 'Loki', category: 'villains', role: 'Trickster God', value: 15, tier: 'A', attributes: { power_level: 87, universe: 'Marvel', motivation: 'Ambition' }, image: null },
    { id: 'villain-lex-luthor', name: 'Lex Luthor', category: 'villains', role: 'Genius Billionaire', value: 14, tier: 'A', attributes: { power_level: 73, universe: 'DC', motivation: 'Power' }, image: null },
    { id: 'villain-two-face', name: 'Two-Face', category: 'villains', role: 'Crime Boss', value: 11, tier: 'B', attributes: { power_level: 65, universe: 'DC', motivation: 'Justice/Chaos' }, image: null },
    { id: 'villain-dr-doom', name: 'Doctor Doom', category: 'villains', role: 'Sorcerer King', value: 18, tier: 'S', attributes: { power_level: 95, universe: 'Marvel', motivation: 'Domination' }, image: null },
    { id: 'villain-red-skull', name: 'Red Skull', category: 'villains', role: 'Nazi Commander', value: 13, tier: 'A', attributes: { power_level: 78, universe: 'Marvel', motivation: 'World Domination' }, image: null },
    { id: 'villain-killmonger', name: 'Killmonger', category: 'villains', role: 'Warrior', value: 14, tier: 'A', attributes: { power_level: 82, universe: 'Marvel', motivation: 'Revolution' }, image: null },
    { id: 'villain-ultron', name: 'Ultron', category: 'villains', role: 'AI', value: 16, tier: 'S', attributes: { power_level: 90, universe: 'Marvel', motivation: 'Evolution' }, image: null },
    { id: 'villain-hela', name: 'Hela', category: 'villains', role: 'Death Goddess', value: 18, tier: 'S', attributes: { power_level: 94, universe: 'Marvel', motivation: 'Conquest' }, image: null },
    { id: 'villain-green-goblin', name: 'Green Goblin', category: 'villains', role: 'Tech Villain', value: 13, tier: 'A', attributes: { power_level: 76, universe: 'Marvel', motivation: 'Revenge' }, image: null },
    { id: 'villain-venom', name: 'Venom', category: 'villains', role: 'Symbiote', value: 15, tier: 'A', attributes: { power_level: 86, universe: 'Marvel', motivation: 'Survival' }, image: null },
    { id: 'villain-carnage', name: 'Carnage', category: 'villains', role: 'Symbiote', value: 16, tier: 'S', attributes: { power_level: 88, universe: 'Marvel', motivation: 'Chaos' }, image: null },
    { id: 'villain-bane', name: 'Bane', category: 'villains', role: 'Mercenary', value: 14, tier: 'A', attributes: { power_level: 81, universe: 'DC', motivation: 'Domination' }, image: null },
    { id: 'villain-ozymandias', name: 'Ozymandias', category: 'villains', role: 'Genius', value: 15, tier: 'A', attributes: { power_level: 79, universe: 'Watchmen', motivation: 'Utopia' }, image: null },
  ],
};

/** Topic display metadata */
export const TOPIC_META = {
  cricket:     { label: 'Cricket',     icon: '🏏', description: 'Build the best cricket XI' },
  football:    { label: 'Football',    icon: '⚽', description: 'Assemble your dream XI' },
  superheroes: { label: 'Superheroes', icon: '🦸', description: 'Pick your superhero squad' },
  anime:       { label: 'Anime',       icon: '⚡', description: 'Draft the ultimate anime team' },
  pokemon:     { label: 'Pokémon',     icon: '🔴', description: 'Build your Pokémon team' },
  actors:      { label: 'Actors',      icon: '🎬', description: 'Cast your award-winning film' },
  villains:    { label: 'Villains',    icon: '😈', description: 'Assemble the ultimate villain team' },
};
