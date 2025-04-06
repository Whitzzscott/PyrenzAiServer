import type { Request, Response } from 'express';
import GetChatId from './Chats/GetChatId.js';
import GenerateChatID from './Chats/GenerateChatId.js';
 import Generate from './Generate/Generate.js';
import { GetMessages } from './Chats/GetMessage.js';
import { PreviousChat } from './Chats/GetPreviousChat.js';
import { supabase } from './Utils.js';

type RouteHandler = (req: Request, res: Response) => Promise<Response | void> | Response | void;

const Routes: Record<string, RouteHandler> = {
  GetChatId,
  PreviousChat,
  GenerateChatID,
  Generate,
  GetMessages,
};

const AutoRoutes = new Proxy(Routes, {
  get(target, prop: string) {
    if (prop in target) {
      const routeHandler = target[prop as keyof typeof target];
      if (typeof routeHandler === 'function') {
        return async (req: Request, res: Response) => {
          try {
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
              const token = authHeader.split(' ')[1];

              const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
                refresh_token: token,
                access_token: token,
              });

              if (sessionError || !sessionData.session) {
                return res.status(401).json({ error: 'Unauthorized' });
              }
            } else {
              return res.status(401).json({ error: 'Unauthorized' });
            }

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
    } else {
      return async (req: Request, res: Response) => {
        res.status(404).json({ error: 'Endpoint Not Found' });
      };
    }
  },
});

export default AutoRoutes;
