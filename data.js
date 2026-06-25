import { 
  collection, 
  getDocs, 
  getDoc,
  doc, 
  setDoc, 
  writeBatch 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db } from "./firebase-init.js";
import { OPEN_ENGINE_API_KEY, OPEN_ENGINE_EMAIL } from "./config.js";


// Private Default Mockup Catalogs (used for seeding Firestore on first load)
const DEFAULT_INGREDIENTS = {
  maize_meal: {
    id: 'maize_meal',
    name: 'Maize Meal (Ugali Flour)',
    category: 'Grains & Tubers',
    basePrice: 1.20,
    unit: 'kg',
    nutrition: { calories: 362, carbs: 77, protein: 9, fat: 4, fiber: 7, sodium: 5, iron: 2.4, calcium: 7, vitC: 0 },
    regionalMultipliers: { kenya: 0.8, tanzania: 0.7, uganda: 0.7, uk: 1.5, germany: 1.6, france: 1.5, usa: 1.3, canada: 1.4, brazil: 0.9 },
    seasonalMultipliers: { spring: 1.0, summer: 1.1, autumn: 0.9, winter: 1.2 }
  },
  rice: {
    id: 'rice',
    name: 'White Rice',
    category: 'Grains & Tubers',
    basePrice: 1.50,
    unit: 'kg',
    nutrition: { calories: 365, carbs: 80, protein: 7, fat: 0.6, fiber: 1.3, sodium: 1, iron: 0.8, calcium: 9, vitC: 0 },
    regionalMultipliers: { kenya: 1.1, tanzania: 0.9, uganda: 1.0, uk: 1.2, germany: 1.3, france: 1.3, usa: 1.1, canada: 1.2, brazil: 0.8 },
    seasonalMultipliers: { spring: 1.0, summer: 1.0, autumn: 0.95, winter: 1.05 }
  },
  potatoes: {
    id: 'potatoes',
    name: 'Potatoes',
    category: 'Grains & Tubers',
    basePrice: 1.10,
    unit: 'kg',
    nutrition: { calories: 77, carbs: 17, protein: 2, fat: 0.1, fiber: 2.2, sodium: 6, iron: 0.8, calcium: 12, vitC: 19.7 },
    regionalMultipliers: { kenya: 0.7, tanzania: 0.6, uganda: 0.6, uk: 0.9, germany: 0.8, france: 0.9, usa: 1.0, canada: 1.0, brazil: 1.1 },
    seasonalMultipliers: { spring: 1.2, summer: 0.8, autumn: 0.7, winter: 1.1 }
  },
  sweet_potatoes: {
    id: 'sweet_potatoes',
    name: 'Sweet Potatoes',
    category: 'Grains & Tubers',
    basePrice: 1.40,
    unit: 'kg',
    nutrition: { calories: 86, carbs: 20, protein: 1.6, fat: 0.1, fiber: 3, sodium: 55, iron: 0.6, calcium: 30, vitC: 2.4 },
    regionalMultipliers: { kenya: 0.6, tanzania: 0.5, uganda: 0.5, uk: 1.4, germany: 1.5, france: 1.4, usa: 1.1, canada: 1.2, brazil: 0.8 },
    seasonalMultipliers: { spring: 1.1, summer: 1.0, autumn: 0.8, winter: 1.2 }
  },
  oats: {
    id: 'oats',
    name: 'Rolled Oats',
    category: 'Grains & Tubers',
    basePrice: 1.80,
    unit: 'kg',
    nutrition: { calories: 389, carbs: 66, protein: 16.9, fat: 6.9, fiber: 10.6, sodium: 2, iron: 4.7, calcium: 54, vitC: 0 },
    regionalMultipliers: { kenya: 1.5, tanzania: 1.6, uganda: 1.6, uk: 0.8, germany: 0.8, france: 0.9, usa: 0.9, canada: 0.7, brazil: 1.2 },
    seasonalMultipliers: { spring: 1.0, summer: 1.0, autumn: 0.9, winter: 1.1 }
  },
  bread: {
    id: 'bread',
    name: 'Whole Wheat Bread',
    category: 'Grains & Tubers',
    basePrice: 2.00,
    unit: 'kg',
    nutrition: { calories: 247, carbs: 41, protein: 13, fat: 3.4, fiber: 7, sodium: 400, iron: 2.5, calcium: 160, vitC: 0 },
    regionalMultipliers: { kenya: 1.0, tanzania: 1.0, uganda: 1.1, uk: 0.8, germany: 0.8, france: 0.7, usa: 0.9, canada: 0.9, brazil: 1.0 },
    seasonalMultipliers: { spring: 1.0, summer: 1.0, autumn: 1.0, winter: 1.0 }
  },
  beef: {
    id: 'beef',
    name: 'Beef Stew Cuts',
    category: 'Proteins',
    basePrice: 7.50,
    unit: 'kg',
    nutrition: { calories: 250, carbs: 0, protein: 26, fat: 17, fiber: 0, sodium: 72, iron: 2.6, calcium: 18, vitC: 0 },
    regionalMultipliers: { kenya: 0.7, tanzania: 0.6, uganda: 0.6, uk: 1.3, germany: 1.4, france: 1.5, usa: 1.2, canada: 1.3, brazil: 0.8 },
    seasonalMultipliers: { spring: 1.0, summer: 1.05, autumn: 1.0, winter: 1.1 }
  },
  chicken_breast: {
    id: 'chicken_breast',
    name: 'Chicken Breast',
    category: 'Proteins',
    basePrice: 6.50,
    unit: 'kg',
    nutrition: { calories: 165, carbs: 0, protein: 31, fat: 3.6, fiber: 0, sodium: 74, iron: 1.0, calcium: 15, vitC: 0 },
    regionalMultipliers: { kenya: 0.9, tanzania: 0.8, uganda: 0.8, uk: 1.2, germany: 1.1, france: 1.2, usa: 1.0, canada: 1.1, brazil: 0.7 },
    seasonalMultipliers: { spring: 1.0, summer: 1.0, autumn: 1.0, winter: 1.05 }
  },
  tilapia: {
    id: 'tilapia',
    name: 'Fresh Tilapia Fish',
    category: 'Proteins',
    basePrice: 5.50,
    unit: 'kg',
    nutrition: { calories: 129, carbs: 0, protein: 26, fat: 2.7, fiber: 0, sodium: 56, iron: 0.6, calcium: 14, vitC: 0 },
    regionalMultipliers: { kenya: 0.7, tanzania: 0.6, uganda: 0.6, uk: 1.5, germany: 1.6, france: 1.5, usa: 1.3, canada: 1.4, brazil: 1.1 },
    seasonalMultipliers: { spring: 1.1, summer: 0.9, autumn: 1.0, winter: 1.2 }
  },
  salmon: {
    id: 'salmon',
    name: 'Salmon Fillet',
    category: 'Proteins',
    basePrice: 15.00,
    unit: 'kg',
    nutrition: { calories: 206, carbs: 0, protein: 22, fat: 13, fiber: 0, sodium: 59, iron: 0.3, calcium: 9, vitC: 0 },
    regionalMultipliers: { kenya: 2.2, tanzania: 2.4, uganda: 2.4, uk: 0.9, germany: 1.0, france: 0.9, usa: 1.0, canada: 0.9, brazil: 1.5 },
    seasonalMultipliers: { spring: 1.1, summer: 0.8, autumn: 1.0, winter: 1.2 }
  },
  beans: {
    id: 'beans',
    name: 'Dry Beans (Kidney/Pinto)',
    category: 'Proteins',
    basePrice: 2.20,
    unit: 'kg',
    nutrition: { calories: 333, carbs: 60, protein: 24, fat: 0.8, fiber: 25, sodium: 24, iron: 8.2, calcium: 143, vitC: 4.5 },
    regionalMultipliers: { kenya: 0.6, tanzania: 0.5, uganda: 0.5, uk: 1.2, germany: 1.2, france: 1.3, usa: 1.0, canada: 1.1, brazil: 0.7 },
    seasonalMultipliers: { spring: 1.0, summer: 1.0, autumn: 0.9, winter: 1.1 }
  },
  eggs: {
    id: 'eggs',
    name: 'Eggs',
    category: 'Proteins',
    basePrice: 3.00,
    unit: 'kg',
    nutrition: { calories: 155, carbs: 1.1, protein: 13, fat: 11, fiber: 0, sodium: 124, iron: 1.8, calcium: 56, vitC: 0 },
    regionalMultipliers: { kenya: 0.8, tanzania: 0.7, uganda: 0.7, uk: 1.0, germany: 1.0, france: 1.1, usa: 0.9, canada: 1.0, brazil: 0.8 },
    seasonalMultipliers: { spring: 0.9, summer: 1.0, autumn: 1.0, winter: 1.1 }
  },
  sukuma_wiki: {
    id: 'sukuma_wiki',
    name: 'Sukuma Wiki (Collard Greens)',
    category: 'Produce',
    basePrice: 1.00,
    unit: 'kg',
    nutrition: { calories: 32, carbs: 5.4, protein: 3, fat: 0.6, fiber: 4, sodium: 15, iron: 1.7, calcium: 232, vitC: 35.3 },
    regionalMultipliers: { kenya: 0.4, tanzania: 0.4, uganda: 0.4, uk: 1.8, germany: 1.9, france: 1.8, usa: 1.5, canada: 1.6, brazil: 1.2 },
    seasonalMultipliers: { spring: 0.8, summer: 1.2, autumn: 0.9, winter: 1.3 }
  },
  spinach: {
    id: 'spinach',
    name: 'Spinach',
    category: 'Produce',
    basePrice: 2.50,
    unit: 'kg',
    nutrition: { calories: 23, carbs: 3.6, protein: 2.9, fat: 0.4, fiber: 2.2, sodium: 79, iron: 2.7, calcium: 99, vitC: 28.1 },
    regionalMultipliers: { kenya: 0.8, tanzania: 0.8, uganda: 0.9, uk: 0.9, germany: 0.9, france: 1.0, usa: 1.0, canada: 1.0, brazil: 1.1 },
    seasonalMultipliers: { spring: 0.7, summer: 1.1, autumn: 0.8, winter: 1.4 }
  },
  tomatoes: {
    id: 'tomatoes',
    name: 'Tomatoes',
    category: 'Produce',
    basePrice: 1.80,
    unit: 'kg',
    nutrition: { calories: 18, carbs: 3.9, protein: 0.9, fat: 0.2, fiber: 1.2, sodium: 5, iron: 0.3, calcium: 10, vitC: 13.7 },
    regionalMultipliers: { kenya: 0.6, tanzania: 0.5, uganda: 0.6, uk: 1.2, germany: 1.1, france: 1.0, usa: 1.0, canada: 1.1, brazil: 0.8 },
    seasonalMultipliers: { spring: 1.3, summer: 0.7, autumn: 0.8, winter: 1.5 }
  },
  cabbage: {
    id: 'cabbage',
    name: 'Cabbage',
    category: 'Produce',
    basePrice: 0.90,
    unit: 'kg',
    nutrition: { calories: 25, carbs: 5.8, protein: 1.3, fat: 0.1, fiber: 2.5, sodium: 18, iron: 0.5, calcium: 40, vitC: 36.6 },
    regionalMultipliers: { kenya: 0.5, tanzania: 0.4, uganda: 0.5, uk: 0.9, germany: 0.8, france: 0.9, usa: 1.0, canada: 1.0, brazil: 0.8 },
    seasonalMultipliers: { spring: 1.0, summer: 0.9, autumn: 0.7, winter: 1.2 }
  },
  onions: {
    id: 'onions',
    name: 'Onions',
    category: 'Produce',
    basePrice: 1.10,
    unit: 'kg',
    nutrition: { calories: 40, carbs: 9.3, protein: 1.1, fat: 0.1, fiber: 1.7, sodium: 4, iron: 0.2, calcium: 23, vitC: 7.4 },
    regionalMultipliers: { kenya: 0.7, tanzania: 0.6, uganda: 0.6, uk: 0.9, germany: 0.9, france: 0.9, usa: 1.0, canada: 1.0, brazil: 0.9 },
    seasonalMultipliers: { spring: 1.1, summer: 0.9, autumn: 0.8, winter: 1.2 }
  },
  broccoli: {
    id: 'broccoli',
    name: 'Broccoli',
    category: 'Produce',
    basePrice: 3.00,
    unit: 'kg',
    nutrition: { calories: 34, carbs: 7, protein: 2.8, fat: 0.4, fiber: 2.6, sodium: 33, iron: 0.7, calcium: 47, vitC: 89.2 },
    regionalMultipliers: { kenya: 1.5, tanzania: 1.6, uganda: 1.5, uk: 0.8, germany: 0.8, france: 0.8, usa: 0.9, canada: 0.9, brazil: 1.3 },
    seasonalMultipliers: { spring: 0.9, summer: 1.2, autumn: 0.8, winter: 1.3 }
  },
  bananas: {
    id: 'bananas',
    name: 'Bananas',
    category: 'Produce',
    basePrice: 1.30,
    unit: 'kg',
    nutrition: { calories: 89, carbs: 23, protein: 1.1, fat: 0.3, fiber: 2.6, sodium: 1, iron: 0.3, calcium: 5, vitC: 8.7 },
    regionalMultipliers: { kenya: 0.4, tanzania: 0.3, uganda: 0.3, uk: 1.3, germany: 1.4, france: 1.3, usa: 1.0, canada: 1.1, brazil: 0.5 },
    seasonalMultipliers: { spring: 1.0, summer: 1.0, autumn: 1.0, winter: 1.0 }
  },
  apples: {
    id: 'apples',
    name: 'Apples',
    category: 'Produce',
    basePrice: 2.20,
    unit: 'kg',
    nutrition: { calories: 52, carbs: 14, protein: 0.3, fat: 0.2, fiber: 2.4, sodium: 1, iron: 0.1, calcium: 6, vitC: 4.6 },
    regionalMultipliers: { kenya: 1.8, tanzania: 1.9, uganda: 1.9, uk: 0.8, germany: 0.7, france: 0.7, usa: 0.9, canada: 0.8, brazil: 1.2 },
    seasonalMultipliers: { spring: 1.3, summer: 1.1, autumn: 0.7, winter: 1.0 }
  },
  milk: {
    id: 'milk',
    name: 'Cow Milk',
    category: 'Dairy & Alternatives',
    basePrice: 1.20,
    unit: 'L',
    nutrition: { calories: 42, carbs: 5, protein: 3.4, fat: 1, fiber: 0, sodium: 44, iron: 0, calcium: 120, vitC: 0 },
    regionalMultipliers: { kenya: 0.7, tanzania: 0.6, uganda: 0.6, uk: 0.9, germany: 0.9, france: 1.0, usa: 1.0, canada: 1.2, brazil: 0.8 },
    seasonalMultipliers: { spring: 0.9, summer: 1.0, autumn: 1.0, winter: 1.1 }
  },
  cheddar_cheese: {
    id: 'cheddar_cheese',
    name: 'Cheddar Cheese',
    category: 'Dairy & Alternatives',
    basePrice: 8.00,
    unit: 'kg',
    nutrition: { calories: 403, carbs: 1.3, protein: 25, fat: 33, fiber: 0, sodium: 621, iron: 0.2, calcium: 721, vitC: 0 },
    regionalMultipliers: { kenya: 1.8, tanzania: 1.9, uganda: 1.9, uk: 0.7, germany: 0.8, france: 0.8, usa: 0.9, canada: 1.0, brazil: 1.3 },
    seasonalMultipliers: { spring: 1.0, summer: 1.0, autumn: 1.0, winter: 1.0 }
  },
  cooking_oil: {
    id: 'cooking_oil',
    name: 'Vegetable Cooking Oil',
    category: 'Pantry',
    basePrice: 2.00,
    unit: 'L',
    nutrition: { calories: 884, carbs: 0, protein: 0, fat: 100, fiber: 0, sodium: 0, iron: 0, calcium: 0, vitC: 0 },
    regionalMultipliers: { kenya: 1.1, tanzania: 1.0, uganda: 1.0, uk: 0.9, germany: 0.9, france: 0.9, usa: 1.0, canada: 1.0, brazil: 0.9 },
    seasonalMultipliers: { spring: 1.0, summer: 1.0, autumn: 1.0, winter: 1.0 }
  },
  peanut_butter: {
    id: 'peanut_butter',
    name: 'Peanut Butter',
    category: 'Pantry',
    basePrice: 4.50,
    unit: 'kg',
    nutrition: { calories: 588, carbs: 20, protein: 25, fat: 50, fiber: 6, sodium: 429, iron: 1.9, calcium: 43, vitC: 0 },
    regionalMultipliers: { kenya: 0.9, tanzania: 0.8, uganda: 0.8, uk: 1.0, germany: 1.1, france: 1.1, usa: 0.8, canada: 0.9, brazil: 0.9 },
    seasonalMultipliers: { spring: 1.0, summer: 1.0, autumn: 1.0, winter: 1.0 }
  },
  butter: {
    id: 'butter',
    name: 'Butter',
    category: 'Pantry',
    basePrice: 6.00,
    unit: 'kg',
    nutrition: { calories: 717, carbs: 0.1, protein: 0.9, fat: 81, fiber: 0, sodium: 11, iron: 0, calcium: 24, vitC: 0 },
    regionalMultipliers: { kenya: 1.4, tanzania: 1.5, uganda: 1.5, uk: 0.8, germany: 0.7, france: 0.7, usa: 0.9, canada: 1.0, brazil: 1.2 },
    seasonalMultipliers: { spring: 1.0, summer: 1.0, autumn: 1.0, winter: 1.0 }
  },
  lamb_chops: {
    id: 'lamb_chops',
    name: 'Premium Lamb Chops',
    category: 'Proteins',
    basePrice: 18.00,
    unit: 'kg',
    nutrition: { calories: 294, carbs: 0, protein: 25, fat: 21, fiber: 0, sodium: 72, iron: 1.9, calcium: 17, vitC: 0 },
    regionalMultipliers: { kenya: 1.1, tanzania: 1.0, uganda: 1.0, uk: 0.9, germany: 0.9, france: 0.9, usa: 1.1, canada: 1.1, brazil: 1.2 },
    seasonalMultipliers: { spring: 1.0, summer: 1.0, autumn: 1.05, winter: 1.1 }
  },
  avocado: {
    id: 'avocado',
    name: 'Avocado',
    category: 'Produce',
    basePrice: 3.50,
    unit: 'kg',
    nutrition: { calories: 160, carbs: 8.5, protein: 2, fat: 14.7, fiber: 6.7, sodium: 7, iron: 0.6, calcium: 12, vitC: 10 },
    regionalMultipliers: { kenya: 0.4, tanzania: 0.4, uganda: 0.4, uk: 1.6, germany: 1.6, france: 1.6, usa: 1.2, canada: 1.3, brazil: 0.5 },
    seasonalMultipliers: { spring: 0.9, summer: 0.8, autumn: 1.1, winter: 1.2 }
  },
  greek_yogurt: {
    id: 'greek_yogurt',
    name: 'Greek Yogurt',
    category: 'Dairy & Alternatives',
    basePrice: 5.50,
    unit: 'kg',
    nutrition: { calories: 97, carbs: 4, protein: 9, fat: 5, fiber: 0, sodium: 36, iron: 0, calcium: 100, vitC: 0 },
    regionalMultipliers: { kenya: 1.5, tanzania: 1.5, uganda: 1.5, uk: 0.8, germany: 0.8, france: 0.8, usa: 0.9, canada: 0.9, brazil: 1.2 },
    seasonalMultipliers: { spring: 1.0, summer: 1.0, autumn: 1.0, winter: 1.0 }
  },
  almonds: {
    id: 'almonds',
    name: 'Almonds (Nuts)',
    category: 'Pantry',
    basePrice: 14.00,
    unit: 'kg',
    nutrition: { calories: 579, carbs: 22, protein: 21, fat: 49, fiber: 12, sodium: 1, iron: 3.7, calcium: 269, vitC: 0 },
    regionalMultipliers: { kenya: 1.6, tanzania: 1.7, uganda: 1.7, uk: 0.9, germany: 0.9, france: 0.9, usa: 0.8, canada: 0.9, brazil: 1.3 },
    seasonalMultipliers: { spring: 1.0, summer: 1.0, autumn: 1.0, winter: 1.0 }
  },
  ramen_noodles: {
    id: 'ramen_noodles',
    name: 'Instant Ramen Noodles',
    category: 'Grains & Tubers',
    basePrice: 0.90,
    unit: 'kg',
    nutrition: { calories: 436, carbs: 64, protein: 9, fat: 16, fiber: 2.4, sodium: 800, iron: 3.5, calcium: 15, vitC: 0 },
    regionalMultipliers: { kenya: 1.0, tanzania: 1.0, uganda: 1.0, uk: 1.0, germany: 1.0, france: 1.0, usa: 1.0, canada: 1.0, brazil: 1.0 },
    seasonalMultipliers: { spring: 1.0, summer: 1.0, autumn: 1.0, winter: 1.0 }
  },
  pasta: {
    id: 'pasta',
    name: 'Spaghetti / Pasta',
    category: 'Grains & Tubers',
    basePrice: 1.20,
    unit: 'kg',
    nutrition: { calories: 371, carbs: 75, protein: 13, fat: 1.5, fiber: 3.2, sodium: 6, iron: 1.3, calcium: 21, vitC: 0 },
    regionalMultipliers: { kenya: 1.1, tanzania: 1.0, uganda: 1.0, uk: 0.9, germany: 0.9, france: 0.9, usa: 1.0, canada: 1.0, brazil: 1.0 },
    seasonalMultipliers: { spring: 1.0, summer: 1.0, autumn: 1.0, winter: 1.0 }
  },
  garlic: {
    id: 'garlic',
    name: 'Garlic Bulbs',
    category: 'Produce',
    basePrice: 4.00,
    unit: 'kg',
    nutrition: { calories: 149, carbs: 33, protein: 6.4, fat: 0.5, fiber: 2.1, sodium: 17, iron: 1.7, calcium: 181, vitC: 31.2 },
    regionalMultipliers: { kenya: 1.0, tanzania: 1.0, uganda: 1.0, uk: 1.0, germany: 1.0, france: 1.0, usa: 1.0, canada: 1.0, brazil: 1.0 },
    seasonalMultipliers: { spring: 1.0, summer: 1.0, autumn: 1.0, winter: 1.0 }
  },
  green_onions: {
    id: 'green_onions',
    name: 'Green Onions (Scallions)',
    category: 'Produce',
    basePrice: 1.55,
    unit: 'kg',
    nutrition: { calories: 32, carbs: 7.3, protein: 1.8, fat: 0.2, fiber: 2.6, sodium: 16, iron: 1.5, calcium: 72, vitC: 18.8 },
    regionalMultipliers: { kenya: 0.8, tanzania: 0.8, uganda: 0.8, uk: 1.1, germany: 1.1, france: 1.1, usa: 1.0, canada: 1.0, brazil: 0.9 },
    seasonalMultipliers: { spring: 0.9, summer: 1.1, autumn: 1.0, winter: 1.0 }
  }
};

