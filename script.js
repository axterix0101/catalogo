let carrinho = [];

const listaProdutos = document.getElementById('listaProdutos');
const busca = document.getElementById('busca');
const filtroCategoria = document.getElementById('filtroCategoria');
const btnCarrinho = document.getElementById('btnCarrinho');
const painelCarrinho = document.getElementById('painelCarrinho');
const fecharCarrinho = document.getElementById('fecharCarrinho');
const overlay = document.getElementById('overlay');
const itensCarrinho = document.getElementById('itensCarrinho');
const contadorCarrinho = document.getElementById('contadorCarrinho');
const totalCarrinho = document.getElementById('totalCarrinho');
const finalizarPedido = document.getElementById('finalizarPedido');
const nomeCliente = document.getElementById('nomeCliente');
const telefoneCliente = document.getElementById('telefoneCliente');
const observacaoPedido = document.getElementById('observacaoPedido');

const numeroWhatsApp = '5532999999999';
const placeholderSvg = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">
  <rect width="800" height="800" fill="#161616"/>
  <rect x="70" y="70" width="660" height="660" rx="36" fill="#1f1f1f" stroke="#ff7a00" stroke-opacity="0.35"/>
  <text x="400" y="360" text-anchor="middle" fill="#ff8c00" font-size="140" font-family="Arial">Ω</text>
  <text x="400" y="470" text-anchor="middle" fill="#ffffff" font-size="40" font-family="Arial">ADICIONE A FOTO</text>
</svg>
`)}`;

