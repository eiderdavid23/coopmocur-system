import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import { getDatabase, ref, push, set, remove, update, onValue, get, query, orderByChild, equalTo } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-database.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCM64Ulnhcq4v6x7u_vvAdM9aJx5UswpPA",
  authDomain: "mani-garcia.firebaseapp.com",
  databaseURL: "https://mani-garcia-default-rtdb.firebaseio.com",
  projectId: "mani-garcia",
  storageBucket: "mani-garcia.firebasestorage.app",
  messagingSenderId: "972544162856",
  appId: "1:972544162856:web:d81f315844e0aae849c91d",
  measurementId: "G-B93SWZ447K"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

const productosRef = ref(db, 'delimani_productos');
const historialRef = ref(db, 'delimani_historial');
const usuariosRef = ref(db, 'usuarios');
const gastosRef = ref(db, 'delimani_gastos');
const pedidosRef = ref(db, 'delimani_pedidos');
const apartadosRef = ref(db, 'delimani_apartados');

const adminTelegramRef = ref(db, 'delimani_admin_telegram');
const telegramConfigRef = ref(db, 'delimani_config/telegram');

// El token del bot ya NO esta en el codigo: vive en Firebase (delimani_config/telegram/token)
window.guardarChatIdTelegramPropio = function(uid, chatId) {
  return set(ref(db, 'delimani_admin_telegram/' + uid), chatId);
};

window.guardarTokenTelegram = function(token) {
  return set(ref(db, 'delimani_config/telegram/token'), token);
};

window.estadoTelegram = async function(uid) {
  try {
    const cfg = await get(telegramConfigRef);
    const token = cfg.val() && cfg.val().token;
    if (!token) return { ok: false, motivo: 'falta el token' };
    const idSnap = await get(ref(db, 'delimani_admin_telegram/' + uid));
    const chatId = idSnap.val();
    if (!chatId) return { ok: false, motivo: 'falta tu chat_id' };
    const bot = await (await fetch('https://api.telegram.org/bot' + token + '/getMe')).json();
    if (!bot.ok) return { ok: false, motivo: 'token inválido' };
    const chat = await (await fetch('https://api.telegram.org/bot' + token + '/getChat?chat_id=' + encodeURIComponent(chatId))).json();
    if (!chat.ok) return { ok: false, motivo: 'escríbele /start a tu bot' };
    return { ok: true, motivo: '' };
  } catch (e) {
    return { ok: false, motivo: 'sin conexión' };
  }
};

async function obtenerChatIdsAdmin() {
  const snap = await get(adminTelegramRef);
  return Object.values(snap.val() || {}).filter(Boolean);
}

function enviarMensajeTelegram(token, chatId, mensaje) {
  fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: mensaje })
  }).catch(err => console.error('Error enviando notificación a Telegram:', err));
}

async function notificarTelegram(mensaje) {
  try {
    const cfg = await get(telegramConfigRef);
    const token = cfg.val() && cfg.val().token;
    if (!token) return;
    const ids = await obtenerChatIdsAdmin();
    ids.forEach(id => enviarMensajeTelegram(token, id, mensaje));
  } catch (e) { console.error('Telegram:', e); }
}

async function perfilSiValido(uid) {
  const snap = await get(ref(db, 'usuarios/' + uid));
  const datos = snap.val();
  if (!datos || datos.estado === 'pendiente') return null;
  return { nombre: datos.nombreCompleto || datos.usuario, negocio: datos.negocio || '', telefono: datos.telefono || '', rol: datos.rol, aceptoTerminos: !!datos.aceptoTerminos, _key: uid };
}

// --- Auto-registro de clientes (catálogo público) ---
const DOMINIO_INTERNO = '@mani-garcia.local';
function limpiarUsuario(u) { return u.trim().toLowerCase().replace(/\s+/g, ''); }

async function resolverCorreo(entrada) {
  const x = entrada.trim().toLowerCase();
  if (x.includes('@')) return x;
  try {
    const snap = await get(ref(db, 'login_index/' + limpiarUsuario(x)));
    if (snap.exists()) return snap.val();
  } catch (e) { console.error('No se pudo buscar el usuario:', e); }
  return null;
}

