import { PlantSpecies, PlantStage, PlantedTree, GardenState, LandPlot } from '../types';

export interface SpeciesInfo {
  species: PlantSpecies;
  name: string;
  jpName: string;
  filmLore: string;
  description: string;
  rarity: 'Common' | 'Rare' | 'Mythic' | 'Legendary';
  seedCost: number; // in Forest Coins
  watersNeededPerStage: number;
  unlockedByDefault: boolean;
  accentColor: string;
  foliageColor: string;
  symbol: string;
  bloomReward: { dewDrops: number; forestCoins: number; xp: number };
}

export const PLANT_SPECIES_CATALOG: Record<PlantSpecies, SpeciesInfo> = {
  camphor_tree: {
    species: 'camphor_tree',
    name: "Totoro's Great Camphor Tree",
    jpName: 'トトロのクスノキ',
    filmLore: 'My Neighbor Totoro',
    description: 'An ancient guardian tree rooted deep in the earth. Friendly forest spirits shelter in its grand canopy.',
    rarity: 'Legendary',
    seedCost: 80,
    watersNeededPerStage: 3,
    unlockedByDefault: true,
    accentColor: '#5B8C32',
    foliageColor: '#386618',
    symbol: '🌳',
    bloomReward: { dewDrops: 5, forestCoins: 40, xp: 120 },
  },
  cherry_blossom: {
    species: 'cherry_blossom',
    name: 'Spirited Sakura Tree',
    jpName: '千尋の桜',
    filmLore: 'Spirited Away',
    description: 'Delicate pink petals that dance gently in the evening wind near the enchanted bathhouse bridge.',
    rarity: 'Rare',
    seedCost: 45,
    watersNeededPerStage: 2,
    unlockedByDefault: true,
    accentColor: '#F472B6',
    foliageColor: '#FB7185',
    symbol: '🌸',
    bloomReward: { dewDrops: 3, forestCoins: 25, xp: 75 },
  },
  sky_bonsai: {
    species: 'sky_bonsai',
    name: 'Laputa Sky Bonsai',
    jpName: 'ラピュタの巨樹',
    filmLore: 'Castle in the Sky',
    description: 'Vines intertwined with ancient stones and glowing blue levitation crystals from the floating castle.',
    rarity: 'Mythic',
    seedCost: 120,
    watersNeededPerStage: 4,
    unlockedByDefault: false,
    accentColor: '#38BDF8',
    foliageColor: '#0284C7',
    symbol: '🌿',
    bloomReward: { dewDrops: 8, forestCoins: 65, xp: 200 },
  },
  wildflower_meadow: {
    species: 'wildflower_meadow',
    name: "Howl's Valley Wildflowers",
    jpName: 'ハウルの花畑',
    filmLore: "Howl's Moving Castle",
    description: 'A vibrant carpet of alpine poppies, lupines, and cornflowers from the secret mountain hideaway.',
    rarity: 'Common',
    seedCost: 20,
    watersNeededPerStage: 2,
    unlockedByDefault: true,
    accentColor: '#A855F7',
    foliageColor: '#8B5CF6',
    symbol: '🌻',
    bloomReward: { dewDrops: 2, forestCoins: 15, xp: 45 },
  },
  kodama_mushrooms: {
    species: 'kodama_mushrooms',
    name: 'Kodama Moss & Mushroom Grove',
    jpName: '木霊の森',
    filmLore: 'Princess Mononoke',
    description: 'Bioluminescent mushrooms and deep velvet moss where playful tree spirits rattle their heads in joy.',
    rarity: 'Rare',
    seedCost: 60,
    watersNeededPerStage: 2,
    unlockedByDefault: false,
    accentColor: '#34D399',
    foliageColor: '#059669',
    symbol: '🍄',
    bloomReward: { dewDrops: 4, forestCoins: 35, xp: 100 },
  },
  citrus_grove: {
    species: 'citrus_grove',
    name: "Kiki's Coastal Sweet Citrus",
    jpName: 'キキのオレンジ',
    filmLore: "Kiki's Delivery Service",
    description: 'Sun-drenched lemon and orange blossoms growing on the seaside cliffs overlooking Koriko harbor.',
    rarity: 'Common',
    seedCost: 30,
    watersNeededPerStage: 2,
    unlockedByDefault: true,
    accentColor: '#FB923C',
    foliageColor: '#EA580C',
    symbol: '🍊',
    bloomReward: { dewDrops: 3, forestCoins: 20, xp: 55 },
  },
  spirit_lotus: {
    species: 'spirit_lotus',
    name: 'Zen Bathhouse Lotus Pond',
    jpName: '精霊の蓮',
    filmLore: 'Spirited Away',
    description: 'A radiant water lily that floats above tranquil waters, surrounded by soft spirit fireflies.',
    rarity: 'Rare',
    seedCost: 70,
    watersNeededPerStage: 3,
    unlockedByDefault: false,
    accentColor: '#E879F9',
    foliageColor: '#C026D3',
    symbol: '🪷',
    bloomReward: { dewDrops: 5, forestCoins: 40, xp: 110 },
  },
  golden_ginkgo: {
    species: 'golden_ginkgo',
    name: 'Autumn Golden Ginkgo Tree',
    jpName: '黄金の銀杏',
    filmLore: 'The Wind Rises',
    description: 'Fan-shaped golden leaves that catch the autumn sunlight as breezes carry paper airplanes into the sky.',
    rarity: 'Mythic',
    seedCost: 100,
    watersNeededPerStage: 3,
    unlockedByDefault: false,
    accentColor: '#FBBF24',
    foliageColor: '#D97706',
    symbol: '🍂',
    bloomReward: { dewDrops: 6, forestCoins: 50, xp: 160 },
  },
};

