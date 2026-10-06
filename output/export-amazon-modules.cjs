// Render the code-native artwork into individual Amazon Store image assets.
const fs=require('node:fs');
const path=require('node:path');
const {spawn,execFileSync}=require('node:child_process');
const {pathToFileURL}=require('node:url');
const {createHash}=require('node:crypto');
const root=__dirname,assets=path.join(root,'assets','amazon-store');
const manifest=JSON.parse(fs.readFileSync(path.join(assets,'upload-manifest.json'),'utf8'));
const expectedImageCount=manifest.modules.length+manifest.modules.filter(m=>m.mobile).length+1;
const browserPath=['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(fs.existsSync);
if(!browserPath)throw Error('Chrome or Edge is required to export the artwork.');
const browser=spawn(browserPath,['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-debugging-port=0','--remote-allow-origins=*','--user-data-dir='+path.join(root,'.qa','amazon-module-profile'),'about:blank'],{windowsHide:true,stdio:['ignore','ignore','pipe']});
let socket;
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const checks=[],errors=[];
function check(ok,message){if(!ok)throw Error(message);checks.push(message);}
(async()=>{
 const endpoint=await new Promise((resolve,reject)=>{let log='';const timeout=setTimeout(()=>reject(Error('Browser startup timed out')),18000);browser.stderr.on('data',chunk=>{log+=chunk;const match=log.match(/DevTools listening on (ws:\/\/[^\s]+)/);if(match){clearTimeout(timeout);resolve(match[1]);}});browser.on('error',reject);});
 const pages=await(await fetch('http://127.0.0.1:'+new URL(endpoint).port+'/json/list')).json();
 socket=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);
 await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
 let seq=0;const pending=new Map();
 socket.addEventListener('message',event=>{const data=JSON.parse(event.data);if(data.id&&pending.has(data.id)){const handlers=pending.get(data.id);pending.delete(data.id);data.error?handlers.reject(Error(JSON.stringify(data.error))):handlers.resolve(data.result);}else if(data.method==='Runtime.exceptionThrown')errors.push(data.params.exceptionDetails.text);});
 const call=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
 async function evaluate(expression){const result=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw Error(JSON.stringify(result.exceptionDetails));return result.result.value;}
 await call('Page.enable');await call('Runtime.enable');
 async function navigate(file){await call('Page.navigate',{url:pathToFileURL(file).href});for(let i=0;i<100;i++){if(await evaluate('document.readyState==="complete"'))break;await wait(100);}await evaluate('document.querySelectorAll("img").forEach(image=>image.loading="eager");Promise.all([...document.images].map(image=>image.decode()))');await evaluate('document.fonts.ready');}
 await call('Emulation.setDeviceMetricsOverride',{width:3000,height:2100,deviceScaleFactor:1,mobile:false});
 await navigate(path.join(assets,'module-artwork.html'));
 check(await evaluate('[...document.fonts].filter(f=>f.status==="loaded").some(f=>f.family==="Inter")&&[...document.fonts].filter(f=>f.status==="loaded").some(f=>f.family==="Playfair"&&f.style==="italic")'),'Original Inter and Playfair Display fonts load for artwork exports');
 check(await evaluate('[...document.querySelectorAll(".header-art [data-safe]")].every(el=>{const a=el.getBoundingClientRect(),b=el.closest(".artboard").getBoundingClientRect();return a.left-b.left>=450&&a.right-b.left<=2550;})'),'Header logo and copy stay inside the central 70% safe zone');
 const boards=await evaluate('[...document.querySelectorAll("[data-export]")].map(el=>{const r=el.getBoundingClientRect();return {id:el.id,file:el.dataset.export,x:r.left+scrollX,y:r.top+scrollY,width:r.width,height:r.height};})');
 check(boards.length===expectedImageCount,'All declared desktop and mobile artwork variants and the original logo are defined');
 const layoutIssues=await evaluate('[...document.querySelectorAll("[data-safe]")].filter(el=>{const a=el.getBoundingClientRect(),b=el.closest(".artboard").getBoundingClientRect();return a.left<b.left-1||a.right>b.right+1||a.top<b.top-1||a.bottom>b.bottom+1;}).map(el=>({tile:el.closest(".artboard").id,text:el.textContent}))');
 check(layoutIssues.length===0,'All desktop and mobile artwork text stays inside its tile: '+JSON.stringify(layoutIssues));
 const mobileCopyIssues=await evaluate('[...document.querySelectorAll(".mobile.banner")].filter(board=>board.querySelector(".cta").getBoundingClientRect().bottom>board.querySelector(".scene").getBoundingClientRect().top+2).map(board=>board.id)');
 check(mobileCopyIssues.length===0,'Mobile copy and CTA stay above the product photograph: '+JSON.stringify(mobileCopyIssues));
 check(await evaluate('document.querySelectorAll(".wash").length===0&&[...document.querySelectorAll(".artboard")].every(board=>!getComputedStyle(board).backgroundImage.includes("gradient"))'),'Image modules use flat brand fields without gradient overlays');
 const overlaps=await evaluate('[...document.querySelectorAll(".banner,.care-art")].filter(board=>{const a=board.querySelector(".copy").getBoundingClientRect(),b=board.querySelector(".scene").getBoundingClientRect();return Math.min(a.right,b.right)-Math.max(a.left,b.left)>2&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>2;}).map(board=>board.id)');
 check(overlaps.length===0,'Copy panels and product photos remain separate on desktop and mobile: '+JSON.stringify(overlaps));
 check(await evaluate('[...document.querySelectorAll(".copy")].every(copy=>getComputedStyle(copy).textShadow==="none")'),'Brand copy uses clear typography without text shadows');
 const exported=[];
 const selectedModules=process.argv.find(arg=>arg.startsWith('--only='))?.slice(7).split(',');
 for(const board of boards){
  const png=board.file.endsWith('.png');
  const shouldRender=!process.argv.includes('--verify-only')&&(!selectedModules||selectedModules.some(id=>board.id.startsWith(id)));
  let bytes;
  if(!shouldRender)bytes=fs.readFileSync(path.join(assets,board.file));
  else{const capture=await call('Page.captureScreenshot',{format:png?'png':'jpeg',...(png?{}:{quality:92}),captureBeyondViewport:true,clip:{x:board.x,y:board.y,width:board.width,height:board.height,scale:1}});bytes=Buffer.from(capture.data,'base64');}
  check(bytes.length<5000000,board.file+' remains below the 5 MB upload limit');
  if(shouldRender)fs.writeFileSync(path.join(assets,board.file),bytes);
  exported.push({...board,bytes:bytes.length});
 }
 execFileSync(process.execPath,[path.join(root,'build-storefront.cjs')],{windowsHide:true,stdio:'pipe'});
 await navigate(path.join(root,'razab-premium.html'));
 check(await evaluate('document.querySelectorAll("main picture").length==='+manifest.modules.length),'Preview renders every declared image tile');
 check(await evaluate('[...document.querySelectorAll("main picture img")].every(image=>image.complete&&image.naturalWidth>0)'),'Every preview module is an actual loaded image block');
 check(await evaluate('document.querySelectorAll(".split-row figure").length===4'),'The 16-piece and 6500 ml sections form a four-tile checkerboard');
 check(await evaluate('document.querySelectorAll("dialog,button,input,.product-card,.compare-dock").length===0'),'Preview uses Amazon image modules without independent-shop controls');
 check(await evaluate('document.querySelector(".store-header").getBoundingClientRect().bottom<=document.querySelector(".store-nav").getBoundingClientRect().top'),'Store hero appears above Amazon-style brand navigation');
 const html=fs.readFileSync(path.join(root,'razab-premium.html'),'utf8');
 check(!/(?:src|srcset|href)=["']assets\//.test(html)&&!html.includes('razab.com/products/'),'Standalone preview embeds all images and has no external checkout links');
 const layout=[];
 for(const width of [320,390,768,1024,1440]){
  await call('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<=700});
  await wait(200);await evaluate('Promise.all([...document.images].map(async image=>{for(let attempt=0;attempt<6;attempt++){try{await image.decode();return;}catch{await new Promise(resolve=>setTimeout(resolve,100));}}throw Error("Image did not decode: "+image.alt);}));');
  const state=await evaluate('({width:innerWidth,scroll:document.documentElement.scrollWidth,featureColumns:getComputedStyle(document.querySelector(".feature-row")).gridTemplateColumns.split(" ").length,splitColumns:getComputedStyle(document.querySelector(".split-row")).gridTemplateColumns.split(" ").length,prepWidth:document.querySelector("#meal-prep img").naturalWidth})');
  check(state.scroll<=width,'No page overflow at '+width+' px');
  check(state.prepWidth===(width<=700?1680:3000),'Correct dedicated mobile or desktop artwork at '+width+' px');
  check(state.featureColumns===(width<=700?2:4)&&state.splitColumns===(width<=700?1:2),'Image tile rows match the intended layout at '+width+' px');layout.push(state);
 }
 check(await evaluate('[...document.querySelectorAll("a[href^=\\"#\\"]")].every(link=>document.getElementById(link.getAttribute("href").slice(1)))'),'Preview navigation links have matching image sections');
 check(errors.length===0,'No browser JavaScript exceptions');
 for(const [name,width,height] of [['razab-premium-mobile.png',390,844],['razab-premium-desktop.png',1440,1000]]){
  await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<=700});
  await wait(200);await evaluate('Promise.all([...document.images].map(image=>image.decode()))');await evaluate('window.scrollTo(0,0)');await wait(100);
  const size=(await call('Page.getLayoutMetrics')).cssContentSize;
  const capture=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:0,y:0,width,height:Math.ceil(size.height),scale:1}});
  fs.writeFileSync(path.join(root,name),Buffer.from(capture.data,'base64'));
  const top=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
  fs.writeFileSync(path.join(root,width===1440?'razab-premium-hero.png':'razab-amazon-mobile-hero.png'),Buffer.from(top.data,'base64'));
  if(width===390){for(const id of ['food-storage','loaf-pans','everyday','storage-sets','meal-prep-pair','sizes','batch-storage','glass-care','brand-close']){
   await evaluate('document.getElementById('+JSON.stringify(id)+').scrollIntoView({behavior:"instant",block:"start"})');await wait(100);
   const detail=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
   fs.writeFileSync(path.join(root,'.qa','mobile-'+id+'.png'),Buffer.from(detail.data,'base64'));
  }}
 }
 check(manifest.modules.every(m=>!m.photographySource.startsWith('AI concept')),'No generated product scenes appear in the active storefront');
 const photoRecords=manifest.modules.flatMap(m=>m.sourceImages);
 check(photoRecords.length>9&&photoRecords.every(p=>p.source.startsWith('https://cdn.shopify.com/s/files/1/0648/7018/7256/files/')),'Every existing and new product photograph is traced to RAZAB’s official website gallery');
 check(photoRecords.every(p=>createHash('sha256').update(fs.readFileSync(path.join(root,p.file))).digest('hex')===p.sha256),'All cached manufacturer photographs match their recorded original file hashes');
 check(manifest.modules.every(m=>!/(35-piece|24-piece|9\.5 liter)/i.test(m.product||'')&&!/vented|steam-release/i.test(JSON.stringify(m.copy))),'Product labels, set counts and lid descriptions match the replacement products');
 const preserved=['01-header','02-welcome','03-meal-prep','04-glass','05-lids','06-lock','07-care','08-extra-large','09-loaf-pan','10-everyday','11-16pc-photo','12-16pc-copy','13-6500-copy','14-6500-photo','15-storage-sets','16-1860-prep'];
 const ids=manifest.modules.map(m=>m.id);
 check(preserved.every((id,i)=>ids.includes(id)&&(!i||ids.indexOf(id)>ids.indexOf(preserved[i-1]))),'The established benchmark sections retain their relative order');
 await navigate(path.join(assets,'module-artwork.html'));
 check(await evaluate('[...document.querySelectorAll(".scene")].every(img=>img.getAttribute("src").startsWith("../products/"))'),'All desktop and mobile photo artboards use manufacturer files exclusively');
 check(await evaluate('[...document.querySelectorAll(".prep .scene,.collection .scene")].every(img=>getComputedStyle(img).objectFit==="contain")'),'Full 16-piece product collections remain visible without photo cropping');
 const report={format:'Amazon image-block storefront / benchmark edition',checks:checks.length,passed:checks,exported,layout,exceptions:errors};
 fs.writeFileSync(path.join(root,'.qa','amazon-verification.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify({checks:checks.length,assets:exported.length,layout,exceptions:errors},null,2));
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>{if(socket){try{socket.send(JSON.stringify({id:99999,method:'Browser.close'}));}catch{}socket.close();}browser.kill();});