window.registrarClienteFirebase = async function(usuario, negocio, telefono, password, nombreCompleto, correo) {
  correo = correo.trim().toLowerCase();
  usuario = limpiarUsuario(usuario);
  try {
    const existe = await get(ref(db, 'login_index/' + usuario));
    if (existe.exists()) { const err = new Error('usuario-existe'); err.code = 'app/usuario-existe'; throw err; }
  } catch (e) {
    if (e.code === 'app/usuario-existe') throw e;
    console.error('No se pudo revisar el usuario:', e);
  }
  const credencial = await createUserWithEmailAndPassword(auth, correo, password);
  const uid = credencial.user.uid;
  await set(ref(db, 'usuarios/' + uid), { usuario, nombreCompleto: nombreCompleto || usuario, correo, negocio: negocio || '', telefono: telefono || '', rol: 'cliente', estado: 'aprobado', aceptoTerminos: true, versionTerminos: '1.0', fechaAceptacion: Date.now() });
  try { await set(ref(db, 'login_index/' + usuario), correo); } catch (e) { console.error('No se pudo guardar el indice de usuario:', e); }
  return { nombre: nombreCompleto || usuario, negocio: negocio || '', telefono: telefono || '', rol: 'cliente', aceptoTerminos: true, _key: uid };
};

window.loginConFirebase = async function(usuario, password) {
  const x = usuario.trim().toLowerCase();
  const candidatos = [];
  if (x.includes('@')) {
    candidatos.push(x);
  } else {
    candidatos.push(limpiarUsuario(x) + DOMINIO_INTERNO);
    const correo = await resolverCorreo(x);
    if (correo) candidatos.push(correo);
  }
  for (const email of candidatos) {
    try {
      const credencial = await signInWithEmailAndPassword(auth, email, password);
      const perfil = await perfilSiValido(credencial.user.uid);
      if (!perfil) { await signOut(auth); return null; }
      return perfil;
    } catch (e) {
      console.error('Login error:', e);
    }
  }
  return null;
};

window.recuperarContrasenaFirebase = async function(entrada) {
  const correo = await resolverCorreo(entrada);
  if (!correo) return 'sin-correo';
  await sendPasswordResetEmail(auth, correo);
  return 'enviado';
};

window.aceptarTerminosFirebase = function(uid) {
  return update(ref(db, 'usuarios/' + uid), { aceptoTerminos: true, versionTerminos: '1.0', fechaAceptacion: Date.now() });
};

window.cerrarSesionFirebase = function() {
  signOut(auth);
};

window.revisarSesionExistente = function(callback) {
  let primeraRevision = true;
  onAuthStateChanged(auth, async (user) => {
    if (!primeraRevision) return;
    primeraRevision = false;

    if (!user) { callback(null); return; }

    const perfil = await perfilSiValido(user.uid);
    if (!perfil) { await signOut(auth); }
    callback(perfil);
  });
};

window.guardarEnFirebase = (nuevo) => push(productosRef, nuevo);
window.eliminarDeFirebase = (key) => remove(ref(db, 'delimani_productos/' + key));
window.actualizarEnFirebase = (key, cambios) => update(ref(db, 'delimani_productos/' + key), cambios);

onValue(productosRef, (snapshot) => {
  const data = snapshot.val();
  const lista = data ? Object.entries(data).map(([k,v]) => ({...v, _key:k})) : [];
  if (window.actualizarInventarioDesdeFirebase) window.actualizarInventarioDesdeFirebase(lista);
});

window.guardarHistorialEnFirebase = function(entrada) {
  push(historialRef, entrada);
};

window.cargarHistorialDesdeFirebase = function(callback) {
  onValue(historialRef, (snapshot) => {
    const data = snapshot.val();
    const lista = data ? Object.entries(data).map(([k,v]) => ({...v, _key:k})) : [];
    lista.sort((a,b) => new Date(b.fecha) - new Date(a.fecha));
    callback(lista);
  });
};

// --- Gestión de usuarios (tabla 'usuarios') ---
window.escucharUsuarios = function(callback) {
  onValue(usuariosRef, (snapshot) => {
    callback(snapshot.val() || {});
  });
};

