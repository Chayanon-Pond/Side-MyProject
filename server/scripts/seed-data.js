export const SAMPLE_CATEGORIES = [
  { name: 'Technology', slug: 'technology', description: 'Articles about technology and innovation' },
  { name: 'Lifestyle', slug: 'lifestyle', description: 'Lifestyle and personal development articles' },
  { name: 'Travel', slug: 'travel', description: 'Travel guides and experiences' },
  { name: 'Food', slug: 'food', description: 'Food reviews and recipes' },
  { name: 'Business', slug: 'business', description: 'Business and entrepreneurship content' },
  { name: 'Supercars', slug: 'supercars', description: 'Mid-engined exotics and grand tourers' },
  { name: 'Performance SUVs', slug: 'performance-suvs', description: 'High-riding cars with supercar pace' },
];

/**
 * Demo car articles. The editorial text is original. Spec figures are the manufacturers'
 * published launch numbers as widely reported (power converted from PS to hp, weight is the
 * quoted dry/kerb figure, price is an approximate US base MSRP). Fine for a demo, not a buying guide.
 */
export const SAMPLE_ARTICLES = [
  {
    title: 'McLaren 720S Review: The Benchmark That Refuses to Age',
    slug: 'mclaren-720s-review',
    category_slug: 'supercars',
    make: 'McLaren',
    article_type: 'review',
    is_featured: true,
    dek: 'Years after launch, the 720S still makes most rivals feel a step behind, on the road and on the clock.',
    excerpt: 'A carbon tub, a twin-turbo V8 and hydraulic steering that talks to you: why the 720S remains the reference point.',
    featured_image_alt: 'Orange McLaren 720S on a mountain road',
    specs: {
      power_hp: 710, torque_nm: 770, zero_to_100_s: 2.9, top_speed_kmh: 341, weight_kg: 1283,
      price_usd: 299000, drivetrain: 'RWD', engine: '4.0L twin-turbo V8', year: 2018, model: '720S',
    },
    content: `<h2>Still the yardstick</h2>
<p>Some cars feel fast because they are loud. The 720S feels fast because the scenery simply rearranges itself. Squeeze the throttle in third and the horizon arrives with a strange calm, the turbos building pressure so smoothly that you only notice the speed when you glance down and do the maths.</p>
<p>Underneath sits a carbon tub that keeps the cabin stiff and the weight low. The doors swing up and out, taking a chunk of roof with them, so getting in is easier than any car this low has a right to be. Once inside, visibility is the surprise: thin pillars and a lot of glass mean you can actually place the car on a narrow road.</p>
<h3>Steering and ride</h3>
<p>The hydraulic steering is the headline for drivers. It writhes gently in your hands, telling you about cambers and grip in a way electric racks rarely manage. The linked hydraulic suspension then does something odd for a car this capable: it rides well. Broken tarmac that would rattle a rival is smoothed into a firm, controlled hum.</p>
<blockquote class="pull-quote">It rides like a grand tourer and corners like a track car, which is not a combination you are supposed to get.</blockquote>
<h3>What to watch</h3>
<p>The infotainment is functional rather than charming, and the folding driver display is a novelty you will use twice. Running costs are, predictably, supercar-sized. None of that changes the verdict: if you want to understand where the modern supercar bar sits, drive one of these first.</p>`,
  },
  {
    title: 'McLaren GTS Arrives as a Sharper, Lighter Grand Tourer',
    slug: 'mclaren-gts-launch',
    category_slug: 'supercars',
    make: 'McLaren',
    article_type: 'news',
    is_featured: false,
    dek: 'The GT gets a new name, more power and less weight, while keeping the luggage space that made it usable.',
    excerpt: 'McLaren replaces the GT with the GTS: more power, a lighter build and a quicker sprint to 100 km/h.',
    featured_image_alt: 'McLaren GTS parked in a city street at dusk',
    specs: {
      power_hp: 626, torque_nm: 630, zero_to_100_s: 3.2, top_speed_kmh: 326, weight_kg: 1520,
      price_usd: 203000, drivetrain: 'RWD', engine: '4.0L twin-turbo V8', year: 2024, model: 'GTS',
    },
    content: `<h2>A GT that remembers it is a McLaren</h2>
<p>McLaren has refreshed its most practical car and given it a new badge. The GTS keeps the long-tail shape and the glazed luggage bay over the engine, but trims weight and adds power, aiming to answer critics who found the outgoing GT a little too polite.</p>
<p>The twin-turbo V8 now delivers more power than before, and the car is quicker from a standstill. The nose lift raises faster too, which matters more than it sounds for anyone who has scraped a splitter on a steep driveway.</p>
<h3>What changes inside</h3>
<p>The cabin carries over its leather-and-suede layout with small updates to materials and the infotainment software. The rear storage area remains big enough for a weekend of soft bags, which is the point of the car.</p>
<p>Expect it to compete less with track-focused rivals and more with front-engined grand tourers from Italy and Germany.</p>`,
  },
  {
    title: 'Lamborghini Urus Review: The Super SUV That Changed the Brand',
    slug: 'lamborghini-urus-review',
    category_slug: 'performance-suvs',
    make: 'Lamborghini',
    article_type: 'review',
    is_featured: false,
    dek: 'Purists rolled their eyes. Then the Urus became the best-selling Lamborghini ever made.',
    excerpt: 'Twin-turbo V8, rear-wheel steering and room for five: what the Urus gets right and where its size shows.',
    featured_image_alt: 'Yellow Lamborghini Urus on a gravel road',
    specs: {
      power_hp: 641, torque_nm: 850, zero_to_100_s: 3.6, top_speed_kmh: 305, weight_kg: 2200,
      price_usd: 218000, drivetrain: 'AWD', engine: '4.0L twin-turbo V8', year: 2019, model: 'Urus',
    },
    content: `<h2>Big, brash and genuinely quick</h2>
<p>The Urus does not pretend to be subtle. The bodywork is all hard creases and hexagons, and the start button hides under a red flip cover borrowed from a fighter jet. It is theatre, and it works.</p>
<p>What surprises is how well it hides its mass. Active anti-roll bars and rear-wheel steering shrink the car in tight corners, and the twin-turbo V8 pulls with a deep, relentless shove. On a fast, flowing road it covers ground with an ease few lower cars can match.</p>
<h3>Living with it</h3>
<p>In its road mode the ride is firm but liveable, the cabin is quiet at a cruise and there is real space in the back. The chunky drive-mode lever is fun to flick between settings even if you will mostly leave it alone.</p>
<p>The weak spots are the size, which makes multi-storey car parks a chore, and fuel consumption that turns ugly the moment you enjoy it. As a do-everything exotic, though, it is hard to argue with.</p>`,
  },
  {
    title: 'Mercedes-AMG GT 63 S 4-Door: The Fast Family Car Taken Too Far',
    slug: 'mercedes-amg-gt-63-s-4-door-feature',
    category_slug: 'supercars',
    make: 'Mercedes-AMG',
    article_type: 'feature',
    is_featured: false,
    dek: 'Four doors, four seats and a hand-built V8: inside the car that makes the school run feel like a qualifying lap.',
    excerpt: 'How AMG built a four-door coupe that can live with supercars, and what that costs in comfort.',
    featured_image_alt: 'Grey Mercedes-AMG GT 4-Door Coupe at speed on a motorway',
    specs: {
      power_hp: 630, torque_nm: 900, zero_to_100_s: 3.2, top_speed_kmh: 315, weight_kg: 2045,
      price_usd: 159000, drivetrain: 'AWD', engine: '4.0L twin-turbo V8', year: 2019, model: 'GT 63 S 4-Door Coupe',
    },
    content: `<h2>One engineer, one engine</h2>
<p>At the AMG engine shop, each V8 is assembled by a single technician who signs a plaque on top. It is a small ritual, but it sets the tone for a car that treats practicality as a box to tick on the way to something more extreme.</p>
<p>The GT 63 S 4-Door sends its power through an all-wheel-drive system that can, with the right settings, send everything to the rear axle. That party trick is less important than the everyday reality: huge traction, in any weather, from a car with a proper boot.</p>
<h3>The trade-offs</h3>
<p>The ride on the largest wheels is busy, the rear seats are snug for tall adults and the glossy screens collect fingerprints. But on a damp road, with the exhaust valves open, few four-door cars feel this alive.</p>
<p>It is not the most sensible way to carry a family. It might be the most entertaining.</p>`,
  },
];
