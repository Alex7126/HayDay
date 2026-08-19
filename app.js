// app.js

const NEIGHBORHOOD_MAX_LIMIT = 1500;
let remainingQuota = 0;
let isLoaded = false;
let chickenMovementTimer = null;

// 1. Consultar cupo consumido
async function getNeighborhoodUsedQuota(neighborhood) {
  try {
    const { data, error } = await supabaseClient
      .from("solicitudes")
      .select("items")
      .eq("vecindario", neighborhood);

    if (error || !data) return 0;

    let total = 0;
    data.forEach(solicitud => {
      let items = solicitud.items;
      if (typeof items === "string") {
        try { items = JSON.parse(items); } catch(e) { items = []; }
      }
      if (Array.isArray(items)) {
        items.forEach(i => { total += Number(i.cantidad) || 0; });
      }
    });
    return total;
  } catch (err) {
    return 0;
  }
}

// 2. Renderizar catálogo
async function renderProducts() {
  isLoaded = false;
  const neighborhood = document.getElementById("neighborhood").value;
  const container = document.getElementById("products");
  const limitBadge = document.getElementById("neighborhoodLimitBadge");
  const submitBtn = document.getElementById("submitOrder");

  container.innerHTML = "<p style='text-align:center; padding:15px; color:#fff;'>Cargando productos...</p>";
  limitBadge.textContent = "Calculando cupo...";

  const usedQuota = await getNeighborhoodUsedQuota(neighborhood);
  remainingQuota = Math.max(0, NEIGHBORHOOD_MAX_LIMIT - usedQuota);

  limitBadge.innerHTML = `<strong>${remainingQuota}</strong> / ${NEIGHBORHOOD_MAX_LIMIT} disponibles`;

  if (remainingQuota <= 0) {
    limitBadge.style.color = "#d32f2f";
    submitBtn.disabled = true;
    submitBtn.style.background = "#9e9e9e";
    submitBtn.textContent = "🚫 Cupo agotado para este vecindario";
  } else {
    limitBadge.style.color = "#2e7d32";
    submitBtn.disabled = false;
    submitBtn.style.background = "#25d366";
    submitBtn.textContent = "📲 Solicitar y Enviar por WhatsApp";
  }

  const { data: products, error } = await supabaseClient
    .from("productos")
    .select("*")
    .eq("vecindario", neighborhood)
    .order("nombre", { ascending: true });

  if (error || !products || products.length === 0) {
    container.innerHTML = "<p style='color:white; text-align:center;'>No hay productos registrados.</p>";
    return;
  }

  container.innerHTML = "";

  products.forEach(prod => {
    const row = document.createElement("div");
    row.className = "product";
    row.innerHTML = `
      <div>
        <div class="product-name">${prod.nombre}</div>
        <div class="product-stock">${prod.stock} disponibles</div>
      </div>
      <div class="qty">
        <button type="button" data-action="minus">−</button>
        <input type="number" min="0" max="${prod.stock}" value="0" data-id="${prod.id}" data-name="${prod.nombre}" data-stock="${prod.stock}">
        <button type="button" data-action="plus">+</button>
      </div>
    `;

    const input = row.querySelector("input");
    row.querySelector('[data-action="minus"]').onclick = () => {
      input.value = Math.max(0, Number(input.value) - 1);
      updateOrderCounter();
    };

    row.querySelector('[data-action="plus"]').onclick = () => {
      const currentOrderTotal = getSelectedItemsCount();
      const currentVal = Number(input.value) || 0;

      if (currentVal + 1 > prod.stock) {
        alert(`Solo hay ${prod.stock} disponibles.`);
        return;
      }
      if (currentOrderTotal + 1 > remainingQuota) {
        alert(`¡No puedes exceder el cupo de ${remainingQuota} unidades de tu vecindario!`);
        return;
      }

      input.value = currentVal + 1;
      updateOrderCounter();
    };

    input.addEventListener("input", () => {
      input.value = Math.max(0, Math.min(prod.stock, Number(input.value) || 0));
      updateOrderCounter();
    });

    container.appendChild(row);
  });

  isLoaded = true;
  updateOrderCounter();
  initRoamingChicken();
}

