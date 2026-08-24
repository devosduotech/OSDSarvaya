const request = require('supertest');
const app = require('../server'); // This might need server.js to export 'app'

describe('Health Check', () => {
  it('should return ok status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('should return version info', async () => {
    const res = await request(app).get('/api/version');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('appVersion');
  });
});
