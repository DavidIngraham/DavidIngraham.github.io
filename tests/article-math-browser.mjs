/* iPad-sized rendering with CDNs blocked, accessibility and load/retry regression. */

const {chromium,webkit} = await import(process.env.PLAYWRIGHT_MODULE || '@playwright/test');
import {fileURLToPath} from 'node:url';
import {readFile,writeFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
const site=fileURLToPath(new URL('../',import.meta.url));
const source=process.argv[2];
if(!source)throw Error('Pass the micro-agu source checkout as the first argument.');
const server=spawn('python3',['-m','http.server','4209','--bind','127.0.0.1','--directory',site],{stdio:'ignore'});
const engine=process.env.ENGINE||'chromium';
const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true,...(engine==='webkit' && process.env.WEBKIT_EXECUTABLE?{executablePath:process.env.WEBKIT_EXECUTABLE}:{})});
const page=await browser.newPage({viewport:{width:820,height:1180},isMobile:true,hasTouch:true});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('https://raw.githubusercontent.com/DavidIngraham/micro-agu/main/**',async route=>{
 const path=decodeURIComponent(new URL(route.request().url()).pathname.split('/main/')[1]);
 if(path.endsWith('.md')){
  try{await route.fulfill({status:200,contentType:'text/plain',body:await readFile(source+'/'+path,'utf8')});}
  catch{await route.abort();}
 }else await route.abort();
});
await page.route('**/*',async route=>{
 if(['image','media'].includes(route.request().resourceType()) || /cdn.jsdelivr.net|cdnjs.cloudflare.com|unpkg.com/.test(route.request().url()))await route.abort();
 else await route.fallback();
});
const report=[];
try{
 const manifest=JSON.parse(await readFile(site+'/publish-manifest.json','utf8'));
 const articles=manifest.collections.find(x=>x.id==='ardupilot-tinkering').pages.filter(x=>x.id==='first-flight-controller');
 for(const article of articles){
  const text=await readFile(source+'/'+article.path,'utf8');
  if(!text.includes('$'))continue;
  await page.goto('http://127.0.0.1:4209/research/?collection=ardupilot-tinkering&article='+article.id);
  await page.waitForFunction(()=>document.querySelectorAll('.article-math').length>0 && [...document.querySelectorAll('.article-math')].every(e=>e.querySelector('mjx-container')),null,{timeout:60000});
  const result=await page.evaluate(()=>({
   equations:document.querySelectorAll('.article-math').length,
   speechLabels:document.querySelectorAll('.article-math [aria-label]').length,
   errors:[...document.querySelectorAll('[data-mml-node="merror"]')].map(e=>e.textContent),
   overflow:[...document.querySelectorAll('.article-math[data-display="true"]')].filter(e=>e.getBoundingClientRect().right>innerWidth+2).length
  }));
  if(result.errors.length||result.overflow||!result.speechLabels)throw Error(JSON.stringify({id:article.id,...result}));
  report.push({id:article.id,...result});console.log(article.id,result.equations);
  if(article.id==='first-flight-controller'){
   await page.locator('.article-math').first().scrollIntoViewIfNeeded();
   if(process.env.MATH_SCREENSHOT)await page.screenshot({path:process.env.MATH_SCREENSHOT});
  }
 }
 for(const id of []){
  await page.goto('http://127.0.0.1:4209/ardupilot-tinkering/'+id+'.html');
  await page.waitForSelector('.article-math mjx-container',{timeout:60000});
  report.push({legacy:id,passed:true});
 }
 
 await page.setViewportSize({width:1180,height:820});
 await page.evaluate(async()=>{
   const holder=document.createElement('div');
   holder.className='article-math';holder.dataset.display='true';
   holder.textContent='\\mathbb{R}\\quad\\mathfrak{g}';
   document.querySelector('article').append(holder);
   await window.renderArticleMath(document.querySelector('article'));
 });
 await page.waitForFunction(()=>[...document.querySelectorAll('.article-math')].every(e=>e.dataset.rendered==='true'));
 let failOnce=true;
 await page.route('**/vendor/mathjax-4.0.0/tex-svg.js',route=>{
   if(failOnce){failOnce=false;return route.abort();}
   return route.continue();
 });
 await page.reload();
 await page.getByRole('button',{name:'Retry equations'}).waitFor({timeout:30000});
 await page.getByRole('button',{name:'Retry equations'}).click();
 await page.waitForFunction(()=>document.querySelectorAll('.article-math').length>0 && [...document.querySelectorAll('.article-math')].every(e=>e.dataset.rendered==='true'),null,{timeout:60000});
 if(await page.locator('.math-load-error').count())throw Error('Retry notice persisted');
 report.push({cdnBlocked:true,retryPassed:true});
 if(errors.length)throw Error(JSON.stringify(errors));

 console.log(JSON.stringify({passed:true,engine,report},null,2));
}finally{await browser.close();server.kill();}
