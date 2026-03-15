import fs from 'fs';
import path from 'path';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure the target directory exists
const targetDir = path.join(__dirname, '../public/assets/characters');
if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
}

// List of all current GGST characters (Base roster + DLC Seasons 1-4)
const characters = [
    "A.B.A", "Anji Mito", "Asuka R#", "Axl Low", "Ba Baiken",
    "Bedman?", "Bridget", "Chipp Zanuff", "Dizzy", "Elphelt Valentine",
    "Faust", "Giovanna", "Goldlewis Dickinson", "Happy Chaos", "I-No",
    "Jack-O'", "Johnny", "Ky Kiske", "Leo Whitefang", "May",
    "Millia Rage", "Nagoriyuki", "Potemkin", "Ramlethal Valentine",
    "Sin Kiske", "Slayer", "Sol Badguy", "Testament", "Zato-1"
];

// Dustloop uses specific URL structures for characters
const characterWikiUrls = {
    "A.B.A": "A.B.A",
    "Anji Mito": "Anji_Mito",
    "Asuka R#": "Asuka_R%23",
    "Axl Low": "Axl_Low",
    "Ba Baiken": "Baiken", // Dustloop page is just Baiken
    "Bedman?": "Bedman%3F",
    "Bridget": "Bridget",
    "Chipp Zanuff": "Chipp_Zanuff",
    "Dizzy": "Queen_Dizzy", // Assuming Queen Dizzy for Strive, or just Dizzy. Dustloop usually updates to full name. Let's try Queen_Dizzy or Dizzy
    "Elphelt Valentine": "Elphelt_Valentine",
    "Faust": "Faust",
    "Giovanna": "Giovanna",
    "Goldlewis Dickinson": "Goldlewis_Dickinson",
    "Happy Chaos": "Happy_Chaos",
    "I-No": "I-No",
    "Jack-O'": "Jack-O", // Dustloop often omits the apostrophe in URLs
    "Johnny": "Johnny",
    "Ky Kiske": "Ky_Kiske",
    "Leo Whitefang": "Leo_Whitefang",
    "May": "May",
    "Millia Rage": "Millia_Rage",
    "Nagoriyuki": "Nagoriyuki",
    "Potemkin": "Potemkin",
    "Ramlethal Valentine": "Ramlethal_Valentine",
    "Sin Kiske": "Sin_Kiske",
    "Slayer": "Slayer",
    "Sol Badguy": "Sol_Badguy",
    "Testament": "Testament",
    "Zato-1": "Zato-1"
};

async function fetchPortrait(charName) {
    const safeName = charName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const filepath = path.join(targetDir, `${safeName}.png`);

    if (fs.existsSync(filepath)) {
        console.log(`[SKIPPED] ${charName}: Portrait already exists at ${filepath}`);
        return;
    }

    const wikiName = characterWikiUrls[charName];
    const url = `https://www.dustloop.com/w/GGST/${wikiName}`;

    try {
        console.log(`[FETCHING] ${charName} from ${url}`);
        const response = await axios.get(url, {
             headers: {
                 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
             }
        });

        const $ = cheerio.load(response.data);

        // Find the portrait image. Usually in an infobox or portrait container.
        // Dustloop typically uses class="image" in infoboxes, pointing to a file.
        // Let's look for the main character portrait. Often it's the first image in the infobox.
        let imgUrl = null;

        // Common selector for character portraits on Dustloop infobox
        const infoboxImg = $('.infobox img').first().attr('src');
        if (infoboxImg) {
            imgUrl = infoboxImg;
        } else {
             // Fallback: look for an image that contains 'Portrait' or the character's name
             $('img').each((i, el) => {
                 const src = $(el).attr('src');
                 if (src && (src.toLowerCase().includes('portrait') || src.toLowerCase().includes(charName.split(' ')[0].toLowerCase()))) {
                     imgUrl = src;
                     return false; // Break loop
                 }
             });
        }

        if (!imgUrl) {
            console.warn(`[WARNING] ${charName}: Could not find a suitable portrait image on the wiki page.`);
            return;
        }

        // Handle relative URLs
        if (imgUrl.startsWith('/')) {
            imgUrl = `https://www.dustloop.com${imgUrl}`;
        }

        console.log(`[DOWNLOADING] ${charName}: Downloading image from ${imgUrl}`);
        const imgResponse = await axios.get(imgUrl, { responseType: 'stream' });

        const writer = fs.createWriteStream(filepath);
        imgResponse.data.pipe(writer);

        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });

        console.log(`[SUCCESS] ${charName}: Saved portrait to ${filepath}`);

    } catch (error) {
        if (error.response && error.response.status === 404) {
             console.error(`[ERROR] ${charName}: Wiki page not found (${url})`);
        } else {
             console.error(`[ERROR] ${charName}: Failed to fetch. ${error.message}`);
        }
    }
}

async function run() {
    console.log(`Starting portrait fetch for ${characters.length} characters...`);
    for (const char of characters) {
        await fetchPortrait(char);
        // Add a small delay to avoid hammering the server
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    console.log("Finished portrait fetching!");
}

run();
