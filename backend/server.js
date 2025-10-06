const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const compression = require('compression');

const app = express();
const PORT = 3001;

// Middleware
app.use(compression()); // Compressão GZIP para respostas
app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));
app.use(express.static('public'));

// Cache em memória
let cacheData = null;
let cacheTimestamp = null;
const CACHE_DURATION = 60000; // 1 minuto

// Estrutura de dados para organizar conteúdo
let iptvData = {
  channels: [],
  movies: [],
  series: {},
  cartoons: {}
};

// Carregar dados existentes
const dataFile = './iptv-data.json';

function loadDataFromFile() {
  if (fs.existsSync(dataFile)) {
    try {
      return JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    } catch (error) {
      console.log('Erro ao carregar dados:', error);
    }
  }
  return {
    channels: [],
    movies: [],
    series: {},
    cartoons: {}
  };
}

// Carregar dados ao iniciar
iptvData = loadDataFromFile();

// Salvar dados de forma assíncrona
function saveData() {
  fs.writeFile(dataFile, JSON.stringify(iptvData, null, 2), (err) => {
    if (err) console.error('Erro ao salvar dados:', err);
  });
  
  // Invalidar cache
  cacheData = null;
  cacheTimestamp = null;
}

// Classe para gerenciar M3U
class M3UManager {
  static parseM3U(content) {
    const lines = content.split('\n').filter(line => line.trim());
    const items = [];
    let currentItem = {};

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.startsWith('#EXTINF:')) {
        // Extrair informações do EXTINF
        const match = line.match(/#EXTINF:(-?\d+)(?:\s+tvg-id="([^"]*)")?(?:\s+tvg-name="([^"]*)")?(?:\s+tvg-logo="([^"]*)")?(?:\s+group-title="([^"]*)")?[^,]*,(.+)/);
        
        if (match) {
          currentItem = {
            duration: parseInt(match[1]),
            tvgId: match[2] || '',
            tvgName: match[3] || '',
            logo: match[4] || '',
            group: match[5] || 'Outros',
            name: match[6] || '',
            url: ''
          };
        }
      } else if (line.startsWith('http')) {
        currentItem.url = line;
        items.push({ ...currentItem });
        currentItem = {};
      }
    }

    return items;
  }

  static generateM3U(items, title = 'IPTV Playlist') {
    let m3u = '#EXTM3U\n';
    
    items.forEach(item => {
      m3u += `#EXTINF:${item.duration || -1}`;
      if (item.tvgId) m3u += ` tvg-id="${item.tvgId}"`;
      if (item.tvgName) m3u += ` tvg-name="${item.tvgName}"`;
      if (item.logo) m3u += ` tvg-logo="${item.logo}"`;
      if (item.group) m3u += ` group-title="${item.group}"`;
      m3u += `,${item.name}\n${item.url}\n`;
    });

    return m3u;
  }

  static categorizeContent(items) {
    const categorized = {
      channels: [],
      movies: [],
      series: [],
      cartoons: []
    };

    console.log(`\n🔍 Categorizando ${items.length} itens...`);
    let seriesCount = 0;
    let cartoonsCount = 0;

    items.forEach((item, index) => {
      const category = this.detectCategory(item);
      
      // Log dos primeiros 10 itens detectados como série
      if ((category === 'series' || category === 'cartoons') && (seriesCount + cartoonsCount) < 10) {
        console.log(`  [${category.toUpperCase()}] "${item.name}" → Grupo: "${item.group}"`);
        if (category === 'series') seriesCount++;
        if (category === 'cartoons') cartoonsCount++;
      }
      
      if (category === 'series' || category === 'cartoons') {
        categorized[category].push(item);
      } else if (category === 'movies') {
        categorized.movies.push(item);
      } else {
        categorized.channels.push(item);
      }
    });

    return categorized;
  }

  static organizeSeries(seriesItems) {
    const organized = {};

    seriesItems.forEach(item => {
      // Tentar extrair nome da série, temporada e episódio
      const name = item.name;
      let seriesName, season, episode;

      // Padrões comuns para séries
      const patterns = [
        /^(.+?)\s+S(\d+)E(\d+)/i,
        /^(.+?)\s+(\d+)x(\d+)/i,
        /^(.+?)\s+Temporada\s+(\d+)\s+Episodio\s+(\d+)/i,
        /^(.+?)\s+T(\d+)E(\d+)/i
      ];

      for (const pattern of patterns) {
        const match = name.match(pattern);
        if (match) {
          seriesName = match[1].trim();
          season = parseInt(match[2]);
          episode = parseInt(match[3]);
          break;
        }
      }

      if (!seriesName) {
        seriesName = name.split(/\s+(S\d+|Temporada|\d+x\d+)/i)[0];
        season = 1;
        episode = 1;
      }

      if (!organized[seriesName]) {
        organized[seriesName] = {};
      }

      if (!organized[seriesName][season]) {
        organized[seriesName][season] = [];
      }

      organized[seriesName][season].push({
        ...item,
        episode: episode,
        seriesName: seriesName,
        season: season
      });
    });

    // Ordenar episódios
    Object.keys(organized).forEach(seriesName => {
      Object.keys(organized[seriesName]).forEach(season => {
        organized[seriesName][season].sort((a, b) => a.episode - b.episode);
      });
    });

    return organized;
  }
}