const DEFAULT_REGIONS = {
  name: 'Default Region List',
  kenya: { name: 'Kenya (East Africa)', currency: 'KES', usdRate: 130, label: 'KES', climate: 'tropical', defaultAllowance: 25000 },
  tanzania: { name: 'Tanzania (East Africa)', currency: 'TZS', usdRate: 2500, label: 'TZS', climate: 'tropical', defaultAllowance: 450000 },
  uganda: { name: 'Uganda (East Africa)', currency: 'UGX', usdRate: 3800, label: 'UGX', climate: 'tropical', defaultAllowance: 700000 },
  uk: { name: 'United Kingdom', currency: 'GBP', usdRate: 0.79, label: '£', climate: 'temperate', defaultAllowance: 160 },
  germany: { name: 'Germany', currency: 'EUR', usdRate: 0.92, label: '€', climate: 'temperate', defaultAllowance: 180 },
  france: { name: 'France', currency: 'EUR', usdRate: 0.92, label: '€', climate: 'temperate', defaultAllowance: 180 },
  usa: { name: 'United States', currency: 'USD', usdRate: 1.0, label: '$', climate: 'temperate', defaultAllowance: 200 },
  canada: { name: 'Canada', currency: 'CAD', usdRate: 1.36, label: 'C$', climate: 'temperate', defaultAllowance: 250 },
  brazil: { name: 'Brazil', currency: 'BRL', usdRate: 5.10, label: 'R$', climate: 'tropical', defaultAllowance: 900 }
};

