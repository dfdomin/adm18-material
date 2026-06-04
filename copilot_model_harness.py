#!/usr/bin/env python3
"""Model-switch harness for Copilot CLI task sequences.

Usage:
  python copilot_model_harness.py --plan copilot_model_plan.example.json --current-model gpt-5.3-codex
"""

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from typing import Dict, List, Tuple


AVAILABLE_MODELS = [
    "gpt-5.4",
    "gpt-5.3-codex",
    "gpt-5.2-codex",
    "gpt-5.2",
    "gpt-5.4-mini",
    "gpt-5-mini",
    "gpt-4.1",
    "claude-sonnet-4.6",
    "claude-sonnet-4.5",
    "claude-haiku-4.5",
]


LEVEL = {"low": 1, "medium": 2, "high": 3}


@dataclass
class TaskSpec:
    task_id: str
    title: str
    objective: str
    task_type: str
    complexity: str
    risk: str
    latency_priority: str
    quality_priority: str
    files: List[str]
    done_definition: List[str]


def normalize_level(value: str, field_name: str) -> str:
    value = (value or "").strip().lower()
    if value not in LEVEL:
        raise ValueError(f"{field_name} must be one of {list(LEVEL)}")
    return value


def parse_plan(path: str) -> Tuple[Dict[str, str], List[TaskSpec]]:
    with open(path, "r", encoding="utf-8") as f:
        raw = json.load(f)

    project = {
        "project": raw.get("project", "Unnamed project"),
        "global_context": raw.get("global_context", ""),
        "constraints": raw.get("constraints", ""),
    }

    tasks: List[TaskSpec] = []
    for idx, t in enumerate(raw.get("tasks", []), start=1):
        task = TaskSpec(
            task_id=t.get("id", f"task-{idx}"),
            title=t["title"],
            objective=t["objective"],
            task_type=t.get("task_type", "implementation").strip().lower(),
            complexity=normalize_level(t.get("complexity", "medium"), "complexity"),
            risk=normalize_level(t.get("risk", "medium"), "risk"),
            latency_priority=normalize_level(t.get("latency_priority", "medium"), "latency_priority"),
            quality_priority=normalize_level(t.get("quality_priority", "medium"), "quality_priority"),
            files=t.get("files", []),
            done_definition=t.get("done_definition", []),
        )
        tasks.append(task)
    return project, tasks


def choose_model(task: TaskSpec) -> Tuple[str, str]:
    # Priority rules first (deterministic)
    if task.task_type in {"architecture", "strategy"} and LEVEL[task.complexity] >= 2:
        return "claude-sonnet-4.6", "Best for deep trade-offs and architecture decisions."
    if task.task_type in {"implementation", "debug", "bugfix", "tests", "refactor"} and LEVEL[task.risk] >= 2:
        return "gpt-5.3-codex", "Best engineering balance for risky code changes."
    if task.task_type in {"review", "security"} and LEVEL[task.risk] == 3:
        return "gpt-5.4", "Higher reliability for critical review and high-risk tasks."
    if task.task_type in {"research", "discovery"} and LEVEL[task.latency_priority] == 3:
        return "claude-haiku-4.5", "Fast exploration for discovery-heavy tasks."
    if task.task_type in {"docs", "content", "cleanup"} and LEVEL[task.risk] == 1:
        if LEVEL[task.latency_priority] >= 2:
            return "gpt-4.1", "Fast, adequate quality for low-risk documentation work."
        return "gpt-5-mini", "Efficient for low-risk text-heavy tasks."

    # Scored fallback
    scores = {
        "gpt-5.4": 0,
        "gpt-5.3-codex": 0,
        "gpt-5.2-codex": 0,
        "gpt-5.4-mini": 0,
        "gpt-5-mini": 0,
        "gpt-4.1": 0,
        "claude-sonnet-4.6": 0,
        "claude-haiku-4.5": 0,
    }

    complexity = LEVEL[task.complexity]
    risk = LEVEL[task.risk]
    quality = LEVEL[task.quality_priority]
    latency = LEVEL[task.latency_priority]

    scores["gpt-5.4"] += risk * 3 + quality * 2 + (1 if complexity == 3 else 0)
    scores["gpt-5.3-codex"] += complexity * 3 + risk * 2 + quality * 2
    scores["gpt-5.2-codex"] += complexity * 2 + risk + quality
    scores["claude-sonnet-4.6"] += complexity * 2 + quality * 3 + (2 if task.task_type in {"architecture", "strategy"} else 0)
    scores["claude-haiku-4.5"] += latency * 3 + (2 if task.task_type in {"research", "discovery"} else 0)
    scores["gpt-5.4-mini"] += latency * 2 + (2 if complexity == 1 else 0)
    scores["gpt-5-mini"] += latency * 3 + (1 if task.task_type in {"docs", "cleanup"} else 0)
    scores["gpt-4.1"] += latency * 2 + (2 if task.task_type in {"docs", "content"} else 0)

    best_model = max(scores.items(), key=lambda kv: kv[1])[0]
    reason = "Scored by complexity/risk/quality/latency profile."
    return best_model, reason


