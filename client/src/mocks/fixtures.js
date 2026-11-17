/* DEV-only fixture data for the mock API (never imported by production code). */

const DAY = 86_400_000;
const ago = (days, hours = 0) => new Date(Date.now() - days * DAY - hours * 3_600_000).toISOString();

const IMG = {
  redmc: { url: "/img/redmc.jpg", width: 1920, height: 1440 },
  urus: { url: "/img/urus.jpg", width: 1920, height: 1080 },
  amg: { url: "/img/amg.jpg", width: 736, height: 793 },
  bmw: { url: "/img/bmw.jpg", width: 1200, height: 540 },
  aventador: { url: "/img/aventador.jpg", width: 800, height: 420 },
  engine: { url: "/img/mc_engin.jpg", width: 735, height: 490 },
  gts: { url: "/img/gtsmc.jpg", width: 3500, height: 2070 },
  orange: { url: "/img/mc_homepage.jpg", width: 640, height: 480 },
};

export const categories = [
  { id: 1, name: "Reviews", slug: "reviews", description: "Road and track tests", article_count: 5 },
  { id: 2, name: "News", slug: "news", description: "What changed this week", article_count: 2 },
  { id: 3, name: "Features", slug: "features", description: "Long reads and ownership stories", article_count: 3 },
  { id: 4, name: "Guides", slug: "guides", description: "How-tos for owners and drivers", article_count: 1 },
];

const authors = {
  mara: { author_name: "Mara Ellison", author_username: "mara", author_avatar_url: null },
  theo: { author_name: "Theo Varga", author_username: "theo", author_avatar_url: null },
  ines: { author_name: "Inès Okafor", author_username: "ines", author_avatar_url: null },
};

const fig = (img, caption, cls = "") =>
  `<figure class="${cls}"><img src="${img.url}" alt="${caption}" width="${img.width}" height="${img.height}" loading="lazy" /><figcaption>${caption}</figcaption></figure>`;

const LONG_BODY = `
<p>There is a corner on the mountain road above our test base where most fast cars tell you a lie. The surface drops away mid-apex, the camber tilts the wrong way and the exit is blind. Heavy cars wallow, nervous cars twitch. The 750S simply settles, takes a breath through its hydraulic steering, and asks whether you would like to carry more speed next time.</p>
<p>That conversation, more than any lap time, is the story of this car. McLaren has not reinvented the mid-engined coupe here; it has spent a development cycle taking things away, and the result reads more clearly than anything else in the class.</p>
<h2>Less mass, more message</h2>
<p>The claimed saving over its predecessor is thirty kilograms. On paper that is a rounding error for a car of this performance. On the road it shows up as a front axle that reacts a fraction earlier and a body that stops moving a fraction sooner. The steering, still hydraulically assisted while most rivals have gone electric, fizzes with texture without ever becoming tiring.</p>
${fig(IMG.gts, "The roofline is unchanged; most of the work happened underneath the carbon tub.", "align-wide")}
<p>The ride is the surprise. In Comfort, with the adaptive dampers at their softest, the 750S breathes with a broken surface rather than fighting it. Switch to Track and it tightens, but never to the point of crashing over expansion joints.</p>
<blockquote class="pull-quote">It is the rare supercar that gets more interesting the slower you drive it.</blockquote>
<h3>The engine, briefly</h3>
<p>The 4.0-litre twin-turbo V8 is shared, in broad strokes, with its predecessor, but it now pulls to its limiter with a harder, more metallic edge. Throttle response below 3,000rpm is where the real gains are: the old car had a moment of inhalation before the boost arrived; this one answers almost immediately.</p>
<ul><li>Shorter final drive for quicker in-gear response</li><li>Revised engine mounts transmit more texture into the cabin</li><li>A new centre-exit exhaust that is louder, though not much more tuneful</li></ul>
<h2>Living with it</h2>
<p>Visibility remains excellent for a mid-engined car, and the glass-roofed cabin feels airy. The infotainment is simple and occasionally slow; the driving position is close to perfect. Luggage space up front will take two soft weekend bags and not much else.</p>
${fig(IMG.engine, "Accessing the V8 still means lifting a carbon cover — this is not a car for roadside fettling.")}
<h2>Verdict</h2>
<p>The 750S does not shout about its improvements. It just makes you a little smoother, a little braver and a lot happier on the drive home. If the measure of a supercar is how often you invent a reason to take it out, this is one of the very best.</p>
`;

