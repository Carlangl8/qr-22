const express = require("express");
const fs = require("fs");
const path = require("path");
const os = require("os");

const app = express();

app.use(express.json());

// Usar rutas absolutas para que funcione igual en local y en Vercel
const PUBLIC_DIR = path.join(__dirname, "public");
app.use(express.static(PUBLIC_DIR));

const isVercel = !!process.env.VERCEL;

// Importar lógica desde la carpeta api para que local funcione idéntico a Vercel
app.all("/api/admin/login", require('./api/admin/login.js'));
app.all("/api/invitados", require('./api/invitados.js'));
app.all("/api/scan", require('./api/scan.js'));

// API para obtener datos de invitado por código original (por si se usa en alguna parte)
const { supabase } = require('./lib/supabase');
app.get("/api/invitados/:codigo", async (req, res) => {
  const { codigo } = req.params;

  try {
    const { data: invitado, error } = await supabase
      .from('Users')
      .select('*')
      .or(`Code.eq.${codigo},name.eq.${codigo}`)
      .limit(1)
      .single();

    if (error || !invitado) {
      return res.status(404).json({
        ok: false,
        mensaje: "Invitado no encontrado",
      });
    }

    res.json({
      ok: true,
      invitado: {
        id: invitado.id,
        nombre: invitado.name,
        codigo: invitado.Code,
        llegado: invitado.arrived,
        creadoEn: invitado.created_at,
      },
    });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: "Error del servidor" });
  }
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