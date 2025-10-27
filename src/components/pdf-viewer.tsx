import React from 'react'

type Props = {
  pdf_url: string
}

const PdfViewer = ({ pdf_url }: Props) => {
  // bersihkan spasi atau newline tak sengaja
  const cleanUrl = pdf_url.replace(/\s+/g, '')

  if (!cleanUrl) {
    return <div className="text-center mt-10 text-gray-500">Tidak ada PDF tersedia</div>
  }

  return (
    <div className="w-full h-screen">
      <iframe
        // kamu bisa pilih salah satu:
        //  Google Docs Viewer (lebih aman tapi kadang lambat)
        src={`https://docs.google.com/gview?url=${encodeURIComponent(cleanUrl)}&embedded=true`}
        //  Langsung tampilkan PDF dari S3 (lebih cepat)
        // src={cleanUrl}

        className="w-full h-full border-none"
        allowFullScreen
      />
    </div>
  )
}

export default PdfViewer