/* GitHub Pages cannot set COOP/COEP headers. This scoped worker supplies them
 * on same-origin responses; it does not cache assets or intercept other sites. */
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(new URL(request.url).origin!==self.location.origin)return;
  if(request.cache==='only-if-cached'&&request.mode!=='same-origin')return;
  event.respondWith(fetch(request).then(response=>{
    if(response.status===0)return response;
    const headers=new Headers(response.headers);
    headers.set('Cross-Origin-Opener-Policy','same-origin');
    headers.set('Cross-Origin-Embedder-Policy','require-corp');
    headers.set('Cross-Origin-Resource-Policy','same-origin');
    // WebKit can expose conditional worker responses as 304. Fetch forbids
    // bodies on these statuses, including an empty native ReadableStream.
    const body=[204,205,304].includes(response.status)?null:response.body;
    return new Response(body,{status:response.status,statusText:response.statusText,headers});
  }));
});
