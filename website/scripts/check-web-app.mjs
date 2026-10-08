import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { assertAppOpacity, inspectAppOpacity } from './check-app-opacity.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const base=process.env.CHECK_SITE_URL || 'http://localhost:3000';
const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{}),args:['--no-sandbox','--single-process','--no-zygote','--in-process-gpu','--disable-gpu']});
const context=await browser.newContext({viewport:{width:390,height:844}});
const page=await context.newPage();
const errors=[], results=[], screenAudits=[];
page.on('pageerror',error=>errors.push(error.message));
page.on('console',message=>{if(message.type()==='error') errors.push(message.text());});
page.on('request',request=>{if(/supabase\.co|graph\.facebook|api\.x\.com|api\.openai/.test(request.url())) errors.push(`Unexpected live-service request: ${request.url()}`);});
const text=name=>page.getByText(name,{exact:true}).filter({visible:true}).last();
const button=name=>page.getByRole('button',{name,exact:false}).filter({visible:true}).first();
async function ready() { await button('Create post').waitFor(); }
async function waitProbe(probe) { await page.getByPlaceholder(probe).or(text(probe)).first().waitFor(); }
async function fact(name) {
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,`${name}: horizontal overflow`);
  assert.equal(await page.locator('#browser-demo-banner').isVisible(),true);
  const content=await assertAppOpacity(page,name);
  results.push({width:page.viewportSize().width,check:name,url:new URL(page.url()).pathname,...content});
  console.log(`Passed ${page.viewportSize().width}px ${name}`);
}
async function create(caption) {
  await button('Create post').click();
  await page.getByPlaceholder('What would you like to share?').fill(caption);
  await button('Add media').click();
  await page.getByLabel('Photo',{exact:true}).first().click();
  await button('Add 1 item').click();
}
await mkdir(path.join(root,'qa'),{recursive:true});
const screenDirectory=path.join(root,'qa/app-screens');
await mkdir(screenDirectory,{recursive:true});
async function screen(name,mode,probes) {
  // Let short-lived success toasts dismiss so review images show the whole screen.
  await page.getByRole('alert').first().waitFor({state:'hidden',timeout:8000});
  const content=await assertAppOpacity(page,`${name} (${mode})`,probes);
  const images=page.locator('#root img').filter({visible:true});
  await images.evaluateAll(images=>Promise.race([
    Promise.all(images.map(image=>image.decode().catch(()=>{}))),
    new Promise(resolve=>setTimeout(resolve,5000)),
  ]));
  const screenshot=`${name}-${mode}.png`;
  await page.screenshot({path:path.join(screenDirectory,screenshot)});
  const record={screen:name,mode,width:390,url:new URL(page.url()).pathname,screenshot,...content};
  screenAudits.push(record); console.log(`Opaque 390px ${name} (${mode}): ${content.nodesChecked} content/ancestor nodes`);
}
async function home() { await page.goto(`${base}/app/`); await ready(); }
async function mobileScreenAudit() {
  await page.setViewportSize({width:390,height:844});
  await home(); await page.evaluate(()=>localStorage.clear()); await page.reload(); await ready();
  // Direct loads use the exact trailing-slash form reported in the review.
  const routes=[
    ['home','',['Create a post','Reach · 7 days']],
    ['posts','posts',['Search captions or channels']],
    ['calendar','calendar',['Calendar']],
    ['settings','profile',['Appearance','Connected accounts']],
    ['connections','connections',['Connected accounts']],
    ['insights','insights',['Total reach','Likes','Comments','Shares','Engagement','Posts sent']],
    ['templates','templates',['Templates']],
    ['compose','compose',['What would you like to share?']],
    ['publishing','publishing/p_reel',['You’re live']],
    ['post-detail','post/p_reel',['Channels','Performance']],
  ];
  for(const [name,route,probes] of routes) {
    await page.goto(`${base}/app/${route?`${route}/`:''}`);
    await waitProbe(probes[0]);
    if(name==='insights') {
      // Recreate the review's 10s+ idle, then scroll all the way down and back.
      // Checking ancestors of every stat label catches a faded parent card stack.
      await page.waitForTimeout(10500);
      await text('Posts sent').scrollIntoViewIfNeeded(); await assertAppOpacity(page,'Insights lower stat stack',probes);
      await text('Total reach').scrollIntoViewIfNeeded();
    }
    await screen(name,'direct',probes);
  }
  // Prove the checker rejects the reported failure rather than treating the
  // always-opaque heading as sufficient. Restore the style immediately.
  await page.goto(`${base}/app/insights/`); await text('Total reach').waitFor();
  const reach=text('Total reach');
  const original=await reach.evaluate(element=>{
    const stack=element.closest('.bg-card').parentElement;
    const original=stack.getAttribute('style'); stack.dataset.opacityNegativeControl=''; stack.style.opacity='0.15'; return original;
  });
  const negative=await inspectAppOpacity(page,['Total reach','Likes']);
  assert.ok(negative.issues.some(issue=>issue.opacity==='0.15'),'Opacity regression checker must reject a faded content ancestor');
  await page.locator('[data-opacity-negative-control]').evaluate((element,original)=>{
    if(original===null) element.removeAttribute('style'); else element.setAttribute('style',original);
    delete element.dataset.opacityNegativeControl;
  },original);
  await assertAppOpacity(page,'Opacity negative control restored',['Total reach','Likes']);
  // In-app navigation exercises mounted screens and remounts after filters change.
  await home(); await page.getByRole('tab',{name:'You',exact:true}).click();
  await screen('settings','navigation',['Appearance','Connected accounts']);
  for(const [name,label,probes] of [
    ['connections','Connected accounts',['Connected accounts']],
    ['insights','Insights',['Total reach','Likes','Comments','Shares','Engagement','Posts sent']],
    ['templates','Caption templates',['Templates']],
  ]) {
    await text(label).click(); await text(probes[0]).waitFor(); await screen(name,'navigation',probes);
    if(name==='insights') {
      for(const period of ['30 days','All time','7 days']) {
        await button(period).click(); await assertAppOpacity(page,`Insights ${period}`,probes);
      }
    }
    if(name==='templates') {
      await button('New').click(); await screen('template-editor','navigation',['Name (e.g. Launch hashtags)']);
      await button('Cancel').click();
    }
    await page.goBack();
  }
  await page.getByRole('tab',{name:'Posts',exact:true}).click();
  await screen('posts','navigation',['Search captions or channels']);
  for(const filter of ['Published','Drafts','Failed','All']) {
    await text(filter).click(); await assertAppOpacity(page,`Posts ${filter}`);
  }
  await button('Show as grid').click(); await assertAppOpacity(page,'Posts grid');
  await button('Show as list').click(); await assertAppOpacity(page,'Posts list');
  await page.getByRole('tab',{name:'Calendar',exact:true}).click();
  await screen('calendar','navigation',['Calendar']);
  for(const control of ['Next month','Previous month','Today']) {
    await button(control).click(); await assertAppOpacity(page,`Calendar ${control}`);
  }
  await page.getByRole('tab',{name:'Home',exact:true}).click();
  await screen('home','navigation',['Create a post','Reach · 7 days']);
  await button('Create post').click();
  const caption='One idea. Every stage. Browser animation audit.';
  await page.getByPlaceholder('What would you like to share?').fill(caption);
  await screen('compose','navigation',['What would you like to share?']);
  await button('Add media').click(); await screen('compose-media','navigation',['Media library']);
  await page.getByLabel('Photo',{exact:true}).first().click(); await button('Add 1 item').click();
  await page.getByLabel('Change channels',{exact:true}).filter({visible:true}).last().click();
  await screen('compose-accounts','navigation',['Post to']);
  await button('Done').click();
  await button('Improve with AI').click(); await button('Use this').waitFor();
  await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(button=>button.textContent==='Use this' && !button.disabled));
  await screen('compose-ai','navigation',['Assist']); await button('Use this').click();
  await button('Next').click(); await screen('compose-review','navigation',['Preview']);
  for(const tab of await page.getByRole('tab').filter({visible:true}).all()) {
    await tab.click(); await assertAppOpacity(page,'Platform preview change',['Preview']);
  }
  await button('Schedule').click(); await screen('compose-schedule','navigation',['Schedule']); await page.goBack();
  await button('Publish now').click(); await text('You’re live').waitFor({timeout:30000});
  await screen('publishing','navigation',['You’re live']);
  const publishingRoute=new URL(page.url()).pathname;
  await button('View post').click(); await text('Channels').waitFor();
  await screen('post-detail','navigation',['Channels']);
  const postRoute=new URL(page.url()).pathname;
  // Reload newly created IDs as well as the stable fixture URLs above.
  for(const [route,probe] of [[publishingRoute,'You’re live'],[postRoute,'Channels']]) {
    await page.goto(`${base}${route}/`); await text(probe).waitFor(); await assertAppOpacity(page,`Dynamic direct ${route}`,[probe]);
  }
  // The app intentionally keeps the unsaved working draft in memory. Cold tool
  // loads must render their usable empty states; navigation above checks results
  // and previews with a populated draft. Do not change persistence to suit QA.
  for(const [name,route,probes] of [
    ['compose-media','media',['Media library']],['compose-accounts','accounts',['Post to']],
    ['compose-ai','ai',['Assist','Write something first']],
    ['compose-review','review',['Preview','No channels selected']],['compose-schedule','schedule',['Schedule']],
  ]) {
    await page.goto(`${base}/app/compose/${route}/`); await text(probes[0]).waitFor();
    await screen(name,'direct',probes);
  }
  for(const [route,probe] of [['sign-in','Create a post'],['oauth/callback','Connected accounts']]) {
    await page.goto(`${base}/app/${route}/`); await text(probe).waitFor(); await assertAppOpacity(page,`${route} demo redirect`,[probe]);
  }
  for(const [name] of routes) {
    for(const mode of ['direct','navigation']) assert.ok(screenAudits.some(item=>item.screen===name && item.mode===mode),`Missing ${mode} audit for ${name}`);
  }
  const rows=routes.map(([name])=>`| ${name} | [Direct](${name}-direct.png) | [Navigation](${name}-navigation.png) | 1 |`).join('\n');
  await writeFile(path.join(screenDirectory,'README.md'),`# Browser app screenshots\n\n390 × 844, real Expo demo, final-state web content. Both direct loads and in-app navigation pass computed opacity/ancestor and unfinished-animation checks.\n\n| Screen | Direct URL | In-app navigation | Content opacity |\n| --- | --- | --- | --- |\n${rows}\n\nComposer media, accounts, AI, review and schedule also have paired screenshots. Template editor is captured during navigation. Exact URLs and node counts are in [results.json](results.json).\n`);
  await writeFile(path.join(screenDirectory,'results.json'),JSON.stringify({viewport:{width:390,height:844},negativeControlPassed:true,insightsIdleMs:10500,screens:screenAudits},null,2));
}
try {
  await mobileScreenAudit();
  for(const width of [390,1440]) {
    await page.setViewportSize({width,height:width===390?844:1000});
    await page.goto(`${base}/app/`);
    await ready(); await page.evaluate(()=>localStorage.clear()); await page.reload(); await ready();
    await fact('Home and demo banner');
    for(const tab of ['Posts','Calendar','You','Home']) {
      await page.getByRole('tab',{name:tab,exact:true}).click();
      await fact(`${tab} tab`);
    }
    await page.getByRole('tab',{name:'You',exact:true}).click();
    await text('Insights').click(); await button('30 days').click(); await button('All time').click();
    await fact('Insights period filters');
    await page.goBack();
    await text('Connected accounts').click(); await text('Disconnect').click();
    await page.getByRole('heading',{name:/^Disconnect .+\?/}).waitFor(); await button('Cancel').click();
    await fact('Connections and cancel dialog'); await page.goBack();
    await text('Caption templates').click(); await button('New').click();
    await page.getByPlaceholder('Name (e.g. Launch hashtags)').fill('Browser demo');
    await page.getByPlaceholder('Text to insert — a sign-off, a call to action, #hashtags…').fill('One idea. Every stage. #MultiPostly');
    await button('Save').click(); await text('Browser demo').waitFor();
    await page.getByRole('button',{name:'Delete Browser demo',exact:true}).click();
    await page.getByRole('button',{name:'Delete',exact:true}).click(); await fact('Template create and delete dialog');
    await page.goBack(); await text('Reset demo data').click(); await text('Reset demo data?').waitFor(); await button('Cancel').click();
    await fact('Reset confirmation');
    await page.getByRole('tab',{name:'Home',exact:true}).click();
    await create(`MultiPostly browser demo at ${width}px. One post, every stage.`);
    await button('Improve with AI').click(); await button('Use this').waitFor();
    await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent==='Use this' && !b.disabled));
    await button('Use this').click(); await fact('Demo AI applies caption');
    await button('Next').click(); await button('Publish now').click();
    await text('You’re live').waitFor({timeout:30000});
    await fact('Compose → preview → publish to three channels');
    const publishedUrl=page.url(); await page.reload(); await text('You’re live').waitFor();
    assert.equal(page.url(),publishedUrl); await fact('Dynamic publishing deep-link reload');
    await page.screenshot({path:path.join(root,`qa/app-published-${width}.png`)});
    await page.goto(`${base}/app/`); await ready(); await page.getByRole('tab',{name:'Posts'}).click();
    await fact('Published post persists');
    await page.getByRole('tab',{name:'Home'}).click();
    await create(`Scheduled demo from ${width}px browser.`); await button('Next').click(); await button('Schedule').click();
    await page.getByLabel('Scheduled time').fill('20:30');
    await button('Schedule post').click(); await ready(); await fact('Web time picker and schedule');
    if(width===390) {
      await button('Create post').click();
      await page.getByPlaceholder('What would you like to share?').fill('Picked photo in the MultiPostly browser demo.');
      await button('Add media').click();
      const chooser=page.waitForEvent('filechooser'); await text('Photo library').click();
      await (await chooser).setFiles(path.join(root,'public/images/creator-hands.webp'));
      await page.waitForURL('**/app/compose'); await button('Next').click(); await button('Publish now').click();
      await text('You’re live').waitFor({timeout:30000}); await button('View post').click();
      await page.waitForURL('**/app/post/*'); await page.reload();
      await page.waitForFunction(()=>[...document.images].some(image=>image.src.startsWith('data:image/') && image.complete && image.naturalWidth>0));
      await fact('Picked photo survives post deep-link reload');
    }
    for(const [route,label] of [['compose','What would you like to share?'],['insights','Insights'],['templates','Templates'],['connections','Connected accounts']]) {
      await page.goto(`${base}/app/${route}`);
      if(route==='compose') await page.getByPlaceholder(label).waitFor(); else await text(label).waitFor();
      await fact(`Direct /app/${route}`);
    }
    await page.goto(`${base}/app/`); await ready();
    await page.screenshot({path:path.join(root,`qa/app-home-${width}.png`)});
  }
  assert.deepEqual(errors,[],'Browser errors or unexpected live-service calls');
  await writeFile(path.join(root,'qa/app-check-results.json'),JSON.stringify({results,screenAudits,errors},null,2));
  console.log(`Real Expo app: ${results.length} functional checks and ${screenAudits.length} screen opacity/screenshot checks passed, zero console errors.`);
} finally { await browser.close(); }
