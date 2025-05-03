import { Request, Response } from "express";
import { supabase } from "../Supabase.js";
import { z } from "zod";
import { v2 as cloudinary } from "cloudinary";
import fetch from "node-fetch";
import sharp from "sharp";

export const ProfileCardsUpload = async (req: Request, res: Response) => {
  try {
    const { card_name, card_description, card_image } = z.object({
      card_name: z.string().min(1, "Card name is required"),
      card_description: z.string().min(1, "Card description is required"),
      card_image: z.string().min(1, "Card image is required"),
    }).parse(req.body);

    const base64Data = card_image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    const uploadResult = await cloudinary.uploader.upload(
      `data:image/png;base64,${base64Data}`,
      { format: "avif" }
    );

    if (!uploadResult.secure_url) {
      return res.status(500).json({ error: "Image conversion failed" });
    }

    const avifImageUrl = uploadResult.secure_url;

    const response = await fetch(avifImageUrl);
    const avifBuffer = await response.buffer();

    const compressedBuffer = await sharp(avifBuffer)
      .avif({ quality: 80 })
      .toBuffer();

    const fileName = `${Date.now()}-${card_name.replace(/\s+/g, "-").toLowerCase()}.avif`;
    const folderPath = `persona-image/${fileName}`;

    const { error: uploadError } = await supabase
      .storage
      .from("persona-cards")
      .upload(folderPath, compressedBuffer, { contentType: "image/avif", upsert: false });

    if (uploadError) {
      return res.status(500).json({ error: "Image upload failed", details: uploadError.message });
    }

    const { data: publicUrlData } = supabase
      .storage
      .from("persona-cards")
      .getPublicUrl(folderPath);

    const imageUrl = publicUrlData.publicUrl;

    const { error: dbError } = await supabase
      .from("persona_cards")
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
