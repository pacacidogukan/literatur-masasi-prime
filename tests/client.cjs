const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
class El{constructor(){this.value='';this.innerHTML='';this.textContent='';this.listeners={};this.style={};this.classList={add(){},remove(){}};this.clientWidth=350;this.parentElement={clientHeight:850};this.dataset={};this.scrollLeft=0;this.scrollTop=0}addEventListener(k,f){this.listeners[k]=f}focus(){}setAttribute(){}setPointerCapture(){}scrollTo({left}){this.scrollLeft=left}querySelector(k){return get(k)}}
const els=new Map,get=k=>{if(!els.has(k))els.set(k,new El);return els.get(k)},inputs=Array.from({length:6},()=>new El);let seed;const seedBox={};vm.createContext(seedBox);vm.runInContext(fs.readFileSync('lib/prime-seed.ts','utf8').replace('export const seedCampaigns=','globalThis.seed='),seedBox);seed=JSON.parse(JSON.stringify(seedBox.seed)).map(c=>({...c,asset:'assets/'+c.asset,photo:'assets/'+c.photo,conditions:'Seçili ürünlerde geçerlidir.',channel:'Online alışveriş',expires:2000000000,demo:1}));
const requests=[];const box={URL,ResizeObserver:class{observe(){}disconnect(){}},setTimeout:()=>1,setInterval:()=>1,clearTimeout(){},localStorage:{getItem(){return null},setItem(){}},window:{open(url){box.openedWebsite=url},scrollTo(){},scrollY:0},navigator:{clipboard:{writeText:async()=>{}}},document:{addEventListener(){},getElementById:get,querySelector:get,querySelectorAll:s=>s==='[data-rail]'?[]:inputs},async fetch(url,opts){requests.push({url,opts});const body=opts?.body?JSON.parse(opts.body):null;if(url==='/api/notifications')return{ok:true,json:async()=>({notifications:[],enabled:true})};if(url==='/api/me')return{ok:true,json:async()=>({authorized:false,owner:false})};if(url==='/api/access')return{ok:body.code==='654321',json:async()=>body.code==='654321'?{}:{error:'Kod geçersiz.'}};if(url==='/api/campaigns')return{ok:true,json:async()=>({campaigns:seed})};if(url==='/api/reveal')return{ok:true,json:async()=>({code:'SERVER-CODE',demo:1})};throw Error(url)}};vm.createContext(box);vm.runInContext(fs.readFileSync('public/app.js','utf8').replace(/^\(\(\)=>\{\n/,'').replace(/\n\}\)\(\);\n$/,''),box);const run=s=>vm.runInContext(s,box);
(async()=>{
await new Promise(r=>setImmediate(r));assert.equal((get('app').innerHTML.match(/data-digit=/g)||[]).length,6);assert.doesNotMatch(get('app').innerHTML,/123456/);
inputs.forEach(x=>x.value='0');await get('login-form').listeners.submit({preventDefault(){}});assert.equal(run('loggedIn'),false);assert.match(get('login-error').textContent,/geçersiz/);
inputs.forEach((x,i)=>x.value='654321'[i]);await get('login-form').listeners.submit({preventDefault(){}});assert.equal(run('loggedIn'),true);assert.match(get('app').innerHTML,/Ana Sayfa/);assert.equal(run('heroSlides.length'),Math.min(20,seed.length));
run("selected=brands[0];selected.expires=0;go('detail')");assert.match(get('app').innerHTML,/Kampanya bitiş tarihi<strong>Belirtilmedi<\/strong>/);assert.doesNotMatch(get('app').innerHTML,/1970/);
run("selected.expires=2000000000;render()");assert.doesNotMatch(get('app').innerHTML,/Belirtilmedi/);run("go('home')");
// Re-entering each list changes its order, even if randomness repeats; rerenders/search stay stable.
const order=()=>run('JSON.stringify(brands.map(b=>b.id))');
const campaignIds=()=>JSON.parse(order()).sort();
const idsBeforeShuffle=campaignIds();
run('var savedShuffleRandom=Math.random;Math.random=()=>0.999999');
assert.equal(run('shuffleCampaigns([]).length'),0);assert.equal(run('shuffleCampaigns([{id:"only"}])[0].id'),'only');
run("go('brands')");const firstBrandsOrder=order();run('render()');assert.equal(order(),firstBrandsOrder);
run("query='Sol';render()");assert.equal(order(),firstBrandsOrder);run("query='';go('home')");const firstHomeOrder=order();
run("go('brands')");assert.notEqual(order(),firstBrandsOrder);assert.deepEqual(campaignIds(),idsBeforeShuffle);
run("go('home')");assert.notEqual(order(),firstHomeOrder);assert.equal(run('heroIndex'),0);
assert.equal(run('JSON.stringify(heroSlides.map(s=>s.brand.id))'),run('JSON.stringify(brands.slice(0,20).map(b=>b.id))'));
run("favorites=new Set(brands.slice(0,2).map(b=>b.id));go('favorites')");const favoriteOrder=()=>run('JSON.stringify(brands.filter(b=>favorites.has(b.id)).map(b=>b.id))');const firstFavoritesOrder=favoriteOrder();run('render()');assert.equal(favoriteOrder(),firstFavoritesOrder);
run("go('home');go('favorites')");assert.notEqual(favoriteOrder(),firstFavoritesOrder);assert.equal(run('favorites.size'),2);
run("favorites=new Set();go('home');Math.random=savedShuffleRandom");
console.log('PASS: page-entry shuffle changes each list, preserves all campaigns/favorites and stays stable during rerender/search.');
// More than twenty campaigns are capped; the twentieth remains reachable without overflowing the pager.
run("brands=Array.from({length:25},(_,i)=>({...brands[0],id:'carousel-'+i}));refreshCampaignOrder('home');render()");
assert.equal(run('heroSlides.length'),20);
assert.equal((get('app').innerHTML.match(/class="hero-slide"/g)||[]).length,20);
assert.equal((run('heroDots()').match(/data-action="hero"/g)||[]).length,20);
assert.match(get('app').innerHTML,/pager--many/);
await get('app').listeners.click({target:{closest:()=>({dataset:{action:'hero',index:'19'},closest:()=>null})}});
assert.equal(run('heroIndex'),19);assert.equal(get('hero-carousel').scrollLeft,19*get('hero-carousel').clientWidth);
get('hero-carousel').listeners.scroll();assert.equal(run('heroIndex'),19);
get('hero-carousel').listeners.keydown({target:get('hero-carousel'),key:'ArrowRight',preventDefault(){}});
assert.equal(get('hero-carousel').scrollLeft,19*get('hero-carousel').clientWidth);
await run('loadCampaigns()');run("go('brands');go('home')");
assert.equal(run('heroSlides.length'),Math.min(20,seed.length));
console.log('PASS: twenty-card cap, twenty pager controls, last-slide navigation and fewer-campaign fallback.');
run("selected=brands[0];go('detail')");get('slide-thumb').clientWidth=50;get('slide-track').clientWidth=350;get('slide-thumb').listeners.pointerdown({clientX:0,pointerId:1});get('slide-thumb').listeners.pointermove({clientX:100});get('slide-thumb').listeners.pointerup();assert.equal(requests.filter(r=>r.url==='/api/reveal').length,0);
get('slide-thumb').listeners.pointerdown({clientX:0,pointerId:1});get('slide-thumb').listeners.pointermove({clientX:300});get('slide-thumb').listeners.pointerup();await new Promise(r=>setImmediate(r));assert.match(get('slide-track').innerHTML,/SERVER-CODE/);
run("selected=brands[0];selected.channel='https://example.com/offer?a=1&b=2';go('detail')");
assert.match(get('app').innerHTML,/<span>example\.com<\/span>/);
assert.doesNotMatch(get('app').innerHTML,/https:\/\/example\.com\/offer/);
for(const channel of ['https://example.com/','http://example.com/path/','example.com/path?x=1','https://example.com/path#section']){
 run('selected.channel='+JSON.stringify(channel)+';go("detail")');
 assert.match(get('app').innerHTML,/<span>example\.com<\/span>/);
}
run("selected.channel='Online alışveriş';go('detail')");
assert.match(get('app').innerHTML,/<span>Online alışveriş<\/span>/);
assert.doesNotMatch(get('app').innerHTML,/data-action="open-website"|class="campaign-website"/);
assert.equal(box.openedWebsite,undefined);

for(const channel of ['Online alışveriş','javascript:alert(1)','http://example.com','https://user:password@example.com','<img src=x>']){
 run('selected.channel='+JSON.stringify(channel)+';go("detail")');
 assert.doesNotMatch(get('app').innerHTML,/class="campaign-website"/);
 assert.doesNotMatch(get('app').innerHTML,/<img src=x>/);
}
run("brands[0].offer='<img src=x onerror=alert(1)>';go('home')");assert.doesNotMatch(get('app').innerHTML,/<img src=x/);
run("selected=brands[0];selected.offer='<img src=x onerror=alert(1)>';selected.description='Özel açıklama <script>\\nİkinci satır';go('detail')");
assert.match(get('app').innerHTML,/Özel açıklama &lt;script&gt;/);assert.match(get('app').innerHTML,/&lt;img/);
assert.match(get('app').innerHTML,/İkinci satır/);assert.doesNotMatch(get('app').innerHTML,/<details>/);
run("go('home');brands[0].verticalPhoto='https://example.com/v.png';brands[0].heroPhoto='https://example.com/h.png';brands[1].squarePhoto='https://example.com/s.png';brands[1].latestPhoto='https://example.com/l.png';render()");
for(const file of ['v','s','l'])assert.ok(get('app').innerHTML.includes('https://example.com/'+file+'.png'));
assert.doesNotMatch(get('app').innerHTML,/Öne Çıkan Markalar/);
assert.ok(!get('app').innerHTML.includes('https://example.com/h.png'));assert.ok(get('app').innerHTML.includes(run('assetUrl(brands[0].photo)')));

run("filter='all';query='';go('brands')");
assert.match(get('app').innerHTML,/brand-logo-grid/);assert.equal((get('app').innerHTML.match(/class="brand-logo-card"/g)||[]).length,seed.length);
assert.doesNotMatch(get('app').innerHTML,/class="view-switch"|class="card-copy"|<h3>/);
run("favorites=new Set([brands[0].id,brands[1].id]);go('favorites')");
assert.match(get('app').innerHTML,/favorite-logo-grid/);assert.equal((get('app').innerHTML.match(/class="brand-logo-card"/g)||[]).length,2);
assert.doesNotMatch(get('app').innerHTML,/view-switch|card-copy|<h3>|<small>|brand-filter/);
assert.equal((get('app').innerHTML.match(/data-action="save"/g)||[]).length,2);
run("favorites=new Set();go('favorites')");assert.match(get('app').innerHTML,/Henüz favorin yok/);
run("go('home')");assert.equal((run('nav()').match(/data-page=/g)||[]).length,3);assert.doesNotMatch(run('nav()'),/>Profil</);
run("go('preferences')");for(const label of ['Ayarlar','Kullanıcı Sözleşmesi'])assert.ok(get('app').innerHTML.includes(label));assert.doesNotMatch(get('app').innerHTML,/Lokasyon Ayarları|Sağlık Verisi Ayarları|Kişisel Bilgileri|Kişisel [Aa]yarlar/);assert.match(get('app').innerHTML, /profile-card[^>]+data-page="personal"/);
run("go('personal')");assert.match(get('app').innerHTML,/profile-upload/);assert.match(get('app').innerHTML,/Misafir tercihleri/);run("profilePhoto='data:image/jpeg;base64,test';render()");assert.match(get('app').innerHTML,/Fotoğraf değiştir/);assert.match(get('app').innerHTML,/Fotoğrafı kaldır/);
if(run('notificationsAvailable')){
run("inboxLoaded=true;inbox=[{id:'test',title:'<script>',body:'<img src=x>',created:1,is_read:0}];go('notifications')");assert.match(get('app').innerHTML,/&lt;script&gt;/);assert.doesNotMatch(get('app').innerHTML,/<img src=x>|<script>/);
// Exercise the actual delegated click handler, including a concurrent feed refresh.
const originalFetch=box.fetch;let storedRead=false,failRead=false,resolveFeed,resolveRead;
box.fetch=async(url,opts)=>{
 if(url==='/api/notifications/read'){
  assert.deepEqual(JSON.parse(opts.body),{id:'test'});
  if(failRead==='network')throw 'Bağlantı kesildi.';
  if(failRead==='ack')return {ok:true,json:async()=>({ok:false,error:'Kayıt doğrulanamadı.'})};
  if(failRead)return {ok:false,json:async()=>({error:'Kayıt başarısız.'})};
  if(resolveRead)await new Promise(r=>{resolveRead=r});
  storedRead=true;return {ok:true,json:async()=>({ok:true})};
 }
 if(url==='/api/notifications'){
  const snapshot=storedRead?1:0;
  if(resolveFeed)await new Promise(r=>{resolveFeed=r});
  return {ok:true,json:async()=>({notifications:[{id:'test',title:'Test',body:'Duyuru',created:1,is_read:snapshot}],enabled:true})};
 }
 return originalFetch(url,opts);
};
const clickNotice=()=>get('app').listeners.click({target:{closest:()=>({dataset:{action:'read-notification',id:'test'},closest:()=>null})}});
resolveRead=true;const click=clickNotice();await Promise.resolve();
await run('loadInbox()');resolveRead();await click;resolveRead=null;
assert.equal(run('inbox[0].is_read'),1);assert.doesNotMatch(get('app').innerHTML,/unread-label|inbox-card unread/);
run("go('home');go('notifications')");assert.doesNotMatch(get('app').innerHTML,/unread-label/);
// Recreate client state and fetch again: persistence must come from the server.
run('readNotifications.clear();inbox=[];inboxLoaded=false');await run('loadInbox()');assert.equal(run('inbox[0].is_read'),1);
// A GET started before a successful POST must not restore an unread snapshot.
storedRead=false;resolveFeed=true;const refresh=run('loadInbox()');await Promise.resolve();
await clickNotice();resolveFeed();await refresh;resolveFeed=null;
assert.equal(run('inbox[0].is_read'),1);
for(const failure of [true,'network','ack']){
 failRead=failure;run("readNotifications.clear();inbox[0].is_read=0;render()");
 await clickNotice();assert.equal(run('inbox[0].is_read'),0);assert.match(get('app').innerHTML,/unread-label/);
 assert.match(get('toast').textContent,failure===true?/Kayıt başarısız/:failure==='ack'?/Kayıt doğrulanamadı/:/Bağlantı kesildi/);
}
failRead=false;run("inbox[0].campaign_id=brands[0].id;go('notifications')");
await clickNotice();assert.equal(run('page'),'detail');assert.equal(run('selected.id'),run('brands[0].id'));
box.fetch=originalFetch;
console.log('PASS: notification click, native request body, concurrent refresh, persisted read reload and visible request errors.');
}else{
run("go('home')");assert.doesNotMatch(get('app').innerHTML,/notification-button|data-page=\"notifications\"/);
run("go('preferences')");assert.doesNotMatch(get('app').innerHTML,/toggle-notifications|Bildirimlerim/);
run("go('notifications')");assert.equal(run('page'),'home');
assert.equal(requests.filter(r=>r.url.startsWith('/api/notifications')).length,0);
}

run("go('terms')");assert.match(get('app').innerHTML,/Literatür Masası Prime Kullanıcı Sözleşmesi/);assert.doesNotMatch(get('app').innerHTML,/532|TURKCELL/);run("go('cookies')");assert.match(get('app').innerHTML,/Çerez Tercihleri/);
run("go('home')");assert.match(get('app').innerHTML,/home-search-form/);assert.match(get('app').innerHTML,/home-settings/);assert.doesNotMatch(get('app').innerHTML,/avatar-button|header-spacer/);
get('home-search-input').value=seed[1].name;get('home-search-form').listeners.submit({preventDefault(){}});assert.equal(run('page'),'brands');assert.equal(run('query'),seed[1].name);assert.equal(run('filtered().length'),1);

// Deletion requires explicit confirmation and a successful server acknowledgement.
run("loggedIn=true;favorites=new Set(['solgar']);profilePhoto='data:image/png;base64,test';go('preferences')");
assert.match(get('app').innerHTML,/Erişimimi ve verilerimi sil/);
const beforeDelete=requests.length;run("go('deleteAccount')");assert.match(get('app').innerHTML,/geri alınamaz/);
run("go('preferences')");assert.equal(requests.length,beforeDelete);
const deletionFetch=box.fetch;let deletionMode='offline';
box.localStorage.removeItem=key=>{(box.removedKeys??=[]).push(key)};
box.fetch=async(url,opts)=>{
 if(url==='/api/delete-account'){
  if(deletionMode==='offline')throw Error('Bağlantı kesildi.');
  return {ok:true,json:async()=>deletionMode==='ack'?{ok:true}:{ok:true,deleted:true}};
 }
 return deletionFetch(url,opts);
};
const confirmDelete=()=>get('app').listeners.click({target:{closest:selector=>selector==='[data-action]'?{dataset:{action:'confirm-delete-account'},closest:()=>null}:null}});
run("go('deleteAccount')");await confirmDelete();assert.equal(run('loggedIn'),true);assert.equal(run('favorites.size'),1);assert.equal(box.removedKeys,undefined);
deletionMode='ack';await confirmDelete();assert.equal(run('loggedIn'),true);assert.match(get('toast').textContent,/doğrulanamadı/);
deletionMode='ok';await confirmDelete();assert.equal(run('loggedIn'),false);assert.equal(run('page'),'login');assert.equal(run('favorites.size'),0);assert.equal(run('profilePhoto'),null);assert.ok(box.removedKeys.includes('lmprime-photo'));assert.ok(box.removedKeys.includes('lmprime-favorites'));assert.equal(run('deletingAccount'),false);
console.log('PASS: deletion confirmation, cancellation, offline failure, missing server acknowledgement and local data removal.');
console.log('PASS: server-validated login, no demo bypass, up-to-20-slide carousel, short/full swipe, server-only campaign code, escaped campaign content.');
})().catch(e=>{console.error(e);process.exitCode=1});
