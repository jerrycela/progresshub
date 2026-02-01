FROM python:3.11-slim

# 設置工作目錄
WORKDIR /app

# 複製依賴文件
COPY requirements.txt .

# 安裝依賴
RUN pip install --no-cache-dir -r requirements.txt

# 複製應用程序代碼
COPY app.py .

# 運行應用程序
CMD ["python", "app.py"]
