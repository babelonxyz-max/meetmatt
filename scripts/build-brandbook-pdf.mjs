import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const PAGE_WIDTH = 842;
const PAGE_HEIGHT = 595;
const MARGIN = 26;

const outputPath = "/Users/mark/meetmatt/docs/brand/Meet-Matt-Brandbook.pdf";
const imageRoot = "/Users/mark/meetmatt/docs/brand/render-assets-jpg";

const imagePages = [
  {
    section: "3 Variant One-Pagers",
    title: "Brand Identity Concept",
    file: "Meet_Matt_3_Variant_One-Pagers__001_The_image_showcases_a_brand_identity_design_for_pBUfS5ck.jpg",
  },
  {
    section: "3 Variant One-Pagers",
    title: "Style Guide Variant",
    file: "Meet_Matt_3_Variant_One-Pagers__002_This_is_a_brand_style_guide_showcasing_a_logo_iwnNufZc.jpg",
  },
  {
    section: "3 Variant One-Pagers",
    title: "Futuristic Identity Variant",
    file: "Meet_Matt_3_Variant_One-Pagers__003_In_a_futuristic_digital_art_style_the_-suH153H.jpg",
  },
  {
    section: "Expanded Logo System",
    title: "Logo Lockups",
    file: "Meet_Matt_Expanded_Logo_System__001_The_image_displays_various_logo_lockups_for_Meet_D5ipbcIS.jpg",
  },
  {
    section: "Expanded Logo System",
    title: "Usage and Clearspace",
    file: "Meet_Matt_Expanded_Logo_System__002_A_guide_displays_logo_usage_and_clearspace_KI229GMH.jpg",
  },
  {
    section: "Expanded Logo System",
    title: "Logo Presentation Variant",
    file: "Meet_Matt_Expanded_Logo_System__003_In_a_graphic_design_presentation_style_various_kNcL5pO0.jpg",
  },
  {
    section: "Expanded Typography & Color",
    title: "System Board",
    file: "Meet_Matt_Expanded_Typography_Color__001_In_a_dark_sleek_digital_interface_sections_evawf4SC.jpg",
  },
  {
    section: "Expanded Typography & Color",
    title: "Palette Board",
    file: "Meet_Matt_Expanded_Typography_Color__002_This_is_a_digital_display_of_a_color_system_0MAk4bmM.jpg",
  },
  {
    section: "Expanded Typography & Color",
    title: "Interface Board",
    file: "Meet_Matt_Expanded_Typography_Color__003_In_a_dark_futuristic_UI_style_a_digital_kGdl-5th.jpg",
  },
  {
    section: "Brand Assets",
    title: "Patterns",
    file: "Meet_Matt_Brand_Assets_Patterns_Icons_Illustrations___001_A_collection_of_eight_seamless_patterns_is_8BLRSu2A.jpg",
  },
  {
    section: "Brand Assets",
    title: "Icons",
    file: "Meet_Matt_Brand_Assets_Patterns_Icons_Illustrations___002_A_collection_of_24_digital_icons_are_displayed_in_gUzQypvr.jpg",
  },
  {
    section: "Brand Assets",
    title: "Illustrations",
    file: "Meet_Matt_Brand_Assets_Patterns_Icons_Illustrations___003_A_collection_of_graphic_illustrations_and_icons_3_17-L83.jpg",
  },
  {
    section: "Expanded Visual Language & Mockups",
    title: "UI System",
    file: "Meet_Matt_Expanded_Visual_Language_Mockups__001_This_graphic_displays_a_collection_of_UI_2I3clzSQ.jpg",
  },
  {
    section: "Expanded Visual Language & Mockups",
    title: "UI Collection",
    file: "Meet_Matt_Expanded_Visual_Language_Mockups__002_In_a_dark_mode_UI_design_style_this_collection_1kAT0qQL.jpg",
  },
  {
    section: "Expanded Visual Language & Mockups",
    title: "Branded Mockups",
    file: "Meet_Matt_Expanded_Visual_Language_Mockups__003_In_a_dark_moody_style_a_collection_of_branded_yWukHuhD.jpg",
  },
];

function escapePdfText(value) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function pdfColorHex(hex) {
  const normalized = hex.replace("#", "");
  const r = parseInt(normalized.slice(0, 2), 16) / 255;
  const g = parseInt(normalized.slice(2, 4), 16) / 255;
  const b = parseInt(normalized.slice(4, 6), 16) / 255;
  return `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)}`;
}

