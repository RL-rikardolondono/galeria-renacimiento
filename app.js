// Galería Renacimiento — tienda (GitHub Pages). Los precios se leen de catalogo.json;
// el servidor (skynetgenesis.com/galeria-api) vuelve a calcularlos: el navegador nunca fija el valor a cobrar.
const API = window.GALERIA_API || 'https://skynetgenesis.com/galeria-api/';
const WA = '573044375758';
const $ = s => document.querySelector(s);
const pesos = n => '$' + Math.round(n).toLocaleString('es-CO');
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
let C = null, bolsa = [], sala = 'Todas', E = null; // E = estado del servidor (vendidas y archivos listos)
try { bolsa = JSON.parse(localStorage.getItem('gr-bolsa') || '[]'); if (!Array.isArray(bolsa)) bolsa = []; } catch (e) { bolsa = []; }
const guardar = () => { try { localStorage.setItem('gr-bolsa', JSON.stringify(bolsa)); } catch (e) {} $('#nBolsa').textContent = bolsa.length; };
const FORMATOS = { dig: 'Descarga digital (alta resolución)', l30: 'Lámina impresa 30 × 40 cm', l50: 'Lámina impresa 50 × 70 cm', lib: 'Libro digital (EPUB y PDF)', joya: 'Joya · pieza única' };
const joyas = () => (C.joyas || []).filter(x => x.disponible !== false || x.vendida);
const fotoJoya = j => (j.fotos && j.fotos[0]) || j.img || '';
const vendida = id => !!((E && E.vendidas.includes(id)) || (C.joyas || []).some(x => x.id === id && x.vendida));
const obraLista = id => !E || E.disponibles.obras.includes(id);   // si el servidor no responde, el pedido lo valida igual
const libroListo = id => !E || E.disponibles.libros.includes(id);
function articulo(i) {
  if (i.f === 'lib') return C.libros.find(l => l.id === i.id);
  if (i.f === 'joya') { const j = (C.joyas || []).find(x => x.id === i.id); return j && { ...j, img: fotoJoya(j) }; }
  return C.obras.find(o => o.id === i.id);
}
function precio(it) {
  const a = articulo(it); if (!a) return 0;
  if (it.f === 'lib') return a.digital || 0;
  if (it.f === 'joya') return a.precio || 0;
  return { dig: C.precios.arteDigital, l30: C.precios.lamina30x40, l50: C.precios.lamina50x70 }[it.f] || 0;
}
const lamina = () => bolsa.some(i => i.f === 'l30' || i.f === 'l50');
const conJoya = () => bolsa.some(i => i.f === 'joya');
const fisico = () => bolsa.some(i => i.f === 'l30' || i.f === 'l50' || i.f === 'joya');
function conTiempo(url, op = {}, ms = 20000) {
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), ms);
  return fetch(url, { ...op, signal: ctl.signal }).finally(() => clearTimeout(t));
}

