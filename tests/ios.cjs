const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
for(const name of ['app.js','icons.js','index.html','style.css','artwork-contract.js','artwork.css'])assert.equal(fs.readFileSync('ios/ui/'+name,'utf8'),fs.readFileSync('ios/Prime/Resources/Web/'+name,'utf8'),'Native source and bundle differ: '+name);
assert.deepEqual(fs.readFileSync('ios/ui/outfit.woff2'),fs.readFileSync('ios/Prime/Resources/Web/outfit.woff2'),'Bundled Outfit font differs from source');
assert.equal(fs.readFileSync('ios/ui/outfit-OFL.txt','utf8'),fs.readFileSync('ios/Prime/Resources/Web/outfit-OFL.txt','utf8'),'Bundled Outfit license differs from source');
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
run("view='home';query='previous search';navigation.length=0;render()");screen.scrollTop=175;
clickRoute({homeAll:'1'});
assert.equal(run('view'),'campaigns');assert.equal(run('campaignBrand'),'Tümü');assert.equal(run('query'),'');
assert.match(screen.innerHTML,/data-offer-id="live"/);assert.match(screen.innerHTML,/data-offer-id="no-code"/);
clickRoute({action:'back'});assert.equal(run('view'),'home');assert.equal(run('query'),'previous search');assert.equal(screen.scrollTop,175);
run("query='';campaignBrand='Tümü';render()");
clickRoute({type:'Kampanya Kodu'});assert.equal(run('view'),'category');assert.equal(run('selectedCategory'),'Kampanya Kodu');
assert.match(screen.innerHTML,/data-offer-id="live"/);assert.doesNotMatch(screen.innerHTML,/data-offer-id="no-code"/);
clickRoute({action:'back'});assert.equal(run('view'),'home');
// The Trendyol lane accepts only reviewed authorized-seller campaigns.
const trendyolFixture={...rows[0],id:'trendyol-reviewed',name:'Fixture',channel:'Trendyol · Yetkili Satıcı',campaignPage:'https://www.trendyol.com/sr?mid=1416'};
run('hydrate('+JSON.stringify([...rows,trendyolFixture,
 {...trendyolFixture,id:'trendyol-outside',campaignPage:'https://example.com'},
 {...trendyolFixture,id:'trendyol-unknown-seller',channel:'https://www.trendyol.com'},
 {...trendyolFixture,id:'trendyol-unreviewed',cardArtwork:undefined},
 {...trendyolFixture,id:'trendyol-expired',expires:1}
])+');render()');
const lane=run('trendyolFeature(offers)');
assert.match(lane,/Hepsini Gör/);
assert.match(lane,/data-artwork-slot="lastDay"/);
assert.doesNotMatch(lane,/ps-trendyol-lockup|trendyol-authorized-seller.svg/);
const trendyolArtwork=Array.from(run('composedTrendyolArtwork.entries()'));
for(const [source,bundled] of trendyolArtwork){
 assert.match(source,/^https:\/\/prime-campaign-editor\.pacacidogukan\.chatgpt\.site\/assets\//);
 assert(fs.existsSync('ios/Prime/Resources/Web/assets/'+bundled),bundled);
}
const [sampleSource,sampleFile]=trendyolArtwork.find(([,filename])=>filename.includes('lastDay'));
run('lastDayArt["trendyol-reviewed"]='+JSON.stringify(sampleSource));
assert(run('trendyolFeature(offers)').includes('assets/'+sampleFile));
run('lastDayArt["trendyol-reviewed"]="https://example.com/revised.png"');
assert(run('trendyolFeature(offers)').includes('https://example.com/revised.png'));

assert.deepEqual(Array.from(run('trendyolOffers().map(o=>o.id)')),['trendyol-reviewed']);
run('hydrate('+JSON.stringify([
 {...trendyolFixture,id:'sovital-first',name:'SOVITAL'},
 {...trendyolFixture,id:'sovital-second',name:'Sovital'},
])+')');
run("view='trendyol';query='';selectedCategory='Tümü';filterGroup='brands';filterDraft=emptyCampaignFilters()");
const brandSheet=run('campaignFilterSheetHTML()');
assert.equal((brandSheet.match(/data-filter-group="brands"/g)||[]).length,1);
run("campaignFilters.brands=['SOVITAL']");
assert.deepEqual(Array.from(run("filteredCampaigns(campaignFilters,'trendyol').map(o=>o.id)")),['sovital-first','sovital-second']);
run("view='home';campaignFilters=emptyCampaignFilters();hydrate("+JSON.stringify([...rows,trendyolFixture])+");render()");

assert.ok(screen.innerHTML.indexOf('Marka Kampanyaları')<screen.innerHTML.indexOf('ps-trendyolfeature'));
screen.scrollTop=146;
clickRoute({view:'trendyol'});assert.equal(run('view'),'trendyol');assert.match(screen.innerHTML,/data-offer-id="trendyol-reviewed"/);assert.match(screen.innerHTML,/data-artwork-slot="square"/);
clickRoute({offer:'trendyol-reviewed'});assert.equal(run('view'),'detail');
clickRoute({action:'back'});assert.equal(run('view'),'trendyol');
clickRoute({action:'back'});assert.equal(run('view'),'home');assert.equal(screen.scrollTop,146);
run('hydrate('+JSON.stringify(rows)+')');
assert.match(run('trendyolFeature(offers)'),/Şu anda yayında Trendyol kampanyası yok/);
// All marketplace lanes share the Trendyol contract, while keeping offers isolated.
const marketRows=['amazon','hepsiburada'].flatMap(scope=>{
 const name=scope==='amazon'?'Amazon':'Hepsiburada',host=scope==='amazon'?'www.amazon.com.tr':'www.hepsiburada.com';
 const row={...trendyolFixture,id:scope+'-one',name:'SOVITAL',channel:name+' · Yetkili Satıcı',campaignPage:'https://'+host+'/offer-one',hasCode:0};
 return [row,{...row,id:scope+'-two',name:'Sovital'},{...row,id:scope+'-other',name:'Other'},{...row,id:scope+'-wrong-host',campaignPage:'https://example.com'},{...row,id:scope+'-unknown',channel:name},{...row,id:scope+'-missing-art',cardArtwork:undefined},{...row,id:scope+'-expired',expires:1}];
});
run('hydrate('+JSON.stringify([...rows,trendyolFixture,...marketRows])+');view="home";query="";render()');
assert(screen.innerHTML.indexOf('data-marketplace="trendyol"')<screen.innerHTML.indexOf('data-marketplace="amazon"'));
assert(screen.innerHTML.indexOf('data-marketplace="amazon"')<screen.innerHTML.indexOf('data-marketplace="hepsiburada"'));
for(const scope of ['amazon','hepsiburada']){
 assert.deepEqual(Array.from(run(`marketplaceOffers('${scope}').map(o=>o.id)`)),[scope+'-one',scope+'-two',scope+'-other']);
 const feature=run(`marketplaceFeature('${scope}',offers)`);assert.match(feature,/1\/2/);assert.match(feature,/2\/2/);assert.equal((feature.match(/data-offer=/g)||[]).length,2);
 clickRoute({view:scope});assert.equal(run('view'),scope);assert.match(screen.innerHTML,/data-artwork-slot="square"/);assert.match(screen.innerHTML,/data-filter-open="sort"/);assert.match(screen.innerHTML,/ps-native-query/);
 assert.match(screen.innerHTML,new RegExp('data-offer-id="'+scope+'-one"'));assert.doesNotMatch(screen.innerHTML,/trendyol-reviewed|wrong-host|missing-art/);
 run('query="sovital";render()');assert.equal((screen.innerHTML.match(/data-brand-group=/g)||[]).length,1);
 clickRoute({campaignGroup:'SOVITAL'});assert.equal(run('campaignOrigin'),scope);assert.equal((screen.innerHTML.match(/data-offer-id=/g)||[]).length,2);
 clickRoute({action:'back'});clickRoute({action:'back'});assert.equal(run('view'),'home');
}
// Marketplace filter: only the three approved platforms; OR within, AND across facets.
run('view="campaigns";campaignBrand="Tümü";query="";selectedCategory="Tümü";campaignFilters=emptyCampaignFilters();render()');
assert.match(screen.innerHTML,/data-filter-open="platforms"[^>]*>Alışveriş Platformları/);
assert(run('filteredCampaigns().some(o=>o.id==="live")'),'No selection must retain direct-brand campaigns');
run('openCampaignFilters("platforms")');
const platformSheet=run('campaignFilterSheetHTML()');
assert.match(platformSheet,/Alışveriş Platformları/);assert.match(platformSheet,/ps-filterhandle/);assert.doesNotMatch(platformSheet,/ps-filterclose/);
assert.equal((platformSheet.match(/data-filter-group="platforms"/g)||[]).length,3);
assert.doesNotMatch(platformSheet,/id="ps-filter-brands"|data-filter-clear="platforms"/);
run('handleCampaignFilterClick({filterGroup:"platforms",filterValue:"trendyol"});handleCampaignFilterClick({filterGroup:"platforms",filterValue:"hepsiburada"})');
assert.equal(run('campaignFilters.platforms.length'),0);
run('closeCampaignFilters(true)');
assert.equal(run('campaignFilterCount()'),2);
assert.deepEqual(Array.from(run('filteredCampaigns().map(o=>o.id)')).sort(),['hepsiburada-one','hepsiburada-other','hepsiburada-two','trendyol-reviewed'].sort());
run('campaignFilters.brands=["SOVITAL"]');
assert.deepEqual(Array.from(run('filteredCampaigns().map(o=>o.id)')),['hepsiburada-one']);
run('campaignFilters.brands=[];openCampaignFilters("platforms");handleCampaignFilterClick({filterClean:"1"});closeCampaignFilters(false)');
assert.equal(run('campaignFilters.platforms.length'),2);
run('campaignFilters.rates=["10"];openCampaignFilters("platforms");handleCampaignFilterClick({filterClean:"1"});closeCampaignFilters(true)');
assert.equal(run('campaignFilters.platforms.length'),0);
assert.deepEqual(Array.from(run('campaignFilters.rates')),['10']);
run('campaignFilters=emptyCampaignFilters();campaignFilters.platforms=["amazon"]');
assert.deepEqual(Array.from(run('filteredCampaigns().map(o=>o.id)')),['amazon-one','amazon-two','amazon-other']);
run('navigation.push(capturePage());campaignFilters.platforms=[];restorePage(navigation.pop())');
assert.deepEqual(Array.from(run('campaignFilters.platforms')),[],'Back navigation must not resurrect cleared filters');
run('campaignFilters=emptyCampaignFilters();openCampaignFilters("all")');assert.match(run('campaignFilterSheetHTML()'),/ps-filterclose/);assert.doesNotMatch(run('campaignFilterSheetHTML()'),/ps-filterdialog-bottom/);assert.match(run('campaignFilterSheetHTML()'),/Kod Kullanımı/);run('closeCampaignFilters()');
run('view="settings";render()');assert.match(screen.innerHTML,/Bizi App Store’da Değerlendir/);assert.ok(screen.innerHTML.indexOf('Geri Bildirim ve Öneriler')<screen.innerHTML.indexOf('Bizi App Store’da Değerlendir'));
clickRoute({reviewApp:'1'});await new Promise(r=>setImmediate(r));assert(requests.some(r=>r.path==='open-external'&&r.body.url==='https://apps.apple.com/tr/app/id6823890365?action=write-review'));
run('view="home";query="";navigation.length=0;hydrate('+JSON.stringify(rows)+');render()');
// Newest section uses only immutable publication dates within a rolling seven days.
const publicationNow=Math.floor(Date.now()/1000);
run('hydrate('+JSON.stringify([{...rows[0],id:'recent',publishedAt:publicationNow-86400},{...rows[0],id:'boundary',publishedAt:publicationNow-7*86400},{...rows[0],id:'too-old',publishedAt:publicationNow-7*86400-1,updated:publicationNow},{...rows[0],id:'unknown'},{...rows[0],id:'future',publishedAt:publicationNow+60}])+')');
assert.deepEqual(Array.from(run('newestOffers(offers,'+publicationNow+').map(o=>o.id)')),['recent','boundary']);
assert.doesNotMatch(run('newestFeature(offers)'),/data-offer="too-old"|data-offer="unknown"|data-offer="future"/);
clickRoute({newest:'1'});assert.equal(run('view'),'newest');assert.match(screen.innerHTML,/ps-native-query/);assert.match(screen.innerHTML,/data-filter-open="sort"/);assert.match(screen.innerHTML,/data-offer-id="recent"/);assert.doesNotMatch(screen.innerHTML,/data-offer-id="too-old"/);
clickRoute({campaignGroup:'Solgar'});assert.equal(run('campaignOrigin'),'newest');assert.doesNotMatch(screen.innerHTML,/data-offer="too-old"/);
clickRoute({action:'back'});assert.equal(run('view'),'newest');clickRoute({action:'back'});assert.equal(run('view'),'home');
assert.equal(run('newestOffers(offers,'+(publicationNow+8*86400)+').length'),0);
assert.match(run('newestFeature([])'),/Son 7 günde yayınlanan yeni bir kampanya bulunmuyor/);
run('hydrate('+JSON.stringify(rows)+');navigation.length=0');
// Full campaign routing and shared brand directory filters.
run("view='home';query='';campaignFilters.rates=['10'];campaignFilters.sort='discount';navigation.length=0");
for(const rate of ['10','25','50']){
 clickRoute({discount:rate});assert.equal(run('view'),'discount');
 assert.match(screen.innerHTML,/ps-native-query/);assert.match(screen.innerHTML,/data-filter-open="sort"/);
 assert.equal(run('filteredCampaigns().length'),rate==='50'?0:1);
 clickRoute({filterCategory:'Kargo Avantajı'});assert.equal(run('view'),'discount');assert.equal(run('filteredCampaigns().length'),0);
 clickRoute({filterCategory:'Tümü'});assert.equal(run('filteredCampaigns().length'),rate==='50'?0:1);
 clickRoute({action:'back'});
}
clickRoute({discount:'all'});assert.equal(run('view'),'campaigns');assert.equal(run('campaignFilterCount()'),1);assert.equal(run('campaignFilters.sort'),'discount');
clickRoute({view:'brands'});assert.equal(run('selectedCategory'),'Tümü');assert.match(screen.innerHTML,/data-filter-open="ending"/);
run("campaignFilters.brands=['Solgar'];render()");assert.match(screen.innerHTML,/data-brand="Solgar"/);assert.doesNotMatch(screen.innerHTML,/data-brand="Other"/);
clickRoute({filterCategory:'Kargo Avantajı'});assert.equal(run('view'),'brands');assert.equal(run("filteredCampaigns(campaignFilters,'brands').length"),0);
// A filtered browse page retains its choices on detail/back, and other browse pages inherit the same session selection.
run('view="campaigns";campaignFilters=emptyCampaignFilters();selectedCategory="Ürün İndirimleri";campaignFilters.rates=["25"];campaignFilters.sort="discount";navigation.length=0');
clickRoute({offer:'live'});assert.equal(run('view'),'detail');
clickRoute({action:'back'});assert.equal(run('view'),'campaigns');assert.equal(run('selectedCategory'),'Ürün İndirimleri');
assert.deepEqual(Array.from(run('campaignFilters.rates')),['25']);assert.equal(run('campaignFilters.sort'),'discount');
run('openCampaignFilters("all");handleCampaignFilterClick({filterClean:"1"});closeCampaignFilters(false)');assert.equal(run('selectedCategory'),'Ürün İndirimleri');
run('openCampaignFilters("all");handleCampaignFilterClick({filterClean:"1"});closeCampaignFilters(true)');assert.equal(run('selectedCategory'),'Tümü');assert.equal(run('campaignFilterCount()'),0);
for(const dest of ['home','brands','campaigns','trendyol','amazon','hepsiburada']){
 run('selectedCategory="Ürün İndirimleri";campaignFilters.rates=["25"];campaignFilters.sort="discount"');
 clickRoute({view:dest});assert.equal(run('selectedCategory'),'Ürün İndirimleri');assert.equal(run('campaignFilterCount()'),1);assert.equal(run('campaignFilters.sort'),'discount');
}
assert.equal(run('campaignDestination({source:"https://example.com/campaign?code=x"})'),'https://example.com/');
for(const url of ['https://www.trendyol.com/sr?mid=1','https://www.amazon.com.tr/dp/example','https://www.hepsiburada.com/example'])assert.equal(run('campaignDestination({source:'+JSON.stringify(url)+'})'),url);
assert.match(run('detailAction({hasCode:false,source:"https://example.com/promo"})'),/href="https:\/\/example\.com\//);
run('current={...offers[0],source:"https://example.com/promo",code:"TEST"};copyNotice=true');assert.match(run('detail()'),/href="https:\/\/example\.com\/"[^>]*[^<]*Web sitesine git/);run('copyNotice=false;current=null');
run('hydrate('+JSON.stringify(rows)+');campaignFilters=emptyCampaignFilters();selectedCategory="Tümü";view="home";query="";navigation.length=0');
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
run("current=offers[0];view='detail';revealed=false");assert(!run('detail()').includes('SPRING26'));assert(run('categoriesFor(current)').includes('Kampanya Kodu'));assert(!run('categoriesFor(offers[1])').includes('Kampanya Kodu'));await run('revealCode()');assert.equal(run('revealed'),true);assert(run('detail()').includes('SPRING26'));await run('copyCurrentCode()');assert.equal(requests.filter(r=>r.path==='copy').at(-1).body.text,'SPRING26');assert.equal(requests.filter(r=>r.path==='ui/launch-state').at(-1).body.dimmed,true);assert(run('copyNotice'));assert(!run('detail()').includes('Uygulamada kal'));assert(run('detail()').includes('ps-copyhandle'));
run("closeCopySheet()");assert.equal(requests.filter(r=>r.path==='ui/launch-state').at(-1).body.dimmed,false);await run('shareCampaign()');assert.match(run('detail()'),/Kampanyayı paylaş/);assert.equal(requests.at(-1).path,'share-campaign');assert.match(requests.at(-1).body.text,/Solgar/);assert(!JSON.stringify(requests.at(-1).body).includes('SPRING26'));copyFailure=true;await run('copyCurrentCode()');assert.equal(run('copyNotice'),false);copyFailure=false;
run("revealed=false;current.code=''");revealFailure=true;await run('revealCode()');assert.equal(run('revealed'),false);revealFailure=false;
run("discountThreshold='25'");assert.equal(run('discountOffers().length'),1);run("selectedCategory='Sepette İndirim'");assert(run('categorypage()').includes('no-code'));assert(!run('categorypage()').includes('data-offer-id="live"'));
run("favorites.add('live');persistFavorites()");assert(store.get('lmprime-favorites').includes('live'));assert(run('nativeFavorites()').includes('Solgar'));
// Favorites search must stay within saved offers and must not inherit another page's query.
run("favoriteQuery='solgar';query='Other'");assert.match(run('favoritesContent()'),/Solgar/);assert.doesNotMatch(run('favoritesContent()'),/Other/);
run("favoriteQuery='Other'");assert.match(run('favoritesContent()'),/Favorilerinde aramana uygun/);
run("favoriteQuery='seçili'");assert.match(run('favoritesContent()'),/Solgar/);
run("favoriteQuery='';query=''");
for(const page of ['brands()','nativeCampaigns()','nativeFavorites()']){const html=run(page);assert.match(html,/ps-pagesearchheader/);assert.equal((html.match(/<input/g)||[]).length,1);assert.doesNotMatch(html,/data-native-search|Profili aç/);}
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

// Profile writes must be acknowledged before visible state changes.
const originalCreateElement=box.document.createElement;
box.document.createElement=tag=>tag==='canvas'?{getContext:()=>({fillRect(){},drawImage(){}}),toDataURL:()=> 'data:image/jpeg;base64,bm9ybWFsaXplZA=='}:originalCreateElement(tag);
box.Image=class {constructor(){this.naturalWidth=1800;this.naturalHeight=900;}set src(value){this.onload();}};
box.FileReader=class {readAsDataURL(){this.result='data:image/png;base64,cGhvdG8=';this.onload();}};
run("settingsPhoto='data:image/png;base64,previous-photo';view='personal';render()");
box.localStorage.setItem=()=>{throw Error('QuotaExceededError');};
await run('saveProfilePhoto({type:"image/png",size:1024})');
assert.equal(run('settingsPhoto'),'data:image/png;base64,previous-photo');
assert.match(run('profileError'),/Fotoğraf kaydedilemedi/);
assert.equal(run('profilePhotoBusy'),false);
assert.equal(run('removeProfilePhoto()'),false);assert.equal(run('settingsPhoto'),'data:image/png;base64,previous-photo');
run('settingsName="Önceki"');assert.equal(run('saveProfileName("Yeni isim")'),false);assert.equal(run('settingsName'),'Önceki');
box.localStorage.setItem=originalStorageWrite;
await run('saveProfilePhoto({type:"image/png",size:1024})');
assert.equal(run('settingsPhoto'),'data:image/jpeg;base64,bm9ybWFsaXplZA==');
assert.match(store.get('lmprime-photo'),/bm9ybWFsaXplZA==/);
assert.equal(run('removeProfilePhoto()'),true);assert.equal(run('settingsPhoto'),null);assert.equal(store.get('lmprime-photo'),'null');
assert.equal(run('saveProfileName("  Test   Kullanıcısı  ")'),true);assert.equal(run('settingsName'),'Test Kullanıcısı');assert.equal(JSON.parse(store.get('lmprime-name')),'Test Kullanıcısı');
assert.equal(run('saveProfileName("x".repeat(61))'),false);assert.equal(run('settingsName'),'Test Kullanıcısı');
assert.equal(run('saveProfileName("<script>test</script>")'),true);assert.match(run('settingsPage()'),/&lt;script&gt;test&lt;\/script&gt;/);
assert.equal(run('saveProfileName("")'),true);assert.equal(run('profileDisplayName()'),'Misafir');
assert.match(run('header()'),/aria-label="Profili aç"/);assert.doesNotMatch(run('settingsHeader("Profil")'),/aria-label="Ara"/);
box.document.createElement=originalCreateElement;
console.log('PASS: profile name validation/escaping/persistence, normalized photos, removal, and failed storage retain visible state.');
run("appInfo={version:'1.0.1',build:'275.1',date:'25.11.2026'}");
const profileMarkup=run('settingsPage()');
assert.match(profileMarkup,/Geri Bildirim ve Öneriler/);
assert.match(profileMarkup,/İletişim/);
assert.match(profileMarkup,/Versiyon 1.0.1 \(275.1\) · 25.11.2026/);
assert.match(run('contactPage()'),/marka@literaturmasasi\.com/);
assert.match(run('contactPage()'),/UCD10yhLvpHWsSNhJYQfP45Q/);
assert.match(run('contactPage()'),/https:\/\/x\.com\/literaturmasasi/);
assert.match(run('feedbackPage()'),/Prime’da görmek istiyorum/);
box.crypto=require('node:crypto').webcrypto;
const feedbackBridge=box.window.webkit.messageHandlers.primeAPI,priorFeedbackBridge=feedbackBridge.postMessage;
let feedbackFail=true,feedbackIds=[];
feedbackBridge.postMessage=async request=>{if(request.path!=='feedback')return priorFeedbackBridge(request);feedbackIds.push(request.body.id);return feedbackFail?{status:503,data:{error:'Geçici hata'}}:{status:201,data:{ok:true,id:request.body.id}};};
const priorFeedbackView=run('view');
run("view='feedback';feedbackDraft={type:'Öneri',message:'Test önerisi',email:''}");
await run('sendFeedback()');assert.equal(run('feedbackSuccess'),false);assert.equal(run('feedbackDraft.message'),'Test önerisi');
feedbackFail=false;await run('sendFeedback()');assert.equal(run('feedbackSuccess'),true);assert.equal(run('feedbackDraft.message'),'');assert.equal(feedbackIds[0],feedbackIds[1]);assert.match(run('feedbackPage()'),/Mesajın başarıyla gönderildi/);
run('feedbackSuccess=false;view='+JSON.stringify(priorFeedbackView));feedbackBridge.postMessage=priorFeedbackBridge;

assert.match(run('settingsTerms'),/Prime Kullanıcı Sözleşmesi/);
assert.doesNotMatch(run('settingsPrivacy'),/Literatür Masası Prime/);


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

// Unfiltered brand directory shows every active campaign as shared horizontal rows.
run('hydrate('+JSON.stringify([...rows,{...rows[0],id:'second-brand-offer',offer:'İkinci fırsat',hasCode:0,cardArtwork:undefined}])+')');
run("view='favorites';favoriteQuery='';favorites=new Set(['live','second-brand-offer']);navigation.length=0");
assert.equal((run('favoritesContent()').match(/data-campaign-group=/g)||[]).length,1);
assert.match(run('favoritesContent()'),/2 favori kampanya/);
clickRoute({campaignGroup:'Solgar'});
assert.equal(run('campaignOrigin'),'favorites');
assert.match(screen.innerHTML,/data-filter-open="sort"/);
assert.equal((screen.innerHTML.match(/data-offer=/g)||[]).length,2);
assert.match(screen.innerHTML,/data-offer="second-brand-offer"/);
assert.doesNotMatch(screen.innerHTML,/data-offer="no-code"/);
clickRoute({action:'back'});assert.equal(run('view'),'favorites');
run("favorites.clear();query='';selectedCategory='Tümü';campaignFilters=emptyCampaignFilters()");
const groupedCampaigns=run("campaignFilterResults('campaigns')");
assert.match(groupedCampaigns,/1\/2<\/span>/);
assert.doesNotMatch(groupedCampaigns,/ps-nativedots/);
run("view='brands';query='stale';type='Sepette İndirim';selectedCategory='Tümü';navigation.length=0;render()");
clickRoute({brand:'Solgar'});
assert.equal(run('view'),'brand');assert.match(screen.innerHTML,/2 kampanya/);
assert.match(screen.innerHTML,/ps-nativelist/);assert.doesNotMatch(screen.innerHTML,/ps-feed|ps-poster/);
assert.match(screen.innerHTML,/data-offer="live"/);assert.match(screen.innerHTML,/data-offer="second-brand-offer"/);
assert.doesNotMatch(screen.innerHTML,/data-offer="no-code"|data-offer="expired"/);
assert.match(screen.innerHTML,/Seçili ürünler/);
clickRoute({offer:'second-brand-offer'});assert.equal(run('view'),'detail');
clickRoute({action:'back'});assert.equal(run('view'),'brand');assert.match(screen.innerHTML,/2 kampanya/);
assert.match(screen.innerHTML,/data-filter-open="sort"/);
run('openCampaignFilters("sort");handleCampaignFilterClick({filterSort:"ending"});closeCampaignFilters(true)');
clickRoute({action:'back'});assert.equal(run('campaignFilters.sort'),'ending');
run("query='';selectedCategory='Kampanya Kodu';campaignFilters.sort='discover'");
clickRoute({brand:'Solgar'});
assert.match(screen.innerHTML,/data-offer="live"/);
assert.doesNotMatch(screen.innerHTML,/data-offer="second-brand-offer"/);
clickRoute({action:'back'});
run("selectedCategory='Tümü'");
const isdinVariants=['I','İ','ı','i','I\u0307'];
for(const first of isdinVariants){
 for(const second of isdinVariants){
  const search=first+'sD'+second+'n';
  assert.equal(run('matchesQuery({brand:"ISDIN",title:"",sub:""},'+JSON.stringify(search)+')'),true,search);
  assert.equal(run('matchesQuery({brand:'+JSON.stringify(search)+',title:"",sub:""},"isdin")'),true,search);
 }
}
assert.notEqual(run('trendyolBrandKey("Şen")'),run('trendyolBrandKey("Sen")'));
run('hydrate('+JSON.stringify(rows)+')');

// Verify both accented campaign names and accented queries against plain spellings.
run('hydrate('+JSON.stringify([
 {...rows[0],id:'estee-accented',name:'Estée Lauder',offer:'Seçili ürünlerde %25 indirim'},
 {...rows[0],id:'estee-plain',name:'Estee Lauder',offer:'Sepette %25 indirim'},
])+')');
run("campaignFilters=emptyCampaignFilters();selectedCategory='Tümü';favorites=new Set(['estee-accented','estee-plain']);view='favorites'");
for(const text of ['Estee Lauder','ESTÉE LAUDER','Estêe Lauder','%25 EsTéE LaUDeR']){
 run('query='+JSON.stringify(text)+';favoriteQuery=query');
 assert.equal((run('favoritesContent()').match(/data-campaign-group=/g)||[]).length,2);
 for(const output of [run('nativeCampaigns()'),run('brands()')]){
  assert.match(output,/data-offer="estee-accented"/);
  assert.match(output,/data-offer="estee-plain"/);
 }
}
run("query='';favoriteQuery='';favorites.clear()");
run('hydrate('+JSON.stringify(rows)+')');

// Search matches brands, offer titles and descriptions consistently on every screen.
run("campaignFilters=emptyCampaignFilters();selectedCategory='Tümü'");
for(const query of [' solgar ', ' %25 İNDİRİM ', ' seçili ürünler ', 'SECiLı URUNLER', '  urunler  İNDıRİM\tSoLGaR ']){
 run('query='+JSON.stringify(query));
 assert.deepEqual(Array.from(run('matchingBrands()')),['Solgar']);
 assert.match(run('brands()'),/data-offer="live"[^>]*aria-label="Solgar: %25 indirim"/);
 assert.match(run('nativeCampaigns()'),/data-offer-id="live"/);
 for(const output of [run('brands()'),run('nativeCampaigns()'),run('discovery()')]){assert.match(output,/ps-nativelist/);assert.doesNotMatch(output,/ps-brandgrid|ps-nativerail|ps-carousel/);}
 assert.doesNotMatch(run('nativeCampaigns()'),/data-offer-id="no-code"/);
}
run("favorites=new Set(['live']);favoriteQuery='uRuNLeR  sOLGaR'");
assert.match(run('favoritesContent()'),/data-campaign-group="Solgar"/);
run("favorites.clear();favoriteQuery='';query='solgar does-not-exist'");
assert.equal(run('matchingBrands().length'),0);
run("view='home';query='solgar';navigation.length=0;render()");clickRoute({offer:'live'});assert.equal(run('view'),'detail');clickRoute({action:'back'});assert.equal(run('view'),'home');assert.equal(run('query'),'solgar');assert.match(screen.innerHTML,/ps-nativelist/);
run('hydrate('+JSON.stringify([{...rows[0],id:'pending-native',cardArtwork:undefined}])+');query="";type="Tümü"');assert.equal(run('offers[0].artworkReady'),false);assert.match(run('feed(offers)'),/ps-nativelist/);assert.doesNotMatch(run('feed(offers)'),/ps-poster/);assert.equal(run("poster(offers[0],'small')"),'');
run('hydrate('+JSON.stringify(rows)+');query="";campaignBrand="Tümü"');

// Launch surface follows loading and retry state; repeated renders do not spam the bridge.
assert.deepEqual(Array.from(run('categoryDisplayNames.slice(0,2)')),['Kampanya Kodu','Son Gün']);
assert.equal(new Set(run('categoryDisplayNames')).size,12);
run('loaded=false;render()');
assert.equal(requests.filter(r=>r.path==='ui/launch-state').at(-1).body.visible,true);
const launchRequests=requests.filter(r=>r.path==='ui/launch-state').length;
run('render()');
assert.equal(requests.filter(r=>r.path==='ui/launch-state').length,launchRequests);
run('loaded=true;render()');
assert.equal(requests.filter(r=>r.path==='ui/launch-state').at(-1).body.visible,false);

for(const glyph of ['x','chevron-down','chevron-up','arrow-down-up','sliders-horizontal'])assert.equal(run('Object.hasOwn(iconMarkup,'+JSON.stringify(glyph)+')'),true,'Filter icon must not fall back to a tag');
// Real facets combine alternatives within groups and intersect across groups.
const filterNow=Date.now();
run('campaignFilters=emptyCampaignFilters();query="";view="campaigns";campaignBrand="Tümü";hydrate('+JSON.stringify([
 {...rows[0],id:'f1',name:'Solgar',discountPercent:25,publishedAt:Math.floor(filterNow/1000)-2*86400,expires:Math.floor(filterNow/1000)+2*86400},
 {...rows[0],id:'f2',name:'Orzax',discountPercent:50,publishedAt:Math.floor(filterNow/1000)-3600,expires:Math.floor(filterNow/1000)+3600,hasCode:0},
 {...rows[0],id:'f3',name:'Other',discountPercent:10,publishedAt:0,expires:0},
 {...rows[0],id:'f4',name:'Solgar',discountPercent:0,publishedAt:Math.floor(filterNow/1000)-40*86400,expires:0}
])+')');
run('campaignFilters.brands=["Solgar","Orzax"];campaignFilters.rates=["25","50"];campaignFilters.published=["1","7"];campaignFilters.ending=["1","3"]');
assert.deepEqual(Array.from(run('filteredCampaigns().map(o=>o.id)')),['f1','f2']);
run('campaignFilters.codes=["no"]');assert.deepEqual(Array.from(run('filteredCampaigns().map(o=>o.id)')),['f2']);
run('campaignFilters.codes=["yes","no"];campaignFilters.sort="discount"');assert.deepEqual(Array.from(run('filteredCampaigns().map(o=>o.id)')),['f2','f1']);
run('campaignFilters.sort="ending"');assert.deepEqual(Array.from(run('filteredCampaigns().map(o=>o.id)')),['f2','f1']);
run('campaignFilters=emptyCampaignFilters();campaignFilters.ending=["7"]');assert.deepEqual(Array.from(run('filteredCampaigns().map(o=>o.id)')),['f1','f2'],'Unknown expiry is not imminent');
run('campaignFilters=emptyCampaignFilters();campaignFilters.published=["30"]');assert.deepEqual(Array.from(run('filteredCampaigns().map(o=>o.id)')),['f1','f2'],'Unknown publication date is not new');
run('campaignFilters=emptyCampaignFilters();filterDraft=cloneCampaignFilters(campaignFilters);filterDraft.brands=["Solgar"]');assert.equal(run('campaignFilters.brands.length'),0,'Draft cannot mutate applied filters');
run('campaignFilters.brands=["Orzax"];favorites=new Set(["f1"]);campaignFilters.saved=["yes"]');assert.equal(run('filteredCampaigns().length'),0);
run('campaignFilters=emptyCampaignFilters();query="Orzax"');assert.deepEqual(Array.from(run('filteredCampaigns().map(o=>o.id)')),['f2']);
run('campaignFilters.brands=["Orzax"];navigation.push(capturePage());campaignFilters.brands=[];restorePage(navigation.pop())');assert.deepEqual(Array.from(run('campaignFilters.brands')),[]);
run('campaignFilters=emptyCampaignFilters();query="";filterDraft=null;hydrate('+JSON.stringify(rows)+')');
console.log('PASS: multi-select OR/AND facets, expiry/publication unknowns, sorting, search, favorites, draft isolation and navigation restoration.');

// The restored sort-only sheet must preserve other facets on apply, clear and cancel.
run('campaignFilters=emptyCampaignFilters();campaignFilters.brands=["Solgar"];campaignFilters.rates=["10"];openCampaignFilters("sort")');
assert.equal(run('filterGroup'),'sort');
const sortSheet=run('campaignFilterSheetHTML()');
assert.match(sortSheet,/id="ps-filter-title"[^>]*>Sırala</);
assert.match(sortSheet,/id="ps-filter-sort"/);
assert.match(sortSheet,/ps-filterdialog-bottom/);assert.match(sortSheet,/ps-filterhandle/);assert.doesNotMatch(sortSheet,/ps-filterclose/);
assert.doesNotMatch(sortSheet,/id="ps-filter-(brands|rates|published|ending|codes|saved)"/);
run('handleCampaignFilterClick({filterSort:"newest"});closeCampaignFilters(true)');
assert.equal(run('campaignFilters.sort'),'newest');
assert.deepEqual(Array.from(run('campaignFilters.brands')),['Solgar']);
assert.deepEqual(Array.from(run('campaignFilters.rates')),['10']);
run('openCampaignFilters("sort");handleCampaignFilterClick({filterSort:"discount"});closeCampaignFilters(false)');
assert.equal(run('campaignFilters.sort'),'newest','Dismissed sort draft must not apply');
run('openCampaignFilters("sort");handleCampaignFilterClick({filterClean:"1"});closeCampaignFilters(true)');
assert.equal(run('campaignFilters.sort'),'discover');
assert.deepEqual(Array.from(run('campaignFilters.brands')),['Solgar'],'Clear sort must preserve brand facet');
assert.deepEqual(Array.from(run('campaignFilters.rates')),['10'],'Clear sort must preserve rate facet');
run('campaignFilters=emptyCampaignFilters()');
console.log('PASS: sort-only apply, clear and cancel preserve other filters.');

run('hydrate('+JSON.stringify([{...rows[0],id:'supp',name:'Solgar',productCategories:['supplements']},{...rows[0],id:'care',name:'Care',productCategories:['care']},{...rows[0],id:'sport',name:'Sport',productCategories:['sports']},{...rows[0],id:'makeup',name:'Makeup',productCategories:['makeup']},{...rows[0],id:'shared',name:'Retailer',productCategories:['supplements','sports']}])+');campaignFilters=emptyCampaignFilters();campaignFilters.products=["supplements","sports"]');
assert.deepEqual(Array.from(run('filteredCampaigns().map(o=>o.id)')),['supp','sport','shared']);
run('campaignFilters.brands=["Retailer"]');assert.deepEqual(Array.from(run('filteredCampaigns().map(o=>o.id)')),['shared']);
run('openCampaignFilters("products")');assert.match(run('campaignFilterSheetHTML()'),/Ürün Kategorisi/);assert.match(run('campaignFilterSheetHTML()'),/data-filter-value="makeup"/);assert.doesNotMatch(run('campaignFilterSheetHTML()'),/id="ps-filter-rates"/);
run('handleCampaignFilterClick({filterClean:"1"});closeCampaignFilters(true)');assert.equal(run('campaignFilters.products.length'),0);assert.deepEqual(Array.from(run('campaignFilters.brands')),['Retailer']);
run('campaignFilters=emptyCampaignFilters();hydrate('+JSON.stringify(rows)+')');
console.log('PASS: product category multi-select, brand intersection, independent clear, and preserved benefit filters.');



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

// Refresh the actual native UI with changing server snapshots, without reopening it.
const bridge=box.window.webkit.messageHandlers.primeAPI,originalPost=bridge.postMessage;
let refreshRows=rows.map(r=>({...r})),refreshCalls=0,refreshReject=false,refreshDeferred=null;
bridge.postMessage=async message=>{if(message.path!=='campaigns')return originalPost(message);refreshCalls++;if(refreshReject)throw Error('offline');if(refreshDeferred)return refreshDeferred;return {status:200,data:{campaigns:refreshRows}};};
await run('start()');
run("view='campaigns';query='Solgar';campaignFilters.brands=['Solgar'];favorites=new Set(['live']);render()");screen.scrollTop=123;
const beforeRefresh=refreshCalls;
await run('refreshCampaigns(true)');assert.equal(refreshCalls,beforeRefresh,'Recent load suppresses foreground request');
refreshRows.push({...rows[0],id:'new',offer:'New offer'});
run('lastCampaignAttempt=Date.now()-300001');await run('refreshCampaigns()');
assert(run("offers.some(o=>o.id==='new')"));assert.equal(run('view'),'campaigns');assert.equal(run('query'),'Solgar');assert.equal(screen.scrollTop,123);assert.deepEqual(Array.from(run('campaignFilters.brands')),['Solgar']);
run("view='detail';current=offers.find(o=>o.id==='live');current.code='VALID';revealed=true;copyNotice=true;navigation.push(capturePage())");
refreshRows=refreshRows.filter(r=>r.id!=='live');run('lastCampaignAttempt=0');await run('refreshCampaigns(true)');
assert.equal(run('view'),'home');assert.equal(run('current'),null);assert.equal(run('copyNotice'),false);assert.equal(run('revealed'),false);assert.match(run('favoritesContent()'),/Henüz favorin yok/);
run('restorePage(navigation.pop())');assert.equal(run('view'),'home','Back cannot resurrect an unpublished detail');
const retained=run('JSON.stringify(offers)');refreshReject=true;run('lastCampaignAttempt=0');await run('refreshCampaigns()');assert.equal(run('JSON.stringify(offers)'),retained);assert.equal(run('loaded'),true);
const failedCalls=refreshCalls;await run('refreshCampaigns(true)');assert.equal(refreshCalls,failedCalls,'Failure does not cause a tight retry loop');refreshReject=false;
box.document.hidden=true;run('lastCampaignAttempt=0');await run('refreshCampaigns()');assert.equal(refreshCalls,failedCalls);box.document.hidden=false;
let releaseRefresh;refreshDeferred=new Promise(resolve=>{releaseRefresh=resolve});
run('lastCampaignAttempt=0');const pendingRefresh=run('refreshCampaigns(true)');await run('refreshCampaigns(true)');assert.equal(refreshCalls,failedCalls+1,'Concurrent foreground events share one request');
run('campaignEpoch++');releaseRefresh({status:200,data:{campaigns:[]}});await pendingRefresh;assert.equal(run('JSON.stringify(offers)'),retained,'An old session response cannot replace the current feed');refreshDeferred=null;
// A changed offer loses the old revealed code and gets its updated end date.
run("query='';view='detail';current=offers.find(o=>o.id==='new');current.code='OLD';revealed=true;copyNotice=true");
refreshRows=refreshRows.map(r=>r.id==='new'?{...r,offer:'Updated offer',expires:Math.floor(Date.now()/1000)+3600}:r);
run('lastCampaignAttempt=0');await run('refreshCampaigns(true)');assert.equal(run('current.title'),'Updated offer');assert.equal(run('current.code'),'');assert.equal(run('revealed'),false);assert.equal(run('copyNotice'),false);
// Local expiry uses the same reconciliation for current and back-stack details.
run("navigation.push(capturePage());applyCampaignRows(offers.filter(o=>o.id!=='new').map(o=>o.raw))");assert.equal(run('view'),'home');run('restorePage(navigation.pop())');assert.equal(run('view'),'home');
let authorized=false;
const renewalCalls=[];
bridge.postMessage=async ({path})=>{
 renewalCalls.push(path);
 if(path==='access'){authorized=true;return {status:201,data:{authorized:true}};}
 if(!authorized)return {status:401,data:{error:'Oturum gerekli.'}};
 return {status:200,data:path==='campaigns'?{campaigns:refreshRows}:{code:'RENEWED'}};
};
run('lastCampaignAttempt=0');
await Promise.all([run('refreshCampaigns(true)'),run("server('reveal',{id:'new'})")]);
assert.deepEqual(renewalCalls,['campaigns','reveal','access','campaigns','reveal']);
const failedRenewalCalls=[];
bridge.postMessage=async ({path})=>{
 failedRenewalCalls.push(path);
 return path==='access'?{status:201,data:{authorized:true}}:{status:401,data:{error:'Oturum gerekli.'}};
};
await assert.rejects(run("server('reveal',{id:'new'})"),/Oturum gerekli/);
assert.deepEqual(failedRenewalCalls,['reveal','access','reveal'],'A repeated 401 cannot create a renewal loop');

bridge.postMessage=originalPost;
console.log('PASS: live feed refresh, new/unpublished/changed offers, detail and favorite cleanup, navigation preservation, hidden-page throttle, error retention, single flight and stale-response rejection.');

assert.equal(run("website('javascript:alert(1)')"),'');assert.equal(run("website('https://user:pass@example.com')"),'');console.log('PASS: native production feed, demo/expiry exclusion, categories, thresholds, server-only reveal, native copy failures, favorites, delete, retry and sheet dismissal.');})().catch(e=>{console.error(e);process.exit(1)});

