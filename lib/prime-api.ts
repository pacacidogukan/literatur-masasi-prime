import {env} from 'cloudflare:workers';
import {seedCampaigns} from './prime-seed';
const json=(v:unknown,status=200)=>Response.json(v,{status,headers:{'Cache-Control':'no-store'}});
const now=()=>Math.floor(Date.now()/1000);
function campaignContent(c:any){return {...c,description:c.description??`${c.demo?'Örnek kampanya. ':''}Seçili ${c.name} ürünlerindeki ayrıcalığı keşfet. Kampanya kodunu aşağıdaki butonu sağa kaydırarak açabilirsin.`};}
async function digest(value:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(x=>x.toString(16).padStart(2,'0')).join('')}
const codeBytes=(value:string)=>new TextEncoder().encode(value);
const codeHex=(bytes:Uint8Array)=>Array.from(bytes).map(x=>x.toString(16).padStart(2,'0')).join('');
const codeUnhex=(value:string)=>new Uint8Array(value.match(/../g)!.map(x=>parseInt(x,16)));
async function displayKey(){return crypto.subtle.importKey('raw',await crypto.subtle.digest('SHA-256',codeBytes('prime-code-display:v1:'+env.PRIME_CODE_PEPPER)),{name:'AES-GCM'},false,['encrypt','decrypt']);}
async function sealCode(id:string,plain:string){const iv=crypto.getRandomValues(new Uint8Array(12));const sealed=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:codeBytes(id)},await displayKey(),codeBytes(plain));return 'v1:'+codeHex(iv)+':'+codeHex(new Uint8Array(sealed));}
async function openCode(id:string,value:string|null){if(!value||!env.PRIME_CODE_PEPPER||!/^v1:[a-f0-9]{24}:[a-f0-9]{44}$/.test(value))return null;try{const [,iv,data]=value.split(':');const plain=new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:codeUnhex(iv),additionalData:codeBytes(id)},await displayKey(),codeUnhex(data)));return /^\d{6}$/.test(plain)?plain:null;}catch{return null;}}
async function rememberCode(db:any,id:string,plain:string){await db.prepare('UPDATE access_codes SET display_cipher=? WHERE id=? AND display_cipher IS NULL').bind(await sealCode(id,plain),id).run();}
export async function api(request:Request){
 const db=env.DB;if(!db)return json({error:'Veritabanı henüz hazır değil.'},503);
 const path=new URL(request.url).pathname.replace('/api/',''),method=request.method;
 const user=request.headers.get('oai-authenticated-user-id');const email=request.headers.get('oai-authenticated-user-email');
 const owner=!!user&&!!env.PRIME_OWNER_EMAIL&&email?.toLowerCase()===env.PRIME_OWNER_EMAIL.toLowerCase();

 if(path.startsWith('mobile/'))return mobileApi(request,db,path);
 if(path==='integrations/purchases')return purchaseWebhook(request,db);
 if(method!=='GET'){
  if(Number(request.headers.get('Content-Length')||0)>64000)return json({error:'İstek çok büyük.'},413);
  if(request.headers.get('Origin')!==new URL(request.url).origin)return json({error:'Geçersiz istek kaynağı.'},403);
  if(!request.headers.get('Content-Type')?.startsWith('application/json'))return json({error:'JSON gerekli.'},415);
 }
 // A cryptographic capability link grants editing of exactly one campaign.
 if(path==='editor'||path==='editor/save'||path==='editor/delete'){
  const token=request.headers.get('X-Prime-Edit-Token')||'';
  if(!/^[a-f0-9]{64}$/.test(token))return json({error:'Düzenleme bağlantısı geçersiz.'},403);
  const link=await db.prepare('SELECT campaign_id FROM editor_links WHERE token=?').bind(token).first<{campaign_id:string}>();
  if(!link)return json({error:'Bu bağlantı geçersiz veya yenilenmiş.'},403);
  const campaign=await db.prepare('SELECT * FROM campaigns WHERE id=?').bind(link.campaign_id).first();
  if(!campaign)return json({error:'Kampanya bulunamadı.'},404);
  if(path==='editor'&&method==='GET'){const {position,reveal_count,...editable}=campaignContent(campaign);return json({campaign:editable});}
  if(path==='editor/delete'&&method==='POST'){
   const body=await request.json() as any;
   if(body.id&&body.id!==link.campaign_id)return json({error:'Bu bağlantı başka bir kampanyayı değiştiremez.'},403);
   return unpublishOrClear(db,link.campaign_id,campaign);
  }
  if(path==='editor/save'&&method==='POST'){
   const b=await request.json() as any;
   if(b.id&&b.id!==link.campaign_id)return json({error:'Bu bağlantı başka bir kampanyayı düzenleyemez.'},403);
   const values=campaignValues({...campaign,...b,active:b.saveAction==='save'?campaign.active:b.saveAction==='publish'?true:b.active??campaign.active,id:link.campaign_id,position:campaign.position});
   if(values instanceof Response)return values;
   await db.prepare('UPDATE campaigns SET name=?,asset=?,photo=?,offer=?,code=?,tag=?,description=?,verticalPhoto=?,squarePhoto=?,heroPhoto=?,latestPhoto=?,conditions=?,channel=?,expires=?,active=?,demo=? WHERE id=?').bind(values.name,values.asset,values.photo,values.offer,values.code,values.tag,values.description,values.verticalPhoto,values.squarePhoto,values.heroPhoto,values.latestPhoto,values.conditions,values.channel,values.expires,values.active,values.demo,link.campaign_id).run();
   return json({ok:true});
  }
  return json({error:'İşlem bulunamadı.'},405);
 }
 if(!user)return json({error:'Bu uygulamaya giriş yapmak için ChatGPT oturumunu aç.',signin:'/signin-with-chatgpt?return_to=/'},401);
 const granted=owner||!!await db.prepare('SELECT g.user_id FROM grants g JOIN access_codes c ON c.id=g.code_id WHERE g.user_id=? AND c.active=1 AND c.expires>?').bind(user,now()).first();
 if(path==='me'&&method==='GET')return json({authorized:granted,owner});
 if(path==='access'&&method==='POST'){
  const body=await request.json() as {code?:string};if(!/^\d{6}$/.test(body.code||''))return json({error:'6 haneli kodu gir.'},400);
  if(!env.PRIME_CODE_PEPPER)return json({error:'Kod doğrulaması henüz yapılandırılmadı.'},503);
  const key=await digest(user+':'+Math.floor(now()/900));
  await db.prepare('INSERT INTO attempts(key,count,expires) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1').bind(key,now()+900).run();
  const attempt=await db.prepare('SELECT count FROM attempts WHERE key=?').bind(key).first<{count:number}>();
  if((attempt?.count||0)>8)return json({error:'Çok fazla deneme yaptın. 15 dakika sonra tekrar dene.'},429);
  const hash=await digest(env.PRIME_CODE_PEPPER+':'+body.code);
  const code=await db.prepare('UPDATE access_codes SET uses=uses+1 WHERE hash=? AND active=1 AND expires>? AND uses<max_uses RETURNING id').bind(hash,now()).first<{id:string}>();
  if(!code)return json({error:'Kod geçersiz, süresi dolmuş veya kullanım sınırına ulaşmış.'},403);
  await rememberCode(db,code.id,body.code!);
  await db.prepare('INSERT INTO grants(user_id,code_id,created) VALUES (?,?,?) ON CONFLICT(user_id) DO UPDATE SET code_id=excluded.code_id,created=excluded.created').bind(user,code.id,now()).run();
  // Bounded cleanup keeps the attempt table small without changing its schema.
  await db.prepare('DELETE FROM attempts WHERE expires<?').bind(now()-86400).run();
  return json({authorized:true});
 }
 if(path==='delete-account'&&method==='POST'){
  if(owner)return json({error:'Yönetici hesabını bu ekrandan silemezsin.'},403);
  await erasePrimeAccess(db,user);return json({ok:true,deleted:true});
 }
 if(path==='logout'&&method==='POST'){await db.prepare('DELETE FROM grants WHERE user_id=?').bind(user).run();return json({ok:true});}
 if(path.startsWith('admin/')){
  if(!owner)return json({error:'Bu alan yalnızca uygulama sahibine açık.'},403);
  if(['admin/purchases','admin/purchase-integrations'].includes(path))return purchaseAdmin(request,db,path);
  if(path==='admin/notifications'&&method==='GET')return json({notifications:(await db.prepare('SELECT id,title,body,audience,campaign_id,created,active FROM notifications ORDER BY created DESC,id DESC LIMIT 100').all()).results});
  if(path==='admin/notifications'&&method==='POST'){
   const b=await request.json() as any;
   const title=typeof b.title==='string'?b.title.trim():'',body=typeof b.body==='string'?b.body.trim():'';
   if(!title||title.length>120||!body||body.length>1000||!['admin','all'].includes(b.audience)||!/^[a-f0-9-]{36}$/.test(b.id||''))return json({error:'Başlık (1–120), metin (1–1000) ve geçerli hedef seçimi gerekli.'},400);
   const campaignId=b.campaignId?String(b.campaignId):null;
   if(campaignId&&!await db.prepare('SELECT id FROM campaigns WHERE id=? AND active=1 AND (expires=0 OR expires>?)').bind(campaignId,now()).first())return json({error:'Bağlantı için aktif bir kampanya seç.'},400);
   const existing=await db.prepare('SELECT id FROM notifications WHERE id=?').bind(b.id).first();
   if(existing)return json({ok:true,id:b.id,duplicate:true});
   await db.prepare('INSERT INTO notifications(id,title,body,audience,campaign_id,created,active,created_by) VALUES (?,?,?,?,?,?,1,?)').bind(b.id,title,body,b.audience,campaignId,now(),user).run();
   return json({ok:true,id:b.id},201);
  }
  if(path==='admin/notifications/withdraw'&&method==='POST'){
   const b=await request.json() as any;await db.prepare('UPDATE notifications SET active=0 WHERE id=?').bind(String(b.id||'')).run();return json({ok:true});
  }
  if(path==='admin/blank-campaign'&&method==='POST'){
   const id=crypto.randomUUID(),token=Array.from(crypto.getRandomValues(new Uint8Array(32))).map(x=>x.toString(16).padStart(2,'0')).join('');
   await db.batch([
    db.prepare(`INSERT INTO campaigns(id,name,asset,photo,offer,code,tag,description,conditions,channel,expires,active,position,demo) VALUES (?,'','','','','','','','','',0,0,0,0)`).bind(id),
    db.prepare('INSERT INTO editor_links(campaign_id,token,created) VALUES (?,?,?)').bind(id,token,now())
   ]);
   return json({id,url:(env.PRIME_EDITOR_ORIGIN||new URL('/edit',request.url).href)+'#'+token},201);
  }
  if(path==='admin/delete-campaign'&&method==='POST'){
   const body=await request.json() as any,id=String(body.id||'');
   const campaign=await db.prepare('SELECT active,expires FROM campaigns WHERE id=?').bind(id).first<{active:number,expires:number}>();
   if(!campaign)return json({error:'Kampanya bulunamadı.'},404);
   return unpublishOrClear(db,id,campaign);
  }
  if(path==='admin/share'&&method==='POST'){
   const b=await request.json() as any,id=String(b.id||'');
   if(!await db.prepare('SELECT id FROM campaigns WHERE id=?').bind(id).first())return json({error:'Kampanya bulunamadı.'},404);
   let existing=await db.prepare('SELECT token FROM editor_links WHERE campaign_id=?').bind(id).first<{token:string}>();
   if(!existing||b.rotate){const token=Array.from(crypto.getRandomValues(new Uint8Array(32))).map(x=>x.toString(16).padStart(2,'0')).join('');
    await db.prepare('INSERT INTO editor_links(campaign_id,token,created) VALUES (?,?,?) ON CONFLICT(campaign_id) DO UPDATE SET token=excluded.token,created=excluded.created').bind(id,token,now()).run();
    existing=await db.prepare('SELECT token FROM editor_links WHERE campaign_id=?').bind(id).first<{token:string}>();
   }
   return json({url:(env.PRIME_EDITOR_ORIGIN||new URL('/edit',request.url).href)+'#'+existing!.token});
  }
  if(path==='admin/codes'&&method==='GET'){const rows=(await db.prepare('SELECT id,label,suffix,display_cipher,expires,max_uses,uses,active,created FROM access_codes ORDER BY created DESC LIMIT 200').all()).results;return json({codes:await Promise.all(rows.map(async({display_cipher,...row}:any)=>({...row,code:await openCode(row.id,display_cipher)})))});}
  if(path==='admin/codes'&&method==='POST'){
   const b=await request.json() as any;const days=Math.trunc(Number(b.days)),max=Math.trunc(Number(b.maxUses));
   if(!Number.isFinite(days)||days<1||days>365||!Number.isFinite(max)||max<1||max>100000)return json({error:'Süre 1–365 gün, kullanım adedi 1–100.000 olmalı.'},400);
   if(!env.PRIME_CODE_PEPPER)return json({error:'Kod doğrulaması yapılandırılmadı.'},503);
   for(let i=0;i<10;i++){
    const numbers=crypto.getRandomValues(new Uint32Array(1));if(numbers[0]>=4294000000){i--;continue;}
    const plain=String(numbers[0]%1000000).padStart(6,'0'),id=crypto.randomUUID(),hash=await digest(env.PRIME_CODE_PEPPER+':'+plain);
    try{await db.prepare('INSERT INTO access_codes(id,hash,label,suffix,expires,max_uses,created,display_cipher) VALUES (?,?,?,?,?,?,?,?)').bind(id,hash,String(b.label||'Instagram erişimi').slice(0,100),plain.slice(-2),now()+days*86400,max,now(),await sealCode(id,plain)).run();return json({id,code:plain},201)}catch(e){if(!String(e).includes('UNIQUE'))throw e;}
   }return json({error:'Kod oluşturulamadı, tekrar dene.'},500);
  }
  if(path==='admin/revoke'&&method==='POST'){const b=await request.json() as any;await db.prepare('UPDATE access_codes SET active=0 WHERE id=?').bind(String(b.id)).run();return json({ok:true});}
  if(path==='admin/campaign-reveals'&&method==='GET'){
   const id=new URL(request.url).searchParams.get('id')||'';
   const campaign=await db.prepare('SELECT name,reveal_count FROM campaigns WHERE id=?').bind(id).first();
   if(!campaign)return json({error:'Kampanya bulunamadı.'},404);
   const offset=Math.max(0,Math.trunc(Number(new URL(request.url).searchParams.get('offset'))||0));
   const rows=await db.prepare('SELECT created FROM campaign_reveals WHERE campaign_id=? ORDER BY created DESC,id DESC LIMIT 101 OFFSET ?').bind(id,offset).all();
   return json({campaign,events:rows.results.slice(0,100),hasMore:rows.results.length>100});
  }
  if(path==='admin/campaigns'&&method==='GET')return json({campaigns:(await db.prepare('SELECT * FROM campaigns ORDER BY position,name').all()).results.map(campaignContent)});
  if(path==='admin/seed'&&method==='POST'){
   if(await db.prepare('SELECT id FROM campaigns LIMIT 1').first())return json({error:'Kampanyalar zaten mevcut.'},409);
   await db.batch(seedCampaigns.map((b:any,i:number)=>db.prepare('INSERT INTO campaigns(id,name,asset,photo,offer,code,tag,conditions,channel,expires,active,position,demo) VALUES (?,?,?,?,?,?,?,?,?,?,1,?,1)').bind(b.id,b.name,'assets/'+b.asset,'assets/'+b.photo,b.offer,b.code,b.tag,'Seçili ürünlerde geçerlidir. Diğer kampanyalarla birleştirilemez. Örnek kampanyadır; alışverişte geçerli değildir.','Online alışveriş',1798750799,i)));
   return json({ok:true});
  }
  if(path==='admin/campaigns'&&method==='POST'){
   const b=await request.json() as any;
   const existing=b.id?await db.prepare('SELECT * FROM campaigns WHERE id=?').bind(String(b.id)).first():null;
   const v=campaignValues({...existing,...b,active:b.saveAction==='save'?(existing?.active??false):b.saveAction==='publish'?true:b.active??existing?.active??false});if(v instanceof Response)return v;
   const id=String(b.id||'').trim().slice(0,60)||crypto.randomUUID();
   await db.prepare('INSERT INTO campaigns(id,name,asset,photo,offer,code,tag,description,verticalPhoto,squarePhoto,heroPhoto,latestPhoto,conditions,channel,expires,active,position,demo) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,asset=excluded.asset,photo=excluded.photo,offer=excluded.offer,code=excluded.code,tag=excluded.tag,description=excluded.description,verticalPhoto=excluded.verticalPhoto,squarePhoto=excluded.squarePhoto,heroPhoto=excluded.heroPhoto,latestPhoto=excluded.latestPhoto,conditions=excluded.conditions,channel=excluded.channel,expires=excluded.expires,active=excluded.active,position=excluded.position,demo=excluded.demo').bind(id,v.name,v.asset,v.photo,v.offer,v.code,v.tag,v.description,v.verticalPhoto,v.squarePhoto,v.heroPhoto,v.latestPhoto,v.conditions,v.channel,v.expires,v.active,v.position,v.demo).run();
   return json({ok:true,id});
  }
  return json({error:'İşlem bulunamadı.'},404);
 }
 if(!granted)return json({error:'Geçerli erişim koduyla giriş yap.'},403);
 if(path==='notifications'&&method==='GET'){
  const pref=await db.prepare('SELECT enabled FROM notification_preferences WHERE user_id=?').bind(user).first<{enabled:number}>();
  const list=await db.prepare(`SELECT n.id,n.title,n.body,n.campaign_id,n.created,CASE WHEN r.id IS NULL THEN 0 ELSE 1 END AS is_read FROM notifications n LEFT JOIN notification_reads r ON r.id=(? || ':' || n.id) WHERE n.active=1 AND (n.audience='all' OR (n.audience='admin' AND ?=1)) ORDER BY n.created DESC,n.id DESC LIMIT 100`).bind(user,owner?1:0).all();
  return json({notifications:list.results,enabled:pref?!!pref.enabled:true});
 }
 if(path==='notifications/read'&&method==='POST'){
  const b=await request.json() as any,id=String(b.id||'');
  if(!await db.prepare("SELECT id FROM notifications WHERE id=? AND active=1 AND (audience='all' OR (audience='admin' AND ?=1))").bind(id,owner?1:0).first())return json({error:'Bildirim bulunamadı.'},404);
  await db.prepare('INSERT OR IGNORE INTO notification_reads(id,user_id,notification_id,created) VALUES (?,?,?,?)').bind(user+':'+id,user,id,now()).run();return json({ok:true});
 }
 if(path==='notifications/preference'&&method==='POST'){
  const b=await request.json() as any;if(typeof b.enabled!=='boolean')return json({error:'Geçersiz tercih.'},400);
  await db.prepare('INSERT INTO notification_preferences(user_id,enabled) VALUES (?,?) ON CONFLICT(user_id) DO UPDATE SET enabled=excluded.enabled').bind(user,b.enabled?1:0).run();return json({ok:true});
 }
 if(path==='campaigns'&&method==='GET')return json({campaigns:(await db.prepare('SELECT id,name,asset,photo,offer,tag,description,verticalPhoto,squarePhoto,heroPhoto,latestPhoto,conditions,channel,expires,demo FROM campaigns WHERE active=1 AND (expires=0 OR expires>?) ORDER BY position,name').bind(now()).all()).results.map(campaignContent)});
 if(path==='reveal'&&method==='POST'){const b=await request.json() as any;const id=String(b.id),time=now();const results=await db.batch([db.prepare('UPDATE campaigns SET reveal_count=reveal_count+1 WHERE id=? AND active=1 AND (expires=0 OR expires>?) RETURNING code,demo').bind(id,time),db.prepare('INSERT INTO campaign_reveals(id,campaign_id,created) SELECT ?,id,? FROM campaigns WHERE id=? AND active=1 AND (expires=0 OR expires>?)').bind(crypto.randomUUID(),time,id,time)]);const c=results[0].results[0];return c?json(c):json({error:'Kampanya aktif değil.'},404);}
 return json({error:'İşlem bulunamadı.'},404);
}
export async function safeApi(request:Request){try{return await api(request)}catch{return json({error:'İşlem tamamlanamadı. Tekrar dene.'},500)}}

