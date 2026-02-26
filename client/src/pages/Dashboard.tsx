import React, { useState, useMemo, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { useAppContext } from '../context/AppContext';
import Card from '../components/ui/Card';

const Dashboard: React.FC = () => {

  const {
    campaignTemplates,
    contacts,
    groups,
    reports,
    campaignRuns,
    activities,
    isCampaignRunning,
    stopCampaignRun
  } = useAppContext();

  const [selectedCampaignRunId, setSelectedCampaignRunId] = useState<string>('');
  const [alert, setAlert] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  const [lastCheckedRunId, setLastCheckedRunId] = useState<string>('');

  // Show alert when campaign fails (only for recent failures, not historical)
  useEffect(() => {
    const latestRun = campaignRuns[campaignRuns.length - 1];
    if (latestRun) {
      // Only show alert for new failures (not previously dismissed or old data)
      if (latestRun.status === 'Failed' && latestRun.id !== lastCheckedRunId) {
        setLastCheckedRunId(latestRun.id);
        const failedActivity = activities.find(a => a.type === 'campaign_failed');
        const reason = failedActivity?.message || 'Campaign failed! Check reports for details.';
        setAlert({ type: 'error', message: reason });
      } else if (latestRun.status === 'Sent') {
        const report = reports.find(r => r.campaignRunId === latestRun.id);
        if (report && report.failed > 0) {
          setAlert({ type: 'error', message: `Campaign completed with ${report.failed} failed messages.` });
        }
      }
    }
  }, [campaignRuns, reports, activities, lastCheckedRunId]);

  // Auto-hide alert after 10 seconds
  useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => setAlert(null), 10000);
      return () => clearTimeout(timer);
    }
  }, [alert]);

  // =========================
  // CHART DATA - Campaign History
  // =========================
  const campaignHistoryData = useMemo(() => {
    return campaignRuns
      .filter(run => run.status === 'Sent' || run.status === 'Failed')
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .slice(-10)
      .map(run => {
        const report = reports.find(r => r.campaignRunId === run.id);
        const template = campaignTemplates.find(t => t.id === run.campaignTemplateId);
        return {
          name: template?.name || 'Campaign',
          date: new Date(run.createdAt).toLocaleDateString(),
          sent: report?.sent || 0,
          failed: report?.failed || 0,
          total: (report?.sent || 0) + (report?.failed || 0)
        };
      });
  }, [campaignRuns, reports, campaignTemplates]);

  // Overall stats
  const overallStats = useMemo(() => {
    const totalSent = reports.reduce((sum, r) => sum + (r.sent || 0), 0);
    const totalFailed = reports.reduce((sum, r) => sum + (r.failed || 0), 0);
    const total = totalSent + totalFailed;
    const successRate = total > 0 ? Math.round((totalSent / total) * 100) : 0;
    return { totalSent, totalFailed, total, successRate };
  }, [reports]);

  // =========================
  // ACTIVITY HELPERS
  // STATS
  // =========================
  const totalCampaignRuns = campaignRuns.length;
  const totalContacts = contacts.length;
  const totalGroups = groups.length;

  const selectedCampaignReport = reports.find(r => r.campaignRunId === selectedCampaignRunId);
  const selectedCampaignRun = campaignRuns.find(r => r.id === selectedCampaignRunId);

  // =========================
  // ACTIVITY HELPERS
  // =========================
