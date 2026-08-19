const products = [
  ["langosta", "🦞 Langosta", 80],
  ["pescado", "🐟 Pescado", 100],
  ["miel", "🍯 Miel", 80],
  ["nata", "🥛 Nata", 80],
  ["mantequilla", "🧈 Mantequilla", 80],
  ["queso_vaca", "🧀 Queso de vaca", 80],
  ["queso_cabra", "🐐 Queso de cabra", 60],
  ["leche", "🥛 Leche", 180],
  ["huevo", "🥚 Huevo", 180],
  ["beicon", "🥓 Beicon", 100],
  ["pan", "🍞 Pan", 140],
  ["pan_maiz", "🌽 Pan de maíz", 100],
  ["tela", "🧵 Tela", 70],
  ["sierras", "🪚 Sierras", 35],
  ["hachas", "🪓 Hachas", 35],
  ["tnt", "💣 TNT", 35],
  ["dinamita", "🧨 Dinamita", 35],
  ["palas", "⛏️ Palas", 35],
  ["azucar_morena", "🟤 Azúcar morena", 80],
  ["azucar_blanca", "⚪ Azúcar blanca", 80],
  ["almibar", "🍯 Almíbar", 60],
  ["galletas", "🍪 Galletas", 70],
  ["especial", "⭐ Producto especial", 80]
];

const STORAGE_KEY = "hayDayShopV1";

function initialData() {
  const data = {};
  for (const neighborhood of ["1", "2"]) {
    data[neighborhood] = {};
    for (const [id, name, stock] of products) data[neighborhood][id] = stock;
  }
  return data;
}

function getStock() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    const fresh = initialData();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    return fresh;
  }
  return JSON.parse(saved);
}

function saveStock(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function renderProducts() {
  const neighborhood = document.getElementById("neighborhood").value;
  const stock = getStock()[neighborhood];
  const container = document.getElementById("products");
  container.innerHTML = "";

  for (const [id, name] of products) {
    const available = stock[id];
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
  const stock = getStock()[neighborhood];
  const total = Object.values(stock).reduce((a, b) => a + b, 0);
  const max = products.reduce((a, p) => a + p[2], 0);
  document.getElementById("totalStock").textContent = `${total} / ${max}`;
}

function showResult(html, ok = true) {
  const box = document.getElementById("result");
  box.className = `card result ${ok ? "success" : "error"}`;
  box.innerHTML = html;
  box.classList.remove("hidden");
  window.scrollTo({ top: box.offsetTop - 20, behavior: "smooth" });
}

document.getElementById("neighborhood").addEventListener("change", renderProducts);

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
    showResult("<strong>No seleccionaste productos.</strong><br>Elige al menos un producto.", false);
    return;
  }

  for (const item of selected) {
    if (item.qty > stock[item.id]) {
      const product = products.find(p => p[0] === item.id);
      showResult(`<strong>Stock insuficiente.</strong><br>${product[1]} solo tiene ${stock[item.id]} disponibles.`, false);
      return;
    }
  }

  for (const item of selected) stock[item.id] -= item.qty;
  saveStock(data);

  const lines = selected.map(item => {
    const product = products.find(p => p[0] === item.id);
    return `<li>${product[1]} × <strong>${item.qty}</strong></li>`;
  }).join("");

  showResult(`
    <h3>✅ Solicitud registrada</h3>
    <p><strong>${name}</strong> — Vecindario ${neighborhood}</p>
    <ul>${lines}</ul>
    <p>El stock se actualizó correctamente.</p>
  `);

  renderProducts();
});

renderProducts();
