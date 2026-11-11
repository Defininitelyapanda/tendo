"use strict";

const $ = (selector, root = document) => root.querySelector(selector);
const pageMeta = {
  overview: ["YOUR BUSINESS, AT A GLANCE", "Overview", "A clear view of the work moving your business forward."],
  invoices: ["SALES, MADE CLEAR", "Invoices", "Create, track and share invoices from one calm workspace."],
  expenses: ["KNOW WHERE IT GOES", "Expenses", "Keep supplier costs and everyday spending in order."],
  customers: ["PEOPLE BEHIND THE BUSINESS", "Customers", "One place for your customer details and purchase history."],
  inventory: ["PRODUCTS & STOCK", "Inventory", "A simple view of the items your business keeps on hand."],
  reports: ["THE BIGGER PICTURE", "Reports", "Understand the numbers behind your day-to-day work."],
  tax: ["ESTIMATES, NOT FILINGS", "Tax calculator", "Explore tax estimates using rates you select."],
  settings: ["MAKE IT YOURS", "Settings", "Adjust this prototype workspace to suit your business."]
};

const today = new Date();
const isoDate = date => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const daysAgo = n => isoDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() - n));
const ago = n => new Date(`${daysAgo(n)}T12:00:00`).toISOString();
const idFrom = tail => `demo-${tail}`;
const recordIdSuffix = id => id.replace(/[^a-z0-9]/gi, "").slice(-8).toUpperCase().padStart(8, "0");
const getBackendCandidates = () => {
  const candidates = [];
  const configured = typeof window !== "undefined" && window.TENDO_API_URL ? window.TENDO_API_URL.replace(/\/$/, "") : "";
  if (configured) candidates.push(configured);
  if (typeof window !== "undefined" && window.location) {
    const origin = window.location.origin;
    if (origin && /:(3100|3101|3102|3103|3104|3105|3106|3107|3108|3109)$/.test(origin)) {
      candidates.push(origin);
    }
    if (window.location.port === "3000" || window.location.port === "3001" || window.location.port === "3002" || window.location.port === "3003") {
      for (let port = 3100; port <= 3109; port += 1) candidates.push(`http://localhost:${port}`);
    }
  }
  if (!candidates.length) {
    for (let port = 3100; port <= 3109; port += 1) candidates.push(`http://localhost:${port}`);
  }
  return [...new Set(candidates)];
};

const state = {
  page: "overview",
  search: "",
  statusFilter: "all",
  currency: "KES",
  backendStatus: "checking",
  backendMessage: "Checking backend...",
  currentWorkspaceId: "workspace-kijani",
  workspaces: [
    {
      id: "workspace-kijani",
      name: "Kijani Studio",
      type: "Creative studio",
      profile: {
        businessType: "Creative studio",
        businessEmail: "hello@kijani.example.test",
        businessPhone: "+254 721 987 654",
        location: "Nairobi, Kenya",
        address: "Westlands, Nairobi",
        taxConfig: "VAT registered",
        registration: "BRN-84521"
      }
    },
    {
      id: "workspace-maua",
      name: "Maua Organics",
      type: "Retail & wholesale",
      profile: {
        businessType: "Retail & wholesale",
        businessEmail: "orders@maua.example.test",
        businessPhone: "+254 722 120 880",
        location: "Kiambu, Kenya",
        address: "Ruiru, Kiambu",
        taxConfig: "VAT registered",
        registration: "BRN-11892"
      }
    },
    {
      id: "workspace-otieno",
      name: "Otieno & Co.",
      type: "Consulting",
      profile: {
        businessType: "Consulting",
        businessEmail: "hello@otieno.example.test",
        businessPhone: "+254 733 400 211",
        location: "Kisumu, Kenya",
        address: "Milimani, Kisumu",
        taxConfig: "Tax planning",
        registration: "REG-7821"
      }
    }
  ],
  businessName: "Kijani Studio",
  onboardingComplete: false,
  onboardingSkipped: false,
  businessProfile: {
    businessType: "Creative studio",
    businessEmail: "hello@kijani.example.test",
    businessPhone: "+254 721 987 654",
    location: "Nairobi, Kenya",
    address: "Westlands, Nairobi",
    taxConfig: "VAT registered",
    registration: "BRN-84521"
  },
  inventoryEnabled: true,
  taxAmount: 10000,
  taxRate: 16,
  taxMode: "exclusive",
  members: [
    { id: "member-1", name: "Tonnie K.", role: "Owner", email: "tonnie@kijani.example.test", status: "Active", permissions: { invoices: "approve", expenses: "approve", customers: "edit", inventory: "edit", reports: "view", settings: "admin" } },
    { id: "member-2", name: "Aisha M.", role: "Accountant", email: "aisha@kijani.example.test", status: "Active", permissions: { invoices: "approve", expenses: "edit", customers: "view", inventory: "view", reports: "view", settings: "view" } },
    { id: "member-3", name: "Juma N.", role: "Sales lead", email: "juma@kijani.example.test", status: "Invited", permissions: { invoices: "view", expenses: "view", customers: "edit", inventory: "view", reports: "view", settings: "none" } }
  ],
  operations: [
    { id: "op-1", title: "Follow up on overdue invoice", owner: "Sales", due: "Today", status: "in_progress" },
    { id: "op-2", title: "Review VAT filing checklist", owner: "Finance", due: "Tomorrow", status: "pending" },
    { id: "op-3", title: "Finalize onboarding pack", owner: "People Ops", due: "This week", status: "done" },
    { id: "op-4", title: "Restock packaging supplies", owner: "Operations", due: "Friday", status: "pending" }
  ],
  approvals: [
    { id: "approval-inv-1", type: "invoice", recordId: idFrom("inv002b48"), title: "Website design — phase 1", requestor: "Maua Organics", amount: 106720, due: daysAgo(1) },
    { id: "approval-exp-1", type: "expense", recordId: idFrom("exp002f07"), title: "Printing and samples", requestor: "Paper & Co.", amount: 14384, due: daysAgo(2) },
    { id: "approval-exp-2", type: "expense", recordId: idFrom("exp003a83"), title: "Design software subscription", requestor: "Studio Tools", amount: 5800, due: daysAgo(5) }
  ],
  records: [
    { id: idFrom("inv001a91"), type: "invoice", description: "Brand identity package", customer: "Amina Wanjiku", customerPhone: "+254 712 345 678", customerEmail: "amina@example.test", items: "Brand identity package", amount: 68000, taxRate: 16, taxAmount: 10880, total: 78880, date: daysAgo(2), dueDate: daysAgo(-12), status: "paid", notes: "Thank you for your business.", createdAt: ago(2), updatedAt: ago(2) },
    { id: idFrom("inv002b48"), type: "invoice", description: "Website design — phase 1", customer: "Maua Organics", customerPhone: "+254 722 120 880", customerEmail: "hello@maua.example.test", items: "Website design — phase 1", amount: 92000, taxRate: 16, taxAmount: 14720, total: 106720, date: daysAgo(6), dueDate: daysAgo(1), status: "overdue", notes: "", createdAt: ago(6), updatedAt: ago(1) },
    { id: idFrom("inv003c52"), type: "invoice", description: "Monthly design retainer", customer: "Otieno & Co.", customerPhone: "+254 733 400 211", customerEmail: "", items: "Monthly design retainer", amount: 45000, taxRate: 0, taxAmount: 0, total: 45000, date: daysAgo(10), dueDate: daysAgo(-20), status: "pending", notes: "Zero rate selected for estimate only.", createdAt: ago(10), updatedAt: ago(10) },
    { id: idFrom("inv004d60"), type: "invoice", description: "Social media templates", customer: "Amina Wanjiku", customerPhone: "+254 712 345 678", customerEmail: "amina@example.test", items: "Social media templates", amount: 18000, taxRate: 16, taxAmount: 2880, total: 20880, date: daysAgo(18), dueDate: daysAgo(11), status: "draft", notes: "", createdAt: ago(18), updatedAt: ago(18) },
    { id: idFrom("exp001e33"), type: "expense", description: "Monthly studio rent", supplier: "Mwangaza Properties", amount: 38000, taxRate: 0, taxAmount: 0, total: 38000, date: daysAgo(3), status: "paid", category: "Rent", notes: "", createdAt: ago(3), updatedAt: ago(3) },
    { id: idFrom("exp002f07"), type: "expense", description: "Printing and samples", supplier: "Paper & Co.", amount: 12400, taxRate: 16, taxAmount: 1984, total: 14384, date: daysAgo(4), status: "pending", category: "Supplies", notes: "Client presentation samples.", createdAt: ago(4), updatedAt: ago(4) },
    { id: idFrom("exp003a83"), type: "expense", description: "Design software subscription", supplier: "Studio Tools", amount: 5800, taxRate: 0, taxAmount: 0, total: 5800, date: daysAgo(8), status: "recorded", category: "Software", notes: "", createdAt: ago(8), updatedAt: ago(8) }
  ],
  customers: [
    { id: idFrom("cus001a10"), name: "Amina Wanjiku", phone: "+254 712 345 678", email: "amina@example.test", notes: "Prefers WhatsApp for updates.", createdAt: ago(45), updatedAt: ago(2), purchases: [] },
    { id: idFrom("cus002b20"), name: "Maua Organics", phone: "+254 722 120 880", email: "hello@maua.example.test", notes: "", createdAt: ago(32), updatedAt: ago(6), purchases: [] },
    { id: idFrom("cus003c30"), name: "Otieno & Co.", phone: "+254 733 400 211", email: "", notes: "Quarterly service client.", createdAt: ago(15), updatedAt: ago(10), purchases: [] }
  ],
  inventory: [
    { id: idFrom("sku001d10"), name: "A5 kraft notebook", sku: "NB-KF-05", category: "Stationery", quantity: 36, unitPrice: 950, costPrice: 510, notes: "" },
    { id: idFrom("sku002e20"), name: "Branded tote bag", sku: "TB-CT-02", category: "Merchandise", quantity: 14, unitPrice: 1800, costPrice: 990, notes: "" },
    { id: idFrom("sku003f30"), name: "Packaging set", sku: "PK-SET-01", category: "Packaging", quantity: 7, unitPrice: 680, costPrice: 330, notes: "Restock soon." }
  ]
};

for (const customer of state.customers) {
  for (const invoice of state.records.filter(r => r.type === "invoice" && r.customer === customer.name)) {
    customer.purchases.push({ sourceId: invoice.id, date: invoice.date, description: invoice.items || invoice.description, amount: invoice.total });
  }
}

