import { useEffect, useMemo, useState } from "react";

const DAY_SHORT = ["LUN", "MAR", "MIÉ", "JUE", "VIE"];
const DAY_LONG = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];
const START_HOUR = 8;
const END_HOUR = 19;
const HOUR_HEIGHT = 72;

const COURSE_META = {
  HPE: { name: "Historia del Pensamiento Económico", bg: "#181830", text: "#d7dcff", accent: "#8b7cf8" },
  FP: { name: "Finanzas Públicas", bg: "#0e1f33", text: "#c9e3ff", accent: "#3e9bfe" },
  DE: { name: "Desarrollo Económico", bg: "#132613", text: "#cbf3cb", accent: "#41c972" },
  MYB: { name: "Moneda y Bancos", bg: "#301515", text: "#ffd2d2", accent: "#f0605d" },
  EMII: { name: "Economía Matemática II", bg: "#302a12", text: "#fff0c2", accent: "#edb830" },
  BAMC: { name: "Bioeconomía / Agro / Commodities", bg: "#281530", text: "#efd6ff", accent: "#b366e0" },
};

function makeBlock(course, kind, day, start, end, room, section, label, fixed = false) {
  return { course, kind, day, start, end, room, section, label, fixed };
}

const FIXED_BLOCKS = [
  makeBlock("HPE", "TEO", 1, "11:30", "13:05", "SV201", "Fijo", "Mar 11:30", true),
  makeBlock("HPE", "TEO", 3, "11:30", "13:05", "SV201", "Fijo", "Jue 11:30", true),
  makeBlock("HPE", "PRA", 4, "08:00", "09:35", "A3", "Fijo", "Vie 08:00", true),
  makeBlock("EMII", "TEO", 0, "11:30", "13:05", "SVE3", "Fijo", "Lun 11:30", true),
  makeBlock("EMII", "TEO", 2, "11:30", "13:05", "SVE3", "Fijo", "Mié 11:30", true),
  makeBlock("EMII", "PRA", 1, "09:45", "11:20", "SV103", "Fijo", "Mar 09:45", true),
  makeBlock("EMII", "PRA", 4, "09:45", "11:20", "AS1", "Fijo", "Vie 09:45", true),
  makeBlock("BAMC", "TEO", 1, "13:45", "15:20", "A110", "Fijo", "Mar 13:45", true),
  makeBlock("BAMC", "TEO", 3, "13:45", "15:20", "A110", "Fijo", "Jue 13:45", true),
];

