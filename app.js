let inventario=[], pestanaActual='STOCK';
let historial=JSON.parse(localStorage.getItem('delimani_historial'))||[];
let usuarioActual=null;
let usuariosLista=[];
let _escuchandoUsuarios=false;

function toast(msg){
  const t=document.getElementById('toast');
  t.textContent=msg; t.classList.add('show');
  clearTimeout(window._tt);
  window._tt=setTimeout(()=>t.classList.remove('show'),2800);
}

function esperarFirebase(cb, intentos=0) {
  if (window.loginConFirebase) { cb(); return; }
  if (intentos > 30) {
    document.getElementById('pantalla-cargando').innerHTML = '<div style="text-align:center;padding:40px"><p style="color:#dc2626;font-weight:700">❌ Sin conexión a Firebase</p><p style="color:#94a3b8;font-size:0.8rem;margin-top:8px">Verifica tu internet</p></div>';
    return;
  }
  setTimeout(() => esperarFirebase(cb, intentos+1), 300);
}

window.addEventListener('load', () => {
  esperarFirebase(() => {
    window.revisarSesionExistente((perfil) => {
      document.getElementById('pantalla-cargando').style.display = 'none';

      if (perfil) {
        usuarioActual = perfil;
        iniciarApp();
      } else {
        document.getElementById('pantalla-login').style.display = 'block';
      }
    });
  });
});

async function intentarLogin() {
  const usuario = document.getElementById('login-usuario').value.trim();
  const password = document.getElementById('login-password').value;
  const btn = document.getElementById('login-btn');
  const err = document.getElementById('login-error');
  if (!usuario || !password) { toast('⚠️ Ingresa usuario y clave'); return; }
  btn.textContent = 'Verificando...';
  btn.disabled = true;
  err.style.display = 'none';
  try {
    const resultado = await window.loginConFirebase(usuario, password);
    if (!resultado) {
      err.style.display = 'block';
      btn.innerHTML = '<span>→</span> Ingresar';
      btn.disabled = false;
      return;
    }
    usuarioActual = resultado;
    iniciarApp();
  } catch(e) {
    toast('❌ Error de conexión');
    btn.innerHTML = '<span>→</span> Ingresar';
    btn.disabled = false;
  }
}

document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && document.getElementById('pantalla-login').style.display !== 'none') intentarLogin();
});

function iniciarApp() {
  document.getElementById('pantalla-login').style.display = 'none';
  document.getElementById('pantalla-app').style.display = 'block';
  document.getElementById('header-usuario').textContent = '👤 ' + usuarioActual.nombre + ' · ' + usuarioActual.rol;

  const esAdmin = usuarioActual.rol === 'admin';
  document.getElementById('tab-USUARIOS').style.display = esAdmin ? '' : 'none';

  if (esAdmin && window.escucharUsuarios && !_escuchandoUsuarios) {
    _escuchandoUsuarios = true;
    window.escucharUsuarios((data) => {
      usuariosLista = Object.entries(data).map(([k,v]) => ({...v, _key:k}));
      if (pestanaActual === 'USUARIOS') renderizar();
    });
  }

  renderizar();
}

function cerrarSesion() {
  document.getElementById("modal-logout").classList.add("visible");
}
function confirmarLogout() {
  if (window.cerrarSesionFirebase) window.cerrarSesionFirebase();
  usuarioActual = null;
  document.getElementById('pantalla-login').style.display = 'block';
  document.getElementById('pantalla-app').style.display = 'none';
  document.getElementById('login-usuario').value = '';
  document.getElementById('login-password').value = '';
  document.getElementById('login-btn').innerHTML = '<span>→</span> Ingresar';
  document.getElementById('login-btn').disabled = false;
  document.getElementById('login-error').style.display = 'none';
  pestanaActual = 'STOCK';
  document.getElementById('modal-logout').classList.remove('visible');
}

function cambiarPestana(p) {
  pestanaActual = p;
  ['STOCK','ENTRADAS','VENTAS','HISTORIAL','GANANCIAS','USUARIOS'].forEach(t => {
    const el = document.getElementById('tab-'+t);
    if (el) el.classList.remove('active');
  });
  document.getElementById('tab-'+p).classList.add('active');
  renderizar();
}

