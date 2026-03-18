const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();

app.use(express.json());

// Usar rutas absolutas para que funcione igual en local y en Vercel
const PUBLIC_DIR = path.join(__dirname, "public");
app.use(express.static(PUBLIC_DIR));

const DATA_FILE = path.join(__dirname, "invitados.json");

let invitados = [];

function cargarInvitados() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const contenido = fs.readFileSync(DATA_FILE, "utf8");
      invitados = contenido ? JSON.parse(contenido) : [];
    } else {
      invitados = [];
    }
  } catch (err) {
    console.error("Error leyendo invitados.json:", err);
    invitados = [];
  }
}

function guardarInvitados() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(invitados, null, 2), "utf8");
}

function generarCodigoUnico() {
  const base = Date.now().toString(36);
  const rnd = Math.random().toString(36).substring(2, 8);
  return `${base}${rnd}`.toUpperCase();
}

// Cargar invitados al iniciar el servidor
cargarInvitados();

// API para crear invitación de invitado
app.post("/api/invitados", (req, res) => {
  const { nombre } = req.body || {};

  if (!nombre || typeof nombre !== "string" || !nombre.trim()) {
    return res.status(400).json({
      ok: false,
      mensaje: "El nombre es obligatorio",
    });
  }

  const codigo = generarCodigoUnico();

  const invitado = {
    id: invitados.length + 1,
    nombre: nombre.trim(),
    codigo,
    llegado: false,
    creadoEn: new Date().toISOString(),
  };

  invitados.push(invitado);
  guardarInvitados();

  res.json({
    ok: true,
    invitado,
  });
});

// API para obtener datos de invitado por código (útil si luego quieres una página /invitacion.html)
app.get("/api/invitados/:codigo", (req, res) => {
  const { codigo } = req.params;

  const invitado =
    invitados.find((i) => i.codigo === codigo) ||
    // compatibilidad: si aún tienes antiguos invitados sin código, permitir buscar por nombre
    invitados.find((i) => i.nombre === codigo);

  if (!invitado) {
    return res.status(404).json({
      ok: false,
      mensaje: "Invitado no encontrado",
    });
  }

  res.json({
    ok: true,
    invitado,
  });
});

// Endpoint que usa el admin al escanear el QR
app.post("/scan", (req, res) => {
  // Nuevo formato: enviamos `codigo` en el cuerpo.
  // Compatibilidad: si sólo viene `nombre`, seguimos intentando buscar por nombre.
  const codigoQR = req.body.codigo || req.body.nombre;

  if (!codigoQR) {
    return res.status(400).json({
      mensaje: "No se recibió código de invitado",
    });
  }

  const invitado =
    invitados.find((i) => i.codigo === codigoQR) ||
    invitados.find((i) => i.nombre === codigoQR);

  if (!invitado) {
    return res.json({
      mensaje: "❌ No está en la lista",
    });
  }

  if (invitado.llegado) {
    return res.json({
      mensaje: "⚠️ Ya había entrado",
    });
  }

  invitado.llegado = true;
  invitado.llegadoEn = new Date().toISOString();
  guardarInvitados();

  res.json({
    mensaje: "✅ Bienvenido " + invitado.nombre,
    invitado,
  });
});

// Exportamos la app para que Vercel pueda usarla
module.exports = app;

// Si se ejecuta directamente con `node server.js`, arrancamos el servidor local
if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Servidor en http://localhost:${port}`);
  });
}