// src/app/api/chat/route.ts
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { messages, chatId } = body as { messages?: any[]; chatId?: string; [k: string]: any }

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

    const base = process.env.LLAMA_API_BASE_URL || process.env.LLM_API_BASE_URL
    const path = process.env.LLAMA_CHAT_PATH || '/summarize'
    if (!base) {
      return NextResponse.json(
        { error: 'LLAMA_API_BASE_URL not configured' },
        { status: 500 }
      )
    }

    const url = `${base.replace(/\/$/, '')}${path.startsWith('/') ? path : '/' + path}`

    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    const apiKey = process.env.LLAMA_API_KEY || process.env.LLM_API_KEY
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`

    console.log('📤 Sending to LLaMA:', { url, text: lastText.substring(0, 100) + '...' })

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ text: lastText, chatId }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('❌ LLaMA server error:', response.status, errText)
      return NextResponse.json({ error: errText }, { status: response.status })
    }

    const data = await response.json()
    console.log('📥 Received from LLaMA:', data)

    // Extract the answer from various possible field names
    const answer = data.response || data.result || data.summary || data.output || data.text || data.answer || ''

    if (!answer) {
      console.error('⚠️ No answer field found in response:', Object.keys(data))
      return NextResponse.json({ 
        error: 'Server returned empty response' 
      }, { status: 500 })
    }

    // CRITICAL FIX: Return the response in the format expected by useChat
    // The response should have a 'parts' array with text content
    return NextResponse.json({
      id: Date.now().toString(),
      role: 'assistant',
      parts: [
        { type: 'text', text: answer }
      ]
    })

  } catch (error) {
    console.error('💥 Chat API error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 })
  }
}