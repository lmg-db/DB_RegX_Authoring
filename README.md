# 医学文献翻译与问答系统

基于深度学习的医学文献翻译系统，支持中英互译、文档问答和反向翻译验证功能。

### 基础配置
- CPU: 4核心及以上
- GPU: 16GB+显存
- 硬盘空间: 20GB+

- 📚 支持 PDF 文档翻译
- 💬 智能问答系统
- 🔄 反向翻译验证
- 📊 实时翻译进度显示
- 💾 自动保存翻译结果（DOCX 和 TXT 格式）
- 🎯 三种翻译质量模式（快速/标准/专业）
- 🌐 支持跨平台（Windows/Mac/Linux）

## 环境要求

### 必需软件
1. Docker Desktop
   - Windows/Mac 下载：https://www.docker.com/products/docker-desktop/
   - Linux：按照官方文档安装 Docker 和 Docker Compose
2. 安装 Docker Compose
```bash
sudo apt-get install docker-compose
```
   
### 硬件加速说明
- 翻译模型会优先使用 GPU 进行加速
- 需要 NVIDIA 显卡且显存不低于 16GB
- 如果没有满足要求的 GPU，系统会自动切换到 CPU 模式（但处理速度会显著降低）


## 启动说明

1. 启动服务
```bash
# 首次启动（自动下载镜像和模型）
docker-compose up --build
# 后续启动
docker-compose up
```

2. 访问应用
- 打开浏览器访问：http://localhost:5173

3. 停止服务
```bash
docker-compose down
```

## 使用说明

### 文档翻译
1. 选择"文档翻译"模式
2. 选择翻译质量（快速/标准/专业）
3. 可选：开启反向翻译验证
4. 上传 PDF 文件（支持中英文）
5. 等待翻译完成，系统会自动下载翻译结果

### 文档问答
1. 选择"问答系统"模式
2. 上传并翻译文档
3. 在对话框中输入问题
4. 系统会基于文档内容回答问题

## 数据安全

- 所有数据处理均在本地完成
- 仅在使用 Google 翻译 API 时需要网络连接
- 翻译结果保存在本地 `translated_documents` 目录
- Docker 容器使用独立网络，确保数据隔离

## 离线使用说明

首次在联网环境下载必要组件后，可以导出供离线使用：

1. 导出 Docker 镜像
```bash
docker save -o chatbot_images.tar chatbot_backend chatbot_frontend
```

2. 在离线环境使用
```bash
docker load -i chatbot_images.tar
docker-compose up
```

## 技术支持

如果遇到问题：
1. 检查 Docker 容器状态：
```bash
docker-compose ps
```

2. 查看容器日志：
```bash
docker-compose logs
```

3. 重新构建（如遇问题）：
```bash
docker-compose down
docker-compose up --build
``` 