function campaignValues(b:any){
 const clean=(k:string,len:number)=>String(b[k]||'').trim().slice(0,len);
 const publishing=b.saveAction!=='save';
 const requiredFields:any={name:'Marka adı',tag:'Kısa marka açıklaması',offer:'Teklif başlığı',description:'Teklif açıklaması',code:'Kampanya kodu',asset:'Logo adresi',photo:'Kampanya görseli adresi',verticalPhoto:'Dikey kart görseli',squarePhoto:'Kare kart görseli',latestPhoto:'Yeni Ayrıcalıkları Keşfet görseli',channel:'Geçerli alışveriş kanalı'};
 const missing=Object.keys(requiredFields).filter(key=>!String(b[key]??'').trim());
 if(publishing&&missing.length)return json({error:'Lütfen zorunlu alanları doldurun: '+missing.map(key=>requiredFields[key]).join(', ')+'.'},400);
 const name=clean('name',80),offer=clean('offer',180),code=clean('code',120);
 if(publishing&&(!name||!offer||!code||!Number.isInteger(b.expires)||(b.expires!==0&&b.expires<=now())))return json({error:'Marka, teklif, kod ve geçerli bitiş bilgisi gerekli.'},400);
 const valid=(v:string)=>/^assets\/[\w.\-]+$/.test(v)||(()=>{try{return new URL(v).protocol==='https:'}catch{return false}})();
 const asset=clean('asset',2000),photo=clean('photo',2000);if((asset&&!valid(asset))||(photo&&!valid(photo)))return json({error:'Görseller için assets/dosya veya HTTPS adresi kullan.'},400);
 const images:any={};
 for(const key of ['verticalPhoto','squarePhoto','heroPhoto','latestPhoto']){const value=clean(key,2000);if(value&&!valid(value))return json({error:'Kart görselleri için HTTPS adresi kullan.'},400);images[key]=value||null;}
 return {...images,name,offer,code,asset,photo,tag:clean('tag',150),description:b.description==null?null:clean('description',4000),conditions:clean('conditions',6000),channel:clean('channel',150),expires:Number.isFinite(Number(b.expires))?Math.trunc(Number(b.expires)):0,active:b.active?1:0,position:Math.trunc(Number(b.position)||0),demo:b.demo?1:0};
}

