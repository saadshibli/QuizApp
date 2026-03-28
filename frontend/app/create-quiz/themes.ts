export interface ThemeConfig {
  id: string;
  name: string;
  image: string;
  glowClass: string;
  cardClass: string;
  buttonClass: string;
  accentText: string;
  borderClass: string;
}

export const THEMES: Record<string, ThemeConfig> = {
  none: {
    id: "none",
    name: "None (Default)",
    image: "",
    glowClass: "shadow-[0_0_50px_rgba(255,255,255,0.2)]",
    cardClass: "cartoon-panel",
    borderClass: "border-[rgba(255,255,255,0.3)]",
    buttonClass:
      "btn-cartoon btn-cartoon-outline !text-white bg-white/10 hover:bg-white/20 !border-white/40",
    accentText: "text-white",
  },
  space: {
    id: "space",
    name: "Classic Space",
    image: "/themes/space.png",
    glowClass: "shadow-[0_0_50px_rgba(168,85,247,0.4)]",
    cardClass: "cartoon-panel",
    borderClass: "border-[rgba(168,85,247,0.5)]",
    buttonClass: "btn-cartoon btn-cartoon-pink",
    accentText: "text-purple-300",
  },
  arctic: {
    id: "arctic",
    name: "Arctic Freeze",
    image: "/themes/arctic.png",
    glowClass: "shadow-[0_0_50px_rgba(56,189,248,0.4)]",
    cardClass: "cartoon-panel",
    borderClass: "border-[rgba(56,189,248,0.5)]",
    buttonClass: "btn-cartoon btn-cartoon-primary",
    accentText: "text-sky-300",
  },
  biology: {
    id: "biology",
    name: "Biology Lab",
    image: "/themes/biology.png",
    glowClass: "shadow-[0_0_50px_rgba(34,197,94,0.4)]",
    cardClass: "cartoon-panel",
    borderClass: "border-[rgba(34,197,94,0.5)]",
    buttonClass:
      "btn-cartoon !bg-green-500 hover:!bg-green-400 text-white !shadow-[0_4px_0_rgb(21,128,61),0_10px_20px_rgba(34,197,94,0.4)]",
    accentText: "text-green-300",
  },
  chemistry: {
    id: "chemistry",
    name: "Chemistry",
    image: "/themes/chemistry.png",
    glowClass: "shadow-[0_0_50px_rgba(236,72,153,0.4)]",
    cardClass: "cartoon-panel",
    borderClass: "border-[rgba(236,72,153,0.5)]",
    buttonClass: "btn-cartoon btn-cartoon-pink",
    accentText: "text-pink-300",
  },
  cyberpunk: {
    id: "cyberpunk",
    name: "Cyberpunk",
    image: "/themes/cyberpunk.png",
    glowClass: "shadow-[0_0_50px_rgba(217,70,239,0.4)]",
    cardClass: "cartoon-panel",
    borderClass: "border-[rgba(217,70,239,0.5)]",
    buttonClass:
      "btn-cartoon !bg-fuchsia-500 hover:!bg-fuchsia-400 text-white !shadow-[0_4px_0_rgb(162,28,175),0_10px_20px_rgba(217,70,239,0.4)]",
    accentText: "text-fuchsia-300",
  },
  english: {
    id: "english",
    name: "English Lit",
    image: "/themes/english.png",
    glowClass: "shadow-[0_0_50px_rgba(234,179,8,0.4)]",
    cardClass: "cartoon-panel",
    borderClass: "border-[rgba(234,179,8,0.5)]",
    buttonClass: "btn-cartoon btn-cartoon-warning",
    accentText: "text-yellow-300",
  },
  geography: {
    id: "geography",
    name: "Geography",
    image: "/themes/geography.png",
    glowClass: "shadow-[0_0_50px_rgba(59,130,246,0.4)]",
    cardClass: "cartoon-panel",
    borderClass: "border-[rgba(59,130,246,0.5)]",
    buttonClass:
      "btn-cartoon btn-cartoon-primary !bg-blue-500 hover:!bg-blue-400 !shadow-[0_4px_0_rgb(29,78,216),0_10px_20px_rgba(59,130,246,0.4)] text-white",
    accentText: "text-blue-300",
  },
  history: {
    id: "history",
    name: "History",
    image: "/themes/history.png",
    glowClass: "shadow-[0_0_50px_rgba(217,119,6,0.4)]",
    cardClass: "cartoon-panel",
    borderClass: "border-[rgba(217,119,6,0.5)]",
    buttonClass:
      "btn-cartoon !bg-amber-600 hover:!bg-amber-500 text-white !shadow-[0_4px_0_rgb(180,83,9),0_10px_20px_rgba(217,119,6,0.4)]",
    accentText: "text-amber-300",
  },
  jungle: {
    id: "jungle",
    name: "Jungle",
    image: "/themes/jungle.png",
    glowClass: "shadow-[0_0_50px_rgba(22,163,74,0.4)]",
    cardClass: "cartoon-panel",
    borderClass: "border-[rgba(22,163,74,0.5)]",
    buttonClass:
      "btn-cartoon !bg-green-600 hover:!bg-green-500 text-white !shadow-[0_4px_0_rgb(21,128,61),0_10px_20px_rgba(22,163,74,0.4)]",
    accentText: "text-green-400",
  },
  maths: {
    id: "maths",
    name: "Mathematics",
    image: "/themes/maths.png",
    glowClass: "shadow-[0_0_50px_rgba(63,100,229,0.4)]",
    cardClass: "cartoon-panel",
    borderClass: "border-[rgba(63,100,229,0.5)]",
    buttonClass: "btn-cartoon btn-cartoon-primary",
    accentText: "text-indigo-300",
  },
  midnight: {
    id: "midnight",
    name: "Midnight",
    image: "/themes/midnight.png",
    glowClass: "shadow-[0_0_50px_rgba(30,27,75,0.4)]",
    cardClass: "cartoon-panel",
    borderClass: "border-[rgba(76,29,149,0.5)]",
    buttonClass:
      "btn-cartoon !bg-indigo-900 hover:!bg-indigo-800 text-white !shadow-[0_4px_0_rgb(49,46,129),0_10px_20px_rgba(49,46,129,0.4)]",
    accentText: "text-indigo-200",
  },
  physics: {
    id: "physics",
    name: "Physics",
    image: "/themes/physics.png",
    glowClass: "shadow-[0_0_50px_rgba(6,182,212,0.4)]",
    cardClass: "cartoon-panel",
    borderClass: "border-[rgba(6,182,212,0.5)]",
    buttonClass:
      "btn-cartoon !bg-cyan-500 hover:!bg-cyan-400 text-white !shadow-[0_4px_0_rgb(8,145,178),0_10px_20px_rgba(6,182,212,0.4)]",
    accentText: "text-cyan-300",
  },
  sea: {
    id: "sea",
    name: "Deep Sea",
    image: "/themes/sea.png",
    glowClass: "shadow-[0_0_50px_rgba(14,165,233,0.4)]",
    cardClass: "cartoon-panel",
    borderClass: "border-[rgba(14,165,233,0.5)]",
    buttonClass:
      "btn-cartoon !bg-sky-500 hover:!bg-sky-400 text-white !shadow-[0_4px_0_rgb(2,132,199),0_10px_20px_rgba(14,165,233,0.4)]",
    accentText: "text-sky-300",
  },
  sunlight: {
    id: "sunlight",
    name: "Sunlight",
    image: "/themes/sunlight.png",
    glowClass: "shadow-[0_0_50px_rgba(253,224,71,0.4)]",
    cardClass: "cartoon-panel",
    borderClass: "border-[rgba(253,224,71,0.5)]",
    buttonClass: "btn-cartoon btn-cartoon-warning",
    accentText: "text-yellow-200",
  },
  sunset: {
    id: "sunset",
    name: "Warm Sunset",
    image: "/themes/sunset.png",
    glowClass: "shadow-[0_0_50px_rgba(249,115,22,0.4)]",
    cardClass: "cartoon-panel",
    borderClass: "border-[rgba(249,115,22,0.5)]",
    buttonClass:
      "btn-cartoon !bg-orange-500 hover:!bg-orange-400 text-white !shadow-[0_4px_0_rgb(194,65,12),0_10px_20px_rgba(249,115,22,0.4)]",
    accentText: "text-orange-300",
  },
  underwater: {
    id: "underwater",
    name: "Underwater",
    image: "/themes/underwater.png",
    glowClass: "shadow-[0_0_50px_rgba(8,145,178,0.4)]",
    cardClass: "cartoon-panel",
    borderClass: "border-[rgba(8,145,178,0.5)]",
    buttonClass:
      "btn-cartoon !bg-cyan-600 hover:!bg-cyan-500 text-white !shadow-[0_4px_0_rgb(22,78,99),0_10px_20px_rgba(8,145,178,0.4)]",
    accentText: "text-cyan-400",
  },
  volcano: {
    id: "volcano",
    name: "Volcano",
    image: "/themes/volcano.png",
    glowClass: "shadow-[0_0_50px_rgba(239,68,68,0.4)]",
    cardClass: "cartoon-panel",
    borderClass: "border-[rgba(239,68,68,0.5)]",
    buttonClass: "btn-cartoon btn-cartoon-danger",
    accentText: "text-red-300",
  },
};

