import axios from "axios";
import FormData from "form-data";
import { API_KEYS } from "./API.js"; 

export async function getClerkAuthToken(): Promise<string> {
  try {
    const Session = API_KEYS.CharSnapSession;
    const Cookie = API_KEYS.CharSnapCookie;

    if (!Session || !Cookie) {
      console.error("Error: Missing CharSnap session or cookie.");
      return "";
    }

    const apiUrl = `https://clerk.charsnap.ai/v1/client/sessions/${Session}/tokens?__clerk_api_version=2024-10-01&_clerk_js_version=5.56.0`;

    const formData = new FormData();
    formData.append("organization_id", "");

    const headers = {
      Cookie,
      ...formData.getHeaders(),
    };

    const response = await axios.post(apiUrl, formData, { headers });

    if (response.status === 200 && response.data?.jwt) {
      console.log("JWT retrieved successfully:", response.data.jwt);
      return response.data.jwt;
    } else {
      console.error(`Error: API returned status ${response.status}`, response.data);
      return "";
    }
  } catch (error: any) {
    console.error("Error fetching Clerk Auth Token:", error.message, error.response?.data || error);
    return "";
  }
}