async function unpublishOrClear(db:any,id:string,campaign:any){
   if(campaign.active&&(campaign.expires===0||campaign.expires>now())){
    await db.prepare('UPDATE campaigns SET active=0 WHERE id=?').bind(id).run();
    return json({ok:true,action:'unpublished'});
   }
   await db.prepare(`UPDATE campaigns SET name='',asset='',photo='',offer='',code='',tag='',description='',verticalPhoto=NULL,squarePhoto=NULL,heroPhoto=NULL,latestPhoto=NULL,conditions='',channel='',expires=0,active=0,position=0,demo=0 WHERE id=?`).bind(id).run();
   return json({ok:true,action:'cleared'});
}

// Purchase tracking is server-to-server only. No customer identity is collected.
async function purchaseWebhook(request:Request,db:any){
 if(request.method!=='POST')return json({error:'POST gerekli.'},405);
 if(!request.headers.get('Content-Type')?.startsWith('application/json'))return json({error:'JSON gerekli.'},415);
 const key=request.headers.get('X-Prime-Integration-Key')||'';
 if(!/^[a-f0-9]{64}$/.test(key))return json({error:'Geçersiz entegrasyon anahtarı.'},401);
 const integration=await db.prepare('SELECT * FROM purchase_integrations WHERE key_hash=? AND enabled=1').bind(await digest(key)).first();
 if(!integration)return json({error:'Entegrasyon etkin değil veya anahtar geçersiz.'},401);
 const raw=await request.text();if(new TextEncoder().encode(raw).length>64000)return json({error:'İstek çok büyük.'},413);
 let b:any;try{b=JSON.parse(raw)}catch{return json({error:'Geçersiz JSON.'},400)}
 if(!b||typeof b!=='object'||Array.isArray(b))return json({error:'Geçersiz olay.'},400);
 const str=(v:any,max:number)=>typeof v==='string'&&v.trim().length>0&&v.trim().length<=max?v.trim():null;
 const eventId=str(b.eventId,120),orderId=str(b.orderId,120),coupon=str(b.coupon,120),currency=str(b.currency,3),status=b.status;
 const occurred=typeof b.occurredAt==='string'?Date.parse(b.occurredAt):NaN;
 if(!eventId||!orderId||!coupon||!currency||!/^[A-Z]{3}$/.test(currency)||!['paid','cancelled','refunded'].includes(status)||!Number.isSafeInteger(b.amountMinor)||b.amountMinor<0||b.amountMinor>100000000000||!Number.isFinite(occurred)||!/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(b.occurredAt)||occurred>Date.now()+300000||occurred<integration.created*1000)return json({error:'Geçerli eventId, orderId, coupon, currency, status, amountMinor ve entegrasyon sonrasına ait occurredAt gerekli.'},400);
 if(coupon!==integration.coupon)return json({error:'Kampanya kodu bu entegrasyonla eşleşmiyor.'},422);
 const normalized={eventId,orderId,coupon,currency,status,amountMinor:b.amountMinor,occurredAt:occurred};
 const hash=await digest(JSON.stringify(normalized)),id=await digest(integration.id+':'+eventId),orderKey=await digest(integration.id+':'+orderId);
 const existing=await db.prepare('SELECT payload_hash FROM purchase_events WHERE id=?').bind(id).first();
 if(existing)return existing.payload_hash===hash?json({ok:true,duplicate:true}):json({error:'eventId farklı bir içerikle zaten kullanılmış.'},409);
 const order=await db.prepare('SELECT occurred,currency,amount_minor,status FROM purchase_orders WHERE id=?').bind(orderKey).first();
 if(order&&(order.currency!==currency||order.amount_minor!==b.amountMinor))return json({error:'Sipariş para birimi ve toplamı değiştirilemez.'},409);
 if(order&&order.occurred===occurred&&order.status!==status)return json({error:'Durum değişikliğinde daha yeni occurredAt gönder.'},409);
 await db.batch([
  db.prepare('INSERT OR IGNORE INTO purchase_events(id,integration_id,campaign_id,order_id,status,amount_minor,currency,occurred,received,payload_hash) VALUES (?,?,?,?,?,?,?,?,?,?)').bind(id,integration.id,integration.campaign_id,orderId,status,b.amountMinor,currency,occurred,now(),hash),
  db.prepare(`INSERT INTO purchase_orders(id,integration_id,campaign_id,order_id,coupon,status,amount_minor,currency,occurred,received) SELECT ?,?,?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM purchase_events WHERE id=? AND payload_hash=?) ON CONFLICT(id) DO UPDATE SET status=excluded.status,occurred=excluded.occurred,received=excluded.received WHERE excluded.occurred>purchase_orders.occurred AND excluded.currency=purchase_orders.currency AND excluded.amount_minor=purchase_orders.amount_minor`).bind(orderKey,integration.id,integration.campaign_id,orderId,coupon,status,b.amountMinor,currency,occurred,now(),id,hash),
  db.prepare('UPDATE purchase_integrations SET last_received=? WHERE id=?').bind(now(),integration.id)
 ]);
 const saved=await db.prepare('SELECT payload_hash FROM purchase_events WHERE id=?').bind(id).first();
 if(saved.payload_hash!==hash)return json({error:'eventId farklı bir içerikle zaten kullanılmış.'},409);
 const state=await db.prepare('SELECT status,occurred FROM purchase_orders WHERE id=?').bind(orderKey).first();
 return json({ok:true,source:'merchant_api',countedAsSale:state?.status==='paid',outOfOrder:state?.occurred>occurred},202);
}
async function purchaseAdmin(request:Request,db:any,path:string){
 const url=new URL(request.url),campaignId=url.searchParams.get('campaignId')||'';
 if(request.method==='GET'&&path==='admin/purchases'){
  if(!campaignId)return json({error:'campaignId gerekli.'},400);
  const integrations=await db.prepare('SELECT id,site_origin,coupon,enabled,created,last_received FROM purchase_integrations WHERE campaign_id=?').bind(campaignId).all();
  const summary=await db.prepare(`SELECT currency,COUNT(*) AS reported_orders,SUM(CASE WHEN status='paid' THEN 1 ELSE 0 END) AS paid_orders,SUM(CASE WHEN status='refunded' THEN 1 ELSE 0 END) AS refunded_orders,SUM(CASE WHEN status='cancelled' THEN 1 ELSE 0 END) AS cancelled_orders,SUM(CASE WHEN status='paid' THEN amount_minor ELSE 0 END) AS paid_amount_minor FROM purchase_orders WHERE campaign_id=? GROUP BY currency`).bind(campaignId).all();
  const offset=Math.max(0,Math.trunc(Number(url.searchParams.get('offset'))||0));
  const orders=await db.prepare('SELECT order_id,coupon,status,amount_minor,currency,occurred,received FROM purchase_orders WHERE campaign_id=? ORDER BY occurred DESC,id DESC LIMIT 101 OFFSET ?').bind(campaignId,offset).all();
  return json({source:'merchant_api',integrationConnected:integrations.results.some((x:any)=>x.enabled&&x.last_received),integrations:integrations.results,summary:summary.results,orders:orders.results.slice(0,100),hasMore:orders.results.length>100});
 }
 if(request.method==='POST'&&path==='admin/purchase-integrations'){
  const b=await request.json() as any;
  if(b.action==='create'){
   const campaign=await db.prepare('SELECT id,code FROM campaigns WHERE id=?').bind(String(b.campaignId||'')).first();
   if(!campaign?.code)return json({error:'Kod tanımlanmış kampanya seç.'},400);
   let origin:string;try{const site=new URL(b.siteOrigin);if(site.protocol!=='https:'||site.username||site.password||site.pathname!=='/'||site.search||site.hash)throw Error();origin=site.origin}catch{return json({error:'HTTPS mağaza kök adresi gerekli.'},400)}
   const key=Array.from(crypto.getRandomValues(new Uint8Array(32))).map(x=>x.toString(16).padStart(2,'0')).join(''),id=crypto.randomUUID();
   await db.prepare('INSERT INTO purchase_integrations(id,campaign_id,key_hash,site_origin,coupon,enabled,created) VALUES (?,?,?,?,?,0,?)').bind(id,campaign.id,await digest(key),origin,campaign.code,now()).run();
   return json({id,key,enabled:false,coupon:campaign.code,note:'Anahtar yalnızca bir kez gösterilir. Mağaza sunucusunda sakla. Entegrasyon hazırlanınca etkinleştir.'},201);
  }
  const integration=await db.prepare('SELECT id FROM purchase_integrations WHERE id=?').bind(String(b.id||'')).first();
  if(!integration)return json({error:'Entegrasyon bulunamadı.'},404);
  if(b.action==='enable'||b.action==='disable'){await db.prepare('UPDATE purchase_integrations SET enabled=? WHERE id=?').bind(b.action==='enable'?1:0,integration.id).run();return json({ok:true,enabled:b.action==='enable'})}
  if(b.action==='rotate'){
   const key=Array.from(crypto.getRandomValues(new Uint8Array(32))).map(x=>x.toString(16).padStart(2,'0')).join('');await db.prepare('UPDATE purchase_integrations SET key_hash=? WHERE id=?').bind(await digest(key),integration.id).run();return json({ok:true,key});
  }
  return json({error:'Geçersiz işlem.'},400);
 }
 return json({error:'İşlem bulunamadı.'},405);
}

