import {cp,mkdir,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const output=path.join(root,'ios/Prime/Resources/Web');await mkdir(output,{recursive:true});
for(const name of ['app.js','icons.js','index.html','style.css'])await cp(path.join(root,'ios/ui',name),path.join(output,name));
await cp(path.join(root,'public/assets'),path.join(output,'assets'),{recursive:true});
console.log('Approved Prime UI synchronized with local icons and native-only API bridge.');
