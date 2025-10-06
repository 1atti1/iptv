# 📺 IPTV Manager - Sistema de Gerenciamento de Playlists M3U

Sistema completo para organizar, gerenciar e reproduzir playlists IPTV M3U com categorização automática por **Canais ao Vivo**, **Filmes**, **Séries** e **Desenhos**.

## 🚀 Características

- ✅ Upload e parse de arquivos M3U/M3U8
- ✅ Categorização automática de conteúdo
- ✅ Organização de séries por temporadas e episódios
- ✅ Interface moderna e responsiva com React
- ✅ API RESTful com Node.js/Express
- ✅ Player de vídeo integrado
- ✅ Busca e filtros avançados
- ✅ Exportação de playlists por categoria
- ✅ Gerenciamento de metadados (logos, grupos, etc)

## 📁 Estrutura do Projeto

```
iptv-manager/
├── backend/
│   ├── server.js              # Servidor Express
│   ├── package.json           # Dependências backend
│   └── iptv-data.json         # Arquivo de dados (gerado automaticamente)
│
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── App.js             # Componente principal
│   │   ├── components/
│   │   │   └── VideoPlayer.js # Player de vídeo
│   │   ├── utils/
│   │   │   └── m3uParser.js   # Utilitários M3U
│   │   ├── index.js           # Entry point
│   │   └── index.css          # Estilos
│   └── package.json           # Dependências frontend
│
└── README.md                  # Este arquivo
```

## 🛠️ Instalação

### Pré-requisitos

- Node.js 16+ instalado
- npm ou yarn

### Backend

1. Navegue até a pasta backend:
```bash
cd backend
```

2. Instale as dependências:
```bash
npm install
```

3. Inicie o servidor:
```bash
npm start
```

O servidor estará rodando em `http://localhost:3001`

### Frontend

1. Em outro terminal, navegue até a pasta frontend:
```bash
cd frontend
```

2. Instale as dependências:
```bash
npm install
```

3. Instale o Tailwind CSS:
```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

4. Configure o Tailwind criando o arquivo `tailwind.config.js`:
```javascript
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

5. Inicie o app React:
```bash
npm start
```

O app estará rodando em `http://localhost:3000`

## 📖 Como Usar

### 1. Upload de Arquivo M3U

1. Clique no botão **"Upload M3U"** no canto superior direito
2. Selecione seu arquivo M3U ou M3U8
3. O sistema processará automaticamente e categorizará o conteúdo

### 2. Navegação

Use as abas no topo para navegar entre:
- **Canais ao Vivo**: Canais de TV tradicionais
- **Filmes**: Filmes individuais
- **Séries**: Séries organizadas por temporadas e episódios
- **Desenhos**: Desenhos animados e conteúdo infantil

### 3. Séries

Para séries:
1. Clique em uma série para ver as temporadas
2. Clique em uma temporada para ver os episódios
3. Clique em um episódio para reproduzir

### 4. Busca

Use a barra de busca para filtrar conteúdo por:
- Nome do canal/filme/série
- Grupo/categoria
- Qualquer metadata

### 5. Exportar Playlists

Clique em **"Download"** e selecione a categoria que deseja exportar como arquivo M3U.

## 🔌 API Endpoints

### Upload M3U
```http
POST /api/upload-m3u
Content-Type: application/json

{
  "content": "conteúdo do arquivo M3U"
}
```

### Obter Todos os Dados
```http
GET /api/data
```

### Obter por Categoria
```http
GET /api/channels    # Canais
GET /api/movies      # Filmes
GET /api/series      # Séries
GET /api/cartoons    # Desenhos
```

### Gerar M3U por Categoria
```http
GET /api/generate-m3u/:category
```

### Adicionar Item Manualmente
```http
POST /api/add-item
Content-Type: application/json

{
  "category": "movies",
  "item": {
    "name": "Nome do Filme",
    "url": "http://exemplo.com/filme.mp4",
    "logo": "http://exemplo.com/logo.jpg",
    "group": "Filmes de Ação"
  }
}
```

### Remover Item
```http
DELETE /api/remove-item/:category/:index
```

## 🎨 Personalização

### Adicionar Novas Categorias

Edite o arquivo `backend/server.js` e adicione a nova categoria em:
```javascript
let iptvData = {
  channels: [],
  movies: [],
  series: [],
  cartoons: [],
  suaNovaCategoria: []  // Adicione aqui
};
```

### Customizar Detecção de Categorias

Edite o método `detectCategory()` em `utils/m3uParser.js` para ajustar os padrões de reconhecimento.

### Modificar Estilos

Edite `frontend/src/index.css` para customizar cores, fontes e layout.

## 🔧 Formato M3U Suportado

O sistema suporta o formato M3U padrão:

```m3u
#EXTM3U
#EXTINF:-1 tvg-id="canal1" tvg-name="Canal 1" tvg-logo="http://logo.png" group-title="Entretenimento",Canal 1
http://stream.exemplo.com/canal1

#EXTINF:-1 tvg-logo="http://poster.jpg" group-title="Filmes",Nome do Filme (2024)
http://stream.exemplo.com/filme.mp4

#EXTINF:-1 group-title="Séries",Nome da Série S01E01
http://stream.exemplo.com/serie-s01e01.mp4
```

### Padrões Reconhecidos para Séries

- `Nome S01E01` (formato padrão)
- `Nome 1x01` (formato alternativo)
- `Nome Temporada 1 Episodio 01` (português)
- `Nome T01E01` (abreviado)

## 🐛 Solução de Problemas

### Erro ao conectar com backend

Verifique se o servidor backend está rodando na porta 3001:
```bash
cd backend
npm start
```

### Arquivo M3U não processa

Certifique-se de que o arquivo está no formato correto com linhas `#EXTINF:` e URLs válidas.

### Vídeo não reproduz

- Verifique se a URL do stream está acessível
- Alguns streams podem requerer autenticação
- Teste a URL diretamente em um player como VLC

### Estilos não aparecem

Certifique-se de ter instalado e configurado o Tailwind CSS corretamente.

## 📝 Recursos Adicionais

### Categorização Inteligente

O sistema detecta automaticamente:
- **Filmes**: Por palavras-chave como "filme", ano (1900-2099), qualidade (HD, 4K)
- **Séries**: Por padrões S01E01, temporada, episódio
- **Desenhos**: Por palavras como "desenho", "infantil", "cartoon"
- **Esportes**: Futebol, basquete, UFC, etc.
- **Notícias**: Jornais e programas informativos
- **Música**: Canais de música e clipes

### Organização de Séries

As séries são organizadas em uma estrutura hierárquica:
```
Série Nome
  └── Temporada 1
        ├── Episódio 1
        ├── Episódio 2
        └── ...
  └── Temporada 2
        └── ...
```

## 🤝 Contribuindo

Sinta-se à vontade para contribuir com melhorias:

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/MinhaFeature`)
3. Commit suas mudanças (`git commit -m 'Adiciona MinhaFeature'`)
4. Push para a branch (`git push origin feature/MinhaFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto é livre para uso pessoal e educacional.

## ⚠️ Aviso Legal

Este sistema é apenas uma ferramenta de organização. Certifique-se de ter os direitos apropriados para acessar e reproduzir qualquer conteúdo de streaming.

---

**Desenvolvido com ❤️ usando React, Node.js e Express**