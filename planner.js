// Meal Planning and Recommendation Engine using Cloud Firestore (3NF)
import { 
  getDoc,
  doc, 
  setDoc, 
  deleteDoc, 
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db } from "./firebase-init.js";
import { 
  RECIPES, 
  getRecipeCostLocal, 
  getRecipeNutritionPerServing, 
  isRecipeCompatible, 
  REGIONS, 
  INGREDIENTS, 
  getIngredientPriceLocal 
} from "./data.js";

const FAMILY_ID = 'default_family';

/**
 * Loads the active plan from Firestore. Reconstructs costs and names from the catalog cache.
 */
export async function loadActivePlan(state) {
  try {
    const planDocRef = doc(db, "meal_plans", FAMILY_ID);
    const planSnap = await getDoc(planDocRef);

    if (!planSnap.exists()) {
      return null;
    }

    const savedPlan = planSnap.data().plan || {};
    const familySize = state.familyMembers.length;
    const region = state.region;
    const season = state.season;
    const dietaryRestrictions = state.dietaryRestrictions;

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const plan = {};
    
    for (const day of days) {
      plan[day] = {};
      for (const slot of ['breakfast', 'lunch', 'dinner', 'snack']) {
        const recipeId = savedPlan[day]?.[slot];
        if (!recipeId) return null; // Incomplete plan, trigger regeneration

        const recipe = RECIPES.find(r => r.id === recipeId);
        if (!recipe) return null; // Invalid recipe ID, trigger regeneration

        const costLocal = getRecipeCostLocal(recipeId, region, season, dietaryRestrictions);
        const scaledCost = (costLocal / recipe.servings) * familySize;
        plan[day][slot] = {
          id: recipe.id,
          name: recipe.name,
          cost: scaledCost
        };
      }
    }

    return plan;
  } catch (e) {
    console.error("Error loading active plan from Firestore", e);
    return null;
  }
}

/**
 * Saves a generated 7-day meal plan to Firestore (Single Document Writer).
 */
export async function saveActivePlan(plan) {
  try {
    const planData = {};
    for (const day in plan) {
      planData[day] = {};
      for (const slot in plan[day]) {
        planData[day][slot] = plan[day][slot].id;
      }
    }
    await setDoc(doc(db, "meal_plans", FAMILY_ID), {
      plan: planData
    });
  } catch (e) {
    console.error("Error saving active plan to Firestore", e);
    throw e;
  }
}

/**
 * Updates a single meal slot recipe ID in Firestore (Single Field Update).
 */
export async function updateMealPlanSlot(day, slot, recipeId) {
  try {
    await updateDoc(doc(db, "meal_plans", FAMILY_ID), {
      [`plan.${day}.${slot}`]: recipeId
    });
  } catch (e) {
    console.error("Error updating meal plan slot", e);
    throw e;
  }
}

/**
 * Clears the active meal plan from Firestore.
 */
export async function clearActivePlan() {
  try {
    await deleteDoc(doc(db, "meal_plans", FAMILY_ID));
  } catch (e) {
    console.error("Error clearing meal plan", e);
  }
}

/**
 * Generates a 7-day meal plan based on profile state (family members, budget, region, season, dietary restrictions).
 */
