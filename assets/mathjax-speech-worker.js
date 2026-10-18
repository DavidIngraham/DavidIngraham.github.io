/* Same-origin bootstrap for the pinned MathJax speech worker (no blob URL). */
self.maps = new URL('./vendor/mathjax-4.0.0/sre/mathmaps', self.location.href).href;
importScripts('./vendor/mathjax-4.0.0/sre/speech-worker.js');
