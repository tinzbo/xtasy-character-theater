import { build } from 'esbuild';
await build({
 entryPoints:['server/index.ts'], outfile:'dist-server/index.js', bundle:true,
 platform:'node', target:'node22', format:'esm', packages:'external',
 define:{'process.env.NODE_ENV':'"production"'}, sourcemap:false, logLevel:'info'
});
