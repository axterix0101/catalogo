'use strict';

/* ─── Constantes ─────────────────────────────────────────── */
const WHATSAPP_NUM   = '5532999999999';
const MAX_QUANTIDADE = 99;

const CATEGORIA_LABEL = {
  camisetas : 'Camisetas',
  bermudas  : 'Bermudas',
  moletons  : 'Moletons',
  bones     : 'Bonés',
  conjuntos : 'Conjuntos'
};

const PLACEHOLDER_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">
    <rect width="800" height="800" fill="#161616"/>
    <rect x="70" y="70" width="660" height="660" rx="36" fill="#1f1f1f" stroke="#ff7a00" stroke-opacity="0.35"/>
    <text x="400" y="360" text-anchor="middle" fill="#ff8c00" font-size="140" font-family="Arial">Ω</text>
    <text x="400" y="470" text-anchor="middle" fill="#ffffff" font-size="40" font-family="Arial">SEM FOTO</text>
  </svg>`
)}`;

/* ─── Referências DOM ────────────────────────────────────── */
const $ = id => document.getElementById(id);

const listaProdutos    = $('listaProdutos');
const busca            = $('busca');
const filtroCategoria  = $('filtroCategoria');
const btnCarrinho      = $('btnCarrinho');
const painelCarrinho   = $('painelCarrinho');
const fecharCarrinho   = $('fecharCarrinho');
const overlay          = $('overlay');
const itensCarrinho    = $('itensCarrinho');
const contadorCarrinho = $('contadorCarrinho');
const totalCarrinho    = $('totalCarrinho');
const finalizarPedido  = $('finalizarPedido');
const nomeCliente      = $('nomeCliente');
const telefoneCliente  = $('telefoneCliente');
const observacaoPedido = $('observacaoPedido');
const toastEl          = $('toast');

/* ─── Estado ─────────────────────────────────────────────── */
let carrinho = carregarCarrinho();

/* ─── Persistência ───────────────────────────────────────── */
function carregarCarrinho() {
  try {
    const raw = sessionStorage.getItem('omega_carrinho');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    // Valida: apenas itens cujos IDs existem em `produtos`
    return Array.isArray(parsed)
      ? parsed.filter(item =>
          typeof item.id === 'number' &&
          typeof item.quantidade === 'number' &&
          item.quantidade > 0 &&
          produtos.some(p => p.id === item.id)
        )
      : [];
  } catch {
    return [];
  }
}

function salvarCarrinho() {
  try {
    sessionStorage.setItem('omega_carrinho', JSON.stringify(carrinho));
  } catch {
    // sessionStorage indisponível — continua sem persistência
  }
}

/* ─── Sanitização ────────────────────────────────────────── */
function sanitizarTexto(valor) {
  return String(valor ?? '')
    .replace(/[<>"'`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function sanitizarTelefone(valor) {
  return String(valor ?? '').replace(/[^\d()\-+\s]/g, '').trim();
}

/* ─── Formatação ─────────────────────────────────────────── */
function formatarPreco(valor) {
  return Number(valor).toFixed(2).replace('.', ',');
}

/* ─── Toast de feedback ──────────────────────────────────── */
function mostrarToast(msg) {
  if (!toastEl) return;
  toastEl.textContent = sanitizarTexto(msg);
  toastEl.classList.add('visivel');
  toastEl.removeAttribute('hidden');
  clearTimeout(mostrarToast._timer);
  mostrarToast._timer = setTimeout(() => {
    toastEl.classList.remove('visivel');
    toastEl.setAttribute('hidden', '');
  }, 2600);
}

/* ─── Renderizar produtos ────────────────────────────────── */
function criarEl(tag, className, texto) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (texto !== undefined) el.textContent = texto;
  return el;
}

function renderizarProdutos(lista) {
  listaProdutos.replaceChildren();

  if (!Array.isArray(lista) || lista.length === 0) {
    listaProdutos.appendChild(criarEl('p', 'sem-produtos', 'Nenhum produto encontrado.'));
    return;
  }

  const frag = document.createDocumentFragment();

  lista.forEach(produto => {
    const card = criarEl('article', 'card-produto');
    card.setAttribute('data-id', produto.id);

    // Imagem
    const wrap = criarEl('div', 'produto-imagem-wrap');
    const img  = document.createElement('img');
    img.className   = 'produto-imagem';
    img.loading     = 'lazy';
    img.decoding    = 'async';
    img.alt         = sanitizarTexto(produto.nome);
    img.src         = produto.imagem || PLACEHOLDER_SVG;
    img.addEventListener('error', () => { img.src = PLACEHOLDER_SVG; }, { once: true });
    wrap.appendChild(img);

    // Info
    const info = criarEl('div', 'produto-info');
    info.appendChild(criarEl('div', 'produto-categoria', CATEGORIA_LABEL[produto.categoria] ?? 'Produto'));
    info.appendChild(criarEl('h3', null, sanitizarTexto(produto.nome)));
    info.appendChild(criarEl('p', null, sanitizarTexto(produto.descricao)));

    const precoLinha = criarEl('div', 'preco-linha');
    precoLinha.appendChild(criarEl('span', 'preco', `R$ ${formatarPreco(produto.preco)}`));

    const botao = criarEl('button', 'btn-add', 'Adicionar');
    botao.type = 'button';
    botao.setAttribute('aria-label', `Adicionar ${sanitizarTexto(produto.nome)} ao carrinho`);
    botao.addEventListener('click', () => adicionarAoCarrinho(produto.id));
    precoLinha.appendChild(botao);

    info.appendChild(precoLinha);
    card.append(wrap, info);
    frag.appendChild(card);
  });

  listaProdutos.appendChild(frag);
}

/* ─── Filtro / busca ─────────────────────────────────────── */
let debounceTimer;
function filtrarProdutos() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    const termo    = sanitizarTexto(busca.value).toLowerCase();
    const cat      = filtroCategoria.value;
    const filtrados = produtos.filter(p => {
      const nomeOk = sanitizarTexto(p.nome).toLowerCase().includes(termo);
      const catOk  = cat === 'todos' || p.categoria === cat;
      return nomeOk && catOk;
    });
    renderizarProdutos(filtrados);
  }, 120);
}

