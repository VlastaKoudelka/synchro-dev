// JitterMatters: web port of the ASSR part of the Kivy game
// (https://github.com/VlastaKoudelka/JitterMatters).
// Tap in a steady rhythm; the jitter of your taps selects which simulated
// 40 Hz ASSR spectrogram is shown.
(function () {
  'use strict';

  var WIN_LENGTH = 10;       // number of intervals used to estimate jitter
  var MAX_JITTER = 10;       // highest jitter level in the data [ms]
  var UPSAMPLE = 8;          // bicubic upsampling factor of the spectrogram
  var BACKGROUND = '#fff';
  var FOREGROUND = '#404040';
  var X_TICKS = [[0, '-300'], [12, '0'], [24, '300'], [36, '600'], [48, '900']];
  var Y_TICKS = [[0, '150'], [10, '125'], [20, '100'], [30, '75'], [40, '50'], [50, '20']];

  // matplotlib 'seismic' colormap
  var SEISMIC = [[0, [0, 0, 0.3]], [0.25, [0, 0, 1]], [0.5, [1, 1, 1]],
                 [0.75, [1, 0, 0]], [1, [0.5, 0, 0]]];

  function buildLut() {
    var lut = new Uint8ClampedArray(256 * 3);
    for (var i = 0; i < 256; i++) {
      var v = i / 255, k = 0;
      while (k < SEISMIC.length - 2 && v > SEISMIC[k + 1][0]) k++;
      var a = SEISMIC[k], b = SEISMIC[k + 1];
      var t = (v - a[0]) / (b[0] - a[0]);
      for (var c = 0; c < 3; c++) {
        lut[i * 3 + c] = Math.round(255 * (a[1][c] + t * (b[1][c] - a[1][c])));
      }
    }
    return lut;
  }

  // Catmull-Rom weights mapping n source samples to n * factor output
  // samples (pixel-centre aligned, edges clamped)
  function cubicWeights(n, factor) {
    var out = [];
    for (var o = 0; o < n * factor; o++) {
      var src = (o + 0.5) / factor - 0.5;
      var i0 = Math.floor(src), t = src - i0;
      var t2 = t * t, t3 = t2 * t;
      out.push({
        idx: [i0 - 1, i0, i0 + 1, i0 + 2].map(function (i) {
          return Math.max(0, Math.min(n - 1, i));
        }),
        w: [(-t3 + 2 * t2 - t) / 2, (3 * t3 - 5 * t2 + 2) / 2,
            (-3 * t3 + 4 * t2 + t) / 2, (t3 - t2) / 2]
      });
    }
    return out;
  }

  function decode(b64) {
    var s = atob(b64), out = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
  }

  // population standard deviation, like numpy.std
  function std(values) {
    var mean = 0, sq = 0, i;
    for (i = 0; i < values.length; i++) mean += values[i];
    mean /= values.length;
    for (i = 0; i < values.length; i++) sq += (values[i] - mean) * (values[i] - mean);
    return Math.sqrt(sq / values.length);
  }

  function init(root) {
    var tfr = window.JM_TFR;
    var data = decode(tfr.data);
    var lut = buildLut();
    var frameSize = tfr.rows * tfr.cols;

    var canvas = root.querySelector('.jm-canvas');
    var label = root.querySelector('.jm-label');
    var slider = root.querySelector('.jm-slider');
    var tapButton = root.querySelector('.jm-tap');
    var ctx = canvas.getContext('2d');

    // offscreen canvas holding one spectrogram, bicubically upsampled
    var frame = document.createElement('canvas');
    frame.width = tfr.cols * UPSAMPLE;
    frame.height = tfr.rows * UPSAMPLE;
    var frameCtx = frame.getContext('2d');
    var frameImg = frameCtx.createImageData(frame.width, frame.height);
    var colWeights = cubicWeights(tfr.cols, UPSAMPLE);
    var rowWeights = cubicWeights(tfr.rows, UPSAMPLE);
    var tmp = new Float32Array(tfr.rows * frame.width);

    var elapsed = [];
    for (var i = 0; i < WIN_LENGTH; i++) elapsed.push(0);
    var lastTap = null;
    var instance = 0;
    var level = 0;

    function setFrame(jitterLevel, inst) {
      var offset = (jitterLevel * tfr.instances + inst) * frameSize;
      var outW = frame.width, outH = frame.height, cols = tfr.cols;
      var r, x, y, k, s, wt;
      // horizontal pass
      for (r = 0; r < tfr.rows; r++) {
        for (x = 0; x < outW; x++) {
          wt = colWeights[x];
          s = 0;
          for (k = 0; k < 4; k++) s += wt.w[k] * data[offset + r * cols + wt.idx[k]];
          tmp[r * outW + x] = s;
        }
      }
      // vertical pass and colour mapping
      var px = frameImg.data;
      for (y = 0; y < outH; y++) {
        wt = rowWeights[y];
        for (x = 0; x < outW; x++) {
          s = 0;
          for (k = 0; k < 4; k++) s += wt.w[k] * tmp[wt.idx[k] * outW + x];
          var v = Math.max(0, Math.min(255, Math.round(s))) * 3;
          var p = (y * outW + x) * 4;
          px[p] = lut[v];
          px[p + 1] = lut[v + 1];
          px[p + 2] = lut[v + 2];
          px[p + 3] = 255;
        }
      }
      frameCtx.putImageData(frameImg, 0, 0);
    }

    function draw() {
      var cssW = canvas.clientWidth;
      var fs = Math.max(10, Math.min(14, cssW / 40));
      var left = fs * 5, right = fs * 2, top = fs * 2.5, bottom = fs * 3.5;
      // keep square pixels, like matplotlib's imshow
      var w = cssW - left - right;
      var h = Math.round(w * tfr.rows / tfr.cols);
      var cssH = top + h + bottom;
      var dpr = window.devicePixelRatio || 1;
      if (canvas.width !== Math.round(cssW * dpr) || canvas.height !== Math.round(cssH * dpr)) {
        canvas.width = Math.round(cssW * dpr);
        canvas.height = Math.round(cssH * dpr);
        canvas.style.height = cssH + 'px';
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      ctx.fillStyle = BACKGROUND;
      ctx.fillRect(0, 0, cssW, cssH);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(frame, left, top, w, h);

      ctx.strokeStyle = FOREGROUND;
      ctx.fillStyle = FOREGROUND;
      ctx.lineWidth = 1;
      ctx.strokeRect(left + 0.5, top + 0.5, w - 1, h - 1);
      ctx.font = fs + 'px sans-serif';

      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      X_TICKS.forEach(function (t) {
        var x = left + (t[0] + 0.5) / tfr.cols * w;
        ctx.beginPath();
        ctx.moveTo(x, top + h);
        ctx.lineTo(x, top + h + 4);
        ctx.stroke();
        ctx.fillText(t[1], x, top + h + 6);
      });
      ctx.fillText('time [ms]', left + w / 2, top + h + fs * 2);

      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      Y_TICKS.forEach(function (t) {
        var y = top + (t[0] + 0.5) / tfr.rows * h;
        ctx.beginPath();
        ctx.moveTo(left, y);
        ctx.lineTo(left - 4, y);
        ctx.stroke();
        ctx.fillText(t[1], left - 6, y);
      });
      ctx.save();
      ctx.translate(fs * 1.2, top + h / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.fillText('frequency [Hz]', 0, 0);
      ctx.restore();

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold ' + (fs * 1.1) + 'px sans-serif';
      ctx.fillText('ASSR 40 Hz ERP spectrogram', left + w / 2, top / 2);
    }

    function tap() {
      var now = performance.now();
      if (lastTap !== null) {
        elapsed.pop();
        elapsed.unshift(now - lastTap);
      }
      lastTap = now;

      var jitter = Math.floor(Math.floor(std(elapsed) / Math.SQRT2) * slider.value);
      label.textContent = jitter === 0 ? 'Synchronized!' : 'Jitter = ' + jitter + ' ms';

      level = Math.min(jitter, MAX_JITTER);
      instance = (instance + tfr.instances - 1) % tfr.instances;
      setFrame(level, instance);
      draw();
    }

    tapButton.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      tap();
    });
    // keyboard: Space or Enter while the game has focus
    root.addEventListener('keydown', function (e) {
      if ((e.key === ' ' || e.key === 'Enter') && !e.repeat && e.target !== slider) {
        e.preventDefault();
        tap();
      }
    });
    window.addEventListener('resize', draw);

    setFrame(0, 0);
    draw();
  }

  function start() {
    var roots = document.querySelectorAll('.jittermatters');
    for (var i = 0; i < roots.length; i++) init(roots[i]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
