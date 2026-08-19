// app.js

const NEIGHBORHOOD_MAX_LIMIT = 1500;
let remainingQuota = NEIGHBORHOOD_MAX_LIMIT;

// 1. Obtener cuántos ítems ya ha pedido el vecindario
async function getNeighborhoodUsedQuota(neighborhood) {
  const { data, error } = await supabaseClient
    .from("solicitudes")
    .select("items")
    .eq("vecindario", neighborhood);

  if (error || !data) {
    console.error("Error al calcular cuota:", error);
    return 0;
  }

  let totalItemsOrdered = 0;
  data.forEach(solicitud => {
    if (Array.isArray(solicitud.items)) {
      solicitud.items.forEach(item => {
        totalItemsOrdered += Number(item.cantidad) || 0;
      });
    }
  });

  return totalItemsOrdered;
}

// 2. Cargar inventario y actualizar el cupo en pantalla
async function renderProducts() {
  const neighborhood = document.getElementById("neighborhood").value;
  const container = document.getElementById("products");
  const limitBadge = document.getElementById("neighborhoodLimitBadge");
  const submitBtn = document.getElementById("submitOrder");

  container.innerHTML = "<p>Cargando productos...</p>";
  limitBadge.textContent = "Calculando cupo...";

  // Consultar cuota usada
  const usedQuota = await getNeighborhoodUsedQuota(neighborhood);
  remainingQuota = Math.max(0, NEIGHBORHOOD_MAX_LIMIT - usedQuota);

  limitBadge.innerHTML = `<strong>${remainingQuota}</strong> / ${NEIGHBORHOOD_MAX_LIMIT} restantes`;

  if (remainingQuota <= 0) {
    limitBadge.style.color = "#d32f2f";
    submitBtn.disabled = true;
    submitBtn.style.background = "#9e9e9e";
    submitBtn.textContent = "🚫 Límite de 1,500 productos alcanzado";
  } else {
    limitBadge.style.color = "#2e7d32";
    submitBtn.disabled = false;
    submitBtn.style.background = "#25d366";
    submitBtn.textContent = "📲 Solicitar y Enviar por WhatsApp";
  }

  // Consultar inventario desde Supabase
  const { data: products, error } = await supabaseClient
    .from("productos")
    .select("*")
    .eq("vecindario", neighborhood)
    .order("nombre", { ascending: true });

  if (error || !products || products.length === 0) {
    container.innerHTML = "<p>No hay productos disponibles en este momento.</p>";
    return;
  }

  container.innerHTML = "";

  products.forEach(prod => {
    const row = document.createElement("div");
    row.className = "product";
    row.innerHTML = `
      <div>
        <div class="product-name">${prod.nombre}</div>
        <div class="product-stock">${prod.stock} en inventario</div>
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
      input.value = Math.min(prod.stock, Number(input.value) + 1);
      updateOrderCounter();
    };
    input.addEventListener("input", () => {
      input.value = Math.max(0, Math.min(prod.stock, Number(input.value) || 0));
      updateOrderCounter();
    });

    container.appendChild(row);
  });

  updateOrderCounter();
}

// 3. Contar total de ítems seleccionados en el carrito actual
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
    if (currentCount > remainingQuota) {
      counterEl.style.color = "#d32f2f";
    } else {
      counterEl.style.color = "#2c3e50";
    }
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

// 4. Enviar Solicitud validando el límite
document.getElementById("submitOrder").addEventListener("click", async () => {
  const name = document.getElementById("playerName").value.trim();
  const neighborhood = document.getElementById("neighborhood").value;
  const orderCount = getSelectedItemsCount();

  if (!name) {
    showResult("<strong>Falta tu nombre.</strong><br>Escribe tu nombre de jugador antes de continuar.", false);
    return;
  }

  if (orderCount === 0) {
    showResult("<strong>No has seleccionado ningún producto.</strong>", false);
    return;
  }

  if (remainingQuota <= 0) {
    showResult(`<strong>Límite alcanzado.</strong><br>El vecindario ${neighborhood} ya consumió su cupo total de 1,500 productos.`, false);
    return;
  }

  if (orderCount > remainingQuota) {
    showResult(`<strong>Superas el cupo disponible.</strong><br>Solo quedan <strong>${remainingQuota}</strong> productos disponibles para ${neighborhood}. Estás intentando pedir ${orderCount}.`, false);
    return;
  }

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

  // Guardar en Supabase
  const { error: reqError } = await supabaseClient.from("solicitudes").insert([
    {
      jugador: name,
      vecindario: neighborhood,
      items: selected.map(i => ({ nombre: i.nombre, cantidad: i.cantidad }))
    }
  ]);

  if (reqError) {
    showResult(`<strong>Error al guardar:</strong> ${reqError.message}`, false);
    return;
  }

  // Descontar inventario en Supabase
  for (const item of selected) {
    const nuevoStock = Math.max(0, item.stock - item.cantidad);
    await supabaseClient.from("productos").update({ stock: nuevoStock }).eq("id", item.id);
  }

  // WhatsApp
  let waMessage = `🚜 *SOLICITUD HAYDAY*\n`;
  waMessage += `👤 *Jugador:* ${name}\n`;
  waMessage += `🏡 *Vecindario:* ${neighborhood}\n\n`;
  waMessage += `📦 *Materiales solicitados (Total: ${orderCount}):*\n`;

  const lines = selected.map(item => {
    waMessage += `• ${item.nombre}: ${item.cantidad}\n`;
    return `<li>${item.nombre} × <strong>${item.cantidad}</strong></li>`;
  }).join("");

  showResult(`
    <h3>✅ Solicitud enviada</h3>
    <p><strong>${name}</strong> — Vecindario: <strong>${neighborhood}</strong></p>
    <ul>${lines}</ul>
    <p>Redirigiendo a WhatsApp...</p>
  `, true);

  // Recargar cupos actualizados
  renderProducts();

  const waUrl = `https://wa.me/${APP_CONFIG.adminWhatsApp}?text=${encodeURIComponent(waMessage)}`;
  setTimeout(() => {
    window.open(waUrl, "_blank");
  }, 800);
});

window.addEventListener("DOMContentLoaded", renderProducts);
