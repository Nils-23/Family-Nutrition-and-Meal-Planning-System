// Application Main Entry Point and Orchestration using Cloud Firestore (3NF)
import { 
  getDoc,
  doc, 
  setDoc, 
  deleteDoc,
  updateDoc,
  deleteField
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db } from "./firebase-init.js";
import { generateSalt, hashPassword, verifyPassword, sanitizeText } from "./security.js";
import { 
  initializeFirestoreData,
  REGIONS, 
  SEASONS,
  getRecipeCostLocal,
  DEMO_USERS,
  syncLivePrices
} from './data.js';
import { 
  loadProfileState, 
  saveProfileState, 
  calculateDinerNeeds,
  getCurrentStudentID
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
let syncPending = false;          // true while an auto-sync is running
const STUDENT_ID = getCurrentStudentID();

// Initialize the Application
document.addEventListener('DOMContentLoaded', async () => {
  const loadingOverlay = document.getElementById('loading-overlay');
  const loadingStatus = document.getElementById('loading-status');

  try {
    // 1. Initialize Firestore catalogs (Seed if empty, including demo student accounts)
    const initPromise = (async () => {
      await initializeFirestoreData(status => {
        loadingStatus.textContent = status;
      });
    })();

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error("Database connection timed out. The Cloud Firestore API is likely disabled or your database is not yet provisioned."));
      }, 25000);
    });

    await Promise.race([initPromise, timeoutPromise]);

    // 2. Check if student user is logged in
    const loggedInUser = localStorage.getItem('studentbite_logged_in_user');

    if (!loggedInUser) {
      // Show login overlay/form and hide app layout
      document.querySelector('.app-container').style.display = 'none';
      document.getElementById('login-container').style.display = 'flex';
      loadingOverlay.classList.add('hidden');

      // Populate demo account badge list
      const demoGrid = document.getElementById('login-demo-users-grid');
      demoGrid.innerHTML = '';
      DEMO_USERS.forEach(user => {
        const badge = document.createElement('button');
        badge.type = 'button';
        badge.className = 'demo-user-badge';
        badge.textContent = user.username;
        badge.addEventListener('click', () => {
          document.getElementById('login-username').value = user.username;
          document.getElementById('login-password').value = user.username; // password is same as username
          document.getElementById('login-password').focus();
        });
        demoGrid.appendChild(badge);
      });

      // Bind Login Form submit listener
      const loginForm = document.getElementById('login-form');
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = sanitizeText(document.getElementById('login-username').value, 64).toLowerCase();
        const password = document.getElementById('login-password').value;
        const errorEl = document.getElementById('login-error');
        errorEl.textContent = '';

        loadingOverlay.classList.remove('hidden');
        loadingStatus.textContent = "Authenticating...";

        try {
          const userDocRef = doc(db, "users", username);
          const userSnap = await getDoc(userDocRef);
          if (!userSnap.exists()) {
            loadingOverlay.classList.add('hidden');
            errorEl.textContent = "Account not found. Select a demo profile below.";
            return;
          }

          const userData = userSnap.data();

          // Verify credentials against the encrypted (salted SHA-256) password.
          let authOK = false;
          if (userData.passwordHash && userData.salt) {
            authOK = await verifyPassword(password, userData.salt, userData.passwordHash);
          } else if (typeof userData.password === 'string') {
            // Legacy plain-text account: verify once, then transparently upgrade
            // it to an encrypted hash and remove the plain-text field.
            authOK = userData.password === password;
            if (authOK) {
              try {
                const salt = generateSalt();
                const passwordHash = await hashPassword(password, salt);
                await updateDoc(userDocRef, { passwordHash, salt, password: deleteField() });
              } catch (mErr) {
                console.warn("Password upgrade skipped", mErr);
              }
            }
          }

          if (!authOK) {
            loadingOverlay.classList.add('hidden');
            errorEl.textContent = "Incorrect password.";
            return;
          }

          // Successful login
          localStorage.setItem('studentbite_logged_in_user', username);
          location.reload(); // Reload page to parse with new user
        } catch (err) {
          loadingOverlay.classList.add('hidden');
          console.error("Login verification failed", err);
          errorEl.textContent = "Database connection error. Try again.";
        }
      });
      return; // Stop initialization
    }

    // User is logged in: load user state data
    loadingOverlay.classList.remove('hidden');
    loadingStatus.textContent = "Loading Profile Settings...";

    // Load User Profile from Firestore
    appState = await loadProfileState();

    loadingStatus.textContent = "Loading Active Meal Plan...";

    // Load Active Plan from Firestore
    activePlan = await loadActivePlan(appState);

    loadingStatus.textContent = "Loading Groceries Shopping List...";

    // Load Custom Shopping Items and Checklist Checks from Firestore
    const shopDocRef = doc(db, "shopping_lists", STUDENT_ID);
    const shopDocSnap = await getDoc(shopDocRef);
    
    customShoppingItems = [];
    let checklistStates = {};
    
    if (shopDocSnap.exists()) {
      const shopData = shopDocSnap.data();
      customShoppingItems = shopData.customItems || [];
      checklistStates = shopData.checkedStates || {};
    }
    
    localStorage.setItem('student_nutrition_custom_shopping_items', JSON.stringify(customShoppingItems));
    localStorage.setItem('student_nutrition_checklist_states', JSON.stringify(checklistStates));

    // Setup dialog dismissal fallbacks
    setupDialogDismissFallbacks();

    // Set up navigation click handlers
    setupNavigation();

    // Set up Profile settings handlers
    setupProfileHandlers();

    // Set up Planner handlers
    setupPlannerHandlers();

    // Set up Shopping List handlers
    setupShoppingHandlers();

    // Set up Price Explorer search
    setupExplorerHandlers();

    // Setup Sign Out Handler
    const signOutBtn = document.getElementById('btn-signout');
    if (signOutBtn) {
      signOutBtn.addEventListener('click', () => {
        localStorage.removeItem('studentbite_logged_in_user');
        location.reload();
      });
    }

    // Hide loading overlay and trigger Initial View Draw
    loadingOverlay.classList.add('hidden');
    switchView('dashboard');

  } catch (error) {
    console.error("Initialization failed", error);
    loadingStatus.innerHTML = `<span style="color: var(--accent-coral); font-weight: 600;">Error:</span> ${error.message}<br><br><span style="font-size:0.8rem; color:var(--color-text-muted);">Please click the link sent in the chat to enable the Firestore API, wait 1-2 minutes, then refresh this page.</span>`;
  }
});