function renderizar() {
  const c = document.getElementById('contenido-principal');
  if (!c) return;
  if (pestanaActual==='STOCK')     c.innerHTML = vistaStock();
  if (pestanaActual==='ENTRADAS')  c.innerHTML = vistaEntradas();
  if (pestanaActual==='VENTAS')    c.innerHTML = vistaVentas();
  if (pestanaActual==='HISTORIAL') c.innerHTML = vistaHistorial();
  if (pestanaActual==='GANANCIAS') c.innerHTML = vistaGanancias();
  if (pestanaActual==='USUARIOS')  c.innerHTML = vistaUsuarios();
}

function vistaStock() {
  const esAdmin = usuarioActual && usuarioActual.rol==='admin';
  const bajos = inventario.filter(r=>r.cantidad<=3).length;
  return '<div class="fade"><div class="top-bar"><div><div class="section-title">PRODUCTOS EN STOCK</div><div class="section-sub">'+inventario.length+' producto(s)'+(bajos>0?' · <b style="color:#dc2626">'+bajos+' bajo stock</b>':'')+
  '</div></div>'+(esAdmin?'<button class="btn btn-green" onclick="abrirModalAgregar()">+ Agregar</button>':'')+
  '</div><input type="text" class="search" id="busqueda" onkeyup="filtrarStock()" placeholder="🔍 Buscar por nombre..."><div id="lista-stock">'+generarListaStock(inventario)+'</div></div>';
}

function generarListaStock(lista) {
  const esAdmin = usuarioActual && usuarioActual.rol==='admin';
  if (!lista.length) return '<div class="empty"><div style="font-size:2.5rem;margin-bottom:8px">🥜</div><p style="font-size:0.9rem">No hay productos registrados.</p></div>';
  return lista.map(r => {
    const bajo = r.cantidad<=3;
    return '<div class="card'+(bajo?' bajo':'')+'"><div><div class="card-name">'+r.nombre+'</div><div class="card-price">Precio: <span>$'+Number(r.precio).toLocaleString()+'</span></div></div>'+
    '<div style="display:flex;align-items:center;gap:8px"><div style="text-align:center"><div style="font-size:0.65rem;color:#94a3b8;font-weight:700">CANT.</div>'+
    '<span class="badge '+(bajo?'badge-bajo':'badge-ok')+'">'+r.cantidad+'</span></div>'+
    (esAdmin?'<div class="card-actions"><button class="btn-edit" onclick="abrirModalEditar(\''+r._key+'\')">✏️</button><button class="btn-del" onclick="eliminarPieza(\''+r._key+'\')">🗑️</button></div>':'')+
    '</div></div>';
  }).join('');
}

function filtrarStock() {
  const b = document.getElementById('busqueda').value.toLowerCase();
  document.getElementById('lista-stock').innerHTML = generarListaStock(inventario.filter(r=>r.nombre.toLowerCase().includes(b)));
}

function vistaEntradas() {
  const ops = inventario.map(r=>'<option value="'+r._key+'">'+r.nombre+' (Actual: '+r.cantidad+')</option>').join('')||'<option>Sin productos</option>';
  return '<div class="fade"><div class="section-title" style="margin-bottom:14px">📥 REGISTRAR ENTRADA DE STOCK</div>'+
  '<div class="form-box"><div class="form-group"><label class="form-label">Seleccionar Producto</label><select id="select-entrada" class="form-select">'+ops+'</select></div>'+
  '<div class="form-group"><label class="form-label">Cantidad que ingresa</label><input type="number" id="cant-entrada" class="form-input"></div>'+
  '<button class="btn btn-blue btn-full" onclick="procesarEntrada()">SUMAR AL STOCK</button></div></div>';
}

