import React, { useState } from 'react';
import { SwitchDevice, Vendor } from '../types';
import { generateBatchConfig } from '../services/geminiService';
import { Terminal, Play, Copy, Check, FileCode } from 'lucide-react';

interface Props {
  switches: SwitchDevice[];
}

export default function BatchConfigurator({ switches }: Props) {
  const [selectedVendor, setSelectedVendor] = useState<Vendor>(Vendor.CISCO);
  const [intent, setIntent] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{explanation: string, commands: string, pythonScript: string} | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // Filter switches by selected vendor
  const targetCount = switches.filter(s => s.vendor === selectedVendor).length;

  const handleGenerate = async () => {
    if (!intent.trim()) return;
    setLoading(true);
    setResult(null);

    try {
      const data = await generateBatchConfig(intent, selectedVendor, targetCount || 1);
      setResult(data);
    } catch (error) {
      alert("脚本生成失败，请重试。");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-8rem)]">
      
      {/* Input Section */}
      <div className="flex flex-col gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">批量配置助手</h2>
          <p className="text-gray-500 text-sm mb-6">
            描述您想要进行的更改，Gemini 将生成 CLI 命令和 Python 脚本，以便在多台设备上自动执行。
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-2">目标厂商平台</label>
              <select
                className="w-full bg-white border border-gray-300 rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                value={selectedVendor}
                onChange={(e) => setSelectedVendor(e.target.value as Vendor)}
              >
                {Object.values(Vendor).map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">
                库存中共有 {targetCount} 台相关设备。
              </p>
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-2">更改描述 (意图)</label>
              <textarea
                className="w-full h-40 bg-white border border-gray-300 rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                placeholder="例如：创建 VLAN 10 命名为 'Sales'，将 NTP 服务器设置为 10.0.0.1，并禁用 Telnet 访问。"
                value={intent}
                onChange={(e) => setIntent(e.target.value)}
              ></textarea>
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading || !intent}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
            >
              {loading ? <span className="animate-spin">⏳</span> : <Play size={18} />}
              生成脚本
            </button>
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 text-blue-800">
          <h3 className="text-sm font-bold mb-2">⚠️ 重要提示</h3>
          <p className="text-xs leading-relaxed opacity-80">
            由于安全限制，Web 浏览器无法直接通过 SSH/Telnet 连接交换机。
            此工具将生成必要的 <strong>Python (Netmiko) 脚本</strong>，您可以下载并在本地机器或管理服务器上运行，以批量应用更改。
          </p>
        </div>
      </div>

      {/* Output Section */}
      <div className="bg-white rounded-xl border border-gray-200 flex flex-col overflow-hidden h-full shadow-sm">
        {!result ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8 text-center bg-gray-50">
            <Terminal size={64} className="mb-4 opacity-30" />
            <p>生成的配置和脚本将显示在这里。</p>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <div className="p-4 border-b border-gray-100 bg-white">
              <h3 className="font-bold text-gray-900">生成结果</h3>
              <p className="text-sm text-gray-500 mt-1">{result.explanation}</p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-gray-50">
              
              {/* CLI Commands Block */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold text-blue-600 flex items-center gap-2">
                    <Terminal size={16} /> CLI 命令
                  </span>
                  <button 
                    onClick={() => copyToClipboard(result.commands, 'cli')}
                    className="text-xs text-gray-500 hover:text-gray-900 flex items-center gap-1 transition-colors"
                  >
                    {copied === 'cli' ? <Check size={14} className="text-green-500"/> : <Copy size={14} />} 复制
                  </button>
                </div>
                <div className="bg-gray-900 rounded-lg border border-gray-800 p-4 font-mono text-xs text-green-400 whitespace-pre-wrap shadow-inner">
                  {result.commands}
                </div>
              </div>

              {/* Python Script Block */}
              <div>
                 <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold text-orange-600 flex items-center gap-2">
                    <FileCode size={16} /> Python (Netmiko) 脚本
                  </span>
                  <button 
                    onClick={() => copyToClipboard(result.pythonScript, 'py')}
                    className="text-xs text-gray-500 hover:text-gray-900 flex items-center gap-1 transition-colors"
                  >
                    {copied === 'py' ? <Check size={14} className="text-green-500"/> : <Copy size={14} />} 复制
                  </button>
                </div>
                <div className="bg-gray-900 rounded-lg border border-gray-800 p-4 font-mono text-xs text-gray-300 whitespace-pre-wrap shadow-inner overflow-x-auto">
                  {result.pythonScript}
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}