#!/bin/sh

DOMAIN="vkr-game.ru"
CERT_DIR="/etc/letsencrypt/live/$DOMAIN"

# Создаем папку для webroot (нужно для Let's Encrypt)
mkdir -p /var/www/certbot

# Если сертификатов еще нет (первый запуск сервера), создаем временные самоподписанные.
# Это необходимо, потому что Nginx откажется запускаться, если файлы сертификатов,
# указанные в конфиге, не существуют.
if [ ! -f "$CERT_DIR/fullchain.pem" ]; then
    echo "Создание временных сертификатов для $DOMAIN, чтобы Nginx смог запуститься..."
    mkdir -p "$CERT_DIR"
    openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
        -keyout "$CERT_DIR/privkey.pem" \
        -out "$CERT_DIR/fullchain.pem" \
        -subj "/CN=$DOMAIN"
fi

# Запускаем nginx на переднем плане
echo "Запуск Nginx..."
exec nginx -g "daemon off;"