/* ─── Carrinho ───────────────────────────────────────────── */
function adicionarAoCarrinho(id) {
  const produto = produtos.find(p => p.id === id);
  if (!produto) return;

  const existente = carrinho.find(i => i.id === id);
  if (existente) {
    if (existente.quantidade >= MAX_QUANTIDADE) {
      mostrarToast('Quantidade máxima atingida para este item.');
      return;
    }
    existente.quantidade += 1;
  } else {
    carrinho.push({ ...produto, quantidade: 1 });
  }

  salvarCarrinho();
  atualizarCarrinho();
  mostrarToast(`"${sanitizarTexto(produto.nome)}" adicionado ao carrinho.`);
}

function alterarQuantidade(id, delta) {
  const item = carrinho.find(p => p.id === id);
  if (!item) return;

  item.quantidade += delta;
  if (item.quantidade <= 0) {
    carrinho = carrinho.filter(p => p.id !== id);
  } else if (item.quantidade > MAX_QUANTIDADE) {
    item.quantidade = MAX_QUANTIDADE;
  }

  salvarCarrinho();
  atualizarCarrinho();
}

function atualizarCarrinho() {
  itensCarrinho.replaceChildren();

  if (carrinho.length === 0) {
    itensCarrinho.appendChild(criarEl('p', 'carrinho-vazio', 'Seu carrinho está vazio.'));
  } else {
    const frag = document.createDocumentFragment();
    carrinho.forEach(item => {
      const div = criarEl('div', 'item-carrinho');

      const nomeLine = criarEl('h4', null, sanitizarTexto(item.nome));
      const precoLine = criarEl('p', null, `R$ ${formatarPreco(item.preco)} cada`);

      const controles = criarEl('div', 'quantidade-linha');

      const menos = criarEl('button', 'btn-qt', '−');
      menos.type = 'button';
      menos.setAttribute('aria-label', `Remover uma unidade de ${sanitizarTexto(item.nome)}`);
      menos.addEventListener('click', () => alterarQuantidade(item.id, -1));

      const qtdSpan = criarEl('span', 'quantidade-numero', String(item.quantidade));
      qtdSpan.setAttribute('aria-live', 'polite');

      const mais = criarEl('button', 'btn-qt', '+');
      mais.type = 'button';
      mais.setAttribute('aria-label', `Adicionar uma unidade de ${sanitizarTexto(item.nome)}`);
      mais.addEventListener('click', () => alterarQuantidade(item.id, 1));

      controles.append(menos, qtdSpan, mais);

      const subtotal = criarEl('p', 'item-subtotal', `Subtotal: R$ ${formatarPreco(item.preco * item.quantidade)}`);

      div.append(nomeLine, precoLine, controles, subtotal);
      frag.appendChild(div);
    });
    itensCarrinho.appendChild(frag);
  }

  const totalQtd = carrinho.reduce((t, i) => t + i.quantidade, 0);
  const total    = carrinho.reduce((s, i) => s + i.preco * i.quantidade, 0);

  contadorCarrinho.textContent = String(totalQtd);
  contadorCarrinho.setAttribute('aria-label', `${totalQtd} itens no carrinho`);
  totalCarrinho.textContent = formatarPreco(total);
}

