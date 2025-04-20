import { supabase } from "../Utils.js";
import { z } from "zod";
import { Request, Response } from "express";

const GetMessagesSchema = z.object({
  conversation_id: z.string().min(1),
  user_uuid: z.string().uuid(),
  auth_key: z.string().transform((val) => val.replace(/[\\/]/g, "")),
});

export const GetMessages = async (req: Request, res: Response) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const body = req.body;
    const parsed = GetMessagesSchema.safeParse(body);

    if (!parsed.success) {
      return res.status(400).json({
        error: "Invalid request payload",
        details: parsed.error.errors,
      });
    }

    const { conversation_id, user_uuid, auth_key } = parsed.data;

    const { data, error } = await supabase.rpc("get_messages", {
      p_chat_id: conversation_id,
      p_user_uuid: user_uuid,
      p_auth_key: auth_key,
    });

    if (error || !data) {
      console.error("Failed to fetch messages:", error);
      return res.status(500).json({ error: "Failed to fetch messages" });
    }

    return res.status(200).json({ messages: data });
  } catch (err) {
    console.error("Internal Server Error:", err);
    return res.status(500).json({
      error: "Internal Server Error",
      details: (err as Error).message,
    });
  }
};
