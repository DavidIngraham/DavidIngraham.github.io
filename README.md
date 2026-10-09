# David Ingraham's project pages

Static GitHub Pages site at https://davidingraham.github.io/. GitHub Pages deploys the `master` branch root automatically; `.nojekyll` keeps the HTML unchanged.

## One manifest, source content in its own repo

Edit [`publish-manifest.json`](publish-manifest.json) to choose projects and write-ups to publish. The landing page reads `projects`; the reader uses `collections`. Markdown, figures and supporting artifacts remain in their source repositories. No generated article content or copied research data is committed here.

For each collection, set:

- `id`: unique URL slug.
- `repository`: public GitHub `owner/repo`.
- `ref`: branch, tag or commit. A branch follows edits; a commit pins a snapshot.
- `pages`: each article's `id`, repository-relative Markdown `path`, `title` and `description`.
- Optional `title`, `heading`, `intro`, `implementation_links` and `note` for the collection index.

Add a project referencing its `collection` ID to show it on the homepage. External projects use `url` instead. A collection without an explicit `url` uses `/research/?collection=ID`; articles use `/research/?collection=ID&article=ARTICLE`. Adding another collection or article only requires a manifest edit. The original `/ardupilot-tinkering/*.html` links remain lightweight reader shells for backward compatibility.

## What updates automatically?

- **Homepage or manifest changes:** push to this repo's `master`; GitHub Pages redeploys.
- **Source Markdown or figures:** push to the source ref; the reader fetches that content directly on page load. No site commit or cross-repository workflow is needed. GitHub's raw-content cache can delay visibility briefly; already-open pages need reloading.
- **Pinned commit refs:** change the manifest to publish a different snapshot.

The reader resolves linked published Markdown to local article pages, image paths to raw GitHub files, and other relative links to their source GitHub pages. Sections, tables and fenced code render in the shared layout. Rendering requires JavaScript and access to GitHub raw content; source links and loading errors provide a fallback. Source refs must be publicly readable. Content is sanitized before rendering, using pinned, vendored Marked and DOMPurify with their licenses in `assets/vendor/`.

## Local preview

```sh
python3 -m http.server 8000
```

Open http://localhost:8000/. The preview fetches the same public Markdown as the deployed site. It does not need a research checkout or Python package dependencies. AI-assisted site implementation and research documentation.
