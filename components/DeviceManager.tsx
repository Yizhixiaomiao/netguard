import React, { useState } from 'react';
import { SwitchDevice, Vendor } from '../types';
import { Plus, Trash2, Server, Search, Upload, Download } from 'lucide-react';

interface Props {
  switches: SwitchDevice[];
  onAdd: (device: SwitchDevice) => void;
  onDelete: (id: string) => void;
}

export default function DeviceManager({ switches, onAdd, onDelete }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [formData, setFormData] = useState<Partial<SwitchDevice>>({
    vendor: Vendor.CISCO
  });
  const [search, setSearch] = useState('');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importError, setImportError] = useState('');

  const parseCSV = (content: string): Partial<SwitchDevice>[] => {
    const lines = content.trim().split('\n');
    const devices: Partial<SwitchDevice>[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      if (values.length < 3) continue;
      
      const [name, ip, vendor, location] = values;
      if (!name || !ip) continue;
      
      devices.push({
        name,
        ip,
        vendor: vendor && Object.values(Vendor).includes(vendor as Vendor) ? vendor as Vendor : Vendor.CISCO,
        location: location || '未知'
      });
    }
    
    return devices;
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) {
      setImportError('请选择文件');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const devices = parseCSV(content);
        
        if (devices.length === 0) {
          setImportError('未找到有效的设备数据');
          return;
        }
        
        for (const device of devices) {
          const newDevice: SwitchDevice = {
            id: crypto.randomUUID(),
            name: device.name!,
            ip: device.ip!,
            vendor: device.vendor as Vendor,
            location: device.location || '未知',
            lastBackup: undefined
          };
          try {
            await onAdd(newDevice);
          } catch (error) {
            console.error('Failed to add device:', error);
          }
        }
        
        setShowImport(false);
        setImportFile(null);
        setImportError('');
      } catch (error) {
        setImportError('文件解析失败，请检查格式');
      }
    };
    reader.readAsText(importFile);
  };

  const downloadTemplate = () => {
    const template = 'name,ip,vendor,location\nCORE-SW-01,192.168.1.1,Cisco IOS,数据中心\nDIST-SW-01,192.168.1.2,Huawei VRP,一楼机房\nACCESS-SW-01,192.168.1.3,Cisco IOS,二楼机房';
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'devices_template.csv';
    link.click();
  };

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
        <div className="flex gap-3">
          <button 
            onClick={() => setShowImport(!showImport)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors shadow-sm"
          >
            <Upload size={18} /> 导入设备
          </button>
          <button 
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors shadow-sm"
          >
            <Plus size={18} /> 添加设备
          </button>
        </div>
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

      {showImport && (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm animate-fade-in-down">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">批量导入设备</h3>
          <form onSubmit={handleImport} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">选择 CSV 文件</label>
              <input 
                required
                type="file" 
                accept=".csv"
                className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                onChange={e => {
                  const file = e.target.files?.[0] || null;
                  setImportFile(file);
                  setImportError('');
                }}
              />
            </div>
            {importError && (
              <div className="text-red-500 text-sm">{importError}</div>
            )}
            <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-600">
              <p className="font-medium mb-2">CSV 文件格式：</p>
              <code className="block bg-white p-2 rounded border">name,ip,vendor,location</code>
              <p className="mt-2 text-xs">支持厂商：Cisco IOS, Huawei VRP, Juniper Junos, Arista EOS, HP Comware</p>
            </div>
            <div className="flex justify-between items-center">
              <button 
                type="button" 
                onClick={downloadTemplate}
                className="text-green-600 hover:text-green-700 flex items-center gap-2 text-sm font-medium"
              >
                <Download size={16} /> 下载模板
              </button>
              <div className="flex gap-3">
                <button 
                  type="button" 
                  onClick={() => {
                    setShowImport(false);
                    setImportFile(null);
                    setImportError('');
                  }}
                  className="px-4 py-2 text-gray-500 hover:text-gray-900"
                >
                  取消
                </button>
                <button 
                  type="submit" 
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium shadow-sm"
                >
                  导入设备
                </button>
              </div>
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