export function generateMealPlan(state) {
  const { familyMembers, budget, budgetPeriod, region, season, dietaryRestrictions } = state;
  const familySize = familyMembers.length;

  const weeklyBudget = budgetPeriod === 'weekly' ? budget : budget / 4.33;
  const targetDailyBudget = weeklyBudget / 7;

  const compatibleRecipes = RECIPES.filter(r => isRecipeCompatible(r.id, dietaryRestrictions));

  if (compatibleRecipes.length === 0) {
    throw new Error("No recipes found matching your dietary restrictions. Try removing some restrictions.");
  }

  const breakfasts = compatibleRecipes.filter(r => r.mealType === 'breakfast');
  const lunches = compatibleRecipes.filter(r => r.mealType === 'lunch');
  const dinners = compatibleRecipes.filter(r => r.mealType === 'dinner');
  const snacks = compatibleRecipes.filter(r => r.mealType === 'snack');

  const getCategoryPool = (pool, fallbackPool) => pool.length > 0 ? pool : fallbackPool;
  const bPool = getCategoryPool(breakfasts, compatibleRecipes);
  const lPool = getCategoryPool(lunches, compatibleRecipes);
  const dPool = getCategoryPool(dinners, compatibleRecipes);
  const sPool = getCategoryPool(snacks, compatibleRecipes);

  const getScaledRecipeCost = (recipe) => {
    const costLocal = getRecipeCostLocal(recipe.id, region, season, dietaryRestrictions);
    return (costLocal / recipe.servings) * familySize;
  };

  const sortPoolByCost = (pool) => {
    return [...pool].sort((a, b) => getScaledRecipeCost(a) - getScaledRecipeCost(b));
  };

  const bSorted = sortPoolByCost(bPool);
  const lSorted = sortPoolByCost(lPool);
  const dSorted = sortPoolByCost(dPool);
  const sSorted = sortPoolByCost(sPool);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const plan = {};

  let budgetTier = 'moderate';
  const cheapestDailyCost = (getScaledRecipeCost(bSorted[0]) + getScaledRecipeCost(lSorted[0]) + getScaledRecipeCost(dSorted[0]) + getScaledRecipeCost(sSorted[0]));

  if (cheapestDailyCost > targetDailyBudget) {
    budgetTier = 'tight';
  } else if (cheapestDailyCost * 1.5 < targetDailyBudget) {
    budgetTier = 'generous';
  }

  const selectRecipe = (sortedPool, dayIndex, type) => {
    let index = 0;
    const poolSize = sortedPool.length;

    if (budgetTier === 'generous') {
      // Rotate through the entire pool (including premium options)
      index = (dayIndex + (type === 'breakfast' ? 0 : type === 'lunch' ? 1 : type === 'dinner' ? 2 : 3)) % poolSize;
    } else if (budgetTier === 'moderate') {
      // Rotate through the cheaper 3 options (if available) to offer budget compliance and variety
      const limit = Math.min(3, poolSize);
      index = (dayIndex + (type === 'breakfast' ? 0 : 1)) % limit;
    } else {
      // Tight budget: strictly pick from the cheapest 2 options
      const limit = Math.min(2, poolSize);
      index = dayIndex % limit;
    }

    if (index >= poolSize) index = 0;
    return sortedPool[index];
  };

  days.forEach((day, idx) => {
    const breakfast = selectRecipe(bSorted, idx, 'breakfast');
    const lunch = selectRecipe(lSorted, idx, 'lunch');
    const dinner = selectRecipe(dSorted, idx, 'dinner');
    const snack = selectRecipe(sSorted, idx, 'snack');

    plan[day] = {
      breakfast: { id: breakfast.id, name: breakfast.name, cost: getScaledRecipeCost(breakfast) },
      lunch: { id: lunch.id, name: lunch.name, cost: getScaledRecipeCost(lunch) },
      dinner: { id: dinner.id, name: dinner.name, cost: getScaledRecipeCost(dinner) },
      snack: { id: snack.id, name: snack.name, cost: getScaledRecipeCost(snack) }
    };
  });

  return plan;
}

/**
 * Returns a list of alternative recipes for a specific meal slot that match dietary restrictions.
 */
export function getMealAlternatives(mealType, state) {
  const { familyMembers, region, season, dietaryRestrictions } = state;
  const familySize = familyMembers.length;

  const compatible = RECIPES.filter(r => r.mealType === mealType && isRecipeCompatible(r.id, dietaryRestrictions));

  return compatible.map(r => {
    const costLocal = getRecipeCostLocal(r.id, region, season, dietaryRestrictions);
    const scaledCost = (costLocal / r.servings) * familySize;
    return {
      id: r.id,
      name: r.name,
      description: r.description,
      cost: scaledCost,
      nutrition: getRecipeNutritionPerServing(r.id, dietaryRestrictions)
    };
  });
}

/**
 * Calculates total cost of a meal plan in local currency.
 */
