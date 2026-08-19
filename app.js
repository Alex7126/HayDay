// app.js

const NEIGHBORHOOD_MAX_LIMIT = 1500;
let remainingQuota = 0;
let isLoaded = false;

// 1. Obtener cupo consumido directamente de Supabase
async function getNeighborhoodUsedQuota(neighborhood) {
  try {
    const { data, error } = await supabaseClient
      .from("solicitudes")
      .select("items")
      .eq("vecindario", neighborhood);

    if (error || !data) {
      console.error("Error al consultar cupo:", error);
      return 0;
    }

    let totalItemsOrdered = 0;
    data.forEach(solicitud => {
      let items = solicitud.items;
      if (typeof items === "string") {
        try { items = JSON.parse(items); } catch(e) { items = []; }
      }
      if (Array.isArray(items)) {
        items.forEach(item => {
          totalItemsOrdered += Number(item.cantidad) || 0;
        });
      }
    });

    return totalItemsOrdered;
  } catch (err) {
    console.error("Error inesperado en cupo:", err);
    return 0;
  }
}

// 2. Renderizar catálogo y actualizar indicadores
async function renderProducts() {
  isLoaded = false;
  const neighborhood = document.getElementById("neighborhood").value;
  const container = document.getElementById("products");
  const limitBadge = document.getElementById("neighborhoodLimitBadge");
  const submitBtn = document.getElementById("submitOrder");

  container.innerHTML = "<p style='text-align:center; padding:20px;'>Cargando inventario...</p>";
  limitBadge.textContent = "Calculando cupo...";

  // 2.1 Calcular cupo restante
  const usedQuota = await getNeighborhoodUsedQuota(neighborhood);
  remainingQuota = Math.max(0, NEIGHBORHOOD_MAX_LIMIT - usedQuota);

  limitBadge.innerHTML = `<strong>${remainingQuota}</strong> / ${NEIGHBORHOOD_MAX_LIMIT} disponibles`;

  if (remainingQuota <= 0) {
    limitBadge.style.color = "#d32f2f";
    submitBtn.disabled = true;
    submitBtn.style.background = "#9e9e9e";
    submitBtn.textContent = "🚫 Límite de 1,500 alcanzado para este vecindario";
  } else {
    limitBadge.style.color = "#2e7d32";
    submitBtn.disabled = false;
    submitBtn.style.background = "#25d366";
    submitBtn.textContent = "📲 Solicitar y Enviar por WhatsApp";
  }

  // 2.2 Obtener catálogo de Supabase
  const { data: products, error } = await supabaseClient
    .from("productos")
    .select("*")
    .eq("vecindario", neighborhood)
    .order("nombre", { ascending: true });

  if (error || !products || products.length === 0) {
    container.innerHTML = "<p>No hay productos disponibles para este vecindario.</p>";
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
        <button type="button" class="btn-qty" data-action="minus">−</button>
        <input type="number" min="0" max="${prod.stock}" value="0" data-id="${prod.id}" data-name="${prod.nombre}" data-stock="${prod.stock}">
        <button type="button" class="btn-qty" data-action="plus">+</button>
      </div>
    `;

    const input = row.querySelector("input");
    const btnMinus = row.querySelector('[data-action="minus"]');
    const btnPlus = row.querySelector('[data-action="plus"]');

    btnMinus.onclick = () => {
      input.value = Math.max(0, Number(input.value) - 1);
      updateOrderCounter();
    };

    btnPlus.onclick = () => {
      const currentOrderTotal = getSelectedItemsCount();
      const currentVal = Number(input.value) || 0;
      
      // Bloquear si supera el stock del producto o el cupo del vecindario
      if (currentVal + 1 > prod.stock) {
        alert(`Solo hay ${prod.stock} disponibles de este producto.`);
        return;
      }
      if (currentOrderTotal + 1 > remainingQuota) {
        alert(`¡No puedes pedir más! El cupo restante para ${neighborhood} es de ${remainingQuota} productos.`);
        return;
      }

      input.value = currentVal + 1;
      updateOrderCounter();
    };

    input.addEventListener("change", () => {
      let val = Math.max(0, Math.min(prod.stock, Number(input.value) || 0));
      const currentOrderTotalWithoutThis = getSelectedItemsCount() - (Number(input.value) || 0);
      
      if (currentOrderTotalWithoutThis + val > remainingQuota) {
        val = Math.max(0, remainingQuota - currentOrderTotalWithoutThis);
        alert(`Ajustado al máximo permitido. Solo quedan ${remainingQuota} en el cupo.`);
      }
      input.value = val;
      updateOrderCounter();
    });

    container.appendChild(row);
  });

  isLoaded = true;
  updateOrderCounter();
}

// 3. Contar productos seleccionados
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

// 4. Validación final y envío
document.getElementById("submitOrder").addEventListener("click", async () => {
  if (!isLoaded) return;

  const submitBtn = document.getElementById("submitOrder");
  const name = document.getElementById("playerName").value.trim();
  const neighborhood = document.getElementById("neighborhood").value;
  const orderCount = getSelectedItemsCount();

  if (!name) {
    showResult("<strong>Falta tu nombre.</strong><br>Por favor escribe tu nombre en el juego.", false);
    return;
  }

  if (orderCount === 0) {
    showResult("<strong>Carrito vacío.</strong><br>Selecciona al menos un producto.", false);
    return;
  }

  // Verificación estricta del límite antes de procesar
  if (orderCount > remainingQuota) {
    showResult(`<strong>Superas el cupo máximo.</strong><br>Solo quedan <strong>${remainingQuota}</strong> productos disponibles para ${neighborhood}. Intentas pedir ${orderCount}.`, false);
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

  // Guardar en la base de datos
  const { error: reqError } = await supabaseClient.from("solicitudes").insert([
    {
      jugador: name,
      vecindario: neighborhood,
      items: selected.map(i => ({ nombre: i.nombre, cantidad: i.cantidad }))
    }
  ]);

  if (reqError) {
    showResult(`<strong>Error al guardar la solicitud:</strong> ${reqError.message}`, false);
    submitBtn.disabled = false;
    submitBtn.textContent = "📲 Solicitar y Enviar por WhatsApp";
    return;
  }

  // Descontar inventario individual
  for (const item of selected) {
    const nuevoStock = Math.max(0, item.stock - item.cantidad);
    await supabaseClient.from("productos").update({ stock: nuevoStock }).eq("id", item.id);
  }

  // Crear mensaje de WhatsApp
  let waMessage = `🚜 *SOLICITUD HAYDAY*\n`;
  waMessage += `👤 *Jugador:* ${name}\n`;
  waMessage += `🏡 *Vecindario:* ${neighborhood}\n\n`;
  waMessage += `📦 *Pedido (Total: ${orderCount} items):*\n`;

  const lines = selected.map(item => {
    waMessage += `• ${item.nombre}: ${item.cantidad}\n`;
    return `<li>${item.nombre} × <strong>${item.cantidad}</strong></li>`;
  }).join("");

  showResult(`
    <h3>✅ Solicitud Guardada</h3>
    <p><strong>${name}</strong> — ${neighborhood}</p>
    <ul>${lines}</ul>
    <p>Redirigiendo a WhatsApp...</p>
  `, true);

  // Recargar cupos actualizados
  await renderProducts();

  const waUrl = `https://wa.me/${APP_CONFIG.adminWhatsApp}?text=${encodeURIComponent(waMessage)}`;
  setTimeout(() => {
    window.open(waUrl, "_blank");
  }, 800);
});

window.addEventListener("DOMContentLoaded", renderProducts);
