import React, { useState } from 'react';
import { SwitchDevice, ConfigBackup } from '../types';
import { Upload, FileText, Download, Copy, Check } from 'lucide-react';

interface Props {
  switches: SwitchDevice[];
  backups: ConfigBackup[];
  onAdd: (backup: ConfigBackup) => void;
}

export default function BackupRepository({ switches, backups, onAdd }: Props) {
  const [selectedSwitchId, setSelectedSwitchId] = useState('');
  const [configText, setConfigText] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      if (typeof ev.target?.result === 'string') {
        setConfigText(ev.target.result);
      }
    };
    reader.readAsText(file);
  };

  const handleSave = () => {
    if (!selectedSwitchId || !configText.trim()) return;

    const backup: ConfigBackup = {
      id: crypto.randomUUID(),
      switchId: selectedSwitchId,
      timestamp: new Date().toISOString(),
      content: configText,
    };

    onAdd(backup);
    setConfigText('');
    alert("备份已成功保存到本地数据库。");
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-8rem)]">
      {/* Input Column */}
      <div className="lg:col-span-1 bg-white rounded-xl border border-gray-200 flex flex-col overflow-hidden shadow-sm">
        <div className="p-4 border-b border-gray-100 bg-white">
          <h3 className="font-bold text-lg text-gray-900 mb-1">导入配置</h3>
          <p className="text-xs text-gray-500">粘贴配置文本或上传文件。</p>
        </div>
        
        <div className="p-4 space-y-4 flex-1 overflow-y-auto">
          <div>
            <label className="block text-sm text-gray-600 mb-2">选择设备</label>
            <select
              className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
              value={selectedSwitchId}
              onChange={(e) => setSelectedSwitchId(e.target.value)}
            >
              <option value="">-- 请选择设备 --</option>
              {switches.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.ip})</option>
              ))}
            </select>
          </div>

          <div>
             <label className="block text-sm text-gray-600 mb-2">上传文件 (.txt, .cfg, .log)</label>
             <div className="relative border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 hover:border-blue-400 transition-colors group">
               <input 
                type="file" 
                accept=".txt,.cfg,.log" 
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
               />
               <Upload className="mx-auto text-gray-400 group-hover:text-blue-500 mb-2" size={24} />
               <p className="text-sm text-gray-500 group-hover:text-gray-700">点击或拖拽文件到此处</p>
             </div>
          </div>

          <div className="flex-1">
             <label className="block text-sm text-gray-600 mb-2">配置内容</label>
             <textarea
               className="w-full h-64 bg-gray-50 border border-gray-300 rounded-lg p-3 font-mono text-xs text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
               value={configText}
               onChange={(e) => setConfigText(e.target.value)}
               placeholder="在此处粘贴 running-config..."
             ></textarea>
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50">
          <button
            onClick={handleSave}
            disabled={!selectedSwitchId || !configText}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 rounded-lg font-medium transition-colors shadow-sm"
          >
            保存到数据库
          </button>
        </div>
      </div>

      {/* History Column */}
      <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 flex flex-col overflow-hidden shadow-sm">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white">
          <h3 className="font-bold text-lg text-gray-900">备份库</h3>
          <span className="text-xs px-2 py-1 bg-gray-100 rounded text-gray-600 border border-gray-200">{backups.length} 条记录</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
          {backups.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <DatabaseIcon />
              <p className="mt-4">暂无备份记录。</p>
            </div>
          ) : (
            backups.map((backup) => {
              const device = switches.find(s => s.id === backup.switchId);
              return (
                <div key={backup.id} className="bg-white border border-gray-200 rounded-lg p-4 group hover:border-blue-300 hover:shadow-md transition-all">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-50 rounded text-blue-600">
                        <FileText size={20} />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900">{device?.name || '未知设备'}</h4>
                        <p className="text-xs text-gray-500">{new Date(backup.timestamp).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => copyToClipboard(backup.content, backup.id)}
                        className="p-1.5 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-900"
                        title="复制配置"
                      >
                         {copiedId === backup.id ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                      </button>
                      <button className="p-1.5 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-900" title="下载">
                         <Download size={16} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="bg-gray-900 rounded p-2 overflow-hidden h-24 relative shadow-inner">
                    <code className="text-[10px] text-gray-300 font-mono whitespace-pre-wrap">
                      {backup.content.substring(0, 300)}...
                    </code>
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent pointer-events-none"></div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function DatabaseIcon() {
  return (
    <svg className="mx-auto w-12 h-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
    </svg>
  );
}