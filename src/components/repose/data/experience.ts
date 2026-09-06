/** Factual data is transcribed/paraphrased from the supplied brochure.
 * Display headlines are original editorial presentation copy, not project claims.
 * PDF page numbers are one-based. See asset-manifest.json for image provenance.
 */
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
export const criticalImages = ['pool-01','yoga-01','gym-01','zen-garden-01','steam-room-01','open-terrace-01','interior-living-01'];
