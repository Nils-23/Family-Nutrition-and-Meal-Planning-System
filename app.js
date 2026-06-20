// Application Main Entry Point and Orchestration using Cloud Firestore (3NF)
import { 
  getDoc,
  doc, 
  setDoc, 
  deleteDoc, 
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db } from "./firebase-init.js";
import { 
  initializeFirestoreData,
  REGIONS, 
  SEASONS,
  getRecipeCostLocal
} from './data.js';
import { 
  loadProfileState, 
  saveProfileState, 
  calculateFamilyNeeds 
} from './profile.js';
import { 
  loadActivePlan,
  saveActivePlan,
  updateMealPlanSlot,
  clearActivePlan,
  generateMealPlan, 
  calculatePlanCost,
  generateShoppingList
} from './planner.js';
import { 
  setupDialogDismissFallbacks, 
  initProfileForm, 
  renderMembers, 
  renderDashboard, 
  renderPlanner, 
  renderNutrition, 
  renderExplorer, 
  renderShoppingList,
  showRecipeModal,
  showSwapModal
} from './ui.js';

// Application State Variables
let appState = null;
let activePlan = null;
let customShoppingItems = [];
let currentView = 'dashboard';
const FAMILY_ID = 'default_family';

// Initialize the Application
document.addEventListener('DOMContentLoaded', async () => {
  const loadingOverlay = document.getElementById('loading-overlay');
  const loadingStatus = document.getElementById('loading-status');

  try {
    // 1. Initialize Firestore catalogs (Seed if empty) and load states with a 7-second connection timeout
    const initPromise = (async () => {
      await initializeFirestoreData(status => {
        loadingStatus.textContent = status;
      });

      loadingStatus.textContent = "Loading Profile Settings...";

      // 2. Load User Profile from Firestore
      appState = await loadProfileState();

      loadingStatus.textContent = "Loading Active Meal Plan...";

      // 3. Load Active Plan from Firestore
      activePlan = await loadActivePlan(appState);

      loadingStatus.textContent = "Loading Groceries Shopping List...";

      // 4 & 5. Load Custom Shopping Items and Checklist Checks from Firestore
      const shopDocRef = doc(db, "shopping_lists", FAMILY_ID);
      const shopDocSnap = await getDoc(shopDocRef);
      
      customShoppingItems = [];
      let checklistStates = {};
      
      if (shopDocSnap.exists()) {
        const shopData = shopDocSnap.data();
        customShoppingItems = shopData.customItems || [];
        checklistStates = shopData.checkedStates || {};
      }
      
      localStorage.setItem('family_nutrition_custom_shopping_items', JSON.stringify(customShoppingItems));
      localStorage.setItem('family_nutrition_checklist_states', JSON.stringify(checklistStates));
    })();

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error("Database connection timed out. The Cloud Firestore API is likely disabled or your database is not yet provisioned."));
      }, 25000);
    });

    await Promise.race([initPromise, timeoutPromise]);

    // 6. Setup dialog dismissal fallbacks
    setupDialogDismissFallbacks();

    // 7. Set up navigation click handlers
    setupNavigation();

    // 8. Set up Profile settings handlers
    setupProfileHandlers();

    // 9. Set up Planner handlers
    setupPlannerHandlers();

    // 10. Set up Shopping List handlers
    setupShoppingHandlers();

    // 11. Set up Price Explorer search
    setupExplorerHandlers();

    // 12. Hide loading overlay and trigger Initial View Draw
    loadingOverlay.classList.add('hidden');
    switchView('dashboard');

  } catch (error) {
    console.error("Initialization failed", error);
    loadingStatus.innerHTML = `<span style="color: var(--accent-coral); font-weight: 600;">Error:</span> ${error.message}<br><br><span style="font-size:0.8rem; color:var(--color-text-muted);">Please click the link sent in the chat to enable the Firestore API, wait 1-2 minutes, then refresh this page.</span>`;
    // Keep overlay visible showing the error
  }
});

