const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const context={window:{},marked:require('./dist/vendor/marked.js'),DOMPurify:{},document:{readyState:'loading',addEventListener(){}}};
vm.runInNewContext(fs.readFileSync('dist/note-content.js','utf8'),context);
const {normalize}=context.window.NoteContent;
const body='## Article\n\n![chart](https://example.com/chart.png)\n\n| A | B |\n| --- | --- |\n| 1 | 2 |';
for(const lang of ['markdown','md','']){
 const pasted='Keep my introduction.\n\n```'+lang+'\n'+body+'\n```\n\nKeep my conclusion.';
 const clean=normalize(pasted);
 assert.ok(clean.includes(body));assert.ok(!clean.includes('```'));
 assert.ok(clean.includes('Keep my introduction.'));assert.ok(clean.includes('Keep my conclusion.'));
 assert.equal(normalize(clean),clean);
}
for(const text of ['```js\nconst answer = 42;\n```','```mermaid\nflowchart TD\n A --> B\n```','```markdown\n# Heading example\n```'])assert.equal(normalize(text),text);
console.log('Pasted Markdown articles unwrap; source code and surrounding notes stay intact');
