/**
 * NEURA PHASE 5 — VIDEO STREAMING & HTTP RANGE DELIVERY
 * GET /api/library/stream?path=...
 * Supports HTTP Range requests (206 Partial Content) for efficient seeking
 * and progressive playback of large educational MP4 files.
 */

import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const storagePath = searchParams.get("path");

    if (!storagePath) {
      return NextResponse.json(
        { success: false, error: "Storage path parameter is required." },
        { status: 400 }
      );
    }

    // Prevent directory traversal
    if (storagePath.includes("..")) {
      return NextResponse.json(
        { success: false, error: "Invalid path." },
        { status: 400 }
      );
    }

    // Check local filesystem first
    const localPath = path.join(process.cwd(), "public", storagePath);
    const fallbackPath = path.join(process.cwd(), "public", "uploads", storagePath);

    let resolvedPath = "";
    if (fs.existsSync(localPath)) {
      resolvedPath = localPath;
    } else if (fs.existsSync(fallbackPath)) {
      resolvedPath = fallbackPath;
    }

    // If file doesn't exist locally, check demo fallback or redirect to external/Supabase URL
    if (!resolvedPath) {
      // Demo placeholder response or 404
      return NextResponse.json(
        {
          success: false,
          error: "Video stream source not found.",
          storagePath,
        },
        { status: 404 }
      );
    }

    const stat = fs.statSync(resolvedPath);
    const fileSize = stat.size;
    const range = req.headers.get("range");

    if (range) {
      // Parse Range header e.g. "bytes=0-1048575"
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : Math.min(start + 2 * 1024 * 1024 - 1, fileSize - 1);

      if (start >= fileSize || end >= fileSize || start > end) {
        return new NextResponse(null, {
          status: 416,
          headers: {
            "Content-Range": `bytes */${fileSize}`,
          },
        });
      }

      const chunkSize = end - start + 1;
      const fileStream = fs.createReadStream(resolvedPath, { start, end });

      // Convert Node stream to web ReadableStream
      const webStream = new ReadableStream({
        start(controller) {
          fileStream.on("data", (chunk) => controller.enqueue(chunk));
          fileStream.on("end", () => controller.close());
          fileStream.on("error", (err) => controller.error(err));
        },
      });

      return new NextResponse(webStream, {
        status: 206,
        headers: {
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunkSize.toString(),
          "Content-Type": resolvedPath.endsWith(".webm") ? "video/webm" : "video/mp4",
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    // Full video delivery if no Range specified
    const fileStream = fs.createReadStream(resolvedPath);
    const webStream = new ReadableStream({
      start(controller) {
        fileStream.on("data", (chunk) => controller.enqueue(chunk));
        fileStream.on("end", () => controller.close());
        fileStream.on("error", (err) => controller.error(err));
      },
    });

    return new NextResponse(webStream, {
      status: 200,
      headers: {
        "Content-Length": fileSize.toString(),
        "Content-Type": resolvedPath.endsWith(".webm") ? "video/webm" : "video/mp4",
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Stream failed";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
