import React from 'react'
import { cn } from '@/lib/utils'
import type { UIMessage } from 'ai'

function escapeHtml(unsafe: string) {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function renderMarkdownToHtml(text: string) {
  if (!text) return ''
  // escape first
  let out = escapeHtml(text)

  // code spans `code`
  out = out.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')

  // bold **text**
  out = out.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')

  // italic *text* (avoid matching inside strong)
  out = out.replace(/\*(?!\*)(.+?)\*(?!\*)/g, '<em>$1</em>')

  // links [text](url)
  out = out.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer noopener">$1</a>')

  // newlines to <br>
  out = out.replace(/\n/g, '<br/>')

  return out
}

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
                'max-w-[80%] px-3 py-2 rounded-xl text-sm shadow-sm',
                msg.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-900'
              )}
            >
              {/* Render markdown-like formatting (basic) */}
              {text ? (
                <div
                  dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(text) }}
                />
              ) : (
                'No content'
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default MessageList