async function iniciar() {
  try { C = await fetch('catalogo.json?v=' + Date.now()).then(r => r.json()); C.obras = (C.obras || []).filter(o => o.disponible !== false); C.libros = C.libros || []; C.precios = C.precios || {}; }
  catch (e) { document.querySelector('main').insertAdjacentHTML('afterbegin', '<p class="error" style="padding:20px;text-align:center">No pudimos cargar la galería. Revise su conexión y recargue la página.</p>'); return; }
  bolsa = bolsa.filter(i => articulo(i)); // quita lo que ya no existe en el catálogo
  guardar(); hero(); vitrina(); filtros(); iniciarBusqueda(); muro(); estante(); retorno();
  try {
    const r = await conTiempo(API + 'estado.php', {}, 8000).then(r => r.json());
    if (r && r.ok) { E = r; const antes = bolsa.length; bolsa = bolsa.filter(i => !(i.f === 'joya' && vendida(i.id))); if (bolsa.length !== antes) guardar(); vitrina(); estante(); }
  } catch (e) { /* sin servidor: la tienda se ve igual y el pedido lo valida el servidor */ }
}
// ---------- portada ----------
let hi = 0;
function hero() {
  const lista = C.obras.slice(0, 6), pts = $('#heroPuntos');
  if (!lista.length) return;
  pts.innerHTML = lista.map((_, i) => `<button aria-label="Obra ${i + 1}"></button>`).join('');
  const ver = i => {
    hi = i; const o = lista[i], im = $('#heroImg');
    im.style.opacity = 0;
    setTimeout(() => { im.src = o.img; im.alt = o.titulo; im.style.opacity = 1; }, 300);
    $('#heroCartela').innerHTML = `${esc(o.titulo)}<small>${esc(o.autor)} · ${esc(o.anio)}</small>`;
    [...pts.children].forEach((b, k) => b.classList.toggle('on', k === i));
  };
  [...pts.children].forEach((b, k) => b.onclick = () => ver(k));
  $('#heroImg').onclick = () => ficha(lista[hi].id);
  ver(0); setInterval(() => ver((hi + 1) % lista.length), 6000);
}
// ---------- joyas ----------
const waJoya = t => 'https://wa.me/' + WA + '?text=' + encodeURIComponent('Hola, quiero preguntar por la joya «' + t + '» de Colombian Green Emerald.');
function vitrina() {
  const J = joyas();
  if (!J.length) { $('#vitrina').innerHTML = ''; return; }
  $('#vitrina').innerHTML = J.map(x => {
    const v = vendida(x.id), f = fotoJoya(x);
    return `<div class="joya${v ? ' vendida' : ''}" data-joya="${esc(x.id)}">
      <div class="joya-foto">${f ? `<img src="${esc(f)}" alt="${esc(x.titulo)}" loading="lazy">` : ''}${(x.fotos || []).length > 1 ? `<span class="nfotos">${x.fotos.length} fotos</span>` : ''}${v ? '<span class="sello">Vendida</span>' : ''}</div>
      <h3>${esc(x.titulo)}</h3><p>${esc(x.detalle || '')}</p>
      <p class="pr">${v ? 'Pieza vendida' : x.precio ? pesos(x.precio) : 'Precio a consultar'}</p>
      ${v ? `<a class="btn linea" href="${waJoya(x.titulo)}" target="_blank" rel="noopener">Pedir una similar</a>`
          : x.precio ? `<button class="btn oro" data-comprar="${esc(x.id)}">Comprar</button>` : `<a class="btn oro" href="${waJoya(x.titulo)}" target="_blank" rel="noopener">Preguntar por WhatsApp</a>`}
    </div>`;
  }).join('');
  document.querySelectorAll('[data-comprar]').forEach(b => b.onclick = e => { e.stopPropagation(); agregar({ id: b.dataset.comprar, f: 'joya' }); });
  document.querySelectorAll('.joya .joya-foto').forEach(d => d.onclick = () => fichaJoya(d.parentElement.dataset.joya));
  $('#joyasAviso').textContent = 'Piezas únicas: cuando una se vende, queda marcada como vendida. Pago seguro en línea y envío por Interrapidísimo con seguro a toda Colombia.';
}
function fichaJoya(id) {
  const j = (C.joyas || []).find(x => x.id === id); if (!j) return;
  const fotos = (j.fotos && j.fotos.length ? j.fotos : [j.img]).filter(Boolean), v = vendida(id);
  $('#modal').innerHTML = `<div class="izq joya-izq"><img id="fotoGrande" src="${esc(fotos[0] || '')}" alt="${esc(j.titulo)}">
    ${fotos.length > 1 ? `<div class="miniaturas">${fotos.map((f, k) => `<button data-f="${k}" class="${k ? '' : 'on'}"><img src="${esc(f)}" alt="Foto ${k + 1}"></button>`).join('')}</div>` : ''}</div>
  <div class="der"><button class="cerrar" aria-label="Cerrar">×</button>
    <p class="sobre">Sala de joyas · Colombian Green Emerald</p><h2>${esc(j.titulo)}</h2>
    ${j.tipo ? `<p class="au">${esc(j.tipo)}</p>` : ''}<p>${esc(j.detalle || '')}</p>
    ${j.descripcion ? `<p>${esc(j.descripcion)}</p>` : ''}
    <p class="pr-grande">${v ? 'Esta pieza ya se vendió' : j.precio ? pesos(j.precio) : 'Precio a consultar'}</p>
    <div class="acc" style="display:flex;gap:8px;flex-wrap:wrap">
      ${!v && j.precio ? '<button class="btn oro" id="agJoya">Comprar</button>' : ''}
      <a class="btn claro" href="${waJoya(j.titulo)}" target="_blank" rel="noopener">${v ? 'Pedir una similar' : 'Tengo una pregunta'}</a></div>
    <p class="aviso" style="margin-top:14px">Esmeralda natural colombiana montada a mano en plata 925. Se entrega con su certificado y envío asegurado.</p></div>`;
  $('#modal .cerrar').onclick = cerrar;
  document.querySelectorAll('.miniaturas button').forEach(b => b.onclick = () => { $('#fotoGrande').src = fotos[+b.dataset.f]; document.querySelectorAll('.miniaturas button').forEach(x => x.classList.toggle('on', x === b)); });
  if ($('#agJoya')) $('#agJoya').onclick = () => agregar({ id, f: 'joya' });
  abrir($('#modal'));
}
// ---------- salas ----------
const DESTACADAS = ['noche', 'perla', 'gioconda', 'venus', 'ronda', 'prodigo', 'mateo', 'ola', 'beso', 'monet', 'lirios', 'cipreses', 'danza', 'pareja', 'manos', 'juana'];
const ORDEN_SALAS = ['Renacimiento', 'Arte sacro', 'Barroco', 'Impresionismo y modernos', 'Oriente'];
const POR_PAGINA = 12;
let mostrar = POR_PAGINA, buscar = '';
const sinTilde = t => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
function filtros() {
  if (sala === 'Todas') sala = 'Destacadas';
  const hay = new Set(C.obras.map(o => o.sala));
  const salas = ['Destacadas', ...ORDEN_SALAS.filter(s => hay.has(s)), ...[...hay].filter(s => !ORDEN_SALAS.includes(s))];
  const cuenta = s => s === 'Destacadas' ? '' : ` <small>${C.obras.filter(o => o.sala === s).length}</small>`;
  $('#filtros').innerHTML = salas.map(s => `<button data-s="${esc(s)}" class="${s === sala && !buscar ? 'on' : ''}">${esc(s)}${cuenta(s)}</button>`).join('');
  [...$('#filtros').children].forEach(b => b.onclick = () => { sala = b.dataset.s; buscar = ''; $('#buscaObra').value = ''; mostrar = POR_PAGINA; filtros(); muro(); });
}
function obrasVisibles() {
  if (buscar) { const q = sinTilde(buscar); return C.obras.filter(o => sinTilde(o.titulo + ' ' + o.autor).includes(q)); }
  if (sala === 'Destacadas') { const d = C.obras.filter(o => o.destacada || DESTACADAS.includes(o.id)); return d.length ? d : C.obras.slice(0, POR_PAGINA); }
  return C.obras.filter(o => o.sala === sala);
}
function muro() {
  const todas = obrasVisibles(), lista = todas.slice(0, mostrar), quedan = todas.length - lista.length;
  $('#muroInfo').textContent = buscar ? (todas.length ? `${todas.length} obra${todas.length === 1 ? '' : 's'} encontrada${todas.length === 1 ? '' : 's'}` : 'No encontramos obras con ese nombre.') : (sala === 'Destacadas' ? `Una selección de las obras más queridas · ${C.obras.length} obras en toda la galería` : `${todas.length} obras en esta sala`);
  $('#muro').innerHTML = lista.map(o => `
    <figure class="obra" data-id="${esc(o.id)}"><div class="marco"><img src="${esc(o.img)}" alt="${esc(o.titulo)}" loading="lazy"></div>
    <h3>${esc(o.titulo)}</h3><p>${esc(o.autor)} · ${esc(o.anio)}</p><p class="desde">Desde ${pesos(C.precios.arteDigital)}</p></figure>`).join('');
  [...$('#muro').children].forEach(f => f.onclick = () => ficha(f.dataset.id));
  $('#masObras').hidden = quedan <= 0;
  $('#masObras').textContent = `Ver más obras (${quedan})`;
}
function iniciarBusqueda() {
  const i = $('#buscaObra'); if (!i) return; let t;
  i.oninput = () => { clearTimeout(t); t = setTimeout(() => { buscar = i.value.trim(); mostrar = POR_PAGINA; filtros(); muro(); }, 250); };
  $('#masObras').onclick = () => { mostrar += POR_PAGINA; muro(); };
}
// ---------- biblioteca ----------
function estante() {
  $('#estante').innerHTML = C.libros.map(l => {
    const vende = !l.pronto && l.digital && libroListo(l.id);
    return `<div class="libro"><img src="${esc(l.img)}" alt="${esc(l.titulo)}" loading="lazy" data-id="${esc(l.id)}">
    <span class="id" style="margin-top:14px">${esc(l.idioma)}</span><h3 style="margin-top:4px">${esc(l.titulo)}</h3><span class="au">${esc(l.autor)}</span>
    <div class="acc">
      ${vende ? `<button class="btn oscuro" data-lib="${esc(l.id)}">Libro digital · ${pesos(l.digital)}</button>` : '<span class="aviso">Libro digital próximamente</span>'}
      ${l.ae ? `<a class="btn claro" href="${esc(l.ae)}" target="_blank" rel="noopener">Impreso en Colombia</a>` : ''}
      ${l.amazon ? `<a class="btn claro" href="${esc(l.amazon)}" target="_blank" rel="noopener">Amazon (exterior)</a>` : ''}
    </div></div>`;
  }).join('');
  document.querySelectorAll('[data-lib]').forEach(b => b.onclick = () => agregar({ id: b.dataset.lib, f: 'lib' }));
  document.querySelectorAll('.libro img').forEach(i => i.onclick = () => fichaLibro(i.dataset.id));
}
// ---------- ventanas ----------
function abrir(el) { $('#velo').hidden = false; el.hidden = false; document.body.style.overflow = 'hidden'; }
function cerrar() { $('#velo').hidden = true; $('#modal').hidden = true; $('#cajon').hidden = true; document.body.style.overflow = ''; }
$('#velo').onclick = cerrar; document.addEventListener('keydown', e => e.key === 'Escape' && cerrar());
function ficha(id) {
  const o = C.obras.find(x => x.id === id), P = C.precios; if (!o) return;
  const lista = obraLista(id);
  $('#modal').innerHTML = `<div class="izq"><img src="${esc(o.img)}" alt="${esc(o.titulo)}"></div>
  <div class="der"><button class="cerrar" aria-label="Cerrar">×</button>
    <p class="sobre">${esc(o.sala)}</p><h2>${esc(o.titulo)}</h2><p class="au">${esc(o.autor)} · ${esc(o.anio)}</p><p>${esc(o.nota)}</p>
    ${lista ? `<div class="opc">
      <label><span><input type="radio" name="f" value="l30" checked>Lámina 30 × 40 cm<small>Papel mate prémium 200 g · envío incluido</small></span><b>${pesos(P.lamina30x40)}</b></label>
      <label><span><input type="radio" name="f" value="l50">Lámina 50 × 70 cm<small>Papel mate prémium 200 g · envío incluido</small></span><b>${pesos(P.lamina50x70)}</b></label>
      <label><span><input type="radio" name="f" value="dig">Descarga digital<small>Archivo en alta resolución, llega a su correo</small></span><b>${pesos(P.arteDigital)}</b></label>
    </div>
    <button class="btn oro" id="agregarObra">Agregar al pedido</button>`
    : `<p class="aviso" style="margin:22px 0">Estamos preparando el archivo en alta resolución de esta obra. Muy pronto podrá pedirla impresa o en descarga.</p>
       <a class="btn claro" href="https://wa.me/${WA}?text=${encodeURIComponent('Hola, me interesa la obra «' + o.titulo + '».')}" target="_blank" rel="noopener">Avisarme por WhatsApp</a>`}
    <p class="aviso" style="margin-top:14px">Obra de dominio público. La lámina se imprime sin marco.</p></div>`;
  $('#modal .cerrar').onclick = cerrar;
  if ($('#agregarObra')) $('#agregarObra').onclick = () => { agregar({ id, f: $('#modal input[name=f]:checked').value }); };
  abrir($('#modal'));
}
function fichaLibro(id) {
  const l = C.libros.find(x => x.id === id); if (!l) return;
  const vende = !l.pronto && l.digital && libroListo(l.id);
  $('#modal').innerHTML = `<div class="izq"><img src="${esc(l.img)}" alt="${esc(l.titulo)}"></div>
  <div class="der"><button class="cerrar" aria-label="Cerrar">×</button>
    <p class="sobre">Clásicos de la Fe · ${esc(l.idioma)}</p><h2>${esc(l.titulo)}</h2><p class="au">${esc(l.autor)} · ${esc(l.paginas)} páginas</p><p>${esc(l.resumen)}</p>
    <p class="aviso">Traducción, introducción y notas de Ricardo Londoño González.</p>
    <div class="acc" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:20px">
    ${vende ? `<button class="btn oro" id="agLib">Libro digital · ${pesos(l.digital)}</button>` : '<span class="aviso">Libro digital próximamente</span>'}
    ${l.ae ? `<a class="btn claro" href="${esc(l.ae)}" target="_blank" rel="noopener">Impreso en Colombia</a>` : ''}
    ${l.amazon ? `<a class="btn claro" href="${esc(l.amazon)}" target="_blank" rel="noopener">Amazon</a>` : ''}</div></div>`;
  $('#modal .cerrar').onclick = cerrar;
  if ($('#agLib')) $('#agLib').onclick = () => agregar({ id, f: 'lib' });
  abrir($('#modal'));
}
function agregar(it) {
  if (it.f === 'dig' || it.f === 'lib' || it.f === 'joya') { if (bolsa.some(b => b.id === it.id && b.f === it.f)) { verBolsa(it.f === 'joya' ? 'Esta joya ya está en su pedido: es una pieza única.' : ''); return; } }
  if (bolsa.length >= 20) { verBolsa('Su pedido ya tiene 20 artículos. Pague este y haga otro pedido.'); return; }
  bolsa.push(it); guardar(); verBolsa();
}
// ---------- pedido ----------
let datosCliente = {};
try { datosCliente = JSON.parse(sessionStorage.getItem('gr-datos') || '{}'); } catch (e) {}
function verBolsa(msg, tipo) {
  const f0 = $('#formPedido'); if (f0) datosCliente = Object.fromEntries(new FormData(f0));
  $('#modal').hidden = true;
  const total = bolsa.reduce((s, i) => s + precio(i), 0);
  const v = k => esc(datosCliente[k] || '');
  $('#cajon').innerHTML = `<header><h2>Su pedido</h2><button class="cerrar" aria-label="Cerrar">×</button></header>
  <div class="cuerpo">${bolsa.length ? bolsa.map((i, k) => { const n = articulo(i); return `<div class="item"><img src="${esc(n.img)}" alt=""><div>${esc(n.titulo)}<small>${FORMATOS[i.f]}</small><button data-q="${k}">Quitar</button></div><b>${pesos(precio(i))}</b></div>`; }).join('') : '<p class="aviso">Aún no ha elegido ninguna obra.</p>'}
  ${bolsa.length ? `<form class="form" id="formPedido" style="margin-top:18px" novalidate>
    <p class="sobre" style="margin:8px 0 0">Sus datos</p>
    <input name="nombre" placeholder="Nombre y apellido" required autocomplete="name" value="${v('nombre')}">
    ${conJoya() ? `<input name="cedula" placeholder="Cédula" required inputmode="numeric" maxlength="15" value="${v('cedula')}">` : ''}
    <input name="correo" type="email" placeholder="Correo (aquí llegan las descargas)" required autocomplete="email" value="${v('correo')}">
    <input name="celular" type="tel" placeholder="Celular" required autocomplete="tel" inputmode="tel" value="${v('celular')}">
    ${fisico() ? `<p class="sobre" style="margin:8px 0 0">Dirección de envío</p>
    ${conJoya() ? `<p class="aviso">Las joyas se envían por <b>Interrapidísimo con seguro</b> a nombre de quien recibe.</p>` : ''}
    <input name="direccion" placeholder="Dirección" required autocomplete="address-line1" value="${v('direccion')}">
    <input name="direccion2" placeholder="Apartamento, torre, referencia (opcional)" autocomplete="address-line2" value="${v('direccion2')}">
    ${conJoya() ? `<input name="barrio" placeholder="Barrio" required value="${v('barrio')}">` : ''}
    <div class="dos"><input name="ciudad" placeholder="Ciudad" required autocomplete="address-level2" value="${v('ciudad')}"><input name="departamento" placeholder="Departamento" required autocomplete="address-level1" value="${v('departamento')}"></div>
    <div class="dos"><input name="postal" placeholder="Código postal${lamina() ? '' : ' (opcional)'}" ${lamina() ? 'required' : ''} inputmode="numeric" pattern="[0-9]{6}" maxlength="6" autocomplete="postal-code" value="${v('postal')}"><select name="pais"><option value="CO">Colombia</option></select></div>
    ${lamina() ? `<p class="aviso">¿No sabe su código postal? Búsquelo en <a href="https://visor.codigopostal.gov.co" target="_blank" rel="noopener">visor.codigopostal.gov.co</a>. Las láminas llegan en 10 a 20 días hábiles.</p>` : ''}` : ''}
    <label class="aviso"><input type="checkbox" name="acepta" required ${datosCliente.acepta ? 'checked' : ''}> Acepto los <a href="#" data-legal="terminos">términos</a> y la <a href="#" data-legal="privacidad">política de privacidad</a>.</label>
  </form>` : ''}${msg ? `<p class="${tipo === 'ok' ? 'ok' : 'error'}" id="msgPedido">${msg}</p>` : ''}</div>
  <footer><div class="total"><span>Total</span><span>${pesos(total)}</span></div>
  <button class="btn oro" style="width:100%" id="pagar" ${bolsa.length ? '' : 'disabled'}>Pagar en línea</button>
  <p class="aviso" style="text-align:center;margin:8px 0 0">Tarjeta, PSE, Nequi o Daviplata</p></footer>`;
  $('#cajon .cerrar').onclick = cerrar;
  document.querySelectorAll('[data-q]').forEach(b => b.onclick = () => { bolsa.splice(+b.dataset.q, 1); guardar(); verBolsa(); });
  document.querySelectorAll('#cajon [data-legal]').forEach(a => a.onclick = e => { e.preventDefault(); legal(a.dataset.legal); });
  $('#pagar').onclick = pagar;
  abrir($('#cajon'));
  if (msg && $('#msgPedido')) $('#msgPedido').scrollIntoView({ block: 'nearest' });
}
$('#btnBolsa').onclick = () => verBolsa();
function revisarForm(f) {
  const d = Object.fromEntries(new FormData(f));
  if (!d.nombre || d.nombre.trim().split(/\s+/).length < 2) return 'Escriba su nombre y apellido.';
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.correo || '')) return 'Revise su correo: allí le llegan las descargas y el resumen.';
  const cel = (d.celular || '').replace(/\D/g, ''); if (cel.length < 7 || cel.length > 15) return 'Revise su número de celular.';
  if (fisico()) {
    if ((d.direccion || '').trim().length < 5) return 'Escriba la dirección de envío completa.';
    if (!d.ciudad || !d.departamento) return 'Escriba la ciudad y el departamento del envío.';
    if (conJoya() && !/^\d{5,12}$/.test((d.cedula || '').replace(/\D/g, ''))) return 'Escriba la cédula de quien recibe: Interrapidísimo la pide para el envío asegurado.';
    if (conJoya() && (d.barrio || '').trim().length < 2) return 'Escriba el barrio de la dirección de envío.';
    if (lamina() && !/^\d{6}$/.test(d.postal || '')) return 'El código postal en Colombia tiene 6 números.';
  }
  if (!d.acepta) return 'Para continuar, acepte los términos y la política de privacidad.';
  return '';
}
async function pagar() {
  const f = $('#formPedido'); if (!f) return;
  const err = revisarForm(f); if (err) { verBolsa(err); return; }
  const btn = $('#pagar'); btn.disabled = true; btn.textContent = 'Preparando el pago…';
  const cliente = Object.fromEntries(new FormData(f));
  try { sessionStorage.setItem('gr-datos', JSON.stringify({ ...cliente, acepta: '' })); } catch (e) {}
  const total = bolsa.reduce((s, i) => s + precio(i), 0);
  let r;
  try {
    r = await conTiempo(API + 'pedido.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: bolsa, cliente, total, acepta: !!cliente.acepta }) }, 25000)
      .then(x => x.json().catch(() => ({ ok: false, error: 'El servidor de pagos respondió con un error (' + x.status + ').' })));
  } catch (e) {
    verBolsa('No pudimos conectar con el servidor de pagos. Revise su internet e intente de nuevo; si sigue igual, escríbanos al WhatsApp 304 437 5758. No se hizo ningún cobro.'); return;
  }
  if (!r.ok) { verBolsa(esc(r.error || 'No se pudo preparar el pago.') + ' No se hizo ningún cobro.'); return; }
  try { localStorage.setItem('gr-ultimo', JSON.stringify({ p: r.pedido, t: r.token })); } catch (e) {}
  if (r.aviso && !confirm(r.aviso + '\n\n¿Desea continuar al pago?')) { verBolsa(esc(r.aviso)); return; }
  try {
    let cfgBold = r.bold;
    if (!cfgBold && r.firmar) { // plan B: el navegador pide la firma al firmador central
      const fi = await conTiempo(r.firmar, {}, 15000).then(x => x.json());
      const g = (...k) => { for (const o of [fi, fi.orden, fi.data, fi.bold]) if (o) for (const n of k) if (o[n]) return o[n]; };
      cfgBold = { ...r.boldBase, orderId: g('orderId', 'order_id'), amount: String(g('amount', 'valor')), apiKey: g('apiKey', 'api_key'), integritySignature: g('integritySignature', 'signature', 'firma', 'hash') };
      if (!cfgBold.orderId || !cfgBold.apiKey || !cfgBold.integritySignature) throw new Error('firma');
      if (+cfgBold.amount !== r.total) throw new Error('valor');
      fetch(API + 'pedido.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accion: 'orden', pedido: r.pedido, token: r.token, orden: cfgBold.orderId }) }).catch(() => {});
    }
    await cargarBold();
    new BoldCheckout(cfgBold).open();
    btn.disabled = false; btn.textContent = 'Pagar en línea';
  } catch (e) {
    verBolsa('No pudimos abrir la ventana de pago. Intente de nuevo en un momento o escríbanos al WhatsApp 304 437 5758. No se hizo ningún cobro.');
  }
}
function cargarBold() {
  if (window.BoldCheckout) return Promise.resolve();
  return new Promise((ok, mal) => { const s = document.createElement('script'); s.src = 'https://checkout.bold.co/library/boldPaymentButton.js'; s.onload = ok; s.onerror = mal; document.head.appendChild(s); });
}
// ---------- regreso desde Bold ----------
function retorno() {
  const q = new URLSearchParams(location.search), ref = q.get('bold-order-id'), st = (q.get('bold-tx-status') || '').toLowerCase();
  if (!ref) return;
  history.replaceState(null, '', location.pathname + location.hash);
  let ult = {}; try { ult = JSON.parse(localStorage.getItem('gr-ultimo') || '{}'); } catch (e) {}
  const rechazado = ['rejected', 'failed', 'voided'].includes(st);
  const pintar = (titulo, texto, extra = '') => {
    $('#modal').innerHTML = `<div class="der" style="grid-column:1/-1;max-width:640px;margin:auto"><button class="cerrar" aria-label="Cerrar">×</button>
      <p class="sobre">Pedido ${esc(ult.p || ref)}</p><h2>${titulo}</h2><p>${texto}</p>${extra}</div>`;
    $('#modal .cerrar').onclick = cerrar; abrir($('#modal'));
  };
  if (rechazado) { pintar('El pago no se completó', 'No se realizó ningún cobro. Su pedido sigue guardado: puede intentarlo de nuevo cuando quiera.', '<button class="btn oro" id="reint">Volver a mi pedido</button>'); $('#reint').onclick = () => verBolsa(); return; }
  if (!ult.p) { pintar('Gracias por su compra', 'Si el pago fue aprobado, le llegará un correo con el resumen y sus descargas en pocos minutos. ¿Dudas? WhatsApp 304 437 5758.'); return; }
  pintar('Confirmando su pago…', 'Estamos recibiendo la confirmación del pago. Esto toma unos segundos.', '<div class="rueda"></div>');
  let n = 0;
  const consultar = async () => {
    n++;
    let r = null;
    try { r = await conTiempo(API + 'volver.php?' + new URLSearchParams({ p: ult.p, t: ult.t, ref }), {}, 20000).then(x => x.json()); } catch (e) {}
    if (r && r.ok && r.pagado) {
      bolsa = []; guardar();
      const dl = (r.descargas || []).map(d => `<li><a href="${esc(d.url)}">${esc(d.nombre)}</a></li>`).join('');
      pintar('Gracias por su compra', `Su pago fue aprobado. Le enviamos el resumen a <b>${esc(r.correo)}</b> (revise también la carpeta de spam).`,
        (dl ? `<p class="sobre" style="margin-top:20px">Sus descargas</p><ul class="descargas">${dl}</ul><p class="aviso">Cada enlace sirve 5 veces durante 30 días. También están en su correo.</p>` : '')
        + (r.estado === 'en_produccion' || r.estado === 'revisar' || r.estado === 'pagado' ? '<p class="aviso">Si compró láminas, se imprimen bajo pedido y llegan en 10 a 20 días hábiles.</p>' : '')
        + (r.estado === 'por_enviar' ? '<p class="aviso">Su joya sale por Interrapidísimo con seguro; le enviaremos la guía a su correo.</p>' : ''));
      return;
    }
    if (r && r.ok && ['cancelado', 'vencido'].includes(r.estado)) { pintar('El pago no se completó', 'No se realizó ningún cobro.'); return; }
    if (n < 8) { setTimeout(consultar, 4000); return; }
    pintar(st === 'approved' ? 'Pago recibido' : 'Estamos esperando la confirmación',
      (st === 'approved' ? 'Su pago fue aprobado y lo estamos registrando. ' : 'Aún no recibimos la confirmación del pago. Si el pago se aprobó, ') + 'Le llegará un correo con el resumen y sus descargas en unos minutos. Si no le llega en una hora, escríbanos al WhatsApp 304 437 5758 con el número de pedido.');
  };
  consultar();
}
// ---------- textos legales ----------
const LEGAL = {
  terminos: ['Términos y condiciones', `<p>Galería Renacimiento es una iniciativa de SkyNet Genesis (Colombia). Las obras de arte que ofrecemos son de dominio público; vendemos nuestras reproducciones, archivos preparados y ediciones propias. Las joyas de la Sala de joyas son piezas únicas de Colombian Green Emerald.</p>
  <h3>Descargas digitales</h3><p>Se entregan por correo con un enlace personal válido por 30 días y 5 descargas. Son para uso personal: impresión doméstica, fondos de pantalla o decoración propia.</p>
  <h3>Láminas impresas</h3><p>Se imprimen bajo pedido en papel mate prémium de 200 g y se envían sin marco. El precio incluye el envío. La entrega en Colombia toma de 10 a 20 días hábiles.</p>
  <h3>Joyas</h3><p>Cada joya es una pieza única con esmeralda natural colombiana montada en plata 925. Se entrega con certificado y se envía por Interrapidísimo con seguro; el número de guía llega a su correo.</p>
  <h3>Libros</h3><p>Los libros digitales se entregan en EPUB y PDF. Las traducciones, introducciones y notas están protegidas por derechos de autor de Ricardo Londoño González.</p>
  <h3>Pagos</h3><p>Los pagos se procesan con una pasarela de pagos certificada; no almacenamos datos de tarjetas.</p>`],
  privacidad: ['Política de privacidad', `<p>Usamos su nombre, correo, celular y dirección solo para entregar su pedido y atender sus solicitudes (Ley 1581 de 2012). Compartimos la dirección de envío únicamente con nuestro aliado de impresión y mensajería. Puede pedir la consulta, corrección o eliminación de sus datos escribiendo a contacto@skynetgenesis.com.</p>`],
  envios: ['Envíos y devoluciones', `<p>Las láminas viajan protegidas en tubo o empaque rígido. Si llega dañada o con un defecto de impresión, envíenos una foto dentro de los 7 días siguientes y la reponemos sin costo. Por tratarse de productos hechos a pedido y de contenidos digitales, no aplica el retracto una vez iniciada la producción o la descarga (Ley 1480 de 2011, art. 47). Las joyas tienen 5 días hábiles de retracto desde la entrega, sin uso y con su empaque y certificado.</p>`]
};
function legal(k) {
  const [t, h] = LEGAL[k];
  $('#modal').innerHTML = `<div class="der legal" style="grid-column:1/-1;margin:auto"><button class="cerrar" aria-label="Cerrar">×</button><h2>${t}</h2>${h}</div>`;
  $('#cajon').hidden = true; $('#modal .cerrar').onclick = cerrar; abrir($('#modal'));
}
document.querySelectorAll('[data-legal]').forEach(a => a.onclick = e => { e.preventDefault(); legal(a.dataset.legal); });
iniciar();
