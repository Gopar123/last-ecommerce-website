import './style.css';

// DATA

const DEFAULT_PRODUCTS = [
  { 
    id: 101, 
    name: "Ergonomic Wireless Mouse", 
    price: 29000.99, 
    originalPrice: 45000, 
    rating: 4.6, 
    sold: 1240, 
    category: "Electronics",
    image: "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&w=600&q=80" 
  },
  { 
    id: 102, 
    name: "Mechanical Gaming Keyboard", 
    price: 89000.99, 
    originalPrice: 129000, 
    rating: 4.8, 
    sold: 860, 
    category: "Electronics",
    image: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=600&q=80" 
  },
  { 
    id: 103, 
    name: "UltraWide 4K Monitor", 
    price: 349000.50, 
    originalPrice: 420000, 
    rating: 4.7, 
    sold: 210, 
    category: "Electronics",
    image: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=600&q=80" 
  },
  { 
    id: 104, 
    name: "Samsung Tv", 
    price: 890000.99, 
    originalPrice: 1050000, 
    rating: 4.5, 
    sold: 96, 
    category: "Home & Living",
    image: "https://images.unsplash.com/photo-1593784991095-a205069470b6?auto=format&fit=crop&w=600&q=80" 
  },
  { 
    id: 105, 
    name: "Pixel 7 Pro", 
    price: 500000.00, 
    originalPrice: 580000, 
    rating: 4.9, 
    sold: 530, 
    category: "Mobile & Tablets",
    image: "https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=600&q=80" 
  },
  { 
    id: 106, 
    name: "Bluetooth Earbuds Pro", 
    price: 15000, 
    originalPrice: 32000, 
    rating: 4.4, 
    sold: 3400, 
    category: "Electronics",
    image: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=600&q=80" 
  },
  { 
    id: 107, 
    name: "Non-Stick Cookware Set (6pc)", 
    price: 42000, 
    originalPrice: 60000, 
    rating: 4.6, 
    sold: 780, 
    category: "Home & Living",
    image: "https://images.unsplash.com/photo-1584992236310-6edddc08acff?auto=format&fit=crop&w=600&q=80" 
  },
  { 
    id: 108, 
    name: "Men's Windbreaker Jacket", 
    price: 18500, 
    originalPrice: 27000, 
    rating: 4.3, 
    sold: 2100, 
    category: "Fashion",
    image: "https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=600&q=80" 
  }
];

const CATEGORIES = ["All", "Electronics", "Mobile & Tablets", "Home & Living", "Fashion"];
const STAFF_PASSCODE_HASH = "dab4455d1a38292c6fe843162c490bc68c310a1095fe31f740f0d75905ced495";

function formatPrice(price) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(price);
}

async function sha256Hex(text) {
  if (!window.crypto || !window.crypto.subtle) {
    throw new Error("Web Crypto API is unavailable in this context.");
  }
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// STATE

let products = JSON.parse(localStorage.getItem('gstore_products')) || DEFAULT_PRODUCTS;
let users = JSON.parse(localStorage.getItem('gstore_users')) || {};
let currentUser = JSON.parse(localStorage.getItem('gstore_session')) || null;

let cart = [];
let activeCategory = "All";
let searchTerm = "";

// PERSISTENCE HELPERS

function saveProducts() {
  localStorage.setItem('gstore_products', JSON.stringify(products));
  renderStorefront();
  renderAdminInventory();
}

function saveUsers() {
  localStorage.setItem('gstore_users', JSON.stringify(users));
}

function cartKeyFor(user) {
  return user ? `gstore_cart__${user.email}` : 'gstore_cart__guest';
}

function loadCartForCurrentUser() {
  cart = JSON.parse(localStorage.getItem(cartKeyFor(currentUser))) || [];
}

function saveCart() {
  localStorage.setItem(cartKeyFor(currentUser), JSON.stringify(cart));
  renderCart();
}

function saveSession() {
  if (currentUser) {
    localStorage.setItem('gstore_session', JSON.stringify(currentUser));
  } else {
    localStorage.removeItem('gstore_session');
  }
  updateAuthUI();
}

// NAVIGATION & TOAST

function switchTab(tabName) {
  const storeTab = document.getElementById('tab-store');
  const cartTab = document.getElementById('tab-cart');
  const adminTab = document.getElementById('tab-admin');

  if (storeTab) storeTab.classList.add('hidden');
  if (cartTab) cartTab.classList.add('hidden');
  if (adminTab) adminTab.classList.add('hidden');

  if (tabName === 'admin') {
    if (!currentUser || currentUser.role !== 'admin') {
      showToast("Access denied — admins only.");
      switchTab('store');
      return;
    }
    renderAdminInventory();
    renderTeamPanel();
  }

  const targetTab = document.getElementById(`tab-${tabName}`);
  if (targetTab) targetTab.classList.remove('hidden');
}

function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.innerText = message;
  toast.classList.remove('hidden');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.add('hidden'), 3000);
}

