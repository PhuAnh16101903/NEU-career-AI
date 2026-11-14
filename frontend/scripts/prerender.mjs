import {build} from 'vite';
import react from '@vitejs/plugin-react';
import {renderToString} from 'react-dom/server';
import {createElement} from 'react';
import {readFile,writeFile,rm} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const directory=path.resolve('.prerender');
try {
 await build({configFile:false,plugins:[react()],build:{ssr:'src/prerender.jsx',outDir:directory,emptyOutDir:true,minify:false}});
 const {default:HomePage}=await import(pathToFileURL(path.join(directory,'prerender.js')).href);
 const html=await readFile('dist/index.html','utf8');
 await writeFile('dist/index.html',html.replace('<div id="root"></div>',`<div id="root">${renderToString(createElement(HomePage))}</div><script>if(location.hash && location.hash !== "#home") document.getElementById("root").replaceChildren();</script>`));
 console.log('Prerendered public homepage: content and SVG available before JavaScript.');
} finally {await rm(directory,{recursive:true,force:true})}
