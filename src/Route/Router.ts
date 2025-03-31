import type { Request, Response } from 'express';
import fetchCharacter from './Characters/Characters.js';
import GetCharacter from './Characters/GetCharacter.js';
import GetChatId from './Chats/GetChatId.js';
import GenerateChatID from './Chats/GenerateChatId.js';
import Authorization from './Authorization/Authorization.js';
import Generate from './Generate/Generate.js';
import { GetMessages } from './Chats/GetMessage.js'

type RouteHandler = (req: Request, res: Response) => Promise<Response | void> | Response | void;

const Routes: Record<string, RouteHandler> = {
  GetCharacter,
  fetchCharacter,
  GetChatId,
  GenerateChatID,
  Authorization,
  Generate,
  GetMessages
};

const AutoRoutes = new Proxy(Routes, {
  get(target, prop: string) {
    if (prop in target) {
      const routeHandler = target[prop as keyof typeof target];
      if (typeof routeHandler === 'function') {
        return async (req: Request, res: Response) => {
          try {
            const result = await routeHandler(req, res);
            if (result instanceof Response) {
              return result;
            }
          } catch (error) {
            console.error(`Error in ${prop} handler:`, error);
            res.status(500).json({ error: 'Internal Server Error' });
          }
        };
      }
    }
    throw new Error(`API action "${prop}" not found.`);
  },
});

export default AutoRoutes;
