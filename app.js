/**
 * A2A Computers Dashboard - Core Application Controller
 * Zero-dependency state manager, routing coordinator, event handler, POS Terminal, and Excel Sync Engine.
 */

class App {
  constructor() {
    this.currentUser = null;
    this.activeTab = "overview";
    this.salesSubTab = "pos";      // 'pos' or 'ledger'
    this.repairsSubTab = "kanban";  // 'kanban' or 'ledger'
    this.db = window.DB;
    this.excelHandle = null;
    
    // POS Cart
    this.cart = []; // Array of { productId, name, price, quantity }

    // Preset Employee profile definitions (Avatars + Username credentials)
    this.profiles = [
      { username: "admin", name: "Amit Sharma", role: "Admin", initial: "AS", color: "var(--accent-red)" },
      { username: "manager", name: "Suresh Raina", role: "Store Manager", initial: "SR", color: "var(--accent-purple)" },
      { username: "tech", name: "Vikram Rathore", role: "Technician", initial: "VR", color: "var(--accent-orange)" },
      { username: "sales", name: "Pooja Patel", role: "Sales Executive", initial: "PP", color: "var(--accent-cyan)" },
      { username: "accounts", name: "Rajesh Kumar", role: "Accountant", initial: "RK", color: "var(--accent-green)" }
    ];
    
    // Bind Methods
    this.init = this.init.bind(this);
    this.handleRoute = this.handleRoute.bind(this);
    this.updateClock = this.updateClock.bind(this);
  }

  async init() {
    this.db.init();
    await this.setupExcelSync();
    this.checkAuth();
    this.setupRouter();
    this.setupClock();
    this.setupTheme();
    this.setupAudioSettings();
    this.bindEvents();
    this.renderProfiles();
    this.renderActivePanel();
    this.updateStorageSize();
  }

  // --- EXCEL AUTO-SAVE SETUP ---
  async setupExcelSync() {
    try {
      this.excelHandle = await window.FileSync.loadFileHandle();
      if (this.excelHandle) {
        this.updateSyncBadge("inactive", "Authorize Excel");
      } else {
        this.updateSyncBadge("inactive", "Excel Offline");
      }
    } catch(e) {
      console.warn("Failed to load Excel sync handle", e);
    }
  }

  updateSyncBadge(status, text) {
    const badge = document.getElementById("header-sync-badge");
    if (!badge) return;

    badge.className = `sync-status-badge ${status}`;
    const dot = badge.querySelector(".sync-dot");
    const label = badge.querySelector(".sync-text");
    
    if (label) label.textContent = text;
  }

  async triggerExcelAutoSave() {
    if (this.excelHandle) {
      try {
        const granted = await window.FileSync.verifyPermission(this.excelHandle, true);
        if (granted) {
          this.updateSyncBadge("syncing", "Excel Saving");
          await window.Utils.writeDatabaseToExcelHandle(this.excelHandle);
          this.updateSyncBadge("active", "Excel Synced");
          window.Toast.show("info", "Excel Database Saved", "All 6 tables written automatically to database.xlsx.");
          return;
        }
      } catch (e) {
        console.error("Auto save failed", e);
      }
    }
    this.updateStorageSize();
  }

  async handleSyncBadgeClick() {
    window.SoundEngine.playClick();
    if (!this.excelHandle) {
      window.Toast.show("info", "Excel Integration", "Go to Settings to initialize or link your local database.xlsx file.");
      this.switchTab("settings");
      return;
    }

    try {
      const granted = await window.FileSync.verifyPermission(this.excelHandle, true);
      if (granted) {
        this.updateSyncBadge("active", "Excel Synced");
        window.Toast.show("success", "Sync Authorized", "Real-time Excel write-backs are active.");
        await this.triggerExcelAutoSave();
      } else {
        this.updateSyncBadge("inactive", "Authorize Excel");
        window.Toast.show("error", "Access Denied", "Read/Write permissions were not granted.");
      }
    } catch(e) {
      console.error(e);
    }
  }

  // --- AUDIO SETTINGS ---
  setupAudioSettings() {
    const soundEnabled = localStorage.getItem("a2a_sound_enabled");
    const checkbox = document.getElementById("set-sound-toggle");
    
    if (soundEnabled === "false") {
      window.SoundEngine.enabled = false;
      if (checkbox) checkbox.checked = false;
    } else {
      window.SoundEngine.enabled = true;
      if (checkbox) checkbox.checked = true;
    }
  }

  // --- AUTHENTICATION & PROFILES ---
  renderProfiles() {
    const grid = document.getElementById("profile-grid");
    if (!grid) return;

    grid.innerHTML = this.profiles.map(p => `
      <div class="profile-card" onclick="app.selectProfile('${p.username}', '${p.name}')">
        <div class="profile-avatar" style="border-color:${p.color}; color:${p.color};">${p.initial}</div>
        <div style="font-weight:700; font-size:0.8rem; color:var(--text-primary);">${p.name}</div>
        <div style="font-size:0.7rem; color:var(--text-secondary); margin-top:2px;">${p.role}</div>
      </div>
    `).join("");
  }

  selectProfile(username, name) {
    window.SoundEngine.playClick();
    document.getElementById("profile-login-username").value = username;
    document.getElementById("selected-profile-name").textContent = name;
    document.getElementById("profile-password-box").style.display = "block";
    document.getElementById("profile-login-password").focus();
  }

  resetProfileSelect() {
    window.SoundEngine.playClick();
    document.getElementById("profile-login-username").value = "";
    document.getElementById("profile-login-password").value = "";
    document.getElementById("profile-password-box").style.display = "none";
  }

  checkAuth() {
    try {
      const user = localStorage.getItem("a2a_current_user");
      if (user) {
        this.currentUser = JSON.parse(user);

        if (!this.currentUser || !this.currentUser.name) {
          throw new Error("Invalid user data");
        }

        const overlay = document.getElementById("auth-overlay");
        if (overlay) overlay.classList.remove("active");
        
        // Update user badge in sidebar
        const nameElem = document.getElementById("username-display");
        const roleElem = document.getElementById("userrole-display");
        const avatarElem = document.getElementById("avatar-display");
        const welcomeName = document.getElementById("welcome-name");

        if (nameElem) nameElem.textContent = this.currentUser.name;
        if (roleElem) roleElem.textContent = this.currentUser.role;
        if (avatarElem) avatarElem.textContent = this.currentUser.name.charAt(0).toUpperCase();
        if (welcomeName) welcomeName.textContent = this.currentUser.name.split(" ")[0];

        this.applyRolePermissions();
      } else {
        this.currentUser = null;
        const overlay = document.getElementById("auth-overlay");
        if (overlay) overlay.classList.add("active");
        this.resetProfileSelect();
      }
    } catch(e) {
      console.error("Auth check failed", e);
      this.currentUser = null;
      localStorage.removeItem("a2a_current_user");
      const overlay = document.getElementById("auth-overlay");
      if (overlay) overlay.classList.add("active");
      this.resetProfileSelect();
    }
  }

  applyRolePermissions() {
    const role = this.currentUser ? this.currentUser.role : "";
    const empLogoutBtn = document.getElementById("employee-logout-btn");
    
    // Strict Admin enforcement: non-Admins are locked into Attendance panel and sidebar/headers are hidden
    if (role === "Admin") {
      document.body.classList.remove("employee-view");
      if (empLogoutBtn) empLogoutBtn.style.display = "none";
      
      // Reset sidebar links visibility
      const menuItems = document.querySelectorAll(".sidebar-menu .menu-item");
      menuItems.forEach(i => i.style.display = "flex");
    } else {
      document.body.classList.add("employee-view");
      if (empLogoutBtn) empLogoutBtn.style.display = "flex";
      
      // Force routing to Attendance panel
      if (this.activeTab !== "attendance") {
        window.location.hash = "#attendance";
      }
    }
  }

  login(username, password) {
    const credentials = {
      "ajeesh": { name: "Ajeesh", role: "Admin", pass: "Velma" },
      "admin": { name: "Amit Sharma", role: "Admin", pass: "admin123" },
      "manager": { name: "Suresh Raina", role: "Store Manager", pass: "manager123" },
      "tech": { name: "Vikram Rathore", role: "Technician", pass: "tech123" },
      "sales": { name: "Pooja Patel", role: "Sales Executive", pass: "sales123" },
      "accounts": { name: "Rajesh Kumar", role: "Accountant", pass: "accounts123" }
    };
    
    if (username === "accounts" || username === "accountant") {
      username = "accounts";
    }

    const matched = credentials[username.toLowerCase()];
    if (matched && matched.pass === password) {
      this.currentUser = { name: matched.name, role: matched.role };
      localStorage.setItem("a2a_current_user", JSON.stringify(this.currentUser));
      this.checkAuth();
      this.renderActivePanel();
      window.Toast.show("success", "Access Granted", `Welcome to A2A Computers, ${matched.name}!`);
      return true;
    }
    window.Toast.show("error", "Access Denied", "Incorrect password code entered.");
    return false;
  }

  logout() {
    localStorage.removeItem("a2a_current_user");
    this.currentUser = null;
    const overlay = document.getElementById("auth-overlay");
    if (overlay) overlay.classList.add("active");
    this.resetProfileSelect();
    window.Toast.show("info", "Signed Out", "Select a profile to switch accounts.");
  }

  navigateTo(target) {
    if (window.SoundEngine) window.SoundEngine.playClick();
    window.location.hash = `#${target}`;
    this.switchTab(target);
  }

  // --- ROUTING ---
  setupRouter() {
    window.addEventListener("hashchange", this.handleRoute);
    
    // Initial Route
    if (window.location.hash) {
      this.handleRoute();
    } else {
      window.location.hash = "#overview";
    }
  }

  handleRoute() {
    const hash = window.location.hash.substring(1) || "overview";
    
    // If not Admin, keep locked in attendance
    if (this.currentUser && this.currentUser.role !== "Admin" && hash !== "attendance") {
      window.location.hash = "#attendance";
      return;
    }

    this.switchTab(hash);
  }

  switchTab(target) {
    if (!target) target = "overview";
    this.activeTab = target;
    if (window.SoundEngine) window.SoundEngine.playTransition();

    // Update sidebar menu items
    const items = document.querySelectorAll(".menu-item");
    items.forEach(item => {
      if (item.getAttribute("data-target") === target) {
        item.classList.add("active");
      } else {
        item.classList.remove("active");
      }
    });

    // Update main panels view
    const sections = document.querySelectorAll(".view-section");
    sections.forEach(sec => {
      const secId = sec.getAttribute("id");
      if (secId === `view-${target}`) {
        sec.classList.add("active");
        sec.style.display = "block";
      } else {
        sec.classList.remove("active");
        sec.style.display = "none";
      }
    });

    // Update Title text
    const titleMap = {
      "overview": "Overview",
      "sales": "POS & Sales",
      "inventory": "Inventory Management",
      "repairs": "Repair Center",
      "employees": "Employee Profiles",
      "attendance": "Attendance Register",
      "salaries": "Payroll & Salaries",
      "analytics": "Ratio Analytics",
      "settings": "System Settings"
    };
    const titleElem = document.getElementById("active-panel-title");
    if (titleElem) {
      titleElem.textContent = titleMap[target] || (target.charAt(0).toUpperCase() + target.slice(1));
    }
    
    this.renderActivePanel();
  }

