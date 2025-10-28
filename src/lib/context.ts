import { Pinecone } from "@pinecone-database/pinecone";
import { convertToAscii } from "./utils";
import { getEmbedding } from "./embeddings";

let pinecone: Pinecone | null = null;

export const getPineconeClient = async () => {
    if (!pinecone) {
        pinecone = new Pinecone({
            apiKey: process.env.PINECONE_API_KEY!,
        });
    }
    return pinecone;
};

export async function getMatchesFromEmbeddings(
    embeddings: number[],
    file_key: string,
) {
    const client = await getPineconeClient()
    const index = client.index('cht-pdf')

    try{
        const namespace = convertToAscii(file_key);
        const queryResponse = await index
            .namespace(namespace)
            .query({
                vector: embeddings,
                topK: 5,
                includeMetadata: true,
            })
        const matches = queryResponse.matches || [];
        if (matches.length) {
            const topScore = matches[0]?.score ?? 0
            console.log(`[context] namespace=${namespace} matches=${matches.length} topScore=${topScore?.toFixed?.(3)}`)
        } else {
            console.warn(`[context] namespace=${namespace} no matches`)
        }
        return matches;
    } catch(error){
        console.error("Error querying Pinecone:", error);
    }
}

export async function getContext (
    query: string,
    file_key: string,
) {
    const queryEmbedding = await getEmbedding(query);
    const matches = await getMatchesFromEmbeddings(queryEmbedding, file_key);
    
    const threshold = Number(process.env.CONTEXT_MIN_SCORE ?? 0.3)
    const qualifyingDocs = matches?.filter(
        (match) => typeof match.score === 'number' && (match.score as number) >= threshold
    )

    type Metadata = {
        text: string;
        pageNumber: number;
    }

    let docs = qualifyingDocs?.map(match => 
    (match.metadata as Metadata).text)

    const context = docs?.join('\n') ?? ''
    const clipped = context.substring(0, 3000)
    if (!clipped) {
        console.warn('[context] empty after filtering; consider lowering CONTEXT_MIN_SCORE')
    }
    return clipped
}

