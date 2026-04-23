FROM node:22-alpine

WORKDIR /app

# Копируем конфиги пакетов
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем остальной код, включая schema.prisma
COPY . .

# Генерируем клиент Prisma
RUN npx prisma generate

# Собираем TypeScript
RUN npm run build

# Проброс порта (Express работает на 3001)
EXPOSE 3001

# Команда для запуска сервера в production
CMD ["npm", "start"]