// 3. IA de movimiento libre por toda la página para la Gallina
function initRoamingChicken() {
  if (chickenMovementTimer) clearInterval(chickenMovementTimer);

  const chicken = document.getElementById("roaming-chicken");
  const bubble = document.getElementById("chicken-bubble");
  const chickenImg = document.getElementById("chicken-img");
  if (!chicken) return;

  const phrases = [
    "👀 ¡Te estoy vigilando!",
    "🌽 ¿Mucho maíz hoy?",
    "🌾 ¡Pío pío!",
    "🚜 ¡A cuidar la granja!",
    "⭐ ¡No te pases del cupo!",
    "🥚 ¡Cluck!"
  ];

  let currentX = 80;

  function moveChicken() {
    // Generar nueva posición aleatoria en pantalla (porcentajes)
    const newTop = Math.floor(Math.random() * 70) + 10; // Entre 10% y 80% vertical
    const newLeft = Math.floor(Math.random() * 80) + 5;  // Entre 5% y 85% horizontal

    // Voltear la imagen según hacia dónde camine
    if (newLeft > currentX) {
      chickenImg.style.transform = "scaleX(-1)"; // Mira a la derecha
    } else {
      chickenImg.style.transform = "scaleX(1)";  // Mira a la izquierda
    }
    currentX = newLeft;

    // Cambiar frase
    if (bubble) bubble.textContent = phrases[Math.floor(Math.random() * phrases.length)];

    // Mover con animación suave
    chicken.style.top = `${newTop}%`;
    chicken.style.left = `${newLeft}%`;
  }

  // Se mueve de lugar cada 5.5 segundos
  chickenMovementTimer = setInterval(moveChicken, 5500);

  // Al hacerle clic saluda
  chicken.onclick = () => {
    if (bubble) bubble.textContent = "❤️ ¡Coo-coo! 🌾";
    chicken.style.transform = "scale(1.2)";
    setTimeout(() => { chicken.style.transform = "scale(1)"; }, 300);
  };
}

function getSelectedItemsCount() {
  let count = 0;
  document.querySelectorAll("#products input").forEach(input => {
    count += Number(input.value) || 0;
  });
  return count;
}

function updateOrderCounter() {
  const currentCount = getSelectedItemsCount();
  const counterEl = document.getElementById("currentOrderCount");
  if (counterEl) {
    counterEl.textContent = `${currentCount} productos seleccionados`;
    counterEl.style.color = currentCount > remainingQuota ? "#d32f2f" : "#8d5b2d";
  }
}

function showResult(html, ok = true) {
  const box = document.getElementById("result");
  box.className = `card result ${ok ? "success" : "error"}`;
  box.innerHTML = html;
  box.classList.remove("hidden");
  window.scrollTo({ top: box.offsetTop - 20, behavior: "smooth" });
}

document.getElementById("neighborhood").addEventListener("change", () => {
  const box = document.getElementById("result");
  box.classList.add("hidden");
  renderProducts();
});

// 4. Enviar Solicitud
document.getElementById("submitOrder").addEventListener("click", async () => {
  if (!isLoaded) return;

  const submitBtn = document.getElementById("submitOrder");
  const name = document.getElementById("playerName").value.trim();
  const neighborhood = document.getElementById("neighborhood").value;
  const orderCount = getSelectedItemsCount();

  if (!name) {
    showResult("<strong>Falta tu nombre.</strong><br>Ingresa tu nombre antes de enviar.", false);
    return;
  }

  if (orderCount === 0) {
    showResult("<strong>Carrito vacío.</strong><br>Selecciona algún producto con el botón (+).", false);
    return;
  }

  if (orderCount > remainingQuota) {
    showResult(`<strong>Superas el cupo disponible.</strong><br>Solo restan ${remainingQuota} productos para ${neighborhood}.`, false);
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Procesando...";

  const selected = [];
  document.querySelectorAll("#products input").forEach(input => {
    const qty = Number(input.value) || 0;
    if (qty > 0) {
      selected.push({
        id: Number(input.dataset.id),
        nombre: input.dataset.name,
        stock: Number(input.dataset.stock),
        cantidad: qty
      });
    }
  });

  const { error: reqError } = await supabaseClient.from("solicitudes").insert([
    {
      jugador: name,
      vecindario: neighborhood,
      items: selected.map(i => ({ nombre: i.nombre, cantidad: i.cantidad }))
    }
  ]);

  if (reqError) {
    showResult(`<strong>Error al guardar:</strong> ${reqError.message}`, false);
    submitBtn.disabled = false;
    submitBtn.textContent = "📲 Solicitar y Enviar por WhatsApp";
    return;
  }

  for (const item of selected) {
    const nuevoStock = Math.max(0, item.stock - item.cantidad);
    await supabaseClient.from("productos").update({ stock: nuevoStock }).eq("id", item.id);
  }

  let waMessage = `🚜 *SOLICITUD HAYDAY*\n`;
  waMessage += `👤 *Jugador:* ${name}\n`;
  waMessage += `🏡 *Vecindario:* ${neighborhood}\n\n`;
  waMessage += `📦 *Pedido (Total: ${orderCount}):*\n`;

  const lines = selected.map(item => {
    waMessage += `• ${item.nombre}: ${item.cantidad}\n`;
    return `<li>${item.nombre} × <strong>${item.cantidad}</strong></li>`;
  }).join("");

  showResult(`
    <h3>✅ Solicitud registrada con éxito</h3>
    <p><strong>${name}</strong> — ${neighborhood}</p>
    <ul>${lines}</ul>
    <p>Abriendo WhatsApp...</p>
  `, true);

  await renderProducts();

  const waUrl = `https://wa.me/${APP_CONFIG.adminWhatsApp}?text=${encodeURIComponent(waMessage)}`;
  setTimeout(() => {
    window.open(waUrl, "_blank");
  }, 800);
});

window.addEventListener("DOMContentLoaded", renderProducts);
