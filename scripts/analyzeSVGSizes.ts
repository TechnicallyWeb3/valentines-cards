import { TraitData } from '../artwork/testTraits.svg';
import { traits } from '../artwork/valentines.svg';

type LargestTrait = {
    name: string;
    size: number;
    index: number;
    svg: string;
}

type Trait = {
    readonly name: string; 
    readonly svg: string;
}

type Category = {
    readonly id: string;
    readonly traits: readonly Trait[]
}

// Function to find largest trait in a category
function findLargestTrait(category: Category): LargestTrait {
    // Initial value
    const initialValue: LargestTrait = {
        name: '',
        size: 0,
        index: -1,
        svg: ''
    };

    // Callback function
    const callback = (largest: LargestTrait, current: { name: string; svg: string }, index: number) => {
        if (current.svg.length > largest.size) {
            return {
                name: current.name,
                size: current.svg.length,
                index,
                svg: current.svg
            };
        }
        return largest;
    };

    // Using reduce
    const result = category.traits.reduce(callback, initialValue);
    return result;
}

// Function to find largest trait across all categories
function findLargestOverallTrait(traits: Category[]): { category: string; trait: LargestTrait } {
    return traits.reduce((largest, category) => {
        const categoryLargest = findLargestTrait(category);
        if (categoryLargest.size > largest.trait.size) {
            return { category: category.id, trait: categoryLargest };
        }
        return largest;
    }, { category: '', trait: { name: '', size: 0, index: -1, svg: '' } });
}

// Function to generate an SVG with the largest traits
function generateLargestSVG() {
    // Find largest trait from each category
    const largestTraits = Object.entries(traits).reduce((acc, [categoryName, category]) => {
        acc[categoryName] = findLargestTrait(category);
        return acc;
    }, {} as Record<string, LargestTrait>);

    // Generate SVG using the largest traits
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1000" viewBox="0 0 100 100">
    ${Object.values(largestTraits).map(trait => trait.svg).join('\n    ')}
  </svg>`;

    const utf8Length = Buffer.from(svg, 'utf8').length;
    const base64Length = Buffer.from(svg).toString('base64').length;

    return {
        utf8Length,
        base64Length,
        svg,
        largestTraits
    };
}

// Helper function to format file size
function formatSize(bytes: number): string {
    if (bytes < 1024) {
        return `${bytes} bytes`;
    } else {
        return `${(bytes / 1024).toFixed(2)} KB`;
    }
}

// Find the largest individual trait
const largestOverall = findLargestOverallTrait(Object.values(traits));
console.log('Largest Individual Trait:');
console.log(`Category: ${largestOverall.category}`);
console.log(`Name: "${largestOverall.trait.name}"`);
console.log(`Size: ${formatSize(largestOverall.trait.size)}`);
console.log(`Index: ${largestOverall.trait.index}`);
// console.log(`SVG: ${largestOverall.trait.svg}`);
console.log();

// Analyze each trait category
console.log('Analyzing trait sizes by category...\n');

Object.entries(traits).forEach(([categoryName, category]) => {
    const largest = findLargestTrait(category);
    console.log(`${categoryName}:`);
    console.log(`  Largest trait: "${largest.name}"`);
    console.log(`  Index: ${largest.index}`);
    console.log(`  Size: ${formatSize(largest.size)}`);
    // console.log(`  SVG: ${largest.svg}`);
    console.log();
});

// Generate and analyze a complete SVG
const { utf8Length, base64Length, svg, largestTraits } = generateLargestSVG();

console.log('Largest SVG Composition:');
Object.entries(largestTraits).forEach(([category, trait]) => {
    console.log(`${category}: "${trait.name}" (${formatSize(trait.size)})`);
});

console.log('\nComplete SVG Analysis:');
console.log(`UTF-8 Length: ${formatSize(utf8Length)}`);
console.log(`Base64 Length: ${formatSize(base64Length)}`);
console.log(`Compression Ratio: ${(base64Length / utf8Length).toFixed(2)}x`);

// Optional: Calculate theoretical maximum size
const maxSize = Object.values(traits).reduce((acc, category) => {
    const largest = findLargestTrait(category);
    return acc + largest.size;
}, 0);

console.log(`\nTheoretical maximum trait combination size: ${formatSize(maxSize)}`);
const theoreticalMaxSVGSize = maxSize + 150; // Adding ~150 bytes for SVG wrapper
console.log(`Theoretical maximum SVG size: ${formatSize(theoreticalMaxSVGSize)}`);
console.log(`Theoretical maximum Base64 size: ${formatSize(Math.ceil(theoreticalMaxSVGSize * 1.37))} bytes`); // Base64 overhead is ~1.37x 

console.log('\nSize Summary:');
console.log(`Largest individual trait: ${formatSize(largestOverall.trait.size)}`);
console.log(`Complete SVG size: ${formatSize(utf8Length)}`);
console.log(`Base64 encoded size: ${formatSize(base64Length)}`);
console.log(`Theoretical maximum SVG size (base64): ${formatSize(theoreticalMaxSVGSize * 1.37)}`);

// Count large traits (above 37KB)
const LARGE_SIZE_THRESHOLD = 37 * 1024; // 37KB in bytes
const largeTraits = Object.entries(traits).reduce((acc, [categoryName, category]) => {
    const largeInCategory = category.traits.filter(trait => trait.svg.length > LARGE_SIZE_THRESHOLD);
    if (largeInCategory.length > 0) {
        acc.push({
            category: categoryName,
            traits: largeInCategory.map(t => ({ name: t.name, size: formatSize(t.svg.length) }))
        });
    }
    return acc;
}, [] as Array<{ category: string, traits: Array<{ name: string, size: string }> }>);

console.log('\nLarge Traits (>37KB):');
if (largeTraits.length === 0) {
    console.log('No traits exceed 37KB');
} else {
    largeTraits.forEach(({ category, traits }) => {
        console.log(`\n${category}:`);
        traits.forEach(t => console.log(`  "${t.name}": ${t.size}`));
    });
} 