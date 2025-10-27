import React from 'react'
import { cn } from '@/lib/utils'
import type { UIMessage } from 'ai'

type Props = {
  messages: UIMessage[]
}

const MessageList = ({ messages }: Props) => {
  if (!messages || messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        <p>No messages yet. Start a conversation!</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 px-4">
      {messages.map((msg) => {
        // Extract text from message parts
        const text = msg.parts
          ?.filter((p) => p?.type === 'text')
          .map((p) => p.text)
          .join(' ') || ''

        return (
          <div
            key={msg.id}
            className={cn('flex', {
              'justify-end': msg.role === 'user',
              'justify-start': msg.role === 'assistant',
            })}
          >
            <div
              className={cn(
                'max-w-[80%] px-3 py-2 rounded-xl text-sm shadow-sm break-words',
                msg.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-900'
              )}
            >
              {text || 'No content'}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default MessageList