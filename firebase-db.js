import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import { getDatabase, ref, push, set, remove, update, onValue, get } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-database.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCAq0QNY7tE1td489ZakrVKjTg6iRe5nyc",
  authDomain: "nexus23-7f041.firebaseapp.com",
  databaseURL: "https://nexus23-7f041-default-rtdb.firebaseio.com",
  projectId: "nexus23-7f041",
  storageBucket: "nexus23-7f041.firebasestorage.app",
  messagingSenderId: "231907744812",
  appId: "1:231907744812:web:98be1a8a497abb151ac589",
  measurementId: "G-LDVBX9VQYC"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

const productosRef = ref(db, 'delimani_productos');
const historialRef = ref(db, 'delimani_historial');
const usuariosRef = ref(db, 'usuarios');
const gastosRef = ref(db, 'delimani_gastos');

async function perfilSiValido(uid) {
  const snap = await get(ref(db, 'usuarios/' + uid));
  const datos = snap.val();
  if (!datos || datos.estado === 'pendiente') return null;
  return { nombre: datos.usuario, rol: datos.rol, _key: uid };
}

window.loginConFirebase = async function(usuario, password) {
  const correoInterno = usuario.toLowerCase().replace(/\s+/g, '') + '@nexus23.local';
  try {
    const credencial = await signInWithEmailAndPassword(auth, correoInterno, password);
    const perfil = await perfilSiValido(credencial.user.uid);

    if (!perfil) {
      await signOut(auth);
      return null;
    }

    return perfil;

  } catch (e) {
    console.error('Login error:', e);
    return null;
  }
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

// --- Gestión de usuarios (misma tabla 'usuarios' que NEXUS23) ---
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
  const correoInterno = usuario.toLowerCase().replace(/\s+/g, '') + '@nexus23.local';
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

window.firebaseReady = true;
