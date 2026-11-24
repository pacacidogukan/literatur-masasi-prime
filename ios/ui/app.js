(()=>{
const artworkContract=globalThis.primeArtworkContract;
const root=document.getElementById('prime-square-campaigns'),screen=root.querySelector('#ps-screen');

// The dedicated campaign-code button uses the native bridge, not DOM copy.
for(const event of ['copy','cut','contextmenu','dragstart']){
 document.addEventListener(event,e=>e.preventDefault(),true);
}

// A WebKit compatibility click may arrive even after a touch was cancelled.
// Keep the original contact until a click consumes it or a new contact replaces it.
let lastControlTouch;
document.addEventListener('touchstart',e=>{
 const control=e.target.closest('button,a[href]');
 lastControlTouch=e.touches.length===1&&control?{control,started:e.timeStamp}:null;
},{capture:true,passive:true});
document.addEventListener('touchend',e=>{
 if(lastControlTouch)lastControlTouch.ended=e.timeStamp;
},{capture:true,passive:true});
document.addEventListener('keydown',()=>{lastControlTouch=null;},true);
document.addEventListener('click',e=>{
 const touch=lastControlTouch;
 lastControlTouch=null;
 if(!touch||e.target.closest('button,a[href]')!==touch.control||
    (touch.ended??e.timeStamp)-touch.started<500)return;
 e.preventDefault();
 e.stopImmediatePropagation();
},true);

// Own single-finger navigation taps before WKWebView can interpret a second
// touch as smart zoom. Keep keyboard/VoiceOver clicks on the normal route.
function installNavigationTouchGuard(nav){
 if(!nav)return;
 let tap=null;
 nav.addEventListener('touchstart',e=>{
  tap=null;
  if(e.touches.length!==1||!e.cancelable)return;
  const t=e.touches[0];
  tap={id:t.identifier,x:t.clientX,y:t.clientY,button:e.target.closest('button[data-view]')};
  e.preventDefault();
 },{passive:false});
 nav.addEventListener('touchmove',e=>{
  if(!tap)return;
  const t=Array.from(e.touches).find(t=>t.identifier===tap.id);
  if(!t||e.touches.length!==1||Math.hypot(t.clientX-tap.x,t.clientY-tap.y)>10)tap=null;
 },{passive:true});
 nav.addEventListener('touchcancel',()=>{tap=null;},{passive:true});
 nav.addEventListener('touchend',e=>{
  const start=tap;tap=null;
  if(!start)return;
  if(e.cancelable)e.preventDefault();
  const t=Array.from(e.changedTouches).find(t=>t.identifier===start.id);
  if(!t||e.touches.length||Math.hypot(t.clientX-start.x,t.clientY-start.y)>10)return;
  const end=document.elementFromPoint(t.clientX,t.clientY)?.closest('button[data-view]');
  if(start.button&&end===start.button&&nav.contains(end)&&!end.disabled&&!nav.inert)end.click();
 },{passive:false});
}
installNavigationTouchGuard(root.querySelector('.ps-nav'));

// Cancel only stationary single-finger filter taps. Starting or moving a
// touch remains native so the sheet can scroll and drag to dismiss.
function installFilterTouchGuard(host){
 let tap=null;
 host.addEventListener('touchstart',e=>{
  tap=null;
  if(e.touches.length!==1)return;
  const t=e.touches[0];
  tap={id:t.identifier,x:t.clientX,y:t.clientY,button:e.target.closest('button')};
 },{passive:true});
 host.addEventListener('touchmove',e=>{
  if(!tap)return;
  const t=Array.from(e.touches).find(t=>t.identifier===tap.id);
  if(!t||e.touches.length!==1||Math.hypot(t.clientX-tap.x,t.clientY-tap.y)>10)tap=null;
 },{passive:true});
 host.addEventListener('touchcancel',()=>{tap=null;},{passive:true});
 host.addEventListener('touchend',e=>{
  const start=tap;tap=null;
  if(!start||!e.cancelable)return;
  const t=Array.from(e.changedTouches).find(t=>t.identifier===start.id);
  if(!t||e.touches.length||Math.hypot(t.clientX-start.x,t.clientY-start.y)>10)return;
  e.preventDefault();
  const end=document.elementFromPoint(t.clientX,t.clientY)?.closest('button');
  if(start.button&&end===start.button&&host.contains(end)&&!end.disabled&&!host.inert)end.click();
 },{passive:false});
}

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

let loaded=false,loadError=false,revealBusy=false,deleteBusy=false;
function readLocal(k,f){try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}}
function writeLocal(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true;}catch{return false;}}
// A campaign refresh and a code reveal can encounter the same expired session.
let sessionRenewal=null,sessionRevision=0;
async function server(path,body){
 const bridge=window.webkit?.messageHandlers?.primeAPI;
 if(!bridge)throw Error('Mobil bağlantı başlatılamadı.');
 const send=()=>bridge.postMessage({path,body:body||null});
 const epoch=campaignEpoch,revision=sessionRevision;
 let response=await send();
 if(response.status===401&&(path==='campaigns'||path==='reveal')&&epoch===campaignEpoch&&!deleteBusy){
  if(revision===sessionRevision){
   if(!sessionRenewal){
    sessionRenewal=server('access',{}).then(()=>{sessionRevision++;}).finally(()=>{sessionRenewal=null;});
   }
   await sessionRenewal;
  }
  if(epoch===campaignEpoch&&!deleteBusy)response=await send();
 }
 if(response.status<200||response.status>=300)throw Error(response.data?.error||'İşlem tamamlanamadı.');
 return response.data;
}
const expired=o=>Number(o?.expires)>0&&Number(o.expires)*1000<=Date.now();
function asset(value){const v=String(value||'');if(/^[\w.-]+\.(png|jpg|jpeg|webp|svg)$/.test(v))return 'assets/'+v;if(/^assets\/[\w.\/-]+$/.test(v))return v;try{const u=new URL(v);return u.protocol==='https:'&&!u.username&&!u.password?u.href:''}catch{return ''}}
function website(value){try{const u=new URL(String(value||''));return u.protocol==='https:'&&!u.username&&!u.password?u.href:''}catch{return ''}}
function showError(message){const note=document.createElement('p');note.className='ps-copyerror';note.setAttribute('role','alert');note.textContent=message;(screen.querySelector('.ps-slidefooter')||screen).append(note);}
async function revealCode(){if(revealBusy||!current?.hasCode||expired(current))return;const campaign=current;revealBusy=true;try{const r=await server('reveal',{id:campaign.id});if(!offers.includes(campaign)||r.expired||expired(campaign))throw Error('Kampanya sona erdi.');if(!String(r.code||'').trim())throw Error('Kampanya kodu bulunamadı.');campaign.code=String(r.code);if(current===campaign&&view==='detail'){revealed=true;render();}}catch(e){showError(e.message);}finally{revealBusy=false;}}
function inferBenefits(c){if(Array.isArray(c.benefitCategories))return c.benefitCategories;const text=(c.offer+' '+c.description+' '+c.conditions).toLocaleLowerCase('tr');const rules=[['Sepette İndirim',/sepette.{0,30}indirim|sepet.{0,25}tl indirim/],['Ürün İndirimleri',/%\s*\d+.{0,15}indirim/],['İkinci Ürüne İndirim',/ikinci ürün|2\. ürün/],['Çoklu Alım ve Setler',/\bset|çoklu alım|\d+ alana/],['Hediyeli Alışveriş',/hediye/],['İlk Alışveriş',/ilk (alışveriş|sipariş)/],['Puan ve Para İadesi',/puan|para iadesi|cashback/],['Kargo Avantajı',/ücretsiz kargo|kargo bedava/],['Üyelere Özel',/üyelere özel|yeni üye/],['Ödeme Avantajları',/havale|taksit/]];return rules.filter(([,r])=>r.test(text)).map(([name])=>name);}
function hydrate(rows){offers=rows.filter(c=>!c.demo&&c.active!==0&&!expired(c)).map(c=>({id:String(c.id),brand:String(c.name||''),title:String(c.offer||''),sub:String(c.description||''),terms:[c.description,c.conditions].filter(Boolean).join('\n\n'),category:'',productCategories:[...new Set(Array.isArray(c.productCategories)?c.productCategories.filter(id=>productCategoryOptions.some(([value])=>value===id)):[])],hasCode:!!Number(c.hasCode),code:'',source:website(c.campaignPage||c.channel),expires:Number(c.expires)||0,publishedAt:Number(c.publishedAt)||0,expiry:Number(c.expires)>0?new Date(Number(c.expires)*1000).toLocaleString('tr-TR',{timeZone:'Europe/Istanbul',dateStyle:'long',timeStyle:'short'}):'Bitiş tarihi belirtilmedi',benefitCategories:inferBenefits(c),artworkReady:Object.keys(artworkContract.slots).every(slot=>!!asset(c.cardArtwork?.[slot])),raw:c}));brandNames=[...new Set(offers.map(o=>o.brand))];for(const o of offers){const c=o.raw;const art=o.artworkReady?c.cardArtwork:{};logos[o.brand]=asset(c.asset);campaignArt[o.id]={large:asset(art.large),compact:asset(art.compact),square:asset(art.square),detail:asset(art.detail)};codeBannerArt[o.id]=asset(art.code);lastDayArt[o.id]=asset(art.lastDay);const rate=c.discountPercent==null?String(c.offer||'').match(/%\s*(\d+(?:[.,]\d+)?)/)?.[1]:c.discountPercent;discountRates[o.id]=Number(String(rate??'').replace(',','.'))||0;}}
function offerTicket(o){return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="400" viewBox="0 0 1200 400"><rect width="1200" height="400" rx="36" fill="#171719"/><text x="46" y="90" font-family="Arial" font-size="34" fill="#ff7276">KAMPANYA KODU</text><text x="46" y="166" font-family="Arial" font-size="40" fill="white">${esc(o.brand)}</text><text x="46" y="245" font-family="Arial" font-size="46" fill="white">${esc(o.title).slice(0,70)}</text><text x="46" y="340" font-family="Arial" font-size="28" fill="#ff7276">Kodu açmak için dokun</text></svg>`);}
// Refresh only while visible, deduplicate foreground events and retain the last
// successful feed on transport errors. Never reset the user's page or filters.
let campaignRefreshPending=null,lastCampaignAttempt=0,campaignEpoch=0;
let campaignSignature='';
function applyCampaignRows(rows){
 const signature=JSON.stringify(rows);if(signature===campaignSignature)return false;
 const position=capturePage(),previous=new Map(offers.map(o=>[o.id,o]));
 hydrate(rows);campaignSignature=signature;
 const fresh=new Map(offers.map(o=>[o.id,o]));
 for(const offer of offers){const old=previous.get(offer.id);if(old&&JSON.stringify(old.raw)===JSON.stringify(offer.raw))offer.code=old.code;}
 const reconcile=page=>{if(!page.current)return;page.current=fresh.get(page.current.id)||null;if(page.view==='detail'&&!page.current)page.view='home';};
 for(const page of navigation)reconcile(page);
 const oldCurrent=current;reconcile(position);
 if(oldCurrent&&(!position.current||!position.current.code)){copyNotice=false;revealed=false;}
 if(settingsViews.includes(view)){current=position.current;return true;}
 if(position.view===view&&refreshFocusedSearch())return true;
 restorePage(position);return true;
}
async function refreshCampaigns(foreground=false){
 if(!loaded||deleteBusy||document.hidden||campaignRefreshPending)return;
 const now=Date.now(),interval=foreground?60000:300000;
 if(now-lastCampaignAttempt<interval)return;
 lastCampaignAttempt=now;const epoch=campaignEpoch;
 campaignRefreshPending=(async()=>{try{
  const result=await server('campaigns');
  if(epoch!==campaignEpoch||!loaded||deleteBusy)return;
  if(!Array.isArray(result.campaigns))throw Error('Geçersiz kampanya yanıtı.');
  applyCampaignRows(result.campaigns);
 }catch{/* Keep the usable feed; retry at the next throttled opportunity. */}})();
 try{await campaignRefreshPending;}finally{campaignRefreshPending=null;}
}
document.addEventListener('visibilitychange',()=>{if(!document.hidden)void refreshCampaigns(true);});
document.addEventListener('prime-foreground',()=>void refreshCampaigns(true));
setInterval(()=>void refreshCampaigns(),60000);
async function start(){campaignEpoch++;loaded=false;loadError=false;render();try{let me=await server('me');if(!me.authorized)await server('access',{});const r=await server('campaigns');if(!Array.isArray(r.campaigns))throw Error('Geçersiz kampanya yanıtı.');hydrate(r.campaigns);campaignSignature=JSON.stringify(r.campaigns);lastCampaignAttempt=Date.now();loaded=true;view='home';navigation.length=0;render();}catch(e){loadError=true;render();}}
async function deleteData(){if(deleteBusy)return;deleteBusy=true;campaignEpoch++;try{await sessionRenewal?.catch(()=>{});const result=await server('delete-account',{});if(result.deleted!==true)throw Error('Silme işlemi doğrulanamadı.');favorites.clear();persistFavorites();profilePhotoEpoch++;profilePhotoBusy=false;settingsPhoto=null;settingsName='';profileNameDraft='';profileMessage='';profileError='';writeLocal('lmprime-photo',null);writeLocal('lmprime-name','');navigation.length=0;await start();}catch(e){showError('Veriler silinemedi. Tekrar dene.');}finally{deleteBusy=false;}}
root.addEventListener('click',async e=>{const a=e.target.closest('a[href]');if(!a)return;e.preventDefault();const url=website(a.getAttribute('href'));if(!url){showError('Mağaza bağlantısı bulunmuyor.');return;}try{await server('open-external',{url});}catch(e){showError(e.message);}},true);
setInterval(()=>{if(!loaded||document.hidden)return;const active=offers.filter(o=>!expired(o));if(active.length===offers.length)return;applyCampaignRows(active.map(o=>o.raw));},1000);

let offers=[];
const campaignArt={};
let view='home',type='Tümü',brand='' ,query='',current=null,returnView='home',favorites=new Set(),revealed=false;
const storageKey='lmprime-favorites';
try{const saved=JSON.parse(localStorage.getItem(storageKey));if(Array.isArray(saved))favorites=new Set(saved);}catch{}
function persistFavorites(){return writeLocal(storageKey,[...favorites]);}
function toggleFavorite(id){const next=new Set(favorites);next.has(id)?next.delete(id):next.add(id);if(!writeLocal(storageKey,[...next])){showError('Favori tercihin kaydedilemedi. Cihazında boş alan açıp tekrar dene.');return false;}favorites=next;return true;}
const navigation=[];
function capturePage(){return {view,type,brand,query,current,returnView,selectedCategory,discountThreshold,campaignBrand,campaignGroup,campaignOrigin,campaignFilters:cloneCampaignFilters(campaignFilters),y:screen.scrollTop,rails:[...screen.querySelectorAll('.ps-carousel,.ps-coderail,.ps-lastdayrail,.ps-trendyolrail,.ps-rounds,.ps-brandrounds,.ps-nativerail')].map(e=>e.scrollLeft)};}
function restorePage(p){({view,type,brand,query,current,returnView,selectedCategory,discountThreshold,campaignBrand,campaignGroup,campaignOrigin}=p);campaignFilters=cloneCampaignFilters(p.campaignFilters||emptyCampaignFilters());render();screen.scrollTop=p.y;screen.querySelectorAll('.ps-carousel,.ps-coderail,.ps-lastdayrail,.ps-trendyolrail,.ps-rounds,.ps-brandrounds,.ps-nativerail').forEach((e,i)=>e.scrollLeft=p.rails[i]||0);}
async function copyCurrentCode(){try{if(!current?.code||expired(current))throw Error('Kod kullanılamıyor.');await server('copy',{text:current.code});copyNotice=true;render();screen.querySelector('.ps-copyhandle')?.focus();}catch(e){showError('Kod panoya kopyalanamadı. Tekrar deneyebilirsin.');}}
const icon=n=>iconMarkup[n]||iconMarkup.tag||'';
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const categoryAtlas='assets/support-7a77bc53df45be.webp';
const cats=[["Tümü","sparkles"],["Kampanya Kodu","ticket-percent"],["Son Gün","calendar-clock"],["Sepette İndirim","shopping-cart"],["Ürün İndirimleri","badge-percent"],["İkinci Ürüne İndirim","tags"],["Çoklu Alım ve Setler","shopping-basket"],["Hediyeli Alışveriş","gift"],["İlk Alışveriş","shopping-bag"],["Puan ve Para İadesi","coins"],["Kargo Avantajı","truck"],["Üyelere Özel","badge-check"],["Ödeme Avantajları","credit-card"]];
const categoryAtlasNames=["Kampanya Kodu","Sepette İndirim","Ürün İndirimleri","İkinci Ürüne İndirim","Çoklu Alım ve Setler","Hediyeli Alışveriş","İlk Alışveriş","Puan ve Para İadesi","Kargo Avantajı","Üyelere Özel","Ödeme Avantajları","Son Gün"];
function isLastDay(o,now=Date.now()){const end=Number(o.expires)*1000;return end>now&&end-now<86400000;}
function categoriesFor(o){const list=(o.benefitCategories||[]).filter(n=>n!=='Son Gün'&&n!=='Kampanya Kodu');if(o.hasCode)list.unshift('Kampanya Kodu');if(isLastDay(o))list.push('Son Gün');return [...new Set(list)];}
function header(){
 return `<header class="ps-homeheader">
  <div class="ps-homebrand"><span class="ps-wordmark">Prime</span><button type="button" data-view="settings" aria-label="Profili aç">${icon('user-round')}</button></div>
  <button type="button" class="ps-homehero" data-home-all="1">
   <strong>Öne çıkan Prime fırsatları</strong>
   <span>Seçili markaların kampanyalarını keşfet.</span>
   <b>Tüm fırsatları gör ${icon('chevron-right')}</b>
  </button>
  <div class="ps-homequick" aria-label="Kısayollar">
   <button type="button" data-home-categories="1"><i>${icon('ticket-percent')}</i>Kampanya kategorileri</button>
   <button type="button" data-home-products="1"><i>${icon('shopping-bag')}</i>Ürün kategorileri</button>
   <button type="button" data-view="brands"><i>${icon('layout-grid')}</i>Tüm markalar</button>
  </div>
 </header>`;
}
function tag(o){const assigned=categoriesFor(o);const label=type!=='Tümü'&&assigned.includes(type)?type:assigned[0]||o.category;const glyph=cats.find(c=>c[0]===label)?.[1]||'tag';return `<div class="ps-tagrow"><span class="ps-tag">${icon(glyph)}${label}</span></div>`}
function card(o){return poster(o,'feedcard')}
function matchesSearch(o){return matchesQuery(o,query);}
const foldTurkishI=value=>value.normalize('NFC').toLocaleLowerCase('tr').replaceAll('ı','i');
const searchKey=value=>foldTurkishI(value).normalize('NFD').replace(/\p{M}/gu,'');
function matchesQuery(o,searchQuery){
 const terms=searchKey(searchQuery.trim()).split(/\s+/u);
 const text=searchKey([o.brand,o.title,o.sub].join(' '));
 return terms.every(term=>text.includes(term));
}
function matchingBrands(){return [...new Set(offers.filter(matchesSearch).map(o=>o.brand))];}
function matches(o){return (type==='Tümü'||categoriesFor(o).includes(type))&&matchesSearch(o)}
function feed(arr){arr=arr.filter(matches);if(!arr.length)return '<div class="ps-empty">Bu kategoride kampanya yok.</div>';const ready=spreadCampaigns(arr.filter(o=>o.artworkReady),'feed');const pending=arr.filter(o=>!o.artworkReady);return (ready.length?`<div class="ps-feed">${ready.map(card).join('')}</div>`:'')+(pending.length?campaignRows(pending):'');}
function heading(title){return `<div class="ps-head"><h2>${title}</h2><button data-view="filter" class="ps-filter cursor-interaction">${icon('sliders-horizontal')}Filtrele</button></div>`}
let brandNames=[];
const palettes={"Celenes by Sweden":['#e9f0e7','#294c3d'],"Justin Beauty":['#f8e7ec','#663046'],"The Purest Solutions":['#e8edf6','#273b62'],"L'Occitane":['#fff2c9','#54431b'],"Caudalie":['#e7eee4','#345242'],"Flormar":['#fae3e7','#7d243a'],"Yves Rocher":['#edf0df','#45572c']};
const shortBrand=n=>n==='Celenes by Sweden'?'Celenes':n==='The Purest Solutions'?'The Purest':n;
const logos={};
function brandRounds(){return `<section class="ps-homemarks"><div class="ps-sectionheading"><h2>Markalar</h2><button type="button" class="ps-seeall cursor-interaction" data-view="brands">Tümü${icon('chevron-right')}</button></div><div class="ps-brandrounds" aria-label="Markalar">${brandNames.map(n=>`<button class="cursor-interaction" data-brand="${esc(n)}" aria-label="${esc(n)} kampanyalarını aç"><b><img src="${logos[n]}" alt="${esc(n)} logosu"></b><span class="ps-brandlabel">${esc(n)}</span></button>`).join('')}</div></section>`}
const imageCache={};
const digitalColors={"Celenes by Sweden":['#006d68','#004a49'],"Justin Beauty":['#a92a59','#602c53'],"The Purest Solutions":['#5c56ac','#323c70'],"L'Occitane":['#eabf39','#665020'],"Caudalie":['#476d44','#253e37'],"Flormar":['#f03758','#8e193e'],"Yves Rocher":['#5b791e','#253b26']};
const brandType={"Celenes by Sweden":"Trebuchet MS,Arial,sans-serif","Justin Beauty":"Georgia,Times New Roman,serif","The Purest Solutions":"Verdana,Arial,sans-serif","L'Occitane":"Palatino Linotype,Book Antiqua,serif","Caudalie":"Baskerville,Times New Roman,serif","Flormar":"Arial Narrow,Helvetica Neue,Arial,sans-serif","Yves Rocher":"Gill Sans,Trebuchet MS,sans-serif"};
const referencePalettes={
"Celenes by Sweden":['#086f6d','#ffd767'],"Justin Beauty":['#b5234e','#f7ee63'],"The Purest Solutions":['#293db7','#d4f374'],"L'Occitane":['#a24b12','#ffe15b'],"Caudalie":['#4a235f','#d8ef78'],"Flormar":['#eb173f','#f2ed64'],"Yves Rocher":['#215b35','#ebef7a']
};
const posterHeadlines={
'celenes-sale':['%60 net','indirim'],
'justin-cart':['Sepette','200 TL indirim'],
'tps-tester':['Her siparişe','tester hediye'],
'loccitane-sale':['%30’a varan','indirim'],
'caudalie-shipping':['Ücretsiz','kargo'],
'yves-sale':['Cilt ve saç','bakımında','%40 net indirim'],
'flormar-code':['İlk alışverişe','%25 indirim'],
'justin-code':['İlk alışverişe','%15 indirim'],
'flormar-multi':['2 alana','2 hediye'],
'caudalie-gift':['Deneme boy','hediye'],
'loccitane-gift':['Verbena balm','hediye'],
'justin-club':['Her 1 TL’ye','1 puan']
};
function imagePoster(o,size="large"){const format=size==="square"?"square":size==="detail"?"detail":size==="large"?"large":"compact";return campaignArt[o.id]?.[format]||'';}
// Bundled artwork updates are bound to the exact previously approved feed files.
const trendyolSourcePrefix='https://prime-campaign-editor.pacacidogukan.chatgpt.site/assets/';
const composedTrendyolArtwork=new Map([
 ['thelifeco-trendyol-30931485-compact-v1.webp','trendyol-30931485-compact-composed-v1.webp'],
 ['thelifeco-trendyol-30931485-detail-v1.webp','trendyol-30931485-detail-composed-v1.webp'],
 ['thelifeco-trendyol-30931485-large-v1.webp','trendyol-30931485-large-composed-v1.webp'],
 ['thelifeco-trendyol-31197362-compact-v1.webp','trendyol-31197362-compact-composed-v1.webp'],
 ['thelifeco-trendyol-31197362-detail-v1.webp','trendyol-31197362-detail-composed-v1.webp'],
 ['thelifeco-trendyol-31197362-large-v1.webp','trendyol-31197362-large-composed-v1.webp'],
 ['thelifeco-trendyol-31197363-compact-v1.webp','trendyol-31197363-compact-composed-v1.webp'],
 ['thelifeco-trendyol-31197363-detail-v1.webp','trendyol-31197363-detail-composed-v1.webp'],
 ['thelifeco-trendyol-31197363-large-v1.webp','trendyol-31197363-large-composed-v1.webp'],
 ['thelifeco-trendyol-31197364-compact-v1.webp','trendyol-31197364-compact-composed-v1.webp'],
 ['thelifeco-trendyol-31197364-detail-v1.webp','trendyol-31197364-detail-composed-v1.webp'],
 ['thelifeco-trendyol-31197364-large-v1.webp','trendyol-31197364-large-composed-v1.webp'],
 ['creative-sovital-31702571-compact-v1.webp','trendyol-31702571-compact-composed-v1.webp'],
 ['creative-sovital-31702571-detail-v1.webp','trendyol-31702571-detail-composed-v1.webp'],
 ['creative-sovital-31702571-large-v1.webp','trendyol-31702571-large-composed-v1.webp'],
 ['creative-sovital-31702571-lastday-v1.webp','trendyol-31702571-lastDay-composed-v1.webp'],
 ['creative-sovital-31702571-square-v1.webp','trendyol-31702571-square-composed-v1.webp'],
 ['thelifeco-trendyol-31197363-lastday-v1.webp','trendyol-31197363-lastDay-composed-v1.webp'],
 ['thelifeco-trendyol-31197363-square-v1.webp','trendyol-31197363-square-composed-v1.webp'],
 ['thelifeco-trendyol-31197364-lastday-v1.webp','trendyol-31197364-lastDay-composed-v1.webp'],
 ['thelifeco-trendyol-31197364-square-v1.webp','trendyol-31197364-square-composed-v1.webp'],
 ['thelifeco-trendyol-30931485-lastday-v1.webp','trendyol-30931485-lastDay-composed-v1.webp'],
 ['thelifeco-trendyol-30931485-square-v1.webp','trendyol-30931485-square-composed-v1.webp'],
 ['thelifeco-trendyol-31197362-lastday-v1.webp','trendyol-31197362-lastDay-composed-v1.webp'],
 ['thelifeco-trendyol-31197362-square-v1.webp','trendyol-31197362-square-composed-v1.webp']
].map(([source,bundled])=>[trendyolSourcePrefix+source,bundled]));
function campaignImage(o,slot,extra=''){
 const m=artworkContract.slots[slot];
 const source=slot==='code'?codeBannerArt[o.id]:slot==='lastDay'?lastDayArt[o.id]:campaignArt[o.id]?.[slot];
 const composed=o.raw.channel==='Trendyol · Yetkili Satıcı'?composedTrendyolArtwork.get(source):undefined;
 const url=o.artworkReady?asset(composed||source):'';
 const spacer=`<svg class="ps-artwork-spacer" width="${m.width}" height="${m.height}" viewBox="0 0 ${m.width} ${m.height}" aria-hidden="true" focusable="false"></svg>`;
 const fallback=`<span class="ps-artworkfallback" role="img" aria-label="${esc(o.brand+' kampanya görseli hazırlanıyor')}"><b>${esc(o.brand)}</b><span>${esc(o.title)}</span></span>`;
 // A brand logo is a safe list thumbnail while a complete reviewed set is pending.
 if(!url&&slot==='square'&&logos[o.brand])return `<span class="ps-artwork-frame ps-logo-fallback ${extra}" data-artwork-slot="square">${spacer}<img src="${esc(logos[o.brand])}" alt="${esc(o.brand)} logosu" loading="lazy">${fallback}</span>`;
 return `<span class="ps-artwork-frame ${extra}" data-artwork-slot="${slot}" data-artwork-state="${url?'pending':'unavailable'}">${spacer}${url?`<img width="${m.width}" height="${m.height}" loading="${slot==='detail'?'eager':'lazy'}" decoding="async" data-validate-artwork="${slot}" src="${esc(url)}" alt="${esc(o.brand+' · '+o.title)}">`:''}${fallback}</span>`;
}
function poster(o,size){if(!o.artworkReady)return '';const slot=size==='large'?'large':size==='square'?'square':size==='detail'?'detail':'compact';return `<button type="button" class="ps-poster ${size} cursor-interaction" data-offer="${esc(o.id)}" data-card-brand="${esc(o.brand)}" aria-label="${esc(o.brand+': '+o.title)}">${campaignImage(o,slot)}</button>`}
function carousel(arr,size){return `<div class="ps-carousel ${size}" aria-label="${size==='large'?'Öne çıkan kampanyalar':'Diğer kampanyalar'}">${arr.map(o=>poster(o,size)).join('')}</div>`}
let categoryScroll=0;
let selectedCategory='Kampanya Kodu';
const categoryIconBoxes=[[12,28,86,61],[110,19,87,75],[213,14,65,86],[305,18,85,77],[14,116,83,72],[111,112,78,77],[212,112,76,77],[309,112,79,78],[7,211,93,69],[100,211,93,66],[205,207,84,75],[305,203,86,78]];
const polishedIconBoxes={'Kampanya Kodu':[28,235,405,335],'Son Gün':[449,195,376,390],'Sepette İndirim':[820,200,420,390],'Hediyeli Alışveriş':[32,635,393,410],'Üyelere Özel':[442,679,380,360],'Kargo Avantajı':[827,681,412,365]};
const categoryDisplayNames=['Kampanya Kodu','Son Gün',...categoryAtlasNames.filter(n=>n!=='Kampanya Kodu'&&n!=='Son Gün')];
const approvedCategoryArt={
 'Kampanya Kodu':'category-approved-coupon.webp',
 'Üyelere Özel':'category-approved-members.webp',
 'Ödeme Avantajları':'category-approved-payment.webp'
};
function categoryIconStyle(name){
 const image=approvedCategoryArt[name];
 if(image)return `background-image:url('assets/${image}');background-size:100% 100%;background-position:center;`;
 const index=categoryAtlasNames.indexOf(name);
 return `background-position:${(index%4)*100/3}% ${Math.floor(index/4)*50}%;`;
}

function clockAngles(now=new Date()){const p=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Istanbul',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(now).map(p=>[p.type,p.value]));const seconds=Number(p.second)+now.getMilliseconds()/1000;const minutes=Number(p.minute)+seconds/60;return {hour:(Number(p.hour)%12+minutes/60)*30,minute:minutes*6};}
function liveClock(){const a=clockAngles();return `<span class="ps-liveclock" aria-hidden="true"><span class="ps-clockhand ps-clockhour" style="--clock-angle:${a.hour}deg"></span><span class="ps-clockhand ps-clockminute" style="--clock-angle:${a.minute}deg"></span><span class="ps-clockpin"></span></span>`;}
function categoryArtwork(n){return `<span class="ps-iconart"><span class="ps-atlasicon" aria-hidden="true" style="${categoryIconStyle(n)}"></span></span>`;}
function categoryRounds(){return `<section class="ps-categorysection" aria-label="Kategoriler"><div class="ps-sectionheading"><h2 tabindex="-1">Kategoriler</h2><button type="button" class="ps-seeall cursor-interaction" data-view="campaigns" aria-label="Kampanya kategorilerini keşfet">Keşfet${icon('chevron-right')}</button></div><div class="ps-rounds ps-categorygrid" aria-label="Kampanya türleri" ${query.trim()?'hidden':''}>${categoryDisplayNames.map(n=>`<button data-type="${n}" aria-pressed="${type===n}" class="cursor-interaction ${type===n?'active':''}"><b>${categoryArtwork(n)}</b><span class="ps-categorylabel">${n}</span></button>`).join('')}</div></section>`}
function home(){return `${header()}<main class="ps-main ps-home"><div id="ps-discovery">${discovery()}</div></main>`}
const codeBannerArt={};
let codeBannerIndex=0;
function codeFeature(arr){
const coded=spreadCampaigns(arr.filter(o=>o.hasCode),'codes');
if(!coded.length)return '';
return `<section class="ps-codefeature" aria-label="Kampanya kodlu fırsatlar"><div class="ps-sectionheading"><h2 class="ps-codeheading">Kampanya Kodu</h2><button type="button" class="ps-seeall cursor-interaction" data-type="Kampanya Kodu" aria-label="Kampanya kodlu tüm fırsatları gör">Tümü${icon('chevron-right')}</button></div><div class="ps-coderail" aria-roledescription="kampanya slaytları">${coded.map((o,index)=>`<button type="button" data-offer="${esc(o.id)}" data-card-brand="${esc(o.brand)}" class="ps-codebanner cursor-interaction ${o.brand==='Justin Beauty'?'justin':''}" aria-label="${esc(o.brand+': '+o.title)}">${campaignImage(o,'code')}<span class="ps-nativecount ps-codecount" aria-label="${index+1}. kampanya, toplam ${coded.length}">${index+1}/${coded.length}</span></button>`).join('')}</div></section>`;
}
function moveCodeBanner(i,behavior='smooth'){
const rail=root.querySelector('.ps-coderail');if(!rail||!rail.children.length)return;
codeBannerIndex=i>=rail.children.length?nextCardIndex(rail,i,codeBannerIndex):(i+rail.children.length)%rail.children.length;
rail.scrollTo({left:codeBannerIndex*rail.clientWidth,behavior});
}
root.addEventListener('scroll',e=>{
if(!e.target.classList?.contains('ps-coderail'))return;
const rail=e.target;const index=Math.round(rail.scrollLeft/Math.max(1,rail.clientWidth));if(index===codeBannerIndex)return;codeBannerIndex=index;
},true);

let cardMotionPauseUntil=0;
function pauseCardMotion(event){cardMotionPauseUntil=Date.now()+7000;const section=event?.target?.closest?.('.ps-codefeature');if(section)scheduleBanner(section.classList.contains('ps-lastdayfeature')?'lastDay':'code');}
for(const event of ['pointerdown','touchstart','keydown'])root.addEventListener(event,pauseCardMotion,{passive:true});
function nextCardIndex(rail,requested,current){
 const count=rail.children.length;let next=(requested+count)%count;
 if(next===current)return next;
 const brand=rail.children[current]?.dataset?.cardBrand;
 if(brand)for(let n=0;n<count-1&&rail.children[next]?.dataset?.cardBrand===brand;n++)next=(next+1)%count;
 return next;
}
const discoveryMotionTimer=setInterval(()=>{
 if(!root.isConnected){clearInterval(discoveryMotionTimer);return;}
 if(!loaded||view!=='home'||document.hidden||Date.now()<cardMotionPauseUntil||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 for(const rail of root.querySelectorAll('.ps-carousel.large,.ps-carousel.small')){
  if(rail.children.length<2||rail.matches(':hover')||rail.contains(document.activeElement))continue;
  const r=rail.getBoundingClientRect(),v=screen.getBoundingClientRect();if(r.bottom<=v.top||r.top>=v.bottom)continue;
  const step=rail.children[1].offsetLeft-rail.children[0].offsetLeft;if(step<=0)continue;
  const current=Math.max(0,Math.min(rail.children.length-1,Math.round(rail.scrollLeft/step)));
  const next=nextCardIndex(rail,current+1,current);rail.scrollTo({left:rail.children[next].offsetLeft-rail.children[0].offsetLeft,behavior:'smooth'});
 }
},6000);

// Both banner rails restart a full seven-second interval after interaction.
const bannerTimers={};
function scheduleBanner(kind,delay=7000){clearTimeout(bannerTimers[kind]);if(root.isConnected)bannerTimers[kind]=setTimeout(()=>advanceBanner(kind),delay);}
function resetBannerTimers(){scheduleBanner('code');scheduleBanner('lastDay',10500);}
function advanceBanner(kind){
 if(!root.isConnected)return;
 if(loaded&&view==='home'&&!document.hidden&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches){
  const rail=root.querySelector(kind==='code'?'.ps-coderail':'.ps-lastdayrail');
  if(rail&&rail.children.length>1){const box=rail.getBoundingClientRect(),viewport=screen.getBoundingClientRect();if(box.bottom>viewport.top&&box.top<viewport.bottom){if(kind==='code')moveCodeBanner(codeBannerIndex+1);else moveLastDay(lastDayIndex+1);}}
 }
 scheduleBanner(kind);
}
resetBannerTimers();
const lastDayArt={};

let lastDayIndex=0;
function lastDayTicket(o){const xml=v=>String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="400" viewBox="0 0 1200 400"><rect width="1200" height="400" rx="36" fill="#171719"/><path d="M890 0v400" stroke="#f6f0df" stroke-width="4" stroke-dasharray="12 12"/><circle cx="890" cy="0" r="26" fill="#fafafa"/><circle cx="890" cy="400" r="26" fill="#fafafa"/><rect x="44" y="34" width="152" height="44" rx="12" fill="#ff454b"/><text x="120" y="64" text-anchor="middle" font-family="Arial,sans-serif" font-size="25" font-weight="700" fill="#171719">SON GÜN</text><text x="44" y="130" font-family="Arial,sans-serif" font-size="36" fill="#f6f0df">${xml(o.brand)}</text><text x="44" y="217" font-family="Arial,sans-serif" font-size="52" font-weight="700" fill="#f6f0df">${xml(o.title)}</text><text x="44" y="286" font-family="Arial,sans-serif" font-size="30" fill="#f6f0df">${xml(o.sub)}</text><text x="44" y="351" font-family="Arial,sans-serif" font-size="25" fill="#ff7276">Bitmesine 24 saatten az kaldı</text><text x="1043" y="208" text-anchor="middle" font-family="Arial,sans-serif" font-size="72" font-weight="700" fill="#ff454b">24</text><text x="1043" y="250" text-anchor="middle" font-family="Arial,sans-serif" font-size="26" fill="#f6f0df">SAATTEN AZ</text></svg>`);}
function lastDayFeature(arr){const last=spreadCampaigns(arr.filter(o=>isLastDay(o)),'last-day');if(!last.length)return '';
return `<section class="ps-codefeature ps-lastdayfeature" aria-label="Son gün kampanyaları"><h2 class="ps-codeheading">Son Gün</h2><div class="ps-lastdayrail" aria-roledescription="kampanya slaytları">${last.map((o,index)=>`<button type="button" data-offer="${esc(o.id)}" data-card-brand="${esc(o.brand)}" class="ps-codebanner cursor-interaction" aria-label="${esc(o.brand+': '+o.title)}">${campaignImage(o,'lastDay')}<span class="ps-nativecount ps-codecount" aria-label="${index+1}. kampanya, toplam ${last.length}">${index+1}/${last.length}</span></button>`).join('')}</div></section>`;}
function trendyolOffers(arr=offers){
 return arr.filter(o=>{
  if(!o.artworkReady||!o.source||!/^Trendyol · Yetkili Satıcı$/iu.test(String(o.raw.channel||'').trim()))return false;
  const source=new URL(o.source);
  return (source.hostname==='www.trendyol.com'||source.hostname==='trendyol.com')&&
    (!o.expires||o.expires*1000>Date.now());
 });
}
const trendyolBrandKey=name=>foldTurkishI(name.trim());
function trendyolBrandCards(items){
 const firstByBrand=new Map();
 for(const offer of items){
  const key=trendyolBrandKey(offer.brand);
  if(!firstByBrand.has(key))firstByBrand.set(key,offer);
 }
 const cards=[...firstByBrand.values()];
 return cards.map((o,index)=>`<button type="button" data-offer="${esc(o.id)}" class="ps-codebanner ps-trendyol-card cursor-interaction" aria-label="${esc(o.brand+': '+o.title)}">${campaignImage(o,'lastDay')}<span class="ps-nativecount ps-codecount" aria-label="${index+1}. marka, toplam ${cards.length}">${index+1}/${cards.length}</span></button>`).join('');
}
function trendyolFeature(arr){
 const cards=trendyolBrandCards(trendyolOffers(arr));
 return `<section class="ps-codefeature ps-lastdayfeature ps-trendyolfeature" aria-label="Trendyol kampanyaları"><div class="ps-sectionheading"><h2>Trendyol</h2><button type="button" class="ps-seeall cursor-interaction" data-view="trendyol" aria-label="Trendyol kampanyalarının hepsini gör">Hepsini gör${icon('chevron-right')}</button></div>${cards?`<div class="ps-trendyolrail" aria-label="Trendyol kampanyaları">${cards}</div>`:'<p class="ps-trendyol-empty" role="status">Şu anda yayında Trendyol kampanyası yok.</p>'}</section>`;
}
function moveLastDay(i,behavior='smooth'){const rail=root.querySelector('.ps-lastdayrail');if(!rail||!rail.children.length)return;lastDayIndex=i>=rail.children.length?nextCardIndex(rail,i,lastDayIndex):(i+rail.children.length)%rail.children.length;rail.scrollTo({left:lastDayIndex*rail.clientWidth,behavior});}
root.addEventListener('scroll',e=>{if(!e.target.classList?.contains('ps-lastdayrail'))return;lastDayIndex=Math.round(e.target.scrollLeft/Math.max(1,e.target.clientWidth));},true);

