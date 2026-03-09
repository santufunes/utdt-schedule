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
    <div className="min-h-screen bg-[#070711] text-white px-4 py-6 md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 rounded-3xl border border-white/10 bg-white/[0.03] p-5 shadow-2xl shadow-black/30">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-white/45">UTDT · Schedule solver</div>
              <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Calendario dinámico validado globalmente</h1>
              <p className="mt-2 max-w-3xl text-sm text-white/65">
                Este componente no valida por partes: calcula únicamente combinaciones completas que cumplen con asistir a los 2 teóricos de MYB, DE y FP, más 1 práctico semanal por cada una, sin superposiciones con las materias fijas.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                <div className="text-xs uppercase tracking-[0.2em] text-white/40">Horarios válidos</div>
                <div className="mt-1 text-2xl font-semibold">{stats.fullSchedules}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                <div className="text-xs uppercase tracking-[0.2em] text-white/40">Mix teóricos válidos</div>
                <div className="mt-1 text-2xl font-semibold">{stats.theoryMixes}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                <div className="text-xs uppercase tracking-[0.2em] text-white/40">Espacio bruto</div>
                <div className="mt-1 text-2xl font-semibold">{stats.rawPossibilities}</div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/55">
            <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-emerald-300">Solo se muestran opciones que llevan a un horario completo factible</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Se corrige el bug de superposición dentro de la misma materia</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Se reemplaza la lógica local por un solver global</span>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[420px,1fr]">
          <div className="space-y-4">
            {GROUPS.map((group) => {
              const meta = COURSE_META[group.course];
              const presetState = getTheoryPresetState(group, locks);
              return (
                <div
                  key={group.course}
                  className="rounded-3xl border p-4"
                  style={{ backgroundColor: `${meta.bg}`, borderColor: `${meta.accent}33` }}
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs uppercase tracking-[0.22em] text-white/40">{group.course}</div>
                      <h2 className="text-lg font-semibold" style={{ color: meta.text }}>{group.title}</h2>
                    </div>
                    <button
                      onClick={() => clearCourseLocks(group.course)}
                      className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/65 transition hover:bg-white/5"
                    >
                      Limpiar curso
                    </button>
                  </div>

                  <div className="mb-3 rounded-2xl border border-white/8 bg-black/10 p-3">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/45">Preset teóricos</div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setTheoryPreset(group, "S1")}
                        className="rounded-full px-3 py-1.5 text-xs transition"
                        style={presetButtonStyle(presetState === "S1", meta.accent)}
                      >
                        S1 completo
                      </button>
                      <button
                        onClick={() => setTheoryPreset(group, "S2")}
                        className="rounded-full px-3 py-1.5 text-xs transition"
                        style={presetButtonStyle(presetState === "S2", meta.accent)}
                      >
                        S2 completo
                      </button>
                      <button
                        onClick={() => setTheoryPreset(group, "FREE")}
                        className="rounded-full px-3 py-1.5 text-xs transition"
                        style={presetButtonStyle(presetState === "FREE", meta.accent)}
                      >
                        Liberar teóricos
                      </button>
                    </div>
                    <div className="mt-2 text-xs text-white/45">
                      El selector fino sigue siendo por día. Estos presets fijan ambos teóricos del curso juntos para que puedas clavar S1 o S2 de una sola vez.
                    </div>
                  </div>

                  <div className="space-y-3">
                    {group.keys.map((key) => {
                      const dimension = DIMENSION_MAP[key];
                      const lockedValue = locks[key];
                      return (
                        <div key={key} className="rounded-2xl border border-white/8 bg-black/10 p-3">
                          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/45">{dimension.title}</div>
                          <div className="grid gap-2">
                            {dimension.options.map((option, optionIndex) => {
                              const count = optionCount(key, optionIndex);
                              const isDisabled = count === 0;
                              const isActive = lockedValue === optionIndex;
                              return (
                                <button
                                  key={option.label}
                                  disabled={isDisabled}
                                  onClick={() => toggleLock(key, optionIndex)}
                                  className="rounded-2xl px-3 py-3 text-left transition"
                                  style={chipStyle(isActive, isDisabled, meta.accent)}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <div className="text-sm font-medium" style={{ color: isDisabled ? "rgba(255,255,255,0.28)" : meta.text }}>
                                        {option.label}
                                      </div>
                                      <div className="mt-1 text-xs text-white/45">
                                        {isActive ? "Filtro activo" : "Click para fijar esta opción"}
                                      </div>
                                    </div>
                                    <div className="shrink-0 rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-xs text-white/70">
                                      {count}
                                    </div>
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
              );
            })}

            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-white/40">Exploración</div>
                  <div className="text-lg font-semibold">Horarios restantes</div>
                </div>
                <button
                  onClick={clearAllLocks}
                  className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/65 transition hover:bg-white/5"
                >
                  Limpiar todo
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                  <div className="text-xs uppercase tracking-[0.2em] text-white/40">Quedan</div>
                  <div className="mt-1 text-2xl font-semibold">{filteredSchedules.length}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                  <div className="text-xs uppercase tracking-[0.2em] text-white/40">Mostrando</div>
                  <div className="mt-1 text-2xl font-semibold">{filteredSchedules.length ? currentIndex + 1 : 0}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                  <div className="text-xs uppercase tracking-[0.2em] text-white/40">Fijos</div>
                  <div className="mt-1 text-2xl font-semibold">{FIXED_BLOCKS.length}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                  <div className="text-xs uppercase tracking-[0.2em] text-white/40">Dinámicos</div>
                  <div className="mt-1 text-2xl font-semibold">9</div>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={previousSchedule}
                  disabled={filteredSchedules.length <= 1}
                  className="rounded-2xl border border-white/10 px-4 py-2 text-sm text-white/75 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ← Anterior
                </button>
                <button
                  onClick={nextSchedule}
                  disabled={filteredSchedules.length <= 1}
                  className="rounded-2xl border border-white/10 px-4 py-2 text-sm text-white/75 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Siguiente →
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
              <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-white/40">Horario activo</div>
                  <div className="text-lg font-semibold">
                    {activeSchedule ? `Combinación #${activeSchedule.id}` : "No hay horarios con esos filtros"}
                  </div>
                </div>
                {activeSchedule && (
                  <div className="text-sm text-white/55">
                    {GROUPS.map((group) => (
                      <span key={group.course} className="mr-4 inline-block">
                        <span className="font-semibold" style={{ color: COURSE_META[group.course].accent }}>{group.course}</span>
                        {": "}
                        {dimensionSummary(activeSchedule, group.keys[0]).split("·")[0].trim()}
                        {" / "}
                        {dimensionSummary(activeSchedule, group.keys[1]).split("·")[0].trim()}
                        {" / PRA "}
                        {dimensionSummary(activeSchedule, group.keys[2]).split("·")[0].trim()}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {activeSchedule && (
                <div className="mb-4 grid gap-3 md:grid-cols-3">
                  {GROUPS.map((group) => {
                    const meta = COURSE_META[group.course];
                    return (
                      <div key={group.course} className="rounded-2xl border p-3" style={{ backgroundColor: `${meta.bg}`, borderColor: `${meta.accent}33` }}>
                        <div className="mb-2 text-sm font-semibold" style={{ color: meta.text }}>{group.title}</div>
                        <div className="space-y-1 text-xs text-white/70">
                          <div>{dimensionSummary(activeSchedule, group.keys[0])}</div>
                          <div>{dimensionSummary(activeSchedule, group.keys[1])}</div>
                          <div>{dimensionSummary(activeSchedule, group.keys[2])}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#0a0a13]">
                <div className="grid" style={{ gridTemplateColumns: "56px repeat(5, minmax(0, 1fr))" }}>
                  <div className="border-b border-white/10 bg-[#0d0d18]" />
                  {DAY_SHORT.map((day, dayIndex) => (
                    <div key={day} className="border-b border-l border-white/10 bg-[#0d0d18] px-2 py-3 text-center">
                      <div className="text-sm font-semibold tracking-wide">{day}</div>
                      <div className="mt-0.5 text-[11px] text-white/35">{DAY_LONG[dayIndex]}</div>
                    </div>
                  ))}

                  <div>
                    {hours.map((hour) => (
                      <div key={hour} className="flex items-start justify-center border-b border-white/5 pt-1" style={{ height: HOUR_HEIGHT }}>
                        <span className="text-[11px] text-white/28">{`${hour}:00`}</span>
                      </div>
                    ))}
                  </div>

                  {DAY_SHORT.map((_, dayIndex) => (
                    <div key={dayIndex} className="relative border-l border-white/10">
                      {hours.map((hour) => (
                        <div key={hour} className="border-b border-white/5" style={{ height: HOUR_HEIGHT }}>
                          <div className="mt-[36px] border-b border-dashed border-white/[0.035]" />
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
                              className="absolute left-1 right-1 rounded-xl border px-3 py-2 shadow-lg shadow-black/30"
                              style={{
                                top: top + 2,
                                height: height - 4,
                                backgroundColor: `${meta.bg}`,
                                borderColor: `${meta.accent}55`,
                                borderLeft: `4px solid ${meta.accent}`,
                              }}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <div className="text-sm font-semibold" style={{ color: meta.text }}>
                                    {block.course}
                                  </div>
                                  <div className="text-[11px] text-white/55">
                                    {block.kind} · {block.section}
                                    {block.fixed ? " · FIJO" : ""}
                                  </div>
                                </div>
                                <div className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[10px] text-white/65">
                                  {block.room}
                                </div>
                              </div>

                              <div className="mt-3 text-xs text-white/70">{block.start}–{block.end}</div>
                              <div className="mt-1 text-[11px] text-white/45">{COURSE_META[block.course].name}</div>
                            </div>
                          );
                        })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
