/** Factual data is transcribed/paraphrased from the supplied brochure.
 * Display headlines are original editorial presentation copy, not project claims.
 * PDF page numbers are one-based. See asset-manifest.json for image provenance.
 */
import type {PhotoSpec} from './photoSources';
export type {PhotoSpec};
/** Where the chapter's production imagery lives in the host's public directory. */
export const ASSET_BASE = '/assets/repose-experience';
/** The SAION mark the opening already ships (byte-identical to the supplied file); not duplicated. */
export const BRAND_LOGO = '/assets/opening/branding/saion-logo.png';
export const project = {
  name: 'Reposé Residence', developer: 'SAION Properties', location: 'Al Furjan · Dubai',
  email: 'info@saionproperties.com', phone: '+971 42 61 4002', phoneHref: 'tel:+97142614002',
  contactSourcePage: 62,
};
export const chapters = [
  {id:'life',name:'Life at Reposé',number:'01'},
  {id:'rhythm',name:'A rhythm of your own',number:'02'},
  {id:'water',name:'By the water',number:'03'},
  {id:'terrace',name:'Above the everyday',number:'04'},
  {id:'family',name:'Every generation',number:'05'},
  {id:'interiors',name:'The feeling of home',number:'06'},
  {id:'essentials',name:'Life, considered',number:'07'},
  {id:'connected',name:'Perfectly connected',number:'08'},
  {id:'finale',name:'Your next chapter',number:'09'},
];
export const wellnessScenes = ['The art of pause','Find your balance','Room to move','Time to exhale','Simply be'];
export const essentialFacts = [
  {title:'3.65 m',label:'Floor-to-ceiling height',copy:'An expansive sense of space, with crafted windows that welcome natural light.',page:26},
  {title:'Italian',label:'Modular kitchens',copy:'Well-designed Italian modular kitchens, paired with German appliances.',page:26},
  {title:'Intuitive',label:'Smart home technology',copy:'Smart home technology brings ease and efficiency to everyday living.',page:26},
  {title:'Open',label:'Spacious balconies',copy:'Generous balconies extend the living experience outdoors.',page:26},
];
export const connections = [
  {minutes:'05',place:'Al Furjan Metro',category:'Transport',note:'Walking time shown in brochure',page:27},
  {minutes:'05',place:'Dubai Marina',category:'Attractions',page:27},
  {minutes:'12',place:'Ibn Battuta Mall',category:'Shopping',page:27},
  {minutes:'25',place:'Al Maktoum International Airport',category:'Transport',page:27},
];
export const amenityDetails = {
  pool:{label:'03 / THE WATER',title:'Your daily oasis.',description:'An all-weather swimming pool, a kids’ splash zone and a jacuzzi are presented on the podium level. A place to swim, unwind and spend time together.',image:'pool-01',page:20},
  wellness:{label:'02 / WELLBEING',title:'Space for yourself.',description:'A yoga studio, zen garden, well-equipped gym and steam room with personal lockers bring moments of movement and stillness into everyday life.',image:'yoga-01',page:14},
} as const;
export type DetailKey = keyof typeof amenityDetails;
/* ------------------------------------------------------------------ *
 * What the chapter waits for, and what it fetches behind the visitor
 *
 * Each entry carries the `sizes` the component renders it at, because
 * `sizes` is half of what decides which candidate file the browser asks
 * for. A name on its own is not enough to warm anything: at `40vw` on a
 * 1440 desktop the zen garden resolves to its 720w variant, and warming
 * the native one leaves the page to fetch the real file cold. Any change
 * to a `sizes` in `sections/Story` belongs here in the same edit.
 * ------------------------------------------------------------------ */

/**
 * The first screens: the hero the chapter opens on, and the two wellness
 * panels immediately behind it. Nothing is revealed until all of these are
 * fetched AND decoded.
 */
export const CRITICAL_PHOTOS: readonly PhotoSpec[] = [
  { name: 'pool-01', sizes: '100vw' },        // #life — "The art of living."
  { name: 'zen-garden-01', sizes: '40vw' },   // #rhythm scene 0 — the first panel
  { name: 'yoga-01', sizes: '65vw' },         // #rhythm scene 1 — wellness
  { name: 'zen-garden-01', sizes: '24vw' },   // #rhythm scene 1 — the inset
];

/**
 * Everything else, in the order the visitor meets it. Fetched quietly after
 * the chapter is open, so each section is ready before it is reached. This
 * is the chapter's own imagery only — nothing from the rest of the site is
 * loaded again here.
 */
export const DEFERRED_PHOTOS: readonly PhotoSpec[] = [
  { name: 'gym-01', sizes: '65vw' },                          // scene 2
  { name: 'gym-02', sizes: '28vw' },                          // scene 2
  { name: 'steam-room-01', sizes: '85vw' },                   // scene 3
  { name: 'zen-garden-01', sizes: '35vw' },                   // scene 4
  { name: 'pool-01', sizes: '100vw' },                        // 03 by the water
  { name: 'pool-02', sizes: '25vw' },
  { name: 'open-terrace-01', sizes: '100vw' },                // 04 above the everyday
  { name: 'kids-play-01', sizes: '55vw', responsive: false }, // 05 every generation
  { name: 'family-01', sizes: '22vw', responsive: false },
  { name: 'interior-living-01', sizes: '78vw' },              // 06 the feeling of home
  { name: 'interior-kitchen-01', sizes: '32vw' },
  { name: 'interior-bedroom-01', sizes: '30vw', responsive: false },
  { name: 'interior-dining-01', sizes: '45vw' },              // 07 life, considered
  { name: 'al-furjan-01', sizes: '100vw' },                   // 08 perfectly connected
];