const money = amount => new Intl.NumberFormat("en-KE", { style: "currency", currency: state.currency, maximumFractionDigits: 0 }).format(Number(amount) || 0);
const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const icon = name => `<svg><use href="#i-${name}"></use></svg>`;
const docNumber = record => record.documentNumber || `${record.type === "invoice" ? "INV" : "EXP"}-${(record.date || isoDate(today)).slice(0, 4)}-${recordIdSuffix(record.id)}`;
const docType = record => record.type === "invoice" ? (record.status === "draft" ? "Draft invoice" : "Sales invoice") : record.status === "paid" ? "Payment voucher" : record.status === "pending" ? "Supplier bill" : "Expense voucher";
const fmtDate = value => value ? new Intl.DateTimeFormat("en-KE", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${value.slice(0, 10)}T12:00:00`)) : "—";
const shortDate = value => value ? new Intl.DateTimeFormat("en-KE", { day: "numeric", month: "short" }).format(new Date(`${value.slice(0, 10)}T12:00:00`)) : "—";
const statusClass = status => `status-${String(status || "").toLowerCase()}`;
const allRecords = type => state.records.filter(record => record.type === type);
const getCurrentWorkspace = () => state.workspaces.find(workspace => workspace.id === state.currentWorkspaceId) || state.workspaces[0];
const syncCurrentWorkspace = () => {
  const workspace = getCurrentWorkspace();
  state.businessName = workspace.name;
  state.businessProfile = { ...workspace.profile };
};
const renderWorkspaceMenu = () => state.workspaces.map(workspace => `<button class="workspace-option ${workspace.id === state.currentWorkspaceId ? "active" : ""}" type="button" data-workspace-id="${workspace.id}"><span class="workspace-option-avatar">${workspace.name.slice(0, 2).toUpperCase()}</span><span class="workspace-option-copy"><strong>${escapeHtml(workspace.name)}</strong><small>${escapeHtml(workspace.type)}</small></span>${workspace.id === state.currentWorkspaceId ? '<span class="workspace-check">✓</span>' : ''}</button>`).join("");

for (const record of state.records) {
  record.documentNumber = docNumber(record);
  if (record.type === "invoice" && record.customer) {
    const phone = (record.customerPhone || "").replace(/\D/g, "");
    const name = record.customer.toLocaleLowerCase().replace(/\s+/g, " ");
    const customer = (phone && state.customers.find(c => c.phone.replace(/\D/g, "") === phone))
      || state.customers.find(c => c.name.toLocaleLowerCase().replace(/\s+/g, " ") === name
        && (!phone || !c.phone.replace(/\D/g, "") || c.phone.replace(/\D/g, "") === phone));
    if (customer) record.customerId = customer.id;
  }
}

function filtered(items, type) {
  return items.filter(item => {
    const query = state.search.trim().toLowerCase();
    const fields = type === "invoice" || type === "expense"
      ? [item.description, item.customer, item.customerPhone, item.supplier, item.status, item.category, docNumber(item), docType(item)]
      : type === "customer" ? [item.name, item.phone, item.email, item.notes] : [item.name, item.sku, item.category];
    return (!query || fields.some(value => String(value || "").toLowerCase().includes(query)))
      && (state.statusFilter === "all" || item.status === state.statusFilter);
  });
}

function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast${type === "error" ? " error" : ""}`;
  toast.textContent = message;
  $("#toast-region").append(toast);
  setTimeout(() => toast.remove(), 3400);
}

function navigate(page) {
  if (!pageMeta[page] || (page === "inventory" && !state.inventoryEnabled)) return;
  state.page = page;
  state.search = "";
  state.statusFilter = "all";
  syncCurrentWorkspace();
  $("#search-input").value = "";
  document.querySelectorAll(".nav-link[data-nav]").forEach(button => button.classList.toggle("active", button.dataset.nav === page));
  const [eyebrow, title, subtitle] = pageMeta[page];
  $("#page-eyebrow").textContent = eyebrow;
  $("#page-title").textContent = title;
  $("#page-subtitle").textContent = subtitle;
  $("#topbar-section").textContent = title;
  $("#new-record").querySelector("span").textContent = page === "expenses" ? "New expense" : page === "customers" ? "New customer" : page === "inventory" ? "Add item" : "New invoice";
  $("#new-record").hidden = page === "reports" || page === "tax";
  $("#page-content").innerHTML = renderPage();
  $("#invoice-nav-count").textContent = allRecords("invoice").length;
  $("#workspace-name").textContent = state.businessName;
  $("#workspace-menu").innerHTML = renderWorkspaceMenu();
  $("#today-chip").innerHTML = `${icon("calendar")}<span>${new Intl.DateTimeFormat("en-KE", { weekday: "short", day: "numeric", month: "short" }).format(today)}</span>`;
  if (innerWidth <= 780) closeMobileNav();
}

function renderPage() {
  switch (state.page) {
    case "invoices": return renderRecordTable("invoice");
    case "expenses": return renderRecordTable("expense");
    case "customers": return renderCustomers();
    case "inventory": return renderInventory();
    case "reports": return renderReports();
    case "tax": return renderTax();
    case "settings": return renderSettings();
    default: return renderDashboard();
  }
}

function metricCard(label, value, note, iconName) {
  return `<article class="metric-card"><div class="metric-top"><span class="metric-label">${label}</span><span class="metric-icon">${icon(iconName)}</span></div><div class="metric-value">${value}</div><div class="metric-foot">${note}</div></article>`;
}

function renderOnboardingCard() {
  if (state.onboardingComplete || state.onboardingSkipped) return "";
  return `<section class="panel onboarding-panel"><div class="panel-header"><div><h2 class="panel-title">Complete your workspace setup</h2><p class="panel-subtitle">Add the basics that make your business profile usable.</p></div><button class="button button-secondary" type="button" data-action="hide-onboarding">Skip for now</button></div>
    <form id="onboarding-form" class="onboarding-form"><div class="form-grid">
      <div class="form-field"><label for="onboarding-business-name">Business name</label><input class="form-control" id="onboarding-business-name" name="businessName" value="${escapeHtml(state.businessName)}"></div>
      <div class="form-field"><label for="onboarding-business-type">Business type</label><input class="form-control" id="onboarding-business-type" name="businessType" value="${escapeHtml(state.businessProfile.businessType)}"></div>
      <div class="form-field"><label for="onboarding-business-email">Business email</label><input class="form-control" id="onboarding-business-email" name="businessEmail" type="email" value="${escapeHtml(state.businessProfile.businessEmail)}"></div>
      <div class="form-field"><label for="onboarding-business-phone">Business phone</label><input class="form-control" id="onboarding-business-phone" name="businessPhone" value="${escapeHtml(state.businessProfile.businessPhone)}"></div>
      <div class="form-field"><label for="onboarding-location">Location</label><input class="form-control" id="onboarding-location" name="location" value="${escapeHtml(state.businessProfile.location)}"></div>
      <div class="form-field"><label for="onboarding-address">Address</label><input class="form-control" id="onboarding-address" name="address" value="${escapeHtml(state.businessProfile.address)}"></div>
      <div class="form-field"><label for="onboarding-tax-config">Tax configuration</label><input class="form-control" id="onboarding-tax-config" name="taxConfig" value="${escapeHtml(state.businessProfile.taxConfig)}"></div>
      <div class="form-field"><label for="onboarding-registration">Registration reference</label><input class="form-control" id="onboarding-registration" name="registration" value="${escapeHtml(state.businessProfile.registration)}"></div>
    </div>
    <div class="onboarding-actions"><button class="button button-secondary" type="button" data-action="hide-onboarding">Save later</button><button class="button button-primary" type="submit">Finish setup</button></div>
  </form></section>`;
}

function openSetupWizard() {
  const workspace = getCurrentWorkspace();
  const profile = workspace.profile || {};
  const roleSummary = ["Owner", "Admin", "Accountant", "Sales lead", "Viewer"]
    .map(role => `<span class="role-pill">${role}</span>`)
    .join("");
  const summary = `
    <div class="setup-form-shell">
      <div class="setup-form-body">
        <form id="setup-form" class="setup-form">
          <div class="dialog-header"><div><h2 id="setup-title">Workspace setup</h2><p>Confirm the essentials for this workspace before you start tracking work.</p></div><button type="button" class="icon-button" data-action="close-setup" aria-label="Close setup">${icon("close")}</button></div>
          <div class="setup-steps" data-step="1">
            <div class="step-tabs"><span class="step-tab active">1. Basics</span><span class="step-tab">2. Contacts</span><span class="step-tab">3. Access</span></div>
            <div class="setup-grid step-panel active" data-step-panel="1">
              <div class="form-field"><label for="setup-business-name">Business name</label><input class="form-control" id="setup-business-name" name="businessName" value="${escapeHtml(workspace.name)}" required></div>
              <div class="form-field"><label for="setup-business-type">Business type</label><input class="form-control" id="setup-business-type" name="businessType" value="${escapeHtml(profile.businessType || workspace.type || "Business")}"></div>
              <div class="form-field"><label for="setup-location">Location</label><input class="form-control" id="setup-location" name="location" value="${escapeHtml(profile.location || "")}"></div>
              <div class="form-field"><label for="setup-tax-config">Tax configuration</label><input class="form-control" id="setup-tax-config" name="taxConfig" value="${escapeHtml(profile.taxConfig || "")}"></div>
            </div>
            <div class="setup-grid step-panel" data-step-panel="2">
              <div class="form-field"><label for="setup-business-email">Business email</label><input class="form-control" id="setup-business-email" name="businessEmail" type="email" value="${escapeHtml(profile.businessEmail || "")}"></div>
              <div class="form-field"><label for="setup-business-phone">Business phone</label><input class="form-control" id="setup-business-phone" name="businessPhone" value="${escapeHtml(profile.businessPhone || "")}"></div>
              <div class="form-field full"><label for="setup-address">Address</label><input class="form-control" id="setup-address" name="address" value="${escapeHtml(profile.address || "")}"></div>
              <div class="form-field full"><label for="setup-registration">Registration reference</label><input class="form-control" id="setup-registration" name="registration" value="${escapeHtml(profile.registration || "")}"></div>
            </div>
            <div class="setup-grid step-panel" data-step-panel="3">
              <div class="form-field full"><label>Approval workflow</label><select class="form-control" name="approvalFlow"><option value="manager" selected>Manager approval for invoices over KES 50,000</option><option value="owner">Owner approval for every new invoice</option><option value="shared">Shared approval for finance and sales</option></select></div>
              <div class="form-field full"><label>Team roles</label><div class="role-list">${roleSummary}</div></div>
            </div>
          </div>
          <div class="dialog-footer setup-footer"><button type="button" class="button button-secondary" data-action="close-setup">Cancel</button><button type="button" class="button button-secondary" data-action="wizard-prev" data-step-direction="prev">Back</button><button type="button" class="button button-primary" data-action="wizard-next" data-step-direction="next">Next</button><button class="button button-primary hidden" type="submit" id="wizard-submit">${icon("check")} Save workspace</button></div>
        </form>
      </div>
      <aside class="setup-summary">
        <div class="summary-card"><p class="summary-label">Launch checklist</p><strong>${escapeHtml(workspace.name)}</strong>
          <ul>
            <li>Set the correct contact and tax profile</li>
            <li>Review the business type and registration</li>
            <li>Assign ownership and permissions</li>
          </ul>
        </div>
        <div class="summary-card"><p class="summary-label">Permissions</p><div class="role-list">${roleSummary}</div></div>
      </aside>
    </div>`;
  $("#setup-content").innerHTML = summary;
  updateWizardUI();
  $("#setup-dialog").showModal();
}

