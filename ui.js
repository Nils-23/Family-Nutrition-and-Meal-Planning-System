// UI Presentation and Render Layer
import { REGIONS, SEASONS, DIETARY_PRESETS, INGREDIENTS, RECIPES, getIngredientPriceLocal, getRecipeCostLocal, getRecipeNutritionPerServing } from './data.js';
import { calculateDinerNeeds } from './profile.js';
import { calculatePlanCost, calculatePlanNutrition, getMealAlternatives, generateShoppingList } from './planner.js';

// Setup custom dialog fallbacks for browser support
export function setupDialogDismissFallbacks() {
  const dialogs = document.querySelectorAll('dialog');
  dialogs.forEach(dialog => {
    // Listen to close selectors inside each modal
    dialog.querySelectorAll('.dialog-close-btn, .btn-close-modal').forEach(btn => {
      btn.addEventListener('click', () => dialog.close());
    });

    // Coordinates-based backdrop close check for browsers without closedby support
    if (!('closedBy' in HTMLDialogElement.prototype)) {
      dialog.addEventListener('click', (event) => {
        if (event.target !== dialog) return;
        
        const rect = dialog.getBoundingClientRect();
        const isInside = (
          rect.top <= event.clientY &&
          event.clientY <= rect.top + rect.height &&
          rect.left <= event.clientX &&
          event.clientX <= rect.left + rect.width
        );
        
        if (!isInside) {
          dialog.close();
        }
      });
    }
  });
}

// 1. Initialise form inputs on Profile Page
export function initProfileForm(state) {
  const regionSelect = document.getElementById('profile-region');
  const seasonSelect = document.getElementById('profile-season');
  const dietaryContainer = document.getElementById('profile-dietary-checkboxes');
  const allowanceInput = document.getElementById('profile-allowance-amount');
  const remainingInput = document.getElementById('profile-remaining-cash');
  const dateInput = document.getElementById('profile-allowance-date');

  // Populate Regions
  regionSelect.innerHTML = '';
  for (const [key, value] of Object.entries(REGIONS)) {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = `${value.name} (${value.currency})`;
    regionSelect.appendChild(opt);
  }
  regionSelect.value = state.region;

  // Populate Seasons
  seasonSelect.innerHTML = '';
  for (const [key, value] of Object.entries(SEASONS)) {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = value.name;
    seasonSelect.appendChild(opt);
  }
  seasonSelect.value = state.season;

  // Set Allowance fields
  allowanceInput.value = state.monthlyAllowance;
  remainingInput.value = state.remainingBudget;
  dateInput.value = state.nextAllowanceDate || '';
  updateBudgetLabelText(state.region);

  // Populate Dietary options
  dietaryContainer.innerHTML = '';
  for (const [key, value] of Object.entries(DIETARY_PRESETS)) {
    if (key === 'none') continue; // skip standard placeholder, handled by empty array
    
    const label = document.createElement('label');
    label.className = 'checkbox-label';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = key;
    checkbox.checked = state.dietaryRestrictions.includes(key);
    
    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(` ${value.name} - ${value.desc}`));
    dietaryContainer.appendChild(label);
  }

  // Update budget label when region is updated
  if (!regionSelect.dataset.listenerAttached) {
    const onSettingsChange = () => {
      updateBudgetLabelText(regionSelect.value);
    };
    regionSelect.addEventListener('change', onSettingsChange);
    regionSelect.dataset.listenerAttached = 'true';
  }

  // Populate OPE Email and Key
  const opeEmailInput = document.getElementById('profile-ope-email');
  const opeKeyInput = document.getElementById('profile-ope-key');
  if (opeEmailInput) opeEmailInput.value = state.opeEmail || '';
  if (opeKeyInput) opeKeyInput.value = state.opeApiKey || '';

  // Handle warning banner/badge dynamically
  let warningDiv = document.getElementById('ope-key-warning');
  if (!warningDiv) {
    warningDiv = document.createElement('div');
    warningDiv.id = 'ope-key-warning';
    warningDiv.style.marginTop = '0.5rem';
    warningDiv.style.marginBottom = '0.5rem';
    warningDiv.style.fontSize = '0.75rem';
    warningDiv.style.borderRadius = '4px';
    warningDiv.style.padding = '0.5rem';
    warningDiv.style.textAlign = 'center';
    warningDiv.style.fontWeight = '500';
    
    const reqBtn = document.getElementById('btn-request-renewal-otp');
    if (reqBtn && reqBtn.parentNode) {
      reqBtn.parentNode.insertBefore(warningDiv, reqBtn);
    }
  }

  const lastRenewed = state.opeKeyLastRenewed ? new Date(state.opeKeyLastRenewed) : new Date();
  const diffTime = Date.now() - lastRenewed.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays >= 30) {
    warningDiv.className = 'badge-danger';
    warningDiv.style.display = 'block';
    warningDiv.textContent = `⚠️ Key expired! Renew now (Renewed ${diffDays} days ago on ${state.opeKeyLastRenewed})`;
  } else if (diffDays >= 25) {
    warningDiv.className = 'badge-warning';
    warningDiv.style.display = 'block';
    warningDiv.textContent = `⚠️ Key expiring soon! Renew in ${30 - diffDays} days (Renewed on ${state.opeKeyLastRenewed})`;
  } else {
    warningDiv.className = 'badge-success';
    warningDiv.style.display = 'block';
    warningDiv.textContent = `✅ Key is active (Renewed ${diffDays} day(s) ago on ${state.opeKeyLastRenewed})`;
  }

  // Update Price Sync Status
  const priceSyncStatus = document.getElementById('price-sync-status');
  const priceSyncIndicator = document.getElementById('price-sync-indicator');
  if (priceSyncStatus && priceSyncIndicator) {
    if (state.lastPriceSync && state.lastPriceSync !== 'Never') {
      priceSyncStatus.textContent = `Last Sync: ${state.lastPriceSync}`;
      priceSyncIndicator.className = 'gauge-status-badge badge-success';
      priceSyncIndicator.textContent = 'Synced';
    } else {
      priceSyncStatus.textContent = `Last Sync: Offline multipliers`;
      priceSyncIndicator.className = 'gauge-status-badge badge-warning';
      priceSyncIndicator.textContent = 'Offline';
    }
  }
}

