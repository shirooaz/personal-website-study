(function (global) {
  "use strict";

  var STORAGE_KEY = "f8fq.audio.muted";
  var OUTPUT_LEVEL = 0.8;
  var SILENCE = 0.0001;
  var memoryMuted = false;

  function readMutedPreference() {
    try {
      var stored = global.localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        memoryMuted = stored === "1" || stored === "true";
      }
    } catch (error) {
      // Storage can be unavailable for local files or privacy-restricted pages.
    }

    return memoryMuted;
  }

  function writeMutedPreference(value) {
    memoryMuted = value;
    try {
      global.localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
    } catch (error) {
      // The in-memory value remains authoritative for this page session.
    }
  }

  function hasUserActivation() {
    var activation = global.navigator && global.navigator.userActivation;
    return !activation || activation.isActive || activation.hasBeenActive;
  }

  function create() {
    var AudioContextClass = global.AudioContext || global.webkitAudioContext;
    var context = null;
    var masterGain = null;
    var unlockPromise = null;
    var muted = readMutedPreference();
    var destroyed = false;
    var activeVoices = new Set();

    function updateMasterGain(immediate) {
      if (!context || !masterGain || context.state === "closed") {
        return;
      }

      var now = context.currentTime;
      var target = muted ? 0 : OUTPUT_LEVEL;

      try {
        masterGain.gain.cancelScheduledValues(now);
        masterGain.gain.setValueAtTime(masterGain.gain.value, now);
        if (immediate) {
          masterGain.gain.setValueAtTime(target, now);
        } else {
          masterGain.gain.linearRampToValueAtTime(target, now + 0.025);
        }
      } catch (error) {
        masterGain.gain.value = target;
      }
    }

    function unlock() {
      if (destroyed || !AudioContextClass || !hasUserActivation()) {
        return Promise.resolve(false);
      }

      if (context && context.state === "running") {
        return Promise.resolve(true);
      }

      if (unlockPromise) {
        return unlockPromise;
      }

      if (!context) {
        try {
          context = new AudioContextClass();
          masterGain = context.createGain();
          masterGain.gain.setValueAtTime(muted ? 0 : OUTPUT_LEVEL, context.currentTime);
          masterGain.connect(context.destination);
        } catch (error) {
          if (masterGain) {
            try {
              masterGain.disconnect();
            } catch (disconnectError) {
              // The node may not have connected successfully.
            }
          }
          if (context && context.state !== "closed") {
            try {
              var failedClose = context.close();
              if (failedClose && typeof failedClose.catch === "function") {
                failedClose.catch(function () {});
              }
            } catch (closeError) {
              // A partially constructed context may not be closable.
            }
          }
          context = null;
          masterGain = null;
          return Promise.resolve(false);
        }
      }

      if (context.state === "closed") {
        return Promise.resolve(false);
      }

      try {
        unlockPromise = Promise.resolve(context.resume())
          .then(function () {
            return !destroyed && context && context.state === "running";
          })
          .catch(function () {
            return false;
          })
          .then(function (result) {
            unlockPromise = null;
            return result;
          });
      } catch (error) {
        unlockPromise = null;
        return Promise.resolve(false);
      }

      return unlockPromise;
    }

    function releaseVoice(voice) {
      if (!voice || !activeVoices.has(voice)) {
        return;
      }

      activeVoices.delete(voice);
      voice.oscillator.onended = null;
      voice.nodes.forEach(function (node) {
        try {
          node.disconnect();
        } catch (error) {
          // A node can already be disconnected after its context closes.
        }
      });
    }

    function tone(options) {
      if (
        destroyed ||
        muted ||
        !context ||
        !masterGain ||
        context.state !== "running" ||
        activeVoices.size >= 40
      ) {
        return false;
      }

      var oscillator;
      var envelope;
      var filter = null;
      var voice = null;

      try {
        var delay = options.delay || 0;
        var duration = Math.max(0.025, options.duration || 0.1);
        var attack = Math.min(duration * 0.4, options.attack || 0.006);
        var startAt = context.currentTime + 0.005 + delay;
        var endAt = startAt + duration;
        var startFrequency = Math.max(1, options.frequency || 440);
        var endFrequency = Math.max(1, options.endFrequency || startFrequency);

        oscillator = context.createOscillator();
        envelope = context.createGain();
        oscillator.type = options.type || "sine";
        oscillator.frequency.setValueAtTime(startFrequency, startAt);
        if (endFrequency !== startFrequency) {
          oscillator.frequency.exponentialRampToValueAtTime(endFrequency, endAt);
        }

        envelope.gain.setValueAtTime(SILENCE, startAt);
        envelope.gain.exponentialRampToValueAtTime(
          Math.max(SILENCE, options.level || 0.05),
          startAt + attack
        );
        envelope.gain.exponentialRampToValueAtTime(SILENCE, endAt);

        if (options.filterFrequency) {
          filter = context.createBiquadFilter();
          filter.type = "lowpass";
          filter.Q.setValueAtTime(options.filterQ || 0.7, startAt);
          filter.frequency.setValueAtTime(options.filterFrequency, startAt);
          if (options.endFilterFrequency) {
            filter.frequency.exponentialRampToValueAtTime(
              Math.max(1, options.endFilterFrequency),
              endAt
            );
          }
          oscillator.connect(filter);
          filter.connect(envelope);
        } else {
          oscillator.connect(envelope);
        }
        envelope.connect(masterGain);

        voice = {
          oscillator: oscillator,
          nodes: filter ? [oscillator, filter, envelope] : [oscillator, envelope]
        };
        activeVoices.add(voice);
        oscillator.onended = function () {
          releaseVoice(voice);
        };
        oscillator.start(startAt);
        oscillator.stop(endAt + 0.015);
        return true;
      } catch (error) {
        if (voice) {
          try {
            voice.oscillator.stop();
          } catch (stopError) {
            // The oscillator may not have started before scheduling failed.
          }
          activeVoices.add(voice);
          releaseVoice(voice);
        } else {
          [oscillator, filter, envelope].forEach(function (node) {
            if (!node) {
              return;
            }
            try {
              node.disconnect();
            } catch (disconnectError) {
              // Ignore cleanup errors for incomplete voices.
            }
          });
        }
        return false;
      }
    }

    function playStart() {
      var played = false;
      played = tone({ frequency: 392, type: "triangle", duration: 0.18, level: 0.035 }) || played;
      played = tone({ frequency: 523.25, type: "triangle", delay: 0.065, duration: 0.2, level: 0.04 }) || played;
      played = tone({ frequency: 659.25, type: "sine", delay: 0.13, duration: 0.24, level: 0.045 }) || played;
      return played;
    }

    function playFlap() {
      return tone({
        frequency: 310,
        endFrequency: 610,
        type: "triangle",
        duration: 0.075,
        attack: 0.004,
        level: 0.04
      });
    }

    function playCoin() {
      var played = false;
      played = tone({ frequency: 880, type: "sine", duration: 0.12, level: 0.055 }) || played;
      played = tone({ frequency: 1318.51, type: "sine", delay: 0.055, duration: 0.16, level: 0.05 }) || played;
      return played;
    }

    function playScore() {
      var played = false;
      played = tone({ frequency: 659.25, type: "sine", duration: 0.2, level: 0.04 }) || played;
      played = tone({ frequency: 880, type: "sine", delay: 0.07, duration: 0.22, level: 0.045 }) || played;
      played = tone({ frequency: 1046.5, type: "triangle", delay: 0.14, duration: 0.26, level: 0.035 }) || played;
      return played;
    }

    function playCombo() {
      var played = false;
      [783.99, 987.77, 1174.66, 1567.98].forEach(function (frequency, index) {
        played = tone({
          frequency: frequency,
          type: index < 3 ? "triangle" : "sine",
          delay: index * 0.045,
          duration: 0.19 + index * 0.025,
          level: index === 3 ? 0.05 : 0.035
        }) || played;
      });
      return played;
    }

    function playCrash() {
      var played = false;
      played = tone({
        frequency: 185,
        endFrequency: 48,
        type: "sawtooth",
        duration: 0.34,
        attack: 0.008,
        level: 0.08,
        filterFrequency: 900,
        endFilterFrequency: 170,
        filterQ: 1.1
      }) || played;
      played = tone({
        frequency: 96,
        endFrequency: 43,
        type: "triangle",
        delay: 0.018,
        duration: 0.3,
        level: 0.055
      }) || played;
      return played;
    }

    function handle(eventType) {
      if (destroyed || muted || !context || context.state !== "running") {
        return false;
      }

      switch (String(eventType || "").toLowerCase()) {
        case "start":
          return playStart();
        case "flap":
          return playFlap();
        case "coin":
          return playCoin();
        case "score":
          return playScore();
        case "combo":
          return playCombo();
        case "crash":
          return playCrash();
        default:
          return false;
      }
    }

    function setMuted(value) {
      muted = Boolean(value);
      writeMutedPreference(muted);
      updateMasterGain(false);
      return muted;
    }

    function toggleMuted() {
      return setMuted(!muted);
    }

    function isMuted() {
      return muted;
    }

    function destroy() {
      if (destroyed) {
        return;
      }

      destroyed = true;
      unlockPromise = null;
      Array.from(activeVoices).forEach(function (voice) {
        try {
          voice.oscillator.stop();
        } catch (error) {
          // The oscillator may already have stopped naturally.
        }
        releaseVoice(voice);
      });

      if (masterGain) {
        try {
          masterGain.disconnect();
        } catch (error) {
          // The destination may already be disconnected.
        }
      }

      var closingContext = context;
      context = null;
      masterGain = null;
      if (closingContext && closingContext.state !== "closed") {
        try {
          var closeResult = closingContext.close();
          if (closeResult && typeof closeResult.catch === "function") {
            closeResult.catch(function () {});
          }
        } catch (error) {
          // Closing is best effort on older Web Audio implementations.
        }
      }
    }

    return Object.freeze({
      unlock: unlock,
      setMuted: setMuted,
      toggleMuted: toggleMuted,
      isMuted: isMuted,
      handle: handle,
      destroy: destroy
    });
  }

  global.F8FQAudio = Object.freeze({ create: create });
})(window);
