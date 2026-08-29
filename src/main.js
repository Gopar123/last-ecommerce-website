import './style.css';

// --- Application State ---
const DEFAULT_PRODUCTS = [
  { id: 101, name: "Ergonomic Wireless Mouse", price: 29000.99 },
  { id: 102, name: "Mechanical Gaming Keyboard", price: 89000.99 },
  { id: 103, name: "UltraWide 4K Monitor", price: 349000.50 },
  { id: 104, name: "Samsung Tv", price: 890000.99 },
  { id: 105, name: "Pixel 7pro", price: 500000.00 }
];

function formatPrice(price) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN'
  }).format(price);
}

let products = JSON.parse(localStorage.getItem('app_products')) || DEFAULT_PRODUCTS;
let cart = JSON.parse(localStorage.getItem('app_cart')) || [];
let currentUser = JSON.parse(localStorage.getItem('app_user')) || null;

// --- Initialization ---
window.addEventListener('DOMContentLoaded', () => {
  saveProducts();
  updateAuthUI();
  renderStorefront();
  renderCart();
  renderAdminInventory();
});

// --- Persistence Helpers ---
function saveCart() {
  localStorage.setItem('app_cart', JSON.stringify(cart));
  renderCart();
}

function saveProducts() {
  localStorage.setItem('app_products', JSON.stringify(products));
  renderStorefront();
  renderAdminInventory();
}

function saveUser() {
  if (currentUser) {
    localStorage.setItem('app_user', JSON.stringify(currentUser));
  } else {
    localStorage.removeItem('app_user');
  }
  updateAuthUI();
  renderCart();
}

// --- View Navigation ---
function switchTab(tabName) {
  document.getElementById('tab-store').classList.add('hidden');
  document.getElementById('tab-cart').classList.add('hidden');
  document.getElementById('tab-admin').classList.add('hidden');

  if (tabName === 'admin' && (!currentUser || currentUser.role !== 'admin')) {
    showToast("Access Denied: Admins only.");
    switchTab('store');
    return;
  }

  document.getElementById(`tab-${tabName}`).classList.remove('hidden');
}

// --- Toast Notifications ---
function showToast(message) {
  const toast = document.getElementById('toast');
  toast.innerText = message;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 3000);
}

// --- Authentication System ---
const ADMIN_PASSCODE = 'letmein-admin';

function toggleAuthModal() {
  const modal = document.getElementById('auth-modal');
  modal.classList.toggle('hidden');
  modal.classList.toggle('flex');
}

function handleAuthSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('auth-email').value;
  const requestedRole = document.getElementById('auth-role').value;

  let role = 'customer';
  if (requestedRole === 'admin') {
    const passcode = prompt('Enter admin passcode:');
    if (passcode === ADMIN_PASSCODE) {
      role = 'admin';
    } else {
      showToast('Incorrect admin passcode — logged in as customer instead.');
    }
  }

  currentUser = { email, role };
  saveUser();
  toggleAuthModal();
  showToast(`Logged in as ${email} (${role})`);
}

function logout() {
  currentUser = null;
  saveUser();
  switchTab('store');
  showToast("Logged out successfully.");
}

function updateAuthUI() {
  const infoContainer = document.getElementById('nav-user-info');
  const authBtn = document.getElementById('auth-btn');
  const adminNavBtn = document.getElementById('admin-nav-btn');

  if (currentUser) {
    infoContainer.innerHTML = `<span class="opacity-80">${currentUser.email}</span>`;
    authBtn.innerText = 'Logout';
    authBtn.onclick = logout;

    if (currentUser.role === 'admin') {
      adminNavBtn.classList.remove('hidden');
    } else {
      adminNavBtn.classList.add('hidden');
    }
  } else {
    infoContainer.innerHTML = '';
    authBtn.innerText = 'Login';
    authBtn.onclick = toggleAuthModal;
    adminNavBtn.classList.add('hidden');
  }
}