// View Swapping Logic
function switchView(viewName) {
  currentView = viewName;
  
  // Update nav menu active states
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    if (link.id === `nav-${viewName}`) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  // Toggle visible sections
  const sections = document.querySelectorAll('.view-section');
  sections.forEach(sec => {
    if (sec.id === `view-${viewName}`) {
      sec.classList.remove('hidden');
    } else {
      sec.classList.add('hidden');
    }
  });

  // Render view-specific content
  renderActiveView();
}

function renderActiveView() {
  if (currentView === 'dashboard') {
    renderDashboard(appState, activePlan);
  } else if (currentView === 'profile') {
    initProfileForm(appState);
    renderMembers(appState, handleMemberDelete);
  } else if (currentView === 'planner') {
    renderPlanner(appState, activePlan, handleRecipeClick, handleSwapClick);
  } else if (currentView === 'nutrition') {
    renderNutrition(appState, activePlan);
  } else if (currentView === 'explorer') {
    const searchString = document.getElementById('explorer-search').value;
    const cat = document.getElementById('explorer-category').value;
    renderExplorer(appState, searchString, cat);
  } else if (currentView === 'shopping') {
    renderShoppingList(appState, activePlan, customShoppingItems, handleShoppingCheckToggle, handleCustomShoppingDelete);
  }
}

// 1. Navigation Sidebar Event Setup
function setupNavigation() {
  const navIds = ['dashboard', 'profile', 'planner', 'nutrition', 'explorer', 'shopping'];
  navIds.forEach(id => {
    document.getElementById(`nav-${id}`).addEventListener('click', () => {
      switchView(id);
    });
  });

  document.getElementById('dashboard-view-nutrition-btn').addEventListener('click', () => {
    switchView('nutrition');
  });
}

// Show a small inline saving loader overlay when writing to database
function showSavingIndicator(show) {
  const brandIcon = document.querySelector('.brand-icon');
  if (brandIcon) {
    if (show) {
      brandIcon.style.animation = 'spin 1.5s linear infinite';
    } else {
      brandIcon.style.animation = 'none';
    }
  }
}

// 2. Profile Event Handlers
function setupProfileHandlers() {
  const form = document.getElementById('profile-config-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const selectedRegion = document.getElementById('profile-region').value;
    const selectedSeason = document.getElementById('profile-season').value;
    const budgetPeriod = document.getElementById('profile-budget-period').value;
    const budgetAmount = parseFloat(document.getElementById('profile-budget-amount').value);

    const checkedRestrictions = [];
    const checkboxes = document.querySelectorAll('#profile-dietary-checkboxes input[type="checkbox"]');
    checkboxes.forEach(cb => {
      if (cb.checked) {
        checkedRestrictions.push(cb.value);
      }
    });

    appState.region = selectedRegion;
    appState.season = selectedSeason;
    appState.budgetPeriod = budgetPeriod;
    appState.budget = budgetAmount;
    appState.dietaryRestrictions = checkedRestrictions;

    showSavingIndicator(true);
    try {
      // Save changes to Firestore
      await saveProfileState(appState);

      if (activePlan) {
        const confirmRegen = confirm("You have updated your budget, region, season, or dietary options. Would you like to regenerate your meal plan to match these settings?");
        if (confirmRegen) {
          await triggerPlanGeneration();
        } else {
          // Re-scale the local memory representation of activePlan costs
          regeneratePlanCosts();
        }
      }

      renderActiveView();
      alert("Profile configurations saved to Database!");
    } catch (err) {
      alert("Error saving configurations: " + err.message);
    } finally {
      showSavingIndicator(false);
    }
  });

  // Add Member Modal handlers
  const addMemberBtn = document.getElementById('btn-add-member');
  const modalMember = document.getElementById('modal-member');
  
  addMemberBtn.addEventListener('click', () => {
    document.getElementById('add-member-form').reset();
    modalMember.showModal();
  });

  const memberForm = document.getElementById('add-member-form');
  memberForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('member-name').value;
    const age = parseInt(document.getElementById('member-age').value);
    const gender = document.getElementById('member-gender').value;
    const activity = document.getElementById('member-activity').value;

    const newMember = {
      id: `m_${Date.now()}`,
      name,
      age,
      gender,
      activityLevel: activity
    };

    appState.familyMembers.push(newMember);

    showSavingIndicator(true);
    try {
      await saveProfileState(appState);
      modalMember.close();
      
      renderMembers(appState, handleMemberDelete);
      updateProfileNutritionTarget();
      
      if (activePlan) {
        const regen = confirm("A new household member has been added. Would you like to regenerate the meal plan to satisfy their nutritional requirements and scale the budget?");
        if (regen) {
          await triggerPlanGeneration();
        } else {
          regeneratePlanCosts();
        }
      }
    } catch (err) {
      alert("Failed to add member: " + err.message);
    } finally {
      showSavingIndicator(false);
    }
  });
}

