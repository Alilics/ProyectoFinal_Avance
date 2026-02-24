// global error catcher para evitar que un fallo JS deje la página en blanco
window.onerror = function(message, source, lineno, colno, error) {
  console.error('JS error', message, 'at', source + ':' + lineno + ':' + colno, error);
  alert(`Error de script: ${message} (línea ${lineno})`);
};

// Variables globales (se usan en login y main)
// proteger en caso de que localStorage esté deshabilitado
const storage = (typeof localStorage !== 'undefined' ? localStorage : {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {}
});

const isGuest = storage.getItem('guest');
let token = storage.getItem('token');
// si el token llega en la query string tras OAuth, guardarlo
try {
  const params = new URLSearchParams(window.location.search);
  if (params.has('token')) {
    token = params.get('token');
    storage.setItem('token', token);
    // limpiar url para no exponer el token en el historial
    window.history.replaceState({}, '', window.location.pathname);
  }
} catch (e) {
  console.warn('No se pudo leer query params', e);
}

const btnEditar = document.getElementById('btnEditar');
const btnGuardar = document.getElementById('btnGuardar');

const campos = ['titulo', 'parrafo1', 'parrafo2'];

/* REDIRECCIONES AUTOMÁTICAS */
// En la página de login, si ya estamos autenticados (token o guest) vamos a /main.html
if (window.location.pathname.endsWith('login.html') || window.location.pathname === '/') {
  if (isGuest || token) {
    window.location.href = '/main.html';
  }
}

// En la página principal, si no hay token ni guest volvemos al login
// admitimos tanto /main como /main.html (por compatibilidad) pero redirigimos
// los enlaces a la versión con extensión para que el servidor entregue el
// archivo estático en lugar de index.html de redirección.
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
  window.location.href = '/main.html';
}

// Manejar botón de Google
const googleBtn = document.getElementById('googleBtn');
if (googleBtn) {
  googleBtn.addEventListener('click', () => {
    window.location.href = '/auth/google';
  });
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
      window.location.href = '/main.html';
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

      // mostrar el mensaje que nos envía el servidor (ej. "Cuenta creada correctamente")
      mensaje.innerText = data.mensaje || 'Cuenta creada correctamente. Puedes iniciar sesión.';
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

// loadNotes puede recibir un objeto con parámetros para la query string
async function loadNotes(params = {}) {
  try {
    const headers = token ? { 'authorization': token } : {};
    let url = '/api/notes';
    const qs = new URLSearchParams(params).toString();
    if (qs) url += '?' + qs;
    const res = await fetch(url, { headers });
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

    // format date
    const dateStr = note.createdAt ? new Date(note.createdAt).toLocaleString() : '';
    div.innerHTML = `
      <h4>${escapeHtml(note.title)}</h4>
      <p>${escapeHtml(note.content)}</p>
      <p class="meta">Autor: ${escapeHtml(ownerName)}</p>
      <p class="meta">Creada: ${escapeHtml(dateStr)}</p>
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

  // medir cuántas notas caben en el contenedor sin scroll
  const card = document.querySelector('.card');
  if (card) {
    const cardHeight = card.clientHeight;
    const noteEl = list.querySelector('.note');
    if (noteEl) {
      const noteHeight = noteEl.clientHeight;
      const capacity = Math.floor(cardHeight / noteHeight);
      console.info(`Capacidad aproximada: ${capacity} notas visibles verticalmente`);

      // mostrar información en la interfaz
      const capElem = document.getElementById('capacityInfo');
      if (capElem) {
        capElem.innerText = `Se muestran ${capacity} notas verticalmente; desplázate para ver más.`;
      }
    }
  }
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

// manejadores de búsqueda de autor
const searchBtn = document.getElementById('searchBtn');
const searchAuthor = document.getElementById('searchAuthor');
if (searchBtn && searchAuthor) {
  searchBtn.addEventListener('click', () => {
    const q = searchAuthor.value.trim();
    const params = {};
    if (q) params.author = q;
    loadNotes(params);
  });
  // permitir hacer enter en el input
  searchAuthor.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      searchBtn.click();
    }
  });
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
        headers: { 'Content-Type': 'application/json', 'authorization': 'Bearer ' + token },
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
        headers: { 'Content-Type': 'application/json', 'authorization': 'Bearer ' + token },
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
    const res = await fetch('/api/notes/' + id, { method: 'DELETE', headers: { 'authorization': 'Bearer ' + token } });
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
