import { chromium } from "playwright";
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

// Use only an isolated demo Metro instance on 8082. Labels are replaced in the
// browser response, preserving the app's actual components and screen layouts.
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const browser=await chromium.launch({headless:true,args:["--no-sandbox","--single-process","--no-zygote","--in-process-gpu","--disable-gpu"],...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,colorScheme:"dark"});
await context.route(url => url.hostname === "localhost" && url.port === "8082" && !url.pathname.includes("."), async route => {
  const response = await route.fetch();
  if ((response.headers()["content-type"] || "").includes("text/html")) {
    const body = (await response.text()).replace('<html lang="en">', '<html lang="en" class="dark" style="--css-interop-darkMode:class dark">');
    await route.fulfill({response,body});
  } else await route.fulfill({response});
});
await context.route(/\.bundle\?/,async route=>{
  const response=await route.fetch({timeout:600000});
  const body=(await response.text()).replaceAll("\u0041\u0063\u006d\u0065","Prism").replaceAll("\u0061\u0063\u006d\u0065","prism").replaceAll(String.fromCharCode(65,108,101,120,32,82,105,118,101,114,97),"Creator").replaceAll(String.fromCharCode(97,108,101,120,64,101,120,97,109,112,108,101,46,99,111,109),"demo@example.invalid").replaceAll(String.fromCharCode(65,108,101,120),"Creator");
  await route.fulfill({response,body});
});
const page=await context.newPage();
page.on("pageerror",e=>console.log("App browser error:",e.message));
await mkdir(path.join(root,"public/screens"),{recursive:true});
async function capture(name) {
  await page.evaluate(async()=>{ await document.fonts.ready; await Promise.all([...document.images].map(i=>i.decode().catch(()=>{}))); });
  // MaskedView's web fallback draws its black mask glyph instead of the native
  // gradient. Restore only those pure-black Ionicons in the capture DOM.
  const restored=await page.evaluate(()=>{
    let count=0;
    for(const element of document.querySelectorAll('div')) {
      const style=getComputedStyle(element);
      if(!style.fontFamily.toLowerCase().includes('ionicons') || style.color!=='rgb(0, 0, 0)' || !element.textContent?.trim()) continue;
      Object.assign(element.style,{backgroundImage:'linear-gradient(135deg, #ff8a00, #ff2d8d)',backgroundClip:'text',webkitBackgroundClip:'text',color:'transparent'});
      element.dataset.gradientRestored='true'; count++;
    }
    return count;
  });
  await page.waitForTimeout(900);
  const text=await page.locator("body").innerText();
  if(/\b\u0061\u0063\u006d\u0065\b/i.test(text)) throw new Error("Disallowed demo identity remained on screen");
  const png=await page.screenshot({path:path.join(root,`public/screens/${name}.png`)});
  await sharp(png).resize(780,1688).webp({quality:82}).toFile(path.join(root,`public/screens/${name}.webp`));
  console.log(`Captured ${name}; restored ${restored} gradient mask glyphs`);
}
try {
  await page.goto("http://localhost:8082",{waitUntil:"domcontentloaded",timeout:600000});
  await page.getByText("Create a post",{exact:false}).first().waitFor({timeout:600000});
  if(process.env.CAPTURE_INSPECT) {
    console.log((await page.locator("body").innerText()).slice(0,5000));
    await capture("home");
    await writeFile(path.join(root,"qa/app-storage.json"),JSON.stringify(await page.evaluate(()=>({...localStorage})),null,2));
  } else {
    if (!process.env.CAPTURE_COMPOSE_ONLY) {
    await capture("home");
    for(const [name,route] of [["connections","/connections"],["insights","/insights"],["templates","/templates"],["calendar","/calendar"],["posts","/posts"]]) {
      await page.goto(`http://localhost:8082${route}`,{waitUntil:"networkidle",timeout:60000});
      await capture(name);
    }
    }
    await page.goto("http://localhost:8082",{waitUntil:"networkidle"});
    await page.getByText("Create a post",{exact:false}).first().click();
    console.log("Composer:",(await page.locator("body").innerText()).slice(0,4000));
    await page.getByPlaceholder("What would you like to share?").fill("A little behind the scenes. A lot of what’s next. ✨\n\nYour next idea deserves a bigger stage.\n#createeveryday #behindthescenes");
    await page.getByText("Photo / video", {exact:true}).click();
    await page.getByRole("checkbox", {name:"Photo", exact:true}).first().waitFor();
    await page.getByRole("checkbox", {name:"Photo", exact:true}).first().click();
    await page.getByText("Add 1 item",{exact:true}).click();
    await page.getByPlaceholder("What would you like to share?").waitFor();
    await capture("compose");
    await page.goto("http://localhost:8082/publishing/p_reel", {waitUntil:"networkidle"});
    await page.getByText("You’re live", {exact:true}).waitFor();
    await capture("publishing");
  }
} finally { await browser.close(); }
