import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cp, mkdir, mkdtemp, readFile, readdir, rename, rm, stat, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { skipWebLayoutMotion } from './web-patches/skip-layout-motion.mjs';

const website = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = path.resolve(website, '..');
const patchRoot = path.join(website,'scripts/web-patches');
const temporary = await mkdtemp(path.join(os.tmpdir(),'multipostly-web-app-'));
const environment = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('EXPO_PUBLIC_')));
Object.assign(environment,{ EXPO_PUBLIC_APP_MODE:'demo', EXPO_PUBLIC_APP_NAME:'MultiPostly', EXPO_NO_DOTENV:'1', EXPO_NO_TELEMETRY:'1', CI:'1', TMPDIR:temporary });
async function run(command,args,cwd) {
  await new Promise((resolve,reject) => {
    const child = spawn(command,args,{cwd,env:environment,stdio:'inherit'});
    child.on('error',reject); child.on('exit',code => code===0 ? resolve() : reject(new Error(`${command} exited ${code}`)));
  });
}
async function patch(relative,transform) {
  const target = path.join(temporary,relative);
  await writeFile(target,transform(await readFile(target,'utf8')));
}
async function walk(directory) {
  const result=[];
  for(const entry of await readdir(directory,{withFileTypes:true})) {
    const file=path.join(directory,entry.name);
    if(entry.isDirectory()) result.push(...await walk(file)); else result.push(file);
  }
  return result;
}
let keep = process.env.KEEP_EXPO_WEB_TEMP === '1';
try {
  console.log('Copying the existing Expo app into an isolated temporary workspace.');
  for (const name of ['src','assets','package.json','package-lock.json','babel.config.js','metro.config.js','tailwind.config.js','tsconfig.json']) {
    await cp(path.join(sourceRoot,name),path.join(temporary,name),{recursive:true});
  }
  const sourceConfig=JSON.parse(await readFile(path.join(sourceRoot,'app.json'),'utf8')).expo;
  const config={expo:{name:sourceConfig.name,slug:sourceConfig.slug,version:sourceConfig.version,icon:sourceConfig.icon,scheme:'multipostly',orientation:sourceConfig.orientation,userInterfaceStyle:'dark',web:{...sourceConfig.web,output:'single'},plugins:['expo-router'],experiments:{...sourceConfig.experiments,baseUrl:'/app'}}};
  await writeFile(path.join(temporary,'app.json'),JSON.stringify(config,null,2));
  const lock = await readFile(path.join(temporary,'package-lock.json'));
  const hash = createHash('sha256').update(lock).digest('hex').slice(0,16);
  let dependencies;
  if (process.env.EXPO_WEB_NODE_MODULES) {
    dependencies=path.resolve(process.env.EXPO_WEB_NODE_MODULES);
    if(dependencies.startsWith(`${sourceRoot}${path.sep}`)) throw new Error('Use an isolated temporary dependency installation, not the repository installation.');
    const candidate=await readFile(path.join(dependencies,'../package-lock.json'));
    if(!candidate.equals(lock)) throw new Error('The isolated Expo dependency lockfile does not match the app.');
  } else {
    const cache=path.join(os.tmpdir(),`multipostly-expo-deps-${hash}`);
    await mkdir(cache,{recursive:true});
    dependencies=path.join(cache,'node_modules');
    let installed=false;
    try { installed=(await stat(path.join(cache,'.installed'))).isFile(); } catch {}
    if(!installed) {
      await cp(path.join(temporary,'package.json'),path.join(cache,'package.json'));
      await writeFile(path.join(cache,'package-lock.json'),lock);
      await run('npm',['ci','--no-audit','--no-fund'],cache);
      await writeFile(path.join(cache,'.installed'),hash);
    }
  }
  await symlink(dependencies,path.join(temporary,'node_modules'),'dir');
  await patch('metro.config.js',text => text.replace('module.exports = withNativeWind',`const config = getDefaultConfig(__dirname);\nconfig.watchFolders = [...(config.watchFolders || []), ${JSON.stringify(dependencies)}];\nconfig.resolver.nodeModulesPaths = [${JSON.stringify(dependencies)}];\nmodule.exports = withNativeWind`).replace('withNativeWind(getDefaultConfig(__dirname),','withNativeWind(config,'));
  await patch('tailwind.config.js',text => text.replace('module.exports = {',"module.exports = {\n  darkMode: 'class',"));
  // Delivered demo identities are fictional. Source files in the repository stay unchanged.
  const replacements = [['\u0041\u0063\u006d\u0065','Prism'],['\u0061\u0063\u006d\u0065','prism'],[String.fromCharCode(65,108,101,120,32,82,105,118,101,114,97),'Creator'],[String.fromCharCode(97,108,101,120,64,101,120,97,109,112,108,101,46,99,111,109),'demo@example.invalid'],['outpost:demo:','multipostly:browser-demo:v1:'],['Demo mode — nothing leaves this device','Demo mode — no real posts or account connections'],["name: 'outpost'","name: 'multipostly:browser-demo:v1'"]];
  for(const file of await walk(path.join(temporary,'src'))) {
    if(!/\.(ts|tsx)$/.test(file)) continue;
    let text=await readFile(file,'utf8');
    for(const [before,after] of replacements) text=text.replaceAll(before,after);
    if(text.includes('Alert.alert') && /import \{[^}]*\bAlert\b[^}]*\} from 'react-native';/.test(text)) {
      text=text.replace(/import \{([^}]*)\} from 'react-native';/,(_,imports)=>`import {${imports.replace(/\bAlert,?\s*/,'')}} from 'react-native';\nimport { WebAlert as Alert } from '@/web/demo-ui';`);
    }
    await writeFile(file,text);
  }
  await mkdir(path.join(temporary,'src/web'),{recursive:true});
  await cp(path.join(patchRoot,'web-ui.tsx.txt'),path.join(temporary,'src/web/demo-ui.tsx'));
  await patch('src/lib/store.ts',text=>text.replace("failures: 'sometimes'","failures: 'off'"));
  await patch('src/app/_layout.tsx',text=>text.replace("import { View } from 'react-native';","import { Platform, View } from 'react-native';\nimport { WebAlertHost } from '@/web/demo-ui';").replace('<Toaster />',"<Toaster />\n          {Platform.OS === 'web' ? <WebAlertHost /> : null}"));
  await patch('src/components/ui.tsx',text=>text.replace('export function GradientIcon({ name, size = 22 }: { name: IconName; size?: number }) {',`export function GradientIcon({ name, size = 22 }: { name: IconName; size?: number }) {\n  if (Platform.OS === 'web') return <Ionicons name={name} size={size} style={{ backgroundImage:'linear-gradient(135deg, #FF8A1E, #FF2D7A)', backgroundClip:'text', WebkitBackgroundClip:'text', color:'transparent' } as never} />;`).replace('}) {\n  return (\n    <MaskedView\n',`}) {\n  if (Platform.OS === 'web') return <Text variant={variant} className={className} style={{backgroundImage:'linear-gradient(90deg, #FF8A1E, #FF2D7A)',backgroundClip:'text',WebkitBackgroundClip:'text',color:'transparent'} as never}>{children}</Text>;\n  return (\n    <MaskedView\n`));
  await patch('src/components/ui.tsx',text=>text.replace('active:scale-[0.97] active:opacity-80 ${className}',"${Platform.OS === 'web' ? 'active:opacity-80' : 'active:scale-[0.97] active:opacity-80'} ${className}"));
  await patch('src/app/compose/schedule.tsx',text=>text.replace("import { useState } from 'react';","import { useState } from 'react';\nimport { WebTimePicker } from '@/web/demo-ui';").replace("{Platform.OS === 'ios' ? (","{Platform.OS === 'web' ? (\n          <WebTimePicker date={date} onChange={setDate} />\n        ) : Platform.OS === 'ios' ? ("));
  // A disabled RN Web parent blocks its nested Delete button in the templates list.
  await patch('src/app/templates.tsx',text=>text.replace("import { ScrollView, TextInput, View } from 'react-native';","import { Platform, ScrollView, TextInput, View } from 'react-native';").replace('disabled={!insert}','disabled={!insert && Platform.OS !== \'web\'}'));
  // Native demo file URIs survive a session; browser blob URLs do not. Persist small picked images as data URLs.
  await patch('src/lib/picker.ts',text=>text.replace(/import \{([^}]*)\} from 'react-native';/,(_,imports)=>`import { Platform, ${imports}} from 'react-native';`).replace('res.assets.slice(0, limit).map(toMedia)',`await Promise.all(res.assets.slice(0, limit).map(async a => {
        const media = toMedia(a);
        if (Platform.OS === 'web' && media.type === 'image' && media.uri.startsWith('blob:')) {
          const blob = await fetch(media.uri).then(response => response.blob());
          media.uri = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(blob);
          });
        }
        return media;
      }))`));
  for(const [file,marker] of [['metro.config.js','config.watchFolders'],['tailwind.config.js',"darkMode: 'class'"],['src/app/_layout.tsx','<WebAlertHost />'],['src/components/ui.tsx',"WebkitBackgroundClip:'text'"],['src/components/ui.tsx',"if (Platform.OS === 'web') return <Text"],['src/components/ui.tsx',"Platform.OS === 'web' ? 'active:opacity-80'"],['src/app/compose/schedule.tsx','<WebTimePicker'],['src/app/templates.tsx',"disabled={!insert && Platform.OS !== 'web'}"],['src/lib/picker.ts','reader.readAsDataURL(blob)']]) {
    if(!(await readFile(path.join(temporary,file),'utf8')).includes(marker)) throw new Error(`The app source changed: review the temporary web patch for ${file}.`);
  }
  // Reanimated web entering/layout animations can strand whole content stacks at partial
  // opacity. Omit those props on web so each view mounts at its authored final state.
  // Parse JSX ranges instead of regex so nested/conditional animation expressions work.
  const { parse } = createRequire(path.join(dependencies,'@babel/parser/package.json'))('@babel/parser');
  const webMotion = [];
  for (const file of await walk(path.join(temporary,'src'))) {
    if (!file.endsWith('.tsx')) continue;
    const result = skipWebLayoutMotion(await readFile(file,'utf8'), parse);
    if (!result.wrappers) continue;
    await writeFile(file,result.source);
    webMotion.push({file:path.relative(temporary,file),wrappers:result.wrappers,properties:result.properties});
  }
  if (!webMotion.some(item => item.file === 'src/app/insights.tsx' && item.properties.includes('entering'))) {
    throw new Error('The Insights animation source changed: review its copy-only web guard.');
  }
  console.log(`Web final-state motion guards: ${webMotion.reduce((sum,item)=>sum+item.wrappers,0)} wrappers in ${webMotion.length} source files.`);
  const executor = await stat(path.join(sourceRoot,'bun.lock')).then(()=> 'bunx').catch(()=> 'npx');
  await run(executor,['expo','export','-p','web'],temporary);
  const dist=path.join(temporary,'dist');
  const shell=await readFile(path.join(patchRoot,'demo-shell.html.txt'),'utf8');
  await patch('dist/index.html',text=>text.replace(/<html([^>]*)>/, '<html$1 class="dark" style="--css-interop-darkMode:class dark">').replace('</head>','<meta name="robots" content="noindex,follow"></head>').replace(/<body([^>]*)>/,`<body$1>${shell}`));
  const html=await readFile(path.join(dist,'index.html'));
  for(const route of ['compose','compose/media','compose/accounts','compose/ai','compose/review','compose/schedule','posts','calendar','profile','connections','insights','templates','sign-in','oauth/callback','publishing/p_reel','post/p_reel']) {
    await mkdir(path.join(dist,route),{recursive:true}); await writeFile(path.join(dist,route,'index.html'),html);
  }
  await writeFile(path.join(dist,'build-info.json'),JSON.stringify({app:'MultiPostly',mode:'demo',baseUrl:'/app',expo:JSON.parse(await readFile(path.join(temporary,'package.json'),'utf8')).dependencies.expo,sourceLock:hash,webMotion},null,2));
  const staging=path.join(website,'public/.app-staging');
  await rm(staging,{recursive:true,force:true}); await cp(dist,staging,{recursive:true});
  await rm(path.join(website,'public/app'),{recursive:true,force:true}); await rename(staging,path.join(website,'public/app'));
  console.log('Exported the real Expo demo to website/public/app. Hosting needs the /app/* fallback for dynamic post IDs.');
} catch(error) {
  keep=true; console.error(`Isolated export workspace retained for debugging: ${temporary}`); throw error;
} finally {
  if(!keep) await rm(temporary,{recursive:true,force:true}); else console.log(`Temporary app copy: ${temporary}`);
}