async function handleMemberDelete(memberId) {
  if (appState.familyMembers.length <= 1) {
    alert("You must keep at least one household member in your profile.");
    return;
  }
  
  if (confirm("Are you sure you want to remove this member?")) {
    appState.familyMembers = appState.familyMembers.filter(m => m.id !== memberId);
    
    showSavingIndicator(true);
    try {
      await saveProfileState(appState);
      
      renderMembers(appState, handleMemberDelete);
      updateProfileNutritionTarget();
      
      if (activePlan) {
        const regen = confirm("Household size has changed. Regenerate the meal plan to optimize nutrition and budget?");
        if (regen) {
          await triggerPlanGeneration();
        } else {
          regeneratePlanCosts();
        }
      }
    } catch (err) {
      alert("Failed to remove member: " + err.message);
    } finally {
      showSavingIndicator(false);
    }
  }
}

function updateProfileNutritionTarget() {
  const targetCaloriesSpan = document.getElementById('profile-target-calories');
  const needs = calculateFamilyNeeds(appState.familyMembers, appState.dietaryRestrictions);
  targetCaloriesSpan.innerHTML = `${Math.round(needs.calories)} kcal <span style="font-size:0.9rem; font-weight:normal; color:var(--color-text-muted);">/ day</span>`;
}

function regeneratePlanCosts() {
  if (!activePlan) return;
  // Re-scale local memory costs of existing recipes in active plan based on new profile settings
  const familySize = appState.familyMembers.length;
  import('./data.js').then(({ RECIPES, getRecipeCostLocal }) => {
    for (const day in activePlan) {
      const dayMeals = activePlan[day];
      ['breakfast', 'lunch', 'dinner', 'snack'].forEach(slot => {
        const r = RECIPES.find(recipe => recipe.id === dayMeals[slot].id);
        if (r) {
          const costLocal = getRecipeCostLocal(dayMeals[slot].id, appState.region, appState.season, appState.dietaryRestrictions);
          dayMeals[slot].cost = (costLocal / r.servings) * familySize;
        }
      });
    }
    renderActiveView();
  });
}

// 3. Planner Event Handlers
function setupPlannerHandlers() {
  document.getElementById('btn-generate-plan').addEventListener('click', async () => {
    await triggerPlanGeneration();
  });
}

