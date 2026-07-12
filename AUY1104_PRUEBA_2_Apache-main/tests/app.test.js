const request = require('supertest');
const { createApp } = require('../src/index');

describe('API HTTP (GET y POST)', () => {
  let app;

  beforeAll(() => {
    app = createApp();
  });

  describe('GET /health', () => {
    it('responde 200 y JSON con ok', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });
  });

  describe('GET /api/saludo', () => {
    it('saluda con nombre por query', async () => {
      const res = await request(app)
        .get('/api/saludo')
        .query({ nombre: 'Duoc' });

      expect(res.status).toBe(200);
      expect(res.body.mensaje).toContain('Duoc');
      expect(res.body.metodo).toBe('GET');
    });
  });

  describe('GET /api/suma', () => {
    it('suma a y b por query', async () => {
      const res = await request(app)
        .get('/api/suma')
        .query({ a: '4', b: '5' });

      expect(res.status).toBe(200);
      expect(res.body.resultado).toBe(9);
    });

    it('400 si los parámetros no son números válidos', async () => {
      const res = await request(app)
        .get('/api/suma')
        .query({ a: 'x', b: '1' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });
  });

  describe('POST /api/echo', () => {
    it('devuelve 201 y refleja el JSON enviado', async () => {
      const payload = { curso: 'AUY1104', n: 1 };

      const res = await request(app)
        .post('/api/echo')
        .send(payload)
        .set('Content-Type', 'application/json');

      expect(res.status).toBe(201);
      expect(res.body.recibido).toEqual(payload);
      expect(res.body.metodo).toBe('POST');
    });
  });

  describe('POST /api/suma', () => {
    it('suma a y b del cuerpo JSON', async () => {
      const res = await request(app)
        .post('/api/suma')
        .send({ a: 7, b: 8 });

      expect(res.status).toBe(201);
      expect(res.body.resultado).toBe(15);
    });

    it('400 si el cuerpo no tiene números válidos', async () => {
      const res = await request(app)
        .post('/api/suma')
        .send({ a: 'nope', b: 1 });

      expect(res.status).toBe(400);
    });
  });

  describe('404', () => {
    it('ruta inexistente', async () => {
      const res = await request(app).get('/no/existe');
      expect(res.status).toBe(404);
      expect(res.body.error).toBeDefined();
    });
  });
});