export const GHIBLI_QUOTES = [
  {
    quote: "Trees and people used to be good friends.",
    speaker: "Mr. Kusakabe",
    film: "My Neighbor Totoro",
  },
  {
    quote: "No matter how many weapons you have, the world cannot live without love.",
    speaker: "Sheeta",
    film: "Castle in the Sky",
  },
  {
    quote: "Always believe in yourself. Do this and no matter where you are, you will have nothing to fear.",
    speaker: "The Baron",
    film: "The Cat Returns",
  },
  {
    quote: "You cannot change fate. However, you can rise to meet it, if you so choose.",
    speaker: "Hii-sama",
    film: "Princess Mononoke",
  },
  {
    quote: "A heart's a heavy burden, but the sunlight helps it bloom.",
    speaker: "Sophie Hatter",
    film: "Howl's Moving Castle",
  },
  {
    quote: "We each need to find our own inspiration. Sometimes it’s not easy.",
    speaker: "Ursula",
    film: "Kiki's Delivery Service",
  },
  {
    quote: "Once you've met someone, you never really forget them.",
    speaker: "Zeniba",
    film: "Spirited Away",
  },
];

const INITIAL_PLOTS_COUNT = 16; // 4x4 Grid

export const DEFAULT_SEED_INVENTORY: Record<PlantSpecies, number> = {
  camphor_tree: 1,
  cherry_blossom: 1,
  wildflower_meadow: 2,
  citrus_grove: 1,
  kodama_mushrooms: 0,
  sky_bonsai: 0,
  spirit_lotus: 0,
  golden_ginkgo: 0,
};

