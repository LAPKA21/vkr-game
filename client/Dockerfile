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

# Генерируем простой самоподписанный SSL-сертификат
RUN apk add --no-cache openssl && \
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/ssl/private/nginx-selfsigned.key \
    -out /etc/ssl/certs/nginx-selfsigned.crt \
    -subj "/C=RU/O=PokerGame/CN=localhost"

# Копируем собранные файлы в папку, из которой Nginx их раздает
COPY --from=build /app/dist /usr/share/nginx/html

# Копируем конфиг nginx для поддержки SSL, React Router и проксирования
RUN echo 'server { \
    listen 80; \
    listen 443 ssl; \
    ssl_certificate /etc/ssl/certs/nginx-selfsigned.crt; \
    ssl_certificate_key /etc/ssl/private/nginx-selfsigned.key; \
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

EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]
