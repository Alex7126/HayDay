// app.js

function initialData() {
  const data = {};
  for (const neighborhood of CONFIG.neighborhoods) {
    data[neighborhood] = {};
    for (const [id, name, stock] of PRODUCTS_DATA) {
      data[neighborhood][id] = stock; // 1,000 a cada producto
    }
  }
  return data;
}

function getStock() {
  const saved = localStorage.getItem(CONFIG.storageKey);
  if (!saved) {
    const fresh = initialData();
    localStorage.setItem(CONFIG.storageKey, JSON.stringify(fresh));
    return fresh;
  }
  return JSON.parse(saved);
}

function saveStock(data) {
  localStorage.setItem(CONFIG.storageKey, JSON.stringify(data));
}

function renderProducts() {
  const neighborhood = document.getElementById("neighborhood").value;
  const stock = getStock()[neighborhood] || {};
  const container = document.getElementById("products");
  container.innerHTML = "";

  for (const [id, name] of PRODUCTS_DATA) {
    const available = stock[id] ?? 0;
    const row = document.createElement("div");
    row.className = "product";
    row.innerHTML = `
      <div>
        <div class="product-name">${name}</div>
        <div class="product-stock">${available} disponibles</div>
      </div>
      <div class="qty">
        <button type="button" data-action="minus">−</button>
        <input type="number" min="0" max="${available}" value="0" data-id="${id}">
        <button type="button" data-action="plus">+</button>
      </div>
    `;

    const input = row.querySelector("input");
    row.querySelector('[data-action="minus"]').onclick = () => {
      input.value = Math.max(0, Number(input.value) - 1);
    };
    row.querySelector('[data-action="plus"]').onclick = () => {
      input.value = Math.min(available, Number(input.value) + 1);
    };
    input.addEventListener("change", () => {
      input.value = Math.max(0, Math.min(available, Number(input.value) || 0));
    });

    container.appendChild(row);
  }
  updateTotal();
}

function updateTotal() {
  const neighborhood = document.getElementById("neighborhood").value;
  const stock = getStock()[neighborhood] || {};
  const total = Object.values(stock).reduce((a, b) => a + b, 0);
  const max = PRODUCTS_DATA.reduce((a, p) => a + p[2], 0);
  document.getElementById("totalStock").textContent = `${total} / ${max}`;
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

document.getElementById("submitOrder").addEventListener("click", () => {
  const name = document.getElementById("playerName").value.trim();
  const neighborhood = document.getElementById("neighborhood").value;

  if (!name) {
    showResult("<strong>Falta tu nombre.</strong><br>Escribe tu nombre antes de solicitar productos.", false);
    return;
  }

  const data = getStock();
  const stock = data[neighborhood];
  const selected = [];

  document.querySelectorAll("#products input").forEach(input => {
    const qty = Number(input.value) || 0;
    if (qty > 0) selected.push({ id: input.dataset.id, qty });
  });

  if (!selected.length) {
    showResult("<strong>No seleccionaste productos.</strong><br>Elige al menos un producto con el selector (+) antes de enviar.", false);
    return;
  }

  // Validación de existencias
  for (const item of selected) {
    if (item.qty > stock[item.id]) {
      const product = PRODUCTS_DATA.find(p => p[0] === item.id);
      showResult(`<strong>Stock insuficiente.</strong><br>${product[1]} solo tiene ${stock[item.id]} disponibles.`, false);
      return;
    }
  }

  // Descontar inventario local
  for (const item of selected) {
    stock[item.id] -= item.qty;
  }
  saveStock(data);

  // Armar lista para pantalla y WhatsApp
  let waMessage = `🚜 *SOLICITUD HAYDAY*\n`;
  waMessage += `👤 *Jugador:* ${name}\n`;
  waMessage += `🏡 *Vecindario:* ${neighborhood}\n\n`;
  waMessage += `📦 *Materiales solicitados:*\n`;

  const lines = selected.map(item => {
    const product = PRODUCTS_DATA.find(p => p[0] === item.id);
    waMessage += `• ${product[1]}: ${item.qty}\n`;
    return `<li>${product[1]} × <strong>${item.qty}</strong></li>`;
  }).join("");

  showResult(`
    <h3>✅ Solicitud registrada</h3>
    <p><strong>${name}</strong> — Vecindario: <strong>${neighborhood}</strong></p>
    <ul>${lines}</ul>
    <p>Redirigiendo a WhatsApp para confirmar el pedido...</p>
  `, true);

  renderProducts();

  // Abrir WhatsApp automáticamente
  const waUrl = `https://wa.me/${CONFIG.adminWhatsApp}?text=${encodeURIComponent(waMessage)}`;
  setTimeout(() => {
    window.open(waUrl, "_blank");
  }, 1000);
});

// Inicialización
renderProducts();
