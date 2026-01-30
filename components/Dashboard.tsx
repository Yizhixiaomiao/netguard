import React from 'react';
import { SwitchDevice, ConfigBackup } from '../types';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { ShieldAlert, HardDrive, Activity, CheckCircle } from 'lucide-react';

interface Props {
  switches: SwitchDevice[];
  backups: ConfigBackup[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

export default function Dashboard({ switches, backups }: Props) {
  
  // Derive stats
  const vendorCounts = switches.reduce((acc, curr) => {
    acc[curr.vendor] = (acc[curr.vendor] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const vendorData = Object.keys(vendorCounts).map(k => ({ name: k, value: vendorCounts[k] }));
  
  const recentBackups = backups.slice(0, 5);
  const totalBackups = backups.length;
  const coveragePercent = Math.round((switches.filter(s => s.lastBackup).length / (switches.length || 1)) * 100);

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-3xl font-bold text-gray-900">网络概览</h2>
        <p className="text-gray-500">系统状态与配置备份健康度监控。</p>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm">纳管设备</p>
              <h3 className="text-3xl font-bold text-gray-900 mt-1">{switches.length}</h3>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
              <Activity size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm">备份总数</p>
              <h3 className="text-3xl font-bold text-gray-900 mt-1">{totalBackups}</h3>
            </div>
            <div className="p-3 bg-green-50 rounded-lg text-green-600">
              <HardDrive size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm">备份覆盖率</p>
              <h3 className="text-3xl font-bold text-gray-900 mt-1">{coveragePercent}%</h3>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg text-purple-600">
              <CheckCircle size={24} />
            </div>
          </div>
          <div className="w-full bg-gray-100 h-1.5 mt-4 rounded-full overflow-hidden">
            <div className="bg-purple-500 h-full transition-all duration-500" style={{ width: `${coveragePercent}%` }}></div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm">待审计</p>
              <h3 className="text-3xl font-bold text-gray-900 mt-1">--</h3>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg text-orange-500">
              <ShieldAlert size={24} />
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">请查看“智能审计”页面</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold mb-6 text-gray-800">设备厂商分布</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={vendorData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {vendorData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderColor: '#e2e8f0', color: '#1f2937', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                  itemStyle={{ color: '#374151' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 mt-2">
              {vendorData.map((v, i) => (
                <div key={v.name} className="flex items-center text-xs text-gray-500">
                  <span className="w-3 h-3 rounded-full mr-1" style={{ backgroundColor: COLORS[i % COLORS.length] }}></span>
                  {v.name} ({v.value})
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">最近备份</h3>
          <div className="overflow-hidden">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 uppercase tracking-wider text-xs font-semibold text-gray-500">
                <tr>
                  <th className="p-3">设备名称</th>
                  <th className="p-3">日期</th>
                  <th className="p-3">状态</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentBackups.length > 0 ? (
                  recentBackups.map((b) => {
                    const dev = switches.find(s => s.id === b.switchId);
                    return (
                      <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-3 font-medium text-gray-900">{dev?.name || '未知设备'}</td>
                        <td className="p-3">{new Date(b.timestamp).toLocaleDateString()}</td>
                        <td className="p-3"><span className="px-2 py-1 bg-green-50 text-green-600 border border-green-100 rounded text-xs">成功</span></td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={3} className="p-4 text-center italic opacity-50">暂无活动记录</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}