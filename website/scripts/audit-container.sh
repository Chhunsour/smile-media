#!/bin/sh
set -eu
serve /site -l 4173 --no-clipboard --no-request-logging >/tmp/multipostly-serve.log 2>&1 &
site_pid=$!
trap 'kill "$site_pid" 2>/dev/null || true' EXIT
node -e 'const wait=async()=>{for(let i=0;i<30;i++){try{const r=await fetch("http://127.0.0.1:4173");if(r.ok)return;}catch{}await new Promise(r=>setTimeout(r,200));}process.exit(1);};wait();'
lighthouse http://127.0.0.1:4173 --chrome-flags="--headless=new --no-sandbox --disable-dev-shm-usage" --only-categories=performance,seo,accessibility,best-practices --output=json --output=html --output-path=/reports/mobile-lighthouse --quiet
node -e 'const fs=require("fs");const r=JSON.parse(fs.readFileSync("/reports/mobile-lighthouse.report.json"));const scores=Object.fromEntries(Object.entries(r.categories).map(([k,v])=>[k,v.score===null?null:Math.round(v.score*100)]));fs.writeFileSync("/reports/lighthouse-scores.json",JSON.stringify({mode:"mobile",chrome:r.environment.hostUserAgent,scores},null,2));console.log(JSON.stringify(scores));if(Object.values(scores).some(s=>s===null||s<90))process.exitCode=1;'
