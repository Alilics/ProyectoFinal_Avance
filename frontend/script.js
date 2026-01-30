// Variables globales (se usan en login y main)
const isGuest = localStorage.getItem('guest');
const token = localStorage.getItem('token');

const btnEditar = document.getElementById('btnEditar');
const btnGuardar = document.getElementById('btnGuardar');

const campos = ['titulo', 'parrafo1', 'parrafo2'];

/* REDIRECCIONES AUTOMÁTICAS */
// En la página de login, si ya estamos autenticados (token o guest) vamos a /main
if (window.location.pathname.endsWith('login.html') || window.location.pathname === '/') {
  if (isGuest || token) {
    window.location.href = '/main';
  }
}

// En la página principal, si no hay token ni guest volvemos al login
if (window.location.pathname.endsWith('main.html') || window.location.pathname === '/main') {
  if (!isGuest && !token) {
    window.location.href = '/';
  }
}

/* OCULTAR EDICIÓN A GUEST */
if (isGuest && btnEditar) {
  btnEditar.style.display = 'none';
}

/* CARGAR CONTENIDO GUARDADO */
campos.forEach(id => {
  const elemento = document.getElementById(id);
  if (!elemento) return;
  const valor = localStorage.getItem(id);
  if (valor) {
    elemento.innerText = valor;
  }
});

/* ACTIVAR EDICIÓN */
function activarEdicion() {
  campos.forEach(id => {
    document.getElementById(id).contentEditable = true;
  });
  btnEditar.style.display = 'none';
  btnGuardar.style.display = 'inline-block';
}

/* GUARDAR CAMBIOS */
function guardarCambios() {
  campos.forEach(id => {
    const contenido = document.getElementById(id).innerText;
    localStorage.setItem(id, contenido);
    document.getElementById(id).contentEditable = false;
  });

  btnGuardar.style.display = 'none';
  btnEditar.style.display = 'inline-block';
}

/* FUNCIONES DE LOGIN */
// Entrar como invitado
function entrarGuest() {
  localStorage.setItem('guest', 'true');
  localStorage.removeItem('token');
  window.location.href = '/main';
}

// Manejar envío del formulario de login
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const mensaje = document.getElementById('mensaje');

    try {
      const res = await fetch('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (!res.ok) {
        mensaje.innerText = data.mensaje || data.error || 'Error en el login';
        mensaje.style.color = 'red';
        return;
      }

      // Guardar token y limpiar flag guest
      localStorage.setItem('token', data.token);
      localStorage.removeItem('guest');

      // Redirigir a la página principal
      window.location.href = '/main';
    } catch (err) {
      mensaje.innerText = 'Error de conexión';
      mensaje.style.color = 'red';
    }
  });
}

// Manejar registro rápido (solo para pruebas)
const registerForm = document.getElementById('registerForm');
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nombre = document.getElementById('nombre').value;
    const email = document.getElementById('emailReg').value;
    const password = document.getElementById('passwordReg').value;
    const mensaje = document.getElementById('mensaje');

    try {
      const res = await fetch('/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, email, password })
      });

      const data = await res.json();

      if (!res.ok) {
        mensaje.innerText = data.mensaje || 'Error al crear usuario';
        mensaje.style.color = 'red';
        return;
      }

      mensaje.innerText = 'Cuenta creada correctamente. Puedes iniciar sesión.';
      mensaje.style.color = 'green';
      registerForm.reset();
    } catch (err) {
      mensaje.innerText = 'Error de conexión';
      mensaje.style.color = 'red';
    }
  });
}
/* LOGOUT */
function logout() {
  localStorage.clear();
  window.location.href = '/';
}

/* ------------------ Notas (crear/listar/editar) ------------------ */
// Helper para escapar HTML simple
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function loadNotes() {
  try {
    const headers = token ? { 'authorization': token } : {};
    const res = await fetch('/api/notes', { headers });
    const notes = await res.json();
    renderNotes(notes);
  } catch (err) {
    console.error(err);
  }
}