// Blank areas never activate a tab; every genuine tap activates exactly once.
{
 const source=fs.readFileSync('ios/ui/app.js','utf8');
 const handlers={},options={};let clicks=0,hit=null;
 const button={disabled:false,click(){clicks++},closest(){return this}};
 const blank={closest(){return null}};
 const nav={inert:false,contains:x=>x===button,addEventListener(type,fn,opts){handlers[type]=fn;options[type]=opts}};
 const guard=source.slice(source.indexOf('function installNavigationTouchGuard('),source.indexOf("installNavigationTouchGuard(root.querySelector"));
 vm.runInNewContext(guard+';installNavigationTouchGuard(nav)',{nav,document:{elementFromPoint:()=>hit}});
 const touch=(x=20,y=30)=>({identifier:1,clientX:x,clientY:y});
 function event(target,touches,changedTouches=[]){return {target,touches,changedTouches,cancelable:true,prevented:false,preventDefault(){this.prevented=true}}}
 function tap(target){hit=target;const start=event(target,[touch()]);handlers.touchstart(start);assert(start.prevented);const end=event(target,[],[touch()]);handlers.touchend(end);assert(end.prevented)}
 assert.equal(options.touchstart.passive,false);assert.equal(options.touchend.passive,false);
 tap(blank);tap(blank);assert.equal(clicks,0);
 tap(button);assert.equal(clicks,1);tap(button);assert.equal(clicks,2);
 handlers.touchstart(event(button,[touch()]));handlers.touchmove(event(button,[touch(50)]));handlers.touchend(event(button,[],[touch(50)]));assert.equal(clicks,2);
 handlers.touchstart(event(button,[touch()]));handlers.touchcancel();handlers.touchend(event(button,[],[touch()]));assert.equal(clicks,2);
 handlers.touchstart(event(button,[touch()]));hit=blank;handlers.touchend(event(button,[],[touch()]));assert.equal(clicks,2);
 nav.inert=true;tap(button);assert.equal(clicks,2);
 console.log('Navigation touch guard: blank taps, repeated taps, drags, cancellation and inert sheets passed');
}

