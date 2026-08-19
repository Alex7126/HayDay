// admin.js
async function loadAdminData() {
  await Promise.all([loadInventory(), loadRequests()]);
}

async function loadInventory() {
  const tbody = document.getElementById("inventory-tbody");
  if (!tbody) return;

  const { data, error } = await supabaseClient
    .from("productos")
    .select("*")
    .order("vecindario", { ascending: true })
    .order("nombre", { ascending: true });

  if (error || !data) {
    tbody.innerHTML = `<tr><td colspan="4">Error al cargar: ${error ? error.message : "Sin datos"}</td></tr>`;
    return;
  }

  tbody.innerHTML = "";
  data.forEach(p => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.nombre}</td>
      <td><b>${p.vecindario}</b></td>
      <td>${p.stock}</td>
      <td>
        <button style="background:#e74c3c; padding:4px 8px; font-size:0.8rem; border-radius:4px; color:white; border:none; cursor:pointer;" onclick="deleteProduct(${p.id})">Eliminar</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function loadRequests() {
  const tbody = document.getElementById("requests-tbody");
  if (!tbody) return;

  const { data, error } = await supabaseClient
    .from("solicitudes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !data) {
    tbody.innerHTML = `<tr><td colspan="4">Error al cargar: ${error ? error.message : "Sin datos"}</td></tr>`;
    return;
  }

  tbody.innerHTML = "";
  if (data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4">No hay solicitudes aún.</td></tr>`;
    return;
  }

  data.forEach(req => {
    const itemsText = req.items.map(i => `${i.nombre} (x${i.cantidad})`).join(", ");
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

async function saveProduct() {
  const codigo = document.getElementById("p-code").value.trim().toLowerCase();
  const nombre = document.getElementById("p-name").value.trim();
  const stock = parseInt(document.getElementById("p-stock").value);
  const vecindario = document.getElementById("p-neighborhood").value;

  if (!codigo || !nombre || isNaN(stock)) {
    alert("Por favor llena todos los campos correctamente.");
    return;
  }

  const { error } = await supabaseClient.from("productos").upsert(
    { codigo, nombre, stock, vecindario },
    { onConflict: "codigo,vecindario" }
  );

  if (error) {
    alert("Error al guardar: " + error.message);
  } else {
    document.getElementById("p-code").value = "";
    document.getElementById("p-name").value = "";
    document.getElementById("p-stock").value = "1000";
    loadInventory();
  }
}

async function deleteProduct(id) {
  if (!confirm("¿Seguro que deseas eliminar este producto?")) return;
  await supabaseClient.from("productos").delete().eq("id", id);
  loadInventory();
}

document.getElementById("btn-save-prod")?.addEventListener("click", saveProduct);
window.addEventListener("DOMContentLoaded", loadAdminData);