function renderNotes(notes) {
  const list = document.getElementById('notesList');
  if (!list) return;
  list.innerHTML = '';

  notes.forEach((note, idx) => {
    const div = document.createElement('div');
    div.className = 'note';
    div.dataset.id = note.id;
    // Índice para escalonar la animación
    div.style.setProperty('--i', idx);

    const ownerName = note.owner ? note.owner.nombre : 'Anónimo';

    div.innerHTML = `
      <h4>${escapeHtml(note.title)}</h4>
      <p>${escapeHtml(note.content)}</p>
      <p class="meta">Autor: ${escapeHtml(ownerName)}</p>
    `;

    if (note.canEdit) {
      const editBtn = document.createElement('button');
      editBtn.innerText = 'Editar';
      editBtn.onclick = () => startEdit(note.id, note.title, note.content);

      const delBtn = document.createElement('button');
      delBtn.innerText = 'Eliminar';
      delBtn.onclick = () => deleteNote(note.id);

      div.appendChild(editBtn);
      div.appendChild(delBtn);
    }

    list.appendChild(div);
  });
}

// Mostrar mensaje y ocultar formulario para invitados
const notesMessage = document.getElementById('notesMessage');
const noteForm = document.getElementById('noteForm');
if (isGuest) {
  if (noteForm) noteForm.style.display = 'none';
  if (notesMessage) {
    notesMessage.innerText = 'Inicia sesión para crear notas. (Los invitados no pueden crear, editar ni eliminar notas)';
  }
}

// Crear nota
if (noteForm) {
  noteForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Bloquear acción para invitados y sin token
    if (isGuest || !token) {
      alert('Debes iniciar sesión para crear notas');
      return;
    }

    const title = document.getElementById('noteTitle').value;
    const content = document.getElementById('noteContent').value;

    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'authorization': token },
        body: JSON.stringify({ title, content })
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.mensaje || 'Error creando nota');
        return;
      }

      noteForm.reset();
      loadNotes();
    } catch (err) {
      alert('Error de conexión');
    }
  });
}

// Editar nota (interfaz inline)
function startEdit(id, oldTitle, oldContent) {
  // Bloquear si no hay token (invitado)
  if (isGuest || !token) {
    alert('No autorizado. Inicia sesión para editar notas.');
    return;
  }

  const div = document.querySelector(`div.note[data-id="${id}"]`);
  if (!div) return;

  div.innerHTML = `
    <input type="text" class="editTitle" value="${escapeHtml(oldTitle)}">
    <textarea class="editContent">${escapeHtml(oldContent)}</textarea>
    <button class="saveBtn">Guardar</button>
    <button class="cancelBtn">Cancelar</button>
  `;

  div.querySelector('.saveBtn').onclick = async () => {
    const newTitle = div.querySelector('.editTitle').value;
    const newContent = div.querySelector('.editContent').value;

    try {
      const res = await fetch('/api/notes/' + id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'authorization': token },
        body: JSON.stringify({ title: newTitle, content: newContent })
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.mensaje || 'Error al guardar');
        loadNotes();
        return;
      }

      loadNotes();
    } catch (err) {
      alert('Error de conexión');
    }
  };

  div.querySelector('.cancelBtn').onclick = () => loadNotes();
}

// Eliminar nota
async function deleteNote(id) {
  // Bloquear si no hay token (invitado)
  if (isGuest || !token) {
    alert('No autorizado. Inicia sesión para eliminar notas.');
    return;
  }

  if (!confirm('¿Eliminar nota?')) return;
  try {
    const res = await fetch('/api/notes/' + id, { method: 'DELETE', headers: { 'authorization': token } });
    let data;
    try {
      data = await res.json();
    } catch (e) {
      data = { mensaje: 'Respuesta vacía del servidor' };
    }

    if (!res.ok) {
      console.error('[DELETE] status:', res.status, 'body:', data);
      alert((data && data.mensaje) ? `${data.mensaje} (Código ${res.status})` : `Error al eliminar (Código ${res.status})`);
      return;
    }

    loadNotes();
  } catch (err) {
    console.error('[DELETE] error de conexión:', err);
    alert('Error de conexión');
  }
}

// Cargar notas al abrir main
if (window.location.pathname.endsWith('main.html') || window.location.pathname === '/main') {
  loadNotes();
}
