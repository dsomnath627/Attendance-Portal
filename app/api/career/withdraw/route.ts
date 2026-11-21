import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const maxDuration = 15;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { application_id, student_profile_id, reason } = body;

    if (!application_id || !student_profile_id) {
      return NextResponse.json(
        { error: "Application ID and Student Profile ID are required." },
        { status: 400 }
      );
    }

    // 1. Fetch Application
    const { data: app, error: appErr } = await supabase
      .from("career_applications")
      .select("*, career_opportunities(title, company_name)")
      .eq("id", application_id)
      .eq("student_profile_id", student_profile_id)
      .single();

    if (appErr || !app) {
      return NextResponse.json(
        { error: "Application not found or unauthorized to withdraw." },
        { status: 404 }
      );
    }

    if (app.status === "withdrawn") {
      return NextResponse.json(
        { error: "This application has already been withdrawn." },
        { status: 400 }
      );
    }

    if (app.status === "offered") {
      return NextResponse.json(
        { error: "Applications with an offer cannot be self-withdrawn. Please contact your coordinator." },
        { status: 400 }
      );
    }

    const previousStatus = app.status;
    const withdrawalReasonText = reason?.trim() || "Withdrawn by candidate";

    // 2. Update Application Record
    const { data: updatedApp, error: updateErr } = await supabase
      .from("career_applications")
      .update({
        status: "withdrawn",
        withdrawn_at: new Date().toISOString(),
        withdrawal_reason: withdrawalReasonText,
      })
      .eq("id", application_id)
      .select()
      .single();

    if (updateErr) throw updateErr;

    // 3. Insert Audit Log History
    await supabase.from("career_application_history").insert({
      application_id: application_id,
      changed_by: student_profile_id,
      changed_by_name: "Student (Candidate)",
      from_status: previousStatus,
      to_status: "withdrawn",
      round_name: "Application Withdrawn",
      notes: `Candidate withdrew application: ${withdrawalReasonText}`,
    });

    return NextResponse.json({
      success: true,
      message: "Application withdrawn successfully.",
      application: updatedApp,
    });
  } catch (err: any) {
    console.error("Withdraw Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to withdraw application." },
      { status: 500 }
    );
  }
}

