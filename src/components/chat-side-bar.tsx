import React from 'react';
import { DrizzleChart } from '@/lib/db/schema';
import Link from 'next/link';
import { Button } from './ui/button';
import { PlusCircle } from 'lucide-react';
import { MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  chart: DrizzleChart[],
  chatId: number,

}

const ChatSidebar = ({ chart, chatId }: Props) => {
  return (
    <div className='w-full min-h-screen text-gray-200 bg-gray-900'>
        <Link href={`/`}>
            <Button className='w-full border-dashed border-white border'>
                <PlusCircle className='mr-1 w-4 h-4'/>
                New Chat
            </Button>
        </Link>
        <div className='flex flex-col gap-2 mt-2'>
            {chart.map((chat) => (
                <Link key={chat.id} href={`/chat/${chat.id}`}>
                    <div className={
                        cn('rounded-lg p-2 hover:bg-gray-700 flex items-center',{ 
                            'bg-purple-500 text-white': chat.id === chatId,
                            'hover:text-white': chat.id != chatId 
                        })}>
                        <MessageCircle className='inline-block w-4 h-4 mr-2'/>
                        <p className='w-full overflow-hidden text-sm truncate whitespace-nowrap text-ellipsis'>
                            {chat.pdfName}
                        </p>
                    </div>
                </Link>
            ))}
        </div>
            
            <div className='absolute bottom-4 left-4'>
                <div className='flex items-center gap-2 text-sm text-gray-400 flex-wrap'>
                    <Link href='/'>home</Link>
                    <Link href='/'>source</Link>
                    {/* Stripe Button */}

                </div>
            </div>
    </div>
  )
}

export default ChatSidebar;