function updateBudgetLabelText(regionKey) {
  const allowanceLabel = document.getElementById('allowance-amount-label');
  const remainingLabel = document.getElementById('remaining-cash-label');
  const r = REGIONS[regionKey] || REGIONS.usa;
  if (allowanceLabel) allowanceLabel.textContent = `Monthly Allowance (${r.label} in ${r.currency})`;
  if (remainingLabel) remainingLabel.textContent = `Remaining Food Cash (${r.label} in ${r.currency})`;
}

// 2. Render Household Members List on Profile Page
export function renderMembers(state, onDeleteMember) {
  const container = document.getElementById('profile-members-list');
  container.innerHTML = '';

  if (!state.diners || state.diners.length === 0) {
    container.innerHTML = `
      <div class="text-center" style="padding: 2rem; color: var(--color-text-muted);">
        No diners configured. Add yourself and any flatmates/roommates.
      </div>
    `;
    return;
  }

  state.diners.forEach(m => {
    const card = document.createElement('div');
    card.className = 'member-item-card';
    
    const emoji = m.gender === 'male' ? (m.age < 23 ? '👦' : '👨') : (m.age < 23 ? '👧' : '👩');
    
    card.innerHTML = `
      <div class="member-avatar">${emoji}</div>
      <div class="member-card-info">
        <div class="member-card-name">${m.name}</div>
        <div class="member-card-meta">
          Age: ${m.age} • Gender: ${m.gender} • Activity: ${m.activityLevel}
        </div>
      </div>
      <button class="btn btn-danger btn-sm delete-btn" data-id="${m.id}">Remove</button>
    `;

    card.querySelector('.delete-btn').addEventListener('click', () => {
      onDeleteMember(m.id);
    });

    container.appendChild(card);
  });
}

