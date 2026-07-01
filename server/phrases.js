const PHRASES = [
  "The quick brown fox jumps over the lazy dog.",
  "Snails may be slow but they always get there in the end.",
  "A sloth hangs from the branch without a care in the world.",
  "Practice makes perfect when you type every single day.",
  "The tortoise won the race by never giving up.",
  "Slow and steady wins the race, or so they say.",
  "Rain fell softly on the quiet little village.",
  "She sells seashells down by the seashore every morning.",
  "The old library smelled of dust and forgotten stories.",
  "A journey of a thousand miles begins with a single step.",
  "Coffee tastes better when shared with good friends.",
  "The mountain trail wound higher into the misty clouds.",
  "Bright stars filled the dark summer sky last night.",
  "The chef added just a pinch of salt to the soup.",
  "Curiosity led the cat down a winding garden path.",
  "The old clock ticked loudly in the empty hallway.",
  "Waves crashed gently against the rocky shoreline.",
  "The garden bloomed with colors after the spring rain.",
  "He whistled a cheerful tune while fixing the old bike.",
  "The train rumbled through the valley just after dawn.",
  "A warm breeze drifted through the open window.",
  "The puzzle had a thousand tiny scattered pieces.",
  "Fresh bread from the bakery filled the street with its smell.",
  "The children laughed as they chased fireflies at dusk.",
  "Every great story starts with a single bold idea.",
];

function randomPhrase() {
  return PHRASES[Math.floor(Math.random() * PHRASES.length)];
}

module.exports = { PHRASES, randomPhrase };
