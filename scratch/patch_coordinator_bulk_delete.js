const fs = require('fs');
const path = 'components/CoordinatorDashboard.tsx';

let code = fs.readFileSync(path, 'utf8');

// 1. Add selectedIds state after formLoading
const stateMarker = 'const [formLoading, setFormLoading] = useState(false);';
const newState = `const [formLoading, setFormLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  function getTableForSubTab(tab: SubTab): string | null {
    switch (tab) {
      case "departments": return "departments";
      case "programs": return "programs";
      case "academic_years": return "academic_years";
      case "semesters": return "semesters";
      case "batches": return "batches";
      case "groups": return "student_groups";
      case "classes": return "classes";
      case "subjects": return "subjects";
      case "assignments": return "subject_offerings";
      case "students": return "class_enrollments";
      case "routines": return "routines";
      case "roster": return "students";
      default: return null;
    }
  }

  function selectDuplicateGroups() {
    const seen = new Set<string>();
    const dupIds: string[] = [];

    // Sort by created_at or id so we keep the first/oldest one
    const sorted = [...groups].sort((a, b) => {
      if (a.created_at && b.created_at) return a.created_at.localeCompare(b.created_at);
      return a.id.localeCompare(b.id);
    });

    sorted.forEach((g) => {
      const key = \`\${g.batch_id || ""}_\${g.name.trim().toLowerCase()}\`;
      if (seen.has(key)) {
        dupIds.push(g.id);
      } else {
        seen.add(key);
      }
    });

    if (dupIds.length === 0) {
      notify?.("No duplicate groups found across your batches!");
    } else {
      setSelectedIds(dupIds);
      notify?.(\`Identified \${dupIds.length} duplicate group(s)! Checked them for deletion. Review and click 'Delete Selected'.\`);
    }
  }

  async function handleBulkDelete() {
    const table = getTableForSubTab(subTab);
    if (!table || selectedIds.length === 0) return;

    const count = selectedIds.length;
    const confirmed = window.confirm(
      \`Are you sure you want to permanently delete all \${count} selected item(s) from \${subTab.replace("_", " ")}? This action cannot be undone.\`
    );
    if (!confirmed) return;

    setFormLoading(true);
    try {
      const chunkSize = 100;
      let deletedCount = 0;
      for (let i = 0; i < selectedIds.length; i += chunkSize) {
        const chunk = selectedIds.slice(i, i + chunkSize);
        const { error } = await supabase.from(table).delete().in("id", chunk);
        if (error) throw error;
        deletedCount += chunk.length;
      }

      notify?.(\`Successfully deleted \${deletedCount} item(s).\`);
      setSelectedIds([]);
      await loadAllData();
      if (onReload) onReload();
    } catch (err: any) {
      console.error("Bulk delete error:", err);
      showError?.(err.message || "Failed to delete selected items. Some may be referenced by other records.");
    } finally {
      setFormLoading(false);
    }
  }`;

if (code.includes(stateMarker)) {
  code = code.replace(stateMarker, newState);
  console.log("Added selectedIds and bulk delete helpers");
} else {
  console.error("Could not find stateMarker");
  process.exit(1);
}

// 2. Clear selectedIds in handleTabChange
code = code.replace(
  'const handleTabChange = (tab: SubTab) => {\r\n    setSubTab(tab);\r\n    setSearchQuery("");\r\n    resetForms();\r\n  };',
  'const handleTabChange = (tab: SubTab) => {\r\n    setSubTab(tab);\r\n    setSearchQuery("");\r\n    setSelectedIds([]);\r\n    resetForms();\r\n  };'
);
code = code.replace(
  'const handleTabChange = (tab: SubTab) => {\n    setSubTab(tab);\n    setSearchQuery("");\n    resetForms();\n  };',
  'const handleTabChange = (tab: SubTab) => {\n    setSubTab(tab);\n    setSearchQuery("");\n    setSelectedIds([]);\n    resetForms();\n  };'
);

