import axios from "axios";

interface FormattedCharacterData {
  char_name: string;
  char_persona: string;
  char_greeting: string;
  world_scenario: string;
  example_dialogue: string;
  name: string;
  description: string;
  first_mes: string;
  scenario: string;
  mes_example: string;
  personality: string;
  metadata: {
    version: number;
    created: number;
    modified: number;
    source: string | null;
    tool: {
      name: string;
      version: string;
      url: string;
    };
  };
}

export async function CharacterAiScrape(url: string): Promise<FormattedCharacterData | { error: string }> {
  try {
    if (!url) {
      console.log("Error: Missing URL");
      return { error: "Missing URL" };
    }

    console.log(`Extracting external ID from URL: ${url}`);
    const match = url.match(/\/chat\/([\w-]+)/);
    if (!match) {
      console.log("Error: Invalid Character AI URL format");
      return { error: "Invalid Character AI URL format" };
    }

    const externalId = match[1];
    console.log(`Extracted external ID: ${externalId}`);

    const apiUrl = "https://neo.character.ai/character/v1/get_character";
    const headers = {
      Authorization: "Token b05be320342848ad5c9e3f237dc76b8317b0ff51",
      "Content-Type": "application/json",
    };

    console.log(`Fetching character data from Character AI API...`);
    const response = await axios.post(apiUrl, { external_id: externalId }, { headers });

    if (response.status !== 200 || !response.data.character) {
      console.log(`Error: API returned status ${response.status}`);
      return { error: response.statusText || "Failed to fetch character data" };
    }

    const character = response.data.character;

    const formattedData: FormattedCharacterData = {
      char_name: character.name || "",
      char_persona: character.definition || "",
      char_greeting: character.greeting || "",
      world_scenario: character.definition || "",
      example_dialogue: character.definition || "",
      name: character.name || "",
      description: character.description || "",
      first_mes: character.greeting || "",
      scenario: character.definition || "",
      mes_example: character.definition || "",
      personality: character.definition || "",
      metadata: {
        version: 1,
        created: new Date(character.updated).getTime() || 0,
        modified: new Date().getTime(),
        source: "Character AI",
        tool: {
          name: "CharacterAIScraper",
          version: "1.0.0",
          url: "https://neo.character.ai",
        },
      },
    };

    console.log("Character data formatted successfully:", formattedData);
    return formattedData;
  } catch (error: any) {
    console.log("Error:", error.message);
    return { error: error.message };
  }
}