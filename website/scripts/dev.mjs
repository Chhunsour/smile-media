import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const website=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
// Polling also covers Next's route/public-file watchers on external drives and restricted macOS environments.
const child=spawn(process.execPath,[path.join(website,'node_modules/next/dist/bin/next'),'dev','--webpack','--port',process.env.PORT || '3000'],{cwd:website,env:{...process.env,WATCHPACK_POLLING:'true'},stdio:'inherit'});
for(const signal of ['SIGINT','SIGTERM']) process.on(signal,()=>child.kill(signal));
child.on('error',error=>{console.error(error);process.exitCode=1;});
child.on('exit',code=>{process.exitCode=code || 0;});