const DEFAULT_SEASONS = {
  spring: { name: 'Spring / Long Rains', desc: 'Mild weather or heavy rainfall. Good for fresh greens.' },
  summer: { name: 'Summer / Short Dry', desc: 'Hot and dry. Peak season for tomatoes, fruits, and staples.' },
  autumn: { name: 'Autumn / Short Rains', desc: 'Cooling down or light showers. Harvest season for tubers & cabbage.' },
  winter: { name: 'Winter / Long Dry', desc: 'Cold or long dry spell. Lean season; fresh produce is expensive.' }
};

const DEFAULT_DIETARY_PRESETS = {
  none: { name: 'Standard (No Restrictions)', desc: 'Include all foods.' },
  vegetarian: { name: 'Vegetarian', desc: 'Exclude meat, poultry, and fish.' },
  vegan: { name: 'Vegan', desc: 'Exclude all animal products (meat, dairy, eggs).' },
  gluten_free: { name: 'Gluten-Free', desc: 'Exclude wheat products.' },
  dairy_free: { name: 'Dairy-Free', desc: 'Exclude milk, butter, cheese.' },
  low_sodium: { name: 'Low Sodium', desc: 'Limit high-sodium items (processed breads, cheddar cheese, peanut butter).' }
};

const DEFAULT_RECIPES = [
  {
    id: 'ugali_sukuma',
    name: 'Ugali with Sukuma Wiki & Tomatoes',
    mealType: 'dinner',
    prepTime: 25,
    servings: 4,
    dietary: ['vegetarian', 'vegan', 'gluten_free', 'dairy_free', 'low_sodium'],
    tag: 'budget_saver',
    ingredients: [
      { id: 'maize_meal', amount: 400 },
      { id: 'sukuma_wiki', amount: 500 },
      { id: 'tomatoes', amount: 200 },
      { id: 'onions', amount: 100 },
      { id: 'cooking_oil', amount: 30 }
    ],
    instructions: [
      'Boil 4 cups of water in a pot. Gradually add maize meal while stirring continuously to prevent lumps.',
      'Reduce heat, press the mixture against the sides of the pot with a wooden spoon until it gathers into a firm dough (Ugali). Cover and let steam for 5 minutes, then shape and set aside.',
      'Heat oil in a pan, add chopped onions, and sauté until golden brown.',
      'Add diced tomatoes and cook until soft and pulpy.',
      'Add shredded sukuma wiki (collard greens), stir well, cover, and steam on low heat for 5-8 minutes until tender but still vibrant green.',
      'Serve warm ugali alongside the collard greens.'
    ],
    description: 'A traditional East African staple meal that is highly affordable, nutritious, and filling.'
  },
  {
    id: 'beef_stew_ugali',
    name: 'Beef Stew with Ugali & Sukuma Wiki',
    mealType: 'dinner',
    prepTime: 45,
    servings: 4,
    dietary: ['gluten_free', 'dairy_free'],
    tag: 'budget_saver',
    ingredients: [
      { id: 'maize_meal', amount: 300 },
      { id: 'beef', amount: 400 },
      { id: 'sukuma_wiki', amount: 300 },
      { id: 'tomatoes', amount: 200 },
      { id: 'onions', amount: 100 },
      { id: 'cooking_oil', amount: 40 }
    ],
    instructions: [
      'Heat 20mL of oil in a pot, add half the chopped onions and the beef cubes. Sear beef until browned.',
      'Add chopped tomatoes and cover. Simmer on low heat for 20-30 minutes until beef is tender, adding a splash of water if needed.',
      'Prepare ugali in a separate pot using the maize meal and boiling water.',
      'Sauté the remaining onions and sukuma wiki in another pan with 20mL oil for 5 minutes.',
      'Serve beef stew hot with ugali and sukuma wiki.'
    ],
    description: 'A comforting, high-protein family meal pairing tender beef stew with traditional grains and greens.'
  },
  {
    id: 'lentil_curry_rice',
    name: 'Savoury Lentil & Spinach Curry with Rice',
    mealType: 'dinner',
    prepTime: 30,
    servings: 4,
    dietary: ['vegetarian', 'vegan', 'gluten_free', 'dairy_free', 'low_sodium'],
    tag: 'budget_saver',
    ingredients: [
      { id: 'rice', amount: 350 },
      { id: 'beans', amount: 250 },
      { id: 'spinach', amount: 200 },
      { id: 'tomatoes', amount: 200 },
      { id: 'onions', amount: 100 },
      { id: 'cooking_oil', amount: 20 }
    ],
    instructions: [
      'Rinse rice and boil in 700mL water until tender. Cover and let steam.',
      'Heat oil in a large pan and sauté chopped onions until translucent.',
      'Add chopped tomatoes and cook down for 5 minutes until soft.',
      'Add pre-boiled or canned beans, mashing a few slightly to thicken the curry. Simmer for 10 minutes.',
      'Stir in fresh spinach and cook until wilted (about 2-3 minutes).',
      'Serve the rich bean and spinach curry over hot fluffy rice.'
    ],
    description: 'An exceptionally cost-effective, plant-based curry that provides complete proteins, iron, and fiber.'
  },
  {
    id: 'oatmeal_banana',
    name: 'Creamy Peanut Butter & Banana Oatmeal',
    mealType: 'breakfast',
    prepTime: 10,
    servings: 4,
    dietary: ['vegetarian', 'vegan', 'dairy_free', 'low_sodium'],
    tag: 'quick_easy',
    ingredients: [
      { id: 'oats', amount: 250 },
      { id: 'bananas', amount: 400 },
      { id: 'peanut_butter', amount: 80 },
      { id: 'milk', amount: 500 }
    ],
    instructions: [
      'In a saucepan, bring milk and 500mL of water to a gentle boil.',
      'Stir in rolled oats and reduce heat to low. Simmer for 5-7 minutes, stirring occasionally, until creamy.',
      'Slice 2 bananas and stir them into the oats along with the peanut butter until fully incorporated.',
      'Divide oatmeal into bowls, top with remaining sliced bananas, and serve warm.'
    ],
    description: 'A quick, energizing breakfast packed with healthy fats, potassium, and slow-release carbohydrates.'
  },
  {
    id: 'chicken_rice_broccoli',
    name: 'Sesame Chicken Stir-Fry with Broccoli & Rice',
    mealType: 'lunch',
    prepTime: 25,
    servings: 4,
    dietary: ['gluten_free', 'dairy_free'],
    tag: 'quick_easy',
    ingredients: [
      { id: 'rice', amount: 350 },
      { id: 'chicken_breast', amount: 400 },
      { id: 'broccoli', amount: 300 },
      { id: 'onions', amount: 100 },
      { id: 'cooking_oil', amount: 30 }
    ],
    instructions: [
      'Cook rice in a pot until fluffy.',
      'Cut chicken breast into bite-sized cubes.',
      'Heat oil in a large skillet or wok, sauté chopped onions, then add chicken cubes. Cook until chicken is white and fully cooked through (7-8 minutes).',
      'Add broccoli florets and 2 tablespoons of water. Cover and steam for 3-4 minutes until broccoli is bright green and crisp-tender.',
      'Serve chicken and broccoli over a bed of warm rice.'
    ],
    description: 'A clean, high-protein lunch choice that provides balanced macros and plenty of vitamins.'
  },
  {
    id: 'egg_toast',
    name: 'Scrambled Eggs on Whole Wheat Toast',
    mealType: 'breakfast',
    prepTime: 12,
    servings: 2,
    dietary: ['vegetarian', 'low_sodium'],
    tag: 'quick_easy',
    ingredients: [
      { id: 'bread', amount: 120 },
      { id: 'eggs', amount: 200 },
      { id: 'butter', amount: 15 },
      { id: 'milk', amount: 30 }
    ],
    instructions: [
      'Whisk eggs together with milk in a bowl.',
      'Melt butter in a non-stick pan over medium-low heat.',
      'Pour in egg mixture, cook slowly, stirring gently to form soft curds.',
      'Toast the wheat bread slices.',
      'Spoon warm scrambled eggs over the toasted bread and serve immediately.'
    ],
    description: 'A classic, highly bioavailable protein breakfast that keeps the household full and focused.'
  },
  {
    id: 'sweet_potato_hash',
    name: 'Sweet Potato & Cabbage Skillet Hash',
    mealType: 'lunch',
    prepTime: 25,
    servings: 4,
    dietary: ['vegetarian', 'vegan', 'gluten_free', 'dairy_free', 'low_sodium'],
    tag: 'budget_saver',
    ingredients: [
      { id: 'sweet_potatoes', amount: 500 },
      { id: 'cabbage', amount: 400 },
      { id: 'onions', amount: 100 },
      { id: 'cooking_oil', amount: 30 }
    ],
    instructions: [
      'Wash, peel, and dice sweet potatoes into small 1/2-inch cubes to ensure they cook fast.',
      'Heat oil in a large skillet, add sweet potatoes and onions. Cook, stirring occasionally, for 10-12 minutes until sweet potatoes begin to soften.',
      'Add shredded cabbage, stir well, and cover. Let cook for 8-10 minutes until cabbage is wilted and sweet potatoes are fully tender and lightly browned.',
      'Serve warm as a delicious vegetable hash.'
    ],
    description: 'A highly nutritious, fiber-rich vegan skillet that combines sweet starches with economical cruciferous greens.'
  },
  {
    id: 'tilapia_curry',
    name: 'Lake Tilapia Fish Curry with Rice',
    mealType: 'lunch',
    prepTime: 30,
    servings: 4,
    dietary: ['gluten_free', 'dairy_free'],
    tag: 'budget_saver',
    ingredients: [
      { id: 'rice', amount: 300 },
      { id: 'tilapia', amount: 500 },
      { id: 'tomatoes', amount: 300 },
      { id: 'onions', amount: 100 },
      { id: 'cooking_oil', amount: 30 }
    ],
    instructions: [
      'Start cooking rice in a pot.',
      'Cut tilapia fillets into large pieces.',
      'Heat oil in a deep pan, sauté onions until soft. Add chopped tomatoes and cook down to a rich paste.',
      'Add a cup of water, bring to a simmer, then gently lay fish pieces into the sauce. Cover and simmer gently for 8-10 minutes until the fish flakes easily with a fork.',
      'Serve the tender fish curry over warm rice.'
    ],
    description: 'A healthy fish lunch full of omega-3 fatty acids, utilizing local regional seafood.'
  },
  {
    id: 'potato_soup',
    name: 'Creamy Potato & Onion Chowder',
    mealType: 'lunch',
    prepTime: 35,
    servings: 4,
    dietary: ['vegetarian', 'gluten_free'],
    tag: 'budget_saver',
    ingredients: [
      { id: 'potatoes', amount: 800 },
      { id: 'onions', amount: 200 },
      { id: 'milk', amount: 500 },
      { id: 'butter', amount: 30 }
    ],
    instructions: [
      'Peel and dice potatoes. Chop onions.',
      'Melt butter in a large pot. Sauté onions until soft and sweet (around 8 minutes).',
      'Add potatoes and 500mL of water. Bring to a boil, then cover and simmer for 15-20 minutes until potatoes are completely tender.',
      'Roughly mash some of the potatoes in the pot to naturally thicken the soup.',
      'Pour in the milk, season lightly, and warm through without boiling. Serve hot.'
    ],
    description: 'A comforting, rich soup that is extremely inexpensive and ideal for cold autumn or winter days.'
  },
  {
    id: 'pan_seared_salmon',
    name: 'Pan-Seared Salmon with Steamed Spinach',
    mealType: 'dinner',
    prepTime: 20,
    servings: 2,
    dietary: ['gluten_free', 'dairy_free', 'low_sodium'],
    tag: 'treat',
    ingredients: [
      { id: 'salmon', amount: 300 },
      { id: 'spinach', amount: 400 },
      { id: 'sweet_potatoes', amount: 300 },
      { id: 'cooking_oil', amount: 20 }
    ],
    instructions: [
      'Steam diced sweet potatoes until tender (about 12 minutes).',
      'Heat oil in a skillet. Place salmon skin-side down and sear for 4-5 minutes, flip, and sear for 3 more minutes.',
      'Remove salmon. Toss spinach directly into the same warm skillet and let it wilt in the remaining juices for 2 minutes.',
      'Serve salmon with steamed spinach and sweet potatoes.'
    ],
    description: 'A premium, heart-healthy dinner featuring wild-caught salmon and iron-rich spinach. Highly nutritious, though higher cost.'
  },
  {
    id: 'cheese_omelette_toast',
    name: 'Cheddar Cheese Omelette with Toast',
    mealType: 'breakfast',
    prepTime: 10,
    servings: 2,
    dietary: ['vegetarian'],
    tag: 'quick_easy',
    ingredients: [
      { id: 'bread', amount: 100 },
      { id: 'eggs', amount: 200 },
      { id: 'cheddar_cheese', amount: 60 },
      { id: 'butter', amount: 15 }
    ],
    instructions: [
      'Whisk eggs in a bowl.',
      'Melt butter in a pan, pour in the eggs, and swirl to cover the pan.',
      'As the eggs set, sprinkle grated cheddar cheese over one half.',
      'Fold the omelette in half and cook until the cheese is melted.',
      'Toast the bread, and serve with the cheesy omelette.'
    ],
    description: 'A satisfying, classic vegetarian breakfast rich in calcium, protein, and energy.'
  },
  {
    id: 'banana_pb_toast',
    name: 'Peanut Butter & Banana Toast',
    mealType: 'snack',
    prepTime: 5,
    servings: 2,
    dietary: ['vegetarian', 'vegan', 'dairy_free', 'low_sodium'],
    tag: 'quick_easy',
    ingredients: [
      { id: 'bread', amount: 100 },
      { id: 'peanut_butter', amount: 50 },
      { id: 'bananas', amount: 200 }
    ],
    instructions: [
      'Toast slices of whole wheat bread.',
      'Spread a generous layer of peanut butter on each slice.',
      'Top with sliced bananas and serve.',
      'A perfect, fast snack loaded with protein and healthy fats.'
    ],
    description: 'A simple, highly popular energy-boosting snack that requires no cooking.'
  },
  {
    id: 'mixed_bean_salad',
    name: 'Zesty Mixed Bean & Tomato Salad',
    mealType: 'snack',
    prepTime: 10,
    servings: 4,
    dietary: ['vegetarian', 'vegan', 'gluten_free', 'dairy_free', 'low_sodium'],
    tag: 'quick_easy',
    ingredients: [
      { id: 'beans', amount: 300 },
      { id: 'tomatoes', amount: 200 },
      { id: 'onions', amount: 50 },
      { id: 'spinach', amount: 100 },
      { id: 'cooking_oil', amount: 15 }
    ],
    instructions: [
      'Drain cooked beans and place them in a salad bowl.',
      'Dice tomatoes and finely chop onions.',
      'Chop spinach leaves into small pieces.',
      'Toss all ingredients together with a splash of vegetable oil.',
      'Serve chilled or at room temperature as a refreshing, nutrient-dense snack.'
    ],
    description: 'A high-fiber, low-cost raw snack providing vitamin C, iron, and slow-burning plant protein.'
  },
  {
    id: 'lamb_chops_dinner',
    name: 'Garlic Butter Lamb Chops with Potatoes & Broccoli',
    mealType: 'dinner',
    prepTime: 30,
    servings: 2,
    dietary: ['gluten_free'],
    tag: 'treat',
    ingredients: [
      { id: 'lamb_chops', amount: 400 },
      { id: 'potatoes', amount: 300 },
      { id: 'broccoli', amount: 200 },
      { id: 'butter', amount: 30 }
    ],
    instructions: [
      'Boil diced potatoes in salted water until tender (about 12 minutes), then drain and toss with a little butter.',
      'Heat a heavy pan or skillet on high. Season lamb chops with salt and garlic.',
      'Sear lamb chops for 3-4 minutes on each side until a golden crust forms.',
      'Add butter to the pan in the last minute, spooning the melted butter over the chops.',
      'Steam broccoli florets for 4 minutes until tender-crisp.',
      'Serve the seared lamb chops alongside the buttered potatoes and steamed broccoli.'
    ],
    description: 'A premium, high-protein dinner featuring tender seared lamb chops paired with potatoes and fresh greens.'
  },
  {
    id: 'avocado_salad',
    name: 'Zesty Spinach & Avocado Salad with Eggs',
    mealType: 'lunch',
    prepTime: 15,
    servings: 2,
    dietary: ['vegetarian', 'gluten_free', 'dairy_free'],
    tag: 'quick_easy',
    ingredients: [
      { id: 'spinach', amount: 200 },
      { id: 'avocado', amount: 300 },
      { id: 'tomatoes', amount: 200 },
      { id: 'eggs', amount: 150 },
      { id: 'cooking_oil', amount: 15 }
    ],
    instructions: [
      'Boil eggs in water for 9 minutes, cool in ice water, peel, and cut into quarters.',
      'Wash spinach and spin dry. Place in a salad bowl.',
      'Cut avocados in half, remove pits, slice the flesh into cubes, and add to the bowl.',
      'Dice tomatoes and toss gently with the spinach and avocado.',
      'Drizzle with vegetable oil (or olive oil if available) and a squeeze of lemon if desired.',
      'Top with the quartered boiled eggs and serve fresh.'
    ],
    description: 'A nutrient-dense, premium salad packed with healthy monounsaturated fats, dietary fiber, and quality protein.'
  },
  {
    id: 'yogurt_parfait',
    name: 'Greek Yogurt Parfait with Bananas & Almonds',
    mealType: 'breakfast',
    prepTime: 8,
    servings: 2,
    dietary: ['vegetarian', 'gluten_free'],
    tag: 'quick_easy',
    ingredients: [
      { id: 'greek_yogurt', amount: 400 },
      { id: 'bananas', amount: 200 },
      { id: 'apples', amount: 150 },
      { id: 'almonds', amount: 50 }
    ],
    instructions: [
      'Roughly chop the almonds.',
      'Slice the banana and dice the apple into small pieces.',
      'Spoon Greek yogurt into serving bowls.',
      'Layer the banana slices and diced apple on top of the yogurt.',
      'Sprinkle with the chopped almonds for a premium crunch, and serve immediately.'
    ],
    description: 'A quick, luxurious high-protein breakfast featuring thick Greek yogurt, sweet fresh fruits, and crunchy almonds.'
  },
  {
    id: 'upgraded_ramen',
    name: 'Upgraded Student Ramen with Egg & Spinach',
    mealType: 'lunch',
    prepTime: 12,
    servings: 1,
    dietary: ['vegetarian'],
    tag: 'quick_easy',
    ingredients: [
      { id: 'ramen_noodles', amount: 120 },
      { id: 'eggs', amount: 50 },
      { id: 'spinach', amount: 100 },
      { id: 'green_onions', amount: 20 },
      { id: 'cooking_oil', amount: 5 }
    ],
    instructions: [
      'Boil 2 cups of water in a small pot. Add ramen noodles and cook for 2 minutes.',
      'Add spinach and chopped green onions directly to the pot with the noodles.',
      'Crack in an egg and let it poach in the boiling noodle soup for another 2-3 minutes.',
      'Drizzle with a tiny bit of cooking oil (or sesame oil if available) and stir in the soup seasoning packet.',
      'Serve hot in a bowl. Perfect fast student meal!'
    ],
    description: 'An upgraded version of instant ramen, adding egg for protein and fresh spinach for essential vitamins.'
  },
  {
    id: 'one_pot_pasta',
    name: 'One-Pot Tomato, Garlic & Spinach Pasta',
    mealType: 'dinner',
    prepTime: 15,
    servings: 2,
    dietary: ['vegetarian', 'vegan', 'dairy_free', 'low_sodium'],
    tag: 'quick_easy',
    ingredients: [
      { id: 'pasta', amount: 200 },
      { id: 'tomatoes', amount: 200 },
      { id: 'spinach', amount: 100 },
      { id: 'onions', amount: 50 },
      { id: 'garlic', amount: 10 },
      { id: 'cooking_oil', amount: 15 }
    ],
    instructions: [
      'In a large pot, combine pasta, diced tomatoes, sliced onions, minced garlic, cooking oil, and 3 cups of water.',
      'Bring to a boil over high heat. Once boiling, reduce to a simmer and cook for 9-10 minutes, stirring frequently so the pasta doesn\'t stick.',
      'When the pasta is cooked and the water has reduced to a thick sauce, stir in the fresh spinach until wilted (about 1 minute).',
      'Season with salt and pepper to taste, and serve immediately. Minimum washing up!'
    ],
    description: 'A quick, simple, and cheap pasta dish where everything cooks in one pot, saving time and dishwashing effort.'
  },
  {
    id: 'budget_rice_beans',
    name: 'Savory Campus Rice & Beans',
    mealType: 'dinner',
    prepTime: 20,
    servings: 2,
    dietary: ['vegetarian', 'vegan', 'gluten_free', 'dairy_free', 'low_sodium'],
    tag: 'budget_saver',
    ingredients: [
      { id: 'rice', amount: 150 },
      { id: 'beans', amount: 150 },
      { id: 'onions', amount: 50 },
      { id: 'cooking_oil', amount: 10 }
    ],
    instructions: [
      'Rinse rice and boil in 300mL water until tender. Cover and steam.',
      'Heat oil in a pan, sauté chopped onions until soft.',
      'Add canned or pre-boiled beans to the onions. Season with salt, pepper, or curry powder.',
      'Stir in the cooked rice and mix well until heated through.',
      'Serve warm. Cheap, filling, and packed with complete proteins!'
    ],
    description: 'The ultimate budget staple. Combining rice and beans offers a complete protein source for pennies.'
  },
  {
    id: 'egg_fried_rice',
    name: 'Leftover Egg Fried Rice with Cabbage',
    mealType: 'lunch',
    prepTime: 10,
    servings: 2,
    dietary: ['vegetarian', 'dairy_free'],
    tag: 'quick_easy',
    ingredients: [
      { id: 'rice', amount: 200 },
      { id: 'eggs', amount: 100 },
      { id: 'cabbage', amount: 150 },
      { id: 'green_onions', amount: 20 },
      { id: 'cooking_oil', amount: 15 }
    ],
    instructions: [
      'Heat oil in a large frying pan or wok on high heat.',
      'Sauté shredded cabbage and chopped green onions for 2 minutes until slightly softened.',
      'Push vegetables to the side, crack eggs into the empty space, and scramble them quickly.',
      'Add cooked (preferably leftover cold) rice to the pan and stir-fry everything together for 3-4 minutes.',
      'Drizzle with soy sauce if available, mix, and serve hot.'
    ],
    description: 'A fast, budget-friendly way to use leftover rice, adding egg and cabbage for texture and nutrition.'
  }
];