// AUTH — Public signup (customers only)

function toggleAuthModal() {
  const modal = document.getElementById('auth-modal');
  if (!modal) return;
  modal.classList.toggle('hidden');
  modal.classList.toggle('flex');
}

function handleAuthSubmit(e) {
  if (e && e.preventDefault) e.preventDefault();

  const fullNameEl = document.getElementById('auth-fullname');
  const locationEl = document.getElementById('auth-location');
  const phoneEl = document.getElementById('auth-phone');
  const emailEl = document.getElementById('auth-email');
  const passwordEl = document.getElementById('auth-password');

  const fullName = fullNameEl?.value.trim() || '';
  const location = locationEl?.value.trim() || '';
  const phone = phoneEl?.value.trim() || '';
  const email = emailEl?.value.trim().toLowerCase() || '';
  const password = passwordEl?.value.trim() || '';

  if (!email || !password || !fullName) {
    showToast("Please fill in all required fields.");
    return;
  }

  const existingUser = users[email];
  const role = existingUser ? existingUser.role : 'customer';

  users[email] = {
    fullName,
    location,
    phone,
    email,
    password,
    role
  };

  saveUsers();
  logInAs(email, role);

  if (fullNameEl) fullNameEl.value = '';
  if (locationEl) locationEl.value = '';
  if (phoneEl) phoneEl.value = '';
  if (emailEl) emailEl.value = '';
  if (passwordEl) passwordEl.value = '';

  toggleAuthModal();
  showToast(`Welcome, ${fullName || email}!`);
}

// AUTH — Staff / admin sign-in

function toggleStaffModal() {
  const modal = document.getElementById('staff-modal');
  if (!modal) return;
  modal.classList.toggle('hidden');
  modal.classList.toggle('flex');
}

async function handleStaffSubmit(e) {
  if (e && e.preventDefault) e.preventDefault();
  
  const emailEl = document.getElementById('staff-email');
  const passcodeEl = document.getElementById('staff-passcode');

  if (!emailEl || !passcodeEl) {
    showToast("Form inputs not found.");
    return;
  }

  const email = emailEl.value.trim().toLowerCase();
  const passcode = passcodeEl.value.trim();

  if (!email || !passcode) {
    showToast("Please enter both staff email and passcode.");
    return;
  }

  let isValid = false;

  try {
    const enteredHash = await sha256Hex(passcode);
    isValid = (enteredHash === STAFF_PASSCODE_HASH);
  } catch (err) {
    console.warn("Crypto API fallback activated:", err.message);
    isValid = (passcode === "admin123");
  }

  if (!isValid) {
    showToast("Incorrect staff passcode.");
    return;
  }

  const existingProfile = users[email] || {};
  users[email] = { 
    ...existingProfile, 
    email, 
    role: 'admin' 
  };
  
  saveUsers();
  logInAs(email, 'admin');
  toggleStaffModal();
  passcodeEl.value = '';
  showToast(`Signed in as admin (${email}).`);
}

function promoteToAdmin(email) {
  if (!currentUser || currentUser.role !== 'admin') return;
  if (!users[email]) return;
  users[email].role = 'admin';
  saveUsers();
  renderTeamPanel();
  showToast(`${email} is now an admin.`);
}

function logInAs(email, role) {
  currentUser = { email, role };
  saveSession();
  loadCartForCurrentUser();
  renderCart();
  renderAdminInventory();
  renderTeamPanel();
}

function logout() {
  currentUser = null;
  saveSession();
  loadCartForCurrentUser();
  switchTab('store');
  renderCart();
  showToast("Logged out.");
}

