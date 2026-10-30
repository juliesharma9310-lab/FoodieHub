const foods = [
  {id:1,name:"Margherita Pizza",category:"Pizza",price:249,emoji:"🍕",rating:"4.8",description:"Classic cheese pizza with fresh basil and tomato."},
  {id:2,name:"Veggie Supreme",category:"Pizza",price:299,emoji:"🍕",rating:"4.7",description:"Loaded with colourful vegetables and mozzarella."},
  {id:3,name:"Classic Cheese Burger",category:"Burger",price:159,emoji:"🍔",rating:"4.6",description:"Crispy patty, cheese, lettuce and house sauce."},
  {id:4,name:"Paneer Tikka Burger",category:"Burger",price:189,emoji:"🍔",rating:"4.9",description:"Spiced paneer patty with creamy mint dressing."},
  {id:5,name:"Cold Coffee",category:"Drinks",price:99,emoji:"🥤",rating:"4.5",description:"Chilled creamy coffee for a refreshing break."},
  {id:6,name:"Fresh Lime Soda",category:"Drinks",price:69,emoji:"🍹",rating:"4.4",description:"Fresh lime, soda and a hint of mint."},
  {id:7,name:"Chocolate Brownie",category:"Dessert",price:119,emoji:"🍫",rating:"4.8",description:"Rich chocolate brownie with a soft centre."},
  {id:8,name:"Strawberry Ice Cream",category:"Dessert",price:89,emoji:"🍨",rating:"4.7",description:"Creamy strawberry ice cream, served chilled."},
  {id:9,name:"French Fries",category:"Burger",price:89,emoji:"🍟",rating:"4.5",description:"Golden crispy fries with a seasoning of your choice."}
];

let cart = JSON.parse(localStorage.getItem("foodiehub-cart") || "[]");
let activeCategory = "All";

const foodGrid = document.getElementById("foodGrid");
const cartPanel = document.getElementById("cartPanel");
const overlay = document.getElementById("overlay");
const cartItems = document.getElementById("cartItems");
const checkoutModal = document.getElementById("checkoutModal");

function renderFoods() {
  const search = document.getElementById("searchInput").value.toLowerCase().trim();
  const filtered = foods.filter(food =>
    (activeCategory === "All" || food.category === activeCategory) &&
    (food.name.toLowerCase().includes(search) || food.description.toLowerCase().includes(search))
  );

  foodGrid.innerHTML = filtered.length ? filtered.map(food => `
    <article class="food-card">
      <div class="food-picture">${food.emoji}</div>
      <div class="food-info">
        <div class="food-info-top"><h3>${food.name}</h3><span class="rating">★ ${food.rating}</span></div>
        <p>${food.description}</p>
        <div class="food-bottom"><span class="price">₹${food.price}</span>
          <button class="add-button" onclick="addToCart(${food.id})">+ Add</button>
        </div>
      </div>
    </article>
  `).join("") : `<p class="empty-cart">No dishes found. Try another search.</p>`;
}

function saveCart() {
  localStorage.setItem("foodiehub-cart", JSON.stringify(cart));
  renderCart();
}

function addToCart(id) {
  const existing = cart.find(item => item.id === id);
  if (existing) existing.quantity++;
  else cart.push({id, quantity:1});
  saveCart();
  showToast("Item added to your cart");
}

function changeQuantity(id, amount) {
  const item = cart.find(item => item.id === id);
  if (!item) return;
  item.quantity += amount;
  if (item.quantity <= 0) cart = cart.filter(item => item.id !== id);
  saveCart();
}

function renderCart() {
  const count = cart.reduce((sum,item) => sum + item.quantity, 0);
  const total = cart.reduce((sum,item) => {
    const food = foods.find(food => food.id === item.id);
    return sum + food.price * item.quantity;
  }, 0);
  document.getElementById("cartCount").textContent = count;
  document.getElementById("cartTotal").textContent = `₹${total}`;

  cartItems.innerHTML = cart.length ? cart.map(item => {
    const food = foods.find(food => food.id === item.id);
    return `<div class="cart-item">
      <div class="cart-emoji">${food.emoji}</div>
      <div><h4>${food.name}</h4><small>₹${food.price} each</small>
        <div class="quantity">
          <button onclick="changeQuantity(${food.id},-1)" aria-label="Decrease ${food.name} quantity">−</button>
          <span>${item.quantity}</span>
          <button onclick="changeQuantity(${food.id},1)" aria-label="Increase ${food.name} quantity">+</button>
        </div>
      </div>
      <span class="cart-price">₹${food.price * item.quantity}</span>
    </div>`;
  }).join("") : `<div class="empty-cart"><div style="font-size:45px">🛒</div><p>Your cart is empty.</p><small>Add something delicious from the menu!</small></div>`;
  document.getElementById("checkoutButton").disabled = cart.length === 0;
}

function openCart() {
  cartPanel.classList.add("open");
  overlay.classList.add("show");
}
function closeCart() {
  cartPanel.classList.remove("open");
  overlay.classList.remove("show");
}
function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2200);
}

document.getElementById("filters").addEventListener("click", event => {
  if (!event.target.matches(".filter")) return;
  document.querySelectorAll(".filter").forEach(button => button.classList.remove("active"));
  event.target.classList.add("active");
  activeCategory = event.target.dataset.category;
  renderFoods();
});
document.getElementById("searchInput").addEventListener("input", renderFoods);
document.getElementById("cartButton").addEventListener("click", openCart);
document.getElementById("closeCart").addEventListener("click", closeCart);
overlay.addEventListener("click", closeCart);

document.getElementById("checkoutButton").addEventListener("click", () => {
  if (!cart.length) return;
  closeCart();
  checkoutModal.classList.add("show");
});
document.getElementById("closeCheckout").addEventListener("click", () => checkoutModal.classList.remove("show"));

document.getElementById("checkoutForm").addEventListener("submit", async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const submitButton = form.querySelector('button[type="submit"]');
  const name = document.getElementById("customerName").value.trim();
  const order = new URLSearchParams(new FormData(form));

  cart.forEach(item => order.append("item", `${item.id}:${item.quantity}`));
  submitButton.disabled = true;
  submitButton.textContent = "Placing order...";

  try {
    const response = await fetch("/api/orders", {
      method: "POST",
      headers: {"Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"},
      body: order
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "The order could not be placed.");

    checkoutModal.classList.remove("show");
    cart = [];
    saveCart();
    form.reset();
    showToast(`Thank you, ${name}! Order ${result.orderNumber} placed — ₹${result.total}.`);
  } catch (error) {
    showToast(error.message || "Could not connect to the Java server. Start FoodieHubServer and try again.");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Place demo order";
  }
});

renderFoods();
renderCart();
