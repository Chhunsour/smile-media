import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const base = process.env.CHECK_SITE_URL || "http://localhost:3000";
const browser = await chromium.launch({ headless:true, ...(process.env.CHROME_PATH ? { executablePath:process.env.CHROME_PATH } : {}), args:["--no-sandbox","--single-process","--no-zygote","--in-process-gpu","--disable-gpu"] });
const context = await browser.newContext({viewport:{width:375,height:900},reducedMotion:"reduce"});
const page = await context.newPage();
const errors = [];
page.on("pageerror",error=>errors.push(error.message));
const pages = ["/", "/features/", "/platforms/", "/pricing/", "/faq/", "/privacy/", "/terms/", "/download/"];
const failures = [];
const results = [];
await mkdir(path.join(root,"qa"),{recursive:true});
try {
  const widths=[375,390,768,900,1024,1280,1440,1920];
  for(const width of widths) {
    await page.setViewportSize({width,height:900});
    for(const route of pages) {
      const response = await page.goto(`${base}${route}`,{waitUntil:"networkidle"});
      await page.evaluate(()=>document.querySelectorAll("img").forEach(i=>i.loading="eager"));
      await page.locator("footer").scrollIntoViewIfNeeded();
      await page.evaluate(async()=>{ await document.fonts.ready; await Promise.all([...document.images].map(i=>i.decode().catch(()=>{}))); });
      const facts = await page.evaluate(()=>({
        overflow:document.documentElement.scrollWidth>innerWidth+1,
        h1:document.querySelectorAll("h1").length,
        broken:[...document.images].filter(i=>!i.complete || i.naturalWidth===0).map(i=>i.src),
        canonical:document.querySelector('link[rel="canonical"]')?.href,
        og:document.querySelector('meta[property="og:image"]')?.content,
        forbidden:/\b\u0061\u0063\u006d\u0065\b/i.test(document.body.innerText),
        schemas:[...document.querySelectorAll('script[type="application/ld+json"]')].map(s=>JSON.parse(s.textContent)),
      }));
      if(response.status()!==200 || facts.overflow || facts.h1!==1 || facts.broken.length || !facts.canonical || !facts.og || facts.forbidden) failures.push({width,route,facts,status:response.status()});
      if(width===375 || width===1440) {
        const audit=await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21a","wcag21aa"]).analyze();
        if(audit.violations.length) failures.push({width,route,accessibility:audit.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))});
      }
      console.log(`Checked ${width}px ${route}`);
      results.push({width,route,status:response.status(),overflow:facts.overflow,brokenImages:facts.broken.length});
      if(route==="/" && [375,1440].includes(width)) { await page.evaluate(()=>scrollTo(0,0)); await page.screenshot({path:path.join(root,`qa/home-${width}.png`),fullPage:true}); }
    }
    if(errors.length) failures.push({width,browserErrors:errors});

  }
  await page.emulateMedia({reducedMotion:"no-preference"});
  for(const width of [375,900,1440]) {
    await page.setViewportSize({width,height:900});
    await page.goto(base,{waitUntil:"networkidle"});
    for(const progress of [0,0.5,1]) {
      const overflow=await page.evaluate(p=>{
        for(const a of document.getAnimations()) if(a.effect?.target.closest?.(".anim-rise")) a.currentTime=p*Number(a.effect.getTiming().duration);
        return document.documentElement.scrollWidth>innerWidth+1;
      },progress);
      if(overflow) failures.push({width,motionProgress:progress,overflow:true});
    }
  }
  await page.setViewportSize({width:1440,height:900});
  await page.goto(base,{waitUntil:"networkidle"});
  await page.getByRole("navigation",{name:"Main",exact:true}).getByRole("link",{name:"Features",exact:true}).click();
  await page.waitForURL("**/features/");
  await page.emulateMedia({reducedMotion:"reduce"});
  await page.setViewportSize({width:375,height:844});
  await page.goto(base,{waitUntil:"networkidle"});
  await page.getByRole("button",{name:"Open menu"}).click();
  if(!(await page.getByRole("navigation",{name:"Mobile",exact:true}).isVisible())) failures.push("Mobile menu did not open");
  await page.getByRole("navigation",{name:"Mobile",exact:true}).getByRole("link",{name:"Features",exact:true}).click();
  await page.waitForURL("**/features/");
  if(await page.getByRole("navigation",{name:"Mobile",exact:true}).isVisible()) failures.push("Mobile menu did not close after navigation");
  await page.goto(base,{waitUntil:"networkidle"});
  const first=page.locator("summary").first();
  await first.focus(); await page.keyboard.press("Enter");
  if(!(await page.locator("details").first().getAttribute("open")!==null)) failures.push("Keyboard FAQ toggle did not open");
  await page.getByRole("button",{name:"Instagram",exact:false}).click();
  await page.getByRole("button",{name:"Publish to 5 platforms"}).click();
  await page.getByText("Done — live on 5 platforms in this preview.").waitFor();
  await page.waitForTimeout(500); // let the button’s short opacity transition settle
  const runningAnimations=await page.evaluate(()=>document.getAnimations().filter(a=>a.playState==="running").length);
  if(runningAnimations) failures.push({reducedMotionRunningAnimations:runningAnimations});

  const noJsBrowser=await chromium.launch({headless:true,args:["--no-sandbox","--single-process","--no-zygote","--in-process-gpu","--disable-gpu"],...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
  const noJs=await noJsBrowser.newContext({javaScriptEnabled:false,viewport:{width:375,height:844}});
  const staticPage=await noJs.newPage();
  await staticPage.goto(base); await staticPage.locator("summary").first().click();
  if(await staticPage.locator("details").first().getAttribute("open")===null) failures.push("FAQ unavailable without JavaScript");
  if(await staticPage.locator("h1").count()!==1) failures.push("Server-rendered headline unavailable without JS");

  await noJsBrowser.close();
  for(const asset of ["/robots.txt","/sitemap.xml","/llms.txt","/llms-full.txt","/manifest.webmanifest","/og.png","/favicon.ico"]) {
    const r=await fetch(`${base}${asset}`);
    if(!r.ok) failures.push({asset,status:r.status});
  }
  await writeFile(path.join(root,"qa/check-results.json"),JSON.stringify({results,failures},null,2));
  console.log(JSON.stringify({viewports:8,pages:8,pageChecks:results.length,failures},null,2));
  if(failures.length) process.exitCode=1;
} finally { await browser.close(); }
