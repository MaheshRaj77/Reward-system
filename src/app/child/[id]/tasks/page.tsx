'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { doc, collection, query, where, getDocs, addDoc, updateDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Spinner } from '@/components/ui';
import { TASK_CATEGORIES } from '@/lib/constants';
import { Star, CheckCircle2, Camera, X, Clock, AlertTriangle, Sparkles, Trophy, Target, Flame, ChevronRight, ListTodo, History, MessageSquare } from 'lucide-react';
import { triggerConfetti } from '@/components/ui/Confetti';
import { ChatOverlay } from '@/components/tasks/ChatOverlay';
import { UnreadMessageBadge } from '@/components/tasks/UnreadMessageBadge';
import type { Child, Task } from '@/types';

interface TaskData extends Task {
  isCompleting?: boolean;
  hasCompletion?: boolean;
  proofImageBase64?: string;
  completedAt?: Date;
  completionStatus?: string;
  parentReview?: string;
  taskImageBase64?: string;
}

type TabType = 'todo' | 'pending' | 'done';

export default function ChildTasksPage() {
  const params = useParams();
  const router = useRouter();
  const childId = params.id as string;

  const [child, setChild] = useState<Child | null>(null);
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [pendingApprovalTasks, setPendingApprovalTasks] = useState<TaskData[]>([]);
  const [completedTasks, setCompletedTasks] = useState<TaskData[]>([]);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [celebrationTask, setCelebrationTask] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('todo');
  const [openChatTaskId, setOpenChatTaskId] = useState<string | null>(null);

  // Photo upload state
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskData | null>(null);
  const [proofImage, setProofImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Full photo view
  const [showFullPhoto, setShowFullPhoto] = useState(false);
  const [fullPhotoUrl, setFullPhotoUrl] = useState<string | null>(null);

  // Dynamic time for deadline checking
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!childId) return;

    const unsubscribers: (() => void)[] = [];

    // Child data listener
    const childUnsub = onSnapshot(doc(db, 'children', childId), (childDoc) => {
      if (!childDoc.exists()) {
        router.push('/child/login');
        return;
      }
      setChild({ id: childDoc.id, ...childDoc.data() } as Child);
    });
    unsubscribers.push(childUnsub);

    // Tasks listener
    const tasksQuery = query(
      collection(db, 'tasks'),
      where('assignedChildIds', 'array-contains', childId),
      where('isActive', '==', true)
    );

    const completionsQuery = query(
      collection(db, 'taskCompletions'),
      where('childId', '==', childId)
    );

    let tasksList: { id: string; data: Record<string, unknown> }[] = [];
    let completionsList: { taskId: string; completedAt: Date; status: string; proofImageBase64?: string; parentReview?: string }[] = [];

    const processData = () => {
      const taskCompletions = new Map<string, { completedAt: Date; status: string; proofImageBase64?: string; parentReview?: string }[]>();
      completionsList.forEach(completion => {
        if (!taskCompletions.has(completion.taskId)) {
          taskCompletions.set(completion.taskId, []);
        }
        taskCompletions.get(completion.taskId)!.push(completion);
      });

      const canCompleteTask = (taskData: Record<string, unknown>, taskId: string): { canComplete: boolean; isPending: boolean } => {
        const completions = taskCompletions.get(taskId);
        if (!completions || completions.length === 0) return { canComplete: true, isPending: false };

        const frequencyType = (taskData.frequency as { type?: string })?.type;
        const taskType = taskData.taskType as string;

        const sortedCompletions = completions.sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime());
        const latestCompletion = sortedCompletions[0];

        const hasPendingCompletion = completions.some(c => c.status === 'pending');
        if (hasPendingCompletion) return { canComplete: false, isPending: true };

        if (!frequencyType || taskType === 'one-time') return { canComplete: false, isPending: false };

        const lastCompletion = latestCompletion.completedAt;
        const now = new Date();

        switch (frequencyType) {
          case 'daily': {
            const lastDate = new Date(lastCompletion);
            lastDate.setHours(0, 0, 0, 0);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return { canComplete: lastDate.getTime() < today.getTime(), isPending: false };
          }
          case 'weekly': {
            const getWeekStart = (date: Date) => {
              const d = new Date(date);
              d.setDate(d.getDate() - d.getDay());
              d.setHours(0, 0, 0, 0);
              return d;
            };
            return { canComplete: getWeekStart(lastCompletion).getTime() < getWeekStart(now).getTime(), isPending: false };
          }
          case 'monthly': {
            const lastMonth = lastCompletion.getMonth() + lastCompletion.getFullYear() * 12;
            const thisMonth = now.getMonth() + now.getFullYear() * 12;
            return { canComplete: lastMonth < thisMonth, isPending: false };
          }
          default:
            return { canComplete: true, isPending: false };
        }
      };

      const assigned: TaskData[] = [];
      const pending: TaskData[] = [];
      const completed: TaskData[] = [];
      const now = new Date();

      tasksList.forEach(({ id: taskId, data: taskData }) => {
        const completions = taskCompletions.get(taskId) || [];
        const { canComplete, isPending } = canCompleteTask(taskData, taskId);

        let isExpired = false;
        const deadlineData = taskData.deadline as { toDate?: () => Date; seconds?: number } | undefined;
        if (deadlineData) {
          const deadlineDate = deadlineData.toDate ? deadlineData.toDate() : new Date((deadlineData.seconds || 0) * 1000);
          isExpired = deadlineDate < now;
        }

        if (isPending) {
          const pendingCompletion = completions.find(c => c.status === 'pending');
          pending.push({
            ...taskData,
            id: taskId,
            hasCompletion: true,
            proofImageBase64: pendingCompletion?.proofImageBase64,
            completedAt: pendingCompletion?.completedAt,
            completionStatus: 'pending',
          } as TaskData);
        } else if (!canComplete) {
          const latestCompletion = completions.sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime())[0];
          completed.push({
            ...taskData,
            id: taskId,
            hasCompletion: true,
            proofImageBase64: latestCompletion?.proofImageBase64,
            completedAt: latestCompletion?.completedAt,
            completionStatus: latestCompletion?.status,
            parentReview: latestCompletion?.parentReview,
            taskImageBase64: taskData.imageBase64 as string | undefined,
          } as TaskData);
        } else if (isExpired) {
          completed.push({
            ...taskData,
            id: taskId,
            hasCompletion: false,
            completedAt: deadlineData?.toDate ? deadlineData.toDate() : new Date((deadlineData?.seconds || 0) * 1000),
            completionStatus: 'not-done',
          } as TaskData);
        } else {
          assigned.push({
            ...taskData,
            id: taskId,
            hasCompletion: completions.length > 0,
            taskImageBase64: taskData.imageBase64 as string | undefined,
          } as TaskData);
        }
      });

      setTasks(assigned);
      setPendingApprovalTasks(pending);
      setCompletedTasks(completed);
      setLoading(false);
    };

    const tasksUnsub = onSnapshot(tasksQuery, (snapshot) => {
      tasksList = snapshot.docs.map(doc => ({ id: doc.id, data: doc.data() }));
      processData();
    });
    unsubscribers.push(tasksUnsub);

    const completionsUnsub = onSnapshot(completionsQuery, (snapshot) => {
      completionsList = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          taskId: data.taskId,
          completedAt: data.completedAt?.toDate?.() || new Date(data.completedAt?.seconds * 1000 || Date.now()),
          status: data.status,
          proofImageBase64: data.proofImageBase64,
          parentReview: data.parentReview
        };
      });
      processData();
    });
    unsubscribers.push(completionsUnsub);

    return () => unsubscribers.forEach(unsub => unsub());
  }, [childId, router]);

  const handleCompleteClick = (task: TaskData) => {
    // Always show photo modal as optional - child can choose to skip
    setSelectedTask(task);
    setShowPhotoModal(true);
    setProofImage(null);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('Image is too large! Please choose an image under 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => setProofImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleCompleteTask = async (task: TaskData, proofImageBase64: string | null) => {
    if (!child) return;

    const familyId = child.familyId;
    if (!familyId) {
      alert("Error: Family ID missing.");
      return;
    }

    // Check for existing completion
    const existingQuery = query(
      collection(db, 'taskCompletions'),
      where('taskId', '==', task.id),
      where('childId', '==', childId),
      where('status', 'in', ['pending', 'approved'])
    );
    const existingSnap = await getDocs(existingQuery);

    if (!existingSnap.empty) {
      const frequencyType = task.frequency?.type;
      const isRecurring = frequencyType && task.taskType !== 'one-time';

      if (isRecurring) {
        let canComplete = true;
        const now = new Date();

        existingSnap.docs.forEach(doc => {
          const data = doc.data();
          const completedAt = data.completedAt?.toDate?.() || new Date(data.completedAt?.seconds * 1000);

          if (frequencyType === 'daily') {
            const completionDate = new Date(completedAt);
            completionDate.setHours(0, 0, 0, 0);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (completionDate.getTime() >= today.getTime()) canComplete = false;
          } else if (frequencyType === 'weekly') {
            const getWeekStart = (date: Date) => {
              const d = new Date(date);
              d.setDate(d.getDate() - d.getDay());
              d.setHours(0, 0, 0, 0);
              return d;
            };
            if (getWeekStart(completedAt).getTime() >= getWeekStart(now).getTime()) canComplete = false;
          } else if (frequencyType === 'monthly') {
            const completionMonth = completedAt.getMonth() + completedAt.getFullYear() * 12;
            const thisMonth = now.getMonth() + now.getFullYear() * 12;
            if (completionMonth >= thisMonth) canComplete = false;
          }
        });

        if (!canComplete) {
          alert('Already completed for this period!');
          return;
        }
      } else {
        alert('Already completed!');
        return;
      }
    }

    setCompletingTaskId(task.id);

    try {
      const status = task.isAutoApproved ? 'approved' : 'pending';
      const starsAwarded = task.starValue || 0;

      await addDoc(collection(db, 'taskCompletions'), {
        taskId: task.id,
        childId,
        familyId,
        status,
        completedAt: serverTimestamp(),
        starsAwarded,
        starType: 'growth',
        proofImageBase64: proofImageBase64 || null,
      });

      if (status === 'approved') {
        const newGrowth = (child.starBalances?.growth || 0) + starsAwarded;
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        let newCurrentStreak = child.streaks?.currentStreak || 0;
        let newLongestStreak = child.streaks?.longestStreak || 0;

        const lastCompletionDate = child.streaks?.lastCompletionDate;
        if (lastCompletionDate) {
          const lastDate = new Date(lastCompletionDate.seconds * 1000);
          lastDate.setHours(0, 0, 0, 0);
          const daysDiff = Math.floor((now.getTime() - lastDate.getTime()) / (24 * 60 * 60 * 1000));

          if (daysDiff === 1) {
            newCurrentStreak++;
            newLongestStreak = Math.max(newLongestStreak, newCurrentStreak);
          } else if (daysDiff > 1) {
            newCurrentStreak = 1;
          }
        } else {
          newCurrentStreak = 1;
          newLongestStreak = Math.max(newLongestStreak, 1);
        }

        await updateDoc(doc(db, 'children', childId), {
          'starBalances.growth': newGrowth,
          'streaks.currentStreak': newCurrentStreak,
          'streaks.longestStreak': newLongestStreak,
          'streaks.lastCompletionDate': serverTimestamp(),
        });
      }

      setCelebrationTask(task.id);
      triggerConfetti();
      setTimeout(() => {
        setCelebrationTask(null);
        setTasks(prev => prev.filter(t => t.id !== task.id));
      }, 1500);

    } catch (error) {
      console.error('Error completing task:', error);
      alert("Failed to complete task.");
    } finally {
      setCompletingTaskId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-purple-400 font-bold animate-pulse">⚔️ Loading quests...</p>
        </div>
      </div>
    );
  }

  if (!child) return null;

  const totalTasks = tasks.length + pendingApprovalTasks.length + completedTasks.length;
  const completedCount = completedTasks.filter(t => t.completionStatus !== 'not-done').length;
  const progressPercent = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;
  const totalStarsAvailable = tasks.reduce((sum, t) => sum + (t.starValue || 0), 0);

  const currentTasks = activeTab === 'todo' ? tasks : activeTab === 'pending' ? pendingApprovalTasks : completedTasks;

  return (
    <div className="space-y-6 pb-6">
      {/* Task Detail Modal */}
      {showPhotoModal && selectedTask && (() => {
        const category = TASK_CATEGORIES[selectedTask.category as keyof typeof TASK_CATEGORIES] || { icon: '📋', label: 'Task', color: '#6B7280' };
        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto">
              {/* Header with task category */}
              <div className="p-5" style={{ backgroundColor: `${category.color}20` }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-3xl">{category.icon}</span>
                    <span className="font-bold" style={{ color: category.color }}>{category.label}</span>
                  </div>
                  <button
                    onClick={() => { setShowPhotoModal(false); setSelectedTask(null); setProofImage(null); }}
                    className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Task Content */}
              <div className="p-5 space-y-4">
                {/* Task Title & Description */}
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedTask.title}</h2>
                  {selectedTask.description && (
                    <p className="text-gray-500 mt-2">{selectedTask.description}</p>
                  )}
                </div>

                {/* Stars & Info */}
                <div className="flex flex-wrap gap-2">
                  <div className="inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-400 to-orange-400 text-white px-4 py-2 rounded-full text-base font-bold shadow-lg shadow-amber-200">
                    <Star size={18} fill="white" /> +{selectedTask.starValue} Stars
                  </div>
                  <div className="bg-gray-100 px-3 py-2 rounded-full text-sm font-semibold text-gray-600">
                    {selectedTask.frequency?.type === 'daily' ? '📅 Daily' :
                      selectedTask.frequency?.type === 'weekly' ? '📅 Weekly' :
                        selectedTask.frequency?.type === 'monthly' ? '📅 Monthly' : '📌 One Time'}
                  </div>
                  {selectedTask.isAutoApproved && (
                    <div className="bg-green-100 px-3 py-2 rounded-full text-sm font-semibold text-green-600">
                      ✨ Auto-Approve
                    </div>
                  )}
                </div>

                {/* Task Image (from parent) */}
                {selectedTask.taskImageBase64 && (
                  <div>
                    <p className="text-xs text-gray-400 uppercase font-semibold mb-2">📷 Task Reference Image</p>
                    <div
                      className="relative w-full h-40 bg-gray-100 rounded-xl overflow-hidden cursor-pointer"
                      onClick={() => { setFullPhotoUrl(selectedTask.taskImageBase64 ?? null); setShowFullPhoto(true); }}
                    >
                      <Image src={selectedTask.taskImageBase64} alt="Task" fill className="object-cover" />
                    </div>
                  </div>
                )}

                {/* Divider */}
                <div className="border-t border-gray-100 pt-4">
                  <p className="text-sm font-bold text-gray-700 mb-3">📸 Add Photo Proof (Optional)</p>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleImageUpload}
                    className="hidden"
                  />

                  {proofImage ? (
                    <div className="relative mb-4">
                      <Image src={proofImage} alt="Proof" width={400} height={200} className="w-full h-40 object-cover rounded-2xl" />
                      <button
                        onClick={() => setProofImage(null)}
                        className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-28 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-gray-400 hover:border-purple-400 hover:text-purple-500 hover:bg-purple-50/50 transition-all mb-4 group"
                    >
                      <Camera size={28} className="mb-1 group-hover:scale-110 transition-transform" />
                      <span className="font-semibold text-sm">Tap to add photo</span>
                    </button>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => { setShowPhotoModal(false); setSelectedTask(null); setProofImage(null); }}
                    className="flex-1 py-3.5 rounded-xl border-2 border-gray-200 font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <Link
                    href={`/child/${childId}/chat?taskId=${selectedTask.id}`}
                    className="py-3.5 px-4 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold hover:from-blue-600 hover:to-cyan-600 transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
                    onClick={() => { setShowPhotoModal(false); setSelectedTask(null); setProofImage(null); }}
                  >
                    <MessageSquare size={18} />
                  </Link>
                  <button
                    onClick={() => { handleCompleteTask(selectedTask, proofImage); setShowPhotoModal(false); setSelectedTask(null); setProofImage(null); }}
                    disabled={completingTaskId === selectedTask.id}
                    className="flex-[2] py-3.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold hover:from-green-600 hover:to-emerald-600 transition-all shadow-lg shadow-green-200 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {completingTaskId === selectedTask.id ? (
                      <Spinner size="sm" />
                    ) : (
                      <><CheckCircle2 size={18} /> {proofImage ? 'Complete with Photo' : 'Mark Complete'}</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Full Photo Modal */}
      {showFullPhoto && fullPhotoUrl && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setShowFullPhoto(false)}>
          <div className="relative max-w-4xl max-h-full">
            <Image src={fullPhotoUrl} alt="Task proof" width={800} height={600} className="max-w-full max-h-full object-contain rounded-2xl" />
            <button onClick={() => setShowFullPhoto(false)} className="absolute top-4 right-4 p-3 bg-white/20 text-white rounded-full hover:bg-white/30 transition-colors">
              <X size={24} />
            </button>
          </div>
        </div>
      )}

      {/* Hero Section with Progress */}
      <div className="bg-gradient-to-br from-slate-800 via-purple-900/80 to-slate-800 rounded-3xl p-6 text-white relative overflow-hidden border border-purple-500/30 shadow-2xl shadow-purple-500/20">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-500/20 rounded-full blur-2xl" />
        <div className="absolute top-1/2 right-1/4 w-2 h-2 bg-yellow-300 rounded-full animate-pulse" />
        <div className="absolute top-1/3 right-1/3 w-1.5 h-1.5 bg-cyan-300 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />

        <div className="relative z-10 flex items-center gap-5">
          {/* Progress Ring */}
          <div className="relative w-24 h-24 flex-shrink-0">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="none" className="text-slate-700" />
              <circle
                cx="48" cy="48" r="40"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeDasharray={251}
                strokeDashoffset={251 - (progressPercent / 100) * 251}
                className="text-cyan-400 transition-all duration-1000 drop-shadow-lg"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-black text-cyan-300">{progressPercent}%</span>
              <span className="text-[10px] font-bold text-slate-400">COMPLETE</span>
            </div>
          </div>

          <div className="flex-1">
            <h1 className="text-2xl font-black mb-1">
              {tasks.length === 0 ? "All Quests Done! �" : `${tasks.length} Quests Active`}
            </h1>
            <p className="text-purple-300 font-medium text-sm">
              {tasks.length === 0
                ? "You're legendary! Check back for new quests."
                : `Complete them to earn ${totalStarsAvailable} ⭐`}
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="relative z-10 grid grid-cols-3 gap-3 mt-5">
          <div className="bg-amber-900/40 backdrop-blur-sm rounded-xl p-3 text-center border border-amber-500/30">
            <div className="text-xl font-black text-yellow-300">{child.starBalances?.growth || 0}</div>
            <div className="text-[10px] font-bold text-amber-400/80 uppercase">Gold</div>
          </div>
          <div className="bg-orange-900/40 backdrop-blur-sm rounded-xl p-3 text-center border border-orange-500/30">
            <div className="text-xl font-black text-orange-300">{child.streaks?.currentStreak || 0}</div>
            <div className="text-[10px] font-bold text-orange-400/80 uppercase">Streak 🔥</div>
          </div>
          <div className="bg-green-900/40 backdrop-blur-sm rounded-xl p-3 text-center border border-green-500/30">
            <div className="text-xl font-black text-green-300">{completedCount}</div>
            <div className="text-[10px] font-bold text-green-400/80 uppercase">Conquered</div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-slate-800/60 rounded-2xl p-1.5 border border-slate-700/50">
        <div className="flex">
          {[
            { id: 'todo' as TabType, label: 'Active', icon: ListTodo, count: tasks.length, gradient: 'from-orange-500 to-red-600' },
            { id: 'pending' as TabType, label: 'Pending', icon: Clock, count: pendingApprovalTasks.length, gradient: 'from-amber-500 to-yellow-600' },
            { id: 'done' as TabType, label: 'Done', icon: CheckCircle2, count: completedTasks.length, gradient: 'from-green-500 to-emerald-600' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 px-2 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-1.5
                ${activeTab === tab.id
                  ? `bg-gradient-to-r ${tab.gradient} text-white shadow-lg`
                  : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'}`}
            >
              <tab.icon size={16} />
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
      </div>

      {/* Task Cards */}
      {currentTasks.length === 0 ? (
        <div className="bg-slate-800/60 rounded-3xl p-10 text-center border border-slate-700/50">
          <div className="w-20 h-20 mx-auto bg-slate-700/50 rounded-full flex items-center justify-center text-4xl mb-4">
            {activeTab === 'todo' ? '�' : activeTab === 'pending' ? '⏳' : '📋'}
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {activeTab === 'todo' ? 'All Caught Up!' : activeTab === 'pending' ? 'Nothing Pending' : 'No Completed Tasks'}
          </h2>
          <p className="text-gray-500 max-w-xs mx-auto">
            {activeTab === 'todo'
              ? "You've completed all your tasks. Amazing work! 🌟"
              : activeTab === 'pending'
                ? "Tasks awaiting parent approval will appear here."
                : "Complete some tasks to see your achievements here!"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {currentTasks.map((task) => {
            const category = TASK_CATEGORIES[task.category as keyof typeof TASK_CATEGORIES] || { icon: '📋', label: 'Task', color: '#6B7280' };
            const isCelebrated = celebrationTask === task.id;

            let isExpired = false;
            if (activeTab === 'todo' && task.deadline) {
              const deadlineDate = task.deadline.toDate ? task.deadline.toDate() : new Date(task.deadline.seconds * 1000);
              isExpired = deadlineDate < currentTime;
            }

            return (
              <div
                key={task.id}
                className={`bg-white rounded-3xl overflow-hidden transition-all shadow-sm hover:shadow-xl border-2
                  ${isCelebrated ? 'border-green-400 scale-[1.02] bg-green-50' :
                    isExpired ? 'border-red-200 bg-red-50/50' :
                      'border-transparent hover:border-purple-200'}`}
              >
                {/* Celebration Overlay */}
                {isCelebrated && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-10">
                    <div className="text-center animate-bounce">
                      <div className="text-5xl mb-2">🎉</div>
                      <div className="font-black text-green-600 text-xl">Awesome!</div>
                    </div>
                  </div>
                )}

                {/* Card Header */}
                <div className="px-5 py-3 flex items-center justify-between" style={{ backgroundColor: `${category.color}15` }}>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{category.icon}</span>
                    <span className="font-bold text-sm" style={{ color: category.color }}>{category.label}</span>

                    {/* Status Badges */}
                    {activeTab === 'pending' && (
                      <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                        <Clock size={10} /> Awaiting Review
                      </span>
                    )}
                    {activeTab === 'done' && task.completionStatus !== 'not-done' && (
                      <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 size={10} /> Approved
                      </span>
                    )}
                    {(isExpired || task.completionStatus === 'not-done') && (
                      <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <AlertTriangle size={10} /> Missed
                      </span>
                    )}
                    {activeTab === 'todo' && !isExpired && task.proofRequired === 'photo' && (
                      <span className="bg-purple-100 text-purple-600 text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Camera size={10} /> Photo
                      </span>
                    )}
                  </div>

                  {/* Star Value */}
                  <div className="flex items-center gap-1 bg-amber-100 text-amber-700 px-3 py-1 rounded-full font-bold text-sm">
                    <Star size={14} fill="currentColor" />
                    +{task.starValue}
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-5">
                  <h3 className="font-bold text-xl text-gray-900 mb-1">{task.title}</h3>
                  {task.description && (
                    <p className="text-gray-500 text-sm mb-4">{task.description}</p>
                  )}

                  {/* Photo Preview */}
                  {(activeTab === 'pending' || activeTab === 'done') && task.proofImageBase64 && (
                    <div
                      className="relative w-full h-40 bg-gray-100 rounded-xl overflow-hidden mb-4 cursor-pointer group"
                      onClick={() => { setFullPhotoUrl(task.proofImageBase64 ?? null); setShowFullPhoto(true); }}
                    >
                      <Image src={task.proofImageBase64} alt="Proof" fill className="object-cover" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                        <span className="opacity-0 group-hover:opacity-100 bg-white/90 px-3 py-1.5 rounded-full text-sm font-bold text-gray-800 transition-opacity">
                          View Full Photo
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Parent Review (for approved tasks) */}
                  {activeTab === 'done' && task.completionStatus === 'approved' && task.parentReview && (
                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl p-4 mb-4">
                      <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold uppercase mb-2">
                        <Sparkles size={14} />
                        Parent's Message
                      </div>
                      <p className="text-gray-700 italic">"{task.parentReview}"</p>
                    </div>
                  )}

                  {/* Task Info Pills */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <div className="bg-gray-50 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600">
                      {task.frequency?.type === 'daily' ? '📅 Daily' :
                        task.frequency?.type === 'weekly' ? '📅 Weekly' :
                          task.frequency?.type === 'monthly' ? '📅 Monthly' : '📌 One Time'}
                    </div>
                    {task.isAutoApproved && (
                      <div className="bg-green-50 px-3 py-1.5 rounded-lg text-xs font-semibold text-green-600">
                        ✨ Auto-Approve
                      </div>
                    )}
                    {task.deadline && activeTab === 'todo' && !isExpired && (
                      <div className="bg-pink-50 px-3 py-1.5 rounded-lg text-xs font-semibold text-pink-600">
                        ⏰ Due {task.deadline.toDate ? task.deadline.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Soon'}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons Row */}
                  {activeTab === 'todo' && (
                    <div className="flex gap-2">
                      {/* Chat Button */}
                      <button
                        onClick={() => setOpenChatTaskId(task.id)}
                        disabled={openChatTaskId === task.id}
                        className={`flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 relative
                          ${openChatTaskId === task.id
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-200 hover:from-blue-600 hover:to-cyan-600'
                          }`}
                      >
                        <MessageSquare size={16} />
                        <span className="text-sm">{openChatTaskId === task.id ? 'Open' : 'Chat'}</span>
                        {openChatTaskId !== task.id && (
                          <UnreadMessageBadge
                            taskId={task.id}
                            familyId={child.familyId}
                            childId={childId}
                            perspective="child"
                          />
                        )}
                      </button>

                      {/* Photo Button */}
                      <button
                        onClick={() => handleCompleteClick(task)}
                        disabled={isExpired}
                        className={`flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 ${isExpired
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-200 hover:from-purple-600 hover:to-pink-600'
                          }`}
                      >
                        <Camera size={16} />
                        <span className="text-sm">Photo</span>
                      </button>

                      {/* Mark Complete Button */}
                      <button
                        onClick={() => handleCompleteTask(task, null)}
                        disabled={completingTaskId === task.id || isCelebrated || isExpired}
                        className={`flex-[1.5] py-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all shadow-lg active:scale-95
                          ${isExpired
                            ? 'bg-gray-200 text-gray-500 cursor-not-allowed shadow-none'
                            : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-green-200 hover:from-green-600 hover:to-emerald-600'}`}
                      >
                        {completingTaskId === task.id ? (
                          <Spinner size="sm" />
                        ) : isExpired ? (
                          <span className="text-sm">Deadline Passed</span>
                        ) : (
                          <>
                            <CheckCircle2 size={16} />
                            <span className="text-sm">Done</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {activeTab === 'pending' && (
                    <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-center">
                      <div className="flex items-center justify-center gap-2 text-orange-700 font-bold mb-1">
                        <Clock size={16} className="animate-pulse" />
                        Waiting for Parent Approval
                      </div>
                      <p className="text-sm text-orange-600">Your parent will review this soon!</p>
                    </div>
                  )}

                  {/* Chat Overlay */}
                  {openChatTaskId === task.id && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <ChatOverlay
                        taskId={task.id}
                        familyId={child.familyId}
                        childIds={[childId]}
                        currentUserId={childId}
                        currentUserType="child"
                        currentUserName={child.name}
                        onClose={() => setOpenChatTaskId(null)}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
