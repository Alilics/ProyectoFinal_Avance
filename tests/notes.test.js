const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const Note = require('../src/models/Note');
const bcrypt = require('bcryptjs');

let userToken, adminToken, userId;
beforeAll(async () => {
  const hashed = await bcrypt.hash('pass', 10);
  const user = await User.create({ nombre: 'User', email: 'user@example.com', password: hashed });
  userId = user._id.toString();
  const login1 = await request(app).post('/api/users/login').send({ email: 'user@example.com', password: 'pass' });
  userToken = login1.body.token;

  const hashed2 = await bcrypt.hash('admin', 10);
  const admin = await User.create({ nombre: 'Admin', email: 'admin2@example.com', password: hashed2, role: 'Admin' });
  const login2 = await request(app).post('/api/users/login').send({ email: 'admin2@example.com', password: 'admin' });
  adminToken = login2.body.token;
});

describe('Notas API', () => {
  test('cualquier usuario puede obtener colección vacía', async () => {
    const res = await request(app).get('/api/notes');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(0);
  });

  test('usuario autenticado puede crear nota', async () => {
    const res = await request(app)
      .post('/api/notes')
      .set('authorization', userToken)
      .send({ title: 'Hola', content: 'Contenido' });
    expect(res.statusCode).toBe(201);
    expect(res.body.title).toBe('Hola');
    expect(res.body.owner.toString()).toBe(userId);
    expect(res.body.createdAt).toBeDefined();
  });

  test('creacion de nota rechaza datos inválidos', async () => {
    const res = await request(app)
      .post('/api/notes')
      .set('authorization', userToken)
      .send({ title: '', content: '' });
    expect(res.statusCode).toBe(400);
  });

  test('filtros de búsqueda funcionan', async () => {
    await Note.create({ title: 'Segundo', content: 'blah', owner: userId });
    const res = await request(app).get('/api/notes').query({ title: 'Hola' });
    expect(res.body.length).toBe(1);
  });

  test('búsqueda por autor devuelve notas del usuario correspondiente', async () => {
    // crear nota con otro autor y verificar que no aparezca
    const other = await User.create({ nombre: 'Otro', email: 'otro@example.com', password: await bcrypt.hash('123456', 10) });
    await Note.create({ title: 'Tercera', content: 'otro', owner: other._id });

    const res = await request(app).get('/api/notes').query({ author: 'User' });
    expect(res.body.every(n => n.owner && n.owner.nombre === 'User')).toBe(true);

    const res2 = await request(app).get('/api/notes').query({ author: 'otro' });
    expect(res2.body.length).toBe(1);
    expect(res2.body[0].owner.nombre.toLowerCase()).toBe('otro');
  });

  test('propietario puede actualizar su nota y admin puede actualizar cualquier', async () => {
    const note = await Note.findOne({ title: 'Hola' });
    const res1 = await request(app)
      .put(`/api/notes/${note._id}`)
      .set('authorization', userToken)
      .send({ title: 'Hola editada', content: 'nuevo' });
    expect(res1.body.title).toBe('Hola editada');
    const res2 = await request(app)
      .put(`/api/notes/${note._id}`)
      .set('authorization', adminToken)
      .send({ title: 'Admin edit', content: 'xxx' });
    expect(res2.statusCode).toBe(200);
  });

  test('admin puede borrar cualquier nota', async () => {
    const note = await Note.findOne({ title: 'Admin edit' });
    const res = await request(app)
      .delete(`/api/notes/${note._id}`)
      .set('authorization', adminToken);
    expect(res.statusCode).toBe(200);
  });

  test('guest/otro usuario no puede borrar nota ajena', async () => {
    const note = await Note.findOne({ title: 'Admin edit' });
    const other = await User.create({ nombre: 'Other', email: 'other@example.com', password: await bcrypt.hash('123456', 10) });
    const login = await request(app).post('/api/users/login').send({ email: 'other@example.com', password: '123456' });
    const res = await request(app)
      .delete(`/api/notes/${note._id}`)
      .set('authorization', login.body.token);
    expect(res.statusCode).toBe(403);
  });

  test('admin puede borrar cualquier nota', async () => {
    const note = await Note.findOne({ title: 'Admin edit' });
    const res = await request(app)
      .delete(`/api/notes/${note._id}`)
      .set('authorization', adminToken);
    expect(res.statusCode).toBe(200);
  });
});
