(() => {
  'use strict';

  const player = document.getElementById('music-player');
  const audio = document.getElementById('christmas-audio');
  const toggle = document.getElementById('music-toggle');
  const wave = document.getElementById('music-wave');
  const status = document.getElementById('music-status');
  const settings = window.OKLOGIN_SETTINGS.music;
  const localFile = window.location?.protocol === 'file:';
  const recordedSpectrum = localFile ? window.OKLOGIN_MUSIC_SPECTRUM : null;
  if (!settings.enabled) { player.style.display = 'none'; return; }
  audio.loop = settings.loop;
  audio.preload = settings.autoplay ? 'auto' : 'none';
  if (!settings.visualizer) wave.style.display = 'none';
  const drawing = settings.visualizer ? wave.getContext('2d') : null;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let starting = false, autoplayPending = false, frame = 0;
  let audioContext = null, analyser = null, samples = null;
  let width = 1, height = 1;
  const levels = new Float32Array(48);
  const sustained = new Float32Array(levels.length);
  let spectrumReady = false;
  let spectrumStartedAt = null;
  audio.volume = settings.volume;

  function removeAutoplayFallback() {
    autoplayPending = false;
    document.removeEventListener('click', unlockAutoplay, true);
    document.removeEventListener('keydown', unlockAutoplay, true);
  }

  function connectAnalysis() {
    if (analyser || audioContext.state !== 'running') return;
    let source;
    try {
      const next = audioContext.createAnalyser();
      next.fftSize = 1024;
      next.smoothingTimeConstant = .25;
      source = audioContext.createMediaElementSource(audio);
      source.connect(next);
      next.connect(audioContext.destination);
      analyser = next;
      samples = new Uint8Array(next.frequencyBinCount);
      refreshWave();
    } catch {
      if (source) source.connect(audioContext.destination);
    }
  }

  function prepareAnalysis() {
    if (!settings.visualizer || localFile) return;
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return;
    try {
      if (!audioContext) audioContext = new Context();
      if (audioContext.state === 'running') connectAnalysis();
      else audioContext.resume().then(connectAnalysis).catch(() => {});
    } catch { /* Playback still works without the optional analyser. */ }
  }

  function paintWave() {
    if (!drawing) return;
    drawing.clearRect(0, 0, width, height);
    const playing = !audio.paused && !audio.ended;
    const recordedOffset = playing && recordedSpectrum && audio.readyState >= 2 && audio.currentTime > 0
      ? Math.min(recordedSpectrum.frames - 1, Math.floor(audio.currentTime * recordedSpectrum.fps)) * (recordedSpectrum.columns + 1) : -1;
    const liveAnalysis = playing && analyser && audioContext.state === 'running' && audio.readyState >= 2 && audio.currentTime > 0;
    const liveAudio = liveAnalysis || recordedOffset >= 0;
    if (liveAnalysis) analyser.getByteFrequencyData(samples);
    else if (samples) samples.fill(0);
    const recordedBands = recordedOffset >= 0 ? recordedSpectrum.data.subarray(recordedOffset, recordedOffset + recordedSpectrum.columns) : null;
    const audible = !!liveAudio && (recordedBands || samples).some(value => value > 4);
    if (audible && spectrumStartedAt === null) spectrumStartedAt = audio.currentTime;
    const entrance = spectrumStartedAt === null ? 0 : Math.min(1, Math.max(0, (audio.currentTime - spectrumStartedAt) / .35));
    const binHz = samples ? (audioContext.sampleRate || 44100) / (samples.length * 2) : 1;
    let beat = recordedOffset >= 0 ? recordedSpectrum.data[recordedOffset + recordedSpectrum.columns] / 255 : 0;
    if (liveAnalysis) {
      const start = Math.max(1, Math.floor(60 / binHz));
      const end = Math.min(samples.length, Math.ceil(1800 / binHz));
      for (let bin = start; bin < end; bin++) beat += (samples[bin] / 255) ** 2;
      beat = Math.sqrt(beat / Math.max(1, end - start));
    }
    const spacing = width / levels.length;
    const baseline = Math.max(0, height - 1.5);
    const maxHeight = Math.max(0, height - 3);
    const gradient = drawing.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#ffd1c4');
    gradient.addColorStop(.23, '#ff8b78');
    gradient.addColorStop(.55, '#ef4b49');
    gradient.addColorStop(.8, '#c62c3e');
    gradient.addColorStop(1, '#8b1f32');
    drawing.strokeStyle = gradient;
    drawing.globalAlpha = playing ? 1 : .35;
    drawing.lineWidth = Math.max(.55, Math.min(1.2, spacing * .24));
    drawing.lineCap = 'round';
    drawing.shadowColor = '#f15b597a';
    drawing.shadowBlur = 3;
    for (let index = 0; index < levels.length; index++) {
      let energy = 0;
      if (liveAudio) {
        let local;
        if (recordedBands) local = recordedBands[index] / 255;
        else {
          const highHz = Math.min(7500, binHz * (samples.length - 1));
          const start = Math.max(1, Math.floor(80 * (highHz / 80) ** (index / levels.length) / binHz));
          const end = Math.min(samples.length, Math.max(start + 1, Math.ceil(80 * (highHz / 80) ** ((index + 1) / levels.length) / binHz)));
          for (let bin = start; bin < end; bin++) energy += (samples[bin] / 255) ** 2;
          local = Math.sqrt(energy / Math.max(1, end - start));
        }
        const pulseWeight = .38 + .12 * Math.sin(index * .73) ** 2;
        const trebleGain = 1 + .35 * index / (levels.length - 1);
        energy = Math.min(1, local * .68 * trebleGain + beat * pulseWeight);
      }
      // Remove most of the sustained level so quiet moments can fall near the baseline.
      if (!spectrumReady) sustained[index] = energy;
      const tracking = energy < sustained[index] ? .055 : .02;
      sustained[index] += (energy - sustained[index]) * tracking;
      const contrast = Math.max(0, (energy - sustained[index] * .85) / Math.max(.12, sustained[index] * .58));
      const target = audible && spectrumReady ? Math.min(1, contrast) ** 1.65 * entrance : 0;
      const response = target > levels[index] ? .92 : .6;
      levels[index] = liveAudio ? levels[index] + (target - levels[index]) * response : 0;
      const barHeight = Math.min(maxHeight, Math.max(1, levels[index] * maxHeight));
      const x = (index + .5) * spacing;
      drawing.beginPath();
      drawing.moveTo(x, baseline);
      drawing.lineTo(x, baseline - barHeight);
      drawing.stroke();
    }
    spectrumReady = !!liveAudio && (spectrumReady || audible);
    if (!liveAudio) {
      sustained.fill(0);
      spectrumStartedAt = null;
    }
    drawing.globalAlpha = playing ? .22 : .1;
    drawing.fillStyle = '#ba3446';
    drawing.fillRect(0, baseline, width, 1);
    drawing.globalAlpha = 1;
  }

  function animateWave() {
    frame = 0;
    paintWave();
    if (drawing && !audio.paused && !audio.ended && !document.hidden && !window.popupMotion.active && !motion.matches) frame = requestAnimationFrame(animateWave);
  }

  function refreshWave() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    paintWave();
    if (drawing && !audio.paused && !audio.ended && !document.hidden && !window.popupMotion.active && !motion.matches) frame = requestAnimationFrame(animateWave);
  }

  function resizeWave() {
    const bounds = wave.getBoundingClientRect();
    width = Math.max(1, bounds.width);
    height = Math.max(1, bounds.height);
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    wave.width = Math.round(width * ratio);
    wave.height = Math.round(height * ratio);
    if (drawing) drawing.setTransform(ratio, 0, 0, ratio, 0, 0);
    refreshWave();
  }

  function updatePlayback() {
    const playing = !audio.paused && !audio.ended;
    player.dataset.playing = String(playing);
    toggle.setAttribute('aria-label', playing ? 'Tắt nhạc Jingle Bells' : 'Bật nhạc Jingle Bells');
    toggle.setAttribute('aria-pressed', String(playing));
    toggle.title = playing ? 'Tắt nhạc' : 'Bật nhạc';
    refreshWave();
  }

  async function startMusic(automatic = false) {
    if (starting) return;
    starting = true;
    toggle.disabled = true;
    player.dataset.error = 'false';
    status.textContent = '';
    if (!automatic) prepareAnalysis();
    try {
      audio.volume = settings.volume;
      if (audio.error) audio.load();
      if (audio.ended) audio.currentTime = 0;
      await audio.play();
      removeAutoplayFallback();
      prepareAnalysis();
    } catch (error) {
      if (error.name === 'NotAllowedError') {
        status.textContent = 'Nhấn nút để bật nhạc Jingle Bells.';
        if (automatic) {
          autoplayPending = true;
          document.addEventListener('click', unlockAutoplay, true);
          document.addEventListener('keydown', unlockAutoplay, true);
        }
      } else {
        player.dataset.error = 'true';
        status.textContent = 'Không phát được bài nhạc. Nhấn nút để thử lại.';
      }
    } finally {
      starting = false;
      toggle.disabled = false;
      updatePlayback();
    }
  }

  function unlockAutoplay(event) {
    if (!autoplayPending || toggle.contains(event.target) || event.ctrlKey || event.metaKey || event.altKey) return;
    removeAutoplayFallback();
    startMusic();
  }

  toggle.addEventListener('click', () => {
    removeAutoplayFallback();
    if (starting) return;
    if (!audio.paused && !audio.ended) audio.pause();
    else startMusic();
  });
  ['play', 'pause', 'ended'].forEach(event => audio.addEventListener(event, updatePlayback));
  audio.addEventListener('error', () => {
    player.dataset.error = 'true';
    status.textContent = 'Không tải được bài nhạc. Nhấn nút để thử lại.';
    updatePlayback();
  });
  document.addEventListener('visibilitychange', refreshWave);
  window.popupMotion.subscribe(refreshWave);
  motion.addEventListener('change', refreshWave);
  window.addEventListener('resize', resizeWave, { passive: true });
  new ResizeObserver(resizeWave).observe(wave);
  resizeWave();
  updatePlayback();
  if (settings.autoplay) startMusic(true);
})();
