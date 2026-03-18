const fs = require("fs");
const path = require("path");
const os = require("os");

const isVercel = !!process.env.VERCEL;

// Usamos `/tmp` en Vercel porque el FS del proyecto suele ser read-only.
const DATA_FILE = isVercel
  ? path.join(os.tmpdir(), "invitados.json")
  : path.join(process.cwd(), "invitados.json");

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

// Cargamos los invitados la primera vez que se importe la función
cargarInvitados();

function leerBody(req) {
  return new Promise((resolve, reject) => {
    let datos = "";
    req.on("data", (chunk) => {
      datos += chunk;
    });
    req.on("end", () => resolve(datos));
    req.on("error", reject);
  });
}

module.exports = async (req, res) => {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({
        mensaje: "Método no permitido",
      });
    }

    // Nuevo formato: enviamos `codigo` en el cuerpo.
    // Compatibilidad: si sólo viene `nombre`, seguimos intentando buscar por nombre.
    let body = req.body;
    if (!body || typeof body !== "object") {
      const raw = await leerBody(req);
      try {
        body = raw ? JSON.parse(raw) : {};
      } catch {
        body = {};
      }
    }

    const codigoQR = (body && (body.codigo || body.nombre)) || null;

    if (!codigoQR) {
      return res.status(400).json({
        mensaje: "No se recibió código de invitado",
      });
    }

    const invitado =
      invitados.find((i) => i.codigo === codigoQR) ||
      invitados.find((i) => i.nombre === codigoQR);

    if (!invitado) {
      return res.status(200).json({
        mensaje: "❌ No está en la lista",
      });
    }

    if (invitado.llegado) {
      return res.status(200).json({
        mensaje: "⚠️ Ya había entrado",
      });
    }

    invitado.llegado = true;
    invitado.llegadoEn = new Date().toISOString();
    guardarInvitados();

    return res.status(200).json({
      mensaje: "✅ Bienvenido " + invitado.nombre,
      invitado,
    });
  } catch (err) {
    console.error("Error en /api/scan:", err);
    return res.status(500).json({
      mensaje: "Error interno al procesar el escaneo",
    });
  }
};