function openMemberManager() {
  const roles = ["Owner", "Admin", "Accountant", "Sales lead", "Viewer"];
  const manager = `
    <div class="setup-form-shell">
      <div class="setup-form-body">
        <form id="member-form" class="setup-form">
          <div class="dialog-header"><div><h2 id="setup-title">Team access</h2><p>Adjust roles and permissions for the current workspace.</p></div><button type="button" class="icon-button" data-action="close-setup" aria-label="Close team access">${icon("close")}</button></div>
          <div class="setup-grid member-grid">
            ${state.members.map(member => `
              <div class="member-editor-card">
                <div class="member-header"><span class="member-avatar">${member.name.split(" ").map(part => part[0]).slice(0, 2).join("").toUpperCase()}</span><div><strong>${escapeHtml(member.name)}</strong><small>${escapeHtml(member.email || "No email")}</small></div></div>
                <div class="member-editor-row">
                  <label>Role</label>
                  <select class="form-control" data-member-role="${member.id}">${roles.map(role => `<option value="${role}" ${member.role === role ? "selected" : ""}>${role}</option>`).join("")}</select>
                </div>
                <div class="member-editor-row">
                  <label>Status</label>
                  <select class="form-control" data-member-status="${member.id}"><option value="Active" ${member.status === "Active" ? "selected" : ""}>Active</option><option value="Invited" ${member.status === "Invited" ? "selected" : ""}>Invited</option></select>
                </div>
                <div class="member-editor-row permission-stack">
                  <label>Permissions</label>
                  <div class="perm-grid">
                    ${Object.entries(member.permissions || {}).map(([scope, value]) => `<select class="form-control" data-member-permission data-member-id="${member.id}" data-scope="${scope}">
                      <option value="none" ${value === "none" ? "selected" : ""}>None</option>
                      <option value="view" ${value === "view" ? "selected" : ""}>View</option>
                      <option value="edit" ${value === "edit" ? "selected" : ""}>Edit</option>
                      <option value="approve" ${value === "approve" ? "selected" : ""}>Approve</option>
                      <option value="admin" ${value === "admin" ? "selected" : ""}>Admin</option>
                    </select>`).join("")}
                  </div>
                </div>
              </div>
            `).join("")}
          </div>
          <div class="dialog-footer setup-footer"><button type="button" class="button button-secondary" data-action="close-setup">Close</button><button type="button" class="button button-primary" data-action="add-member">${icon("plus")} Add member</button><button type="submit" class="button button-primary">${icon("check")} Save access</button></div>
        </form>
      </div>
      <aside class="setup-summary">
        <div class="summary-card"><p class="summary-label">Workspace access</p><strong>${state.businessName}</strong><ul><li>Approvals remain lightweight and prototype-only.</li><li>Access changes are saved in this browser session.</li></ul></div>
        <div class="summary-card"><p class="summary-label">Role map</p><div class="role-list">${roles.map(role => `<span class="role-pill">${role}</span>`).join("")}</div></div>
      </aside>
    </div>`;
  $("#setup-content").innerHTML = manager;
  $("#setup-dialog").showModal();
}

function renderApprovalQueue() {
  if (!state.approvals.length) return "";
  return `<section class="panel"><div class="panel-header"><div><h2 class="panel-title">Approval queue</h2><p class="panel-subtitle">Small business actions waiting for signoff</p></div></div><div class="approval-list">${state.approvals.map(item => `<div class="approval-item"><div><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.requestor)} · ${item.type === "invoice" ? "Invoice" : "Expense"}</small></div><span class="approval-amount">${money(item.amount)}</span><div class="approval-actions"><button class="button button-secondary" type="button" data-action="approve-item" data-id="${item.id}">Approve</button><button class="button button-danger" type="button" data-action="reject-item" data-id="${item.id}">Reject</button></div></div>`).join("")}</div></section>`;
}

function updateWizardUI() {
  const panels = [...document.querySelectorAll(".step-panel")];
  const tabs = [...document.querySelectorAll(".step-tab")];
  const currentStep = Number(document.querySelector(".step-panel.active")?.dataset.stepPanel || 1);
  panels.forEach(panel => panel.classList.toggle("active", Number(panel.dataset.stepPanel) === currentStep));
  tabs.forEach((tab, index) => tab.classList.toggle("active", index + 1 === currentStep));
  const nextButton = document.querySelector("[data-action='wizard-next']");
  const prevButton = document.querySelector("[data-action='wizard-prev']");
  const submitButton = document.querySelector("#wizard-submit");
  if (!nextButton || !prevButton || !submitButton) return;
  const isLast = currentStep === 3;
  nextButton.classList.toggle("hidden", isLast);
  submitButton.classList.toggle("hidden", !isLast);
  prevButton.classList.toggle("hidden", currentStep === 1);
}

function renderDashboard() {
  const invoices = allRecords("invoice");
  const expenses = allRecords("expense");
  const revenue = invoices.filter(r => r.status === "paid").reduce((sum, r) => sum + r.total, 0);
  const outstanding = invoices.filter(r => r.status !== "paid").reduce((sum, r) => sum + r.total, 0);
  const expenseTotal = expenses.reduce((sum, r) => sum + r.total, 0);
  const paidExpenses = expenses.filter(r => r.status === "paid").reduce((sum, r) => sum + r.total, 0);
  const pendingExpenses = expenses.filter(r => r.status === "pending").reduce((sum, r) => sum + r.total, 0);
  const activity = [...state.records.map(record => ({ ...record, kind: record.type, label: record.description, at: record.updatedAt })),
    ...state.customers.map(customer => ({ ...customer, kind: "customer", label: `Customer added: ${customer.name}`, at: customer.updatedAt }))]
    .sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 5);
  const workspaceDetails = [
    ["Business type", state.businessProfile.businessType || "—"],
    ["Contact", state.businessProfile.businessPhone || "—"],
    ["Location", state.businessProfile.location || "—"],
    ["Tax config", state.businessProfile.taxConfig || "—"]
  ];
  return `${renderOnboardingCard()}<div class="metric-grid">
      ${metricCard("Paid revenue", money(revenue), "From paid invoices", "arrow-up-right")}
      ${metricCard("Outstanding invoices", money(outstanding), `${invoices.filter(r => r.status !== "paid").length} unpaid invoices`, "clock")}
      ${metricCard("All recorded supplier costs", money(expenseTotal), `${money(paidExpenses)} paid · ${money(pendingExpenses)} pending`, "receipt")}
      ${metricCard("Customers", state.customers.length, "Across this sample workspace", "users")}
    </div>
    <div class="dashboard-grid">
      <section class="panel"><div class="panel-header"><div><h2 class="panel-title">Cash flow snapshot</h2><p class="panel-subtitle">Paid invoices and recorded expenses · last 6 months</p></div><button class="panel-link" data-nav="reports">View reports ${icon("arrow-up-right")}</button></div>${renderCashflowChart()}</section>
      <section class="panel"><div class="panel-header"><div><h2 class="panel-title">Recent activity</h2><p class="panel-subtitle">A little movement across your workspace</p></div><button class="panel-link" data-nav="invoices">See all ${icon("arrow-up-right")}</button></div>
        <div class="activity-list">${activity.map(item => `<div class="activity-item"><span class="activity-icon">${icon(item.kind === "invoice" ? "file" : item.kind === "expense" ? "receipt" : "users")}</span><div class="activity-copy"><strong>${escapeHtml(item.label || item.name)}</strong><small>${item.kind === "invoice" ? "Invoice" : item.kind === "expense" ? "Expense" : "Customer"} · ${shortDate(item.date || item.at?.slice(0, 10))}</small></div><span class="activity-amount">${item.total ? money(item.total) : ""}</span></div>`).join("")}</div>
      </section>
    </div>
    ${renderOperationsBoard()}
    <div class="dashboard-grid secondary-grid">
      <section class="panel"><div class="panel-header"><div><h2 class="panel-title">Business profile</h2><p class="panel-subtitle">Workspace details for quick reference</p></div></div><div class="profile-summary-body">${workspaceDetails.map(([label, value]) => `<div class="profile-summary-row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join("")}</div></section>
      <section class="panel"><div class="panel-header"><div><h2 class="panel-title">People & access</h2><p class="panel-subtitle">Owners, team, and permission roles</p></div></div><div class="member-list">${state.members.map(member => `<div class="member-card"><div class="member-header"><span class="member-avatar">${member.name.split(" ").map(part => part[0]).slice(0, 2).join("").toUpperCase()}</span><div><strong>${escapeHtml(member.name)}</strong><small>${escapeHtml(member.role)}</small></div></div><div class="member-meta"><span>${escapeHtml(member.email || "No email")}</span><span class="member-status ${member.status === "Active" ? "active" : "invited"}">${escapeHtml(member.status)}</span></div></div>`).join("")}</div></section>
    </div>
    ${renderApprovalQueue()}
    <div class="quick-actions">
      <button class="quick-action" data-action="new" data-type="invoice"><span class="metric-icon">${icon("file")}</span><span>Create an invoice<small>Bill a customer</small></span></button>
      <button class="quick-action" data-action="new" data-type="expense"><span class="metric-icon">${icon("receipt")}</span><span>Record an expense<small>Keep costs in view</small></span></button>
      <button class="quick-action" data-action="new" data-type="customer"><span class="metric-icon">${icon("users")}</span><span>Add a customer<small>Grow your contacts</small></span></button>
    </div>`;
}

function renderOperationsBoard() {
  const activeCount = state.operations.filter(item => item.status === "in_progress").length;
  const dueSoonCount = state.operations.filter(item => item.status !== "done").length;
  const doneCount = state.operations.filter(item => item.status === "done").length;

  return `<section class="panel">
    <div class="panel-header">
      <div>
        <h2 class="panel-title">Operations board</h2>
        <p class="panel-subtitle">A quick check on the work moving the business this week.</p>
      </div>
    </div>
    <div class="operations-board">
      <div class="ops-overview">
        <div class="ops-stat"><span>In motion</span><strong>${activeCount}</strong></div>
        <div class="ops-stat"><span>Open items</span><strong>${dueSoonCount}</strong></div>
        <div class="ops-stat"><span>Completed</span><strong>${doneCount}</strong></div>
      </div>
      <div class="ops-list">
        ${state.operations.map(item => `
          <div class="ops-item ${item.status}">
            <div class="ops-head">
              <span class="ops-status ${item.status}">${item.status === "done" ? "Done" : item.status === "in_progress" ? "In motion" : "Pending"}</span>
              <button class="mini-toggle" type="button" data-action="toggle-operation" data-id="${item.id}">${item.status === "done" ? "Mark active" : "Mark done"}</button>
            </div>
            <strong>${escapeHtml(item.title)}</strong>
            <div class="ops-meta">
              <span>${escapeHtml(item.owner)}</span>
              <span>${escapeHtml(item.due)}</span>
            </div>
          </div>
        `).join("")}
      </div>
    </div>
  </section>`;
}

function renderCashflowChart() {
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
    months.push({ key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`, label: new Intl.DateTimeFormat("en-KE", { month: "short" }).format(date), revenue: 0, expense: 0 });
  }
  state.records.forEach(record => {
    const month = months.find(item => item.key === record.date.slice(0, 7));
    if (!month) return;
    if (record.type === "invoice" && record.status === "paid") month.revenue += record.total;
    if (record.type === "expense") month.expense += record.total;
  });
  const max = Math.max(1, ...months.flatMap(m => [m.revenue, m.expense]));
  const revenueTotal = months.reduce((sum, month) => sum + month.revenue, 0);
  return `<div class="chart-area"><div class="chart-summary"><strong>${money(revenueTotal)}</strong><span>paid revenue in the period</span></div><div class="chart">${months.map(m => `<div class="chart-column" aria-label="${m.label}: revenue ${money(m.revenue)}, expenses ${money(m.expense)}"><div class="chart-bars"><span class="chart-bar revenue" style="height:${Math.max(3, m.revenue / max * 100)}%"></span><span class="chart-bar expense" style="height:${Math.max(3, m.expense / max * 100)}%"></span></div><span class="chart-month">${m.label}</span></div>`).join("")}</div><div class="chart-legend"><span class="legend-item"><span class="legend-dot"></span>Paid revenue</span><span class="legend-item"><span class="legend-dot expense"></span>Expenses</span></div></div>`;
}