// View Swapping Logic
function switchView(viewName) {
  // Block navigation while a region sync is running
  if (syncPending) {
    showSyncToast('syncing', '⏳ Sync in progress—please wait…');
    return;
  }
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

// Show / update the fixed bottom-right sync toast
function showSyncToast(type, message) {
  const toast   = document.getElementById('sync-toast');
  const iconEl  = document.getElementById('sync-toast-icon');
  const msgEl   = document.getElementById('sync-toast-msg');
  if (!toast) return;

  // Update text
  if (msgEl) msgEl.textContent = message;

  // Set icon based on type
  if (iconEl) {
    iconEl.textContent = type === 'success' ? '✅' : type === 'error' ? '❌' : '⏳';
  }

  // Swap state class
  toast.classList.remove('toast-syncing', 'toast-success', 'toast-error');
  toast.classList.add(`toast-${type}`, 'visible');
}

function hideSyncToast() {
  const toast = document.getElementById('sync-toast');
  if (toast) toast.classList.remove('visible');
}

// 2. Profile Event Handlers
function setupProfileHandlers() {
  let lastSyncedRegion = null;
  const form = document.getElementById('profile-config-form');

  // -------------------------------------------------------
  // Shared price-sync runner — called automatically when the
  // region dropdown changes AND by the manual sync button.
  // -------------------------------------------------------
  async function runPriceSync(targetRegion) {
    const statusSpan    = document.getElementById('price-sync-status');
    const indicatorSpan = document.getElementById('price-sync-indicator');

    // Mark sync as running — blocks navigation and form save
    syncPending = true;

    // Show spinning toast
    showSyncToast('syncing', `Syncing prices for ${REGIONS[targetRegion]?.name || targetRegion}…`);
    if (indicatorSpan) indicatorSpan.style.display = 'none';
    if (statusSpan)    statusSpan.textContent = 'Syncing…';

    try {
      const count = await syncLivePrices(targetRegion, (msg) => {
        if (statusSpan) statusSpan.textContent = msg;
        showSyncToast('syncing', msg);
      }, appState.opeApiKey);

      lastSyncedRegion = targetRegion;
      appState.lastPriceSync = new Date().toLocaleString();
      await saveProfileState(appState);

      if (indicatorSpan) {
        indicatorSpan.className = 'gauge-status-badge badge-success';
        indicatorSpan.textContent = 'Synced';
        indicatorSpan.style.display = 'inline-block';
      }
      if (statusSpan) statusSpan.textContent = `Last Sync: ${appState.lastPriceSync} (${count} updated)`;

      // Success toast — auto-dismisses after 3 s
      showSyncToast('success', `✅ Synced ${count} prices for ${REGIONS[targetRegion]?.name || targetRegion}`);
      setTimeout(() => hideSyncToast(), 3000);

      if (activePlan) {
        regeneratePlanCosts();
      } else {
        renderActiveView();
      }
    } catch (err) {
      console.error('Price sync failed', err);
      if (statusSpan) statusSpan.textContent = 'Sync failed: ' + err.message;
      if (indicatorSpan) {
        indicatorSpan.className = 'gauge-status-badge badge-danger';
        indicatorSpan.textContent = 'Error';
        indicatorSpan.style.display = 'inline-block';
      }
      // Error toast stays visible until user dismisses or retries
      showSyncToast('error', `❌ Sync failed: ${err.message}`);
      setTimeout(() => hideSyncToast(), 6000);
    } finally {
      syncPending = false;
    }
  }

  // -------------------------------------------------------
  // Region dropdown — auto-sync immediately on change
  // -------------------------------------------------------
  const regionSelect = document.getElementById('profile-region');
  if (regionSelect) {
    regionSelect.addEventListener('change', () => {
      const newRegion = regionSelect.value;
      // Kick off auto-sync for the newly selected region
      runPriceSync(newRegion);
    });
  }

  // -------------------------------------------------------
  // Profile settings form submit
  // -------------------------------------------------------
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Block save while sync is still running
    if (syncPending) {
      showSyncToast('syncing', '⏳ Sync in progress—please wait before saving.');
      return;
    }

    const selectedRegion    = document.getElementById('profile-region').value;
    const selectedSeason    = document.getElementById('profile-season').value;
    const allowanceAmount   = parseFloat(document.getElementById('profile-allowance-amount').value);
    const remainingCash     = parseFloat(document.getElementById('profile-remaining-cash').value);
    const allowanceDate     = document.getElementById('profile-allowance-date').value;
    const emailInput        = document.getElementById('profile-ope-email');
    const opeEmail          = emailInput ? emailInput.value.trim() : '';

    const checkedRestrictions = [];
    const checkboxes = document.querySelectorAll('#profile-dietary-checkboxes input[type="checkbox"]');
    checkboxes.forEach(cb => {
      if (cb.checked) checkedRestrictions.push(cb.value);
    });

    appState.region              = selectedRegion;
    appState.season              = selectedSeason;
    appState.monthlyAllowance    = allowanceAmount;
    appState.remainingBudget     = remainingCash;
    appState.nextAllowanceDate   = allowanceDate;
    appState.dietaryRestrictions = checkedRestrictions;
    appState.opeEmail            = opeEmail;

    showSavingIndicator(true);
    try {
      await saveProfileState(appState);

      if (activePlan) {
        const confirmRegen = confirm('You have updated your budget, region, season, or dietary options. Would you like to regenerate your meal plan to match these settings?');
        if (confirmRegen) {
          await triggerPlanGeneration();
        } else {
          regeneratePlanCosts();
        }
      }

      renderActiveView();
      alert('Profile configurations saved to Database!');
    } catch (err) {
      alert('Error saving configurations: ' + err.message);
    } finally {
      showSavingIndicator(false);
    }
  });


  // Request Renewal OTP Click Event Handler
  const reqOtpBtn = document.getElementById('btn-request-renewal-otp');
  if (reqOtpBtn) {
    reqOtpBtn.addEventListener('click', async () => {
      const emailInput = document.getElementById('profile-ope-email');
      const email = emailInput ? emailInput.value.trim() : '';
      if (!email) {
        alert("Please enter a valid OPE Registered Email first.");
        return;
      }
      
      const initialText = reqOtpBtn.textContent;
      reqOtpBtn.disabled = true;
      reqOtpBtn.textContent = '⏳ Requesting...';
      
      try {
        const url = `https://openpricengine.com/auth/refresh/api_key/request?email=${encodeURIComponent(email)}&plan=free`;
        const response = await fetch(url, { method: 'POST' });
        
        if (!response.ok) {
          throw new Error(`Failed to request OTP: HTTP ${response.status}`);
        }
        
        // Save the email in state and Firestore
        appState.opeEmail = email;
        await saveProfileState(appState);
        
        alert("OTP has been sent to your email. Please check your inbox and spam folder.");
        
        // Open the verification modal
        const modalOtp = document.getElementById('modal-otp');
        if (modalOtp) {
          modalOtp.showModal();
        }
      } catch (err) {
        alert("Error requesting OTP: " + err.message);
      } finally {
        reqOtpBtn.disabled = false;
        reqOtpBtn.textContent = initialText;
      }
    });
  }

  // OTP Verification Form Submit Event Handler
  const otpForm = document.getElementById('otp-verification-form');
  if (otpForm) {
    otpForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const emailInput = document.getElementById('profile-ope-email');
      const email = emailInput ? emailInput.value.trim() : '';
      const otpInput = document.getElementById('otp-code');
      const otp = otpInput ? otpInput.value.trim() : '';
      
      if (!email || !otp) {
        alert("Email and OTP are required.");
        return;
      }
      
      const submitBtn = otpForm.querySelector('button[type="submit"]');
      const initialBtnText = submitBtn ? submitBtn.textContent : '';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = '⏳ Verifying...';
      }
      
      try {
        const url = `https://openpricengine.com/auth/refresh/api_key?email=${encodeURIComponent(email)}&otp=${encodeURIComponent(otp)}&plan=free`;
        const response = await fetch(url, { method: 'POST' });
        
        if (!response.ok) {
          throw new Error(`Verification failed: HTTP ${response.status}`);
        }
        
        const data = await response.json();
        const newKey = data.api_key || data.key || data.token || data.apiKey;
        if (!newKey) {
          throw new Error("Could not find refreshed API key in the response.");
        }
        
        // Update profile state variables
        appState.opeApiKey = newKey;
        appState.opeEmail = email;
        appState.opeKeyLastRenewed = new Date().toISOString().split('T')[0];
        
        // Save to Database
        await saveProfileState(appState);
        
        // Close the modal
        const modalOtp = document.getElementById('modal-otp');
        if (modalOtp) {
          modalOtp.close();
        }
        
        alert("API Key successfully renewed and updated in the user profile!");
        
        // Refresh UI to display new key status and enable sync
        renderActiveView();
        
        // Automatically trigger a price sync for the current region
        const currentRegion = document.getElementById('profile-region')?.value || appState.region;
        runPriceSync(currentRegion);
      } catch (err) {
        alert("Verification failed: " + err.message);
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = initialBtnText;
        }
      }
    });
  }

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

    appState.diners.push(newMember);

    showSavingIndicator(true);
    try {
      await saveProfileState(appState);
      modalMember.close();
      
      renderMembers(appState, handleMemberDelete);
      updateProfileNutritionTarget();
      
      if (activePlan) {
        const regen = confirm("A new diner has been added. Would you like to regenerate the meal plan to satisfy their nutritional requirements and scale the budget?");
        if (regen) {
          await triggerPlanGeneration();
        } else {
          regeneratePlanCosts();
        }
      }
    } catch (err) {
      alert("Failed to add diner: " + err.message);
    } finally {
      showSavingIndicator(false);
    }
  });
}

