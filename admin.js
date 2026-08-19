// admin.js
async function loadAdminData() {
  loadInventory();
  loadRequests();
}

async function loadInventory() {
  const tbody = document.querySelector("#inventory-table tbody");
  tbody.innerHTML = "<tr><td colspan='4'>Cargando...</td></tr>";

  const { data, error } = await supabaseClient.from("productos").select("*");
  if (error || !data) return;

  tbody.innerHTML = "";
  data.forEach(p => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.nombre}</td>
      <td>${p.vecindario}</td>
      <td>${p.stock}</td>
      <td>
        <button style="background:#e74c3c; padding:4px 8px; font-size:0.8rem;" onclick="deleteProduct(${p.id})">Eliminar</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function loadRequests() {
  const tbody = document.querySelector("#requests-table tbody");
  tbody.innerHTML = "<tr><td colspan='4'>Cargando...</td></tr>";

  const { data, error } = await supabaseClient.from("solicitudes").select("*").order("created_at", { ascending: false });
  if (error || !data) return;

  tbody.innerHTML = "";
  data.forEach(req => {
    const itemsText = req.items.map(i => `${i.nombre} (x${i.cantidad})`).join(", ");
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${req.jugador}</td>
      <td>${req.vecindario}</td>
      <td>${itemsText}</td>
      <td><b>${req.estado}</b></td>
    `;
    tbody.appendChild(tr);
  });
}

async function saveProduct() {
  const nombre = document.getElementById("p-name").value.trim();
  const stock = parseInt(document.getElementById("p-stock").value);
  const imagen_url = document.getElementById("p-img").value.trim();
  const vecindario = document.getElementById("p-neighborhood").value;

  if (!nombre || isNaN(stock)) {
    alert("Completa el nombre y el stock correctamente.");
    return;
  }

  const { error } = await supabaseClient.from("productos").insert([
    { nombre, stock, imagen_url, vecindario }
  ]);

  if (error) {
    alert("Error al guardar producto: " + error.message);
  } else {
    document.getElementById("p-name").value = "";
    document.getElementById("p-stock").value = "";
    document.getElementById("p-img").value = "";
    loadInventory();
  }
}

async function deleteProduct(id) {
  if (!confirm("¿Seguro que deseas eliminar este producto?")) return;
  await supabaseClient.from("productos").delete().eq("id", id);
  loadInventory();
}

document.getElementById("btn-save-prod").addEventListener("click", saveProduct);
window.addEventListener("DOMContentLoaded", loadAdminData);
