const {
  normalizarNombre,
  construirSaludo,
  construirEchoRespuesta,
  healthPayload,
  sumar,
  respuestaSumaGet,
  respuestaSumaPost,
} = require('../src/lib/ejemplo');

describe('lib/ejemplo', () => {
  describe('normalizarNombre', () => {
    it('usa estudiante si falta o viene vacío', () => {
      expect(normalizarNombre()).toBe('estudiante');
      expect(normalizarNombre('')).toBe('estudiante');
      expect(normalizarNombre('   ')).toBe('estudiante');
    });

    it('recorta espacios', () => {
      expect(normalizarNombre('  Ana  ')).toBe('Ana');
    });
  });

  describe('construirSaludo', () => {
    it('arma el mensaje con el nombre normalizado', () => {
      const out = construirSaludo('Pedro');
      expect(out.metodo).toBe('GET');
      expect(out.ruta).toBe('/api/saludo');
      expect(out.mensaje).toContain('Pedro');
    });
  });

  describe('construirEchoRespuesta', () => {
    it('devuelve objeto vacío si el cuerpo no es un objeto plano', () => {
      expect(construirEchoRespuesta(null).recibido).toEqual({});
      expect(construirEchoRespuesta([]).recibido).toEqual({});
      expect(construirEchoRespuesta('x').recibido).toEqual({});
    });

    it('copia el cuerpo recibido', () => {
      const out = construirEchoRespuesta({ clave: 1 });
      expect(out.recibido).toEqual({ clave: 1 });
      expect(out.metodo).toBe('POST');
      expect(out.ruta).toBe('/api/echo');
    });
  });

  describe('healthPayload', () => {
    it('incluye ok y nombre del servicio', () => {
      const out = healthPayload();
      expect(out.ok).toBe(true);
      expect(out.servicio).toBe('auy1104-api-ejemplo');
    });
  });

  describe('sumar', () => {
    it('suma dos números', () => {
      expect(sumar(2, 3)).toBe(5);
      expect(sumar('1.5', '2.5')).toBe(4);
    });

    it('rechaza valores no numéricos', () => {
      expect(() => sumar('a', 1)).toThrow(TypeError);
      expect(() => sumar(1, Infinity)).toThrow(TypeError);
    });
  });

  describe('respuestaSumaGet / respuestaSumaPost', () => {
    it('formatean respuesta GET y POST', () => {
      expect(respuestaSumaGet(1, 2)).toMatchObject({
        metodo: 'GET',
        ruta: '/api/suma',
        resultado: 3,
      });
      expect(respuestaSumaPost(10, 20)).toMatchObject({
        metodo: 'POST',
        ruta: '/api/suma',
        resultado: 30,
      });
    });
  });
});