export function getRandomSeedDrop(focusMinutes: number): { species: PlantSpecies; count: number } {
  // Higher focus minutes unlock rarer seeds
  const roll = Math.random();
  if (focusMinutes >= 45) {
    if (roll < 0.25) return { species: 'sky_bonsai', count: 1 };
    if (roll < 0.50) return { species: 'golden_ginkgo', count: 1 };
    if (roll < 0.75) return { species: 'spirit_lotus', count: 1 };
    return { species: 'kodama_mushrooms', count: 1 };
  } else if (focusMinutes >= 25) {
    if (roll < 0.3) return { species: 'cherry_blossom', count: 1 };
    if (roll < 0.6) return { species: 'kodama_mushrooms', count: 1 };
    if (roll < 0.8) return { species: 'citrus_grove', count: 1 };
    return { species: 'camphor_tree', count: 1 };
  } else {
    if (roll < 0.5) return { species: 'wildflower_meadow', count: 1 };
    if (roll < 0.8) return { species: 'citrus_grove', count: 1 };
    return { species: 'cherry_blossom', count: 1 };
  }
}

export function getInitialGardenState(): GardenState {
  const plots: LandPlot[] = [];

  // Unlock initial 2x2 or 3x2 center plots
  const unlockedIndices = [5, 6, 9, 10]; // Center 4 plots in a 4x4 grid (0-15)

  for (let i = 0; i < INITIAL_PLOTS_COUNT; i++) {
    const isUnlocked = unlockedIndices.includes(i);
    // Outer plots have escalating unlock costs: 30 -> 50 -> 80 -> 120
    const distanceFromCenter = Math.abs((i % 4) - 1.5) + Math.abs(Math.floor(i / 4) - 1.5);
    const unlockCost = isUnlocked ? 0 : Math.round(25 + distanceFromCenter * 18);

    plots.push({
      index: i,
      isUnlocked,
      unlockCost,
    });
  }

  // Starter Tree in plot 5
  const starterTreeId = 'tree_starter_camphor';
  const starterTree: PlantedTree = {
    id: starterTreeId,
    plotIndex: 5,
    species: 'camphor_tree',
    stage: 'sprout',
    waterLevel: 80,
    growthProgress: 40,
    plantedAt: new Date().toISOString(),
    totalWaters: 1,
    nickname: 'Totoro Sprout',
  };

  plots[5].plantId = starterTreeId;

  return {
    plots,
    plantedTrees: [starterTree],
    dewDrops: 8, // Starter Dew Drops
    sunlightOrbs: 10,
    growthPoints: 120, // Starter Growth Points earned from XP
    forestCoins: 60, // Starter Coins
    seedInventory: { ...DEFAULT_SEED_INVENTORY },
    forestLevel: 1,
    totalFocusMinutes: 25,
    completedSessionsCount: 1,
    totalXpContributed: 100,
    activeWeather: 'sunny',
    selectedSeedToPlant: null,
  };
}

const GARDEN_STORAGE_KEY = 'oopsly_ghibli_garden';

export function loadGardenState(): GardenState {
  try {
    const saved = localStorage.getItem(GARDEN_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Ensure all fields exist
      if (Array.isArray(parsed.plots) && Array.isArray(parsed.plantedTrees)) {
        return {
          ...parsed,
          growthPoints: typeof parsed.growthPoints === 'number' ? parsed.growthPoints : 100,
          seedInventory: parsed.seedInventory ? { ...DEFAULT_SEED_INVENTORY, ...parsed.seedInventory } : { ...DEFAULT_SEED_INVENTORY },
          totalXpContributed: typeof parsed.totalXpContributed === 'number' ? parsed.totalXpContributed : 0,
        };
      }
    }
  } catch (e) {}
  return getInitialGardenState();
}

export function saveGardenState(state: GardenState) {
  try {
    localStorage.setItem(GARDEN_STORAGE_KEY, JSON.stringify(state));
  } catch (e) {}
}

export const STAGE_NAMES: Record<PlantStage, { label: string; progressPercent: number }> = {
  seed: { label: 'Seed in Fertile Soil', progressPercent: 15 },
  sprout: { label: 'Green Sprout', progressPercent: 40 },
  sapling: { label: 'Young Forest Sapling', progressPercent: 70 },
  blooming: { label: 'Lush Blooming Tree', progressPercent: 95 },
  ancient: { label: 'Ancient Spirit Guardian', progressPercent: 100 },
};