const newestWindow=7*86400;
function newestOffers(source=offers,time=Math.floor(Date.now()/1000)){return source.filter(o=>Number.isFinite(o.publishedAt)&&o.publishedAt>0&&o.publishedAt<=time&&o.publishedAt>=time-newestWindow&&!expired(o)).sort((a,b)=>b.publishedAt-a.publishedAt||a.id.localeCompare(b.id));}
function newestFeature(source){const arr=spreadCampaigns(newestOffers(source).filter(o=>o.artworkReady),'newest');return `<section class="ps-recentcampaigns"><div class="ps-sectionheading"><h2>En Yeni Kampanyalar</h2><button type="button" class="ps-seeall cursor-interaction" data-newest="1" aria-label="Son 7 günde yayınlanan kampanyaları keşfet">Keşfet${icon('chevron-right')}</button></div>${arr.length?carousel(arr,'small'):'<div class="ps-newestempty">Son 7 günde yayınlanan yeni bir kampanya bulunmuyor.</div>'}</section>`;}
function discovery(){if(query.trim())return searchResults();const arr=spreadCampaigns(offers.filter(matchesSearch),'discovery');const top=arr.filter(o=>o.artworkReady).slice(0,20);return `${arr.length?'':`<div class="ps-empty" role="status">${query?'Aramana uygun kampanya bulunamadı.':'Yeni ayrıcalıklar yakında'}</div>`}<section class="ps-brandcampaigns"><div class="ps-sectionheading"><h2>Marka Kampanyaları</h2><button type="button" class="ps-seeall cursor-interaction" data-home-all="1" aria-label="Tüm marka kampanyalarını gör">Tümünü Gör${icon('chevron-right')}</button></div>${carousel(top,'large')}</section>${trendyolFeature(arr)}${categoryRounds()}${codeFeature(arr)}${newestFeature(arr)}${lastDayFeature(arr)}${brandRounds()}${discountTiles()}`}

