import React, { useState } from 'react';
import { SwitchDevice, ConfigBackup, AuditReport } from '../types';
import { analyzeConfiguration } from '../services/geminiService';
import { ShieldCheck, AlertTriangle, AlertCircle, CheckCircle, Info, Loader2, Sparkles } from 'lucide-react';

interface Props {
  switches: SwitchDevice[];
  backups: ConfigBackup[];
}

export default function Analyzer({ switches, backups }: Props) {
  const [selectedBackupId, setSelectedBackupId] = useState('');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<AuditReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!selectedBackupId) return;

    const backup = backups.find(b => b.id === selectedBackupId);
    if (!backup) return;

    const device = switches.find(s => s.id === backup.switchId);
    if (!device) return;

    setLoading(true);
    setError(null);
    setReport(null);

    try {
      const analysis = await analyzeConfiguration(backup.content, device.vendor);
      
      const newReport: AuditReport = {
        id: crypto.randomUUID(),
        backupId: backup.id,
        timestamp: new Date().toISOString(),
        issues: analysis.issues,
        summary: analysis.summary,
        score: analysis.score
      };

      setReport(newReport);
    } catch (err: any) {
      setError(err.message || "分析失败，请检查 API Key 和网络连接。");
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (sev: string) => {
    switch (sev) {
      case 'HIGH': return 'text-red-600 bg-red-50 border-red-200';
      case 'MEDIUM': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'LOW': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  const getSeverityLabel = (sev: string) => {
    switch (sev) {
      case 'HIGH': return '高危';
      case 'MEDIUM': return '中危';
      case 'LOW': return '低危';
      case 'INFO': return '提示';
      default: return sev;
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] gap-6">
      
      {/* Top Bar: Selection */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
        <div className="flex-1 w-full">
           <label className="block text-sm text-gray-600 mb-2">选择备份进行分析</label>
           <select 
              className="w-full bg-white border border-gray-300 rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
              value={selectedBackupId}
              onChange={e => setSelectedBackupId(e.target.value)}
           >
             <option value="">-- 请选择一份配置文件 --</option>
             {backups.map(b => {
               const dev = switches.find(s => s.id === b.switchId);
               return (
                 <option key={b.id} value={b.id}>
                   {dev?.name} ({new Date(b.timestamp).toLocaleDateString()}) - {dev?.vendor}
                 </option>
               );
             })}
           </select>
        </div>
        
        <button
          onClick={handleAnalyze}
          disabled={loading || !selectedBackupId}
          className="w-full md:w-auto mt-6 md:mt-0 px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white rounded-lg font-bold shadow-md shadow-blue-200 flex items-center justify-center gap-2 transition-all"
        >
          {loading ? <Loader2 className="animate-spin" /> : <Sparkles />}
          运行 AI 审计
        </button>
      </div>

      {/* Content Area */}
      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-red-700 flex items-center gap-3">
          <AlertCircle /> {error}
        </div>
      )}

      {!report && !loading && !error && (
        <div className="flex-1 bg-white rounded-xl border border-gray-200 flex flex-col items-center justify-center text-gray-400 shadow-sm">
           <ShieldCheck size={64} className="mb-4 opacity-30 text-gray-300" />
           <p className="text-lg">请选择一个备份文件并运行分析，以查看安全漏洞。</p>
        </div>
      )}

      {loading && (
        <div className="flex-1 bg-white rounded-xl border border-gray-200 flex flex-col items-center justify-center text-gray-500 animate-pulse shadow-sm">
           <Loader2 size={48} className="animate-spin mb-4 text-blue-500" />
           <p>Gemini 正在逐行分析配置...</p>
        </div>
      )}

      {report && (
        <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden">
          {/* Summary Column */}
          <div className="lg:w-1/3 space-y-6 overflow-y-auto pr-2">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-2">安全评分</h3>
              <div className="flex items-end gap-2">
                <span className={`text-5xl font-bold ${report.score > 80 ? 'text-green-500' : report.score > 50 ? 'text-orange-500' : 'text-red-500'}`}>
                  {report.score}
                </span>
                <span className="text-gray-400 mb-2">/ 100</span>
              </div>
              <div className="w-full bg-gray-100 h-2 rounded-full mt-4">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ${report.score > 80 ? 'bg-green-500' : report.score > 50 ? 'bg-orange-500' : 'bg-red-500'}`} 
                  style={{ width: `${report.score}%` }}
                ></div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-3">综述</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{report.summary}</p>
            </div>
            
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-3">统计</h3>
              <div className="grid grid-cols-2 gap-4">
                 <div className="bg-gray-50 p-3 rounded border border-gray-200 text-center">
                    <div className="text-red-500 font-bold text-xl">{report.issues.filter(i => i.severity === 'HIGH').length}</div>
                    <div className="text-xs text-gray-500">严重</div>
                 </div>
                 <div className="bg-gray-50 p-3 rounded border border-gray-200 text-center">
                    <div className="text-orange-500 font-bold text-xl">{report.issues.filter(i => i.severity === 'MEDIUM').length}</div>
                    <div className="text-xs text-gray-500">警告</div>
                 </div>
              </div>
            </div>
          </div>

          {/* Issues List Column */}
          <div className="flex-1 bg-white rounded-xl border border-gray-200 flex flex-col overflow-hidden shadow-sm">
            <div className="p-4 border-b border-gray-100 bg-white">
              <h3 className="font-bold text-lg text-gray-900">发现的问题</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {report.issues.map((issue, idx) => (
                <div key={idx} className={`border rounded-lg p-4 bg-white shadow-sm ${getSeverityColor(issue.severity)}`}>
                   <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {issue.severity === 'HIGH' ? <AlertTriangle size={20} /> : issue.severity === 'MEDIUM' ? <AlertCircle size={20} /> : <Info size={20} />}
                        <span className="font-bold">{issue.category}</span>
                        <span className={`text-xs px-2 py-0.5 rounded border border-current opacity-80`}>{getSeverityLabel(issue.severity)}</span>
                      </div>
                   </div>
                   <p className="text-gray-700 text-sm mb-3">{issue.description}</p>
                   
                   {issue.lineContent && (
                     <div className="bg-gray-800 rounded p-2 mb-3 border border-gray-700">
                       <code className="text-xs font-mono text-gray-300">{issue.lineContent}</code>
                     </div>
                   )}

                   <div className="text-xs bg-gray-50 p-3 rounded text-gray-600 border border-gray-100">
                     <span className="font-semibold text-gray-800">修复建议: </span>
                     {issue.remediation}
                   </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}