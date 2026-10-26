import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";
import pdf from "pdf-parse";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const fileName = file.name;

    if (fileName.match(/\.pdf$/i)) {
      const data = await pdf(Buffer.from(buffer));
      if (!data.text.trim()) {
        return NextResponse.json({ error: "No text found in PDF. It may be scanned images." }, { status: 400 });
      }
      return NextResponse.json({ text: data.text.trim() });
    }

    if (fileName.match(/\.docx?$/i)) {
      const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
      if (!result.value.trim()) {
        return NextResponse.json({ error: "No text found in document." }, { status: 400 });
      }
      return NextResponse.json({ text: result.value.trim() });
    }

    return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
  } catch (error) {
    console.error("Text extraction error:", error);
    const message = error instanceof Error ? error.message : "Extraction failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