const discountRates={};
let discountThreshold='all';
const discountTileImages={"10":"assets/discountTileImages-10-art.webp","25":"assets/discountTileImages-25-art.webp","50":"assets/discountTileImages-50-art.webp","all":"assets/discountTileImages-all-art.webp"};
function discountTiles(){return '<h2 class="ps-discountheading">İndirim oranını seç, fırsatları kaçırma!</h2><div class="ps-discountgrid" aria-label="İndirim oranına göre keşfet">'+['10','25','50','all'].map(n=>'<button type="button" class="ps-discounttile cursor-interaction" data-discount="'+n+'" aria-label="'+(n==='all'?'Tüm indirimler':'%'+n+' ve üzeri')+'"><img src="'+discountTileImages[n]+'" alt="'+(n==='all'?'Tüm indirimler':'%'+n+' ve üzeri')+'"></button>').join('')+'</div>'}
function discountOffers(){return offers.filter(o=>discountThreshold==='all'?categoriesFor(o).some(c=>['Kampanya Kodu','Sepette İndirim','Ürün İndirimleri','İkinci Ürüne İndirim'].includes(c)):(discountRates[o.id]||0)>=Number(discountThreshold))}
function back(title){return `<div class="ps-back"><button data-action="back" class="ps-icon cursor-interaction" aria-label="Geri">${icon('chevron-left')}</button><span>${title}</span>${view==='detail'?`<button data-like="${esc(current.id)}" class="ps-icon cursor-interaction" aria-label="${favorites.has(current.id)?'Favorilerden çıkar':'Favorilere ekle'}" style="color:${favorites.has(current.id)?'#ff3131':'#74787f'}">${icon('bookmark')}</button>`:'<span class="ps-backspacer" aria-hidden="true"></span>'}</div>`}
let copyNotice=false;
function detailAction(o){if(!o.hasCode)return `<a class="ps-cta cursor-interaction" href="${esc(o.source)}" target="_blank" rel="noopener" style="margin-top:0">Kampanya sayfasına git</a>`;if(revealed)return `<div class="ps-realcodereveal"><strong>${esc(o.code)}</strong><button data-copy-preview="1" class="cursor-interaction">${icon('copy')}Kopyala</button></div><p class="ps-slidehelp">${o.demo?'Örnek kod · Alışverişte geçerli değildir':'Kodu kampanya koşullarına göre kullan'}</p>`;return `<div class="ps-slide ps-realtrack"><span class="ps-tracklabel">Kodu görmek için sağa kaydır</span><span id="ps-reveal" class="ps-code-thumb" role="slider" tabindex="0" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-label="Kodu açmak için sağa kaydır veya sağ ok tuşunu kullan">${icon('chevron-right')}</span></div><p class="ps-slidehelp">Kodu açmak için butonu sağa kaydır</p>`}
function detail(){const o=current;const channel=o.demo?'Taslak kampanya':o.source.replace(/^https?:\/\//,'').split('/')[0].replace(/^www\./,'');return `<main class="ps-realdetail" data-detail-id="${esc(o.id)}"><header class="ps-detailtop"><button data-action="back" class="cursor-interaction" aria-label="Geri">${icon('chevron-left')}</button><strong>Prime Ayrıcalıkları</strong><button data-like="${esc(o.id)}" role="switch" aria-checked="${favorites.has(o.id)}" class="cursor-interaction ${favorites.has(o.id)?'active':''}" aria-label="${esc(o.brand)} ${favorites.has(o.id)?'favorilerden çıkar':'favorilere ekle'}" aria-pressed="${favorites.has(o.id)}">${icon('bookmark')}</button></header><div class="ps-detail-scroll"><div class="ps-nativehero">${campaignImage(o,'detail')}</div><section class="ps-detailsheet" aria-label="Kampanya detayları"><div class="ps-sheetpills"><span>${esc(o.brand)}</span><span>${esc(channel)}</span></div><h1>${esc(o.title)}</h1><div class="ps-sheetbody"><p>${esc(o.terms)}</p><div class="ps-sheetdate">${icon('calendar-days')}<span>Kampanya bitiş tarihi<strong>${esc(o.expiry)}</strong></span></div></div></section></div><div class="ps-slidefooter">${detailAction(o)}</div>${copyNotice?`<div class="ps-copyoverlay"><section class="ps-copydialog" role="dialog" aria-modal="true" aria-label="Kod kopyalandı"><button data-close-copy="1" class="ps-copyhandle cursor-interaction" aria-label="Kod penceresini kapat"><span></span></button><h2>Kod kopyalandı</h2><p>${o.demo?'Bu örnek kod gerçek alışverişte geçerli değildir.':'Kampanya kodunu alışveriş sırasında kullanabilirsin.'}</p><div class="ps-code">${esc(o.code)}</div>${o.demo?'':`<a href="${esc(o.source)}" target="_blank" rel="noopener" class="ps-cta cursor-interaction">Web sitesine git${icon('external-link')}</a>`}</section></div>`:''}</main>`}
function brandContent(){const arr=filteredCampaigns(campaignFilters,'brands');const names=[...new Set(arr.map(o=>o.brand))];const heading=browseResultHeading('Markalar',names.length,'marka');if(query.trim())return heading+campaignRows(arr,'Aramana uygun kampanya bulunamadı.');return heading+`<div class="ps-brandgrid">${names.map(n=>`<button class="ps-brandtile cursor-interaction" data-brand="${esc(n)}" aria-label="${esc(n)} kampanyalarını aç"><img class="ps-tilelogo" loading="lazy" decoding="async" src="${logos[n]}" alt="${esc(n)} logosu"></button>`).join('')}</div>`;}
function pageSearchHeader(inputId='ps-search',value=query){
 const hint='<span class="ps-searchhint" aria-hidden="true"><span><strong class="ps-wordmark">Prime</strong> içinde ara</span></span>';
 return `<header class="ps-header ps-pagesearchheader"><div class="ps-searchrow"><button type="button" data-action="back" class="ps-icon cursor-interaction" aria-label="Geri">${icon('chevron-left')}</button><div class="ps-search">${icon('search')}<span class="ps-searchfield"><input id="${esc(inputId)}" placeholder="Prime içinde ara" aria-label="Marka veya kampanya ara" value="${esc(value)}">${hint}</span><button type="button" class="ps-searchclear" data-search-clear="1" aria-label="Aramayı temizle">${icon('x')}</button></div></div></header>`;
}
function brands(){return `<div class="ps-browseheader">${pageSearchHeader()}${campaignFilterToolbar('brands')}</div><main class="ps-nativepage ps-campaignspage ps-brandspage" id="ps-brand-results">${brandContent()}</main>`;}

function brandpage(){
 const source=navigation.at(-1)?.view==='brands'?filteredCampaigns(campaignFilters,'brands'):offers.filter(o=>campaignFilterMatches(o));
 const arr=source.filter(o=>o.brand===brand);
 return brandCampaignPage(brand,arr);
}
function brandCampaignPage(name,arr,category=''){
 const context=category?category+' · ':'';
 return campaignListPage('Marka Kampanyaları',name,`${context}${arr.length} kampanya`,campaignRows(arr),'ps-brandcampaign-page');
}
function campaignListPage(title,heading,summary,content,pageClass){
 return `<div class="ps-browseheader ps-campaignlist-header">${nativeHeader(title)}</div><main class="ps-nativepage ps-campaignspage ps-campaignlist-page ${pageClass}"><div class="ps-filterresulthead"><div><h2>${esc(heading)}</h2><p role="status">${esc(summary)}</p></div></div>${content}</main>`;
}
function categorypage(){return campaignBrowsePage('category');}
function filter(){return `${back('Filtrele')}<main class="ps-main"><h2>Kampanya türü</h2><select id="ps-type" class="ps-select" aria-label="Kampanya türü">${cats.map(([c])=>`<option ${type===c?'selected':''}>${c}</option>`).join('')}</select><button data-action="apply" class="ps-cta cursor-interaction">Kampanyaları göster</button><button data-action="reset" class="ps-filter ps-reset cursor-interaction">Filtreleri temizle</button></main>`}
let campaignBrand='Tümü',campaignGroup='',campaignOrigin='campaigns';
function nativeHeader(title){return `<header class="ps-nativebar"><button type="button" data-action="back" class="cursor-interaction" aria-label="Geri">${icon('chevron-left')}</button><strong>${title}</strong><span class="ps-backspacer" aria-hidden="true"></span></header>`}
let favoriteQuery='';
function favoritesContent(){const saved=offers.filter(o=>favorites.has(o.id));const arr=saved.filter(o=>matchesQuery(o,favoriteQuery));return `${arr.length?`<div class="ps-nativegrid">${arr.map(o=>`<article class="ps-nativefavorite"><button class="ps-nativelogo ps-brandtile cursor-interaction" data-offer="${esc(o.id)}" aria-label="${esc(o.brand)} kampanyasını aç"><img class="ps-tilelogo" loading="lazy" decoding="async" src="${logos[o.brand]}" alt="${esc(o.brand)} logosu"></button><button class="ps-nativesave cursor-interaction" data-like="${esc(o.id)}" aria-label="${esc(o.brand)} favorilerden çıkar" aria-pressed="true">${icon('bookmark')}</button></article>`).join('')}</div>`:favoriteQuery.trim()&&saved.length?'<div class="ps-empty">Favorilerinde aramana uygun kampanya bulunamadı.</div>':`<div class="ps-nativeempty">${icon('bookmark')}<h2>Henüz favorin yok</h2><p>Fırsatların yanındaki yer imiyle<br>beğendiklerini kaydedebilirsin.</p><button data-view="brands" class="cursor-interaction">Fırsatları keşfet</button></div>`}`}
function nativeFavorites(){return `<div class="ps-browseheader">${pageSearchHeader('ps-favorites-query',favoriteQuery)}</div><main class="ps-nativepage ps-campaignspage ps-nativefavorites" id="ps-favorites-results">${favoritesContent()}</main>`;}
function nativeCampaigns(){return campaignBrowsePage('campaigns');}

function nativeGroups(names,sourceOffers=offers,brandKey=name=>name){return names.map(n=>{const arr=sourceOffers.filter(o=>brandKey(o.brand)===brandKey(n));if(!arr.length)return '';return `<article class="ps-nativegroup" data-brand-group="${esc(n)}"><div class="ps-nativerail" tabindex="0" role="group" aria-roledescription="kampanya slaytları" aria-label="${esc(n)} kampanyalarını aç">${arr.map(o=>`<button type="button" class="cursor-interaction" data-campaign-group="${esc(n)}" data-offer-id="${esc(o.id)}" aria-label="${esc(n)} kampanyalarını aç">${campaignImage(o,'square')}</button>`).join('')}</div>${arr.length>1?`<span class="ps-nativecount" aria-label="${arr.length} kampanya">${arr.length}</span><div class="ps-nativedots" aria-hidden="true">${arr.map((o,i)=>`<span class="${i===0?'current':''}"></span>`).join('')}</div>`:''}</article>`}).join('')||'<div class="ps-empty">Marka bulunamadı</div>'}
function campaignRows(arr,empty='Bu markada kampanya bulunmuyor.'){return `<div class="ps-nativelist">${arr.length?arr.map(o=>`<button type="button" class="cursor-interaction" data-offer="${esc(o.id)}" data-offer-id="${esc(o.id)}" aria-label="${esc(o.brand+': '+o.title)}">${campaignImage(o,'square','ps-listthumb')}<span><strong>${esc(o.title)}</strong><small class="ps-rowsummary">${esc(o.sub||'Kampanyayı incele')}</small></span>${icon('chevron-right')}</button>`).join(''):`<div class="ps-empty">${esc(empty)}</div>`}</div>`;}
function searchResults(){const arr=offers.filter(matchesSearch);return `<section class="ps-searchresults" aria-label="Arama sonuçları"><p class="ps-searchsummary" role="status">${arr.length} kampanya bulundu</p>${campaignRows(arr,'Aramana uygun kampanya bulunamadı.')}</section>`;}
function nativeCampaignGroup(){
 const key=campaignOrigin==='trendyol'?trendyolBrandKey:name=>name;
 const arr=filteredCampaigns(campaignFilters,campaignOrigin).filter(o=>key(o.brand)===key(campaignGroup));
 const category=campaignOrigin==='category'?selectedCategory:campaignOrigin==='trendyol'?'Trendyol':'';
 return brandCampaignPage(campaignGroup,arr,category);
}

const testflightReference={"version":"1.0.1","build":"142.1","commit":"26bcf941968e1a3a49993add45748cca94c9404a","uploadRun":41185972943,"statusRun":41186442406,"appBlob":"3ef3044b8dd3b5970d20cf12518c63fbd84e0f32","cssBlob":"f54ba90bff5d0b681f60bfbc35fd15f2e921af48","notificationsAvailable":false};
let settingsNotifications=false,settingsPhoto=readLocal('lmprime-photo',null);
let settingsName=String(readLocal('lmprime-name','')||'').trim().slice(0,60),profileNameDraft=settingsName;
let profilePhotoBusy=false,profilePhotoEpoch=0,profileMessage='',profileError='';
const settingsViews=['settings','personal','notifications','privacy','terms','deleteAccount'];
function settingIcon(name){
 const paths={camera:'<path d="M14 4h-4L8 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-4z"/><circle cx="12" cy="13" r="4"/>','trash-2':'<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/>','shield-check':'<path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11zM9 12l2 2 4-4"/>','file-text':'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h6"/>'};
 const glyph=paths[name]?`<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`:icon(name);
 return `<span class="ps-profileglyph" aria-hidden="true">${glyph}</span>`;
}
const profileDisplayName=()=>settingsName||'Misafir';
const settingsAvatar=()=>typeof settingsPhoto==='string'&&/^data:image\//.test(settingsPhoto)?`<img class="profile-photo" src="${esc(settingsPhoto)}" alt="Profil fotoğrafın">`:icon('user-round');
function settingsHeader(title){return `<header class="ps-nativebar ps-profilebar"><button type="button" data-settings-back="1" data-action="back" class="cursor-interaction" aria-label="Geri">${icon('chevron-left')}</button><strong>${title}</strong><span class="ps-backspacer" aria-hidden="true"></span></header>`;}
function settingsMenu(name,i,target){return `<button type="button" class="cursor-interaction" data-view="${target}">${settingIcon(i)}<span>${name}</span>${icon('chevron-right')}</button>`;}
function profileFeedback(){return `<p class="ps-profilefeedback ${profileError?'is-error':''}" role="${profileError?'alert':'status'}" aria-live="polite">${esc(profileError||profileMessage)}</p>`;}
function settingsPage(){return `<div class="ps-profilepage">${settingsHeader('Profil')}<main class="ps-profilecontent"><button type="button" class="ps-profilecard cursor-interaction" data-view="personal" aria-label="Profili düzenle"><span class="ps-profileavatar">${settingsAvatar()}</span><span class="ps-profilecopy"><strong>${esc(profileDisplayName())}</strong><small>Profili düzenle</small></span>${icon('chevron-right')}</button><div class="ps-profilemenu">${settingsMenu('Gizlilik','shield-check','privacy')}${settingsMenu('Verilerimi sil','trash-2','deleteAccount')}${settingsMenu('Kullanıcı Sözleşmesi','file-text','terms')}</div></main></div>`;}
function settingsSubpage(){let title='',body='';
 if(view==='personal'){title='Profili düzenle';body=`<section class="ps-photoeditor" aria-labelledby="ps-photo-title"><h2 id="ps-photo-title">Profil fotoğrafı</h2><span class="ps-profileavatar ps-profileavatar-large">${settingsAvatar()}</span><div class="ps-photoactions"><button type="button" class="ps-photochoose cursor-interaction" data-profile-pick-photo="1" ${profilePhotoBusy?'disabled':''}>${settingIcon('camera')}${settingsPhoto?'Fotoğrafı değiştir':'Fotoğraf ekle'}</button>${settingsPhoto?`<button type="button" class="ps-photoremove cursor-interaction" data-remove-settings-photo="1" ${profilePhotoBusy?'disabled':''}>${settingIcon('trash-2')}Fotoğrafı kaldır</button>`:''}</div><input id="ps-settings-photo" type="file" accept="image/*" class="ps-profilefile" aria-label="Profil fotoğrafı seç" ${profilePhotoBusy?'disabled':''}><p class="ps-profilehint">En fazla 5 MB. Fotoğrafın yuvarlak alanda ortalanır.</p></section><form class="ps-nameeditor" id="ps-profile-form"><label for="ps-profile-name">İsim</label><input id="ps-profile-name" name="profile-name" type="text" maxlength="60" autocomplete="given-name" enterkeyhint="done" aria-label="Profil adı" placeholder="Adını yaz" value="${esc(profileNameDraft)}"><button type="submit" class="ps-profilesave cursor-interaction" data-profile-save-name="1">İsmi kaydet</button></form>${profileFeedback()}<p class="ps-profilehint">İsim ve fotoğraf isteğe bağlıdır; yalnızca bu cihazda saklanır.</p>`;}
 if(view==='notifications'){title='Bildirimlerim';body=`<div class="ps-nativeempty"><h2>Henüz bildirimin yok</h2><p>Yeni ayrıcalıklar burada görünecek.</p></div>`;}
 if(view==='privacy'||view==='terms'){title=view==='privacy'?'Gizlilik':'Kullanıcı Sözleşmesi';body=`<div class="document">${view==='privacy'?settingsPrivacy:settingsTerms}</div>`;}
 if(view==='deleteAccount'){title='Verileri sil';body=`<div class="document"><h1>Verilerimi sil</h1><p>Teknik oturumun ve varsa bildirim kayıtların silinir. Bu cihazdaki favorilerin, profil ismin, fotoğrafın ve kaydedilen kampanya kodların da kaldırılır.</p><p>Bu işlem geri alınamaz. Sonrasında uygulama bilgi istemeden yeniden açılır. Kimliğe bağlanmayan kampanya istatistikleri ve normal saklama süresine tabi güvenlik kayıtları korunur.</p><button class="primary cursor-interaction" data-settings-delete="1">Verileri sil</button><button class="text-link cursor-interaction" data-view="settings">Vazgeç</button></div>`;}
 return `<div class="ps-profilepage">${settingsHeader(title)}<main class="ps-profilecontent">${body}</main></div>`;
}
function renderProfile(){if(view==='personal'||view==='settings')render();}
function saveProfileName(value=profileNameDraft){
 const name=String(value).trim().replace(/\s+/g,' ');profileNameDraft=String(value);profileError='';profileMessage='';
 if(name.length>60){profileError='İsim en fazla 60 karakter olabilir.';renderProfile();return false;}
 if(!writeLocal('lmprime-name',name)){profileError='İsmin kaydedilemedi. Cihazında boş alan açıp tekrar dene.';renderProfile();return false;}
 settingsName=name;profileNameDraft=name;profileMessage='İsmin kaydedildi.';renderProfile();return true;
}
function removeProfilePhoto(){
 profileError='';profileMessage='';
 if(!writeLocal('lmprime-photo',null)){profileError='Fotoğraf kaldırılamadı. Cihazında boş alan açıp tekrar dene.';renderProfile();return false;}
 profilePhotoEpoch++;profilePhotoBusy=false;settingsPhoto=null;profileMessage='Fotoğraf kaldırıldı.';renderProfile();return true;
}
function resizedProfilePhoto(file){return new Promise((resolve,reject)=>{
 const reader=new FileReader();reader.onerror=()=>reject(Error('Fotoğraf okunamadı. Başka bir fotoğraf seç.'));
 reader.onload=()=>{const image=new Image();image.onerror=()=>reject(Error('Fotoğraf açılamadı. Başka bir fotoğraf seç.'));image.onload=()=>{try{
  const width=image.naturalWidth||image.width,height=image.naturalHeight||image.height;if(!width||!height)throw Error();
  const crop=Math.min(width,height),side=Math.min(512,crop),canvas=document.createElement('canvas');canvas.width=side;canvas.height=side;
  const context=canvas.getContext('2d');if(!context)throw Error();context.fillStyle='#ffffff';context.fillRect(0,0,side,side);context.drawImage(image,(width-crop)/2,(height-crop)/2,crop,crop,0,0,side,side);
  resolve(canvas.toDataURL('image/jpeg',.85));
 }catch{reject(Error('Fotoğraf hazırlanamadı. Başka bir fotoğraf seç.'));}};image.src=String(reader.result);};reader.readAsDataURL(file);
});}
async function saveProfilePhoto(file){
 if(!file||profilePhotoBusy)return false;profileError='';profileMessage='';
 if(!String(file.type).startsWith('image/')||file.type==='image/svg+xml'){profileError='Lütfen bir fotoğraf dosyası seç.';renderProfile();return false;}
 if(file.size>5*1024*1024){profileError='Lütfen 5 MB’den küçük bir fotoğraf seç.';renderProfile();return false;}
 const epoch=++profilePhotoEpoch;profilePhotoBusy=true;profileMessage='Fotoğraf hazırlanıyor…';renderProfile();
 try{const result=await resizedProfilePhoto(file);if(epoch!==profilePhotoEpoch)return false;
  if(!writeLocal('lmprime-photo',result))throw Error('Fotoğraf kaydedilemedi. Cihazında boş alan açıp tekrar dene.');
  settingsPhoto=result;profileMessage='Fotoğraf kaydedildi.';return true;
 }catch(e){if(epoch===profilePhotoEpoch){profileError=e.message;profileMessage='';}return false;}
 finally{if(epoch===profilePhotoEpoch){profilePhotoBusy=false;renderProfile();}}
}
root.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const d=b.dataset;
 if(d.settingsNotifications){settingsNotifications=!settingsNotifications;render();}
 if(d.profilePickPhoto){root.querySelector('#ps-settings-photo')?.click();return;}
 if(d.profileSaveName){e.preventDefault?.();saveProfileName(root.querySelector('#ps-profile-name')?.value??profileNameDraft);return;}
 if(d.removeSettingsPhoto){removeProfilePhoto();return;}
 if(d.settingsDelete){deleteData();}
});
root.addEventListener('submit',e=>{if(e.target.id!=='ps-profile-form')return;e.preventDefault();saveProfileName(root.querySelector('#ps-profile-name')?.value??profileNameDraft);});
root.addEventListener('input',e=>{if(e.target.id==='ps-profile-name')profileNameDraft=e.target.value;});
root.addEventListener('change',e=>{if(e.target.id==='ps-settings-photo')return saveProfilePhoto(e.target.files?.[0]);});

