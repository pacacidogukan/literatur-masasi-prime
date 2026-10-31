const fs=require('node:fs'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process'),os=require('node:os'),path=require('node:path');
const source=fs.readFileSync('ios/Prime/PrimeWebView.swift','utf8');
assert.ok(source.includes('private let apiRoot = URL(string: "https://prime-campaign-editor.pacacidogukan.chatgpt.site/api/mobile/")!'));
const policy=source.slice(source.indexOf('private final class PrimeAPIRedirectPolicy:'));
const test=`
let legacy="https://prime-campaign-editor.sunlitcreek513.chatgpt.site/api/mobile/access"
let current="https://prime-campaign-editor.pacacidogukan.chatgpt.site/api/mobile/access"
var original=URLRequest(url:URL(string:legacy)!);original.httpMethod="POST";original.httpBody=Data([1,2,3,4]);original.setValue("test-session",forHTTPHeaderField:"X-Prime-Mobile-Session")
let response=HTTPURLResponse(url:original.url!,statusCode:302,httpVersion:nil,headerFields:nil)!
let accepted=PrimeAPIRedirectPolicy.verifiedRequest(original:original,response:response,destination:URLRequest(url:URL(string:current)!))!
assert(accepted.httpMethod=="POST" && accepted.httpBody==original.httpBody)
assert(accepted.value(forHTTPHeaderField:"X-Prime-Mobile-Session")=="test-session")
for target in ["https://attacker.test/api/mobile/access","http://prime-campaign-editor.pacacidogukan.chatgpt.site/api/mobile/access",current+"?forward=1",current+"#fragment","https://prime-campaign-editor.pacacidogukan.chatgpt.site/api/admin/campaigns",current.replacingOccurrences(of:"access",with:"campaigns"),"https://user:pass@prime-campaign-editor.pacacidogukan.chatgpt.site/api/mobile/access"] {
 assert(PrimeAPIRedirectPolicy.verifiedRequest(original:original,response:response,destination:URLRequest(url:URL(string:target)!))==nil)
}
print("PASS: verified alias migration preserves POST/body/session; foreign host, downgrade, changed route, query, fragment and userinfo rejected")
`;
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'prime-redirect-')),file=path.join(dir,'main.swift');
try{fs.writeFileSync(file,'import Foundation\n'+policy+'\n'+test);console.log(execFileSync('swift',[file],{encoding:'utf8'}));}finally{fs.rmSync(dir,{recursive:true,force:true});}
