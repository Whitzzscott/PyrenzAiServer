import { supabase } from '../Util.js'
import { z } from 'zod'
import { Request, Response } from 'express'

const GetMessagesSchema = z.object({
  chatID: z.string().min(1),
})

export const GetMessages = async (req: Request, res: Response) => {
  try {
    const { chatID } = GetMessagesSchema.parse(req.body)

    const { data: messagesData, error: messagesError } = await supabase
      .from('messages')
      .select('ai_message, user_message, created_at')
      .eq('conversation_id', chatID)
      .order('created_at', { ascending: true })

    if (messagesError) {
      return res.status(500).json({ error: 'Failed to fetch messages' })
    }

    return res.status(200).json({ messages: messagesData })
  } catch (error) {
    return res.status(400).json({ error: 'Invalid request' })
  }
}