// 3. Render Dashboard View
export function renderDashboard(state, activePlan) {
  const regConfig = REGIONS[state.region] || REGIONS.usa;
  const seasConfig = SEASONS[state.season] || SEASONS.spring;
  
  // Update Header details (dynamically formats for single student or roommates)
  const memberCount = state.diners.length;
  const primaryName = state.diners[0] ? state.diners[0].name : 'Individual Planner';
  document.getElementById('sidebar-family-size').textContent = memberCount === 1 
    ? primaryName 
    : `${primaryName} & ${memberCount - 1} Roommate${memberCount - 1 > 1 ? 's' : ''}`;
  document.getElementById('sidebar-region-season').textContent = `${regConfig.name.split(' (')[0]} • ${seasConfig.name.split(' / ')[0]}`;

  // If no plan, show blank state
  if (!activePlan || Object.keys(activePlan).length === 0) {
    document.getElementById('dashboard-budget-gauge').style.setProperty('--percent', '0');
    document.getElementById('dashboard-gauge-percent').textContent = '0%';
    document.getElementById('dashboard-target-budget').textContent = `${regConfig.label}0.00`;
    document.getElementById('dashboard-remaining-cash').textContent = `${regConfig.label}0.00`;
    document.getElementById('dashboard-actual-cost').textContent = `${regConfig.label}0.00`;
    
    const statusBadge = document.getElementById('dashboard-budget-status');
    statusBadge.textContent = 'No Plan';
    statusBadge.className = 'gauge-status-badge badge-warning';
    
    document.getElementById('dashboard-budget-text').textContent = 'Please go to the Weekly Planner to generate a meal plan.';
    document.getElementById('dashboard-nutrition-metrics').innerHTML = `
      <div class="text-center" style="grid-column: 1/-1; padding: 2rem; color: var(--color-text-muted);">
        Generate a meal plan to view nutritional targets comparison.
      </div>
    `;
    document.getElementById('dashboard-insights').innerHTML = `
      <div class="insight-item success">
        <div>💡</div>
        <div>Configure your profile and generate a meal plan. The system will optimize prices using local seasonal adjustments!</div>
      </div>
    `;
    return;
  }

  // Budget & Broke Index Forecast calculations
  const totalCost = calculatePlanCost(activePlan); // weekly plan cost
  const dailyMealCost = totalCost / 7;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const nextAllowanceDate = state.nextAllowanceDate ? new Date(state.nextAllowanceDate) : new Date(today.getTime() + 15*24*60*60*1000);
  nextAllowanceDate.setHours(0, 0, 0, 0);
  const timeDiff = nextAllowanceDate.getTime() - today.getTime();
  const daysUntilAllowance = Math.max(1, Math.ceil(timeDiff / (1000 * 60 * 60 * 24)));

  const projectedCostUntilAllowance = dailyMealCost * daysUntilAllowance;
  
  const allowanceSpent = Math.max(0, state.monthlyAllowance - state.remainingBudget);
  const percentSpent = state.monthlyAllowance > 0 ? Math.round((allowanceSpent / state.monthlyAllowance) * 100) : 0;
  const percentSpentClamped = Math.max(0, Math.min(100, percentSpent));
  
  const gauge = document.getElementById('dashboard-budget-gauge');
  gauge.style.setProperty('--percent', percentSpentClamped.toString());
  document.getElementById('dashboard-gauge-percent').textContent = `${percentSpentClamped}%`;

  const currencySymbol = regConfig.label;
  document.getElementById('dashboard-target-budget').textContent = `${currencySymbol}${state.monthlyAllowance.toFixed(2)}`;
  document.getElementById('dashboard-remaining-cash').textContent = `${currencySymbol}${state.remainingBudget.toFixed(2)}`;
  document.getElementById('dashboard-actual-cost').textContent = `${currencySymbol}${projectedCostUntilAllowance.toFixed(2)}`;

  // Status Badge and text
  const statusBadge = document.getElementById('dashboard-budget-status');
  const budgetText = document.getElementById('dashboard-budget-text');
  
  const daysBudgetLasts = dailyMealCost > 0 ? state.remainingBudget / dailyMealCost : 999;
  
  if (daysBudgetLasts >= daysUntilAllowance) {
    statusBadge.textContent = 'Safe';
    statusBadge.className = 'gauge-status-badge badge-success';
    gauge.style.setProperty('--gauge-color', 'var(--accent-tertiary)');
    
    const surplus = state.remainingBudget - projectedCostUntilAllowance;
    budgetText.innerHTML = `Your food budget is <strong>safe</strong>! You will have a surplus of <strong>${currencySymbol}${surplus.toFixed(2)}</strong> by your next allowance in <strong>${daysUntilAllowance} days</strong>.`;
  } else {
    const runOutDays = Math.floor(daysBudgetLasts);
    const runOutDate = new Date(today.getTime() + runOutDays * 24 * 60 * 60 * 1000);
    const options = { month: 'short', day: 'numeric' };
    const formattedDate = runOutDate.toLocaleDateString('en-US', options);
    const daysShort = daysUntilAllowance - runOutDays;
    
    statusBadge.textContent = 'Broke Alert';
    statusBadge.className = 'gauge-status-badge badge-danger';
    gauge.style.setProperty('--gauge-color', 'var(--accent-coral)');
    
    budgetText.innerHTML = `⚠️ <strong>Broke Alert</strong>: At this rate, you will run out of money on <strong>${formattedDate}</strong>, which is <strong>${daysShort} days before</strong> your next allowance! Consider swapping high-cost meals.`;
  }

  // Populate Highlights/Savings tips dynamically
  renderInsights(state, activePlan, percentSpent);

  // Populate Dashboard Nutrition
  const familyDailyTargets = calculateDinerNeeds(state.diners, state.dietaryRestrictions);
  const analysis = calculatePlanNutrition(activePlan, familyDailyTargets, state.dietaryRestrictions);
  
  const nutContainer = document.getElementById('dashboard-nutrition-metrics');
  nutContainer.innerHTML = '';

  const coreNutrients = [
    { key: 'calories', name: 'Calories', unit: 'kcal', color: 'var(--accent-secondary)' },
    { key: 'protein', name: 'Protein', unit: 'g', color: 'var(--accent-primary)' },
    { key: 'carbs', name: 'Carbs', unit: 'g', color: 'var(--accent-tertiary)' },
    { key: 'fat', name: 'Fat', unit: 'g', color: 'var(--accent-gold)' }
  ];

  coreNutrients.forEach(n => {
    const card = document.createElement('div');
    card.className = 'glass-card metric-card';
    card.style.padding = '1.25rem';
    
    const actualTotal = Math.round(analysis.actual[n.key]);
    const targetTotal = Math.round(analysis.target[n.key]);
    const percentage = analysis.percentage[n.key];
    
    card.innerHTML = `
      <div style="flex-grow:1;">
        <span class="metric-label">${n.name} (${n.unit})</span>
        <div class="metric-value" style="font-size: 1.2rem; margin: 0.25rem 0;">
          ${actualTotal} <span style="font-size:0.75rem; font-weight:normal; color:var(--color-text-muted);">/ ${targetTotal} target</span>
        </div>
        <div class="nut-bar-outer" style="height: 6px; margin-top: 0.5rem;">
          <div class="nut-bar-inner" style="--percent: ${percentage}; --bar-gradient: ${n.color};"></div>
        </div>
      </div>
      <div class="gauge-status-badge ${percentage >= 85 && percentage <= 115 ? 'badge-success' : 'badge-warning'}" style="font-size:0.75rem; padding: 0.25rem 0.5rem;">
        ${percentage}%
      </div>
    `;
    nutContainer.appendChild(card);
  });
}

