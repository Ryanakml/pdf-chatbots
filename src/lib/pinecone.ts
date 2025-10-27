import { Pinecone } from "@pinecone-database/pinecone";
import { downloadFromS3 } from "./s3-server";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import fs from "fs/promises";
import { Document, RecursiveCharacterTextSplitter } from "@pinecone-database/doc-splitter";
import { getEmbedding } from "./embeddings";
import md5 from "md5";
import { convertToAscii } from "./utils";

let pinecone: Pinecone | null = null;

export const getPineconeClient = async () => {
  if (!pinecone) {
    pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });
  }
  return pinecone;
};

type PDFPage = {
  pageContent: string;
  metadata: {
    loc: { pageNumber: number };
  };
};

export async function loadS3IntoPinecone(file_key: string) {
  console.log("📥 Downloading PDF from S3 Bucket...");
  const file_name = await downloadFromS3(file_key);
  if (!file_name) throw new Error("Downloading from S3 failed!");

  const loader = new PDFLoader(file_name);
  const pages = (await loader.load()) as PDFPage[];

  try {
    await fs.unlink(file_name);
  } catch {}

  // Split documents
  const documents = (
    await Promise.all(pages.map(prepareDocument))
  ).flat();

  // Embed each chunk
  const vectors = await Promise.all(documents.map(embedDocument));

  // Upload to Pinecone
  const client = await getPineconeClient();
  const index = client.index("cht-pdf");

  console.log(`🚀 Upserting ${vectors.length} vectors into Pinecone...`);

  const namespace = convertToAscii(file_key);

  try {
    await index.namespace(namespace).upsert(vectors);
  } catch (err: any) {
    console.error("Pinecone upsert failed:", err?.message || err);
    const dim = (vectors[0]?.values?.length) ?? "unknown";
    console.error(`First vector dimension: ${dim}. Ensure it matches your Pinecone index dimension.`);
    throw err;
  }

  return documents[0];
}

async function embedDocument(doc: Document) {
  try {
    const embeddings = await getEmbedding(doc.pageContent);
    const hash = md5(doc.pageContent);

    return {
      id: hash,
      values: embeddings,
      metadata: {
        text: String(doc.metadata.text ?? ""),          
        pageNumber: Number(doc.metadata.pageNumber ?? 0),
      },
    };
  } catch (error) {
    console.error("Error embedding document:", error);
    throw error;
  }
}

export function truncateStringByBytes(str: string, bytes: number) {
  const encoder = new TextEncoder();
  const encoded = encoder.encode(str).slice(0, bytes);
  const decoder = new TextDecoder("utf-8");
  return decoder.decode(encoded);
}

async function prepareDocument(page: PDFPage) {
  let { pageContent, metadata } = page;
  pageContent = pageContent.replace(/\n/g, " ");

  const splitter = new RecursiveCharacterTextSplitter();
  const docs = await splitter.splitDocuments([
    new Document({
      pageContent,
      metadata: {
        pageNumber: metadata.loc.pageNumber,
        text: truncateStringByBytes(pageContent, 36000),
      },
    }),
  ]);

  return docs;
}