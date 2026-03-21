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
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      mensaje: "Método no permitido",
    });
  }

  try {
    // Vercel normalmente procesa body, pero por si acaso aplicamos la misma lógica que scan.js
    let body = req.body;
    if (!body || typeof body !== "object") {
      const raw = await leerBody(req);
      try {
        body = raw ? JSON.parse(raw) : {};
      } catch {
        body = {};
      }
    }

    const { username, password } = body;
    
    if (username === "carlangl" && password === "Carlayuhai8") {
      return res.status(200).json({ ok: true, token: "admin-token-22" });
    } else {
      return res.status(401).json({ ok: false, mensaje: "Credenciales incorrectas" });
    }
  } catch (err) {
    console.error("Error en /api/admin/login:", err);
    return res.status(500).json({
      ok: false,
      mensaje: "Error interno",
    });
  }
};
