#!/bin/sh
# Run inside the optional audit image or an isolated Linux audit environment.
set -eu
serve /site -l 4173 --no-clipboard --no-request-logging >/tmp/multipostly-serve.log 2>&1 &
site_pid=$!
trap 'kill "$site_pid" 2>/dev/null || true' EXIT
node -e 'const wait=async()=>{for(let i=0;i<30;i++){try{const r=await fetch("http://127.0.0.1:4173");if(r.ok)return;}catch{}await new Promise(r=>setTimeout(r,200));}process.exit(1);};wait();'
for page in features platforms pricing faq download privacy terms; do
  lighthouse "http://127.0.0.1:4173/$page/" --chrome-flags="--headless=new --no-sandbox --disable-dev-shm-usage" --only-categories=performance,seo,accessibility,best-practices --output=json --output=html --output-path="/reports/mobile-$page-lighthouse" --quiet
  node -e 'const fs=require("fs");const page=process.argv[1];const r=JSON.parse(fs.readFileSync(`/reports/mobile-${page}-lighthouse.report.json`));const scores=Object.fromEntries(Object.entries(r.categories).map(([k,v])=>[k,v.score===null?null:Math.round(v.score*100)]));console.log(JSON.stringify({page,scores}));if(Object.values(scores).some(s=>s===null||s<90))process.exitCode=1;' "$page"
done
