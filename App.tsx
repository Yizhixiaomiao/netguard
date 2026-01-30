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
import { deviceApi, backupApi } from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'devices' | 'backups' | 'analyze' | 'batch'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  
  const [switches, setSwitches] = useState<SwitchDevice[]>([]);
  const [backups, setBackups] = useState<ConfigBackup[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [devicesData, backupsData] = await Promise.all([
        deviceApi.getAll(),
        backupApi.getAll()
      ]);
      
      const formattedDevices = devicesData.map((d: any) => ({
        id: d.id,
        name: d.name,
        ip: d.ip,
        vendor: d.vendor,
        location: d.location,
        lastBackup: d.last_backup ? new Date(d.last_backup).toISOString().split('T')[0] : undefined
      }));
      
      const formattedBackups = backupsData.map((b: any) => ({
        id: b.id,
        switchId: b.switch_id,
        timestamp: b.timestamp,
        content: b.content,
        filename: b.filename,
        commands: b.commands,
        templateName: b.template_name
      }));
      
      setSwitches(formattedDevices);
      setBackups(formattedBackups);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addSwitch = async (dev: SwitchDevice) => {
    try {
      const newDevice = await deviceApi.create({
        name: dev.name,
        ip: dev.ip,
        vendor: dev.vendor,
        location: dev.location
      });
      const formattedDevice = {
        id: newDevice.id,
        name: newDevice.name,
        ip: newDevice.ip,
        vendor: newDevice.vendor,
        location: newDevice.location,
        lastBackup: newDevice.last_backup ? new Date(newDevice.last_backup).toISOString().split('T')[0] : undefined
      };
      setSwitches([...switches, formattedDevice]);
    } catch (error) {
      console.error('Failed to add device:', error);
      throw error;
    }
  };

  const deleteSwitch = async (id: string) => {
    try {
      await deviceApi.delete(id);
      setSwitches(switches.filter(s => s.id !== id));
    } catch (error) {
      console.error('Failed to delete device:', error);
      throw error;
    }
  };
  
  const addBackup = async (backup: ConfigBackup) => {
    try {
      if (!backup.switchId) {
        await loadData();
        return;
      }

      const newBackup = await backupApi.create({
        switch_id: backup.switchId,
        commands: backup.commands,
        template: backup.template || {}
      });
      
      const formattedBackup = {
        id: newBackup.id,
        switchId: newBackup.switch_id,
        timestamp: newBackup.timestamp,
        content: newBackup.content,
        filename: newBackup.filename,
        commands: newBackup.commands,
        templateName: newBackup.template_name
      };
      
      setBackups([formattedBackup, ...backups]);
      
      await loadData();
    } catch (error) {
      console.error('Failed to add backup:', error);
      throw error;
    }
  };

  const navItems = [
    { id: 'dashboard', label: '仪表盘', icon: <LayoutDashboard size={20} /> },
    { id: 'devices', label: '设备清单', icon: <Server size={20} /> },
    { id: 'backups', label: '备份仓库', icon: <Database size={20} /> },
    { id: 'analyze', label: '智能审计', icon: <ShieldCheck size={20} /> },
    { id: 'batch', label: '批量配置', icon: <Terminal size={20} /> },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 font-sans">
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
          {isSidebarOpen && <p>v1.0.0 | 后端模式</p>}
        </div>
      </aside>

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
