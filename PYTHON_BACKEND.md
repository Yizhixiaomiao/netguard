# NetGuard AI - Python 后端集成指南

## 项目结构

```
netguard/
├── frontend/          # React 前端（当前项目）
│   ├── components/    # React 组件
│   ├── services/      # API 服务
│   └── ...
└── backend/           # Python FastAPI 后端
    ├── main.py              # FastAPI 主入口
    ├── routers/             # API 路由
    │   ├── __init__.py
    │   ├── devices.py        # 设备管理
    │   ├── backups.py        # 备份管理
    │   ├── templates.py      # 模板管理
    │   └── backup_jobs.py   # 批量备份
    ├── backups/             # 备份文件存储目录
    └── requirements.txt      # Python 依赖
```

## 技术栈

- **后端框架**: FastAPI
- **SSH 库**: Paramiko
- **Python 版本**: 3.8+
- **异步支持**: asyncio

## 快速开始

### 1. 安装 Python 依赖

```bash
cd backend
pip install -r requirements.txt
```

### 2. 启动后端服务

```bash
python main.py
```

后端将在 `http://localhost:8000` 启动

### 3. 配置前端环境变量

```bash
cp .env.example .env.local
```

编辑 `.env.local` 文件：

```env
VITE_API_URL=http://localhost:8000
```

### 4. 启动前端服务

```bash
npm run dev
```

前端将在 `http://localhost:5173` 启动

## API 接口文档

启动后端后，访问 `http://localhost:8000/docs` 查看 Swagger API 文档。

### 设备管理

```
GET    /api/devices/         - 获取所有设备
POST   /api/devices/         - 创建设备
GET    /api/devices/{id}     - 获取单个设备
PUT    /api/devices/{id}     - 更新设备
DELETE /api/devices/{id}     - 删除设备
```

### 备份管理

```
GET    /api/backups/         - 获取所有备份
POST   /api/backups/         - 创建备份
GET    /api/backups/{id}     - 获取单个备份
DELETE /api/backups/{id}     - 删除备份
```

### 批量备份

```
POST   /api/backup-jobs/     - 执行批量备份
```

请求体：
```json
{
  "device_ids": ["id1", "id2"],
  "commands": ["show running-config"],
  "template": {
    "username": "admin",
    "password": "password",
    "port": 22
  }
}
```

响应：
```json
{
  "job_id": "uuid",
  "total": 2,
  "success": 2,
  "failed": 0,
  "results": [
    {
      "device_id": "id1",
      "success": true,
      "filename": "id1_2024-01-30.txt",
      "timestamp": "2024-01-30T10:00:00"
    }
  ],
  "errors": []
}
```

### 登录模板

```
GET    /api/templates/        - 获取所有模板
POST   /api/templates/        - 创建模板
PUT    /api/templates/{id}    - 更新模板
DELETE /api/templates/{id}    - 删除模板
```

## 前端集成

### 使用 API 服务

```javascript
import { deviceApi, backupApi, templateApi, backupJobApi } from '../services/api';

// 获取所有设备
const devices = await deviceApi.getAll();

// 创建设备
const newDevice = await deviceApi.create({
  name: 'Core-Switch-01',
  ip: '192.168.1.1',
  vendor: 'Cisco IOS',
  location: 'Data Center'
});

// 执行备份
const backup = await backupApi.create({
  switch_id: 'device-id',
  commands: ['show running-config'],
  template: {
    username: 'admin',
    password: 'password',
    port: 22
  }
});

// 批量备份
const result = await backupJobApi.execute({
  device_ids: ['id1', 'id2'],
  commands: ['show running-config'],
  template: {
    username: 'admin',
    password: 'password',
    port: 22
  }
});
```

### 修改 App.tsx 使用 API

```javascript
// 之前（使用 localStorage）
const [switches, setSwitches] = useState(() => {
  const saved = localStorage.getItem('netguard_switches');
  return saved ? JSON.parse(saved) : MOCK_SWITCHES;
});

// 之后（使用 API）
const [switches, setSwitches] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  deviceApi.getAll()
    .then(data => {
      setSwitches(data);
      setLoading(false);
    })
    .catch(error => {
      console.error('Failed to load devices:', error);
      setLoading(false);
    });
}, []);
```

### 修改 BackupRepository.tsx 使用 API

