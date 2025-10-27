'use client'

import { uploadToS3 } from '@/lib/s3'
import { useMutation } from '@tanstack/react-query'
import { Inbox, Loader2 } from 'lucide-react'
import React from 'react'
import { useDropzone } from 'react-dropzone'
import axios from 'axios'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'


const FileUpload = () => {
  const router = useRouter()
  const [uploading, setUploading] = React.useState(false)
  const { mutate, isPending } = useMutation({
    mutationFn: async ({
      file_key,
      file_name,
    }: {
      file_key: string
      file_name: string
    }) => {
      const response = await axios.post('/api/create-chat', {
        file_key,
        file_name,
      })
      return response.data
    },
  })

  const { getRootProps, getInputProps } = useDropzone({
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    onDrop: async (acceptedFiles) => {
      const file = acceptedFiles[0]
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File too large! Maximum size is 10MB.')
        return
      }

      try {
        setUploading(true)
        const data = await uploadToS3(file)
        if (!data?.file_key || !data?.file_name) {
          toast.error('Something went wrong while uploading your pdf, please try again!')
          return
        }
        mutate(
          {
            file_key: data.file_key.replace("uploads/", ""), 
            file_name: data.file_name,
          },
          {
            onSuccess: ({ chat_id }) => {
              toast.success('File uploaded successfully 🎉')
              console.log(data)
              router.push(`/chat/${chat_id}`)
            },
            onError: (err) => {
              toast.error('Error occurred while uploading to the server.')
              console.error('Error uploading to server', err)
            },
          }
        )
      } catch (error) {
        toast.error('Upload failed. Please check your connection.')
        console.error('Error uploading file:', error)
      } finally {
        setUploading(false)
      }
    },
  })

  return (
    <div className="p-2 bg-white rounded-xl">
      <div
        {...getRootProps({
          className:
            'border-dashed border-2 rounded-xl cursor-pointer bg-gray-50 py-8 flex justify-center items-center flex-col',
          })}
      >
        <input {...getInputProps()} />
        {uploading || isPending ? (
          <div>
            {/* Loading State */}
            <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />\
            <p className='text-sm text-slate-400 mt-2'>
              LLM is working ...
            </p>
          </div>
        ) : (
          <div>
            <Inbox className="w-10 h-10 text-blue-500" />
            <p className="mt-2 text-sm text-slate-400">
              Drag and drop a PDF here
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default FileUpload