function renderRecordTable(type) {
  const invoice = type === "invoice";
  const records = filtered(allRecords(type), type).sort((a, b) => b.date.localeCompare(a.date));
  const statuses = invoice ? ["draft", "pending", "paid", "overdue"] : ["recorded", "pending", "paid"];
  const rows = records.map(record => `<tr>
    <td><div class="primary-cell"><strong>${escapeHtml(record.description)}</strong><small>${escapeHtml(invoice ? record.customer || "No customer" : record.supplier || record.category || "Unspecified supplier")}</small></div></td>
    <td><span class="doc-number">${docNumber(record)}</span><div class="muted-cell">${docType(record)}</div></td><td>${fmtDate(record.date)}</td><td><strong>${money(record.total)}</strong></td>
    <td><select class="filter-select status-editor ${statusClass(record.status)}" data-action="change-status" data-id="${record.id}" data-type="${type}" aria-label="Change status for ${escapeHtml(record.description)}">${statuses.map(s => `<option value="${s}" ${record.status === s ? "selected" : ""}>${s[0].toUpperCase() + s.slice(1)}</option>`).join("")}</select></td>
    <td><div class="row-actions"><button class="row-action" title="View details" aria-label="View ${escapeHtml(record.description)}" data-action="view" data-type="${type}" data-id="${record.id}">${icon("arrow-up-right")}</button><button class="row-action" title="Edit" aria-label="Edit ${escapeHtml(record.description)}" data-action="edit" data-type="${type}" data-id="${record.id}">${icon("settings")}</button>${invoice ? `<button class="row-action" title="Print" aria-label="Print invoice" data-action="print" data-id="${record.id}">${icon("print")}</button><button class="row-action" title="Share" aria-label="Share invoice" data-action="share" data-id="${record.id}">${icon("share")}</button>` : ""}<button class="row-action danger" title="Delete" aria-label="Delete ${escapeHtml(record.description)}" data-action="delete" data-type="${type}" data-id="${record.id}">${icon("close")}</button></div></td>
  </tr>`).join("");
  const tiles = invoice
    ? [["Total invoiced", records.reduce((s, r) => s + r.total, 0)], ["Paid", records.filter(r => r.status === "paid").reduce((s, r) => s + r.total, 0)], ["Awaiting payment", records.filter(r => r.status !== "paid").reduce((s, r) => s + r.total, 0)]]
    : [["All recorded supplier costs", allRecords("expense").reduce((s, r) => s + r.total, 0)], ["Paid expenses", allRecords("expense").filter(r => r.status === "paid").reduce((s, r) => s + r.total, 0)], ["Pending expenses", allRecords("expense").filter(r => r.status === "pending").reduce((s, r) => s + r.total, 0)]];
  return `<div class="summary-strip">${tiles.map(([label, total]) => `<div class="summary-tile"><span>${label}</span><strong>${money(total)}</strong></div>`).join("")}</div>
    <section class="table-panel"><div class="table-toolbar"><strong class="table-toolbar-title">All ${invoice ? "invoices" : "expenses"} <span class="muted-cell">(${records.length})</span></strong><div class="toolbar-controls"><select class="filter-select" id="status-filter" aria-label="Filter by status"><option value="all">All statuses</option>${statuses.map(s => `<option value="${s}" ${state.statusFilter === s ? "selected" : ""}>${s[0].toUpperCase() + s.slice(1)}</option>`).join("")}</select><button class="button button-secondary" data-action="export" data-type="${type}">${icon("download")} Export CSV</button></div></div>
      ${records.length ? `<div class="table-wrap"><table><thead><tr><th>Description</th><th>Reference</th><th>Date</th><th>Amount</th><th>Status</th><th>Actions</th></tr></thead><tbody>${rows}</tbody></table></div>` : emptyState(`No ${invoice ? "invoices" : "expenses"} found`, state.search ? "Try a different search or clear the status filter." : `Create your first ${invoice ? "invoice" : "expense"} to see it here.`, type)}
    </section>`;
}

function renderCustomers() {
  const customers = filtered(state.customers, "customer").sort((a, b) => a.name.localeCompare(b.name));
  const rows = customers.map(customer => {
    const purchases = customer.purchases || [];
    const recent = [...purchases].sort((a, b) => b.date.localeCompare(a.date))[0];
    return `<tr><td><div class="primary-cell"><strong>${escapeHtml(customer.name)}</strong><small>Added ${fmtDate(customer.createdAt.slice(0, 10))}</small></div></td><td>${escapeHtml(customer.phone || "—")}<div class="muted-cell">${escapeHtml(customer.email || "")}</div></td><td>${purchases.length} ${purchases.length === 1 ? "transaction" : "transactions"}<div class="muted-cell">${purchases.length ? escapeHtml(purchases.map(p => p.description).slice(0, 2).join(", ")) : "No purchases yet"}</div></td><td>${recent ? fmtDate(recent.date) : "—"}</td><td><div class="row-actions"><button class="row-action" aria-label="View ${escapeHtml(customer.name)}" data-action="view" data-type="customer" data-id="${customer.id}">${icon("arrow-up-right")}</button><button class="row-action" aria-label="Edit ${escapeHtml(customer.name)}" data-action="edit" data-type="customer" data-id="${customer.id}">${icon("settings")}</button><button class="row-action danger" aria-label="Delete ${escapeHtml(customer.name)}" data-action="delete" data-type="customer" data-id="${customer.id}">${icon("close")}</button></div></td></tr>`;
  }).join("");
  const currentMonth = isoDate(today).slice(0, 7);
  return `<div class="summary-strip"><div class="summary-tile"><span>Total customers</span><strong>${state.customers.length}</strong></div><div class="summary-tile"><span>With purchase history</span><strong>${state.customers.filter(c => c.purchases.length).length}</strong></div><div class="summary-tile"><span>Added this month</span><strong>${state.customers.filter(c => c.createdAt.slice(0, 7) === currentMonth).length}</strong></div></div>
    <section class="table-panel"><div class="table-toolbar"><strong class="table-toolbar-title">Customer directory <span class="muted-cell">(${customers.length})</span></strong><div class="toolbar-controls"><button class="button button-secondary" data-action="export" data-type="customer">${icon("download")} Export CSV</button></div></div>
      ${customers.length ? `<div class="table-wrap"><table><thead><tr><th>Customer</th><th>Contact</th><th>Purchase history</th><th>Last activity</th><th>Actions</th></tr></thead><tbody>${rows}</tbody></table></div>` : emptyState("No customers found", "Add a customer or create an invoice to sync details automatically.", "customer")}
    </section>`;
}

function renderInventory() {
  const items = filtered(state.inventory, "inventory").sort((a, b) => a.name.localeCompare(b.name));
  const rows = items.map(item => `<tr><td><div class="primary-cell"><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.description || item.category || "Uncategorised")}</small></div></td><td><span class="doc-number">${escapeHtml(item.sku || "—")}</span></td><td>${escapeHtml(item.category || "—")}</td><td>${item.quantity}</td><td>${money(item.unitPrice)}</td><td>${item.quantity <= 5 ? '<span class="status-badge status-overdue">Low stock</span>' : '<span class="status-badge status-active">In stock</span>'}</td><td><div class="row-actions"><button class="row-action" aria-label="Edit item" data-action="edit" data-type="inventory" data-id="${item.id}">${icon("settings")}</button><button class="row-action danger" aria-label="Delete item" data-action="delete" data-type="inventory" data-id="${item.id}">${icon("close")}</button></div></td></tr>`).join("");
  return `<div class="summary-strip"><div class="summary-tile"><span>Products tracked</span><strong>${state.inventory.length}</strong></div><div class="summary-tile"><span>Stock on hand</span><strong>${state.inventory.reduce((s, i) => s + i.quantity, 0)} units</strong></div><div class="summary-tile"><span>Estimated cost value</span><strong>${money(state.inventory.reduce((s, i) => s + i.quantity * i.costPrice, 0))}</strong></div></div>
    <section class="table-panel"><div class="table-toolbar"><strong class="table-toolbar-title">Products & items <span class="muted-cell">(${items.length})</span></strong><div class="toolbar-controls"><button class="button button-secondary" data-action="export" data-type="inventory">${icon("download")} Export CSV</button></div></div>
      ${items.length ? `<div class="table-wrap"><table><thead><tr><th>Item</th><th>SKU / reference</th><th>Category</th><th>Quantity</th><th>Unit price</th><th>Stock status</th><th>Actions</th></tr></thead><tbody>${rows}</tbody></table></div>` : emptyState("No inventory items", "Add your first item, or turn inventory off in Settings.", "inventory")}
    </section>`;
}

