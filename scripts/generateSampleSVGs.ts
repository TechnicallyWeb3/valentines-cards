import fs from 'fs';
import path from 'path';
import { traits } from '../artwork/valentines.svg';

// Calculate total possible combinations
const totalCombinations = Object.values(traits).reduce((acc, category) => {
  return acc * category.traits.length;
}, 1);

console.log(`Total possible combinations: ${totalCombinations}`);

// Create output directory if it doesn't exist
const outputDir = path.join(__dirname, '../artwork/images');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Find the category with the most traits to determine how many samples we need
const maxTraitsInCategory = Math.max(...Object.values(traits).map(category => category.traits.length));

console.log(`Will generate ${maxTraitsInCategory} samples to cover all traits`);

// Generate one sample for each trait in the largest category
for (let i = 0; i < maxTraitsInCategory; i++) {
  const selectedTraits = Object.values(traits).map(category => {
    // Use the current index if available, otherwise use the last trait in the category
    const traitIndex = Math.min(i, category.traits.length - 1);
    return category.traits[traitIndex].svg;
  });

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000">
    ${selectedTraits.join('\n    ')}
  </svg>`;

  fs.writeFileSync(path.join(outputDir, `sample_${i + 1}.svg`), svg);
}

console.log(`Generated ${maxTraitsInCategory} samples covering all traits`);
console.log(`Files saved in: ${outputDir}`); 