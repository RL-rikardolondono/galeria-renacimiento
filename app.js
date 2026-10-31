// Galería Renacimiento — tienda (GitHub Pages). Los precios se leen de catalogo.json;
// el servidor (skynetgenesis.com/galeria-api) vuelve a calcularlos: el navegador nunca fija el valor a cobrar.
const API = 'https://skynetgenesis.com/galeria-api/';
const $ = s => document.querySelector(s);
const pesos = n => '$' + Math.round(n).toLocaleString('es-CO');
let C = null, bolsa = [], sala = 'Todas';
try { bolsa = JSON.parse(localStorage.getItem('gr-bolsa') || '[]'); } catch (e) { bolsa = []; }
const guardar = () => { try { localStorage.setItem('gr-bolsa', JSON.stringify(bolsa)); } catch (e) {} $('#nBolsa').textContent = bolsa.length; };
const FORMATOS = { dig: 'Descarga digital (alta resolución)', l30: 'Lámina impresa 30 × 40 cm', l50: 'Lámina impresa 50 × 70 cm', lib: 'Libro digital (EPUB y PDF)' };
function precio(it) {
  if (it.f === 'lib') return (C.libros.find(l => l.id === it.id) || {}).digital || 0;
  return { dig: C.precios.arteDigital, l30: C.precios.lamina30x40, l50: C.precios.lamina50x70 }[it.f];
}
const fisico = () => bolsa.some(i => i.f === 'l30' || i.f === 'l50');

