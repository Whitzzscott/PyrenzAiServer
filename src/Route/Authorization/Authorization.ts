import { v4 as uuidv4 } from 'uuid'
import { supabase } from '../Util.js'
import { Request, Response } from 'express'
import { z } from 'zod'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET as string

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined in environment variables')
}

const userSchema = z.object({
  email: z.string().email(),
  full_name: z.string().optional(),
  avatar_url: z.string().url().optional(),
  created_at: z.string().optional(),
  phone: z.string().optional(),
  last_sign_in_at: z.string().optional()
})

function generateToken(user_uuid: string, email: string): string {
  return jwt.sign({ user_uuid, email }, JWT_SECRET, { expiresIn: '7d' })
}

async function verifyToken(token: string) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { user_uuid: string; email: string }
    const { data: user, error } = await supabase
      .from('users')
      .select('user_uuid')
      .eq('user_uuid', decoded.user_uuid)
      .single()

    if (error || !user) {
      throw new Error('User not found')
    }
    return true
  } catch (error) {
    throw new Error('Invalid or expired token')
  }
}

export default async function handler(req: Request, res: Response): Promise<Response> {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const authHeader = req.headers.authorization

  if (authHeader && req.body?.type === 'Checktoken') {
    const token = authHeader.split(' ')[1]
    if (!token) {
      return res.status(401).json({ error: 'Token missing' })
    }

    try {
      await verifyToken(token)
      return res.status(200).json({ message: 'User Exists' })
    } catch (error) {
      return res.status(401).json({ error: error instanceof Error ? error.message : 'Unauthorized' })
    }
  }

  try {
    const parsedBody = userSchema.safeParse(req.body)

    if (!parsedBody.success) {
      return res.status(400).json({ error: 'Invalid user data', details: parsedBody.error.errors })
    }

    const { email, full_name, avatar_url, created_at, phone, last_sign_in_at } = parsedBody.data

    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('user_uuid')
      .eq('email', email)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      return res.status(500).json({ error: 'Database Fetch Error', details: fetchError.message })
    }

    if (existingUser) {
      const token = generateToken(existingUser.user_uuid, email)
      return res.status(200).json({
        success: true,
        message: 'User already exists',
        user_uuid: existingUser.user_uuid,
        token
      })
    }

    const userUUID = uuidv4()

    const { data, error: insertError } = await supabase
      .from('users')
      .insert([
        {
          user_uuid: userUUID,
          email,
          full_name,
          avatar_url,
          created_at,
          phone,
          last_sign_in_at
        }
      ])
      .select('user_uuid')
      .single()

    if (insertError) {
      return res.status(500).json({ error: 'Database Insert Error', details: insertError.message })
    }

    const token = generateToken(data.user_uuid, email)

    return res.status(200).json({
      success: true,
      user_uuid: data.user_uuid,
      email,
      full_name,
      avatar_url,
      token
    })
  } catch (err) {
    return res.status(500).json({ error: 'Internal Server Error', details: err instanceof Error ? err.message : 'Unknown error' })
  }
}
