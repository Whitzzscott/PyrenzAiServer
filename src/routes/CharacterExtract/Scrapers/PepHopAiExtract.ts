import axios from "axios";
import { Api } from "./API/PepHopAPI.js";

interface PephopResponse {
  data?: any;
  error?: string;
}

export async function PephopAICharacterFetch(url: string): Promise<PephopResponse> {
  if (!url) return { error: "Missing URL" };

  const match = url.match(/characters\/([a-f0-9-]+)_/);
  if (!match) return { error: "Invalid Pephop AI character URL format" };

  const characterId = match[1];
  const apiUrl = `https://api.eosai.chat/characters/${characterId}`;

  const headers = {
    "Authorization": `Bearer ${Api}`
  };

  try {
    const response = await axios.get(apiUrl, { headers });

    if (response.status === 200) {
      return { data: response.data };
    } else {
      return { error: response.statusText };
    }
  } catch (error: any) {
    return { error: error.message };
  }
}