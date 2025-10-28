import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { messages as messagesTable } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { chatId } = await req.json();
    const id = Number(chatId);
    if (!id || Number.isNaN(id)) {
      return NextResponse.json({ error: "Invalid chatId" }, { status: 400 });
    }

    const rows = await db
      .select()
      .from(messagesTable)
      .where(eq(messagesTable.chartId, id))
      .orderBy(asc(messagesTable.createdAt));

    // Map DB rows to UIMessage-like shape used by the UI
    const messages = rows.map((m) => ({
      id: String(m.id),
      role: m.role === "user" ? "user" : ("assistant" as const),
      parts: [
        {
          type: "text" as const,
          text: m.content,
        },
      ],
    }));

    return NextResponse.json(messages);
  } catch (error) {
    console.error("get-messages error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