// Rotas da API

// Upload e parse de arquivo M3U
app.post('/api/upload-m3u', (req, res) => {
  try {
    const { content } = req.body;
    const items = M3UManager.parseM3U(content);
    const categorized = M3UManager.categorizeContent(items);
    
    console.log('\n📊 Categorização:');
    console.log(`- Canais: ${categorized.channels.length}`);
    console.log(`- Filmes: ${categorized.movies.length}`);
    console.log(`- Séries (raw): ${categorized.series.length}`);
    console.log(`- Desenhos (raw): ${categorized.cartoons.length}`);
    
    // Organizar séries
    categorized.series = M3UManager.organizeSeries(categorized.series);
    categorized.cartoons = M3UManager.organizeSeries(categorized.cartoons);
    
    console.log('\n📺 Séries organizadas:');
    Object.keys(categorized.series).forEach(name => {
      const seasons = Object.keys(categorized.series[name]).length;
      const episodes = Object.values(categorized.series[name]).reduce((acc, s) => acc + s.length, 0);
      console.log(`  - ${name}: ${seasons} temporada(s), ${episodes} episódio(s)`);
    });
    
    console.log('\n🎨 Desenhos organizados:');
    Object.keys(categorized.cartoons).forEach(name => {
      const seasons = Object.keys(categorized.cartoons[name]).length;
      const episodes = Object.values(categorized.cartoons[name]).reduce((acc, s) => acc + s.length, 0);
      console.log(`  - ${name}: ${seasons} temporada(s), ${episodes} episódio(s)`);
    });
    
    iptvData = categorized;
    saveData();

    res.json({
      success: true,
      message: 'M3U processado com sucesso',
      data: {
        channels: categorized.channels.length,
        movies: categorized.movies.length,
        series: Object.keys(categorized.series).length,
        cartoons: Object.keys(categorized.cartoons).length
      }
    });
  } catch (error) {
    console.error('Erro ao processar M3U:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao processar M3U',
      error: error.message
    });
  }
});

// Obter todos os dados (com cache)
app.get('/api/data', (req, res) => {
  // Verificar cache
  const now = Date.now();
  if (cacheData && cacheTimestamp && (now - cacheTimestamp < CACHE_DURATION)) {
    return res.json(cacheData);
  }
  
  // Atualizar cache
  cacheData = iptvData;
  cacheTimestamp = now;
  
  res.json(iptvData);
});

// Obter canais (com cache e paginação)
app.get('/api/channels', (req, res) => {
  const limit = parseInt(req.query.limit) || 1000;
  const offset = parseInt(req.query.offset) || 0;
  
  const channels = iptvData.channels.slice(offset, offset + limit);
  res.json(channels);
});

// Obter filmes (com cache e paginação)
app.get('/api/movies', (req, res) => {
  const limit = parseInt(req.query.limit) || 1000;
  const offset = parseInt(req.query.offset) || 0;
  
  const movies = iptvData.movies.slice(offset, offset + limit);
  res.json(movies);
});

// Obter séries
app.get('/api/series', (req, res) => {
  res.json(iptvData.series);
});

// Obter desenhos
app.get('/api/cartoons', (req, res) => {
  res.json(iptvData.cartoons);
});

// Gerar M3U por categoria
app.get('/api/generate-m3u/:category', (req, res) => {
  try {
    const { category } = req.params;
    let items = [];

    switch (category) {
      case 'channels':
        items = iptvData.channels;
        break;
      case 'movies':
        items = iptvData.movies;
        break;
      case 'series':
        items = [];
        Object.keys(iptvData.series).forEach(seriesName => {
          Object.keys(iptvData.series[seriesName]).forEach(season => {
            items.push(...iptvData.series[seriesName][season]);
          });
        });
        break;
      case 'cartoons':
        items = [];
        Object.keys(iptvData.cartoons).forEach(seriesName => {
          Object.keys(iptvData.cartoons[seriesName]).forEach(season => {
            items.push(...iptvData.cartoons[seriesName][season]);
          });
        });
        break;
      default:
        return res.status(400).json({ error: 'Categoria inválida' });
    }

    const m3uContent = M3UManager.generateM3U(items, `IPTV - ${category.toUpperCase()}`);
    
    res.setHeader('Content-Type', 'application/x-mpegurl');
    res.setHeader('Content-Disposition', `attachment; filename="${category}.m3u"`);
    res.send(m3uContent);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Adicionar item manualmente
app.post('/api/add-item', (req, res) => {
  try {
    const { category, item } = req.body;
    
    if (!['channels', 'movies', 'series', 'cartoons'].includes(category)) {
      return res.status(400).json({ error: 'Categoria inválida' });
    }

    iptvData[category].push(item);
    saveData();

    res.json({ success: true, message: 'Item adicionado com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Remover item
app.delete('/api/remove-item/:category/:index', (req, res) => {
  try {
    const { category, index } = req.params;
    
    if (!['channels', 'movies', 'series', 'cartoons'].includes(category)) {
      return res.status(400).json({ error: 'Categoria inválida' });
    }

    iptvData[category].splice(parseInt(index), 1);
    saveData();

    res.json({ success: true, message: 'Item removido com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Acesse: http://localhost:${PORT}`);
});

module.exports = app;