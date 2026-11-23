// Exercise real DOM hit targets and responsive geometry, rather than HTML string snapshots.
const {chromium,webkit}=require('playwright'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),vm=require('node:vm');
const ctx={};vm.runInNewContext(fs.readFileSync('ios/ui/artwork-contract.js','utf8'),ctx);const contract=ctx.primeArtworkContract;
const artwork=Object.fromEntries(Object.keys(contract.slots).map(s=>[s,'https://artwork.test/'+s+'.svg']));
const rows=[{id:'valid',productCategories:['supplements'],name:'Solgar',offer:'Test ayrıcalığı',asset:'solgar.png',hasCode:1,channel:'https://example.com',expires:Math.floor(Date.now()/1000)+3600,publishedAt:Math.floor(Date.now()/1000),cardArtwork:artwork},{id:'other',productCategories:['care'],name:'Other',offer:'İkinci kampanya',hasCode:0,cardArtwork:artwork},{id:'legacy',productCategories:['makeup'],name:'Eski format',offer:'Görseli hazırlanıyor',photo:'https://artwork.test/legacy.svg',hasCode:0}];
(async()=>{
 const base=path.resolve('ios/Prime/Resources/Web');
 const server=http.createServer((req,res)=>{const file=path.resolve(base,'.'+req.url.split('?')[0]);if(!file.startsWith(base+path.sep)){res.writeHead(403).end();return;}try{res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':file.endsWith('.woff2')?'font/woff2':'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port+'/index.html';
 let browser;try{
 for(const engine of [chromium,webkit]){
 browser=await engine.launch({headless:true});
 for(const width of [320,390,440,768,1024]){
  const page=await browser.newPage({viewport:{width,height:1000},isMobile:true,hasTouch:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://artwork.test/**',route=>{const slot=path.basename(new URL(route.request().url()).pathname,'.svg'),s=contract.slots[slot]||{width:600,height:1200};route.fulfill({contentType:'image/svg+xml',body:`<svg xmlns="http://www.w3.org/2000/svg" width="${s.width}" height="${s.height}"><rect width="100%" height="100%" fill="#dce9dd"/><rect x="6%" y="6%" width="88%" height="88%" fill="none" stroke="#154e2b" stroke-width="3"/><text x="10%" y="20%" font-size="30">${slot}</text></svg>`});});
  await page.addInitScript(rows=>{window.webkit={messageHandlers:{primeAPI:{postMessage:async({path})=>({status:200,data:path==='campaigns'?{campaigns:rows}:path==='reveal'?{code:'TEST'}:{authorized:true,ok:true}})}}};},rows);
  await page.goto(url);await page.getByRole('button',{name:'Ana Sayfa',exact:true}).waitFor();await page.locator('.ps-poster.large').first().waitFor();
  await page.waitForFunction(()=>[...document.querySelectorAll('.ps-poster.large img')].every(i=>i.complete&&i.naturalWidth));
  const outfit=await page.evaluate(async()=>{
   const faces=await document.fonts.load('700 13px Outfit','İıŞşĞğÇçÖöÜü');
   await document.fonts.ready;
   const family=selector=>getComputedStyle(document.querySelector(selector)).fontFamily.split(',')[0].replaceAll('"','');
   return {loaded:faces.some(face=>face.family==='Outfit'&&face.status==='loaded'),
    controls:['.ps-homebrand span','.ps-homequick button','.ps-nav button','.ps-sectionheading h2'].map(family)};
  });
  assert.deepEqual(outfit,{loaded:true,controls:['Outfit','Outfit','Outfit','Outfit']});
  const homeHeader=page.locator('.ps-homeheader');
  assert.equal(await homeHeader.evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(255, 49, 49)');
  const shortcuts=homeHeader.locator('.ps-homequick button');
  assert.deepEqual(await shortcuts.allTextContents(),['Kampanya kategorileri','Ürün kategorileri','Tüm markalar']);
  assert.equal(await homeHeader.locator('input,img').count(),0);
  assert.equal(await page.locator('.ps-productrail').count(),0);
  const shortcutLayout=await shortcuts.evaluateAll(nodes=>nodes.map(el=>({
   top:el.getBoundingClientRect().top,height:el.getBoundingClientRect().height,
   icon:el.querySelector('svg').getAttribute('class'),color:getComputedStyle(el).color,overflow:el.scrollWidth-el.clientWidth
  })));
  assert.equal(new Set(shortcutLayout.map(b=>b.icon)).size,3);
  assert(shortcutLayout.every(b=>b.top===shortcutLayout[0].top&&b.height===shortcutLayout[0].height&&b.color==='rgb(255, 255, 255)'&&b.overflow<=1));
  if(width===320){
   await shortcuts.nth(0).tap();
   assert(await page.locator('#ps-screen').evaluate(el=>el.scrollTop>0));
   await page.locator('#ps-screen').evaluate(el=>el.scrollTop=0);
   await shortcuts.nth(1).tap();
   const products=page.getByRole('dialog');
   assert.equal(await products.locator('h2').innerText(),'Ürün Kategorisi');
   await products.getByRole('button',{name:'Makyaj ve Kozmetik',exact:true}).tap();
   await products.locator('[data-filter-apply]').tap();
   await page.locator('#ps-native-results [data-offer="legacy"]').waitFor();
   assert.equal(await page.locator('#ps-native-results [data-offer]').count(),1);
   await page.getByRole('button',{name:'Geri',exact:true}).tap();
   await shortcuts.nth(2).tap();
   await page.locator('.ps-brandspage').waitFor();
   await page.getByRole('button',{name:'Geri',exact:true}).tap();
   await homeHeader.locator('.ps-homehero').tap();
   await page.locator('#ps-native-results').waitFor();
   await page.getByRole('button',{name:'Geri',exact:true}).tap();
  }
  const circleGap=await page.locator('.ps-brandrounds button>b').evaluateAll(nodes=>{const a=nodes[0].getBoundingClientRect(),b=nodes[1].getBoundingClientRect();return b.left-a.right;});
  assert(Math.abs(circleGap-12)<.5,'Visible brand-circle gap must be halved from 24px to 12px');
  // Category artwork is a four-column square grid after the brand campaign carousel.
  const grid=page.locator('.ps-categorygrid');assert.equal(await grid.locator('button').count(),12);
  const layout=await grid.evaluate(el=>{const cards=[...el.querySelectorAll('button>b')].map(n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};});const tiles=[...el.querySelectorAll('button')].map(n=>{const r=n.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};});const section=el.closest('.ps-categorysection'),brand=document.querySelector('.ps-brandcampaigns');return {cards,tiles,columns:getComputedStyle(el).gridTemplateColumns.split(' ').length,after:!!(brand.compareDocumentPosition(section)&Node.DOCUMENT_POSITION_FOLLOWING)};});
  assert.equal(layout.columns,4);assert(layout.after);
  for(const [i,tile] of layout.tiles.entries()){
   if(i%4)assert(Math.abs(tile.left-layout.tiles[i-1].right-12)<.5,'Category columns share a 12px gap');
   if(i>=4)assert(Math.abs(tile.top-layout.tiles[i-4].bottom-12)<.5,'Category rows share the same 12px gap');
  }
  assert.equal(await grid.locator('button>b').first().evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(255, 222, 222)');
  for(const card of layout.cards)assert(Math.abs(card.w-card.h)<.5,'Category image must remain square');
  assert.equal(new Set(layout.cards.map(c=>Math.round(c.y))).size,3);
  const atlas=await page.evaluate(()=>new Promise(resolve=>{const i=new Image();i.onload=()=>resolve([i.naturalWidth,i.naturalHeight]);i.onerror=()=>resolve(null);i.src='assets/category-prime-light-red.webp';}));
  assert.deepEqual(atlas,[1024,768]);
  async function geometry(selector){return page.locator(selector).evaluateAll(nodes=>nodes.map(el=>{const f=el.querySelector('.ps-artwork-frame'),i=f?.querySelector('img'),a=el.getBoundingClientRect(),b=f?.getBoundingClientRect();return {outerWidth:a.width,slot:f?.dataset.artworkSlot,w:b?.width,h:b?.height,left:b?.left-a.left,right:a.right-b?.right,top:b?.top-a.top,bottom:a.bottom-b?.bottom,fit:i&&getComputedStyle(i).objectFit,state:f?.dataset.artworkState};}));}
  for(const selector of ['.ps-poster.large','.ps-poster.small','.ps-codebanner']){
   for(const g of await geometry(selector)){if(selector==='.ps-poster.large')assert(g.outerWidth<=contract.maxLargeWidth+.1);if(selector==='.ps-poster.small')assert(g.outerWidth<=contract.maxCompactWidth+.1);const s=contract.slots[g.slot];assert(Math.abs(g.w/g.h-s.width/s.height)<.002,JSON.stringify({width,selector,g}));for(const edge of ['left','right','top','bottom'])assert(Math.abs(g[edge]-contract.inset)<.2,JSON.stringify({width,selector,g}));assert.equal(g.fit,'contain');}
  }
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Page overflows horizontally');
  // Compare the real computed styles across page and section headers.
  const sectionStyle=await page.locator('.ps-brandcampaigns h2').evaluate(el=>{const s=getComputedStyle(el);return [s.fontFamily,s.fontSize,s.fontWeight,s.color,s.letterSpacing]});
  async function headerStyle(selector,red=false){
   const result=await page.locator(selector).evaluate(el=>{const s=getComputedStyle(el),h=el.parentElement,b=h.querySelector('[data-action="back"]'),r=b.getBoundingClientRect(),svg=b.querySelector('svg'),v=getComputedStyle(svg);return {title:[s.fontFamily,s.fontSize,s.fontWeight,s.color,s.letterSpacing],background:getComputedStyle(h).backgroundColor,back:getComputedStyle(b).color,w:r.width,h:r.height,icon:[v.width,v.height,v.strokeWidth]};});
   const ink=red?'rgb(255, 255, 255)':sectionStyle[3];
   assert.deepEqual(result.title,sectionStyle.map((value,index)=>index===3?ink:value));assert.equal(result.background,red?'rgb(255, 49, 49)':'rgb(247, 247, 248)');assert.equal(result.back,ink);assert(result.w>=44&&result.h>=44);assert.deepEqual(result.icon,['22px','22px','1.8px']);
  }
  await page.locator('[data-type="Kargo Avantajı"]').tap();await page.locator('.ps-categorytabs [aria-pressed="true"]').filter({hasText:'Kargo Avantajı'}).waitFor();
  await page.getByRole('button',{name:'Geri',exact:true}).tap();
  await page.locator('[data-newest="1"]').tap();await headerStyle('.ps-back>span:first-of-type');assert.equal(await page.locator('.ps-newestpage h2').innerText(),'En Yeniler');
  await page.getByRole('button',{name:'Geri',exact:true}).tap();
  async function checkSearchStyle(){
   const metrics=await page.locator('.ps-search').evaluate(el=>{
    const css=getComputedStyle(el),box=el.getBoundingClientRect();
    const field=el.querySelector('input'),input=field.getBoundingClientRect();
    return {background:css.backgroundColor,border:css.borderTopColor,radius:css.borderTopLeftRadius,
     fontSize:getComputedStyle(field).fontSize,placeholderSize:getComputedStyle(field,'::placeholder').fontSize,
     height:box.height,centerOffset:Math.abs((box.top+box.bottom-input.top-input.bottom)/2)};
   });
   assert.deepEqual(metrics,{background:'rgb(255, 250, 250)',border:'rgb(255, 255, 255)',radius:'20px',fontSize:'16px',placeholderSize:'16px',height:38,centerOffset:0});
  }
  // All three tab headers keep one usable search field and a 44px back target.
  const browseHeadingMetrics=[];
  for(const name of ['Markalar','Kampanyalar','Favoriler']){
   await page.getByRole('button',{name,exact:true}).tap();
   const header=page.locator('.ps-pagesearchheader');
   await checkSearchStyle();
   const searchColors=await header.locator('.ps-search').evaluate(el=>[
    getComputedStyle(el.querySelector('svg')).color,
    getComputedStyle(el.querySelector('.ps-searchhint')).color,
   ]);
   assert.equal(searchColors[0],searchColors[1]);
   assert.equal(await header.locator('.ps-searchhint').textContent(),'Prime içinde ara');
   assert.equal(await header.locator('..').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(255, 49, 49)');
   assert.equal(await header.locator('input').count(),1);
   assert.equal(await header.locator('button:visible').count(),1);
   const bounds=await header.evaluate(el=>{const b=el.querySelector('button').getBoundingClientRect(),s=el.querySelector('.ps-search').getBoundingClientRect();return {backWidth:b.width,backHeight:b.height,left:s.left,right:s.right,top:s.top,backTop:b.top,width:innerWidth};});
   assert(bounds.backWidth>=44&&bounds.backHeight>=44);
   assert(bounds.right<=bounds.width&&bounds.left>=0);
   if(name!=='Favoriler'){
    browseHeadingMetrics.push(await page.locator('.ps-filterresulthead').evaluate(el=>{const h=el.querySelector('h2'),p=el.querySelector('p'),main=el.closest('main'),tools=document.querySelector('.ps-browseheader'),next=el.nextElementSibling,hs=getComputedStyle(h),ps=getComputedStyle(p),r=el.getBoundingClientRect(),hr=h.getBoundingClientRect(),pr=p.getBoundingClientRect();return {topGap:r.top-tools.getBoundingClientRect().bottom,bottomGap:next.getBoundingClientRect().top-r.bottom,left:r.left,right:innerWidth-r.right,title:[hr.top-r.top,hr.height,hs.fontSize,hs.fontWeight,hs.color],count:[pr.top-hr.bottom,pr.height,ps.fontSize,ps.color],padding:getComputedStyle(main).padding};}));
    const resultTitle=await page.locator('.ps-filterresulthead h2').evaluate(el=>{const s=getComputedStyle(el);return [s.fontFamily,s.fontSize,s.fontWeight,s.color,s.letterSpacing]});
    assert.deepEqual(resultTitle,sectionStyle);
    assert.equal(await page.locator('[data-filter-open="sort"]').count(),1);
    const searchSpacing=await header.evaluate(el=>{
     const h=el.getBoundingClientRect(),b=el.querySelector('button').getBoundingClientRect(),s=el.querySelector('.ps-search').getBoundingClientRect();
     return [b.left-h.left,s.left-b.right,h.right-s.right,s.top-h.top,h.bottom-s.bottom];
    });
    assert.deepEqual(searchSpacing,[14,14,14,14,14]);
    assert.equal(await header.locator('.ps-searchhint strong').evaluate(el=>getComputedStyle(el).color),'rgb(255, 49, 49)');
    const railSpacing=await page.locator('.ps-discoverytools').evaluate(el=>{
     const row=el.querySelector('.ps-quickfilters'),quick=el.querySelector('.ps-quickrail'),category=el.querySelector('.ps-categorytabs');
     const first=quick.firstElementChild.getBoundingClientRect(),icon=row.firstElementChild.getBoundingClientRect();
     return [getComputedStyle(category).gap,getComputedStyle(row).gap,getComputedStyle(quick).gap,first.left-icon.right,getComputedStyle(category).paddingInlineStart,getComputedStyle(row).paddingInlineStart];
    });
    assert.deepEqual(railSpacing,['8px','8px','8px',8,'14px','14px']);
    assert.deepEqual(await page.locator('.ps-allfilters').evaluate(el=>{const s=getComputedStyle(el);return [s.color,s.borderTopColor];}),['rgb(80, 80, 90)','rgb(237, 237, 239)']);
    const activeTab=page.locator('.ps-categorytabs button[aria-pressed="true"]');
    assert.deepEqual(await activeTab.evaluate(el=>{const s=getComputedStyle(el);return [s.color,s.backgroundColor,s.borderTopLeftRadius];}),['rgb(255, 49, 49)','rgb(255, 250, 250)','11px']);
    assert.deepEqual(await page.locator('.ps-quickrail button').first().evaluate(el=>{const s=getComputedStyle(el);return [s.color,s.borderTopColor,s.backgroundColor,s.fontWeight];}),['rgb(80, 80, 90)','rgb(237, 237, 239)','rgb(255, 255, 255)','400']);
    const stripStyle=await page.locator('.ps-quickfilters').evaluate(el=>{
     const css=getComputedStyle(el),results=el.closest('.ps-browseheader').nextElementSibling;
     return [parseFloat(css.paddingInlineStart),css.backgroundColor,css.borderBottomWidth,getComputedStyle(results).backgroundColor,
       results.getBoundingClientRect().top-el.getBoundingClientRect().bottom];
    });
    assert.deepEqual(stripStyle,[14,'rgb(247, 247, 248)','0px','rgb(247, 247, 248)',0]);
    assert.equal(await page.locator('.ps-quickrail button svg,.ps-sortcontrol svg').count(),0);
    const quick=page.locator('.ps-quickrail button').first(),quickBounds=await quick.boundingBox();
    await page.mouse.move(quickBounds.x+quickBounds.width/2,quickBounds.y+quickBounds.height/2);
    await page.mouse.down();
    assert.equal(await quick.evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(255, 255, 255)','Touch-down on a filter must retain the unselected color');
    await page.mouse.move(quickBounds.x+quickBounds.width/2,quickBounds.y-8);
    await page.mouse.up();
    if(width===390){fs.mkdirSync('ci-artifacts/artwork',{recursive:true});await page.screenshot({path:'ci-artifacts/artwork/browse-'+name+'-'+engine.name()+'.png'});}
   }
   if(name==='Kampanyalar'){
    const input=header.getByRole('textbox');await input.fill('Test ayrıcalığı');
    assert.equal(await page.locator('#ps-native-results [data-offer="valid"]').count(),1);
    assert.equal(await header.locator('.ps-searchhint').isVisible(),false);
    await header.getByRole('button',{name:'Aramayı temizle'}).tap();
    assert.equal(await input.inputValue(),'');
    assert.equal(await header.locator('.ps-searchhint').isVisible(),true);
    assert.equal(await header.getByRole('button',{name:'Aramayı temizle'}).count(),0);
   }
  }
  assert.deepEqual(browseHeadingMetrics[0],browseHeadingMetrics[1],'Brands and campaigns must share all heading/count spacing and styles');
  // Approved full-height panel: independent rails, draft multi-select and dismissal.
  await page.getByRole('button',{name:'Kampanyalar',exact:true}).tap();
  const iconFilter=page.locator('[data-filter-open="all"]');
  const before=await iconFilter.boundingBox();
  await page.locator('.ps-quickrail').evaluate(el=>el.scrollLeft=el.scrollWidth);
  const after=await iconFilter.boundingBox();assert.equal(before.x,after.x,'All-filter button must stay pinned');
  await iconFilter.tap();
  const dialog=page.getByRole('dialog');await dialog.waitFor();assert.equal(await dialog.locator('.ps-filterclose .lucide-x').count(),1);
  assert.equal(await dialog.locator('.ps-filterhandle').count(),0);
  const closeInsets=await dialog.locator('.ps-filterclose').evaluate(button=>{
   const b=button.getBoundingClientRect(), h=button.parentElement.getBoundingClientRect();
   return [b.top-h.top,h.right-b.right,h.bottom-b.bottom];
  });
  assert.deepEqual(closeInsets,[14,14,14]);
  const bounds=await dialog.boundingBox();assert(bounds.y<=1&&Math.abs(bounds.height-1000)<2,'Sheet must cover entire web viewport below native status bar');
  assert(await page.locator('#ps-screen').evaluate(el=>el.inert));
  assert.equal(await dialog.locator('.ps-filterdialoghead').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(255, 49, 49)');
  assert.equal(await dialog.locator('.ps-filterchips').first().evaluate(el=>getComputedStyle(el).gap),'8px');
  // All sheet filter families share compact, centered controls with a persistent gray border.
  const filterMetrics=await dialog.locator('.ps-filterchips button').evaluateAll(nodes=>nodes.map(el=>{
   const s=getComputedStyle(el),r=el.getBoundingClientRect();
   return {label:el.textContent,color:s.color,background:s.backgroundColor,border:s.borderTopColor,weight:s.fontWeight,selected:el.getAttribute('aria-pressed')==='true',align:s.alignItems,justify:s.justifyContent,textAlign:s.textAlign,
    top:s.paddingTop,bottom:s.paddingBottom,left:s.paddingLeft,right:s.paddingRight,minHeight:s.minHeight,
    height:r.height,overflow:el.scrollWidth-el.clientWidth};
  }));
  assert(filterMetrics.length>20,'Exercise all filter groups, not just the quick toolbar');
  for(const m of filterMetrics){
   assert.equal(m.color,m.selected?'rgb(255, 255, 255)':'rgb(80, 80, 90)',m.label);
   assert.equal(m.background,m.selected?'rgb(255, 49, 49)':'rgb(255, 255, 255)',m.label);
   assert.equal(m.border,'rgb(237, 237, 239)',m.label);
   assert.equal(m.weight,'400',m.label);
   assert.equal(m.align,'center',m.label);assert.equal(m.justify,'center',m.label);assert.equal(m.textAlign,'center',m.label);
   assert.equal(m.top,m.bottom,m.label);assert.equal(m.left,m.right,m.label);
   assert.equal(m.minHeight,'36px',m.label);assert(m.height>=36&&m.overflow<=1,'Clipped filter: '+m.label);
  }

  await page.locator('[data-filter-group="brands"][data-filter-value="Solgar"]').tap();
  await page.locator('[data-filter-group="brands"][data-filter-value="Other"]').tap();
  assert.equal(await dialog.locator('[data-filter-group="brands"][aria-pressed="true"]').count(),2);
  await page.locator('[data-filter-group="rates"][data-filter-value="10"]').tap();
  await page.locator('[data-filter-group="rates"][data-filter-value="25"]').tap();
  assert.equal(await dialog.locator('[data-filter-group="rates"][aria-pressed="true"]').count(),2);
  await page.getByRole('button',{name:'Kapat',exact:true}).tap();
  assert.equal(await page.locator('.ps-allfilters>span').count(),0,'Dismiss must discard draft');
  await iconFilter.tap();
  await page.locator('[data-filter-group="brands"][data-filter-value="Solgar"]').tap();
  await page.locator('[data-filter-apply]').tap();
  assert.deepEqual(await page.locator('.ps-quickrail button[data-filter-open="brands"]').evaluate(el=>{const s=getComputedStyle(el);return [s.color,s.borderTopColor,s.backgroundColor,s.fontWeight];}),['rgb(255, 255, 255)','rgb(237, 237, 239)','rgb(255, 49, 49)','400']);
  assert.equal(await page.locator('#ps-native-results [data-offer="valid"]').count(),1);
  assert.equal(await page.locator('#ps-native-results [data-offer="other"]').count(),0);
  await iconFilter.tap();
  assert.equal(await dialog.locator('[data-filter-group="brands"][aria-pressed="true"]').count(),1);
  if(width===390){fs.mkdirSync('ci-artifacts/artwork',{recursive:true});await page.screenshot({path:'ci-artifacts/artwork/filters-'+engine.name()+'.png'});}
  await page.locator('[data-filter-clean]').tap();await page.locator('[data-filter-apply]').tap();
  assert.equal(await page.locator('.ps-allfilters>span').count(),0);
  await page.locator('[data-filter-open="rates"]').tap();
  const clearStyle=el=>{
   const css=getComputedStyle(el);
   return [css.backgroundColor,css.borderColor,css.borderRadius,css.color,css.fontSize,css.fontWeight,css.minHeight];
  };
  const panelClearStyle=await dialog.locator('[data-filter-clean]').evaluate(clearStyle);
  await dialog.locator('[data-filter-value="50"]').tap();
  await dialog.locator('[data-filter-apply]').tap();
  const emptyReset=page.locator('[data-filter-reset]');
  assert.deepEqual(await emptyReset.evaluate(clearStyle),panelClearStyle);
  await emptyReset.tap();
  assert.equal(await page.locator('.ps-allfilters>span').count(),0);
  await page.locator('[data-filter-open="sort"]').tap();
  assert.equal(await dialog.locator('#ps-filter-title').innerText(),'Sırala');
  assert.deepEqual(await dialog.locator('.ps-filterbody>section').evaluateAll(nodes=>nodes.map(n=>n.id)),['ps-filter-sort']);
  await dialog.locator('[data-filter-sort="newest"]').tap();await dialog.locator('[data-filter-apply]').tap();
  assert.equal(await page.locator('[data-filter-open="sort"]').getAttribute('aria-label'),'Sırala: En yeniler');
  assert.equal(await page.locator('#ps-native-results [data-offer]').first().getAttribute('data-offer'),'valid');
  await page.locator('[data-filter-open="sort"]').tap();await dialog.locator('[data-filter-clean]').tap();await dialog.locator('[data-filter-apply]').tap();
  assert.equal(await page.locator('[data-filter-open="sort"]').getAttribute('aria-label'),'Sırala: Keşfet');
  for(const group of ['products','brands','rates','published','ending','codes','saved']){
   await page.locator('[data-filter-open="'+group+'"]').tap();
   assert.deepEqual(await dialog.locator('.ps-filterbody>section').evaluateAll(nodes=>nodes.map(n=>n.id)),['ps-filter-'+group]);
   if(group==='products'){
    assert.equal(await dialog.locator('#ps-filter-title').innerText(),'Ürün Kategorisi');
    for(const label of ['Tümü','Gıda Takviyeleri','Dermokozmetik ve Kişisel Bakım','Sporcu Beslenmesi','Makyaj ve Kozmetik'])assert(await dialog.getByRole('button',{name:label,exact:true}).isVisible());
    await dialog.locator('[data-filter-value="supplements"]').tap();await dialog.locator('[data-filter-value="care"]').tap();
    assert.equal(await dialog.locator('[data-filter-group][aria-pressed="true"]').count(),2);
   }
   if(group==='rates'){
    await dialog.locator('[data-filter-value="10"]').tap();await dialog.locator('[data-filter-value="25"]').tap();
    assert.equal(await dialog.locator('[data-filter-group][aria-pressed="true"]').count(),2);
   }
   await page.getByRole('button',{name:'Kapat',exact:true}).tap();
  }
  await page.locator('[data-filter-open="brands"]').tap();
  await dialog.locator('[data-filter-value="Solgar"]').tap();await dialog.locator('[data-filter-apply]').tap();
  await page.locator('[data-filter-open="codes"]').tap();
  await dialog.locator('[data-filter-value="yes"]').tap();await dialog.locator('[data-filter-clean]').tap();await dialog.locator('[data-filter-apply]').tap();
  await iconFilter.tap();
  assert.equal(await dialog.locator('[data-filter-group="brands"][aria-pressed="true"]').count(),1,'Facet reset must preserve other selections');
  assert.equal(await dialog.locator('#ps-filter-sort').count(),1,'Sorting remains in all filters');
  await dialog.locator('[data-filter-sort="newest"]').tap();
  assert.equal(await dialog.locator('[data-filter-sort="newest"]').getAttribute('aria-pressed'),'true');
  await dialog.locator('[data-filter-clean]').tap();await dialog.locator('[data-filter-apply]').tap();
  await page.getByRole('button',{name:'Geri',exact:true}).tap();
  await page.getByRole('button',{name:'Ana Sayfa',exact:true}).tap();
  await page.locator('.ps-poster.large').first().waitFor();
  // Profile changes survive navigation/relaunch; a wide source image stays within its circle.
  await page.getByRole('button',{name:'Profili aç',exact:true}).tap();
  await headerStyle('.ps-profilebar>strong',true);
  assert.equal(await page.locator('.ps-profilebar input,.ps-profilebar [data-search]').count(),0);
  await page.getByRole('button',{name:'Profili düzenle',exact:true}).tap();
  await headerStyle('.ps-profilebar>strong',true);
  await page.getByRole('textbox',{name:'Profil adı',exact:true}).fill('Test Kullanıcısı');
  await page.getByRole('button',{name:'İsmi kaydet',exact:true}).tap();
  const source=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=1800;c.height=900;const x=c.getContext('2d');x.fillStyle='#a51d32';x.fillRect(0,0,1800,900);x.fillStyle='#dedede';x.fillRect(600,100,600,700);return c.toDataURL('image/png').split(',')[1];});
  await page.locator('#ps-settings-photo').setInputFiles({name:'wide-profile.png',mimeType:'image/png',buffer:Buffer.from(source,'base64')});
  await page.getByText('Fotoğraf kaydedildi.',{exact:true}).waitFor();
  const avatar=await page.locator('.ps-profileavatar').evaluate(async el=>{const i=el.querySelector('img');await i.decode();const a=el.getBoundingClientRect(),b=i.getBoundingClientRect();return {natural:[i.naturalWidth,i.naturalHeight],frame:[a.width,a.height],image:[b.width,b.height],overflow:getComputedStyle(el).overflow,fit:getComputedStyle(i).objectFit,inside:b.left>=a.left&&b.right<=a.right&&b.top>=a.top&&b.bottom<=a.bottom};});
  assert.deepEqual(avatar.natural,[512,512]);assert.deepEqual(avatar.frame,[96,96]);assert.equal(avatar.overflow,'hidden');assert.equal(avatar.fit,'cover');assert(avatar.inside);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  if(width===390){fs.mkdirSync('ci-artifacts/artwork',{recursive:true});await page.screenshot({path:'ci-artifacts/artwork/profile-'+engine.name()+'.png'});}
  await page.getByRole('button',{name:'Geri',exact:true}).tap();
  assert.equal(await page.locator('.ps-profilecopy strong').innerText(),'Test Kullanıcısı');
  await page.reload();await page.getByRole('button',{name:'Profili aç',exact:true}).tap();
  assert.equal(await page.locator('.ps-profilecopy strong').innerText(),'Test Kullanıcısı');assert.equal(await page.locator('.ps-profileavatar img').count(),1);
  await page.getByRole('button',{name:'Profili düzenle',exact:true}).tap();await page.getByRole('button',{name:'Fotoğrafı kaldır',exact:true}).tap();
  assert.equal(await page.locator('.ps-profileavatar img').count(),0);assert.equal(await page.getByRole('textbox',{name:'Profil adı',exact:true}).inputValue(),'Test Kullanıcısı');
  await page.getByRole('button',{name:'Geri',exact:true}).tap();await page.getByRole('button',{name:'Geri',exact:true}).tap();
  // Invalid bytes must be bounded to one frame and remain an accessible offer.
  const broken=page.locator('.ps-poster.large').first();await broken.locator('img').evaluate(i=>{i.loading='eager';i.src='https://artwork.test/legacy.svg';});
  await page.waitForFunction(()=>document.querySelector('.ps-poster.large .ps-artwork-frame').dataset.artworkState==='invalid');
  assert(await broken.locator('.ps-artworkfallback').isVisible());

  async function checkDetailLayout(){
   const layout=await page.locator('.ps-realdetail').evaluate(el=>{
    const scroll=el.querySelector('.ps-detail-scroll'),art=el.querySelector('.ps-nativehero');
    const contents=el.querySelector('.ps-detailsheet'),footer=el.querySelector('.ps-slidefooter');
    return {gap:contents.getBoundingClientRect().top-art.getBoundingClientRect().bottom,
     boundary:footer.getBoundingClientRect().top-scroll.getBoundingClientRect().bottom,
     nestedOverflow:getComputedStyle(contents.querySelector('.ps-sheetbody')).overflowY};
   });
   assert.deepEqual(layout,{gap:12,boundary:0,nestedOverflow:'visible'});
  }
  // Clicking the nested title must open detail from a brand list AND search list.
  await page.getByRole('button',{name:'Markalar',exact:true}).tap();await page.getByRole('button',{name:'Solgar kampanyalarını aç',exact:true}).tap();
  await headerStyle('.ps-brandcampaign-header strong',true);
  assert.equal(await page.locator('.ps-brandcampaign-page h2').innerText(),'Solgar');
  assert.equal(await page.locator('.ps-brandcampaign-page [role="status"]').innerText(),'1 kampanya');
  await page.getByRole('button',{name:'Solgar: Test ayrıcalığı',exact:true}).locator('.ps-artwork-frame').tap();
  await page.getByText('Prime Ayrıcalıkları',{exact:true}).waitFor();
  await headerStyle('.ps-detailtop>strong',true);
  if(width===390){
   const track=page.locator('.ps-realtrack'),thumb=track.getByRole('slider');
   assert.equal(await track.locator('input').count(),0,'Track must not expose a native range hit target');
   const rail=await track.boundingBox(),start=await thumb.boundingBox();
   const x=start.x+start.width/2,y=start.y+start.height/2;
   const end=rail.x+rail.width-14;
   const value=()=>thumb.getAttribute('aria-valuenow');
   async function assertAtStart(message){
    assert.equal(await value(),'0',message);
    assert.equal((await thumb.boundingBox()).x,start.x,message);
   }
   for(const tapX of [rail.x+rail.width*.45,rail.x+rail.width*.95,x,x]){
    await page.touchscreen.tap(tapX,y);
    await assertAtStart('Touching the track, thumb or arrow must not move the thumb');
   }
   for(const origin of [[rail.x+rail.width*.45,y],[start.x+1,start.y+1]]){
    await page.mouse.move(...origin);
    await page.mouse.down();
    await page.mouse.move(end,origin[1],{steps:8});
    await assertAtStart('Only an origin inside the white circle may move the thumb');
    await page.mouse.up();
   }
   for(const origin of [[x-15,y],[x,y+20]]){
    await page.mouse.move(x,y);
    await page.mouse.down();
    await page.mouse.move(...origin,{steps:4});
    await page.mouse.move(end,y,{steps:8});
    await assertAtStart('A drag that starts leftward or vertically is ignored until release');
    await page.mouse.up();
   }
   await page.mouse.move(x,y);
   await page.mouse.down();
   await page.mouse.move(x+3,y);
   await assertAtStart('Touch jitter must not move the thumb');
   await page.mouse.move(x+70,y,{steps:6});
   assert(Number(await value())>0,'The thumb follows a rightward drag');
   assert((await thumb.boundingBox()).x>start.x);
   await page.mouse.up();
   await assertAtStart('Releasing an incomplete drag returns the thumb to the start');
   await page.mouse.move(x,y);
   await page.mouse.down();
   await page.mouse.move(end,y,{steps:10});
   assert(await thumb.isVisible(),'Holding at the end must wait for release');
   await page.mouse.up();
   await page.locator('.ps-realcodereveal strong').filter({hasText:/^TEST$/}).waitFor();
  }
  for(const g of await geometry('.ps-nativehero'))assert(Math.abs(g.w/g.h-1.5)<.002);await checkDetailLayout();
  await page.getByRole('button',{name:'Geri',exact:true}).tap();await page.getByRole('button',{name:'Ana Sayfa',exact:true}).tap();
  await page.getByRole('button',{name:'Kampanyalar',exact:true}).tap();
  await page.getByRole('textbox',{name:'Marka veya kampanya ara'}).fill('Test ayrıcalığı');
  assert.equal(await page.locator('#ps-native-results .ps-nativelist button').count(),1);
  await page.locator('#ps-native-results .ps-nativelist strong').tap();await page.getByText('Prime Ayrıcalıkları',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Geri',exact:true}).tap();
  await page.getByRole('textbox',{name:'Marka veya kampanya ara'}).fill('Eski format');
  await page.locator('#ps-native-results .ps-nativelist strong').tap();
  await page.getByText('Prime Ayrıcalıkları',{exact:true}).waitFor();
  await checkDetailLayout();
  await page.getByRole('link',{name:'Kampanya sayfasına git',exact:true}).waitFor();
  assert.equal(await page.locator('.ps-nativehero img').count(),0,'Legacy portrait must never enter the detail slot');
  await page.getByRole('button',{name:'Ana Sayfa',exact:true}).count();
  if(width===390){fs.mkdirSync('ci-artifacts/artwork',{recursive:true});await page.screenshot({path:'ci-artifacts/artwork/legacy-accessible.png'});}
  assert.deepEqual(errors,[],JSON.stringify({width,errors}));await page.close();console.log('PASS: '+engine.name()+' nested clicks and six-format geometry at '+width+'px');
 }
 await browser.close();browser=null;
 }
 }finally{await browser?.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

