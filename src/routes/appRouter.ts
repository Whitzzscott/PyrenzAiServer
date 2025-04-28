import type { Request, Response } from "express";
import { supabase } from "./Supabase.js";
import { 
  GetPreviousChat,
  Chats,
  GetMessages,
} from "./Chats/ChatsHandler.js"
import { getPersona } from "./Persona/Persona.js"
import createCharacter from "./Create/CreateCharacter.js"

type RouteHandler = (
  req: Request,
  res: Response,
) => Promise<Response | void> | Response | void;

const Routes: Record<string, RouteHandler> = {
  GetPreviousChat,
  GetMessages,
  Chats,
  getPersona,
  createCharacter,
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
              console.log("Auth token incoming:", token);

              const { data: { user }, error } = await supabase.auth.getUser(token);

              if (error || !user) {
                console.error("Auth error:", error);
                return res.status(401).json({ error: "Unauthorized" });
              }
              console.log("Auth user result:", user);
              console.log("Auth error result:", error);
              
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