const request = require('supertest');
const { createApp } = require('../../src/app');
const sessionStore = require('../../src/store/sessionStore');

describe('API integration', () => {
  let app;

  beforeEach(() => {
    sessionStore.reset();
    app = createApp();
  });

  describe('GET /health', () => {
    it('returns ok status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });

  describe('POST /input', () => {
    it('accepts valid cargo and tank data', async () => {
      const payload = {
        cargos: [{ id: 'C1', volume: 100 }],
        tanks: [{ id: 'T1', capacity: 200 }],
      };

      const res = await request(app).post('/input').send(payload);
      expect(res.status).toBe(200);
      expect(res.body.data.cargoCount).toBe(1);
      expect(res.body.data.tankCount).toBe(1);
    });

    it('rejects empty cargos array', async () => {
      const res = await request(app)
        .post('/input')
        .send({ cargos: [], tanks: [{ id: 'T1', capacity: 100 }] });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Invalid input/i);
    });

    it('rejects duplicate cargo ids', async () => {
      const res = await request(app)
        .post('/input')
        .send({
          cargos: [
            { id: 'C1', volume: 100 },
            { id: 'C1', volume: 200 },
          ],
          tanks: [{ id: 'T1', capacity: 500 }],
        });

      expect(res.status).toBe(400);
      expect(res.body.details).toEqual(
        expect.arrayContaining([expect.stringMatching(/duplicate cargo/i)])
      );
    });
  });

  describe('POST /input/sample', () => {
    it('loads assignment demo data', async () => {
      const res = await request(app).post('/input/sample');
      expect(res.status).toBe(200);
      expect(res.body.data.cargoCount).toBe(10);
      expect(res.body.data.tankCount).toBe(10);
    });
  });

  describe('POST /optimize', () => {
    it('returns 400 when no input was provided', async () => {
      const res = await request(app).post('/optimize');
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/POST \/input first/i);
    });

    it('runs optimization after input is saved', async () => {
      await request(app)
        .post('/input')
        .send({
          cargos: [{ id: 'C1', volume: 500 }],
          tanks: [
            { id: 'T1', capacity: 300 },
            { id: 'T2', capacity: 300 },
          ],
        });

      const res = await request(app).post('/optimize');
      expect(res.status).toBe(200);
      expect(res.body.data.allocations).toHaveLength(2);
      expect(res.body.data.summary.totalLoaded).toBe(500);
      expect(res.body.data.meta.durationMs).toBeDefined();
    });
  });

  describe('GET /results', () => {
    it('returns 404 before optimization', async () => {
      await request(app).post('/input/sample');
      const res = await request(app).get('/results');
      expect(res.status).toBe(404);
    });

    it('returns results after optimize', async () => {
      await request(app).post('/input/sample');
      await request(app).post('/optimize');

      const res = await request(app).get('/results');
      expect(res.status).toBe(200);
      expect(res.body.data.allocations.length).toBeGreaterThan(0);
      expect(res.body.data.summary).toBeDefined();
    });
  });

  describe('full workflow', () => {
    it('input → optimize → results flow works end to end', async () => {
      const inputRes = await request(app).post('/input/sample');
      expect(inputRes.status).toBe(200);

      const optRes = await request(app).post('/optimize');
      expect(optRes.status).toBe(200);

      const resultsRes = await request(app).get('/results');
      expect(resultsRes.status).toBe(200);

      expect(optRes.body.data.summary.totalLoaded).toBe(
        resultsRes.body.data.summary.totalLoaded
      );
    });
  });
});