// 3. Prevent duplicate group creation in saveGroup
const saveGroupRegex = /async function saveGroup\(\) \{[\s\S]*?if \(groups\.find\(g => g\.name\.toLowerCase\(\) === groupName\.trim\(\)\.toLowerCase\(\) && g\.batch_id === groupBatchId && g\.id !== editingId\)\) \{[\s\S]*?showError\?\("Group already exists in this batch\."\); return;\s*\}/;
const newSaveGroupCheck = `async function saveGroup() {
    if (!groupName.trim() || !groupBatchId) { showError?.("Name and Batch are required."); return; }
    if (groups.find(g => g.name.trim().toLowerCase() === groupName.trim().toLowerCase() && g.batch_id === groupBatchId && g.id !== editingId)) {
      showError?.("A group with this name already exists in this batch."); return;
    }`;
if (saveGroupRegex.test(code)) {
  code = code.replace(saveGroupRegex, newSaveGroupCheck);
  console.log("Updated saveGroup duplicate validation");
}

// 4. Replace renderFilter definition and update CSS
const renderFilterRegex = /const renderFilter = \(\) => \([\s\S]*?<\/div>\s*\);/;
const newRenderFilter = `const renderFilter = (currentList?: { id: string }[]) => {
    const table = getTableForSubTab(subTab);
    const hasItems = currentList && currentList.length > 0;
    const allSelected = hasItems && currentList.every(item => selectedIds.includes(item.id));
    const someSelected = selectedIds.length > 0;

    return (
      <div className="filter-and-bulk-bar">
        <div className="filter-bar">
          <Search size={18} color="#6b7280" />
          <input
            type="text"
            placeholder={\`Filter \${subTab.replace("_", " ")}...\`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {table && (
          <div className="bulk-actions-toolbar">
            <div className="bulk-selection-controls">
              {hasItems && (
                <label className="select-all-label">
                  <input
                    type="checkbox"
                    className="tik-checkbox"
                    checked={allSelected}
                    onChange={() => {
                      if (allSelected) {
                        setSelectedIds([]);
                      } else {
                        setSelectedIds(currentList.map(item => item.id));
                      }
                    }}
                  />
                  <span>Select All ({currentList.length})</span>
                </label>
              )}

              {subTab === "groups" && (
                <button
                  type="button"
                  className="quick-action-btn"
                  onClick={selectDuplicateGroups}
                  title="Automatically finds groups in the same batch with identical names and selects the duplicates"
                >
                  ⚡ Select Duplicate Groups
                </button>
              )}
            </div>

            {someSelected && (
              <div className="bulk-execute-box">
                <span className="selected-badge">
                  ✓ {selectedIds.length} selected
                </span>
                <button
                  type="button"
                  className="bulk-deselect-btn"
                  onClick={() => setSelectedIds([])}
                >
                  Clear
                </button>
                <button
                  type="button"
                  className="bulk-delete-btn"
                  disabled={formLoading}
                  onClick={handleBulkDelete}
                >
                  <Trash2 size={15} />
                  Delete Selected ({selectedIds.length})
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };`;

if (renderFilterRegex.test(code)) {
  code = code.replace(renderFilterRegex, newRenderFilter);
  console.log("Updated renderFilter");
} else {
  console.error("Could not find renderFilter");
  process.exit(1);
}

// 5. Update CSS styles for bulk actions and checkboxes
const cssMarker = '.item-card { background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px; position: relative; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }';
const newCss = `.item-card { background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px; position: relative; box-shadow: 0 1px 3px rgba(0,0,0,0.05); transition: all 0.15s ease; }
        .item-card.selected { border-color: #3b82f6; background-color: #f0f7ff; box-shadow: 0 0 0 1px #3b82f6; }
        .card-checkbox { position: absolute; top: 14px; left: 12px; z-index: 2; display: flex; align-items: center; justify-content: center; cursor: pointer; }
        .tik-checkbox { width: 17px; height: 17px; cursor: pointer; accent-color: #2563eb; border-radius: 4px; }
        .filter-and-bulk-bar { display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px; }
        .bulk-actions-toolbar { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; }
        .bulk-selection-controls { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
        .select-all-label { display: inline-flex; align-items: center; gap: 8px; font-size: 0.85rem; font-weight: 600; color: #374151; cursor: pointer; user-select: none; }
        .quick-action-btn { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; padding: 5px 12px; border-radius: 6px; font-size: 0.8rem; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; transition: all 0.15s; }
        .quick-action-btn:hover { background: #fde68a; color: #78350f; }
        .bulk-execute-box { display: flex; align-items: center; gap: 10px; }
        .selected-badge { background: #dbeafe; color: #1e40af; font-size: 0.8rem; font-weight: 700; padding: 4px 10px; border-radius: 12px; }
        .bulk-deselect-btn { background: transparent; border: 1px solid #d1d5db; color: #4b5563; padding: 5px 10px; border-radius: 6px; font-size: 0.8rem; font-weight: 600; cursor: pointer; }
        .bulk-deselect-btn:hover { background: #f3f4f6; color: #111827; }
        .bulk-delete-btn { display: inline-flex; align-items: center; gap: 6px; background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; padding: 6px 14px; border-radius: 6px; font-size: 0.85rem; font-weight: 700; cursor: pointer; transition: all 0.15s; }
        .bulk-delete-btn:hover { background: #dc2626; color: #ffffff; border-color: #dc2626; }
        .bulk-delete-btn:disabled { opacity: 0.5; cursor: not-allowed; }`;

code = code.replace(cssMarker, newCss);

// Update item-title and item-sub padding so text doesn't overlap left checkbox
code = code.replace(
  '.item-title { font-weight: 700; color: #111827; font-size: 0.95rem; margin-bottom: 4px; padding-right: 60px; }',
  '.item-title { font-weight: 700; color: #111827; font-size: 0.95rem; margin-bottom: 4px; padding-left: 26px; padding-right: 65px; }'
);
code = code.replace(
  '.item-sub { font-size: 0.8rem; color: #6b7280; margin-top: 2px; }',
  '.item-sub { font-size: 0.8rem; color: #6b7280; margin-top: 2px; padding-left: 26px; }'
);

// 6. Update all subTabs: pass filtered to renderFilter and add checkbox to cards

// 6.1 GROUPS TAB
code = code.replace(
  '{renderFilter()}',
  '{renderFilter(filtered)}' // for all occurrences later or specifically
);

// Let's replace {renderFilter()} across all subTabs
code = code.replaceAll('{renderFilter()}', '{renderFilter(filtered)}');

// Update GROUPS cards
const groupCardPattern = /<div className=\{`item-card \$\{g\.is_active === false \? "inactive" : ""\}`\} key=\{g\.id\}>/;
const newGroupCard = `<div className={\`item-card \${g.is_active === false ? "inactive" : ""} \${selectedIds.includes(g.id) ? "selected" : ""}\`} key={g.id}>
                        <label className="card-checkbox" onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            className="tik-checkbox"
                            checked={selectedIds.includes(g.id)}
                            onChange={() => toggleSelect(g.id)}
                          />
                        </label>`;
if (groupCardPattern.test(code)) {
  code = code.replace(groupCardPattern, newGroupCard);
  console.log("Updated groups card with checkbox");
}

// Update BATCHES cards
const batchCardPattern = /<div className=\{`item-card \$\{b\.is_active === false \? "inactive" : ""\}`\} key=\{b\.id\}>/;
const newBatchCard = `<div className={\`item-card \${b.is_active === false ? "inactive" : ""} \${selectedIds.includes(b.id) ? "selected" : ""}\`} key={b.id}>
                        <label className="card-checkbox" onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            className="tik-checkbox"
                            checked={selectedIds.includes(b.id)}
                            onChange={() => toggleSelect(b.id)}
                          />
                        </label>`;
if (batchCardPattern.test(code)) {
  code = code.replace(batchCardPattern, newBatchCard);
  console.log("Updated batches card with checkbox");
}

// Update CLASSES cards
const classCardPattern = /<div className=\{`item-card \$\{c\.is_active === false \? "inactive" : ""\}`\} key=\{c\.id\}>/;
const newClassCard = `<div className={\`item-card \${c.is_active === false ? "inactive" : ""} \${selectedIds.includes(c.id) ? "selected" : ""}\`} key={c.id}>
                        <label className="card-checkbox" onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            className="tik-checkbox"
                            checked={selectedIds.includes(c.id)}
                            onChange={() => toggleSelect(c.id)}
                          />
                        </label>`;
if (classCardPattern.test(code)) {
  code = code.replace(classCardPattern, newClassCard);
  console.log("Updated classes card with checkbox");
}

// Update SUBJECTS cards
const subjectCardPattern = /<div className=\{`item-card \$\{s\.is_active === false \? "inactive" : ""\}`\} key=\{s\.id\}>/;
const newSubjectCard = `<div className={\`item-card \${s.is_active === false ? "inactive" : ""} \${selectedIds.includes(s.id) ? "selected" : ""}\`} key={s.id}>
                        <label className="card-checkbox" onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            className="tik-checkbox"
                            checked={selectedIds.includes(s.id)}
                            onChange={() => toggleSelect(s.id)}
                          />
                        </label>`;
if (subjectCardPattern.test(code)) {
  code = code.replace(subjectCardPattern, newSubjectCard);
  console.log("Updated subjects card with checkbox");
}

// Update ASSIGNMENTS (subject_offerings) cards
const soCardPattern = /<div className=\{`item-card \$\{so\.is_active === false \? "inactive" : ""\}`\} key=\{so\.id\}>/;
const newSoCard = `<div className={\`item-card \${so.is_active === false ? "inactive" : ""} \${selectedIds.includes(so.id) ? "selected" : ""}\`} key={so.id}>
                        <label className="card-checkbox" onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            className="tik-checkbox"
                            checked={selectedIds.includes(so.id)}
                            onChange={() => toggleSelect(so.id)}
                          />
                        </label>`;
if (soCardPattern.test(code)) {
  code = code.replace(soCardPattern, newSoCard);
  console.log("Updated assignments card with checkbox");
}

// Update DEPARTMENTS cards
const deptCardPattern = /<div className=\{`item-card \$\{d\.is_active === false \? "inactive" : ""\}`\} key=\{d\.id\}>/;
const newDeptCard = `<div className={\`item-card \${d.is_active === false ? "inactive" : ""} \${selectedIds.includes(d.id) ? "selected" : ""}\`} key={d.id}>
                        <label className="card-checkbox" onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            className="tik-checkbox"
                            checked={selectedIds.includes(d.id)}
                            onChange={() => toggleSelect(d.id)}
                          />
                        </label>`;
if (deptCardPattern.test(code)) {
  code = code.replace(deptCardPattern, newDeptCard);
  console.log("Updated departments card with checkbox");
}

// Update PROGRAMS cards
const progCardPattern = /<div className="item-card" key=\{p\.id\}>/;
const newProgCard = `<div className={\`item-card \${selectedIds.includes(p.id) ? "selected" : ""}\`} key={p.id}>
                        <label className="card-checkbox" onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            className="tik-checkbox"
                            checked={selectedIds.includes(p.id)}
                            onChange={() => toggleSelect(p.id)}
                          />
                        </label>`;
if (progCardPattern.test(code)) {
  code = code.replace(progCardPattern, newProgCard);
  console.log("Updated programs card with checkbox");
}

// Update ACADEMIC YEARS cards
const yearCardPattern = /<div className=\{`item-card \$\{\!y\.is_current \? "inactive" : ""\}`\} key=\{y\.id\}>/;
const newYearCard = `<div className={\`item-card \${!y.is_current ? "inactive" : ""} \${selectedIds.includes(y.id) ? "selected" : ""}\`} key={y.id}>
                        <label className="card-checkbox" onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            className="tik-checkbox"
                            checked={selectedIds.includes(y.id)}
                            onChange={() => toggleSelect(y.id)}
                          />
                        </label>`;
if (yearCardPattern.test(code)) {
  code = code.replace(yearCardPattern, newYearCard);
  console.log("Updated academic years card with checkbox");
}

// Update SEMESTERS cards
const semCardPattern = /<div className=\{`item-card \$\{s\.is_active === false \? "inactive" : ""\}`\} key=\{s\.id\}>/;
const newSemCard = `<div className={\`item-card \${s.is_active === false ? "inactive" : ""} \${selectedIds.includes(s.id) ? "selected" : ""}\`} key={s.id}>
                        <label className="card-checkbox" onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            className="tik-checkbox"
                            checked={selectedIds.includes(s.id)}
                            onChange={() => toggleSelect(s.id)}
                          />
                        </label>`;
if (semCardPattern.test(code)) {
  code = code.replace(semCardPattern, newSemCard);
  console.log("Updated semesters card with checkbox");
}

// Update ROSTER cards
const rosterCardPattern = /<div className="item-card" key=\{st\.id\}>/;
const newRosterCard = `<div className={\`item-card \${selectedIds.includes(st.id) ? "selected" : ""}\`} key={st.id}>
                        <label className="card-checkbox" onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            className="tik-checkbox"
                            checked={selectedIds.includes(st.id)}
                            onChange={() => toggleSelect(st.id)}
                          />
                        </label>`;
if (rosterCardPattern.test(code)) {
  code = code.replace(rosterCardPattern, newRosterCard);
  console.log("Updated roster card with checkbox");
}

// Update STUDENTS (enrollments) cards
const enrollCardPattern = /<div className="item-card" key=\{en\.id\}>/;
const newEnrollCard = `<div className={\`item-card \${selectedIds.includes(en.id) ? "selected" : ""}\`} key={en.id}>
                        <label className="card-checkbox" onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            className="tik-checkbox"
                            checked={selectedIds.includes(en.id)}
                            onChange={() => toggleSelect(en.id)}
                          />
                        </label>`;
if (enrollCardPattern.test(code)) {
  code = code.replace(enrollCardPattern, newEnrollCard);
  console.log("Updated enrollments card with checkbox");
}

// Update ROUTINES cards
const routineCardPattern = /<div className="item-card" key=\{r\.id\}>/;
const newRoutineCard = `<div className={\`item-card \${selectedIds.includes(r.id) ? "selected" : ""}\`} key={r.id}>
                        <label className="card-checkbox" onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            className="tik-checkbox"
                            checked={selectedIds.includes(r.id)}
                            onChange={() => toggleSelect(r.id)}
                          />
                        </label>`;
if (routineCardPattern.test(code)) {
  code = code.replace(routineCardPattern, newRoutineCard);
  console.log("Updated routines card with checkbox");
}

fs.writeFileSync(path, code, 'utf8');
console.log("Done patching CoordinatorDashboard.tsx!");