// App sessions are separate from Sites identity; admin routes retain Sites owner auth.
async function mobileApi(request:Request,db:any,path:string):Promise<Response>{
 const route=path.slice('mobile/'.length),allowed:any={'delete-account':'POST',me:'GET',access:'POST',campaigns:'GET',reveal:'POST',notifications:'GET','notifications/read':'POST','notifications/preference':'POST',logout:'POST'};
 if(!Object.prototype.hasOwnProperty.call(allowed,route))return json({error:'Mobil işlem bulunamadı.'},404);
 if(request.method!==allowed[route])return json({error:'Geçersiz işlem.'},405);
 let raw:string|undefined;
 if(request.method==='POST'){
  if(!request.headers.get('Content-Type')?.startsWith('application/json'))return json({error:'JSON gerekli.'},415);
  raw=await request.text();if(new TextEncoder().encode(raw).length>64000)return json({error:'İstek çok büyük.'},413);
 }
 if(route==='access'){
  let b:any;try{b=JSON.parse(raw||'{}')}catch{return json({error:'Geçersiz JSON.'},400)}
  if(!/^\d{6}$/.test(b?.code||'')||typeof b.installationId!=='string'||!/^[a-f0-9-]{36}$/i.test(b.installationId))return json({error:'6 haneli kod ve geçerli kurulum kimliği gerekli.'},400);
  if(!env.PRIME_CODE_PEPPER)return json({error:'Giriş henüz yapılandırılmadı.'},503);
  const window=Math.floor(now()/900),address=request.headers.get('X-Prime-Mobile-Address')||'unknown';
  for(const [kind,value,limit] of [['device',b.installationId,8],['network',address,address==='unknown'?100:30]] as [string,string,number][]){
   const key=await digest(env.PRIME_CODE_PEPPER+':mobile:'+kind+':'+value+':'+window);
   await db.prepare('INSERT INTO attempts(key,count,expires) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1').bind(key,now()+900).run();
   const count=await db.prepare('SELECT count FROM attempts WHERE key=?').bind(key).first();
   if(count.count>limit)return json({error:'Çok fazla giriş denemesi. 15 dakika sonra tekrar dene.'},429);
  }
  const code=await db.prepare('UPDATE access_codes SET uses=uses+1 WHERE hash=? AND active=1 AND expires>? AND uses<max_uses RETURNING id,expires').bind(await digest(env.PRIME_CODE_PEPPER+':'+b.code),now()).first();
  if(!code)return json({error:'Kod geçersiz, süresi dolmuş veya kullanım sınırına ulaşmış.'},403);
  await rememberCode(db,code.id,b.code);
  const id='mobile:'+crypto.randomUUID(),token=Array.from(crypto.getRandomValues(new Uint8Array(32))).map(x=>x.toString(16).padStart(2,'0')).join(''),expires=Math.min(code.expires,now()+30*86400);
  await db.batch([
   db.prepare('INSERT INTO grants(user_id,code_id,created) VALUES (?,?,?)').bind(id,code.id,now()),
   db.prepare('INSERT INTO mobile_sessions(token_hash,user_id,expires,created) VALUES (?,?,?,?)').bind(await digest(token),id,expires,now())
  ]);
  await db.prepare('DELETE FROM mobile_sessions WHERE expires<?').bind(now()).run();
  await db.prepare('DELETE FROM attempts WHERE expires<?').bind(now()-86400).run();
  return json({authorized:true,owner:false,sessionToken:token,expires},201);
 }
 const token=request.headers.get('X-Prime-Mobile-Session')||'';
 if(!/^[a-f0-9]{64}$/.test(token))return route==='logout'?json({ok:true}):route==='me'?json({authorized:false,owner:false}):json({error:'Kodunla tekrar giriş yap.'},401);
 if(route==='delete-account'){
  const record=await db.prepare('SELECT user_id FROM mobile_sessions WHERE token_hash=?').bind(await digest(token)).first();
  if(record)await erasePrimeAccess(db,record.user_id);
  return json({ok:true,deleted:true});
 }
 const session=await db.prepare('SELECT s.user_id,s.expires FROM mobile_sessions s JOIN grants g ON g.user_id=s.user_id JOIN access_codes c ON c.id=g.code_id WHERE s.token_hash=? AND s.expires>? AND c.active=1 AND c.expires>?').bind(await digest(token),now(),now()).first();
 if(!session)return route==='logout'?json({ok:true}):route==='me'?json({authorized:false,owner:false}):json({error:'Oturumun sona erdi. Kodunla tekrar giriş yap.'},401);
 if(route==='logout'){
  await db.batch([db.prepare('DELETE FROM mobile_sessions WHERE token_hash=?').bind(await digest(token)),db.prepare('DELETE FROM grants WHERE user_id=?').bind(session.user_id)]);return json({ok:true});
 }
 // Construct trusted identity solely from the validated session. Client identity is discarded.
 const target=new URL('/api/'+route,request.url),headers=new Headers({'oai-authenticated-user-id':session.user_id});
 if(raw!==undefined){headers.set('Content-Type','application/json');headers.set('Origin',target.origin)}
 return api(new Request(target,{method:request.method,headers,body:raw}));
}

async function erasePrimeAccess(db:any,userId:string){
 await db.batch([
  db.prepare('DELETE FROM notification_reads WHERE user_id=?').bind(userId),
  db.prepare('DELETE FROM notification_preferences WHERE user_id=?').bind(userId),
  db.prepare('DELETE FROM mobile_sessions WHERE user_id=?').bind(userId),
  db.prepare('DELETE FROM grants WHERE user_id=?').bind(userId)
 ]);
}
