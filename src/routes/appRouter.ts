import type { Request, Response } from "express";
import { supabase } from "./Supabase.js";
import createCharacter from "./Create/CreateCharacter.js"
import { CharacterExtract } from "./CharacterExtract/characterextractor.js"
import Generate from "../routes/Generate/Generate.js"
import { ProfileCardsUpload } from "./ProfileCardsUpload/ProfileCardsUpload.js"
import { Getadtoken } from "./Authentication/AdwatchAuth.js"
type RouteHandler = (
  req: Request,
  res: Response,
) => Promise<Response | void> | Response | void;

const Routes: Record<string, RouteHandler> = {
  createCharacter,
  CharacterExtract,
  Generate, 
  ProfileCardsUpload,
  Getadtoken
};

const AutoRoutes = new Proxy(Routes, {
  get(target, prop: string) {
    if (prop in target) {
      const routeHandler = target[prop as keyof typeof target];
      if (typeof routeHandler === "function") {
        return async (req: Request, res: Response) => {
          try {
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith("Bearer ")) {
              const token = authHeader.split(" ")[1];

              const { data: { user }, error } = await supabase.auth.getUser(token);

              if (error || !user) {
                console.error("Auth error:", error);
                return res.status(401).json({ error: "Unauthorized" });
              }

              
              (req as any).user = user;
            } else {
              return res.status(401).json({ error: "Unauthorized" });
            }

            const result = await routeHandler(req, res);
            if (result instanceof Response) {
              return result;
            }
          } catch (error) {
            console.error(`Error in ${prop} handler:`, error);
            res.status(500).json({ error: "Internal Server Error" });
          }
        };
      }
    } else {
      return async (req: Request, res: Response) => {
        res.status(404).json({ error: "Endpoint Not Found" });
      };
    }
  },
});


export default AutoRoutes;