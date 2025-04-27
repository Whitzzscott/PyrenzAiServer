import { supabase } from "../Supabase.js";
import { z } from "zod";
import { Request, Response } from "express";

const PreviousChatRequestSchema = z.object({
  user_uuid: z.string().min(1),
  auth_key: z.string().transform((val) => val.replace(/[\\/]/g, "")),
  page: z.number().min(1),
  limit: z.number().min(1),
  Type: z.enum(["GetPreviousChat", "GetPreviousChatById"]),
  conversation_id: z.string().optional(),
});

export const GetPreviousChat = async (req: Request, res: Response) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const body = req.body;
    const parsed = PreviousChatRequestSchema.safeParse(body);

    if (!parsed.success) {
      return res.status(400).json({
        error: "Invalid request payload",
        details: parsed.error.errors,
      });
    }

    const { user_uuid, auth_key, page, limit, Type, conversation_id } = parsed.data;

    let result;

    switch (Type) {
      case "GetPreviousChat": {
        if (!conversation_id) {
          return res.status(400).json({ error: "Conversation ID missing" });
        }

        const { data, error } = await supabase.rpc("fetch_recent_chats", {
          p_user_uuid: user_uuid,
          p_auth_key: auth_key,
          p_page: page,
          p_limit: limit,
        });

        result = { data, error };
        break;
      }

      default:
        return res.status(400).json({ error: "Invalid request type" });
    }

    if (result.error || !result.data) {
      console.error("Failed to fetch previous chat messages:", result.error);
      return res.status(500).json({ error: "Failed to fetch previous chat messages" });
    }

    return res.status(200).json({ messages: result.data });
  } catch (err) {
    console.error("Internal Server Error:", err);
    return res.status(500).json({
      error: "Internal Server Error",
      details: (err as Error).message,
    });
  }
};
