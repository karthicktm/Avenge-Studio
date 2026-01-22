export interface VideoPrompt {
  id: string;
  title: string;
  description: string;
  image: string;
  category: VideoPromptCategory;
  prompt: string;
}

export type VideoPromptCategory =
  | "all"
  | "cinematic"
  | "animation"
  | "commercial"
  | "documentary"
  | "music-video"
  | "action"
  | "historical"
  | "sci-fi";

export const videoPrompts: VideoPrompt[] = [
  // Cinematic Movie Scenes
  {
    id: "fantasy-battle-epic",
    title: "Fantasy Battle Epic",
    description: "Cinematic fantasy battle scene with dramatic lighting",
    image: "/images/prompts/video/fantasy-battle-epic.jpg",
    category: "cinematic",
    prompt: `Epic fantasy battle scene, armored warrior charging through a misty battlefield at dawn, swinging a glowing enchanted sword, surrounded by falling embers and sparks, dark army visible in the background, dramatic low-angle tracking shot, golden hour lighting mixed with magical blue glow, slow motion capture, cinematic color grading with deep shadows and warm highlights, 4K cinematic quality.`,
  },
  {
    id: "noir-detective",
    title: "Noir Detective",
    description: "Classic film noir detective scene with moody atmosphere",
    image: "/images/prompts/video/noir-detective.jpg",
    category: "cinematic",
    prompt: `Film noir detective scene, trench-coated figure walking down a rain-slicked city alley at night, neon signs reflecting on wet pavement, cigarette smoke curling in the air, shadows from Venetian blinds casting across the scene, slow dolly shot following the subject, high contrast black and white with selective color on neon, jazz-influenced pacing, classic 1940s cinematic atmosphere.`,
  },
  {
    id: "romantic-sunset",
    title: "Romantic Sunset",
    description: "Emotional couple moment during golden hour",
    image: "/images/prompts/video/romantic-sunset.jpg",
    category: "cinematic",
    prompt: `Romantic cinematic scene, couple silhouetted against a vibrant sunset on a beach, gentle waves lapping at their feet, hair flowing in the breeze, slow orbit shot around subjects, golden hour backlighting creating lens flares, shallow depth of field with bokeh, warm amber and pink color grading, emotional and dreamy atmosphere, 4K quality.`,
  },
  {
    id: "thriller-chase",
    title: "Thriller Chase",
    description: "Intense urban chase sequence with dynamic camera",
    image: "/images/prompts/video/thriller-chase.jpg",
    category: "cinematic",
    prompt: `Intense thriller chase scene, person running through crowded city streets, weaving between pedestrians and cars, handheld camera following close behind, quick cuts and dynamic angles, motion blur on background elements, night setting with street lights and car headlights, desaturated color palette with teal and orange tones, heart-pounding cinematic tension.`,
  },
  {
    id: "horror-atmosphere",
    title: "Horror Atmosphere",
    description: "Creepy atmospheric scene with suspenseful mood",
    image: "/images/prompts/video/horror-atmosphere.jpg",
    category: "cinematic",
    prompt: `Atmospheric horror scene, abandoned Victorian mansion hallway, single figure walking slowly with a flickering candle, shadows dancing on peeling wallpaper, creaking floorboards suggested by movement, slow steady tracking shot from behind, cold desaturated color palette with occasional warm candlelight, fog drifting through doorways, unsettling and suspenseful mood.`,
  },

  // Animation/Cartoon Sequences
  {
    id: "pixar-adventure",
    title: "Pixar Style Adventure",
    description: "Heartwarming animated character moment",
    image: "/images/prompts/video/pixar-adventure.jpg",
    category: "animation",
    prompt: `Pixar-style 3D animation, adorable robot character discovering a butterfly in a sunlit meadow, expressive eyes widening with wonder, smooth character animation with subtle secondary motion, vibrant saturated colors, soft global illumination, gentle camera push-in to capture the emotional moment, whimsical and heartwarming atmosphere.`,
  },
  {
    id: "anime-action",
    title: "Anime Action",
    description: "Dynamic anime-style combat sequence",
    image: "/images/prompts/video/anime-action.jpg",
    category: "animation",
    prompt: `Anime action sequence, skilled warrior performing rapid sword slashes, dynamic speed lines and motion trails, dramatic pose freezes with impact frames, wind-swept hair and flowing cape, cherry blossom petals swirling around, sharp cel-shaded style, dramatic camera angles with quick zooms, vibrant color palette with high contrast, Japanese animation influence.`,
  },
  {
    id: "cartoon-comedy",
    title: "Cartoon Comedy",
    description: "Looney Tunes style comedic animation",
    image: "/images/prompts/video/cartoon-comedy.jpg",
    category: "animation",
    prompt: `Classic cartoon comedy sequence, exaggerated character reactions with squash and stretch, eyes popping out comically, over-the-top facial expressions, bright primary colors, smooth 2D animation with bouncy timing, slapstick humor movements, playful camera shakes on impacts, nostalgic Saturday morning cartoon style.`,
  },
  {
    id: "studio-ghibli",
    title: "Studio Ghibli Dream",
    description: "Peaceful Ghibli-inspired animated scene",
    image: "/images/prompts/video/studio-ghibli.jpg",
    category: "animation",
    prompt: `Studio Ghibli inspired animation, young character running through lush green countryside, fluffy cumulus clouds in bright blue sky, tall grass swaying in gentle breeze, hand-painted background aesthetic, soft watercolor textures, peaceful and nostalgic atmosphere, gentle camera pan following movement, warm natural lighting, serene and magical mood.`,
  },
  {
    id: "stop-motion-craft",
    title: "Stop Motion Craft",
    description: "Tactile handcrafted stop motion animation",
    image: "/images/prompts/video/stop-motion-craft.jpg",
    category: "animation",
    prompt: `Stop motion animation style, handcrafted felt and fabric characters in a miniature world, visible texture and stitching details, warm practical lighting casting soft shadows, slightly jerky authentic stop motion movement, cozy cottage interior setting, whimsical props and decorations, intimate camera angles, charming and tactile aesthetic.`,
  },

  // Commercial/Product Showcase
  {
    id: "tech-product-reveal",
    title: "Tech Product Reveal",
    description: "Sleek smartphone or device unveiling",
    image: "/images/prompts/video/tech-product-reveal.jpg",
    category: "commercial",
    prompt: `Premium tech product reveal, sleek smartphone rotating on a reflective black surface, subtle light traces following the device edges, smooth 360-degree orbit, minimalist dark environment with gradient lighting, sharp specular highlights on glass and metal, elegant slow motion, premium brand aesthetic, Apple-style commercial quality.`,
  },
  {
    id: "cosmetics-luxury",
    title: "Luxury Cosmetics",
    description: "Elegant beauty product commercial shot",
    image: "/images/prompts/video/cosmetics-luxury.jpg",
    category: "commercial",
    prompt: `Luxury cosmetics commercial, lipstick rising from golden case in slow motion, rich creamy texture visible, soft particles of shimmer floating in air, dramatic side lighting on dark background, macro detail shot transitioning to product reveal, silk fabric flowing in background, opulent and sensual atmosphere, high-end beauty brand aesthetic.`,
  },
  {
    id: "food-commercial",
    title: "Food Commercial",
    description: "Appetizing food preparation shot",
    image: "/images/prompts/video/food-commercial.jpg",
    category: "commercial",
    prompt: `Mouth-watering food commercial, fresh burger being assembled in slow motion, ingredients falling into place, lettuce crisp and glistening, cheese melting over patty, sesame seeds bouncing on bun, dramatic lighting emphasizing textures, steam rising, high-speed camera capture, appetizing color grading with warm tones, professional food photography style.`,
  },
  {
    id: "car-commercial",
    title: "Car Commercial",
    description: "Dynamic automotive showcase sequence",
    image: "/images/prompts/video/car-commercial.jpg",
    category: "commercial",
    prompt: `Cinematic car commercial, luxury vehicle driving along coastal mountain road at sunset, aerial drone following shot, sun flares through windows, chrome reflecting golden light, dynamic camera moves around the car, dust particles in light beams, dramatic landscape background, premium automotive advertising aesthetic, epic and aspirational mood.`,
  },
  {
    id: "fashion-runway",
    title: "Fashion Runway",
    description: "High fashion model walking runway",
    image: "/images/prompts/video/fashion-runway.jpg",
    category: "commercial",
    prompt: `High fashion runway sequence, model walking confidently in avant-garde couture, dramatic structured silhouette, flowing fabric catching the light, slow motion fabric movement, strong directional spotlight creating rim lighting, minimal dark runway environment, fashion week atmosphere, editorial photography style translated to video, elegant and powerful.`,
  },

  // Documentary Style
  {
    id: "wildlife-predator",
    title: "Wildlife Predator",
    description: "Nature documentary predator hunting scene",
    image: "/images/prompts/video/wildlife-predator.jpg",
    category: "documentary",
    prompt: `Nature documentary style, lion stalking through tall golden savannah grass at golden hour, muscles tensing under fur, intense focused gaze, slow motion capture of movement, shallow depth of field, dust particles in warm sunlight, telephoto lens compression, BBC Earth quality, dramatic tension building, authentic wildlife behavior.`,
  },
  {
    id: "underwater-ocean",
    title: "Ocean Depths",
    description: "Stunning underwater marine life footage",
    image: "/images/prompts/video/underwater-ocean.jpg",
    category: "documentary",
    prompt: `Underwater documentary footage, vibrant coral reef teeming with tropical fish, sea turtle gliding gracefully through frame, sunbeams filtering through crystal blue water, schools of fish moving in synchronized patterns, gentle camera movement following marine life, rich saturated colors, peaceful and mesmerizing atmosphere, National Geographic quality.`,
  },
  {
    id: "travel-adventure",
    title: "Travel Adventure",
    description: "Inspiring travel vlog exploration scene",
    image: "/images/prompts/video/travel-adventure.jpg",
    category: "documentary",
    prompt: `Travel vlog footage, adventurer hiking through misty mountain landscape, drone reveal shot pulling back to show vast scenery, golden hour lighting through clouds, epic scale establishing shot, person pausing to take in the view, authentic handheld moments mixed with cinematic aerials, inspiring and wanderlust-inducing atmosphere.`,
  },
  {
    id: "street-culture",
    title: "Street Culture",
    description: "Urban street life documentary style",
    image: "/images/prompts/video/street-culture.jpg",
    category: "documentary",
    prompt: `Street documentary style, bustling Tokyo street at night, neon signs reflecting on wet pavement, diverse crowd moving through frame, street food vendor steam rising, authentic candid moments, handheld camera with natural movement, rich contrast between neon lights and shadows, urban energy and culture captured authentically.`,
  },
  {
    id: "space-cosmos",
    title: "Cosmic Journey",
    description: "Awe-inspiring space exploration footage",
    image: "/images/prompts/video/space-cosmos.jpg",
    category: "documentary",
    prompt: `Space documentary style, camera flying through colorful nebula clouds, stars twinkling in deep space background, planet slowly rotating into frame, rings of Saturn catching sunlight, cosmic dust particles drifting, orchestral documentary tone, awe-inspiring sense of scale, NASA-quality visualization with cinematic enhancement.`,
  },

  // Music Video Style
  {
    id: "concert-performance",
    title: "Concert Performance",
    description: "Energetic live performance footage",
    image: "/images/prompts/video/concert-performance.jpg",
    category: "music-video",
    prompt: `Live concert performance, rock band on stage with dramatic lighting, lead singer in powerful pose, crowd hands raised in background, rapid moving lights and laser effects, smoke machine atmosphere, dynamic camera moving through crowd to stage, quick cuts matching music energy, high contrast lighting, raw and electric atmosphere.`,
  },
  {
    id: "aesthetic-dreamy",
    title: "Dreamy Aesthetic",
    description: "Soft ethereal music video visuals",
    image: "/images/prompts/video/aesthetic-dreamy.jpg",
    category: "music-video",
    prompt: `Dreamy music video aesthetic, figure dancing slowly in flowing white dress, soft diffused backlighting, flower petals floating in air, slow motion graceful movement, lens with soft glow filter, pastel color palette with pink and lavender tones, ethereal and romantic atmosphere, gentle camera float and sway.`,
  },
  {
    id: "hiphop-urban",
    title: "Hip Hop Urban",
    description: "Street style hip hop music video",
    image: "/images/prompts/video/hiphop-urban.jpg",
    category: "music-video",
    prompt: `Urban hip hop music video, artist performing in gritty city alley, graffiti walls as backdrop, crew surrounding with attitude, dynamic low angle shots, stylish streetwear fashion, hard shadows from single light source, slow motion confident walk, smoke and atmospheric haze, raw urban energy and authenticity.`,
  },
  {
    id: "retro-synthwave",
    title: "Retro Synthwave",
    description: "80s inspired neon visual style",
    image: "/images/prompts/video/retro-synthwave.jpg",
    category: "music-video",
    prompt: `Synthwave retro music video, neon grid landscape stretching to horizon, sunset with pink and purple gradient sky, chrome sports car driving through, palm trees silhouetted against glow, VHS scan lines and chromatic aberration, 80s aesthetic with modern quality, nostalgic and futuristic blend, outrun visual style.`,
  },
  {
    id: "artistic-abstract",
    title: "Artistic Abstract",
    description: "Creative abstract visual performance",
    image: "/images/prompts/video/artistic-abstract.jpg",
    category: "music-video",
    prompt: `Abstract artistic music video, dancer performing contemporary moves, projected visuals mapping onto body, paint splashes and ink drops in slow motion, multiple exposure layering effects, bold color contrasts, experimental camera angles and movements, artistic and avant-garde aesthetic, visually striking and unconventional.`,
  },

  // Action/Sports
  {
    id: "extreme-sports",
    title: "Extreme Sports",
    description: "Adrenaline-pumping action sports footage",
    image: "/images/prompts/video/extreme-sports.jpg",
    category: "action",
    prompt: `Extreme sports highlight, snowboarder performing aerial trick off massive jump, snow spraying in slow motion, GoPro-style POV transitioning to tracking shot, mountain panorama in background, golden hour lighting on snow, dynamic camera following the action, heart-pumping energy, Red Bull commercial aesthetic.`,
  },
  {
    id: "martial-arts",
    title: "Martial Arts",
    description: "Skilled combat choreography sequence",
    image: "/images/prompts/video/martial-arts.jpg",
    category: "action",
    prompt: `Martial arts action sequence, skilled fighter performing fluid combat moves, traditional dojo setting with wooden floor, dramatic side lighting creating sharp shadows, slow motion capturing precise technique, fabric of gi flowing with movement, powerful stance and focused expression, cinematic fight choreography style.`,
  },
  {
    id: "basketball-highlight",
    title: "Basketball Highlight",
    description: "Dramatic sports moment capture",
    image: "/images/prompts/video/basketball-highlight.jpg",
    category: "action",
    prompt: `Basketball championship moment, player rising for slam dunk in slow motion, crowd blurred in excitement behind, sweat droplets visible in arena lights, ball about to go through hoop, dramatic low angle looking up, time frozen at peak moment, stadium atmosphere with dramatic lighting, ESPN highlight quality.`,
  },
  {
    id: "parkour-flow",
    title: "Parkour Flow",
    description: "Smooth urban free running sequence",
    image: "/images/prompts/video/parkour-flow.jpg",
    category: "action",
    prompt: `Parkour free running sequence, athlete flowing through urban environment, vaulting over obstacles and wall running, smooth continuous tracking shot, rooftop jumps with city skyline backdrop, golden hour side lighting, dynamic camera keeping pace with movement, fluid and athletic motion, urban exploration aesthetic.`,
  },
  {
    id: "racing-speed",
    title: "Racing Speed",
    description: "High-speed motorsport action",
    image: "/images/prompts/video/racing-speed.jpg",
    category: "action",
    prompt: `Motorsport racing footage, Formula 1 car speeding around track corner, tire smoke from drifting, motion blur showing extreme speed, trackside camera angle, sparks flying from underside, dramatic slow motion on overtake, crowd cheering in stands, high-octane adrenaline, broadcast quality racing footage.`,
  },

  // Historical Drama
  {
    id: "medieval-castle",
    title: "Medieval Castle",
    description: "Epic medieval period drama scene",
    image: "/images/prompts/video/medieval-castle.jpg",
    category: "historical",
    prompt: `Medieval historical drama, knight in full armor standing in torch-lit castle great hall, stone walls and tapestries visible, flickering firelight casting dancing shadows, dramatic low angle emphasizing power, slight camera drift for life, period-accurate costume details, Game of Thrones production quality, epic and atmospheric.`,
  },
  {
    id: "victorian-era",
    title: "Victorian Era",
    description: "Elegant Victorian period piece scene",
    image: "/images/prompts/video/victorian-era.jpg",
    category: "historical",
    prompt: `Victorian period drama, elegantly dressed woman descending grand staircase in manor house, candlelit chandeliers, rich velvet and wood interiors, flowing period gown, steady tracking shot following movement, warm golden lighting, attention to historical costume detail, Downton Abbey aesthetic quality.`,
  },
  {
    id: "ancient-rome",
    title: "Ancient Rome",
    description: "Epic Roman Empire historical scene",
    image: "/images/prompts/video/ancient-rome.jpg",
    category: "historical",
    prompt: `Ancient Rome epic scene, gladiator entering the Colosseum arena, roaring crowd filling the stands, dust floating in harsh sunlight, dramatic shadows from architecture, slow motion confident walk, Roman architecture and costumes, cinematic wide establishing shot, Gladiator movie quality, epic historical atmosphere.`,
  },
  {
    id: "samurai-japan",
    title: "Samurai Japan",
    description: "Feudal Japanese warrior scene",
    image: "/images/prompts/video/samurai-japan.jpg",
    category: "historical",
    prompt: `Feudal Japan samurai scene, lone warrior standing in bamboo forest, traditional armor and katana, morning mist swirling between stalks, soft diffused lighting, cherry blossom petals drifting, meditative stillness, slow camera push toward subject, authentic period details, Kurosawa-inspired cinematography.`,
  },
  {
    id: "western-frontier",
    title: "Western Frontier",
    description: "Classic American Western scene",
    image: "/images/prompts/video/western-frontier.jpg",
    category: "historical",
    prompt: `Classic Western scene, lone cowboy on horseback silhouetted against sunset, Monument Valley landscape, dust kicked up by hooves, long shadows stretching across desert, wide panoramic establishing shot, warm amber and orange color grading, authentic frontier atmosphere, Sergio Leone style cinematography.`,
  },

  // Sci-Fi/Fantasy
  {
    id: "cyberpunk-city",
    title: "Cyberpunk City",
    description: "Futuristic neon-lit urban dystopia",
    image: "/images/prompts/video/cyberpunk-city.jpg",
    category: "sci-fi",
    prompt: `Cyberpunk cityscape, flying cars weaving between massive skyscrapers, holographic advertisements everywhere, rain falling through neon light, dense urban atmosphere, camera following vehicle through traffic, Blade Runner aesthetic, pink and cyan color palette, futuristic and dystopian mood, high detail sci-fi world building.`,
  },
  {
    id: "space-station",
    title: "Space Station",
    description: "Orbital space station interior scene",
    image: "/images/prompts/video/space-station.jpg",
    category: "sci-fi",
    prompt: `Sci-fi space station interior, astronaut floating in zero gravity through corridor, Earth visible through window, blinking control panels and screens, smooth weightless movement, subtle lens flares from lights, futuristic but grounded design, The Expanse production quality, immersive and realistic space environment.`,
  },
  {
    id: "alien-planet",
    title: "Alien Planet",
    description: "Exploration of otherworldly landscape",
    image: "/images/prompts/video/alien-planet.jpg",
    category: "sci-fi",
    prompt: `Alien planet exploration, astronaut in futuristic suit walking across surreal landscape, bioluminescent plants glowing, two moons in purple sky, strange rock formations, helmet cam POV moments mixed with wide shots, sense of wonder and isolation, high concept science fiction, visually stunning alien world.`,
  },
  {
    id: "robot-awakening",
    title: "Robot Awakening",
    description: "AI robot gaining consciousness moment",
    image: "/images/prompts/video/robot-awakening.jpg",
    category: "sci-fi",
    prompt: `Sci-fi robot awakening scene, humanoid android opening eyes for first time, soft blue LED glow from within, pristine white laboratory setting, slow motion eyelids opening, camera pushing in on face, reflection of scientists visible in eye surface, emotional and contemplative moment, Ex Machina aesthetic quality.`,
  },
  {
    id: "portal-dimension",
    title: "Portal Dimension",
    description: "Interdimensional portal opening sequence",
    image: "/images/prompts/video/portal-dimension.jpg",
    category: "sci-fi",
    prompt: `Interdimensional portal opening, swirling vortex of energy forming in midair, crackling electricity and warping light, person stepping through into unknown, dramatic lighting changes as portal activates, reality bending visual effects, camera orbiting the phenomenon, Doctor Strange inspired magic, visually spectacular and mysterious.`,
  },
];

// Pre-computed indexes for O(1) lookups
const videoPromptsById = new Map<string, VideoPrompt>(
  videoPrompts.map((p) => [p.id, p])
);

const videoPromptsByCategory = new Map<VideoPromptCategory, VideoPrompt[]>();
videoPromptsByCategory.set("all", videoPrompts);
for (const prompt of videoPrompts) {
  const existing = videoPromptsByCategory.get(prompt.category) || [];
  existing.push(prompt);
  videoPromptsByCategory.set(prompt.category, existing);
}

export function getVideoPromptById(id: string): VideoPrompt | undefined {
  return videoPromptsById.get(id);
}

export function getVideoPromptsByCategory(
  category: VideoPromptCategory
): VideoPrompt[] {
  return videoPromptsByCategory.get(category) || [];
}