function sanitizarTexto(valor) {
  return String(valor ?? '')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function sanitizarTelefone(valor) {
  return String(valor ?? '').replace(/[^\d()+\-\s]/g, '').trim();
}

function formatarPreco(valor) {
  return Number(valor).toFixed(2).replace('.', ',');
}

function obterCategoriaLabel(categoria) {
  const mapa = {
    camisetas: 'Camisetas',
    bermudas: 'Bermudas',
    moletons: 'Moletons',
    bones: 'Bonés',
    conjuntos: 'Conjuntos'
  };
  return mapa[categoria] || 'Produtos';
}

function criarElemento(tag, className, texto) {
  const elemento = document.createElement(tag);
  if (className) elemento.className = className;
  if (texto) elemento.textContent = texto;
  return elemento;
}

function renderizarProdutos(lista) {
  listaProdutos.replaceChildren();

  if (!Array.isArray(lista) || lista.length === 0) {
    const vazio = criarElemento('p', 'sem-produtos', 'Nenhum produto encontrado.');
    listaProdutos.appendChild(vazio);
    return;
  }

  const fragment = document.createDocumentFragment();

  lista.forEach((produto) => {
    const card = criarElemento('article', 'card-produto');

    const imagemWrap = criarElemento('div', 'produto-imagem-wrap');
    const imagem = document.createElement('img');
    imagem.className = 'produto-imagem';
    imagem.loading = 'lazy';
    imagem.alt = sanitizarTexto(produto.nome);
    imagem.src = produto.imagem || placeholderSvg;
    imagem.addEventListener('error', () => {
      imagem.src = placeholderSvg;
    }, { once: true });
    imagemWrap.appendChild(imagem);

    const info = criarElemento('div', 'produto-info');
    info.appendChild(criarElemento('div', 'produto-categoria', obterCategoriaLabel(produto.categoria)));
    info.appendChild(criarElemento('h3', '', sanitizarTexto(produto.nome)));
    info.appendChild(criarElemento('p', '', sanitizarTexto(produto.descricao)));

    const precoLinha = criarElemento('div', 'preco-linha');
    precoLinha.appendChild(criarElemento('span', 'preco', `R$ ${formatarPreco(produto.preco)}`));

    const botao = criarElemento('button', 'btn-add', 'Adicionar');
    botao.type = 'button';
    botao.addEventListener('click', () => adicionarAoCarrinho(produto.id));
    precoLinha.appendChild(botao);

    info.appendChild(precoLinha);
    card.append(imagemWrap, info);
    fragment.appendChild(card);
  });

  listaProdutos.appendChild(fragment);
}

function filtrarProdutos() {
  const termo = sanitizarTexto(busca.value).toLowerCase();
  const categoria = filtroCategoria.value;

  const filtrados = produtos.filter((produto) => {
    const nomeCombina = sanitizarTexto(produto.nome).toLowerCase().includes(termo);
    const categoriaCombina = categoria === 'todos' || produto.categoria === categoria;
    return nomeCombina && categoriaCombina;
  });

  renderizarProdutos(filtrados);
}

function adicionarAoCarrinho(id) {
  const produto = produtos.find((item) => item.id === id);
  if (!produto) return;

  const itemExistente = carrinho.find((item) => item.id === id);
  if (itemExistente) {
    itemExistente.quantidade += 1;
  } else {
    carrinho.push({ ...produto, quantidade: 1 });
  }

  atualizarCarrinho();
}

function alterarQuantidade(id, delta) {
  const item = carrinho.find((produto) => produto.id === id);
  if (!item) return;

  item.quantidade += delta;
  if (item.quantidade <= 0) {
    carrinho = carrinho.filter((produto) => produto.id !== id);
  }

  atualizarCarrinho();
}

function atualizarCarrinho() {
  itensCarrinho.replaceChildren();

  if (carrinho.length === 0) {
    itensCarrinho.appendChild(criarElemento('p', 'carrinho-vazio', 'Seu carrinho está vazio.'));
  } else {
    const fragment = document.createDocumentFragment();

    carrinho.forEach((item) => {
      const div = criarElemento('div', 'item-carrinho');
      div.appendChild(criarElemento('h4', '', sanitizarTexto(item.nome)));
      div.appendChild(criarElemento('p', '', `R$ ${formatarPreco(item.preco)} cada`));

      const controles = criarElemento('div', 'quantidade-linha');
      const menos = criarElemento('button', 'btn-qt', '−');
      menos.type = 'button';
      menos.addEventListener('click', () => alterarQuantidade(item.id, -1));

      const quantidade = criarElemento('span', 'quantidade-numero', String(item.quantidade));

      const mais = criarElemento('button', 'btn-qt', '+');
      mais.type = 'button';
      mais.addEventListener('click', () => alterarQuantidade(item.id, 1));

      controles.append(menos, quantidade, mais);
      div.appendChild(controles);
      fragment.appendChild(div);
    });

    itensCarrinho.appendChild(fragment);
  }

  const quantidadeTotal = carrinho.reduce((total, item) => total + item.quantidade, 0);
  const total = carrinho.reduce((soma, item) => soma + (item.preco * item.quantidade), 0);
  contadorCarrinho.textContent = String(quantidadeTotal);
  totalCarrinho.textContent = formatarPreco(total);
}

function abrirCarrinho() {
  painelCarrinho.classList.add('aberto');
  painelCarrinho.setAttribute('aria-hidden', 'false');
  btnCarrinho.setAttribute('aria-expanded', 'true');
  overlay.hidden = false;
  overlay.classList.add('ativo');
  document.body.classList.add('travado');
}

function fecharPainelCarrinho() {
  painelCarrinho.classList.remove('aberto');
  painelCarrinho.setAttribute('aria-hidden', 'true');
  btnCarrinho.setAttribute('aria-expanded', 'false');
  overlay.classList.remove('ativo');
  overlay.hidden = true;
  document.body.classList.remove('travado');
}

function gerarMensagemWhatsApp() {
  if (carrinho.length === 0) {
    alert('Adicione pelo menos um produto ao carrinho.');
    return null;
  }

  const nome = sanitizarTexto(nomeCliente.value);
  const telefone = sanitizarTelefone(telefoneCliente.value);
  const observacao = sanitizarTexto(observacaoPedido.value);

  if (!nome || !telefone) {
    alert('Preencha nome e telefone antes de finalizar.');
    return null;
  }

  const linhas = [
    'Olá! Quero fazer um pedido na Omega Store.',
    '',
    `Cliente: ${nome}`,
    `Telefone: ${telefone}`,
    'Forma de recebimento: Retirada na loja',
    '',
    'Itens do pedido:'
  ];

  carrinho.forEach((item) => {
    linhas.push(`- ${sanitizarTexto(item.nome)} x${item.quantidade} | R$ ${formatarPreco(item.preco * item.quantidade)}`);
  });

  const total = carrinho.reduce((soma, item) => soma + (item.preco * item.quantidade), 0);
  linhas.push('', `Total: R$ ${formatarPreco(total)}`);

  if (observacao) {
    linhas.push(`Observações: ${observacao}`);
  }

  linhas.push('', 'Pode separar meu pedido para retirada na loja.');
  return encodeURIComponent(linhas.join('\n'));
}

function enviarPedidoWhatsApp() {
  const mensagem = gerarMensagemWhatsApp();
  if (!mensagem) return;

  const url = `https://wa.me/${numeroWhatsApp}?text=${mensagem}`;
  window.open(url, '_blank', 'noopener');
}

busca.addEventListener('input', filtrarProdutos);
filtroCategoria.addEventListener('change', filtrarProdutos);
btnCarrinho.addEventListener('click', abrirCarrinho);
fecharCarrinho.addEventListener('click', fecharPainelCarrinho);
overlay.addEventListener('click', fecharPainelCarrinho);
finalizarPedido.addEventListener('click', enviarPedidoWhatsApp);
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && painelCarrinho.classList.contains('aberto')) {
    fecharPainelCarrinho();
  }
});

renderizarProdutos(produtos);
atualizarCarrinho();