export function calculatePlanCost(plan) {
  let total = 0;
  for (const day in plan) {
    total += plan[day].breakfast.cost;
    total += plan[day].lunch.cost;
    total += plan[day].dinner.cost;
    total += plan[day].snack.cost;
  }
  return total;
}

/**
 * Aggregates all nutrition from a 7-day meal plan and compares it to 7-day family targets.
 */
export function calculatePlanNutrition(plan, familyDailyTargets, dietaryRestrictions = []) {
  const totals = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sodium: 0, iron: 0, calcium: 0, vitC: 0 };

  for (const day in plan) {
    const dayMeals = plan[day];
    const bNut = getRecipeNutritionPerServing(dayMeals.breakfast.id, dietaryRestrictions);
    const lNut = getRecipeNutritionPerServing(dayMeals.lunch.id, dietaryRestrictions);
    const dNut = getRecipeNutritionPerServing(dayMeals.dinner.id, dietaryRestrictions);
    const sNut = getRecipeNutritionPerServing(dayMeals.snack.id, dietaryRestrictions);

    const addNut = (nutObj) => {
      if (!nutObj) return;
      for (const key in totals) {
        totals[key] += nutObj[key] || 0;
      }
    };

    addNut(bNut);
    addNut(lNut);
    addNut(dNut);
    addNut(sNut);
  }

  const target7Days = {};
  const percentage = {};

  for (const key in familyDailyTargets) {
    target7Days[key] = familyDailyTargets[key] * 7;
    percentage[key] = target7Days[key] > 0 ? Math.round((totals[key] / target7Days[key]) * 100) : 100;
  }

  return {
    actual: totals,
    target: target7Days,
    percentage
  };
}

/**
 * Generates an aggregated grocery shopping list from a 7-day meal plan.
 */
export function generateShoppingList(plan, state, customItems = []) {
  const { familyMembers, region, season, dietaryRestrictions } = state;
  const familySize = familyMembers.length;
  const ingredientsMap = {};

  for (const day in plan) {
    const dayMeals = plan[day];
    const slots = ['breakfast', 'lunch', 'dinner', 'snack'];

    slots.forEach(slot => {
      const meal = dayMeals[slot];
      if (!meal) return;
      const recipe = RECIPES.find(r => r.id === meal.id);
      if (!recipe) return;

      const servingScale = familySize / recipe.servings;

      recipe.ingredients.forEach(ingRef => {
        let finalIngId = ingRef.id;

        if (ingRef.id === 'milk' && (dietaryRestrictions.includes('vegan') || dietaryRestrictions.includes('dairy_free'))) {
          return;
        }
        if (ingRef.id === 'butter' && dietaryRestrictions.includes('vegan')) {
          finalIngId = 'cooking_oil';
        }

        const amtNeeded = ingRef.amount * servingScale;

        if (!ingredientsMap[finalIngId]) {
          ingredientsMap[finalIngId] = 0;
        }
        ingredientsMap[finalIngId] += amtNeeded;
      });
    });
  }

  const listItems = [];
  for (const ingId in ingredientsMap) {
    const totalGramsOrMl = ingredientsMap[ingId];
    const totalUnits = totalGramsOrMl / 1000;

    const unitPriceLocal = getIngredientPriceLocal(ingId, region, season);
    const cost = totalUnits * unitPriceLocal;

    const ingInfo = INGREDIENTS[ingId];

    listItems.push({
      id: ingId,
      name: ingInfo ? ingInfo.name : ingId,
      category: ingInfo ? ingInfo.category : 'Other',
      quantity: parseFloat(totalUnits.toFixed(2)),
      unit: ingInfo ? ingInfo.unit : 'kg',
      cost: parseFloat(cost.toFixed(2)),
      checked: false
    });
  }

  listItems.sort((a, b) => a.category.localeCompare(b.category));

  const activeCustomItems = customItems.map((item, idx) => ({
    id: item.id || `custom_${idx}_${Date.now()}`,
    name: item.name,
    category: 'Custom / Added Items',
    quantity: item.quantity || 1,
    unit: item.unit || 'pcs',
    cost: item.cost || 0,
    checked: item.checked || false,
    isCustom: true
  }));

  return [...listItems, ...activeCustomItems];
}