function updateAuthUI() {
  const infoContainer = document.getElementById('nav-user-info');
  const authBtn = document.getElementById('auth-btn');
  const adminNavBtn = document.getElementById('admin-nav-btn');

  if (!authBtn || !adminNavBtn) return;

  if (currentUser) {
    const userProfile = users[currentUser.email];
    const displayName = userProfile && userProfile.fullName ? userProfile.fullName : currentUser.email;
    if (infoContainer) infoContainer.innerHTML = `<span class="opacity-80">${displayName}</span>`;
    authBtn.innerText = 'Logout';
    authBtn.onclick = logout;
    adminNavBtn.classList.toggle('hidden', currentUser.role !== 'admin');
  } else {
    if (infoContainer) infoContainer.innerHTML = '';
    authBtn.innerText = 'Log in / Sign up';
    authBtn.onclick = toggleAuthModal;
    adminNavBtn.classList.add('hidden');
  }
}

// STOREFRONT

function renderCategoryChips() {
  const rail = document.getElementById('category-rail');
  if (!rail) return;
  rail.innerHTML = CATEGORIES.map(cat => {
    const active = activeCategory === cat;
    const classes = active
      ? 'shrink-0 text-xs font-semibold px-3.5 py-1.5 rounded-full border border-[#E2231A] bg-[#E2231A] text-white whitespace-nowrap transition'
      : 'shrink-0 text-xs font-semibold px-3.5 py-1.5 rounded-full border border-stone-200 bg-white text-[#1C1B1A] hover:border-[#E2231A] whitespace-nowrap transition';
    return `<button onclick="setCategory('${cat}')" class="${classes}">${cat}</button>`;
  }).join('');
}

function setCategory(cat) {
  activeCategory = cat;
  renderCategoryChips();
  renderStorefront();
}

function setSearch(value) {
  searchTerm = value.trim().toLowerCase();
  renderStorefront();
}

function starString(rating) {
  const full = Math.round(rating);
  return '★'.repeat(full) + '☆'.repeat(5 - full);
}

function renderStorefront() {
  const grid = document.getElementById('product-grid');
  if (!grid) return;

  const visible = products.filter(p => {
    const matchesCategory = activeCategory === 'All' || p.category === activeCategory;
    const matchesSearch = !searchTerm || p.name.toLowerCase().includes(searchTerm);
    return matchesCategory && matchesSearch;
  });

  if (visible.length === 0) {
    grid.innerHTML = `<div class="col-span-full text-center py-16 text-stone-500">No products match "${searchTerm}" in ${activeCategory}.</div>`;
    return;
  }

  grid.innerHTML = visible.map(p => {
    const hasDiscount = p.originalPrice && p.originalPrice > p.price;
    const discountPct = hasDiscount ? Math.round((1 - p.price / p.originalPrice) * 100) : null;
    const fallbackImage = 'https://via.placeholder.com/300?text=No+Image';

    return `
    <div class="bg-white border border-stone-200 rounded-lg flex flex-col overflow-hidden hover:border-[#1C1B1A] transition">
      <div class="relative w-full aspect-square bg-stone-100 overflow-hidden">
        <img 
          src="${p.image || fallbackImage}" 
          alt="${p.name}" 
          class="w-full h-full object-cover object-center hover:scale-105 transition duration-300"
          onerror="this.src='${fallbackImage}'"
        />
        ${hasDiscount ? `<span class="absolute top-2 left-2 bg-[#FF7A1A] text-white text-[10px] font-bold px-2 py-0.5 rounded">-${discountPct}%</span>` : ''}
      </div>
      <div class="p-3 flex flex-col gap-1 grow">
        <h3 class="text-sm text-stone-800 leading-snug line-clamp-2">${p.name}</h3>
        <div class="flex items-baseline gap-2 mt-1">
          <span class="text-[#E2231A] font-bold text-lg">${formatPrice(p.price)}</span>
          ${hasDiscount ? `<span class="text-stone-400 text-xs line-through">${formatPrice(p.originalPrice)}</span>` : ''}
        </div>
        <div class="flex items-center justify-between text-xs text-stone-500 mt-1">
          <span class="text-[#FF7A1A] tracking-tight">${starString(p.rating || 0)}</span>
          <span>${(p.sold || 0).toLocaleString()} sold</span>
        </div>
      </div>
      <button onclick="addToCart(${p.id})" class="w-full bg-[#1C1B1A] hover:bg-[#E2231A] text-white font-semibold text-sm py-2 transition">
        Add to cart
      </button>
    </div>
  `;
  }).join('');
}

// CART

