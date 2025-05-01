interface CharacterData {
    display_name: string;
    username: string;
    tagline: string;
    bio: string;
    description: string;
    greeting: string;
    creator: string;
    avatar_url: string;
    banner_url: string;
    message_count: number;
    rating: number;
    subscribers: number;
  }
  
  export async function DoppleExtract(url: string): Promise<CharacterData> {
    console.log("Original URL:", url);
  
    const match = url.match(/\/profile\/(.+)/);
    const dopple_id = match ? match[1] : null;
  
    if (!dopple_id) {
      console.error("Invalid URL: Could not extract dopple_id.");
      throw new Error("Invalid URL: Could not extract dopple_id.");
    }
  
    const apiUrl = "https://ml.dopple.ai/get_dopple_info";
  
    const headers = {
      "Content-Type": "application/json",
    };
  
    const body = {
      dopple_id: dopple_id,
    };
  
    console.log("Extracted dopple_id:", dopple_id);
  
    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
  
      if (!response.ok) {
        console.error("HTTP Error! Status:", response.status);
        throw new Error(`HTTP Error! Status: ${response.status}`);
      }
  
      const result = await response.json();
      console.log("Full API Response:", result);
  
      if (result.status_code !== 200 || !result.dopple_info) {
        throw new Error("Invalid response from API.");
      }
  
      const characterData: CharacterData = {
        display_name: result.dopple_info.display_name,
        username: result.dopple_info.dopple_username,
        tagline: result.dopple_info.tagline,
        bio: result.dopple_info.bio,
        description: result.dopple_info.description,
        greeting: result.dopple_info.greeting,
        creator: result.dopple_info.creator_username,
        avatar_url: result.dopple_info.avatar_url,
        banner_url: result.dopple_info.banner_url,
        message_count: result.dopple_info.message_count,
        rating: result.dopple_info.rating,
        subscribers: result.dopple_info.creator_num_subscribers,
      };
  
      console.log("Extracted Character Data:", characterData);
      return characterData;
    } catch (error) {
      console.error("Request Failed:", error);
      throw error;
    }
  }