// Filter taps are handled once. The shared WebView policy owns multi-touch zoom.
{
 const source=fs.readFileSync('ios/ui/app.js','utf8');
 const handlers={},options={};let clicks=0,hit=null;
 const button={disabled:false,click(){clicks++},closest(){return this}};
 const blank={closest(){return null}};
 const nav={inert:false,contains:x=>x===button,addEventListener(type,fn,opts){handlers[type]=fn;options[type]=opts}};
 const guard=source.slice(source.indexOf('function installFilterTouchGuard('),source.indexOf("// Shared card ordering:"));
 vm.runInNewContext(guard+';installFilterTouchGuard(nav)',{nav,document:{elementFromPoint:()=>hit}});
 const touch=(x=20,y=30)=>({identifier:1,clientX:x,clientY:y});
 function event(target,touches,changedTouches=[]){return {target,touches,changedTouches,cancelable:true,prevented:false,preventDefault(){this.prevented=true}}}
 function tap(target){hit=target;const start=event(target,[touch()]);handlers.touchstart(start);assert(!start.prevented);const end=event(target,[],[touch()]);handlers.touchend(end);assert(end.prevented)}
 assert.equal(options.touchstart.passive,true);assert.equal(options.touchend.passive,false);
 tap(blank);tap(blank);assert.equal(clicks,0);
 tap(button);assert.equal(clicks,1);tap(button);assert.equal(clicks,2);
 handlers.touchstart(event(button,[touch()]));handlers.touchmove(event(button,[touch(50)]));handlers.touchend(event(button,[],[touch(50)]));assert.equal(clicks,2);
 handlers.touchstart(event(button,[touch()]));handlers.touchcancel();handlers.touchend(event(button,[],[touch()]));assert.equal(clicks,2);
 handlers.touchstart(event(button,[touch()]));hit=blank;handlers.touchend(event(button,[],[touch()]));assert.equal(clicks,2);
 nav.inert=true;tap(button);assert.equal(clicks,2);
 handlers.touchstart(event(button,[touch(),{...touch(),identifier:2}]));
 const pinchEnd=event(button,[],[touch()]);handlers.touchend(pinchEnd);assert(!pinchEnd.prevented);assert.equal(clicks,2);
 const dragStart=event(button,[touch()]);handlers.touchstart(dragStart);handlers.touchmove(event(button,[touch(70)]));
 const dragEnd=event(button,[],[touch(70)]);handlers.touchend(dragEnd);assert(!dragStart.prevented);assert(!dragEnd.prevented);
 console.log('Filter touch guard: repeated taps, blanks, drag/scroll, pinch, cancellation and disabled interaction passed');
}
