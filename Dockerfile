# Use an official Python runtime as a parent image
FROM python:3.13-slim

# Install Node.js
RUN apt-get update && apt-get install -y \
    curl \
    && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /app

# Copy backend requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ ./backend/

# Copy frontend code
COPY frontend/ ./frontend/

# Install frontend dependencies
WORKDIR /app/frontend
RUN npm install

# Build the frontend (optional, depending on how you want to run it)
# RUN npm run build

# Go back to /app
WORKDIR /app

# Copy scripts
COPY docker/start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Expose ports
# Backend
EXPOSE 8000
# Frontend (Vite)
EXPOSE 5173

# Entrypoint
CMD ["/app/start.sh"]
