import { Request, Response } from "express";
import { z } from "zod";
import { supabase } from "../Utils.js";

const personaSchema = z.object({
  user_uuid: z.string().uuid(),
  auth_key: z.string().min(1),
});

export const getPersona = async (req: Request, res: Response) => {
  try {
    const { user_uuid, auth_key } = personaSchema.parse(req.body);

    const { data, error } = await supabase.rpc("get_user_data", {
      p_user_uuid: user_uuid,
      p_auth_key: auth_key,
    });

    if (error) {
      console.error("Error calling Supabase RPC:", error.message);
      return res.status(500).json({ error: error.message });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(200).json(data[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }

    console.error("Unexpected error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
