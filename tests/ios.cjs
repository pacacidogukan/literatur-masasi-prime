const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
for(const name of ['app.js','icons.js','index.html','style.css','artwork-contract.js','artwork.css'])assert.equal(fs.readFileSync('ios/ui/'+name,'utf8'),fs.readFileSync('ios/Prime/Resources/Web/'+name,'utf8'),'Native source and bundle differ: '+name);
const listeners={};class El{constructor(){this.style={};this.dataset={};this.classList={contains(){return false},add(){},remove(){}};this.innerHTML='';this.scrollTop=0;this.clientHeight=800;this.isConnected=true;this.notes=[]}querySelector(s){return s==='#ps-screen'?screen:s==='.ps-slidefooter'?this:null}querySelectorAll(){return []}addEventListener(k,f){(listeners[k]??=[]).push(f)}append(x){this.notes.push(x)}setAttribute(){}focus(){}}
let timerId=0;const timers=new Map();const screen=new El,root=new El,store=new Map,requests=[];let fail=false,revealFailure=false,copyFailure=false,deleteAcknowledged=true;const rows=[{cardArtwork:{large:'https://example.com/portrait.png',compact:'https://example.com/compact.png',square:'https://example.com/square.png',detail:'https://example.com/detail.png',code:'https://example.com/ticket.png',lastDay:'https://example.com/lastday.png'},id:'live',name:'Solgar',offer:'%25 indirim',description:'Seçili ürünler',conditions:'Geçerli koşullar',asset:'assets/solgar.png',photo:'https://example.com/detail.png',squarePhoto:'https://example.com/square.png',verticalPhoto:'https://example.com/portrait.png',latestPhoto:'https://example.com/compact.png',channel:'https://example.com',expires:0,hasCode:1,demo:0,benefitCategories:['Ürün İndirimleri'],discountPercent:25},{id:'no-code',name:'Other',offer:'200 TL indirim',channel:'https://example.com',photo:'https://example.com/photo.png',expires:0,hasCode:0,demo:0,benefitCategories:['Sepette İndirim']},{id:'demo',demo:1},{id:'expired',expires:1,demo:0}];
const box={console,URL,Intl,Date,Set,Map,JSON,ResizeObserver:class{observe(){}},setInterval:()=>1,clearInterval(){},setTimeout:(fn,delay)=>{const id=++timerId;timers.set(id,{fn,delay});return id;},clearTimeout:id=>timers.delete(id),localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},document:{hidden:false,getElementById:()=>root,querySelectorAll:()=>[],createElement:()=>new El,addEventListener(){}},window:{matchMedia:()=>({matches:false}),webkit:{messageHandlers:{primeAPI:{async postMessage({path,body}){requests.push({path,body});if(fail&&path==='campaigns')throw Error('offline');if(path==='me')return {status:200,data:{authorized:false}};if(path==='access')return {status:201,data:{authorized:true}};if(path==='campaigns')return {status:200,data:{campaigns:rows}};if(path==='reveal')return {status:200,data:revealFailure?{expired:true}:{code:'SPRING26'}};if(path==='delete-account')return {status:200,data:{ok:true,deleted:deleteAcknowledged}};if(path==='copy'&&copyFailure)throw Error('clipboard');return {status:200,data:{ok:true}};}}}}}};
vm.createContext(box);vm.runInContext(fs.readFileSync('ios/ui/artwork-contract.js','utf8'),box);vm.runInContext(fs.readFileSync('ios/Prime/Resources/Web/icons.js','utf8'),box);let source=fs.readFileSync('ios/Prime/Resources/Web/app.js','utf8');vm.runInContext(source.replace(/^\(\(\)=>\{/,'').replace(/\}\)\(\);\s*$/,''),box);const run=s=>vm.runInContext(s,box);
(async()=>{await new Promise(r=>setImmediate(r));assert.equal(run('loaded'),true);assert.equal(run('offers.length'),2);// Exercise the real timer callbacks against a virtual clock and visible rails.
const realDate=box.Date,realSetTimeout=box.setTimeout,originalQuery=root.querySelector.bind(root);let clock=Date.now();const moves=[];
box.Date=class extends Date{static now(){return clock}};
box.setTimeout=(fn,delay)=>{const id=++timerId;timers.set(id,{fn,delay,due:clock+delay});return id;};
const makeRail=kind=>({children:[{dataset:{cardBrand:'A'}},{dataset:{cardBrand:'B'}}],clientWidth:360,scrollLeft:0,getBoundingClientRect:()=>({top:10,bottom:130}),scrollTo:point=>moves.push({kind,...point})});const codeRail=makeRail('code'),lastRail=makeRail('lastDay');
root.querySelector=selector=>selector==='.ps-coderail'?codeRail:selector==='.ps-lastdayrail'?lastRail:originalQuery(selector);screen.getBoundingClientRect=()=>({top:0,bottom:800});
const tick=ms=>{clock+=ms;for(const [id,timer] of [...timers])if(timer.due<=clock){timers.delete(id);timer.fn();}};
run('resetBannerTimers()');tick(6999);assert.equal(moves.length,0);tick(1);assert.deepEqual(moves.map(m=>m.kind),['code']);tick(3500);assert.deepEqual(moves.map(m=>m.kind),['code','lastDay'],'Last Day starts half a period later');tick(1000);
box.bannerTouch={target:{closest:()=>({classList:{contains:()=>false}})}};run('pauseCardMotion(bannerTouch)');tick(6000);assert.deepEqual(moves.map(m=>m.kind),['code','lastDay','lastDay'],'Only touched rail restarts; the other keeps its deadline');tick(999);assert.equal(moves.length,3);tick(1);assert.equal(moves.at(-1).kind,'code','Code advances exactly seven seconds after its touch');box.document.hidden=true;tick(7000);assert.equal(moves.length,4,'Background pages stay still');box.document.hidden=false;box.Date=realDate;box.setTimeout=realSetTimeout;root.querySelector=originalQuery;run('resetBannerTimers()');
// Home section links must open complete lists and preserve the return page.
const clickRoute=dataset=>{for(const handler of listeners.click||[])handler({target:{closest:selector=>selector==='button'?{dataset}:null}});};
assert.match(run('discovery()'),/Marka Kampanyaları/);
assert.match(run('codeFeature(offers)'),/Kampanya kodlu tüm fırsatları gör/);
run("view='home';query='previous search';campaignBrand='stale brand';navigation.length=0;render()");screen.scrollTop=175;
clickRoute({homeAll:'1'});
assert.equal(run('view'),'campaigns');assert.equal(run('campaignBrand'),'Tümü');assert.equal(run('query'),'');
assert.match(screen.innerHTML,/data-offer-id="live"/);assert.match(screen.innerHTML,/data-offer-id="no-code"/);
clickRoute({action:'back'});assert.equal(run('view'),'home');assert.equal(run('query'),'previous search');assert.equal(screen.scrollTop,175);
run("query='';campaignBrand='Tümü';render()");
clickRoute({type:'Kampanya Kodu'});assert.equal(run('view'),'category');assert.equal(run('selectedCategory'),'Kampanya Kodu');
assert.match(screen.innerHTML,/data-offer-id="live"/);assert.doesNotMatch(screen.innerHTML,/data-offer-id="no-code"/);
clickRoute({action:'back'});assert.equal(run('view'),'home');
// Newest section uses only immutable publication dates within a rolling seven days.
const publicationNow=Math.floor(Date.now()/1000);
run('hydrate('+JSON.stringify([{...rows[0],id:'recent',publishedAt:publicationNow-86400},{...rows[0],id:'boundary',publishedAt:publicationNow-7*86400},{...rows[0],id:'too-old',publishedAt:publicationNow-7*86400-1,updated:publicationNow},{...rows[0],id:'unknown'},{...rows[0],id:'future',publishedAt:publicationNow+60}])+')');
assert.deepEqual(Array.from(run('newestOffers(offers,'+publicationNow+').map(o=>o.id)')),['recent','boundary']);
assert.doesNotMatch(run('newestFeature(offers)'),/data-offer="too-old"|data-offer="unknown"|data-offer="future"/);
clickRoute({newest:'1'});assert.equal(run('view'),'newest');assert.match(screen.innerHTML,/data-offer-id="recent"/);assert.doesNotMatch(screen.innerHTML,/data-offer-id="too-old"/);
clickRoute({campaignGroup:'Solgar'});assert.equal(run('campaignOrigin'),'newest');assert.doesNotMatch(screen.innerHTML,/data-offer="too-old"/);
clickRoute({action:'back'});assert.equal(run('view'),'newest');clickRoute({action:'back'});assert.equal(run('view'),'home');
assert.equal(run('newestOffers(offers,'+(publicationNow+8*86400)+').length'),0);
assert.match(run('newestFeature([])'),/Son 7 günde yayınlanan yeni bir kampanya bulunmuyor/);
run('hydrate('+JSON.stringify(rows)+');navigation.length=0');
// The native frame reserves each exact ratio with an in-flow replaced element, even before images load.
for(const [slot,size] of Object.entries(run('artworkContract.slots'))){
 const markup=run('campaignImage(offers[0],'+JSON.stringify(slot)+')');
 assert.match(markup,new RegExp('class="ps-artwork-spacer" width="'+size.width+'" height="'+size.height+'"'));
}
// Route the dataset extracted from actual row markup, so metadata cannot shadow offer navigation.
for(const page of ['home','brands','campaigns']){
 run("view="+JSON.stringify(page)+";query='Solgar';navigation.length=0;render()");screen.scrollTop=90;
 const html=run('searchResults()');const tag=html.match(/<button[^>]+data-offer="live"[^>]*>/)[0];
 const dataset=Object.fromEntries([...tag.matchAll(/data-([a-z-]+)="([^"]*)"/g)].map(([,key,value])=>[key.replace(/-([a-z])/g,(_,c)=>c.toUpperCase()),value]));
 assert.equal(dataset.brand,undefined,'Campaign row must not carry a conflicting brand route');
 clickRoute(dataset);assert.equal(run('view'),'detail');assert.equal(run('current.id'),'live');assert.match(screen.innerHTML,/Prime Ayrıcalıkları/);
 clickRoute({action:'back'});assert.equal(run('view'),page);assert.equal(run('query'),'Solgar');assert.equal(screen.scrollTop,90);
}
run("view='home';query='';navigation.length=0;render()");
const prior=run('capturePage()');assert.equal(prior.view,'home');run("current=offers[1];view='detail';restorePage(capturePage())");assert.match(screen.innerHTML,/Kampanya sayfasına git/);assert.equal(screen.style.overflowY,'hidden');run("view='home';render()");assert.equal(screen.style.overflowY,'auto');const railHtml=run("codeFeature(Array.from({length:37},(_,i)=>({...offers[0],id:'coupon-'+i,brand:'Brand '+i})))");assert.equal((railHtml.match(/data-offer=/g)||[]).length,37);assert.equal((railHtml.match(/ps-nativecount ps-codecount/g)||[]).length,37);assert.match(railHtml,/>1\/37<\/span>/);assert.match(railHtml,/>37\/37<\/span>/);assert.doesNotMatch(railHtml,/ps-codedots|data-code-slide/);assert.match(run('codeFeature([offers[0]])'),/>1\/1<\/span>/);assert.equal(run('codeFeature([offers[1]])'),'');const lastDayHtml=run("lastDayFeature([{...offers[0],expires:Math.floor(Date.now()/1000)+3600},{...offers[1],expires:Math.floor(Date.now()/1000)+7200}])");assert.match(lastDayHtml,/>1\/2<\/span>/);assert.match(lastDayHtml,/>2\/2<\/span>/);assert.doesNotMatch(lastDayHtml,/ps-codedots|ps-lastdaydots/);assert.equal(run('lastDayFeature(offers)'), '');const previousTimerIds=[...timers.keys()];run('pauseCardMotion(bannerTouch)');assert.equal(timers.size,2);assert.equal(previousTimerIds.filter(id=>!timers.has(id)).length,1,'Touch resets one timer only');assert([...timers.values()].some(t=>t.delay===7000));assert(run('cardMotionPauseUntil-Date.now()')<=7000);assert(run('cardMotionPauseUntil-Date.now()')>6900);assert.match(run('detailAction(offers[1])'),/Kampanya sayfasına git/);assert.doesNotMatch(run('detailAction(offers[1])'),/ps-reveal|sağa kaydır/);assert.match(run('detailAction(offers[0])'),/ps-reveal/);for(const hasCode of [0,1]){run('var giftFixture={...offers[0],hasCode:'+hasCode+",benefitCategories:['Hediyeli Alışveriş']};revealed=false");const h=run('detailAction(giftFixture)');assert.equal(/ps-reveal/.test(h),!!hasCode);assert.equal(/Kampanya sayfasına git/.test(h),!hasCode);}assert.doesNotMatch(run('filter()'),/Kullanım yöntemi|Kodlu|Kodsuz/);
 assert.equal(run("imagePoster(offers[0],'small')"),'https://example.com/compact.png');assert(requests.some(x=>x.path==='access'));assert(!source.includes('LUMA50-DEMO'));assert(!source.includes('fetch('));assert(!source.includes('unpkg.com'));assert(!screen.innerHTML.includes('Uygulamada kal'));
run("current=offers[0];view='detail';revealed=false");assert(!run('detail()').includes('SPRING26'));assert(run('categoriesFor(current)').includes('Kampanya Kodu'));assert(!run('categoriesFor(offers[1])').includes('Kampanya Kodu'));await run('revealCode()');assert.equal(run('revealed'),true);assert(run('detail()').includes('SPRING26'));await run('copyCurrentCode()');assert.equal(requests.at(-1).body.text,'SPRING26');assert(run('copyNotice'));assert(!run('detail()').includes('Uygulamada kal'));assert(run('detail()').includes('ps-copyhandle'));
run("copyNotice=false");copyFailure=true;await run('copyCurrentCode()');assert.equal(run('copyNotice'),false);copyFailure=false;
run("revealed=false;current.code=''");revealFailure=true;await run('revealCode()');assert.equal(run('revealed'),false);revealFailure=false;
run("discountThreshold='25'");assert.equal(run('discountOffers().length'),1);run("selectedCategory='Sepette İndirim'");assert(run('categorypage()').includes('no-code'));assert(!run('categorypage()').includes('data-offer-id="live"'));
run("favorites.add('live');persistFavorites()");assert(store.get('lmprime-favorites').includes('live'));assert(run('nativeFavorites()').includes('Solgar'));
assert(run('copySheetDismissal(100,400,360)'));assert(!run('copySheetDismissal(-90,100,360)'));assert(!run('copySheetDismissal(0,10,360)'));
fail=true;await run('start()');assert(screen.innerHTML.includes('Kampanyalar yüklenemedi'));assert(!screen.innerHTML.includes('Yeni ayrıcalıklar yakında'));fail=false;await run('start()');assert.equal(run('loaded'),true);assert.equal(run('loadError'),false);
run("current=offers[0];current.expires=1;revealed=false");const before=requests.length;await run('revealCode()');assert.equal(before,requests.length);

// Storage failures must preserve the previous favorite state and show a retry error.
const originalStorageWrite=box.localStorage.setItem;
box.localStorage.setItem=()=>{throw Error('QuotaExceededError');};
assert.equal(run("toggleFavorite('no-code')"),false);
assert.equal(run("favorites.has('no-code')"),false);
assert.equal(run("toggleFavorite('live')"),false);
assert.equal(run("favorites.has('live')"),true);
assert(screen.notes.some(note=>note.textContent.includes('Favori tercihin kaydedilemedi')));
box.localStorage.setItem=originalStorageWrite;
assert.equal(run("toggleFavorite('no-code')"),true);
assert(store.get('lmprime-favorites').includes('no-code'));
assert.equal(run("toggleFavorite('no-code')"),true);
assert(!store.get('lmprime-favorites').includes('no-code'));

// A photo must never appear saved after its storage write fails.
box.FileReader=class {
 readAsDataURL(){this.result='data:image/png;base64,new-photo';this.onload();}
};
run("settingsPhoto='data:image/png;base64,previous-photo';view='personal';render()");
box.localStorage.setItem=()=>{throw Error('QuotaExceededError');};
for(const handler of listeners.change||[])handler({target:{id:'ps-settings-photo',files:[{type:'image/png',size:1024}]}});
assert.equal(run('settingsPhoto'),'data:image/png;base64,previous-photo');
assert(screen.notes.some(note=>note.textContent.includes('Fotoğraf kaydedilemedi')));
box.localStorage.setItem=originalStorageWrite;
for(const handler of listeners.change||[])handler({target:{id:'ps-settings-photo',files:[{type:'image/png',size:1024}]}});
assert.equal(run('settingsPhoto'),'data:image/png;base64,new-photo');
assert.match(store.get('lmprime-photo'),/new-photo/);

// A successful HTTP response alone must not clear local data.
deleteAcknowledged=false;
await run('deleteData()');
assert.equal(run('favorites.size'),1);
assert(store.get('lmprime-favorites').includes('live'));
assert(screen.notes.some(note=>note.textContent.includes('Veriler silinemedi')));
deleteAcknowledged=true;
await run('deleteData()');
assert(requests.some(x=>x.path==='delete-account'));
assert.equal(run('favorites.size'),0);

// Brand directory always shows every active campaign as shared horizontal rows.
run('hydrate('+JSON.stringify([...rows,{...rows[0],id:'second-brand-offer',offer:'İkinci fırsat',cardArtwork:undefined}])+')');
run("view='brands';query='stale';type='Sepette İndirim';navigation.length=0;render()");
clickRoute({brand:'Solgar'});
assert.equal(run('view'),'brand');assert.match(screen.innerHTML,/2 kampanya/);
assert.match(screen.innerHTML,/ps-nativelist/);assert.doesNotMatch(screen.innerHTML,/ps-feed|ps-poster/);
assert.match(screen.innerHTML,/data-offer="live"/);assert.match(screen.innerHTML,/data-offer="second-brand-offer"/);
assert.doesNotMatch(screen.innerHTML,/data-offer="no-code"|data-offer="expired"/);
assert.match(screen.innerHTML,/Seçili ürünler/);
clickRoute({offer:'second-brand-offer'});assert.equal(run('view'),'detail');
clickRoute({action:'back'});assert.equal(run('view'),'brand');assert.match(screen.innerHTML,/2 kampanya/);
run('hydrate('+JSON.stringify(rows)+')');

// Search matches brands, offer titles and descriptions consistently on every screen.
for(const query of [' solgar ', ' %25 İNDİRİM ', ' seçili ürünler ']){
 run('query='+JSON.stringify(query));
 assert.deepEqual(Array.from(run('matchingBrands()')),['Solgar']);
 assert.match(run('brands()'),/data-offer="live"[^>]*aria-label="Solgar: %25 indirim"/);
 assert.match(run('nativeCampaigns()'),/data-offer-id="live"/);
 for(const output of [run('brands()'),run('nativeCampaigns()'),run('discovery()')]){assert.match(output,/ps-nativelist/);assert.doesNotMatch(output,/ps-brandgrid|ps-nativerail|ps-carousel/);}
 assert.doesNotMatch(run('nativeCampaigns()'),/data-offer-id="no-code"/);
}
run("query='does-not-exist'");
assert.equal(run('matchingBrands().length'),0);
run("view='home';query='solgar';navigation.length=0;render()");clickRoute({offer:'live'});assert.equal(run('view'),'detail');clickRoute({action:'back'});assert.equal(run('view'),'home');assert.equal(run('query'),'solgar');assert.match(screen.innerHTML,/ps-nativelist/);
run('hydrate('+JSON.stringify([{...rows[0],id:'pending-native',cardArtwork:undefined}])+');query="";type="Tümü"');assert.equal(run('offers[0].artworkReady'),false);assert.match(run('feed(offers)'),/ps-nativelist/);assert.doesNotMatch(run('feed(offers)'),/ps-poster/);assert.equal(run("poster(offers[0],'small')"),'');
run('hydrate('+JSON.stringify(rows)+');query="";campaignBrand="Tümü"');

// All twelve categories resolve without losing coded/codeless gift behavior.
assert.equal(run('cats.length-1'),12);
for(const category of Array.from(run('cats.slice(1).map(c=>c[0])'))){
 run('hydrate([{...offers[0].raw,id:"category-fixture",expires:Math.floor(Date.now()/1000)+3600,hasCode:1,benefitCategories:['+JSON.stringify(category)+']}]);selectedCategory='+JSON.stringify(category));
 assert.match(run('categorypage()'),/data-offer-id="category-fixture"/);
 run("campaignGroup=offers[0].brand;campaignOrigin='category'");
 assert.match(run('nativeCampaignGroup()'),/data-offer="category-fixture"/);
}
run('hydrate([])');
assert.match(run('discovery()'),/Yeni ayrıcalıklar yakında/);
assert.match(run('nativeFavorites()'),/Henüz favorin yok/);
console.log('PASS: acknowledged deletion, brand/offer/description search, twelve category pages and empty feeds.');

assert.equal(run("website('javascript:alert(1)')"),'');assert.equal(run("website('https://user:pass@example.com')"),'');console.log('PASS: native production feed, demo/expiry exclusion, categories, thresholds, server-only reveal, native copy failures, favorites, delete, retry and sheet dismissal.');})().catch(e=>{console.error(e);process.exit(1)});
