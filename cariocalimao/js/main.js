// Configurar a morada da API
// Desenvolvimento: http://localhost:4000
const API_BASE =
  window.location.hostname === 'localhost' ? 'http://localhost:4000' : '';

const CATEGORY_PAGES = Object.freeze({
  'crónicas': 'crónicas.html',
  rascunhos: 'rascunhos.html',
  rabiscos: 'rabiscos.html',
  fotografias: 'fotografias.html',
});

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-PT', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function clearElement(element) {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

function sanitizeUrl(rawUrl) {
  if (typeof rawUrl !== 'string') return '';
  const value = rawUrl.trim();
  if (!value) return '';
  if (value.startsWith('//')) return '';
  if (/[\u0000-\u001F\u007F<>"'`]/.test(value)) return '';

  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value)) {
    try {
      const parsed = new URL(value);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        return value;
      }
      return '';
    } catch (e) {
      return '';
    }
  }

  return value;
}

function setContainerMessage(container, message) {
  clearElement(container);
  container.textContent = message;
}

function appendInlineMarkdown(target, sourceText) {
  const source = String(sourceText || '');
  const tokenRegex =
    /!\[([^\]]*)\]\(([^)]+)\)|\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|__([^_]+)__|\*([^*]+)\*|_([^_]+)_/g;
  let lastIndex = 0;
  let match = tokenRegex.exec(source);

  while (match) {
    if (match.index > lastIndex) {
      target.appendChild(
        document.createTextNode(source.slice(lastIndex, match.index))
      );
    }

    if (match[1] !== undefined && match[2] !== undefined) {
      const alt = match[1];
      const safeSrc = sanitizeUrl(match[2]);
      if (safeSrc) {
        const img = document.createElement('img');
        img.src = safeSrc;
        img.alt = alt;
        img.loading = 'lazy';
        target.appendChild(img);
      } else {
        target.appendChild(document.createTextNode(alt));
      }
    } else if (match[3] !== undefined && match[4] !== undefined) {
      const label = match[3];
      const safeHref = sanitizeUrl(match[4]);
      if (safeHref) {
        const link = document.createElement('a');
        link.href = safeHref;
        link.textContent = label;
        link.rel = 'noopener noreferrer';
        if (/^https?:\/\//i.test(safeHref)) {
          link.target = '_blank';
        }
        target.appendChild(link);
      } else {
        target.appendChild(document.createTextNode(label));
      }
    } else if (match[5] !== undefined || match[6] !== undefined) {
      const strong = document.createElement('strong');
      strong.textContent = match[5] || match[6] || '';
      target.appendChild(strong);
    } else if (match[7] !== undefined || match[8] !== undefined) {
      const em = document.createElement('em');
      em.textContent = match[7] || match[8] || '';
      target.appendChild(em);
    }

    lastIndex = tokenRegex.lastIndex;
    match = tokenRegex.exec(source);
  }

  if (lastIndex < source.length) {
    target.appendChild(document.createTextNode(source.slice(lastIndex)));
  }
}

function parseMarkdownToFragment(markdown) {
  const fragment = document.createDocumentFragment();
  const lines = String(markdown || '').split('\n');
  let paragraphLines = [];

  function flushParagraph() {
    if (paragraphLines.length === 0) return;
    const paragraph = document.createElement('p');
    paragraphLines.forEach((line, idx) => {
      appendInlineMarkdown(paragraph, line);
      if (idx < paragraphLines.length - 1) {
        paragraph.appendChild(document.createElement('br'));
      }
    });
    fragment.appendChild(paragraph);
    paragraphLines = [];
  }

  lines.forEach((rawLine) => {
    const line = rawLine.replace(/\r$/, '');
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      return;
    }

    const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      flushParagraph();
      const headingLevel = headingMatch[1].length;
      const heading = document.createElement(`h${headingLevel}`);
      appendInlineMarkdown(heading, headingMatch[2]);
      fragment.appendChild(heading);
      return;
    }

    paragraphLines.push(line);
  });

  flushParagraph();
  return fragment;
}

function buildPostHref(postId) {
  return `post.html?id=${encodeURIComponent(postId || '')}`;
}