// Runtime cached data maps/lists (exposed to the rest of the application)
// REGIONS, SEASONS, DIETARY_PRESETS and RECIPES are fully static — they are initialised
// here directly from their DEFAULT_* constants so we never need to fetch them from Firestore.
export let INGREDIENTS = {};
export const REGIONS = Object.fromEntries(
  Object.entries(DEFAULT_REGIONS).filter(([k]) => k !== 'name')
);
export const SEASONS = { ...DEFAULT_SEASONS };
export const DIETARY_PRESETS = { ...DEFAULT_DIETARY_PRESETS };
export const RECIPES = DEFAULT_RECIPES.map(r => ({ ...r }));

/**
 * Initializes the Firestore application catalogs (Ingredients, Regions, Seasons, Dietary Presets, Recipes)
 * formatted in strict 3NF.
 * Seeds them if the database collections are currently empty.
 * Reconstructs the client-side memory structures on success.
 */
export async function initializeFirestoreData(statusCallback) {
  if (statusCallback) statusCallback("Checking database state...");
  
  // Test query on ingredients collection
  const ingRef = collection(db, "ingredients");
  let snapshot;
  try {
    snapshot = await getDocs(ingRef);
  } catch (error) {
    console.error("Database query failed", error);
    throw new Error("Could not connect to database. Ensure the Cloud Firestore API is enabled on your Firebase project.");
  }

  // Check if our new premium ingredient exists (migration check for existing databases)
  let needsMigration = false;
  if (!snapshot.empty) {
    try {
      const ramenSnap = await getDoc(doc(db, "ingredients", "ramen_noodles"));
      if (!ramenSnap.exists()) {
        needsMigration = true;
      }
    } catch (e) {
      console.warn("Migration check failed, assuming database is up to date", e);
    }
  }

  // 1. Database is empty or outdated - Seed all static catalogs in 3NF layout
  if (snapshot.empty || needsMigration) {
    if (statusCallback) {
      statusCallback(needsMigration 
        ? "Database catalog is outdated. Migrating database to include premium foods..." 
        : "Database is empty. Seeding catalog in 3NF layout..."
      );
    }
    await seed3NFCatalog(statusCallback);
  }

  // Seed demo student accounts if empty or outdated (user migration check)
  const usersRef = collection(db, "users");
  let usersSnapshot;
  try {
    usersSnapshot = await getDocs(usersRef);
  } catch (e) {
    console.warn("Could not check users collection status", e);
  }

  let needsUserMigration = false;
  if (!usersSnapshot || usersSnapshot.empty) {
    needsUserMigration = true;
  } else {
    try {
      const testUserSnap = await getDoc(doc(db, "users", "otieno_kamau"));
      if (!testUserSnap.exists()) {
        needsUserMigration = true;
      }
    } catch (e) {
      console.warn("User migration check failed, assuming database has correct structure", e);
    }
  }

  if (needsUserMigration) {
    if (statusCallback) statusCallback("Database users list is outdated. Migrating and seeding 50 regional student accounts...");
    await seedDemoUsers(statusCallback);
  }

  // 2. Load ingredient live-prices from Firestore (static data already in memory)
  if (statusCallback) statusCallback("Loading ingredient prices from database...");
  await loadAndRebuildCaches();
}