async function handleMemberDelete(memberId) {
  if (appState.diners.length <= 1) {
    alert("You must keep at least one diner in your profile.");
    return;
  }
  
  if (confirm("Are you sure you want to remove this diner?")) {
    appState.diners = appState.diners.filter(m => m.id !== memberId);
    
    showSavingIndicator(true);
    try {
      await saveProfileState(appState);
      
      renderMembers(appState, handleMemberDelete);
      updateProfileNutritionTarget();
      
      if (activePlan) {
        const regen = confirm("The number of diners has changed. Regenerate the meal plan to optimize nutrition and budget?");
        if (regen) {
          await triggerPlanGeneration();
        } else {
          regeneratePlanCosts();
        }
      }
    } catch (err) {
      alert("Failed to remove diner: " + err.message);
    } finally {
      showSavingIndicator(false);
    }
  }
}

function updateProfileNutritionTarget() {
  const targetCaloriesSpan = document.getElementById('profile-target-calories');
  const needs = calculateDinerNeeds(appState.diners, appState.dietaryRestrictions);
  targetCaloriesSpan.innerHTML = `${Math.round(needs.calories)} kcal <span style="font-size:0.9rem; font-weight:normal; color:var(--color-text-muted);">/ day</span>`;
}

function regeneratePlanCosts() {
  if (!activePlan) return;
  // Re-scale local memory costs of existing recipes in active plan based on new profile settings
  const familySize = appState.diners.length;
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
  if (appState.diners.length === 0) {
    alert("Please add at least one diner in the Student Profile page first.");
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
    const shopDocRef = doc(db, "shopping_lists", STUDENT_ID);
    await setDoc(shopDocRef, {
      customItems: customShoppingItems,
      checkedStates: {}
    });
    
    // Reset local checked states registry
    localStorage.setItem('student_nutrition_checklist_states', JSON.stringify({}));
    
    renderActiveView();
    alert("A new budget-optimized 7-day meal plan has been generated and saved to Firestore!");
  } catch(e) {
    alert(e.message);
  } finally {
    showSavingIndicator(false);
  }
}

