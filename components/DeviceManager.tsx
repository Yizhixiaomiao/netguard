import React, { useState } from 'react';
import { SwitchDevice, Vendor } from '../types';
import { Plus, Trash2, Server, Search } from 'lucide-react';

interface Props {
  switches: SwitchDevice[];
  onAdd: (device: SwitchDevice) => void;
  onDelete: (id: string) => void;
}

export default function DeviceManager({ switches, onAdd, onDelete }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Partial<SwitchDevice>>({
    vendor: Vendor.CISCO
  });
  const [search, setSearch] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.ip) return;
    
    const newDevice: SwitchDevice = {
      id: crypto.randomUUID(),
      name: formData.name,
      ip: formData.ip,
      vendor: formData.vendor as Vendor,
      location: formData.location || '未知',
      lastBackup: undefined
    };

    onAdd(newDevice);
    setFormData({ vendor: Vendor.CISCO, name: '', ip: '', location: '' });
    setShowForm(false);
  };

  const filteredSwitches = switches.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.ip.includes(search)
  );

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">设备清单</h2>
          <p className="text-gray-500">管理网络交换机与路由器。</p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors shadow-sm"
        >
          <Plus size={18} /> 添加设备
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm animate-fade-in-down">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">添加新交换机</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">主机名 (Hostname)</label>
              <input 
                required
                type="text" 
                placeholder="例如：CORE-SW-01"
                className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                value={formData.name || ''}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">IP 地址</label>
              <input 
                required
                type="text" 
                placeholder="192.168.x.x"
                className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                value={formData.ip || ''}
                onChange={e => setFormData({...formData, ip: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">厂商</label>
              <select 
                className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                value={formData.vendor}
                onChange={e => setFormData({...formData, vendor: e.target.value as Vendor})}
              >
                {Object.values(Vendor).map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">位置</label>
              <input 
                type="text" 
                placeholder="数据中心 / 楼层"
                className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                value={formData.location || ''}
                onChange={e => setFormData({...formData, location: e.target.value})}
              />
            </div>
            <div className="md:col-span-2 flex justify-end gap-3 mt-2">
              <button 
                type="button" 
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-gray-500 hover:text-gray-900"
              >
                取消
              </button>
              <button 
                type="submit" 
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium shadow-sm"
              >
                保存设备
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-3 text-gray-400" size={18} />
        <input 
          type="text" 
          placeholder="搜索主机名或 IP..." 
          className="w-full bg-white border border-gray-200 rounded-lg py-2.5 pl-10 pr-4 text-gray-900 shadow-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder-gray-400"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSwitches.map(device => (
          <div key={device.id} className="bg-white p-5 rounded-xl border border-gray-200 hover:border-blue-400 transition-colors shadow-sm group">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-gray-100 rounded-lg text-blue-600">
                <Server size={24} />
              </div>
              <button 
                onClick={() => onDelete(device.id)}
                className="text-gray-400 hover:text-red-500 transition-colors"
                title="删除设备"
              >
                <Trash2 size={18} />
              </button>
            </div>
            
            <h3 className="text-lg font-bold text-gray-900 mb-1">{device.name}</h3>
            <p className="text-gray-500 text-sm font-mono mb-4">{device.ip}</p>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">厂商:</span>
                <span className="text-gray-700 font-medium">{device.vendor}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">位置:</span>
                <span className="text-gray-700 font-medium">{device.location}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">上次备份:</span>
                <span className={`${device.lastBackup ? 'text-green-600' : 'text-orange-500'} font-medium`}>
                  {device.lastBackup || '从未'}
                </span>
              </div>
            </div>
          </div>
        ))}

        {filteredSwitches.length === 0 && (
          <div className="col-span-full py-12 text-center text-gray-400">
            未找到匹配的设备。
          </div>
        )}
      </div>
    </div>
  );
}