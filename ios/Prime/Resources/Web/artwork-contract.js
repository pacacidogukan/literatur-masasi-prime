/* Canonical export and composition contract. Used by UI, audit and generated CSS. */
(()=>{
 const slots=Object.freeze({
  large:{width:720,height:1080,productHeight:[.25,.30]},
  compact:{width:600,height:820,productHeight:[.60,.70]},
  square:{width:768,height:768},detail:{width:1200,height:800},
  code:{width:1200,height:400},lastDay:{width:1200,height:400}
 });
 const contract=Object.freeze({version:2,inset:0,safeMargin:.06,maxLargeWidth:320,maxCompactWidth:220,slots,
  dimensionsValid:(slot,width,height)=>!!slots[slot]&&width===slots[slot].width&&height===slots[slot].height
 });
 if(typeof module!=='undefined')module.exports=contract;
 else globalThis.primeArtworkContract=contract;
})();
