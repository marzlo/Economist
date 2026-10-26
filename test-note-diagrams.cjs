const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const context={window:{}};vm.runInNewContext(fs.readFileSync('dist/note-diagrams.js','utf8'),context);const render=context.window.NoteDiagrams.render;
const html=render('flowchart TD\n A["設備<br/>GPU"] --> B["租用"]\n B --> C["報價"]\n B --> D["推論"]');
assert.ok(html.includes('<svg'));assert.equal((html.match(/<rect /g)||[]).length,4);assert.ok(html.includes('推論'));
assert.equal(render('flowchart TD\n A --> B\n B --> A'),null);
assert.equal(render('sequenceDiagram\n A->>B: Hi'),null);
assert.equal(render('flowchart TD\n A -->|label| B'),null);
assert.ok(!render('flowchart TD\n A["<script>alert(1)</script>"] --> B').includes('<script>'));
console.log('Basic note flowcharts, branches, cycles and escaping passed');
