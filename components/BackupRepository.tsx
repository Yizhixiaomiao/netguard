import React, { useState, useEffect } from 'react';
import { SwitchDevice, ConfigBackup, Vendor } from '../types';
import { Upload, FileText, Download, Copy, Check, UploadCloud, Terminal, FolderOpen, Search, Plus, Trash2, Edit2, Key } from 'lucide-react';
import { templateApi, backupJobApi } from '../services/api';

interface Props {
  switches: SwitchDevice[];
  backups: ConfigBackup[];
  onAdd: (backup: ConfigBackup) => void;
}

interface LoginTemplate {
  id: string;
  name: string;
  username: string;
  password: string;
  port: number;
  description?: string;
}

interface CommandPreset {
  id: string;
  name: string;
  vendor: Vendor;
  commands: string[];
}

const DEFAULT_TEMPLATES: LoginTemplate[] = [
  {
    id: 'default-cisco',
    name: 'Cisco 默认',
    username: 'admin',
    password: 'admin',
    port: 22,
    description: 'Cisco 设备默认登录信息'
  },
  {
    id: 'default-huawei',
    name: '华为默认',
    username: 'admin',
    password: 'admin',
    port: 22,
    description: '华为设备默认登录信息'
  }
];

const COMMAND_PRESETS: CommandPreset[] = [
  {
    id: 'cisco-full',
    name: 'Cisco 完整配置',
    vendor: Vendor.CISCO,
    commands: ['terminal length 0', 'show running-config']
  },
  {
    id: 'cisco-vlan',
    name: 'Cisco VLAN 配置',
    vendor: Vendor.CISCO,
    commands: ['show vlan brief', 'show interface status']
  },
  {
    id: 'huawei-full',
    name: '华为完整配置',
    vendor: Vendor.HUAWEI,
    commands: ['screen-length 0 temporary', 'display current-configuration']
  },
  {
    id: 'huawei-interface',
    name: '华为接口配置',
    vendor: Vendor.HUAWEI,
    commands: ['display interface brief', 'display ip interface brief']
  },
  {
    id: 'juniper-full',
    name: 'Juniper 完整配置',
    vendor: Vendor.JUNIPER,
    commands: ['show configuration | display set']
  },
  {
    id: 'arista-full',
    name: 'Arista 完整配置',
    vendor: Vendor.ARISTA,
    commands: ['terminal length 0', 'show running-config']
  },
  {
    id: 'hp-full',
    name: 'HP 完整配置',
    vendor: Vendor.HP,
    commands: ['terminal length 0', 'show running-config']
  }
];

