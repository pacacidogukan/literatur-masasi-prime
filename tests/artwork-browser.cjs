// Exercise real DOM hit targets and responsive geometry, rather than HTML string snapshots.
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),vm=require('node:vm');
const ctx={};vm.runInNewContext(fs.readFileSync('ios/ui/artwork-contract.js','utf8'),ctx);const contract=ctx.primeArtworkContract;
const artwork=Object.fromEntries(Object.keys(contract.slots).map(s=>[s,'https://artwork.test/'+s+'.svg']));
const rows=[{id:'valid',name:'Solgar',offer:'Test ayrıcalığı',asset:'solgar.png',hasCode:1,channel:'https://example.com',expires:Math.floor(Date.now()/1000)+3600,publishedAt:Math.floor(Date.now()/1000),cardArtwork:artwork},{id:'other',name:'Other',offer:'İkinci kampanya',hasCode:0,cardArtwork:artwork},{id:'legacy',name:'Eski format',offer:'Görseli hazırlanıyor',photo:'https://artwork.test/legacy.svg',hasCode:0}];
(async()=>{
 const base=path.resolve('ios/Prime/Resources/Web');
 const server=http.createServer((req,res)=>{const file=path.resolve(base,'.'+req.url.split('?')[0]);if(!file.startsWith(base+path.sep)){res.writeHead(403).end();return;}try{res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port+'/index.html';
 let browser;try{
 browser=await chromium.launch({headless:true});
 for(const width of [320,390,440,768,1024]){
  const page=await browser.newPage({viewport:{width,height:1000},isMobile:true,hasTouch:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://artwork.test/**',route=>{const slot=path.basename(new URL(route.request().url()).pathname,'.svg'),s=contract.slots[slot]||{width:600,height:1200};route.fulfill({contentType:'image/svg+xml',body:`<svg xmlns="http://www.w3.org/2000/svg" width="${s.width}" height="${s.height}"><rect width="100%" height="100%" fill="#dce9dd"/><rect x="6%" y="6%" width="88%" height="88%" fill="none" stroke="#154e2b" stroke-width="3"/><text x="10%" y="20%" font-size="30">${slot}</text></svg>`});});
  await page.addInitScript(rows=>{window.webkit={messageHandlers:{primeAPI:{postMessage:async({path})=>({status:200,data:path==='campaigns'?{campaigns:rows}:path==='reveal'?{code:'TEST'}:{authorized:true,ok:true}})}}};},rows);
  await page.goto(url);await page.getByRole('button',{name:'Ana Sayfa',exact:true}).waitFor();await page.locator('.ps-poster.large').first().waitFor();
  await page.waitForFunction(()=>[...document.querySelectorAll('.ps-poster.large img')].every(i=>i.complete&&i.naturalWidth));
  async function geometry(selector){return page.locator(selector).evaluateAll(nodes=>nodes.map(el=>{const f=el.querySelector('.ps-artwork-frame'),i=f?.querySelector('img'),a=el.getBoundingClientRect(),b=f?.getBoundingClientRect();return {outerWidth:a.width,slot:f?.dataset.artworkSlot,w:b?.width,h:b?.height,left:b?.left-a.left,right:a.right-b?.right,top:b?.top-a.top,bottom:a.bottom-b?.bottom,fit:i&&getComputedStyle(i).objectFit,state:f?.dataset.artworkState};}));}
  for(const selector of ['.ps-poster.large','.ps-poster.small','.ps-codebanner']){
   for(const g of await geometry(selector)){if(selector==='.ps-poster.large')assert(g.outerWidth<=contract.maxLargeWidth+.1);if(selector==='.ps-poster.small')assert(g.outerWidth<=contract.maxCompactWidth+.1);const s=contract.slots[g.slot];assert(Math.abs(g.w/g.h-s.width/s.height)<.002,JSON.stringify({width,selector,g}));for(const edge of ['left','right','top','bottom'])assert(Math.abs(g[edge]-contract.inset)<.2,JSON.stringify({width,selector,g}));assert.equal(g.fit,'contain');}
  }
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Page overflows horizontally');
  // Invalid bytes must be bounded to one frame and remain an accessible offer.
  const broken=page.locator('.ps-poster.large').first();await broken.locator('img').evaluate(i=>i.src='https://artwork.test/legacy.svg');
  await page.waitForFunction(()=>document.querySelector('.ps-poster.large .ps-artwork-frame').dataset.artworkState==='invalid');
  assert(await broken.locator('.ps-artworkfallback').isVisible());

  // Clicking the nested title must open detail from a brand list AND search list.
  await page.getByRole('button',{name:'Markalar',exact:true}).tap();await page.getByRole('button',{name:'Solgar kampanyalarını aç',exact:true}).tap();
  await page.getByRole('button',{name:'Solgar: Test ayrıcalığı',exact:true}).locator('.ps-artwork-frame').tap();
  await page.getByText('Prime Ayrıcalıkları',{exact:true}).waitFor();
  for(const g of await geometry('.ps-nativehero'))assert(Math.abs(g.w/g.h-1.5)<.002);assert(await page.evaluate(()=>document.querySelector('.ps-detailsheet').getBoundingClientRect().top<document.querySelector('.ps-slidefooter').getBoundingClientRect().top-80),'Detail drag handle/conditions must remain above footer');
  await page.getByRole('button',{name:'Geri',exact:true}).tap();await page.getByRole('button',{name:'Ana Sayfa',exact:true}).tap();
  await page.getByRole('textbox',{name:'Marka veya kampanya ara'}).fill('Test ayrıcalığı');assert.equal(await page.locator('.ps-searchresults .ps-nativelist button').count(),1);assert.equal(await page.locator('#ps-discovery .ps-carousel').count(),0);
  await page.locator('.ps-searchresults strong').tap();await page.getByText('Prime Ayrıcalıkları',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Geri',exact:true}).tap();await page.getByRole('textbox',{name:'Marka veya kampanya ara'}).fill('Eski format');await page.locator('.ps-searchresults strong').tap();await page.getByText('Prime Ayrıcalıkları',{exact:true}).waitFor();assert.equal(await page.locator('.ps-nativehero img').count(),0,'Legacy portrait must never enter the detail slot');
  await page.getByRole('button',{name:'Ana Sayfa',exact:true}).count();
  if(width===390){fs.mkdirSync('ci-artifacts/artwork',{recursive:true});await page.screenshot({path:'ci-artifacts/artwork/legacy-accessible.png'});}
  assert.deepEqual(errors,[],JSON.stringify({width,errors}));await page.close();console.log('PASS: real nested clicks and six-format geometry at '+width+'px');
 }
 }finally{await browser?.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