function reportRow(label, value) { return `<div class="report-row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`; }
function renderReports() {
  const invoices = allRecords("invoice"), expenses = allRecords("expense");
  const paidRevenue = invoices.filter(r => r.status === "paid").reduce((s, r) => s + r.total, 0);
  const outstanding = invoices.filter(r => r.status !== "paid").reduce((s, r) => s + r.total, 0);
  const paidExpenses = expenses.filter(r => r.status === "paid").reduce((s, r) => s + r.total, 0);
  const pendingExpenses = expenses.filter(r => r.status === "pending").reduce((s, r) => s + r.total, 0);
  const estimatedTax = [...invoices, ...expenses].filter(r => r.status !== "draft").reduce((s, r) => s + r.taxAmount, 0);
  const topCustomers = [...state.customers].map(c => ({ ...c, total: c.purchases.reduce((s, p) => s + p.amount, 0) })).sort((a, b) => b.total - a.total).slice(0, 4);
  const workflowHealth = [
    { label: "Paid invoices", value: invoices.filter(r => r.status === "paid").length },
    { label: "Awaiting approval", value: invoices.filter(r => ["draft", "pending"].includes(r.status)).length },
    { label: "Pending expenses", value: expenses.filter(r => r.status === "pending").length },
    { label: "Active members", value: state.members.filter(m => m.status === "Active").length }
  ];
  return `<div class="summary-strip"><div class="summary-tile"><span>Paid revenue</span><strong>${money(paidRevenue)}</strong></div><div class="summary-tile"><span>Outstanding invoices</span><strong>${money(outstanding)}</strong></div><div class="summary-tile"><span>Net after paid expenses</span><strong>${money(paidRevenue - paidExpenses)}</strong></div></div>
    <div class="report-grid">
      <section class="panel"><div class="panel-header"><div><h2 class="panel-title">Income & spending</h2><p class="panel-subtitle">Totals from saved sample records</p></div></div><div class="report-body">${reportRow("Paid invoices", money(paidRevenue))}${reportRow("Outstanding invoices", money(outstanding))}${reportRow("All recorded supplier costs", money(expenses.reduce((s, r) => s + r.total, 0)))}${reportRow("Paid expenses", money(paidExpenses))}${reportRow("Pending expenses", money(pendingExpenses))}</div></section>
      <section class="panel"><div class="panel-header"><div><h2 class="panel-title">Tax estimates</h2><p class="panel-subtitle">Rates saved with sample records</p></div></div><div class="report-body">${reportRow("Estimated tax across records", money(estimatedTax))}${reportRow("Invoice tax estimates", money(invoices.reduce((s, r) => s + r.taxAmount, 0)))}${reportRow("Expense tax estimates", money(expenses.reduce((s, r) => s + r.taxAmount, 0)))}<p class="disclaimer">Estimates only. This prototype does not submit tax information to KRA or eTIMS.</p></div></section>
      <section class="panel"><div class="panel-header"><div><h2 class="panel-title">Customer activity</h2><p class="panel-subtitle">Purchase totals from linked invoices</p></div></div><div class="report-body">${topCustomers.map(c => reportRow(c.name, money(c.total))).join("")}</div></section>
      ${state.inventoryEnabled ? `<section class="panel"><div class="panel-header"><div><h2 class="panel-title">Inventory snapshot</h2><p class="panel-subtitle">Optional stock tracking</p></div></div><div class="report-body">${reportRow("Items tracked", state.inventory.length)}${reportRow("Units on hand", state.inventory.reduce((s, i) => s + i.quantity, 0))}${reportRow("Estimated cost value", money(state.inventory.reduce((s, i) => s + i.quantity * i.costPrice, 0)))}</div></section>` : ""}
      <section class="panel"><div class="panel-header"><div><h2 class="panel-title">Workflow health</h2><p class="panel-subtitle">Operational signals for a small business workspace</p></div></div><div class="report-body">${workflowHealth.map(item => reportRow(item.label, item.value)).join("")}</div></section>
    </div><div style="margin-top:13px"><button class="button button-secondary" data-action="export" data-type="summary">${icon("download")} Export financial summary</button></div>`;
}

function renderTax() {
  const rate = Number(state.taxRate) || 0, amount = Math.max(0, Number(state.taxAmount) || 0);
  const tax = state.taxMode === "inclusive" ? amount * rate / (100 + rate) : amount * rate / 100;
  const net = state.taxMode === "inclusive" ? amount - tax : amount;
  const total = state.taxMode === "inclusive" ? amount : amount + tax;
  return `<div class="tax-layout"><section class="tax-card"><h2>Estimate a transaction</h2><p>Choose an amount and reference rate to see a simple estimate. Confirm the right treatment for each transaction.</p>
    <div class="form-grid"><div class="form-field"><label for="tax-amount">Amount (${state.currency})</label><input class="form-control" id="tax-amount" type="number" min="0" step="0.01" value="${amount}"></div>
    <div class="form-field"><label for="tax-rate">Reference rate</label><select class="form-control" id="tax-rate"><option value="16" ${rate === 16 ? "selected" : ""}>16% — Standard VAT reference</option><option value="8" ${rate === 8 ? "selected" : ""}>8% — Reduced-rate reference</option><option value="0" ${rate === 0 ? "selected" : ""}>0% — Zero-rated / exempt</option><option value="custom" ${![0, 8, 16].includes(rate) ? "selected" : ""}>Custom rate</option></select></div>
    ${![0, 8, 16].includes(rate) ? `<div class="form-field full"><label for="tax-custom-rate">Custom rate (%)</label><input class="form-control" id="tax-custom-rate" type="number" min="0" max="100" step="0.01" value="${rate}"></div>` : ""}
    <div class="form-field full"><label for="tax-mode">Amount entered</label><select class="form-control" id="tax-mode"><option value="exclusive" ${state.taxMode === "exclusive" ? "selected" : ""}>Before tax (exclusive)</option><option value="inclusive" ${state.taxMode === "inclusive" ? "selected" : ""}>Including tax (inclusive)</option></select></div></div>
    <div class="tax-result"><div class="tax-result-row"><span>Amount before tax</span><strong>${money(net)}</strong></div><div class="tax-result-row"><span>Estimated tax (${rate}%)</span><strong>${money(tax)}</strong></div><div class="tax-result-row total"><span>Estimated total</span><strong>${money(total)}</strong></div></div>
    <div class="disclaimer">Tax amounts are estimates based on the selected rate. Actual tax treatment depends on the transaction, registration status, applicable law and current rules. Confirm tax obligations with a qualified tax professional. TENDO does not submit tax information to KRA or eTIMS.</div></section>
    <aside class="tax-card"><h2>Reference rates</h2><p>Starting points only—not a recommendation or determination of tax treatment.</p><div class="report-body" style="padding:0">${reportRow("Standard VAT reference", "16%")}${reportRow("Reduced-rate reference", "8%")}${reportRow("Zero-rated / exempt reference", "0%")}${reportRow("Custom", "Enter a rate")}</div><div class="disclaimer">Verify rate eligibility and current requirements with a qualified tax professional before recording transactions.</div></aside></div>`;
}

function renderSettings() {
  const permissionsMarkup = state.members.map(member => `
    <div class="member-card compact-member">
      <div class="member-header"><span class="member-avatar">${member.name.split(" ").map(part => part[0]).slice(0, 2).join("").toUpperCase()}</span><div><strong>${escapeHtml(member.name)}</strong><small>${escapeHtml(member.role)}</small></div></div>
      <div class="member-meta">
        <span>${escapeHtml(member.email || "No email")}</span>
        <span class="member-status ${member.status === "Active" ? "active" : "invited"}">${escapeHtml(member.status)}</span>
      </div>
      <div class="permission-row">${Object.entries(member.permissions || {}).map(([key, value]) => `<span class="permission-chip">${escapeHtml(key)}: ${escapeHtml(value)}</span>`).join("")}</div>
    </div>
  `).join("");
  const backendStateText = state.backendStatus === "connected" ? "Connected" : state.backendStatus === "checking" ? "Checking" : "Demo mode";
  const backendStateClass = state.backendStatus === "connected" ? "status-live" : "status-pending";
  return `<div class="settings-layout"><section class="settings-card"><h2>Business workspace</h2><p>Personalise the sample workspace. These changes are temporary and reset on refresh.</p>
    <div class="form-grid"><div class="form-field"><label for="business-name">Business name</label><input class="form-control" id="business-name" value="${escapeHtml(state.businessName)}"></div><div class="form-field"><label for="currency-select">Workspace currency</label><select class="form-control" id="currency-select"><option value="KES" ${state.currency === "KES" ? "selected" : ""}>KES — Kenyan shilling</option><option value="USD" ${state.currency === "USD" ? "selected" : ""}>USD — US dollar</option><option value="EUR" ${state.currency === "EUR" ? "selected" : ""}>EUR — Euro</option></select></div></div>
    <div class="setting-row"><div class="setting-copy"><strong>Inventory management</strong><small>Turn this off if your business does not track physical products.</small></div><input class="switch" id="inventory-toggle" type="checkbox" ${state.inventoryEnabled ? "checked" : ""} aria-label="Enable inventory management"></div>
    <div class="setting-row"><div class="setting-copy"><strong>Business profile</strong><small>${escapeHtml(state.businessProfile.businessType)} · ${escapeHtml(state.businessProfile.location)}</small></div><button class="button button-secondary" type="button" data-action="review-setup">Review setup</button></div>
    <div class="setting-row"><div class="setting-copy"><strong>Workspaces</strong><small>${state.workspaces.length} active workspaces in this demo</small></div><button class="button button-secondary" type="button" id="new-workspace">Add workspace</button></div>
    <div class="setting-row"><div class="setting-copy"><strong>Backend status</strong><small>${escapeHtml(state.backendMessage)}</small></div><div style="display:flex;align-items:center;gap:8px"><span class="status-badge ${backendStateClass}">${backendStateText}</span><button class="button button-secondary" type="button" data-action="sync-backend">Refresh</button></div></div>
    <div class="setting-row"><div class="setting-copy"><strong>Team access</strong><small>Role-based permissions and member ownership</small></div><button class="button button-secondary" type="button" data-action="open-member-manager">Manage members</button></div>
    <div class="setting-row"><div class="setting-copy"><strong>Data in this prototype</strong><small>Records are held in memory only. Do not enter real or sensitive business information.</small></div><span class="status-badge status-pending">Temporary</span></div>
    <button class="button button-primary" id="save-settings">${icon("check")} Save preferences</button></section>
    <aside class="settings-card prototype-card"><span class="metric-icon">${icon("spark")}</span><strong>Prototype, not a live service</strong><p>This standalone interface has no sign-in, backend, database, tenant isolation, or subscription processing. Sample data is fictional and changes reset when you refresh.</p>
      <div class="role-list">${["Owner", "Admin", "Accountant", "Sales lead", "Viewer"].map(role => `<span class="role-pill">${role}</span>`).join("")}</div>
      <div class="workspace-permissions">
        <h3>Current permissions</h3>
        ${permissionsMarkup}
      </div>
    </aside></div>`;
}

