Jitter Matters game
===================

*Jitter Matters: A Game for Reproducible EEG* shows how much information is
lost when technical jitter is introduced. Tap the button (or press Space) in a
steady rhythm. The jitter of your taps is estimated from the last ten
intervals, and the spectrogram of a 40 Hz auditory steady-state response
(ASSR) with the same amount of jitter is shown. The steadier your rhythm, the
clearer the 40 Hz response.

The slider scales your measured jitter: to the left towards a synchronized
setup, to the right your raw tapping.

.. raw:: html

   <link rel="stylesheet" href="_static/jittermatters/jittermatters.css">
   <div class="jittermatters" tabindex="0">
     <canvas class="jm-canvas"></canvas>
     <div class="jm-label">Your JITTER = 0 ms</div>
     <input class="jm-slider" type="range" min="0" max="1" step="0.01" value="0.5"
            aria-label="Jitter scaling">
     <div class="jm-scale"><span>&larr; Synchronized</span><span>Raw &rarr;</span></div>
     <button class="jm-tap" type="button">TAP HERE</button>
   </div>
   <script src="_static/jittermatters/tfr-data.js"></script>
   <script src="_static/jittermatters/jittermatters.js"></script>

The spectrograms were computed from ASSR recordings with simulated Gaussian
jitter of 0–10 ms (see :doc:`validation`). Jitter above 10 ms is shown as
10 ms. The original Kivy version of the game is available on
`GitHub <https://github.com/VlastaKoudelka/JitterMatters>`_.