const settingsTerms="<h1>Literatür Masası Prime Kullanıcı Sözleşmesi</h1><p>Son güncelleme: 21.10.2026</p><p>Hizmeti sunan: Doğukan Paçacı · İletişim: marka@literaturmasasi.com</p><h2>Kapsam ve kullanım</h2><p>Uygulama açılış logosundan sonra doğrudan açılır. Hesap, şifre, erişim kodu, telefon veya e-posta gerekmez. Kampanyaları inceleyebilir, favorilerine ekleyebilir ve kampanya kodlarını görüntüleyebilirsin.</p><h2>Kampanyalar</h2><p>Her teklif ilgili markanın koşulları, stokları ve geçerlilik süresiyle sınırlıdır. Örnek olarak işaretlenen kampanyalar alışveriş hakkı sağlamaz. Uygulama içinde satış, ödeme veya sipariş yapılmaz. Alışveriş ve teslimat ilgili satıcının sorumluluğundadır.</p><h2>İçerik ve sorumluluk</h2><p>İçerikler tıbbi tavsiye değildir. Ürün kullanımı hakkında sağlık uzmanına danış. Hizmeti hukuka uygun kullan; otomatik kötüye kullanım ve yetkisiz yönetim işlemleri yasaktır.</p><h2>İletişim</h2><p>Destek ve talepler için marka@literaturmasasi.com adresine yazabilirsin.</p>";
const settingsPrivacy="<h1>Literatür Masası Prime Gizlilik Bilgilendirmesi</h1><p>Son güncelleme: 21.10.2026</p><p>Veri sorumlusu: Doğukan Paçacı · marka@literaturmasasi.com</p><h2>Uygulamanın açılması</h2><p>Hesap, şifre, telefon veya e-posta istenmez. Hizmetin çalışması için cihazda rastgele kurulum kimliği ve teknik oturum anahtarı oluşturulur. Anahtar iOS Keychain içinde tutulur; sunucuda yalnızca özeti saklanır. Bu teknik kayıtlar kişisel iletişim bilgisi içermez. Oturum en fazla 30 gün geçerlidir ve gerektiğinde otomatik yenilenir.</p><h2>Cihazdaki bilgiler</h2><p>Favoriler ile isteğe bağlı profil ismi ve fotoğrafı yalnızca cihazda saklanır. İsim ve fotoğraf sunucuya gönderilmez.</p><h2>Hizmet ve güvenlik</h2><p>Kampanya kodu görüntülemeleri kampanya istatistikleri için kaydedilir. Bildirimler etkinse tercihler ve okunma bilgileri teknik oturumla ilişkilendirilebilir. Ağ adresi kötüye kullanım sınırlaması için işlenir; veritabanındaki güvenlik sayaçları zaman aralığına bağlı özet anahtarlardır. Yönetim paneline erişim ayrıca korunur.</p><h2>Saklama ve silme</h2><p>Profil → Verilerimi sil seçeneğiyle cihazdaki favori, isim, fotoğraf ve tercihler ile geçerli teknik oturumun sunucudaki kayıtları silinebilir. Sonrasında uygulama kişisel bilgi istemeden kullanılabilir. Süresi dolan oturumlar sonraki açılışlarda temizlenir. Kimliğe bağlanmayan kampanya istatistikleri ve normal saklama süresine tabi güvenlik kayıtları bu işlemden etkilenmez. Destek yazışmaları talebin çözümü ve yasal yükümlülükler için gerekli süreyle saklanır.</p><h2>Haklarınız</h2><p>Bilgi, düzeltme ve silme taleplerinizi marka@literaturmasasi.com adresine iletebilirsiniz.</p>";

