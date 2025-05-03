import { Request, Response } from "express";
import { supabase } from "../Supabase.js";
import { z } from "zod";
import sharp from "sharp";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage() });

export const ProfileCardsUpload = async (req: Request, res: Response) => {
  try {
    const { card_name, card_description } = z.object({
      card_name: z.string().min(1, "Card name is required"),
      card_description: z.string().min(1, "Card description is required")
    }).parse(req.body);

    if (!req.file) {
      return res.status(400).json({ error: "card_image is required" });
    }

    const avifImage = await sharp(req.file.buffer).toFormat("avif").toBuffer();
    const fileName = `${Date.now()}-${card_name.replace(/\s+/g, "-").toLowerCase()}.avif`;

    const { error: uploadError } = await supabase
      .storage
      .from("persona-cards")
      .upload(fileName, avifImage, { contentType: "image/avif", upsert: false });

    if (uploadError) {
      return res.status(500).json({ error: "Image upload failed", details: uploadError.message });
    }

    const { data: publicUrlData } = supabase
      .storage
      .from("persona-cards")
      .getPublicUrl(fileName);

    const imageUrl = publicUrlData.publicUrl;

    const { error: dbError } = await supabase
      .from("character_cards")
      .insert([{ card_name, card_description, card_image: imageUrl }]);

    if (dbError) {
      return res.status(500).json({ error: "DB insert failed", details: dbError.message });
    }

    res.status(200).json({ message: "Card uploaded", imageUrl });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid input", details: err.errors });
    }

    console.error(err);
    res.status(500).json({ error: "Internal server error", details: (err as Error).message });
  }
};