function handleRecipeClick(recipeId) {
  showRecipeModal(recipeId, appState);
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
      const shopDocRef = doc(db, "shopping_lists", STUDENT_ID);
      const checklistStates = JSON.parse(localStorage.getItem('student_nutrition_checklist_states')) || {};
      await setDoc(shopDocRef, {
        customItems: customShoppingItems,
        checkedStates: checklistStates
      });
      
      localStorage.setItem('student_nutrition_custom_shopping_items', JSON.stringify(customShoppingItems));
      
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
        const shopDocRef = doc(db, "shopping_lists", STUDENT_ID);
        await setDoc(shopDocRef, {
          customItems: customShoppingItems,
          checkedStates: {} // reset checklist checks
        });

        localStorage.setItem('student_nutrition_custom_shopping_items', JSON.stringify(customShoppingItems));
        localStorage.setItem('student_nutrition_checklist_states', JSON.stringify({}));

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
    const checklistStates = JSON.parse(localStorage.getItem('student_nutrition_checklist_states')) || {};
    
    if (isCustom) {
      const item = customShoppingItems.find(i => i.id === itemId);
      if (item) {
        item.checked = isChecked;
      }
    } else {
      checklistStates[itemId] = isChecked;
    }
    
    // Save checklist state to Firestore
    const shopDocRef = doc(db, "shopping_lists", STUDENT_ID);
    await setDoc(shopDocRef, {
      customItems: customShoppingItems,
      checkedStates: checklistStates
    });
    
    localStorage.setItem('student_nutrition_custom_shopping_items', JSON.stringify(customShoppingItems));
    localStorage.setItem('student_nutrition_checklist_states', JSON.stringify(checklistStates));
    
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
    const checklistStates = JSON.parse(localStorage.getItem('student_nutrition_checklist_states')) || {};
    
    const shopDocRef = doc(db, "shopping_lists", STUDENT_ID);
    await setDoc(shopDocRef, {
      customItems: customShoppingItems,
      checkedStates: checklistStates
    });

    localStorage.setItem('student_nutrition_custom_shopping_items', JSON.stringify(customShoppingItems));
    
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

  const checklistStates = JSON.parse(localStorage.getItem('student_nutrition_checklist_states')) || {};
  const activeList = generateShoppingList(activePlan, appState, customShoppingItems);
  
  activeList.forEach(item => {
    if (!item.isCustom && checklistStates[item.id] !== undefined) {
      item.checked = checklistStates[item.id];
    }
  });

  let text = `🛒 StudentBite Grocery Shopping List\n`;
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
  text += `Generated with StudentBite Smart Planner System.`;

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