async function refreshBackendStatus() {
  state.backendStatus = "checking";
  state.backendMessage = "Checking backend...";
  const pageContent = document.getElementById("page-content");
  if (pageContent && state.page === "settings") pageContent.innerHTML = renderSettings();

  const candidateBases = getBackendCandidates();
  let lastError = null;

  for (const baseUrl of candidateBases) {
    const healthUrl = `${baseUrl.replace(/\/$/, "")}/health`;
    try {
      const response = await fetch(healthUrl, { cache: "no-store" });
      if (!response.ok) throw new Error("Health endpoint unavailable");
      const health = await response.json();
      const host = new URL(healthUrl).host;
      state.backendStatus = "connected";
      state.backendMessage = `${health.service || "TENDO backend"} is live on ${host}`;
      if (pageContent && state.page === "settings") pageContent.innerHTML = renderSettings();
      return;
    } catch (error) {
      lastError = error;
    }
  }

  const fallbackHost = candidateBases[0] ? new URL(`${candidateBases[0].replace(/\/$/, "")}/health`).host : "localhost:3100";
  state.backendStatus = "offline";
  state.backendMessage = `Local prototype mode. Backend not reachable on ${fallbackHost}.`;

  if (pageContent && state.page === "settings") pageContent.innerHTML = renderSettings();
}

function emptyState(title, text, type) {
  const name = type === "inventory" ? "item" : type;
  return `<div class="empty-state"><span class="metric-icon">${icon(type === "invoice" ? "file" : type === "expense" ? "receipt" : type === "customer" ? "users" : "box")}</span><strong>${title}</strong><p>${text}</p>${state.search ? "" : `<button class="button button-secondary" data-action="new" data-type="${type}">${icon("plus")} Add ${name}</button>`}</div>`;
}

function makeId(prefix) {
  const unique = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${unique}`;
}

function updateCustomerFromInvoice(invoice) {
  state.customers.forEach(customer => { customer.purchases = customer.purchases.filter(p => p.sourceId !== invoice.id); });
  if (!invoice.customer.trim()) {
    delete invoice.customerId;
    return;
  }
  const name = invoice.customer.trim();
  const normalizedName = name.toLocaleLowerCase().replace(/\s+/g, " ");
  const phone = invoice.customerPhone.trim();
  const normalizedPhone = phone.replace(/\D/g, "");
  let match = normalizedPhone ? state.customers.find(c => c.phone.replace(/\D/g, "") === normalizedPhone) : null;
  if (!match) {
    match = state.customers.find(c => {
      if (c.name.toLocaleLowerCase().replace(/\s+/g, " ") !== normalizedName) return false;
      const oldPhone = c.phone.replace(/\D/g, "");
      return !normalizedPhone || !oldPhone || oldPhone === normalizedPhone;
    });
  }
  if (!match && invoice.customerId) match = state.customers.find(c => c.id === invoice.customerId);
  if (!match) {
    match = { id: makeId("customer"), name, phone: "", email: "", notes: "", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), purchases: [] };
    state.customers.push(match);
  }
  invoice.customerId = match.id;
  match.name = name;
  if (phone) match.phone = phone;
  if (invoice.customerEmail.trim()) match.email = invoice.customerEmail.trim();
  match.updatedAt = new Date().toISOString();
  match.purchases.push({ sourceId: invoice.id, date: invoice.date, description: invoice.items || invoice.description, amount: invoice.total });
}

function openForm(type, record = null) {
  const customer = type === "customer", expense = type === "expense", inventory = type === "inventory";
  const title = record ? `Edit ${type}` : type === "invoice" ? "Create invoice" : expense ? "Record an expense" : customer ? "Add customer" : "Add inventory item";
  const value = record || {};
  const fields = customer ? `
    <div class="form-field"><label for="field-name">Customer name *</label><input class="form-control" name="name" id="field-name" required value="${escapeHtml(value.name)}"></div>
    <div class="form-field"><label for="field-phone">Phone / contact</label><input class="form-control" name="phone" id="field-phone" value="${escapeHtml(value.phone)}"></div>
    <div class="form-field"><label for="field-email">Email</label><input class="form-control" name="email" id="field-email" type="email" value="${escapeHtml(value.email)}"></div>
    <div class="form-field full"><label for="field-notes">Notes</label><textarea class="form-control" name="notes" id="field-notes">${escapeHtml(value.notes)}</textarea></div>` : inventory ? `
    <div class="form-field"><label for="field-name">Item name *</label><input class="form-control" name="name" id="field-name" required value="${escapeHtml(value.name)}"></div>
    <div class="form-field"><label for="field-sku">SKU / reference</label><input class="form-control" name="sku" id="field-sku" value="${escapeHtml(value.sku)}"></div>
    <div class="form-field"><label for="field-category">Category</label><input class="form-control" name="category" id="field-category" value="${escapeHtml(value.category)}"></div>
    <div class="form-field"><label for="field-quantity">Quantity</label><input class="form-control" name="quantity" id="field-quantity" type="number" min="0" step="1" value="${value.quantity ?? 0}"></div>
    <div class="form-field"><label for="field-unit-price">Unit price (${state.currency})</label><input class="form-control" name="unitPrice" id="field-unit-price" type="number" min="0" step="0.01" value="${value.unitPrice ?? 0}"></div>
    <div class="form-field"><label for="field-cost-price">Cost price (${state.currency})</label><input class="form-control" name="costPrice" id="field-cost-price" type="number" min="0" step="0.01" value="${value.costPrice ?? 0}"></div>
    <div class="form-field full"><label for="field-notes">Notes</label><textarea class="form-control" name="notes" id="field-notes">${escapeHtml(value.notes)}</textarea></div>` : `
    <div class="form-field full"><label for="field-description">${expense ? "Expense description" : "Invoice description"} *</label><input class="form-control" name="description" id="field-description" required value="${escapeHtml(value.description)}"></div>
    ${expense ? `<div class="form-field"><label for="field-supplier">Supplier / payee</label><input class="form-control" name="supplier" id="field-supplier" value="${escapeHtml(value.supplier)}"></div><div class="form-field"><label for="field-category">Category</label><input class="form-control" name="category" id="field-category" value="${escapeHtml(value.category)}"></div>` : `<div class="form-field"><label for="field-customer">Customer name</label><input class="form-control" name="customer" id="field-customer" value="${escapeHtml(value.customer)}" list="customer-options"><datalist id="customer-options">${state.customers.map(c => `<option value="${escapeHtml(c.name)}">`).join("")}</datalist></div><div class="form-field"><label for="field-phone">Customer phone / contact</label><input class="form-control" name="customerPhone" id="field-phone" value="${escapeHtml(value.customerPhone)}"></div><div class="form-field"><label for="field-email">Customer email</label><input class="form-control" name="customerEmail" id="field-email" type="email" value="${escapeHtml(value.customerEmail)}"></div><div class="form-field"><label for="field-items">Items / services</label><input class="form-control" name="items" id="field-items" value="${escapeHtml(value.items)}"></div>`}
    <div class="form-field"><label for="field-amount">Amount before tax (${state.currency}) *</label><input class="form-control" name="amount" id="field-amount" type="number" min="0" step="0.01" required value="${value.amount ?? ""}"></div>
    <div class="form-field"><label for="field-tax-rate">Tax rate (%)</label><select class="form-control" name="taxRate" id="field-tax-rate"><option value="16" ${Number(value.taxRate ?? 16) === 16 ? "selected" : ""}>16% reference</option><option value="8" ${Number(value.taxRate) === 8 ? "selected" : ""}>8% reference</option><option value="0" ${Number(value.taxRate) === 0 ? "selected" : ""}>0% reference</option><option value="custom" ${![0, 8, 16].includes(Number(value.taxRate ?? 16)) ? "selected" : ""}>Custom</option></select></div>
    <div class="form-field full" id="custom-tax-field" ${![0, 8, 16].includes(Number(value.taxRate ?? 16)) ? "" : "hidden"}><label for="field-custom-tax">Custom rate (%)</label><input class="form-control" name="customTaxRate" id="field-custom-tax" type="number" min="0" max="100" step="0.01" value="${![0, 8, 16].includes(Number(value.taxRate ?? 16)) ? Number(value.taxRate) : ""}"></div>
    <div class="form-field"><label for="field-date">Date *</label><input class="form-control" name="date" id="field-date" type="date" required value="${escapeHtml(value.date || isoDate(today))}"></div>
    ${expense ? `<div class="form-field"><label for="field-status">Status</label><select class="form-control" name="status" id="field-status">${["recorded", "pending", "paid"].map(s => `<option value="${s}" ${(value.status || "recorded") === s ? "selected" : ""}>${s[0].toUpperCase() + s.slice(1)}</option>`).join("")}</select></div>` : `<div class="form-field"><label for="field-due-date">Due date</label><input class="form-control" name="dueDate" id="field-due-date" type="date" value="${escapeHtml(value.dueDate)}"></div><div class="form-field"><label for="field-status">Status</label><select class="form-control" name="status" id="field-status">${["draft", "pending", "paid", "overdue"].map(s => `<option value="${s}" ${(value.status || "pending") === s ? "selected" : ""}>${s[0].toUpperCase() + s.slice(1)}</option>`).join("")}</select></div>`}
    <div class="form-field full"><label for="field-notes">Notes</label><textarea class="form-control" name="notes" id="field-notes">${escapeHtml(value.notes)}</textarea></div>`;
  $("#dialog-content").innerHTML = `<form id="record-form" data-type="${type}" data-id="${record?.id || ""}"><div class="dialog-header"><div><h2 id="dialog-title">${title}</h2><p>Fields marked * are required. Tax rates are estimates only.</p></div><button type="button" class="icon-button" data-action="close-dialog" aria-label="Close">${icon("close")}</button></div><div class="dialog-body"><div class="form-grid">${fields}</div></div><div class="dialog-footer"><button type="button" class="button button-secondary" data-action="close-dialog">Cancel</button><button class="button button-primary" type="submit">${icon("check")} ${record ? "Save changes" : "Save record"}</button></div></form>`;
  $("#record-dialog").showModal();
  (customer || inventory ? $("#field-name") : $("#field-amount"))?.focus();
}

function makeRecordFromForm(form) {
  const type = form.dataset.type, id = form.dataset.id, data = Object.fromEntries(new FormData(form).entries());
  const existing = id ? findRecord(type, id) : null, now = new Date().toISOString();
  if (type === "invoice" || type === "expense") {
    const amount = Number(data.amount), rate = data.taxRate === "custom" ? (data.customTaxRate.trim() === "" ? NaN : Number(data.customTaxRate)) : Number(data.taxRate);
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) return showToast("Enter a valid tax rate between 0 and 100.", "error");
    const taxAmount = Math.round(amount * rate) / 100;
    const recordId = existing?.id || makeId(type);
    const documentNumber = existing?.documentNumber || `${type === "invoice" ? "INV" : "EXP"}-${data.date.slice(0, 4)}-${recordIdSuffix(recordId)}`;
    const next = { ...(existing || {}), id: recordId, documentNumber, type, description: data.description.trim(), amount, taxRate: rate, taxAmount, total: amount + taxAmount, date: data.date, status: data.status, notes: data.notes.trim(), createdAt: existing?.createdAt || now, updatedAt: now };
    if (type === "invoice") Object.assign(next, { customer: (data.customer || "").trim(), customerPhone: (data.customerPhone || "").trim(), customerEmail: (data.customerEmail || "").trim(), items: (data.items || "").trim(), dueDate: data.dueDate || "" });
    else Object.assign(next, { supplier: (data.supplier || "").trim(), category: (data.category || "").trim() });
    if (existing) state.records[state.records.findIndex(record => record.id === id)] = next;
    else state.records.push(next);
    if (type === "invoice") updateCustomerFromInvoice(next);
    showToast(existing ? "Record updated." : `${type === "invoice" ? "Invoice" : "Expense"} saved.`);
  } else if (type === "customer") {
    const next = { ...(existing || {}), id: existing?.id || makeId("customer"), name: data.name.trim(), phone: data.phone.trim(), email: data.email.trim(), notes: data.notes.trim(), createdAt: existing?.createdAt || now, updatedAt: now, purchases: existing?.purchases || [] };
    if (existing) state.customers[state.customers.findIndex(c => c.id === id)] = next;
    else state.customers.push(next);
    showToast(existing ? "Customer updated." : "Customer added.");
  } else {
    const next = { ...(existing || {}), id: existing?.id || makeId("item"), name: data.name.trim(), sku: data.sku.trim(), category: data.category.trim(), quantity: Number(data.quantity) || 0, unitPrice: Number(data.unitPrice) || 0, costPrice: Number(data.costPrice) || 0, notes: data.notes.trim() };
    if (existing) state.inventory[state.inventory.findIndex(i => i.id === id)] = next;
    else state.inventory.push(next);
    showToast(existing ? "Inventory item updated." : "Inventory item added.");
  }
  $("#record-dialog").close();
  navigate(state.page);
}

function findRecord(type, id) {
  return type === "customer" ? state.customers.find(c => c.id === id)
    : type === "inventory" ? state.inventory.find(i => i.id === id)
      : state.records.find(r => r.id === id && r.type === type);
}
function detail(label, value) { return `<div class="detail-item"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`; }

function viewRecord(type, record) {
  if (type === "customer") {
    const purchases = record.purchases || [];
    const history = purchases.length ? purchases.map(p => `${fmtDate(p.date)} · ${p.description} · ${money(p.amount)}`).join("\n") : "No purchases recorded";
    $("#dialog-content").innerHTML = `<div class="dialog-header"><div><h2 id="dialog-title">${escapeHtml(record.name)}</h2><p>Customer profile · added ${fmtDate(record.createdAt.slice(0, 10))}</p></div><button class="icon-button" data-action="close-dialog" aria-label="Close">${icon("close")}</button></div><div class="dialog-body"><div class="details-list">${detail("Phone", record.phone || "—")}${detail("Email", record.email || "—")}${detail("Transactions", purchases.length)}${detail("Last activity", purchases.length ? fmtDate(purchases[purchases.length - 1].date) : "—")}${detail("Purchase history", history)}${detail("Notes", record.notes || "—")}</div></div><div class="dialog-footer"><button class="button button-secondary" data-action="close-dialog">Close</button><button class="button button-primary" data-action="edit" data-type="customer" data-id="${record.id}">Edit customer</button></div>`;
  } else if (type === "inventory") {
    $("#dialog-content").innerHTML = `<div class="dialog-header"><div><h2 id="dialog-title">${escapeHtml(record.name)}</h2><p>Inventory item · ${escapeHtml(record.sku || "No SKU")}</p></div><button class="icon-button" data-action="close-dialog" aria-label="Close">${icon("close")}</button></div><div class="dialog-body"><div class="details-list">${detail("Category", record.category || "—")}${detail("Quantity", record.quantity)}${detail("Unit price", money(record.unitPrice))}${detail("Cost price", money(record.costPrice))}${detail("Notes", record.notes || "—")}</div></div>`;
  } else {
    $("#dialog-content").innerHTML = `<div class="dialog-header"><div><h2 id="dialog-title">${escapeHtml(record.description)}</h2><p>${docType(record)} · ${docNumber(record)}</p></div><button class="icon-button" data-action="close-dialog" aria-label="Close">${icon("close")}</button></div><div class="dialog-body"><div class="details-list">${detail("Date", fmtDate(record.date))}${detail("Status", record.status)}${detail(type === "invoice" ? "Customer" : "Supplier", type === "invoice" ? record.customer || "—" : record.supplier || "—")}${detail("Amount before tax", money(record.amount))}${detail("Tax estimate", `${money(record.taxAmount)} (${record.taxRate}%)`)}${detail("Total", money(record.total))}${detail("Items / category", type === "invoice" ? record.items || "—" : record.category || "—")}${detail("Notes", record.notes || "—")}</div></div><div class="dialog-footer"><button class="button button-secondary" data-action="close-dialog">Close</button><button class="button button-primary" data-action="edit" data-type="${type}" data-id="${record.id}">Edit record</button></div>`;
  }
  $("#record-dialog").showModal();
}

function deleteRecord(type, id) {
  const record = findRecord(type, id);
  if (!record) return;
  if (type === "customer" && record.purchases.length && !confirm(`This customer has ${record.purchases.length} linked transaction(s). Delete the profile? The business records will remain.`)) return;
  if (type !== "customer" && !confirm(`Delete "${type === "inventory" ? record.name : record.description}"? This cannot be undone in this prototype.`)) return;
  if (type === "customer") state.customers = state.customers.filter(item => item.id !== id);
  else if (type === "inventory") state.inventory = state.inventory.filter(item => item.id !== id);
  else {
    state.records = state.records.filter(item => item.id !== id);
    state.customers.forEach(customer => { customer.purchases = customer.purchases.filter(p => p.sourceId !== id); });
  }
  showToast("Record deleted.");
  navigate(state.page);
}

function exportCsv(type) {
  let rows;
  if (type === "invoice" || type === "expense") rows = allRecords(type).map(r => ({ document_number: docNumber(r), document_type: docType(r), description: r.description, customer_or_supplier: r.customer || r.supplier || "", amount_before_tax: r.amount, tax_rate: r.taxRate, tax_estimate: r.taxAmount, total: r.total, date: r.date, status: r.status }));
  else if (type === "customer") rows = state.customers.map(c => ({ name: c.name, phone: c.phone, email: c.email, transactions: c.purchases.length, notes: c.notes }));
  else if (type === "inventory") rows = state.inventory.map(i => ({ name: i.name, sku: i.sku, category: i.category, quantity: i.quantity, unit_price: i.unitPrice, cost_price: i.costPrice }));
  else rows = [
    { metric: "Paid revenue", amount: allRecords("invoice").filter(r => r.status === "paid").reduce((s, r) => s + r.total, 0) },
    { metric: "Outstanding invoices", amount: allRecords("invoice").filter(r => r.status !== "paid").reduce((s, r) => s + r.total, 0) },
    { metric: "All recorded supplier costs", amount: allRecords("expense").reduce((s, r) => s + r.total, 0) },
    { metric: "Paid expenses", amount: allRecords("expense").filter(r => r.status === "paid").reduce((s, r) => s + r.total, 0) }
  ];
  const headers = [...new Set(rows.flatMap(row => Object.keys(row)))];
  const csv = [headers, ...rows.map(row => headers.map(header => row[header] ?? ""))].map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
  link.download = `tendo-${type}s-${isoDate(today)}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
  showToast("CSV export downloaded.");
}

