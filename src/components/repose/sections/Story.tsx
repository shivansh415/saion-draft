import {AMENITIES,AMENITIES_MAP,INDEX_COPY,MAP_COPY,MAP_MARKS,PLATE_SIZES} from '../data/amenities';
import {BRAND_LOGO,connections,essentialFacts,wellnessScenes,type DetailKey} from '../data/experience';
import {photoSources} from '../data/photoSources';
import {Cinemagraph} from './Cinemagraph';
import type {ReactNode} from 'react';

/** Where the amenity films live. Posters are the same name, `.webp`. */
const FILMS='/assets/amenity-videos';
export function Photo({name,alt,assetBase,className='',eager=false,sizes='100vw',responsive=true}:{name:string;alt:string;assetBase:string;className?:string;eager?:boolean;sizes?:string;responsive?:boolean}){
 // The URL set comes from data/photoSources, which is also what the
 // preloader warms — so the file this asks for is always the file that was
 // already fetched and decoded behind the loader.
 const {avifSet,webpSet,jpgSrc}=photoSources(name,assetBase,responsive);
 return <picture className="rp-photo"><source type="image/avif" srcSet={avifSet} sizes={sizes}/><source type="image/webp" srcSet={webpSet} sizes={sizes}/><img className={className} src={jpgSrc} sizes={sizes} alt={alt} loading={eager?'eager':'lazy'} fetchPriority={eager?'high':'auto'} decoding="async"/></picture>;
}
export function ChapterLabel({number,children}:{number:string;children:ReactNode}){return <p className="rp-eyebrow"><span>{number}</span><i/>{children}</p>;}
export function ArrowLink({children,onClick,className=''}:{children:ReactNode;onClick:()=>void;className?:string}){return <button className={`rp-text-link ${className}`} onClick={onClick}><span>{children}</span><span aria-hidden="true">↗</span></button>;}
export function AmenitiesIndex({assetBase,onDiscover}:{assetBase:string;onDiscover:()=>void}){
 // 01 — the amenity collection. This replaces the "The art of living." title
 // screen the client asked to remove, and it is not a substitute hero: the
 // introduction to the amenities is now the amenities themselves, read as an
 // editorial index. All fourteen official names, in the supplied order, with
 // a plate beside them that follows whichever row is being read.
 return <section id="life" data-chapter="01" className="rp-index" aria-labelledby="life-title">
  <div className="rp-index-head">
   <ChapterLabel number={INDEX_COPY.number}>THE AMENITY COLLECTION</ChapterLabel>
   <h1 id="life-title" tabIndex={-1} className="rp-index-title"><span className="rp-clip"><span>{INDEX_COPY.title[0]}</span></span><span className="rp-clip"><span><em>{INDEX_COPY.title[1]}</em></span></span></h1>
   <p className="rp-index-lead">{INDEX_COPY.lead}</p>
  </div>
  <div className="rp-index-body">
   {/* The plates are stacked and cross-faded rather than swapped on one
       element: a single <img> whose src changes shows the browser's own
       blank frame between two decodes. */}
   <figure className="rp-index-stage" aria-hidden="true">
    {AMENITIES.map((amenity,i)=><span className="rp-index-plate" key={amenity.id} data-plate={i} data-amenity={amenity.id} data-shown={i===0||undefined}>
      {amenity.photo
        ? <Photo name={amenity.photo} alt="" assetBase={assetBase} sizes={PLATE_SIZES} eager={i<2}/>
        : <img src={amenity.src} alt="" loading="lazy" decoding="async"/>}
    </span>)}
   </figure>
   <ol className="rp-index-list">
    {AMENITIES.map((amenity,i)=><li className="rp-index-row" key={amenity.id} data-row={i}>
      <span className="rp-index-num">{String(i+1).padStart(2,'0')}</span>
      <span className="rp-index-name">{amenity.name}</span>
      <span className="rp-index-group rp-micro">{amenity.group}</span>
      <span className="rp-index-note">{amenity.note}</span>
    </li>)}
   </ol>
  </div>
  <div className="rp-index-foot"><span className="rp-micro">{INDEX_COPY.count}</span><ArrowLink onClick={onDiscover}>DISCOVER YOUR RHYTHM</ArrowLink></div>
 </section>;
}
export function HorizontalAmenities({assetBase,onScene,onDetail}:{assetBase:string;onScene:(i:number)=>void;onDetail:(key:DetailKey)=>void}){
 return <section id="rhythm" data-chapter="02" className="rp-horizontal" aria-label="Wellness and amenities journey">
 <div className="rp-horizontal-stage">
  <div className="rp-horizon-top"><span>WELLNESS & WELLBEING</span><span>THE REPOSÉ COLLECTION</span></div>
  <div className="rp-panels">
   <article className="rp-panel rp-panel-pause" data-scene="0">
    <div className="rp-panel-number">01 — 05</div><h2 className="rp-layer-title">A slower<br/>kind of<br/><em>everyday.</em></h2>
    <figure className="rp-panel-photo rp-pause-photo"><Photo name="zen-garden-01" alt="Stone pathway and greenery in the Reposé zen garden" assetBase={assetBase} sizes="40vw" eager/><figcaption>01 / THE ART OF PAUSE</figcaption></figure>
    <p className="rp-panel-copy">A collection of spaces for<br/>movement, stillness, and everything<br/>that makes a day your own.</p>
    <span className="rp-horizontal-invite">SCROLL TO WANDER <b aria-hidden="true">⟶</b></span>
   </article>
   <article className="rp-panel rp-panel-balance" data-scene="1">
    <h2 className="rp-layer-title">Find your<br/><em>balance.</em></h2>
    {/* No yoga film was supplied with the other three. When one is, this
        becomes: <Cinemagraph src={`${FILMS}/yoga.mp4`} poster={`${FILMS}/yoga.webp`} alt="…"/>
        and nothing else in the panel changes. */}
    <figure className="rp-panel-photo rp-yoga-photo"><Photo name="yoga-01" alt="The calm Reposé yoga studio with mats and garden-facing windows" assetBase={assetBase} sizes="65vw" eager/></figure>
    <figure className="rp-panel-photo rp-zen-inset"><Photo name="zen-garden-01" alt="A closer look at the zen garden" assetBase={assetBase} sizes="24vw" eager/></figure>
    <div className="rp-panel-copy"><span className="rp-micro">02 / YOGA & ZEN</span><p>A little movement.<br/>A moment of stillness.</p><ArrowLink onClick={()=>onDetail('wellness')}>THE WELLNESS COLLECTION</ArrowLink></div>
   </article>
   <article className="rp-panel rp-panel-move" data-scene="2">
    <figure className="rp-panel-photo rp-gym-photo"><Cinemagraph src={`${FILMS}/gym.mp4`} poster={`${FILMS}/gym.webp`} alt="Reposé’s equipped gym with strength and functional training equipment"/></figure>
    <h2 className="rp-layer-title"><em>Room</em><br/>to move.</h2>
    <figure className="rp-panel-photo rp-gym-inset"><Photo name="gym-02" alt="Second view of the gym and exercise equipment" assetBase={assetBase} sizes="28vw"/></figure>
    <div className="rp-panel-copy"><span className="rp-micro">03 / THE GYM</span><p>Make time for<br/>your own momentum.</p></div>
   </article>
   <article className="rp-panel rp-panel-exhale" data-scene="3">
    <figure className="rp-panel-photo rp-steam-photo"><Cinemagraph src={`${FILMS}/steam-room.mp4`} poster={`${FILMS}/steam-room.webp`} alt="Warmly lit Reposé steam room and lockers"/></figure>
    <h2 className="rp-layer-title">Time to<br/><em>exhale.</em></h2>
    <div className="rp-panel-copy"><span className="rp-micro">04 / THE STEAM ROOM</span><p>Warmth. Quiet.<br/>A welcome pause.</p><span className="rp-small">Steam room with personal lockers.</span></div>
   </article>
   <article className="rp-panel rp-panel-be" data-scene="4">
    <span className="rp-be-note">THERE IS AN ART<br/>TO DOING A LITTLE LESS.</span><h2 className="rp-layer-title">Simply <em>be.</em></h2>
    <figure className="rp-panel-photo rp-be-photo"><Photo name="zen-garden-01" alt="Green planting and stepping stones in the zen garden" assetBase={assetBase} sizes="35vw"/></figure>
    <div className="rp-panel-copy"><span className="rp-micro">05 / ZEN GARDEN</span><p>Leave the hurry<br/>at the door.</p></div>
   </article>
  </div>
  <nav className="rp-scene-nav" aria-label="Wellness scenes">{wellnessScenes.map((s,i)=><button key={s} onClick={()=>onScene(i)} data-scene-button={i}><span>0{i+1}</span><span className="rp-scene-name">{s}</span></button>)}</nav>
  <div className="rp-scene-line"><span/></div>
 </div>
 </section>;
}
export function WaterExperience({assetBase,onDetail}:{assetBase:string;onDetail:(key:DetailKey)=>void}){
 return <section id="water" data-chapter="03" className="rp-water" aria-label="The swimming pool and a moment of pause">
  <div className="rp-water-stage">
   <div className="rp-water-visual"><Cinemagraph src={`${FILMS}/pool.mp4`} poster={`${FILMS}/pool.webp`} alt="Full view of the all-weather swimming pool at Reposé"/><div className="rp-water-shade"/>
    <ChapterLabel number="03">BY THE WATER</ChapterLabel>
    <h2 className="rp-water-title">Nothing to do.<br/><em>Everything to feel.</em></h2>
    <button className="rp-hotspot rp-hotspot-one" onClick={()=>onDetail('pool')} aria-label="Discover the pool amenities"><span>+</span><span className="rp-hotspot-label">THE POOL</span></button>
    <span className="rp-water-caption">ALL-WEATHER POOL · PODIUM LEVEL</span>
   </div>
   <div className="rp-curve-sheet">
    <span className="rp-curve-top">THE PLEASURE OF PAUSING</span>
    <h2>Less rush.<br/><em>More Reposé.</em></h2>
    <div className="rp-curve-bottom"><span className="rp-serif-mark">R.</span><p>A yoga studio. A zen garden. A moment by the pool.<br/>Sometimes, the best part of your day<br/>is the space between everything else.</p><figure><Photo name="pool-02" alt="Poolside lifestyle image presented in the Reposé brochure" assetBase={assetBase} sizes="25vw"/></figure></div>
   </div>
  </div>
 </section>;
}
export function TerraceExperience({assetBase}:{assetBase:string}){
 return <section id="terrace" data-chapter="04" className="rp-terrace rp-dark">
  <div className="rp-terrace-photo rp-parallax"><Photo name="open-terrace-01" alt="Open terrace with sculptural pergolas, seating and planted walkways" assetBase={assetBase}/></div><div className="rp-terrace-shade"/>
  <div className="rp-terrace-heading"><ChapterLabel number="04">THE OPEN TERRACE</ChapterLabel><h2 className="rp-reveal">Above the<br/><em>everyday.</em></h2></div>
  <div className="rp-terrace-bottom"><p>A table for friends.<br/>An afternoon that lingers.</p><span>SPACE TO GATHER.<br/>TIME TO CONNECT.</span></div>
 </section>;
}
export function FamilyExperience({assetBase}:{assetBase:string}){
 return <section id="family" data-chapter="05" className="rp-family">
  <ChapterLabel number="05">SPACE TO GROW</ChapterLabel><h2 className="rp-reveal">For every<br/><em>generation.</em></h2>
  <figure className="rp-family-main rp-mask-reveal"><Photo name="kids-play-01" alt="The project’s children’s play area as pictured in the brochure" assetBase={assetBase} sizes="55vw" responsive={false}/><figcaption>THE KIDS’ PLAY AREA</figcaption></figure>
  {/* The brochure’s montage set a generic stock photograph of a child on a swing
      beside the project’s own play-area render. That was replaced first by a
      drawn plate, and now — at the client’s review — by their own supplied
      picture for this chapter. The card keeps its place, its size and its
      reveal; only what it holds has changed. The photograph is 4:5, which is
      the card’s own proportion, so it is shown whole rather than cropped into. */}
  <figure className="rp-family-inset rp-mask-reveal">
   <img
    className="rp-family-inset__image"
    src="/assets/amenities/web/for-every-generation.webp"
    alt="Family life at Reposé — the podium level"
    loading="lazy"
    decoding="async"
    draggable={false}
   />
  </figure>
  <div className="rp-family-copy"><span className="rp-small">LITTLE MOMENTS. LASTING MEMORIES.</span><p>Room for their adventures.<br/>A little time for yours.</p><span className="rp-micro">KIDS’ PLAY AREA · KIDS’ SWIMMING POOL</span></div>
  <span className="rp-family-word" aria-hidden="true">together.</span>
 </section>;
}
export function InteriorExperience({assetBase}:{assetBase:string}){
 return <section id="interiors" data-chapter="06" className="rp-interiors rp-dark">
  <div className="rp-interior-stage"><ChapterLabel number="06">THE FEELING OF HOME</ChapterLabel>
   <figure className="rp-interior-wide"><Photo name="interior-living-01" alt="Reposé living and dining space with natural finishes and soft furnishings" assetBase={assetBase} sizes="78vw"/></figure>
   <h2>The luxury of<br/><em>coming home.</em></h2>
   <figure className="rp-interior-tall"><Photo name="interior-kitchen-01" alt="Italian modular kitchen with stone island and integrated appliances" assetBase={assetBase} sizes="32vw"/></figure>
   <figure className="rp-interior-bedroom"><Photo name="interior-bedroom-01" alt="Bedroom with soft furnishings and full-height glazing" assetBase={assetBase} sizes="30vw" responsive={false}/></figure>
   <div className="rp-interior-caption"><span>RESIDENTIAL BLISS</span><p>Natural light.<br/>Thoughtful spaces.<br/>A life that feels like you.</p></div>
  </div>
 </section>;
}
export function ConvenienceExperience({assetBase}:{assetBase:string}){
 return <section id="essentials" data-chapter="07" className="rp-essentials">
  <div className="rp-essentials-intro"><ChapterLabel number="07">LIVING ESSENTIALS</ChapterLabel><h2 className="rp-reveal">Life,<br/><em>considered.</em></h2><figure className="rp-mask-reveal"><Photo name="interior-dining-01" alt="A light-filled kitchen and dining space" assetBase={assetBase} sizes="45vw"/></figure><p>The thoughtful details<br/>that make a home.</p></div>
  <div className="rp-essential-facts">{essentialFacts.map((fact,i)=><article className="rp-essential-fact" key={fact.title}><span className="rp-fact-index">0{i+1}</span><div><span className="rp-micro">{fact.label}</span><h3>{fact.title}<span aria-hidden="true">↗</span></h3><p>{fact.copy}</p></div></article>)}</div>
 </section>;
}
export function ConnectednessExperience({assetBase}:{assetBase:string}){
 return <section id="connected" data-chapter="08" className="rp-connected rp-dark">
  <div className="rp-connected-image rp-parallax"><Photo name="al-furjan-01" alt="An aerial view of the Al Furjan community, from the project brochure" assetBase={assetBase}/></div><div className="rp-connected-shade"/>
  <ChapterLabel number="08">AL FURJAN · DUBAI</ChapterLabel>
  <h2 className="rp-reveal">Your world.<br/><em>Within reach.</em></h2>
  <div className="rp-place-line"><span>REPOSÉ</span><i/><span>AL FURJAN</span><i/><span>DUBAI</span></div>
  <div className="rp-connections">{connections.map(c=><article key={c.place}><span className="rp-time">{c.minutes}<small>MIN</small></span><h3>{c.place}</h3><span>{c.category}{c.note?' · Walk':''}</span></article>)}</div>
  <div className="rp-connected-bottom"><p>A connected community.<br/>A place to call your own.</p><span>TRAVEL TIMES AS PRESENTED IN THE PROJECT BROCHURE.<br/>ACTUAL JOURNEY TIMES MAY VARY.</span></div>
 </section>;
}
export function AmenitiesMap(){
 // 09 — placed between "08 AL FURJAN · DUBAI / Your world. Within reach." and
 // the final Reposé chapter, and treated as a chapter in its own right. The
 // drawing itself is untouched: it is presented whole, scaled and revealed,
 // never cropped, recoloured or redrawn.
 return <section id="amenities-map" data-chapter="09" className="rp-map" aria-labelledby="map-title">
  <div className="rp-map-head"><ChapterLabel number={MAP_COPY.number}>AMENITIES MAP</ChapterLabel>
   <h2 id="map-title" className="rp-map-title rp-reveal">Everything<br/><em>within reach.</em></h2>
   <p className="rp-map-lead">{MAP_COPY.lead}</p>
  </div>
  <figure className="rp-map-figure">
   <div className="rp-map-plate">
    <img src={AMENITIES_MAP} alt="The Reposé Residence podium level seen from above, showing the pool, the courts, the play and exercise zones, the planting and the walking track" loading="lazy" decoding="async"/>
    {/* Only the marks the drawing puts beyond doubt. Positions are per cent
        of the image, so they hold at every crop. */}
    {MAP_MARKS.map(mark=><span className="rp-map-mark" key={mark.id} style={{left:`${mark.x}%`,top:`${mark.y}%`}}><i aria-hidden="true"/><span className="rp-map-mark__label rp-micro">{mark.label}</span></span>)}
   </div>
   <figcaption className="rp-map-note rp-micro">{MAP_COPY.note}</figcaption>
  </figure>
 </section>;
}
export function FinalRepose({assetBase,onEnquire,onRestart,portal}:{assetBase:string;onEnquire:()=>void;onRestart:()=>void;portal?:ReactNode}){
 return <section id="finale" data-chapter="10" className="rp-finale rp-dark">
  <span className="rp-final-intro">THIS IS YOUR NEXT CHAPTER.</span><h2 className="rp-final-word">REPOSÉ</h2>
  <figure className="rp-final-image"><img src={`${assetBase}/tower-original.png`} alt="The supplied completed Reposé Residence tower image" loading="lazy" decoding="async"/></figure>
  {portal}
  <div className="rp-final-call"><p>Make room for<br/><em>a different rhythm.</em></p><ArrowLink onClick={onEnquire}>ENQUIRE ABOUT REPOSÉ</ArrowLink></div>
  <div className="rp-final-base"><img src={BRAND_LOGO} alt="SAION Properties — Engineered Excellence" loading="lazy"/><span>REPOSÉ RESIDENCE<br/>AL FURJAN · DUBAI</span><ArrowLink onClick={onRestart}>BACK TO RECEPTION</ArrowLink></div>
 </section>;
}