// iOS WKWebView can collapse percentage-sized media inside a flex button.
// Resolve the canonical ratio from the actual card width in one batched pass.
function syncArtworkFrames(){
 const layouts=[...screen.querySelectorAll('.ps-artwork-frame')].map(frame=>{
  const spec=artworkContract.slots[frame.dataset.artworkSlot];if(!spec)return null;
  const parent=frame.parentElement;
  const media=parent&&(['ps-poster','ps-codebanner','ps-nativehero'].some(name=>parent.classList.contains(name))||parent.parentElement?.classList.contains('ps-nativerail'));
  const width=media?parent.getBoundingClientRect().width-artworkContract.inset*2:frame.getBoundingClientRect().width;
  return width>0?{frame,parent,media,width,height:width*spec.height/spec.width}:null;
 }).filter(Boolean);
 for(const x of layouts){x.frame.style.width=x.width+'px';x.frame.style.height=x.height+'px';if(x.media)x.parent.style.height=(x.height+artworkContract.inset*2)+'px';}
}
// Campaign discovery filters: OR within a facet, AND between facets.
const productCategoryOptions=[['supplements','Gıda Takviyeleri'],['care','Dermokozmetik ve Kişisel Bakım'],['sports','Sporcu Beslenmesi'],['makeup','Makyaj ve Kozmetik']];
const emptyCampaignFilters=()=>({products:[],brands:[],rates:[],published:[],ending:[],codes:[],saved:[],sort:'discover'});
const cloneCampaignFilters=f=>JSON.parse(JSON.stringify({...emptyCampaignFilters(),...f}));
let campaignFilters=emptyCampaignFilters(),filterDraft=null,filterOpen=false,filterGroup='all',filterAllBrands=false,filterFocus=null,filterDragStart=null;
const filterOptions={products:productCategoryOptions,rates:[['10','%10 ve üzeri'],['25','%25 ve üzeri'],['50','%50 ve üzeri']],published:[['1','Son 24 saat'],['7','Son 7 gün'],['30','Son 30 gün']],ending:[['1','Son 24 saat'],['3','3 gün içinde'],['7','7 gün içinde']],codes:[['yes','Kodlu'],['no','Kodsuz']],saved:[['yes','Favorilerim']]};
const filterTitles={products:'Ürün Kategorisi',brands:'Markalar',rates:'İndirim oranı',published:'Yayınlanma tarihi',ending:'Bitiş zamanı',codes:'Kod kullanımı',saved:'Favorilerim'};
const campaignSortOptions=[
 ['discover','Keşfet','zap'],
 ['newest','En yeniler','calendar-days'],
 ['ending','Bitişi en yakın','calendar-clock'],
 ['discount','İndirim oranı yüksekten düşüğe','trending-down']
];
function campaignFilterCount(f=campaignFilters){return Object.keys(filterTitles).reduce((n,k)=>n+f[k].length,0);}
function campaignFilterMatches(o,f=campaignFilters,skip='',now=Date.now(),scope=view){
 const days=86400000,rate=discountRates[o.id]||0;
 const tests={products:()=>f.products.some(id=>o.productCategories.includes(id)),brands:()=>scope==='trendyol'?f.brands.some(name=>trendyolBrandKey(name)===trendyolBrandKey(o.brand)):f.brands.includes(o.brand),rates:()=>rate>0&&f.rates.some(v=>rate>=Number(v)),published:()=>o.publishedAt>0&&o.publishedAt*1000<=now&&f.published.some(v=>now-o.publishedAt*1000<=Number(v)*days),ending:()=>o.expires*1000>now&&f.ending.some(v=>o.expires*1000-now<=Number(v)*days),codes:()=>f.codes.includes(o.hasCode?'yes':'no'),saved:()=>f.saved.includes('yes')&&favorites.has(o.id)};
 return !expired(o)&&Object.keys(tests).every(k=>k===skip||!f[k].length||tests[k]());
}
function campaignFilterSource(scope=view){
 const source=scope==='trendyol'?trendyolOffers():scope==='newest'?newestOffers():scope==='discount'?discountOffers():offers;
 return source.filter(o=>matchesSearch(o)&&(!['category','brands','trendyol','newest','discount'].includes(scope)||selectedCategory==='Tümü'||categoriesFor(o).includes(selectedCategory))&&(scope!=='campaigns'||campaignBrand==='Tümü'||o.brand===campaignBrand));
}
function filteredCampaigns(f=campaignFilters,scope=view){
 const arr=campaignFilterSource(scope).filter(o=>campaignFilterMatches(o,f,'',Date.now(),scope));
 const stable=(a,b)=>a.id.localeCompare(b.id);
 if(f.sort==='newest')arr.sort((a,b)=>b.publishedAt-a.publishedAt||stable(a,b));
 else if(f.sort==='ending')arr.sort((a,b)=>(a.expires||Infinity)-(b.expires||Infinity)||stable(a,b));
 else if(f.sort==='discount')arr.sort((a,b)=>(discountRates[b.id]||0)-(discountRates[a.id]||0)||stable(a,b));
 return arr;
}
function campaignFilterToolbar(scope=view){
 const active=['category','brands','trendyol','newest','discount'].includes(scope)?selectedCategory:'Tümü',count=campaignFilterCount();
 return `<div class="ps-discoverytools"><div class="ps-categorytabs" role="group" aria-label="Kampanya kategorileri">${['Tümü',...categoryDisplayNames].map(n=>`<button type="button" data-filter-category="${esc(n)}" aria-pressed="${n===active}">${esc(n)}</button>`).join('')}</div><div class="ps-quickfilters"><button type="button" class="ps-allfilters" data-filter-open="all" aria-label="Tüm filtreleri aç${count?', '+count+' seçim':''}" aria-haspopup="dialog">${icon('sliders-horizontal')}${count?`<span>${count}</span>`:''}</button><div class="ps-quickrail" aria-label="Hızlı filtreler">${Object.keys(filterTitles).map(k=>{const values=campaignFilters[k],label=values.length===1?(k==='brands'?values[0]:filterOptions[k].find(([v])=>v===values[0])?.[1]||filterTitles[k]):filterTitles[k]+(values.length?' ('+values.length+')':'');return `<button type="button" data-filter-open="${k}" aria-haspopup="dialog" class="${values.length?'selected':''}">${esc(label)}</button>`;}).join('')}</div></div></div>`;
}
function browseResultHeading(title,count,kind){
 const sortLabel=campaignSortOptions.find(([value])=>value===campaignFilters.sort)?.[1]||'Keşfet';
 return `<div class="ps-filterresulthead"><div><h2>${esc(title)}</h2><p role="status">${count} ${kind}</p></div><button type="button" class="ps-sortcontrol${campaignFilters.sort==='discover'?'':' selected'}" data-filter-open="sort" aria-haspopup="dialog" aria-label="Sırala: ${esc(sortLabel)}">Sırala</button></div>`;
}
function campaignFilterResults(scope=view){
 const arr=filteredCampaigns(campaignFilters,scope),filtered=campaignFilterCount()>0||campaignFilters.sort!=='discover'||query.trim();
 const headings={category:selectedCategory,trendyol:'Trendyol',newest:'En Yeniler',discount:'%'+discountThreshold+' ve üzeri'};
 const heading=browseResultHeading(headings[scope]||'Kampanyalar',arr.length,'kampanya');
 if(!arr.length)return heading+`<div class="ps-empty">Seçimlerine uygun kampanya bulunamadı.${campaignFilterCount()?'<button type="button" data-filter-reset="1">Filtreleri temizle</button>':''}</div>`;
 if(filtered&&scope!=='trendyol')return heading+campaignRows(arr);
 const key=scope==='trendyol'?trendyolBrandKey:name=>name;
 const names=new Map();
 for(const o of arr){const id=key(o.brand);if(!names.has(id))names.set(id,o.brand);}
 const brands=[...names.values()];
 return heading+`<div class="ps-nativegrid">${nativeGroups(brands,arr,key)}</div>`;
}
function campaignBrowsePage(scope=view){return `<div class="ps-browseheader">${pageSearchHeader('ps-native-query')}${campaignFilterToolbar(scope)}</div><main class="ps-nativepage ps-campaignspage ${scope==='category'?'ps-categorypage':''}"><div id="ps-native-results">${campaignFilterResults(scope)}</div></main>`;}
function filterChip(group,value,label,count){const selected=filterDraft[group].includes(value);return `<button type="button" data-filter-group="${group}" data-filter-value="${esc(value)}" aria-pressed="${selected}">${esc(label)}${count===undefined?'':` <span>${count}</span>`}</button>`;}
function campaignFilterSheetHTML(){
 const f=filterDraft,counts=new Map();
 const brandKey=view==='trendyol'?trendyolBrandKey:name=>name;
 const labels=new Map(f.brands.map(name=>[brandKey(name),name]));
 for(const o of campaignFilterSource().filter(o=>campaignFilterMatches(o,f,'brands'))){
  const key=brandKey(o.brand);
  if(!labels.has(key))labels.set(key,o.brand);
  counts.set(key,(counts.get(key)||0)+1);
 }
 const names=[...labels.values()].sort((a,b)=>a.localeCompare(b,'tr'));
 const shown=filterAllBrands?names:[...new Set([...f.brands,...names.slice(0,6)])];
 const section=(k,content)=>filterGroup!=='all'&&filterGroup!==k?'':`<section id="ps-filter-${k}" aria-labelledby="ps-filter-title-${k}"><h3 id="ps-filter-title-${k}">${filterTitles[k]}</h3><div class="ps-filterchips">${content}</div></section>`;
 const facets=k=>section(k,`<button type="button" data-filter-clear="${k}" aria-pressed="${!f[k].length}">Tümü</button>`+filterOptions[k].map(([v,n])=>filterChip(k,v,n)).join(''));
 return `<section class="ps-filterdialog" role="dialog" aria-modal="true" aria-labelledby="ps-filter-title"><header class="ps-filterdialoghead"><h2 id="ps-filter-title" tabindex="-1">${filterGroup==='all'?'Filtrele':filterGroup==='sort'?'Sırala':filterTitles[filterGroup]}</h2><button type="button" class="ps-filterclose" data-filter-close="1" aria-label="Kapat">${icon('x')}</button></header><div class="ps-filterbody">${['all','sort'].includes(filterGroup)?`<section id="ps-filter-sort" aria-labelledby="ps-filter-title-sort"><h3 id="ps-filter-title-sort">Sıralama</h3><div class="ps-filterchips">${campaignSortOptions.map(([v,n,glyph])=>`<button type="button" data-filter-sort="${v}" aria-pressed="${f.sort===v}">${icon(glyph)}<span>${n}</span></button>`).join('')}</div></section>`:''}${facets('products')}${facets('rates')}${section('brands',`<button type="button" data-filter-clear="brands" aria-pressed="${!f.brands.length}">Tümü</button>`+shown.map(n=>filterChip('brands',n,n,counts.get(brandKey(n))||0)).join('')+(names.length>6?`<button type="button" class="ps-brandsmore" data-filter-more="1" aria-expanded="${filterAllBrands}">${filterAllBrands?'Daha Az Göster':'Tümünü Gör'}${icon(filterAllBrands?'chevron-up':'chevron-down')}</button>`:''))}${facets('published')}${facets('ending')}${facets('codes')}${facets('saved')}</div><footer class="ps-filterfooter"><button type="button" data-filter-clean="1">Temizle</button><button type="button" data-filter-apply="1">${filteredCampaigns(f).length} kampanyayı göster</button></footer></section>`;
}
function redrawCampaignFilterSheet(){
 const host=root.querySelector('.ps-filteroverlay');if(!host)return;
 const y=host.querySelector('.ps-filterbody')?.scrollTop||0,focused=document.activeElement;
 const focusKey=focused?.dataset?.filterGroup!==undefined?{group:focused.dataset.filterGroup,value:focused.dataset.filterValue}:null;
 host.innerHTML=campaignFilterSheetHTML();host.querySelector('.ps-filterbody').scrollTop=y;
 if(focusKey)[...host.querySelectorAll('[data-filter-group]')].find(b=>b.dataset.filterGroup===focusKey.group&&b.dataset.filterValue===focusKey.value)?.focus({preventScroll:true});
}
function openCampaignFilters(group='all'){
 if(filterOpen)return;filterFocus=document.activeElement;filterDraft=cloneCampaignFilters(campaignFilters);filterOpen=true;filterGroup=group==='sort'||Object.hasOwn(filterTitles,group)?group:'all';filterAllBrands=false;
 const host=document.createElement('div');host.className='ps-filteroverlay';host.innerHTML=campaignFilterSheetHTML();root.append(host);installFilterTouchGuard(host);
 screen.inert=true;const nav=root.querySelector('.ps-nav');if(nav)nav.inert=true;
 host.querySelector('#ps-filter-title')?.focus();
}
function closeCampaignFilters(apply=false){
 if(!filterOpen)return;if(apply)campaignFilters=cloneCampaignFilters(filterDraft);
 root.querySelector('.ps-filteroverlay')?.remove();filterOpen=false;filterDraft=null;screen.inert=false;const nav=root.querySelector('.ps-nav');if(nav)nav.inert=false;
 if(apply){const y=screen.scrollTop;render();screen.scrollTop=y;root.querySelector('[data-filter-open="all"]')?.focus({preventScroll:true});}else filterFocus?.focus({preventScroll:true});
}
function handleCampaignFilterClick(d){
 if(d.filterOpen){openCampaignFilters(d.filterOpen);return true;}
 if(d.filterClose){closeCampaignFilters();return true;}
 if(d.filterApply){closeCampaignFilters(true);return true;}
 if(d.filterCategory){const y=root.querySelector('.ps-categorytabs')?.scrollLeft||0;if(!['brands','trendyol','newest','discount'].includes(view))view=d.filterCategory==='Tümü'?'campaigns':'category';selectedCategory=d.filterCategory;campaignBrand='Tümü';render();screen.scrollTop=0;const rail=root.querySelector('.ps-categorytabs');if(rail)rail.scrollLeft=y;return true;}
 if(d.filterReset){campaignFilters=emptyCampaignFilters();render();return true;}
 if(!filterOpen)return false;
 if(d.filterGroup){const k=d.filterGroup,v=d.filterValue;if(!Object.hasOwn(filterTitles,k))return true;filterDraft[k]=filterDraft[k].includes(v)?filterDraft[k].filter(x=>x!==v):[...filterDraft[k],v];}
 else if(d.filterClear){filterDraft[d.filterClear]=[];}
 else if(d.filterSort){filterDraft.sort=d.filterSort;}
 else if(d.filterMore){filterAllBrands=!filterAllBrands;}
 else if(d.filterClean){if(filterGroup==='all')filterDraft=emptyCampaignFilters();else if(filterGroup==='sort')filterDraft.sort='discover';else filterDraft[filterGroup]=[];}
 else return false;
 redrawCampaignFilterSheet();return true;
}
root.addEventListener('keydown',e=>{if(!filterOpen)return;if(e.key==='Escape'){e.preventDefault();closeCampaignFilters();return;}if(e.key!=='Tab')return;const buttons=[...root.querySelectorAll('.ps-filterdialog button')],first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&(document.activeElement===first||document.activeElement?.id==='ps-filter-title')){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}});
root.addEventListener('pointerdown',e=>{if(filterOpen&&e.target.closest('.ps-filterdialoghead'))filterDragStart=e.clientY;});
root.addEventListener('pointerup',e=>{if(filterDragStart!==null){const distance=e.clientY-filterDragStart;filterDragStart=null;if(distance>70)closeCampaignFilters();}});
root.addEventListener('pointercancel',()=>{filterDragStart=null;});