function invoiceMarkup(record) {
  return `<article class="invoice-document"><div class="invoice-document-head"><div><h2>${escapeHtml(state.businessName)}</h2><small>Business, in order.</small></div><div style="text-align:right"><h2>INVOICE</h2><strong>${docNumber(record)}</strong><br><small>${fmtDate(record.date)}</small></div></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:25px;margin:22px 0"><div><small>BILLED TO</small><p><strong>${escapeHtml(record.customer || "Customer")}</strong><br>${escapeHtml(record.customerPhone || "")}<br>${escapeHtml(record.customerEmail || "")}</p></div><div><small>STATUS</small><p>${escapeHtml(record.status[0].toUpperCase() + record.status.slice(1))}${record.dueDate ? `<br>Due ${fmtDate(record.dueDate)}` : ""}</p></div></div><div class="report-row"><span>${escapeHtml(record.items || record.description)}</span><strong>${money(record.amount)}</strong></div><div class="report-row"><span>Amount before tax</span><strong>${money(record.amount)}</strong></div><div class="report-row"><span>Estimated tax (${record.taxRate}%)</span><strong>${money(record.taxAmount)}</strong></div><div class="invoice-document-total"><span>Total due</span><strong>${money(record.total)}</strong></div>${record.notes ? `<p><strong>Notes</strong><br>${escapeHtml(record.notes)}</p>` : ""}<p style="margin-top:28px;padding-top:12px;border-top:1px solid #e6e9ed;font-size:9px">Generated by TENDO. This document is a business record and is not an eTIMS/KRA-issued document.</p></article>`;
}
function printInvoice(record) {
  $("#print-root").innerHTML = invoiceMarkup(record);
  window.print();
  setTimeout(() => { $("#print-root").innerHTML = ""; }, 1000);
}
async function shareInvoice(record) {
  const text = `${docNumber(record)} — ${record.description}\nCustomer: ${record.customer || "—"}\nTotal: ${money(record.total)}\nStatus: ${record.status}\nGenerated by TENDO. This is not an eTIMS/KRA-issued document.`;
  try {
    if (navigator.share) await navigator.share({ title: docNumber(record), text });
    else if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); showToast("Invoice details copied to clipboard."); }
    else showToast("Sharing is unavailable in this browser.", "error");
  } catch (error) {
    if (error?.name !== "AbortError") showToast("Could not share invoice details. Please try again.", "error");
  }
}

function closeMobileNav() {
  $("#sidebar").classList.remove("open");
  $("#mobile-backdrop").classList.remove("visible");
}

