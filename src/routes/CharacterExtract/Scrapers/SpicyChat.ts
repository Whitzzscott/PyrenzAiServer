import axios from "axios";

interface SpicyChatResponse {
  data?: any;
  error?: string;
}

export async function SpicyChatExtract(url: string): Promise<SpicyChatResponse> {
  try {
    if (!url) {
      console.log("Error: Missing URL");
      return { error: "Missing URL" };
    }

    console.log("Extracting chatId from URL...");
    const match = url.match(/spicychat\.ai\/chat\/([a-f0-9\-]+)/);
    if (!match) {
      console.log("Error: chat_id not found in the URL", url);
      return { error: "chat_id not found in the URL" };
    }

    const chatId = match[1];
    console.log("Extracted chatId:", chatId);

    const apiUrl = `https://4mpanjbsf6.execute-api.us-east-1.amazonaws.com/v2/characters/${chatId}`;
    const headers = {
      "x-app-id": "spicychat",
      "x-country": "PH",
      "x-guest-userid": "c2ccd974-f1d0-4602-a550-4bb65c5c580e"
    };

    console.log("Making API request to SpicyChat...");
    const response = await axios.get(apiUrl, { headers });

    if (response.status === 200) {
      console.log("API response received successfully");
      return { data: response.data };
    } else {
      console.log("Error: API request failed", response.statusText);
      return { error: response.statusText };
    }
  } catch (error: any) {
    console.log("Error:", error.message);
    return { error: error.message };
  }
}