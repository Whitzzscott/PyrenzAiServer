import axios from "axios";
import { getClerkAuthToken } from "./API/CharSnapAPI.js";

interface Lorebook {
  id: string;
  name: string;
  thumbnail: string;
}

interface CharSnapCharacter {
  id: string;
  name: string;
  shortMessage: string;
  gender: string;
  NSFW: boolean;
  profileNSFW: boolean;
  favourite: boolean;
  avatar: string;
  characterIcon: string;
  scenario: string;
  lorebooks: Lorebook[];
}

interface CharSnapResponse {
  success: boolean;
  message: string;
  data?: CharSnapCharacter;
  error?: string;
}

export async function CharSnapExtract(conversationUrl: string): Promise<CharSnapResponse> {
  try {
    const characterIdMatch = conversationUrl.match(/conversation\/([\w-]+)/);
    if (!characterIdMatch || !characterIdMatch[1]) {
      console.log("Error: Invalid conversation URL");
      return { success: false, message: "Invalid conversation URL", error: "Invalid conversation URL" };
    }

    const characterId = characterIdMatch[1];
    const apiUrl = `https://api.charsnap.ai/api/v1/character/${characterId}`;
    const authToken = await getClerkAuthToken();

    if (!authToken) {
      console.log("Error: Missing authentication token");
      return { success: false, message: "Missing authentication token", error: "Missing authentication token" };
    }

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    };

    console.log("Fetching character details from CharSnap API...");

    const response = await axios.get(apiUrl, { headers });

    if (response.status === 200 && response.data.success) {
      const data = response.data.data;

      const result: CharSnapCharacter = {
        id: data.id,
        name: data.name,
        shortMessage: data.shortMessage,
        gender: data.gender,
        NSFW: data.NSFW,
        profileNSFW: data.profileNSFW,
        favourite: data.favourite,
        avatar: data.variant.avatar,
        characterIcon: data.variant.characterIcon,
        scenario: data.variant.scenario,
        lorebooks: data.variant.lorebooks.map((lore: any) => ({
          id: lore.id,
          name: lore.name,
          thumbnail: lore.thumbnail,
        })),
      };

      console.log("Character data retrieved successfully:", result);
      return { success: true, message: response.data.message, data: result };
    } else {
      console.log(`Error: API returned status ${response.status}`);
      return { success: false, message: response.data.message || "Error fetching data", error: response.statusText };
    }
  } catch (error: any) {
    console.log("Error:", error.message);
    return { success: false, message: "API request failed", error: error.message };
  }
}