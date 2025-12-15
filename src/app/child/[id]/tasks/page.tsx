'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { doc, getDoc, collection, query, where, getDocs, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Spinner } from '@/components/ui';
import { TASK_CATEGORIES } from '@/lib/constants';
import { Star, Zap, CheckCircle2, MessageSquare, Calendar, Repeat, Camera, ShieldCheck, X, ImageIcon, Sparkles } from 'lucide-react';
import type { Child, Task } from '@/types';

interface TaskData extends Task {
  isCompleting?: boolean;
  hasCompletion?: boolean;
}

type CategoryFilter = 'all' | keyof typeof TASK_CATEGORIES;

export default function ChildTasks() {
  const params = useParams();
  const router = useRouter();
  const childId = params.id as string;

  const [child, setChild] = useState<Child | null>(null);
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [celebrationTask, setCelebrationTask] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');

  // Photo upload state
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskData | null>(null);
  const [proofImage, setProofImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, [childId]);

  const loadData = async () => {
    try {
      const childDoc = await getDoc(doc(db, 'children', childId));
      if (!childDoc.exists()) {
        router.push('/child/login');
        return;
      }
      const data = childDoc.data();
      setChild({ id: childDoc.id, ...data } as Child);

      // Get all tasks assigned to this child
      const tasksQuery = query(
        collection(db, 'tasks'),
        where('assignedChildIds', 'array-contains', childId),
        where('isActive', '==', true)
      );
      const tasksSnapshot = await getDocs(tasksQuery);

      // Get all completions for this child to filter out completed tasks
      const completionsQuery = query(
        collection(db, 'taskCompletions'),
        where('childId', '==', childId),
        where('status', 'in', ['pending', 'approved'])
      );
      const completionsSnapshot = await getDocs(completionsQuery);

      // Create a set of completed task IDs (for one-time tasks)
      // For recurring tasks, we need more complex logic based on date
      const completedTaskIds = new Set<string>();
      completionsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        completedTaskIds.add(data.taskId);
      });

      const tasksData: TaskData[] = [];
      tasksSnapshot.forEach((docSnap) => {
        const taskData = docSnap.data();
        const taskId = docSnap.id;

        // For one-time tasks, skip if already completed
        // For recurring tasks, we'd need date-based logic (simplified for now)
        const isOneTime = !taskData.frequency || taskData.taskType === 'one-time';
        if (isOneTime && completedTaskIds.has(taskId)) {
          return; // Skip completed one-time tasks
        }

        tasksData.push({
          ...taskData,
          id: taskId,
          hasCompletion: completedTaskIds.has(taskId),
        } as TaskData);
      });

      setTasks(tasksData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteClick = (task: TaskData) => {
    // If photo is required, show photo modal first
    if (task.proofRequired === 'photo') {
      setSelectedTask(task);
      setShowPhotoModal(true);
      setProofImage(null);
    } else {
      // No photo required, complete directly
      handleCompleteTask(task, null);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('Image is too large! Please choose an image under 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProofImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitWithPhoto = () => {
    if (!selectedTask || !proofImage) {
      alert('Please upload a photo as proof');
      return;
    }
    handleCompleteTask(selectedTask, proofImage);
    setShowPhotoModal(false);
    setSelectedTask(null);
    setProofImage(null);
  };

  const handleCompleteTask = async (task: TaskData, proofImageBase64: string | null) => {
    if (!child) return;

    const familyId = child.familyId;
    if (!familyId) {
      alert("Error: Family ID is missing. Please ask your parent to check your profile.");
      return;
    }

    // Double-check if already completed (prevent race conditions)
    const existingQuery = query(
      collection(db, 'taskCompletions'),
      where('taskId', '==', task.id),
      where('childId', '==', childId),
      where('status', 'in', ['pending', 'approved'])
    );
    const existingSnap = await getDocs(existingQuery);
    if (!existingSnap.empty) {
      alert('You have already completed this task!');
      setTasks(tasks.filter(t => t.id !== task.id));
      return;
    }

    setCompletingTaskId(task.id);

    try {
      const status = task.isAutoApproved ? 'approved' : 'pending';
      const starsAwarded = task.starValue || 0;

      // Create task completion with proof image
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

      // If auto-approved, update balance immediately
      if (status === 'approved') {
        const newGrowth = (child.starBalances?.growth || 0) + starsAwarded;

        await updateDoc(doc(db, 'children', childId), {
          'starBalances.growth': newGrowth,
          'streaks.lastCompletionDate': serverTimestamp(),
        });

        // Update local child state
        setChild({
          ...child,
          starBalances: {
            growth: newGrowth,
          }
        });
      }

      // Show celebration and remove task from list
      setCelebrationTask(task.id);
      setTimeout(() => {
        setCelebrationTask(null);
        setTasks(prevTasks => prevTasks.filter(t => t.id !== task.id));
      }, 1500);

    } catch (error) {
      console.error('Error completing task:', error);
      alert("Failed to complete task. Please try again.");
    } finally {
      setCompletingTaskId(null);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8"><Spinner size="lg" /></div>;
  }

  if (!child) return null;

  return (
    <div className="space-y-6">
      {/* Photo Upload Modal */}
      {showPhotoModal && selectedTask && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Upload Proof Photo</h3>
              <button
                onClick={() => {
                  setShowPhotoModal(false);
                  setSelectedTask(null);
                  setProofImage(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <p className="text-gray-500 mb-4 text-sm">
              Take or upload a photo to prove you completed <strong>&quot;{selectedTask.title}&quot;</strong>
            </p>

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
                <Image
                  src={proofImage}
                  alt="Proof"
                  width={400}
                  height={300}
                  className="w-full h-48 object-cover rounded-2xl"
                />
                <button
                  onClick={() => setProofImage(null)}
                  className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full shadow-lg"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-48 border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors mb-4"
              >
                <Camera size={48} className="mb-2" />
                <span className="font-medium">Tap to take photo</span>
                <span className="text-xs">or upload from gallery</span>
              </button>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowPhotoModal(false);
                  setSelectedTask(null);
                  setProofImage(null);
                }}
                className="flex-1 py-3 rounded-xl border border-gray-200 font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitWithPhoto}
                disabled={!proofImage}
                className="flex-1 py-3 rounded-xl bg-green-500 text-white font-semibold hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Submit ✓
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header Card - Enhanced */}
      <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-3xl p-6 text-white shadow-2xl shadow-purple-200 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full blur-xl -ml-8 -mb-8" />
        </div>
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm shadow-lg">
            <CheckCircle2 size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Your Tasks</h1>
            <p className="text-white/80 font-medium">
              {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'} waiting for you
            </p>
          </div>
          {tasks.length > 0 && (
            <div className="ml-auto flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl">
              <Sparkles size={18} />
              <span className="font-bold">{tasks.reduce((sum, t) => sum + t.starValue, 0)}</span>
              <span className="text-sm text-white/80">stars available</span>
            </div>
          )}
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 no-scrollbar">
        <button
          onClick={() => setCategoryFilter('all')}
          className={`flex-shrink-0 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${categoryFilter === 'all'
            ? 'bg-gray-900 text-white shadow-lg'
            : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
        >
          All Tasks ({tasks.length})
        </button>
        {(Object.entries(TASK_CATEGORIES) as [keyof typeof TASK_CATEGORIES, typeof TASK_CATEGORIES[keyof typeof TASK_CATEGORIES]][]).map(([key, cat]) => {
          const count = tasks.filter(t => t.category === key).length;
          if (count === 0) return null;
          return (
            <button
              key={key}
              onClick={() => setCategoryFilter(key)}
              className={`flex-shrink-0 px-4 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${categoryFilter === key
                ? 'bg-gray-900 text-white shadow-lg'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
            >
              <span>{cat.icon}</span>
              {cat.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Task List */}
      {(() => {
        const filteredTasks = categoryFilter === 'all'
          ? tasks
          : tasks.filter(t => t.category === categoryFilter);

        if (filteredTasks.length === 0) {
          return (
            <div className="bg-white/60 backdrop-blur-md rounded-3xl p-12 text-center border border-white/60 shadow-sm">
              <div className="text-6xl mb-4 animate-bounce" style={{ animationDuration: '2s' }}>🎉</div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                {tasks.length === 0 ? 'All Caught Up!' : 'No Tasks Here'}
              </h2>
              <p className="text-gray-500">
                {tasks.length === 0
                  ? "You've completed all your tasks. Great job!"
                  : "Try selecting a different category."}
              </p>
            </div>
          );
        }

        return (
          <div className="grid gap-4">
            {filteredTasks.map((task) => {
              const categoryConfig = TASK_CATEGORIES[task.category as keyof typeof TASK_CATEGORIES] || {
                icon: '📋',
                label: 'Task',
                color: '#6B7280',
              };

              const isCelebrated = celebrationTask === task.id;

              return (
                <div
                  key={task.id}
                  className={`relative group bg-white border border-gray-100 rounded-3xl overflow-hidden hover:border-indigo-200 transition-all hover:shadow-lg ${isCelebrated ? 'scale-105 ring-2 ring-green-400 bg-green-50' : ''}`}
                >
                  {isCelebrated && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-10">
                      <div className="text-center animate-in zoom-in spin-in-12 duration-500">
                        <div className="text-4xl mb-2">🎉</div>
                        <div className="font-bold text-green-600 text-lg">Awesome!</div>
                      </div>
                    </div>
                  )}

                  {/* Header with category color */}
                  <div
                    className="px-5 py-3 flex items-center justify-between"
                    style={{ backgroundColor: `${categoryConfig.color}10` }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{categoryConfig.icon}</span>
                      <span className="text-sm font-semibold" style={{ color: categoryConfig.color }}>
                        {categoryConfig.label}
                      </span>
                      {task.proofRequired === 'photo' && (
                        <span className="bg-purple-100 text-purple-600 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Camera size={10} /> Photo Required
                        </span>
                      )}
                    </div>
                    <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-bold
                        ${task.starType === 'growth' ? 'bg-amber-100 text-amber-700' : 'bg-pink-100 text-pink-700'}`}>
                      {task.starType === 'growth' ? <Star size={14} fill="currentColor" /> : <Zap size={14} fill="currentColor" />}
                      +{task.starValue}
                    </div>
                  </div>

                  {/* Main Content */}
                  <div className="p-5">
                    <h3 className="font-bold text-xl text-gray-900 leading-tight mb-2">{task.title}</h3>

                    {task.description && (
                      <p className="text-gray-500 text-sm leading-relaxed mb-4">{task.description}</p>
                    )}

                    {/* Task Details Grid */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      {/* Frequency */}
                      <div className="bg-slate-50 rounded-xl p-3 flex items-center gap-2">
                        <Repeat size={16} className="text-indigo-500" />
                        <div>
                          <div className="text-[10px] text-slate-400 uppercase font-bold">Frequency</div>
                          <div className="text-sm font-semibold text-slate-700">
                            {task.frequency?.type === 'daily' ? 'Daily' :
                              task.frequency?.type === 'weekly' ? 'Weekly' :
                                task.frequency?.type === 'monthly' ? 'Monthly' : 'One Time'}
                          </div>
                        </div>
                      </div>

                      {/* Deadline */}
                      <div className="bg-slate-50 rounded-xl p-3 flex items-center gap-2">
                        <Calendar size={16} className="text-pink-500" />
                        <div>
                          <div className="text-[10px] text-slate-400 uppercase font-bold">Deadline</div>
                          <div className="text-sm font-semibold text-slate-700">
                            {task.deadline?.toDate?.()
                              ? task.deadline.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                              : 'No deadline'}
                          </div>
                        </div>
                      </div>

                      {/* Proof Required */}
                      <div className="bg-slate-50 rounded-xl p-3 flex items-center gap-2">
                        <Camera size={16} className="text-purple-500" />
                        <div>
                          <div className="text-[10px] text-slate-400 uppercase font-bold">Proof</div>
                          <div className="text-sm font-semibold text-slate-700 capitalize">
                            {task.proofRequired || 'None'}
                          </div>
                        </div>
                      </div>

                      {/* Approval */}
                      <div className="bg-slate-50 rounded-xl p-3 flex items-center gap-2">
                        <ShieldCheck size={16} className="text-green-500" />
                        <div>
                          <div className="text-[10px] text-slate-400 uppercase font-bold">Approval</div>
                          <div className="text-sm font-semibold text-slate-700">
                            {task.isAutoApproved ? 'Auto ✨' : 'Parent'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="px-5 pb-5 flex gap-3">
                    {/* Chat Button (if enabled) */}
                    {task.isChatEnabled && (
                      <Link
                        href={`/child/${childId}/chat?taskId=${task.id}`}
                        className="flex-1 py-3 rounded-xl font-bold text-sm bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all flex items-center justify-center gap-2 border border-blue-100"
                      >
                        <MessageSquare size={16} />
                        Ask Question
                      </Link>
                    )}

                    {/* Complete Button */}
                    <button
                      onClick={() => handleCompleteClick(task)}
                      disabled={completingTaskId === task.id || isCelebrated}
                      className={`${task.isChatEnabled ? 'flex-1' : 'w-full'} py-3 rounded-xl font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-2
                             ${completingTaskId === task.id
                          ? 'bg-gray-100 text-gray-400 cursor-wait'
                          : task.proofRequired === 'photo'
                            ? 'bg-purple-600 text-white hover:bg-purple-700 hover:shadow-lg active:scale-[0.98]'
                            : 'bg-gray-900 text-white hover:bg-indigo-600 hover:shadow-lg active:scale-[0.98]'
                        }`}
                    >
                      {completingTaskId === task.id ? (
                        <Spinner size="sm" />
                      ) : task.proofRequired === 'photo' ? (
                        <><Camera size={16} /> Upload Photo & Complete</>
                      ) : (
                        <>Mark Complete <CheckCircle2 size={16} /></>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}
    </div>
  );
}
