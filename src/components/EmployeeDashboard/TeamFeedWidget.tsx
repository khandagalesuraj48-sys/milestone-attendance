import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { User, WorkAnniversaryItem, UpcomingBirthday } from '../../types';
import { EmployeeAvatar } from '../common/EmployeeAvatar';
import {
  Sparkles,
  Cake,
  Award,
  Users,
  Building2,
  Calendar,
  PartyPopper,
  ChevronRight,
  Sun,
  Sunrise,
  Sunset,
  Moon,
} from 'lucide-react';

interface TeamFeedWidgetProps {
  user?: User | null;
}

export const TeamFeedWidget: React.FC<TeamFeedWidgetProps> = ({ user }) => {
  const [feedData, setFeedData] = useState<{
    newTeamMembers: Array<{
      employeeId: string;
      employeeName: string;
      designation: string;
      siteName: string;
      photoUrl?: string;
      joiningDate?: string;
    }>;
    upcomingBirthdays: UpcomingBirthday[];
    workAnniversaries: WorkAnniversaryItem[];
    myMilestone: { months: number; text: string } | null;
  } | null>(null);

  const [activeTab, setActiveTab] = useState<'ANNOUNCEMENTS' | 'BIRTHDAYS' | 'ANNIVERSARIES'>('ANNOUNCEMENTS');
  const [loading, setLoading] = useState<boolean>(true);

  // Compute dynamic time-of-day greeting in IST
  const getGreeting = () => {
    try {
      const now = new Date();
      const istHourStr = now.toLocaleTimeString('en-US', {
        timeZone: 'Asia/Kolkata',
        hour12: false,
        hour: '2-digit',
      });
      const hour = parseInt(istHourStr, 10);
      const firstName = user?.fullName ? user.fullName.split(' ')[0] : 'Colleague';

      if (hour >= 5 && hour < 12) {
        return { text: `Good Morning, ${firstName}`, icon: Sunrise, color: 'text-amber-500' };
      } else if (hour >= 12 && hour < 17) {
        return { text: `Good Afternoon, ${firstName}`, icon: Sun, color: 'text-amber-500' };
      } else if (hour >= 17 && hour < 21) {
        return { text: `Good Evening, ${firstName}`, icon: Sunset, color: 'text-orange-400' };
      } else {
        return { text: `Good Night, ${firstName}`, icon: Moon, color: 'text-indigo-400' };
      }
    } catch {
      return { text: `Welcome, ${user?.fullName || 'Colleague'}`, icon: Sun, color: 'text-amber-500' };
    }
  };

  useEffect(() => {
    const loadFeed = async () => {
      try {
        setLoading(true);
        const res = await api.getTeamFeed();
        if (res.success) {
          setFeedData(res);
        }
      } catch (err) {
        console.error('Failed to load team feed', err);
      } finally {
        setLoading(false);
      }
    };
    loadFeed();
  }, []);

  const greeting = getGreeting();
  const GreetingIcon = greeting.icon;

  return (
    <div id="team-feed-widget" className="space-y-4">
      {/* Dynamic Personal Header & Milestone Celebration */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 rounded-3xl p-6 sm:p-7 text-white shadow-sm border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <EmployeeAvatar
              name={user?.fullName || 'Staff'}
              imageUrl={user?.photoUrl}
              size="lg"
              className="ring-2 ring-amber-400/40"
            />
            <div>
              <div className="flex items-center space-x-2">
                <GreetingIcon className={`w-5 h-5 ${greeting.color}`} />
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
                  {greeting.text} <span className="inline-block animate-bounce">👋</span>
                </h1>
              </div>
              <p className="text-xs text-slate-300 mt-0.5 font-medium">
                {user?.designation || 'Staff Member'} &bull; {user?.department || 'Milestone Consultancy'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 self-start sm:self-auto">
            <div className="px-3.5 py-1.5 rounded-2xl bg-slate-800/80 border border-slate-700/60 text-xs font-semibold text-amber-400 flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Ready for Duty</span>
            </div>
          </div>
        </div>

        {/* Milestone Banner if applicable */}
        {feedData?.myMilestone && (
          <div className="mt-5 p-4 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center space-x-3 text-amber-200 text-xs">
            <PartyPopper className="w-5 h-5 text-amber-400 shrink-0" />
            <div className="font-semibold">
              <span>{feedData.myMilestone.text}</span>
            </div>
          </div>
        )}
      </div>

      {/* Team Feed & Camaraderie Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs text-slate-900">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 flex-wrap gap-2">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-extrabold tracking-wide uppercase text-slate-900">
              Team Highlights & Camaraderie
            </h2>
          </div>

          {/* Quick Sub-tab selector */}
          <div className="flex items-center space-x-1 p-1 bg-slate-100 rounded-xl text-[11px] font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('ANNOUNCEMENTS')}
              className={`px-3 py-1 rounded-lg transition ${
                activeTab === 'ANNOUNCEMENTS'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              New Members
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('BIRTHDAYS')}
              className={`px-3 py-1 rounded-lg transition ${
                activeTab === 'BIRTHDAYS'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Birthdays
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ANNIVERSARIES')}
              className={`px-3 py-1 rounded-lg transition ${
                activeTab === 'ANNIVERSARIES'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Milestones
            </button>
          </div>
        </div>

        <div className="mt-4">
          {/* Tab 1: New Team Members */}
          {activeTab === 'ANNOUNCEMENTS' && (
            <div className="space-y-3">
              {feedData?.newTeamMembers && feedData.newTeamMembers.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {feedData.newTeamMembers.map((member) => (
                    <div
                      key={member.employeeId}
                      className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/80 flex items-center space-x-3 hover:bg-slate-50 transition"
                    >
                      <EmployeeAvatar
                        name={member.employeeName}
                        imageUrl={member.photoUrl}
                        size="md"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {member.employeeName}
                          </span>
                          <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 shrink-0">
                            New
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 font-medium truncate mt-0.5">
                          {member.designation}
                        </p>
                        <p className="text-[10px] text-slate-400 font-medium truncate flex items-center space-x-1 mt-0.5">
                          <Building2 className="w-3 h-3 shrink-0" />
                          <span>{member.siteName}</span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-slate-400">
                  No new team announcements at this moment.
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Upcoming Birthdays */}
          {activeTab === 'BIRTHDAYS' && (
            <div className="space-y-3">
              {feedData?.upcomingBirthdays && feedData.upcomingBirthdays.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {feedData.upcomingBirthdays.map((bday) => (
                    <div
                      key={bday.employeeId}
                      className="p-3.5 rounded-2xl bg-amber-50/40 border border-amber-200/60 flex items-center space-x-3"
                    >
                      <EmployeeAvatar
                        name={bday.employeeName}
                        imageUrl={bday.photoUrl}
                        size="md"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {bday.employeeName}
                          </span>
                          <span className="text-[11px] font-bold text-amber-700 bg-amber-100/90 px-2 py-0.5 rounded-md flex items-center space-x-1 shrink-0">
                            <Cake className="w-3 h-3 text-amber-600" />
                            <span>{bday.birthdayDate}</span>
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 font-medium truncate mt-0.5">
                          {bday.designation} &bull; {bday.siteName}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-slate-400">
                  No upcoming birthdays in the current window.
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Work Anniversaries */}
          {activeTab === 'ANNIVERSARIES' && (
            <div className="space-y-3">
              {feedData?.workAnniversaries && feedData.workAnniversaries.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {feedData.workAnniversaries.map((anniv) => {
                    const tenureStr = anniv.monthsCompleted >= 12
                      ? `${Math.floor(anniv.monthsCompleted / 12)} Year${Math.floor(anniv.monthsCompleted / 12) > 1 ? 's' : ''}`
                      : `${anniv.monthsCompleted} Months`;

                    return (
                      <div
                        key={anniv.employeeId}
                        className="p-3.5 rounded-2xl bg-purple-50/40 border border-purple-200/60 flex items-center space-x-3"
                      >
                        <EmployeeAvatar
                          name={anniv.employeeName}
                          imageUrl={anniv.photoUrl}
                          size="md"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-bold text-slate-900 truncate">
                              {anniv.employeeName}
                            </span>
                            <span className="text-[11px] font-extrabold text-purple-800 bg-purple-100 px-2 py-0.5 rounded-md flex items-center space-x-1 shrink-0">
                              <Award className="w-3 h-3 text-purple-600" />
                              <span>{tenureStr}</span>
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 font-medium truncate mt-0.5">
                            {anniv.designation} &bull; {anniv.siteName}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-slate-400">
                  No work anniversaries in this period.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