let lastLaunchSurface;
function syncLaunchSurface(){
 const visible=!loaded;
 const redHeader=loaded&&(view==='home'
  ? screen.scrollTop<(screen.querySelector('.ps-homeheader')?.offsetHeight??Infinity)
  : ['brands','brand','campaigns','campaignGroup','category','newest','trendyol','discount','favorites','detail','settings','personal','notifications','privacy','terms','deleteAccount'].includes(view));
 const state=visible?'launch':redHeader?'red':'page';
 if(lastLaunchSurface===state)return;
 lastLaunchSurface=state;
 server('ui/launch-state',{visible,redHeader}).catch(()=>{if(lastLaunchSurface===state)lastLaunchSurface=undefined;});
}
screen.addEventListener('scroll',syncLaunchSurface,{passive:true});
function render(){screen.style.overflowY=loaded&&view==='detail'?'hidden':'auto';const loadingNav=root.querySelector('.ps-nav');if(loadingNav)loadingNav.style.display=!loaded?'none':'';if(!loaded){screen.innerHTML=loadError?'<div class="ps-nativeempty" role="alert"><h2>Kampanyalar yüklenemedi</h2><p>Bağlantını kontrol ederek tekrar dene.</p><button data-retry="1">Tekrar dene</button></div>':`<div class="launch-splash"><span class="launch-brand">Prime</span></div>`;syncLaunchSurface();return;}const nav=root.querySelector('.ps-nav');if(nav)nav.style.display=(view==='detail'||settingsViews.includes(view))?'none':'';const detailScroll=view==='detail'&&screen.querySelector('.ps-realdetail')?.dataset.detailId===current?.id?screen.querySelector('.ps-detail-scroll')?.scrollTop:0;screen.innerHTML=view==='home'?home():view==='brands'?brands():view==='brand'?brandpage():view==='category'?categorypage():['newest','trendyol','discount'].includes(view)?campaignBrowsePage(view):view==='detail'?detail():view==='filter'?filter():view==='campaigns'?nativeCampaigns():view==='campaignGroup'?nativeCampaignGroup():view==='favorites'?nativeFavorites():view==='settings'?settingsPage():settingsViews.includes(view)?settingsSubpage():home();root.querySelectorAll('.ps-previewnav [data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===view)));root.querySelectorAll('.ps-nav button').forEach(b=>b.classList.toggle('active',b.dataset.view===(view==='campaignGroup'?'campaigns':view==='detail'?(returnView==='campaignGroup'?'campaigns':returnView):view)));root.querySelectorAll('.ps-nativerail').forEach(rail=>rail.addEventListener('scroll',()=>{const i=Math.round(rail.scrollLeft/Math.max(1,rail.clientWidth));rail.parentElement.querySelectorAll('.ps-nativedots span').forEach((dot,n)=>dot.classList.toggle('current',n===i));},{passive:true}));screen.querySelectorAll('img').forEach(img=>{img.decoding='async';if(!img.closest('.ps-nativehero')&&!img.closest('.ps-carousel.large'))img.loading='lazy';});syncArtworkFrames();if(detailScroll)screen.querySelector('.ps-detail-scroll').scrollTop=detailScroll;if(filterOpen)redrawCampaignFilterSheet();syncLaunchSurface();if(typeof lucide!=='undefined')lucide.createIcons();}
root.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const d=b.dataset;
if(d.searchClear){
 const input=b.closest('.ps-search').querySelector('input');
 input.value='';
 input.dispatchEvent(new Event('input',{bubbles:true}));
 input.focus({preventScroll:true});
 return;
}
if(handleCampaignFilterClick(d))return;
if(d.homeCategories){
 const section=root.querySelector('.ps-categorysection');
 section?.querySelector('h2')?.focus({preventScroll:true});
 section?.scrollIntoView({block:'start'});
 return;
}
if(d.retry){start();return;}if(d.lastdaySlide!==undefined||d.settingsDelete||d.removeSettingsPhoto||d.profilePickPhoto||d.profileSaveName)return;
if(d.codeSlide!==undefined){moveCodeBanner(Number(d.codeSlide));return;}
if(d.copyPreview){copyCurrentCode();return;}
if(d.settingsBack||d.action==='back'){const p=navigation.pop();if(p){restorePage(p);return;}view=view==='settings'?'home':settingsViews.includes(view)?'settings':'home';render();screen.scrollTop=0;return;}
const previous=capturePage();
const route=d.homeProducts||d.newest||d.homeAll||d.view||d.discount||d.campaignGroup||d.brand||d.offer||d.type||d.nativeSearch;
if(route){if(d.view&&['home','brands','campaigns','favorites'].includes(d.view))navigation.length=0;else navigation.push(previous);}
if(d.view){if(d.view==='personal'){profileNameDraft=settingsName;profileMessage='';profileError='';}if(['campaigns','home','brands','trendyol'].includes(d.view)){campaignFilters=emptyCampaignFilters();campaignBrand='Tümü';}if(d.view==='home')categoryScroll=0;if(['brands','trendyol'].includes(d.view))selectedCategory='Tümü';if(d.view==='filter')returnView=view;view=d.view;query='';type='Tümü';}
else if(d.newest){campaignFilters=emptyCampaignFilters();selectedCategory='Tümü';type='Tümü';query='';view='newest';}
else if(d.homeAll||d.homeProducts){
 campaignFilters=emptyCampaignFilters();campaignBrand='Tümü';type='Tümü';query='';view='campaigns';
}
else if(d.discount){discountThreshold=d.discount;campaignFilters=emptyCampaignFilters();selectedCategory='Tümü';campaignBrand='Tümü';type='Tümü';query='';view=d.discount==='all'?'campaigns':'discount';}
else if(d.campaignBrand){campaignBrand=d.campaignBrand;view='campaigns';}
else if(d.campaignGroup){campaignOrigin=['category','newest','trendyol','discount'].includes(view)?view:'campaigns';campaignGroup=d.campaignGroup;view='campaignGroup';}
else if(d.nativeSearch){const input=root.querySelector('#ps-native-query');if(input){navigation.pop();input.focus();return;}view='campaigns';query='';}
else if(d.brand){brand=d.brand;type='Tümü';query='';view='brand';}
else if(d.offer){returnView=view;current=offers.find(o=>o.id===d.offer);if(!current)return;view='detail';revealed=false;copyNotice=false;}
else if(d.closeCopy){closeCopySheet();return;}
else if(d.reveal){revealCode();return;}
else if(d.type){campaignFilters=emptyCampaignFilters();categoryScroll=root.querySelector('.ps-rounds')?.scrollLeft||0;selectedCategory=d.type;type='Tümü';query='';view='category';}
else if(d.like){if(!toggleFavorite(d.like))return;}
else if(d.action==='apply'){view=returnView;}
else if(d.action==='reset'){type='Tümü';query='';view=returnView;}
render();if(route)screen.scrollTop=0;else screen.scrollTop=previous.y;
if(d.homeProducts){
 root.querySelector('[data-filter-open="products"]')?.focus({preventScroll:true});
 openCampaignFilters('products');
}
const categoryStrip=root.querySelector('.ps-rounds');if(categoryStrip)categoryStrip.scrollLeft=categoryScroll;if(d.type){const rail=root.querySelector('.ps-categorytabs'),active=rail?.querySelector('[aria-pressed="true"]');if(rail&&active)rail.scrollLeft=Math.max(0,active.offsetLeft-rail.offsetLeft-parseFloat(getComputedStyle(rail).paddingInlineStart));}
});
function refreshFocusedSearch(){
 const input=document.activeElement;
 if(!input||!screen.contains(input))return false;
 const selectors={'ps-favorites-query':'#ps-favorites-results','ps-native-query':'#ps-native-results','ps-search':'#ps-brand-results'};
 if(!selectors[input.id]||!screen.querySelector(selectors[input.id]))return false;
 input.dispatchEvent(new Event('input',{bubbles:true}));
 return true;
}
root.addEventListener('input',e=>{if(e.target.id==='ps-favorites-query'){favoriteQuery=e.target.value;const results=root.querySelector('#ps-favorites-results');if(results)results.innerHTML=favoritesContent();if(typeof lucide!=='undefined')lucide.createIcons();return;}if(e.target.id==='ps-native-query'&&['campaigns','category','trendyol','newest','discount'].includes(view)){query=e.target.value;const results=root.querySelector('#ps-native-results');if(results)results.innerHTML=campaignFilterResults();syncArtworkFrames();return;}if(e.target.id==='ps-native-query'){query=e.target.value;const results=root.querySelector('#ps-native-results');results.className=query.trim()?'':'ps-nativegrid';results.innerHTML=query.trim()?searchResults():nativeGroups(matchingBrands().filter(n=>campaignBrand==='Tümü'||campaignBrand===n),offers);const filters=root.querySelector('.ps-nativefilters');if(filters)filters.hidden=!!query.trim();syncArtworkFrames();return;}if(e.target.id==='ps-search'){query=e.target.value;const discoveryEl=root.querySelector('#ps-discovery');if(discoveryEl){discoveryEl.innerHTML=discovery();const categories=root.querySelector('.ps-rounds');if(categories)categories.hidden=!!query.trim();}else if(view==='brands'){const content=root.querySelector('#ps-brand-results');if(content)content.innerHTML=brandContent();}syncArtworkFrames();if(typeof lucide!=='undefined')lucide.createIcons();}});