```javascript
// 批量备份函数
const handleBatchBackup = async () => {
  if (selectedDevices.length === 0) {
    alert('请至少选择一个设备');
    return;
  }

  if (!selectedTemplateId) {
    alert('请选择登录模板');
    return;
  }

  const template = loginTemplates.find(t => t.id === selectedTemplateId);
  if (!template) {
    alert('未找到登录模板');
    return;
  }

  const commands = selectedCommands ? selectedCommands.commands : customCommands.split('\n').filter(c => c.trim());
  
  setIsBackingUp(true);
  
  try {
    const result = await backupJobApi.execute({
      device_ids: selectedDevices,
      commands: commands,
      template: template
    });
    
    alert(`批量备份完成！成功 ${result.success} 个，失败 ${result.failed} 个`);
    
    // 刷新备份列表
    const updatedBackups = await backupApi.getAll();
    // 更新备份状态...
  } catch (error) {
    console.error('批量备份失败:', error);
    alert('批量备份失败：' + error.message);
  } finally {
    setIsBackingUp(false);
  }
};
```

## 生产环境部署

### 使用 Gunicorn 部署

```bash
pip install gunicorn
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8000
```

### 使用 Systemd 服务

```ini
# /etc/systemd/system/netguard-backend.service
[Unit]
Description=NetGuard Backend
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/netguard/backend
ExecStart=/usr/bin/python3 /path/to/netguard/backend/main.py
Restart=always

[Install]
WantedBy=multi-user.target
```

启动服务：
```bash
sudo systemctl daemon-reload
sudo systemctl enable netguard-backend
sudo systemctl start netguard-backend
```

### 使用 Docker 部署

```dockerfile
# backend/Dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p /app/backups

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

构建和运行：
```bash
docker build -t netguard-backend ./backend
docker run -p 8000:8000 -v $(pwd)/backups:/app/backups netguard-backend
```

### 使用 Nginx 反向代理

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location / {
        root /path/to/frontend/dist;
        try_files $uri $uri/ /index.html;
    }
}
```

## 安全建议

1. **使用 HTTPS**：生产环境必须使用 HTTPS
2. **环境变量**：不要在代码中硬编码敏感信息
3. **输入验证**：后端必须验证所有输入
4. **密码加密**：存储密码时使用加密
5. **访问控制**：实现用户认证和授权
6. **日志记录**：记录所有操作和错误
7. **定期备份**：定期备份数据库和配置文件
8. **SSH 密钥**：生产环境建议使用 SSH 密钥而非密码

## 故障排查

### 后端无法启动
- 检查端口 8000 是否被占用
- 检查 Python 版本是否 >= 3.8
- 查看错误日志
- 确认已安装所有依赖：`pip list`

### SSH 连接失败
- 检查网络连接
- 验证用户名和密码
- 检查 SSH 端口是否正确
- 检查防火墙设置
- 确认目标设备 SSH 服务是否运行

### 前端无法连接后端
- 检查 CORS 配置
- 验证 API_URL 是否正确
- 检查后端是否正在运行
- 查看浏览器控制台错误

### 批量备份失败
- 检查登录模板是否正确
- 确认设备 IP 地址可访问
- 查看后端日志获取详细错误信息
- 测试单个设备 SSH 连接

## 性能优化

1. **并发连接**：使用 asyncio 实现并发 SSH 连接
2. **连接池**：复用 SSH 连接减少开销
3. **超时设置**：合理设置连接和命令执行超时
4. **缓存机制**：缓存设备列表减少数据库查询
5. **分页查询**：大量数据时使用分页

## 扩展功能

### 添加数据库支持

```python
# 使用 SQLAlchemy
from sqlalchemy import create_engine, Column, String, Integer
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class Device(Base):
    __tablename__ = 'devices'
    id = Column(String, primary_key=True)
    name = Column(String)
    ip = Column(String)
    vendor = Column(String)
    location = Column(String)

engine = create_engine('sqlite:///netguard.db')
Base.metadata.create_all(engine)
```

### 添加用户认证

```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    if not validate_token(token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )
    return token
```

### 添加 WebSocket 支持

```python
from fastapi import WebSocket

@app.websocket("/ws/backup-progress")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            await websocket.send_json({"status": "processing", "data": data})
    except:
        await websocket.close()
```
