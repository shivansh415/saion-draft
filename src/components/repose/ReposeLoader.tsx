import {useEffect,useRef} from 'react';
import {gsap} from './motion/gsap';
import {criticalImages} from './data/experience';
export function ReposeLoader({assetBase,onComplete}:{assetBase:string;onComplete:()=>void}) {
  const root=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    let cancelled=false; let loaded=0; const start=performance.now();
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
      if(cancelled||finished)return;finished=true;clearTimeout(fallback);update(100);
      delay=setTimeout(()=>{
        if(cancelled)return;
        end=gsap.timeline({onComplete});
        if(motion)end.to(root.current,{opacity:0,duration:.18});
        // The window is a centred grid item, so it opens out from the centre on
        // its own: only its size and its corners change. It used to be asked to
        // zero a `top`/`left`/`xPercent`/`yPercent` offset as well — but the
        // centring was a CSS `translate(-50%,-50%)`, which GSAP reads as pixels,
        // so `xPercent:0` never undid it and the full-bleed frame landed up to a
        // quarter-screen off at some viewport widths. Nothing to undo now.
        else end.to(root.current!.querySelectorAll('.rp-loader-meta, .rp-loader-line, .rp-loader-word'),{opacity:0,duration:.4},0)
          .to(root.current!.querySelector('.rp-loader-window'),{width:'100%',height:'100%',borderRadius:'0%',duration:1.1,ease:'power3.inOut'},.05)
          .to(root.current,{opacity:0,duration:.24},1.02);
      },Math.max(motion?0:900,(motion?0:1500)-(performance.now()-start)));
    };
    Promise.all(criticalImages.map(name=>new Promise<void>(resolve=>{
      const image=new Image();image.src=`${assetBase}/${name}.avif`;
      const done=()=>{if(!cancelled)update(++loaded/criticalImages.length*100);resolve();};
      image.decode().then(done,done);
    }))).then(()=>document.fonts.ready).then(finish);
    const fallback=setTimeout(finish,5500);
    return ()=>{cancelled=true;clearTimeout(delay);clearTimeout(fallback);end?.kill();tweens.forEach(t=>t.kill());ctx.revert();};
  },[assetBase,onComplete]);
  return <div className="rp-loader" ref={root} role="status" aria-label="Opening the Reposé lifestyle chapter">
    <div className="rp-loader-meta"><span>SAION PROPERTIES</span><span>A DIFFERENT RHYTHM</span></div>
    <div className="rp-loader-window"><picture><source type="image/avif" srcSet={`${assetBase}/pool-01.avif`}/><img src={`${assetBase}/pool-01.webp`} alt="" /></picture></div>
    <div className="rp-loader-word" aria-hidden="true">{'REPOSÉ'.split('').map((c,i)=><span key={i}>{c}</span>)}</div>
    <div className="rp-loader-line"><span>THE ART OF LIVING</span><i/><span data-loader-count>00</span></div>
  </div>;
}
