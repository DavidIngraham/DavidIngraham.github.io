# David Ingraham's project pages

Static GitHub Pages site at https://davidingraham.github.io/. GitHub Pages deploys the `master` branch root automatically; `.nojekyll` keeps the HTML unchanged.

## One manifest, source content in its own repo

Edit [`publish-manifest.json`](publish-manifest.json) to choose projects and write-ups to publish. The landing page reads `projects`; the reader uses `collections`. Markdown, figures and supporting artifacts remain in their source repositories. No generated article content or copied research data is committed here.

For each collection, set:

- `id`: unique URL slug.
- `repository`: public GitHub `owner/repo`.
- `ref`: branch, tag or commit. A branch follows edits; a commit pins a snapshot.
- Optional `content_base`: HTTPS directory containing rendered Markdown with the same repository-relative paths. SV Blue Dog uses its model publishing workflow to produce these imports. Source links still point to GitHub.
- `pages`: each article's `id`, repository-relative Markdown `path`, `title` and `description`.
- Optional `navigation`: ordered groups with `title` and a `pages` list of article IDs for the persistent project index. Include canonical reference pages here even when they are hidden from the chapter sequence. Without groups, the index lists visible articles. An article may supply `nav_title` for a short sidebar label.
- Optional `title`, `heading`, `intro`, `implementation_links` and `note` for the collection index.

Add a project referencing its `collection` ID to show it on the homepage. Set its optional `article` ID to link directly to a particular write-up. External projects use `url` instead. A collection without an explicit `url` uses `/research/?collection=ID`; articles use `/research/?collection=ID&article=ARTICLE`. Adding another collection or article only requires a manifest edit. The original `/ardupilot-tinkering/*.html` links remain lightweight reader shells for backward compatibility.

## What updates automatically?

- **Homepage or manifest changes:** push to this repo's `master`; GitHub Pages redeploys.
- **Source Markdown or figures:** push to the source ref; the reader fetches that content directly on page load. No site commit or cross-repository workflow is needed. GitHub's raw-content cache can delay visibility briefly; already-open pages need reloading.
- **Generated model views:** the source repository workflow rebuilds its Pages imports after a model or method change. The reader fetches those imports after deployment; no hand-copied diagram update is needed.
- **Pinned commit refs:** change the manifest to publish a different snapshot.

The reader resolves linked published Markdown to local article pages, image paths to raw GitHub files, and other relative links to their source GitHub pages. Sections, tables and fenced code render in the shared layout. Rendering requires JavaScript and access to GitHub raw content; source links and loading errors provide a fallback. Source refs must be publicly readable. Content is sanitized before rendering, using pinned, vendored Marked and DOMPurify with their licenses in `assets/vendor/`.

## Personal pages

The homepage introduction lives in `index.html`; the biography lives in `about/index.html`. Both use `assets/site.css`. The About page works without JavaScript. Keep project listings in the manifest and research content in its source repositories. Navigation is repeated in the HTML page shells; update each header when adding a site link.

## Local preview

```sh
python3 -m http.server 8000
```

Open http://localhost:8000/. The preview fetches the same public Markdown as the deployed site. It does not need a research checkout or Python package dependencies. AI-assisted site implementation and research documentation.

The reader supports `model-comparison` fenced JSON with a `src` pointing to a `candidates.json` manifest under the collection's rendered asset directory. A trusted blog component renders the models inline; imported Markdown cannot inject scripts or iframes. Geometry and metadata stay in the source project's generated assets.

The `design-explorer` Markdown fence accepts a `src` pointing to the collection’s generated `assets/design-explorer/design.json`. The source repository exports native sizing inputs and brackets; the trusted reader component provides a geometry sketch and local configuration editing. It does not execute the engineering solver. Verify its dimensional contract with `node tests/design-explorer.cjs /path/to/generated/design.json`.

### Risk explorer

The `risk-explorer` fence accepts the collection's generated `assets/risk/risks.json`. The trusted reader displays one cube per risk type, with shared type, status and text filters. Selecting an ID shows only that risk's description, assessment and actions. The data is exported through the native SysML report; the browser does not assign ratings. Run `node tests/risk-explorer.cjs /path/to/generated/risks.json` to check the contract and filters.

## Mathematics

All article readers, including legacy /ardupilot-tinkering/ URLs, load the shared assets/article-math.js integration. Author mathematics as $...$ inline and $$ on separate lines for display equations; use LaTeX aligned/cases environments where appropriate. Existing backslash delimiters and math fences are also supported. Do not add per-article loaders or another math renderer.

MathJax is loaded on demand at the pinned version in article-math.js. TeX is preserved before Markdown parsing, sanitized, and then rendered. Code samples and currency remain literal. Display equations scroll within their own block on narrow screens. Loading failure retains readable TeX.

Keep program identifiers, paths and executable examples in code formatting. Mathematical expressions in prose should use math delimiters, not inline code or text fences. Run node tests/article-math.cjs after changing the renderer or reader shells.