def build_prompt(project: Dict[str, str], task: TaskSpec, language: str) -> str:
    files_txt = ", ".join(task.files) if task.files else "N/A"
    done_txt = "\n".join(f"- {item}" for item in task.done_definition) if task.done_definition else "- Complete the task fully and safely."
    if language == "en":
        return (
            f"Project: {project['project']}\n"
            f"Global context: {project['global_context']}\n"
            f"Constraints: {project['constraints']}\n\n"
            f"Task ID: {task.task_id}\n"
            f"Task title: {task.title}\n"
            f"Objective: {task.objective}\n"
            f"Task type: {task.task_type}\n"
            f"Complexity: {task.complexity}; Risk: {task.risk}; Quality priority: {task.quality_priority}; Latency priority: {task.latency_priority}\n"
            f"Relevant files/folders: {files_txt}\n\n"
            "Execution rules:\n"
            "1. Make surgical, complete changes tied to the objective.\n"
            "2. Preserve existing conventions and avoid unrelated edits.\n"
            "3. Surface blockers explicitly; do not hide failures.\n"
            "4. Return concise output: outcome first, then key details.\n\n"
            "Definition of done:\n"
            f"{done_txt}"
        )
    return (
        f"Proyecto: {project['project']}\n"
        f"Contexto global: {project['global_context']}\n"
        f"Restricciones: {project['constraints']}\n\n"
        f"ID de tarea: {task.task_id}\n"
        f"Título: {task.title}\n"
        f"Objetivo: {task.objective}\n"
        f"Tipo: {task.task_type}\n"
        f"Complejidad: {task.complexity}; Riesgo: {task.risk}; Prioridad de calidad: {task.quality_priority}; Prioridad de latencia: {task.latency_priority}\n"
        f"Archivos/carpetas relevantes: {files_txt}\n\n"
        "Reglas de ejecución:\n"
        "1. Haz cambios quirúrgicos y completos para el objetivo.\n"
        "2. Respeta convenciones existentes y evita cambios no relacionados.\n"
        "3. Si hay bloqueos, repórtalos claramente; no ocultes fallos.\n"
        "4. Responde conciso: primero resultado, luego detalle clave.\n\n"
        "Definición de terminado:\n"
        f"{done_txt}"
    )


def render_runbook(
    project: Dict[str, str],
    tasks: List[TaskSpec],
    current_model: str,
    language: str,
    strict_boundaries: bool,
) -> str:
    lines: List[str] = []
    lines.append(f"Project: {project['project']}")
    lines.append(f"Current model: {current_model}")
    lines.append(f"Boundary mode: {'strict' if strict_boundaries else 'flexible'}")
    lines.append("")

    active_model = current_model
    for idx, task in enumerate(tasks, start=1):
        recommended, reason = choose_model(task)

        if idx == 1 and not strict_boundaries:
            active_model = recommended
            switch_note = f"Switch now to {recommended} before Task 1."
        else:
            switch_note = "No switch before this task."

        lines.append(f"=== Task {idx}: {task.task_id} - {task.title} ===")
        lines.append(f"Execute with model: {active_model}")
        lines.append(f"Recommended for this task: {recommended}")
        lines.append(f"Why: {reason}")
        lines.append(f"Switch decision (pre-task): {switch_note}")
        lines.append("")
        lines.append("Prompt to use:")
        lines.append("---")
        lines.append(build_prompt(project, task, language))
        lines.append("---")
        lines.append("")

        # Switch only after task completion
        if active_model != recommended:
            lines.append(f"After completing this task: run `/model {recommended}`")
            active_model = recommended
        else:
            lines.append("After completing this task: keep current model")
        lines.append("")

    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser(description="Copilot model-switch harness")
    parser.add_argument("--plan", required=True, help="Path to plan JSON")
    parser.add_argument(
        "--current-model",
        required=True,
        help=f"Current model ({', '.join(AVAILABLE_MODELS)})",
    )
    parser.add_argument("--language", choices=["es", "en"], default="es")
    parser.add_argument(
        "--strict-boundaries",
        action="store_true",
        help="Never switch before task 1; only switch after each completed task.",
    )
    parser.add_argument(
        "--out",
        default="",
        help="Optional output file path. If omitted, prints to stdout.",
    )
    args = parser.parse_args()

    if args.current_model not in AVAILABLE_MODELS:
        raise ValueError(f"Unsupported current model: {args.current_model}")

    project, tasks = parse_plan(args.plan)
    if not tasks:
        raise ValueError("Plan file has no tasks.")

    runbook = render_runbook(
        project=project,
        tasks=tasks,
        current_model=args.current_model,
        language=args.language,
        strict_boundaries=args.strict_boundaries,
    )

    if args.out:
        with open(args.out, "w", encoding="utf-8") as f:
            f.write(runbook)
        print(f"Runbook written to: {args.out}")
    else:
        print(runbook)


if __name__ == "__main__":
    main()

