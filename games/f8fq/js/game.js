(function bootstrapF8FQ(global) {
  'use strict';

  var FIXED_STEP = 1 / 120;
  var MAX_FRAME_SECONDS = 0.05;
  var BEST_KEY = 'f8fq.best';
  var SETTINGS_KEY = 'f8fq.settings';

  function safeReadNumber(key) {
    try {
      var value = Number(global.localStorage.getItem(key));
      return Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
    } catch (error) {
      return 0;
    }
  }

  function safeWriteNumber(key, value) {
    try {
      global.localStorage.setItem(key, String(Math.max(0, Math.floor(value))));
    } catch (error) {
      // Best score remains available in memory when storage is blocked.
    }
  }

  function safeReadSettings(fallback) {
    try {
      var parsed = JSON.parse(global.localStorage.getItem(SETTINGS_KEY) || '{}');
      return {
        theme: ['ruins', 'newsprint', 'night'].includes(parsed.theme) ? parsed.theme : fallback.theme,
        difficulty: ['calm', 'standard', 'fast'].includes(parsed.difficulty) ? parsed.difficulty : fallback.difficulty,
        grain: typeof parsed.grain === 'boolean' ? parsed.grain : fallback.grain,
        lowMotion: typeof parsed.lowMotion === 'boolean' ? parsed.lowMotion : fallback.lowMotion
      };
    } catch (error) {
      return fallback;
    }
  }

  function safeWriteSettings(settings) {
    try {
      global.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      // Settings remain active for this page session.
    }
  }

  function padScore(value) {
    return String(Math.max(0, Math.floor(value))).padStart(2, '0');
  }

  function initialize() {
    var engineApi = global.F8FQEngine;
    var visualsApi = global.F8FQVisuals;
    var audioApi = global.F8FQAudio;
    var errorOverlay = document.querySelector('#errorOverlay');

    if (!engineApi || !visualsApi || !audioApi || !global.ResizeObserver) {
      errorOverlay.hidden = false;
      return;
    }

    var gameShell = document.querySelector('#gameShell');
    var playfield = document.querySelector('#playfield');
    var canvas = document.querySelector('#gameCanvas');
    var scoreValue = document.querySelector('#scoreValue');
    var centCount = document.querySelector('#centCount');
    var centDots = Array.from(document.querySelectorAll('#centDots i'));
    var readyOverlay = document.querySelector('#readyOverlay');
    var pauseOverlay = document.querySelector('#pauseOverlay');
    var gameoverOverlay = document.querySelector('#gameoverOverlay');
    var finalScore = document.querySelector('#finalScore');
    var bestScore = document.querySelector('#bestScore');
    var liveStatus = document.querySelector('#liveStatus');
    var comboBanner = document.querySelector('#comboBanner');
    var startButton = document.querySelector('#startButton');
    var pauseButton = document.querySelector('#pauseButton');
    var resumeButton = document.querySelector('#resumeButton');
    var restartButton = document.querySelector('#restartButton');
    var muteButton = document.querySelector('#muteButton');
    var volumeIcon = muteButton.querySelector('.icon-volume');
    var volumeXIcon = muteButton.querySelector('.icon-volume-x');
    var tweaksButton = document.querySelector('#tweaksButton');
    var tweaksPanel = document.querySelector('#tweaksPanel');
    var closeTweaksButton = document.querySelector('#closeTweaksButton');
    var themeInputs = Array.from(document.querySelectorAll('input[name="theme"]'));
    var difficultyInputs = Array.from(document.querySelectorAll('input[name="difficulty"]'));
    var grainToggle = document.querySelector('#grainToggle');
    var motionToggle = document.querySelector('#motionToggle');
    var mediaReducedMotion = global.matchMedia('(prefers-reduced-motion: reduce)');

    var settings = safeReadSettings({
      theme: 'ruins',
      difficulty: 'standard',
      grain: true,
      lowMotion: mediaReducedMotion.matches
    });
    var best = safeReadNumber(BEST_KEY);
    var seed = 0x8f3c2a1d;
    var engine = new engineApi.GameEngine({
      seed: seed,
      best: best,
      difficulty: settings.difficulty
    });
    var renderer = visualsApi.create(canvas);
    var audio = audioApi.create();
    var accumulator = 0;
    var lastFrameTime = global.performance.now();
    var frameRequest = 0;
    var destroyed = false;
    var hasSized = false;
    var pausedForTweaks = false;
    var isTweaksOpen = false;

    function announce(message) {
      liveStatus.textContent = '';
      global.requestAnimationFrame(function setAnnouncement() {
        liveStatus.textContent = message;
      });
    }

    function applySettings() {
      gameShell.dataset.theme = settings.theme;
      renderer.setTheme(settings.theme);
      renderer.setGrain(settings.grain);
      renderer.setReducedMotion(settings.lowMotion);
      engine.setDifficulty(settings.difficulty);
      grainToggle.checked = settings.grain;
      motionToggle.checked = settings.lowMotion;
      themeInputs.forEach(function syncTheme(input) {
        input.checked = input.value === settings.theme;
      });
      difficultyInputs.forEach(function syncDifficulty(input) {
        input.checked = input.value === settings.difficulty;
      });
      safeWriteSettings(settings);
    }

    function updateMuteButton() {
      var muted = audio.isMuted();
      muteButton.setAttribute('aria-pressed', String(muted));
      muteButton.setAttribute('aria-label', muted ? '开启声音' : '静音');
      muteButton.dataset.tooltip = muted ? '开启声音' : '静音';
      volumeIcon.hidden = muted;
      volumeXIcon.hidden = !muted;
    }

    function updateUi(snapshot) {
      scoreValue.textContent = padScore(snapshot.score);
      centCount.textContent = String(snapshot.cents);
      centDots.forEach(function updateDot(dot, index) {
        dot.classList.toggle('is-filled', index < snapshot.cents);
      });

      var isReady = snapshot.state === 'ready';
      var isPaused = snapshot.state === 'paused';
      var isGameover = snapshot.state === 'gameover';
      readyOverlay.hidden = !isReady;
      pauseOverlay.hidden = !isPaused || isTweaksOpen;
      gameoverOverlay.hidden = !isGameover;
      pauseButton.disabled = isReady || isGameover;
      pauseButton.setAttribute('aria-label', isPaused ? '继续' : '暂停');
      pauseButton.dataset.tooltip = isPaused ? '继续' : '暂停';

      if (isGameover) {
        finalScore.textContent = padScore(snapshot.score);
        bestScore.textContent = padScore(snapshot.best);
      }
    }

    function showCombo() {
      comboBanner.classList.remove('is-visible');
      void comboBanner.offsetWidth;
      comboBanner.classList.add('is-visible');
    }

    function processEvents(events) {
      if (!events.length) return;
      renderer.handleEvents(events);
      events.forEach(function processEvent(event) {
        if (!(event.type === 'score' && event.reason === 'combo')) {
          audio.handle(event.type);
        }
        if (event.type === 'start') {
          announce('游戏开始');
        } else if (event.type === 'combo') {
          showCombo();
          announce('凑满八分钱，奖励八分');
        } else if (event.type === 'crash') {
          best = Math.max(best, event.best || event.score || 0);
          engine.setBest(best);
          safeWriteNumber(BEST_KEY, best);
          announce('游戏结束，本局 ' + event.score + ' 分，纪录 ' + best + ' 分');
          global.requestAnimationFrame(function focusRestart() {
            restartButton.focus({ preventScroll: true });
          });
        } else if (event.type === 'pause' && !isTweaksOpen) {
          announce('游戏暂停');
        } else if (event.type === 'resume') {
          announce('继续游戏');
        }
      });
    }

    function drainEvents() {
      var events = engine.consumeEvents();
      processEvents(events);
      return events;
    }

    function unlockAudio() {
      var result = audio.unlock();
      if (result && typeof result.catch === 'function') {
        result.catch(function ignoreUnlockFailure() {});
      }
    }

    function startRun() {
      unlockAudio();
      if (engine.getSnapshot().state === 'ready') {
        engine.start();
        engine.flap();
        drainEvents();
      }
    }

    function restartRun() {
      unlockAudio();
      seed = (seed + 0x9e3779b9) >>> 0;
      engine.reset(seed);
      engine.setBest(best);
      engine.setDifficulty(settings.difficulty);
      engine.start();
      engine.flap();
      accumulator = 0;
      drainEvents();
    }

    function togglePause() {
      var state = engine.getSnapshot().state;
      if (state === 'playing') {
        engine.pause();
      } else if (state === 'paused' && !isTweaksOpen) {
        engine.resume();
      }
      drainEvents();
    }

    function openTweaks() {
      if (isTweaksOpen) return;
      pausedForTweaks = engine.getSnapshot().state === 'playing';
      if (pausedForTweaks) engine.pause();
      drainEvents();
      isTweaksOpen = true;
      tweaksPanel.hidden = false;
      tweaksButton.setAttribute('aria-expanded', 'true');
      pauseOverlay.hidden = true;
      closeTweaksButton.focus({ preventScroll: true });
    }

    function closeTweaks() {
      if (!isTweaksOpen) return;
      isTweaksOpen = false;
      tweaksPanel.hidden = true;
      tweaksButton.setAttribute('aria-expanded', 'false');
      if (pausedForTweaks && engine.getSnapshot().state === 'paused') {
        engine.resume();
      }
      pausedForTweaks = false;
      drainEvents();
      tweaksButton.focus({ preventScroll: true });
    }

    function handleCanvasPointer(event) {
      if (event.button !== undefined && event.button !== 0) return;
      event.preventDefault();
      unlockAudio();
      var state = engine.getSnapshot().state;
      if (state === 'ready') {
        startRun();
      } else if (state === 'playing') {
        engine.flap();
        drainEvents();
      }
    }

    function isFormControl(target) {
      return target instanceof Element && Boolean(target.closest('button, input, select, textarea, label'));
    }

    function handleKeydown(event) {
      if (isFormControl(event.target) && event.key !== 'Escape') return;
      var key = event.key.toLowerCase();
      if (event.code === 'Space' || event.key === 'ArrowUp') {
        event.preventDefault();
        unlockAudio();
        var state = engine.getSnapshot().state;
        if (state === 'ready') startRun();
        else if (state === 'playing') {
          engine.flap();
          drainEvents();
        }
      } else if (key === 'p' || event.key === 'Escape') {
        event.preventDefault();
        if (isTweaksOpen) closeTweaks();
        else togglePause();
      } else if (key === 'm') {
        event.preventDefault();
        unlockAudio();
        audio.toggleMuted();
        updateMuteButton();
      } else if ((key === 'r' || event.key === 'Enter') && engine.getSnapshot().state === 'gameover') {
        event.preventDefault();
        restartRun();
      }
    }

    function handleVisibilityChange() {
      if (document.hidden && engine.getSnapshot().state === 'playing') {
        engine.pause();
        drainEvents();
      }
    }

    function handleResize() {
      var rect = playfield.getBoundingClientRect();
      var dpr = Math.min(global.devicePixelRatio || 1, 2);
      renderer.resize(Math.max(1, rect.width), Math.max(1, rect.height), dpr);
      if (hasSized && engine.getSnapshot().state === 'playing') {
        engine.pause();
        drainEvents();
      }
      hasSized = true;
    }

    function frame(now) {
      if (destroyed) return;
      var frameSeconds = Math.min(MAX_FRAME_SECONDS, Math.max(0, (now - lastFrameTime) / 1000));
      lastFrameTime = now;
      accumulator += frameSeconds;

      while (accumulator >= FIXED_STEP) {
        engine.step(FIXED_STEP);
        accumulator -= FIXED_STEP;
      }

      drainEvents();
      var snapshot = engine.getSnapshot();
      updateUi(snapshot);
      renderer.draw(snapshot, now);
      frameRequest = global.requestAnimationFrame(frame);
    }

    startButton.addEventListener('click', startRun);
    restartButton.addEventListener('click', restartRun);
    resumeButton.addEventListener('click', togglePause);
    pauseButton.addEventListener('click', togglePause);
    canvas.addEventListener('pointerdown', handleCanvasPointer, { passive: false });
    global.addEventListener('keydown', handleKeydown);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    muteButton.addEventListener('click', function handleMuteClick() {
      unlockAudio();
      audio.toggleMuted();
      updateMuteButton();
    });
    tweaksButton.addEventListener('click', openTweaks);
    closeTweaksButton.addEventListener('click', closeTweaks);

    themeInputs.forEach(function bindTheme(input) {
      input.addEventListener('change', function changeTheme() {
        if (!input.checked) return;
        settings.theme = input.value;
        applySettings();
      });
    });
    difficultyInputs.forEach(function bindDifficulty(input) {
      input.addEventListener('change', function changeDifficulty() {
        if (!input.checked) return;
        settings.difficulty = input.value;
        applySettings();
      });
    });
    grainToggle.addEventListener('change', function changeGrain() {
      settings.grain = grainToggle.checked;
      applySettings();
    });
    motionToggle.addEventListener('change', function changeMotion() {
      settings.lowMotion = motionToggle.checked;
      applySettings();
    });

    comboBanner.addEventListener('animationend', function clearCombo() {
      comboBanner.classList.remove('is-visible');
    });

    var resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(playfield);
    applySettings();
    updateMuteButton();
    updateUi(engine.getSnapshot());
    handleResize();
    frameRequest = global.requestAnimationFrame(frame);

    global.addEventListener('beforeunload', function destroyGame() {
      destroyed = true;
      global.cancelAnimationFrame(frameRequest);
      resizeObserver.disconnect();
      renderer.destroy();
      audio.destroy();
    }, { once: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  } else {
    initialize();
  }
})(window);