document.addEventListener("click", event => {
  if (!event.target.closest("#workspace-switcher") && !event.target.closest("#workspace-menu")) {
    const workspaceMenu = $("#workspace-menu");
    workspaceMenu?.classList.add("hidden");
  }
  const nav = event.target.closest("[data-nav]");
  if (nav) { event.preventDefault(); navigate(nav.dataset.nav); return; }
  const action = event.target.closest("[data-action]");
  if (action) {
    const { action: name, type, id } = action.dataset;
    if (name === "new") openForm(type);
    if (name === "edit") { const record = findRecord(type, id); if (record) { $("#record-dialog").close(); openForm(type, record); } }
    if (name === "view") { const record = findRecord(type, id); if (record) viewRecord(type, record); }
    if (name === "delete") deleteRecord(type, id);
    if (name === "close-dialog") $("#record-dialog").close();
    if (name === "close-setup") $("#setup-dialog").close();
    if (name === "export") exportCsv(type);
    if (name === "print") { const record = findRecord("invoice", id); if (record) printInvoice(record); }
    if (name === "share") { const record = findRecord("invoice", id); if (record) shareInvoice(record); }
    if (name === "review-setup") { openSetupWizard(); return; }
    if (name === "open-member-manager") { openMemberManager(); return; }
    if (name === "sync-backend") { refreshBackendStatus(); return; }
    if (name === "toggle-operation") {
      const entry = state.operations.find(item => item.id === id);
      if (!entry) return;
      entry.status = entry.status === "done" ? "in_progress" : "done";
      showToast(`${entry.title} updated.`);
      $("#page-content").innerHTML = renderPage();
      return;
    }
    if (name === "wizard-next") { const currentStep = Number(document.querySelector(".step-panel.active")?.dataset.stepPanel || 1); const nextStep = Math.min(currentStep + 1, 3); const target = document.querySelector(`.step-panel[data-step-panel="${nextStep}"]`); if (target) { document.querySelectorAll(".step-panel").forEach(panel => panel.classList.toggle("active", Number(panel.dataset.stepPanel) === nextStep)); updateWizardUI(); } }
    if (name === "wizard-prev") { const currentStep = Number(document.querySelector(".step-panel.active")?.dataset.stepPanel || 1); const prevStep = Math.max(currentStep - 1, 1); document.querySelectorAll(".step-panel").forEach(panel => panel.classList.toggle("active", Number(panel.dataset.stepPanel) === prevStep)); updateWizardUI(); }
    if (name === "approve-item") {
      const approval = state.approvals.find(item => item.id === id);
      if (!approval) return;
      const record = findRecord(approval.type, approval.recordId);
      if (record) {
        record.status = approval.type === "invoice" ? "paid" : "paid";
        record.updatedAt = new Date().toISOString();
      }
      state.approvals = state.approvals.filter(item => item.id !== id);
      showToast("Approval recorded.");
      navigate(state.page || "overview");
    }
    if (name === "reject-item") {
      const approval = state.approvals.find(item => item.id === id);
      if (!approval) return;
      const record = findRecord(approval.type, approval.recordId);
      if (record) {
        record.status = approval.type === "invoice" ? "draft" : "recorded";
        record.updatedAt = new Date().toISOString();
      }
      state.approvals = state.approvals.filter(item => item.id !== id);
      showToast("Item sent back for revision.");
      navigate(state.page || "overview");
    }
    if (name === "add-member") {
      const nextIndex = state.members.length + 1;
      state.members.push({ id: `member-${Date.now()}`, name: `New member ${nextIndex}`, role: "Viewer", email: `member${nextIndex}@example.test`, status: "Invited", permissions: { invoices: "view", expenses: "view", customers: "view", inventory: "view", reports: "view", settings: "none" } });
      openMemberManager();
    }
    if (name === "hide-onboarding") {
      state.onboardingSkipped = true;
      state.onboardingComplete = false;
      $("#page-content").innerHTML = renderPage();
    }
    if (name === "show-onboarding") {
      state.onboardingSkipped = false;
      state.onboardingComplete = false;
      $("#page-content").innerHTML = renderPage();
      openSetupWizard();
    }
  }
  if (event.target.closest("#new-record")) {
    openForm(state.page === "expenses" ? "expense" : state.page === "customers" ? "customer" : state.page === "inventory" ? "inventory" : "invoice");
  }
  if (event.target.closest("#workspace-switcher")) {
    const menu = $("#workspace-menu");
    menu.classList.toggle("hidden");
    return;
  }
  if (event.target.closest("[data-workspace-id]")) {
    const workspaceId = event.target.closest("[data-workspace-id]").dataset.workspaceId;
    if (workspaceId) {
      state.currentWorkspaceId = workspaceId;
      syncCurrentWorkspace();
      $("#workspace-menu").classList.add("hidden");
      $("#workspace-name").textContent = state.businessName;
      showToast(`Switched to ${state.businessName}.`);
      navigate(state.page);
    }
    return;
  }
  if (event.target.closest("#mobile-menu")) { $("#sidebar").classList.add("open"); $("#mobile-backdrop").classList.add("visible"); }
  if (event.target.id === "mobile-backdrop") closeMobileNav();
  if (event.target.closest("#save-settings")) {
    const name = $("#business-name").value.trim();
    if (!name) return showToast("Add a business name before saving.", "error");
    const workspace = getCurrentWorkspace();
    workspace.name = name;
    state.businessName = name;
    state.currency = $("#currency-select").value;
    showToast("Preferences updated for this session.");
    navigate("settings");
  }
  if (event.target.closest("#new-workspace")) {
    const nextIndex = state.workspaces.length + 1;
    const newWorkspace = {
      id: `workspace-${Date.now()}`,
      name: `Workspace ${nextIndex}`,
      type: "Business unit",
      profile: {
        businessType: "Business unit",
        businessEmail: "",
        businessPhone: "",
        location: "",
        address: "",
        taxConfig: "",
        registration: ""
      }
    };
    state.workspaces.push(newWorkspace);
    state.currentWorkspaceId = newWorkspace.id;
    syncCurrentWorkspace();
    navigate("settings");
    showToast("New workspace created.");
  }
});

document.addEventListener("submit", event => {
  if (event.target.id === "record-form") { event.preventDefault(); makeRecordFromForm(event.target); }
  if (event.target.id === "onboarding-form") {
    event.preventDefault();
    const formData = Object.fromEntries(new FormData(event.target).entries());
    const nextBusinessName = String(formData.businessName || "").trim();
    if (!nextBusinessName) return showToast("Add a business name to finish setup.", "error");
    const workspace = getCurrentWorkspace();
    workspace.name = nextBusinessName;
    state.businessName = nextBusinessName;
    workspace.profile = {
      businessType: String(formData.businessType || state.businessProfile.businessType).trim(),
      businessEmail: String(formData.businessEmail || "").trim(),
      businessPhone: String(formData.businessPhone || "").trim(),
      location: String(formData.location || "").trim(),
      address: String(formData.address || "").trim(),
      taxConfig: String(formData.taxConfig || state.businessProfile.taxConfig).trim(),
      registration: String(formData.registration || state.businessProfile.registration).trim()
    };
    state.businessProfile = { ...workspace.profile };
    state.onboardingComplete = true;
    state.onboardingSkipped = false;
    showToast("Workspace setup saved.");
    navigate("overview");
  }
  if (event.target.id === "setup-form") {
    event.preventDefault();
    const formData = Object.fromEntries(new FormData(event.target).entries());
    const nextBusinessName = String(formData.businessName || "").trim();
    if (!nextBusinessName) return showToast("Add a business name before saving the workspace.", "error");
    const workspace = getCurrentWorkspace();
    workspace.name = nextBusinessName;
    workspace.type = String(formData.businessType || workspace.type || "Business").trim();
    workspace.profile = {
      businessType: String(formData.businessType || workspace.profile?.businessType || "Business").trim(),
      businessEmail: String(formData.businessEmail || "").trim(),
      businessPhone: String(formData.businessPhone || "").trim(),
      location: String(formData.location || "").trim(),
      address: String(formData.address || "").trim(),
      taxConfig: String(formData.taxConfig || "").trim(),
      registration: String(formData.registration || "").trim()
    };
    state.businessName = workspace.name;
    state.businessProfile = { ...workspace.profile };
    state.onboardingComplete = true;
    state.onboardingSkipped = false;
    $("#setup-dialog").close();
    navigate(state.page || "overview");
    showToast("Workspace profile updated.");
  }
  if (event.target.id === "member-form") {
    event.preventDefault();
    $("#setup-dialog").close();
    showToast("Access permissions saved.");
    navigate("settings");
  }
});

document.addEventListener("change", event => {
  const target = event.target;
  if (target.id === "status-filter") { state.statusFilter = target.value; $("#page-content").innerHTML = renderPage(); }
  if (target.matches('[data-action="change-status"]')) {
    const record = findRecord(target.dataset.type, target.dataset.id);
    if (record) {
      record.status = target.value;
      record.updatedAt = new Date().toISOString();
      showToast("Status updated. Document number remains unchanged.");
      $("#page-content").innerHTML = renderPage();
    }
  }
  if (target.matches("[data-member-role]")) {
    const member = state.members.find(item => item.id === target.dataset.memberRole);
    if (member) member.role = target.value;
  }
  if (target.matches("[data-member-status]")) {
    const member = state.members.find(item => item.id === target.dataset.memberStatus);
    if (member) member.status = target.value;
  }
  if (target.matches("[data-member-permission]")) {
    const member = state.members.find(item => item.id === target.dataset.memberId);
    if (member) {
      member.permissions = member.permissions || {};
      member.permissions[target.dataset.scope] = target.value;
    }
  }
  if (target.id === "tax-rate") { state.taxRate = target.value === "custom" ? 5 : Number(target.value); $("#page-content").innerHTML = renderTax(); }
  if (target.id === "tax-mode") { state.taxMode = target.value; $("#page-content").innerHTML = renderTax(); }
  if (target.id === "field-tax-rate") {
    const customField = $("#custom-tax-field");
    customField.hidden = target.value !== "custom";
    if (target.value === "custom") $("#field-custom-tax").focus();
  }
  if (target.id === "inventory-toggle") {
    state.inventoryEnabled = target.checked;
    const inventoryNav = document.querySelector('[data-nav="inventory"]');
    inventoryNav.hidden = !target.checked;
    if (!target.checked && state.page === "inventory") navigate("overview");
    else $("#page-content").innerHTML = renderPage();
  }
  if (target.id === "currency-select") { state.currency = target.value; $("#page-content").innerHTML = renderSettings(); }
});

document.addEventListener("input", event => {
  const target = event.target;
  if (target.id === "search-input") {
    state.search = target.value;
    const cursor = target.selectionStart;
    $("#page-content").innerHTML = renderPage();
    target.focus();
    target.setSelectionRange(cursor, cursor);
  }
  if (target.id === "tax-amount" || target.id === "tax-custom-rate") {
    state[target.id === "tax-amount" ? "taxAmount" : "taxRate"] = Number(target.value) || 0;
    const cursor = target.selectionStart;
    $("#page-content").innerHTML = renderTax();
    const input = $(target.id === "tax-amount" ? "#tax-amount" : "#tax-custom-rate");
    input?.focus();
    input?.setSelectionRange(cursor, cursor);
  }
});

document.addEventListener("keydown", event => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); $("#search-input").focus(); }
  if (event.key === "Escape") closeMobileNav();
});
$("#record-dialog").addEventListener("click", event => { if (event.target === $("#record-dialog")) $("#record-dialog").close(); });

syncCurrentWorkspace();
$("#workspace-name").textContent = state.businessName;
$("#workspace-menu").innerHTML = renderWorkspaceMenu();
document.querySelector('[data-nav="inventory"]').hidden = !state.inventoryEnabled;
refreshBackendStatus().catch(() => {});
navigate("overview");
