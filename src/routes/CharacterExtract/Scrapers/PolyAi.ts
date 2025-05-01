import axios from "axios";

interface SceneTag {
  tagName: string;
  tagId: number;
}

interface PolybuzzScene {
  sceneAvatarUrl: string;
  sceneName: string;
  conversationBackgroundImg: string;
  sceneBrief: string;
  speechText: string;
  systemRole: string;
  totalChatCnt: number;
  followedCnt: number;
  followStatus: number;
  templateIntro: string;
  live2DEmotioResources: any[];
  live2DEmotion: string;
  live2DUnity: string;
  sceneTags: SceneTag[];
}

interface PolybuzzResponse {
  result?: PolybuzzScene;
  error?: string;
}

export async function PolyAIExtract(url: string): Promise<PolybuzzResponse> {
  try {
    if (!url) {
      console.log("Error: Missing URL");
      return { error: "Missing URL" };
    }

    console.log(`Extracting secretSceneId from URL: ${url}`);
    const match = url.match(/\/chat\/([\w-]+)/);
    if (!match) {
      console.log("Error: Invalid Polybuzz URL format");
      return { error: "Invalid Polybuzz URL format" };
    }

    const secretSceneId = match[1];
    console.log(`Extracted secretSceneId: ${secretSceneId}`);

    const apiUrl = "https://api.polybuzz.ai/api/scene/detailguest";
    const headers = {
      "Content-Type": "application/json",
      "cuid": "tourist_e0eee3f4-7fc5-4701-98be-2578de540a7f-325565",
    };

    console.log("Fetching scene details from Polybuzz API...");

    const response = await axios.post(apiUrl, { secretSceneId }, { headers, withCredentials: true });

    if (response.status === 200 && response.data.errNo === 0) {
      const data = response.data.data;

      const result: PolybuzzScene = {
        sceneAvatarUrl: data.sceneAvatarUrl,
        sceneName: data.sceneName,
        conversationBackgroundImg: data.conversationBackgroundImg,
        sceneBrief: data.sceneBrief,
        speechText: data.speechText,
        systemRole: data.systemRole,
        totalChatCnt: data.totalChatCnt,
        followedCnt: data.followedCnt,
        followStatus: data.followStatus,
        templateIntro: data.templateIntro,
        live2DEmotioResources: data.live2DEmotioResources,
        live2DEmotion: data.live2DEmotion,
        live2DUnity: data.live2DUnity,
        sceneTags: data.sceneTags.map((tag: any) => ({
          tagName: tag.tagName,
          tagId: tag.tagId,
        })),
      };

      console.log("Scene data retrieved successfully:", result);
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