import React from 'react';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation'
import { db } from '@/lib/db';
import { chart } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import ChatSidebar from '@/components/chat-side-bar';
import PdfViewer from '@/components/pdf-viewer';
import ChatComponent from '@/components/chat-component';

interface Props {
  params: Promise<{
    chatId: string;
  }>
}

const ChatPage = async (props: Props) => {
  const { chatId } = await props.params;
  const { userId } = await auth()
  if (!userId) {
    return redirect('/sign-in')
  }
  const _chat = await db.select().from(chart).where(eq(chart.userId, userId))
  if (!_chat) {
    return redirect('/')
  }
  if (!_chat.find(chart => chart.id === parseInt(chatId))) {
    return redirect('/')
  }

  const currentChat = _chat.find(chart => chart.id === parseInt(chatId))

  return (
    <div className='flex max-h-screen overflow-scroll'>
        <div className='flex w-full max-h-screen overflow-scroll'>

            {/* Sidebar */}
            <div className='flex-1 max-w-xs'>
                <ChatSidebar chart={_chat} chatId={parseInt(chatId)} />
            </div>

            {/* Pdf Viewer */}
            <div className='p-4 overflow-y-scroll flex-5'>
                <PdfViewer pdf_url={currentChat?.pdfUrl || ''} />
            </div>

            {/* Chat */}
            <div className='flex-3 border-1-4 boreder-1-slate-200'>
                <ChatComponent />
            </div>
        </div>
    </div>
  )
}

export default ChatPage;