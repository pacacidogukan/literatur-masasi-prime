const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
for(const name of ['app.js','icons.js','index.html','style.css'])assert.equal(fs.readFileSync('ios/ui/'+name,'utf8'),fs.readFileSync('ios/Prime/Resources/Web/'+name,'utf8'),'Native source and bundle differ: '+name);
const listeners={};class El{constructor(){this.style={};this.dataset={};this.classList={contains(){return false},add(){},remove(){}};this.innerHTML='';this.scrollTop=0;this.clientHeight=800;this.isConnected=true;this.notes=[]}querySelector(s){return s==='#ps-screen'?screen:s==='.ps-slidefooter'?this:null}querySelectorAll(){return []}addEventListener(k,f){(listeners[k]??=[]).push(f)}append(x){this.notes.push(x)}setAttribute(){}focus(){}}
const screen=new El,root=new El,store=new Map,requests=[];let fail=false,revealFailure=false,copyFailure=false,deleteAcknowledged=true;const rows=[{id:'live',name:'Solgar',offer:'%25 indirim',description:'Seçili ürünler',conditions:'Geçerli koşullar',asset:'assets/solgar.png',photo:'https://example.com/detail.png',squarePhoto:'https://example.com/square.png',verticalPhoto:'https://example.com/portrait.png',latestPhoto:'https://example.com/compact.png',channel:'https://example.com',expires:0,hasCode:1,demo:0,benefitCategories:['Ürün İndirimleri'],discountPercent:25},{id:'no-code',name:'Other',offer:'200 TL indirim',channel:'https://example.com',photo:'https://example.com/photo.png',expires:0,hasCode:0,demo:0,benefitCategories:['Sepette İndirim']},{id:'demo',demo:1},{id:'expired',expires:1,demo:0}];
const box={console,URL,Intl,Date,Set,Map,JSON,ResizeObserver:class{observe(){}},setInterval:()=>1,clearInterval(){},setTimeout:()=>1,localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},document:{hidden:false,getElementById:()=>root,querySelectorAll:()=>[],createElement:()=>new El,addEventListener(){}},window:{matchMedia:()=>({matches:false}),webkit:{messageHandlers:{primeAPI:{async postMessage({path,body}){requests.push({path,body});if(fail&&path==='campaigns')throw Error('offline');if(path==='me')return {status:200,data:{authorized:false}};if(path==='access')return {status:201,data:{authorized:true}};if(path==='campaigns')return {status:200,data:{campaigns:rows}};if(path==='reveal')return {status:200,data:revealFailure?{expired:true}:{code:'SPRING26'}};if(path==='delete-account')return {status:200,data:{ok:true,deleted:deleteAcknowledged}};if(path==='copy'&&copyFailure)throw Error('clipboard');return {status:200,data:{ok:true}};}}}}}};
vm.createContext(box);vm.runInContext(fs.readFileSync('ios/Prime/Resources/Web/icons.js','utf8'),box);let source=fs.readFileSync('ios/Prime/Resources/Web/app.js','utf8');vm.runInContext(source.replace(/^\(\(\)=>\{/,'').replace(/\}\)\(\);\s*$/,''),box);const run=s=>vm.runInContext(s,box);
(async()=>{await new Promise(r=>setImmediate(r));assert.equal(run('loaded'),true);assert.equal(run('offers.length'),2);const prior=run('capturePage()');assert.equal(prior.view,'home');run("current=offers[1];view='detail';restorePage(capturePage())");assert.match(screen.innerHTML,/Kampanya sayfasına git/);assert.equal(screen.style.overflowY,'hidden');run("view='home';render()");assert.equal(screen.style.overflowY,'auto');assert.equal(run('codeDotIndices(37,36).length'),20);const railHtml=run("codeFeature(Array.from({length:37},(_,i)=>({...offers[0],id:'coupon-'+i,brand:'Brand '+i})))");assert.equal((railHtml.match(/data-code-slide=/g)||[]).length,20);assert.equal((railHtml.match(/data-offer=/g)||[]).length,37);assert.equal(run('codeDotIndices(37,36).at(-1)'),36);assert.equal(run('codeDotIndices(5,4).length'),5);assert.match(run('detailAction(offers[1])'),/Kampanya sayfasına git/);assert.doesNotMatch(run('detailAction(offers[1])'),/ps-reveal|sağa kaydır/);assert.match(run('detailAction(offers[0])'),/ps-reveal/);for(const hasCode of [0,1]){run('var giftFixture={...offers[0],hasCode:'+hasCode+",benefitCategories:['Hediyeli Alışveriş']};revealed=false");const h=run('detailAction(giftFixture)');assert.equal(/ps-reveal/.test(h),!!hasCode);assert.equal(/Kampanya sayfasına git/.test(h),!hasCode);}assert.doesNotMatch(run('filter()'),/Kullanım yöntemi|Kodlu|Kodsuz/);
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

// Search matches brands, offer titles and descriptions consistently on every screen.
for(const query of [' solgar ', ' %25 İNDİRİM ', ' seçili ürünler ']){
 run('query='+JSON.stringify(query));
 assert.deepEqual(Array.from(run('matchingBrands()')),['Solgar']);
 assert.match(run('brands()'),/data-brand="Solgar"[^>]*?(?<!hidden)>/);
 assert.match(run('nativeCampaigns()'),/data-offer-id="live"/);
 assert.doesNotMatch(run('nativeCampaigns()'),/data-offer-id="no-code"/);
}
run("query='does-not-exist'");
assert.equal(run('matchingBrands().length'),0);
run("query='';campaignBrand='Tümü'");

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