async function triggerPlanGeneration() {
  if (appState.familyMembers.length === 0) {
    alert("Please add at least one household member in the Nutrition Profile page first.");
    switchView('profile');
    return;
  }

  showSavingIndicator(true);
  try {
    const newPlan = generateMealPlan(appState);
    
    // Save generated plan documents to Firestore
    await saveActivePlan(newPlan);
    activePlan = newPlan;

    // Clear shopping checklist item checked states in Firestore
    const shopDocRef = doc(db, "shopping_lists", FAMILY_ID);
    await setDoc(shopDocRef, {
      customItems: customShoppingItems,
      checkedStates: {}
    });
    
    // Reset local checked states registry
    localStorage.setItem('family_nutrition_checklist_states', JSON.stringify({}));
    
    renderActiveView();
    alert("A new budget-optimized 7-day meal plan has been generated and saved to Firestore!");
  } catch(e) {
    alert(e.message);
  } finally {
    showSavingIndicator(false);
  }
}

function handleRecipeClick(recipeId) {
  showRecipeModal(recipeId, appState.dietaryRestrictions, appState.region, appState.season);
}

function handleSwapClick(day, slot) {
  showSwapModal(day, slot, appState, async (day, slot, selectedRecipeId, selectedRecipeName, selectedRecipeCost) => {
    showSavingIndicator(true);
    try {
      // 1. Update the database document
      await updateMealPlanSlot(day, slot, selectedRecipeId);

      // 2. Update local state
      activePlan[day][slot] = {
        id: selectedRecipeId,
        name: selectedRecipeName,
        cost: selectedRecipeCost
      };
      
      renderActiveView();
    } catch (err) {
      alert("Failed to swap meal: " + err.message);
    } finally {
      showSavingIndicator(false);
    }
  });
}

// 4. Shopping List Handlers
function setupShoppingHandlers() {
  // Form submission for custom list items
  const form = document.getElementById('shopping-custom-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('custom-item-name').value;
    const qty = parseFloat(document.getElementById('custom-item-qty').value);
    const unit = document.getElementById('custom-item-unit').value;
    const localCost = parseFloat(document.getElementById('custom-item-cost').value) || 0;

    showSavingIndicator(true);
    try {
      const newItem = {
        id: `c_${Date.now()}`,
        name,
        category: 'Custom / Added Items',
        quantity: qty,
        unit,
        cost: localCost,
        checked: false
      };

      customShoppingItems.push(newItem);

      // Save updated custom items to Firestore
      const shopDocRef = doc(db, "shopping_lists", FAMILY_ID);
      const checklistStates = JSON.parse(localStorage.getItem('family_nutrition_checklist_states')) || {};
      await setDoc(shopDocRef, {
        customItems: customShoppingItems,
        checkedStates: checklistStates
      });
      
      localStorage.setItem('family_nutrition_custom_shopping_items', JSON.stringify(customShoppingItems));
      
      form.reset();
      renderActiveView();
    } catch (err) {
      alert("Failed to add custom item: " + err.message);
    } finally {
      showSavingIndicator(false);
    }
  });

  // Clear checked items
  document.getElementById('btn-clear-checked').addEventListener('click', async () => {
    if (confirm("Are you sure you want to clear all checked items from your shopping checklist?")) {
      showSavingIndicator(true);
      try {
        // Filter out checked custom items
        customShoppingItems = customShoppingItems.filter(item => !item.checked);
        
        // Save to Firestore
        const shopDocRef = doc(db, "shopping_lists", FAMILY_ID);
        await setDoc(shopDocRef, {
          customItems: customShoppingItems,
          checkedStates: {} // reset checklist checks
        });

        localStorage.setItem('family_nutrition_custom_shopping_items', JSON.stringify(customShoppingItems));
        localStorage.setItem('family_nutrition_checklist_states', JSON.stringify({}));

        renderActiveView();
      } catch (err) {
        alert("Failed to clear items: " + err.message);
      } finally {
        showSavingIndicator(false);
      }
    }
  });

  // Copy shopping list to clipboard
  document.getElementById('btn-copy-list').addEventListener('click', () => {
    copyShoppingListToClipboard();
  });
}

