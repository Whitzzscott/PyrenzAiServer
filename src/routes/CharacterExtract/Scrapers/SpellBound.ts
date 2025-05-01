
import axios from "axios";
import { cookie } from "./API/SpellBoundAPI.js";

interface SpellBoundCharacter {
  id: number;
  creatorId: number;
  age: number;
  preferredName: string;
  avatarImage: string;
  avatarThumbnailImage: string;
  firstName: string;
  lastName: string;
  description: string;
  occupation: string;
  taglines: string[];
  nickNames: string[];
  backstory: string[];
  memories: string[];
  universeDescription: string;
  universeTags: string[];
  gender: string;
  searchTerms: string;
  summary: string;
  characterMotivation: string;
  sex: string;
  isAdultAllowed: boolean | null;
  visibility: string;
  isAdultCharacter: boolean;
  speakingStyle: string;
  speakingExamples: string[];
  personalityTraits: string[];
  personalityDescription: string;
  intimacyStyle: string;
  visualDescription: string;
  adultVisualDescription: string;
  externalSourceId: string;
  externalSourceUrl: string;
  categories: string[];
  tags: string[];
  totalWordCount: number;
  imageContentDescription: string;
  ageEstimate: number;
}

interface SpellBoundResponse {
  result?: SpellBoundCharacter;
  error?: string;
}

function extractCharacterId(url: string): string | null {
  const match = url.match(/\/characters\/(\d+)/);
  return match ? match[1] : null;
}

export async function SpellBoundExtract(url: string): Promise<SpellBoundResponse> {
  try {
    if (!url) {
      return { error: "Missing URL" };
    }

    const characterId = extractCharacterId(url);
    if (!characterId) {
      return { error: "Invalid SpellBound URL format" };
    }

    const apiUrl = `https://www.tryspellbound.com/_next/data/xeWYnUMuGSs-_oF8aV2Uw/app/characters/${characterId}.json?characterId=${characterId}`;

    const headers = {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Cookie": cookie,
    };

    const response = await axios.get(apiUrl, { headers, withCredentials: true });

    if (response.status === 200 && response.data.pageProps?.initialCharacter) {
      const char = response.data.pageProps.initialCharacter;

      const result: SpellBoundCharacter = {
        id: char.id,
        creatorId: char.creatorId,
        age: char.age,
        preferredName: char.preferredName,
        avatarImage: char.avatarImage,
        avatarThumbnailImage: char.avatarThumbnailImage,
        firstName: char.firstName,
        lastName: char.lastName,
        description: char.description,
        occupation: char.occupation,
        taglines: char.taglines || [],
        nickNames: char.nickNames || [],
        backstory: char.backstory || [],
        memories: char.memories || [],
        universeDescription: char.universeDescription,
        universeTags: char.universeTags || [],
        gender: char.gender,
        searchTerms: char.searchTerms,
        summary: char.summary,
        characterMotivation: char.characterMotivation,
        sex: char.sex,
        isAdultAllowed: char.isAdultAllowed,
        visibility: char.visibility,
        isAdultCharacter: char.isAdultCharacter,
        speakingStyle: char.speakingStyle,
        speakingExamples: char.speakingExamples || [],
        personalityTraits: char.personalityTraits || [],
        personalityDescription: char.personalityDescription,
        intimacyStyle: char.intimacyStyle,
        visualDescription: char.visualDescription,
        adultVisualDescription: char.adultVisualDescription,
        externalSourceId: char.externalSourceId,
        externalSourceUrl: char.externalSourceUrl,
        categories: char.categories || [],
        tags: char.tags || [],
        totalWordCount: char.totalWordCount,
        imageContentDescription: char.imageContentDescription,
        ageEstimate: char.ageEstimate,
      };

      return { result };
    } else {
      return { error: `API returned status ${response.status}` };
    }
  } catch (error: any) {
    return { error: error.message };
  }
}
