import html from './notifications.html?raw';
import {env} from 'cloudflare:workers';
export const dynamic='force-dynamic';
export function GET(request:Request){const user=request.headers.get('oai-authenticated-user-id'),email=request.headers.get('oai-authenticated-user-email');if(!user||!env.PRIME_OWNER_EMAIL||email?.toLowerCase()!==env.PRIME_OWNER_EMAIL.toLowerCase())return new Response('Bu alan yalnızca uygulama sahibine açık.',{status:403,headers:{'Cache-Control':'no-store'}});return new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}})}