function addToCart(productId) {
  const product = products.find(p => p.id === productId);
  if (!product) return;

  const existingItem = cart.find(item => item.id === productId);
  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({ ...product, quantity: 1 });
  }

  saveCart();
  showToast(`Added "${product.name}" to cart.`);
}

function updateQuantity(productId, delta) {
  const item = cart.find(i => i.id === productId);
  if (item) {
    item.quantity += delta;
    if (item.quantity <= 0) {
      cart = cart.filter(i => i.id !== productId);
    }
  }
  saveCart();
}

function removeFromCart(productId) {
  cart = cart.filter(i => i.id !== productId);
  saveCart();
}

function renderCart() {
  const container = document.getElementById('cart-items-container');
  const badge = document.getElementById('cart-count-badge');
  const totalPriceEl = document.getElementById('cart-total-price');
  const checkoutBtn = document.getElementById('checkout-btn');
  const authWarning = document.getElementById('checkout-auth-warning');

  if (!container || !totalPriceEl || !checkoutBtn || !authWarning) return;

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  if (badge) badge.innerText = totalItems;

  if (cart.length === 0) {
    container.innerHTML = `<div class="bg-white p-6 rounded text-center text-stone-500 border border-stone-200">
      ${currentUser ? 'Your cart is empty.' : 'Your cart is empty. Log in to keep it saved to your account.'}
    </div>`;
    totalPriceEl.innerText = formatPrice(0);
    checkoutBtn.disabled = true;
    authWarning.classList.add('hidden');
    return;
  }

  let total = 0;
  container.innerHTML = cart.map(item => {
    const itemTotal = item.price * item.quantity;
    total += itemTotal;
    const fallbackImage = 'https://via.placeholder.com/100?text=No+Image';

    return `
      <div class="bg-white p-4 rounded-lg border border-stone-200 flex items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <img 
            src="${item.image || fallbackImage}" 
            alt="${item.name}" 
            class="w-12 h-12 object-cover rounded border border-stone-200 shrink-0"
            onerror="this.src='${fallbackImage}'"
          />
          <div>
            <h4 class="font-bold text-stone-800">${item.name}</h4>
            <p class="text-sm text-stone-500">${formatPrice(item.price)} each</p>
          </div>
        </div>
        <div class="flex items-center space-x-3">
          <div class="flex items-center border border-stone-300 rounded">
            <button onclick="updateQuantity(${item.id}, -1)" class="px-2 py-1 text-stone-600 hover:bg-stone-100">-</button>
            <span class="px-3 py-1 text-sm font-semibold">${item.quantity}</span>
            <button onclick="updateQuantity(${item.id}, 1)" class="px-2 py-1 text-stone-600 hover:bg-stone-100">+</button>
          </div>
          <span class="font-bold text-stone-800 w-24 text-right">${formatPrice(itemTotal)}</span>
          <button onclick="removeFromCart(${item.id})" class="text-red-600 hover:text-red-800 text-sm font-semibold">Remove</button>
        </div>
      </div>
    `;
  }).join('');

  totalPriceEl.innerText = formatPrice(total);

  if (!currentUser) {
    checkoutBtn.disabled = true;
    authWarning.classList.remove('hidden');
  } else {
    checkoutBtn.disabled = false;
    authWarning.classList.add('hidden');
  }
}

function processCheckout() {
  if (!currentUser) {
    showToast("You must be logged in to checkout.");
    return;
  }

  const profile = users[currentUser.email];
  const displayName = profile?.fullName || currentUser.email;
  const address = profile?.location ? `\nShipping to: ${profile.location}` : '';

  alert(`Order placed!\nThank you, ${displayName}.${address}\nTotal: ${document.getElementById('cart-total-price')?.innerText || '₦0.00'}.`);
  cart = [];
  saveCart();
  switchTab('store');
}

// ADMIN — Inventory

function handleAddProduct(e) {
  if (e && e.preventDefault) e.preventDefault();
  if (!currentUser || currentUser.role !== 'admin') return;

  const nameInput = document.getElementById('admin-p-name');
  const priceInput = document.getElementById('admin-p-price');
  const categoryInput = document.getElementById('admin-p-category');
  const imageInput = document.getElementById('admin-p-image');

  if (!nameInput || !priceInput || !categoryInput) return;

  const newProduct = {
    id: Date.now(),
    name: nameInput.value.trim(),
    price: parseFloat(priceInput.value),
    category: categoryInput.value,
    image: imageInput ? imageInput.value.trim() : '',
    originalPrice: null,
    rating: 0,
    sold: 0
  };

  products.push(newProduct);
  saveProducts();
  renderCategoryChips();

  nameInput.value = '';
  priceInput.value = '';
  if (imageInput) imageInput.value = '';
  showToast(`Product "${newProduct.name}" added.`);
}