function renderInsights(state, activePlan, percentUsed) {
  const container = document.getElementById('dashboard-insights');
  container.innerHTML = '';

  const insights = [];
  const currencySymbol = REGIONS[state.region].label;

  // 1. Seasonal pricing insights
  if (state.season === 'summer') {
    insights.push({
      type: 'success',
      text: '🌞 <strong>Summer / Dry Season Sale</strong>: Tomatoes are in season. Tomato-rich meals (like Tilapia Curry or Lentil Curry) are 30% cheaper!'
    });
  } else if (state.season === 'autumn') {
    insights.push({
      type: 'success',
      text: '🍂 <strong>Autumn Harvest Alert</strong>: Potatoes and sweet potatoes are at peak supply. Perfect season for Skillet Hash or Potato Soup!'
    });
  } else if (state.season === 'winter') {
    insights.push({
      type: 'warning',
      text: '❄️ <strong>Winter / Dry Season Pricing</strong>: Fresh greens are in short supply. Cabbage is a budget-friendly alternative to Spinach.'
    });
  } else if (state.season === 'spring') {
    insights.push({
      type: 'success',
      text: '🌱 <strong>Spring Green Rush</strong>: Sukuma Wiki and Spinach are plentiful! Green leaf nutrition costs are at a yearly low.'
    });
  }

  // 2. Budget level insights
  if (percentUsed > 100) {
    // Identify highest cost meal
    let highestCostMeal = null;
    let maxCost = 0;
    
    for (const day in activePlan) {
      const dayMeals = activePlan[day];
      ['breakfast', 'lunch', 'dinner', 'snack'].forEach(slot => {
        if (dayMeals[slot].cost > maxCost) {
          maxCost = dayMeals[slot].cost;
          highestCostMeal = { day, slot, ...dayMeals[slot] };
        }
      });
    }

    if (highestCostMeal) {
      insights.push({
        type: 'danger',
        text: `💸 <strong>Saving Tip</strong>: Your most expensive meal is <strong>${highestCostMeal.name}</strong> on ${highestCostMeal.day} (${currencySymbol}${highestCostMeal.cost.toFixed(2)}). Consider swapping it for a cheaper option.`
      });
    }
  } else {
    insights.push({
      type: 'success',
      text: '🎉 Great job! Your meal plan is economically optimized and meets the household budget constraints.'
    });
  }

  // 3. Nutrition insight based on plan details
  const familyDailyTargets = calculateDinerNeeds(state.diners, state.dietaryRestrictions);
  const analysis = calculatePlanNutrition(activePlan, familyDailyTargets, state.dietaryRestrictions);

  if (analysis.percentage.iron < 80) {
    insights.push({
      type: 'warning',
      text: '🥬 <strong>Nutrient Shortfall</strong>: Iron levels are slightly low. Try adding a meal with <strong>Sukuma Wiki</strong> or <strong>Beans</strong>.'
    });
  }
  if (analysis.percentage.vitC < 85) {
    insights.push({
      type: 'warning',
      text: '🍊 <strong>Nutrient Shortfall</strong>: Vitamin C levels are below target. Incorporate more fresh <strong>Tomatoes</strong> or <strong>Broccoli</strong>.'
    });
  }
  if (analysis.percentage.calcium < 80) {
    insights.push({
      type: 'warning',
      text: '🥛 <strong>Nutrient Shortfall</strong>: Calcium levels are low. Try adding more <strong>Milk</strong> or <strong>Cheddar Cheese</strong> if compatible with your diet.'
    });
  }

  // Write items to DOM
  insights.forEach(ins => {
    const div = document.createElement('div');
    div.className = `insight-item ${ins.type}`;
    div.innerHTML = `
      <div>${ins.type === 'success' ? '✅' : ins.type === 'warning' ? '⚠️' : '🚨'}</div>
      <div>${ins.text}</div>
    `;
    container.appendChild(div);
  });
}

// Helper to render cost/difficulty tags
function getRecipeTagHtml(recipeId) {
  const recipe = RECIPES.find(r => r.id === recipeId);
  if (!recipe || !recipe.tag) return '';
  const tagLabel = recipe.tag === 'budget_saver' ? 'Budget' : recipe.tag === 'quick_easy' ? 'Quick' : 'Treat';
  return `<span class="recipe-tag ${recipe.tag}">${tagLabel}</span>`;
}

