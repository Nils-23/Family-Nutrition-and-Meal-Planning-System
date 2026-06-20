// Profile Manager and Nutrient Requirement Calculator using Cloud Firestore (3NF)
import { 
  getDoc, 
  doc, 
  setDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db } from "./firebase-init.js";

// Default Profile State (used to seed Firestore if empty)
const DEFAULT_STATE = {
  familyMembers: [
    { id: '1', name: 'Myself', age: 22, gender: 'male', activityLevel: 'moderate' }
  ],
  budget: 50,
  budgetPeriod: 'weekly',
  region: 'kenya',
  season: 'spring',
  dietaryRestrictions: []
};

const FAMILY_ID = 'default_family';

// Load state from Firestore (Single Document Reader)
export async function loadProfileState() {
  try {
    const famDocRef = doc(db, "families", FAMILY_ID);
    const famDocSnap = await getDoc(famDocRef);

    // 1. If profile doesn't exist, seed default profile settings
    if (!famDocSnap.exists()) {
      await saveProfileState(DEFAULT_STATE);
      return JSON.parse(JSON.stringify(DEFAULT_STATE));
    }

    const data = famDocSnap.data();

    // Return reconstructed profile object from single document
    return {
      familyMembers: data.familyMembers || [],
      budget: data.budget,
      budgetPeriod: data.budgetPeriod,
      region: data.region,
      season: data.season,
      dietaryRestrictions: data.dietaryRestrictions || []
    };

  } catch (e) {
    console.error("Error loading profile from Firestore", e);
    return JSON.parse(JSON.stringify(DEFAULT_STATE));
  }
}

// Save state to Firestore (Single Document Writer)
export async function saveProfileState(state) {
  try {
    await setDoc(doc(db, "families", FAMILY_ID), {
      budget: state.budget,
      budgetPeriod: state.budgetPeriod,
      region: state.region,
      season: state.season,
      familyMembers: state.familyMembers,
      dietaryRestrictions: state.dietaryRestrictions
    });
  } catch (e) {
    console.error("Error saving profile to Firestore", e);
    throw e;
  }
}

/**
 * Calculates the daily nutritional needs for a single person based on DRI guidelines.
 */
export function calculateIndividualNeeds(member) {
  const age = parseInt(member.age) || 30;
  const gender = member.gender || 'female';
  const activity = member.activityLevel || 'moderate';

  let calories = 2000;
  let protein = 50;
  let carbs = 250;
  let fat = 65;
  let fiber = 25;
  let sodium = 2300;
  let iron = 8;
  let calcium = 1000;
  let vitC = 75;

  // Calories (EER approximations)
  if (age >= 1 && age <= 3) {
    calories = activity === 'active' ? 1200 : 1000;
  } else if (age >= 4 && age <= 8) {
    calories = activity === 'active' ? 1600 : 1400;
  } else if (age >= 9 && age <= 13) {
    if (gender === 'male') {
      calories = activity === 'active' ? 2200 : activity === 'moderate' ? 2000 : 1800;
    } else {
      calories = activity === 'active' ? 2000 : activity === 'moderate' ? 1800 : 1600;
    }
  } else if (age >= 14 && age <= 18) {
    if (gender === 'male') {
      calories = activity === 'active' ? 3000 : activity === 'moderate' ? 2600 : 2200;
    } else {
      calories = activity === 'active' ? 2400 : activity === 'moderate' ? 2000 : 1800;
    }
  } else if (age >= 19 && age <= 50) {
    if (gender === 'male') {
      calories = activity === 'active' ? 3000 : activity === 'moderate' ? 2600 : 2400;
    } else {
      calories = activity === 'active' ? 2400 : activity === 'moderate' ? 2000 : 1800;
    }
  } else {
    if (gender === 'male') {
      calories = activity === 'active' ? 2600 : activity === 'moderate' ? 2200 : 2000;
    } else {
      calories = activity === 'active' ? 2000 : activity === 'moderate' ? 1800 : 1600;
    }
  }

  // Macronutrient distribution based on calories
  protein = Math.round((calories * 0.12) / 4);
  carbs = Math.round((calories * 0.55) / 4);
  fat = Math.round((calories * 0.30) / 9);

  // Fiber
  fiber = Math.round((calories / 1000) * 14);

  // Iron
  if (age >= 1 && age <= 3) iron = 7;
  else if (age >= 4 && age <= 8) iron = 10;
  else if (age >= 9 && age <= 13) iron = 8;
  else if (age >= 14 && age <= 18) iron = gender === 'female' ? 15 : 11;
  else if (age >= 19 && age <= 50) iron = gender === 'female' ? 18 : 8;
  else iron = 8;

  // Calcium
  if (age >= 1 && age <= 3) calcium = 700;
  else if (age >= 4 && age <= 8) calcium = 1000;
  else if (age >= 9 && age <= 18) calcium = 1300;
  else if (age >= 19 && age <= 50) calcium = 1000;
  else calcium = gender === 'female' ? 1200 : 1000;

  // Vitamin C
  if (age >= 1 && age <= 3) vitC = 15;
  else if (age >= 4 && age <= 8) vitC = 25;
  else if (age >= 9 && age <= 13) vitC = 45;
  else if (age >= 14 && age <= 18) vitC = gender === 'female' ? 65 : 75;
  else vitC = gender === 'female' ? 75 : 90;

  // Sodium
  if (age >= 1 && age <= 3) sodium = 1500;
  else if (age >= 4 && age <= 8) sodium = 1900;
  else if (age >= 9 && age <= 13) sodium = 2200;
  else sodium = 2300;

  return { calories, protein, carbs, fat, fiber, sodium, iron, calcium, vitC };
}

/**
 * Calculates the combined daily nutritional needs for the whole family.
 */
export function calculateFamilyNeeds(familyMembers, activeDietaryRestrictions = []) {
  const totalNeeds = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sodium: 0, iron: 0, calcium: 0, vitC: 0 };

  if (!familyMembers || familyMembers.length === 0) {
    return calculateIndividualNeeds({ age: 30, gender: 'female', activityLevel: 'moderate' });
  }

  for (const member of familyMembers) {
    const memberNeeds = calculateIndividualNeeds(member);
    for (const key in totalNeeds) {
      totalNeeds[key] += memberNeeds[key];
    }
  }

  if (activeDietaryRestrictions.includes('low_sodium')) {
    totalNeeds.sodium = familyMembers.length * 1500;
  }

  return totalNeeds;
}

/**
 * Converts budget from local currency to USD base or vice-versa
 */
export function convertBudget(amount, fromRate, toRate) {
  return (amount / fromRate) * toRate;
}
