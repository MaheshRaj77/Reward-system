'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { doc, collection, query, where, getDocs, addDoc, updateDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Spinner } from '@/components/ui';
import { TASK_CATEGORIES } from '@/lib/constants';
import { Star, CheckCircle2, Camera, X, Clock, AlertTriangle, Target, MessageSquare, ListTodo, History, ChevronDown } from 'lucide-react';
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
  isRedo?: boolean;
  redoReason?: string;
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
  const [expandedDoneTaskId, setExpandedDoneTaskId] = useState<string | null>(null);

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

    const childUnsub = onSnapshot(doc(db, 'children', childId), (childDoc) => {
      if (!childDoc.exists()) {
        router.push('/child/login');
        return;
      }
      setChild({ id: childDoc.id, ...childDoc.data() } as Child);
    });
    unsubscribers.push(childUnsub);

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
    let completionsList: { taskId: string; completedAt: Date; status: string; proofImageBase64?: string; parentReview?: string; redoRequested?: boolean; rejectionReason?: string }[] = [];

    const processData = () => {
      const taskCompletions = new Map<string, { completedAt: Date; status: string; proofImageBase64?: string; parentReview?: string; redoRequested?: boolean; rejectionReason?: string }[]>();
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

        // Check if there's a pending completion
        const hasPendingCompletion = completions.some(c => c.status === 'pending');
        if (hasPendingCompletion) return { canComplete: false, isPending: true };

        // Check if the latest completion was rejected with redo request - allow re-completion
        const hasRedoRequest = latestCompletion.status === 'rejected' && latestCompletion.redoRequested;
        if (hasRedoRequest) return { canComplete: true, isPending: false };

        // For one-time or no frequency tasks - can't complete again if already completed
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
          // Check if this is a redo task (has a rejected completion with redoRequested)
          const redoCompletion = completions.find(c => c.status === 'rejected' && c.redoRequested);

          assigned.push({
            ...taskData,
            id: taskId,
            hasCompletion: completions.length > 0,
            taskImageBase64: taskData.imageBase64 as string | undefined,
            isRedo: !!redoCompletion,
            redoReason: redoCompletion?.rejectionReason || undefined,
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
          parentReview: data.parentReview,
          redoRequested: data.redoRequested || false,
          rejectionReason: data.rejectionReason || null
        };
      });
      processData();
    });
    unsubscribers.push(completionsUnsub);

    return () => unsubscribers.forEach(unsub => unsub());
  }, [childId, router]);

  const handleCompleteClick = (task: TaskData) => {
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

      // Send Push Notification to Parents
      try {
        // Query parens of this family
        const parentsQuery = query(collection(db, 'parents'), where('familyId', '==', familyId));
        const parentsSnap = await getDocs(parentsQuery);

        parentsSnap.forEach(async (parentDoc) => {
          const parentData = parentDoc.data();
          if (parentData?.notifications?.push && parentData?.fcmToken) {
            await fetch('/api/notifications/send-notification', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                token: parentData.fcmToken,
                title: 'Task Completed! 🌟',
                body: `${child.name} just completed "${task.title}"`,
                url: '/approvals', // Direct to approvals page
              }),
            });
          }

          // Send Email
          if (parentData?.email && parentData?.notifications?.email !== false) {
            const { sendTaskCompletionEmail } = await import('@/lib/email/actions');
            await sendTaskCompletionEmail(
              parentData.email,
              parentData.name || 'Parent',
              child.name,
              task.title,
              task.starValue
            );
          }
        });
      } catch (notifyErr) {
        console.error('Failed to send notification:', notifyErr);
        // Don't block UI for notification failure
      }

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
          <p className="mt-4 text-emerald-600 font-medium">Loading tasks...</p>
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
    <div className="space-y-5 pb-6">
      {/* Task Detail Modal */}
      {showPhotoModal && selectedTask && (() => {
        const category = TASK_CATEGORIES[selectedTask.category as keyof typeof TASK_CATEGORIES] || { icon: '📋', label: 'Task', color: '#6B7280' };
        return (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-xl max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{category.icon}</span>
                  <span className="font-medium text-gray-600">{category.label}</span>
                </div>
                <button
                  onClick={() => { setShowPhotoModal(false); setSelectedTask(null); setProofImage(null); }}
                  className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Content */}
              <div className="p-5 space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">{selectedTask.title}</h2>
                  {selectedTask.description && (
                    <p className="text-gray-500 mt-1">{selectedTask.description}</p>
                  )}
                </div>

                {/* Stars & Info */}
                <div className="flex flex-wrap gap-2">
                  <div className="flex items-center gap-1.5 bg-amber-50 text-amber-700 px-3 py-1.5 rounded-full text-sm font-semibold">
                    <Star size={14} fill="currentColor" /> +{selectedTask.starValue}
                  </div>
                  <div className="bg-gray-100 px-3 py-1.5 rounded-full text-sm text-gray-600">
                    {selectedTask.frequency?.type === 'daily' ? '📅 Daily' :
                      selectedTask.frequency?.type === 'weekly' ? '📅 Weekly' :
                        selectedTask.frequency?.type === 'monthly' ? '📅 Monthly' : '📌 One Time'}
                  </div>
                  {selectedTask.isAutoApproved && (
                    <div className="bg-emerald-50 px-3 py-1.5 rounded-full text-sm text-emerald-600">
                      ✓ Auto-Approve
                    </div>
                  )}
                </div>

                {/* Task Image */}
                {selectedTask.taskImageBase64 && (
                  <div>
                    <p className="text-xs text-gray-400 uppercase font-medium mb-2">Reference Image</p>
                    <div
                      className="relative w-full h-36 bg-gray-100 rounded-xl overflow-hidden cursor-pointer"
                      onClick={() => { setFullPhotoUrl(selectedTask.taskImageBase64 ?? null); setShowFullPhoto(true); }}
                    >
                      <Image src={selectedTask.taskImageBase64} alt="Task" fill className="object-cover" />
                    </div>
                  </div>
                )}

                {/* Photo Upload */}
                <div className="pt-3 border-t border-gray-100">
                  <p className="text-sm font-medium text-gray-700 mb-2">📸 Add Photo (Optional)</p>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleImageUpload}
                    className="hidden"
                  />

                  {proofImage ? (
                    <div className="relative mb-3">
                      <Image src={proofImage} alt="Proof" width={400} height={160} className="w-full h-36 object-cover rounded-xl" />
                      <button
                        onClick={() => setProofImage(null)}
                        className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-24 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center text-gray-400 hover:border-emerald-300 hover:text-emerald-500 hover:bg-emerald-50/50 transition-all mb-3"
                    >
                      <Camera size={24} className="mb-1" />
                      <span className="text-sm">Tap to add photo</span>
                    </button>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => { setShowPhotoModal(false); setSelectedTask(null); setProofImage(null); }}
                    className="flex-1 py-3 rounded-xl border border-gray-200 font-medium text-gray-600 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => { handleCompleteTask(selectedTask, proofImage); setShowPhotoModal(false); setSelectedTask(null); setProofImage(null); }}
                    disabled={completingTaskId === selectedTask.id}
                    className="flex-[2] py-3 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-600 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {completingTaskId === selectedTask.id ? (
                      <Spinner size="sm" />
                    ) : (
                      <><CheckCircle2 size={18} /> Complete</>
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
            <Image src={fullPhotoUrl} alt="Photo" width={800} height={600} className="max-w-full max-h-full object-contain rounded-xl" />
            <button onClick={() => setShowFullPhoto(false)} className="absolute top-4 right-4 p-2 bg-white/20 text-white rounded-full hover:bg-white/30">
              <X size={24} />
            </button>
          </div>
        </div>
      )}

      {/* Progress Header */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center gap-5">
          {/* Progress Ring */}
          <div className="relative w-16 h-16 flex-shrink-0">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="32" cy="32" r="26" stroke="currentColor" strokeWidth="6" fill="none" className="text-gray-100" />
              <circle
                cx="32" cy="32" r="26"
                stroke="currentColor"
                strokeWidth="6"
                fill="none"
                strokeDasharray={163}
                strokeDashoffset={163 - (progressPercent / 100) * 163}
                className="text-emerald-500 transition-all duration-500"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-lg font-bold text-gray-800">{progressPercent}%</span>
            </div>
          </div>

          <div>
            <h1 className="text-lg font-bold text-gray-800">
              {tasks.length === 0 ? "All Done! 🎉" : `${tasks.length} Tasks to Do`}
            </h1>
            <p className="text-sm text-gray-500">
              {tasks.length === 0
                ? "Great job! Check back later."
                : `Complete them to earn ${totalStarsAvailable} ⭐`}
            </p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl p-1 border border-gray-100 shadow-sm">
        <div className="flex">
          {[
            { id: 'todo' as TabType, label: 'To Do', icon: ListTodo, count: tasks.length },
            { id: 'pending' as TabType, label: 'Pending', icon: Clock, count: pendingApprovalTasks.length },
            { id: 'done' as TabType, label: 'Done', icon: CheckCircle2, count: completedTasks.length },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2.5 px-2 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-1.5
                ${activeTab === tab.id
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'text-gray-500 hover:bg-gray-50'}`}
            >
              <tab.icon size={16} />
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
      </div>

      {/* Task Cards */}
      {currentTasks.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100">
          <div className="w-16 h-16 mx-auto bg-gray-50 rounded-full flex items-center justify-center text-3xl mb-3">
            {activeTab === 'todo' ? '✅' : activeTab === 'pending' ? '⏳' : '📋'}
          </div>
          <h2 className="text-lg font-semibold text-gray-800 mb-1">
            {activeTab === 'todo' ? 'All Done!' : activeTab === 'pending' ? 'Nothing Pending' : 'No History Yet'}
          </h2>
          <p className="text-gray-500 text-sm">
            {activeTab === 'todo'
              ? "You've finished all your tasks! 🌟"
              : activeTab === 'pending'
                ? "Tasks waiting for approval will show here."
                : "Completed tasks will appear here."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {currentTasks.map((task) => {
            const category = TASK_CATEGORIES[task.category as keyof typeof TASK_CATEGORIES] || { icon: '📋', label: 'Task', color: '#6B7280' };
            const isCelebrated = celebrationTask === task.id;

            let isExpired = false;
            if (activeTab === 'todo' && task.deadline) {
              const deadlineDate = task.deadline.toDate ? task.deadline.toDate() : new Date(task.deadline.seconds * 1000);
              isExpired = deadlineDate < currentTime;
            }

            return activeTab === 'done' ? (
              <div
                key={task.id}
                className="bg-white rounded-xl overflow-hidden transition-all shadow-sm border border-gray-100 hover:border-gray-200"
              >
                {/* Compact Header - Always Visible */}
                <button
                  onClick={() => setExpandedDoneTaskId(expandedDoneTaskId === task.id ? null : task.id)}
                  className="w-full p-3 flex items-center gap-3 text-left"
                >
                  {/* Small Photo Thumbnail */}
                  {task.proofImageBase64 ? (
                    <div className="relative w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                      <Image src={task.proofImageBase64} alt="Proof" fill className="object-cover" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 flex-shrink-0 rounded-lg bg-emerald-50 flex items-center justify-center">
                      <CheckCircle2 size={20} className="text-emerald-500" />
                    </div>
                  )}

                  {/* Task Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-lg">{category.icon}</span>
                      <h3 className="font-medium text-gray-800 truncate">{task.title}</h3>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {task.completionStatus === 'not-done' ? (
                        <span className="text-xs text-red-500 font-medium flex items-center gap-1">
                          <AlertTriangle size={10} /> Missed
                        </span>
                      ) : (
                        <span className="text-xs text-emerald-600 font-medium">✓ Approved</span>
                      )}
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-amber-600 font-medium flex items-center gap-0.5">
                        <Star size={10} fill="currentColor" /> +{task.starValue}
                      </span>
                    </div>
                  </div>

                  {/* Expand Icon */}
                  <ChevronDown
                    size={18}
                    className={`text-gray-400 transition-transform flex-shrink-0 ${expandedDoneTaskId === task.id ? 'rotate-180' : ''
                      }`}
                  />
                </button>

                {/* Expanded Content */}
                {expandedDoneTaskId === task.id && (
                  <div className="px-4 pb-4 border-t border-gray-50 animate-in slide-in-from-top-2 duration-200">
                    {/* Description */}
                    {task.description && (
                      <p className="text-gray-500 text-sm mt-3">{task.description}</p>
                    )}

                    {/* Proof Photo - Large View */}
                    {task.proofImageBase64 && (
                      <div
                        className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden mt-3 cursor-pointer"
                        onClick={() => { setFullPhotoUrl(task.proofImageBase64 ?? null); setShowFullPhoto(true); }}
                      >
                        <Image src={task.proofImageBase64} alt="Proof" fill className="object-cover" />
                        <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors flex items-center justify-center">
                          <span className="opacity-0 hover:opacity-100 bg-white/90 px-3 py-1.5 rounded-full text-sm font-medium text-gray-700">
                            Tap to enlarge
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Badges */}
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${task.frequency?.type === 'daily' ? 'bg-blue-50 text-blue-600' :
                        task.frequency?.type === 'weekly' ? 'bg-purple-50 text-purple-600' :
                          task.frequency?.type === 'monthly' ? 'bg-indigo-50 text-indigo-600' :
                            'bg-gray-100 text-gray-600'
                        }`}>
                        {task.frequency?.type === 'daily' ? '🔄 Daily' :
                          task.frequency?.type === 'weekly' ? '🔄 Weekly' :
                            task.frequency?.type === 'monthly' ? '🔄 Monthly' : '📌 One Time'}
                      </span>
                      {task.completedAt && (
                        <span className="text-xs text-gray-400 px-2 py-0.5">
                          Completed {task.completedAt.toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    {/* Parent Review */}
                    {task.completionStatus === 'approved' && task.parentReview && (
                      <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 mt-3">
                        <p className="text-xs text-emerald-600 font-medium mb-1">💬 Parent&apos;s message</p>
                        <p className="text-gray-700 text-sm italic">&quot;{task.parentReview}&quot;</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* Regular Card for Todo and Pending Tabs */
              <div
                key={task.id}
                className={`bg-white rounded-xl overflow-hidden transition-all shadow-sm border
                  ${isCelebrated ? 'border-emerald-300 bg-emerald-50' :
                    isExpired ? 'border-red-200 bg-red-50/30' :
                      'border-gray-100 hover:border-gray-200'}`}
              >
                {/* Celebration Overlay */}
                {isCelebrated && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
                    <div className="text-center">
                      <div className="text-4xl mb-1">🎉</div>
                      <div className="font-bold text-emerald-600">Done!</div>
                    </div>
                  </div>
                )}

                <div className="p-4">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xl">{category.icon}</span>
                      <span className="text-sm text-gray-500">{category.label}</span>
                      {activeTab === 'todo' && task.isRedo && (
                        <span className="bg-orange-100 text-orange-700 text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                          🔄 Redo
                        </span>
                      )}
                      {activeTab === 'pending' && (
                        <span className="bg-amber-100 text-amber-700 text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Clock size={10} /> Pending
                        </span>
                      )}
                      {isExpired && (
                        <span className="bg-red-100 text-red-600 text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
                          <AlertTriangle size={10} /> Missed
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-1 rounded-full text-sm font-medium">
                      <Star size={12} fill="currentColor" /> +{task.starValue}
                    </div>
                  </div>

                  {/* Title & Description */}
                  <h3 className="font-semibold text-gray-800">{task.title}</h3>
                  {task.description && (
                    <p className="text-gray-500 text-sm mt-0.5 line-clamp-2">{task.description}</p>
                  )}

                  {/* Task Info - Frequency Badge */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${task.frequency?.type === 'daily' ? 'bg-blue-50 text-blue-600' :
                      task.frequency?.type === 'weekly' ? 'bg-purple-50 text-purple-600' :
                        task.frequency?.type === 'monthly' ? 'bg-indigo-50 text-indigo-600' :
                          'bg-gray-100 text-gray-600'
                      }`}>
                      {task.frequency?.type === 'daily' ? '🔄 Daily' :
                        task.frequency?.type === 'weekly' ? '🔄 Weekly' :
                          task.frequency?.type === 'monthly' ? '🔄 Monthly' : '📌 One Time'}
                    </span>
                    {task.isAutoApproved && (
                      <span className="bg-emerald-50 text-emerald-600 text-xs font-medium px-2 py-0.5 rounded-full">
                        ✓ Auto
                      </span>
                    )}
                  </div>

                  {/* Redo Reason from Parent */}
                  {activeTab === 'todo' && task.isRedo && task.redoReason && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mt-3">
                      <p className="text-xs text-orange-600 font-semibold mb-1">📝 Parent&apos;s feedback:</p>
                      <p className="text-gray-700 text-sm">&quot;{task.redoReason}&quot;</p>
                    </div>
                  )}

                  {/* Photo Preview for pending */}
                  {activeTab === 'pending' && task.proofImageBase64 && (
                    <div
                      className="relative w-full h-32 bg-gray-100 rounded-lg overflow-hidden mt-3 cursor-pointer"
                      onClick={() => { setFullPhotoUrl(task.proofImageBase64 ?? null); setShowFullPhoto(true); }}
                    >
                      <Image src={task.proofImageBase64} alt="Proof" fill className="object-cover" />
                    </div>
                  )}

                  {/* Action Buttons */}
                  {activeTab === 'todo' && (
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => setOpenChatTaskId(task.id)}
                        className="flex-1 py-2.5 rounded-lg bg-sky-50 text-sky-600 font-medium flex items-center justify-center gap-1.5 hover:bg-sky-100 transition-colors relative"
                      >
                        <MessageSquare size={16} /> Chat
                        {openChatTaskId !== task.id && (
                          <UnreadMessageBadge
                            taskId={task.id}
                            familyId={child.familyId}
                            childId={childId}
                            perspective="child"
                          />
                        )}
                      </button>
                      <button
                        onClick={() => handleCompleteClick(task)}
                        disabled={isExpired}
                        className={`flex-[2] py-2.5 rounded-lg font-medium flex items-center justify-center gap-1.5 transition-colors ${isExpired
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-emerald-500 text-white hover:bg-emerald-600'}`}
                      >
                        {completingTaskId === task.id ? (
                          <Spinner size="sm" />
                        ) : isExpired ? (
                          'Deadline Passed'
                        ) : (
                          <><CheckCircle2 size={16} /> Complete</>
                        )}
                      </button>
                    </div>
                  )}

                  {activeTab === 'pending' && (
                    <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 mt-3 text-center">
                      <div className="flex items-center justify-center gap-1.5 text-amber-700 font-medium text-sm">
                        <Clock size={14} /> Waiting for parent approval
                      </div>
                    </div>
                  )}

                  {/* Chat Overlay */}
                  {openChatTaskId === task.id && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
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
