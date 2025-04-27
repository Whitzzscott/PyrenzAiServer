import { supabase } from "../Supabase.js";
import { z } from "zod";
import { Request, Response } from "express";

const requestSchema = z.object({
  type: z.enum(["getchatid", "createchat"]),
  conversation_id: z.string().uuid().optional(),
  character_uuid: z.string().uuid().optional(),
  user_uuid: z.string().uuid().optional(),
  auth_key: z
    .string()
    .optional()
    .transform((val) => val?.replace(/\\/g, "")),
});

export const Chats = async (req: Request, res: Response) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const body = req.body;
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return res.status(400).json({
        error: "Invalid request payload",
        details: parsed.error.errors,
      });
    }

    const { type, conversation_id, character_uuid, user_uuid, auth_key } = parsed.data;

    if (!auth_key) {
      return res.status(400).json({ error: "Authentication key is missing" });
    }

    switch (type) {
      case "getchatid":
        if (!conversation_id) {
          return res.status(400).json({ error: 'conversation_id is required for type "getchatid"' });
        }

        const { data: chatData, error: chatError } = await supabase.rpc(
          "get_chat_data",
          {
            p_chat_id: conversation_id,
            p_user_uuid: user_uuid,
            p_auth_key: auth_key,
          }
        );

        if (chatError) {
          console.log(chatError)
          return res.status(500).json({ error: "Access Denied" });
        }

        if (!chatData) {
          return res.status(404).json({ error: "Chat Does Not Exist" });
        }

        return res.status(200).json({ character: chatData });

      case "createchat":
        if (!character_uuid) {
          return res.status(400).json({ error: 'character_uuid is required for type "createchat"' });
        }

        const { data: createData, error: createError } = await supabase.rpc(
          "create_new_chat",
          {
            character_uuid,
            user_uuid,
            auth_key,
          }
        );

        if (createError) {
          return res.status(500).json({ error: "Access Denied." });
        }

        const chat_uuid = createData.chat_uuid;
        return res.status(200).json({ chat_uuid });

      default:
        if (character_uuid && conversation_id) {
          const { data: characterData, error: characterError } =
            await supabase.rpc("get_character_details", {
              character_uuid,
            });

          if (characterError) {
            return res.status(500).json({ error: "Access Denied" });
          }

          if (!characterData) {
            return res.status(404).json({ error: "Character not found" });
          }

          return res.status(200).json({ character: characterData });
        }

        return res.status(400).json({ error: "Invalid type" });
    }
  } catch (err) {
    return res.status(500).json({
      error: "Internal Server Error",
      details: (err as Error).message,
    });
  }
};
