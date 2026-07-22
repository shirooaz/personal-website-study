(function attachF8FQVisuals(global) {
  "use strict";

  const WORLD_WIDTH = 1000;
  const WORLD_HEIGHT = 600;
  const TAU = Math.PI * 2;
  const MAX_PARTICLES = 180;
  const MAX_RINGS = 24;

  const PALETTES = Object.freeze({
    ruins: Object.freeze({
      paper: "#d8d3c8",
      paperBright: "#f3efe6",
      paperShadow: "#b4aea3",
      ink: "#171614",
      charcoal: "#46423d",
      charcoalSoft: "#777168",
      far: "#a6a097",
      middle: "#716c64",
      near: "#3e3b37",
      vermilion: "#df3d33",
      vermilionDark: "#8e241f",
      copper: "#b87335",
      copperLight: "#e0a05b",
      chalk: "#fff8eb",
      grainAlpha: 0.19
    }),
    newsprint: Object.freeze({
      paper: "#eee9df",
      paperBright: "#fffaf0",
      paperShadow: "#c8c0b5",
      ink: "#24211e",
      charcoal: "#4d4944",
      charcoalSoft: "#817a71",
      far: "#bbb4aa",
      middle: "#777068",
      near: "#3a3632",
      vermilion: "#c9342b",
      vermilionDark: "#7b211d",
      copper: "#9f672f",
      copperLight: "#dda15d",
      chalk: "#fffdf5",
      grainAlpha: 0.14
    }),
    night: Object.freeze({
      paper: "#242220",
      paperBright: "#34312d",
      paperShadow: "#11110f",
      ink: "#eee9df",
      charcoal: "#151513",
      charcoalSoft: "#8f8981",
      far: "#4a4641",
      middle: "#282725",
      near: "#10110f",
      vermilion: "#f05243",
      vermilionDark: "#8f251f",
      copper: "#c78542",
      copperLight: "#f0b66f",
      chalk: "#fff4df",
      grainAlpha: 0.2
    })
  });

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
  }

  function finite(value, fallback) {
    return Number.isFinite(value) ? value : fallback;
  }

  function modulo(value, divisor) {
    return ((value % divisor) + divisor) % divisor;
  }

  function lerp(start, end, amount) {
    return start + (end - start) * amount;
  }

  function hashNumber(value) {
    let number = Math.imul((value | 0) ^ 0x45d9f3b, 0x45d9f3b);
    number = Math.imul(number ^ (number >>> 16), 0x45d9f3b);
    return (number ^ (number >>> 16)) >>> 0;
  }

  function mulberry32(seed) {
    let state = seed >>> 0;
    return function random() {
      state += 0x6d2b79f5;
      let result = state;
      result = Math.imul(result ^ (result >>> 15), result | 1);
      result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
      return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
    };
  }

  function range(random, minimum, maximum) {
    return minimum + random() * (maximum - minimum);
  }

  function createCanvas(ownerDocument, width, height) {
    const surface = ownerDocument.createElement("canvas");
    surface.width = Math.max(1, Math.round(width));
    surface.height = Math.max(1, Math.round(height));
    return surface;
  }

  function makeCityLayer(seed, options) {
    const random = mulberry32(seed);
    const buildings = [];
    let x = -18;

    while (x < options.span + 30) {
      const width = Math.round(range(random, options.minWidth, options.maxWidth));
      const height = Math.round(range(random, options.minHeight, options.maxHeight));
      const roofCount = 4 + Math.floor(random() * 4);
      const roof = [];
      const windows = [];
      const cracks = [];

      for (let index = 0; index < roofCount; index += 1) {
        const position = index / (roofCount - 1);
        let damage = range(random, 0, options.damage);
        if (index === 0 || index === roofCount - 1) {
          damage *= 0.45;
        }
        roof.push({ x: position, y: damage });
      }

      const columns = Math.max(1, Math.floor((width - 18) / options.windowSpacing));
      const rows = Math.max(1, Math.floor((height - 36) / options.rowSpacing));
      for (let row = 0; row < rows; row += 1) {
        for (let column = 0; column < columns; column += 1) {
          if (random() > options.windowDensity) {
            continue;
          }
          const windowWidth = Math.min(11, (width - 16) / Math.max(columns, 1) - 5);
          windows.push({
            x: 9 + column * ((width - 18) / Math.max(columns, 1)) + range(random, -2, 2),
            y: 27 + row * options.rowSpacing + range(random, -2, 2),
            width: Math.max(3, windowWidth),
            height: range(random, 7, 14),
            lit: random() > 0.91,
            broken: random() > 0.74
          });
        }
      }

      const crackCount = Math.floor(range(random, 1, 4));
      for (let index = 0; index < crackCount; index += 1) {
        const startX = range(random, 0.16, 0.84);
        const startY = range(random, 0.18, 0.68);
        cracks.push([
          { x: startX, y: startY },
          { x: startX + range(random, -0.09, 0.09), y: startY + range(random, 0.08, 0.16) },
          { x: startX + range(random, -0.13, 0.13), y: startY + range(random, 0.17, 0.3) }
        ]);
      }

      buildings.push({
        x,
        width,
        height,
        roof,
        windows,
        cracks,
        ledge: random() > 0.58,
        antenna: random() > 0.77,
        waterTank: random() > 0.86
      });

      x += width + Math.round(range(random, options.minGap, options.maxGap));
    }

    return Object.freeze({
      seed,
      span: options.span,
      speed: options.speed,
      buildings: Object.freeze(buildings)
    });
  }

  const CITY_LAYERS = Object.freeze([
    makeCityLayer(0x241103, {
      span: 1700,
      minWidth: 48,
      maxWidth: 104,
      minHeight: 82,
      maxHeight: 210,
      minGap: 3,
      maxGap: 14,
      damage: 24,
      windowSpacing: 25,
      rowSpacing: 31,
      windowDensity: 0.46,
      speed: 0.075
    }),
    makeCityLayer(0x820831, {
      span: 1680,
      minWidth: 58,
      maxWidth: 132,
      minHeight: 128,
      maxHeight: 292,
      minGap: 1,
      maxGap: 11,
      damage: 34,
      windowSpacing: 28,
      rowSpacing: 36,
      windowDensity: 0.38,
      speed: 0.16
    }),
    makeCityLayer(0x513804, {
      span: 1640,
      minWidth: 76,
      maxWidth: 168,
      minHeight: 76,
      maxHeight: 205,
      minGap: 0,
      maxGap: 8,
      damage: 42,
      windowSpacing: 32,
      rowSpacing: 38,
      windowDensity: 0.26,
      speed: 0.28
    })
  ]);

  function traceBuilding(context, building) {
    const top = WORLD_HEIGHT - building.height;
    context.beginPath();
    context.moveTo(building.x, WORLD_HEIGHT);
    context.lineTo(building.x, top + building.roof[0].y);
    building.roof.forEach(function addRoofPoint(point) {
      context.lineTo(building.x + point.x * building.width, top + point.y);
    });
    context.lineTo(building.x + building.width, WORLD_HEIGHT);
    context.closePath();
  }

  function renderCityLayer(ownerDocument, layer, palette, layerIndex) {
    const surface = createCanvas(ownerDocument, layer.span, WORLD_HEIGHT);
    const context = surface.getContext("2d");
    const fills = [palette.far, palette.middle, palette.near];
    const fill = fills[layerIndex];

    context.clearRect(0, 0, layer.span, WORLD_HEIGHT);
    context.lineJoin = "bevel";
    context.lineCap = "square";

    layer.buildings.forEach(function drawBuilding(building, buildingIndex) {
      traceBuilding(context, building);
      context.fillStyle = fill;
      context.fill();

      if (layerIndex > 0) {
        context.strokeStyle = layerIndex === 2 ? palette.ink : palette.charcoal;
        context.lineWidth = layerIndex === 2 ? 2.2 : 1.25;
        context.stroke();
      }

      context.save();
      traceBuilding(context, building);
      context.clip();

      if (building.ledge) {
        const ledgeY = WORLD_HEIGHT - building.height * 0.47;
        context.fillStyle = layerIndex === 2 ? palette.charcoalSoft : palette.paperShadow;
        context.globalAlpha = layerIndex === 2 ? 0.32 : 0.24;
        context.fillRect(building.x - 3, ledgeY, building.width + 6, layerIndex === 2 ? 8 : 4);
        context.globalAlpha = 1;
      }

      building.windows.forEach(function drawWindow(windowShape, windowIndex) {
        const windowX = building.x + windowShape.x;
        const windowY = WORLD_HEIGHT - building.height + windowShape.y;
        context.fillStyle = windowShape.lit ? palette.copperLight : palette.paper;
        context.globalAlpha = windowShape.lit ? 0.52 : layerIndex === 0 ? 0.34 : 0.63;
        context.fillRect(windowX, windowY, windowShape.width, windowShape.height);
        context.globalAlpha = 1;

        if (windowShape.broken && layerIndex > 0) {
          context.strokeStyle = fill;
          context.lineWidth = 1.1;
          context.beginPath();
          if ((windowIndex + buildingIndex) % 2 === 0) {
            context.moveTo(windowX, windowY);
            context.lineTo(windowX + windowShape.width, windowY + windowShape.height);
          } else {
            context.moveTo(windowX + windowShape.width, windowY);
            context.lineTo(windowX, windowY + windowShape.height);
          }
          context.stroke();
        }
      });

      if (layerIndex > 0) {
        context.strokeStyle = layerIndex === 2 ? palette.paperShadow : palette.charcoalSoft;
        context.globalAlpha = layerIndex === 2 ? 0.42 : 0.26;
        context.lineWidth = layerIndex === 2 ? 1.6 : 1.1;
        building.cracks.forEach(function drawCrack(crack) {
          context.beginPath();
          crack.forEach(function addCrackPoint(point, pointIndex) {
            const crackX = building.x + point.x * building.width;
            const crackY = WORLD_HEIGHT - building.height + point.y * building.height;
            if (pointIndex === 0) {
              context.moveTo(crackX, crackY);
            } else {
              context.lineTo(crackX, crackY);
            }
          });
          context.stroke();
        });
        context.globalAlpha = 1;
      }

      context.restore();

      const roofTop = WORLD_HEIGHT - building.height + building.roof[0].y;
      if (building.antenna && layerIndex < 2) {
        context.strokeStyle = fill;
        context.lineWidth = 1.5;
        context.beginPath();
        context.moveTo(building.x + building.width * 0.7, roofTop + 4);
        context.lineTo(building.x + building.width * 0.7, roofTop - 24 - layerIndex * 7);
        context.stroke();
      }

      if (building.waterTank && layerIndex === 1) {
        const tankX = building.x + building.width * 0.18;
        context.fillStyle = fill;
        context.fillRect(tankX, roofTop - 20, Math.min(28, building.width * 0.32), 16);
        context.strokeStyle = fill;
        context.lineWidth = 2;
        context.beginPath();
        context.moveTo(tankX + 3, roofTop - 4);
        context.lineTo(tankX, roofTop + 7);
        context.moveTo(tankX + Math.min(25, building.width * 0.3), roofTop - 4);
        context.lineTo(tankX + Math.min(28, building.width * 0.32), roofTop + 7);
        context.stroke();
      }
    });

    return surface;
  }

  function createGrainSurface(ownerDocument, palette, seed) {
    const size = 176;
    const surface = createCanvas(ownerDocument, size, size);
    const context = surface.getContext("2d");
    const random = mulberry32(seed);

    context.clearRect(0, 0, size, size);
    for (let index = 0; index < 720; index += 1) {
      const x = random() * size;
      const y = random() * size;
      const length = range(random, 0.3, 2.8);
      context.globalAlpha = range(random, 0.025, 0.16);
      context.strokeStyle = random() > 0.38 ? palette.ink : palette.paperBright;
      context.lineWidth = random() > 0.82 ? 1 : 0.5;
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(x + length, y + range(random, -0.45, 0.45));
      context.stroke();
    }
    context.globalAlpha = 1;
    return surface;
  }

  function createCharcoalSurface(ownerDocument, palette, seed) {
    const size = 92;
    const surface = createCanvas(ownerDocument, size, size);
    const context = surface.getContext("2d");
    const random = mulberry32(seed);

    context.clearRect(0, 0, size, size);
    for (let index = 0; index < 95; index += 1) {
      const x = random() * size;
      const y = random() * size;
      context.strokeStyle = random() > 0.25 ? palette.charcoalSoft : palette.paperShadow;
      context.globalAlpha = range(random, 0.055, 0.18);
      context.lineWidth = range(random, 0.55, 1.5);
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(x + range(random, 4, 19), y + range(random, -2, 3));
      context.stroke();
    }
    context.globalAlpha = 1;
    return surface;
  }

  function createRenderer(canvas) {
    if (!canvas || typeof canvas.getContext !== "function") {
      throw new TypeError("F8FQVisuals.create requires a canvas element.");
    }

    const context = canvas.getContext("2d", { alpha: false });
    if (!context) {
      throw new Error("A 2D canvas context is required.");
    }

    const ownerDocument = canvas.ownerDocument || global.document;
    const cityCache = new Map();
    const textureCache = new Map();
    const particles = [];
    const rings = [];
    const pendingEvents = [];
    const ambientDust = [];
    const dustRandom = mulberry32(0x882211);

    let theme = "ruins";
    let reducedMotion = false;
    let grainEnabled = true;
    let cssWidth = 1000;
    let cssHeight = 600;
    let pixelRatio = 1;
    let scaleX = 1;
    let scaleY = 1;
    let radiusScale = 1;
    let destroyed = false;
    let lastDrawTime = 0;
    let lastDistance = 0;
    let frozenTime = 0;
    let frozenDistance = 0;
    let lastSnapshot = null;
    let eventSequence = 0;
    let shakeStart = 0;
    let shakeEnd = 0;
    let shakeMagnitude = 0;

    for (let index = 0; index < 24; index += 1) {
      ambientDust.push({
        x: dustRandom() * WORLD_WIDTH,
        y: 55 + dustRandom() * (WORLD_HEIGHT - 130),
        speed: range(dustRandom, 2.2, 8.5),
        drift: range(dustRandom, 0.8, 2.6),
        size: range(dustRandom, 0.7, 2.2),
        phase: dustRandom() * TAU
      });
    }

    function palette() {
      return PALETTES[theme];
    }

    function mapX(value) {
      return value * scaleX;
    }

    function mapY(value) {
      return value * scaleY;
    }

    function mapRadius(value) {
      return value * radiusScale;
    }

    function getCitySurfaces() {
      if (!cityCache.has(theme)) {
        cityCache.set(theme, CITY_LAYERS.map(function buildLayer(layer, index) {
          return renderCityLayer(ownerDocument, layer, palette(), index);
        }));
      }
      return cityCache.get(theme);
    }

    function getTextures() {
      if (!textureCache.has(theme)) {
        const colors = palette();
        const grainSurface = createGrainSurface(ownerDocument, colors, hashNumber(theme.length * 731 + 91));
        const charcoalSurface = createCharcoalSurface(ownerDocument, colors, hashNumber(theme.length * 997 + 37));
        textureCache.set(theme, {
          grain: context.createPattern(grainSurface, "repeat"),
          charcoal: context.createPattern(charcoalSurface, "repeat"),
          grainSurface,
          charcoalSurface
        });
      }
      return textureCache.get(theme);
    }

    function resize(width, height, dpr) {
      if (destroyed) {
        return renderer;
      }

      cssWidth = Math.max(1, finite(width, canvas.clientWidth || WORLD_WIDTH));
      cssHeight = Math.max(1, finite(height, canvas.clientHeight || WORLD_HEIGHT));
      pixelRatio = clamp(finite(dpr, global.devicePixelRatio || 1), 1, 2);
      scaleX = cssWidth / WORLD_WIDTH;
      scaleY = cssHeight / WORLD_HEIGHT;
      radiusScale = Math.sqrt(scaleX * scaleY);

      const bitmapWidth = Math.max(1, Math.round(cssWidth * pixelRatio));
      const bitmapHeight = Math.max(1, Math.round(cssHeight * pixelRatio));
      if (canvas.width !== bitmapWidth) {
        canvas.width = bitmapWidth;
      }
      if (canvas.height !== bitmapHeight) {
        canvas.height = bitmapHeight;
      }
      canvas.style.width = cssWidth + "px";
      canvas.style.height = cssHeight + "px";
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.imageSmoothingEnabled = true;
      return renderer;
    }

    function setTheme(nextTheme) {
      if (Object.prototype.hasOwnProperty.call(PALETTES, nextTheme)) {
        theme = nextTheme;
      }
      return renderer;
    }

    function setReducedMotion(nextReducedMotion) {
      const nextValue = Boolean(nextReducedMotion);
      if (nextValue && !reducedMotion) {
        frozenTime = lastDrawTime;
        frozenDistance = lastDistance;
        particles.length = 0;
        rings.length = 0;
        pendingEvents.length = 0;
        shakeStart = 0;
        shakeEnd = 0;
        shakeMagnitude = 0;
      }
      reducedMotion = nextValue;
      return renderer;
    }

    function setGrain(nextGrain) {
      grainEnabled = Boolean(nextGrain);
      return renderer;
    }

    function handleEvents(events) {
      if (destroyed || events == null) {
        return renderer;
      }

      let list;
      if (Array.isArray(events)) {
        list = events;
      } else if (Array.isArray(events.events)) {
        list = events.events;
      } else {
        list = [events];
      }

      list.forEach(function queueEvent(event) {
        if (event == null) {
          return;
        }
        pendingEvents.push(event);
      });

      if (pendingEvents.length > 64) {
        pendingEvents.splice(0, pendingEvents.length - 64);
      }
      return renderer;
    }

    function eventPosition(event, snapshot) {
      const fallbackPlayer = snapshot && snapshot.player ? snapshot.player : { x: 265, y: 300 };
      const position = event && typeof event === "object" ? event.position || event.coin || event.player || event : {};
      return {
        x: finite(position.x, finite(fallbackPlayer.x, 265)),
        y: finite(position.y, finite(fallbackPlayer.y, 300))
      };
    }

    function eventType(event) {
      if (typeof event === "string") {
        return event.toLowerCase();
      }
      if (!event || typeof event !== "object") {
        return "";
      }
      return String(event.type || event.kind || event.name || "").toLowerCase();
    }

    function pushParticle(particle) {
      particles.push(particle);
      if (particles.length > MAX_PARTICLES) {
        particles.splice(0, particles.length - MAX_PARTICLES);
      }
    }

    function pushRing(ring) {
      rings.push(ring);
      if (rings.length > MAX_RINGS) {
        rings.splice(0, rings.length - MAX_RINGS);
      }
    }

    function burst(position, birth, options) {
      const random = mulberry32(hashNumber(eventSequence * 193 + options.seed));
      for (let index = 0; index < options.count; index += 1) {
        const angle = range(random, options.angleStart, options.angleEnd);
        const speed = range(random, options.minSpeed, options.maxSpeed);
        pushParticle({
          x: position.x + range(random, -3, 3),
          y: position.y + range(random, -3, 3),
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          gravity: options.gravity,
          birth,
          duration: range(random, options.minLife, options.maxLife),
          size: range(random, options.minSize, options.maxSize),
          color: options.colors[index % options.colors.length],
          shape: options.shapes[index % options.shapes.length],
          rotation: random() * TAU,
          spin: range(random, -7, 7)
        });
      }
    }

    function processEvents(snapshot, time) {
      if (reducedMotion) {
        pendingEvents.length = 0;
        return;
      }

      while (pendingEvents.length) {
        const event = pendingEvents.shift();
        const type = eventType(event);
        const position = eventPosition(event, snapshot);
        const suppliedTime = event && typeof event === "object" ? event.timeMs : null;
        const birth = clamp(finite(suppliedTime, time), time - 120, time + 16);
        eventSequence += 1;

        if (/coin|collect|cent|penny/.test(type)) {
          burst(position, birth, {
            seed: 17,
            count: 14,
            angleStart: -Math.PI,
            angleEnd: Math.PI,
            minSpeed: 72,
            maxSpeed: 190,
            gravity: 120,
            minLife: 330,
            maxLife: 620,
            minSize: 2.5,
            maxSize: 6.4,
            colors: ["copperLight", "copper", "chalk"],
            shapes: ["disc", "dash", "disc"]
          });
          pushRing({ x: position.x, y: position.y, birth, duration: 430, start: 12, end: 72, color: "copperLight", width: 4 });
        } else if (/eight|combo|milestone|complete/.test(type)) {
          burst(position, birth, {
            seed: 83,
            count: 34,
            angleStart: -Math.PI,
            angleEnd: Math.PI,
            minSpeed: 105,
            maxSpeed: 315,
            gravity: 155,
            minLife: 480,
            maxLife: 900,
            minSize: 3,
            maxSize: 8,
            colors: ["vermilion", "copperLight", "chalk", "copper"],
            shapes: ["shard", "dash", "disc"]
          });
          pushRing({ x: position.x, y: position.y, birth, duration: 690, start: 18, end: 150, color: "vermilion", width: 6 });
          pushRing({ x: position.x, y: position.y, birth: birth + 90, duration: 720, start: 14, end: 190, color: "copperLight", width: 3 });
        } else if (/hit|collision|crash|gameover|game-over|dead/.test(type)) {
          burst(position, birth, {
            seed: 131,
            count: 28,
            angleStart: -Math.PI,
            angleEnd: Math.PI,
            minSpeed: 85,
            maxSpeed: 270,
            gravity: 260,
            minLife: 420,
            maxLife: 850,
            minSize: 3,
            maxSize: 10,
            colors: ["ink", "charcoalSoft", "vermilionDark"],
            shapes: ["shard", "dash"]
          });
          pushRing({ x: position.x, y: position.y, birth, duration: 360, start: 9, end: 88, color: "ink", width: 6 });
          shakeStart = birth;
          shakeEnd = birth + 330;
          shakeMagnitude = 11;
        } else if (/flap|jump|thrust|tap/.test(type)) {
          const trailPosition = { x: position.x - 24, y: position.y + 7 };
          burst(trailPosition, birth, {
            seed: 211,
            count: 7,
            angleStart: Math.PI * 0.72,
            angleEnd: Math.PI * 1.28,
            minSpeed: 55,
            maxSpeed: 145,
            gravity: 25,
            minLife: 240,
            maxLife: 430,
            minSize: 2,
            maxSize: 5,
            colors: ["vermilion", "paperBright", "charcoalSoft"],
            shapes: ["dash", "disc"]
          });
        } else if (/start|restart|ready/.test(type)) {
          pushRing({ x: position.x, y: position.y, birth, duration: 600, start: 20, end: 108, color: "vermilion", width: 4 });
        }
      }
    }

    function drawSky(colors, distance, time) {
      const sky = context.createLinearGradient(0, 0, 0, cssHeight);
      sky.addColorStop(0, colors.paperBright);
      sky.addColorStop(0.66, colors.paper);
      sky.addColorStop(1, colors.paperShadow);
      context.fillStyle = sky;
      context.fillRect(-16, -16, cssWidth + 32, cssHeight + 32);

      const motionDistance = reducedMotion ? frozenDistance : distance;
      const sunX = mapX(790 - modulo(motionDistance * 0.012, 120));
      const sunY = mapY(theme === "night" ? 126 : 142);
      const sunRadius = mapRadius(theme === "night" ? 61 : 82);

      context.save();
      context.globalAlpha = theme === "night" ? 0.66 : 0.2;
      context.fillStyle = theme === "night" ? colors.chalk : colors.copperLight;
      context.beginPath();
      context.arc(sunX, sunY, sunRadius, 0, TAU);
      context.fill();
      context.globalAlpha = theme === "night" ? 0.46 : 0.3;
      context.strokeStyle = theme === "night" ? colors.copperLight : colors.ink;
      context.lineWidth = 1.25;
      context.setLineDash([mapRadius(5), mapRadius(7)]);
      context.beginPath();
      context.arc(sunX, sunY, sunRadius + mapRadius(13), 0, TAU);
      context.stroke();
      context.setLineDash([]);

      if (theme !== "night") {
        context.globalAlpha = 0.09;
        context.strokeStyle = colors.ink;
        for (let index = -4; index <= 4; index += 1) {
          const y = sunY + index * mapRadius(13);
          const chord = Math.sqrt(Math.max(0, sunRadius * sunRadius - Math.pow(index * mapRadius(13), 2)));
          context.beginPath();
          context.moveTo(sunX - chord, y);
          context.lineTo(sunX + chord, y);
          context.stroke();
        }
      }
      context.restore();

      const surfaces = getCitySurfaces();
      CITY_LAYERS.forEach(function drawLayer(layer, index) {
        const surface = surfaces[index];
        const offset = modulo(motionDistance * layer.speed, layer.span);
        const destinationWidth = layer.span * scaleX;
        let drawX = -offset * scaleX - destinationWidth;

        context.save();
        context.globalAlpha = index === 0 ? 0.76 : index === 1 ? 0.88 : 0.96;
        while (drawX < cssWidth + destinationWidth) {
          context.drawImage(surface, drawX, 0, destinationWidth, cssHeight);
          drawX += destinationWidth;
        }
        context.restore();
      });

      context.save();
      context.globalAlpha = theme === "night" ? 0.34 : 0.17;
      context.strokeStyle = colors.ink;
      context.lineWidth = 1;
      const horizon = mapY(515);
      context.beginPath();
      context.moveTo(0, horizon);
      context.bezierCurveTo(cssWidth * 0.28, horizon - 2, cssWidth * 0.65, horizon + 3, cssWidth, horizon - 1);
      context.stroke();
      context.restore();

      if (!reducedMotion) {
        drawAmbientDust(colors, distance, time);
      }
    }

    function drawAmbientDust(colors, distance, time) {
      context.save();
      context.fillStyle = theme === "night" ? colors.chalk : colors.charcoal;
      ambientDust.forEach(function drawMote(mote, index) {
        const x = modulo(mote.x - distance * 0.035 - time * 0.001 * mote.speed, WORLD_WIDTH);
        const y = mote.y + Math.sin(time * 0.00055 * mote.drift + mote.phase) * 9;
        context.globalAlpha = 0.08 + (index % 4) * 0.018;
        context.save();
        context.translate(mapX(x), mapY(y));
        context.rotate(mote.phase + time * 0.00008);
        context.fillRect(-mapRadius(mote.size * 2), -mapRadius(0.45), mapRadius(mote.size * 4), Math.max(0.7, mapRadius(0.9)));
        context.restore();
      });
      context.restore();
    }

    function obstacleSeed(obstacle, index) {
      const gapCenter = Number.isFinite(obstacle.gapCenter)
        ? obstacle.gapCenter
        : Number.isFinite(obstacle.gapY)
          ? obstacle.gapY
          : Number.isFinite(obstacle.gapTop) && Number.isFinite(obstacle.gapBottom)
            ? (obstacle.gapTop + obstacle.gapBottom) * 0.5
            : 300;
      return hashNumber(
        Math.round(gapCenter * 17) +
        Math.round(finite(obstacle.width, 94) * 29) +
        Math.round(finite(obstacle.coin && obstacle.coin.y, 0) * 7) +
        index * 131
      );
    }

    function edgeProfile(seed, direction) {
      const random = mulberry32(seed);
      const points = [];
      const count = 7;
      for (let index = 0; index < count; index += 1) {
        const t = index / (count - 1);
        const inward = index === 0 || index === count - 1 ? range(random, 1, 5) : range(random, 0, 14);
        points.push({ t, inward: inward * direction });
      }
      return points;
    }

    function traceRuinColumn(x, width, boundary, side, seed) {
      const left = mapX(x);
      const right = mapX(x + width);
      const boundaryY = mapY(boundary);
      const edge = edgeProfile(seed, side === "top" ? -1 : 1);

      context.beginPath();
      if (side === "top") {
        context.moveTo(left, -18);
        context.lineTo(right, -18);
        context.lineTo(right, boundaryY + mapY(edge[edge.length - 1].inward));
        for (let index = edge.length - 2; index >= 0; index -= 1) {
          context.lineTo(lerp(left, right, edge[index].t), boundaryY + mapY(edge[index].inward));
        }
        context.lineTo(left, -18);
      } else {
        context.moveTo(left, boundaryY + mapY(edge[0].inward));
        for (let index = 1; index < edge.length; index += 1) {
          context.lineTo(lerp(left, right, edge[index].t), boundaryY + mapY(edge[index].inward));
        }
        context.lineTo(right, cssHeight + 18);
        context.lineTo(left, cssHeight + 18);
        context.closePath();
      }
      context.closePath();
    }

    function drawFacadeDetails(x, width, startY, endY, side, seed, colors) {
      const random = mulberry32(seed ^ 0x92821);
      const height = endY - startY;
      if (height <= 24) {
        return;
      }

      context.save();
      context.globalAlpha = 0.32;
      context.fillStyle = colors.charcoalSoft;
      context.fillRect(mapX(x + width * 0.12), mapY(startY), Math.max(2, mapX(width * 0.07)), mapY(height));
      context.fillRect(mapX(x + width * 0.73), mapY(startY), Math.max(2, mapX(width * 0.04)), mapY(height));

      const rows = Math.floor(height / 78);
      for (let row = 0; row < rows; row += 1) {
        if (random() > 0.77) {
          continue;
        }
        const y = side === "top" ? endY - 42 - row * 70 : startY + 30 + row * 70;
        if (y < startY + 7 || y > endY - 17) {
          continue;
        }
        const windowX = x + width * range(random, 0.28, 0.58);
        const windowWidth = width * range(random, 0.18, 0.31);
        context.globalAlpha = 0.55;
        context.fillStyle = colors.paperShadow;
        context.fillRect(mapX(windowX), mapY(y), mapX(windowWidth), Math.max(5, mapY(range(random, 10, 18))));
        context.globalAlpha = 0.36;
        context.strokeStyle = colors.ink;
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(mapX(windowX + windowWidth * 0.5), mapY(y));
        context.lineTo(mapX(windowX + windowWidth * 0.5), mapY(y + 18));
        context.stroke();
      }

      context.globalAlpha = 0.48;
      context.strokeStyle = colors.paperShadow;
      context.lineWidth = 1.35;
      const crackCount = Math.max(2, Math.floor(height / 150));
      for (let index = 0; index < crackCount; index += 1) {
        const crackX = x + width * range(random, 0.24, 0.78);
        const crackY = range(random, startY + 16, endY - 34);
        context.beginPath();
        context.moveTo(mapX(crackX), mapY(crackY));
        context.lineTo(mapX(crackX + range(random, -9, 9)), mapY(crackY + 15));
        context.lineTo(mapX(crackX + range(random, -13, 13)), mapY(crackY + 31));
        context.stroke();
      }
      context.restore();
    }

    function drawRubbleEdge(x, width, boundary, side, seed, colors) {
      const random = mulberry32(seed ^ 0x71337);
      const direction = side === "top" ? -1 : 1;
      context.save();
      context.fillStyle = colors.paperShadow;
      context.strokeStyle = colors.ink;
      context.lineWidth = 1.1;
      for (let index = 0; index < 5; index += 1) {
        const centerX = x + width * range(random, 0.09, 0.91);
        const centerY = boundary + direction * range(random, 3, 11);
        const size = range(random, 3, 8);
        context.beginPath();
        context.moveTo(mapX(centerX - size), mapY(centerY));
        context.lineTo(mapX(centerX - size * 0.15), mapY(centerY + direction * size));
        context.lineTo(mapX(centerX + size), mapY(centerY + direction * 0.2 * size));
        context.closePath();
        context.fill();
        context.stroke();
      }
      context.restore();
    }

    function drawObstacle(obstacle, index, colors) {
      const x = finite(obstacle.x, WORLD_WIDTH + 200);
      const width = clamp(finite(obstacle.width, 96), 26, 240);
      const gapSize = clamp(finite(obstacle.gapSize, 186), 40, WORLD_HEIGHT);
      const fallbackGapCenter = WORLD_HEIGHT * 0.5;
      const gapCenter = Number.isFinite(obstacle.gapCenter)
        ? obstacle.gapCenter
        : Number.isFinite(obstacle.gapY)
          ? obstacle.gapY
          : Number.isFinite(obstacle.gapTop) && Number.isFinite(obstacle.gapBottom)
            ? (obstacle.gapTop + obstacle.gapBottom) * 0.5
            : fallbackGapCenter;
      const gapY = clamp(gapCenter, 0, WORLD_HEIGHT);
      const gapTop = clamp(
        Number.isFinite(obstacle.gapTop) ? obstacle.gapTop : gapY - gapSize * 0.5,
        0,
        WORLD_HEIGHT
      );
      const gapBottom = clamp(
        Number.isFinite(obstacle.gapBottom) ? obstacle.gapBottom : gapY + gapSize * 0.5,
        0,
        WORLD_HEIGHT
      );

      if (x + width < -80 || x > WORLD_WIDTH + 80) {
        return;
      }

      const seed = obstacleSeed(obstacle, index);
      const texture = getTextures().charcoal;
      const pieces = [
        { side: "top", boundary: gapTop, start: 0, end: gapTop, seed },
        { side: "bottom", boundary: gapBottom, start: gapBottom, end: WORLD_HEIGHT, seed: seed ^ 0x44312 }
      ];

      pieces.forEach(function drawPiece(piece) {
        traceRuinColumn(x, width, piece.boundary, piece.side, piece.seed);
        context.fillStyle = colors.charcoal;
        context.fill();

        context.save();
        traceRuinColumn(x, width, piece.boundary, piece.side, piece.seed);
        context.clip();
        context.globalAlpha = theme === "night" ? 0.22 : 0.34;
        context.fillStyle = texture || colors.charcoalSoft;
        context.fillRect(mapX(x), mapY(piece.start), mapX(width), mapY(piece.end - piece.start));
        context.restore();

        traceRuinColumn(x, width, piece.boundary, piece.side, piece.seed);
        context.strokeStyle = colors.ink;
        context.lineWidth = Math.max(2.1, mapRadius(2.3));
        context.lineJoin = "bevel";
        context.stroke();

        drawFacadeDetails(x, width, piece.start, piece.end, piece.side, piece.seed, colors);
        drawRubbleEdge(x, width, piece.boundary, piece.side, piece.seed, colors);
      });

      context.save();
      context.strokeStyle = colors.copper;
      context.globalAlpha = 0.72;
      context.lineWidth = Math.max(1.5, mapRadius(1.8));
      const braceX = x + width * 0.86;
      context.beginPath();
      context.moveTo(mapX(braceX), mapY(Math.max(0, gapTop - 72)));
      context.lineTo(mapX(braceX), mapY(Math.max(0, gapTop - 10)));
      context.moveTo(mapX(braceX), mapY(Math.min(WORLD_HEIGHT, gapBottom + 10)));
      context.lineTo(mapX(braceX), mapY(Math.min(WORLD_HEIGHT, gapBottom + 78)));
      context.stroke();
      context.restore();
    }

    function drawCoin(coin, time, index, colors) {
      if (!coin || coin.collected) {
        return;
      }
      const x = finite(coin.x, WORLD_WIDTH + 100);
      const y = finite(coin.y, WORLD_HEIGHT * 0.5);
      const radius = clamp(finite(coin.radius, 17), 7, 44);
      if (x + radius < -30 || x - radius > WORLD_WIDTH + 30) {
        return;
      }

      const cx = mapX(x);
      const cy = mapY(y);
      const drawRadius = mapRadius(radius);
      const sheen = reducedMotion ? -0.3 : Math.sin(time * 0.006 + index * 1.73) * 0.52;

      context.save();
      context.translate(cx, cy);
      context.fillStyle = colors.ink;
      context.globalAlpha = 0.5;
      context.beginPath();
      context.arc(mapRadius(2.8), mapRadius(3.6), drawRadius + mapRadius(1.5), 0, TAU);
      context.fill();
      context.globalAlpha = 1;

      context.fillStyle = colors.copper;
      context.strokeStyle = colors.ink;
      context.lineWidth = Math.max(1.7, mapRadius(2));
      context.beginPath();
      context.arc(0, 0, drawRadius, 0, TAU);
      context.fill();
      context.stroke();

      context.strokeStyle = colors.copperLight;
      context.globalAlpha = 0.72;
      context.lineWidth = Math.max(1, mapRadius(1.2));
      context.beginPath();
      context.arc(0, 0, drawRadius * 0.7, 0, TAU);
      context.stroke();

      context.strokeStyle = colors.ink;
      context.globalAlpha = 0.6;
      context.lineWidth = Math.max(1, mapRadius(1.05));
      for (let tick = 0; tick < 8; tick += 1) {
        const angle = tick * TAU / 8;
        context.beginPath();
        context.moveTo(Math.cos(angle) * drawRadius * 0.73, Math.sin(angle) * drawRadius * 0.73);
        context.lineTo(Math.cos(angle) * drawRadius * 0.9, Math.sin(angle) * drawRadius * 0.9);
        context.stroke();
      }

      context.globalAlpha = 0.9;
      context.fillStyle = colors.ink;
      context.beginPath();
      context.ellipse(0, 0, drawRadius * 0.13, drawRadius * 0.4, -0.12, 0, TAU);
      context.fill();

      context.globalAlpha = 0.72;
      context.strokeStyle = colors.chalk;
      context.lineWidth = Math.max(1.2, mapRadius(1.6));
      context.beginPath();
      context.arc(sheen * drawRadius * 0.55, -drawRadius * 0.22, drawRadius * 0.52, Math.PI * 1.08, Math.PI * 1.68);
      context.stroke();
      context.restore();
    }

    function drawFlightTrail(player, state, time, colors) {
      if (reducedMotion || !/play|run|active/i.test(String(state || ""))) {
        return;
      }

      const x = finite(player.x, 265);
      const y = finite(player.y, 300);
      const radius = finite(player.radius, 29);
      const pulse = Math.sin(time * 0.012);

      context.save();
      context.lineCap = "round";
      for (let index = 0; index < 3; index += 1) {
        context.globalAlpha = 0.21 - index * 0.045;
        context.strokeStyle = index === 1 ? colors.copper : colors.vermilion;
        context.lineWidth = Math.max(1.2, mapRadius(3.4 - index * 0.7));
        context.beginPath();
        context.moveTo(mapX(x - radius * 0.62), mapY(y + radius * (0.16 + index * 0.14)));
        context.bezierCurveTo(
          mapX(x - radius * (1.2 + index * 0.42)),
          mapY(y + pulse * (3 + index * 2)),
          mapX(x - radius * (2.2 + index * 0.48)),
          mapY(y + Math.sin(time * 0.009 + index) * 8),
          mapX(x - radius * (2.8 + index * 0.55)),
          mapY(y + index * 4)
        );
        context.stroke();
      }
      context.restore();
    }

    function drawNoteShape(radius, colors, failed) {
      context.lineJoin = "round";
      context.lineCap = "round";
      context.fillStyle = failed ? colors.charcoalSoft : colors.vermilion;
      context.strokeStyle = colors.ink;
      context.lineWidth = Math.max(2.2, radius * 0.085);

      context.beginPath();
      context.ellipse(-radius * 0.2, radius * 0.29, radius * 0.44, radius * 0.31, -0.24, 0, TAU);
      context.fill();
      context.stroke();

      context.beginPath();
      context.moveTo(radius * 0.12, radius * 0.25);
      context.lineTo(radius * 0.12, -radius * 0.67);
      context.lineTo(radius * 0.32, -radius * 0.67);
      context.lineTo(radius * 0.32, radius * 0.18);
      context.closePath();
      context.fill();
      context.stroke();

      context.beginPath();
      context.moveTo(radius * 0.22, -radius * 0.64);
      context.bezierCurveTo(radius * 0.75, -radius * 0.54, radius * 0.82, -radius * 0.08, radius * 0.39, radius * 0.08);
      context.bezierCurveTo(radius * 0.57, -radius * 0.17, radius * 0.42, -radius * 0.31, radius * 0.22, -radius * 0.34);
      context.closePath();
      context.fill();
      context.stroke();

      context.fillStyle = colors.chalk;
      context.globalAlpha = failed ? 0.28 : 0.72;
      context.beginPath();
      context.ellipse(-radius * 0.32, radius * 0.19, radius * 0.12, radius * 0.07, -0.3, 0, TAU);
      context.fill();
      context.globalAlpha = 1;

      if (failed) {
        context.strokeStyle = colors.paper;
        context.globalAlpha = 0.7;
        context.lineWidth = Math.max(1.2, radius * 0.05);
        context.beginPath();
        context.moveTo(-radius * 0.15, -radius * 0.08);
        context.lineTo(radius * 0.08, radius * 0.07);
        context.lineTo(-radius * 0.02, radius * 0.23);
        context.stroke();
        context.globalAlpha = 1;
      }
    }

    function drawPlayer(player, state, time, colors) {
      const x = finite(player.x, 265);
      const y = finite(player.y, 300);
      const velocity = finite(player.vy, 0);
      const worldRadius = clamp(finite(player.radius, 30), 12, 72);
      const radius = mapRadius(worldRadius);
      const tilt = clamp(velocity / 1150, -0.34, 0.48);
      const failed = /over|dead|crash|failed/i.test(String(state || ""));

      drawFlightTrail(player, state, time, colors);

      context.save();
      context.translate(mapX(x), mapY(y));

      context.globalAlpha = theme === "night" ? 0.44 : 0.28;
      context.strokeStyle = colors.chalk;
      context.lineWidth = Math.max(1.1, radius * 0.045);
      context.setLineDash([Math.max(2, radius * 0.12), Math.max(3, radius * 0.17)]);
      context.beginPath();
      context.arc(0, 0, radius, 0, TAU);
      context.stroke();
      context.setLineDash([]);

      context.rotate(tilt);
      context.save();
      context.translate(mapRadius(3.4), mapRadius(4.7));
      context.globalAlpha = 0.6;
      drawNoteShape(radius, {
        ink: colors.ink,
        vermilion: colors.ink,
        charcoalSoft: colors.ink,
        chalk: colors.ink,
        paper: colors.ink
      }, failed);
      context.restore();

      drawNoteShape(radius, colors, failed);
      context.restore();
    }

    function drawRings(time, colors) {
      for (let index = rings.length - 1; index >= 0; index -= 1) {
        const ring = rings[index];
        const progress = (time - ring.birth) / ring.duration;
        if (progress >= 1) {
          rings.splice(index, 1);
          continue;
        }
        if (progress < 0) {
          continue;
        }

        const eased = 1 - Math.pow(1 - progress, 3);
        const radius = mapRadius(lerp(ring.start, ring.end, eased));
        context.save();
        context.globalAlpha = Math.pow(1 - progress, 1.7) * 0.8;
        context.strokeStyle = colors[ring.color] || colors.chalk;
        context.lineWidth = Math.max(1, mapRadius(ring.width * (1 - progress * 0.55)));
        context.beginPath();
        context.arc(mapX(ring.x), mapY(ring.y), radius, 0, TAU);
        context.stroke();
        context.restore();
      }
    }

    function drawParticles(time, colors) {
      for (let index = particles.length - 1; index >= 0; index -= 1) {
        const particle = particles[index];
        const elapsed = time - particle.birth;
        const progress = elapsed / particle.duration;
        if (progress >= 1) {
          particles.splice(index, 1);
          continue;
        }
        if (progress < 0) {
          continue;
        }

        const seconds = elapsed / 1000;
        const x = particle.x + particle.vx * seconds;
        const y = particle.y + particle.vy * seconds + 0.5 * particle.gravity * seconds * seconds;
        const size = mapRadius(particle.size);
        context.save();
        context.translate(mapX(x), mapY(y));
        context.rotate(particle.rotation + particle.spin * seconds);
        context.globalAlpha = Math.pow(1 - progress, 1.8);
        context.fillStyle = colors[particle.color] || colors.chalk;

        if (particle.shape === "disc") {
          context.beginPath();
          context.arc(0, 0, size, 0, TAU);
          context.fill();
        } else if (particle.shape === "dash") {
          context.fillRect(-size * 1.7, -Math.max(0.8, size * 0.28), size * 3.4, Math.max(1, size * 0.56));
        } else {
          context.beginPath();
          context.moveTo(-size * 1.35, -size * 0.48);
          context.lineTo(size * 1.2, -size * 0.82);
          context.lineTo(size * 0.42, size * 1.25);
          context.closePath();
          context.fill();
        }
        context.restore();
      }
    }

    function drawGrain(colors) {
      if (!grainEnabled) {
        return;
      }
      const pattern = getTextures().grain;
      if (!pattern) {
        return;
      }
      context.save();
      context.globalAlpha = colors.grainAlpha;
      context.globalCompositeOperation = theme === "night" ? "screen" : "multiply";
      context.fillStyle = pattern;
      context.fillRect(0, 0, cssWidth, cssHeight);
      context.restore();
    }

    function drawEdgeWash(colors) {
      const vignette = context.createRadialGradient(
        cssWidth * 0.5,
        cssHeight * 0.45,
        Math.min(cssWidth, cssHeight) * 0.18,
        cssWidth * 0.5,
        cssHeight * 0.45,
        Math.max(cssWidth, cssHeight) * 0.74
      );
      vignette.addColorStop(0, "rgba(0,0,0,0)");
      vignette.addColorStop(1, theme === "night" ? "rgba(0,0,0,0.28)" : "rgba(23,22,20,0.12)");
      context.fillStyle = vignette;
      context.fillRect(0, 0, cssWidth, cssHeight);

      context.save();
      context.globalAlpha = theme === "night" ? 0.36 : 0.22;
      context.strokeStyle = colors.ink;
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(0, 1.5);
      context.bezierCurveTo(cssWidth * 0.25, 0, cssWidth * 0.7, 3, cssWidth, 1);
      context.moveTo(0, cssHeight - 1.5);
      context.bezierCurveTo(cssWidth * 0.28, cssHeight - 3, cssWidth * 0.68, cssHeight, cssWidth, cssHeight - 2);
      context.stroke();
      context.restore();
    }

    function shakeOffset(time) {
      if (reducedMotion || time < shakeStart || time > shakeEnd) {
        return { x: 0, y: 0 };
      }
      const progress = (time - shakeStart) / Math.max(1, shakeEnd - shakeStart);
      const strength = shakeMagnitude * Math.pow(1 - progress, 2);
      return {
        x: Math.sin(time * 0.091) * strength,
        y: Math.cos(time * 0.137) * strength * 0.62
      };
    }

    function draw(snapshot, timeMs) {
      if (destroyed) {
        return renderer;
      }

      const frame = snapshot && typeof snapshot === "object" ? snapshot : {};
      const time = finite(timeMs, lastDrawTime);
      const distance = finite(frame.distance, lastDistance);
      const player = frame.player && typeof frame.player === "object" ? frame.player : { x: 265, y: 300, vy: 0, radius: 30 };
      const obstacles = Array.isArray(frame.obstacles) ? frame.obstacles : [];
      const colors = palette();

      lastSnapshot = frame;
      lastDrawTime = time;
      lastDistance = distance;
      processEvents(frame, time);

      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.clearRect(0, 0, cssWidth, cssHeight);
      context.fillStyle = colors.paper;
      context.fillRect(0, 0, cssWidth, cssHeight);

      const shake = shakeOffset(time);
      context.save();
      context.translate(shake.x, shake.y);
      drawSky(colors, distance, reducedMotion ? frozenTime : time);

      obstacles.forEach(function drawObstacleAndCoin(obstacle, index) {
        if (!obstacle || typeof obstacle !== "object") {
          return;
        }
        drawObstacle(obstacle, index, colors);
      });

      obstacles.forEach(function drawObstacleCoin(obstacle, index) {
        if (obstacle && typeof obstacle === "object") {
          drawCoin(obstacle.coin, reducedMotion ? frozenTime : time, index, colors);
        }
      });

      if (!reducedMotion) {
        drawRings(time, colors);
      }
      drawPlayer(player, frame.state, reducedMotion ? frozenTime : time, colors);
      if (!reducedMotion) {
        drawParticles(time, colors);
      }
      context.restore();

      drawGrain(colors);
      drawEdgeWash(colors);
      return renderer;
    }

    function destroy() {
      if (destroyed) {
        return;
      }
      destroyed = true;
      particles.length = 0;
      rings.length = 0;
      pendingEvents.length = 0;
      lastSnapshot = null;

      cityCache.forEach(function releaseCity(surfaces) {
        surfaces.forEach(function releaseSurface(surface) {
          surface.width = 1;
          surface.height = 1;
        });
      });
      textureCache.forEach(function releaseTextures(textures) {
        textures.grainSurface.width = 1;
        textures.grainSurface.height = 1;
        textures.charcoalSurface.width = 1;
        textures.charcoalSurface.height = 1;
      });
      cityCache.clear();
      textureCache.clear();

      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, canvas.width, canvas.height);
    }

    const renderer = Object.freeze({
      resize,
      setTheme,
      setReducedMotion,
      setGrain,
      handleEvents,
      draw,
      destroy
    });

    resize(canvas.clientWidth || WORLD_WIDTH, canvas.clientHeight || WORLD_HEIGHT, global.devicePixelRatio || 1);
    return renderer;
  }

  const namespace = global.F8FQVisuals || {};
  namespace.create = createRenderer;
  global.F8FQVisuals = namespace;
})(window);
