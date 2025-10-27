import { db } from "@/lib/db";
import { chart } from "@/lib/db/schema";
import { loadS3IntoPinecone } from "@/lib/pinecone";
import { getS3Url } from "@/lib/s3";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export async function POST(req: Request) {
  console.log("[API] /api/create-chat hit");

  try {
    const { userId } = await auth();
    console.log("userId:", userId);

    if (!userId) {
      console.log("Unauthorized request (no userId)");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { file_key, file_name } = await req.json();
    console.log("Received file:", { file_key, file_name });

    console.log("Step 1: Loading file into Pinecone...");
    await loadS3IntoPinecone(file_key);
    console.log("Step 1 done: File embedded and uploaded to Pinecone");

    console.log("Step 2: Inserting record into DB...");
    const chart_id = await db
      .insert(chart)
      .values({
        fileKey: file_key,
        pdfName: file_name,
        pdfUrl: getS3Url(file_key),
        userId: String(userId),
      })
      .returning({
        insertedId: chart.id,
      });

    console.log("Step 2 done: Inserted chart id =", chart_id[0].insertedId);

    return NextResponse.json(
      { chat_id: chart_id[0].insertedId },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("SERVER ERROR in /api/create-chat:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: String(error) },
      { status: 500 }
    );
  }
}