// 4. Render Weekly Planner
export function renderPlanner(state, activePlan, onRecipeClick, onSwapClick) {
  const grid = document.getElementById('planner-grid');
  grid.innerHTML = '';

  const regConfig = REGIONS[state.region] || REGIONS.usa;
  const currencySymbol = regConfig.label;

  // Header display update
  const budgetLimitWeekly = state.monthlyAllowance / 4.33;
  const targetText = document.getElementById('planner-target-budget-display');
  const actualText = document.getElementById('planner-actual-cost-display');
  const plannerBadge = document.getElementById('planner-status-badge');

  if (!activePlan || Object.keys(activePlan).length === 0) {
    grid.innerHTML = `
      <div class="glass-card text-center" style="grid-column: 1/-1; padding: 4rem; display:flex; flex-direction:column; align-items:center; gap:1.5rem;">
        <h3>No Meal Plan Generated Yet</h3>
        <p style="color:var(--color-text-muted); max-width: 500px;">Click the button in the top right to instantly generate a budget-friendly, nutritionally balanced 7-day meal plan tailored to your profile settings.</p>
      </div>
    `;
    targetText.textContent = `${currencySymbol}${budgetLimitWeekly.toFixed(2)}`;
    actualText.textContent = `${currencySymbol}0.00`;
    plannerBadge.textContent = 'Pending';
    plannerBadge.className = 'gauge-status-badge badge-warning';
    return;
  }

  const totalCost = calculatePlanCost(activePlan);
  targetText.textContent = `${currencySymbol}${budgetLimitWeekly.toFixed(2)}`;
  actualText.textContent = `${currencySymbol}${totalCost.toFixed(2)}`;

  if (totalCost <= budgetLimitWeekly) {
    plannerBadge.textContent = 'Under Budget';
    plannerBadge.className = 'gauge-status-badge badge-success';
  } else {
    plannerBadge.textContent = 'Over Budget';
    plannerBadge.className = 'gauge-status-badge badge-danger';
  }

  // Populate calendar columns
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  days.forEach(day => {
    const col = document.createElement('div');
    col.className = 'planner-day-col';

    const dayPlan = activePlan[day];
    
    col.innerHTML = `
      <div class="day-col-header">${day}</div>
      <!-- Breakfast Card -->
      <div class="meal-slot-card" data-day="${day}" data-slot="breakfast" data-id="${dayPlan.breakfast.id}">
        <div>
          <div class="meal-slot-header-row">
            <span class="meal-slot-tag">Breakfast</span>
            ${getRecipeTagHtml(dayPlan.breakfast.id)}
          </div>
          <div class="meal-slot-title">${dayPlan.breakfast.name}</div>
        </div>
        <div class="meal-slot-footer">
          <span class="meal-slot-price">${currencySymbol}${dayPlan.breakfast.cost.toFixed(2)}</span>
          <span>Swap 🔁</span>
        </div>
      </div>
      <!-- Lunch Card -->
      <div class="meal-slot-card" data-day="${day}" data-slot="lunch" data-id="${dayPlan.lunch.id}">
        <div>
          <div class="meal-slot-header-row">
            <span class="meal-slot-tag">Lunch</span>
            ${getRecipeTagHtml(dayPlan.lunch.id)}
          </div>
          <div class="meal-slot-title">${dayPlan.lunch.name}</div>
        </div>
        <div class="meal-slot-footer">
          <span class="meal-slot-price">${currencySymbol}${dayPlan.lunch.cost.toFixed(2)}</span>
          <span>Swap 🔁</span>
        </div>
      </div>
      <!-- Dinner Card -->
      <div class="meal-slot-card" data-day="${day}" data-slot="dinner" data-id="${dayPlan.dinner.id}">
        <div>
          <div class="meal-slot-header-row">
            <span class="meal-slot-tag">Dinner</span>
            ${getRecipeTagHtml(dayPlan.dinner.id)}
          </div>
          <div class="meal-slot-title">${dayPlan.dinner.name}</div>
        </div>
        <div class="meal-slot-footer">
          <span class="meal-slot-price">${currencySymbol}${dayPlan.dinner.cost.toFixed(2)}</span>
          <span>Swap 🔁</span>
        </div>
      </div>
      <!-- Snack Card -->
      <div class="meal-slot-card" data-day="${day}" data-slot="snack" data-id="${dayPlan.snack.id}">
        <div>
          <div class="meal-slot-header-row">
            <span class="meal-slot-tag">Snack</span>
            ${getRecipeTagHtml(dayPlan.snack.id)}
          </div>
          <div class="meal-slot-title">${dayPlan.snack.name}</div>
        </div>
        <div class="meal-slot-footer">
          <span class="meal-slot-price">${currencySymbol}${dayPlan.snack.cost.toFixed(2)}</span>
          <span>Swap 🔁</span>
        </div>
      </div>
    `;

    // Click logic to open details, except clicking "swap" swap link
    col.querySelectorAll('.meal-slot-card').forEach(card => {
      card.addEventListener('click', (e) => {
        const day = card.getAttribute('data-day');
        const slot = card.getAttribute('data-slot');
        const recipeId = card.getAttribute('data-id');
        
        // If they click on the footer or specifically the Swap text, trigger swap
        const footerOrSwapClicked = e.target.closest('.meal-slot-footer') || e.target.textContent.includes('Swap');
        if (footerOrSwapClicked) {
          onSwapClick(day, slot);
        } else {
          onRecipeClick(recipeId);
        }
      });
    });

    grid.appendChild(col);
  });
}

