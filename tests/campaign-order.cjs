const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const sandbox={Math,Map};vm.createContext(sandbox);vm.runInContext(fs.readFileSync('ios/ui/campaign-order.js','utf8')+'\nthis.spread=spreadCampaigns;',sandbox);
const check=(counts,seed)=>{const rows=counts.flatMap((count,brand)=>Array.from({length:count},(_,n)=>({id:brand+'-'+n,brand:String(brand)})));const ordered=sandbox.spread(rows,'test',seed);assert.equal(new Set(ordered.map(c=>c.id)).size,ordered.length);assert(ordered.every((c,i)=>!i||c.brand!==ordered[i-1].brand),'Same brand adjacent: '+counts);const largest=Math.max(0,...counts);if(largest<=rows.length-largest+1)assert.equal(ordered.length,rows.length,'Feasible campaign omitted: '+counts);return ordered;};
for(let seed=0;seed<100;seed++)for(let a=0;a<8;a++)for(let b=0;b<6;b++)check([a,b,3,2,1],seed);
assert.equal(check([20],1).length,1);
assert.notEqual(JSON.stringify(check([3,3,3,3,3],1)),JSON.stringify(check([3,3,3,3,3],2)));
assert.equal(JSON.stringify(check([3,3,3],1)),JSON.stringify(check([3,3,3],1)));
console.log('PASS: no adjacent brands over 4,800 distributions; feasible sets retain every campaign; stable render order and new session variation.');
