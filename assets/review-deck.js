// Progressive enhancement: the source remains a readable, printable article.
export function mountReviewDeck(article) {
  const headings = [...article.querySelectorAll(':scope > h2')];
  if (!headings.length) return;
  if (!document.querySelector('link[data-review-deck]')) {
    const style = document.createElement('link');
    style.rel = 'stylesheet'; style.href = '/assets/review-deck.css';
    style.dataset.reviewDeck = ''; document.head.append(style);
  }
  const slides = headings.map((heading, i) => {
    const section = document.createElement('section');
    section.className = 'review-slide'; section.setAttribute('aria-labelledby', heading.id);
    heading.before(section); section.append(heading);
    while (section.nextSibling && section.nextSibling.nodeName !== 'H2') section.append(section.nextSibling);
    return section;
  });
  const bar = document.createElement('nav');
  bar.className = 'review-controls'; bar.setAttribute('aria-label', 'Presentation controls');
  const button = text => {const b = document.createElement('button'); b.type = 'button'; b.textContent = text; bar.append(b); return b;};
  const toggle = button('Present'); const previous = button('Previous'); const next = button('Next');
  const status = document.createElement('span'); status.setAttribute('aria-live', 'polite'); bar.append(status);
  slides[0].before(bar);
  let presenting = false, index = 0;
  function update() {
    article.classList.toggle('review-presenting', presenting);
    slides.forEach((slide, i) => {slide.hidden = presenting && i !== index;});
    previous.hidden = next.hidden = status.hidden = !presenting;
    previous.disabled = index === 0; next.disabled = index === slides.length - 1;
    toggle.textContent = presenting ? 'Read full article' : 'Present';
    toggle.setAttribute('aria-pressed', String(presenting));
    status.textContent = `${index + 1} / ${slides.length}`;
  }
  function show(i) {
    index = Math.max(0, Math.min(slides.length - 1, i)); update();
    if (presenting) {
      history.replaceState(null, '', '#' + headings[index].id);
      bar.scrollIntoView({block:'start', behavior:'instant'});
    }
  }
  toggle.onclick = () => {presenting = !presenting; update();};
  previous.onclick = () => show(index - 1); next.onclick = () => show(index + 1);
  bar.addEventListener('keydown', event => {
    if (!presenting || !['ArrowLeft','ArrowRight','Escape'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'Escape') {presenting = false; update();}
    else show(index + (event.key === 'ArrowRight' ? 1 : -1));
  });
  function followHash() {
    let id; try {id = decodeURIComponent(location.hash.slice(1));} catch {return;}
    const target = document.getElementById(id);
    const selected = slides.findIndex(slide => slide.contains(target));
    if (selected >= 0) {index = selected; update();}
  }
  window.addEventListener('hashchange', followHash);
  followHash(); update();
}