// 5. Render Nutrition Analytics View
export function renderNutrition(state, activePlan) {
  const familyDailyTargets = calculateDinerNeeds(state.diners, state.dietaryRestrictions);

  if (!activePlan || Object.keys(activePlan).length === 0) {
    document.getElementById('nutrition-viability-badge').textContent = 'Pending Plan';
    document.getElementById('nutrition-viability-badge').className = 'gauge-status-badge badge-warning';
    
    document.getElementById('nutrition-macro-bars').innerHTML = `
      <div class="text-center" style="padding: 2rem; color:var(--color-text-muted);">Generate a meal plan to view analytics.</div>
    `;
    document.getElementById('nutrition-micro-bars').innerHTML = `
      <div class="text-center" style="padding: 2rem; color:var(--color-text-muted);">Generate a meal plan to view analytics.</div>
    `;
    return;
  }

  const analysis = calculatePlanNutrition(activePlan, familyDailyTargets, state.dietaryRestrictions);

  // Set Viability badge
  const badge = document.getElementById('nutrition-viability-badge');
  const scores = Object.values(analysis.percentage);
  const averageAchieved = scores.reduce((sum, score) => sum + score, 0) / scores.length;

  if (averageAchieved >= 90 && analysis.percentage.calories >= 85) {
    badge.textContent = 'Nutritionally Complete';
    badge.className = 'gauge-status-badge badge-success';
  } else if (averageAchieved >= 75) {
    badge.textContent = 'Nutritionally Adequate';
    badge.className = 'gauge-status-badge badge-warning';
  } else {
    badge.textContent = 'Nutritionally Deficient';
    badge.className = 'gauge-status-badge badge-danger';
  }

  // Populate Macros
  const macroList = [
    { key: 'calories', name: 'Calories', unit: 'kcal', color: 'var(--accent-secondary)' },
    { key: 'protein', name: 'Protein', unit: 'g', color: 'var(--accent-primary)' },
    { key: 'carbs', name: 'Carbs', unit: 'g', color: 'var(--accent-tertiary)' },
    { key: 'fat', name: 'Fat', unit: 'g', color: 'var(--accent-gold)' },
    { key: 'fiber', name: 'Dietary Fiber', unit: 'g', color: 'linear-gradient(135deg, #a855f7 0%, #d946ef 100%)' }
  ];

  // Populate Micros
  const microList = [
    { key: 'calcium', name: 'Calcium', unit: 'mg', color: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)' },
    { key: 'iron', name: 'Iron', unit: 'mg', color: 'linear-gradient(135deg, #f43f5e 0%, #fb7185 100%)' },
    { key: 'vitC', name: 'Vitamin C', unit: 'mg', color: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)' },
    { key: 'sodium', name: 'Sodium (Limit)', unit: 'mg', color: 'linear-gradient(135deg, #ef4444 0%, #f87171 100%)', isLimit: true }
  ];

  const renderBars = (elementsList, containerId) => {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    
    elementsList.forEach(n => {
      const actualVal = Math.round(analysis.actual[n.key]);
      const targetVal = Math.round(analysis.target[n.key]);
      const percent = analysis.percentage[n.key];
      
      const item = document.createElement('div');
      item.className = 'nut-bar-item';

      let textStatus = '';
      if (n.isLimit) {
        textStatus = percent > 100 
          ? `<span style="color:var(--accent-coral); font-weight:600;">Over Limit</span>` 
          : `<span style="color:var(--accent-tertiary); font-weight:600;">Within Limit</span>`;
      } else {
        textStatus = percent < 80 
          ? `<span style="color:var(--accent-gold); font-weight:600;">Low</span>` 
          : `<span style="color:var(--accent-tertiary); font-weight:600;">Optimal</span>`;
      }
      
      item.innerHTML = `
        <div class="nut-bar-label-wrap">
          <span class="nut-bar-label">${n.name}</span>
          <span class="nut-bar-values">${actualVal}${n.unit} / ${targetVal}${n.unit} (${percent}%) • ${textStatus}</span>
        </div>
        <div class="nut-bar-outer">
          <div class="nut-bar-inner" style="--percent: ${percent}; --bar-gradient: ${n.color};"></div>
        </div>
      `;
      container.appendChild(item);
    });
  };

  renderBars(macroList, 'nutrition-macro-bars');
  renderBars(microList, 'nutrition-micro-bars');
}

// 6. Render Price Explorer Page
export function renderExplorer(state, searchString = '', filterCategory = 'all') {
  const container = document.getElementById('explorer-grid');
  container.innerHTML = '';

  const regConfig = REGIONS[state.region] || REGIONS.usa;
  const currencySymbol = regConfig.label;

  // Filter keys
  const ingredients = Object.values(INGREDIENTS).filter(ing => {
    const nameMatch = ing.name.toLowerCase().includes(searchString.toLowerCase());
    const catMatch = filterCategory === 'all' || ing.category === filterCategory;
    return nameMatch && catMatch;
  });

  if (ingredients.length === 0) {
    container.innerHTML = `
      <div class="text-center" style="grid-column: 1/-1; padding: 4rem; color:var(--color-text-muted);">
        No items found matching your filters.
      </div>
    `;
    return;
  }

  ingredients.forEach(ing => {
    const card = document.createElement('div');
    card.className = 'glass-card food-item-card';

    // Calculate base vs current price for visual pricing badge
    const priceUSD = ing.basePrice;
    const currentPriceUSD = ing.basePrice * (ing.regionalMultipliers[state.region] || 1.0) * (ing.seasonalMultipliers[state.season] || 1.0);
    const regionalPriceLocal = getIngredientPriceLocal(ing.id, state.region, state.season);

    // Seasonal component specifically:
    const seasMult = ing.seasonalMultipliers[state.season] || 1.0;
    let trendBadge = '';
    if (seasMult < 0.95) {
      const discount = Math.round((1 - seasMult) * 100);
      trendBadge = `<div class="food-trend-badge trend-down">⬇️ Discount -${discount}%</div>`;
    } else if (seasMult > 1.05) {
      const surcharge = Math.round((seasMult - 1) * 100);
      trendBadge = `<div class="food-trend-badge trend-up">⬆️ Peak Price +${surcharge}%</div>`;
    } else {
      trendBadge = `<div class="food-trend-badge trend-flat">⚪ Base Price</div>`;
    }

    card.innerHTML = `
      <div>
        <div class="food-card-header">
          <span class="food-category-tag">${ing.category}</span>
          ${trendBadge}
        </div>
        <h3 class="food-card-title">${ing.name}</h3>
        <div class="food-card-nutrition">
          <strong>Nutrient Profile (per 100g):</strong><br>
          Energy: ${ing.nutrition.calories} kcal • Protein: ${ing.nutrition.protein}g<br>
          Iron: ${ing.nutrition.iron}mg • Calcium: ${ing.nutrition.calcium}mg
        </div>
      </div>
      <div class="food-card-footer">
        <div class="food-price-wrap">
          <span class="food-price-label">Adjusted Local Price</span>
          <span class="food-price-val">${currencySymbol}${regionalPriceLocal.toFixed(2)} / ${ing.unit}</span>
        </div>
      </div>
    `;

    container.appendChild(card);
  });
}