let codeDrag=null;
function codeSliderTravel(thumb){
 return Math.max(1,thumb.parentElement.clientWidth-2*thumb.offsetLeft-thumb.offsetWidth);
}
function moveCodeThumb(thumb,distance){
 thumb.style.transform=`translateX(${distance}px)`;
 thumb.setAttribute('aria-valuenow',String(Math.round(100*distance/codeSliderTravel(thumb))));
}
function resetCodeDrag(){
 if(!codeDrag)return;
 const {thumb,id}=codeDrag;
 codeDrag=null;
 if(thumb.hasPointerCapture(id))thumb.releasePointerCapture(id);
 if(thumb.isConnected)moveCodeThumb(thumb,0);
}
root.addEventListener('pointerdown',e=>{
 if(codeDrag){if(e.pointerType==='touch')resetCodeDrag();return;}
 const thumb=e.target.closest('.ps-code-thumb');
 if(!thumb||!e.isPrimary||e.button!==0||revealBusy)return;
 const bounds=thumb.getBoundingClientRect();
 const x=e.clientX-bounds.left-bounds.width/2,y=e.clientY-bounds.top-bounds.height/2;
 if(Math.hypot(x,y)>bounds.width/2)return;
 e.preventDefault();
 codeDrag={thumb,id:e.pointerId,x:e.clientX,y:e.clientY,distance:0};
 thumb.setPointerCapture(e.pointerId);
});
root.addEventListener('dragstart',e=>{if(e.target.closest('.ps-code-thumb'))e.preventDefault();});
root.addEventListener('pointermove',e=>{
 const drag=codeDrag;
 if(!drag||e.pointerId!==drag.id)return;
 const dx=e.clientX-drag.x,dy=Math.abs(e.clientY-drag.y);
 const slop=6;
 if(!drag.distance&&Math.hypot(dx,dy)<slop)return;
 if(dx<=dy||dx<drag.distance-slop){resetCodeDrag();return;}
 const distance=Math.min(dx,codeSliderTravel(drag.thumb));
 if(distance<=drag.distance)return;
 drag.distance=distance;
 moveCodeThumb(drag.thumb,distance);
});
root.addEventListener('pointerup',e=>{
 const drag=codeDrag;
 if(!drag||e.pointerId!==drag.id)return;
 const threshold=codeSliderTravel(drag.thumb)*.85;
 const completed=drag.thumb.isConnected&&drag.distance>threshold&&e.clientX-drag.x>threshold;
 if(!completed){resetCodeDrag();return;}
 codeDrag=null;
 revealCode().finally(()=>{if(drag.thumb.isConnected)moveCodeThumb(drag.thumb,0);});
});
for(const type of ['pointercancel','lostpointercapture']){
 root.addEventListener(type,e=>{if(e.pointerId===codeDrag?.id)resetCodeDrag();});
}
root.addEventListener('keydown',e=>{
 if(!e.target.matches?.('.ps-code-thumb')||!['ArrowRight','End'].includes(e.key))return;
 e.preventDefault();
 if(!codeDrag&&!e.repeat)revealCode();
});

