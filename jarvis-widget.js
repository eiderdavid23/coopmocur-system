(function() {
  const JARVIS_API = "http://localhost:5000";

  function esAdminActual() {
    const headerEl = document.getElementById('header-usuario');
    if (!headerEl) return false;
    return headerEl.textContent.toLowerCase().includes('admin');
  }

  function checkAdminAndInit() {
    const isAdmin = esAdminActual();
    const existing = document.getElementById('jarvis-widget-root');
    if (isAdmin && !existing) {
      injectWidget();
    } else if (!isAdmin && existing) {
      existing.remove();
    }
  }

  function injectWidget() {
    const style = document.createElement('style');
    style.textContent = `
      #jarvis-widget-root { position: fixed; bottom: 20px; right: 20px; z-index: 99999; font-family: 'Courier New', monospace; }
      #jarvis-bubble { width: 56px; height: 56px; border-radius: 50%; background: radial-gradient(circle, #00e8ff 0%, #0a2a30 70%); box-shadow: 0 0 16px rgba(0,232,255,0.6); cursor: pointer; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(0,232,255,0.5); }
      #jarvis-bubble span { color: #001015; font-weight: bold; font-size: 0.6rem; letter-spacing: 1px; text-align: center; }
      #jarvis-panel { display: none; position: fixed; bottom: 88px; right: 20px; width: 300px; max-height: 420px; background: #04070a; border: 1px solid rgba(0,232,255,0.35); border-radius: 8px; box-shadow: 0 4px 24px rgba(0,0,0,0.5); flex-direction: column; overflow: hidden; }
      #jarvis-panel.open { display: flex; }
      #jarvis-panel-header { padding: 10px 12px; background: #061218; color: #00e8ff; font-size: 0.8rem; letter-spacing: 2px; border-bottom: 1px solid rgba(0,232,255,0.2); }
      #jarvis-panel-chat { flex: 1; overflow-y: auto; padding: 10px; display: flex; flex-direction: column; gap: 8px; max-height: 260px; }
      .jarvis-w-msg { font-size: 0.78rem; padding: 8px 10px; border-radius: 4px; max-width: 90%; line-height: 1.35; }
      .jarvis-w-msg.user { align-self: flex-end; background: rgba(0,232,255,0.1); color: #d7f6ff; border-left: 2px solid #00e8ff; }
      .jarvis-w-msg.jarvis { align-self: flex-start; background: rgba(124,255,227,0.06); color: #a9e8e0; border-left: 2px solid #7cffe3; }
      #jarvis-panel-input { display: flex; border-top: 1px solid rgba(0,232,255,0.2); }
      #jarvis-panel-input input { flex: 1; background: #04070a; border: none; color: #d7f6ff; padding: 10px; font-size: 0.78rem; outline: none; }
      #jarvis-panel-input button { background: transparent; border: none; color: #00e8ff; padding: 0 12px; cursor: pointer; font-size: 0.75rem; }
    `;
    document.head.appendChild(style);

    const root = document.createElement('div');
    root.id = 'jarvis-widget-root';
    root.innerHTML = `
      <div id="jarvis-panel">
        <div id="jarvis-panel-header">J.A.R.V.I.S.</div>
        <div id="jarvis-panel-chat"></div>
        <div id="jarvis-panel-input">
          <input type="text" id="jarvis-panel-text" placeholder="Pregúntale a Jarvis...">
          <button id="jarvis-panel-send">Enviar</button>
        </div>
      </div>
      <div id="jarvis-bubble" title="Jarvis"><span>JARVIS</span></div>
    `;
    document.body.appendChild(root);

    const bubble = document.getElementById('jarvis-bubble');
    const panel = document.getElementById('jarvis-panel');
    const chat = document.getElementById('jarvis-panel-chat');
    const input = document.getElementById('jarvis-panel-text');
    const sendBtn = document.getElementById('jarvis-panel-send');

    bubble.addEventListener('click', () => panel.classList.toggle('open'));

    function addMsg(text, who) {
      const div = document.createElement('div');
      div.className = 'jarvis-w-msg ' + who;
      div.textContent = text;
      chat.appendChild(div);
      chat.scrollTop = chat.scrollHeight;
    }

    async function send() {
      const msg = input.value.trim();
      if (!msg) return;
      addMsg(msg, 'user');
      input.value = '';
      addMsg('Procesando...', 'jarvis');
      try {
        const res = await fetch(JARVIS_API + '/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: msg, modo: 'coopmocur' })
        });
        const data = await res.json();
        chat.lastChild.remove();
        addMsg(data.text || 'Sin respuesta', 'jarvis');
        if (data.audio) {
          const audio = new Audio('data:audio/mpeg;base64,' + data.audio);
          audio.play().catch(() => {});
        }
      } catch (e) {
        chat.lastChild.remove();
        addMsg('No pude conectar con Jarvis. ¿Está corriendo el servidor en el puerto 5000?', 'jarvis');
      }
    }

    sendBtn.addEventListener('click', send);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });
  }

  setInterval(checkAdminAndInit, 1000);
})();
