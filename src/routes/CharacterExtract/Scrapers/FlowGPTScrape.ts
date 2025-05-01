import axios from "axios";

interface FlowGPTResponse {
  result?: {
    title: string;
    language: string;
    description: string;
    coverURL: string;
    thumbnailURL: string;
    type: string;
    nsfw: boolean;
    exampleConversation: any[];
    tags: string[];
  };
  error?: string;
}

export async function FlowGPTScrape(url: string): Promise<FlowGPTResponse> {
  try {
    if (!url) {
      console.log("Error: Missing URL");
      return { error: "Missing URL" };
    }

    console.log(`Extracting Character URL from: ${url}`);
    const match = url.match(/flowgpt\.com\/chat\/([\w-]+)/);
    if (!match) {
      console.log("Error: Invalid FlowGPT URL format");
      return { error: "Invalid FlowGPT URL format" };
    }

    const characterUrl = match[1];
    const apiUrl = `https://prod-backend-k8s.flowgpt.com/prompt/${characterUrl}/`;

    console.log(`Fetching data from API: ${apiUrl}`);
    const response = await axios.get(apiUrl);

    console.log("Raw API Response Body:", JSON.stringify(response.data, null, 2));

    if (response.status === 200) {
      const data = response.data.prompt;

      const result = {
        title: data.title,
        language: data.language,
        description: data.description,
        coverURL: data.coverURL,
        thumbnailURL: data.thumbnailURL,
        type: data.type,
        nsfw: data.nsfw,
        exampleConversation: data.exampleConversation || [],
        tags: data.promptTags ? data.promptTags.map((tag: any) => tag[3]) : [],
      };

      console.log("Data retrieved successfully:", JSON.stringify(result, null, 2));
      return { result };
    } else {
      console.log(`Error: API returned status ${response.status}`);
      return { error: response.statusText };
    }
  } catch (error: any) {
    console.log("Error:", error.message);
    return { error: error.message };
  }
}