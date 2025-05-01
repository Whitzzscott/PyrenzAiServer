import axios from "axios";
import * as cheerio from "cheerio";

interface ExtractedData {
  name: string[];
  description: string[];
  Scenario: string[];
  "First Message": string[];
}

interface ScrapeResult {
  extractedData?: ExtractedData;
  error?: string;
}

export async function scrapeData(url: string): Promise<ScrapeResult> {
  try {
    if (!url) {
      console.log("Error: Missing URL");
      return { error: "Missing URL" };
    }

    console.log(`Fetching page content from: ${url}`);
    const headers = { "User-Agent": "Mozilla/5.0" };
    const response = await axios.get(url, { headers });

    console.log("Parsing HTML data...");
    const $ = cheerio.load(response.data);
    const container = $("div.flex.flex-col.space-y-6.pt-6");

    if (!container.length) {
      console.log("Error: Container not found in the page");
      return { error: "Container not found" };
    }

    console.log("Extracting data...");
    const extractedData: ExtractedData = {
      name: [],
      description: [],
      Scenario: [],
      "First Message": []
    };

    extractedData.name = container.find(".text-muted-foreground.line-clamp-2")
      .map((_, el) => $(el).text().trim()).get();
    extractedData.description = container.find(".text-muted-foreground.line-clamp-3")
      .map((_, el) => $(el).text().trim()).get();
    extractedData.Scenario = container.find(".text-muted-foreground.line-clamp-5")
      .map((_, el) => $(el).text().trim()).get();
    extractedData["First Message"] = container.find(".bg-message-assistant")
      .map((_, el) => $(el).text().trim()).get();

    console.log("Scraped data successfully:", extractedData);
    return { extractedData };
  } catch (error: any) {
    console.log("Error:", error.message);
    return { error: error.message };
  }
}