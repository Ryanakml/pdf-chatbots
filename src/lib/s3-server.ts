import AWS from 'aws-sdk'
import fs from 'fs'
import os from 'os'
import path from 'path'

export async function downloadFromS3(
    file_key: string
){
    try{
        AWS.config.update({
            accessKeyId: process.env.NEXT_PUBLIC_S3_ACCESS_KEY_ID!,
            secretAccessKey: process.env.NEXT_PUBLIC_S3_SECRET_ACCESS_KEY!,
        })
        const s3 = new AWS.S3({
            params: {
                Bucket: process.env.NEXT_PUBLIC_S3_BUCKET_NAME!,
            },
            region: process.env.NEXT_PUBLIC_S3_REGION!,
        })
        const params = {
            Bucket: process.env.NEXT_PUBLIC_S3_BUCKET_NAME!,
            Key: file_key,
        }
        const obj = await s3.getObject(params).promise()

        // Ensure a writable tmp directory exists (works locally and on serverless platforms like Vercel)
        const tmpDir = path.join(os.tmpdir(), 'pdf')
        fs.mkdirSync(tmpDir, { recursive: true })

        const file_name = path.join(tmpDir, `${Date.now()}.pdf`)

        // obj.Body can be Buffer | Uint8Array | string in AWS SDK v2
        const body = obj.Body as Buffer | Uint8Array | string | undefined
        if (!body) {
            throw new Error('S3 object body is empty')
        }
        fs.writeFileSync(file_name, Buffer.isBuffer(body) ? body : Buffer.from(body as any))
        return file_name
    } catch (error) {
        console.error(error)
        return null
    }
}