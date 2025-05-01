interface ChubCharacterData {
    name: string;
    creator: string;
    description: string;
    tagline: string;
    topics: string[];
    avatar_url: string;
    max_res_url: string;
    depth_prompt: string;
    example_dialogs: string;
    first_message: string;
    scenario: string;
    system_prompt: string;
    post_history_instructions: string;
    tavern_personality: string;
    alternate_greetings: string[];
    embedded_lorebook: any;
    token_count: Record<string, number>;
  }
  
  export async function ChubAiExtract(url: string): Promise<ChubCharacterData> {
    console.log("Original URL:", url);
  
    // Extract character path
    const match = url.match(/\/characters\/(.+)/);
    const characterPath = match ? match[1] : null;
  
    if (!characterPath) {
      console.error("Invalid URL: Could not extract character path.");
      throw new Error("Invalid URL: Could not extract character path.");
    }
  
    // Construct API URL
    const apiUrl = `https://gateway.chub.ai/api/characters/${characterPath}?full=true&nocache=${Math.random()}`;
    console.log("Final API Request URL:", apiUrl);
  
    const headers = {
      "Content-Type": "application/json",
      "ch-api-key": "3b263a12-58df-4452-9cb3-89c3eaedecd5",
    };
  
    try {
      const response = await fetch(apiUrl, {
        method: "GET",
        headers,
      });
  
      if (!response.ok) {
        console.error("HTTP Error! Status:", response.status);
        throw new Error(`HTTP Error! Status: ${response.status}`);
      }
  
      const result = await response.json();
      console.log("Full API Response:", result);
  
      if (!result?.node) {
        throw new Error("Invalid response from API.");
      }
  
      const definition = result.node.definition ?? {};
      const depthPrompt = result.node.extensions?.depth_prompt ?? {};
  
      // Extract token count
      let tokenCount: Record<string, number> = {};
      const tokenLabel = result.node.labels?.find((label: any) => label.title === "TOKEN_COUNTS");
      if (tokenLabel?.description) {
        try {
          tokenCount = JSON.parse(tokenLabel.description);
        } catch (error) {
          console.error("Error parsing token count:", error);
        }
      }
  
      const characterData: ChubCharacterData = {
        name: definition.name ?? result.node.name ?? "Unknown",
        creator: result.node.fullPath.split("/")[0] ?? "Unknown",
        description: definition.description ?? result.node.description ?? "",
        tagline: result.node.tagline ?? "",
        topics: result.node.topics ?? [],
        avatar_url: result.node.avatar_url ?? "",
        max_res_url: result.node.max_res_url ?? "",
        depth_prompt: depthPrompt.prompt ?? "",
        example_dialogs: definition.example_dialogs ?? "",
        first_message: definition.first_message ?? "",
        scenario: definition.scenario ?? "",
        system_prompt: definition.system_prompt ?? "",
        post_history_instructions: definition.post_history_instructions ?? "",
        tavern_personality: definition.tavern_personality ?? "",
        alternate_greetings: definition.alternate_greetings ?? [],
        embedded_lorebook: definition.embedded_lorebook ?? null,
        token_count: tokenCount,
      };
  
      console.log("Extracted Character Data:", characterData);
      return characterData;
    } catch (error) {
      console.error("Request Failed:", error);
      throw error;
    }
  }
  