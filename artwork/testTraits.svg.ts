// Test traits for DPR SVG NFT

// Define types
type Trait = {
  name: string;
  svg: string;
};

type TraitCategory = {
  traits: Trait[];
  id: string;
  index?: number;
};

// Group traits into categories
const traits = {
  backgrounds: {
    id: "BACKGROUND",
    index: 0,
    traits: [
      { name: "Red Background", svg: `<rect width="100%" height="100%" fill="#ff0000"/>` },
      { name: "Green Background", svg: `<rect width="100%" height="100%" fill="#00ff00"/>` },
      { name: "Blue Background", svg: `<rect width="100%" height="100%" fill="#0000ff"/>` },
      { name: "Yellow Background", svg: `<rect width="100%" height="100%" fill="#ffff00"/>` },
      { name: "Magenta Background", svg: `<rect width="100%" height="100%" fill="#ff00ff"/>` },
      { name: "Cyan Background", svg: `<rect width="100%" height="100%" fill="#00ffff"/>` },
    ]
  },

  illustrations: {
    id: "ILLUSTRATION",
    index: 1,
    traits: [
      { name: "Circle", svg: `<circle cx="50%" cy="50%" r="40" fill="white"/>` },
      { name: "Square", svg: `<rect x="30%" y="30%" width="40%" height="40%" fill="white"/>` },
      { name: "Triangle", svg: `<polygon points="50,20 80,80 20,80" fill="white"/>` },
      { name: "Ellipse", svg: `<ellipse cx="50%" cy="50%" rx="40" ry="30" fill="white"/>` },
      { name: "Path", svg: `<path d="M50,20 L80,80 L20,80 Z" fill="white"/>` },
      { name: "Line", svg: `<line x1="20" y1="20" x2="80" y2="80" stroke="white" stroke-width="4"/>` },
    ]
  },

  texts: {
    id: "TEXT",
    index: 2,
    traits: [
      { name: "Hello Text", svg: `<text x="50%" y="50%" text-anchor="middle" fill="black">Hello</text>` },
      { name: "World Text", svg: `<text x="50%" y="50%" text-anchor="middle" fill="black">World</text>` },
      { name: "NFT Text", svg: `<text x="50%" y="50%" text-anchor="middle" fill="black">NFT</text>` },
      { name: "Test Text", svg: `<text x="50%" y="50%" text-anchor="middle" fill="black">Test</text>` },
      { name: "DPR Text", svg: `<text x="50%" y="50%" text-anchor="middle" fill="black">DPR</text>` },
      { name: "SVG Text", svg: `<text x="50%" y="50%" text-anchor="middle" fill="black">SVG</text>` },
    ]
  },

  frames: {
    id: "FRAME",
    index: 3,
    traits: [
      { name: "Thin Frame", svg: `<rect width="100%" height="100%" fill="none" stroke="black" stroke-width="2"/>` },
      { name: "Medium Frame", svg: `<rect width="95%" height="95%" x="2.5%" y="2.5%" fill="none" stroke="black" stroke-width="4"/>` },
      { name: "Thick Frame", svg: `<rect width="90%" height="90%" x="5%" y="5%" fill="none" stroke="black" stroke-width="6"/>` },
      { name: "Extra Thick Frame", svg: `<rect width="85%" height="85%" x="7.5%" y="7.5%" fill="none" stroke="black" stroke-width="8"/>` },
      { name: "Super Thick Frame", svg: `<rect width="80%" height="80%" x="10%" y="10%" fill="none" stroke="black" stroke-width="10"/>` },
      { name: "Ultra Thick Frame", svg: `<rect width="75%" height="75%" x="12.5%" y="12.5%" fill="none" stroke="black" stroke-width="12"/>` },
    ]
  },
} as const;

export type TraitCategories = keyof typeof traits;
export type TraitData = typeof traits;

export { traits }; 