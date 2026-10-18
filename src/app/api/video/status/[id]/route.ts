import { NextResponse } from "next/server";
import { getServerUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getJob } from "@/lib/video/jobs";

import { getVideoProvider } from "@/lib/video/provider";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { success: false, error: "Invalid job ID", code: "INVALID_ID" },
        { status: 400 }
      );
    }

    const isDbActive = isSupabaseConfigured();
    let authenticatedUserId: string | null = null;

    if (isDbActive) {
      const user = await getServerUser();
      if (!user) {
        return NextResponse.json(
          {
            success: false,
            error: "Authentication required to view job status.",
            code: "UNAUTHORIZED",
          },
          { status: 401 }
        );
      }
      authenticatedUserId = user.id;
    }

    const job = await getJob(id);
    if (!job) {
      return NextResponse.json(
        { success: false, error: "Job not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    // Ownership verification: user can only inspect their own job
    if (
      authenticatedUserId &&
      job.userId &&
      job.userId !== authenticatedUserId &&
      job.userId !== "demo-sandbox-user"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "You do not have permission to view this generation job.",
          code: "FORBIDDEN",
        },
        { status: 403 }
      );
    }

    // Refresh status from external provider if job is in flight
    let currentJob = job;
    if (
      job.status === "queued" ||
      job.status === "processing" ||
      job.status === "generating"
    ) {
      const provider = getVideoProvider(job.provider);
      if (provider) {
        currentJob = await provider.getJobStatus(job.jobId);
      }
    }

    return NextResponse.json({
      success: true,
      job: currentJob,
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to retrieve job status.",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}