const DIMENSIONS = [
  {
    key: "MYB_MON",
    course: "MYB",
    title: "Teórico lunes",
    options: [
      { label: "S1 · 13:45–15:20 · SV201", block: makeBlock("MYB", "TEO", 0, "13:45", "15:20", "SV201", "S1", "Lun S1") },
      { label: "S2 · 15:30–17:05 · SVE2", block: makeBlock("MYB", "TEO", 0, "15:30", "17:05", "SVE2", "S2", "Lun S2") },
    ],
  },
  {
    key: "MYB_WED",
    course: "MYB",
    title: "Teórico miércoles",
    options: [
      { label: "S1 · 13:45–15:20 · Magna", block: makeBlock("MYB", "TEO", 2, "13:45", "15:20", "Magna", "S1", "Mié S1") },
      { label: "S2 · 15:30–17:05 · SVE2", block: makeBlock("MYB", "TEO", 2, "15:30", "17:05", "SVE2", "S2", "Mié S2") },
    ],
  },
  {
    key: "MYB_PRA",
    course: "MYB",
    title: "Práctico semanal",
    options: [
      { label: "S1 · Lun 15:30–17:05 · M1", block: makeBlock("MYB", "PRA", 0, "15:30", "17:05", "M1", "S1", "PRA S1 Lun") },
      { label: "S1 · Mié 17:15–18:50 · M6", block: makeBlock("MYB", "PRA", 2, "17:15", "18:50", "M6", "S1", "PRA S1 Mié") },
      { label: "S2 · Lun 17:15–18:50 · A112", block: makeBlock("MYB", "PRA", 0, "17:15", "18:50", "A112", "S2", "PRA S2 Lun") },
      { label: "S2 · Vie 17:15–18:50 · SVE4", block: makeBlock("MYB", "PRA", 4, "17:15", "18:50", "SVE4", "S2", "PRA S2 Vie") },
    ],
  },
  {
    key: "DE_TUE",
    course: "DE",
    title: "Teórico martes",
    options: [
      { label: "S1 · 17:15–18:50 · SV201", block: makeBlock("DE", "TEO", 1, "17:15", "18:50", "SV201", "S1", "Mar S1") },
      { label: "S2 · 15:30–17:05 · Magna", block: makeBlock("DE", "TEO", 1, "15:30", "17:05", "Magna", "S2", "Mar S2") },
    ],
  },
  {
    key: "DE_THU",
    course: "DE",
    title: "Teórico jueves",
    options: [
      { label: "S1 · 17:15–18:50 · SV201", block: makeBlock("DE", "TEO", 3, "17:15", "18:50", "SV201", "S1", "Jue S1") },
      { label: "S2 · 15:30–17:05 · SV201", block: makeBlock("DE", "TEO", 3, "15:30", "17:05", "SV201", "S2", "Jue S2") },
    ],
  },
  {
    key: "DE_PRA",
    course: "DE",
    title: "Práctico semanal",
    options: [
      { label: "S1 · Lun 13:45–15:20 · A109", block: makeBlock("DE", "PRA", 0, "13:45", "15:20", "A109", "S1", "PRA S1 Lun") },
      { label: "S1 · Mié 13:45–15:20 · A401", block: makeBlock("DE", "PRA", 2, "13:45", "15:20", "A401", "S1", "PRA S1 Mié") },
      { label: "S2 · Mié 15:30–17:05 · A2", block: makeBlock("DE", "PRA", 2, "15:30", "17:05", "A2", "S2", "PRA S2 Mié") },
      { label: "S2 · Vie 15:30–17:05 · SV304", block: makeBlock("DE", "PRA", 4, "15:30", "17:05", "SV304", "S2", "PRA S2 Vie") },
    ],
  },
  {
    key: "FP_TUE",
    course: "FP",
    title: "Teórico martes",
    options: [
      { label: "S1 · 15:30–17:05 · SV103", block: makeBlock("FP", "TEO", 1, "15:30", "17:05", "SV103", "S1", "Mar S1") },
      { label: "S2 · 17:15–18:50 · SV103", block: makeBlock("FP", "TEO", 1, "17:15", "18:50", "SV103", "S2", "Mar S2") },
    ],
  },
  {
    key: "FP_THU",
    course: "FP",
    title: "Teórico jueves",
    options: [
      { label: "S1 · 15:30–17:05 · SV103", block: makeBlock("FP", "TEO", 3, "15:30", "17:05", "SV103", "S1", "Jue S1") },
      { label: "S2 · 17:15–18:50 · SV103", block: makeBlock("FP", "TEO", 3, "17:15", "18:50", "SV103", "S2", "Jue S2") },
    ],
  },
  {
    key: "FP_PRA",
    course: "FP",
    title: "Práctico semanal",
    options: [
      { label: "S1 · Mié 17:15–18:50 · SV202", block: makeBlock("FP", "PRA", 2, "17:15", "18:50", "SV202", "S1", "PRA S1 Mié") },
      { label: "S1 · Vie 15:30–17:05 · SV301", block: makeBlock("FP", "PRA", 4, "15:30", "17:05", "SV301", "S1", "PRA S1 Vie") },
      { label: "S2 · Lun 17:15–18:50 · SV202", block: makeBlock("FP", "PRA", 0, "17:15", "18:50", "SV202", "S2", "PRA S2 Lun") },
      { label: "S2 · Mié 15:30–17:05 · A113", block: makeBlock("FP", "PRA", 2, "15:30", "17:05", "A113", "S2", "PRA S2 Mié") },
    ],
  },
];