/* ─── Painel carrinho ────────────────────────────────────── */
function abrirPainel() {
  painelCarrinho.classList.add('aberto');
  painelCarrinho.setAttribute('aria-hidden', 'false');
  btnCarrinho.setAttribute('aria-expanded', 'true');
  overlay.hidden = false;
  overlay.classList.add('ativo');
  document.body.classList.add('travado');
  fecharCarrinho.focus();
}

function fecharPainel() {
  painelCarrinho.classList.remove('aberto');
  painelCarrinho.setAttribute('aria-hidden', 'true');
  btnCarrinho.setAttribute('aria-expanded', 'false');
  overlay.classList.remove('ativo');
  overlay.hidden = true;
  document.body.classList.remove('travado');
  btnCarrinho.focus();
}

/* ─── Validação de campos ────────────────────────────────── */
function validarCampo(el, condicao, msg) {
  if (!condicao) {
    el.classList.add('campo-erro');
    el.setAttribute('aria-invalid', 'true');
    el.setAttribute('aria-describedby', el.id + '-erro');
    let span = document.getElementById(el.id + '-erro');
    if (!span) {
      span = document.createElement('span');
      span.id = el.id + '-erro';
      span.className = 'campo-erro-msg';
      el.insertAdjacentElement('afterend', span);
    }
    span.textContent = msg;
    return false;
  }
  limparErro(el);
  return true;
}

function limparErro(el) {
  el.classList.remove('campo-erro');
  el.removeAttribute('aria-invalid');
  el.removeAttribute('aria-describedby');
  const span = document.getElementById(el.id + '-erro');
  if (span) span.remove();
}

/* ─── WhatsApp ───────────────────────────────────────────── */
function gerarMensagemWhatsApp() {
  if (carrinho.length === 0) {
    mostrarToast('Adicione pelo menos um produto ao carrinho.');
    return null;
  }

  const nome     = sanitizarTexto(nomeCliente.value);
  const telefone = sanitizarTelefone(telefoneCliente.value);
  const obs      = sanitizarTexto(observacaoPedido.value);

  const nomeOk = validarCampo(nomeCliente, nome.length >= 2, 'Informe seu nome completo.');
  const telOk  = validarCampo(telefoneCliente, telefone.replace(/\D/g, '').length >= 8, 'Informe um telefone válido.');

  if (!nomeOk || !telOk) return null;

  const linhas = [
    'Olá! Gostaria de fazer um pedido na Omega Store.',
    '',
    `*Cliente:* ${nome}`,
    `*Telefone:* ${telefone}`,
    '*Retirada:* na loja física',
    '',
    '*Itens do pedido:*'
  ];

  carrinho.forEach(item => {
    linhas.push(`• ${sanitizarTexto(item.nome)} × ${item.quantidade}  →  R$ ${formatarPreco(item.preco * item.quantidade)}`);
  });

  const total = carrinho.reduce((s, i) => s + i.preco * i.quantidade, 0);
  linhas.push('', `*Total: R$ ${formatarPreco(total)}*`);

  if (obs) linhas.push(`\n*Observações:* ${obs}`);

  linhas.push('', 'Pode separar para retirada na loja? Obrigado(a)! 🙏');
  return encodeURIComponent(linhas.join('\n'));
}

function enviarPedido() {
  const msg = gerarMensagemWhatsApp();
  if (!msg) return;
  window.open(`https://wa.me/${WHATSAPP_NUM}?text=${msg}`, '_blank', 'noopener,noreferrer');
}

/* ─── Event listeners ────────────────────────────────────── */
busca.addEventListener('input', filtrarProdutos);
filtroCategoria.addEventListener('change', filtrarProdutos);
btnCarrinho.addEventListener('click', abrirPainel);
fecharCarrinho.addEventListener('click', fecharPainel);
overlay.addEventListener('click', fecharPainel);
finalizarPedido.addEventListener('click', enviarPedido);

// Limpar erro ao digitar
[nomeCliente, telefoneCliente].forEach(el =>
  el.addEventListener('input', () => limparErro(el))
);

// Fechar com ESC / trap de foco no painel
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && painelCarrinho.classList.contains('aberto')) {
    fecharPainel();
  }
});

/* ─── Init ───────────────────────────────────────────────── */
renderizarProdutos(produtos);
atualizarCarrinho();
