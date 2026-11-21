import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { evaluateEligibility } from "@/lib/careerEligibility";

export const maxDuration = 20;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      opportunity_id,
      student_profile_id,
      cv_version_id,
      resume_url,
      cover_letter,
      custom_answers = {},
    } = body;

    if (!opportunity_id || !student_profile_id) {
      return NextResponse.json(
        { error: "Opportunity ID and Student Profile ID are required." },
        { status: 400 }
      );
    }

    if (!resume_url) {
      return NextResponse.json(
        { error: "A valid resume/CV link must be selected or provided." },
        { status: 400 }
      );
    }

    // 1. Fetch Opportunity
    const { data: opp, error: oppErr } = await supabase
      .from("career_opportunities")
      .select("*")
      .eq("id", opportunity_id)
      .single();

    if (oppErr || !opp) {
      return NextResponse.json(
        { error: "Opportunity drive not found." },
        { status: 404 }
      );
    }

    // 2. Fetch Student Institutional Record
    const { data: student, error: studErr } = await supabase
      .from("students")
      .select("id, student_id, name, department_id, batch_id")
      .eq("profile_id", student_profile_id)
      .maybeSingle();

    // 3. Fetch Student Career Profile
    const { data: careerProfile } = await supabase
      .from("student_career_profiles")
      .select("*")
      .eq("profile_id", student_profile_id)
      .maybeSingle();

    // 4. Fetch Official SGPA Records
    let officialSgpaRecords: any[] = [];
    if (student?.id) {
      const { data: sgpaData } = await supabase
        .from("student_sgpa_records")
        .select("semester_no, sgpa, cgpa, backlogs")
        .eq("student_id", student.id)
        .order("semester_no", { ascending: true });
      if (sgpaData) officialSgpaRecords = sgpaData;
    }

    // 5. Fetch Attendance Percentage
    let attendancePercentage = 85; // default fallback if no records
    if (student?.id) {
      const { data: attData } = await supabase
        .from("attendance_records")
        .select("status")
        .eq("student_id", student.id);
      if (attData && attData.length > 0) {
        const present = attData.filter((r) => r.status === "P").length;
        attendancePercentage = Math.round((present / attData.length) * 100);
      }
    }

    // 6. Check for Duplicate Application
    const { data: existingApp } = await supabase
      .from("career_applications")
      .select("id, status")
      .eq("opportunity_id", opportunity_id)
      .eq("student_profile_id", student_profile_id)
      .maybeSingle();

    if (existingApp && existingApp.status !== "withdrawn") {
      return NextResponse.json(
        {
          error: "Duplicate application: You have already applied for this opportunity.",
          status: existingApp.status,
          application_id: existingApp.id,
        },
        { status: 409 }
      );
    }

    // 7. Deterministic Server-Side Eligibility Evaluation
    const evaluation = evaluateEligibility({
      opportunity: opp,
      student,
      careerProfile,
      officialSgpaRecords,
      attendancePercentage,
    });

    if (evaluation.status === "not_eligible") {
      return NextResponse.json(
        {
          error: "Eligibility evaluation failed. You do not meet the minimum requirements for this drive.",
          status: "not_eligible",
          reasons: evaluation.reasons,
          checks: evaluation.checks,
        },
        { status: 422 }
      );
    }

    // 8. Validate Custom Application Questions (Mandatory Questions)
    if (opp.custom_questions && Array.isArray(opp.custom_questions)) {
      for (const q of opp.custom_questions) {
        if (q.required) {
          const ans = custom_answers[q.id];
          if (!ans || String(ans).trim() === "") {
            return NextResponse.json(
              { error: `Missing required screening question response: "${q.question}"` },
              { status: 400 }
            );
          }
        }
      }
    }

    // 9. Fetch Rich Profile Elements for Immutable Snapshot
    const [
      { data: projects },
      { data: experiences },
      { data: certs },
      { data: cvVer },
      { data: dept },
      { data: batch },
    ] = await Promise.all([
      supabase.from("career_projects").select("*").eq("profile_id", student_profile_id),
      supabase.from("career_experiences").select("*").eq("profile_id", student_profile_id),
      supabase.from("career_certifications").select("*").eq("profile_id", student_profile_id),
      cv_version_id
        ? supabase.from("career_cv_versions").select("*").eq("id", cv_version_id).maybeSingle()
        : Promise.resolve({ data: null }),
      student?.department_id
        ? supabase.from("departments").select("name, code").eq("id", student.department_id).maybeSingle()
        : Promise.resolve({ data: null }),
      student?.batch_id
        ? supabase.from("batches").select("name").eq("id", student.batch_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    // Build the official snapshot
    const profileSnapshot = {
      student_info: {
        profile_id: student_profile_id,
        student_id: student?.student_id || null,
        name: student?.name || null,
        department_name: dept?.name || null,
        department_code: dept?.code || null,
        batch_name: batch?.name || null,
      },
      academic_metrics: {
        effective_cgpa: evaluation.effectiveCgpa,
        marks_10th: careerProfile?.marks_10th || null,
        marks_10th_verified: !!careerProfile?.marks_10th_verified,
        marks_12th: careerProfile?.marks_12th || null,
        marks_12th_verified: !!careerProfile?.marks_12th_verified,
        active_backlogs: careerProfile?.active_backlogs ?? 0,
        total_backlogs: careerProfile?.total_backlogs ?? 0,
        backlogs_verified: !!careerProfile?.backlogs_verified,
        attendance_percentage: attendancePercentage,
        official_sgpa_records: officialSgpaRecords,
      },
      skills: {
        technical: careerProfile?.technical_skills || careerProfile?.skills || [],
        soft: careerProfile?.soft_skills || [],
      },
      portfolio: {
        projects: projects || [],
        experiences: experiences || [],
        certifications: certs || [],
      },
      submitted_cv: {
        cv_version_id: cv_version_id || null,
        label: cvVer?.label || "Direct Link Resume",
        resume_url: resume_url,
        file_name: cvVer?.file_name || null,
      },
      eligibility_evaluation: {
        status: evaluation.status,
        score: evaluation.score,
        reasons: evaluation.reasons,
        review_reasons: evaluation.reviewReasons,
        matched_mandatory_skills: evaluation.matchedMandatorySkills,
        missing_mandatory_skills: evaluation.missingMandatorySkills,
        matched_preferred_skills: evaluation.matchedPreferredSkills,
        missing_preferred_skills: evaluation.missingPreferredSkills,
      },
      custom_answers,
      snapshot_timestamp: new Date().toISOString(),
    };

    // 10. Upsert or Insert Application
    const payload = {
      opportunity_id,
      student_profile_id,
      student_id: student?.id || null,
      resume_url,
      cv_version_id: cv_version_id || null,
      cover_letter: cover_letter ? cover_letter.trim() : null,
      custom_answers,
      eligibility_status: evaluation.status,
      eligibility_reasons:
        evaluation.status === "needs_review"
          ? evaluation.reviewReasons
          : evaluation.reasons,
      profile_snapshot: profileSnapshot,
      status: "applied",
      current_round: "Application Submitted",
      applied_at: new Date().toISOString(),
      withdrawn_at: null,
      withdrawal_reason: null,
    };

    let appResult: any = null;
    if (existingApp && existingApp.status === "withdrawn") {
      const { data, error } = await supabase
        .from("career_applications")
        .update(payload)
        .eq("id", existingApp.id)
        .select("*, career_opportunities(*)")
        .single();
      if (error) throw error;
      appResult = data;
    } else {
      const { data, error } = await supabase
        .from("career_applications")
        .insert(payload)
        .select("*, career_opportunities(*)")
        .single();
      if (error) throw error;
      appResult = data;
    }

    // 11. Record Initial Timeline / Audit Log in History
    await supabase.from("career_application_history").insert({
      application_id: appResult.id,
      changed_by: student_profile_id,
      changed_by_name: student?.name || "Student",
      from_status: null,
      to_status: "applied",
      round_name: "Application Submitted",
      score: evaluation.score,
      notes:
        evaluation.status === "needs_review"
          ? `Application submitted. Flagged for review: ${evaluation.reviewReasons.join("; ")}`
          : "Application submitted and meets all eligibility criteria.",
    });

    return NextResponse.json({
      success: true,
      message: "Application submitted successfully.",
      application: appResult,
      evaluation,
    });
  } catch (err: any) {
    console.error("Career Application Error:", err);
    return NextResponse.json(
      { error: err.message || "An unexpected error occurred during submission." },
      { status: 500 }
    );
  }
}

