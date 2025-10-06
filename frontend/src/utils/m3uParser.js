// Utilitários para processar arquivos M3U
class M3UParser {
  /**
   * Parse um arquivo M3U e retorna array de itens estruturados
   * @param {string} content - Conteúdo do arquivo M3U
   * @returns {Array} Array de objetos com informações dos canais/conteúdo
   */
  static parse(content) {
    const lines = content.split('\n').filter(line => line.trim());
    const items = [];
    let currentItem = {};

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.startsWith('#EXTINF:')) {
        currentItem = this.parseEXTINF(line);
      } else if (line.startsWith('http') && currentItem.name) {
        currentItem.url = line;
        currentItem.id = this.generateId(currentItem);
        items.push({ ...currentItem });
        currentItem = {};
      }
    }

    return items;
  }

  /**
   * Parse linha EXTINF e extrai informações
   * @param {string} line - Linha EXTINF
   * @returns {Object} Objeto com informações extraídas
   */
  static parseEXTINF(line) {
    const item = {
      duration: -1,
      tvgId: '',
      tvgName: '',
      logo: '',
      group: 'Outros',
      name: '',
      url: '',
      attributes: {}
    };

    // Extrair duração
    const durationMatch = line.match(/#EXTINF:(-?\d+(?:\.\d+)?)/);
    if (durationMatch) {
      item.duration = parseFloat(durationMatch[1]);
    }

    // Extrair atributos TVG
    const tvgIdMatch = line.match(/tvg-id="([^"]*)"/);
    if (tvgIdMatch) item.tvgId = tvgIdMatch[1];

    const tvgNameMatch = line.match(/tvg-name="([^"]*)"/);
    if (tvgNameMatch) item.tvgName = tvgNameMatch[1];

    const tvgLogoMatch = line.match(/tvg-logo="([^"]*)"/);
    if (tvgLogoMatch) item.logo = tvgLogoMatch[1];

    const groupMatch = line.match(/group-title="([^"]*)"/);
    if (groupMatch) item.group = groupMatch[1];

    // Extrair outros atributos personalizados
    const customAttributes = line.match(/(\w+)="([^"]*)"/g);
    if (customAttributes) {
      customAttributes.forEach(attr => {
        const [key, value] = attr.split('=');
        const cleanKey = key.trim();
        const cleanValue = value.replace(/"/g, '');
        
        if (!['tvg-id', 'tvg-name', 'tvg-logo', 'group-title'].includes(cleanKey)) {
          item.attributes[cleanKey] = cleanValue;
        }
      });
    }

    // Extrair nome (última parte após a vírgula)
    const nameMatch = line.match(/,(.+)$/);
    if (nameMatch) {
      item.name = nameMatch[1].trim();
    }

    return item;
  }

  /**
   * Categoriza conteúdo automaticamente
   * @param {Array} items - Array de itens
   * @returns {Object} Objeto com categorias organizadas
   */
  static categorize(items) {
    const categories = {
      channels: [],
      movies: [],
      series: [],
      cartoons: [],
      sports: [],
      news: [],
      music: [],
      documentaries: [],
      adult: [],
      others: []
    };

    items.forEach(item => {
      const category = this.detectCategory(item);
      if (categories[category]) {
        categories[category].push(item);
      } else {
        categories.others.push(item);
      }
    });

    return categories;
  }

  /**
   * Detecta categoria do conteúdo baseado em nome e grupo
   * @param {Object} item - Item a ser categorizado
   * @returns {string} Categoria detectada
   */
  static detectCategory(item) {
    const name = item.name.toLowerCase();
    const group = item.group.toLowerCase();
    const combined = `${name} ${group}`;

    // Padrões para diferentes categorias
    const patterns = {
      movies: [
        /\bfilme\b/, /\bmovie\b/, /\bcinema\b/, /\b(19|20)\d{2}\b/,
        /\bhd\b/, /\bfullhd\b/, /\b4k\b/, /\bblueray\b/, /\bdvdrip\b/
      ],
      series: [
        /\bserie\b/, /\bseries\b/, /\bs\d+e\d+\b/, /\btemporada\b/,
        /\bepisodio\b/, /\bepisode\b/, /\b\d+x\d+\b/, /\bt\d+e\d+\b/
      ],
      cartoons: [
        /\bdesenho\b/, /\bcartoon\b/, /\binfantil\b/, /\bkids\b/,
        /\banimacao\b/, /\banimation\b/, /\bdisney\b/, /\bpixar\b/
      ],
      sports: [
        /\besporte\b/, /\bsport\b/, /\bfutebol\b/, /\bfootball\b/,
        /\bbasket\b/, /\bvolei\b/, /\bf1\b/, /\bmma\b/, /\bufc\b/
      ],
      news: [
        /\bnews\b/, /\bnoticia\b/, /\bjornal\b/, /\binformativo\b/,
        /\breporter\b/, /\bglobo\b/, /\bsbt\b/, /\brecord\b/, /\bband\b/
      ],
      music: [
        /\bmusic\b/, /\bmusica\b/, /\bclip\b/, /\bmtv\b/,
        /\bradio\b/, /\bhits\b/, /\brock\b/, /\bpop\b/, /\bsertanejo\b/
      ],
      documentaries: [
        /\bdocumentario\b/, /\bdocumentary\b/, /\bnational\s*geographic\b/,
        /\bdiscovery\b/, /\bhistory\b/, /\banimal\b/, /\bnature\b/
      ],
      adult: [
        /\badult\b/, /\bxxx\b/, /\bsexy\b/, /\b18\+\b/, /\bplayboy\b/
      ]
    };

    // Verificar padrões
    for (const [category, categoryPatterns] of Object.entries(patterns)) {
      if (categoryPatterns.some(pattern => pattern.test(combined))) {
        return category;
      }
    }

    // Se não encontrou categoria específica, considerar como canal
    return 'channels';
  }

  /**
   * Organiza séries por temporadas e episódios
   * @param {Array} seriesItems - Array de itens de série
   * @returns {Object} Séries organizadas por nome, temporada e episódio
   */
  static organizeSeries(seriesItems) {
    const organized = {};

    seriesItems.forEach(item => {
      const seriesInfo = this.parseSeriesInfo(item);
      const { seriesName, season, episode } = seriesInfo;

      if (!organized[seriesName]) {
        organized[seriesName] = {};
      }

      if (!organized[seriesName][season]) {
        organized[seriesName][season] = [];
      }

      organized[seriesName][season].push({
        ...item,
        seriesName,
        season,
        episode,
        sortOrder: episode
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

  /**
   * Extrai informações de série (nome, temporada, episódio)
   * @param {Object} item - Item da série
   * @returns {Object} Informações extraídas
   */
  static parseSeriesInfo(item) {
    const name = item.name;
    let seriesName = name;
    let season = 1;
    let episode = 1;

    // Padrões para extrair informações de séries
    const patterns = [
      // Formato: Nome S01E01
      {
        regex: /^(.+?)\s+S(\d+)E(\d+)/i,
        seriesIndex: 1,
        seasonIndex: 2,
        episodeIndex: 3
      },
      // Formato: Nome 1x01
      {
        regex: /^(.+?)\s+(\d+)x(\d+)/i,
        seriesIndex: 1,
        seasonIndex: 2,
        episodeIndex: 3
      },
      // Formato: Nome Temporada 1 Episódio 01
      {
        regex: /^(.+?)\s+Temporada\s+(\d+)\s+Episodio\s+(\d+)/i,
        seriesIndex: 1,
        seasonIndex: 2,
        episodeIndex: 3
      },
      // Formato: Nome T01E01
      {
        regex: /^(.+?)\s+T(\d+)E(\d+)/i,
        seriesIndex: 1,
        seasonIndex: 2,
        episodeIndex: 3
      },
      // Formato: Nome - S01E01
      {
        regex: /^(.+?)\s*-\s*S(\d+)E(\d+)/i,
        seriesIndex: 1,
        seasonIndex: 2,
        episodeIndex: 3
      }
    ];

    for (const pattern of patterns) {
      const match = name.match(pattern.regex);
      if (match) {
        seriesName = match[pattern.seriesIndex].trim();
        season = parseInt(match[pattern.seasonIndex]);
        episode = parseInt(match[pattern.episodeIndex]);
        break;
      }
    }

    // Se não encontrou padrão, tentar extrair o nome antes de indicadores de temporada
    if (seriesName === name) {
      const cleanMatch = name.match(/^(.+?)\s+(S\d+|Temporada|\d+x\d+)/i);
      if (cleanMatch) {
        seriesName = cleanMatch[1].trim();
      }
    }

    return { seriesName, season, episode };
  }

  /**
   * Gera arquivo M3U a partir de array de itens
   * @param {Array} items - Array de itens
   * @param {string} title - Título da playlist
   * @returns {string} Conteúdo do arquivo M3U
   */
  static generate(items, title = 'IPTV Playlist') {
    let m3u = '#EXTM3U\n';
    
    items.forEach(item => {
      m3u += this.generateEXTINF(item);
      m3u += item.url + '\n';
    });

    return m3u;
  }

  /**
   * Gera linha EXTINF para um item
   * @param {Object} item - Item a ser convertido
   * @returns {string} Linha EXTINF formatada
   */
  static generateEXTINF(item) {
    let extinf = `#EXTINF:${item.duration || -1}`;
    
    if (item.tvgId) extinf += ` tvg-id="${item.tvgId}"`;
    if (item.tvgName) extinf += ` tvg-name="${item.tvgName}"`;
    if (item.logo) extinf += ` tvg-logo="${item.logo}"`;
    if (item.group) extinf += ` group-title="${item.group}"`;
    
    // Adicionar atributos personalizados
    if (item.attributes) {
      Object.keys(item.attributes).forEach(key => {
        extinf += ` ${key}="${item.attributes[key]}"`;
      });
    }
    
    extinf += `,${item.name}\n`;
    
    return extinf;
  }

  /**
   * Gera ID único para um item
   * @param {Object} item - Item
   * @returns {string} ID único
   */
  static generateId(item) {
    const str = `${item.name}-${item.url}-${item.group}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Filtra itens por termo de busca
   * @param {Array} items - Array de itens
   * @param {string} searchTerm - Termo de busca
   * @returns {Array} Itens filtrados
   */
  static search(items, searchTerm) {
    if (!searchTerm) return items;
    
    const term = searchTerm.toLowerCase();
    
    return items.filter(item => 
      item.name.toLowerCase().includes(term) ||
      item.group.toLowerCase().includes(term) ||
      (item.tvgName && item.tvgName.toLowerCase().includes(term))
    );
  }

  /**
   * Ordena itens por critério
   * @param {Array} items - Array de itens
   * @param {string} sortBy - Critério de ordenação (name, group, date)
   * @param {string} order - Ordem (asc, desc)
   * @returns {Array} Itens ordenados
   */
  static sort(items, sortBy = 'name', order = 'asc') {
    const sorted = [...items].sort((a, b) => {
      let compareA, compareB;
      
      switch (sortBy) {
        case 'name':
          compareA = a.name.toLowerCase();
          compareB = b.name.toLowerCase();
          break;
        case 'group':
          compareA = a.group.toLowerCase();
          compareB = b.group.toLowerCase();
          break;
        default:
          compareA = a.name.toLowerCase();
          compareB = b.name.toLowerCase();
      }
      
      if (compareA < compareB) return order === 'asc' ? -1 : 1;
      if (compareA > compareB) return order === 'asc' ? 1 : -1;
      return 0;
    });
    
    return sorted;
  }

  /**
   * Valida URL de stream
   * @param {string} url - URL a ser validada
   * @returns {boolean} True se válida
   */
  static isValidUrl(url) {
    try {
      const urlObj = new URL(url);
      return ['http:', 'https:', 'rtmp:', 'rtsp:'].includes(urlObj.protocol);
    } catch {
      return false;
    }
  }

  /**
   * Extrai metadata de URL quando possível
   * @param {string} url - URL do stream
   * @returns {Object} Metadata extraída
   */
  static extractUrlMetadata(url) {
    const metadata = {
      protocol: '',
      extension: '',
      quality: '',
      bitrate: ''
    };

    try {
      const urlObj = new URL(url);
      metadata.protocol = urlObj.protocol.replace(':', '');
      
      // Extrair extensão
      const path = urlObj.pathname;
      const extMatch = path.match(/\.(\w+)$/);
      if (extMatch) metadata.extension = extMatch[1];
      
      // Tentar detectar qualidade na URL
      const qualityMatch = url.match(/(720p|1080p|4k|hd|fullhd|sd)/i);
      if (qualityMatch) metadata.quality = qualityMatch[1];
      
      // Tentar detectar bitrate
      const bitrateMatch = url.match(/(\d+)k/i);
      if (bitrateMatch) metadata.bitrate = bitrateMatch[1] + 'k';
      
    } catch (error) {
      console.error('Erro ao extrair metadata da URL:', error);
    }

    return metadata;
  }

  /**
   * Agrupa itens por categoria
   * @param {Array} items - Array de itens
   * @param {string} groupBy - Campo para agrupar (group, category)
   * @returns {Object} Itens agrupados
   */
  static groupBy(items, groupBy = 'group') {
    const grouped = {};
    
    items.forEach(item => {
      const key = item[groupBy] || 'Outros';
      
      if (!grouped[key]) {
        grouped[key] = [];
      }
      
      grouped[key].push(item);
    });
    
    return grouped;
  }

  /**
   * Remove duplicatas baseado em URL
   * @param {Array} items - Array de itens
   * @returns {Array} Itens sem duplicatas
   */
  static removeDuplicates(items) {
    const seen = new Set();
    return items.filter(item => {
      if (seen.has(item.url)) {
        return false;
      }
      seen.add(item.url);
      return true;
    });
  }

  /**
   * Mescla múltiplas playlists
   * @param {Array} playlists - Array de conteúdos M3U
   * @returns {Array} Itens mesclados
   */
  static mergePlaylists(playlists) {
    const allItems = [];
    
    playlists.forEach(playlist => {
      const items = this.parse(playlist);
      allItems.push(...items);
    });
    
    return this.removeDuplicates(allItems);
  }

  /**
   * Estatísticas da playlist
   * @param {Array} items - Array de itens
   * @returns {Object} Estatísticas
   */
  static getStats(items) {
    const stats = {
      total: items.length,
      categories: {},
      groups: {},
      withLogo: 0,
      withoutLogo: 0,
      protocols: {}
    };

    items.forEach(item => {
      // Contar por grupo
      stats.groups[item.group] = (stats.groups[item.group] || 0) + 1;
      
      // Contar logos
      if (item.logo) {
        stats.withLogo++;
      } else {
        stats.withoutLogo++;
      }
      
      // Contar protocolos
      try {
        const protocol = new URL(item.url).protocol.replace(':', '');
        stats.protocols[protocol] = (stats.protocols[protocol] || 0) + 1;
      } catch {
        stats.protocols.unknown = (stats.protocols.unknown || 0) + 1;
      }
    });

    return stats;
  }
}

// Exportar para uso no Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = M3UParser;
}

// Exportar para uso no browser
if (typeof window !== 'undefined') {
  window.M3UParser = M3UParser;
}