function fitRect(boxWidth, boxHeight, imageWidth, imageHeight) {
  const scale = Math.min(boxWidth / imageWidth, boxHeight / imageHeight);
  return {
    width: imageWidth * scale,
    height: imageHeight * scale,
  };
}

function getJpegSize(buffer) {
  if (buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    throw new Error("Unsupported JPEG file");
  }

  let offset = 2;
  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = buffer[offset + 1];
    offset += 2;

    if (marker === 0xd9 || marker === 0xda) {
      break;
    }

    const length = buffer.readUInt16BE(offset);
    if ((marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7) || (marker >= 0xc9 && marker <= 0xcb) || (marker >= 0xcd && marker <= 0xcf)) {
      return {
        height: buffer.readUInt16BE(offset + 3),
        width: buffer.readUInt16BE(offset + 5),
      };
    }

    offset += length;
  }

  throw new Error("Could not read JPEG dimensions");
}

function makeStream(content, extraDictionary = "") {
  const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content, "binary");
  return Buffer.concat([
    Buffer.from(`<< /Length ${buffer.length}${extraDictionary} >>\nstream\n`, "binary"),
    buffer,
    Buffer.from("\nendstream", "binary"),
  ]);
}

function lineText(text, x, y, size, font = "F1", color = "#F0EEE8") {
  return `BT /${font} ${size} Tf ${pdfColorHex(color)} rg 1 0 0 1 ${x} ${y} Tm (${escapePdfText(text)}) Tj ET\n`;
}

const objects = [];

function reserveObject() {
  objects.push(null);
  return objects.length;
}

function setObject(id, content) {
  objects[id - 1] = Buffer.isBuffer(content) ? content : Buffer.from(content, "binary");
}

function addObject(content) {
  const id = reserveObject();
  setObject(id, content);
  return id;
}

const catalogId = reserveObject();
const pagesId = reserveObject();
const fontRegularId = reserveObject();
const fontBoldId = reserveObject();