// 7. Render Shopping List View
export function renderShoppingList(state, activePlan, customItems, onCheckToggle, onDeleteCustom) {
  const container = document.getElementById('shopping-list-container');
  container.innerHTML = '';

  const regConfig = REGIONS[state.region] || REGIONS.usa;
  const currencySymbol = regConfig.label;

  // Display region season text in shopping list header
  document.getElementById('shopping-region-display').textContent = regConfig.name.split(' (')[0];
  document.getElementById('shopping-season-display').textContent = SEASONS[state.season].name.split(' / ')[0];

  if (!activePlan || Object.keys(activePlan).length === 0) {
    container.innerHTML = `
      <div class="text-center" style="padding: 3rem; color:var(--color-text-muted);">
        No meal plan active. Generate a plan to build your grocery list automatically.
      </div>
    `;
    document.getElementById('shopping-total-cost').textContent = `${currencySymbol}0.00`;
    return;
  }

  // Generate ingredients shopping list
  const fullList = generateShoppingList(activePlan, state, customItems);

  // Load checklist checked states and apply to list
  const checklistStates = JSON.parse(localStorage.getItem('family_nutrition_checklist_states')) || {};
  fullList.forEach(item => {
    if (!item.isCustom && checklistStates[item.id] !== undefined) {
      item.checked = checklistStates[item.id];
    }
  });

  // Group by category
  const categories = {};
  let totalCost = 0;

  fullList.forEach(item => {
    if (!categories[item.category]) {
      categories[item.category] = [];
    }
    categories[item.category].push(item);
    
    // Add cost only if unchecked
    if (!item.checked) {
      totalCost += item.cost;
    }
  });

  document.getElementById('shopping-total-cost').textContent = `${currencySymbol}${totalCost.toFixed(2)}`;

  // Populate DOM grouped by category
  for (const [catName, items] of Object.entries(categories)) {
    const section = document.createElement('div');
    section.className = 'shopping-cat-section';

    section.innerHTML = `<h3 class="shopping-cat-title">${catName}</h3>`;

    items.forEach(item => {
      const div = document.createElement('div');
      div.className = `shopping-list-item ${item.checked ? 'checked' : ''}`;
      
      div.innerHTML = `
        <div class="shopping-item-left">
          <input type="checkbox" class="shopping-item-checkbox" ${item.checked ? 'checked' : ''}>
          <span class="shopping-item-name">${item.name}</span>
        </div>
        <div class="shopping-item-right">
          <span class="shopping-item-qty">${item.quantity} ${item.unit}</span>
          <span class="shopping-item-cost">${currencySymbol}${item.cost.toFixed(2)}</span>
          ${item.isCustom ? `<button class="btn btn-danger btn-sm delete-custom-btn" style="padding:0.2rem 0.5rem; font-size:0.7rem;">×</button>` : ''}
        </div>
      `;

      // Checkbox listener
      div.querySelector('.shopping-item-checkbox').addEventListener('change', (e) => {
        onCheckToggle(item.id, e.target.checked, item.isCustom || false);
      });

      // Custom delete listener
      if (item.isCustom) {
        div.querySelector('.delete-custom-btn').addEventListener('click', () => {
          onDeleteCustom(item.id);
        });
      }

      section.appendChild(div);
    });

    container.appendChild(section);
  }
}