let copyDrag=null,copySuppressClickUntil=0;
function closeCopySheet(){copyDrag=null;copyNotice=false;render();screen.querySelector('[data-copy-preview]')?.focus();}
function copySheetDismissal(dy,elapsed,height){return dy>=Math.min(80,height*.25)||(dy>24&&dy/Math.max(elapsed,1)>.6);}
root.addEventListener('click',e=>{if(Date.now()<copySuppressClickUntil&&e.target.closest('.ps-copydialog')){e.preventDefault();e.stopImmediatePropagation();return;}if(copyNotice&&e.target.classList.contains('ps-copyoverlay'))closeCopySheet();},true);
root.addEventListener('pointerdown',e=>{if(!copyNotice||e.button!==0)return;const sheet=e.target.closest('.ps-copydialog');if(!sheet)return;if(e.target.closest('a,input,button')&&!e.target.closest('.ps-copyhandle'))return;copyDrag={id:e.pointerId,x:e.clientX,y:e.clientY,time:Date.now(),sheet,dy:0};e.target.setPointerCapture?.(e.pointerId);});
root.addEventListener('pointermove',e=>{if(!copyDrag||e.pointerId!==copyDrag.id)return;const dy=Math.max(0,e.clientY-copyDrag.y);if(Math.abs(e.clientX-copyDrag.x)>dy+12)return;copyDrag.dy=dy;if(dy>6){copyDrag.sheet.classList.add('ps-copydragging');copyDrag.sheet.style.transform=`translateY(${dy}px)`;const overlay=copyDrag.sheet.closest('.ps-copyoverlay');overlay.style.backgroundColor=`rgba(0,0,0,${Math.max(.1,.4-dy/900)})`;if(e.cancelable)e.preventDefault();}},{passive:false});
root.addEventListener('pointerup',e=>{if(!copyDrag||e.pointerId!==copyDrag.id)return;const d=copyDrag;copyDrag=null;if(d.dy>6)copySuppressClickUntil=Date.now()+350;if(copySheetDismissal(d.dy,Date.now()-d.time,d.sheet.offsetHeight)){closeCopySheet();return;}d.sheet.classList.remove('ps-copydragging');d.sheet.style.transform='';d.sheet.closest('.ps-copyoverlay').style.backgroundColor='';});
root.addEventListener('pointercancel',()=>{if(!copyDrag)return;copyDrag.sheet.classList.remove('ps-copydragging');copyDrag.sheet.style.transform='';copyDrag.sheet.closest('.ps-copyoverlay').style.backgroundColor='';copyDrag=null;});
function timedMembership(){return offers.filter(o=>isLastDay(o)).map(o=>o.id).join('|')+'::'+newestOffers().map(o=>o.id).join('|')+'::'+trendyolOffers().map(o=>o.id).join('|');}
let lastDayMembership=timedMembership();
const lastDayRefresh=setInterval(()=>{if(!root.isConnected){clearInterval(lastDayRefresh);return;}if(document.hidden)return;const membership=timedMembership();if(membership===lastDayMembership)return;lastDayMembership=membership;if(view==='home'||view==='category'||view==='newest'||view==='trendyol'||(view==='campaignGroup'&&campaignOrigin==='newest')){const y=screen.scrollTop;if(!refreshFocusedSearch()){render();screen.scrollTop=y;}}},1000);
root.addEventListener('keydown',e=>{const rail=e.target.closest('.ps-nativerail');if(!copyNotice&&rail&&e.target===rail&&['ArrowRight','ArrowLeft'].includes(e.key)){e.preventDefault();rail.scrollBy({left:(e.key==='ArrowRight'?1:-1)*rail.clientWidth,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});return;}if(!copyNotice)return;if(e.key==='Escape'){copyNotice=false;render();screen.querySelector('[data-copy-preview]')?.focus();return;}if(e.key==='Tab'){const all=[...screen.querySelectorAll('.ps-copydialog button,.ps-copydialog a')];const first=all[0],last=all[all.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}});
function failCampaignImage(img,reason){
 const frame=img.closest('.ps-artwork-frame');
 if(frame){frame.dataset.artworkState=reason;img.hidden=true;return;}
 // Non-campaign image failures remain inside their own thumbnail/button.
 img.hidden=true;const parent=img.parentElement;if(!parent||parent.querySelector('.ps-imageerror'))return;
 const fallback=document.createElement('span');fallback.className='ps-imageerror';fallback.setAttribute('role','img');fallback.setAttribute('aria-label',img.alt);fallback.textContent=img.alt;parent.style.position='relative';parent.append(fallback);
}
function inspectCampaignImage(img){
 const slot=img.dataset.validateArtwork;if(!slot)return;
 if(!artworkContract.dimensionsValid(slot,img.naturalWidth,img.naturalHeight)){failCampaignImage(img,'invalid');return;}
 const frame=img.closest('.ps-artwork-frame');if(frame)frame.dataset.artworkState='valid';
}
screen.addEventListener('load',e=>{if(e.target.tagName==='IMG')inspectCampaignImage(e.target);},true);
screen.addEventListener('error',e=>{if(e.target.tagName==='IMG')failCampaignImage(e.target,'unavailable');},true);
root.addEventListener('change',e=>{if(e.target.id==='ps-type')type=e.target.value;});start();if(typeof ResizeObserver!=='undefined'){new ResizeObserver(syncArtworkFrames).observe(screen);}
})();