setObject(fontRegularId, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
setObject(fontBoldId, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");

const pageIds = [];

function addTextPage(content) {
  const contentId = addObject(makeStream(content));
  const pageId = addObject(
    `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >> /Contents ${contentId} 0 R >>`
  );
  pageIds.push(pageId);
}

function addImagePage(page) {
  const imagePath = path.join(imageRoot, page.file);
  return readFile(imagePath).then((imageBuffer) => {
    const { width, height } = getJpegSize(imageBuffer);
    const imageId = addObject(
      makeStream(
        imageBuffer,
        ` /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode`
      )
    );

    const maxImageWidth = PAGE_WIDTH - MARGIN * 2;
    const maxImageHeight = PAGE_HEIGHT - 132;
    const fitted = fitRect(maxImageWidth, maxImageHeight, width, height);
    const imageX = (PAGE_WIDTH - fitted.width) / 2;
    const imageY = 52;

    const content =
      `0.027 0.031 0.059 rg 0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT} re f\n` +
      `0.067 0.078 0.141 rg ${MARGIN} ${PAGE_HEIGHT - 84} ${PAGE_WIDTH - MARGIN * 2} 52 re f\n` +
      lineText("MEET MATT BRANDBOOK", MARGIN + 14, PAGE_HEIGHT - 55, 10, "F2", "#FFD6B2") +
      lineText(page.section.toUpperCase(), MARGIN + 14, PAGE_HEIGHT - 72, 11, "F1", "#A8A8B8") +
      lineText(page.title, MARGIN, PAGE_HEIGHT - 32, 18, "F2", "#F0EEE8") +
      lineText(`Page ${pageIds.length + 2} of ${imagePages.length + 2}`, PAGE_WIDTH - 140, PAGE_HEIGHT - 32, 10, "F1", "#A8A8B8") +
      `q ${fitted.width.toFixed(2)} 0 0 ${fitted.height.toFixed(2)} ${imageX.toFixed(2)} ${imageY.toFixed(2)} cm /Im1 Do Q\n`;

    const contentId = addObject(makeStream(content));
    const pageId = addObject(
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> /XObject << /Im1 ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`
    );
    pageIds.push(pageId);
  });
}

const coverContent =
  `0.027 0.031 0.059 rg 0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT} re f\n` +
  `0.063 0.075 0.145 rg 26 26 ${PAGE_WIDTH - 52} ${PAGE_HEIGHT - 52} re f\n` +
  `1.000 0.420 0.208 rg 26 545 ${PAGE_WIDTH - 52} 3 re f\n` +
  lineText("MEET MATT", 42, 520, 14, "F2", "#FFD6B2") +
  lineText("Brandbook", 42, 470, 44, "F2", "#F0EEE8") +
  lineText("Deploy AI agents in minutes.", 42, 420, 28, "F2", "#F0EEE8") +
  lineText("This PDF compiles the full 15-board reference pack plus current", 42, 372, 16, "F1", "#A8A8B8") +
  lineText("production branding outputs for the Meet Matt app.", 42, 348, 16, "F1", "#A8A8B8") +
  lineText("Included now in-product:", 42, 288, 14, "F2", "#FFD6B2") +
  lineText("• Monogram + wordmark system", 58, 258, 14, "F1", "#F0EEE8") +
  lineText("• Favicon, app icon, Apple touch icon", 58, 234, 14, "F1", "#F0EEE8") +
  lineText("• Open Graph and Twitter images", 58, 210, 14, "F1", "#F0EEE8") +
  lineText("• Branded email templates and site shell", 58, 186, 14, "F1", "#F0EEE8") +
  lineText("Generated from /Users/mark/meetmatt/docs/brand", 42, 82, 11, "F1", "#A8A8B8");

addTextPage(coverContent);

await Promise.all(imagePages.map((page) => addImagePage(page)));

const inventoryLines = [
  "Production brand exports",
  "/Users/mark/meetmatt/public/brand/meet-matt-monogram.svg",
  "/Users/mark/meetmatt/public/brand/meet-matt-wordmark-horizontal.svg",
  "/Users/mark/meetmatt/public/brand/meet-matt-wordmark-stacked.svg",
  "/Users/mark/meetmatt/public/brand/meet-matt-badge.svg",
  "",
  "Live icon / social assets",
  "/Users/mark/meetmatt/public/favicon.svg",
  "/Users/mark/meetmatt/public/icon.svg",
  "/Users/mark/meetmatt/public/apple-touch-icon.png",
  "/Users/mark/meetmatt/app/icon.tsx",
  "/Users/mark/meetmatt/app/apple-icon.tsx",
  "/Users/mark/meetmatt/app/opengraph-image.tsx",
  "/Users/mark/meetmatt/app/twitter-image.tsx",
  "",
  "Reference board source",
  "/Users/mark/Downloads/Folder",
];

let inventoryContent =
  `0.027 0.031 0.059 rg 0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT} re f\n` +
  lineText("Asset Inventory", 42, 540, 30, "F2", "#F0EEE8") +
  lineText("This PDF uses resized render assets for print stability.", 42, 510, 14, "F1", "#A8A8B8");

let inventoryY = 470;
for (const line of inventoryLines) {
  if (!line) {
    inventoryY -= 14;
    continue;
  }
  const font = line.startsWith("/") ? "F1" : "F2";
  const size = line.startsWith("/") ? 11 : 14;
  const color = line.startsWith("/") ? "#FFD6B2" : "#F0EEE8";
  inventoryContent += lineText(line, 42, inventoryY, size, font, color);
  inventoryY -= line.startsWith("/") ? 18 : 24;
}

addTextPage(inventoryContent);

setObject(
  pagesId,
  `<< /Type /Pages /Count ${pageIds.length} /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] >>`
);
setObject(catalogId, `<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

const chunks = [Buffer.from("%PDF-1.4\n%\xFF\xFF\xFF\xFF\n", "binary")];
const offsets = [0];
let cursor = chunks[0].length;

for (let index = 0; index < objects.length; index += 1) {
  const object = objects[index];
  if (!object) {
    throw new Error(`Missing PDF object ${index + 1}`);
  }
  offsets.push(cursor);
  const prefix = Buffer.from(`${index + 1} 0 obj\n`, "binary");
  const suffix = Buffer.from("\nendobj\n", "binary");
  chunks.push(prefix, object, suffix);
  cursor += prefix.length + object.length + suffix.length;
}

const xrefOffset = cursor;
let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
for (let index = 1; index < offsets.length; index += 1) {
  xref += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
}

const trailer =
  `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

chunks.push(Buffer.from(xref + trailer, "binary"));

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, Buffer.concat(chunks));

console.log(`Brandbook PDF written to ${outputPath}`);
