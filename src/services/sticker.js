/**
 * Serviços para processar figurinhas (stickers) no ffmpeg.
 *
 * @author MRX
 */
import { exec } from "child_process";
import webp from "node-webpmux";
import fs from "node:fs";
import path from "node:path";
import { TEMP_DIR } from "../config.js";
import { getRandomName, getRandomNumber } from "../utils/index.js";
import { errorLog } from "../utils/logger.js";

export async function addStickerMetadata(media, metadata) {
  const tmpFileIn = getRandomName("webp");
  const tmpFileOut = getRandomName("webp");

  await fs.promises.writeFile(tmpFileIn, media);

  const img = new webp.Image();

  const json = {
    "sticker-pack-id": `${getRandomNumber(10_000, 99_999)}`,
    "sticker-pack-name": metadata.username,
    "sticker-pack-publisher": metadata.botName,
    emojis: metadata.categories ? metadata.categories : [""],
  };

  const exifAttr = Buffer.from([
    0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57,
    0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00,
  ]);

  const jsonBuff = Buffer.from(JSON.stringify(json), "utf-8");
  const exif = Buffer.concat([exifAttr, jsonBuff]);
  exif.writeUIntLE(jsonBuff.length, 14, 4);

  await img.load(tmpFileIn);
  await fs.promises.unlink(tmpFileIn);
  img.exif = exif;
  await img.save(tmpFileOut);
  return tmpFileOut;
}

export async function isAnimatedSticker(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);

    const hasAnim = buffer.includes(Buffer.from("ANIM"));
    const hasFrame = buffer.includes(Buffer.from("ANMF"));

    return hasAnim || hasFrame;
  } catch (error) {
    errorLog("Erro ao verificar se a figurinha é animada:", error);
    return false;
  }
}

export async function processAnimatedSticker(inputPath, metadata) {
  try {
    const img = new webp.Image();
    await img.load(inputPath);

    const json = {
      "sticker-pack-id": `${getRandomNumber(10_000, 99_999)}`,
      "sticker-pack-name": metadata.username,
      "sticker-pack-publisher": metadata.botName,
      emojis: metadata.categories ? metadata.categories : [""],
    };

    const exifAttr = Buffer.from([
      0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57,
      0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00,
    ]);

    const jsonBuff = Buffer.from(JSON.stringify(json), "utf-8");
    const exif = Buffer.concat([exifAttr, jsonBuff]);
    exif.writeUIntLE(jsonBuff.length, 14, 4);

    img.exif = exif;

    const finalPath = inputPath.replace(".webp", _done.webp);
    await img.save(finalPath);

    return finalPath;
  } catch (error) {
    errorLog("Erro node-webpmux:", error);
    throw new Error("Erro ao processar sticker animado sem FFmpeg.");
  }
}

export async function processAnimatedSticker(inputPath, metadata) {
  return new Promise((resolve, reject) => {
    const tempOutputPath = path.resolve(TEMP_DIR, getRandomName("webp"));

    const cmd = `ffmpeg -i "${inputPath}" -t 8 -vf "scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2,fps=15" -c:v libwebp -quality 75 -compression_level 6 -loop 0 -preset default -an -f webp "${tempOutputPath}"`;

    exec(cmd, async (error, _, stderr) => {
      try {
        if (error) {
          console.error("FFmpeg error:", stderr);
          reject(new Error("Erro ao processar figurinha animada."));
          return;
        }

        const processedBuffer = await fs.promises.readFile(tempOutputPath);
        const finalPath = await addStickerMetadata(processedBuffer, metadata);

        if (fs.existsSync(tempOutputPath)) {
          fs.unlinkSync(tempOutputPath);
        }

        resolve(finalPath);
      } catch (error) {
        if (fs.existsSync(tempOutputPath)) {
          fs.unlinkSync(tempOutputPath);
        }
        reject(error);
      }
    });
  });
}
