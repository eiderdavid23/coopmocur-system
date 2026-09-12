import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import { getDatabase, ref, push, remove, update, onValue, get } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-database.js";
import { getAuth, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";

const app = initializeApp({
  apiKey: "AIzaSyCAq0QNY7tE1td489ZakrVKjTg6iRe5nyc",
  authDomain: "nexus23-7f041.firebaseapp.com",
  databaseURL: "https://nexus23-7f041-default-rtdb.firebaseio.com",
  projectId: "nexus23-7f041",
  storageBucket: "nexus23-7f041.firebasestorage.app",
  messagingSenderId: "231907744812",
  appId: "1:231907744812:web:98be1a8a497abb151ac589",
  measurementId: "G-LDVBX9VQYC"
});

const db = getDatabase(app);
const auth = getAuth(app);

const productosRef = ref(db, 'delimani_productos');
const historialRef = ref(db, 'delimani_historial');

window.loginConFirebase = async function(usuario, password) {
  const correoInterno = usuario.toLowerCase().replace(/\s+/g, '') + '@nexus23.local';
  try {
    const credencial = await signInWithEmailAndPassword(auth, correoInterno, password);
    const uid = credencial.user.uid;

    const snap = await get(ref(db, 'usuarios/' + uid));
    const datos = snap.val();

    if (!datos || datos.rol === 'pendiente') {
      await signOut(auth);
      return null;
    }

    return { nombre: datos.usuario, rol: datos.rol, _key: uid };

  } catch (e) {
    console.error('Login error:', e);
    return null;
  }
};

window.cerrarSesionFirebase = function() {
  signOut(auth);
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

window.firebaseReady = true;
