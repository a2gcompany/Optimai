#!/bin/bash
# Telegram Bot Setup - Espera tu mensaje y configura el chat_id

BOT_TOKEN="8006419019:AAES5tgARSjF75gJpdD9Gz4v0Ur_YDXimO4"
CONFIG_FILE="$HOME/optimai/telegram.json"

echo "🤖 Esperando tu mensaje en @Nucleus_assistant_bot..."
echo "   Envía cualquier mensaje al bot para configurar la conexión."
echo ""

while true; do
  result=$(curl -s "https://api.telegram.org/bot$BOT_TOKEN/getUpdates?limit=1&offset=-1")
  chat_id=$(echo "$result" | jq -r '.result[0].message.chat.id // empty')

  if [ -n "$chat_id" ]; then
    name=$(echo "$result" | jq -r '.result[0].message.from.first_name // "Usuario"')

    echo "✅ Mensaje recibido de $name (chat_id: $chat_id)"

    # Guardar configuración
    echo "{\"chat_id\": $chat_id, \"name\": \"$name\"}" > "$CONFIG_FILE"
    echo "📁 Configuración guardada en $CONFIG_FILE"

    # Enviar respuesta
    curl -s -X POST "https://api.telegram.org/bot$BOT_TOKEN/sendMessage" \
      -H "Content-Type: application/json" \
      -d "{
        \"chat_id\": $chat_id,
        \"text\": \"🚀 *Optimai conectado exitosamente*\n\n¡Hola $name! Tu chat_id ($chat_id) ha sido configurado.\n\nAhora puedes recibir notificaciones de Optimai.\",
        \"parse_mode\": \"Markdown\"
      }" > /dev/null

    echo "📨 Mensaje de confirmación enviado"
    break
  fi

  sleep 2
done