export const DEMO_USERS = [
  // Kenya
  { username: "otieno_kamau", name: "Otieno Kamau", region: "kenya" },
  { username: "wambui_mwangi", name: "Wambui Mwangi", region: "kenya" },
  { username: "kiprotich_cherono", name: "Kiprotich Cherono", region: "kenya" },
  { username: "amina_juma", name: "Amina Juma", region: "kenya" },
  { username: "adisa_okoth", name: "Adisa Okoth", region: "kenya" },
  
  // Tanzania
  { username: "mussa_khalfan", name: "Mussa Khalfan", region: "tanzania" },
  { username: "neema_shayo", name: "Neema Shayo", region: "tanzania" },
  { username: "baraka_mrema", name: "Baraka Mrema", region: "tanzania" },
  { username: "rehema_kilimo", name: "Rehema Kilimo", region: "tanzania" },
  
  // Uganda
  { username: "kato_mukasa", name: "Kato Mukasa", region: "uganda" },
  { username: "namubiru_nankya", name: "Namubiru Nankya", region: "uganda" },
  { username: "okello_opiyo", name: "Okello Opiyo", region: "uganda" },
  { username: "babirye_nakato", name: "Babirye Nakato", region: "uganda" },
  
  // UK
  { username: "liam_smith", name: "Liam Smith", region: "uk" },
  { username: "harry_potter", name: "Harry Potter", region: "uk" },
  { username: "chloe_taylor", name: "Chloe Taylor", region: "uk" },
  { username: "oliver_jones", name: "Oliver Jones", region: "uk" },
  { username: "sophie_davies", name: "Sophie Davies", region: "uk" },
  
  // Germany
  { username: "lukas_mueller", name: "Lukas Müller", region: "germany" },
  { username: "sophie_schmidt", name: "Sophie Schmidt", region: "germany" },
  { username: "maximilian_weber", name: "Maximilian Weber", region: "germany" },
  { username: "lara_wagner", name: "Lara Wagner", region: "germany" },
  { username: "jonas_becker", name: "Jonas Becker", region: "germany" },
  
  // France
  { username: "lucas_martin", name: "Lucas Martin", region: "france" },
  { username: "emma_bernard", name: "Emma Bernard", region: "france" },
  { username: "louis_dubois", name: "Louis Dubois", region: "france" },
  { username: "chloe_petit", name: "Chloé Petit", region: "france" },
  { username: "hugo_durand", name: "Hugo Durand", region: "france" },
  
  // USA
  { username: "michael_johnson", name: "Michael Johnson", region: "usa" },
  { username: "olivia_williams", name: "Olivia Williams", region: "usa" },
  { username: "noah_brown", name: "Noah Brown", region: "usa" },
  { username: "emma_jones", name: "Emma Jones", region: "usa" },
  { username: "james_miller", name: "James Miller", region: "usa" },
  
  // Canada
  { username: "william_tremblay", name: "William Tremblay", region: "canada" },
  { username: "amelia_roy", name: "Amelia Roy", region: "canada" },
  { username: "logan_gauthier", name: "Logan Gauthier", region: "canada" },
  { username: "charlotte_leblanc", name: "Charlotte Leblanc", region: "canada" },
  { username: "carter_morin", name: "Carter Morin", region: "canada" },
  
  // Brazil
  { username: "mateo_silva", name: "Mateo Silva", region: "brazil" },
  { username: "isabella_santos", name: "Isabella Santos", region: "brazil" },
  { username: "lucas_oliveira", name: "Lucas Oliveira", region: "brazil" },
  { username: "julia_souza", name: "Julia Souza", region: "brazil" },
  { username: "enzo_lima", name: "Enzo Lima", region: "brazil" },
  { username: "sophia_pereira", name: "Sophia Pereira", region: "brazil" },
  { username: "gabriel_alves", name: "Gabriel Alves", region: "brazil" },
  { username: "valentina_gomes", name: "Valentina Gomes", region: "brazil" },
  { username: "felipe_rocha", name: "Felipe Rocha", region: "brazil" },
  { username: "mariana_ribeiro", name: "Mariana Ribeiro", region: "brazil" },
  { username: "thiago_carvalho", name: "Thiago Carvalho", region: "brazil" },
  { username: "alice_barbosa", name: "Alice Barbosa", region: "brazil" }
];

