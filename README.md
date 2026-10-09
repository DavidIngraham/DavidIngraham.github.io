# David Ingraham's project pages

Static GitHub Pages site at https://davidingraham.github.io/. The landing page indexes Contour Workbench, ArduPilot research and related source projects. GitHub Pages serves the `master` branch root; `.nojekyll` keeps the committed HTML unchanged.

The research archive remains private. Only the selected write-ups and their directly referenced figures, results and scripts are copied into this public site.

To update the research pages from a local archive checkout:

```sh
python3 -m pip install -r tools/requirements.txt
python3 tools/publish_research.py /path/to/ArduPilot-tinkering
python3 -m http.server 8000
```

Review generated pages, commit and push. The renderer does not copy the full scratch directory or raw logs. AI-assisted site and research documentation.
