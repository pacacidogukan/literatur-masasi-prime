import { readFile, writeFile, readdir, unlink } from 'node:fs/promises';
import { createHash } from 'node:crypto';
let html=await readFile('public/index.html','utf8');
for(const [stem,extension] of [['app','js'],['style','css']]){
 const content=await readFile(`public/${stem}.${extension}`);
 const hash=createHash('sha256').update(content).digest('hex').slice(0,12);
 const name=`${stem}-${hash}.${extension}`;
 await writeFile(`public/${name}`,content);
 const pattern=new RegExp(`${stem}(?:-[a-f0-9]{12})?\\.${extension}(?:\\?v=\\d+)?`,'g');
 html=html.replace(pattern,name);
 const oldPattern=new RegExp(`^${stem}-[a-f0-9]{12}\\.${extension}$`);
 for(const old of await readdir('public'))if(old!==name&&oldPattern.test(old))await unlink(`public/${old}`);
}
await writeFile('public/index.html',html);
