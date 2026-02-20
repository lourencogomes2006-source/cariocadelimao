// Configurar a morada da API
// Desenvolvimento: http://localhost:4000
const API_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:4000' 
  : '';

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-PT', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// Render helpers
function renderPostCard(post) {
  const card = document.createElement('a');
  card.href = `post.html?id=${encodeURIComponent(post.id)}`;
  card.className = 'post-card';

  const hasImage = !!post.imageUrl;

  if (hasImage) {
    card.innerHTML = `
      <img src="${post.imageUrl}" alt="${post.title}">
      <div class="post-card-content">
        <h3>${post.title}</h3>
        <div class="post-date">${formatDate(post.date || post.createdAt)}</div>
      </div>
    `;
  } else {
    card.innerHTML = `
      <div class="post-card-content">
        <h3>${post.title}</h3>
        <div class="post-date">${formatDate(post.date || post.createdAt)}</div>
      </div>
    `;
  }

  return card;
}

function renderPostListItem(post) {
  const item = document.createElement('li');
  item.className = 'post-item';

  const excerpt =
    post.excerpt ||
    (post.content
      ? String(post.content).replace(/[#*_`\[\]()!]/g, '').slice(0, 150) +
        (post.content.length > 150 ? '...' : '')
      : '');

  item.innerHTML = `
    <a href="post.html?id=${encodeURIComponent(post.id)}">
      <h2>${post.title}</h2>
      <div class="post-date">${formatDate(post.date || post.createdAt)}</div>
      <div class="post-excerpt">${excerpt}</div>
    </a>
  `;

  return item;
}

// Carregar posts para uma categoria
async function loadCategory(category, layout) {
  const container =
    layout === 'grid'
      ? document.getElementById('posts-grid')
      : document.getElementById('posts-list');

  if (!container) return;

  container.innerHTML = 'A carregar...';

  try {
    const res = await fetch(
      `${API_BASE}/api/posts?category=${encodeURIComponent(category)}`
    );
    if (!res.ok) {
      container.innerHTML = '<p>Erro ao carregar posts.</p>';
      return;
    }

    const posts = await res.json();

    if (!Array.isArray(posts) || posts.length === 0) {
      container.innerHTML = '<p>Ainda não há posts nesta categoria.</p>';
      return;
    }

    container.innerHTML = '';

    posts.forEach((post) => {
      if (layout === 'grid') {
        container.appendChild(renderPostCard(post));
      } else {
        container.appendChild(renderPostListItem(post));
      }
    });
  } catch (err) {
    console.error(err);
    container.innerHTML = '<p>Erro de ligação à API.</p>';
  }
}

// Simples parser de markdown (apenas para o conteúdo do post)
function parseMarkdown(markdown) {
  let html = markdown || '';

  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');

  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/_(.*?)_/g, '<em>$1</em>');

  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');

  html = html
    .split('\n\n')
    .map((para) => {
      const p = para.trim();
      if (p) {
        return '<p>' + p.replace(/\n/g, '<br>') + '</p>';
      }
      return '';
    })
    .join('\n');

  return html;
}

// Carregar post individual
async function loadPost() {
  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get('id');

  const container = document.getElementById('post-content');
  if (!container) return;

  if (!id) {
    container.innerHTML = '<p>Post não encontrado.</p>';
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/posts/${encodeURIComponent(id)}`);
    if (!res.ok) {
      container.innerHTML = '<p>Post não encontrado.</p>';
      return;
    }

    const post = await res.json();

    document.getElementById(
      'post-title'
    ).textContent = `${post.title} - carioca de limão`;

    const htmlBody = parseMarkdown(post.content);

    const category = post.category || '';
    const categoryPage = category ? `${category}.html` : 'index.html';
    const categoryName =
      category.charAt(0).toUpperCase() + category.slice(1);

    container.innerHTML = `
      <h1>${post.title}</h1>
      <div class="post-meta">${formatDate(post.date || post.createdAt)}</div>
      <div class="post-body">${htmlBody}</div>
      <a href="${categoryPage}" class="back-link">← Voltar a ${categoryName}</a>
    `;
  } catch (err) {
    console.error(err);
    container.innerHTML = '<p>Erro ao carregar o post.</p>';
  }
}

