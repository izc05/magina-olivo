/* Mágina Olivo — demo standalone, no trackers, no data collection.
   Frames 0001..N are optional: the still scene stays visible if they're absent.
   Production: supply the numbered WebP frames exported from the actual Flow video. */
(() => {
  'use strict';
  const root = document.documentElement;
  const section = document.getElementById('experiencia');
  const canvas = document.getElementById('olivo-canvas');
  const ctx = canvas.getContext('2d', {alpha: true, desynchronized: true});
  const steps = [...document.querySelectorAll('.story-step')];
  const progressBar = document.getElementById('story-progress-bar');
  const loadingBar = document.getElementById('load-line');
  const previewImage = document.getElementById('scene-static');
  const video = document.getElementById('hero-video');
  const frameCount = Number(section.dataset.frameCount) || 84;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const cache = new Map();
  const loading = new Set();
  const missing = new Set();
  const QUEUE_LIMIT = 5;
  const MAX_CACHE = 26;
  let progress = 0;
  let desired = 1;
  let current = 0;
  let running = 0;
  let queuedDraw = false;
  let isVisible = false;
  let initialLoadFinished = false;
  const pathFor = i => `assets/frames/frame_${String(i).padStart(4, '0')}.webp`;
  const clamp = (v,min,max) => Math.max(min,Math.min(max,v));
  previewImage.addEventListener('error', () => { previewImage.src = 'assets/scroll-fallback.svg'; }, {once:true});
  // The video remains transparent unless it can actually play, so poster + SVG fallback are always visible.
  video.addEventListener('canplay', () => {if(!reducedMotion.matches) { video.classList.add('is-ready'); video.play().catch(()=>{}); }}, {once:true});
  video.addEventListener('error', () => video.classList.remove('is-ready'));
  if (!reducedMotion.matches) { video.load(); }

  function resizeCanvas(){
    if(!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const w=Math.max(1,Math.round(rect.width*dpr));
    const h=Math.max(1,Math.round(rect.height*dpr));
    if(canvas.width!==w || canvas.height!==h){canvas.width=w;canvas.height=h;}
    draw();
  }
  function imageReady(i){return cache.get(i)?.img || null;}
  function nearestFrame(index){
    if(imageReady(index))return index;
    let nearest=0,distance=Infinity;
    for(const i of cache.keys()){
      if(!imageReady(i))continue;
      const d=Math.abs(i-index);if(d<distance){distance=d;nearest=i;}
    }
    return nearest;
  }
  function draw(){
    if(!ctx)return;
    const frame = nearestFrame(desired);
    const img = imageReady(frame);
    if(!img) return; // Static image underneath; scroll-linked parallax fallback is handled in tick().
    const cw=canvas.width,ch=canvas.height,iw=img.naturalWidth,ih=img.naturalHeight;
    const scale=Math.max(cw/iw,ch/ih); const w=iw*scale,h=ih*scale;
    ctx.clearRect(0,0,cw,ch);
    ctx.drawImage(img,(cw-w)/2,(ch-h)/2,w,h);
    current=frame;
    // Bound memory consumption on mobile: keep the current neighborhood, oldest frames discarded.
    if(cache.size>MAX_CACHE){
      const ordered=[...cache.entries()].sort((a,b)=> Math.abs(b[0]-desired)-Math.abs(a[0]-desired));
      for(const [k] of ordered){if(cache.size<=MAX_CACHE)break;if(k!==current && k!==1)cache.delete(k);}
    }
  }
  function blendBackground(img){
    // One corner pixel only matches a uniform video backdrop; use it if sufficiently dark.
    // For photographic backgrounds the gradient/vignette still masks irregular border tones.
    try{
      const c=document.createElement('canvas');c.width=4;c.height=4;
      const context=c.getContext('2d',{willReadFrequently:true});
      context.drawImage(img,0,0,4,4);
      const [r,g,b]=context.getImageData(1,1,1,1).data;
      if(Math.max(r,g,b)<44){
        const tone='#'+[r,g,b].map(x=>x.toString(16).padStart(2,'0')).join('');
        root.style.setProperty('--bg-dark',tone);
      }
    }catch{/* file:// and cross-origin images can make pixel reads unavailable */}
  }
  function nextFrameOrder(){
    const arr=[desired,desired-1,desired+1,desired-2,desired+2,desired-4,desired+4,desired-8,desired+8];
    for(let i=1;i<=Math.min(15,frameCount);i++)arr.push(i);
    for(let offset=0;offset<frameCount;offset+=8)arr.push(1+offset);
    return [...new Set(arr.map(n=>clamp(n,1,frameCount)))];
  }
  function requestFrame(i){
    if(cache.has(i)||loading.has(i)||missing.has(i)||loading.size>=QUEUE_LIMIT)return;
    loading.add(i);
    const img=new Image();
    img.decoding='async';
    img.onload=()=>{
      loading.delete(i);
      cache.set(i,{img});
      if(i===1){blendBackground(img);}
      draw();scheduleRequests(); updateBar();
    };
    img.onerror=()=>{
      loading.delete(i);missing.add(i);
      if(i===1){initialLoadFinished=true;loadingBar.classList.remove('loading');}
      scheduleRequests();
    };
    img.src=pathFor(i);
  }
  function updateBar(){
    const total=Math.min(15,frameCount);
    let ready=0;for(let i=1;i<=total;i++)if(cache.has(i))ready++;
    root.style.setProperty('--load-progress',`${Math.round(ready/total*100)}%`);
    if(ready>=total || missing.size){initialLoadFinished=true;loadingBar.classList.remove('loading');}
  }
  function scheduleRequests(){
    if(reducedMotion.matches||!isVisible||missing.has(1))return;
    // Limit downloads + do not decode all frames at once. Prioritize the scroll position.
    for(const i of nextFrameOrder()){
      if(loading.size>=QUEUE_LIMIT)break;
      requestFrame(i);
    }
  }
  function tick(){
    running=0;
    const rect=section.getBoundingClientRect();
    const max=Math.max(1,rect.height-innerHeight);
    progress=clamp(-rect.top/max,0,1);
    desired=Math.min(frameCount,1+Math.floor(progress*(frameCount-1)));
    progressBar.style.width=`${Math.round(progress*100)}%`;
    for(const s of steps){
      const a=Number(s.dataset.start),b=Number(s.dataset.end);
      s.classList.toggle('active',progress>=a && progress<=b);
    }
    if(!reducedMotion.matches){
      // Graceful GitHub preview: animate the still when production frames are absent.
      if(missing.has(1) || cache.size===0){
        previewImage.style.transform=`scale(${(1+progress*0.11).toFixed(4)}) translateX(${(progress*1.8).toFixed(2)}%)`;
      } else {previewImage.style.transform='none';}
      draw();scheduleRequests();
    }
  }
  function scheduleTick(){if(!running)running=requestAnimationFrame(tick);}
  function checkViewport(){
    const r=section.getBoundingClientRect();
    isVisible=r.top<innerHeight*1.8 && r.bottom>-innerHeight*.8;
    if(isVisible && !reducedMotion.matches){
      if(!initialLoadFinished)loadingBar.classList.add('loading');
      scheduleRequests();
    }
    scheduleTick();
  }
  addEventListener('scroll',checkViewport,{passive:true});
  addEventListener('resize',()=>{resizeCanvas();checkViewport();},{passive:true});
  reducedMotion.addEventListener?.('change',()=>{
    if(reducedMotion.matches){video.pause();video.classList.remove('is-ready');}
    else {video.play().catch(()=>{});checkViewport();}
  });
  const access=document.getElementById('access-button');
  access.addEventListener('click',()=>{
    document.getElementById('access-message').textContent='Esta es una demostración. Falta conectar un destino real de descarga o un formulario privado de acceso anticipado; no hemos recogido tus datos.';
  });
  resizeCanvas();checkViewport();
})();
