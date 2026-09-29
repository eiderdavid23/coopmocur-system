# CONTEXTO DEL PROYECTO — Maní García

> Para la IA: lee esto completo antes de responder o cambiar código.
> Para mí: si abro un chat nuevo, pego este archivo y digo qué quiero cambiar.

## Qué es
App web (PWA) para vender y administrar maní confitado "Maní García": catálogo público, pedidos de clientes, stock, ventas, ganancias, historial y usuarios. Publicada en GitHub Pages (eiderdavid23.github.io).
Sin frameworks ni build: HTML + CSS + JavaScript puro. Backend: Firebase Authentication + Realtime Database. Idioma: español de Colombia, moneda COP.

## Estructura de carpetas
- index.html: pantallas, modales y textos legales
- manifest.json: configuración de la PWA
- css/styles.css: estilos
- js/app.js: interfaz y lógica
- js/firebase-db.js: todo lo de Firebase (expone funciones como window.nombreFirebase)
- img/: logo, iconos y favicons

## Cómo trabajo (importante para la IA)
- Programo desde el celular con Termux, sin editor de código.
- Todo el código me lo debes dar listo para copiar y pegar en la terminal.
- Archivos nuevos o pequeños: cat << 'EOF' > ruta/archivo ... EOF
- Cambios en archivos grandes (app.js, firebase-db.js, index.html): un script Python de parche con una función parchar(archivo, viejo, nuevo) que verifica que el texto viejo aparezca EXACTAMENTE una vez (si no, imprime ERROR y no cambia nada). Se ejecuta con: python parche.py && rm parche.py
- Antes de dármelo, el parche se prueba sobre una copia del proyecto (node --check para la sintaxis).
- Nunca pedirme abrir nano ni editar a mano.
- Si algo falla, primero verificar con grep o curl antes de reescribir archivos completos.
- Después de cada cambio: git add -A && git commit -m "mensaje" && git push
- Respuestas cortas y directas (pantalla de celular), en español. Avisarme de cualquier riesgo de seguridad.
- Nunca poner tokens, contraseñas ni datos personales en el repo ni en el chat.

## Usuarios y login
- Roles: admin, usuario (empleado) y cliente.
- Registro de clientes: nombre completo, usuario corto (3 a 20 caracteres, minúsculas, sin espacios), correo real, WhatsApp, negocio (opcional), contraseña y casilla obligatoria de términos y habeas data (se guarda aceptoTerminos, versionTerminos y fechaAceptacion).
- Login con usuario o correo. Las cuentas antiguas usan un correo interno usuario@mani-garcia.local; las nuevas usan el correo real. El nodo login_index (usuario a correo) permite entrar con el usuario.
- Recuperar contraseña: enlace de Firebase al correo real. Las cuentas antiguas sin correo se atienden por WhatsApp.
- Si un usuario ya existente no ha aceptado los términos, al entrar sale una ventana obligatoria.

## Nodos de Realtime Database
usuarios/<uid>, login_index/<usuario>, delimani_productos, delimani_historial, delimani_gastos, delimani_pedidos, delimani_apartados, delimani_admin_telegram/<uid>, delimani_config/telegram

## Pedidos
- Cada cliente solo puede leer sus propios pedidos (consulta por usuarioUid). El admin ve todos.
- delimani_apartados/<idPedido> es una copia anónima {productoKey, cantidad} de los pedidos pendientes o confirmados, para que el catálogo sepa cuánto está apartado sin exponer datos personales. Se borra al entregar o cancelar, y el admin la mantiene sincronizada.
- Aceptar pedido: se abre WhatsApp con el mensaje de confirmación. Rechazar: mensaje de rechazo. El botón WhatsApp solo abre el chat, sin mensaje. Yo le doy enviar a mano (WhatsApp no permite automatizarlo).
- Entregar pedido: descuenta stock y registra en el historial.

## Telegram
- Avisa al admin cuando entra un pedido nuevo. Es esencial para el negocio.
- El token del bot NUNCA va en el código: está en Firebase (delimani_config/telegram/token). Los chat_id están en delimani_admin_telegram/<uid>. Se configuran en Usuarios, botón "Mi Telegram".
- Hay un indicador de estado: verde conectado, rojo desconectado con el motivo.

## Legal
Términos y Condiciones y Política de Tratamiento de Datos Personales (Habeas Data, Colombia: Ley 1581 de 2012 y Decreto 1377 de 2013). El texto está en un modal de index.html.

## Seguridad (reglas de Firebase)
Reglas por rol. Productos con lectura pública. Pedidos privados por cliente. El token de Telegram solo se puede leer con sesión iniciada. Cada usuario crea su perfil una sola vez y no puede cambiar su rol ni su estado. No inventar reglas: pedirme las actuales antes de cambiarlas.

## Convenciones del código
- Las vistas devuelven strings HTML que se pintan con renderizar(). Los botones llaman funciones globales con onclick.
- Ventanas de formulario: modalPrompt({titulo, campos, textoAceptar}).
- Avisos rápidos: toast().
- Funciones de Firebase: window.nombreFirebase.

## Pendientes
- Cuentas antiguas sin correo: la recuperación de contraseña es manual.

## Plantilla para pedir cambios
"Lee CONTEXTO.md. Quiero [cambio]. Dame el código para Termux."
