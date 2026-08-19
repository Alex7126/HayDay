// admin.js
const NEIGHBORHOOD_MAX = 1500;

async function loadAdminData() {
  await Promise.all([loadQuotas(), loadInventory(), loadRequests()]);
}

// 1. Mostrar estado de cupos de cada vecindario
async function loadQuotas() {
  const container = document.getElementById("neighborhoods-quota-container");
  if (!container) return;

  const neighborhoods = ["Crueles", "Dráculas"];
  const { data, error } = await supabaseClient.from("solicitudes").select("items, vecindario");

  const usage = { Crueles: 0, "Dráculas": 0 };

  if (data) {
    data.forEach(sol => {
      let items = sol.items;
      if (typeof items === "string") {
        try { items = JSON.parse(items); } catch (e) { items = []; }
      }
      if (Array.isArray(items) && usage[sol.vecindario] !== undefined) {
        items.forEach(i => {
          usage[sol.vecindario] += Number(i.cantidad) || 0;
        });
      }
    });
  }

  container.innerHTML = "";

  neighborhoods.forEach(vec => {
    const pedidos = usage[vec] || 0;
    const restantes = Math.max(0, NEIGHBORHOOD_MAX - pedidos);
    const agotado = restantes <= 0;

    const card = document.createElement("div");
    card.style.cssText = `
      flex: 1;
      min-width: 250px;
      padding: 16px;
      border-radius: 10px;
      border: 2px solid ${agotado ? "#e53935" : "#4caf50"};
      background: ${agotado ? "#ffebee" : "#f1f8e9"};
    `;

    card.innerHTML = `
      <h3 style="color:${agotado ? "#c62828" : "#2e7d32"}; margin-bottom:8px;">
        ${vec} ${agotado ? "⚠️ (SIN CUPO)" : "✅"}
      </h3>
      <p style="font-size:1.1rem; margin-bottom:6px;">
        Disponibles: <strong>${restantes}</strong> / ${NEIGHBORHOOD_MAX}
      </p>
      <small style="color:#555;">Total pedido hasta ahora: ${pedidos} productos</small>
      <div style="margin-top:12px;">
        <button onclick="resetNeighborhoodOrders('${vec}')" style="background:#e53935; padding:6px 10px; font-size:0.8rem; border-radius:6px; color:white; border:none; cursor:pointer;">
          🔄 Resetear cupo de ${vec}
        </button>
      </div>
    `;
    container.appendChild(card);
  });
}

// 2. Cargar inventario editable directamente
async function loadInventory() {
  const tbody = document.getElementById("inventory-tbody");
  if (!tbody) return;

  const { data, error } = await supabaseClient
    .from("productos")
    .select("*")
    .order("vecindario", { ascending: true })
    .order("nombre", { ascending: true });

  if (error || !data) {
    tbody.innerHTML = `<tr><td colspan="4">Error al cargar: ${error?.message || "Sin datos"}</td></tr>`;
    return;
  }

  tbody.innerHTML = "";
  data.forEach(p => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${p.nombre}</strong></td>
      <td><span style="background:#e0e0e0; padding:2px 8px; border-radius:4px; font-size:0.85rem;">${p.vecindario}</span></td>
      <td>
        <input 
          type="number" 
          id="stock-input-${p.id}" 
          value="${p.stock}" 
          min="0" 
          style="width:85px; padding:5px; text-align:center; font-weight:bold;"
          onchange="quickUpdateStock(${p.id}, this.value)"
        >
      </td>
      <td>
        <button style="background:#e74c3c; padding:5px 10px; font-size:0.8rem; border-radius:6px; color:white; border:none; cursor:pointer;" onclick="deleteProduct(${p.id})">Eliminar</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// 3. Modificación directa en la base de datos
async function quickUpdateStock(id, newStock) {
  const stockVal = Math.max(0, parseInt(newStock) || 0);
  const input = document.getElementById(`stock-input-${id}`);
  if (input) input.style.borderColor = "#ff9800";

  const { error } = await supabaseClient
    .from("productos")
    .update({ stock: stockVal })
    .eq("id", id);

  if (error) {
    alert("Error al actualizar: " + error.message);
    if (input) input.style.borderColor = "#e74c3c";
  } else {
    if (input) {
      input.style.borderColor = "#4caf50";
      setTimeout(() => { input.style.borderColor = ""; }, 1000);
    }
  }
}

// 4. Resetear solicitudes de un vecindario para restaurar sus 1,500 cupos
async function resetNeighborhoodOrders(vecindario) {
  if (!confirm(`¿Seguro que deseas reiniciar el cupo de pedidos para "${vecindario}" a 1,500?`)) return;

  const { error } = await supabaseClient
    .from("solicitudes")
    .delete()
    .eq("vecindario", vecindario);

  if (error) {
    alert("Error al resetear: " + error.message);
  } else {
    alert(`Cupo de ${vecindario} restaurado a 1,500.`);
    loadQuotas();
    loadRequests();
  }
}

// 5. Cargar lista de solicitudes
async function loadRequests() {
  const tbody = document.getElementById("requests-tbody");
  if (!tbody) return;

  const { data, error } = await supabaseClient
    .from("solicitudes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !data) {
    tbody.innerHTML = `<tr><td colspan="4">Error al cargar solicitudes.</td></tr>`;
    return;
  }

  tbody.innerHTML = "";
  if (data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4">No hay solicitudes registradas.</td></tr>`;
    return;
  }

  data.forEach(req => {
    let items = req.items;
    if (typeof items === "string") {
      try { items = JSON.parse(items); } catch (e) { items = []; }
    }
    const itemsText = Array.isArray(items) 
      ? items.map(i => `${i.nombre} (x${i.cantidad})`).join(", ")
      : "Sin detalle";

    const fecha = new Date(req.created_at).toLocaleString("es-MX");
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${req.jugador}</strong></td>
      <td>${req.vecindario}</td>
      <td>${itemsText}</td>
      <td><small>${fecha}</small></td>
    `;
    tbody.appendChild(tr);
  });
}

async function deleteProduct(id) {
  if (!confirm("¿Seguro que deseas eliminar este producto?")) return;
  await supabaseClient.from("productos").delete().eq("id", id);
  loadInventory();
}

window.addEventListener("DOMContentLoaded", loadAdminData);