const GROUPS = [
  { course: "MYB", title: "Moneda y Bancos", keys: ["MYB_MON", "MYB_WED", "MYB_PRA"] },
  { course: "DE", title: "Desarrollo Económico", keys: ["DE_TUE", "DE_THU", "DE_PRA"] },
  { course: "FP", title: "Finanzas Públicas", keys: ["FP_TUE", "FP_THU", "FP_PRA"] },
];

const THEORY_KEYS = ["MYB_MON", "MYB_WED", "DE_TUE", "DE_THU", "FP_TUE", "FP_THU"];
const DIMENSION_MAP = Object.fromEntries(DIMENSIONS.map((dimension) => [dimension.key, dimension]));

function toMinutes(time) {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

function overlaps(a, b) {
  return a.day === b.day && toMinutes(a.start) < toMinutes(b.end) && toMinutes(b.start) < toMinutes(a.end);
}

function enumerateSchedules() {
  const results = [];

  function backtrack(index, picks, blocks) {
    if (index === DIMENSIONS.length) {
      results.push({
        id: results.length + 1,
        picks: { ...picks },
        blocks: [...blocks].sort((left, right) => left.day - right.day || toMinutes(left.start) - toMinutes(right.start)),
      });
      return;
    }

    const dimension = DIMENSIONS[index];

    dimension.options.forEach((option, optionIndex) => {
      const candidate = option.block;
      const conflict = blocks.some((existing) => overlaps(existing, candidate));
      if (conflict) return;

      picks[dimension.key] = optionIndex;
      blocks.push(candidate);
      backtrack(index + 1, picks, blocks);
      blocks.pop();
      delete picks[dimension.key];
    });
  }

  backtrack(0, {}, [...FIXED_BLOCKS]);
  return results;
}

function matchesLocks(schedule, locks) {
  return Object.entries(locks).every(([key, value]) => value == null || schedule.picks[key] === value);
}

function dimensionSummary(schedule, key) {
  const dimension = DIMENSION_MAP[key];
  const option = dimension.options[schedule.picks[key]];
  return option?.label ?? "—";
}

function minutesToTop(minutes) {
  return ((minutes - START_HOUR * 60) / 60) * HOUR_HEIGHT;
}

function chipStyle(isActive, isDisabled, accent) {
  if (isDisabled) {
    return {
      opacity: 0.28,
      cursor: "not-allowed",
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.06)",
    };
  }

  if (isActive) {
    return {
      background: `${accent}22`,
      border: `1px solid ${accent}88`,
      boxShadow: `0 0 0 1px ${accent}22 inset`,
    };
  }

  return {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.06)",
  };
}

function presetButtonStyle(isActive, accent) {
  return {
    background: isActive ? `${accent}22` : "rgba(255,255,255,0.03)",
    border: isActive ? `1px solid ${accent}88` : "1px solid rgba(255,255,255,0.08)",
    color: isActive ? "white" : "rgba(255,255,255,0.72)",
  };
}

function getTheoryPresetState(group, locks) {
  const first = locks[group.keys[0]];
  const second = locks[group.keys[1]];

  if (first === 0 && second === 0) return "S1";
  if (first === 1 && second === 1) return "S2";
  if (first == null && second == null) return "FREE";
  return "MIX";
}

