import {useLayoutEffect, type RefObject, type MutableRefObject} from 'react';
import {gsap,ScrollTrigger} from './gsap';
export function useStoryMotion(root:RefObject<HTMLDivElement|null>,active:boolean,horizontal:MutableRefObject<ScrollTrigger|null>) {
 useLayoutEffect(()=>{
  if(!active||!root.current)return;
  const element=root.current;
  const mm=gsap.matchMedia();
  const ctx=gsap.context(()=>{
   const count=element.querySelector('[data-progress-count]');
   const progress=element.querySelector('[data-progress-line]');
   const chapter=element.querySelector('[data-chapter-count]');
   ScrollTrigger.create({trigger:element,start:'top top',end:'bottom bottom',refreshPriority:-20,onUpdate:s=>{
    if(count)count.textContent=String(Math.round(s.progress*100)).padStart(2,'0');
    if(progress)(progress as HTMLElement).style.transform=`scaleY(${s.progress})`;
   }});
   element.querySelectorAll<HTMLElement>('[data-chapter]').forEach(section=>{
    ScrollTrigger.create({trigger:section,start:'top 45%',end:'bottom 45%',refreshPriority:-10,onToggle:s=>{
      if(s.isActive&&chapter){chapter.textContent=section.dataset.chapter||'01';element.dataset.uiTone=['01','03','04','06','08','09'].includes(section.dataset.chapter||'')?'paper':'ink';}
    }});
   });
   mm.add('(prefers-reduced-motion: no-preference)',()=>{
    gsap.from('.rp-life-title .rp-clip > span',{yPercent:112,duration:1.25,stagger:.12,ease:'power3.out'});
    gsap.fromTo('.rp-life-image img',{scale:1.06,yPercent:0},{scale:1.16,yPercent:9,ease:'none',scrollTrigger:{trigger:'.rp-life',start:'top top',end:'bottom top',scrub:.65}});
    gsap.to('.rp-life-title',{yPercent:-22,ease:'none',scrollTrigger:{trigger:'.rp-life',start:'top top',end:'bottom top',scrub:.7}});
    element.querySelectorAll<HTMLElement>('.rp-reveal').forEach(title=>{
     gsap.from(title,{clipPath:'inset(0% 0% 100% 0%)',y:45,duration:1.35,ease:'power3.out',scrollTrigger:{trigger:title,start:'top 88%',once:true}});
    });
    element.querySelectorAll<HTMLElement>('.rp-parallax').forEach(frame=>{
     const img=frame.querySelector('img');if(!img)return;
     gsap.fromTo(img,{yPercent:-5,scale:1.12},{yPercent:5,scale:1.03,ease:'none',scrollTrigger:{trigger:frame,start:'top bottom',end:'bottom top',scrub:.65}});
    });
    element.querySelectorAll<HTMLElement>('.rp-mask-reveal').forEach(frame=>{
     gsap.from(frame,{clipPath:'inset(0% 100% 0% 0%)',duration:1.4,ease:'power3.inOut',scrollTrigger:{trigger:frame,start:'top 85%',once:true}});
    });
    element.querySelectorAll<HTMLElement>('.rp-essential-fact').forEach(fact=>{
     gsap.from(fact,{y:45,clipPath:'inset(0 0 100% 0)',ease:'none',scrollTrigger:{trigger:fact,start:'top 92%',end:'top 55%',scrub:.5}});
    });
    gsap.from('.rp-place-line i',{scaleX:0,transformOrigin:'left',stagger:.2,duration:1.3,ease:'power3.inOut',scrollTrigger:{trigger:'.rp-place-line',start:'top 85%',once:true}});
    gsap.from('.rp-connections article',{y:70,clipPath:'inset(0 0 100% 0)',stagger:.12,duration:1.1,ease:'power3.out',scrollTrigger:{trigger:'.rp-connections',start:'top 85%',once:true}});
    gsap.fromTo('.rp-final-image',{clipPath:'inset(15% 0% 15% 0% round 50% 50% 0% 0%)'},{clipPath:'inset(0% 0% 0% 0% round 50% 50% 0% 0%)',ease:'none',scrollTrigger:{trigger:'.rp-finale',start:'top 90%',end:'top 20%',scrub:.7}});
    gsap.fromTo('.rp-final-word',{yPercent:15},{yPercent:-10,ease:'none',scrollTrigger:{trigger:'.rp-finale',start:'top bottom',end:'bottom bottom',scrub:.7}});
   });
   mm.add('(min-width: 901px) and (prefers-reduced-motion: no-preference)',()=>{
    const panels=gsap.utils.toArray<HTMLElement>('.rp-panel',element);
    const duration=panels.length-1;
    const horizontalTimeline=gsap.timeline({scrollTrigger:{trigger:'.rp-horizontal',start:'top top',end:()=>`+=${window.innerWidth*4.2}`,pin:'.rp-horizontal-stage',scrub:.65,invalidateOnRefresh:true,anticipatePin:1,refreshPriority:10,onToggle:s=>{panels.forEach(p=>{p.style.willChange=s.isActive?'transform':'auto';});},onUpdate:s=>{
     const current=Math.min(panels.length-1,Math.round(s.progress*duration));
     panels.forEach((p,i)=>{p.inert=i!==current;p.setAttribute('aria-hidden',String(i!==current));});
     element.querySelectorAll('[data-scene-button]').forEach((button,i)=>{button.setAttribute('aria-current',i===current?'step':'false');});
     const line=element.querySelector<HTMLElement>('.rp-scene-line span');if(line)line.style.transform=`scaleX(${s.progress})`;
    }}});
    horizontal.current=horizontalTimeline.scrollTrigger!;
    panels.forEach((panel,i)=>{
     horizontalTimeline.fromTo(panel,{x:0,xPercent:i*100},{x:0,xPercent:(i-duration)*100,duration,ease:'none'},0);
     const start=Math.max(0,i-1),length=Math.min(2,duration-start);
     const title=panel.querySelector('.rp-layer-title');
     if(title)horizontalTimeline.fromTo(title,{x:90},{x:-90,duration:length,ease:'none'},start);
     panel.querySelectorAll<HTMLElement>('.rp-panel-photo').forEach((frame,j)=>{
      const img=frame.querySelector('img');if(img)horizontalTimeline.fromTo(img,{xPercent:j%2?-7:7,scale:1.18},{xPercent:j%2?7:-7,scale:1.06,duration:length,ease:'none'},start);
      if(j>0)horizontalTimeline.fromTo(frame,{yPercent:16},{yPercent:-10,duration:length,ease:'none'},start);
     });
     const copy=panel.querySelector('.rp-panel-copy');if(copy)horizontalTimeline.fromTo(copy,{x:30,y:30},{x:-15,y:-20,duration:length,ease:'none'},start);
    });
    const water=gsap.timeline({scrollTrigger:{trigger:'.rp-water',start:'top top',end:()=>`+=${window.innerHeight*2.8}`,pin:'.rp-water-stage',onUpdate:s=>{if(s.isActive)element.dataset.uiTone=s.progress>.72?'ink':'paper';},scrub:.7,invalidateOnRefresh:true,anticipatePin:1,refreshPriority:10}});
    water.fromTo('.rp-water-visual',{clipPath:'inset(8% 6% 8% 6%)'},{clipPath:'inset(0% 0% 0% 0%)',duration:1,ease:'none'},0)
     .fromTo('.rp-water-visual > img',{scale:1.12},{scale:1,duration:2.4,ease:'none'},0)
     .fromTo('.rp-water-title',{y:70,opacity:0},{y:0,opacity:1,duration:.65,ease:'none'},.3)
     .to('.rp-water-title',{y:-60,duration:.8,ease:'none'},1.3)
     .fromTo('.rp-curve-sheet',{clipPath:'ellipse(0% 0% at 50% 110%)'},{clipPath:'ellipse(110% 140% at 50% 110%)',duration:1.55,ease:'power1.inOut'},1.8)
     .fromTo('.rp-curve-sheet h2',{y:130},{y:0,duration:1.25,ease:'power2.out'},2.1)
     .fromTo('.rp-curve-bottom',{y:60,opacity:0},{y:0,opacity:1,duration:.6,ease:'none'},2.7)
     .to({}, {duration:.4});
    gsap.fromTo('.rp-family-main',{y:100},{y:-40,ease:'none',scrollTrigger:{trigger:'.rp-family',start:'top bottom',end:'bottom top',scrub:.8}});
    gsap.to('.rp-family-word',{xPercent:-12,ease:'none',scrollTrigger:{trigger:'.rp-family',start:'top bottom',end:'bottom top',scrub:.7}});
    const interior=gsap.timeline({scrollTrigger:{trigger:'.rp-interiors',start:'top top',end:()=>`+=${window.innerHeight*1.5}`,pin:'.rp-interior-stage',scrub:.75,invalidateOnRefresh:true,anticipatePin:1,refreshPriority:10}});
    interior.fromTo('.rp-interior-wide',{y:90,scale:1.07},{y:-70,scale:1,duration:2,ease:'none'},0)
      .fromTo('.rp-interior-stage h2',{x:50,y:60},{x:-30,y:-15,duration:2,ease:'none'},0)
      .fromTo('.rp-interior-tall',{yPercent:65},{yPercent:-10,duration:2,ease:'none'},0)
      .fromTo('.rp-interior-bedroom',{yPercent:100},{yPercent:0,duration:1.5,ease:'none'},.5)
      .fromTo('.rp-interior-caption',{y:70},{y:-20,duration:2,ease:'none'},0);
    return ()=>{horizontal.current=null;panels.forEach(p=>{p.inert=false;p.removeAttribute('aria-hidden');p.style.removeProperty('will-change');});};
   });
   mm.add('(max-width: 900px) and (prefers-reduced-motion: no-preference)',()=>{
    ScrollTrigger.create({trigger:'.rp-curve-sheet',start:'top 20%',end:'bottom 20%',onEnter:()=>{element.dataset.uiTone='ink';},onLeaveBack:()=>{element.dataset.uiTone='paper';}});
    element.querySelectorAll<HTMLElement>('.rp-panel-photo').forEach(frame=>{
     gsap.fromTo(frame.querySelector('img'),{scale:1.08,yPercent:-3},{scale:1,yPercent:3,ease:'none',scrollTrigger:{trigger:frame,start:'top bottom',end:'bottom top',scrub:.4}});
    });
   });
  },element);
  let disposed=false;
  const refresh=gsap.delayedCall(.15,()=>{ScrollTrigger.sort();ScrollTrigger.refresh();});
  document.fonts.ready.then(()=>{if(!disposed)ScrollTrigger.refresh();});
  return ()=>{disposed=true;refresh.kill();mm.revert();ctx.revert();horizontal.current=null;};
 },[active,root,horizontal]);
}
