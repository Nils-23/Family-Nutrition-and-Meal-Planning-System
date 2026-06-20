import { 
  collection, 
  getDocs, 
  getDoc,
  doc, 
  setDoc, 
  writeBatch 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db } from "./firebase-init.js";

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
  }
};

const DEFAULT_REGIONS = {
  name: 'Default Region List',
  kenya: { name: 'Kenya (East Africa)', currency: 'KES', usdRate: 130, label: 'KES', climate: 'tropical' },
  tanzania: { name: 'Tanzania (East Africa)', currency: 'TZS', usdRate: 2500, label: 'TZS', climate: 'tropical' },
  uganda: { name: 'Uganda (East Africa)', currency: 'UGX', usdRate: 3800, label: 'UGX', climate: 'tropical' },
  uk: { name: 'United Kingdom', currency: 'GBP', usdRate: 0.79, label: '£', climate: 'temperate' },
  germany: { name: 'Germany', currency: 'EUR', usdRate: 0.92, label: '€', climate: 'temperate' },
  france: { name: 'France', currency: 'EUR', usdRate: 0.92, label: '€', climate: 'temperate' },
  usa: { name: 'United States', currency: 'USD', usdRate: 1.0, label: '$', climate: 'temperate' },
  canada: { name: 'Canada', currency: 'CAD', usdRate: 1.36, label: 'C$', climate: 'temperate' },
  brazil: { name: 'Brazil', currency: 'BRL', usdRate: 5.10, label: 'R$', climate: 'tropical' }
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
  }
];


// Runtime cached data maps/lists (exposed to the rest of the application)
export let INGREDIENTS = {};
export let REGIONS = {};
export let SEASONS = {};
export let DIETARY_PRESETS = {};
export let RECIPES = [];

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
      const lambChopsSnap = await getDoc(doc(db, "ingredients", "lamb_chops"));
      if (!lambChopsSnap.exists()) {
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

  // 2. Load all catalogs from Firestore and rebuild memory variables
  if (statusCallback) statusCallback("Loading catalogs from Firestore database...");
  await loadAndRebuildCaches();
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

  // A. Seed Regions
  if (statusCallback) statusCallback("Seeding geographic regions...");
  for (const [key, reg] of Object.entries(DEFAULT_REGIONS)) {
    // Skip name property metadata
    if (key === 'name') continue;
    batch.set(doc(db, "regions", key), {
      name: reg.name,
      currency: reg.currency,
      usdRate: reg.usdRate,
      label: reg.label,
      climate: reg.climate
    });
    opCount++;
    await commitBatchIfNeeded();
  }

  // B. Seed Seasons
  if (statusCallback) statusCallback("Seeding seasonal configurations...");
  for (const [key, seas] of Object.entries(DEFAULT_SEASONS)) {
    batch.set(doc(db, "seasons", key), {
      name: seas.name,
      desc: seas.desc
    });
    opCount++;
    await commitBatchIfNeeded();
  }

  // C. Seed Dietary Presets
  if (statusCallback) statusCallback("Seeding dietary presets...");
  for (const [key, preset] of Object.entries(DEFAULT_DIETARY_PRESETS)) {
    batch.set(doc(db, "dietary_presets", key), {
      name: preset.name,
      desc: preset.desc
    });
    opCount++;
    await commitBatchIfNeeded();
  }

  // D. Seed Ingredients & Multipliers
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

  // E. Seed Recipes
  if (statusCallback) statusCallback("Seeding recipe databases...");
  for (const recipe of DEFAULT_RECIPES) {
    batch.set(doc(db, "recipes", recipe.id), {
      name: recipe.name,
      mealType: recipe.mealType,
      prepTime: recipe.prepTime,
      servings: recipe.servings,
      description: recipe.description,
      ingredients: recipe.ingredients,
      instructions: recipe.instructions,
      dietary: recipe.dietary
    });
    opCount++;
    await commitBatchIfNeeded();
  }

  // Flush remaining records
  await commitBatchIfNeeded(true);
}

/**
 * Loads the database documents and rebuilds the local memory configurations.
 */
async function loadAndRebuildCaches() {
  const [regSnap, seasSnap, dietSnap, ingSnap, recSnap] = await Promise.all([
    getDocs(collection(db, "regions")),
    getDocs(collection(db, "seasons")),
    getDocs(collection(db, "dietary_presets")),
    getDocs(collection(db, "ingredients")),
    getDocs(collection(db, "recipes"))
  ]);

  const tempRegions = {};
  regSnap.forEach(d => {
    tempRegions[d.id] = { id: d.id, ...d.data() };
  });

  const tempSeasons = {};
  seasSnap.forEach(d => {
    tempSeasons[d.id] = { id: d.id, ...d.data() };
  });

  const tempPresets = {};
  dietSnap.forEach(d => {
    tempPresets[d.id] = { id: d.id, ...d.data() };
  });

  const tempIngredients = {};
  ingSnap.forEach(d => {
    tempIngredients[d.id] = { id: d.id, ...d.data() };
  });

  const tempRecipes = [];
  recSnap.forEach(d => {
    tempRecipes.push({ id: d.id, ...d.data() });
  });

  Object.assign(REGIONS, tempRegions);
  Object.assign(SEASONS, tempSeasons);
  Object.assign(DIETARY_PRESETS, tempPresets);
  Object.assign(INGREDIENTS, tempIngredients);
  
  RECIPES.length = 0;
  tempRecipes.forEach(r => RECIPES.push(r));
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

  const regMult = ing.regionalMultipliers[regionKey] !== undefined ? ing.regionalMultipliers[regionKey] : 1.0;
  const seasMult = ing.seasonalMultipliers[seasonKey] !== undefined ? ing.seasonalMultipliers[seasonKey] : 1.0;

  return ing.basePrice * regMult * seasMult;
}

/**
 * Returns the localized price of an ingredient in the region's currency.
 */
export function getIngredientPriceLocal(ingredientId, regionKey, seasonKey) {
  const usdPrice = getIngredientPriceUSD(ingredientId, regionKey, seasonKey);
  const region = REGIONS[regionKey] || REGIONS.usa || { usdRate: 1.0 };
  return usdPrice * region.usdRate;
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

    for (const key in totals) {
      totals[key] += ing.nutrition[key] * scale;
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