export default function UtdtDynamicScheduleSolver() {
  const allSchedules = useMemo(() => enumerateSchedules(), []);
  const [locks, setLocks] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);

  const filteredSchedules = useMemo(
    () => allSchedules.filter((schedule) => matchesLocks(schedule, locks)),
    [allSchedules, locks]
  );

  useEffect(() => {
    if (currentIndex >= filteredSchedules.length) {
      setCurrentIndex(0);
    }
  }, [currentIndex, filteredSchedules.length]);

  const activeSchedule = filteredSchedules[currentIndex] ?? null;

  const stats = useMemo(() => {
    const theoryMixes = new Set(
      allSchedules.map((schedule) => THEORY_KEYS.map((key) => schedule.picks[key]).join("|"))
    );

    return {
      fullSchedules: allSchedules.length,
      theoryMixes: theoryMixes.size,
      rawPossibilities: 4096,
    };
  }, [allSchedules]);

  function toggleLock(key, optionIndex) {
    setLocks((previous) => ({
      ...previous,
      [key]: previous[key] === optionIndex ? undefined : optionIndex,
    }));
    setCurrentIndex(0);
  }

  function clearAllLocks() {
    setLocks({});
    setCurrentIndex(0);
  }

  function clearCourseLocks(course) {
    setLocks((previous) => {
      const next = { ...previous };
      Object.keys(next).forEach((key) => {
        if (key.startsWith(`${course}_`)) {
          delete next[key];
        }
      });
      return next;
    });
    setCurrentIndex(0);
  }

  function setTheoryPreset(group, preset) {
    setLocks((previous) => {
      const next = { ...previous };

      if (preset === "FREE") {
        delete next[group.keys[0]];
        delete next[group.keys[1]];
      } else if (preset === "S1") {
        next[group.keys[0]] = 0;
        next[group.keys[1]] = 0;
      } else if (preset === "S2") {
        next[group.keys[0]] = 1;
        next[group.keys[1]] = 1;
      }

      return next;
    });
    setCurrentIndex(0);
  }

  function optionCount(key, optionIndex) {
    const nextLocks = { ...locks, [key]: optionIndex };
    return allSchedules.filter((schedule) => matchesLocks(schedule, nextLocks)).length;
  }

  function previousSchedule() {
    if (filteredSchedules.length <= 1) return;
    setCurrentIndex((index) => (index - 1 + filteredSchedules.length) % filteredSchedules.length);
  }

  function nextSchedule() {
    if (filteredSchedules.length <= 1) return;
    setCurrentIndex((index) => (index + 1) % filteredSchedules.length);
  }

  const hours = [];
  for (let hour = START_HOUR; hour <= END_HOUR; hour += 1) {
    hours.push(hour);
  }

  return (
    <div className="min-h-screen bg-[#050508] text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#050508]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 font-bold text-white shadow-lg shadow-emerald-500/20">
              U
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight">UTDT Schedule</div>
              <div className="text-[11px] text-white/40">Solver de horarios</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-4 text-sm text-white/60 sm:flex">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                {stats.fullSchedules} combinaciones
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 py-8 md:px-8">
        <div className="mx-auto max-w-7xl">
          {/* Hero Section */}
          <div className="mb-8">
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
              Armá tu horario
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-white/50">
              Seleccioná tus preferencias y explorá todas las combinaciones válidas. 
              Solo se muestran opciones que llevan a horarios completos sin superposiciones.
            </p>
          </div>

          {/* Stats Row */}
          <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 transition-colors hover:border-white/10 hover:bg-white/[0.04]">
              <div className="text-[11px] font-medium uppercase tracking-widest text-white/35">Válidos</div>
              <div className="mt-2 text-3xl font-semibold tabular-nums">{stats.fullSchedules}</div>
            </div>
            <div className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 transition-colors hover:border-white/10 hover:bg-white/[0.04]">
              <div className="text-[11px] font-medium uppercase tracking-widest text-white/35">Mix teóricos</div>
              <div className="mt-2 text-3xl font-semibold tabular-nums">{stats.theoryMixes}</div>
            </div>
            <div className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 transition-colors hover:border-white/10 hover:bg-white/[0.04]">
              <div className="text-[11px] font-medium uppercase tracking-widest text-white/35">Filtrados</div>
              <div className="mt-2 text-3xl font-semibold tabular-nums text-emerald-400">{filteredSchedules.length}</div>
            </div>
            <div className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 transition-colors hover:border-white/10 hover:bg-white/[0.04]">
              <div className="text-[11px] font-medium uppercase tracking-widest text-white/35">Mostrando</div>
              <div className="mt-2 text-3xl font-semibold tabular-nums">{filteredSchedules.length ? currentIndex + 1 : 0}</div>
            </div>
          </div>

        <div className="grid gap-6 xl:grid-cols-[400px,1fr]">
          {/* Sidebar - Course Selection */}
          <div className="space-y-4">
            {/* Quick Actions */}
            <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
              <span className="text-sm text-white/60">Filtros activos</span>
              <button
                onClick={clearAllLocks}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/70 transition-all hover:border-white/20 hover:bg-white/10 hover:text-white"
              >
                Limpiar todo
              </button>
            </div>
            {GROUPS.map((group) => {
              const meta = COURSE_META[group.course];
              const presetState = getTheoryPresetState(group, locks);
              return (
                <div
                  key={group.course}
                  className="overflow-hidden rounded-2xl border transition-all hover:border-opacity-60"
                  style={{ backgroundColor: meta.bg, borderColor: `${meta.accent}40` }}
                >
                  {/* Course Header */}
                  <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: `${meta.accent}20` }}>
                    <div className="flex items-center gap-3">
                      <div 
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold"
                        style={{ backgroundColor: `${meta.accent}20`, color: meta.accent }}
                      >
                        {group.course.slice(0, 2)}
                      </div>
                      <div>
                        <h2 className="text-sm font-semibold" style={{ color: meta.text }}>{group.title}</h2>
                        <div className="text-[11px] text-white/40">{group.course}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => clearCourseLocks(group.course)}
                      className="rounded-lg px-2.5 py-1 text-[11px] text-white/50 transition-colors hover:bg-white/5 hover:text-white/70"
                    >
                      Limpiar
                    </button>
                  </div>

                  <div className="p-4">
                    {/* Preset Buttons */}
                    <div className="mb-4">
                      <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-white/30">Preset teóricos</div>
                      <div className="flex gap-2">
                        {[
                          { key: "S1", label: "S1" },
                          { key: "S2", label: "S2" },
                          { key: "FREE", label: "Libre" },
                        ].map((preset) => (
                          <button
                            key={preset.key}
                            onClick={() => setTheoryPreset(group, preset.key)}
                            className="flex-1 rounded-lg py-2 text-xs font-medium transition-all"
                            style={presetButtonStyle(presetState === preset.key, meta.accent)}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Time Slot Options */}
                    <div className="space-y-3">
                      {group.keys.map((key) => {
                        const dimension = DIMENSION_MAP[key];
                        const lockedValue = locks[key];
                        return (
                          <div key={key}>
                            <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-white/30">{dimension.title}</div>
                            <div className="space-y-1.5">
                              {dimension.options.map((option, optionIndex) => {
                                const count = optionCount(key, optionIndex);
                                const isDisabled = count === 0;
                                const isActive = lockedValue === optionIndex;
                                return (
                                  <button
                                    key={option.label}
                                    disabled={isDisabled}
                                    onClick={() => toggleLock(key, optionIndex)}
                                    className="w-full rounded-xl px-3 py-2.5 text-left transition-all"
                                    style={chipStyle(isActive, isDisabled, meta.accent)}
                                  >
                                    <div className="flex items-center justify-between gap-3">
                                      <span 
                                        className="text-sm"
                                        style={{ color: isDisabled ? "rgba(255,255,255,0.25)" : meta.text }}
                                      >
                                        {option.label}
                                      </span>
                                      <span 
                                        className="rounded-md px-2 py-0.5 text-[11px] font-medium tabular-nums"
                                        style={{ 
                                          backgroundColor: isActive ? `${meta.accent}30` : "rgba(255,255,255,0.06)",
                                          color: isActive ? meta.accent : "rgba(255,255,255,0.5)"
                                        }}
                                      >
                                        {count}
                                      </span>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Navigation */}
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="mb-3 text-[11px] font-medium uppercase tracking-wider text-white/30">Navegación</div>
              <div className="flex gap-2">
                <button
                  onClick={previousSchedule}
                  disabled={filteredSchedules.length <= 1}
                  className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.02] py-3 text-sm font-medium text-white/70 transition-all hover:border-white/15 hover:bg-white/[0.05] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                >
                  Anterior
                </button>
                <button
                  onClick={nextSchedule}
                  disabled={filteredSchedules.length <= 1}
                  className="flex-1 rounded-xl border border-emerald-500/30 bg-emerald-500/10 py-3 text-sm font-medium text-emerald-400 transition-all hover:border-emerald-500/50 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  Siguiente
                </button>
              </div>
            </div>
          </div>

          {/* Calendar Section */}
          <div className="space-y-4">
            {/* Schedule Header */}
            <div className="flex flex-col gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">
                      {activeSchedule ? `Combinación #${activeSchedule.id}` : "Sin resultados"}
                    </h2>
                    <p className="text-sm text-white/40">
                      {activeSchedule ? `${filteredSchedules.length} opciones disponibles` : "Ajustá los filtros para ver opciones"}
                    </p>
                  </div>
                </div>
              </div>
              {activeSchedule && (
                <div className="flex flex-wrap gap-2">
                  {GROUPS.map((group) => (
                    <div 
                      key={group.course} 
                      className="rounded-lg px-3 py-1.5 text-xs font-medium"
                      style={{ backgroundColor: `${COURSE_META[group.course].accent}15`, color: COURSE_META[group.course].accent }}
                    >
                      {group.course}: {dimensionSummary(activeSchedule, group.keys[0]).split("·")[0].trim()}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Calendar Grid */}
            <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#08080d]">
              <div className="grid" style={{ gridTemplateColumns: "52px repeat(5, minmax(0, 1fr))" }}>
                {/* Header Row */}
                <div className="border-b border-white/[0.06] bg-white/[0.02]" />
                {DAY_SHORT.map((day, dayIndex) => (
                  <div key={day} className="border-b border-l border-white/[0.06] bg-white/[0.02] px-2 py-3 text-center">
                    <div className="text-xs font-semibold tracking-wide">{day}</div>
                    <div className="mt-0.5 text-[10px] text-white/30">{DAY_LONG[dayIndex]}</div>
                  </div>
                ))}

                {/* Time Column */}
                <div>
                  {hours.map((hour) => (
                    <div key={hour} className="flex items-start justify-center border-b border-white/[0.04] pt-1" style={{ height: HOUR_HEIGHT }}>
                      <span className="text-[10px] font-medium text-white/20">{`${hour}:00`}</span>
                    </div>
                  ))}
                </div>

                {/* Day Columns */}
                {DAY_SHORT.map((_, dayIndex) => (
                  <div key={dayIndex} className="relative border-l border-white/[0.06]">
                    {hours.map((hour) => (
                      <div key={hour} className="border-b border-white/[0.04]" style={{ height: HOUR_HEIGHT }}>
                        <div className="mt-[36px] border-b border-dashed border-white/[0.03]" />
                      </div>
                    ))}

                    {activeSchedule?.blocks
                      .filter((block) => block.day === dayIndex)
                      .map((block, index) => {
                        const meta = COURSE_META[block.course];
                        const top = minutesToTop(toMinutes(block.start));
                        const height = ((toMinutes(block.end) - toMinutes(block.start)) / 60) * HOUR_HEIGHT;

                        return (
                          <div
                            key={`${block.course}-${block.kind}-${block.day}-${block.start}-${index}`}
                            className="absolute left-0.5 right-0.5 overflow-hidden rounded-lg transition-all hover:z-10 hover:scale-[1.02]"
                            style={{
                              top: top + 1,
                              height: height - 2,
                              backgroundColor: meta.bg,
                              borderLeft: `3px solid ${meta.accent}`,
                              boxShadow: `0 2px 8px ${meta.accent}15`,
                            }}
                          >
                            <div className="flex h-full flex-col justify-between p-2">
                              <div>
                                <div className="flex items-start justify-between gap-1">
                                  <span className="text-xs font-bold" style={{ color: meta.accent }}>
                                    {block.course}
                                  </span>
                                  <span className="rounded bg-black/30 px-1.5 py-0.5 text-[9px] font-medium text-white/60">
                                    {block.room}
                                  </span>
                                </div>
                                <div className="mt-0.5 text-[10px] text-white/50">
                                  {block.kind} {block.fixed && <span className="text-white/30">FIJO</span>}
                                </div>
                              </div>
                              <div className="text-[10px] font-medium text-white/40">
                                {block.start}–{block.end}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