async function seedDemoUsers(statusCallback) {
  const batch = writeBatch(db);
  for (const user of DEMO_USERS) {
    const userDocRef = doc(db, "users", user.username);
    batch.set(userDocRef, {
      username: user.username,
      name: user.name,
      password: user.username,
      region: user.region
    });
  }
  if (statusCallback) statusCallback("Saving 50 regional student accounts to Firestore...");
  await batch.commit();
}

/**
 * Seeds static data to Firestore collections in strict 3NF (no nested objects/arrays)
 */
async function seed3NFCatalog(statusCallback) {
  let batch = writeBatch(db);
  let opCount = 0;

  const commitBatchIfNeeded = async (force = false) => {
    if (opCount >= 400 || (force && opCount > 0)) {
      if (statusCallback) statusCallback(`Writing database batch (${opCount} records)...`);
      await batch.commit();
      batch = writeBatch(db);
      opCount = 0;
    }
  };

  // Seed Ingredients & Multipliers only — regions/seasons/dietary_presets/recipes are
  // now static constants in the client bundle and do not need to be stored in Firestore.
  if (statusCallback) statusCallback("Seeding ingredients and multiplier rates...");
  for (const [key, ing] of Object.entries(DEFAULT_INGREDIENTS)) {
    batch.set(doc(db, "ingredients", key), {
      name: ing.name,
      category: ing.category,
      basePrice: ing.basePrice,
      unit: ing.unit,
      calories: ing.nutrition.calories,
      carbs: ing.nutrition.carbs,
      protein: ing.nutrition.protein,
      fat: ing.nutrition.fat,
      fiber: ing.nutrition.fiber,
      sodium: ing.nutrition.sodium,
      iron: ing.nutrition.iron,
      calcium: ing.nutrition.calcium,
      vitC: ing.nutrition.vitC,
      regionalMultipliers: ing.regionalMultipliers,
      seasonalMultipliers: ing.seasonalMultipliers
    });
    opCount++;
    await commitBatchIfNeeded();
  }

  // Flush remaining records
  await commitBatchIfNeeded(true);
}