window.actualizarUsuarioFirebase = (uid, cambios) => update(ref(db, 'usuarios/' + uid), cambios);
window.eliminarUsuarioFirebase = (uid) => remove(ref(db, 'usuarios/' + uid));

let appSecundaria = null;
function obtenerAuthSecundaria() {
  if (!appSecundaria) {
    appSecundaria = initializeApp(firebaseConfig, 'AdminCreate');
  }
  return getAuth(appSecundaria);
}

window.crearUsuarioAdminFirebase = async function(usuario, password, rol) {
  const correoInterno = usuario.toLowerCase().replace(/\s+/g, '') + '@mani-garcia.local';
  const authSecundaria = obtenerAuthSecundaria();
  const credencial = await createUserWithEmailAndPassword(authSecundaria, correoInterno, password);
  const uid = credencial.user.uid;
  await set(ref(db, 'usuarios/' + uid), { usuario, rol, estado: 'aprobado' });
  await signOut(authSecundaria);
  return uid;
};

// --- Costos de inversión (Ganancias) ---
window.escucharGastos = function(callback) {
  onValue(gastosRef, (snapshot) => {
    callback(snapshot.val());
  });
};

window.actualizarGastosFirebase = (cambios) => update(gastosRef, cambios);

window.asegurarGastosSeed = async function(defaults) {
  const snap = await get(gastosRef);
  if (!snap.exists()) {
    await set(gastosRef, defaults);
  }
};

// --- Pedidos del catálogo ---
window.guardarPedidoEnFirebase = function(pedido) {
  const nuevo = push(pedidosRef, pedido);
  // Copia anonima (sin datos personales) para que todos vean cuanto esta apartado
  set(ref(db, 'delimani_apartados/' + nuevo.key), { productoKey: pedido.productoKey, cantidad: Number(pedido.cantidad) })
    .catch(err => console.error('No se pudo registrar el apartado:', err));
  let msg = '🥜 Nuevo pedido en Maní García\n' +
    pedido.usuarioNombre + ' pidió ' + pedido.cantidad + ' u. de ' + pedido.productoNombre +
    ' ($' + (pedido.precio * pedido.cantidad).toLocaleString('es-CO') + ')';
  if (pedido.negocio) msg += '\nNegocio: ' + pedido.negocio;
  if (pedido.nota) msg += '\nNota: ' + pedido.nota;
  if (pedido.lat && pedido.lng) msg += '\nUbicación: https://www.google.com/maps?q=' + pedido.lat + ',' + pedido.lng;
  notificarTelegram(msg);
};

window.actualizarPedidoFirebase = function(key, cambios) {
  const resultado = update(ref(db, 'delimani_pedidos/' + key), cambios);
  if (cambios.estado === 'entregado' || cambios.estado === 'cancelado') {
    remove(ref(db, 'delimani_apartados/' + key)).catch(err => console.error(err));
  }
  return resultado;
};

window.escucharApartados = function(callback) {
  onValue(apartadosRef, (snapshot) => {
    callback(snapshot.val() || {});
  }, (err) => console.error('Apartados:', err));
};

// Solo admin: deja la copia anonima al dia (pedidos viejos o reactivados)
window.sincronizarApartados = async function(pedidos) {
  try {
    const snap = await get(apartadosRef);
    const ya = snap.val() || {};
    for (const [k, p] of Object.entries(pedidos)) {
      const activo = p.estado === 'pendiente' || p.estado === 'confirmado';
      if (activo && !ya[k]) {
        await set(ref(db, 'delimani_apartados/' + k), { productoKey: p.productoKey, cantidad: Number(p.cantidad) });
      } else if (!activo && ya[k]) {
        await remove(ref(db, 'delimani_apartados/' + k));
      }
    }
  } catch (e) { console.error('Sincronizando apartados:', e); }
};

window.escucharPedidos = function(callback, uid, esAdmin) {
  const consulta = esAdmin ? pedidosRef : query(pedidosRef, orderByChild('usuarioUid'), equalTo(uid));
  onValue(consulta, (snapshot) => {
    callback(snapshot.val() || {});
  }, (err) => console.error('Pedidos:', err));
};

window.firebaseReady = true;
