# Stage 1: Build React App
FROM node:22-alpine as build

WORKDIR /app

# Копируем конфиги
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем исходники и билдим
COPY . .
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Копируем собранные файлы в папку, из которой Nginx их раздает
COPY --from=build /app/dist /usr/share/nginx/html

# Копируем конфиг nginx для поддержки React Router и проксирования к Node.js
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
    location /api/ { \
        proxy_pass http://server:3001; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
    } \
    location /socket.io/ { \
        proxy_pass http://server:3001; \
        proxy_http_version 1.1; \
        proxy_set_header Upgrade $http_upgrade; \
        proxy_set_header Connection "upgrade"; \
        proxy_set_header Host $host; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
