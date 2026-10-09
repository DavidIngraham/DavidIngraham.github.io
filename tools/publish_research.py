#!/usr/bin/env python3
"""Build a curated public site from the private research archive, without copying logs."""
import argparse
import html
import re
import shutil
from pathlib import Path
import markdown

ROOT = Path(__file__).resolve().parents[1]
PAGES = [('trajectory', 'Can planning turns improve on L1?', 'Line-to-line transitions, raster surveys and gust comparisons.'), ('paraglider', 'What does my paraglider need from its controller?', 'Turn tracking, canopy/payload articulation and launch experiments.'), ('longitudinal-observer', 'Can relative pitch unlock better longitudinal control?', 'Truth-state feedback, observability and the free-body equations.')]

def shell(title, body, description):
    return f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{html.escape(title)} — David Ingraham</title><meta name="description" content="{html.escape(description, quote=True)}"><link rel="stylesheet" href="/assets/site.css"></head><body><a class="skip" href="#main">Skip to content</a><div class="wrap"><header class="top"><a class="brand" href="/">David Ingraham</a><nav aria-label="Main"><a href="/#projects">Projects</a><a href="/ardupilot-tinkering/">Research</a><a href="https://github.com/DavidIngraham">GitHub</a></nav></header><main id="main">{body}</main><footer>David Ingraham · AI-assisted research · <a href="/ardupilot-tinkering/">Research index</a></footer></div></body></html>'''

def build(source):
    source = source.resolve()
    out = ROOT / 'ardupilot-tinkering'
    out.mkdir(exist_ok=True)
    names = {name + '.md': name + '.html' for name, _, _ in PAGES}
    for name, title, description in PAGES:
        doc = source / 'docs' / (name + '.md')
        text = doc.read_text()
        # Keep original Markdown as a downloadable snapshot, plus its referenced public artifacts.
        shutil.copy2(doc, out / (name + '.md'))
        def replace_link(match):
            target = match.group(1)
            if target.startswith(('https:', 'http:', '#')):
                return match.group(0)
            if target in names:
                return '](' + names[target] + ')'
            asset = (doc.parent / target).resolve()
            relative = asset.relative_to(source)
            if relative.parts[0] != 'scratch' or not asset.is_file():
                raise ValueError(f'Unexpected research link: {target}')
            dest = out / relative
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(asset, dest)
            return '](' + relative.as_posix() + ')'
        public_text = re.sub(r'\]\(([^)]+)\)', replace_link, text)
        # Downloadable Markdown has the same resolvable assets as the rendered page.
        (out / (name + '.md')).write_text(public_text.replace('.html)', '.md)'))
        content = markdown.markdown(public_text, extensions=['tables', 'fenced_code', 'toc'])
        content = re.sub(r'^<h1[^>]*>.*?</h1>\s*', '', content, count=1, flags=re.S)
        content = re.sub(r'(<table>.*?</table>)', r'<div class="table-scroll">\1</div>', content, flags=re.S)
        toc = ''.join(f'<a href="#{slug}">{html.escape(label)}</a>' for slug, label in re.findall(r'<h2 id="([^"]+)">([^<]+)</h2>', content))
        body = f'''<div class="article-heading"><div class="breadcrumbs"><a href="/">Home</a> / <a href="./">ArduPilot tinkering</a></div><h1>{html.escape(title)}</h1><p class="download">Research snapshot · October 2026 · <a href="{name}.md">Download Markdown</a></p></div><div class="article-layout"><article class="article">{content}</article><aside class="sidebar" aria-label="On this page"><div class="sidebar-inner"><div class="eyebrow">On this page</div>{toc}<a href="./">← All experiments</a></div></aside></div>'''
        (out / (name + '.html')).write_text(shell(title, body, description))
    shutil.copy2(source / 'COPYING.txt', out / 'COPYING.txt')
    cards = ''.join(f'<article class="card"><span class="tag">Experiment {i}</span><h3><a href="{name}.html">{html.escape(title)}</a></h3><p>{html.escape(description)}</p><a class="link" href="{name}.html">Read the investigation →</a></article>' for i, (name, title, description) in enumerate(PAGES, 1))
    body = f'''<section class="hero research-intro"><div class="breadcrumbs"><a href="/">Home</a> / Research</div><div class="eyebrow">ArduPilot tinkering</div><h1>Questions, simulations,<br>and what I learned.</h1><p class="lead">I started with questions about flying my paraglider better. The turn-tracking work led me into Plane trajectory planning; the pitch oscillations led me back to the physics between the canopy and payload.</p><p>I worked with Codex to implement ideas, run comparisons and investigate failures. These pages tell the story of that work, including the results that changed my mind and the questions still open.</p></section><div class="grid research-cards">{cards}</div><section class="article research-intro"><h2>The implementation branches</h2><p>The code and native autotests live in my public ArduPilot fork:</p><ul><li><a href="https://github.com/DavidIngraham/ardupilot/tree/plane-trajectory-wip">Plane trajectory branch</a> · <a href="https://github.com/DavidIngraham/ardupilot/commit/81f32455ec7098888d21977fdc474f3b64657ba4">Documented snapshot</a></li><li><a href="https://github.com/DavidIngraham/ardupilot/tree/paraglider-rebase">Paraglider branch</a> · <a href="https://github.com/DavidIngraham/ardupilot/commit/b2f6da3a183a68d3de6f2c721ec90fca0eab53d5">Documented snapshot</a></li></ul><p>The full scratch archive is private for now. This site publishes the write-ups, figures and selected supporting results and scripts. Raw logs and built binaries are omitted. Experimental longitudinal controllers and the proposed observer are research, not deployed features.</p><p class="note">These simulations do not establish flight readiness. ArduPilot-derived files retain their upstream notices and <a href="COPYING.txt">GPL license</a>. The linked results are a snapshot; earlier scratch notes can describe superseded assumptions.</p></section>'''
    (out / 'index.html').write_text(shell('ArduPilot tinkering', body, 'My investigations into Plane trajectory planning, paraglider control and relative-pitch observation.'))
    print(f'Published {len(PAGES)} write-ups and referenced artifacts into {out}')

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('archive', type=Path)
    build(parser.parse_args().archive)
