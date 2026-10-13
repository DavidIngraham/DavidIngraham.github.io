const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('assets/publish.js', 'utf8').replace('  start();', '  globalThis.test = {articleGroups, articleNavigation, projectIndex, renderCollection, validate};');
const main = {};
const context = {document: {querySelector: () => main}, URL};
vm.createContext(context); vm.runInContext(source, context);
const manifest = JSON.parse(fs.readFileSync('publish-manifest.json', 'utf8'));
context.test.validate(manifest);
const blue = manifest.collections.find(c => c.id === 'sv-blue-dog');
const expected = blue.navigation.flatMap(g => g.pages);
const actual = context.test.articleGroups(blue).flatMap(g => g.pages.map(p => p.id));
assert.equal(JSON.stringify(actual), JSON.stringify(expected));
context.test.renderCollection(blue);
for (const group of blue.navigation) assert.ok(main.innerHTML.includes('<h2>' + group.title + '</h2>'));
assert.equal((main.innerHTML.match(/class="card"/g) || []).length, expected.length);
for (let i=0; i<expected.length; i++) {
 const page = blue.pages.find(p => p.id === expected[i]);
 const nav = context.test.articleNavigation(blue, page);
 if (i) assert.ok(nav.top.includes('&amp;article=' + expected[i-1] + '"'));
 if (i+1<expected.length) assert.ok(nav.bottom.includes('&amp;article=' + expected[i+1] + '"'));
 assert.ok(context.test.projectIndex(blue, page).includes('&amp;article=' + page.id + '" aria-current="page"'));
}
const micro = manifest.collections.find(c => c.id === 'ardupilot-tinkering');
assert.equal(JSON.stringify(context.test.articleGroups(micro)[0].pages.map(p => p.id)), JSON.stringify(micro.pages.filter(p => !p.hidden).map(p => p.id)));
console.log('Grouped cards, reading order, active references and ungrouped fallback passed.');