function procesarEntrada() {
  const key=document.getElementById('select-entrada').value;
  const cant=parseInt(document.getElementById('cant-entrada').value);
  if (!key||isNaN(cant)||cant<=0) return toast('⚠️ Ingresa datos válidos');
  const item=inventario.find(r=>r._key===key);
  if (item) { window.actualizarEnFirebase(key,{cantidad:item.cantidad+cant}); registrarHistorial('ENTRADA','Surtido: +'+cant+' u. de '+item.nombre); toast('✅ Stock actualizado.'); cambiarPestana('STOCK'); }
}

function vistaVentas() {
  const ops=inventario.map(r=>'<option value="'+r._key+'">'+r.nombre+' - $'+r.precio+' (Disp: '+r.cantidad+')</option>').join('')||'<option>Sin productos</option>';
  return '<div class="fade"><div class="section-title" style="margin-bottom:14px">💰 REGISTRAR NUEVA VENTA</div>'+
  '<div class="form-box"><div class="form-group"><label class="form-label">Seleccionar Producto</label><select id="select-venta" class="form-select">'+ops+'</select></div>'+
  '<div class="form-group"><label class="form-label">Cantidad a vender</label><input type="number" id="cant-venta" class="form-input"></div>'+
  '<button class="btn btn-green btn-full" onclick="procesarVenta()">CONFIRMAR VENTA</button></div></div>';
}

function procesarVenta() {
  const key=document.getElementById('select-venta').value;
  const cant=parseInt(document.getElementById('cant-venta').value);
  if (!key||isNaN(cant)||cant<=0) return toast('⚠️ Ingresa datos válidos');
  const item=inventario.find(r=>r._key===key);
  if (item) {
    if (item.cantidad<cant) return toast('❌ Stock insuficiente: '+item.cantidad+' u.');
    window.actualizarEnFirebase(key,{cantidad:item.cantidad-cant});
    registrarHistorial('VENTA','Vendido: '+cant+' u. de '+item.nombre+' (Total: $'+(cant*item.precio).toLocaleString()+')');
    toast('🎉 Venta registrada.'); cambiarPestana('STOCK');
  }
}

function vistaHistorial() {
  if(window.cargarHistorialDesdeFirebase&&!window._cargandoHistorial){window._cargandoHistorial=true;window.cargarHistorialDesdeFirebase(function(lista){historial=lista;window._cargandoHistorial=false;const c=document.getElementById("contenido-principal");if(c)c.innerHTML=vistaHistorial();});return '<div class="fade"><p style="padding:20px;text-align:center;color:#94a3b8">Cargando historial...</p></div>';}
  const filas=!historial.length?'<p style="padding:20px;text-align:center;color:#94a3b8;font-size:0.85rem">No hay movimientos registrados.</p>':
  historial.map(h=>'<div class="hist-item"><div><span class="hist-tipo '+(h.tipo==='ENTRADA'?'entrada':'venta')+'">['+h.tipo+']</span><span>'+h.detalle+'</span></div><span class="hist-fecha">'+(h.fecha&&h.fecha.includes("T")?new Date(h.fecha).toLocaleString("es-CO",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}):h.fecha)+'</span></div>').join('');
  return '<div class="fade"><div class="top-bar"><div class="section-title">📋 HISTORIAL</div>'+
  (usuarioActual&&usuarioActual.rol==='admin'?'<button class="btn-red-sm" onclick="limpiarHistorial()">Borrar todo</button>':'')+
  '</div><div class="historial-list">'+filas+'</div></div>';
}

function registrarHistorial(tipo,detalle) {
  const a=new Date();
  historial.unshift({tipo,detalle,fecha:a.getHours()+':'+a.getMinutes().toString().padStart(2,'0'),usuario:usuarioActual?usuarioActual.nombre:''});
  if(window.guardarHistorialEnFirebase){const e={tipo:historial[0].tipo,detalle:historial[0].detalle,fecha:new Date().toISOString(),usuario:historial[0].usuario};window.guardarHistorialEnFirebase(e);}
  localStorage.setItem('delimani_historial',JSON.stringify(historial));
}

function limpiarHistorial() {
  if (confirm('¿Borrar historial?')) { historial=[]; localStorage.setItem('delimani_historial','[]'); renderizar(); }
}

