import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Play, 
  Upload, 
  Download, 
  Tv, 
  Film, 
  Monitor, 
  Baby,
  Search,
  Eye,
  X,
  Volume2,
  VolumeX,
  Maximize,
  Loader
} from 'lucide-react';
import Hls from 'hls.js';

const API_URL = 'http://localhost:3001/api';

// Componente de Player com suporte HLS
const VideoPlayerWithHLS = React.memo(({ url, title, onClose }) => {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (hlsRef.current) {
      hlsRef.current.destroy();
    }

    const isHLS = url.includes('.m3u8');
    
    if (isHLS && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true
      });

      hlsRef.current = hls;
      hls.loadSource(url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setLoading(false);
        video.play().catch(() => {});
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          setError('Erro ao carregar stream');
          setLoading(false);
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url;
      video.addEventListener('loadedmetadata', () => setLoading(false));
      video.play().catch(() => {});
    } else {
      video.src = url;
      video.addEventListener('loadedmetadata', () => setLoading(false));
      video.addEventListener('error', () => {
        setError('Erro ao carregar vídeo');
        setLoading(false);
      });
      video.play().catch(() => {});
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, [url]);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.98)',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '1400px',
        height: '90vh',
        backgroundColor: 'black',
        borderRadius: '12px',
        overflow: 'hidden',
        position: 'relative'
      }}>
        <div style={{
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.9), transparent)',
          padding: '1rem 1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10
        }}>
          <h3 style={{ color: 'white', margin: 0, fontSize: '1.25rem' }}>{title}</h3>
          <button onClick={onClose} style={{
            background: 'rgba(239, 68, 68, 0.9)',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            padding: '0.5rem',
            borderRadius: '0.5rem'
          }}>
            <X size={24} />
          </button>
        </div>

        <video ref={videoRef} controls style={{
          width: '100%',
          height: '100%',
          backgroundColor: 'black'
        }} />

        {loading && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.8)'
          }}>
            <Loader size={48} style={{ animation: 'spin 1s linear infinite', color: '#3b82f6' }} />
            <div style={{ color: 'white', marginTop: '1rem' }}>Carregando...</div>
          </div>
        )}

        {error && (
          <div style={{
            position: 'absolute',
            top: '5rem',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(239, 68, 68, 0.95)',
            color: 'white',
            padding: '1rem',
            borderRadius: '0.5rem'
          }}>
            {error}
          </div>
        )}
      </div>

      <button onClick={onClose} style={{
        marginTop: '1rem',
        backgroundColor: '#ef4444',
        color: 'white',
        padding: '0.75rem 2rem',
        borderRadius: '0.5rem',
        border: 'none',
        cursor: 'pointer',
        fontWeight: 600
      }}>
        Fechar Player
      </button>
    </div>
  );
});

