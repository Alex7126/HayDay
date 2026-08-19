// app.js
let cart = {};
let availableProducts = [];

async function loadProducts() {
  const neighborhood = document.getElementById("neighborhood-select").value;
  const grid = document.getElementById("product-grid");
  grid.innerHTML = "<p>Cargando productos...</p>";

  // Consulta a Supabase
  const { data, error } = await supabaseClient
    .from("productos")
    .select("*")
    .eq("vecindario", neighborhood);

  if (error || !data || data.length === 0) {
    grid.innerHTML = "<p>No hay productos registrados para este vecindario.</p>";
    return;
  }

  availableProducts = data;
  renderProducts();
}

function renderProducts() {
  const grid = document.getElementById("product-grid");
  grid.innerHTML = "";

  availableProducts.forEach(prod => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <img src="${prod.imagen_url || 'https://via.placeholder.com/90'}" alt="${prod.nombre}">
      <h3>${prod.nombre}</h3>
      <p class="stock">Disponible: ${prod.stock}</p>
      <div class="actions">
        <input type="number" id="qty-${prod.id}" min="1" max="${prod.stock}" value="1">
        <button onclick="addToCart(${prod.id})">Agregar</button>
      </div>
    `;
    grid.appendChild(card);
  });
}

function addToCart(productId) {
  const prod = availableProducts.find(p => p.id === productId);
  const qtyInput = document.getElementById(`qty-${productId}`);
  const qty = parseInt(qtyInput.value) || 1;

  if (qty > prod.stock) {
    alert("No puedes pedir más del stock disponible.");
    return;
  }

  cart[productId] = {
    id: prod.id,
    nombre: prod.nombre,
    cantidad: qty
  };

  updateCartUI();
}

function updateCartUI() {
  const list = document.getElementById("order-list");
  list.innerHTML = "";

  const items = Object.values(cart);
  if (items.length === 0) {
    list.innerHTML = "<li>No has agregado productos todavía.</li>";
    return;
  }

  items.forEach(item => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span>${item.nombre} x${item.cantidad}</span>
      <button style="background:#e74c3c; padding:4px 8px; font-size:0.8rem;" onclick="removeFromCart(${item.id})">Quitar</button>
    `;
    list.appendChild(li);
  });
}

function removeFromCart(productId) {
  delete cart[productId];
  updateCartUI();
}

async function sendOrder() {
  const playerName = document.getElementById("player-name").value.trim();
  const neighborhood = document.getElementById("neighborhood-select").value;
  const items = Object.values(cart);

  if (!playerName) {
    alert("Por favor ingresa tu nombre de jugador.");
    return;
  }

  if (items.length === 0) {
    alert("Tu lista de pedido está vacía.");
    return;
  }

  // 1. Guardar en Supabase
  const { error } = await supabaseClient.from("solicitudes").insert([
    {
      jugador: playerName,
      vecindario: neighborhood,
      items: items,
      estado: "pendiente",
      created_at: new Date()
    }
  ]);

  if (error) {
    console.error("Error al registrar solicitud en Supabase:", error);
  }

  // 2. Armar mensaje para WhatsApp
  let msg = `🚜 *NUEVA SOLICITUD HAYDAY*\n`;
  msg += `👤 *Jugador:* ${playerName}\n`;
  msg += `🏡 *Vecindario:* ${neighborhood}\n\n`;
  msg += `📦 *Pedido:*\n`;
  items.forEach(i => {
    msg += `• ${i.nombre}: ${i.cantidad}\n`;
  });

  const waUrl = `https://wa.me/${APP_CONFIG.adminWhatsApp}?text=${encodeURIComponent(msg)}`;
  window.open(waUrl, "_blank");

  // Limpiar carrito
  cart = {};
  updateCartUI();
  alert("¡Pedido preparado! Te redirigiremos a WhatsApp para confirmarlo.");
}

document.getElementById("neighborhood-select").addEventListener("change", () => {
  cart = {};
  updateCartUI();
  loadProducts();
});

document.getElementById("btn-submit").addEventListener("click", sendOrder);

// Carga inicial
window.addEventListener("DOMContentLoaded", loadProducts);
