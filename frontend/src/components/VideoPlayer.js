import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize,
  SkipBack,
  SkipForward,
  X
} from 'lucide-react';

const VideoPlayer = ({ url, title, onClose, autoPlay = true }) => {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const controlsTimeoutRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedData = () => {
      setLoading(false);
      setDuration(video.duration);
      if (autoPlay) {
        video.play().catch(err => {
          console.error('Erro ao reproduzir:', err);
          setError('Não foi possível reproduzir automaticamente. Clique em Play.');
        });
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleError = (e) => {
      setLoading(false);
      setError('Erro ao carregar o vídeo. Verifique se a URL é válida.');
    };

    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('error', handleError);
    };
  }, [url, autoPlay]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (isPlaying) {
      video.pause();
    } else {
      video.play().catch(err => {
        console.error('Erro ao reproduzir:', err);
        setError('Erro ao reproduzir o vídeo.');
      });
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    const video = videoRef.current;
    video.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const handleSeek = (e) => {
    const video = videoRef.current;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    video.currentTime = pos * duration;
  };

  const skipTime = (seconds) => {
    const video = videoRef.current;
    video.currentTime = Math.max(0, Math.min(duration, video.currentTime + seconds));
  };

  const toggleFullscreen = () => {
    const container = document.querySelector('.video-player-container');
    
    if (!isFullscreen) {
      if (container.requestFullscreen) {
        container.requestFullscreen();
      } else if (container.webkitRequestFullscreen) {
        container.webkitRequestFullscreen();
      } else if (container.mozRequestFullScreen) {
        container.mozRequestFullScreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  };

  const formatTime = (time) => {
    if (!time || isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleMouseMove = () => {
    setShowControls(true);
    
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div 
      className="video-player-container"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
      onMouseMove={handleMouseMove}
    >
      <div style={{ position: 'relative', width: '100%', height: '100%', maxWidth: '1920px' }}>
        {/* Header */}
        <div 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)',
            zIndex: 20,
            padding: '1rem',
            opacity: showControls ? 1 : 0,
            transition: 'opacity 0.3s'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ color: 'white', fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>{title}</h2>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                padding: '0.5rem'
              }}
            >
              <X size={28} />
            </button>
          </div>
        </div>

        {/* Video Element */}
        <video
          ref={videoRef}
          src={url}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            backgroundColor: 'black'
          }}
          onClick={togglePlay}
        />

        {/* Loading */}
        {loading && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.5)'
          }}>
            <div className="animate-spin" style={{
              width: '4rem',
              height: '4rem',
              border: '4px solid rgba(255, 255, 255, 0.3)',
              borderTopColor: 'white',
              borderRadius: '50%'
            }}></div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            <div style={{ fontSize: '4rem' }}>⚠️</div>
            <div style={{ color: 'white', fontSize: '1.25rem', textAlign: 'center', padding: '0 2rem' }}>{error}</div>
            <button
              onClick={onClose}
              style={{
                backgroundColor: '#ef4444',
                color: 'white',
                padding: '0.75rem 1.5rem',
                borderRadius: '0.5rem',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: 500
              }}
            >
              Fechar
            </button>
          </div>
        )}

        {/* Controls */}
        <div 
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
            zIndex: 20,
            opacity: showControls ? 1 : 0,
            transition: 'opacity 0.3s'
          }}
        >
          {/* Progress Bar */}
          <div style={{ padding: '0 1rem 0.5rem' }}>
            <div 
              onClick={handleSeek}
              style={{
                width: '100%',
                height: '4px',
                backgroundColor: 'rgba(255, 255, 255, 0.3)',
                borderRadius: '2px',
                cursor: 'pointer',
                position: 'relative'
              }}
            >
              <div 
                style={{
                  height: '100%',
                  width: `${progressPercentage}%`,
                  backgroundColor: '#ef4444',
                  borderRadius: '2px',
                  transition: 'width 0.1s'
                }}
              />
            </div>
          </div>

          {/* Control Buttons */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            padding: '0 1rem 1rem' 
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {/* Play/Pause */}
              <button
                onClick={togglePlay}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                  padding: '0.5rem'
                }}
              >
                {isPlaying ? <Pause size={32} /> : <Play size={32} />}
              </button>

              {/* Skip Controls */}
              <button
                onClick={() => skipTime(-10)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                  padding: '0.5rem'
                }}
              >
                <SkipBack size={24} />
              </button>

              <button
                onClick={() => skipTime(10)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                  padding: '0.5rem'
                }}
              >
                <SkipForward size={24} />
              </button>

              {/* Volume */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  onClick={toggleMute}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'white',
                    cursor: 'pointer',
                    padding: '0.5rem'
                  }}
                >
                  {isMuted || volume === 0 ? <VolumeX size={24} /> : <Volume2 size={24} />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={handleVolumeChange}
                  style={{
                    width: '80px',
                    cursor: 'pointer'
                  }}
                />
              </div>

              {/* Time Display */}
              <div style={{ color: 'white', fontSize: '0.875rem', fontWeight: 500 }}>
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {/* Fullscreen */}
              <button
                onClick={toggleFullscreen}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                  padding: '0.5rem'
                }}
              >
                {isFullscreen ? <Minimize size={24} /> : <Maximize size={24} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;