// 8. Show Recipe Detail Modal
export function showRecipeModal(recipeId, state) {
  const recipe = RECIPES.find(r => r.id === recipeId);
  if (!recipe) return;

  const dietaryRestrictions = state.dietaryRestrictions || [];
  const regionKey = state.region;
  const seasonKey = state.season;
  const familySize = state.diners ? state.diners.length : 1;
  const servingScale = familySize / recipe.servings;

  const regConfig = REGIONS[regionKey] || REGIONS.usa;
  const currencySymbol = regConfig.label;

  const modal = document.getElementById('modal-recipe');
  const body = document.getElementById('recipe-modal-body');
  document.getElementById('modal-recipe-title').textContent = recipe.name;

  const cost = getRecipeCostLocal(recipe.id, regionKey, seasonKey, dietaryRestrictions);
  const nutrition = getRecipeNutritionPerServing(recipe.id, dietaryRestrictions);

  // Map ingredients label
  const ingredientsHtml = recipe.ingredients.map(ingRef => {
    let finalIngId = ingRef.id;
    let note = '';

    // Apply substitutions labels
    if (ingRef.id === 'milk' && (dietaryRestrictions.includes('vegan') || dietaryRestrictions.includes('dairy_free'))) {
      note = ' <em style="color:var(--accent-coral);">(Substituted with Water)</em>';
    } else if (ingRef.id === 'butter' && dietaryRestrictions.includes('vegan')) {
      finalIngId = 'cooking_oil';
      note = ' <em style="color:var(--accent-tertiary);">(Substituted with Cooking Oil)</em>';
    }

    const ingInfo = INGREDIENTS[finalIngId];
    const scaledAmount = ingRef.amount * servingScale;
    
    let displayAmount = '';
    if (ingInfo) {
      if (ingInfo.unit === 'kg') {
        if (scaledAmount >= 1000) {
          displayAmount = `${(scaledAmount / 1000).toFixed(2)} kg`;
        } else {
          displayAmount = `${Math.round(scaledAmount)} g`;
        }
      } else { // Liter
        if (scaledAmount >= 1000) {
          displayAmount = `${(scaledAmount / 1000).toFixed(2)} L`;
        } else {
          displayAmount = `${Math.round(scaledAmount)} mL`;
        }
      }
    } else {
      displayAmount = `${Math.round(scaledAmount)} g`;
    }

    return `
      <li class="recipe-ing-row">
        <span>• ${ingInfo ? ingInfo.name : finalIngId}${note}</span>
        <span style="color:var(--color-text-muted);">${displayAmount}</span>
      </li>
    `;
  }).join('');

  // Map instructions label
  const instructionsHtml = recipe.instructions.map(step => `<li>${step}</li>`).join('');

  body.innerHTML = `
    <p style="font-size:0.95rem; line-height:1.4; color:var(--color-text-muted); margin-bottom:1.5rem;">${recipe.description}</p>
    
    <div class="recipe-meta-grid">
      <div class="recipe-meta-item">
        <div class="recipe-meta-label">Total Cost</div>
        <div class="recipe-meta-value" style="color:var(--accent-tertiary);">${currencySymbol}${cost.toFixed(2)}</div>
      </div>
      <div class="recipe-meta-item">
        <div class="recipe-meta-label">Cost per Serving</div>
        <div class="recipe-meta-value">${currencySymbol}${(cost / recipe.servings).toFixed(2)}</div>
      </div>
      <div class="recipe-meta-item">
        <div class="recipe-meta-label">Prep Time</div>
        <div class="recipe-meta-value">${recipe.prepTime} mins</div>
      </div>
    </div>

    <div class="recipe-section-title">Ingredients (Serves ${recipe.servings})</div>
    <ul class="recipe-ingredients-list" style="margin-bottom:1.5rem;">
      ${ingredientsHtml}
    </ul>

    <div class="recipe-section-title">Directions</div>
    <ol class="recipe-instructions-ol" style="margin-bottom:1.5rem;">
      ${instructionsHtml}
    </ol>

    <div class="recipe-section-title">Nutrition Target per Serving</div>
    <div style="font-size:0.8rem; background:rgba(255,255,255,0.02); border:1px solid var(--border-glass); border-radius:10px; padding:1rem;">
      <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; text-align:center;">
        <div>
          <span class="metric-label" style="font-size:0.65rem;">Calories</span>
          <div style="font-weight:700; color:var(--accent-secondary); font-size:1.1rem;">${nutrition.calories} kcal</div>
        </div>
        <div>
          <span class="metric-label" style="font-size:0.65rem;">Protein</span>
          <div style="font-weight:700; color:var(--accent-primary); font-size:1.1rem;">${nutrition.protein}g</div>
        </div>
        <div>
          <span class="metric-label" style="font-size:0.65rem;">Carbs</span>
          <div style="font-weight:700; color:var(--accent-tertiary); font-size:1.1rem;">${nutrition.carbs}g</div>
        </div>
        <div>
          <span class="metric-label" style="font-size:0.65rem;">Fat</span>
          <div style="font-weight:700; color:var(--accent-gold); font-size:1.1rem;">${nutrition.fat}g</div>
        </div>
        <div>
          <span class="metric-label" style="font-size:0.65rem;">Fiber</span>
          <div style="font-weight:700; font-size:1.1rem;">${nutrition.fiber}g</div>
        </div>
        <div>
          <span class="metric-label" style="font-size:0.65rem;">Iron</span>
          <div style="font-weight:700; color:var(--accent-coral); font-size:1.1rem;">${nutrition.iron}mg</div>
        </div>
      </div>
    </div>
  `;

  modal.showModal();
}

// 9. Show Swap Alternatives Modal
export function showSwapModal(day, mealSlot, state, onSelectSwap) {
  const modal = document.getElementById('modal-swap');
  document.getElementById('swap-day-label').textContent = day;
  
  const slotFormatted = mealSlot.charAt(0).toUpperCase() + mealSlot.slice(1);
  const typeLabel = document.getElementById('swap-type-label');
  typeLabel.textContent = slotFormatted;
  typeLabel.style.color = mealSlot === 'breakfast' ? 'var(--accent-secondary)' : mealSlot === 'lunch' ? 'var(--accent-primary)' : mealSlot === 'dinner' ? 'var(--accent-tertiary)' : 'var(--accent-gold)';

  const alternatives = getMealAlternatives(mealSlot, state);
  const container = document.getElementById('swap-options-container');
  container.innerHTML = '';

  const regConfig = REGIONS[state.region] || REGIONS.usa;
  const currencySymbol = regConfig.label;

  if (alternatives.length === 0) {
    container.innerHTML = `
      <div class="text-center" style="padding: 2rem; color:var(--color-text-muted);">
        No alternatives found matching active restrictions.
      </div>
    `;
    modal.showModal();
    return;
  }

  // Render cards for each alternative
  alternatives.forEach(alt => {
    const card = document.createElement('div');
    card.className = 'swap-option-card';
    
    const r = RECIPES.find(recipe => recipe.id === alt.id);
    const tagHtml = (r && r.tag) ? getRecipeTagHtml(alt.id) : '';

    card.innerHTML = `
      <div class="swap-card-left">
        <div style="display:flex; justify-content:space-between; align-items:center; gap: 0.5rem; margin-bottom: 0.25rem;">
          <div class="swap-card-title" style="margin-bottom:0;">${alt.name}</div>
          ${tagHtml}
        </div>
        <div class="swap-card-desc">${alt.description}</div>
        <div style="margin-top: 0.5rem; font-size: 0.7rem; color:var(--color-text-muted);">
          Cals: ${alt.nutrition.calories}kcal • Protein: ${alt.nutrition.protein}g • Fiber: ${alt.nutrition.fiber}g
        </div>
      </div>
      <div class="swap-card-right">
        <div class="swap-card-price">${currencySymbol}${alt.cost.toFixed(2)}</div>
        <button class="btn btn-primary btn-sm swap-select-btn" data-id="${alt.id}">Select</button>
      </div>
    `;

    card.querySelector('.swap-select-btn').addEventListener('click', () => {
      onSelectSwap(day, mealSlot, alt.id, alt.name, alt.cost);
      modal.close();
    });

    container.appendChild(card);
  });

  modal.showModal();
}
