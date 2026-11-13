// Shared card ordering: stable while browsing, fresh for each app launch.
function campaignRank(value,seed){let n=2166136261;for(const ch of String(seed)+'|'+value)n=Math.imul(n^ch.charCodeAt(0),16777619);return n>>>0;}
const campaignSessionSeed=Math.random();
function spreadCampaigns(items,scope='cards',seed=campaignSessionSeed){
 const groups=new Map();
 for(const item of items){const name=String(item.brand||item.name||'').trim().toLocaleLowerCase('tr');if(!groups.has(name))groups.set(name,[]);groups.get(name).push(item);}
 const buckets=[...groups].map(([brand,rows])=>({brand,rows:rows.slice().sort((a,b)=>campaignRank(scope+'|'+a.id,seed)-campaignRank(scope+'|'+b.id,seed)),rank:campaignRank(scope+'|'+brand,seed),last:-1}));
 const largest=Math.max(0,...buckets.map(b=>b.rows.length));
 const spacing=Math.max(1,Math.min(buckets.length,Math.floor(items.length/Math.max(1,largest))));
 for(const b of buckets){const others=items.length-b.rows.length;b.rows=b.rows.slice(0,others+1);}
 const ordered=[];let previous='';
 while(true){
  const candidates=buckets.filter(b=>b.rows.length&&b.brand!==previous).sort((a,b)=>b.rows.length-a.rows.length||a.last-b.last||a.rank-b.rank);
  if(!candidates.length)break;
  const feasible=candidates.filter(candidate=>{const rest=buckets.map(b=>({brand:b.brand,count:b.rows.length-(b===candidate?1:0)}));const total=rest.reduce((n,b)=>n+b.count,0);return rest.every(b=>b.count<=(b.brand===candidate.brand?Math.floor(total/2):Math.ceil(total/2)));});
  const safe=feasible.length?feasible:candidates;const distant=safe.filter(b=>b.last<0||ordered.length-b.last+1>=spacing);
  const next=(distant.length?distant:safe)[0];ordered.push(next.rows.shift());next.last=ordered.length;previous=next.brand;
 }
 // When one brand outnumbers all separators, its remaining cards rotate into
 // later launches. They stay available in that brand's explicit campaign list.
 return ordered;
}
