// app.js

async function getStockFromDB(neighborhood) {
  const { data, error } = await supabaseClient
    .from("productos")
    .select("*")
    .eq("vecindario", neighborhood);

  if (error) {
    console.error("Error al obtener stock:", error);
    return [];
  }
  return data || [];
}

async function renderProducts() {
  const neighborhood = document.getElementById("neighborhood").value;
  const container = document.getElementById("products");
  container.innerHTML = "<p>Cargando productos desde la base de datos...</p>";

  const products = await getStockFromDB(neighborhood);

  if (products.length === 0) {
    container.innerHTML = "<p>No hay productos registrados para este vecindario.</p>";
    document.getElementById("totalStock").textContent = "0 / 0";
    return;
  }

  container.innerHTML = "";
  let totalStock = 0;

  products.forEach(prod => {
    totalStock += prod.stock;
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
    };
    row.querySelector('[data-action="plus"]').onclick = () => {
      input.value = Math.min(prod.stock, Number(input.value) + 1);
    };
    input.addEventListener("change", () => {
      input.value = Math.max(0, Math.min(prod.stock, Number(input.value) || 0));
    });

    container.appendChild(row);
  });

  document.getElementById("totalStock").textContent = `${totalStock} disponibles`;
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

document.getElementById("submitOrder").addEventListener("click", async () => {
  const name = document.getElementById("playerName").value.trim();
  const neighborhood = document.getElementById("neighborhood").value;

  if (!name) {
    showResult("<strong>Falta tu nombre.</strong><br>Escribe tu nombre antes de solicitar productos.", false);
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

  if (!selected.length) {
    showResult("<strong>No seleccionaste productos.</strong><br>Elige al menos un producto.", false);
    return;
  }

  // 1. Guardar la solicitud en Supabase
  const { error: reqError } = await supabaseClient.from("solicitudes").insert([
    {
      jugador: name,
      vecindario: neighborhood,
      items: selected.map(i => ({ nombre: i.nombre, cantidad: i.cantidad }))
    }
  ]);

  if (reqError) {
    showResult(`<strong>Error al procesar pedido:</strong> ${reqError.message}`, false);
    return;
  }

  // 2. Descontar inventario en Supabase
  for (const item of selected) {
    const nuevoStock = item.stock - item.cantidad;
    await supabaseClient
      .from("productos")
      .update({ stock: nuevoStock })
      .eq("id", item.id);
  }

  // 3. Generar mensaje de WhatsApp
  let waMessage = `🚜 *SOLICITUD HAYDAY*\n`;
  waMessage += `👤 *Jugador:* ${name}\n`;
  waMessage += `🏡 *Vecindario:* ${neighborhood}\n\n`;
  waMessage += `📦 *Materiales solicitados:*\n`;

  const lines = selected.map(item => {
    waMessage += `• ${item.nombre}: ${item.cantidad}\n`;
    return `<li>${item.nombre} × <strong>${item.cantidad}</strong></li>`;
  }).join("");

  showResult(`
    <h3>✅ Solicitud registrada en la base de datos</h3>
    <p><strong>${name}</strong> — Vecindario: <strong>${neighborhood}</strong></p>
    <ul>${lines}</ul>
    <p>Abriendo WhatsApp para confirmar...</p>
  `, true);

  // Recargar catálogo actualizado
  renderProducts();

  // Redirigir a WhatsApp
  const waUrl = `https://wa.me/${APP_CONFIG.adminWhatsApp}?text=${encodeURIComponent(waMessage)}`;
  setTimeout(() => {
    window.open(waUrl, "_blank");
  }, 800);
});

// Carga inicial
window.addEventListener("DOMContentLoaded", renderProducts);
