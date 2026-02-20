// Configurar aqui a morada da API (backend)
// Em desenvolvimento: http://localhost:4000
// Em produção: altere para o domínio onde o backend estiver hospedado
const API_BASE = 'http://localhost:4000';

// Mostrar/esconder campo de imagem consoante a categoria
document.getElementById('category').addEventListener('change', function () {
  const imageGroup = document.getElementById('image-group');
  const category = this.value;
  if (category === 'rabiscos' || category === 'fotografias') {
    imageGroup.style.display = 'block';
  } else {
    imageGroup.style.display = 'none';
  }
});

// Data de hoje por omissão
document.getElementById('date').valueAsDate = new Date();

// Drag & drop de imagem
let selectedImageFile = null;

const dropZone = document.getElementById('drop-zone');
const imageFileInput = document.getElementById('image-file');

if (dropZone && imageFileInput) {
  function setDropZoneActive(active) {
    if (active) {
      dropZone.classList.add('drop-zone--active');
    } else {
      dropZone.classList.remove('drop-zone--active');
    }
  }

  dropZone.addEventListener('click', () => {
    imageFileInput.click();
  });

  imageFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      selectedImageFile = file;
      dropZone.querySelector('.drop-zone__text').textContent = `Ficheiro selecionado: ${file.name}`;
    }
  });

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    setDropZoneActive(true);
  });

  dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    setDropZoneActive(false);
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    setDropZoneActive(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      selectedImageFile = file;
      dropZone.querySelector('.drop-zone__text').textContent = `Ficheiro selecionado: ${file.name}`;
    }
  });
}

// Submeter formulário para a API
document.getElementById('post-form').addEventListener('submit', async function (e) {
  e.preventDefault();

  const category = document.getElementById('category').value;
  const title = document.getElementById('title').value;
  const date = document.getElementById('date').value;
  const imageUrlInput = document.getElementById('image').value;
  const excerpt = document.getElementById('excerpt').value;
  const content = document.getElementById('content').value;
  const statusBox = document.getElementById('submit-status');

  if (!category || !title || !date || !content) {
    alert('Por favor, preencha todos os campos obrigatórios.');
    return;
  }

  const formData = new FormData();
  formData.append('category', category);
  formData.append('title', title);
  formData.append('date', date);
  formData.append('excerpt', excerpt);
  formData.append('content', content);

  if (selectedImageFile) {
    formData.append('image', selectedImageFile);
  }

  if (imageUrlInput) {
    formData.append('imageUrl', imageUrlInput);
  }

  if (statusBox) {
    statusBox.style.display = 'block';
    statusBox.textContent = 'A publicar o post...';
  }

  try {
    const response = await fetch(`${API_BASE}/api/posts`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const msg = errorData.error || 'Erro ao publicar o post.';
      if (statusBox) {
        statusBox.textContent = msg;
      } else {
        alert(msg);
      }
      return;
    }

    const createdPost = await response.json();

    if (statusBox) {
      statusBox.textContent = 'Post publicado com sucesso!';
    } else {
      alert('Post publicado com sucesso!');
    }

    // Limpar formulário
    this.reset();
    selectedImageFile = null;
    if (dropZone) {
      dropZone.querySelector('.drop-zone__text').textContent =
        'Arraste e largue aqui a fotografia ou clique para selecionar.';
    }

    // Opcional: redirecionar para a categoria correspondente
    // const categoryPage = `${category}.html`;
    // window.location.href = categoryPage;
  } catch (err) {
    console.error(err);
    const msg = 'Erro de ligação à API.';
    if (statusBox) {
      statusBox.textContent = msg;
    } else {
      alert(msg);
    }
  }
});

