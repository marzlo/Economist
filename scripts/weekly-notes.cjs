const fs=require('node:fs'),path=require('node:path'),M=require('../dist/review-model.js');
const [start,cutoff]=process.argv.slice(2);if(!/^\d{4}-\d{2}-\d{2}$/.test(start)||!/^\d{4}-\d{2}-\d{2}$/.test(cutoff))throw Error('Invalid weekly date');
const list=JSON.parse(fs.readFileSync(path.join(__dirname,'../issues.json'),'utf8').replace(/^\uFEFF/,''));
process.stdout.write(JSON.stringify(M.collect(list).filter(n=>M.inWeek(n,start)&&n.statDate<=cutoff)));
