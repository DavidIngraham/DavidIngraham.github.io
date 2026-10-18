/* Preserve TeX through Markdown parsing; typeset only explicit math tokens. */
(() => {
  'use strict';
  const escape = text => text.replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
  const token = (name, level, pattern, start) => ({
    name, level, start,
    tokenizer(src) {
      const match = pattern.exec(src);
      if (match) return {type:name, raw:match[0], text:match[1] ?? match[2] ?? match[3], display:level === 'block'};
    },
    renderer(item) {
      const tag = item.display ? 'div' : 'span';
      return `<${tag} class="article-math" data-display="${item.display}">${escape(item.text)}</${tag}>${item.display ? '\n' : ''}`;
    }
  });
  marked.use({extensions:[
    token('displayMath', 'block', /^(?:\$\$\s*\n?([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|```math[^\S\n]*\n([\s\S]+?)\n```)[ \t]*(?:\n|$)/, src => src.search(/\$\$|\\\[|```math/)),
    token('inlineMath', 'inline', /^(?:\\\(([^\n]+?)\\\)|\$(?!\$|\s)((?:\\.|[^$\n])+?\S|[^\s$])\$(?!\d))/, src => src.search(/\\\(|\$(?!\s|\$)/))
  ]});

  let loading;
  function loadMathJax() {
    if (!loading) {
      loading = new Promise((resolve, reject) => {
        window.MathJax = {
          startup: {
            typeset: false,
            ready() {
              MathJax.startup.defaultReady();
              // MathJax 4.0.0 immediately revokes its speech-worker blob URL.
              // WebKit can fail to start that worker and leave tex2svgPromise
              // pending. Use an ordinary same-origin worker, retaining speech.
              MathJax.startup.adaptor.createWorker = async onmessage => {
                const worker = new Worker('/assets/mathjax-speech-worker.js');
                worker.onmessage = onmessage;
                return worker;
              };
            }
          },
          loader: {load: ['ui/safe'], paths: {mathjax: '/assets/vendor/mathjax-4.0.0'}},
          output: {fontPath: '/assets/vendor/mathjax-newcm-4.0.0'},
          svg: {fontCache: 'local'}
        };
        const script = document.createElement('script');
        const timeout = setTimeout(() => fail(new Error('MathJax loading timed out.')), 30000);
        function fail(error) {
          clearTimeout(timeout);
          script.remove();
          reject(error);
        }
        script.src = '/assets/vendor/mathjax-4.0.0/tex-svg.js';
        script.onload = () => {
          if (!window.MathJax.startup?.promise) {
            fail(new Error('MathJax did not initialize.'));
            return;
          }
          window.MathJax.startup.promise.then(() => {
            clearTimeout(timeout);
            resolve();
          }, fail);
        };
        script.onerror = () => fail(new Error('MathJax could not be loaded.'));
        document.head.append(script);
      }).catch(error => {
        loading = null; // A failed request must not permanently disable retries.
        throw error;
      });
    }
    return loading;
  }
  window.renderArticleMath = async article => {
    const equations = [...article.querySelectorAll('.article-math:not([data-rendered])')];
    if (!equations.length) return;
    article.querySelector('.math-load-error')?.remove();
    try {
      await loadMathJax();
      let failure;
      for (const equation of equations) {
        try {
          const output = await MathJax.tex2svgPromise(equation.textContent, {display:equation.dataset.display === 'true'});
          equation.replaceChildren(output);
          equation.dataset.rendered = 'true';
        } catch (error) {
          failure = error; // Continue rendering other equations.
        }
      }
      if (failure) throw failure;
    } catch (error) {
      const notice = document.createElement('p');
      notice.className = 'math-load-error';
      notice.setAttribute('role', 'status');
      notice.append('Equations could not finish loading. ');
      const retry = document.createElement('button');
      retry.type = 'button';
      retry.textContent = 'Retry equations';
      retry.onclick = () => {
        retry.disabled = true;
        void window.renderArticleMath(article);
      };
      notice.append(retry);
      article.prepend(notice);
      console.warn('Math rendering unavailable; retaining the TeX source.', error);
    }
  };
})();