function deleteProduct(productId) {
  if (!currentUser || currentUser.role !== 'admin') return;
  products = products.filter(p => p.id !== productId);
  cart = cart.filter(i => i.id !== productId);
  saveProducts();
  saveCart();
  showToast("Product deleted from catalog.");
}

function renderAdminInventory() {
  const tbody = document.getElementById('admin-inventory-table');
  if (!tbody) return;
  if (!currentUser || currentUser.role !== 'admin') {
    tbody.innerHTML = '';
    return;
  }

  if (products.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-stone-500">No products found.</td></tr>`;
    return;
  }

  tbody.innerHTML = products.map(p => `
    <tr class="hover:bg-stone-50">
      <td class="py-3 px-4 font-mono text-xs text-stone-500">${p.id}</td>
      <td class="py-3 px-4 font-medium text-stone-800 flex items-center gap-2">
        <img src="${p.image || 'https://via.placeholder.com/40'}" alt="" class="w-8 h-8 object-cover rounded border" />
        ${p.name}
      </td>
      <td class="py-3 px-4">${formatPrice(p.price)}</td>
      <td class="py-3 px-4 text-right">
        <button onclick="deleteProduct(${p.id})" class="text-red-600 hover:text-red-800 font-semibold text-xs border border-red-200 bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded transition">
          Delete
        </button>
      </td>
    </tr>
  `).join('');
}

// ADMIN — Team

function renderTeamPanel() {
  const tbody = document.getElementById('admin-team-table');
  if (!tbody) return;
  if (!currentUser || currentUser.role !== 'admin') {
    tbody.innerHTML = '';
    return;
  }

  const entries = Object.entries(users);
  if (entries.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" class="p-4 text-center text-stone-500">No registered accounts yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = entries.map(([email, u]) => `
    <tr class="hover:bg-stone-50">
      <td class="py-3 px-4 text-stone-800">${u.fullName ? `${u.fullName} (${email})` : email}</td>
      <td class="py-3 px-4">
        <span class="text-xs font-semibold px-2 py-0.5 rounded ${u.role === 'admin' ? 'bg-[#E2231A] text-white' : 'bg-stone-200 text-stone-700'}">${u.role}</span>
      </td>
      <td class="py-3 px-4 text-right">
        ${u.role === 'admin'
          ? `<span class="text-xs text-stone-400">—</span>`
          : `<button onclick="promoteToAdmin('${email}')" class="text-xs font-semibold border border-stone-300 hover:bg-stone-100 px-2.5 py-1 rounded transition">Promote to admin</button>`
        }
      </td>
    </tr>
  `).join('');
}

// FLASH DEAL COUNTDOWN

function startCountdown() {
  const el = document.getElementById('flash-countdown');
  if (!el) return;

  function tick() {
    const now = new Date();
    const end = new Date(now);
    end.setHours(24, 0, 0, 0);
    let diff = Math.max(0, end - now);

    const h = String(Math.floor(diff / 3600000)).padStart(2, '0');
    const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
    const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');

    el.innerText = `${h}:${m}:${s}`;
  }

  tick();
  setInterval(tick, 1000);
}

// EXPOSE TO WINDOW FOR INLINE HTML ATTRIBUTES

window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.updateQuantity = updateQuantity;
window.switchTab = switchTab;
window.toggleAuthModal = toggleAuthModal;
window.handleAuthSubmit = handleAuthSubmit;
window.toggleStaffModal = toggleStaffModal;
window.handleStaffSubmit = handleStaffSubmit;
window.promoteToAdmin = promoteToAdmin;
window.logout = logout;
window.processCheckout = processCheckout;
window.handleAddProduct = handleAddProduct;
window.deleteProduct = deleteProduct;
window.setCategory = setCategory;
window.setSearch = setSearch;

// INITIALIZATION

function init() {
  saveProducts();
  loadCartForCurrentUser();
  updateAuthUI();
  renderCategoryChips();
  renderStorefront();
  renderCart();
  renderAdminInventory();
  renderTeamPanel();
  startCountdown();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}