# MathJax 4.0.0
Pinned npm packages mathjax@4.0.0 and @mathjax/mathjax-newcm-font@4.0.0 (sibling directory).
Apache-2.0 licenses are retained. tex-svg plus TeX extensions, UI, accessibility,
speech data and SVG font chunks are hosted here to avoid runtime CDN dependencies.
Upstream hosting instructions: https://docs.mathjax.org/en/v4.0/web/hosting.html

npm distribution integrity:
- mathjax@4.0.0: sha512-ThMPHiPl9ibZBInAmfoTCNq9MgCdH7ChIQ9YhKFc325noJ4DMzy9/Q14qdcuPzVJjEmC3kyXhwnERZWX3hbWzQ==
- @mathjax/mathjax-newcm-font@4.0.0: sha512-kpsJgIF4FpWiwIkFgOPmWwy5GXfL25spmJJNg27HQxPddmEL8Blx0jn2BuU/nlwjM/9SnYpEfDrWiAMgLPlB8Q==

The upstream bundles are unmodified. The site's article-math.js adapts worker
creation to assets/mathjax-speech-worker.js rather than altering vendor code.