  // --- DATE & TIME CLOCK ---
  setupClock() {
    this.updateClock();
    setInterval(this.updateClock, 1000);
  }

  updateClock() {
    const clock = document.getElementById("realtime-clock");
    if (!clock) return;
    const now = new Date();
    const options = { 
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: true
    };
    clock.textContent = now.toLocaleDateString('en-IN', options);
  }

  // --- THEME ---
  setupTheme() {
    const savedTheme = localStorage.getItem("a2a_theme");
    const toggleBtn = document.getElementById("theme-toggle-btn");
    
    if (savedTheme === "light") {
      document.body.classList.add("light-theme");
      if (toggleBtn) toggleBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
    } else {
      document.body.classList.remove("light-theme");
      if (toggleBtn) toggleBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
    }
  }

  toggleTheme() {
    const isLight = document.body.classList.toggle("light-theme");
    localStorage.setItem("a2a_theme", isLight ? "light" : "dark");
    
    const toggleBtn = document.getElementById("theme-toggle-btn");
    if (toggleBtn) {
      toggleBtn.innerHTML = isLight ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
    }
    
    this.renderActivePanel();
    window.SoundEngine.playClick();
  }

  // --- MODALS ---
  openModal(id, mode = "add", editId = null) {
    const modal = document.getElementById(id);
    if (!modal) return;
    
    modal.classList.add("active");
    window.SoundEngine.playClick();
    
    if (id === "modal-add-sale") {
      document.getElementById("sale-modal-title").textContent = mode === "edit" ? "Edit Sale Record" : "New Sale Register";
      document.getElementById("edit-sale-id").value = editId || "";
      this.populateSaleForm(editId);
    } else if (id === "modal-add-prod") {
      document.getElementById("prod-modal-title").textContent = mode === "edit" ? "Modify Inventory Item" : "Add Inventory Item";
      document.getElementById("edit-prod-id").value = editId || "";
      this.populateProductForm(editId);
    } else if (id === "modal-add-ticket") {
      document.getElementById("ticket-modal-title").textContent = mode === "edit" ? "Edit Service Ticket" : "Register Service Ticket";
      document.getElementById("edit-ticket-id").value = editId || "";
      this.populateTicketForm(editId);
    } else if (id === "modal-add-emp") {
      document.getElementById("emp-modal-title").textContent = mode === "edit" ? "Edit Employee Profile" : "Employee Profile Registration";
      document.getElementById("edit-emp-id").value = editId || "";
      this.populateEmployeeForm(editId);
    }
  }

  closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove("active");
    window.SoundEngine.playClick();
  }

  // --- MAIN DISPLAY DISPATCHER ---
  renderActivePanel() {
    if (!this.currentUser) return;

    this.renderNotifications();

    switch (this.activeTab) {
      case "overview":
        this.renderOverviewPanel();
        break;
      case "sales":
        this.renderSalesPanel();
        break;
      case "inventory":
        this.renderInventoryPanel();
        break;
      case "repairs":
        this.renderRepairsPanel();
        break;
      case "employees":
        this.renderEmployeesPanel();
        break;
      case "attendance":
        this.renderAttendancePanel();
        break;
      case "salaries":
        this.renderSalariesPanel();
        break;
      case "analytics":
        this.renderAnalyticsPanel();
        break;
      case "settings":
        this.renderSettingsPanel();
        break;
    }
  }

  // --- 1. OVERVIEW VIEW ---
  renderOverviewPanel() {
    const sales = this.db.get("sales");
    const products = this.db.get("products");
    const repairs = this.db.get("repairs");
    
    let totalSalesQty = 0;
    sales.forEach(s => totalSalesQty += s.quantity);
    document.getElementById("stat-sales-qty").textContent = totalSalesQty;

    let totalRevenue = 0;
    sales.forEach(s => totalRevenue += (s.price * s.quantity));
    
    let totalRepairsCompleted = 0;
    let totalRepairsPending = 0;
    repairs.forEach(r => {
      if (r.status === "Completed" || r.status === "Delivered") {
        totalRevenue += r.estimatedCost;
        totalRepairsCompleted++;
      } else {
        totalRepairsPending++;
      }
    });

    document.getElementById("stat-revenue").textContent = "₹" + Math.round(totalRevenue).toLocaleString('en-IN');
    document.getElementById("stat-repairs-completed").textContent = totalRepairsCompleted;
    document.getElementById("stat-repairs-pending").textContent = totalRepairsPending;

    // Render AI insights
    const insightBanner = document.getElementById("overview-ai-insights");
    if (insightBanner) {
      const insights = window.AI.getBusinessInsights(products, sales, repairs);
      const topInsight = insights[0] || { title: "Operations Safe", text: "Dashboard metrics look stable." };
      insightBanner.innerHTML = `
        <h4>A2A Predictor Agent <span style="background: ${topInsight.type === 'danger' ? 'var(--accent-red)' : 'var(--accent-cyan)'};">${topInsight.title}</span></h4>
        <p>${topInsight.text}</p>
      `;
    }

    // A. Revenue Area Chart
    const monthlyRev = {};
    sales.forEach(s => {
      const m = window.Utils.safeGetDateStr(s.date).substring(0, 7);
      monthlyRev[m] = (monthlyRev[m] || 0) + (s.price * s.quantity);
    });
    const thisMonth = new Date().toISOString().substring(0, 7);
    repairs.forEach(r => {
      if (r.status === "Completed" || r.status === "Delivered") {
        const m = window.Utils.safeGetDateStr(r.completionDate || thisMonth).substring(0, 7);
        monthlyRev[m] = (monthlyRev[m] || 0) + r.estimatedCost;
      }
    });
    const sortedMonths = Object.keys(monthlyRev).sort().slice(-5);
    const chartVals = sortedMonths.map(m => monthlyRev[m]);
    const chartLabels = sortedMonths.map(m => {
      const [y, mm] = m.split("-");
      return new Date(y, parseInt(mm)-1, 1).toLocaleString('default', { month: 'short' });
    });
    if (chartVals.length > 0) {
      window.Charts.createAreaChart("overview-revenue-chart", chartVals, chartLabels);
    }

    // B. Share Donut Chart
    const catCounts = {};
    products.forEach(p => {
      catCounts[p.category] = (catCounts[p.category] || 0) + p.stock;
    });
    const donutLabels = Object.keys(catCounts);
    const donutVals = donutLabels.map(l => catCounts[l]);
    if (donutVals.length > 0) {
      window.Charts.createDonutChart("overview-category-chart", donutVals, donutLabels);
    }

    // Overview Table lists
    document.getElementById("overview-sales-table").innerHTML = sales.sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 4).map(s => `
      <tr>
        <td><strong>#${s.id}</strong></td>
        <td>${s.productName}</td>
        <td>₹${s.price.toLocaleString('en-IN')}</td>
        <td>${s.customerName}</td>
      </tr>
    `).join("");

    const notifications = this.db.get("notifications").slice(0, 4);
    document.getElementById("overview-activity-feed").innerHTML = notifications.map(n => `
      <div class="activity-item">
        <div class="activity-circle ${n.type}" style="color: var(--accent-${n.type === 'info' ? 'cyan' : n.type === 'success' ? 'green' : n.type === 'warning' ? 'orange' : 'red'});"></div>
        <div class="activity-content">
          <div class="activity-title">${n.message}</div>
          <div class="activity-time">${n.time}</div>
        </div>
      </div>
    `).join("");
  }

  // --- 2. POS & SALES LEDGER VIEW ---
  renderSalesPanel() {
    const posView = document.getElementById("sales-pos-view");
    const ledgerView = document.getElementById("sales-ledger-view");
    
    const posBtn = document.getElementById("subtab-pos-btn");
    const ledgerBtn = document.getElementById("subtab-ledger-btn");

    if (this.salesSubTab === "pos") {
      posView.style.display = "grid";
      ledgerView.style.display = "none";
      posBtn.className = "btn btn-primary";
      ledgerBtn.className = "btn btn-secondary";
      this.renderPOSCatalog();
      this.renderPOSCart();
    } else {
      posView.style.display = "none";
      ledgerView.style.display = "block";
      posBtn.className = "btn btn-secondary";
      ledgerBtn.className = "btn btn-primary";
      this.renderSalesLedgerTable();
    }
  }

  // A. POS Catalog Grid
  renderPOSCatalog() {
    const products = this.db.get("products");
    const query = document.getElementById("pos-search-input").value.toLowerCase();
    const catFilter = document.getElementById("pos-cat-filter").value;
    const grid = document.getElementById("pos-product-grid");
    
    if (!grid) return;

    const filtered = products.filter(p => {
      const matchQuery = p.name.toLowerCase().includes(query) || p.id.toLowerCase().includes(query);
      const matchCat = catFilter === "" || p.category === catFilter;
      return matchQuery && matchCat && p.stock > 0;
    });

    grid.innerHTML = filtered.map(p => `
      <div class="pos-prod-card" onclick="app.addToCart('${p.id}')">
        <div>
          <div style="font-weight: 700; font-size: 0.8rem; line-height: 1.3; color: var(--text-primary);">${p.name}</div>
          <div style="font-size: 0.65rem; color: var(--text-secondary); margin-top: 4px;">SKU: ${p.id} | Cat: ${p.category}</div>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 8px;">
          <span style="font-size: 0.9rem; font-weight: 800; color: var(--accent-cyan);">₹${Math.round(p.price).toLocaleString('en-IN')}</span>
          <span class="badge ${p.stock <= p.minStock ? 'red' : 'green'}" style="font-size: 0.6rem; padding: 2px 4px;">Qty: ${p.stock}</span>
        </div>
      </div>
    `).join("");
  }

  addToCart(productId) {
    const products = this.db.get("products");
    const prod = products.find(p => p.id === productId);
    if (!prod) return;

    const cartItem = this.cart.find(item => item.productId === productId);
    if (cartItem) {
      if (cartItem.quantity >= prod.stock) {
        window.Toast.show("warning", "Stock Limit Reached", `Only ${prod.stock} units are currently available.`);
        return;
      }
      cartItem.quantity++;
    } else {
      this.cart.push({
        productId,
        name: prod.name,
        price: prod.price,
        quantity: 1
      });
    }

    window.SoundEngine.playClick();
    this.renderPOSCart();
  }

  removeFromCart(productId) {
    const idx = this.cart.findIndex(item => item.productId === productId);
    if (idx >= 0) {
      this.cart.splice(idx, 1);
    }
    window.SoundEngine.playClick();
    this.renderPOSCart();
  }

  changeCartQty(productId, amount) {
    const products = this.db.get("products");
    const prod = products.find(p => p.id === productId);
    const cartItem = this.cart.find(item => item.productId === productId);
    
    if (cartItem) {
      const nextQty = cartItem.quantity + amount;
      if (nextQty <= 0) {
        this.removeFromCart(productId);
      } else {
        if (amount > 0 && nextQty > prod.stock) {
          window.Toast.show("warning", "Stock Limit", `Only ${prod.stock} items in stock.`);
          return;
        }
        cartItem.quantity = nextQty;
        window.SoundEngine.playClick();
        this.renderPOSCart();
      }
    }
  }

  renderPOSCart() {
    const list = document.getElementById("pos-cart-list");
    if (!list) return;

    if (this.cart.length === 0) {
      list.innerHTML = `<div style="text-align:center; padding: 30px; color: var(--text-muted); font-size: 0.8rem;"><i class="fa-solid fa-basket-shopping" style="font-size: 1.8rem; margin-bottom: 8px;"></i><br/>Cart is empty.</div>`;
      document.getElementById("pos-subtotal").textContent = "₹0.00";
      document.getElementById("pos-discount-value").textContent = "-₹0.00";
      document.getElementById("pos-tax").textContent = "₹0.00";
      document.getElementById("pos-total").textContent = "₹0.00";
      return;
    }

    list.innerHTML = this.cart.map(item => `
      <div class="pos-cart-item">
        <div style="flex-grow: 1; min-width: 0; padding-right: 5px;">
          <div style="font-weight: 700; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${item.name}</div>
          <div style="font-size: 0.7rem; color: var(--accent-cyan); margin-top: 2px;">₹${item.price.toLocaleString('en-IN')} each</div>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="display: flex; align-items: center; border: 1px solid var(--glass-border); border-radius: 4px; overflow: hidden; background: rgba(0,0,0,0.2);">
            <button style="background: none; border: none; color: inherit; padding: 2px 6px; cursor: pointer; font-size: 0.75rem;" onclick="app.changeCartQty('${item.productId}', -1)">-</button>
            <span style="font-size: 0.75rem; padding: 0 4px; font-weight: 700;">${item.quantity}</span>
            <button style="background: none; border: none; color: inherit; padding: 2px 6px; cursor: pointer; font-size: 0.75rem;" onclick="app.changeCartQty('${item.productId}', 1)">+</button>
          </div>
          <span style="font-weight: 700; width: 75px; text-align: right;">₹${Math.round(item.price * item.quantity).toLocaleString('en-IN')}</span>
          <button style="background: none; border: none; color: var(--accent-red); cursor: pointer;" onclick="app.removeFromCart('${item.productId}')"><i class="fa-solid fa-xmark"></i></button>
        </div>
      </div>
    `).join("");

    // Compute Calculations
    let subtotal = 0;
    this.cart.forEach(item => subtotal += (item.price * item.quantity));

    const discPercent = parseInt(document.getElementById("pos-discount").value) || 0;
    const discountVal = subtotal * (discPercent / 100);
    const taxableAmount = subtotal - discountVal;
    const gstRate = 0.18;
    const tax = taxableAmount * gstRate;
    const total = taxableAmount + tax;

    document.getElementById("pos-subtotal").textContent = "₹" + subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    document.getElementById("pos-discount-value").textContent = "-₹" + discountVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    document.getElementById("pos-tax").textContent = "₹" + tax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    document.getElementById("pos-total").textContent = "₹" + total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  async runPOSCheckout() {
    if (!this.cart || this.cart.length === 0) {
      window.Toast.show("warning", "Cart Empty", "Please add items from the product grid to your cart first.");
      return;
    }

    const customerInput = document.getElementById("pos-customer-name");
    const discountInput = document.getElementById("pos-discount");
    const paymentInput = document.getElementById("pos-payment");

    const customerName = (customerInput && customerInput.value.trim()) ? customerInput.value.trim() : "Walk-in Client";
    const discount = (discountInput && parseInt(discountInput.value)) ? parseInt(discountInput.value) : 0;
    const paymentMethod = (paymentInput && paymentInput.value) ? paymentInput.value : "UPI";
    const today = window.Utils.safeGetDateStr(new Date());

    const sales = this.db.get("sales");
    const products = this.db.get("products");

    // Deduct stock and validate availability
    let stockError = false;
    this.cart.forEach(item => {
      const prod = products.find(p => p.id === item.productId);
      if (prod) {
        if (prod.stock < item.quantity) {
          stockError = true;
          window.Toast.show("error", "Stock Insufficient", `Only ${prod.stock} items remaining for ${prod.name}.`);
          return;
        }
        prod.stock -= item.quantity;
      }
    });

    if (stockError) {
      if (window.SoundEngine) window.SoundEngine.playError();
      return;
    }

    // Save updated product stock
    this.db.set("products", products);

    // Create and save sales transactions
    const invoiceList = [];
    this.cart.forEach(item => {
      const finalPrice = item.price * (1 - discount / 100);
      const record = {
        id: "S" + Math.floor(1000 + Math.random() * 9000),
        productId: item.productId,
        productName: item.name,
        customerName,
        price: Math.round(finalPrice * 100) / 100,
        quantity: item.quantity,
        paymentMethod,
        date: today,
        warrantyStatus: "Active (1 Year)"
      };
      sales.push(record);
      invoiceList.push(record);
    });

    this.db.set("sales", sales);
    
    // Clear POS cart and reset input controls
    this.cart = [];
    if (customerInput) customerInput.value = "Walk-in Client";
    if (discountInput) discountInput.value = "0";

    // Refresh UI panels and totals
    this.renderActivePanel();
    this.renderPOSCart();

    // Auto sync to Excel
    await this.triggerExcelAutoSave();

    // Audio chime & notification
    if (window.SoundEngine) window.SoundEngine.playSuccess();
    window.Toast.show("success", "POS Checkout Completed", `Payment logged for ${customerName}. ${invoiceList.length} items recorded.`);
  }

  // B. Ledger History Table
  renderSalesLedgerTable() {
    const sales = this.db.get("sales");
    const query = document.getElementById("sales-search-input").value.toLowerCase();
    const filterPay = document.getElementById("sales-filter-method").value;
    const tableBody = document.getElementById("sales-main-table");
    
    const filtered = sales.filter(s => {
      const matchQuery = s.productName.toLowerCase().includes(query) || 
                         s.customerName.toLowerCase().includes(query) || 
                         s.id.toLowerCase().includes(query);
      const matchPay = filterPay === "" || s.paymentMethod === filterPay;
      return matchQuery && matchPay;
    }).sort((a,b) => new Date(b.date) - new Date(a.date));

    tableBody.innerHTML = filtered.map(s => `
      <tr>
        <td><strong>#${s.id}</strong></td>
        <td>
          <div style="font-weight:600;">${s.productName}</div>
          <div style="font-size:0.75rem; color:var(--text-muted);">SKU: ${s.productId}</div>
        </td>
        <td>${s.customerName}</td>
        <td>₹${s.price.toLocaleString('en-IN')}</td>
        <td>${s.quantity}</td>
        <td style="font-weight:600; color:var(--accent-cyan);">₹${(s.price * s.quantity).toLocaleString('en-IN')}</td>
        <td><span class="badge ${s.paymentMethod === 'UPI' ? 'green' : s.paymentMethod === 'Credit Card' ? 'cyan' : s.paymentMethod === 'Cash' ? 'orange' : 'purple'}">${s.paymentMethod}</span></td>
        <td>${s.date}</td>
        <td><span style="font-size:0.8rem; font-weight:500; color:${s.warrantyStatus !== 'None' ? 'var(--accent-green)' : 'var(--text-muted)'};">${s.warrantyStatus}</span></td>
        <td style="text-align: right;">
          <div style="display:flex; gap:6px; justify-content: flex-end;">
            <button class="btn btn-secondary btn-icon" onclick="app.openModal('modal-add-sale', 'edit', '${s.id}')" title="Edit"><i class="fa-solid fa-pen"></i></button>
            <button class="btn btn-secondary btn-icon" onclick="app.printSaleInvoice('${s.id}')" title="Print Invoice"><i class="fa-solid fa-print"></i></button>
            <button class="btn btn-secondary btn-icon" style="color:var(--accent-red);" onclick="app.deleteSale('${s.id}')" title="Delete"><i class="fa-solid fa-trash-can"></i></button>
          </div>
        </td>
      </tr>
    `).join("");
  }

  deleteSale(id) {
    if (confirm(`Delete sale transaction #${id}?`)) {
      const sales = this.db.get("sales");
      const filtered = sales.filter(s => s.id !== id);
      this.db.set("sales", filtered);
      this.triggerExcelAutoSave();
      this.renderSalesPanel();
      window.Toast.show("error", "Voucher Cancelled", `Sales invoice #${id} has been deleted.`);
    }
  }

  printSaleInvoice(id) {
    const sales = this.db.get("sales");
    const sale = sales.find(s => s.id === id);
    if (sale) {
      window.Utils.printInvoice(sale);
    }
  }

  // --- 3. INVENTORY VIEW ---
  renderInventoryPanel() {
    const products = this.db.get("products");
    const query = document.getElementById("inventory-search-input").value.toLowerCase();
    const filterCat = document.getElementById("inventory-filter-cat").value;
    const tableBody = document.getElementById("inventory-main-table");

    const filtered = products.filter(p => {
      const matchQuery = p.name.toLowerCase().includes(query) || p.id.toLowerCase().includes(query);
      const matchCat = filterCat === "" || p.category === filterCat;
      return matchQuery && matchCat;
    });

    tableBody.innerHTML = filtered.map(p => {
      const isLow = p.stock <= p.minStock;
      return `
        <tr style="${isLow ? 'background: rgba(239, 68, 68, 0.03);' : ''}">
          <td><strong>${p.id}</strong></td>
          <td>
            <div style="font-weight: 600;">${p.name}</div>
          </td>
          <td>${p.category}</td>
          <td>₹${p.price.toLocaleString('en-IN')}</td>
          <td>
            <div style="font-weight:600; color:${isLow ? 'var(--accent-red)' : 'var(--text-primary)'}">${p.stock} units</div>
            <div style="font-size:0.7rem; color:var(--text-muted);">Threshold: ${p.minStock}</div>
          </td>
          <td>
            <span class="badge ${isLow ? 'red' : 'green'}">${isLow ? 'LOW STOCK' : 'IN STOCK'}</span>
          </td>
          <td>
            <div style="font-size: 0.85rem;">${p.supplier}</div>
          </td>
          <td>
            <div class="barcode-box">
              <div class="barcode-lines">
                <span class="thick"></span>
                <span></span>
                <span class="space"></span>
                <span></span>
                <span class="thick"></span>
                <span></span>
                <span class="space"></span>
                <span class="thick"></span>
              </div>
              <div class="barcode-text">${p.id}</div>
            </div>
          </td>
          <td style="text-align: right;">
            <div style="display:flex; gap:6px; justify-content: flex-end;">
              <button class="btn btn-secondary btn-icon" onclick="app.openModal('modal-add-prod', 'edit', '${p.id}')" title="Edit"><i class="fa-solid fa-pen"></i></button>
              <button class="btn btn-secondary btn-icon" style="color:var(--accent-red);" onclick="app.deleteProduct('${p.id}')" title="Delete"><i class="fa-solid fa-trash-can"></i></button>
            </div>
          </td>
        </tr>
      `;
    }).join("");
  }

  deleteProduct(id) {
    if (confirm(`Remove product ${id} from catalog?`)) {
      const products = this.db.get("products");
      const filtered = products.filter(p => p.id !== id);
      this.db.set("products", filtered);
      this.triggerExcelAutoSave();
      this.renderInventoryPanel();
      window.Toast.show("error", "Catalog Removed", `SKU ${id} has been deleted.`);
    }
  }

  // --- 4. REPAIR CENTER VIEW ---
  renderRepairsPanel() {
    const kanbanView = document.getElementById("repairs-kanban-view");
    const ledgerView = document.getElementById("repairs-ledger-view");
    
    const kanbanBtn = document.getElementById("subtab-kanban-btn");
    const ledgerBtn = document.getElementById("subtab-repairs-ledger-btn");

    if (this.repairsSubTab === "kanban") {
      kanbanView.style.display = "grid";
      ledgerView.style.display = "none";
      kanbanBtn.className = "btn btn-primary";
      ledgerBtn.className = "btn btn-secondary";
      this.renderRepairsKanban();
    } else {
      kanbanView.style.display = "none";
      ledgerView.style.display = "block";
      kanbanBtn.className = "btn btn-secondary";
      ledgerBtn.className = "btn btn-primary";
      this.renderRepairsTable();
    }

    // Populate technicians dropdown for tickets
    const employees = this.db.get("employees");
    const techSelect = document.getElementById("ticket-tech");
    if (techSelect) {
      const techs = employees.filter(e => e.position === "Technician" || e.position === "Admin");
      techSelect.innerHTML = techs.map(t => `<option value="${t.id}">${t.name} (${t.position})</option>`).join("");
    }
  }

  // A. Kanban Columns Renderer
  renderRepairsKanban() {
    const repairs = this.db.get("repairs");
    const employees = this.db.get("employees");
    
    const techMap = {};
    employees.forEach(e => techMap[e.id] = e.name);

    const columns = {
      "Pending": { container: document.getElementById("cards-pending"), countLabel: document.getElementById("kanban-count-pending"), data: [] },
      "In Progress": { container: document.getElementById("cards-progress"), countLabel: document.getElementById("kanban-count-progress"), data: [] },
      "Completed": { container: document.getElementById("cards-completed"), countLabel: document.getElementById("kanban-count-completed"), data: [] },
      "Delivered": { container: document.getElementById("cards-delivered"), countLabel: document.getElementById("kanban-count-delivered"), data: [] }
    };

    // Group tickets
    repairs.forEach(r => {
      if (columns[r.status]) {
        columns[r.status].data.push(r);
      }
    });

    // Populate columns
    for (let status in columns) {
      const col = columns[status];
      if (col.countLabel) col.countLabel.textContent = col.data.length;
      if (!col.container) continue;

      if (col.data.length === 0) {
        col.container.innerHTML = `<div style="text-align:center; padding:20px; font-size:0.75rem; color:var(--text-muted); border: 1px dashed var(--glass-border); border-radius:4px;">No tickets</div>`;
      } else {
        col.container.innerHTML = col.data.map(r => {
          let actionBtn = "";
          if (r.status === "Pending") actionBtn = `<button class="btn btn-secondary" style="font-size:0.7rem; padding: 4px;" onclick="app.moveRepStat('${r.id}', 'In Progress')">Work <i class="fa-solid fa-arrow-right"></i></button>`;
          else if (r.status === "In Progress") actionBtn = `<button class="btn btn-secondary" style="font-size:0.7rem; padding: 4px;" onclick="app.moveRepStat('${r.id}', 'Completed')">Test <i class="fa-solid fa-arrow-right"></i></button>`;
          else if (r.status === "Completed") actionBtn = `<button class="btn btn-primary" style="font-size:0.7rem; padding: 4px;" onclick="app.moveRepStat('${r.id}', 'Delivered')">Deliver <i class="fa-solid fa-box-open"></i></button>`;

          return `
            <div class="kanban-card" draggable="true" ondragstart="event.dataTransfer.setData('text/plain', '${r.id}')">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:0.7rem; font-weight:700; color:var(--text-muted);">#${r.id}</span>
                <span style="font-size:0.75rem; font-weight:700; color:var(--accent-cyan);">₹${r.estimatedCost}</span>
              </div>
              <div style="font-weight:700; font-size:0.8rem; color:var(--text-primary); margin-top:2px;">${r.customerName}</div>
              <div style="font-size:0.75rem; font-weight:600; color:var(--text-secondary);">${r.deviceType}</div>
              <p style="font-size:0.7rem; color:var(--text-muted); line-height:1.2; max-height:36px; overflow:hidden; text-overflow:ellipsis;">${r.problemDescription}</p>
              
              <div style="font-size:0.7rem; color:var(--accent-purple); font-weight:600; margin-top:4px;">
                <i class="fa-solid fa-user-gear"></i> ${techMap[r.assignedTechnician] || "Unassigned"}
              </div>

              <div style="display:flex; justify-content:space-between; align-items:center; margin-top:6px; border-top:1px dashed var(--glass-border); padding-top:6px;">
                <button class="btn btn-secondary btn-icon" style="padding:4px;" onclick="app.openModal('modal-add-ticket', 'edit', '${r.id}')"><i class="fa-solid fa-pen" style="font-size:0.65rem;"></i></button>
                ${actionBtn}
              </div>
            </div>
          `;
        }).join("");
      }
    }

    // Set up HTML5 drag events
    for (let status in columns) {
      const container = columns[status].container;
      if (!container) continue;

      container.ondragover = (e) => e.preventDefault();
      container.ondrop = (e) => {
        e.preventDefault();
        const id = e.dataTransfer.getData("text/plain");
        this.moveRepStat(id, status);
      };
    }
  }

  moveRepStat(id, nextStatus) {
    const repairs = this.db.get("repairs");
    const ticket = repairs.find(r => r.id === id);
    if (!ticket) return;

    ticket.status = nextStatus;
    if (nextStatus === "Completed" || nextStatus === "Delivered") {
      ticket.completionDate = new Date().toISOString().substring(0, 10);
    }
    
    this.db.set("repairs", repairs);
    this.triggerExcelAutoSave();
    this.renderRepairsPanel();
    window.Toast.show("success", "Ticket Advanced", `Ticket #${id} status changed to ${nextStatus}.`);
  }

  // B. Detailed Table Log
  renderRepairsTable() {
    const repairs = this.db.get("repairs");
    const employees = this.db.get("employees");
    const query = document.getElementById("repairs-search-input").value.toLowerCase();
    const filterStatus = document.getElementById("repairs-filter-status").value;
    const tableBody = document.getElementById("repairs-main-table");

    const techMap = {};
    employees.forEach(e => techMap[e.id] = e.name);

    const filtered = repairs.filter(r => {
      const techName = techMap[r.assignedTechnician] || "";
      const matchQuery = r.customerName.toLowerCase().includes(query) || 
                         r.problemDescription.toLowerCase().includes(query) ||
                         techName.toLowerCase().includes(query);
      const matchStatus = filterStatus === "" || r.status === filterStatus;
      return matchQuery && matchStatus;
    });

    tableBody.innerHTML = filtered.map(r => {
      let badgeClass = "orange";
      if (r.status === "Pending") badgeClass = "red";
      if (r.status === "In Progress") badgeClass = "orange";
      if (r.status === "Completed") badgeClass = "cyan";
      if (r.status === "Delivered") badgeClass = "green";

      return `
        <tr>
          <td><strong>#${r.id}</strong></td>
          <td>${r.customerName}</td>
          <td><span style="font-weight: 600;">${r.deviceType}</span></td>
          <td>
            <div style="max-width: 250px; font-size: 0.85rem; font-weight:500;">${r.problemDescription}</div>
            <div style="font-size:0.75rem; color:var(--accent-cyan); margin-top:4px; font-style:italic;">Note: ${r.diagnosticsLog}</div>
          </td>
          <td style="font-weight: 600;">₹${r.estimatedCost.toLocaleString('en-IN')}</td>
          <td>${techMap[r.assignedTechnician] || "Unassigned"}</td>
          <td><span class="badge ${badgeClass}">${r.status}</span></td>
          <td>${r.completionDate || "-"}</td>
          <td style="text-align: right;">
            <div style="display:flex; gap:6px; justify-content: flex-end;">
              <button class="btn btn-secondary btn-icon" onclick="app.openModal('modal-add-ticket', 'edit', '${r.id}')" title="Edit"><i class="fa-solid fa-pen"></i></button>
              <button class="btn btn-secondary btn-icon" style="color:var(--accent-red);" onclick="app.deleteTicket('${r.id}')" title="Delete"><i class="fa-solid fa-trash-can"></i></button>
            </div>
          </td>
        </tr>
      `;
    }).join("");
  }

  deleteTicket(id) {
    if (confirm(`Delete service ticket #${id}?`)) {
      const repairs = this.db.get("repairs");
      const filtered = repairs.filter(r => r.id !== id);
      this.db.set("repairs", filtered);
      this.triggerExcelAutoSave();
      this.renderRepairsPanel();
      window.Toast.show("error", "Ticket Cancelled", `Service ticket #${id} deleted.`);
    }
  }

  runAIDiagnostics() {
    const devType = document.getElementById("ai-diag-dev").value;
    const complaint = document.getElementById("ai-diag-desc").value;
    if (!complaint) return;

    window.SoundEngine.playClick();
    const resultBox = document.getElementById("ai-diagnostic-result");
    const advice = window.AI.getRepairAdvice(devType, complaint);

    resultBox.style.display = "block";
    resultBox.innerHTML = `
      <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--glass-border); padding-bottom: 8px; margin-bottom: 12px;">
        <h4 style="color: var(--accent-cyan); font-weight:700;"><i class="fa-solid fa-microchip"></i> Diagnostic Analysis:</h4>
        <span style="font-size:0.75rem; color: var(--accent-orange); font-weight:600;"><i class="fa-solid fa-clock"></i> Est: ${advice.timeEstimate}</span>
      </div>
      <div style="font-size: 0.85rem; line-height: 1.5; color: var(--text-primary);">
        <p style="margin-bottom: 8px;"><strong>Probable Culprit:</strong> ${advice.primaryCause}</p>
        <p style="margin-bottom: 12px;"><strong>Replacement Parts Recommended:</strong> ${advice.partsNeeded}</p>
        <strong>Suggested Diagnostics Steps:</strong>
        <ol style="margin-top: 6px; padding-left: 20px; display:flex; flex-direction:column; gap:6px;">
          ${advice.steps.map(s => `<li>${s}</li>`).join("")}
        </ol>
      </div>
    `;
    window.Toast.show("success", "AI Analysis Completed", "Calculated repair requirements advice details.");
  }

  // --- 5. STAFF/EMPLOYEES VIEW ---
  renderEmployeesPanel() {
    const employees = this.db.get("employees");
    const query = document.getElementById("employees-search-input").value.toLowerCase();
    const filterRole = document.getElementById("employees-filter-role").value;
    const tableBody = document.getElementById("employees-main-table");

    const filtered = employees.filter(e => {
      const matchQuery = e.name.toLowerCase().includes(query) || e.email.toLowerCase().includes(query);
      const matchRole = filterRole === "" || e.position === filterRole;
      return matchQuery && matchRole;
    });

    tableBody.innerHTML = filtered.map(e => `
      <tr>
        <td><strong>${e.id}</strong></td>
        <td>
          <div style="font-weight: 600;">${e.name}</div>
        </td>
        <td>
          <div>${e.phone}</div>
        </td>
        <td>${e.email}</td>
        <td><span class="badge ${e.position === 'Admin' ? 'red' : e.position === 'Store Manager' ? 'purple' : e.position === 'Technician' ? 'orange' : e.position === 'Accountant' ? 'cyan' : 'green'}">${e.position}</span></td>
        <td style="font-weight:600;">₹${e.salary.toLocaleString('en-IN')}</td>
        <td>${e.joiningDate}</td>
        <td style="text-align: right;">
          <div style="display:flex; gap:6px; justify-content: flex-end;">
            <button class="btn btn-secondary btn-icon" onclick="app.openModal('modal-add-emp', 'edit', '${e.id}')" title="Edit"><i class="fa-solid fa-pen"></i></button>
            <button class="btn btn-secondary btn-icon" style="color:var(--accent-red);" onclick="app.deleteEmployee('${e.id}')" title="Delete"><i class="fa-solid fa-trash-can"></i></button>
          </div>
        </td>
      </tr>
    `).join("");
  }

  deleteEmployee(id) {
    if (confirm(`Delete employee profile ${id}?`)) {
      const employees = this.db.get("employees");
      const filtered = employees.filter(e => e.id !== id);
      this.db.set("employees", filtered);
      this.triggerExcelAutoSave();
      this.renderEmployeesPanel();
      window.Toast.show("error", "Profile Deleted", `Employee file #${id} removed.`);
    }
  }

  // --- 6. ATTENDANCE VIEW ---
  renderAttendancePanel() {
    const employees = this.db.get("employees");
    const attendance = this.db.get("attendance");
    
    const logDateInput = document.getElementById("attendance-log-date");
    if (!logDateInput.value) {
      logDateInput.value = new Date().toISOString().substring(0, 10);
    }
    const targetDate = logDateInput.value;

    const clockEmpSelect = document.getElementById("clock-emp-select");
    const calendarEmpSelect = document.getElementById("calendar-emp-select");
    const payrollEmpSelect = document.getElementById("payroll-emp-select");

    const empOptionsHtml = employees.map(e => `<option value="${e.id}">${e.name} (${e.position})</option>`).join("");
    if (clockEmpSelect) clockEmpSelect.innerHTML = empOptionsHtml;
    
    if (calendarEmpSelect && !calendarEmpSelect.innerHTML) {
      calendarEmpSelect.innerHTML = empOptionsHtml;
      calendarEmpSelect.addEventListener("change", () => this.renderAttendanceCalendar());
    }

    if (payrollEmpSelect && payrollEmpSelect.innerHTML.trim() === '<option value="ALL">All Staff</option>') {
      payrollEmpSelect.innerHTML = '<option value="ALL">All Staff</option>' + employees.map(e => `<option value="${e.id}">${e.name}</option>`).join("");
    }

    const tableBody = document.getElementById("attendance-today-table");
    const dayRecords = attendance.filter(a => a.date === targetDate);
    const dayRecordsMap = {};
    dayRecords.forEach(r => dayRecordsMap[r.empId] = r);

    // Filter attendance lists if logged-in user is not Admin (they should only see their own attendance row)
    const isAdmin = this.currentUser.role === "Admin";
    const visibleEmployees = isAdmin ? employees : employees.filter(e => e.name === this.currentUser.name);

    tableBody.innerHTML = visibleEmployees.map(emp => {
      const record = dayRecordsMap[emp.id] || { status: "Absent", checkIn: "-", checkOut: "-" };
      let badgeClass = "red";
      if (record.status === "Present") badgeClass = "green";
      if (record.status === "Leave") badgeClass = "purple";
      if (record.status === "Half Day") badgeClass = "orange";

      return `
        <tr>
          <td><strong>${emp.id}</strong></td>
          <td>${emp.name}</td>
          <td>${targetDate}</td>
          <td>${record.checkIn || "-"}</td>
          <td>${record.checkOut || "-"}</td>
          <td><span class="badge ${badgeClass}">${record.status}</span></td>
          <td style="text-align: right;" class="admin-only-cell">
            <button class="btn btn-secondary btn-icon" onclick="app.quickToggleAttendance('${emp.id}', '${targetDate}', '${record.status}')" title="Toggle Status"><i class="fa-solid fa-arrows-rotate"></i></button>
          </td>
        </tr>
      `;
    }).join("");

    this.renderAttendanceCalendar();
  }

  quickToggleAttendance(empId, date, currentStatus) {
    const attendance = this.db.get("attendance");
    let recordIdx = attendance.findIndex(a => a.empId === empId && a.date === date);
    
    const statuses = ["Present", "Absent", "Leave", "Half Day"];
    const nextIdx = (statuses.indexOf(currentStatus) + 1) % statuses.length;
    const nextStatus = statuses[nextIdx];

    const newRecord = {
      date,
      empId,
      status: nextStatus,
      checkIn: nextStatus === "Present" || nextStatus === "Half Day" ? "09:00" : "",
      checkOut: nextStatus === "Present" || nextStatus === "Half Day" ? "18:00" : ""
    };

    if (recordIdx >= 0) {
      if (nextStatus === "Absent") {
        attendance.splice(recordIdx, 1);
      } else {
        attendance[recordIdx] = newRecord;
      }
    } else {
      if (nextStatus !== "Absent") {
        attendance.push(newRecord);
      }
    }

    this.db.set("attendance", attendance);
    this.triggerExcelAutoSave();
    this.renderAttendancePanel();
    window.Toast.show("info", "Attendance Toggled", `Set ${empId} to ${nextStatus}.`);
  }

  async clockIn() {
    const empId = document.getElementById("clock-emp-select").value;
    const today = new Date().toISOString().substring(0, 10);
    const time = new Date().toTimeString().substring(0, 5);

    const attendance = this.db.get("attendance");
    const recordIdx = attendance.findIndex(a => a.empId === empId && a.date === today);

    if (recordIdx >= 0) {
      window.Toast.show("warning", "Clock-In Aborted", "You have already clocked in for today.");
      return;
    }

    attendance.push({
      date: today,
      empId,
      status: "Present",
      checkIn: time,
      checkOut: ""
    });

    this.db.set("attendance", attendance);
    
    // Auto-save attendance edits straight to Excel
    await this.triggerExcelAutoSave();

    this.renderAttendancePanel();
    window.Toast.show("success", "Clock-In Success", `Logged check-in time: ${time}.`);
  }

  async clockOut() {
    const empId = document.getElementById("clock-emp-select").value;
    const today = new Date().toISOString().substring(0, 10);
    const time = new Date().toTimeString().substring(0, 5);

    const attendance = this.db.get("attendance");
    const recordIdx = attendance.findIndex(a => a.empId === empId && a.date === today);

    if (recordIdx < 0) {
      window.Toast.show("error", "Clock-Out Aborted", "No active clock-in session found for today.");
      return;
    }

    attendance[recordIdx].checkOut = time;
    this.db.set("attendance", attendance);
    
    // Auto-save attendance edits straight to Excel
    await this.triggerExcelAutoSave();

    this.renderAttendancePanel();
    window.Toast.show("success", "Clock-Out Success", `Logged check-out time: ${time}.`);
  }

  renderAttendanceCalendar() {
    const grid = document.getElementById("attendance-calendar-grid");
    const empId = document.getElementById("calendar-emp-select").value;
    if (!grid || !empId) return;

    grid.innerHTML = "";
    
    const daysInMonth = 31;
    const startDayIndex = 5; // May 2026 starts on Friday

    const attendance = this.db.get("attendance");
    const empRecords = attendance.filter(a => a.empId === empId && window.Utils.safeGetDateStr(a.date).startsWith("2026-05"));
    const recordsMap = {};
    empRecords.forEach(r => {
      const dayNum = parseInt(window.Utils.safeGetDateStr(r.date).split("-")[2]);
      recordsMap[dayNum] = r.status;
    });

    for (let i = 0; i < startDayIndex; i++) {
      grid.innerHTML += `<div class="calendar-day other-month"><span>${30 - startDayIndex + 1 + i}</span></div>`;
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const status = recordsMap[day] || "Absent";
      const formattedStatus = status.toLowerCase().replace(/\s+/g, '');
      grid.innerHTML += `
        <div class="calendar-day ${formattedStatus}">
          <span>${day}</span>
          <span style="font-size:0.65rem; font-weight:600; opacity:0.8;">${status}</span>
          <div class="calendar-dot ${formattedStatus}"></div>
        </div>
      `;
    }
  }

  // --- 7. SALARY VIEW ---
  renderSalariesPanel() {
    const salaries = this.db.get("salaries");
    const employees = this.db.get("employees");
    const tableBody = document.getElementById("salaries-main-table");

    const empMap = {};
    employees.forEach(e => empMap[e.id] = e);

    tableBody.innerHTML = salaries.sort((a,b) => b.month.localeCompare(a.month)).map(s => {
      const emp = empMap[s.empId] || { name: "Unknown", position: "Staff" };
      return `
        <tr>
          <td><strong>${s.month}</strong></td>
          <td>${s.empId}</td>
          <td style="font-weight: 600;">${emp.name}</td>
          <td><span class="badge cyan">${emp.position}</span></td>
          <td>₹${s.baseSalary.toLocaleString('en-IN')}</td>
          <td>₹${s.bonus.toLocaleString('en-IN')}</td>
          <td>₹${s.deduction.toLocaleString('en-IN')}</td>
          <td style="font-weight:700; color:var(--accent-purple);">₹${s.finalSalary.toLocaleString('en-IN')}</td>
          <td><span class="badge green"><i class="fa-solid fa-circle-check"></i> ${s.status}</span></td>
          <td style="text-align: right;">
            <div style="display:flex; gap:6px; justify-content: flex-end;">
              <button class="btn btn-secondary btn-icon" onclick="app.printPayslip('${s.empId}', '${s.month}')" title="Print Payslip"><i class="fa-solid fa-print"></i> Payslip</button>
              <button class="btn btn-secondary btn-icon" style="color:var(--accent-red);" onclick="app.deleteSalaryRecord('${s.empId}', '${s.month}')" title="Delete"><i class="fa-solid fa-trash-can"></i></button>
            </div>
          </td>
        </tr>
      `;
    }).join("");
  }

  async runPayrollCalculation() {
    const month = document.getElementById("payroll-month-select").value;
    const empIdTarget = document.getElementById("payroll-emp-select").value;
    
    const employees = this.db.get("employees");
    const attendance = this.db.get("attendance");
    const salaries = this.db.get("salaries");

    const targetEmployees = empIdTarget === "ALL" 
      ? employees 
      : employees.filter(e => e.id === empIdTarget);

    let calcCount = 0;

    targetEmployees.forEach(emp => {
      const empAttendance = attendance.filter(a => a.empId === emp.id && a.date.startsWith(month));
      
      let presentCount = 0;
      let halfDayCount = 0;
      let leaveCount = 0;
      let absentCount = 30 - empAttendance.length;

      empAttendance.forEach(a => {
        if (a.status === "Present") presentCount++;
        else if (a.status === "Half Day") halfDayCount++;
        else if (a.status === "Leave") leaveCount++;
      });

      const basePay = emp.salary;
      const bonus = Math.max(0, (presentCount - 20) * 800);
      const deduction = (absentCount * 1500) + (halfDayCount * 800);
      const finalSalary = Math.max(0, basePay + bonus - deduction);

      const existingIdx = salaries.findIndex(s => s.empId === emp.id && s.month === month);
      const payrollRecord = {
        month,
        empId: emp.id,
        baseSalary: basePay,
        bonus,
        deduction,
        finalSalary,
        status: "Paid",
        payoutDate: new Date().toISOString().substring(0, 10)
      };

      if (existingIdx >= 0) {
        salaries[existingIdx] = payrollRecord;
      } else {
        salaries.push(payrollRecord);
      }
      calcCount++;
    });

    this.db.set("salaries", salaries);
    await this.triggerExcelAutoSave();
    this.renderSalariesPanel();
    window.Toast.show("success", "Payroll Computed", `Generated payslips for ${calcCount} staff accounts.`);
  }

  printPayslip(empId, month) {
    window.Utils.printPayslip(empId, month);
  }

  deleteSalaryRecord(empId, month) {
    if (confirm(`Remove salary record for ${empId} (${month})?`)) {
      const salaries = this.db.get("salaries");
      const filtered = salaries.filter(s => !(s.empId === empId && s.month === month));
      this.db.set("salaries", filtered);
      this.triggerExcelAutoSave();
      this.renderSalariesPanel();
      window.Toast.show("error", "Payslip Removed", "Deleted payroll sheet voucher.");
    }
  }

  // --- 8. RATIO ANALYTICS VIEW ---
  renderAnalyticsPanel() {
    const sales = this.db.get("sales");
    const repairs = this.db.get("repairs");
    const employees = this.db.get("employees");
    const attendance = this.db.get("attendance");
    
    // AI Forecasts
    const aiBanner = document.getElementById("analytics-ai-prediction-banner");
    if (aiBanner) {
      const pred = window.AI.predictSales(sales);
      if (pred.success) {
        aiBanner.innerHTML = `
          <h4>AI Business Advisor <span style="background: var(--accent-cyan);">${pred.growthRatePercent}% MoM Trend</span></h4>
          <p><strong>Forecast:</strong> ${pred.summary} Target month <strong>${pred.predictions[0].month}</strong> forecast: <strong>₹${pred.predictions[0].amount.toLocaleString('en-IN')}</strong>.</p>
        `;
      }
    }

    // --- RATIO COMPUTATIONS ---
    let salesRevTotal = 0;
    sales.forEach(s => salesRevTotal += (s.price * s.quantity));
    
    let repairRevTotal = 0;
    let completedCount = 0;
    repairs.forEach(r => {
      if (r.status === "Completed" || r.status === "Delivered") {
        repairRevTotal += r.estimatedCost;
        completedCount++;
      }
    });

    const totalRevenue = salesRevTotal + repairRevTotal;

    // A. Net Profit Margin Ratio
    // Expenses = Staff base salaries + estimated COGS (assumed 50% of retail product sales)
    let salaryExpenses = 0;
    employees.forEach(e => salaryExpenses += e.salary);
    const estimatedCOGS = salesRevTotal * 0.5;
    const totalExpenses = salaryExpenses + estimatedCOGS;
    const profitMargin = totalRevenue > 0 ? (((totalRevenue - totalExpenses) / totalRevenue) * 100) : 0;

    // B. Quick Liquidity Ratio
    // Liquidity = Current Assets (Cash + Inventory worth) / Current Liabilities (Salary due)
    const inventoryVal = window.DB.get("products").reduce((sum, p) => sum + (p.stock * p.price), 0);
    const quickAssets = totalRevenue + inventoryVal;
    const currentLiabilities = salaryExpenses > 0 ? salaryExpenses : 1; 
    const liquidityRatio = quickAssets / currentLiabilities;

    // C. Repairs Success Rate
    const repairRate = repairs.length > 0 ? ((completedCount / repairs.length) * 100) : 0;

    // D. Staff Attendance Rate
    const presents = attendance.filter(a => a.status === "Present" || a.status === "Half Day").length;
    const totalDaysLogged = attendance.length;
    const attendanceRate = totalDaysLogged > 0 ? ((presents / totalDaysLogged) * 100) : 0;

    // Update Ratio view components
    document.getElementById("ratio-profit-margin").textContent = (profitMargin > 0 ? "+" : "") + profitMargin.toFixed(1) + "%";
    document.getElementById("ratio-liquidity").textContent = liquidityRatio.toFixed(2) + "x";
    document.getElementById("ratio-repair-rate").textContent = Math.round(repairRate) + "%";
    document.getElementById("ratio-attendance").textContent = Math.round(attendanceRate) + "%";

    // Chart renders
    const monthlySales = {};
    const monthlyRepairs = {};
    
    sales.forEach(s => {
      const m = window.Utils.safeGetDateStr(s.date).substring(0, 7);
      monthlySales[m] = (monthlySales[m] || 0) + (s.price * s.quantity);
    });
    
    const currentMonthStr = new Date().toISOString().substring(0, 7);
    repairs.forEach(r => {
      if (r.status === "Completed" || r.status === "Delivered") {
        const m = window.Utils.safeGetDateStr(r.completionDate || currentMonthStr).substring(0, 7);
        monthlyRepairs[m] = (monthlyRepairs[m] || 0) + r.estimatedCost;
      }
    });

    const monthsUnion = Array.from(new Set([...Object.keys(monthlySales), ...Object.keys(monthlyRepairs)])).sort().slice(-4);
    const salesVals = monthsUnion.map(m => monthlySales[m] || 0);
    const repairVals = monthsUnion.map(m => monthlyRepairs[m] || 0);
    
    const combinedVals = salesVals.map((v, i) => Math.round((v + repairVals[i])/1000));
    const combinedLabels = monthsUnion.map(m => {
      const [y, mm] = m.split("-");
      return new Date(y, parseInt(mm)-1, 1).toLocaleString('default', { month: 'short' }) + " '26";
    });

    if (combinedVals.length > 0) {
      window.Charts.createBarChart("analytics-comparison-chart", combinedVals, combinedLabels);
    }

    const activityArray = Array.from({ length: 49 }, () => Math.floor(Math.random() * 5));
    window.Charts.createHeatmap("analytics-heatmap", activityArray);

    if (salesRevTotal > 0 || repairRevTotal > 0) {
      window.Charts.createDonutChart("analytics-income-donut", [salesRevTotal, repairRevTotal], ["Sales", "Repairs"]);
    }

    let pending = 0, progress = 0, closed = 0;
    repairs.forEach(r => {
      if (r.status === "Pending") pending++;
      else if (r.status === "In Progress") progress++;
      else closed++;
    });
    window.Charts.createDonutChart("analytics-repairs-donut", [pending, progress, closed], ["Pending", "In Progress", "Closed"]);
  }

  // --- 9. SETTINGS VIEW ---
  renderSettingsPanel() {
    const bizName = localStorage.getItem("a2a_set_biz_name") || "A2A Computers";
    const bizEmail = localStorage.getItem("a2a_set_biz_email") || "support@a2acomputers.com";
    const bizPhone = localStorage.getItem("a2a_set_biz_phone") || "+91 98765 43210";
    const bizAddress = localStorage.getItem("a2a_set_biz_address") || "Shop G-12, Cyber Heights, Sector 62, Noida, UP";

    document.getElementById("set-biz-name").value = bizName;
    document.getElementById("set-biz-email").value = bizEmail;
    document.getElementById("set-biz-phone").value = bizPhone;
    document.getElementById("set-biz-address").value = bizAddress;

    this.updateStorageSize();
  }

  updateStorageSize() {
    let totalBytes = 0;
    for (let x in localStorage) {
      if (localStorage.hasOwnProperty(x)) {
        totalBytes += (localStorage[x].length + x.length) * 2;
      }
    }
    const kb = (totalBytes / 1024).toFixed(2);
    const storageDisplay = document.getElementById("storage-kb");
    if (storageDisplay) storageDisplay.textContent = `${kb} KB`;
  }

  saveSettings() {
    const bizName = document.getElementById("set-biz-name").value;
    const bizEmail = document.getElementById("set-biz-email").value;
    const bizPhone = document.getElementById("set-biz-phone").value;
    const bizAddress = document.getElementById("set-biz-address").value;

    localStorage.setItem("a2a_set_biz_name", bizName);
    localStorage.setItem("a2a_set_biz_email", bizEmail);
    localStorage.setItem("a2a_set_biz_phone", bizPhone);
    localStorage.setItem("a2a_set_biz_address", bizAddress);

    this.updateStorageSize();
    window.SoundEngine.playSuccess();
    window.Toast.show("success", "Settings Saved", "Profile variables synchronized.");
  }

  factoryReset() {
    if (confirm("WARNING: Restore databases to factory defaults? All sales and employee logs will be overwritten.")) {
      this.db.reset();
      this.switchTab("overview");
      window.Toast.show("error", "Database Reset", "System files restored to seed defaults.");
    }
  }

  // Settings File Pickers for local Auto-Save Excel linkage
  async initializeExcelDatabase() {
    if (window.SoundEngine) window.SoundEngine.playClick();
    if (typeof window.showSaveFilePicker === "function" && window.location.protocol !== "file:") {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: "A2A_Computers_Database.xlsx",
          types: [{
            description: "Excel Spreadsheets",
            accept: { "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"] }
          }]
        });
        
        await window.FileSync.saveFileHandle(handle);
        this.excelHandle = handle;
        
        const granted = await window.FileSync.verifyPermission(handle, true);
        if (granted) {
          this.updateSyncBadge("active", "Excel Synced");
          await this.triggerExcelAutoSave();
          window.Toast.show("success", "Excel Linked", "Created & linked A2A_Computers_Database.xlsx.");
          return;
        }
      } catch (e) {
        console.warn("Save file picker fallback", e);
      }
    }
    // Universal Fallback for local files & unsupported browsers
    window.Utils.exportDatabaseToExcel();
  }

  async linkExcelDatabase() {
    if (window.SoundEngine) window.SoundEngine.playClick();
    if (typeof window.showOpenFilePicker === "function" && window.location.protocol !== "file:") {
      try {
        const [handle] = await window.showOpenFilePicker({
          types: [{
            description: "Excel Spreadsheets",
            accept: { "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"] }
          }]
        });

        await window.FileSync.saveFileHandle(handle);
        this.excelHandle = handle;

        const file = await handle.getFile();
        window.Utils.importDatabaseFromExcel(file, (success, msg) => {
          if (success) {
            this.updateSyncBadge("active", "Excel Synced");
            this.renderActivePanel();
            this.updateStorageSize();
            window.Toast.show("success", "Sync Successful", msg);
          } else {
            window.Toast.show("error", "Import Error", msg);
          }
        });
        return;
      } catch (e) {
        console.warn("Open file picker fallback", e);
      }
    }
    // Universal Fallback: Trigger local file input
    const fileInput = document.getElementById("db-excel-import-file");
    if (fileInput) fileInput.click();
  }

  // --- CRUD DATA HANDLERS ---
  populateSaleForm(id) {
    const products = this.db.get("products");
    const saleSelect = document.getElementById("sale-prod-select");
    saleSelect.innerHTML = products.map(p => `<option value="${p.id}">${p.name} (₹${p.price})</option>`).join("");

    const dateInput = document.getElementById("sale-date");
    dateInput.value = new Date().toISOString().substring(0, 10);

    if (id) {
      const sales = this.db.get("sales");
      const sale = sales.find(s => s.id === id);
      if (sale) {
        saleSelect.value = sale.productId;
        document.getElementById("sale-cust-name").value = sale.customerName;
        document.getElementById("sale-qty").value = sale.quantity;
        document.getElementById("sale-pay-method").value = sale.paymentMethod;
        dateInput.value = sale.date;
        document.getElementById("sale-warranty").value = sale.warrantyStatus;
      }
    } else {
      document.getElementById("sale-cust-name").value = "";
      document.getElementById("sale-qty").value = 1;
    }
  }

  async saveSaleRecord(e) {
    e.preventDefault();
    const id = document.getElementById("edit-sale-id").value;
    const productId = document.getElementById("sale-prod-select").value;
    const customerName = document.getElementById("sale-cust-name").value;
    const quantity = parseInt(document.getElementById("sale-qty").value);
    const paymentMethod = document.getElementById("sale-pay-method").value;
    const date = document.getElementById("sale-date").value;
    const warrantyStatus = document.getElementById("sale-warranty").value;

    const products = this.db.get("products");
    const targetProduct = products.find(p => p.id === productId);
    if (!targetProduct) return;

    if (!id) {
      if (targetProduct.stock < quantity) {
        window.Toast.show("error", "Catalog Alert", `Insufficient inventory stock for SKU ${productId}.`);
        return;
      }
      targetProduct.stock -= quantity;
      this.db.set("products", products);
    }

    const sales = this.db.get("sales");
    const record = {
      id: id || "S" + Math.floor(1000 + Math.random() * 9000),
      productId,
      productName: targetProduct.name,
      customerName,
      price: targetProduct.price,
      quantity,
      paymentMethod,
      date,
      warrantyStatus
    };

    if (id) {
      const idx = sales.findIndex(s => s.id === id);
      sales[idx] = record;
    } else {
      sales.push(record);
      if (targetProduct.stock <= targetProduct.minStock) {
        this.addNotification("warning", `Low stock alert: '${targetProduct.name}' has only ${targetProduct.stock} items left.`);
      }
    }

    this.db.set("sales", sales);
    await this.triggerExcelAutoSave();
    
    this.closeModal("modal-add-sale");
    this.renderActivePanel();
    window.Toast.show("success", "Sale Saved", `Sales entry logged: ${record.id}`);
  }

  // Products
  populateProductForm(id) {
    if (id) {
      const products = this.db.get("products");
      const p = products.find(prod => prod.id === id);
      if (p) {
        document.getElementById("prod-name").value = p.name;
        document.getElementById("prod-cat").value = p.category;
        document.getElementById("prod-price").value = p.price;
        document.getElementById("prod-stock").value = p.stock;
        document.getElementById("prod-min").value = p.minStock;
        document.getElementById("prod-supplier").value = p.supplier;
      }
    } else {
      document.getElementById("prod-name").value = "";
      document.getElementById("prod-price").value = "";
      document.getElementById("prod-stock").value = "";
      document.getElementById("prod-min").value = 5;
      document.getElementById("prod-supplier").value = "";
    }
  }

  async saveProductRecord(e) {
    e.preventDefault();
    const id = document.getElementById("edit-prod-id").value;
    const name = document.getElementById("prod-name").value;
    const category = document.getElementById("prod-cat").value;
    const price = parseFloat(document.getElementById("prod-price").value);
    const stock = parseInt(document.getElementById("prod-stock").value);
    const minStock = parseInt(document.getElementById("prod-min").value);
    const supplier = document.getElementById("prod-supplier").value;

    const products = this.db.get("products");
    const record = {
      id: id || "P" + Math.floor(100 + Math.random() * 900),
      name,
      category,
      price,
      stock,
      minStock,
      supplier
    };

    if (id) {
      const idx = products.findIndex(p => p.id === id);
      products[idx] = record;
    } else {
      products.push(record);
    }

    this.db.set("products", products);
    await this.triggerExcelAutoSave();

    this.closeModal("modal-add-prod");
    this.renderActivePanel();
    window.Toast.show("success", "Product Saved", `Catalog file SKU ${record.id} written.`);
  }

  // Repairs
  populateTicketForm(id) {
    if (id) {
      const repairs = this.db.get("repairs");
      const r = repairs.find(rep => rep.id === id);
      if (r) {
        document.getElementById("ticket-client").value = r.customerName;
        document.getElementById("ticket-dev").value = r.deviceType;
        document.getElementById("ticket-cost").value = r.estimatedCost;
        document.getElementById("ticket-tech").value = r.assignedTechnician;
        document.getElementById("ticket-status").value = r.status;
        document.getElementById("ticket-closed-date").value = r.completionDate;
        document.getElementById("ticket-log").value = r.diagnosticsLog;
      }
    } else {
      document.getElementById("ticket-client").value = "";
      document.getElementById("ticket-dev").value = "";
      document.getElementById("ticket-cost").value = "";
      document.getElementById("ticket-closed-date").value = "";
      document.getElementById("ticket-log").value = "";
    }
  }

  async saveTicketRecord(e) {
    e.preventDefault();
    const id = document.getElementById("edit-ticket-id").value;
    const customerName = document.getElementById("ticket-client").value;
    const deviceType = document.getElementById("ticket-dev").value;
    const estimatedCost = parseFloat(document.getElementById("ticket-cost").value);
    const assignedTechnician = document.getElementById("ticket-tech").value;
    const status = document.getElementById("ticket-status").value;
    const completionDate = document.getElementById("ticket-closed-date").value;
    const diagnosticsLog = document.getElementById("ticket-log").value;

    const repairs = this.db.get("repairs");
    const record = {
      id: id || "R" + Math.floor(1000 + Math.random() * 9000),
      customerName,
      deviceType,
      problemDescription: id ? (repairs.find(rep => rep.id === id).problemDescription) : diagnosticsLog.substring(0, 50),
      assignedTechnician,
      estimatedCost,
      status,
      completionDate,
      diagnosticsLog
    };

    if (id) {
      const idx = repairs.findIndex(r => r.id === id);
      repairs[idx] = record;
    } else {
      repairs.push(record);
    }

    this.db.set("repairs", repairs);
    await this.triggerExcelAutoSave();

    this.closeModal("modal-add-ticket");
    this.renderActivePanel();
    window.Toast.show("success", "Ticket Saved", `Repair order ticket ${record.id} logged.`);
  }

  // Employees
  populateEmployeeForm(id) {
    if (id) {
      const employees = this.db.get("employees");
      const e = employees.find(emp => emp.id === id);
      if (e) {
        document.getElementById("emp-name").value = e.name;
        document.getElementById("emp-pos").value = e.position;
        document.getElementById("emp-phone").value = e.phone;
        document.getElementById("emp-email").value = e.email;
        document.getElementById("emp-salary").value = e.salary;
        document.getElementById("emp-join").value = e.joiningDate;
      }
    } else {
      document.getElementById("emp-name").value = "";
      document.getElementById("emp-phone").value = "";
      document.getElementById("emp-email").value = "";
      document.getElementById("emp-salary").value = "";
      document.getElementById("emp-join").value = new Date().toISOString().substring(0, 10);
    }
  }

  async saveEmployeeRecord(e) {
    e.preventDefault();
    const id = document.getElementById("edit-emp-id").value;
    const name = document.getElementById("emp-name").value;
    const position = document.getElementById("emp-pos").value;
    const phone = document.getElementById("emp-phone").value;
    const email = document.getElementById("emp-email").value;
    const salary = parseFloat(document.getElementById("emp-salary").value);
    const joiningDate = document.getElementById("emp-join").value;

    const employees = this.db.get("employees");
    const record = {
      id: id || "EMP" + String(employees.length + 1).padStart(2, "0"),
      name,
      position,
      phone,
      email,
      salary,
      joiningDate
    };

    if (id) {
      const idx = employees.findIndex(emp => emp.id === id);
      employees[idx] = record;
    } else {
      employees.push(record);
    }

    this.db.set("employees", employees);
    await this.triggerExcelAutoSave();

    this.closeModal("modal-add-emp");
    this.renderActivePanel();
    window.Toast.show("success", "Staff Register Saved", `Employee file ID ${record.id} written.`);
  }

  // --- NOTIFICATION MANAGEMENT ---
  renderNotifications() {
    const list = this.db.get("notifications");
    const container = document.getElementById("notif-dropdown-list");
    const dot = document.getElementById("notif-dot");
    
    const unread = list.filter(n => !n.read);
    if (unread.length > 0) {
      if (dot) dot.style.display = "block";
    } else {
      if (dot) dot.style.display = "none";
    }

    if (container) {
      if (list.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding:15px; color:var(--text-muted); font-size:0.8rem;">No notifications.</div>`;
      } else {
        container.innerHTML = list.map(n => `
          <div class="notif-dropdown-item ${n.read ? '' : 'unread'}" onclick="app.markNotifRead(${n.id})">
            <div style="font-weight:600; display:flex; justify-content:space-between;">
              <span>${n.type.toUpperCase()}</span>
              <span style="font-size:0.7rem; color:var(--text-muted);">${n.time}</span>
            </div>
            <div style="margin-top:2px; font-size:0.75rem; color:var(--text-secondary);">${n.message}</div>
          </div>
        `).join("");
      }
    }
  }

  addNotification(type, message) {
    const list = this.db.get("notifications");
    const record = {
      id: Date.now(),
      type,
      message,
      time: "Just now",
      read: false
    };
    list.unshift(record);
    this.db.set("notifications", list.slice(0, 15));
    this.renderNotifications();
  }

  markNotifRead(id) {
    const list = this.db.get("notifications");
    const idx = list.findIndex(n => n.id === id);
    if (idx >= 0) {
      list[idx].read = true;
      this.db.set("notifications", list);
      this.renderNotifications();
    }
  }

  clearAllNotifications() {
    const list = this.db.get("notifications");
    list.forEach(n => n.read = true);
    this.db.set("notifications", list);
    this.renderNotifications();
  }

  // --- EXCEL DRAG & DROP ZONE SYNC ---
  setupExcelDropZone() {
    const zone = document.getElementById("excel-drop-zone");
    const fileInput = document.getElementById("db-excel-import-file");
    
    if (!zone || !fileInput) return;

    zone.addEventListener("dragover", (e) => {
      e.preventDefault();
      zone.classList.add("hover");
    });

    zone.addEventListener("dragleave", () => zone.classList.remove("hover"));

    zone.addEventListener("drop", (e) => {
      e.preventDefault();
      zone.classList.remove("hover");
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        this.processExcelUpload(files[0]);
      }
    });
  }

  handleSettingsExcelUpload(input) {
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      if (window.SoundEngine) window.SoundEngine.playClick();
      window.Utils.importDatabaseFromExcel(file, (success, message) => {
        if (success) {
          this.renderActivePanel();
          this.updateStorageSize();
          window.Toast.show("success", "Excel Synced", message);
        } else {
          window.Toast.show("error", "Sync Error", message);
        }
      });
      input.value = "";
    }
  }

  processExcelUpload(file) {
    window.Utils.importDatabaseFromExcel(file, (success, message) => {
      if (success) {
        this.addNotification("success", "Excel Import successful.");
        this.renderActivePanel();
        this.updateStorageSize();
        window.Toast.show("success", "Database Restored", message);
      } else {
        window.Toast.show("error", "Database Sync Failed", "Invalid workbook format: " + message);
      }
    });
  }

  handleHeaderExcelUpload(input) {
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      if (window.SoundEngine) window.SoundEngine.playClick();
      window.Utils.importDatabaseFromExcel(file, (success, message) => {
        if (success) {
          this.renderActivePanel();
          this.updateStorageSize();
          window.Toast.show("success", "Excel Synced", message);
        } else {
          window.Toast.show("error", "Excel Sync Error", message);
        }
      });
      input.value = "";
    }
  }

  // --- BIND EVENT HANDLERS ---
  bindEvents() {
    // 1. Theme Toggle
    document.getElementById("theme-toggle-btn").addEventListener("click", () => this.toggleTheme());
    
    // 2. Notification dropdown
    const bell = document.getElementById("notif-bell-btn");
    const drop = document.getElementById("notif-dropdown");
    bell.addEventListener("click", (e) => {
      e.stopPropagation();
      window.SoundEngine.playClick();
      drop.classList.toggle("active");
    });
    document.addEventListener("click", () => drop.classList.remove("active"));
    document.getElementById("clear-notifs-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      this.clearAllNotifications();
    });

    // 3. Audio settings toggle
    const soundCheckbox = document.getElementById("set-sound-toggle");
    if (soundCheckbox) {
      soundCheckbox.addEventListener("change", (e) => {
        window.SoundEngine.enabled = e.target.checked;
        localStorage.setItem("a2a_sound_enabled", String(e.target.checked));
        if (e.target.checked) window.SoundEngine.playClick();
      });
    }

    // 4. Excel header badge auth trigger
    const syncBadge = document.getElementById("header-sync-badge");
    if (syncBadge) {
      syncBadge.addEventListener("click", () => this.handleSyncBadgeClick());
    }

    // 5. Auth form panels
    document.getElementById("login-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const u = document.getElementById("login-username").value;
      const p = document.getElementById("login-password").value;
      if (!this.login(u, p)) {
        window.SoundEngine.playError();
      }
    });

    // POS Profile Select code entry submissions
    document.getElementById("profile-login-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const u = document.getElementById("profile-login-username").value;
      const p = document.getElementById("profile-login-password").value;
      if (this.login(u, p)) {
        document.getElementById("profile-login-password").value = "";
        document.getElementById("profile-password-box").style.display = "none";
      } else {
        window.SoundEngine.playError();
      }
    });

    document.getElementById("back-profiles-btn").addEventListener("click", () => this.resetProfileSelect());
    
    document.getElementById("use-standard-login").addEventListener("click", (e) => {
      e.preventDefault();
      window.SoundEngine.playClick();
      document.getElementById("auth-profile-view").style.display = "none";
      document.getElementById("auth-login-view").style.display = "block";
    });

    document.getElementById("back-profiles-btn-standard").addEventListener("click", (e) => {
      e.preventDefault();
      window.SoundEngine.playClick();
      document.getElementById("auth-login-view").style.display = "none";
      document.getElementById("auth-profile-view").style.display = "block";
    });

    document.getElementById("go-register").addEventListener("click", (e) => {
      e.preventDefault();
      window.SoundEngine.playClick();
      document.getElementById("auth-login-view").style.display = "none";
      document.getElementById("auth-register-view").style.display = "block";
    });
    document.getElementById("go-login").addEventListener("click", (e) => {
      e.preventDefault();
      window.SoundEngine.playClick();
      document.getElementById("auth-register-view").style.display = "none";
      document.getElementById("auth-login-view").style.display = "block";
    });
    document.getElementById("go-forgot").addEventListener("click", (e) => {
      e.preventDefault();
      window.SoundEngine.playClick();
      document.getElementById("auth-login-view").style.display = "none";
      document.getElementById("auth-forgot-view").style.display = "block";
    });
    document.getElementById("back-login").addEventListener("click", (e) => {
      e.preventDefault();
      window.SoundEngine.playClick();
      document.getElementById("auth-forgot-view").style.display = "none";
      document.getElementById("auth-login-view").style.display = "block";
    });

    document.getElementById("register-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const name = document.getElementById("reg-name").value;
      const email = document.getElementById("reg-email").value;
      const role = document.getElementById("reg-role").value;
      
      this.currentUser = { name, role };
      localStorage.setItem("a2a_current_user", JSON.stringify(this.currentUser));
      
      const employees = this.db.get("employees");
      employees.push({
        id: "EMP" + String(employees.length + 1).padStart(2, "0"),
        name,
        position: role,
        phone: "+91 99999 99999",
        email,
        salary: 40000,
        joiningDate: new Date().toISOString().substring(0, 10)
      });
      this.db.set("employees", employees);
      this.triggerExcelAutoSave();

      this.checkAuth();
      this.renderActivePanel();
      window.Toast.show("success", "Profile Registered", "New employee login credentials initialized.");
    });

    document.getElementById("forgot-form").addEventListener("submit", (e) => {
      e.preventDefault();
      window.Toast.show("success", "Email Transmitted", "Password reset instructions sent.");
      document.getElementById("auth-forgot-view").style.display = "none";
      document.getElementById("auth-login-view").style.display = "block";
    });

    document.getElementById("logout-btn").addEventListener("click", () => this.logout());

    const empLogoutBtn = document.getElementById("employee-logout-btn");
    if (empLogoutBtn) {
      empLogoutBtn.addEventListener("click", () => {
        window.SoundEngine.playClick();
        this.logout();
      });
    }

    // Navigation hashes
    const menuItems = document.querySelectorAll(".menu-item");
    menuItems.forEach(item => {
      item.addEventListener("click", () => {
        const target = item.getAttribute("data-target");
        window.location.hash = `#${target}`;
      });
    });

    // POS Sub-Tabs bindings
    document.getElementById("subtab-pos-btn").addEventListener("click", () => {
      this.salesSubTab = "pos";
      this.renderSalesPanel();
    });
    document.getElementById("subtab-ledger-btn").addEventListener("click", () => {
      this.salesSubTab = "ledger";
      this.renderSalesPanel();
    });

    // POS Product filters
    document.getElementById("pos-search-input").addEventListener("input", () => this.renderPOSCatalog());
    document.getElementById("pos-cat-filter").addEventListener("change", () => this.renderPOSCatalog());
    
    // POS Cart control inputs
    document.getElementById("pos-clear-cart").addEventListener("click", () => {
      this.cart = [];
      window.SoundEngine.playClick();
      this.renderPOSCart();
    });
    document.getElementById("pos-discount").addEventListener("change", () => this.renderPOSCart());
    document.getElementById("pos-checkout-btn").addEventListener("click", () => this.runPOSCheckout());

    // Repairs Sub-Tabs bindings
    document.getElementById("subtab-kanban-btn").addEventListener("click", () => {
      this.repairsSubTab = "kanban";
      this.renderRepairsPanel();
    });
    document.getElementById("subtab-repairs-ledger-btn").addEventListener("click", () => {
      this.repairsSubTab = "ledger";
      this.renderRepairsPanel();
    });

    // Modal opens
    document.getElementById("open-add-sale-btn").addEventListener("click", () => this.openModal("modal-add-sale", "add"));
    document.getElementById("open-add-prod-btn").addEventListener("click", () => this.openModal("modal-add-prod", "add"));
    document.getElementById("open-add-ticket-btn").addEventListener("click", () => this.openModal("modal-add-ticket", "add"));
    document.getElementById("open-add-emp-btn").addEventListener("click", () => this.openModal("modal-add-emp", "add"));

    // Modal submissions
    document.getElementById("add-sale-form").addEventListener("submit", (e) => this.saveSaleRecord(e));
    document.getElementById("add-prod-form").addEventListener("submit", (e) => this.saveProductRecord(e));
    document.getElementById("add-ticket-form").addEventListener("submit", (e) => this.saveTicketRecord(e));
    document.getElementById("add-emp-form").addEventListener("submit", (e) => this.saveEmployeeRecord(e));

    // Live search filters
    document.getElementById("sales-search-input").addEventListener("input", () => this.renderSalesLedgerTable());
    document.getElementById("sales-filter-method").addEventListener("change", () => this.renderSalesLedgerTable());
    document.getElementById("inventory-search-input").addEventListener("input", () => this.renderInventoryPanel());
    document.getElementById("inventory-filter-cat").addEventListener("change", () => this.renderInventoryPanel());
    document.getElementById("repairs-search-input").addEventListener("input", () => this.renderRepairsTable());
    document.getElementById("repairs-filter-status").addEventListener("change", () => this.renderRepairsTable());
    document.getElementById("employees-search-input").addEventListener("input", () => this.renderEmployeesPanel());
    document.getElementById("employees-filter-role").addEventListener("change", () => this.renderEmployeesPanel());

    // AI Diagnostician
    document.getElementById("run-ai-diag-btn").addEventListener("click", () => this.runAIDiagnostics());

    // Attendance
    document.getElementById("clock-in-btn").addEventListener("click", () => this.clockIn());
    document.getElementById("clock-out-btn").addEventListener("click", () => this.clockOut());
    document.getElementById("attendance-log-date").addEventListener("change", () => this.renderAttendancePanel());
    document.getElementById("attendance-log-today-btn").addEventListener("click", () => {
      window.SoundEngine.playClick();
      document.getElementById("attendance-log-date").value = new Date().toISOString().substring(0, 10);
      this.renderAttendancePanel();
    });

    // Salaries/Payroll
    document.getElementById("run-payroll-btn").addEventListener("click", () => this.runPayrollCalculation());

    // Settings actions
    document.getElementById("save-settings-btn").addEventListener("click", () => this.saveSettings());
    document.getElementById("factory-reset-btn").addEventListener("click", () => this.factoryReset());
    document.getElementById("seed-backup-btn").addEventListener("click", () => {
      window.SoundEngine.playClick();
      console.log("A2A COMPUTERS LOCAL STORAGE SNAPSHOT:");
      console.log(localStorage);
      window.Toast.show("info", "Database Snapshot", "System database printed to developer console.");
    });

    // In-place Excel Sync trigger buttons in Settings
    document.getElementById("db-excel-init-btn").addEventListener("click", () => this.initializeExcelDatabase());
    document.getElementById("db-excel-link-btn").addEventListener("click", () => this.linkExcelDatabase());
    document.getElementById("db-excel-export-btn").addEventListener("click", () => window.Utils.exportDatabaseToExcel());

    // CSV fallback exports
    document.getElementById("export-sales-csv").addEventListener("click", () => {
      const sales = this.db.get("sales");
      const headers = ["Invoice ID", "Product ID", "Product Name", "Customer Name", "Price", "Quantity", "Payment Method", "Date", "Warranty Status"];
      const rows = sales.map(s => [s.id, s.productId, s.productName, s.customerName, s.price, s.quantity, s.paymentMethod, s.date, s.warrantyStatus]);
      window.Utils.exportToCSV("Sales_Report.csv", headers, rows);
      window.Toast.show("success", "Export Finished", "CSV copy saved to downloads.");
    });

    document.getElementById("export-inventory-csv").addEventListener("click", () => {
      const products = this.db.get("products");
      const headers = ["SKU", "Product Name", "Category", "Price", "Stock", "Min Stock", "Supplier"];
      const rows = products.map(p => [p.id, p.name, p.category, p.price, p.stock, p.minStock, p.supplier]);
      window.Utils.exportToCSV("Inventory_Report.csv", headers, rows);
      window.Toast.show("success", "Export Finished", "CSV copy saved to downloads.");
    });

    document.getElementById("export-salaries-csv").addEventListener("click", () => {
      const salaries = this.db.get("salaries");
      const headers = ["Month", "Employee ID", "Base Salary", "Bonus", "Deductions", "Net Salary", "Status", "Payout Date"];
      const rows = salaries.map(s => [s.month, s.empId, s.baseSalary, s.bonus, s.deduction, s.finalSalary, s.status, s.payoutDate]);
      window.Utils.exportToCSV("Payroll_Statement.csv", headers, rows);
      window.Toast.show("success", "Export Finished", "CSV copy saved to downloads.");
    });

    document.getElementById("db-excel-export-btn").addEventListener("click", () => {
      window.Utils.exportDatabaseToExcel();
    });

    this.setupExcelDropZone();
  }
}

// Initialise App
const app = new App();
window.app = app;

if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", () => app.init());
} else {
  app.init();
}