const shortBody = (lead, h2, para, quote) => `
<p>${lead}</p>
<h2>${h2}</h2>
<p>${para}</p>
<blockquote class="pull-quote">${quote}</blockquote>
<h2>What it means</h2>
<p>For buyers, the short answer is that the class has moved on again. For enthusiasts, it is a reminder that the most memorable cars are rarely the ones with the largest numbers on the spec sheet, but the ones that communicate most honestly with the person holding the wheel.</p>
<p>We will have a full road test once production cars reach our garage. Until then, consider this a first, careful read.</p>
`;

const gallery = (...imgs) =>
  imgs.map(([img, caption, credit = "APEX / Studio"]) => ({ ...img, caption, credit }));

export const articles = [
  {
    id: 1,
    slug: "mclaren-750s-review",
    title: "McLaren 750S review: the lightest touch wins",
    dek: "Thirty kilograms lighter, sharper on turn-in and still civil on a broken road. Three days finding where the 750S stops being polite.",
    content: LONG_BODY,
    featured_image_url: IMG.redmc.url,
    featured_image_alt: "Red McLaren coupe parked on wet tarmac at dusk",
    category_id: 1,
    category_name: "Reviews",
    status: "published",
    view_count: 18240,
    published_at: ago(0, 3),
    created_at: ago(2),
    make: "McLaren",
    article_type: "review",
    is_featured: true,
    reading_time_min: 9,
    tags: ["mclaren", "review", "v8"],
    ...authors.mara,
    specs: {
      power_hp: 740,
      torque_nm: 800,
      zero_to_100_s: 2.8,
      top_speed_kmh: 332,
      weight_kg: 1389,
      price_usd: 324000,
      drivetrain: "RWD",
      engine: "4.0L twin-turbo V8",
      year: 2026,
      model: "750S Coupé",
    },
    gallery: gallery(
      [IMG.redmc, "Front three-quarter on the mountain road"],
      [IMG.gts, "Side profile — the dihedral doors remain the party trick"],
      [IMG.engine, "The 4.0-litre twin-turbo V8 under its carbon cover"],
      [IMG.orange, "Predecessor for scale: the 720S that started the line", "APEX archive"]
    ),
  },
  {
    id: 2,
    slug: "lamborghini-urus-performante-review",
    title: "Urus Performante: an SUV that refuses to behave like one",
    dek: "Lower, stiffer and louder than the car it replaces — and somehow the better daily driver. A week with Lamborghini's family bruiser.",
    content: shortBody(
      "Nobody needs a 666hp SUV. That was true when the first Urus arrived and it is true now. But after a week of school runs, motorway slogs and one unreasonably quick mountain pass, need stops being the point.",
      "Stiffer, but not harsher",
      "Steel springs replace the air suspension, ride height drops by 20mm and the body control is transformed. On a smooth road it corners flat and eager; on a broken one it is firm, but never crashy.",
      "The Performante feels lighter than it is — the highest compliment you can pay a two-tonne car."
    ),
    featured_image_url: IMG.urus.url,
    featured_image_alt: "Lamborghini SUV on a coastal road",
    category_id: 1,
    category_name: "Reviews",
    status: "published",
    view_count: 12010,
    published_at: ago(1, 5),
    created_at: ago(3),
    make: "Lamborghini",
    article_type: "review",
    is_featured: false,
    reading_time_min: 7,
    tags: ["lamborghini", "suv"],
    ...authors.theo,
    specs: {
      power_hp: 657,
      torque_nm: 850,
      zero_to_100_s: 3.3,
      top_speed_kmh: 306,
      weight_kg: 2150,
      price_usd: 260000,
      drivetrain: "AWD",
      engine: "4.0L twin-turbo V8",
      year: 2025,
      model: "Urus Performante",
    },
    gallery: gallery([IMG.urus, "On the coast road"], [IMG.aventador, "Family resemblance"]),
  },
  {
    id: 3,
    slug: "mercedes-amg-gt-black-series-review",
    title: "AMG GT Black Series: the loudest goodbye",
    dek: "A flat-plane V8, an aero package built for the Nordschleife and a ride that forgives nothing. We drove it on the road anyway.",
    content: shortBody(
      "Some cars are built to a brief. The Black Series was built to a lap time, and you feel that from the first metre: the steering is heavy, the ride is hard and the engine sounds like it is trying to escape.",
      "Flat-plane fury",
      "The crossplane crank is gone, replaced by a flat-plane design that revs harder and sounds rawer. It turns the GT from a muscular grand tourer into something much closer to a racing car.",
      "On a smooth road with nobody else around, it is one of the most exciting cars ever built."
    ),
    featured_image_url: IMG.amg.url,
    featured_image_alt: "Mercedes-AMG GT with large rear wing in a studio",
    category_id: 1,
    category_name: "Reviews",
    status: "published",
    view_count: 9420,
    published_at: ago(2, 2),
    created_at: ago(4),
    make: "Mercedes-AMG",
    article_type: "review",
    is_featured: false,
    reading_time_min: 8,
    tags: ["amg", "track"],
    ...authors.ines,
    specs: {
      power_hp: 720,
      torque_nm: 800,
      zero_to_100_s: 3.2,
      top_speed_kmh: 325,
      weight_kg: 1540,
      price_usd: 390000,
      drivetrain: "RWD",
      engine: "4.0L twin-turbo flat-plane V8",
      year: 2024,
      model: "AMG GT Black Series",
    },
    gallery: gallery([IMG.amg, "The rear wing is adjustable — by hand, with tools"]),
  },
  {
    id: 4,
    slug: "bmw-m4-csl-review",
    title: "BMW M4 CSL: three letters, one very good idea",
    dek: "Rear seats out, carbon in, and a straight-six that finally sounds like it means it. The best M car in a decade?",
    content: shortBody(
      "Remove the rear seats, swap the front ones for carbon buckets, lose a hundred kilograms and add power. The recipe is old; the execution here is close to perfect.",
      "A lighter, sharper M4",
      "The CSL turns in with a precision the standard car lacks and the rear axle is more playful without ever feeling nervous. It is a car you can drive at seven tenths and still enjoy.",
      "It feels engineered by people who drive, not people who read spec sheets."
    ),
    featured_image_url: IMG.bmw.url,
    featured_image_alt: "Grey BMW coupe on a race circuit",
    category_id: 1,
    category_name: "Reviews",
    status: "published",
    view_count: 7310,
    published_at: ago(3, 6),
    created_at: ago(5),
    make: "BMW",
    article_type: "review",
    is_featured: false,
    reading_time_min: 6,
    tags: ["bmw", "m"],
    ...authors.theo,
    specs: {
      power_hp: 543,
      torque_nm: 650,
      zero_to_100_s: 3.7,
      top_speed_kmh: 307,
      weight_kg: 1625,
      price_usd: 140000,
      drivetrain: "RWD",
      engine: "3.0L twin-turbo inline-6",
      year: 2024,
      model: "M4 CSL",
    },
    gallery: [],
  },
  {
    id: 5,
    slug: "aventador-last-v12-feature",
    title: "The last pure V12: one more night in the Aventador",
    dek: "Before hybrids rewrote the formula, there was this — 6.5 litres, no turbos, no batteries. A farewell drive through the city it was made for.",
    content: shortBody(
      "We picked it up at midnight, because some cars deserve an empty city. The Aventador is absurd in every dimension and in every way that matters, and it may be the last of its kind.",
      "Six and a half litres of theatre",
      "There is no other sound like a naturally aspirated V12 at 8,500rpm in a tunnel. It does not build so much as erupt, and the single-clutch gearbox punctuates every shift with a shove in the back.",
      "Some cars are fast. This one is an event."
    ),
    featured_image_url: IMG.aventador.url,
    featured_image_alt: "Lamborghini Aventador under city lights",
    category_id: 3,
    category_name: "Features",
    status: "published",
    view_count: 15880,
    published_at: ago(4, 1),
    created_at: ago(6),
    make: "Lamborghini",
    article_type: "feature",
    is_featured: true,
    reading_time_min: 12,
    tags: ["lamborghini", "v12"],
    ...authors.mara,
    specs: {
      power_hp: 769,
      torque_nm: 720,
      zero_to_100_s: 2.8,
      top_speed_kmh: 355,
      weight_kg: 1550,
      price_usd: 500000,
      drivetrain: "AWD",
      engine: "6.5L naturally aspirated V12",
      year: 2022,
      model: "Aventador Ultimae",
    },
    gallery: gallery([IMG.aventador, "Midnight, somewhere downtown"], [IMG.urus, "The sensible sibling"]),
  },
  {
    id: 6,
    slug: "inside-the-hot-vee",
    title: "Inside the hot vee: how modern V8s learned to breathe",
    dek: "Turbochargers tucked between the cylinder banks changed packaging, response and sound. An engineer's tour of the layout everyone now uses.",
    content: shortBody(
      "Look under the cover of almost any modern performance V8 and you will find the turbochargers sitting in the valley between the cylinder banks. It is a small change on a drawing; it reshaped a decade of engines.",
      "Shorter paths, faster answers",
      "With the turbos in the vee, exhaust gas travels a shorter distance before it reaches the turbine. Less volume to fill means quicker spool and sharper throttle response, which is exactly what drivers notice.",
      "The best engineering is the kind you only notice when it is missing."
    ),
    featured_image_url: IMG.engine.url,
    featured_image_alt: "Twin-turbo V8 engine bay",
    category_id: 3,
    category_name: "Features",
    status: "published",
    view_count: 5120,
    published_at: ago(5, 4),
    created_at: ago(8),
    make: "McLaren",
    article_type: "feature",
    is_featured: false,
    reading_time_min: 10,
    tags: ["engineering"],
    ...authors.ines,
    gallery: [],
  },
  {
    id: 7,
    slug: "mclaren-gts-chassis-update",
    title: "McLaren GTS gains a sharper chassis package for 2027",
    dek: "Retuned dampers, quicker steering and a new lightweight wheel option headline a quiet but meaningful update to the grand tourer.",
    content: shortBody(
      "McLaren's most comfortable car is getting a little less comfortable — on purpose. The 2027 GTS adds an optional chassis package aimed at drivers who want more feedback without giving up the long-distance ride.",
      "What changes",
      "The package brings retuned adaptive dampers, a faster steering rack and forged wheels that save weight at each corner. Pricing will be confirmed closer to first deliveries next spring.",
      "A grand tourer that wants to be driven, not just travelled in."
    ),
    featured_image_url: IMG.gts.url,
    featured_image_alt: "Silver McLaren grand tourer in profile",
    category_id: 2,
    category_name: "News",
    status: "published",
    view_count: 3890,
    published_at: ago(0, 8),
    created_at: ago(1),
    make: "McLaren",
    article_type: "news",
    is_featured: false,
    reading_time_min: 3,
    tags: ["mclaren", "news"],
    ...authors.theo,
    gallery: [],
  },
  {
    id: 8,
    slug: "720s-ten-thousand-km",
    title: "10,000 km in a 720S: what ownership really feels like",
    dek: "Tyres, tolls, one stone chip and a surprising number of supermarket runs. A year of living with a modern supercar.",
    content: shortBody(
      "Everybody asks the same first question: is it reliable? After 10,000 km, the honest answer is mostly yes — with one sensor fault, one software update and one very expensive set of tyres.",
      "The everyday supercar",
      "The 720S turned out to be easier to live with than expected. The nose lift saved us at every speed bump, the ride was supple enough for long trips and the fuel consumption was, given the performance, almost reasonable.",
      "It made every ordinary journey feel like an occasion — and that never wore off."
    ),
    featured_image_url: IMG.orange.url,
    featured_image_alt: "Orange McLaren 720S parked on a road",
    category_id: 3,
    category_name: "Features",
    status: "published",
    view_count: 8730,
    published_at: ago(6, 3),
    created_at: ago(9),
    make: "McLaren",
    article_type: "feature",
    is_featured: false,
    reading_time_min: 11,
    tags: ["ownership"],
    ...authors.mara,
    specs: {
      power_hp: 710,
      torque_nm: 770,
      zero_to_100_s: 2.9,
      top_speed_kmh: 341,
      weight_kg: 1419,
      price_usd: 299000,
      drivetrain: "RWD",
      engine: "4.0L twin-turbo V8",
      year: 2019,
      model: "720S",
    },
    gallery: gallery([IMG.orange, "Day 1"], [IMG.redmc, "Day 365 — with its successor"]),
  },
  {
    id: 9,
    slug: "noise-limits-2028",
    title: "New noise limits for performance cars arrive in 2028",
    dek: "Regulators confirm a stricter drive-by test. Here is what it means for exhausts, sound design and the cars you can buy.",
    content: shortBody(
      "The new drive-by noise test lowers the permitted limit and changes how cars are measured, closing loopholes that let some valved exhausts behave very differently on and off the test track.",
      "The details",
      "Manufacturers will have to certify cars across a broader range of speeds and gears. Expect more cars with quieter default modes and fewer pops and bangs from the factory.",
      "The era of the anti-social exhaust valve may finally be ending."
    ),
    featured_image_url: IMG.urus.url,
    featured_image_alt: "Performance SUV accelerating past a sound meter",
    category_id: 2,
    category_name: "News",
    status: "published",
    view_count: 2210,
    published_at: ago(1, 10),
    created_at: ago(2),
    make: null,
    article_type: "news",
    is_featured: false,
    reading_time_min: 4,
    tags: ["regulation"],
    ...authors.ines,
    gallery: [],
  },
  {
    id: 10,
    slug: "first-track-day-guide",
    title: "A first track day, done properly: a field guide",
    dek: "Tyres, brake fluid, flags and etiquette. Everything we wish someone had told us before our first session.",
    content: shortBody(
      "Your first track day will be the most nervous and the most rewarding morning you ever spend in a car. A little preparation turns the nerves into fun.",
      "Before you go",
      "Fresh, high-temperature brake fluid matters more than any modification. Check tyre pressures cold, then again after the first session, and bring more water than you think you need.",
      "Smooth is fast. Fast is not always smooth."
    ),
    featured_image_url: IMG.amg.url,
    featured_image_alt: "Performance coupe in the pit lane",
    category_id: 4,
    category_name: "Guides",
    status: "published",
    view_count: 4410,
    published_at: ago(8, 2),
    created_at: ago(10),
    make: "Mercedes-AMG",
    article_type: "feature",
    is_featured: false,
    reading_time_min: 8,
    tags: ["guide", "track"],
    ...authors.theo,
    gallery: [],
  },
  {
    id: 11,
    slug: "911-gt3-rs-long-term-intro",
    title: "Long-termer intro: a 911 GT3 RS joins the fleet",
    dek: "Six months, one very high-revving flat-six. What we want to learn.",
    content: shortBody(
      "Draft — intro copy pending photography.",
      "The plan",
      "Daily driving, two track days and a road trip to the Alps.",
      "Placeholder pull quote."
    ),
    featured_image_url: IMG.bmw.url,
    featured_image_alt: "Placeholder image",
    category_id: 3,
    category_name: "Features",
    status: "draft",
    view_count: 0,
    published_at: null,
    created_at: ago(0, 1),
    make: "Porsche",
    article_type: "feature",
    is_featured: false,
    reading_time_min: 5,
    tags: [],
    ...authors.mara,
    gallery: [],
  },
];

