/* Manifest-driven project index and Markdown reader. Source content stays in its repository. */
(() => {
  'use strict';
  const main = document.querySelector('#main');
  const esc = (value) => String(value).replace(/[&<>"']/g, char => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[char]));
  const encodePath = path => path.split('/').map(encodeURIComponent).join('/');
  const rawUrl = (collection, path) => `https://raw.githubusercontent.com/${collection.repository}/${encodeURIComponent(collection.ref)}/${encodePath(path)}`;
  const sourceUrl = (collection, path) => `https://github.com/${collection.repository}/blob/${encodeURIComponent(collection.ref)}/${encodePath(path)}`;
  const collectionUrl = collection => collection.url || `/research/?collection=${encodeURIComponent(collection.id)}`;
  const pageUrl = (collection, page) => `/research/?collection=${encodeURIComponent(collection.id)}&article=${encodeURIComponent(page.id)}`;
  const card = (title, tag, description, url, label) => `<article class="card"><span class="tag">${esc(tag)}</span><h3><a href="${esc(url)}">${esc(title)}</a></h3><p>${esc(description)}</p><a class="link" href="${esc(url)}">${esc(label)}</a></article>`;

  function validate(manifest) {
    if (manifest.version !== 1 || !Array.isArray(manifest.collections) || !Array.isArray(manifest.projects)) throw new Error('Unsupported publishing manifest.');
    const ids = new Set();
    for (const collection of manifest.collections) {
      if (!/^[a-z0-9-]+$/.test(collection.id) || ids.has(collection.id)) throw new Error('Collection IDs must be unique URL slugs.');
      ids.add(collection.id);
      if (!/^[\w.-]+\/[\w.-]+$/.test(collection.repository) || !collection.ref || !Array.isArray(collection.pages)) throw new Error('Invalid collection source.');
      if (collection.url && (!collection.url.startsWith('/') || collection.url.startsWith('//'))) throw new Error('Collection URL must be a local path.');
      const pages = new Set();
      for (const page of collection.pages) {
        if (!/^[a-z0-9-]+$/.test(page.id) || pages.has(page.id) || !/\.md$/i.test(page.path) || page.path.startsWith('/') || page.path.split('/').some(p => p === '..' || !p)) throw new Error('Invalid article ID or Markdown path.');
        pages.add(page.id);
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
    main.innerHTML = `<section class="hero research-intro"><div class="breadcrumbs"><a href="/">Home</a> / Research</div><div class="eyebrow">${esc(collection.title)}</div><h1>${esc(collection.heading || collection.title)}</h1>${(collection.intro || []).map((text, i) => `<p${i ? '' : ' class="lead"'}>${esc(text)}</p>`).join('')}</section><div class="grid research-cards">${collection.pages.filter(page => !page.hidden).map((page, i) => card(page.title, `Experiment ${i + 1}`, page.description, pageUrl(collection, page), 'Read the investigation →')).join('')}</div><section class="article research-intro"><h2>Source and implementation</h2><p>These pages render directly from Markdown in <a href="https://github.com/${esc(collection.repository)}">${esc(collection.repository)}</a>. The figures and supporting results stay in that repository too.</p><ul>${(collection.implementation_links || []).map(link => `<li><a href="${esc(link.url)}">${esc(link.label)}</a></li>`).join('')}</ul><p class="note">${esc(collection.note || '')}</p></section>`;
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
          let scale;
          const resize = next => {
            scale = Math.max(0.005, Math.min(3, next));
            drawing.style.maxWidth = 'none'; drawing.style.width = `${width * scale}px`;
            drawing.style.height = 'auto';
          };
          for (const [label, action] of [
            ['Zoom in', () => resize(scale * 1.5)], ['Zoom out', () => resize(scale / 1.5)],
            ['Fit', () => resize(viewport.clientWidth / width)], ['Actual size', () => resize(1)],
          ]) {
            const button = document.createElement('button'); button.type = 'button';
            button.textContent = label; button.addEventListener('click', action); controls.append(button);
          }
          // Preserve readable type by default; Fit remains an explicit overview action.
          resize(Math.max(1, viewport.clientWidth / width));
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

  async function renderArticle(collection, page) {
    document.title = `${page.title} — David Ingraham`;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.content = page.description;
    main.innerHTML = `<div class="article-heading"><div class="breadcrumbs"><a href="/">Home</a> / <a href="${esc(collectionUrl(collection))}">${esc(collection.title)}</a></div><h1>${esc(page.title)}</h1><p class="download">Source: <a href="${esc(sourceUrl(collection, page.path))}">${esc(collection.repository)} / ${esc(page.path)}</a> · <a href="${esc(rawUrl(collection, page.path))}">Raw Markdown</a></p></div><div class="article-layout"><article class="article" aria-busy="true"><p role="status">Loading the write-up…</p></article><aside class="sidebar" aria-label="On this page"><div class="sidebar-inner"><div class="eyebrow">On this page</div><div id="toc"></div><a href="${esc(collectionUrl(collection))}">← All experiments</a></div></aside></div>`;
    const response = await fetch(rawUrl(collection, page.path), {cache: 'no-store', signal: AbortSignal.timeout(20000)});
    if (!response.ok) throw new Error(`The source Markdown returned HTTP ${response.status}.`);
    const text = await response.text();
    const article = document.querySelector('.article');
    article.innerHTML = DOMPurify.sanitize(marked.parse(text, {gfm: true}), {FORBID_TAGS: ['style', 'form', 'iframe', 'object', 'embed'], FORBID_ATTR: ['style']});
    const firstHeading = article.firstElementChild;
    if (firstHeading && firstHeading.tagName === 'H1') firstHeading.remove();
    for (const a of article.querySelectorAll('a[href]')) a.setAttribute('href', resolveRepositoryLink(collection, page, a.getAttribute('href'), false));
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
    await renderDiagrams(article);
    article.removeAttribute('aria-busy');
    if (location.hash) document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView();
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
      if (!articleId) {renderCollection(collection); return;}
      const page = collection.pages.find(item => item.id === articleId);
      if (!page) throw new Error('This article is not in the publishing manifest.');
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
