<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin - HayDay</title>
  <link rel="stylesheet" href="style.css">
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
</head>
<body>
  <div class="container">
    <header>
      <h1>⚙️ Panel de Administración</h1>
      <p>Control rápido de inventario y límites por vecindario</p>
    </header>

    <!-- Estado y cupos de los vecindarios -->
    <section class="card">
      <h2>📊 Estado de Cupos (Límite 1,500 por vecindario)</h2>
      <div style="display:flex; gap:15px; flex-wrap:wrap; margin-top:15px;" id="neighborhoods-quota-container">
        <!-- Generado dinámicamente -->
      </div>
    </section>

    <!-- Inventario con edición rápida en celda -->
    <section class="card" style="margin-top:20px; margin-bottom:20px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <h2>📦 Inventario (Edición rápida)</h2>
        <small style="color:#666;">💡 Cambia el número y presiona Enter o fuera de la casilla</small>
      </div>
      <table style="width:100%;">
        <thead>
          <tr>
            <th>Producto</th>
            <th>Vecindario</th>
            <th style="width: 140px;">Stock</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody id="inventory-tbody">
          <tr><td colspan="4">Cargando inventario...</td></tr>
        </tbody>
      </table>
    </section>

    <!-- Solicitudes Recibidas -->
    <section class="card">
      <h2>📥 Solicitudes Recibidas</h2>
      <br>
      <table style="width:100%;">
        <thead>
          <tr>
            <th>Jugador</th>
            <th>Vecindario</th>
            <th>Pedido</th>
            <th>Fecha</th>
          </tr>
        </thead>
        <tbody id="requests-tbody">
          <tr><td colspan="4">Cargando solicitudes...</td></tr>
        </tbody>
      </table>
    </section>
  </div>

  <script src="config.js"></script>
  <script src="admin.js"></script>
</body>
</html>