const IPTVManager = () => {
  const [activeTab, setActiveTab] = useState('channels');
  const [data, setData] = useState({
    channels: [],
    movies: [],
    series: {},
    cartoons: {}
  });
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedSeries, setSelectedSeries] = useState(null);
  const [selectedSeason, setSelectedSeason] = useState(null);
  const [playerData, setPlayerData] = useState(null);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteContent, setPasteContent] = useState('');
  const [visibleItems, setVisibleItems] = useState(50); // Carregar só 50 itens inicialmente

  // Debounce para busca
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Resetar items visíveis ao trocar de aba
  useEffect(() => {
    setVisibleItems(50);
  }, [activeTab]);

  // Infinite scroll - carregar mais itens ao rolar
  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 500) {
        setVisibleItems(prev => prev + 50);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/data`);
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setLoading(true);
      const content = await file.text();
      
      const response = await fetch(`${API_URL}/upload-m3u`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });

      const result = await response.json();
      if (result.success) {
        await loadData();
        alert('Arquivo carregado com sucesso!');
      }
    } catch (error) {
      alert('Erro ao processar arquivo');
    } finally {
      setLoading(false);
      event.target.value = '';
    }
  };

  const handlePasteUpload = async () => {
    if (!pasteContent.trim()) {
      alert('Cole o conteúdo M3U primeiro!');
      return;
    }

    try {
      setLoading(true);
      setShowPasteModal(false);
      
      const response = await fetch(`${API_URL}/upload-m3u`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: pasteContent })
      });

      const result = await response.json();
      if (result.success) {
        await loadData();
        alert('✅ Lista M3U carregada com sucesso!');
        setPasteContent('');
      } else {
        alert('❌ Erro: ' + result.message);
      }
    } catch (error) {
      alert('❌ Erro ao processar lista M3U');
    } finally {
      setLoading(false);
    }
  };

  const downloadM3U = async (category) => {
    try {
      const response = await fetch(`${API_URL}/generate-m3u/${category}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${category}.m3u`;
      a.click();
    } catch (error) {
      alert('Erro ao gerar M3U');
    }
  };

  const playContent = (url, name) => {
    setPlayerData({ url, title: name });
  };

  const filterContent = (items) => {
    if (!searchTerm) return items;
    if (Array.isArray(items)) {
      return items.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    const filtered = {};
    Object.keys(items).forEach(key => {
      if (key.toLowerCase().includes(searchTerm.toLowerCase())) {
        filtered[key] = items[key];
      }
    });
    return filtered;
  };

  const renderChannels = () => {
    const channels = filterContent(data.channels);
    
    if (channels.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500">
          <Tv size={48} className="mx-auto mb-4 opacity-50" />
          <p>Nenhum canal encontrado</p>
        </div>
      );
    }
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {channels.map((channel, index) => (
          <div key={index} className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow">
            <div className="flex items-center space-x-3">
              {channel.logo && (
                <img 
                  src={channel.logo} 
                  alt={channel.name} 
                  className="w-14 h-14 rounded-lg object-cover flex-shrink-0" 
                  loading="lazy" 
                  onError={(e) => e.target.style.display = 'none'} 
                />
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg truncate" title={channel.name}>
                  {channel.name}
                </h3>
                <p className="text-sm text-gray-600 truncate">{channel.group}</p>
              </div>
              <button 
                onClick={() => playContent(channel.url, channel.name)} 
                className="bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-lg transition-colors flex-shrink-0"
                title="Assistir"
              >
                <Play size={20} />
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderMovies = () => {
    const movies = filterContent(data.movies);
    
    if (movies.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500">
          <Film size={48} className="mx-auto mb-4 opacity-50" />
          <p>Nenhum filme encontrado</p>
        </div>
      );
    }
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {movies.map((movie, index) => (
          <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow group">
            {movie.logo && (
              <div className="relative overflow-hidden" style={{ paddingTop: '150%' }}>
                <img 
                  src={movie.logo} 
                  alt={movie.name} 
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                  loading="lazy" 
                  onError={(e) => e.target.style.display = 'none'} 
                />
              </div>
            )}
            <div className="p-4">
              <h3 className="font-semibold text-lg mb-2 line-clamp-2" title={movie.name}>
                {movie.name}
              </h3>
              {movie.group && (
                <p className="text-sm text-gray-500 mb-3 line-clamp-1">{movie.group}</p>
              )}
              <button 
                onClick={() => playContent(movie.url, movie.name)} 
                className="w-full bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
              >
                <Play size={16} />
                <span>Assistir</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderSeries = (seriesData) => {
    const series = filterContent(seriesData);
    
    if (selectedSeries && series[selectedSeries]) {
      const seasons = series[selectedSeries];
      
      if (selectedSeason && seasons[selectedSeason]) {
        const episodes = seasons[selectedSeason];
        
        return (
          <div>
            <div className="mb-6">
              <button
                onClick={() => setSelectedSeason(null)}
                className="text-blue-500 hover:text-blue-600 mb-2 font-medium"
              >
                ← Voltar para temporadas
              </button>
              <h2 className="text-2xl font-bold text-gray-900">{selectedSeries} - Temporada {selectedSeason}</h2>
              <p className="text-gray-600 mt-1">{episodes.length} episódios</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {episodes.map((episode, index) => (
                <div key={index} className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow">
                  <div className="mb-3">
                    <div className="text-sm text-blue-600 font-semibold mb-1">Episódio {episode.episode}</div>
                    <h3 className="font-semibold text-lg line-clamp-2">{episode.name}</h3>
                    {episode.group && (
                      <p className="text-sm text-gray-500 mt-1">{episode.group}</p>
                    )}
                  </div>
                  <button
                    onClick={() => playContent(episode.url, episode.name)}
                    className="w-full bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
                  >
                    <Play size={16} />
                    <span>Assistir</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      }
      
      return (
        <div>
          <div className="mb-6">
            <button
              onClick={() => setSelectedSeries(null)}
              className="text-blue-500 hover:text-blue-600 mb-2 font-medium"
            >
              ← Voltar para séries
            </button>
            <h2 className="text-2xl font-bold text-gray-900">{selectedSeries}</h2>
            <p className="text-gray-600 mt-1">{Object.keys(seasons).length} temporadas disponíveis</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Object.keys(seasons).sort((a, b) => parseInt(a) - parseInt(b)).map((season) => (
              <div
                key={season}
                onClick={() => setSelectedSeason(season)}
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer text-center group"
              >
                <div className="text-4xl font-bold text-blue-500 group-hover:text-blue-600 transition-colors mb-2">
                  T{season}
                </div>
                <div className="text-sm text-gray-600">
                  {seasons[season].length} {seasons[season].length === 1 ? 'episódio' : 'episódios'}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.keys(series).sort().map((seriesName) => {
          const seasons = series[seriesName];
          const totalSeasons = Object.keys(seasons).length;
          const totalEpisodes = Object.values(seasons).reduce((acc, season) => acc + season.length, 0);
          
          return (
            <div
              key={seriesName}
              onClick={() => setSelectedSeries(seriesName)}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer group"
            >
              <h3 className="font-semibold text-xl mb-3 group-hover:text-blue-600 transition-colors line-clamp-2">
                {seriesName}
              </h3>
              <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                <div className="flex items-center space-x-4">
                  <div>
                    <span className="font-semibold text-gray-900">{totalSeasons}</span> {totalSeasons === 1 ? 'temporada' : 'temporadas'}
                  </div>
                  <div>
                    <span className="font-semibold text-gray-900">{totalEpisodes}</span> {totalEpisodes === 1 ? 'episódio' : 'episódios'}
                  </div>
                </div>
              </div>
              <div className="flex items-center text-blue-500 font-medium">
                <Eye size={16} className="mr-2" />
                <span>Ver temporadas</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const tabs = [
    { id: 'channels', label: 'Canais ao Vivo', icon: Tv },
    { id: 'movies', label: 'Filmes', icon: Film },
    { id: 'series', label: 'Séries', icon: Monitor },
    { id: 'cartoons', label: 'Desenhos', icon: Baby }
  ];

  const stats = {
    channels: data.channels?.length || 0,
    movies: data.movies?.length || 0,
    series: Object.keys(data.series || {}).length,
    cartoons: Object.keys(data.cartoons || {}).length
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {playerData && (
        <VideoPlayerWithHLS url={playerData.url} title={playerData.title} onClose={() => setPlayerData(null)} />
      )}

      {/* Modal para Colar M3U */}
      {showPasteModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 9998,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            maxWidth: '800px',
            width: '100%',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            {/* Header Modal */}
            <div style={{
              padding: '1.5rem',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>
                📋 Colar Lista M3U
              </h3>
              <button
                onClick={() => {
                  setShowPasteModal(false);
                  setPasteContent('');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.5rem'
                }}
              >
                <X size={24} />
              </button>
            </div>

            {/* Body Modal */}
            <div style={{ padding: '1.5rem', flex: 1, overflow: 'auto' }}>
              <p style={{ marginBottom: '1rem', color: '#6b7280' }}>
                Cole o conteúdo completo do seu arquivo M3U/M3U8 abaixo:
              </p>
              <textarea
                value={pasteContent}
                onChange={(e) => setPasteContent(e.target.value)}
                placeholder="#EXTM3U&#10;#EXTINF:-1,Canal 1&#10;http://exemplo.com/stream.m3u8&#10;#EXTINF:-1,Canal 2&#10;http://exemplo.com/stream2.m3u8"
                style={{
                  width: '100%',
                  height: '400px',
                  padding: '1rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontFamily: 'monospace',
                  resize: 'vertical'
                }}
              />
              <div style={{
                marginTop: '1rem',
                padding: '0.75rem',
                backgroundColor: '#eff6ff',
                borderRadius: '8px',
                fontSize: '0.875rem',
                color: '#1e40af'
              }}>
                💡 <strong>Dica:</strong> Abra seu arquivo .m3u no bloco de notas, selecione tudo (Ctrl+A), copie (Ctrl+C) e cole aqui (Ctrl+V)
              </div>
            </div>

            {/* Footer Modal */}
            <div style={{
              padding: '1.5rem',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem'
            }}>
              <button
                onClick={() => {
                  setShowPasteModal(false);
                  setPasteContent('');
                }}
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handlePasteUpload}
                disabled={!pasteContent.trim()}
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: pasteContent.trim() ? '#3b82f6' : '#9ca3af',
                  color: 'white',
                  cursor: pasteContent.trim() ? 'pointer' : 'not-allowed',
                  fontWeight: 600
                }}
              >
                ✅ Carregar Lista
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Tv className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold">IPTV Manager</h1>
            </div>
            <div className="flex items-center space-x-4">
              <label className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg cursor-pointer transition-colors flex items-center space-x-2">
                <Upload size={16} />
                <span>Upload Arquivo</span>
                <input type="file" accept=".m3u,.m3u8" onChange={handleFileUpload} className="hidden" />
              </label>
              
              <button
                onClick={() => setShowPasteModal(true)}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                </svg>
                <span>Colar M3U</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <div key={tab.id} className="bg-white rounded-lg shadow-md p-6">
                <Icon className="h-8 w-8 text-blue-500 mb-2" />
                <div className="text-2xl font-bold">{stats[tab.id]}</div>
                <div className="text-sm text-gray-600">{tab.label}</div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-2 bg-gray-200 p-1 rounded-lg mb-8">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSelectedSeries(null);
                  setSelectedSeason(null);
                }}
                className={`flex-1 min-w-[120px] flex items-center justify-center space-x-2 py-3 px-4 rounded-md font-medium transition-all ${
                  activeTab === tab.id 
                    ? 'bg-white shadow text-blue-600' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon size={20} />
                <span>{tab.label}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                  activeTab === tab.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-300 text-gray-700'
                }`}>
                  {stats[tab.id]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="min-h-96">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <>
              {activeTab === 'channels' && renderChannels()}
              {activeTab === 'movies' && renderMovies()}
              {activeTab === 'series' && renderSeries(data.series)}
              {activeTab === 'cartoons' && renderSeries(data.cartoons)}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default IPTVManager;