async function iniciar() {
  C = await fetch('catalogo.json?v=' + Date.now()).then(r => r.json());
  guardar(); hero(); filtros(); muro(); estante(); retorno();
}
// ---------- portada ----------
let hi = 0;
function hero() {
  const lista = C.obras.slice(0, 6), pts = $('#heroPuntos');
  pts.innerHTML = lista.map((_, i) => `<button aria-label="Obra ${i + 1}"></button>`).join('');
  const ver = i => {
    hi = i; const o = lista[i], im = $('#heroImg');
    im.style.opacity = 0;
    setTimeout(() => { im.src = o.img; im.alt = o.titulo; im.style.opacity = 1; }, 300);
    $('#heroCartela').innerHTML = `${o.titulo}<small>${o.autor} · ${o.anio}</small>`;
    [...pts.children].forEach((b, k) => b.classList.toggle('on', k === i));
  };
  [...pts.children].forEach((b, k) => b.onclick = () => ver(k));
  $('#heroImg').onclick = () => ficha(lista[hi].id);
  ver(0); setInterval(() => ver((hi + 1) % lista.length), 6000);
}
// ---------- salas ----------
function filtros() {
  const salas = ['Todas', ...new Set(C.obras.map(o => o.sala))];
  $('#filtros').innerHTML = salas.map(s => `<button class="${s === sala ? 'on' : ''}">${s}</button>`).join('');
  [...$('#filtros').children].forEach(b => b.onclick = () => { sala = b.textContent; filtros(); muro(); });
}
function muro() {
  $('#muro').innerHTML = C.obras.filter(o => sala === 'Todas' || o.sala === sala).map(o => `
    <figure class="obra" data-id="${o.id}"><img src="${o.img}" alt="${o.titulo}" loading="lazy">
    <h3>${o.titulo}</h3><p>${o.autor} · ${o.anio}</p><p class="desde">Desde ${pesos(C.precios.arteDigital)}</p></figure>`).join('');
  [...$('#muro').children].forEach(f => f.onclick = () => ficha(f.dataset.id));
}
// ---------- biblioteca ----------
function estante() {
  $('#estante').innerHTML = C.libros.map(l => `
    <div class="libro"><img src="${l.img}" alt="${l.titulo}" loading="lazy" data-id="${l.id}">
    <span class="id" style="margin-top:14px">${l.idioma}</span><h3 style="margin-top:4px">${l.titulo}</h3><span class="au">${l.autor}</span>
    <div class="acc">
      ${l.pronto ? '<span class="aviso">Próximamente</span>' : `<button class="btn oscuro" data-lib="${l.id}">Libro digital · ${pesos(l.digital)}</button>`}
      ${l.ae ? `<a class="btn claro" href="${l.ae}" target="_blank" rel="noopener">Impreso en Colombia</a>` : ''}
      ${l.amazon ? `<a class="btn claro" href="${l.amazon}" target="_blank" rel="noopener">Amazon (exterior)</a>` : ''}
    </div></div>`).join('');
  document.querySelectorAll('[data-lib]').forEach(b => b.onclick = () => agregar({ id: b.dataset.lib, f: 'lib' }));
  document.querySelectorAll('.libro img').forEach(i => i.onclick = () => fichaLibro(i.dataset.id));
}
// ---------- ventanas ----------
function abrir(el) { $('#velo').hidden = false; el.hidden = false; document.body.style.overflow = 'hidden'; }
function cerrar() { $('#velo').hidden = true; $('#modal').hidden = true; $('#cajon').hidden = true; document.body.style.overflow = ''; }
$('#velo').onclick = cerrar; document.addEventListener('keydown', e => e.key === 'Escape' && cerrar());
function ficha(id) {
  const o = C.obras.find(x => x.id === id), P = C.precios;
  $('#modal').innerHTML = `<div class="izq"><img src="${o.img}" alt="${o.titulo}"></div>
  <div class="der"><button class="cerrar" aria-label="Cerrar">×</button>
    <p class="sobre">${o.sala}</p><h2>${o.titulo}</h2><p class="au">${o.autor} · ${o.anio}</p><p>${o.nota}</p>
    <div class="opc">
      <label><span><input type="radio" name="f" value="l30" checked>Lámina 30 × 40 cm<small>Papel mate prémium 200 g · envío incluido</small></span><b>${pesos(P.lamina30x40)}</b></label>
      <label><span><input type="radio" name="f" value="l50">Lámina 50 × 70 cm<small>Papel mate prémium 200 g · envío incluido</small></span><b>${pesos(P.lamina50x70)}</b></label>
      <label><span><input type="radio" name="f" value="dig">Descarga digital<small>Archivo en alta resolución, llega a su correo</small></span><b>${pesos(P.arteDigital)}</b></label>
    </div>
    <button class="btn oro" id="agregarObra">Agregar al pedido</button>
    <p class="aviso" style="margin-top:14px">Obra de dominio público. La lámina se imprime sin marco.</p></div>`;
  $('#modal .cerrar').onclick = cerrar;
  $('#agregarObra').onclick = () => { agregar({ id, f: $('#modal input[name=f]:checked').value }); };
  abrir($('#modal'));
}
function fichaLibro(id) {
  const l = C.libros.find(x => x.id === id);
  $('#modal').innerHTML = `<div class="izq"><img src="${l.img}" alt="${l.titulo}"></div>
  <div class="der"><button class="cerrar" aria-label="Cerrar">×</button>
    <p class="sobre">Clásicos de la Fe · ${l.idioma}</p><h2>${l.titulo}</h2><p class="au">${l.autor} · ${l.paginas} páginas</p><p>${l.resumen}</p>
    <p class="aviso">Traducción, introducción y notas de Ricardo Londoño González.</p>
    <div class="acc" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:20px">
    ${l.pronto ? '' : `<button class="btn oro" id="agLib">Libro digital · ${pesos(l.digital)}</button>`}
    ${l.ae ? `<a class="btn claro" href="${l.ae}" target="_blank" rel="noopener">Impreso en Colombia</a>` : ''}
    ${l.amazon ? `<a class="btn claro" href="${l.amazon}" target="_blank" rel="noopener">Amazon</a>` : ''}</div></div>`;
  $('#modal .cerrar').onclick = cerrar;
  if ($('#agLib')) $('#agLib').onclick = () => agregar({ id, f: 'lib' });
  abrir($('#modal'));
}
function agregar(it) {
  if (it.f === 'dig' || it.f === 'lib') { if (bolsa.some(b => b.id === it.id && b.f === it.f)) { verBolsa(); return; } }
  bolsa.push(it); guardar(); verBolsa();
}
// ---------- pedido ----------
function verBolsa(msg) {
  $('#modal').hidden = true;
  const total = bolsa.reduce((s, i) => s + precio(i), 0);
  const nombre = i => i.f === 'lib' ? C.libros.find(l => l.id === i.id) : C.obras.find(o => o.id === i.id);
  $('#cajon').innerHTML = `<header><h2>Su pedido</h2><button class="cerrar" aria-label="Cerrar">×</button></header>
  <div class="cuerpo">${bolsa.length ? bolsa.map((i, k) => { const n = nombre(i); return `<div class="item"><img src="${n.img}" alt=""><div>${n.titulo}<small>${FORMATOS[i.f]}</small><button data-q="${k}">Quitar</button></div><b>${pesos(precio(i))}</b></div>`; }).join('') : '<p class="aviso">Aún no ha elegido ninguna obra.</p>'}
  ${bolsa.length ? `<form class="form" id="formPedido" style="margin-top:18px">
    <p class="sobre" style="margin:8px 0 0">Sus datos</p>
    <input name="nombre" placeholder="Nombre completo" required autocomplete="name">
    <input name="correo" type="email" placeholder="Correo (aquí llegan las descargas)" required autocomplete="email">
    <input name="celular" type="tel" placeholder="Celular" required autocomplete="tel">
    ${fisico() ? `<p class="sobre" style="margin:8px 0 0">Dirección de envío</p>
    <input name="direccion" placeholder="Dirección" required autocomplete="street-address">
    <div class="dos"><input name="ciudad" placeholder="Ciudad" required autocomplete="address-level2"><input name="departamento" placeholder="Departamento" required autocomplete="address-level1"></div>
    <div class="dos"><input name="postal" placeholder="Código postal" required autocomplete="postal-code"><select name="pais"><option value="CO">Colombia</option></select></div>
    <p class="aviso">Las láminas se imprimen bajo pedido y llegan en 10 a 20 días hábiles.</p>` : ''}
    <label class="aviso"><input type="checkbox" required> Acepto los <a href="#" data-legal="terminos">términos</a> y la <a href="#" data-legal="privacidad">política de privacidad</a>.</label>
  </form>` : ''}${msg ? `<p class="error">${msg}</p>` : ''}</div>
  <footer><div class="total"><span>Total</span><span>${pesos(total)}</span></div>
  <button class="btn oro" style="width:100%" id="pagar" ${bolsa.length ? '' : 'disabled'}>Pagar con Bold</button>
  <p class="aviso" style="text-align:center;margin:8px 0 0">Tarjeta, PSE, Nequi o Daviplata</p></footer>`;
  $('#cajon .cerrar').onclick = cerrar;
  document.querySelectorAll('[data-q]').forEach(b => b.onclick = () => { bolsa.splice(+b.dataset.q, 1); guardar(); verBolsa(); });
  document.querySelectorAll('#cajon [data-legal]').forEach(a => a.onclick = e => { e.preventDefault(); legal(a.dataset.legal); });
  $('#pagar').onclick = pagar;
  abrir($('#cajon'));
}
$('#btnBolsa').onclick = () => verBolsa();
async function pagar() {
  const f = $('#formPedido'); if (!f.reportValidity()) return;
  const btn = $('#pagar'); btn.disabled = true; btn.textContent = 'Preparando el pago…';
  const cliente = Object.fromEntries(new FormData(f));
  try {
    const r = await fetch(API + 'pedido.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: bolsa, cliente, volver: location.origin + '/' }) }).then(r => r.json());
    if (!r.ok) throw new Error(r.error || 'No se pudo preparar el pago');
    await cargarBold();
    const pago = new BoldCheckout(r.bold);
    pago.open();
    btn.disabled = false; btn.textContent = 'Pagar con Bold';
  } catch (e) {
    btn.disabled = false; btn.textContent = 'Pagar con Bold';
    verBolsa('No pudimos iniciar el pago. Intente de nuevo en un momento o escríbanos al WhatsApp 304 437 5758.');
  }
}
function cargarBold() {
  if (window.BoldCheckout) return Promise.resolve();
  return new Promise((ok, mal) => { const s = document.createElement('script'); s.src = 'https://checkout.bold.co/library/boldPaymentButton.js'; s.onload = ok; s.onerror = mal; document.head.appendChild(s); });
}
function retorno() {
  const q = new URLSearchParams(location.search), id = q.get('bold-order-id'), st = q.get('bold-tx-status');
  if (!id) return;
  history.replaceState(null, '', location.pathname);
  const aprobado = st === 'approved';
  if (aprobado) { bolsa = []; guardar(); fetch(API + 'volver.php?ref=' + encodeURIComponent(id)).catch(() => {}); }
  $('#modal').innerHTML = `<div class="der" style="grid-column:1/-1;max-width:640px;margin:auto"><button class="cerrar">×</button>
    <p class="sobre">Pedido ${id}</p><h2>${aprobado ? 'Gracias por su compra' : 'El pago no se completó'}</h2>
    <p>${aprobado ? 'Le enviamos un correo con el resumen. Las descargas llegan en pocos minutos; si compró láminas, le avisaremos cuando salgan a su dirección.' : 'No se realizó ningún cobro. Puede intentarlo de nuevo cuando quiera.'}</p></div>`;
  $('#modal .cerrar').onclick = cerrar; abrir($('#modal'));
}
// ---------- textos legales ----------
const LEGAL = {
  terminos: ['Términos y condiciones', `<p>Galería Renacimiento es una iniciativa de SkyNet Genesis (Colombia). Las obras de arte que ofrecemos son de dominio público; vendemos nuestras reproducciones, archivos preparados y ediciones propias.</p>
  <h3>Descargas digitales</h3><p>Se entregan por correo con un enlace personal válido por 30 días y 5 descargas. Son para uso personal: impresión doméstica, fondos de pantalla o decoración propia.</p>
  <h3>Láminas impresas</h3><p>Se imprimen bajo pedido en papel mate prémium de 200 g y se envían sin marco. El precio incluye el envío. La entrega en Colombia toma de 10 a 20 días hábiles.</p>
  <h3>Libros</h3><p>Los libros digitales se entregan en EPUB y PDF. Las traducciones, introducciones y notas están protegidas por derechos de autor de Ricardo Londoño González.</p>
  <h3>Pagos</h3><p>Los pagos se procesan con Bold; no almacenamos datos de tarjetas.</p>`],
  privacidad: ['Política de privacidad', `<p>Usamos su nombre, correo, celular y dirección solo para entregar su pedido y atender sus solicitudes (Ley 1581 de 2012). Compartimos la dirección de envío únicamente con nuestro aliado de impresión y mensajería. Puede pedir la consulta, corrección o eliminación de sus datos escribiendo a contacto@skynetgenesis.com.</p>`],
  envios: ['Envíos y devoluciones', `<p>Las láminas viajan protegidas en tubo o empaque rígido. Si llega dañada o con un defecto de impresión, envíenos una foto dentro de los 7 días siguientes y la reponemos sin costo. Por tratarse de productos hechos a pedido y de contenidos digitales, no aplica el retracto una vez iniciada la producción o la descarga (Ley 1480 de 2011, art. 47).</p>`]
};
function legal(k) {
  const [t, h] = LEGAL[k];
  $('#modal').innerHTML = `<div class="der legal" style="grid-column:1/-1;margin:auto"><button class="cerrar">×</button><h2>${t}</h2>${h}</div>`;
  $('#cajon').hidden = true; $('#modal .cerrar').onclick = cerrar; abrir($('#modal'));
}
document.querySelectorAll('[data-legal]').forEach(a => a.onclick = e => { e.preventDefault(); legal(a.dataset.legal); });
iniciar();