export const users = [
  {
    id: 1,
    email: "admin@example.com",
    password: "admin123",
    role: "admin",
    full_name: "Avery Admin",
    username: "admin",
    bio: "Runs the newsroom.",
    profile_image_url: null,
  },
  {
    id: 2,
    email: "some@gmail.com",
    password: "ppond333",
    role: "user",
    full_name: "Pond Reader",
    username: "pond",
    bio: "",
    profile_image_url: null,
  },
  {
    id: 3,
    email: "chayanon.5723@gmail.com",
    password: "ppond333",
    role: "user",
    full_name: "Demo Reader",
    username: "demo",
    bio: "",
    profile_image_url: null,
  },
];

export const comments = [
  {
    id: 1,
    article_id: 1,
    user_id: 2,
    user_name: "Pond Reader",
    content: "Hydraulic steering in 2026 is such a flex. Great read — the bit about the cambered corner is exactly how my old 570S felt.",
    created_at: ago(0, 2),
    replies: [
      {
        id: 2,
        article_id: 1,
        user_id: 1,
        user_name: "Avery Admin",
        content: "Thanks! We drove that corner about forty times for the photos, so we know it well.",
        created_at: ago(0, 1),
        replies: [],
      },
    ],
  },
  {
    id: 3,
    article_id: 1,
    user_id: 3,
    user_name: "Demo Reader",
    content: "Would love a back-to-back with the 296 GTB next.",
    created_at: ago(0, 1),
    replies: [],
  },
];

export const notifications = [
  {
    id: 1,
    type: "comment",
    title: "New reply",
    sender_name: "Avery Admin",
    action: "replied to your comment",
    message: "Thanks! We drove that corner about forty times…",
    data: { article_id: 1, comment_id: 2 },
    is_read: false,
    created_at: ago(0, 1),
  },
  {
    id: 2,
    type: "article_published",
    title: "New review",
    sender_name: "APEX",
    action: "published",
    message: "Urus Performante: an SUV that refuses to behave like one",
    data: { article_id: 2 },
    is_read: true,
    created_at: ago(1, 5),
  },
];

export const views7d = Array.from({ length: 7 }, (_, i) => ({
  date: new Date(Date.now() - (6 - i) * DAY).toISOString().slice(0, 10),
  views: [2140, 2630, 2390, 3120, 2870, 3540, 4010][i],
}));
