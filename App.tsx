import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Server, 
  FileText, 
  ShieldCheck, 
  Terminal, 
  Menu,
  Database
} from 'lucide-react';
import Dashboard from './components/Dashboard';
import DeviceManager from './components/DeviceManager';
import BackupRepository from './components/BackupRepository';
import Analyzer from './components/Analyzer';
import BatchConfigurator from './components/BatchConfigurator';
import { SwitchDevice, ConfigBackup } from './types';

// Mock Data for Initial Load if LocalStorage is empty
const MOCK_SWITCHES: SwitchDevice[] = [
  { id: 'sw-01', name: 'Core-Switch-01', ip: '192.168.1.1', vendor: 'Cisco IOS' as any, location: 'Data Center A', lastBackup: '2023-10-25' },
  { id: 'sw-02', name: 'Access-Floor-1', ip: '192.168.20.5', vendor: 'Huawei VRP' as any, location: 'Building 2', lastBackup: '2023-10-24' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'devices' | 'backups' | 'analyze' | 'batch'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Global State (In a real app, use Context or Redux)
  const [switches, setSwitches] = useState<SwitchDevice[]>(() => {
    const saved = localStorage.getItem('netguard_switches');
    return saved ? JSON.parse(saved) : MOCK_SWITCHES;
  });

  const [backups, setBackups] = useState<ConfigBackup[]>(() => {
    const saved = localStorage.getItem('netguard_backups');
    return saved ? JSON.parse(saved) : [];
  });

  // Persist State
  useEffect(() => {
    localStorage.setItem('netguard_switches', JSON.stringify(switches));
  }, [switches]);

  useEffect(() => {
    localStorage.setItem('netguard_backups', JSON.stringify(backups));
  }, [backups]);

  // Actions
  const addSwitch = (dev: SwitchDevice) => setSwitches([...switches, dev]);
  const deleteSwitch = (id: string) => setSwitches(switches.filter(s => s.id !== id));
  
  const addBackup = (backup: ConfigBackup) => {
    setBackups([backup, ...backups]);
    // Update last backup date on device
    setSwitches(prev => prev.map(s => s.id === backup.switchId ? { ...s, lastBackup: backup.timestamp } : s));
  };

  const navItems = [
    { id: 'dashboard', label: '仪表盘', icon: <LayoutDashboard size={20} /> },
    { id: 'devices', label: '设备清单', icon: <Server size={20} /> },
    { id: 'backups', label: '备份仓库', icon: <Database size={20} /> },
    { id: 'analyze', label: '智能审计', icon: <ShieldCheck size={20} /> },
    { id: 'batch', label: '批量配置', icon: <Terminal size={20} /> },
  ];

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 font-sans">
      {/* Sidebar */}
      <aside 
        className={`${isSidebarOpen ? 'w-64' : 'w-20'} transition-all duration-300 bg-white border-r border-gray-200 flex flex-col shadow-sm z-10`}
      >
        <div className="p-4 flex items-center justify-between border-b border-gray-100">
          {isSidebarOpen && <h1 className="font-bold text-xl text-blue-600 tracking-tight">NetGuard AI</h1>}
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
            <Menu size={20} />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`w-full flex items-center p-3 rounded-lg transition-all ${
                activeTab === item.id 
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-200' 
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <span className="shrink-0">{item.icon}</span>
              {isSidebarOpen && <span className="ml-3 font-medium whitespace-nowrap">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100 text-xs text-gray-400 text-center">
          {isSidebarOpen && <p>v1.0.0 | 本地模式</p>}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-gray-50 relative">
        <div className="max-w-7xl mx-auto p-6 lg:p-8">
          {activeTab === 'dashboard' && <Dashboard switches={switches} backups={backups} />}
          {activeTab === 'devices' && <DeviceManager switches={switches} onAdd={addSwitch} onDelete={deleteSwitch} />}
          {activeTab === 'backups' && <BackupRepository switches={switches} backups={backups} onAdd={addBackup} />}
          {activeTab === 'analyze' && <Analyzer switches={switches} backups={backups} />}
          {activeTab === 'batch' && <BatchConfigurator switches={switches} />}
        </div>
      </main>
    </div>
  );
}