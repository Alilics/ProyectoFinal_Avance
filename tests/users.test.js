const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const bcrypt = require('bcryptjs');

describe('Usuarios API', () => {
  let adminToken;
  beforeAll(async () => {
    // crear admin directamente en la DB
    const hashed = await bcrypt.hash('adminpass', 10);
    const admin = await User.create({ nombre: 'Admin', email: 'admin@example.com', password: hashed, role: 'Admin' });
    const res = await request(app).post('/api/users/login').send({ email: 'admin@example.com', password: 'adminpass' });
    adminToken = res.body.token;
  });

  test('registro público crea usuario con rol User', async () => {
    const res = await request(app).post('/api/users/register').send({
      nombre: 'Test',
      email: 'test@example.com',
      password: 'secret123'
    });
    expect(res.statusCode).toBe(201);
    expect(res.body.email).toBe('test@example.com');
    expect(res.body.role).toBeUndefined(); // register no devuelve role

    const user = await User.findOne({ email: 'test@example.com' });
    expect(user).not.toBeNull();
    expect(user.role).toBe('User');
  });

  test('login with wrong credentials fails', async () => {
    const res = await request(app).post('/api/users/login').send({ email: 'test@example.com', password: 'wrong' });
    expect(res.statusCode).toBe(400);
  });

  test('registro rechaza datos inválidos', async () => {
    const res = await request(app).post('/api/users/register').send({ email: 'notanemail', password: '123' });
    expect(res.statusCode).toBe(400);
  });

  test('Admin puede crear otro usuario especificando rol', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('authorization', adminToken)
      .send({ nombre: 'Guest1', email: 'guest@example.com', password: '123456', role: 'Guest' });
    expect(res.statusCode).toBe(201);
    expect(res.body.role).toBe('Guest');
  });

  test('usuario normal no puede crear usuario', async () => {
    const normal = await User.create({ nombre: 'Normal', email: 'normal@example.com', password: await bcrypt.hash('123456', 10) });
    const login = await request(app).post('/api/users/login').send({ email: 'normal@example.com', password: '123456' });
    const res = await request(app)
      .post('/api/users')
      .set('authorization', login.body.token)
      .send({ nombre: 'X', email: 'x@example.com', password: 'pass' });
    expect(res.statusCode).toBe(403);
  });

  test('admin puede cambiar rol de otro usuario', async () => {
    const other = await User.create({ nombre: 'Other2', email: 'other2@example.com', password: await bcrypt.hash('123456', 10) });
    const res = await request(app)
      .put(`/api/users/${other._id}`)
      .set('authorization', adminToken)
      .send({ role: 'Admin' });
    expect(res.statusCode).toBe(200);
    const updated = await User.findById(other._id);
    expect(updated.role).toBe('Admin');
  });
});