export default function BackupRepository({ switches, backups, onAdd }: Props) {
  const [activeTab, setActiveTab] = useState<'manual' | 'batch'>('manual');
  const [selectedSwitchId, setSelectedSwitchId] = useState('');
  const [configText, setConfigText] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [loginTemplates, setLoginTemplates] = useState<LoginTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [selectedCommands, setSelectedCommands] = useState<CommandPreset | null>(null);
  const [customCommands, setCustomCommands] = useState('');
  const [backupPath, setBackupPath] = useState('');
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupProgress, setBackupProgress] = useState<{ current: number; total: number; status: string }>({ current: 0, total: 0, status: '' });
  const [deviceSearch, setDeviceSearch] = useState('');
  const [groupBySubnet, setGroupBySubnet] = useState(true);
  
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<LoginTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState<Partial<LoginTemplate>>({
    name: '',
    username: '',
    password: '',
    port: 22,
    description: ''
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const templates = await templateApi.getAll();
      setLoginTemplates(templates);
    } catch (error) {
      console.error('Failed to load templates:', error);
      setLoginTemplates(DEFAULT_TEMPLATES);
    }
  };

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

  const handleDeviceSelection = (deviceId: string, checked: boolean) => {
    if (checked) {
      setSelectedDevices([...selectedDevices, deviceId]);
    } else {
      setSelectedDevices(selectedDevices.filter(id => id !== deviceId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    const filteredDevices = getFilteredDevices();
    
    if (checked) {
      const newDeviceIds = filteredDevices.map(d => d.id);
      setSelectedDevices([...selectedDevices, ...newDeviceIds]);
    } else {
      const filteredIds = new Set(filteredDevices.map(d => d.id));
      setSelectedDevices(selectedDevices.filter(id => !filteredIds.has(id)));
    }
  };

  const handleAddTemplate = () => {
    setEditingTemplate(null);
    setTemplateForm({
      name: '',
      username: '',
      password: '',
      port: 22,
      description: ''
    });
    setShowTemplateModal(true);
  };

  const handleEditTemplate = (template: LoginTemplate) => {
    setEditingTemplate(template);
    setTemplateForm({ ...template });
    setShowTemplateModal(true);
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (confirm('确定要删除此模板吗？')) {
      try {
        await templateApi.delete(templateId);
        setLoginTemplates(loginTemplates.filter(t => t.id !== templateId));
        if (selectedTemplateId === templateId) {
          setSelectedTemplateId('');
        }
      } catch (error) {
        console.error('Failed to delete template:', error);
        alert('删除模板失败');
      }
    }
  };

  const handleSaveTemplate = async () => {
    if (!templateForm.name || !templateForm.username || !templateForm.password) {
      alert('请填写完整的模板信息');
      return;
    }

    try {
      if (editingTemplate) {
        const updated = await templateApi.update(editingTemplate.id, templateForm);
        setLoginTemplates(loginTemplates.map(t => 
          t.id === editingTemplate.id ? updated : t
        ));
      } else {
        const newTemplate = await templateApi.create(templateForm);
        setLoginTemplates([...loginTemplates, newTemplate]);
      }

      setShowTemplateModal(false);
      setTemplateForm({ name: '', username: '', password: '', port: 22, description: '' });
    } catch (error) {
      console.error('Failed to save template:', error);
      alert('保存模板失败');
    }
  };

  const handleBatchBackup = async () => {
    if (selectedDevices.length === 0) {
      alert('请至少选择一个设备');
      return;
    }

    if (!selectedTemplateId) {
      alert('请选择登录模板');
      return;
    }

    const commands = selectedCommands ? selectedCommands.commands : customCommands.split('\n').filter(c => c.trim());
    if (commands.length === 0) {
      alert('请选择命令或输入自定义命令');
      return;
    }

    const template = loginTemplates.find(t => t.id === selectedTemplateId);
    if (!template) {
      alert('未找到登录模板');
      return;
    }

    setIsBackingUp(true);
    setBackupProgress({ current: 0, total: selectedDevices.length, status: '开始备份...' });

    try {
      const result = await backupJobApi.execute({
        device_ids: selectedDevices,
        commands: commands,
        template: template,
        backup_path: backupPath
      });

      if (result.failed > 0) {
        const errorMsg = result.errors.map((e: any) => 
          `设备 ${e.device_id}: ${e.error}`
        ).join('\n');
        alert(`批量备份完成！成功 ${result.success} 个，失败 ${result.failed} 个。\n\n错误详情:\n${errorMsg}`);
      } else {
        alert(`批量备份完成！共备份 ${result.success} 个设备。`);
      }

      await onAdd({} as ConfigBackup);
    } catch (error) {
      console.error('Batch backup failed:', error);
      alert(`批量备份失败: ${error}`);
    } finally {
      setIsBackingUp(false);
      setBackupProgress({ current: 0, total: 0, status: '' });
    }
  };

  const getFilteredCommands = () => {
    if (selectedDevices.length === 0) return COMMAND_PRESETS;
    
    const vendors = new Set(selectedDevices.map(id => switches.find(s => s.id === id)?.vendor));
    return COMMAND_PRESETS.filter(preset => Array.from(vendors).includes(preset.vendor));
  };

  const getSubnet = (ip: string): string => {
    const parts = ip.split('.');
    if (parts.length >= 3) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
    }
    return ip;
  };

  const getFilteredDevices = () => {
    if (!deviceSearch.trim()) return switches;
    
    const searchLower = deviceSearch.toLowerCase();
    return switches.filter(device => 
      device.name.toLowerCase().includes(searchLower) ||
      device.ip.includes(searchLower) ||
      device.vendor.toLowerCase().includes(searchLower) ||
      device.location.toLowerCase().includes(searchLower)
    );
  };

  const getGroupedDevices = () => {
    const filtered = getFilteredDevices();
    
    if (!groupBySubnet) {
      return [{ subnet: '全部设备', devices: filtered }];
    }
    
    const groups: Record<string, typeof filtered> = {};
    filtered.forEach(device => {
      const subnet = getSubnet(device.ip);
      if (!groups[subnet]) {
        groups[subnet] = [];
      }
      groups[subnet].push(device);
    });
    
    return Object.entries(groups)
      .map(([subnet, devices]) => ({ subnet, devices }))
      .sort((a, b) => a.subnet.localeCompare(b.subnet));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">备份仓库</h2>
          <p className="text-gray-500">管理交换机配置备份。</p>
        </div>
        <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('manual')}
            className={`px-4 py-2 rounded-md font-medium transition-all ${
              activeTab === 'manual'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <UploadCloud size={16} className="inline mr-2" />
            手动配置
          </button>
          <button
            onClick={() => setActiveTab('batch')}
            className={`px-4 py-2 rounded-md font-medium transition-all ${
              activeTab === 'batch'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Terminal size={16} className="inline mr-2" />
            批量备份
          </button>
        </div>
      </div>

      {activeTab === 'manual' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
      )}

      {activeTab === 'batch' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="p-4 border-b border-gray-100 bg-white">
              <h3 className="font-bold text-lg text-gray-900 mb-1">选择交换机</h3>
              <p className="text-xs text-gray-500">勾选需要备份的设备并配置登录信息。</p>
            </div>
            
            <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto">
              <div className="space-y-3">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="搜索设备名称、IP、厂商或位置..."
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 pl-10 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    value={deviceSearch}
                    onChange={(e) => setDeviceSearch(e.target.value)}
                  />
                  <Search className="absolute left-3 top-3 text-gray-400" size={16} />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={getFilteredDevices().length > 0 && getFilteredDevices().every(d => selectedDevices.includes(d.id))}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">全选</span>
                    </label>
                    <button
                      onClick={() => setGroupBySubnet(!groupBySubnet)}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                        groupBySubnet
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      按网段分组
                    </button>
                  </div>
                  <span className="text-xs text-gray-500">
                    {getFilteredDevices().length} 个设备
                  </span>
                </div>
              </div>

              {switches.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <p>暂无设备，请先在设备清单中添加设备。</p>
                </div>
              ) : getGroupedDevices().length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <p>未找到匹配的设备。</p>
                </div>
              ) : (
                getGroupedDevices().map((group) => (
                  <div key={group.subnet} className="space-y-2">
                    {groupBySubnet && (
                      <div className="flex items-center gap-2 px-2 py-1 bg-gray-100 rounded-md">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className="text-sm font-medium text-gray-700">{group.subnet}</span>
                        <span className="text-xs text-gray-500">({group.devices.length} 个设备)</span>
                      </div>
                    )}
                    
                    {group.devices.map((device) => {
                      const isSelected = selectedDevices.includes(device.id);
                      
                      return (
                        <div key={device.id} className={`border rounded-lg p-3 transition-all ${isSelected ? 'border-blue-400 bg-blue-50' : 'border-gray-200'}`}>
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => handleDeviceSelection(device.id, e.target.checked)}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">{device.name}</div>
                              <div className="text-sm text-gray-500">{device.ip} - {device.vendor}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="p-4 border-b border-gray-100 bg-white">
                <h3 className="font-bold text-lg text-gray-900 mb-1">登录模板</h3>
                <p className="text-xs text-gray-500">选择或创建登录信息模板。</p>
              </div>
              
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-2">选择模板</label>
                  <div className="space-y-2">
                    {loginTemplates.map((template) => (
                      <div 
                        key={template.id}
                        onClick={() => setSelectedTemplateId(template.id)}
                        className={`border rounded-lg p-3 cursor-pointer transition-all ${
                          selectedTemplateId === template.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded text-blue-600">
                              <Key size={18} />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{template.name}</div>
                              <div className="text-xs text-gray-500">{template.username}:{'*'.repeat(template.password.length)}:{template.port}</div>
                              {template.description && (
                                <div className="text-xs text-gray-400 mt-1">{template.description}</div>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditTemplate(template);
                              }}
                              className="p-1.5 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-900"
                              title="编辑模板"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTemplate(template.id);
                              }}
                              className="p-1.5 hover:bg-red-100 rounded text-gray-400 hover:text-red-500"
                              title="删除模板"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleAddTemplate}
                  className="w-full border-2 border-dashed border-gray-300 rounded-lg p-3 text-center hover:border-blue-400 hover:bg-blue-50 transition-colors text-gray-500 hover:text-blue-600"
                >
                  <Plus size={18} className="inline mr-2" />
                  添加新模板
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="p-4 border-b border-gray-100 bg-white">
                <h3 className="font-bold text-lg text-gray-900 mb-1">选择指令</h3>
                <p className="text-xs text-gray-500">选择预设命令或输入自定义命令。</p>
              </div>
              
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-2">预设命令</label>
                  <div className="grid grid-cols-1 gap-2">
                    {getFilteredCommands().map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => {
                          setSelectedCommands(preset);
                          setCustomCommands('');
                        }}
                        className={`text-left p-3 rounded-lg border transition-all ${
                          selectedCommands?.id === preset.id
                            ? 'border-blue-500 bg-blue-50 text-blue-900'
                            : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="font-medium">{preset.name}</div>
                        <div className="text-xs text-gray-500 mt-1">{preset.vendor}</div>
                        <div className="text-xs text-gray-400 mt-1 font-mono">{preset.commands.join(', ')}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-2">自定义命令</label>
                  <textarea
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 font-mono text-sm text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    rows={6}
                    value={customCommands}
                    onChange={(e) => {
                      setCustomCommands(e.target.value);
                      setSelectedCommands(null);
                    }}
                    placeholder="每行输入一个命令，例如：&#10;show running-config&#10;show version&#10;show interface status"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="p-4 border-b border-gray-100 bg-white">
                <h3 className="font-bold text-lg text-gray-900 mb-1">备份设置</h3>
                <p className="text-xs text-gray-500">选择备份目录并执行批量备份。</p>
              </div>
              
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-2">备份目录</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="flex-1 bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
                      value={backupPath}
                      onChange={(e) => setBackupPath(e.target.value)}
                      placeholder="D:\Backups\SwitchConfigs"
                    />
                    <button
                      onClick={() => setBackupPath('D:\\Backups\\SwitchConfigs')}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center gap-2"
                    >
                      <FolderOpen size={16} />
                      浏览
                    </button>
                  </div>
                </div>

                {isBackingUp && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-blue-900">备份进度</span>
                      <span className="text-sm text-blue-700">{backupProgress.current} / {backupProgress.total}</span>
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-2 mb-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${(backupProgress.current / backupProgress.total) * 100}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-blue-700">{backupProgress.status}</p>
                  </div>
                )}

                <button
                  onClick={handleBatchBackup}
                  disabled={isBackingUp || selectedDevices.length === 0 || !selectedTemplateId}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-lg font-medium transition-colors shadow-sm flex items-center justify-center gap-2"
                >
                  <UploadCloud size={18} />
                  {isBackingUp ? '备份中...' : '批量备份'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showTemplateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-lg text-gray-900">
                {editingTemplate ? '编辑模板' : '添加新模板'}
              </h3>
              <button
                onClick={() => setShowTemplateModal(false)}
                className="text-gray-400 hover:text-gray-900"
              >
                ✕
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">模板名称</label>
                <input
                  type="text"
                  className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                  placeholder="例如：Cisco 生产环境"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">用户名</label>
                <input
                  type="text"
                  className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  value={templateForm.username}
                  onChange={(e) => setTemplateForm({ ...templateForm, username: e.target.value })}
                  placeholder="username"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">密码</label>
                <input
                  type="password"
                  className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  value={templateForm.password}
                  onChange={(e) => setTemplateForm({ ...templateForm, password: e.target.value })}
                  placeholder="password"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">SSH 端口</label>
                <input
                  type="number"
                  className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  value={templateForm.port}
                  onChange={(e) => setTemplateForm({ ...templateForm, port: parseInt(e.target.value) || 22 })}
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">描述（可选）</label>
                <textarea
                  className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                  rows={2}
                  value={templateForm.description}
                  onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                  placeholder="模板用途说明..."
                />
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setShowTemplateModal(false)}
                className="px-4 py-2 text-gray-500 hover:text-gray-900"
              >
                取消
              </button>
              <button
                onClick={handleSaveTemplate}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
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