/**
 * Loads ONLY the ingredients collection from Firestore and rebuilds the in-memory cache.
 * REGIONS, SEASONS, DIETARY_PRESETS and RECIPES are static constants — no DB reads needed.
 * The ingredients collection is still fetched because it stores dynamically synced live
 * prices from the WFP HAPI / Open Price Engine APIs.
 */
async function loadAndRebuildCaches() {
  const ingSnap = await getDocs(collection(db, "ingredients"));

  const tempIngredients = {};
  ingSnap.forEach(d => {
    const data = d.data();
    // Preserve static default values (nutrition, multipliers) but merge in any live
    // prices that were written to Firestore by a previous price sync operation.
    const defaultIng = DEFAULT_INGREDIENTS[d.id] || {};
    tempIngredients[d.id] = {
      id: d.id,
      name: data.name || defaultIng.name,
      category: data.category || defaultIng.category,
      basePrice: data.basePrice !== undefined ? data.basePrice : defaultIng.basePrice,
      unit: data.unit || defaultIng.unit,
      livePrices: data.livePrices || {},
      regionalMultipliers: data.regionalMultipliers || defaultIng.regionalMultipliers || {},
      seasonalMultipliers: data.seasonalMultipliers || defaultIng.seasonalMultipliers || {},
      nutrition: {
        calories: data.calories !== undefined ? data.calories : (defaultIng.nutrition ? defaultIng.nutrition.calories : 0),
        carbs:    data.carbs    !== undefined ? data.carbs    : (defaultIng.nutrition ? defaultIng.nutrition.carbs    : 0),
        protein:  data.protein  !== undefined ? data.protein  : (defaultIng.nutrition ? defaultIng.nutrition.protein  : 0),
        fat:      data.fat      !== undefined ? data.fat      : (defaultIng.nutrition ? defaultIng.nutrition.fat      : 0),
        fiber:    data.fiber    !== undefined ? data.fiber    : (defaultIng.nutrition ? defaultIng.nutrition.fiber    : 0),
        sodium:   data.sodium   !== undefined ? data.sodium   : (defaultIng.nutrition ? defaultIng.nutrition.sodium   : 0),
        iron:     data.iron     !== undefined ? data.iron     : (defaultIng.nutrition ? defaultIng.nutrition.iron     : 0),
        calcium:  data.calcium  !== undefined ? data.calcium  : (defaultIng.nutrition ? defaultIng.nutrition.calcium  : 0),
        vitC:     data.vitC     !== undefined ? data.vitC     : (defaultIng.nutrition ? defaultIng.nutrition.vitC     : 0)
      }
    };
  });

  Object.assign(INGREDIENTS, tempIngredients);
}

// ----------------------------------------------------
// Synchronous Calculation Functions (Cached memory executions)
// ----------------------------------------------------

/**
 * Calculates the price of an ingredient adjusted for region and season.
 * Returns price per unit (kg or L) in USD.
 */
export function getIngredientPriceUSD(ingredientId, regionKey, seasonKey) {
  const ing = INGREDIENTS[ingredientId];
  if (!ing) return 0;

  const region = REGIONS[regionKey] || REGIONS.usa || { usdRate: 1.0 };
  if (ing.livePrices && ing.livePrices[regionKey] !== undefined) {
    return ing.livePrices[regionKey] / region.usdRate;
  }

  const regMult = ing.regionalMultipliers[regionKey] !== undefined ? ing.regionalMultipliers[regionKey] : 1.0;
  const seasMult = ing.seasonalMultipliers[seasonKey] !== undefined ? ing.seasonalMultipliers[seasonKey] : 1.0;

  return ing.basePrice * regMult * seasMult;
}

/**
 * Returns the localized price of an ingredient in the region's currency.
 */
export function getIngredientPriceLocal(ingredientId, regionKey, seasonKey) {
  const ing = INGREDIENTS[ingredientId];
  if (!ing) return 0;

  if (ing.livePrices && ing.livePrices[regionKey] !== undefined) {
    return ing.livePrices[regionKey];
  }

  const usdPrice = getIngredientPriceUSD(ingredientId, regionKey, seasonKey);
  const region = REGIONS[regionKey] || REGIONS.usa || { usdRate: 1.0 };
  return usdPrice * region.usdRate;
}

// ----------------------------------------------------
// External Pricing API Mapping and Synchronization Logic
// ----------------------------------------------------

export const INGREDIENT_API_MAP = {
  maize_meal: { wfp: "Maize flour (white)", ope: "Maize Meal" },
  rice: { wfp: "Rice (white)", ope: "White Rice" },
  potatoes: { wfp: "Potatoes (Irish)", ope: "Potatoes" },
  sweet_potatoes: { wfp: "Sweet Potatoes", ope: "Sweet Potatoes" },
  oats: { wfp: "Oats", ope: "Rolled Oats" },
  bread: { wfp: "Bread", ope: "Whole Wheat Bread" },
  beef: { wfp: "Beef (meat with bones)", ope: "Beef" },
  chicken_breast: { wfp: "Chicken", ope: "Chicken Breast" },
  tilapia: { wfp: "Fish (tilapia)", ope: "Tilapia" },
  salmon: { wfp: "Fish (salmon)", ope: "Salmon" },
  beans: { wfp: "Beans (dry)", ope: "Beans" },
  eggs: { wfp: "Eggs", ope: "Eggs" },
  sukuma_wiki: { wfp: "Sukuma Wiki", ope: "Collard Greens" },
  spinach: { wfp: "Spinach", ope: "Spinach" },
  tomatoes: { wfp: "Tomatoes", ope: "Tomatoes" },
  cabbage: { wfp: "Cabbage", ope: "Cabbage" },
  onions: { wfp: "Onions (red)", ope: "Onions" },
  broccoli: { wfp: "Broccoli", ope: "Broccoli" },
  bananas: { wfp: "Bananas", ope: "Bananas" },
  apples: { wfp: "Apples", ope: "Apples" },
  milk: { wfp: "Milk (fresh)", ope: "Cow Milk" },
  cheddar_cheese: { wfp: "Cheese", ope: "Cheddar Cheese" },
  cooking_oil: { wfp: "Oil (vegetable)", ope: "Vegetable Cooking Oil" },
  peanut_butter: { wfp: "Peanut Butter", ope: "Peanut Butter" },
  butter: { wfp: "Butter", ope: "Butter" },
  lamb_chops: { wfp: "Meat (lamb)", ope: "Lamb Chops" },
  avocado: { wfp: "Avocado", ope: "Avocado" },
  greek_yogurt: { wfp: "Yogurt", ope: "Greek Yogurt" },
  almonds: { wfp: "Almonds", ope: "Almonds" },
  ramen_noodles: { wfp: "Noodles", ope: "Instant Ramen" },
  pasta: { wfp: "Pasta", ope: "Spaghetti" },
  garlic: { wfp: "Garlic", ope: "Garlic" },
  green_onions: { wfp: "Onions (green)", ope: "Green Onions" }
};

