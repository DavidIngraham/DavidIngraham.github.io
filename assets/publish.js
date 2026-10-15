/* Manifest-driven project index and Markdown reader. Source content stays in its repository. */
(() => {
  'use strict';
  const main = document.querySelector('#main');
  const esc = (value) => String(value).replace(/[&<>"']/g, char => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[char]));
  const encodePath = path => path.split('/').map(encodeURIComponent).join('/');
  const rawUrl = (collection, path) => `https://raw.githubusercontent.com/${collection.repository}/${encodeURIComponent(collection.ref)}/${encodePath(path)}`;
  const markdownUrl = (collection, path) => collection.content_base ? new URL(encodePath(path), collection.content_base).href : rawUrl(collection, path);
  const sourceUrl = (collection, path) => `https://github.com/${collection.repository}/blob/${encodeURIComponent(collection.ref)}/${encodePath(path)}`;
  const collectionUrl = collection => collection.url || `/research/?collection=${encodeURIComponent(collection.id)}`;
  const pageUrl = (collection, page) => `/research/?collection=${encodeURIComponent(collection.id)}&article=${encodeURIComponent(page.id)}`;
  const card = (title, tag, description, url, label) => `<article class="card"><span class="tag">${esc(tag)}</span><h3><a href="${esc(url)}">${esc(title)}</a></h3><p>${esc(description)}</p><a class="link" href="${esc(url)}">${esc(label)}</a></article>`;

  function articleNavigation(collection, page) {
    // Reference pages remain deep-linkable without entering the chapter sequence.
    const chapters = collection.pages.filter(candidate => !candidate.hidden);
    const index = chapters.findIndex(candidate => candidate.id === page.id);
    const previous = index > 0 ? chapters[index - 1] : null;
    const next = index >= 0 ? chapters[index + 1] : chapters[0];
    const link = (target, label, rel) => `<a class="article-step" rel="${rel}" href="${esc(pageUrl(collection, target))}"><span>${label}</span><strong>${esc(target.title)}</strong></a>`;
    return {
      top: `<nav class="article-sequence" aria-label="Article sequence">${previous ? link(previous, '← Previous article', 'prev') : `<span class="article-sequence-end">${index === 0 ? 'First article' : 'Reference page'}</span>`}<a class="article-series-link" href="${esc(collectionUrl(collection))}">All articles</a>${next ? link(next, index < 0 ? 'Start the series →' : 'Next article →', 'next') : '<span class="article-sequence-end">Last article</span>'}</nav>`,
      bottom: `<nav class="article-continue" aria-label="Continue reading">${next ? link(next, index < 0 ? 'Start the series →' : 'Next article →', 'next') : `<p>You’ve reached the end of this series.</p><a href="${esc(collectionUrl(collection))}">Return to all articles →</a>`}</nav>`,
    };
  }

  function projectIndex(collection, page) {
    const canonical = collection.pages.find(item => !item.hidden && item.path === page?.path) || page;
    const groups = collection.navigation || [{title: 'Articles', pages: collection.pages.filter(item => !item.hidden).map(item => item.id)}];
    const rows = groups.map(group => `<li class="project-group"><span>${esc(group.title)}</span><ul>${group.pages.map(id => {
      const target = collection.pages.find(item => item.id === id);
      const active = target.id === canonical?.id;
      return `<li><a href="${esc(pageUrl(collection, target))}"${active ? ' aria-current="page"' : ''}>${esc(target.nav_title || target.title)}</a></li>`;
    }).join('')}</ul></li>`).join('');
    return `<aside class="project-index"><details open><summary>Project index <span>${esc(collection.title)}</span></summary><nav aria-label="Project index"><a class="project-overview" href="${esc(collectionUrl(collection))}"${!page ? ' aria-current="page"' : ''}>${esc(collection.title)} overview</a><ul>${rows}</ul></nav></details></aside>`;
  }

  function mountProjectIndex(collection, page) {
    main.classList.add('project-reader');
    const content = document.createElement('div'); content.className = 'project-content';
    content.append(...main.childNodes);
    main.append(content);
    main.insertAdjacentHTML('afterbegin', projectIndex(collection, page));
    const details = main.querySelector('.project-index details');
    const narrow = window.matchMedia('(max-width: 1000px)');
    const adapt = () => { details.open = !narrow.matches; };
    adapt(); narrow.addEventListener('change', adapt);
    const active = details.querySelector('[aria-current="page"]');
    if (active && !narrow.matches && active.offsetTop > details.clientHeight - 60) details.scrollTop = Math.max(0, active.offsetTop - details.clientHeight / 2);
  }

  function validate(manifest) {
    if (manifest.version !== 1 || !Array.isArray(manifest.collections) || !Array.isArray(manifest.projects)) throw new Error('Unsupported publishing manifest.');
    const ids = new Set();
    for (const collection of manifest.collections) {
      if (!/^[a-z0-9-]+$/.test(collection.id) || ids.has(collection.id)) throw new Error('Collection IDs must be unique URL slugs.');
      ids.add(collection.id);
      if (!/^[\w.-]+\/[\w.-]+$/.test(collection.repository) || !collection.ref || !Array.isArray(collection.pages)) throw new Error('Invalid collection source.');
      if (collection.url && (!collection.url.startsWith('/') || collection.url.startsWith('//'))) throw new Error('Collection URL must be a local path.');
      if (collection.content_base) {
        const base = new URL(collection.content_base);
        if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash || !base.pathname.endsWith('/')) throw new Error('Invalid rendered Markdown base.');
      }
      const pages = new Set();
      for (const page of collection.pages) {
        if (!/^[a-z0-9-]+$/.test(page.id) || pages.has(page.id) || !/\.md$/i.test(page.path) || page.path.startsWith('/') || page.path.split('/').some(p => p === '..' || !p)) throw new Error('Invalid article ID or Markdown path.');
        pages.add(page.id);
      }
      const indexed = new Set();
      for (const group of collection.navigation || []) {
        if (!group.title || !Array.isArray(group.pages)) throw new Error('Invalid project navigation group.');
        for (const id of group.pages) {
          if (!pages.has(id) || indexed.has(id) || collection.pages.find(page => page.id === id).redirect) throw new Error('Invalid project navigation article.');
          indexed.add(id);
        }
      }
      for (const link of collection.implementation_links || []) if (!/^https:\/\//.test(link.url)) throw new Error('Implementation links must use HTTPS.');
    }
    for (const project of manifest.projects) {
      if (project.collection ? !ids.has(project.collection) : !/^https:\/\//.test(project.url || '')) throw new Error('Invalid project destination.');
      if (project.article && !manifest.collections.find(item => item.id === project.collection)?.pages.some(page => page.id === project.article)) throw new Error('Invalid project article.');
    }
  }

  function renderProjects(manifest) {
    const grid = document.querySelector('#project-grid');
    if (!grid) return;
    grid.innerHTML = manifest.projects.map(project => {
      const collection = manifest.collections.find(item => item.id === project.collection);
      const article = collection?.pages.find(page => page.id === project.article);
      const destination = article ? pageUrl(collection, article) : collection ? collectionUrl(collection) : project.url;
      return card(project.title, project.tag, project.description, destination, project.link_label || 'Explore');
    }).join('');
  }

  function renderCollection(collection) {
    document.title = `${collection.title} — David Ingraham`;
    main.innerHTML = `<section class="hero research-intro"><div class="breadcrumbs"><a href="/">Home</a> / Research</div><div class="eyebrow">${esc(collection.title)}</div><h1>${esc(collection.heading || collection.title)}</h1>${(collection.intro || []).map((text, i) => `<p${i ? '' : ' class="lead"'}>${esc(text)}</p>`).join('')}</section><div class="grid research-cards">${collection.pages.filter(page => !page.hidden).map((page, i) => card(page.title, page.stage || `Article ${i + 1}`, page.description, pageUrl(collection, page), 'Read the article →')).join('')}</div><section class="article research-intro"><h2>Source and implementation</h2><p>These pages render from repository-authored Markdown in <a href="https://github.com/${esc(collection.repository)}">${esc(collection.repository)}</a>. Model views may be generated by that repository’s publishing workflow; source definitions and recorded evidence remain in the repository.</p><ul>${(collection.implementation_links || []).map(link => `<li><a href="${esc(link.url)}">${esc(link.label)}</a></li>`).join('')}</ul><p class="note">${esc(collection.note || '')}</p></section>`;
  }

  // Resolve repository-relative URLs before assigning them to DOM href/src properties.
  function resolveRepositoryLink(collection, page, target, image) {
    if (!target || target.startsWith('#')) return target;
    if (/^(https?:|mailto:|tel:|data:)/i.test(target) || target.startsWith('//')) return target;
    const base = new URL(`https://repository.invalid/${encodePath(page.path)}`);
    const resolved = new URL(target, base);
    const path = decodeURIComponent(resolved.pathname.slice(1));
    const article = collection.pages.find(candidate => candidate.path === path);
    if (!image && article) return pageUrl(collection, article) + resolved.hash;
    const url = image ? rawUrl(collection, path) : sourceUrl(collection, path);
    return url + resolved.search + resolved.hash;
  }

  async function renderDiagrams(article) {
    const blocks = [...article.querySelectorAll('pre > code.language-mermaid')];
    if (!blocks.length) return;
    try {
      const {default: mermaid} = await import('https://cdn.jsdelivr.net/npm/mermaid@11.16.1/dist/mermaid.esm.min.mjs');
      mermaid.initialize({startOnLoad: false, securityLevel: 'strict', maxTextSize: 1000000, maxEdges: 1000});
      for (const [index, block] of blocks.entries()) {
        try {
          const {svg} = await mermaid.render(`model-diagram-${index}`, block.textContent);
          const figure = document.createElement('figure'); figure.className = 'model-diagram';
          const controls = document.createElement('div'); controls.className = 'diagram-controls';
          const viewport = document.createElement('div'); viewport.className = 'diagram-viewport';
          viewport.tabIndex = 0; viewport.setAttribute('aria-label', 'Model diagram; scroll to explore');
          viewport.innerHTML = svg;
          figure.append(controls, viewport); block.parentElement.replaceWith(figure);
          const drawing = viewport.querySelector('svg');
          const width = drawing.viewBox.baseVal.width;
          const requirementThread = block.textContent.includes('%% source-node');
          let scale;
          const resize = next => {
            scale = Math.max(0.005, Math.min(3, next));
            drawing.style.maxWidth = 'none'; drawing.style.width = `${width * scale}px`;
            drawing.style.height = 'auto';
          };
          for (const [label, action] of [
            ['Zoom in', () => resize(scale * 1.5)], ['Zoom out', () => resize(scale / 1.5)],
            ['Fit', () => resize(viewport.clientWidth / width)], ['Actual size', () => resize(1)],
            ['Full screen', () => figure.requestFullscreen?.().catch(console.error)],
          ]) {
            const button = document.createElement('button'); button.type = 'button';
            button.textContent = label; button.addEventListener('click', action); controls.append(button);
          }
          if (!drawing.querySelector('title')) {
            const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
            title.id = `diagram-title-${index}`;
            title.textContent = 'Development plan: design, simulation and physical evidence';
            drawing.prepend(title); drawing.setAttribute('aria-labelledby', title.id);
            const desc = document.createElementNS('http://www.w3.org/2000/svg', 'desc');
            desc.id = title.id + '-description';
            desc.textContent = 'Read down the left from mission through criteria, subsystems and detail to build, then up the right through component and subsystem tests to vessel and mission validation. The virtual vessel checks requirements early and supplies physical test scenarios. Cross-V links pair intent with evidence.';
            drawing.prepend(desc); drawing.setAttribute('aria-describedby', desc.id);
          }
          drawing.setAttribute('role', 'img');
          const fit = () => {
            const fitted = Math.min(1, (viewport.clientWidth || article.clientWidth) / width);
            resize(requirementThread ? Math.max(0.9, fitted) : fitted);
            if (requirementThread) viewport.scrollLeft = Math.max(0, (width * scale - viewport.clientWidth) / 2);
          };
          fit();
          figure.closest('details')?.addEventListener('toggle', fit);
          window.addEventListener('resize', fit);
        } catch (error) {
          const warning = document.createElement('p'); warning.className = 'note';
          warning.textContent = 'Diagram could not render; its source is shown below.';
          block.parentElement.before(warning); console.error('Diagram:', error);
        }
      }
    } catch (error) {
      const warning = document.createElement('p'); warning.className = 'note';
      warning.textContent = 'Diagram renderer could not load; Mermaid source is shown instead.';
      blocks[0].parentElement.before(warning); console.error('Mermaid:', error);
    }
  }

  async function renderComparisons(article, collection) {
    for (const code of article.querySelectorAll('pre > code.language-model-comparison')) {
      const root=document.createElement('section');
      try {
        const config=JSON.parse(code.textContent);
        const url=new URL(config.src);
        const base=new URL(collection.content_base);
        const projectRoot=base.pathname.replace(/imports\/$/, '');
        if (url.origin!==base.origin || url.username || url.password || url.search || url.hash || !url.pathname.startsWith(projectRoot+'assets/') || !url.pathname.endsWith('/candidates.json')) throw Error('Invalid model comparison source');
        code.parentElement.replaceWith(root);
        const {renderComparison}=await import('/assets/model-comparison.js');
        await renderComparison(root,url.href);
      } catch(error) {
        root.textContent='The interactive model could not load. The fixed views below remain available.';
        root.className='note';code.parentElement?.replaceWith(root);console.error('Model comparison:',error);
      }
    }
  }

  async function renderDesignExplorers(article, collection) {
    for (const code of article.querySelectorAll('pre > code.language-design-explorer')) {
      const root = document.createElement('section');
      try {
        const config = JSON.parse(code.textContent), url = new URL(config.src);
        const base = new URL(collection.content_base);
        const expected = base.pathname.replace(/imports\/$/, '') + 'assets/design-explorer/design.json';
        if (url.origin !== base.origin || url.pathname !== expected || url.username || url.password || url.search || url.hash) throw Error('Invalid design explorer source');
        code.parentElement.replaceWith(root);
        const {renderExplorer} = await import('/assets/design-explorer.js');
        await renderExplorer(root, url.href);
      } catch (error) {
        root.className = 'note'; root.textContent = 'The interactive design explorer could not load. The sizing method and model inputs remain available in the repository.';
        code.parentElement?.replaceWith(root); console.error('Design explorer:', error);
      }
    }
  }

  async function renderRiskExplorers(article, collection) {
    for (const code of article.querySelectorAll('pre > code.language-risk-explorer')) {
      const root = document.createElement('section');
      try {
        const config = JSON.parse(code.textContent), url = new URL(config.src);
        const base = new URL(collection.content_base);
        const expected = base.pathname.replace(/imports\/$/, '') + 'assets/risk/risks.json';
        if (url.origin !== base.origin || url.pathname !== expected || url.username || url.password || url.search || url.hash) throw Error('Invalid risk explorer source');
        code.parentElement.replaceWith(root);
        const {renderRiskExplorer} = await import('/assets/risk-explorer.js');
        await renderRiskExplorer(root, url.href);
      } catch (error) {
        root.className = 'note'; root.textContent = 'The risk explorer could not load. Reload to try again; the risk inventory remains available in the repository.';
        code.parentElement?.replaceWith(root); console.error('Risk explorer:', error);
      }
    }
  }

  async function renderArticle(collection, page) {
    document.title = `${page.title} — David Ingraham`;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.content = page.description;
    main.innerHTML = `<div class="article-heading"><div class="breadcrumbs"><a href="/">Home</a> / <a href="${esc(collectionUrl(collection))}">${esc(collection.title)}</a></div><h1>${esc(page.title)}</h1><p class="download">Source: <a href="${esc(sourceUrl(collection, page.path))}">${esc(collection.repository)} / ${esc(page.path)}</a> · <a href="${esc(markdownUrl(collection, page.path))}">Raw Markdown</a></p></div><div class="article-layout"><article class="article" aria-busy="true"><p role="status">Loading the write-up…</p></article><aside class="sidebar" aria-label="On this page"><div class="sidebar-inner"><div class="eyebrow">On this page</div><div id="toc"></div><a href="${esc(collectionUrl(collection))}">← All articles</a></div></aside></div>`;
    mountProjectIndex(collection, page);
    const navigation = articleNavigation(collection, page);
    document.querySelector('.article-heading').insertAdjacentHTML('beforeend', navigation.top);
    const response = await fetch(markdownUrl(collection, page.path), {cache: 'no-store', signal: AbortSignal.timeout(20000)});
    if (!response.ok) throw new Error(`The source Markdown returned HTTP ${response.status}.`);
    const text = await response.text();
    const article = document.querySelector('.article');
    article.innerHTML = DOMPurify.sanitize(marked.parse(text, {gfm: true}), {FORBID_TAGS: ['style', 'form', 'iframe', 'object', 'embed'], FORBID_ATTR: ['style']});
    const firstHeading = article.firstElementChild;
    if (firstHeading && firstHeading.tagName === 'H1') firstHeading.remove();
    // The Blue Dog source retains its GitHub reading cues. In this reader the
    // manifest owns order, so replace the legacy closing cue, preserving provenance.
    const closing = article.lastElementChild;
    const nextCue = collection.id === 'sv-blue-dog' && closing?.tagName === 'P'
      ? [...closing.children].find(child => child.tagName === 'STRONG' && child.textContent.trim() === 'Next:') : null;
    if (nextCue) {
      while (nextCue.nextSibling) nextCue.nextSibling.remove();
      nextCue.remove();
      if (closing.lastChild?.nodeType === Node.TEXT_NODE) closing.lastChild.textContent = closing.lastChild.textContent.replace(/[\s·]+$/, '');
      if (!closing.textContent.trim()) closing.remove();
    }
    for (const a of article.querySelectorAll('a[href]')) a.setAttribute('href', resolveRepositoryLink(collection, page, a.getAttribute('href'), false));
    // Only this locally owned viewer is embeddable; arbitrary article iframes stay forbidden.
    if (collection.id === 'ardupilot-tinkering') {
      for (const link of article.querySelectorAll('a[href]')) {
        if (!['https://davidingraham.github.io/assets/controller-comparison/index.html', 'https://davidingraham.github.io/assets/microagu-viewer/controller-comparison.html'].includes(link.href)) continue;
        const frame = document.createElement('iframe');
        frame.src = '/assets/microagu-viewer/controller-comparison.html';
        frame.title = 'Compare refined state feedback with conventional controllers';
        frame.loading = 'lazy';
        frame.style.cssText = 'width:100%;aspect-ratio:1280/1880;border:0;min-height:700px';
        link.parentElement.after(frame);
      }
      const replays = new Map([
        ['https://davidingraham.github.io/assets/microagu-viewer/landing.html?case=spiral', '?case=spiral'],
        ['https://davidingraham.github.io/assets/microagu-viewer/landing.html?case=swoop-soft', '?case=swoop-soft'],
        ['https://davidingraham.github.io/assets/microagu-viewer/landing.html?case=swoop-dramatic', '?case=swoop-dramatic'],
        ['https://davidingraham.github.io/assets/microagu-viewer/landing.html', ''],
        ['https://davidingraham.github.io/assets/microagu-viewer/landing.html?case=before', '?case=before'],
        ['https://davidingraham.github.io/assets/microagu-viewer/landing.html?case=calm', '?case=calm'],
        ['https://davidingraham.github.io/assets/microagu-viewer/landing.html?case=turbulent', '?case=turbulent'],
        ['https://davidingraham.github.io/assets/microagu-viewer/landing.html?case=after', '?case=after'],
      ]);
      for (const link of article.querySelectorAll('a[href]')) {
        if (!replays.has(link.href)) continue;
        const frame = document.createElement('iframe');
        frame.src = '/assets/microagu-viewer/landing.html' + replays.get(link.href);
        frame.title = link.textContent || 'Interactive Micro-AGU spot landing replay';
        frame.loading = 'lazy';
        frame.style.cssText = 'width:100%;aspect-ratio:1280/1510;border:0;min-height:420px';
        frame.setAttribute('allow', 'autoplay; fullscreen');
        link.parentElement.after(frame);
      }
    }
    for (const img of article.querySelectorAll('img[src]')) {
      img.setAttribute('src', resolveRepositoryLink(collection, page, img.getAttribute('src'), true));
      img.decoding = 'async';
      img.addEventListener('error', () => {
        const warning = document.createElement('p');
        warning.className = 'note';
        const link = document.createElement('a');
        link.href = img.src;
        link.textContent = `View figure at source: ${img.alt || 'figure'}`;
        warning.append('This figure could not be loaded. ', link);
        img.replaceWith(warning);
      }, {once: true});
    }
    for (const media of article.querySelectorAll('video[src], video source[src]')) {
      media.setAttribute('src', resolveRepositoryLink(collection, page, media.getAttribute('src'), true));
    }
    for (const video of article.querySelectorAll('video')) {
      if (video.hasAttribute('poster')) video.setAttribute('poster', resolveRepositoryLink(collection, page, video.getAttribute('poster'), true));
      video.muted = video.hasAttribute('muted');
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) video.autoplay = false;
      video.load();
    }
    for (const table of article.querySelectorAll('table')) {
      const wrapper = document.createElement('div'); wrapper.className = 'table-scroll';
      table.before(wrapper); wrapper.append(table);
    }
    const used = new Set();
    for (const heading of article.querySelectorAll('h1,h2,h3,h4,h5,h6')) {
      const base = heading.textContent.toLowerCase().trim().replace(/[^\p{L}\p{N}\s-]/gu, '').replace(/\s+/g, '-') || 'section';
      let slug = base; let i = 1;
      while (used.has(slug)) slug = `${base}-${i++}`;
      used.add(slug); heading.id = slug;
      if (heading.tagName === 'H2') {
        const link = document.createElement('a'); link.href = `#${slug}`; link.textContent = heading.textContent;
        document.querySelector('#toc').append(link);
      }
    }
    article.insertAdjacentHTML('beforeend', navigation.bottom);
    // Media and async diagrams can move headings after the initial hash jump.
    // Maintain the requested anchor until the reader takes over scrolling.
    let stopTracking = () => {};
    const revealAnchor = () => {
      stopTracking();
      if (!location.hash) return;
      let id;
      try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
      const target = document.getElementById(id);
      if (!target) return;
      for (let parent = target.parentElement; parent; parent = parent.parentElement) {
        if (parent.tagName === 'DETAILS') parent.open = true;
      }
      let frame = 0;
      const align = () => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          // Override the site's smooth scrolling: repeated layout corrections
          // must not start competing animations toward obsolete coordinates.
          target.scrollIntoView({behavior: 'instant', block: 'start'});
        });
      };
      const observer = new ResizeObserver(align);
      observer.observe(main);
      stopTracking = () => {observer.disconnect(); cancelAnimationFrame(frame);};
      align();
    };
    for (const event of ['wheel', 'touchstart', 'pointerdown', 'keydown']) {
      window.addEventListener(event, () => stopTracking(), {passive: true});
    }
    window.addEventListener('pagehide', () => stopTracking());
    window.addEventListener('hashchange', revealAnchor);
    main.addEventListener('click', event => {
      const link = event.target.closest?.('a[href]');
      if (!link || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const url = new URL(link.href);
      // Clicking the current TOC entry does not fire hashchange.
      if (url.origin === location.origin && url.pathname === location.pathname &&
          url.search === location.search && url.hash && url.hash === location.hash) revealAnchor();
    });
    revealAnchor();
    await renderDesignExplorers(article, collection);
    await renderRiskExplorers(article, collection);
    await renderComparisons(article, collection);
    await renderDiagrams(article);
    await window.renderArticleMath?.(article);
    if (page.presentation) {
      const {mountReviewDeck} = await import('/assets/review-deck.js');
      mountReviewDeck(article);
    }
    article.removeAttribute('aria-busy');
  }

  async function start() {
    let manifest;
    try {
      const response = await fetch('/publish-manifest.json', {cache: 'no-store', signal: AbortSignal.timeout(15000)});
      if (!response.ok) throw new Error(`The publishing manifest returned HTTP ${response.status}.`);
      manifest = await response.json(); validate(manifest); renderProjects(manifest);
      if (!document.body.dataset.reader) return;
      const query = new URLSearchParams(location.search);
      const id = query.get('collection') || document.body.dataset.collection;
      const articleId = query.get('article') || document.body.dataset.article;
      const collection = manifest.collections.find(item => item.id === id);
      if (!collection) throw new Error('This collection is not in the publishing manifest.');
      if (!articleId) {renderCollection(collection); mountProjectIndex(collection); return;}
      // Preserve the link to the study now folded into the existing chapters.
      if (id === 'ardupilot-tinkering' && articleId === 'longitudinal-mission-control') {
        const destination = collection.pages.find(item => item.id === 'longitudinal-observer');
        location.replace(pageUrl(collection, destination) + '#returning-to-native-mission-control');
        return;
      }
      const page = collection.pages.find(item => item.id === articleId);
      if (!page) throw new Error('This article is not in the publishing manifest.');
      if (page.redirect) {
        const destination = collection.pages.find(item => item.id === page.redirect);
        if (!destination || destination.redirect) throw new Error('Invalid article redirect.');
        location.replace(pageUrl(collection, destination) + (page.anchor ? '#' + encodeURIComponent(page.anchor) : ''));
        return;
      }
      await renderArticle(collection, page);
    } catch (error) {
      const destination = document.querySelector('.article') || document.querySelector('#project-grid') || main;
      const box = document.createElement('div'); box.setAttribute('role', 'alert');
      const title = document.createElement('h2'); title.textContent = 'Unable to load this content';
      const message = document.createElement('p'); message.textContent = error.message;
      const retry = document.createElement('a'); retry.href = location.href; retry.textContent = 'Try again';
      box.append(title, message, retry);
      if (manifest) {
        const collection = manifest.collections.find(item => item.id === (new URLSearchParams(location.search).get('collection') || document.body.dataset.collection));
        if (collection) {const source = document.createElement('a');source.href = `https://github.com/${collection.repository}`;source.textContent = 'Browse the source repository';box.append(document.createTextNode(' · '),source);}
      }
      destination.replaceChildren(box); destination.removeAttribute('aria-busy');
      console.error('Publishing reader:', error);
    }
  }
  start();
})();
