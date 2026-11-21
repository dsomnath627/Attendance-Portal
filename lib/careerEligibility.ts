/**
 * Deterministic Career & Placement Eligibility Engine
 * Dr. Campus SaaS
 *
 * Strictly rule-based, deterministic evaluation. NO LLM or AI model is used.
 * Runs both client-side (for real-time UI indicators & tooltips) and
 * server-side in API routes before accepting applications.
 */

export type EligibilityStatus = "eligible" | "not_eligible" | "needs_review";

export interface EvaluationOpportunity {
  id: string;
  title?: string;
  company_name?: string;
  status: string;
  deadline: string;
  target_departments?: string[];
  target_batches?: string[];
  min_cgpa?: number | null;
  min_attendance?: number | null;
  min_marks_10th?: number | null;
  min_marks_12th?: number | null;
  allow_backlogs?: boolean | null;
  max_backlogs?: number | null;
  mandatory_skills?: string[];
  preferred_skills?: string[];
}

export interface EvaluationStudent {
  id?: string;
  student_id?: string;
  department_id?: string;
  batch_id?: string;
}

export interface EvaluationProfile {
  marks_10th?: number | null;
  marks_10th_verified?: boolean | null;
  marks_12th?: number | null;
  marks_12th_verified?: boolean | null;
  active_backlogs?: number | null;
  total_backlogs?: number | null;
  backlogs_verified?: boolean | null;
  cgpa?: number | null;
  skills?: string[];
  technical_skills?: string[];
  soft_skills?: string[];
}

export interface EvaluationSgpaRecord {
  semester_no: number;
  sgpa: number;
  cgpa?: number | null;
  backlogs?: number | null;
}

export interface EligibilityInput {
  opportunity: EvaluationOpportunity;
  student?: EvaluationStudent | null;
  careerProfile?: EvaluationProfile | null;
  officialSgpaRecords?: EvaluationSgpaRecord[];
  attendancePercentage?: number | null;
}

export interface CheckItemResult {
  name: string;
  passed: boolean;
  needsReview?: boolean;
  message: string;
  value?: string | number;
  required?: string | number;
}

export interface EligibilityResult {
  status: EligibilityStatus;
  isEligible: boolean;
  canApply: boolean;
  reasons: string[];
  reviewReasons: string[];
  matchedMandatorySkills: string[];
  missingMandatorySkills: string[];
  matchedPreferredSkills: string[];
  missingPreferredSkills: string[];
  effectiveCgpa: number;
  score: number;
  checks: CheckItemResult[];
}

/**
 * Deterministically evaluates a student's eligibility against an opportunity.
 */
