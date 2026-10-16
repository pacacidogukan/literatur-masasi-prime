import html from '../public/index.html?raw';
import css from '../public/style.css?raw';
import script from '../public/app.js?raw';
const page=html
 .replace('<head>','<head><base href="/">')
 .replace(/<link rel="stylesheet"[^>]*>/,()=>`<style>${css.replace(/<\/style/gi,'<\\/style')}</style>`)
 .replace(/<script src="[^"]+"><\/script>/,()=>`<script>${script.replace(/<\/script/gi,'<\\/script')}</script>`);
export function GET(){return new Response(page,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Prime-UI-Version':'brands-logo-only-43'}})}
