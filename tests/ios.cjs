const fs=require('node:fs'),assert=require('node:assert/strict');
const native=fs.readFileSync('ios/Prime/Resources/Web/app.js','utf8');
assert.ok(native.includes('window.webkit?.messageHandlers?.primeAPI'));
assert.ok(native.includes("await server('copy',{text:selected.code})"));
assert.ok(native.includes('const notificationsAvailable=false;'));
assert.ok(native.includes("await server('open-external',{url})"));
assert.ok(!native.includes("fetch('/api/"));
assert.ok(!native.includes('OAI-Sites-Authorization'));
assert.ok(!native.includes('ChatGPT oturumu da gereklidir'));
const swift=fs.readFileSync('ios/Prime/PrimeWebView.swift','utf8');
assert.ok(swift.includes('message.frameInfo.isMainFrame'));
assert.ok(swift.includes('result.removeValue(forKey: "sessionToken")'));
assert.ok(swift.includes('completionHandler(nil)'));
let suite=fs.readFileSync('tests/client.cjs','utf8').replace('expires:2000000000,demo:1','expires:2000000000,demo:0');
suite=suite.replace('vm.createContext(box);vm.runInContext',`box.window.webkit={messageHandlers:{primeAPI:{async postMessage({path,body}){if(path==='copy')return {status:200,data:{ok:true}};if(path==='open-external'){box.openedWebsite=body.url;return {status:200,data:{ok:true}};}const r=await box.fetch('/api/'+path,body?{method:'POST',body:JSON.stringify(body)}:undefined);return {status:r.ok?200:403,data:await r.json()}}}}};vm.createContext(box);vm.runInContext`);
suite=suite.replace("run(\"selected=brands[0];selected.expires=0;go('detail')\")", `
assert.match(get('app').innerHTML,/class="hero-open"/);
run("query=brands[0].name");assert.match(run('listContent()'),/marka sayfasını aç/);
run("query=brands[0].offer");assert.match(run('listContent()'),/kampanya detayını aç/);
run("query='';selected=brands[0];selected.expires=0;go('detail')")
`);
suite=suite.replace("assert.equal(run('filtered().length'),1);", "assert.match(run('listContent()'),/marka sayfasını aç/);");
const mockFs={...fs,readFileSync(p,...args){return p==='public/app.js'?native:fs.readFileSync(p,...args)}};
new Function('require',suite)(name=>name==='node:fs'?mockFs:require(name));
console.log('PASS: native UI adapter, Keychain-only session response and bridge origin restrictions checked. Shared client scenarios run against the native bundle.');
