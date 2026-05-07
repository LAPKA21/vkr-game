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

# Устанавливаем openssl для генерации временных сертификатов при первом запуске
RUN apk add --no-cache openssl

# Копируем собранные файлы
COPY --from=build /app/dist /usr/share/nginx/html

# Копируем наш конфиг Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Копируем скрипт инициализации
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 80 443
CMD ["/entrypoint.sh"]