export async function syncLivePrices(regionKey, statusCallback, customApiKey = "") {
  if (statusCallback) statusCallback(`Initializing sync for ${regionKey}...`);

  const region = REGIONS[regionKey];
  if (!region) {
    throw new Error(`Region ${regionKey} is not defined in settings.`);
  }

  const locationCodeMap = {
    kenya: "KEN",
    uganda: "UGA",
    tanzania: "TZA"
  };

  const storeMap = {
    uk: "sainsburys",
    germany: "rewe",
    france: "carrefour",
    usa: "walmart",
    canada: "loblaws",
    brazil: "carrefour"
  };

  const isEastAfrica = locationCodeMap[regionKey] !== undefined;
  let fetchedPrices = {};

  if (isEastAfrica) {
    const locCode = locationCodeMap[regionKey];
    if (statusCallback) statusCallback(`Fetching live WFP data for ${region.name} from HDX HAPI...`);

    const appIdentifier = "Tm91cmlzaFBsYW46ZGV2QG5vdXJpc2hwbGFuLm9yZw==";
    const url = `https://hapi.humdata.org/api/v2/food-security-nutrition-poverty/food-prices-market-monitor?location_code=${locCode}&limit=1000&price_type=Retail&app_identifier=${appIdentifier}`;

    try {
      const response = await fetch(url, {
        headers: {
          "Accept": "application/json"
        }
      });
      if (!response.ok) {
        throw new Error(`HDX HAPI returned HTTP ${response.status}`);
      }
      
      const responseText = await response.text();
      if (!responseText || responseText.trim() === "") {
        throw new Error("HDX HAPI returned an empty response body.");
      }

      let json;
      try {
        json = JSON.parse(responseText);
      } catch (parseErr) {
        console.error("HDX HAPI JSON parse failed. Content sample:", responseText.slice(0, 1000));
        throw new Error(`HDX HAPI response is not valid JSON: ${parseErr.message}`);
      }

      const records = json.data || [];

      const latestByCommodity = {};
      for (const rec of records) {
        const name = rec.commodity_name;
        if (!name) continue;
        const currentLatest = latestByCommodity[name];
        if (!currentLatest || rec.reference_period_end > currentLatest.reference_period_end) {
          latestByCommodity[name] = rec;
        }
      }

      for (const [ingId, mapInfo] of Object.entries(INGREDIENT_API_MAP)) {
        const wfpName = mapInfo.wfp;
        const matchingRec = latestByCommodity[wfpName];
        if (matchingRec && matchingRec.price !== undefined) {
          fetchedPrices[ingId] = parseFloat(matchingRec.price);
        }
      }
    } catch (err) {
      console.error("WFP HDX HAPI fetch failed", err);
      throw new Error(`WFP HDX HAPI fetch failed: ${err.message}`);
    }
  } else {
    const store = storeMap[regionKey];
    if (!store) {
      throw new Error(`No default store configured for region ${regionKey}`);
    }

    if (statusCallback) statusCallback(`Fetching live prices from Open Price Engine for store ${store}...`);

    const activeKey = (customApiKey && customApiKey !== "YOUR_OPEN_ENGINE_API_KEY" && customApiKey.trim() !== "") ? customApiKey : OPEN_ENGINE_API_KEY;

    if (!activeKey || activeKey === "YOUR_OPEN_ENGINE_API_KEY" || activeKey.trim() === "") {
      throw new Error("Open Price Engine API key is not configured in config.js or user profile.");
    }

    const productNames = [];
    const idToProduct = {};
    for (const [ingId, mapInfo] of Object.entries(INGREDIENT_API_MAP)) {
      if (mapInfo.ope) {
        productNames.push(mapInfo.ope);
        idToProduct[mapInfo.ope.toLowerCase()] = ingId;
      }
    }

    const baseUrl = `https://openpricengine.com/api/v1/${store}/products/prices/today`;
    let url = baseUrl + "?";
    productNames.forEach(name => {
      url += `productname=${encodeURIComponent(name)}&`;
    });
    if (region.currency) {
      url += `currency=${encodeURIComponent(region.currency)}`;
    }

    try {
      // Attempt 1: send key as raw value (OPE OpenAPI spec: apiKey in header named "Authorization")
      let response = await fetch(url, {
        method: "GET",
        headers: {
          "Authorization": activeKey,
          "Accept": "application/json"
        }
      });

      // Some FastAPI deployments expect "Bearer <key>" — retry once if rejected
      if (response.status === 401 || response.status === 403) {
        if (!activeKey.startsWith("Bearer ")) {
          response = await fetch(url, {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${activeKey}`,
              "Accept": "application/json"
            }
          });
        }
      }

      if (response.status === 401 || response.status === 403) {
        throw new Error(
          "API key rejected (HTTP " + response.status + "). " +
          "Your Open Price Engine key has likely expired — please use the 'Request OTP Renewal' " +
          "button in the Profile > Food Price API Sync & Renewal section to get a fresh key."
        );
      }

      if (!response.ok) {
        throw new Error(`Open Price Engine returned HTTP ${response.status}`);
      }

      const responseText = await response.text();
      if (!responseText || responseText.trim() === "") {
        throw new Error("Open Price Engine returned an empty response body.");
      }

      let records;
      try {
        records = JSON.parse(responseText);
      } catch (parseErr) {
        console.error("Open Price Engine JSON parse failed. Content sample:", responseText.slice(0, 1000));
        throw new Error(`Open Price Engine response is not valid JSON: ${parseErr.message}`);
      }
      if (Array.isArray(records)) {
        for (const rec of records) {
          const prodName = rec["Product Name"] || rec["Product_Name"] || rec.product_name;
          const priceVal = rec.Price || rec.price;
          if (prodName && priceVal !== undefined) {
            const ingId = idToProduct[prodName.toLowerCase()];
            if (ingId) {
              let parsedPrice = parseFloat(priceVal);
              if (isNaN(parsedPrice) && typeof priceVal === 'string') {
                const cleaned = priceVal.replace(/[^\d.]/g, '');
                parsedPrice = parseFloat(cleaned);
              }
              if (!isNaN(parsedPrice)) {
                fetchedPrices[ingId] = parsedPrice;
              }
            }
          }
        }
      }
    } catch (err) {
      console.error("Open Price Engine fetch failed", err);
      throw new Error(`Open Price Engine fetch failed: ${err.message}`);
    }
  }

  const count = Object.keys(fetchedPrices).length;
  if (count === 0) {
    throw new Error("No pricing matches found in the API response.");
  }

  if (statusCallback) statusCallback(`Writing ${count} updated prices to Firestore...`);

  const batch = writeBatch(db);
  for (const [ingId, price] of Object.entries(fetchedPrices)) {
    if (INGREDIENTS[ingId]) {
      if (!INGREDIENTS[ingId].livePrices) {
        INGREDIENTS[ingId].livePrices = {};
      }
      INGREDIENTS[ingId].livePrices[regionKey] = price;

      const ingDocRef = doc(db, "ingredients", ingId);
      batch.update(ingDocRef, {
        [`livePrices.${regionKey}`]: price
      });
    }
  }

  await batch.commit();
  if (statusCallback) statusCallback(`Successfully synchronized ${count} live prices!`);
  return count;
}


/**
 * Calculates the cost of a recipe in local currency based on region and season.
 */
export function getRecipeCostLocal(recipeId, regionKey, seasonKey, dietaryRestrictions = []) {
  const recipe = RECIPES.find(r => r.id === recipeId);
  if (!recipe) return 0;

  const region = REGIONS[regionKey] || REGIONS.usa || { usdRate: 1.0 };
  let totalUSD = 0;

  for (const ingRef of recipe.ingredients) {
    let finalIngId = ingRef.id;

    // Dairy-free / Vegan substitution: Replace milk with water (cost $0)
    if (ingRef.id === 'milk' && (dietaryRestrictions.includes('vegan') || dietaryRestrictions.includes('dairy_free'))) {
      continue;
    }
    // Vegan substitution: Replace butter with oil
    if (ingRef.id === 'butter' && dietaryRestrictions.includes('vegan')) {
      finalIngId = 'cooking_oil';
    }

    const pricePerKgOrL = getIngredientPriceUSD(finalIngId, regionKey, seasonKey);
    totalUSD += (ingRef.amount / 1000) * pricePerKgOrL;
  }

  return totalUSD * region.usdRate;
}

/**
 * Returns the recipe's aggregated nutritional facts for 1 serving.
 */
export function getRecipeNutritionPerServing(recipeId, dietaryRestrictions = []) {
  const recipe = RECIPES.find(r => r.id === recipeId);
  if (!recipe) return null;

  const totals = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sodium: 0, iron: 0, calcium: 0, vitC: 0 };

  for (const ingRef of recipe.ingredients) {
    let finalIngId = ingRef.id;

    if (ingRef.id === 'milk' && (dietaryRestrictions.includes('vegan') || dietaryRestrictions.includes('dairy_free'))) {
      continue;
    }
    if (ingRef.id === 'butter' && dietaryRestrictions.includes('vegan')) {
      finalIngId = 'cooking_oil';
    }

    const ing = INGREDIENTS[finalIngId];
    if (!ing) continue;

    const scale = ingRef.amount / 100;
    const nut = ing.nutrition || ing;

    for (const key in totals) {
      const nutValue = nut[key] !== undefined ? nut[key] : 0;
      totals[key] += nutValue * scale;
    }
  }

  for (const key in totals) {
    totals[key] = parseFloat((totals[key] / recipe.servings).toFixed(1));
  }

  return totals;
}

/**
 * Checks if a recipe is compatible with specific dietary restrictions.
 */
export function isRecipeCompatible(recipeId, dietaryRestrictions = []) {
  const recipe = RECIPES.find(r => r.id === recipeId);
  if (!recipe) return false;

  if (!dietaryRestrictions || dietaryRestrictions.length === 0) return true;

  for (const restriction of dietaryRestrictions) {
    if (restriction === 'none') continue;
    if (restriction === 'vegetarian') {
      if (!recipe.dietary.includes('vegetarian') && !recipe.dietary.includes('vegan')) {
        return false;
      }
    } else {
      if (!recipe.dietary.includes(restriction)) {
        return false;
      }
    }
  }

  return true;
}