export function evaluateEligibility({
  opportunity,
  student,
  careerProfile,
  officialSgpaRecords = [],
  attendancePercentage,
}: EligibilityInput): EligibilityResult {
  const reasons: string[] = [];
  const reviewReasons: string[] = [];
  const checks: CheckItemResult[] = [];

  // 1. Status & Deadline Check
  const isStatusOpen =
    opportunity.status === "open" ||
    opportunity.status === "published" ||
    opportunity.status === "active";
  if (!isStatusOpen) {
    const msg = `Posting is currently closed or in draft (${opportunity.status})`;
    reasons.push(msg);
    checks.push({ name: "Drive Status", passed: false, message: msg });
  } else {
    checks.push({ name: "Drive Status", passed: true, message: "Drive is active" });
  }

  const isExpired = new Date(opportunity.deadline).getTime() < Date.now();
  if (isExpired) {
    const msg = `Application deadline passed on ${new Date(opportunity.deadline).toLocaleDateString()}`;
    reasons.push(msg);
    checks.push({ name: "Deadline", passed: false, message: msg });
  } else {
    checks.push({
      name: "Deadline",
      passed: true,
      message: `Open until ${new Date(opportunity.deadline).toLocaleDateString()}`,
    });
  }

  // 2. Department Check
  if (
    opportunity.target_departments &&
    opportunity.target_departments.length > 0
  ) {
    const studentDeptId = student?.department_id;
    if (!studentDeptId) {
      const msg = "Student academic department is not assigned or unknown";
      reasons.push(msg);
      checks.push({ name: "Department", passed: false, message: msg });
    } else if (!opportunity.target_departments.includes(studentDeptId)) {
      const msg = "Drive is restricted to specific eligible academic departments";
      reasons.push(msg);
      checks.push({ name: "Department", passed: false, message: msg });
    } else {
      checks.push({ name: "Department", passed: true, message: "Department matches drive criteria" });
    }
  } else {
    checks.push({ name: "Department", passed: true, message: "Open to all departments" });
  }

  // 3. Batch Check
  if (opportunity.target_batches && opportunity.target_batches.length > 0) {
    const studentBatchId = student?.batch_id;
    if (!studentBatchId) {
      const msg = "Student graduating batch is not assigned or unknown";
      reasons.push(msg);
      checks.push({ name: "Graduating Batch", passed: false, message: msg });
    } else if (!opportunity.target_batches.includes(studentBatchId)) {
      const msg = "Drive is targeted to specific graduating batches";
      reasons.push(msg);
      checks.push({ name: "Graduating Batch", passed: false, message: msg });
    } else {
      checks.push({ name: "Graduating Batch", passed: true, message: "Batch matches drive criteria" });
    }
  } else {
    checks.push({ name: "Graduating Batch", passed: true, message: "Open to all batches" });
  }

  // 4. CGPA Evaluation
  // Determine effective CGPA (prefer verified official SGPA record latest running CGPA, then profile CGPA)
  let effectiveCgpa = 0;
  if (officialSgpaRecords && officialSgpaRecords.length > 0) {
    const sorted = [...officialSgpaRecords].sort((a, b) => b.semester_no - a.semester_no);
    if (sorted[0].cgpa != null && sorted[0].cgpa > 0) {
      effectiveCgpa = sorted[0].cgpa;
    } else {
      const sum = sorted.reduce((acc, r) => acc + (r.sgpa || 0), 0);
      effectiveCgpa = parseFloat((sum / sorted.length).toFixed(2));
    }
  } else if (careerProfile?.cgpa != null) {
    effectiveCgpa = careerProfile.cgpa;
  }

  const minCgpa = opportunity.min_cgpa || 0;
  if (minCgpa > 0) {
    if (effectiveCgpa < minCgpa) {
      const msg = `CGPA required: ${minCgpa} (Current: ${effectiveCgpa.toFixed(2)})`;
      reasons.push(msg);
      checks.push({
        name: "CGPA",
        passed: false,
        message: msg,
        value: effectiveCgpa,
        required: minCgpa,
      });
    } else {
      checks.push({
        name: "CGPA",
        passed: true,
        message: `CGPA ${effectiveCgpa.toFixed(2)} meets requirement (Min: ${minCgpa})`,
        value: effectiveCgpa,
        required: minCgpa,
      });
    }
  } else {
    checks.push({
      name: "CGPA",
      passed: true,
      message: `CGPA: ${effectiveCgpa.toFixed(2)} (No minimum CGPA required)`,
      value: effectiveCgpa,
    });
  }

  // 5. Attendance Check
  const minAttendance = opportunity.min_attendance || 0;
  if (minAttendance > 0 && attendancePercentage != null) {
    if (attendancePercentage < minAttendance) {
      const msg = `Minimum attendance required: ${minAttendance}% (Yours: ${attendancePercentage}%)`;
      reasons.push(msg);
      checks.push({
        name: "Attendance",
        passed: false,
        message: msg,
        value: `${attendancePercentage}%`,
        required: `${minAttendance}%`,
      });
    } else {
      checks.push({
        name: "Attendance",
        passed: true,
        message: `Attendance ${attendancePercentage}% meets requirement (Min: ${minAttendance}%)`,
        value: `${attendancePercentage}%`,
        required: `${minAttendance}%`,
      });
    }
  }

  // 6. 10th Marks Check
  const min10th = opportunity.min_marks_10th || 0;
  const marks10th = careerProfile?.marks_10th;
  if (min10th > 0) {
    if (marks10th == null || marks10th <= 0) {
      const msg = `10th board marks required (Min: ${min10th}%). Please enter your marks in Career Profile`;
      reasons.push(msg);
      checks.push({ name: "10th Marks", passed: false, message: msg, required: `${min10th}%` });
    } else if (marks10th < min10th) {
      const msg = `10th marks required: ${min10th}% (Yours: ${marks10th}%)`;
      reasons.push(msg);
      checks.push({
        name: "10th Marks",
        passed: false,
        message: msg,
        value: `${marks10th}%`,
        required: `${min10th}%`,
      });
    } else {
      const isVerified = !!careerProfile?.marks_10th_verified;
      if (!isVerified) {
        const revMsg = `10th marks (${marks10th}%) meet requirement but require coordinator verification`;
        reviewReasons.push(revMsg);
        checks.push({
          name: "10th Marks",
          passed: true,
          needsReview: true,
          message: revMsg,
          value: `${marks10th}% (Pending Verification)`,
          required: `${min10th}%`,
        });
      } else {
        checks.push({
          name: "10th Marks",
          passed: true,
          message: `10th marks (${marks10th}%) verified and meets requirement`,
          value: `${marks10th}%`,
          required: `${min10th}%`,
        });
      }
    }
  }

  // 7. 12th Marks Check
  const min12th = opportunity.min_marks_12th || 0;
  const marks12th = careerProfile?.marks_12th;
  if (min12th > 0) {
    if (marks12th == null || marks12th <= 0) {
      const msg = `12th board marks required (Min: ${min12th}%). Please enter your marks in Career Profile`;
      reasons.push(msg);
      checks.push({ name: "12th Marks", passed: false, message: msg, required: `${min12th}%` });
    } else if (marks12th < min12th) {
      const msg = `12th marks required: ${min12th}% (Yours: ${marks12th}%)`;
      reasons.push(msg);
      checks.push({
        name: "12th Marks",
        passed: false,
        message: msg,
        value: `${marks12th}%`,
        required: `${min12th}%`,
      });
    } else {
      const isVerified = !!careerProfile?.marks_12th_verified;
      if (!isVerified) {
        const revMsg = `12th marks (${marks12th}%) meet requirement but require coordinator verification`;
        reviewReasons.push(revMsg);
        checks.push({
          name: "12th Marks",
          passed: true,
          needsReview: true,
          message: revMsg,
          value: `${marks12th}% (Pending Verification)`,
          required: `${min12th}%`,
        });
      } else {
        checks.push({
          name: "12th Marks",
          passed: true,
          message: `12th marks (${marks12th}%) verified and meets requirement`,
          value: `${marks12th}%`,
          required: `${min12th}%`,
        });
      }
    }
  }

  // 8. Backlog Conditions Check
  const activeBacklogs = careerProfile?.active_backlogs ?? 0;
  const totalBacklogs = careerProfile?.total_backlogs ?? 0;
  const backlogsVerified = !!careerProfile?.backlogs_verified;

  if (opportunity.allow_backlogs === false && activeBacklogs > 0) {
    const msg = `No active backlogs permitted (You have ${activeBacklogs} active backlog${activeBacklogs > 1 ? "s" : ""})`;
    reasons.push(msg);
    checks.push({ name: "Active Backlogs", passed: false, message: msg, value: activeBacklogs, required: 0 });
  } else if (
    opportunity.max_backlogs != null &&
    activeBacklogs > opportunity.max_backlogs
  ) {
    const msg = `Maximum ${opportunity.max_backlogs} active backlogs permitted (You have ${activeBacklogs})`;
    reasons.push(msg);
    checks.push({
      name: "Active Backlogs",
      passed: false,
      message: msg,
      value: activeBacklogs,
      required: opportunity.max_backlogs,
    });
  } else {
    if (activeBacklogs > 0 && !backlogsVerified) {
      const revMsg = `Active backlogs (${activeBacklogs}) pending coordinator review & verification`;
      reviewReasons.push(revMsg);
      checks.push({
        name: "Active Backlogs",
        passed: true,
        needsReview: true,
        message: revMsg,
        value: `${activeBacklogs} (Pending Verification)`,
      });
    } else if (totalBacklogs > 0 && activeBacklogs === 0) {
      const revMsg = `Student has ${totalBacklogs} past cleared backlog${totalBacklogs > 1 ? "s" : ""}`;
      reviewReasons.push(revMsg);
      checks.push({
        name: "Backlogs History",
        passed: true,
        needsReview: true,
        message: revMsg,
      });
    } else {
      checks.push({
        name: "Active Backlogs",
        passed: true,
        message: `${activeBacklogs} active backlogs (Compliant)`,
        value: activeBacklogs,
      });
    }
  }

  // 9. Mandatory Skills Check
  const studentSkillsList = [
    ...(careerProfile?.technical_skills || []),
    ...(careerProfile?.soft_skills || []),
    ...(careerProfile?.skills || []),
  ].map((s) => s.toLowerCase().trim());

  const matchedMandatory: string[] = [];
  const missingMandatory: string[] = [];

  (opportunity.mandatory_skills || []).forEach((reqSkill) => {
    const clean = reqSkill.toLowerCase().trim();
    if (studentSkillsList.some((s) => s === clean || s.includes(clean) || clean.includes(s))) {
      matchedMandatory.push(reqSkill);
    } else {
      missingMandatory.push(reqSkill);
    }
  });

  if (missingMandatory.length > 0) {
    const msg = `Missing mandatory requirement(s): ${missingMandatory.join(", ")}`;
    reasons.push(msg);
    checks.push({
      name: "Mandatory Requirements",
      passed: false,
      message: msg,
      value: `${matchedMandatory.length}/${(opportunity.mandatory_skills || []).length} skills matched`,
    });
  } else if ((opportunity.mandatory_skills || []).length > 0) {
    checks.push({
      name: "Mandatory Requirements",
      passed: true,
      message: `All ${(opportunity.mandatory_skills || []).length} mandatory skill requirements satisfied`,
    });
  }

  // 10. Preferred Skills Check (Distinguished from mandatory)
  const matchedPreferred: string[] = [];
  const missingPreferred: string[] = [];

  (opportunity.preferred_skills || []).forEach((prefSkill) => {
    const clean = prefSkill.toLowerCase().trim();
    if (studentSkillsList.some((s) => s === clean || s.includes(clean) || clean.includes(s))) {
      matchedPreferred.push(prefSkill);
    } else {
      missingPreferred.push(prefSkill);
    }
  });

  if (missingPreferred.length > 0 && (opportunity.preferred_skills || []).length > 0) {
    const revMsg = `Missing ${missingPreferred.length} preferred skill(s): ${missingPreferred.join(", ")}`;
    reviewReasons.push(revMsg);
    checks.push({
      name: "Preferred Skills",
      passed: true,
      needsReview: true,
      message: revMsg,
      value: `${matchedPreferred.length}/${(opportunity.preferred_skills || []).length} matched`,
    });
  } else if ((opportunity.preferred_skills || []).length > 0) {
    checks.push({
      name: "Preferred Skills",
      passed: true,
      message: `All ${(opportunity.preferred_skills || []).length} preferred skills matched`,
    });
  }

  // 11. Final Status & Match Score Calculation
  let status: EligibilityStatus = "eligible";
  if (reasons.length > 0) {
    status = "not_eligible";
  } else if (reviewReasons.length > 0) {
    status = "needs_review";
  }

  // Compatibility score calculation (0 - 100)
  let score = 100;
  if (reasons.length > 0) {
    score = Math.max(0, 50 - reasons.length * 15);
  } else {
    const totalPref = (opportunity.preferred_skills || []).length;
    if (totalPref > 0) {
      const prefPenalty = (missingPreferred.length / totalPref) * 15;
      score = Math.round(100 - prefPenalty);
    }
    if (reviewReasons.some((r) => r.includes("verification"))) {
      score = Math.max(70, score - 10);
    }
  }

  return {
    status,
    isEligible: status === "eligible",
    canApply: status === "eligible" || status === "needs_review",
    reasons,
    reviewReasons,
    matchedMandatorySkills: matchedMandatory,
    missingMandatorySkills: missingMandatory,
    matchedPreferredSkills: matchedPreferred,
    missingPreferredSkills: missingPreferred,
    effectiveCgpa,
    score,
    checks,
  };
}

