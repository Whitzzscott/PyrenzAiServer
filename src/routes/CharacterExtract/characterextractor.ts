import { z } from "zod";
import { Request, Response, NextFunction } from "express";
import Bottleneck from "bottleneck";
import { scrapeData } from "./Scrapers/SakuraExtract.js";
import { CharacterAiScrape } from "./Scrapers/CharacterAi.js";
import { FlowGPTScrape } from "./Scrapers/FlowGPTScrape.js";
import { SpicyChatExtract } from "./Scrapers/SpicyChat.js";
import { PephopAICharacterFetch } from "./Scrapers/PepHopAiExtract.js";
import { DoppleExtract } from "./Scrapers/DoppleExtract.js";
import { ChubAiExtract } from "./Scrapers/ChubAiExtract.js";
import { PolyAIExtract } from "./Scrapers/PolyAi.js";
import { CharSnapExtract } from "./Scrapers/CharSnap.js";
import { SpellBoundExtract } from "./Scrapers/SpellBound.js";

const typeSchema = z.object({
  type: z.enum([
    "SakuraFm",
    "Dopple",
    "Character AI",
    "FlowGPT",
    "SpicyChat",
    "PepHopAi",
    "ChubAI",
    "PolyAI",
    "CharSnap",
    "SpellBound",
  ]),
});

const urlSchema = z.object({
  url: z.string().url(),
});

// Initialize Bottleneck with a maxConcurrent limit of 35
const limiter = new Bottleneck({
  maxConcurrent: 35,
  minTime: 100 // Optional: minimum time between requests
});

export const CharacterExtract = async (req: Request, res: Response): Promise<void> => {
  try {
    const { type, url } = req.body;

    if (!urlSchema.safeParse({ url }).success) {
      res.status(400).json({ error: "Invalid URL." });
      return;
    }
    if (!typeSchema.safeParse({ type }).success) {
      res.status(400).json({ error: "Invalid type." });
      return;
    }

    try {
      let response;

      // Wrap the scraping function in the limiter
      const scrapeFunction = async () => {
        switch (type) {
          case "SakuraFm":
            return await scrapeData(url);
          case "Character AI":
            return await CharacterAiScrape(url);
          case "FlowGPT":
            return await FlowGPTScrape(url);
          case "SpicyChat":
            return await SpicyChatExtract(url);
          case "PepHopAi":
            return await PephopAICharacterFetch(url);
          case "Dopple":
            return await DoppleExtract(url);
          case "ChubAI":
            return await ChubAiExtract(url);
          case "PolyAI":
            return await PolyAIExtract(url);
          case "CharSnap":
            return await CharSnapExtract(url);
          case "SpellBound":
            return await SpellBoundExtract(url);
          default:
            throw new Error("Invalid type.");
        }
      };

      // Schedule the scraping function with the limiter
      response = await limiter.schedule(scrapeFunction);

      res.status(200).json({ success: true, data: response });
    } catch (scrapeError) {
      res.status(500).json({ error: "Scraping failed." });
    }
  } catch (err) {
    res.status(500).json({ error: "Internal server error." });
  }
};