// --- Storefront System ---
function renderStorefront() {
  const grid = document.getElementById('product-grid');
  grid.innerHTML = products.map(p => `
    <div class="bg-white p-5 rounded-lg shadow-sm border flex flex-col justify-between hover:shadow-md transition">
      <div>
        <h3 class="font-bold text-gray-800 text-lg">${p.name}</h3>
        <p class="text-black font-semibold text-xl mt-2">${formatPrice(p.price)}</p>
      </div>
      <button onclick="addToCart(${p.id})" class="mt-4 w-full bg-black hover:bg-blue-950 text-white font-semibold py-2 rounded border border-gray-300 transition">
        Add to Cart
      </button>
    </div>
  `).join('');
}

// --- Cart System ---
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

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  badge.innerText = totalItems;

  if (cart.length === 0) {
    container.innerHTML = `<div class="bg-white p-6 rounded text-center text-gray-500 border">Your cart is empty.</div>`;
    totalPriceEl.innerText = formatPrice(0);
    checkoutBtn.disabled = true;
    authWarning.classList.add('hidden');
    return;
  }

  let total = 0;
  container.innerHTML = cart.map(item => {
    const itemTotal = item.price * item.quantity;
    total += itemTotal;
    return `
      <div class="bg-white p-4 rounded-lg shadow-sm border flex items-center justify-between">
        <div>
          <h4 class="font-bold text-gray-800">${item.name}</h4>
          <p class="text-sm text-gray-500">${formatPrice(item.price)} each</p>
        </div>
        <div class="flex items-center space-x-3">
          <div class="flex items-center border rounded">
            <button onclick="updateQuantity(${item.id}, -1)" class="px-2 py-1 text-gray-600 hover:bg-gray-100">-</button>
            <span class="px-3 py-1 text-sm font-semibold">${item.quantity}</span>
            <button onclick="updateQuantity(${item.id}, 1)" class="px-2 py-1 text-gray-600 hover:bg-gray-100">+</button>
          </div>
          <span class="font-bold text-gray-800 w-20 text-right">${formatPrice(itemTotal)}</span>
          <button onclick="removeFromCart(${item.id})" class="text-red-500 hover:text-red-700 text-sm font-semibold">Remove</button>
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
    showToast("Error: You must be logged in to checkout.");
    return;
  }

  alert(`Checkout Successful!\nThank you, ${currentUser.email}.\nYour order total was ${document.getElementById('cart-total-price').innerText}.`);
  cart = [];
  saveCart();
  switchTab('store');
}

// --- Admin System ---
function handleAddProduct(e) {
  e.preventDefault();
  const nameInput = document.getElementById('admin-p-name');
  const priceInput = document.getElementById('admin-p-price');

  const newProduct = {
    id: Date.now(),
    name: nameInput.value.trim(),
    price: parseFloat(priceInput.value)
  };

  products.push(newProduct);
  saveProducts();

  nameInput.value = '';
  priceInput.value = '';
  showToast(`Product "${newProduct.name}" added.`);
}

function deleteProduct(productId) {
  products = products.filter(p => p.id !== productId);
  cart = cart.filter(i => i.id !== productId);

  saveProducts();
  saveCart();
  showToast("Product deleted from catalog.");
}

function renderAdminInventory() {
  const tbody = document.getElementById('admin-inventory-table');
  if (products.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-gray-500">No products found.</td></tr>`;
    return;
  }

  tbody.innerHTML = products.map(p => `
    <tr class="hover:bg-gray-50">
      <td class="py-3 px-4 font-mono text-xs text-gray-500">${p.id}</td>
      <td class="py-3 px-4 font-medium text-gray-800">${p.name}</td>
      <td class="py-3 px-4">${formatPrice(p.price)}</td>
      <td class="py-3 px-4 text-right">
        <button onclick="deleteProduct(${p.id})" class="text-red-600 hover:text-red-800 font-semibold text-xs border border-red-200 bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded transition">
          Delete
        </button>
      </td>
    </tr>
  `).join('');
}

// --- Attach to Global Window for HTML Onclick Binding ---
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.updateQuantity = updateQuantity;
window.switchTab = switchTab;
window.toggleAuthModal = toggleAuthModal;
window.handleAuthSubmit = handleAuthSubmit;
window.logout = logout;
window.processCheckout = processCheckout;
window.handleAddProduct = handleAddProduct;
window.deleteProduct = deleteProduct;