function abrirModalAgregar() {
  ['ins-nombre','ins-precio','ins-cantidad'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('modal-agregar').classList.add('visible');
}
function cerrarModalAgregar() { document.getElementById('modal-agregar').classList.remove('visible'); }
function calcularPrecioVenta(pct) {
  const pc=parseFloat(document.getElementById('ins-preciocompra').value);
  if(!isNaN(pc)) document.getElementById('ins-precio').value=Math.round(pc*(1+pct/100));
}
function vistaGanancias() {
  const esAdmin=usuarioActual&&usuarioActual.rol==='admin';
  if(!esAdmin) return '<div class="empty">Sin acceso</div>';
  const totalG=inventario.reduce((s,r)=>{const pc=r.precioCompra||0;const pv=r.precio||0;return s+((pv-pc)*r.cantidad);},0);
  const lista=inventario.map(r=>{const pc=r.precioCompra||0;const pv=r.precio||0;const gu=pv-pc;const gt=gu*r.cantidad;
    return '<div class="card fade"><div><div class="card-name">'+r.nombre+'</div><div class="card-price">Compra: <span>$'+pc.toLocaleString()+'</span></div><div class="card-price">Venta: <span>$'+pv.toLocaleString()+'</span></div><div class="card-price">Ganancia/u: <span style="color:#059669;font-weight:700">$'+gu.toLocaleString()+'</span></div><div class="card-price">Ganancia total: <span style="color:#059669;font-weight:700">$'+gt.toLocaleString()+'</span></div></div></div>';
  }).join('');
  return '<div class="fade"><div class="top-bar"><div class="section-title">GANANCIAS</div></div><div class="card" style="background:#f0fdf4;border-color:#86efac;margin-bottom:16px"><div><div class="section-title" style="color:#059669">Ganancia potencial total</div><div style="font-size:1.4rem;font-weight:800;color:#059669">$'+totalG.toLocaleString()+'</div></div></div>'+lista+'</div>';
}
function procesarGuardarPieza() {
  const nombre=document.getElementById('ins-nombre').value.trim();
  const precio=parseFloat(document.getElementById('ins-precio').value);
  const precioCompra=parseFloat(document.getElementById('ins-preciocompra').value)||0;
  const cantidad=parseInt(document.getElementById('ins-cantidad').value);
  if (!nombre||isNaN(precio)||isNaN(cantidad)) return toast('⚠️ Rellena todos los campos.');
  window.guardarEnFirebase({nombre,precio,precioCompra,cantidad});
  cerrarModalAgregar();
}

function abrirModalEditar(key) {
  const item=inventario.find(r=>r._key===key);
  if (!item) return;
  document.getElementById('edit-key').value=key;
  document.getElementById('edit-nombre').value=item.nombre;
  document.getElementById('edit-precio').value=item.precio;
  document.getElementById('edit-preciocompra').value=item.precioCompra||0;
  document.getElementById('edit-cantidad').value=item.cantidad;
  document.getElementById('modal-editar').classList.add('visible');
}
function cerrarModalEditar() { document.getElementById('modal-editar').classList.remove('visible'); }
function procesarEditarPieza() {
  const key=document.getElementById('edit-key').value;
  const nombre=document.getElementById('edit-nombre').value.trim();
  const precio=parseFloat(document.getElementById('edit-precio').value);
  const precioCompra=parseFloat(document.getElementById('edit-preciocompra').value)||0;
  const cantidad=parseInt(document.getElementById('edit-cantidad').value);
  if (!nombre||isNaN(precio)||isNaN(cantidad)) return toast('⚠️ Rellena todos los campos.');
  window.actualizarEnFirebase(key,{nombre,precio,precioCompra,cantidad});
  cerrarModalEditar();
}

let _eliminarKey=null;
function eliminarPieza(key) {
  const item=inventario.find(r=>r._key===key);
  if(!item) return;
  _eliminarKey=key;
  document.getElementById('eliminar-nombre-texto').textContent='Se eliminará: '+item.nombre;
  document.getElementById('modal-eliminar').classList.add('visible');
}
function confirmarEliminarPieza() {
  document.getElementById('modal-eliminar').classList.remove('visible');
  if(_eliminarKey) { window.eliminarDeFirebase(_eliminarKey); _eliminarKey=null; }
}

window.actualizarInventarioDesdeFirebase=function(lista){
  inventario=lista;
  if (usuarioActual) renderizar();
};

// --- Gestión de usuarios (solo admin) ---
function vistaUsuarios() {
  if (!usuarioActual || usuarioActual.rol !== 'admin') return '<div class="empty">Sin acceso</div>';
  const filas = !usuariosLista.length ? '<p style="padding:20px;text-align:center;color:#94a3b8;font-size:0.85rem">No hay usuarios registrados.</p>' :
  usuariosLista.map(u => {
    const rolTxt = u.rol === 'admin' ? 'Administrador' : 'Usuario';
    const estadoTxt = u.estado === 'pendiente' ? 'Pendiente' : 'Aprobado';
    return '<div class="card"><div><div class="card-name">'+(u.usuario||u._key)+'</div><div class="card-price">'+rolTxt+' · '+estadoTxt+'</div></div>'+
    '<div class="card-actions"><button class="btn-edit" onclick="cambiarRolUsuario(\''+u._key+'\',\''+(u.rol||'usuario')+'\')" title="Cambiar rol">🔁</button>'+
    '<button class="btn-edit" onclick="cambiarEstadoUsuario(\''+u._key+'\',\''+(u.estado||'aprobado')+'\')" title="'+(u.estado==='pendiente'?'Aprobar':'Suspender')+'">'+(u.estado==='pendiente'?'✅':'⛔')+'</button>'+
    '<button class="btn-del" onclick="eliminarUsuarioApp(\''+u._key+'\')">🗑️</button></div></div>';
  }).join('');
  return '<div class="fade"><div class="top-bar"><div><div class="section-title">👥 USUARIOS DEL SISTEMA</div><div class="section-sub">'+usuariosLista.length+' usuario(s)</div></div>'+
  '<button class="btn btn-green" onclick="abrirCrearUsuario()">+ Crear usuario</button></div>'+
  '<div id="lista-usuarios">'+filas+'</div></div>';
}

function cambiarRolUsuario(uid, rolActualU) {
  if (uid === usuarioActual._key) { toast('⚠️ No puedes cambiar tu propio rol desde aquí.'); return; }
  const nuevo = rolActualU === 'admin' ? 'usuario' : 'admin';
  window.actualizarUsuarioFirebase(uid, { rol: nuevo });
  toast('✅ Rol actualizado.');
}

function cambiarEstadoUsuario(uid, estadoActualU) {
  if (uid === usuarioActual._key) { toast('⚠️ No puedes cambiar el estado de tu propia cuenta.'); return; }
  const nuevo = estadoActualU === 'pendiente' ? 'aprobado' : 'pendiente';
  window.actualizarUsuarioFirebase(uid, { estado: nuevo });
  toast('✅ Estado actualizado.');
}

function eliminarUsuarioApp(uid) {
  if (uid === usuarioActual._key) { toast('⚠️ No puedes eliminar tu propia cuenta.'); return; }
  if (!confirm('¿Eliminar este usuario del sistema? No se puede deshacer.')) return;
  window.eliminarUsuarioFirebase(uid);
  toast('🗑️ Usuario eliminado.');
}

function abrirCrearUsuario() {
  const usuario = prompt('Nombre de usuario para la nueva cuenta:');
  if (!usuario) return;
  const password = prompt('Contraseña (mínimo 6 caracteres):');
  if (!password) return;
  if (password.length < 6) { toast('⚠️ La contraseña debe tener al menos 6 caracteres.'); return; }
  const esAdminNuevo = confirm('¿Será administrador?\n\nAceptar = Administrador\nCancelar = Usuario normal');
  window.crearUsuarioAdminFirebase(usuario, password, esAdminNuevo ? 'admin' : 'usuario')
    .then(() => toast('✅ Usuario creado correctamente.'))
    .catch(err => {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') toast('❌ Ese usuario ya existe.');
      else toast('❌ Error al crear el usuario.');
    });
}
