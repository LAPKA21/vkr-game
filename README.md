# Multiplayer Poker

Веб-приложение **Texas Hold'em** с онлайн-режимом (до 6 игроков) и режимом обучения против бота.

## Технологии

- **Frontend:** React 18, Vite, TypeScript
- **Backend:** Node.js, Express
- **Реальное время:** Socket.io
- **Управление состоянием игры:** конечный автомат (FSM)

## Структура проекта

```
Diplom/
├── client/                 # React + Vite
│   ├── src/
│   │   ├── components/      # Card, GameTable
│   │   ├── pages/          # Home, ServerBrowser, GameRoom, TrainingRoom
│   │   ├── services/       # socket.ts
│   │   ├── state/          # gameStateMachine (клиентский FSM)
│   │   └── types/
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── server/                 # Node.js + Express + Socket.io
│   ├── src/
│   │   ├── game/           # gameStateMachine, pokerLogic, botStrategy
│   │   ├── rooms/          # roomManager
│   │   ├── socket/         # handlers
│   │   └── types/
│   ├── package.json
│   └── tsconfig.json
└── README.md
```

## Конечный автомат (FSM)

Состояния игры (файл `server/src/game/gameStateMachine.ts`):

| Состояние | Описание |
|-----------|----------|
| `WAITING_FOR_PLAYERS` | Ожидание игроков (минимум 2 для старта) |
| `PRE_FLOP` | Раздача карт, первый круг ставок |
| `FLOP` | Три общие карты, второй круг ставок |
| `TURN` | Четвёртая общая карта, третий круг ставок |
| `RIVER` | Пятая общая карта, четвёртый круг ставок |
| `SHOWDOWN` | Вскрытие карт, определение победителя |
| `ROUND_END` | Конец раунда, подготовка к следующему |

События: `PLAYER_JOINED`, `START_GAME`, `ALL_BET`, `DEAL_FLOP`, `DEAL_TURN`, `DEAL_RIVER`, `SHOWDOWN`, `ROUND_END`, `PLAYER_DISCONNECTED`, `RESTART_ROUND`, `TIMEOUT_ACTION`.

Действия игрока: **Fold**, **Check**, **Call**, **Raise**, **All-in**.


## Функционал

1. **Главная страница**
   - Играть онлайн (переход к списку серверов)
   - Список серверов
   - Обучение с ботом (создание тренировочной комнаты)

2. **Список серверов**
   - Просмотр комнат, количество игроков
   - Создание новой комнаты
   - Подключение к выбранной комнате

3. **Онлайн-режим**
   - До 6 игроков в комнате
   - Texas Hold'em по WebSocket
   - Таймер хода (30 с), авто-чек по таймауту
   - Рестарт раунда после окончания раздачи

4. **Режим обучения**
   - Игра против одного бота
   - Бот: оценка силы руки, логика ставок реализована через Марковскую цепь (fold / check / call / raise / all-in)

5. **Игровой стол**
   - Карты игроков и общие карты
   - Банк, текущая ставка, состояние раунда
   - Анимация раздачи карт
   - Кнопки: Сброс, Чек, Колл, Поднять, Ва-банк

