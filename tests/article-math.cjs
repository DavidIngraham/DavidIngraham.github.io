const assert = require('node:assert/strict');
global.marked = require('../assets/vendor/marked.js');
global.window = {};
require('../assets/article-math.js');
const samples = [
  String.raw`$x_{a_b}+\alpha$`, String.raw`\(x_a\)`,
  '$$\nx_a=1\n$$', String.raw`\[x_a=1\]`,
  '```math\nx_a=1\n```',
  '$$\n\\begin{aligned}a_b &= c_d \\\\ x &= 2\\end{aligned}\n$$'
];
for (const source of samples) {
  const html = marked.parse(source);
  assert.match(html, /class="article-math"/);
  assert.doesNotMatch(html, /<em>/);
}
for (const source of ['`$x$`', '```js\nconst x = "$x$"\n```', 'Costs $20 or $30.', String.raw`Escaped \$x\$`]) {
  assert.doesNotMatch(marked.parse(source), /class="article-math"/);
}
assert.match(marked.parse('$x < y$'), /x &lt; y/);
assert.match(marked.parse(String.raw`$\begin{bmatrix}1 & 2\\3 & 4\end{bmatrix}$`), /1 &amp; 2\\\\3/);
console.log('Math delimiters, TeX preservation, escaping, code isolation and currency: passed.');

const fs = require('node:fs');
const path = require('node:path');
for (const directory of ['research', 'ardupilot-tinkering']) {
  for (const name of fs.readdirSync(path.join(__dirname, '..', directory))) {
    if (!name.endsWith('.html')) continue;
    const html = fs.readFileSync(path.join(__dirname, '..', directory, name), 'utf8');
    if (!html.includes('data-reader=')) continue;
    assert.equal((html.match(/src="\/assets\/article-math.js(?:\?[^"]*)?"/g) || []).length, 1, name);
    assert.ok(html.indexOf('/assets/vendor/marked.js') < html.indexOf('/assets/article-math.js'), name);
    assert.ok(html.indexOf('/assets/article-math.js') < html.indexOf('/assets/publish.js'), name);
  }
}
console.log('All canonical and legacy readers load the shared math integration in order.');
