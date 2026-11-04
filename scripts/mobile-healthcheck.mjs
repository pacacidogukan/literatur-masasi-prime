import assert from 'node:assert/strict';
const root=process.env.PRIME_MOBILE_HEALTH_ORIGIN||'https://prime-campaign-editor.pacacidogukan.chatgpt.site';
const origin=new URL(root);
assert.equal(origin.protocol,'https:');
let token;
async function request(path,body){
 const response=await fetch(new URL('/api/mobile/'+path,origin),{method:body?'POST':'GET',headers:{Accept:'application/json',...(body?{'Content-Type':'application/json'}:{}),...(token?{'X-Prime-Mobile-Session':token}:{})},body:body?JSON.stringify(body):undefined,redirect:'error',signal:AbortSignal.timeout(25000)});
 assert.match(response.headers.get('Content-Type')||'',/application\/json/,'Mobile gateway returned a redirect or HTML instead of JSON');
 const result=await response.json();
 assert.ok(response.ok,'Mobile '+path+' failed: HTTP '+response.status);
 return result;
}
try{
 const access=await request('access',{installationId:crypto.randomUUID()});
 assert.equal(access.authorized,true);assert.match(access.sessionToken,/^[a-f0-9]{64}$/);token=access.sessionToken;
 assert.equal((await request('me')).authorized,true);
 const result=await request('campaigns');assert.ok(Array.isArray(result.campaigns));
 const active=result.campaigns.filter(c=>!c.expires||c.expires>Date.now()/1000);
 assert.ok(active.length>=Number(process.env.PRIME_EXPECTED_MIN_CAMPAIGNS||1),'Unexpectedly empty active campaign feed');
 assert.ok(active.every(c=>c.id&&c.name&&c.photo&&!Object.hasOwn(c,'code')),'Invalid public campaign contract');
 console.log('PASS: live mobile access, authenticated session, '+active.length+' active campaigns, codes excluded.');
}finally{if(token)await request('logout',{});}
