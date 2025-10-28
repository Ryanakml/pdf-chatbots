// src/app/api/chat/route.ts
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { chart, messages as messagesTable } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getContext } from '@/lib/context'

// Use Node.js runtime to avoid potential http fetch restrictions on Edge and to ease env handling
export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const url = new URL(req.url)
    const qsChatId = url.searchParams.get('chatId')
    const body = await req.json()
    const { messages, chatId: bodyChatId } = body as { messages?: any[]; chatId?: number | string; [k: string]: any }
    const chatId = (qsChatId ?? bodyChatId) as string | number | undefined

    // Extract user text robustly from various shapes
    const getLastText = (): string => {
      if (typeof body.text === 'string') return body.text
      if (typeof body.input === 'string') return body.input
      if (typeof body.message === 'string') return body.message
      if (typeof body.prompt === 'string') return body.prompt

      const lastMsg = messages?.[messages.length - 1]
      if (!lastMsg) return ''

      if (typeof lastMsg.content === 'string') return lastMsg.content

      if (Array.isArray(lastMsg?.parts)) {
        return lastMsg.parts
          .filter((p: any) => p && (p.type === 'text' || typeof p.text === 'string'))
          .map((p: any) => p.text ?? '')
          .filter(Boolean)
          .join('\n')
      }

      if (Array.isArray(lastMsg?.content)) {
        return lastMsg.content
          .map((p: any) => {
            if (typeof p === 'string') return p
            if (p?.type === 'text' && typeof p.text === 'string') return p.text
            if (typeof p?.text === 'string') return p.text
            return ''
          })
          .filter(Boolean)
          .join('\n')
      }

      if (typeof lastMsg.text === 'string') return lastMsg.text
      return ''
    }

    const lastText = getLastText().trim()
    if (!lastText) {
      return NextResponse.json({ error: 'Missing text' }, { status: 400 })
    }

    // Load chat and resolve file_key namespace for RAG context
    if (!chatId) {
      return NextResponse.json({ error: 'Missing chatId' }, { status: 400 })
    }
    const chatRow = await db.select().from(chart).where(eq(chart.id, Number(chatId)))
    if (!chatRow?.length) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 })
    }
    const fileKey = chatRow[0].fileKey

    // Build context from Pinecone
  const context = await getContext(lastText, fileKey)
  console.log('[chat] contextLength=', context?.length || 0)
  const systemPrompt = `AI assistant is a brand new, powerful, human-like artificial intelligence.
The traits of AI include expert knowledge, helpfulness, cleverness, and articulateness.
AI is a well-behaved and well-mannered individual.
AI is always friendly, kind, and inspiring, and eager to provide vivid and thoughtful responses.
AI assistant has access to the following CONTEXT BLOCK that may contain relevant information.
START CONTEXT BLOCK\n${context ?? ''}\nEND OF CONTEXT BLOCK
Rules:
- If the context does not provide the answer, say "I'm sorry, but I don't know the answer to that question".
- Do not invent facts not directly grounded in the context.
`
    const prompt = `${systemPrompt}\n\nQuestion: ${lastText}\nAnswer:`

    const base = process.env.LLAMA_API_BASE_URL || process.env.LLM_API_BASE_URL
    const path = process.env.LLAMA_CHAT_PATH || '/summarize'
    if (!base) {
      return NextResponse.json(
        { error: 'LLAMA_API_BASE_URL not configured' },
        { status: 500 }
      )
    }
    const llamaUrl = `${base.replace(/\/$/, '')}${path.startsWith('/') ? path : '/' + path}`

    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    const apiKey = process.env.LLAMA_API_KEY || process.env.LLM_API_KEY
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`

    const response = await fetch(llamaUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ text: prompt, chatId }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('❌ LLaMA server error:', response.status, errText)
      return NextResponse.json({ error: errText }, { status: response.status })
    }

    const data = await response.json()
    const answer = (data.response || data.result || data.summary || data.output || data.text || data.answer || '').toString()

    // Persist both user and assistant messages
    try {
      await db.insert(messagesTable).values({
        chartId: Number(chatId),
        content: lastText,
        role: 'user',
      })
      await db.insert(messagesTable).values({
        chartId: Number(chatId),
        content: answer,
        role: 'system',
      })
    } catch (e) {
      console.error('Failed to persist messages:', e)
    }

    // Return an assistant message for the UI (use 'parts' for compatibility)
    return NextResponse.json({
      id: Date.now().toString(),
      role: 'assistant',
      parts: [ { type: 'text', text: answer || 'I could not generate a response.' } ],
    })

  } catch (error) {
    console.error('💥 Chat API error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 })
  }
}