const formatTime = (timestamp: string | number) => {
  const date = typeof timestamp === 'string'
    ? new Date(timestamp)
    : new Date(timestamp);

  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });
};

  // =========================
  // UI
  // =========================
  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">

      {/* ===== ALERTS ===== */}
      {alert && (
        <div className="xl:col-span-4">
          <div className={`p-4 rounded-lg ${
            alert.type === 'error' ? 'bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400' : 'bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400'
          }`}>
            <div className="flex justify-between items-center">
              <span>{alert.message}</span>
              <button onClick={() => setAlert(null)} className="text-lg">&times;</button>
            </div>
          </div>
        </div>
      )}

      {/* ========================= */}
      {/* LEFT MAIN DASHBOARD */}
      {/* ========================= */}
      <div className="xl:col-span-3 space-y-6">

        {/* ===== STATS ===== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">

          <Card className="p-6 rounded-2xl shadow-sm border border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700">
            <h3 className="text-sm text-slate-500 dark:text-slate-400">Campaign Runs</h3>
            <p className="mt-3 text-3xl font-bold text-slate-800 dark:text-white">{totalCampaignRuns}</p>
          </Card>

          <Card className="p-6 rounded-2xl shadow-sm border border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700">
            <h3 className="text-sm text-slate-500 dark:text-slate-400">Contacts</h3>
            <p className="mt-3 text-3xl font-bold text-slate-800 dark:text-white">{totalContacts}</p>
          </Card>

          <Card className="p-6 rounded-2xl shadow-sm border border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700">
            <h3 className="text-sm text-slate-500 dark:text-slate-400">Groups</h3>
            <p className="mt-3 text-3xl font-bold text-slate-800 dark:text-white">{totalGroups}</p>
          </Card>

        </div>

        {/* ===== OVERALL ANALYTICS ===== */}
        <Card className="p-6 rounded-2xl shadow-sm border border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Overall Analytics</h2>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/30 rounded-lg">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{overallStats.totalSent}</p>
              <p className="text-sm text-green-700 dark:text-green-400">Sent</p>
            </div>
            <div className="text-center p-4 bg-red-50 dark:bg-red-900/30 rounded-lg">
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{overallStats.totalFailed}</p>
              <p className="text-sm text-red-700 dark:text-red-400">Failed</p>
            </div>
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{overallStats.total}</p>
              <p className="text-sm text-blue-700 dark:text-blue-400">Total</p>
            </div>
            <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{overallStats.successRate}%</p>
              <p className="text-sm text-purple-700 dark:text-purple-400">Success Rate</p>
            </div>
          </div>

          {campaignHistoryData.length > 0 && (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={campaignHistoryData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="currentColor" className="dark:stroke-gray-400" />
                  <YAxis stroke="currentColor" className="dark:stroke-gray-400" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }}
                  />
                  <Legend />
                  <Bar dataKey="sent" fill="#22c55e" name="Sent" />
                  <Bar dataKey="failed" fill="#ef4444" name="Failed" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* ===== CAMPAIGN ANALYSIS ===== */}
        <Card className="p-6 rounded-2xl shadow-sm border border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700">

          <div className="flex flex-col sm:flex-row justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
              Campaign Analysis
            </h2>

            <select
              value={selectedCampaignRunId}
              onChange={(e) => setSelectedCampaignRunId(e.target.value)}
              className="mt-2 sm:mt-0 px-3 py-2 text-sm border rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white"
            >
              <option value="">Select campaign run</option>
              {campaignRuns.map(run => {
                const template = campaignTemplates.find(t => t.id === run.campaignTemplateId);
                return (
                  <option key={run.id} value={run.id}>
                    {template?.name || 'Campaign'} - {new Date(run.createdAt).toLocaleString()}
                  </option>
                );
              })}
            </select>
          </div>

          {/* ===== DATA ===== */}
          {selectedCampaignRunId && selectedCampaignReport ? (

            <div>

              {/* STATUS */}
              <div className="mb-4 flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
                <div>
                  Status: <span className="font-semibold">{selectedCampaignRun?.status}</span>
                </div>
                {selectedCampaignRun?.status === 'Sending' && isCampaignRunning && (
                  <button
                    onClick={stopCampaignRun}
                    className="px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 transition"
                  >
                    Stop Campaign
                  </button>
                )}
              </div>

              {/* PROGRESS */}
              {selectedCampaignRun?.status === 'Sending' && (
                <div className="mb-6">

                  <div className="flex justify-between text-sm mb-1">
                    <span>Progress</span>
                    <span>{Math.round(selectedCampaignReport.progress)}%</span>
                  </div>

                  <div className="w-full bg-slate-200 dark:bg-slate-600 h-2 rounded">
                    <div
                      className="bg-blue-600 h-2 rounded transition-all"
                      style={{ width: `${selectedCampaignReport.progress}%` }}
                    />
                  </div>

                </div>
              )}

            </div>

          ) : (
            <div className="text-center py-16 text-slate-400 dark:text-slate-500 text-sm">
              Select a campaign run to view analysis
            </div>
          )}

        </Card>

      </div>

      {/* ========================= */}
      {/* RIGHT ACTIVITY PANEL */}
      {/* ========================= */}
      <div className="xl:col-span-1">

        <Card className="p-4 rounded-2xl shadow-sm border border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700 h-full flex flex-col">

          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">
            Live Activity
          </h3>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">

            {activities && activities.length > 0 ? (
              activities.slice(0, 20).map((act, index) => (
                <div
                  key={index}
                  className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600"
                >
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {formatTime(act.timestamp)}
                  </div>

                  <div className="text-sm text-slate-700 dark:text-slate-200 mt-1">
                    {act.message}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-sm text-slate-400 dark:text-slate-500 mt-10">
                No activity yet
              </div>
            )}

          </div>

        </Card>

      </div>

    </div>
  );
};

export default Dashboard;
