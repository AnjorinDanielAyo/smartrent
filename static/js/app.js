/* ════════════════════════════════════════
   SmartRent — app.js  (Flask edition)
   All data now persists via SQLite API
════════════════════════════════════════ */

// ── STATE ──
const state = {
  currentUser: null,
  pendingModalItemId: null,
  pendingModalItemPrice: 0,
};

// ════════════════════════════════════════
// API HELPER
// ════════════════════════════════════════
function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function api(path, method, body) {
  method = method || "GET";
  const opts = {
    method,
    credentials: "same-origin",
  };
  if (body) {
    if (body instanceof FormData) {
      opts.body = body;
    } else {
      opts.headers = { "Content-Type": "application/json" };
      opts.body = JSON.stringify(body);
    }
  }
  const res = await fetch(path, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}

// ════════════════════════════════════════
// NAVIGATION
// ════════════════════════════════════════
function scrollToSection(id) {
  showPage("landing");
  setTimeout(() => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  }, 50);
}

// ── Mobile landing nav drawer ──
function toggleMobileNav() {
  const drawer = document.getElementById("mobile-nav-drawer");
  const overlay = document.getElementById("mobile-nav-overlay");
  const isOpen = drawer.classList.contains("open");
  if (isOpen) {
    drawer.classList.remove("open");
    overlay.classList.remove("open");
    document.body.style.overflow = "";
  } else {
    drawer.classList.add("open");
    overlay.classList.add("open");
    document.body.style.overflow = "hidden";
  }
}
function closeMobileNav() {
  document.getElementById("mobile-nav-drawer").classList.remove("open");
  document.getElementById("mobile-nav-overlay").classList.remove("open");
  document.body.style.overflow = "";
}

// ── Smart Homepage Routing ──
function handleHomeAction(role) {
  if (state.currentUser) {
    // If the user is already logged in, route them directly to the app
    if (role === "rentee") {
      if (state.currentUser.roles === "renter") {
        showToast(
          "Your account is currently renter-only. Update your profile to enable listing.",
          "error",
        );
        showPage("renter");
        showPanel("renter", "profile");
      } else {
        showPage("rentee");
      }
    } else {
      showPage("renter");
    }
  } else {
    // Not logged in: go to register and pre-select the role they clicked
    showPage("auth", "register");
    selectRole(role);
  }
}

// ── Dashboard sidebar slide-in (mobile) ──
function openSidebar(sidebarId) {
  const sidebar = document.getElementById(sidebarId);
  const overlayId = sidebarId + "-overlay";
  const overlay = document.getElementById(overlayId);
  if (sidebar) sidebar.classList.add("open");
  if (overlay) overlay.classList.add("open");
  document.body.style.overflow = "hidden";
}
function closeSidebar(sidebarId) {
  const sidebar = document.getElementById(sidebarId);
  const overlayId = sidebarId + "-overlay";
  const overlay = document.getElementById(overlayId);
  if (sidebar) sidebar.classList.remove("open");
  if (overlay) overlay.classList.remove("open");
  document.body.style.overflow = "";
}

// ── Mobile bottom nav active state ──
function setBottomNav(dash, panel) {
  document
    .querySelectorAll("#page-" + dash + " .mobile-bottom-link")
    .forEach(function (link) {
      link.classList.remove("active");
    });
  const target = document.getElementById(dash + "-bn-" + panel);
  if (target) target.classList.add("active");
}

function togglePasswordVisibility(inputId, iconEl) {
  const input = document.getElementById(inputId);
  if (!input) return;
  if (input.type === "password") {
    input.type = "text";
    iconEl.className = "icon-eye-off";
  } else {
    input.type = "password";
    iconEl.className = "icon-eye";
  }
}

function togglePw(inputId, btnEl) {
  // Corrected toggle pointer reference!
  const icon = btnEl.querySelector("i") || btnEl;
  togglePasswordVisibility(inputId, icon);
}

