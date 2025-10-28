'use client'

import React, { useEffect, useState } from 'react'
import { Input } from './ui/input'
import { Button } from './ui/button'
import { Send } from 'lucide-react'
import MessageList from './message-list'
import type { UIMessage } from 'ai'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'

type Props = { chatId: number }

const ChatComponent = ({ chatId }: Props) => {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<UIMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [typingDots, setTypingDots] = useState('')

  // Load existing messages
  const { data, isLoading: isLoadingHistory } = useQuery({
    queryKey: ['chat', chatId],
    queryFn: async () => {
      const res = await axios.post<UIMessage[]>('/api/get-messages', { chatId })
      return res.data
    }
  })

  useEffect(() => {
    if (data && data.length) setMessages(data)
  }, [data])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    const userMessage: UIMessage = {
      id: Date.now().toString(),
      role: 'user',
      parts: [{ type: 'text', text: input }]
    }

    // Add user message immediately
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch(`/api/chat?chatId=${chatId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage]
        })
      })

      if (!response.ok) {
        throw new Error('Failed to get response')
      }

      const data = await response.json()
      // Normalize response to parts
      const partsFromServer = Array.isArray(data?.parts)
        ? data.parts
        : Array.isArray(data?.content)
          ? data.content
          : [{ type: 'text', text: (typeof data?.content === 'string' ? data.content : 'No response') }]

      // Add assistant message
      const assistantMessage: UIMessage = {
        id: data.id || Date.now().toString(),
        role: 'assistant',
        parts: partsFromServer
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Error:', error)
      // Add error message
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        parts: [{ type: 'text', text: 'Sorry, I encountered an error. Please try again.' }]
      }])
    } finally {
      setIsLoading(false)
    }
  }

  // typing dots animation when waiting for assistant
  useEffect(() => {
    if (!isLoading) {
      setTypingDots('')
      return
    }
    const frames = ['.', '..', '...']
    let i = 0
    const iv = setInterval(() => {
      setTypingDots(frames[i % frames.length])
      i++
    }, 450)
    return () => clearInterval(iv)
  }, [isLoading])

  return (
    <div className="relative flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <div className="sticky top-0 inset-x-0 p-2 bg-white border-b border-gray-200">
        <h3 className="text-xl font-bold">Chat</h3>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <MessageList
          messages={isLoading ? [...messages, {
            id: 'typing',
            role: 'assistant',
            parts: [{ type: 'text', text: `${typingDots}` }]
          }] : messages}
        />
        {isLoadingHistory && (
          <div className="text-center text-sm text-gray-400 mt-2">Loading history...</div>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="sticky bottom-0 inset-x-0 px-2 py-4 bg-white flex items-center gap-2 border-t border-gray-200"
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={isLoading ? 'Waiting for response...' : 'Ask anything...'}
          className="flex-1"
          disabled={isLoading}
        />
        <Button
          type="submit"
          disabled={isLoading}
          className="bg-blue-500 hover:bg-blue-600 text-white"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  )
}

export default ChatComponent