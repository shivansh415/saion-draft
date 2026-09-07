import {useEffect,useRef} from 'react';
import {gsap} from './motion/gsap';
import {CRITICAL_PHOTOS} from './data/experience';
import {photoSources} from './data/photoSources';
import {warmPhotos} from './data/warmPhotos';

/**
 * The chapter's loader — the one the two cues on the building open into.
 * Separate from the opening's preloader and unrelated to it: that one holds
 * the film, this one holds the chapter.
 *
 * What it waits for is `CRITICAL_PHOTOS` — the hero and the first two wellness
 * panels — fetched AND decoded at the exact URLs the page will ask for, plus
 * the display face. Nothing else on the site is loaded again here; the rest of
 * the chapter's imagery follows behind the visitor once they are inside.
 *
 * It used to give up after a flat 5.5 seconds whatever had arrived, which on
 * anything slower than an office line is precisely the reveal-too-early this
 * is meant to prevent. The floor and the ceiling below are both real: it will
 * not leave before `MIN_MS`, and it will not hold past `MAX_MS`.
 */

/** Shortest time on screen, so a warm cache still reads as a considered opening. */
const MIN_MS=1500;
/** Longest it will hold out. Past this the chapter opens with what has arrived. */
const MAX_MS=20000;
/** Longest the display face is waited on before the reveal goes ahead without it. */
const FONT_MS=4000;

export function ReposeLoader({assetBase,onReveal,onComplete}:{assetBase:string;onReveal:()=>void;onComplete:()=>void}) {
  const root=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    let cancelled=false; const start=performance.now();
    const motion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ctx=gsap.context(()=>{
      if(!motion){gsap.from('.rp-loader-word span',{yPercent:120,stagger:.055,duration:1,ease:'power3.out'});gsap.from('.rp-loader-window',{scale:.8,opacity:0,duration:1.2,ease:'power2.out'});}
    },root);
    let end:gsap.core.Timeline|undefined;
    let delay:ReturnType<typeof setTimeout>|undefined;
    let finished=false;
    const count={n:0}; const tweens:gsap.core.Tween[]=[];
    const update=(percent:number)=>{
      tweens.push(gsap.to(count,{n:percent,duration:.3,overwrite:true,onUpdate:()=>{
        if(root.current){const el=root.current.querySelector('[data-loader-count]');if(el)el.textContent=String(Math.round(count.n)).padStart(2,'0');
        root.current.style.setProperty('--load',String(count.n/100));}
      }}));
    };
    const finish=()=>{
      if(cancelled||finished)return;finished=true;clearTimeout(ceiling);warm.cancel();update(100);
      delay=setTimeout(()=>{
        if(cancelled)return;
        // `onReveal` fires as the last fade begins, not when it ends. Building
        // the chapter's motion is ~80ms of synchronous work — 36 triggers, a
        // sort and one refresh — and firing it at the end of the exit put that
        // hitch exactly where the visitor first sees the hero. Under the fade
        // it is covered, and the title's own rise starts into the clearing
        // rather than after it.
        end=gsap.timeline({onComplete});
        if(motion)end.to(root.current,{opacity:0,duration:.18,onStart:onReveal});
        // The window is a centred grid item, so it opens out from the centre on
        // its own: only its size and its corners change. It used to be asked to
        // zero a `top`/`left`/`xPercent`/`yPercent` offset as well — but the
        // centring was a CSS `translate(-50%,-50%)`, which GSAP reads as pixels,
        // so `xPercent:0` never undid it and the full-bleed frame landed up to a
        // quarter-screen off at some viewport widths. Nothing to undo now.
        else end.to(root.current!.querySelectorAll('.rp-loader-meta, .rp-loader-line, .rp-loader-word'),{opacity:0,duration:.4},0)
          .to(root.current!.querySelector('.rp-loader-window'),{width:'100%',height:'100%',borderRadius:'0%',duration:1.1,ease:'power3.inOut'},.05)
          .to(root.current,{opacity:0,duration:.24,onStart:onReveal},1.02);
      },Math.max(motion?0:900,(motion?0:MIN_MS)-(performance.now()-start)));
    };

    // The pictures, at the URLs the page itself will resolve to — and decoded,
    // so the hero is a paint rather than a decode when the loader lifts. The
    // readout is real: it is these files arriving.
    const warm=warmPhotos(CRITICAL_PHOTOS,assetBase,{
      concurrency:4,
      priority:'high',
      // Held a little short of full while the face is still outstanding, so the
      // count does not sit at 100 through the last wait.
      onProgress:(fraction)=>update(fraction*92),
    });

    // Fonts in parallel, never in series behind the pictures, and never
    // without an answer: a face that will not load must not hold the chapter.
    const fonts=new Promise<void>((resolve)=>{
      const settle=()=>resolve();
      if(!document.fonts||document.fonts.status==='loaded')settle();
      else{document.fonts.ready.then(settle,settle);setTimeout(settle,FONT_MS);}
    });

    Promise.all([warm.promise,fonts]).then(finish);
    const ceiling=setTimeout(finish,MAX_MS);

    return ()=>{cancelled=true;warm.cancel();clearTimeout(delay);clearTimeout(ceiling);end?.kill();tweens.forEach(t=>t.kill());ctx.revert();};
  },[assetBase,onReveal,onComplete]);
  const pool=photoSources('pool-01',assetBase);
  return <div className="rp-loader" ref={root} role="status" aria-label="Opening the Reposé lifestyle chapter">
    <div className="rp-loader-meta"><span>SAION PROPERTIES</span><span>A DIFFERENT RHYTHM</span></div>
    {/* The same candidate set the hero behind it will use, so the loader's own
        picture and the chapter's first screen are one fetch, not two. */}
    <div className="rp-loader-window"><picture><source type="image/avif" srcSet={pool.avifSet} sizes="100vw"/><source type="image/webp" srcSet={pool.webpSet} sizes="100vw"/><img src={pool.jpgSrc} sizes="100vw" alt="" fetchPriority="high" decoding="async"/></picture></div>
    <div className="rp-loader-word" aria-hidden="true">{'REPOSÉ'.split('').map((c,i)=><span key={i}>{c}</span>)}</div>
    <div className="rp-loader-line"><span>THE ART OF LIVING</span><i/><span data-loader-count>00</span></div>
  </div>;
}
