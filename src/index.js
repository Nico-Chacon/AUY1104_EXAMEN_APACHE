const express = require('express');
const {
  construirSaludo,
  construirEchoRespuesta,
  healthPayload,
  respuestaSumaGet,
  respuestaSumaPost,
} = require('./lib/ejemplo');

function createApp() {
  const app = express();

  app.use(express.json());

app.get('/health', (req, res) => {
  if (process.env.FORCE_HEALTH_FAIL === 'true') {
    return res.status(500).json({ ok: false, error: 'Fallo forzado (chaos test)' });
  }
  res.json(healthPayload());
});

  app.get('/api/saludo', (req, res) => {
    res.json(construirSaludo(req.query.nombre));
  });

  app.post('/api/echo', (req, res) => {
    res.status(201).json(construirEchoRespuesta(req.body));
  });

  app.get('/api/suma', (req, res) => {
    try {
      res.json(respuestaSumaGet(req.query.a, req.query.b));
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/suma', (req, res) => {
    try {
      const { a, b } = req.body || {};
      res.status(201).json(respuestaSumaPost(a, b));
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  app.use((req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
  });

  return app;
}

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  createApp().listen(PORT, () => {
    console.log(`API escuchando en http://0.0.0.0:${PORT}`);
  });
}

module.exports = { createApp };
