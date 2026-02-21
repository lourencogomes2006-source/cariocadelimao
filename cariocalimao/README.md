# carioca de limão

Um blog minimalista para partilhar textos, fotografias e desenhos.

## Estrutura

- `index.html` - Página principal
- `admin.html` - Página de administração para criar posts
- `crónicas.html`, `rascunhos.html`, `rabiscos.html`, `fotografias.html` - Páginas de categorias
- `post.html` - Visualizador de posts individuais
- `css/style.css` - Estilos
- `js/main.js` - Lógica de carregamento de posts
- `js/admin.js` - Lógica do formulário de administração
- `posts/` - Pasta com os posts organizados por categoria

## Como criar novos posts

A partir de agora os posts são guardados automaticamente no backend através da página de administração. Não é necessário criar ficheiros `.md` manualmente.

### Usar a página de administração (admin.html)

1. Certifique-se de que o backend está a correr:
   - No Terminal:
     ```bash
     cd server
     npm install   # apenas na primeira vez
     export ADMIN_API_KEY='defina-uma-chave-forte'
     npm start
     ```
   - O backend ficará disponível em `http://localhost:4000`
   - A publicação de posts requer a mesma chave no campo **“Chave de Administração”** da página `admin.html`
2. Abra o frontend (por exemplo, com o servidor simples abaixo) e aceda a `admin.html`:
   ```bash
   python -m http.server 8000
   ```
   Depois aceda a `http://localhost:8000/admin.html`
3. No formulário:
   - Selecione a categoria (crónicas, rascunhos, rabiscos ou fotografias)
   - Introduza o título
   - Selecione a data
   - Opcional: adicione um URL de imagem **ou** arraste e largue um ficheiro de fotografia
   - Escreva o conteúdo (em Markdown, se quiser)
   - Opcional: adicione um pequeno resumo
4. Clique em **“Publicar”**
5. O post fica automaticamente disponível na categoria correspondente

### API_BASE (morada da API)

A morada da API é configurada em:

- `js/main.js` e `js/admin.js` → `const API_BASE = 'http://localhost:4000';` (em desenvolvimento local)

Quando publicar o backend noutro servidor (por exemplo Render / Railway), altere estas linhas para o novo endereço, por exemplo:

```js
const API_BASE = 'https://o-meu-backend.exemplo.com';
```

## Formato Markdown Suportado

- Títulos: `# Título`, `## Subtítulo`, `### Sub-subtítulo`
- Negrito: `**texto**`
- Itálico: `*texto*`
- Links: `[texto](url)`
- Imagens: `![alt](url)`
- Parágrafos: separados por linha em branco
- Listas: `- item` ou `* item`

## Visualização

Abra `index.html` num navegador (via servidor HTTP) para ver o blog. Para desenvolvimento local, pode usar um servidor HTTP simples:

```bash
python -m http.server 8000
```

Depois aceda a `http://localhost:8000`
