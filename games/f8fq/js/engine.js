(function attachF8FQEngine(root, factory) {
  'use strict';

  var api = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }

  if (root) {
    root.F8FQEngine = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function createF8FQEngine() {
  'use strict';

  var WORLD_WIDTH = 1000;
  var WORLD_HEIGHT = 600;
  var DEFAULT_SEED = 0x8f3c2a1d;
  var SUBSTEP_SECONDS = 1 / 120;

  var DIFFICULTY_PRESETS = Object.freeze({
    calm: Object.freeze({
      baseSpeed: 178,
      baseGap: 232,
      gravity: 1240,
      flapImpulse: -430
    }),
    standard: Object.freeze({
      baseSpeed: 212,
      baseGap: 206,
      gravity: 1480,
      flapImpulse: -470
    }),
    fast: Object.freeze({
      baseSpeed: 248,
      baseGap: 184,
      gravity: 1690,
      flapImpulse: -510
    })
  });

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
  }

  function normalizeSeed(value) {
    return Number.isFinite(value) ? value >>> 0 : DEFAULT_SEED;
  }

  function normalizeBest(value) {
    var numeric = Number(value);
    return Number.isFinite(numeric) ? Math.max(0, Math.floor(numeric)) : 0;
  }

  function circleIntersectsRectangle(cx, cy, radius, x, y, width, height) {
    if (width <= 0 || height <= 0) {
      return false;
    }

    var closestX = clamp(cx, x, x + width);
    var closestY = clamp(cy, y, y + height);
    var dx = cx - closestX;
    var dy = cy - closestY;
    return dx * dx + dy * dy <= radius * radius;
  }

  function GameEngine(options) {
    options = options || {};

    this.config = {
      worldWidth: WORLD_WIDTH,
      worldHeight: WORLD_HEIGHT,
      floorY: 558,
      playerX: 250,
      playerStartY: 292,
      playerRadius: 25,
      collisionRadius: 18,
      coinRadius: 13,
      obstacleWidth: 92,
      firstObstacleX: 870,
      baseSpacing: 382,
      minSpacing: 328,
      spacingRamp: 5,
      minGap: 148,
      maxGap: 250,
      gapRamp: 8,
      maxSpeed: 338,
      minSpeed: 150,
      speedRamp: 12,
      maxFallVelocity: 650,
      maxRiseVelocity: -650,
      topGapMargin: 58,
      bottomGapMargin: 52,
      maxGapShift: 108,
      spawnAhead: 720,
      despawnMargin: 130,
      baseSpeed: 0,
      baseGap: 0,
      gravity: 0,
      flapImpulse: 0
    };

    this.initialSeed = normalizeSeed(options.seed);
    this.best = normalizeBest(options.best);
    this.difficultyMode = options.difficulty || 'standard';

    if (!Object.prototype.hasOwnProperty.call(DIFFICULTY_PRESETS, this.difficultyMode)) {
      throw new RangeError('Unknown difficulty: ' + this.difficultyMode);
    }

    this._applyDifficultyPreset(this.difficultyMode);
    this.reset();
  }

  GameEngine.prototype._applyDifficultyPreset = function _applyDifficultyPreset(mode) {
    var preset = DIFFICULTY_PRESETS[mode];
    this.config.baseSpeed = clamp(
      preset.baseSpeed,
      this.config.minSpeed,
      this.config.maxSpeed
    );
    this.config.baseGap = clamp(
      preset.baseGap,
      this.config.minGap,
      this.config.maxGap
    );
    this.config.gravity = clamp(preset.gravity, 900, 1900);
    this.config.flapImpulse = clamp(preset.flapImpulse, -580, -360);
  };

  GameEngine.prototype.setDifficulty = function setDifficulty(mode) {
    if (!Object.prototype.hasOwnProperty.call(DIFFICULTY_PRESETS, mode)) {
      throw new RangeError('Unknown difficulty: ' + mode);
    }

    this.difficultyMode = mode;
    this._applyDifficultyPreset(mode);

    // A ready run can be safely rebuilt so its visible gaps match the preset.
    // Active obstacles keep their geometry; only new gaps and live physics change.
    if (this.state === 'ready') {
      this._resetSpawner();
      this._fillInitialObstacles();
    }

    return mode;
  };

  GameEngine.prototype._resetSpawner = function _resetSpawner() {
    this._rngState = this.initialSeed;
    this._lastGapCenter = null;
    this._nextObstacleId = 1;
    this.obstacles = [];
  };

  GameEngine.prototype.reset = function reset(seed) {
    if (seed !== undefined) {
      this.initialSeed = normalizeSeed(seed);
    }
    this.state = 'ready';
    this.time = 0;
    this.distance = 0;
    this.score = 0;
    this.cents = 0;
    this.totalCents = 0;
    this.gatesPassed = 0;
    this._events = [];
    this.player = {
      x: this.config.playerX,
      y: this.config.playerStartY,
      vy: 0,
      radius: this.config.playerRadius,
      collisionRadius: this.config.collisionRadius,
      rotation: 0
    };

    this._resetSpawner();
    this._fillInitialObstacles();
    return this.getSnapshot();
  };

  GameEngine.prototype.start = function start() {
    if (this.state !== 'ready') {
      return false;
    }

    this.state = 'playing';
    this._emit('start', { state: this.state });
    return true;
  };

  GameEngine.prototype.flap = function flap() {
    if (this.state === 'ready') {
      this.start();
    }

    if (this.state !== 'playing') {
      return false;
    }

    this.player.vy = Math.max(
      this.config.maxRiseVelocity,
      this.config.flapImpulse
    );
    this._emit('flap', { velocity: this.player.vy });
    return true;
  };

  GameEngine.prototype.pause = function pause() {
    if (this.state !== 'playing') {
      return false;
    }

    this.state = 'paused';
    this._emit('pause', { state: this.state });
    return true;
  };

  GameEngine.prototype.resume = function resume() {
    if (this.state !== 'paused') {
      return false;
    }

    this.state = 'playing';
    this._emit('resume', { state: this.state });
    return true;
  };

  GameEngine.prototype.step = function step(dt) {
    if (this.state !== 'playing') {
      return this.getSnapshot();
    }

    var seconds = Number(dt);
    if (!Number.isFinite(seconds) || seconds <= 0) {
      return this.getSnapshot();
    }

    var remaining = seconds;
    while (remaining > 1e-10 && this.state === 'playing') {
      var slice = Math.min(SUBSTEP_SECONDS, remaining);
      this._integrate(slice);
      remaining -= slice;
    }

    return this.getSnapshot();
  };

  GameEngine.prototype._integrate = function _integrate(dt) {
    this.time += dt;
    this.player.vy = Math.min(
      this.config.maxFallVelocity,
      this.player.vy + this.config.gravity * dt
    );
    this.player.y += this.player.vy * dt;
    this.player.rotation = clamp(
      this.player.vy / this.config.maxFallVelocity,
      -0.58,
      1.08
    );

    var distance = this._currentSpeed() * dt;
    this.distance += distance;
    for (var index = 0; index < this.obstacles.length; index += 1) {
      var obstacle = this.obstacles[index];
      obstacle.x -= distance;
      if (obstacle.coin) {
        obstacle.coin.x -= distance;
      }
    }

    this._collectPassedGates();
    this._collectCoins();

    var collisionReason = this._collisionReason();
    if (collisionReason) {
      this._crash(collisionReason);
      return;
    }

    this._maintainObstacleBuffer();
  };

  GameEngine.prototype._collectPassedGates = function _collectPassedGates() {
    for (var index = 0; index < this.obstacles.length; index += 1) {
      var obstacle = this.obstacles[index];
      if (!obstacle.passed && obstacle.x + obstacle.width < this.player.x) {
        obstacle.passed = true;
        this.gatesPassed += 1;
        this.score += 1;
        this._emit('score', {
          delta: 1,
          reason: 'gate',
          score: this.score,
          obstacleId: obstacle.id
        });
      }
    }
  };

  GameEngine.prototype._collectCoins = function _collectCoins() {
    for (var index = 0; index < this.obstacles.length; index += 1) {
      var obstacle = this.obstacles[index];
      var coin = obstacle.coin;
      if (!coin || coin.collected) {
        continue;
      }

      var dx = this.player.x - coin.x;
      var dy = this.player.y - coin.y;
      var reach = this.player.collisionRadius + coin.radius;
      if (dx * dx + dy * dy > reach * reach) {
        continue;
      }

      coin.collected = true;
      this.cents += 1;
      this.totalCents += 1;
      this._emit('coin', {
        cents: this.cents,
        totalCents: this.totalCents,
        obstacleId: obstacle.id
      });

      if (this.cents === 8) {
        this.cents = 0;
        this.score += 8;
        this._emit('combo', {
          bonus: 8,
          cents: this.cents,
          totalCents: this.totalCents,
          score: this.score
        });
        this._emit('score', {
          delta: 8,
          reason: 'combo',
          score: this.score
        });
      }
    }
  };

  GameEngine.prototype._collisionReason = function _collisionReason() {
    var radius = this.player.collisionRadius;
    if (this.player.y - radius <= 0) {
      return 'ceiling';
    }
    if (this.player.y + radius >= this.config.floorY) {
      return 'floor';
    }

    for (var index = 0; index < this.obstacles.length; index += 1) {
      var obstacle = this.obstacles[index];
      var hitsTop = circleIntersectsRectangle(
        this.player.x,
        this.player.y,
        radius,
        obstacle.x,
        0,
        obstacle.width,
        obstacle.gapTop
      );
      var hitsBottom = circleIntersectsRectangle(
        this.player.x,
        this.player.y,
        radius,
        obstacle.x,
        obstacle.gapBottom,
        obstacle.width,
        this.config.floorY - obstacle.gapBottom
      );
      if (hitsTop || hitsBottom) {
        return 'obstacle';
      }
    }

    return null;
  };

  GameEngine.prototype._crash = function _crash(reason) {
    this.state = 'gameover';
    if (this.score > this.best) {
      this.best = this.score;
    }
    this._emit('crash', {
      reason: reason,
      score: this.score,
      best: this.best,
      state: this.state
    });
  };

  GameEngine.prototype._difficultyLevel = function _difficultyLevel() {
    return Math.floor(this.gatesPassed / 5);
  };

  GameEngine.prototype._currentSpeed = function _currentSpeed() {
    return Math.min(
      this.config.maxSpeed,
      this.config.baseSpeed + this._difficultyLevel() * this.config.speedRamp
    );
  };

  GameEngine.prototype._currentGap = function _currentGap() {
    return Math.max(
      this.config.minGap,
      this.config.baseGap - this._difficultyLevel() * this.config.gapRamp
    );
  };

  GameEngine.prototype._currentSpacing = function _currentSpacing() {
    return Math.max(
      this.config.minSpacing,
      this.config.baseSpacing - this._difficultyLevel() * this.config.spacingRamp
    );
  };

  GameEngine.prototype._random = function _random() {
    this._rngState = (
      Math.imul(1664525, this._rngState) + 1013904223
    ) >>> 0;
    return this._rngState / 4294967296;
  };

  GameEngine.prototype._spawnObstacle = function _spawnObstacle(x) {
    var gapSize = this._currentGap();
    var minimumCenter = this.config.topGapMargin + gapSize / 2;
    var maximumCenter =
      this.config.floorY - this.config.bottomGapMargin - gapSize / 2;
    var center;

    if (this._lastGapCenter === null) {
      var midpoint = (minimumCenter + maximumCenter) / 2;
      var firstRange = Math.min(80, (maximumCenter - minimumCenter) / 2);
      center = midpoint + (this._random() * 2 - 1) * firstRange;
    } else {
      var shift = (this._random() * 2 - 1) * this.config.maxGapShift;
      center = this._lastGapCenter + shift;
    }

    center = clamp(center, minimumCenter, maximumCenter);
    this._lastGapCenter = center;

    var obstacle = {
      id: this._nextObstacleId,
      x: x,
      width: this.config.obstacleWidth,
      gapCenter: center,
      gapSize: gapSize,
      gapTop: center - gapSize / 2,
      gapBottom: center + gapSize / 2,
      passed: false,
      coin: {
        x: x + this.config.obstacleWidth / 2,
        y: center,
        radius: this.config.coinRadius,
        collected: false
      }
    };

    this._nextObstacleId += 1;
    this.obstacles.push(obstacle);
    return obstacle;
  };

  GameEngine.prototype._fillInitialObstacles = function _fillInitialObstacles() {
    var x = this.config.firstObstacleX;
    var limit = this.config.worldWidth + this.config.spawnAhead;
    while (x <= limit) {
      this._spawnObstacle(x);
      x += this._currentSpacing();
    }
  };

  GameEngine.prototype._maintainObstacleBuffer = function _maintainObstacleBuffer() {
    var leftLimit = -this.config.despawnMargin;
    this.obstacles = this.obstacles.filter(function keepVisible(obstacle) {
      return obstacle.x + obstacle.width >= leftLimit;
    });

    var limit = this.config.worldWidth + this.config.spawnAhead;
    var rightmost = this.obstacles.length
      ? this.obstacles[this.obstacles.length - 1].x
      : this.config.worldWidth;

    while (rightmost < limit) {
      rightmost += this._currentSpacing();
      this._spawnObstacle(rightmost);
    }
  };

  GameEngine.prototype._emit = function _emit(type, detail) {
    var event = { type: type, time: this.time };
    var keys = Object.keys(detail || {});
    for (var index = 0; index < keys.length; index += 1) {
      event[keys[index]] = detail[keys[index]];
    }
    this._events.push(event);
  };

  GameEngine.prototype.consumeEvents = function consumeEvents() {
    return this._events.splice(0).map(function cloneEvent(event) {
      return Object.assign({}, event);
    });
  };

  GameEngine.prototype.setBest = function setBest(value) {
    this.best = normalizeBest(value);
    return this.best;
  };

  GameEngine.prototype.getSnapshot = function getSnapshot() {
    return {
      state: this.state,
      time: this.time,
      distance: this.distance,
      world: {
        width: this.config.worldWidth,
        height: this.config.worldHeight,
        floorY: this.config.floorY
      },
      score: this.score,
      best: this.best,
      cents: this.cents,
      totalCents: this.totalCents,
      gatesPassed: this.gatesPassed,
      difficulty: {
        mode: this.difficultyMode,
        level: this._difficultyLevel(),
        speed: this._currentSpeed(),
        gap: this._currentGap(),
        spacing: this._currentSpacing()
      },
      player: {
        x: this.player.x,
        y: this.player.y,
        vy: this.player.vy,
        radius: this.player.radius,
        collisionRadius: this.player.collisionRadius,
        rotation: this.player.rotation
      },
      obstacles: this.obstacles.map(function copyObstacle(obstacle) {
        return {
          id: obstacle.id,
          x: obstacle.x,
          width: obstacle.width,
          gapCenter: obstacle.gapCenter,
          gapSize: obstacle.gapSize,
          gapTop: obstacle.gapTop,
          gapBottom: obstacle.gapBottom,
          passed: obstacle.passed,
          coin: obstacle.coin
            ? {
                x: obstacle.coin.x,
                y: obstacle.coin.y,
                radius: obstacle.coin.radius,
                collected: obstacle.coin.collected
              }
            : null
        };
      })
    };
  };

  return Object.freeze({
    GameEngine: GameEngine,
    WORLD_WIDTH: WORLD_WIDTH,
    WORLD_HEIGHT: WORLD_HEIGHT,
    DIFFICULTY_PRESETS: DIFFICULTY_PRESETS
  });
});
