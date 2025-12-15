'use client';

interface StatsWidgetProps {
    totalStars: number;
    activeTasks: number;
    totalCompletions: number;
    familyStreak: number;
}

export function StatsWidget({ totalStars, activeTasks, totalCompletions, familyStreak }: StatsWidgetProps) {
    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* Total Stars */}
            <div className="bg-white/80 backdrop-blur-md border border-white/60 rounded-2xl p-4 flex items-center gap-4 transition-transform hover:scale-105 hover:shadow-lg hover:shadow-amber-100 shadow-sm shadow-indigo-100/50 group">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center text-2xl shadow-inner group-hover:scale-110 transition-transform text-amber-600">
                    ⭐
                </div>
                <div>
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Total Stars</p>
                    <h3 className="text-2xl font-bold text-gray-900">{totalStars}</h3>
                </div>
            </div>

            {/* Active Tasks */}
            <div className="bg-white/80 backdrop-blur-md border border-white/60 rounded-2xl p-4 flex items-center gap-4 transition-transform hover:scale-105 hover:shadow-lg hover:shadow-blue-100 shadow-sm shadow-indigo-100/50 group">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-2xl shadow-inner group-hover:scale-110 transition-transform text-indigo-600">
                    📝
                </div>
                <div>
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Active Tasks</p>
                    <h3 className="text-2xl font-bold text-gray-900">{activeTasks}</h3>
                </div>
            </div>

            {/* Completions */}
            <div className="bg-white/80 backdrop-blur-md border border-white/60 rounded-2xl p-4 flex items-center gap-4 transition-transform hover:scale-105 hover:shadow-lg hover:shadow-green-100 shadow-sm shadow-indigo-100/50 group">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center text-2xl shadow-inner group-hover:scale-110 transition-transform text-emerald-600">
                    ✅
                </div>
                <div>
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Completed</p>
                    <h3 className="text-2xl font-bold text-gray-900">{totalCompletions}</h3>
                </div>
            </div>

            {/* Family Streak */}
            <div className="bg-white/80 backdrop-blur-md border border-white/60 rounded-2xl p-4 flex items-center gap-4 transition-transform hover:scale-105 hover:shadow-lg hover:shadow-orange-100 shadow-sm shadow-indigo-100/50 group">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-100 to-red-100 flex items-center justify-center text-2xl shadow-inner group-hover:scale-110 transition-transform text-orange-600">
                    🔥
                </div>
                <div>
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Best Streak</p>
                    <h3 className="text-2xl font-bold text-gray-900">{familyStreak}</h3>
                </div>
            </div>
        </div>
    );
}