async function withLoading(btn, fn) {
  if (!btn) return await fn();
  const original = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<i class="icon-loader animate-spin" style="display:inline-block"></i> Processing...`;
  try {
    return await fn();
  } finally {
    btn.disabled = false;
    btn.innerHTML = original;
  }
}
function showPage(page, tab) {
  document
    .querySelectorAll(".page")
    .forEach((p) => p.classList.remove("active"));
  document.getElementById("page-" + page).classList.add("active");
  window.scrollTo(0, 0);
  if (page === "auth" && tab) switchTab(tab);
  if (page === "renter") initRenterDash();
  if (page === "rentee") initRenteeDash();
}

function showPanel(dash, panel) {
  document
    .querySelectorAll("#page-" + dash + " .dash-panel")
    .forEach((p) => p.classList.remove("active"));
  document
    .querySelectorAll("#page-" + dash + " .sidebar-link")
    .forEach((l) => l.classList.remove("active"));

  const panelEl = document.getElementById(dash + "-" + panel);
  if (panelEl) panelEl.classList.add("active");

  document
    .querySelectorAll("#page-" + dash + " .sidebar-link")
    .forEach(function (link) {
      if (
        link.getAttribute("onclick") &&
        link.getAttribute("onclick").includes("'" + panel + "'")
      ) {
        link.classList.add("active");
      }
    });

  const titles = {
    browse: "Browse items",
    categories: "Categories",
    "my-rentals": "My rentals",
    history: "Rental history",
    overview: "Overview",
    "my-listings": "My listings",
    requests: "Rental requests",
    "add-listing": "Add new listing",
    profile: "Profile",
  };
  const titleEl = document.getElementById(dash + "-panel-title");
  if (titleEl) titleEl.textContent = titles[panel] || panel;

  if (dash === "renter") {
    if (panel === "browse") renderBrowse();
    if (panel === "my-rentals") renderMyRentals();
    if (panel === "history") renderHistory();
    if (panel === "profile") renderProfile("renter");
  }
  if (dash === "rentee") {
    if (panel === "overview") renderOwnerOverview();
    if (panel === "my-listings") renderMyListings();
    if (panel === "requests") renderRequests();
    if (panel === "profile") renderProfile("rentee");
  }
}

// ════════════════════════════════════════
// AUTH
// ════════════════════════════════════════
function switchTab(tab) {
  document.getElementById("form-login").style.display =
    tab === "login" ? "block" : "none";
  document.getElementById("form-register").style.display =
    tab === "register" ? "block" : "none";
  document
    .getElementById("tab-login")
    .classList.toggle("active", tab === "login");
  document
    .getElementById("tab-register")
    .classList.toggle("active", tab === "register");
}

let selectedRole = "renter";
function selectRole(r) {
  selectedRole = r;
  document
    .getElementById("role-renter")
    .classList.toggle("selected", r === "renter");
  document
    .getElementById("role-rentee")
    .classList.toggle("selected", r === "rentee");
}

async function handleLogin() {
  const email = document.getElementById("login-email").value.trim();
  const pass = document.getElementById("login-password").value;
  const errEl = document.getElementById("login-error");
  const btn = document.querySelector("#form-login .btn-primary");
  await withLoading(btn, async () => {
    try {
      const data = await api("/api/login", "POST", { email, password: pass });
      errEl.style.display = "none";
      loginUser(data.user);
    } catch (e) {
      document.getElementById("login-error-text").textContent = e.message;
      errEl.style.display = "flex";
    }
  });
}

async function handleRegister() {
  const fname = document.getElementById("reg-fname").value.trim();
  const lname = document.getElementById("reg-lname").value.trim();
  const email = document.getElementById("reg-email").value.trim();
  const pass = document.getElementById("reg-password").value;
  const confirmPass = document.getElementById("reg-confirm-password").value;
  const isDual = document.getElementById("dual-role-check").checked;
  const roles = isDual ? "both" : selectedRole;
  const errEl = document.getElementById("reg-error");

  if (pass !== confirmPass) {
    document.getElementById("reg-error-text").textContent =
      "Passwords do not match.";
    errEl.style.display = "flex";
    return;
  }
  if (pass.length < 8 || !/[A-Za-z]/.test(pass) || !/\d/.test(pass)) {
    document.getElementById("reg-error-text").textContent =
      "Password must be at least 8 characters and contain both letters and numbers.";
    errEl.style.display = "flex";
    return;
  }

  const btn = document.querySelector("#form-register .btn-primary");
  await withLoading(btn, async () => {
    try {
      const data = await api("/api/register", "POST", {
        fname,
        lname,
        email,
        password: pass,
        roles,
      });
      errEl.style.display = "none";
      loginUser(data.user);
    } catch (e) {
      document.getElementById("reg-error-text").textContent = e.message;
      errEl.style.display = "flex";
    }
  });
}

async function demoLogin(type) {
  const map = { renter: "fatima@demo.com", rentee: "chisom@demo.com" };
  const email = map[type];
  document.getElementById("login-email").value = email;
  document.getElementById("login-password").value = "demo123";
  await handleLogin();
}

function loginUser(user) {
  state.currentUser = user;
  if (user.roles === "rentee" || user.roles === "both") {
    showPage("rentee");
  } else {
    showPage("renter");
  }
  showToast("Welcome back, " + user.fname + "!", "success");
}

async function confirmLogout() {
  if (!confirm("Sign out of SmartRent?")) return;
  await api("/api/logout", "POST");
  state.currentUser = null;
  showPage("landing");
}

// ════════════════════════════════════════
// RENTER DASHBOARD
// ════════════════════════════════════════
function initRenterDash() {
  const u = state.currentUser;
  if (!u) return;
  document.getElementById("renter-name-sidebar").textContent =
    u.fname + " " + u.lname;
  document.getElementById("renter-avatar-sidebar").textContent = u.avatar;
  const sw = document.getElementById("renter-role-switch");
  if (sw) sw.style.display = u.roles === "both" ? "block" : "none";
  showPanel("renter", "browse");
}

function selectCategory(cat) {
  const select = document.getElementById("browse-cat");
  if (select) select.value = cat;
  showPanel("renter", "browse");
  filterItems();
}

async function renderBrowse() {
  const q = (document.getElementById("browse-search") || {}).value || "";
  const cat = (document.getElementById("browse-cat") || {}).value || "";
  const avail = (document.getElementById("browse-avail") || {}).value || "";
  const grid = document.getElementById("browse-grid");
  const empty = document.getElementById("browse-empty");
  if (!grid) return;

  grid.innerHTML =
    '<div style="color:var(--text-muted);padding:40px;text-align:center"><i class="icon-loader" style="font-size:24px"></i></div>';

  try {
    let url = "/api/listings?";
    if (q) url += "search=" + encodeURIComponent(q) + "&";
    if (cat) url += "category=" + encodeURIComponent(cat) + "&";
    if (avail) url += "status=" + encodeURIComponent(avail.toLowerCase()) + "&";

    const data = await api(url);
    const items = data.listings;

    if (items.length === 0) {
      grid.innerHTML = "";
      grid.style.display = "none";
      empty.style.display = "flex";
      return;
    }
    grid.style.display = "grid";
    empty.style.display = "none";
    grid.innerHTML = items
      .map(function (item) {
        const avBadge =
          item.status === "available"
            ? '<span class="availability-badge badge-available"><i class="icon-circle" style="font-size:8px"></i> Available</span>'
            : '<span class="availability-badge badge-rented"><i class="icon-circle" style="font-size:8px"></i> Rented</span>';
        const imgHtml = item.img_url
          ? '<img src="' +
            escapeHtml(item.img_url) +
            '" alt="' +
            escapeHtml(item.title) +
            "\" loading=\"lazy\" onerror=\"this.parentElement.innerHTML='<div class=\\'no-img\\'><i class=\\'icon-image-off\\'></i></div>'\" />"
          : '<div class="no-img"><i class="icon-image-off"></i></div>';
        const actionBtn =
          item.status === "available"
            ? '<button class="btn btn-primary btn-sm w-full" style="margin-top:12px" onclick="openRentModal(' +
              item.id +
              ", " +
              item.price +
              ", '" +
              item.title.replace(/'/g, "\\'") +
              '\')"><i class="icon-calendar-plus" style="font-size:14px"></i> Request rental</button>'
            : '<button class="btn btn-ghost btn-sm w-full" style="margin-top:12px;opacity:.5;cursor:not-allowed" disabled>Currently unavailable</button>';
        return [
          '<div class="item-card">',
          '<div class="item-card-img">' + imgHtml + "</div>",
          '<div class="item-card-body">',
          '<div class="item-cat-tag"><i class="icon-tag" style="font-size:11px"></i>' +
            escapeHtml(item.category) +
            "</div>",
          '<div class="item-card-title">' + escapeHtml(item.title) + "</div>",
          '<div class="item-card-desc">' +
            escapeHtml(item.description) +
            "</div>",
          '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">',
          '<div class="item-price">₦' +
            Number(item.price).toLocaleString() +
            "<span>/day</span></div>",
          avBadge,
          "</div>",
          '<div class="item-meta">',
          '<span><i class="icon-map-pin"></i> ' +
            escapeHtml(item.location) +
            "</span>",
          '<span><i class="icon-user"></i> ' +
            escapeHtml(item.owner_name || "") +
            "</span>",
          "</div>",
          actionBtn,
          "</div>",
          "</div>",
        ].join("");
      })
      .join("");
  } catch (e) {
    grid.innerHTML =
      '<div class="empty-state"><i class="icon-wifi-off"></i><h3>Could not load items</h3><p>' +
      e.message +
      "</p></div>";
  }
}

function filterItems() {
  renderBrowse();
}
function clearBrowseFilters() {
  document.getElementById("browse-search").value = "";
  document.getElementById("browse-cat").value = "";
  document.getElementById("browse-avail").value = "";
  renderBrowse();
}

async function renderMyRentals() {
  const el = document.getElementById("my-rentals-content");
  if (!el) return;
  try {
    const data = await api("/api/my-requests");
    const reqs = data.requests.filter((r) =>
      ["pending", "approved"].includes(r.status),
    );
    if (reqs.length === 0) {
      el.innerHTML =
        '<div class="empty-state"><i class="icon-calendar-x"></i><h3>No active rentals</h3><p>Your approved and pending rental requests will appear here.</p><button class="btn btn-primary btn-sm" onclick="showPanel(\'renter\',\'browse\')"><i class="icon-search" style="font-size:14px"></i> Browse items</button></div>';
      return;
    }
    const rows = reqs
      .map(function (r) {
        const days = Math.max(
          1,
          Math.ceil((new Date(r.end_date) - new Date(r.start_date)) / 86400000),
        );
        const cost = r.item_price * days;
        const badge =
          r.status === "approved" ? "badge-success" : "badge-warning";
        return (
          "<tr><td><strong>" +
          escapeHtml(r.item_title) +
          '</strong></td><td style="color:var(--text-darker);font-size:13px">' +
          escapeHtml(r.start_date) +
          " — " +
          escapeHtml(r.end_date) +
          '</td><td><span class="badge ' +
          badge +
          '">' +
          escapeHtml(r.status) +
          '</span></td><td style="font-weight:600;color:var(--primary)">₦' +
          cost.toLocaleString() +
          "</td></tr>"
        );
      })
      .join("");
    el.innerHTML =
      '<div class="table-wrap"><table><thead><tr><th>Item</th><th>Dates</th><th>Status</th><th>Est. Cost</th></tr></thead><tbody>' +
      rows +
      "</tbody></table></div>";
  } catch (e) {
    el.innerHTML =
      '<div class="empty-state"><i class="icon-alert-circle"></i><h3>Error</h3><p>' +
      e.message +
      "</p></div>";
  }
}

async function renderHistory() {
  const el = document.getElementById("history-content");
  if (!el) return;
  try {
    const data = await api("/api/my-requests");
    const hist = data.requests.filter((r) =>
      ["completed", "cancelled", "declined"].includes(r.status),
    );
    if (hist.length === 0) {
      el.innerHTML =
        '<div class="empty-state"><i class="icon-clock"></i><h3>No rental history yet</h3><p>Completed and cancelled rentals will show up here.</p></div>';
      return;
    }
    const badgeMap = {
      completed: "badge-success",
      cancelled: "badge-neutral",
      declined: "badge-danger",
    };
    const rows = hist
      .map(
        (r) =>
          "<tr><td><strong>" +
          escapeHtml(r.item_title) +
          '</strong></td><td style="color:var(--text-darker);font-size:13px">' +
          escapeHtml(r.start_date) +
          " — " +
          escapeHtml(r.end_date) +
          '</td><td><span class="badge ' +
          (badgeMap[r.status] || "badge-neutral") +
          '">' +
          escapeHtml(r.status) +
          "</span></td></tr>",
      )
      .join("");
    el.innerHTML =
      '<div class="table-wrap"><table><thead><tr><th>Item</th><th>Dates</th><th>Status</th></tr></thead><tbody>' +
      rows +
      "</tbody></table></div>";
  } catch (e) {
    el.innerHTML =
      '<div class="empty-state"><i class="icon-alert-circle"></i><h3>Error</h3><p>' +
      e.message +
      "</p></div>";
  }
}

// ════════════════════════════════════════
// OWNER DASHBOARD
// ════════════════════════════════════════
function initRenteeDash() {
  const u = state.currentUser;
  if (!u) return;
  document.getElementById("rentee-name-sidebar").textContent =
    u.fname + " " + u.lname;
  document.getElementById("rentee-avatar-sidebar").textContent = u.avatar;
  const sw = document.getElementById("rentee-role-switch");
  if (sw) sw.style.display = u.roles === "both" ? "block" : "none";
  showPanel("rentee", "overview");
  updateReqBadge();
}

async function renderOwnerOverview() {
  const u = state.currentUser;
  if (!u) return;
  document.getElementById("rentee-welcome").textContent =
    "Welcome back, " + u.fname;
  try {
    const [listData, reqData] = await Promise.all([
      api("/api/my-listings"),
      api("/api/incoming-requests"),
    ]);
    const listings = listData.listings;
    const reqs = reqData.requests;
    const pending = reqs.filter((r) => r.status === "pending").length;
    const active = reqs.filter((r) => r.status === "approved").length;
    const earnings = listings
      .filter((l) => l.status === "rented")
      .reduce((s, l) => s + l.price * 7, 0);

    document.getElementById("stat-listings").textContent = listings.length;
    document.getElementById("stat-pending").textContent = pending;
    document.getElementById("stat-pending-label").innerHTML =
      pending > 0
        ? '<span class="change-up">Needs your attention</span>'
        : '<span class="text-muted">No new requests</span>';
    document.getElementById("stat-active").textContent = active;
    document.getElementById("stat-earnings").textContent =
      "₦" + earnings.toLocaleString();
    document.getElementById("stat-earnings-label").textContent =
      earnings > 0 ? "From active rentals" : "Start listing to earn";

    const overviewEl = document.getElementById("rentee-overview-listings");
    if (!overviewEl) return;
    if (listings.length === 0) {
      overviewEl.innerHTML =
        '<div class="empty-state"><i class="icon-package-plus"></i><h3>No listings yet</h3><p>Add your first item to start earning rental income.</p><button class="btn btn-primary btn-sm" onclick="showPanel(\'rentee\',\'add-listing\')"><i class="icon-plus" style="font-size:14px"></i> Add your first listing</button></div>';
    } else {
      const rows = listings
        .slice(0, 5)
        .map(
          (l) =>
            "<tr><td><strong>" +
            escapeHtml(l.title) +
            '</strong></td><td style="color:var(--text-darker);font-size:13px">' +
            escapeHtml(l.category) +
            '</td><td style="color:var(--primary);font-weight:600">₦' +
            Number(l.price).toLocaleString() +
            '</td><td><span class="badge ' +
            (l.status === "available" ? "badge-success" : "badge-warning") +
            '">' +
            escapeHtml(l.status) +
            "</span></td></tr>",
        )
        .join("");
      overviewEl.innerHTML =
        '<div class="table-wrap"><div class="table-header"><h3>Recent listings</h3><a style="font-size:13px;color:var(--primary);cursor:pointer" onclick="showPanel(\'rentee\',\'my-listings\')">View all</a></div><table><thead><tr><th>Item</th><th>Category</th><th>Rate/day</th><th>Status</th></tr></thead><tbody>' +
        rows +
        "</tbody></table></div>";
    }
  } catch (e) {
    showToast(e.message, "error");
  }
  updateReqBadge();
}

async function renderMyListings() {
  const el = document.getElementById("my-listings-grid");
  if (!el) return;
  try {
    const data = await api("/api/my-listings");
    const listings = data.listings;
    if (listings.length === 0) {
      el.innerHTML =
        '<div class="empty-state"><i class="icon-box"></i><h3>No listings yet</h3><p>You haven\'t listed any items. Add your first listing to start earning.</p><button class="btn btn-primary btn-sm" onclick="showPanel(\'rentee\',\'add-listing\')"><i class="icon-plus" style="font-size:14px"></i> Add listing</button></div>';
      return;
    }
    el.innerHTML =
      '<div class="cards-grid">' +
      listings
        .map(function (item) {
          const badge =
            item.status === "available" ? "badge-success" : "badge-warning";
          const imgHtml = item.img_url
            ? '<img src="' +
              escapeHtml(item.img_url) +
              '" alt="' +
              escapeHtml(item.title) +
              "\" loading=\"lazy\" onerror=\"this.parentElement.innerHTML='<div class=\\'no-img\\'><i class=\\'icon-image-off\\'></i></div>'\" />"
            : '<div class="no-img"><i class="icon-image-off"></i></div>';
          return (
            '<div class="item-card"><div class="item-card-img">' +
            imgHtml +
            '</div><div class="item-card-body"><div class="item-cat-tag"><i class="icon-tag" style="font-size:11px"></i>' +
            escapeHtml(item.category) +
            '</div><div class="item-card-title">' +
            escapeHtml(item.title) +
            '</div><div style="display:flex;align-items:center;justify-content:space-between;margin:8px 0"><div class="item-price">₦' +
            Number(item.price).toLocaleString() +
            '<span>/day</span></div><span class="badge ' +
            badge +
            '">' +
            escapeHtml(item.status) +
            '</span></div><div class="item-meta"><span><i class="icon-map-pin"></i> ' +
            escapeHtml(item.location) +
            '</span></div><div style="display:flex;gap:8px;margin-top:12px"><button class="btn btn-ghost btn-sm" style="flex:1;justify-content:center" onclick="toggleItemStatus(' +
            item.id +
            ')"><i class="icon-refresh-cw" style="font-size:13px"></i> Toggle</button><button class="btn btn-danger btn-sm" onclick="deleteListing(' +
            item.id +
            ')"><i class="icon-trash-2" style="font-size:13px"></i></button></div></div></div>'
          );
        })
        .join("") +
      "</div>";
  } catch (e) {
    el.innerHTML =
      '<div class="empty-state"><i class="icon-alert-circle"></i><h3>Error loading listings</h3><p>' +
      e.message +
      "</p></div>";
  }
}

async function renderRequests() {
  const el = document.getElementById("requests-content");
  if (!el) return;
  try {
    const data = await api("/api/incoming-requests");
    const reqs = data.requests;
    if (reqs.length === 0) {
      el.innerHTML =
        '<div class="empty-state"><i class="icon-inbox"></i><h3>No requests yet</h3><p>Rental requests from other users will appear here once your items are listed.</p></div>';
      return;
    }
    const badgeMap = {
      pending: "badge-warning",
      approved: "badge-success",
      declined: "badge-danger",
    };
    const rows = reqs
      .map(function (r) {
        const actions =
          r.status === "pending"
            ? '<div style="display:flex;gap:6px"><button class="btn btn-sm" style="background:rgba(34,197,94,.1);color:var(--success);border:1px solid rgba(34,197,94,.2);padding:4px 12px" onclick="handleRequest(' +
              r.id +
              ',\'approved\')"><i class="icon-check" style="font-size:12px"></i> Approve</button><button class="btn btn-danger btn-sm" style="padding:4px 12px" onclick="handleRequest(' +
              r.id +
              ',\'declined\')"><i class="icon-x" style="font-size:12px"></i> Decline</button></div>'
            : '<span style="font-size:12px;color:var(--text-muted)">—</span>';
        return (
          "<tr><td><strong>" +
          escapeHtml(r.item_title) +
          '</strong></td><td style="color:var(--text-darker)">' +
          escapeHtml(r.renter_name) +
          '</td><td style="font-size:13px;color:var(--text-darker)">' +
          escapeHtml(r.start_date) +
          " — " +
          escapeHtml(r.end_date) +
          '</td><td><span class="badge ' +
          (badgeMap[r.status] || "badge-neutral") +
          '">' +
          escapeHtml(r.status) +
          "</span></td><td>" +
          actions +
          "</td></tr>"
        );
      })
      .join("");
    el.innerHTML =
      '<div class="table-wrap"><table><thead><tr><th>Item</th><th>Renter</th><th>Dates</th><th>Status</th><th>Actions</th></tr></thead><tbody>' +
      rows +
      "</tbody></table></div>";
  } catch (e) {
    el.innerHTML =
      '<div class="empty-state"><i class="icon-alert-circle"></i><h3>Error</h3><p>' +
      e.message +
      "</p></div>";
  }
}

function renderProfile(dash) {
  const u = state.currentUser;
  if (!u) return;
  const el = document.getElementById(dash + "-profile-content");
  if (!el) return;
  const roleBadges = (u.roles === "both" ? ["renter", "rentee"] : [u.roles])
    .map(function (r) {
      return (
        '<span class="badge badge-info"><i class="' +
        (r === "renter" ? "icon-search" : "icon-package") +
        '" style="font-size:11px"></i> ' +
        (r === "renter" ? "Renter" : "Owner") +
        "</span>"
      );
    })
    .join("");
  el.innerHTML =
    '<div class="profile-card"><div class="profile-header"><div class="profile-avatar">' +
    escapeHtml(u.avatar) +
    '</div><div><h3 style="font-size:18px;font-weight:700">' +
    escapeHtml(u.fname) +
    " " +
    escapeHtml(u.lname) +
    '</h3><p style="color:var(--text-darker);font-size:14px">' +
    escapeHtml(u.email) +
    '</p><div style="display:flex;gap:6px;margin-top:8px">' +
    roleBadges +
    '</div></div></div><div class="divider"></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:14px"><div class="form-group"><label class="form-label">First name</label><input class="form-input" id="profile-fname" value="' +
    escapeHtml(u.fname) +
    '" /></div><div class="form-group"><label class="form-label">Last name</label><input class="form-input" id="profile-lname" value="' +
    escapeHtml(u.lname) +
    '" /></div></div><div class="form-group"><label class="form-label">Email address</label><input class="form-input" value="' +
    escapeHtml(u.email) +
    '" disabled style="opacity:.6" /></div><button class="btn btn-primary btn-sm" onclick="saveProfile()"><i class="icon-check" style="font-size:14px"></i> Save changes</button></div>';
}

async function saveProfile() {
  const fname = (document.getElementById("profile-fname") || {}).value || "";
  const lname = (document.getElementById("profile-lname") || {}).value || "";
  const btn = document.querySelector(".profile-card .btn-primary");
  const originalText = btn ? btn.innerHTML : "Save changes";
  await withLoading(btn, async () => {
    try {
      const data = await api("/api/profile", "PUT", { fname, lname });
      state.currentUser = data.user;
      showToast("Profile updated successfully", "success");
    } catch (e) {
      showToast(e.message, "error");
    }
  });
}

async function updateReqBadge() {
  try {
    const data = await api("/api/incoming-requests");
    const pending = data.requests.filter((r) => r.status === "pending").length;
    const badge = document.getElementById("req-badge");
    if (badge) {
      badge.textContent = pending;
      badge.style.display = pending > 0 ? "inline" : "none";
    }
  } catch (e) {}
}

// ════════════════════════════════════════
// RENTAL MODAL
// ════════════════════════════════════════
function openRentModal(itemId, itemPrice, itemTitle) {
  state.pendingModalItemId = itemId;
  state.pendingModalItemPrice = itemPrice;
  document.getElementById("modal-item-name").textContent =
    itemTitle || "Request rental";
  document.getElementById("modal-start").value = new Date()
    .toISOString()
    .split("T")[0];
  document.getElementById("modal-end").value = "";
  document.getElementById("modal-msg").value = "";
  document.getElementById("modal-cost").style.display = "none";
  document.getElementById("rent-modal").style.display = "flex";
}

function calcModalCost() {
  const s = document.getElementById("modal-start").value;
  const e = document.getElementById("modal-end").value;
  if (!s || !e) return;
  const sd = new Date(s);
  const ed = new Date(e);
  const delta = ed - sd;
  if (delta <= 0) {
    document.getElementById("modal-cost").style.display = "none";
    return;
  }
  const days = Math.ceil(delta / 86400000);
  const cost = state.pendingModalItemPrice * days;
  document.getElementById("modal-cost").style.display = "flex";
  document.getElementById("modal-cost-val").textContent =
    "₦" +
    cost.toLocaleString() +
    " (" +
    days +
    " day" +
    (days > 1 ? "s" : "") +
    ")";
}

async function submitRentalRequest() {
  const s = document.getElementById("modal-start").value;
  const e = document.getElementById("modal-end").value;
  if (!s || !e) {
    showToast("Please select start and end dates", "error");
    return;
  }
  if (s >= e) {
    showToast("End date must be after start date", "error");
    return;
  }
  const btn = document.querySelector("#rent-modal .btn-primary");
  await withLoading(btn, async () => {
    try {
      await api("/api/requests", "POST", {
        item_id: state.pendingModalItemId,
        start_date: s,
        end_date: e,
        message: document.getElementById("modal-msg").value,
      });
      document.getElementById("rent-modal").style.display = "none";
      showToast("Request sent! Waiting for owner approval.", "success");
      renderMyRentals();
    } catch (e) {
      showToast(e.message, "error");
    }
  });
}

function closeModalOverlay(ev) {
  if (ev.target === document.getElementById("rent-modal"))
    document.getElementById("rent-modal").style.display = "none";
}

// ════════════════════════════════════════
// LISTING ACTIONS
// ════════════════════════════════════════
async function addListing() {
  const title = document.getElementById("new-title").value.trim();
  const cat = document.getElementById("new-cat").value;
  const desc = document.getElementById("new-desc").value.trim();
  const price = document.getElementById("new-price").value;
  const loc = document.getElementById("new-location").value.trim();
  const fileInput = document.getElementById("file-input");

  if (!title || !cat || !desc || !price || !loc) {
    showToast("Please fill in all required fields", "error");
    return;
  }

  const formData = new FormData();
  formData.append("title", title);
  formData.append("category", cat);
  formData.append("description", desc);
  formData.append("price", price);
  formData.append("location", loc);

  if (fileInput.files[0]) {
    formData.append("file", fileInput.files[0]);
  } else {
    showToast("Please upload an image file.", "error");
    return;
  }

  const btn = document.querySelector("#rentee-add-listing .btn-primary");
  await withLoading(btn, async () => {
    try {
      const res = await fetch("/api/listings", {
        method: "POST",
        body: formData,
        credentials: "same-origin",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add listing");
      clearListingForm();
      showToast("Listing published successfully!", "success");
      showPanel("rentee", "my-listings");
    } catch (e) {
      showToast(e.message, "error");
    }
  });
}

function clearListingForm() {
  ["new-title", "new-desc", "new-price", "new-location"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  const cat = document.getElementById("new-cat");
  if (cat) cat.value = "";
  const fileInput = document.getElementById("file-input");
  if (fileInput) fileInput.value = "";
  const prev = document.getElementById("img-preview");
  if (prev) {
    prev.src = "";
    prev.style.display = "none";
  }
}

function previewImage(input) {
  if (!input.files || !input.files[0]) return;
  const reader = new FileReader();
  reader.onload = function (e) {
    const img = document.getElementById("img-preview");
    if (img) {
      img.src = e.target.result;
      img.style.display = "block";
    }
  };
  reader.readAsDataURL(input.files[0]);
}

async function toggleItemStatus(id) {
  const btn = event.target.closest("button");
  const originalHtml = btn ? btn.innerHTML : "";
  if (btn) {
    btn.disabled = true;
    btn.innerHTML =
      '<i class="icon-loader animate-spin" style="font-size:14px"></i> Toggle';
  }
  try {
    const data = await api("/api/listings/" + id + "/toggle", "PUT");
    showToast("Item marked as " + data.status, "success");
    renderMyListings();
  } catch (e) {
    showToast(e.message, "error");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalHtml;
    }
  }
}

async function deleteListing(id) {
  if (!confirm("Delete this listing? This cannot be undone.")) return;
  const btn = event.target.closest("button");
  const originalHtml = btn ? btn.innerHTML : "";
  if (btn) {
    btn.disabled = true;
    btn.innerHTML =
      '<i class="icon-loader animate-spin" style="font-size:14px"></i>';
  }
  try {
    await api("/api/listings/" + id, "DELETE");
    showToast("Listing deleted", "success");
    renderMyListings();
    renderOwnerOverview();
  } catch (e) {
    showToast(e.message, "error");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalHtml;
    }
  }
}

async function handleRequest(reqId, action) {
  const btn = event.target.closest("button");
  const originalHtml = btn ? btn.innerHTML : "";
  if (btn) {
    btn.disabled = true;
    btn.innerHTML =
      '<i class="icon-loader animate-spin" style="font-size:14px"></i>';
  }
  try {
    await api("/api/requests/" + reqId, "PUT", { action });
    showToast("Request " + action + "!", "success");
    renderRequests();
    renderOwnerOverview();
    updateReqBadge();
  } catch (e) {
    showToast(e.message, "error");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalHtml;
    }
  }
}

// ════════════════════════════════════════
// TOAST
// ════════════════════════════════════════
function showToast(msg, type) {
  type = type || "success";
  const toast = document.getElementById("toast");
  const icon = document.getElementById("toast-icon");
  document.getElementById("toast-msg").textContent = msg;
  toast.className = "toast toast-" + type;
  icon.className =
    type === "success" ? "icon-check-circle" : "icon-alert-circle";
  toast.classList.add("show");
  setTimeout(function () {
    toast.classList.remove("show");
  }, 3500);
}

// ════════════════════════════════════════
// INIT — check if already logged in
// ════════════════════════════════════════
document.addEventListener("DOMContentLoaded", async function () {
  try {
    const data = await api("/api/me");
    if (data.user) {
      state.currentUser = data.user;
      // Stay on landing; user can navigate
    }
  } catch (e) {}
});