function getCategoryPage(category) {
  return CATEGORY_PAGES[category] || 'index.html';
}

// Render helpers
function renderPostCard(post) {
  const card = document.createElement('a');
  card.href = buildPostHref(post.id);
  card.className = 'post-card';

  const safeImageUrl = sanitizeUrl(post.imageUrl || '');
  if (safeImageUrl) {
    const img = document.createElement('img');
    img.src = safeImageUrl;
    img.alt = String(post.title || '');
    img.loading = 'lazy';
    card.appendChild(img);
  }

  const content = document.createElement('div');
  content.className = 'post-card-content';

  const title = document.createElement('h3');
  title.textContent = post.title || '';
  content.appendChild(title);

  const date = document.createElement('div');
  date.className = 'post-date';
  date.textContent = formatDate(post.date || post.createdAt);
  content.appendChild(date);

  card.appendChild(content);
  return card;
}

function renderPostListItem(post) {
  const item = document.createElement('li');
  item.className = 'post-item';

  const link = document.createElement('a');
  link.href = buildPostHref(post.id);

  const title = document.createElement('h2');
  title.textContent = post.title || '';
  link.appendChild(title);

  const date = document.createElement('div');
  date.className = 'post-date';
  date.textContent = formatDate(post.date || post.createdAt);
  link.appendChild(date);

  const excerptSource =
    post.excerpt ||
    (post.content
      ? String(post.content).replace(/[#*_`\[\]()!]/g, '').slice(0, 150) +
        (post.content.length > 150 ? '...' : '')
      : '');

  const excerpt = document.createElement('div');
  excerpt.className = 'post-excerpt';
  excerpt.textContent = excerptSource;
  link.appendChild(excerpt);

  item.appendChild(link);
  return item;
}

// Carregar posts para uma categoria
async function loadCategory(category, layout) {
  const container =
    layout === 'grid'
      ? document.getElementById('posts-grid')
      : document.getElementById('posts-list');

  if (!container) return;
  setContainerMessage(container, 'A carregar...');

  try {
    const res = await fetch(
      `${API_BASE}/api/posts?category=${encodeURIComponent(category)}`
    );
    if (!res.ok) {
      setContainerMessage(container, 'Erro ao carregar posts.');
      return;
    }

    const posts = await res.json();
    if (!Array.isArray(posts) || posts.length === 0) {
      setContainerMessage(container, 'Ainda não há posts nesta categoria.');
      return;
    }

    clearElement(container);
    posts.forEach((post) => {
      if (layout === 'grid') {
        container.appendChild(renderPostCard(post));
      } else {
        container.appendChild(renderPostListItem(post));
      }
    });
  } catch (err) {
    console.error(err);
    setContainerMessage(container, 'Erro de ligação à API.');
  }
}

// Carregar post individual
async function loadPost() {
  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get('id');
  const container = document.getElementById('post-content');

  if (!container) return;
  if (!id) {
    setContainerMessage(container, 'Post não encontrado.');
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/posts/${encodeURIComponent(id)}`);
    if (!res.ok) {
      setContainerMessage(container, 'Post não encontrado.');
      return;
    }

    const post = await res.json();
    document.getElementById('post-title').textContent = `${post.title || ''} - carioca de limão`;

    clearElement(container);

    const title = document.createElement('h1');
    title.textContent = post.title || '';
    container.appendChild(title);

    const meta = document.createElement('div');
    meta.className = 'post-meta';
    meta.textContent = formatDate(post.date || post.createdAt);
    container.appendChild(meta);

    const body = document.createElement('div');
    body.className = 'post-body';
    body.appendChild(parseMarkdownToFragment(post.content));
    container.appendChild(body);

    const categoryPage = getCategoryPage(post.category);
    const categoryName = post.category || 'início';
    const backLink = document.createElement('a');
    backLink.href = categoryPage;
    backLink.className = 'back-link';
    backLink.textContent = `← Voltar a ${categoryName}`;
    container.appendChild(backLink);
  } catch (err) {
    console.error(err);
    setContainerMessage(container, 'Erro ao carregar o post.');
  }
}
