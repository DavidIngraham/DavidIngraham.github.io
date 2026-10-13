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
    if (!loading) loading = new Promise((resolve, reject) => {
      window.MathJax = {startup:{typeset:false}, loader:{load:['ui/safe']}, svg:{fontCache:'local'}};
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/mathjax@4.0.0/tex-svg.js';
      script.onload = () => window.MathJax.startup.promise.then(resolve, reject);
      script.onerror = () => reject(new Error('MathJax could not be loaded.'));
      document.head.append(script);
    });
    return loading;
  }
  window.renderArticleMath = async article => {
    const equations = [...article.querySelectorAll('.article-math')];
    if (!equations.length) return;
    try {
      await loadMathJax();
      for (const equation of equations) {
        const output = await MathJax.tex2svgPromise(equation.textContent, {display:equation.dataset.display === 'true'});
        equation.replaceChildren(output);
      }
    } catch (error) {
      console.warn('Math rendering unavailable; retaining the TeX source.', error);
    }
  };
})();