async function handleShoppingCheckToggle(itemId, isChecked, isCustom) {
  showSavingIndicator(true);
  try {
    const checklistStates = JSON.parse(localStorage.getItem('family_nutrition_checklist_states')) || {};
    
    if (isCustom) {
      const item = customShoppingItems.find(i => i.id === itemId);
      if (item) {
        item.checked = isChecked;
      }
    } else {
      checklistStates[itemId] = isChecked;
    }
    
    // Save checklist state to Firestore
    const shopDocRef = doc(db, "shopping_lists", FAMILY_ID);
    await setDoc(shopDocRef, {
      customItems: customShoppingItems,
      checkedStates: checklistStates
    });
    
    localStorage.setItem('family_nutrition_custom_shopping_items', JSON.stringify(customShoppingItems));
    localStorage.setItem('family_nutrition_checklist_states', JSON.stringify(checklistStates));
    
    renderActiveView();
  } catch (err) {
    console.error("Failed to toggle checkbox", err);
  } finally {
    showSavingIndicator(false);
  }
}

async function handleCustomShoppingDelete(itemId) {
  showSavingIndicator(true);
  try {
    customShoppingItems = customShoppingItems.filter(item => item.id !== itemId);
    const checklistStates = JSON.parse(localStorage.getItem('family_nutrition_checklist_states')) || {};
    
    const shopDocRef = doc(db, "shopping_lists", FAMILY_ID);
    await setDoc(shopDocRef, {
      customItems: customShoppingItems,
      checkedStates: checklistStates
    });

    localStorage.setItem('family_nutrition_custom_shopping_items', JSON.stringify(customShoppingItems));
    
    renderActiveView();
  } catch (err) {
    alert("Failed to delete custom item: " + err.message);
  } finally {
    showSavingIndicator(false);
  }
}

function copyShoppingListToClipboard() {
  if (!activePlan) return;

  const regConfig = REGIONS[appState.region] || REGIONS.usa;
  const currencySymbol = regConfig.label;

  const checklistStates = JSON.parse(localStorage.getItem('family_nutrition_checklist_states')) || {};
  const activeList = generateShoppingList(activePlan, appState, customShoppingItems);
  
  activeList.forEach(item => {
    if (!item.isCustom && checklistStates[item.id] !== undefined) {
      item.checked = checklistStates[item.id];
    }
  });

  let text = `🛒 NourishPlan Grocery Shopping List\n`;
  text += `Region: ${regConfig.name} | Season: ${SEASONS[appState.season].name.split(' / ')[0]}\n`;
  text += `==========================================\n`;

  let currentCategory = '';
  let totalCost = 0;

  activeList.forEach(item => {
    if (item.category !== currentCategory) {
      currentCategory = item.category;
      text += `\n📁 [ ${currentCategory.toUpperCase()} ]\n`;
    }
    const checkSymbol = item.checked ? '[x]' : '[ ]';
    text += `${checkSymbol} ${item.name} : ${item.quantity} ${item.unit} (${currencySymbol}${item.cost.toFixed(2)})\n`;
    
    if (!item.checked) {
      totalCost += item.cost;
    }
  });

  text += `\n==========================================\n`;
  text += `Estimated Unchecked Items Total: ${currencySymbol}${totalCost.toFixed(2)}\n`;
  text += `Generated with NourishPlan Smart Planner System.`;

  navigator.clipboard.writeText(text).then(() => {
    alert("Grocery shopping list formatted and copied to clipboard!");
  }).catch(err => {
    console.error('Failed to copy to clipboard', err);
    alert("Could not copy shopping list to clipboard. Check browser console.");
  });
}

// 5. Price Explorer Search Event Handlers
function setupExplorerHandlers() {
  const searchInput = document.getElementById('explorer-search');
  const catSelect = document.getElementById('explorer-category');

  searchInput.addEventListener('input', () => {
    renderExplorer(appState, searchInput.value, catSelect.value);
  });

  catSelect.addEventListener('change', () => {
    renderExplorer(appState, searchInput.value, catSelect.value);
  });
}
