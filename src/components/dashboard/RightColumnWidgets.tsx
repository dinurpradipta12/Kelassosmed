"use client";

import React, { useState } from "react";
import {
  Plus,
  Flag,
  Calendar,
  Check,
  Zap,
  CheckCircle2,
  Trash2,
} from "lucide-react";
import { type TodoTask } from "@/lib/design-tokens";
import { useRuangSosmedStore } from "@/context/RuangSosmedStore";
import { type AuthenticatedUser } from "@/components/navigation/GlobalRoleSwitcher";

interface RightColumnWidgetsProps {
  onOpenUpgradeModal: () => void;
  onShowToast: (msg: string) => void;
  currentUser?: AuthenticatedUser | null;
}

const PRO_FEATURES = [
  "Unlimited learning paths",
  "Data-driven insight",
  "Advanced search & filtering",
  "Custom certificate branding",
];

export function RightColumnWidgets({
  onShowToast,
  currentUser,
}: RightColumnWidgetsProps) {
  const {
    todos,
    setTodos,
    leaderboard,
    learnerIsPro,
    learnerSubscriptions,
    toggleStudentProByAdmin,
    resolveUserAvatar,
  } = useRuangSosmedStore();
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [selectedDue, setSelectedDue] = useState<"Today" | "Tomorrow">(
    "Tomorrow"
  );

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newTaskTitle.trim();
    if (!trimmed) return;

    const newItem: TodoTask = {
      id: `todo-${Date.now()}`,
      title: trimmed,
      subtitle: "Added from Ruang Sosmed 2.0 Mentor Studio",
      dueLabel: selectedDue,
      priority: selectedDue === "Today" ? "high" : "medium",
      completed: false,
    };

    setTodos((prev) => [newItem, ...prev]);
    setNewTaskTitle("");
    onShowToast(`Task "${trimmed}" added to your To Do list.`);
  };

  const toggleTodo = (id: string) => {
    setTodos((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };

  const removeTodo = (id: string) => {
    setTodos((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <div className="space-y-5">
      {/* Widget 1: To Do List Card */}
      <article className="rounded-xl bg-[#FFFFFF] p-5 border border-[#EAECEF] shadow-[0_2px_8px_rgba(16,15,17,0.04)]">
        <div className="flex items-center justify-between gap-2 mb-3.5">
          <div>
            <h2 className="text-sm font-semibold text-[#121215]">To Do List</h2>
            <p className="text-xs text-[#9CA3AF]">
              {currentUser?.name
                ? `${currentUser.name.split(" ")[0]}'s tasks & workspace queue`
                : "Admin tasks & workspace queue"}
            </p>
          </div>
          <span className="inline-flex items-center rounded-md bg-[#F8F9FB] border border-[#EAECEF] px-2 py-0.5 text-[11px] font-semibold text-[#5E5E5E]">
            {todos.filter((t) => !t.completed).length} remaining
          </span>
        </div>

        {/* Functional Input Field: + Add new task to do... (Press Enter to add) */}
        <form onSubmit={handleAddTask} className="mb-4">
          <div className="relative flex items-center">
            <Plus
              size={15}
              className="pointer-events-none absolute left-3 text-[#9CA3AF]"
            />
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="Add new task to do..."
              aria-label="Add new task to do"
              className="w-full rounded-lg bg-[#F8F9FB] pl-8 pr-20 py-2 text-xs text-[#121215] placeholder:text-[#9CA3AF] border border-[#EAECEF] focus:bg-[#FFFFFF] focus:border-[#4F39F6] focus:outline-none transition-colors"
            />
            <button
              type="button"
              onClick={() =>
                setSelectedDue((d) => (d === "Today" ? "Tomorrow" : "Today"))
              }
              title="Toggle default due date for new task"
              className="absolute right-1.5 rounded-md bg-[#FFFFFF] px-2 py-1 text-[10px] font-semibold text-[#5E5E5E] border border-[#EAECEF] hover:text-[#121215] cursor-pointer"
            >
              {selectedDue}
            </button>
          </div>
        </form>

        {/* Interactive Task Rows */}
        <div className="space-y-2.5">
          {todos.length === 0 ? (
            <div className="py-6 text-center text-xs text-[#9CA3AF]">
              Belum ada tugas to-do. Tambahkan tugas baru di atas.
            </div>
          ) : (
            todos.map((task) => {
            const flagColor =
              task.priority === "high"
                ? "#EF4444"
                : task.priority === "medium"
                ? "#F59E0B"
                : "#9CA3AF";

            return (
              <div
                key={task.id}
                className={`group flex items-start gap-3 rounded-lg p-3 border transition-all ${
                  task.completed
                    ? "bg-[#F8F9FB]/60 border-[#EAECEF]/70 opacity-70"
                    : "bg-[#FFFFFF] border-[#EAECEF] hover:border-[#D1D5DB]"
                }`}
              >
                {/* Circular Checkbox */}
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={task.completed}
                  aria-label={`Mark "${task.title}" as ${
                    task.completed ? "incomplete" : "complete"
                  }`}
                  onClick={() => toggleTodo(task.id)}
                  className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors cursor-pointer ${
                    task.completed
                      ? "bg-[#4F39F6] border-[#4F39F6] text-white"
                      : "border-[#D1D5DB] bg-[#FFFFFF] hover:border-[#4F39F6]"
                  }`}
                >
                  {task.completed && <Check size={10} strokeWidth={3} />}
                </button>

                {/* Task Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className={`text-xs font-semibold leading-snug ${
                        task.completed
                          ? "line-through text-[#9CA3AF]"
                          : "text-[#121215]"
                      }`}
                    >
                      {task.title}
                    </p>
                    <div className="flex items-center gap-1 shrink-0">
                      <Flag
                        size={12}
                        style={{ color: flagColor }}
                        fill={
                          task.priority === "high" ? flagColor : "transparent"
                        }
                        aria-label={`${task.priority} priority`}
                      />
                      <button
                        type="button"
                        onClick={() => removeTodo(task.id)}
                        aria-label={`Remove task ${task.title}`}
                        className="opacity-0 group-hover:opacity-100 text-[#9CA3AF] hover:text-[#EF4444] transition-opacity cursor-pointer"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  <p className="mt-1 text-[11px] text-[#5E5E5E] leading-relaxed">
                    {task.subtitle}
                  </p>

                  {/* Due Date Badge (Tomorrow / Today in soft red pill with calendar icon) */}
                  <div className="mt-2.5 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 rounded-md bg-[#EF4444]/10 border border-[#EF4444]/20 px-2 py-0.5 text-[11px] font-medium text-[#EF4444]">
                      <Calendar size={11} strokeWidth={2.2} />
                      <span>{task.dueLabel}</span>
                    </span>
                  </div>
                </div>
              </div>
            );
          }))}
        </div>
      </article>

      {/* Widget 2: Learner PRO Subscriptions & Access Control (Admin Monitor) */}
      <article className="overflow-hidden rounded-xl bg-[#FFFFFF] border border-[#EAECEF] shadow-[0_2px_8px_rgba(16,15,17,0.04)]">
        <div
          className="p-5 border-b border-[#EAECEF]"
          style={{
            background:
              "linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 65%, #FFFFFF 100%)",
          }}
        >
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-[#F59E0B]/15 border border-[#F59E0B]/30 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-[#B45309]">
              <Zap size={11} fill="currentColor" />
              Learner Subscriptions
            </span>
            <span className="text-[11px] font-semibold text-[#92400E]">
              {
                leaderboard.filter(
                  (s) =>
                    (learnerSubscriptions?.[s.name] ??
                      learnerSubscriptions?.[s.name.toLowerCase()]) === "PRO"
                ).length
              }{" "}
              Active PRO Learners
            </span>
          </div>

          <h2 className="text-sm font-bold text-[#121215]">
            Student PRO Membership Control
          </h2>
          <p className="mt-0.5 text-xs text-[#5E5E5E]">
            Toggle PRO access for any learner. Syncs immediately with the
            Learner Portal.
          </p>
        </div>

        <div className="p-4 space-y-2.5">
          {leaderboard.length === 0 ? (
            <div className="py-6 text-center text-xs text-[#9CA3AF]">
              Belum ada data learner terdaftar.
            </div>
          ) : (
            leaderboard.map((student) => {
            const tier =
              learnerSubscriptions?.[student.name] ??
              learnerSubscriptions?.[student.name.toLowerCase()] ??
              "Free";
            const isPro = tier === "PRO";

            return (
              <div
                key={student.name}
                className="flex items-center justify-between gap-3 rounded-lg bg-[#F8F9FB] px-3 py-2 border border-[#EAECEF]"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {(() => {
                    const studentAvatar = resolveUserAvatar(student.name);
                    if (studentAvatar) {
                      return (
                        <img
                          src={studentAvatar}
                          alt={student.name}
                          className="h-7 w-7 shrink-0 rounded-full object-cover border border-[#EAECEF]"
                        />
                      );
                    }
                    return (
                      <span
                        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                        style={{
                          backgroundColor: student.avatarBg,
                          color: student.avatarText,
                        }}
                      >
                        {student.initials}
                      </span>
                    );
                  })()}
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#121215] truncate">
                      {student.name}
                    </p>
                    <p className="text-[10px] text-[#5E5E5E] truncate">
                      {student.role}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    toggleStudentProByAdmin(student.name);
                    onShowToast(
                      `Switched ${student.name} to ${
                        isPro ? "Free Tier" : "Learner PRO"
                      } (synced to Learner Portal).`
                    );
                  }}
                  aria-pressed={isPro}
                  className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-bold border transition-all cursor-pointer shrink-0 ${
                    isPro
                      ? "bg-[#FEF3C7] text-[#B45309] border-[#F59E0B]/40 hover:bg-[#FDE68A]"
                      : "bg-[#FFFFFF] text-[#5E5E5E] border-[#EAECEF] hover:border-[#4F39F6] hover:text-[#4F39F6]"
                  }`}
                >
                  {isPro ? (
                    <>
                      <Zap size={11} fill="currentColor" />
                      <span>PRO Active</span>
                    </>
                  ) : (
                    <span>Free • Grant PRO</span>
                  )}
                </button>
              </div>
            );
          }))}
        </div>
      </article>
    </div>
  );
}
