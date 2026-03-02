import http.server
import socketserver
import json
import os
import urllib.request
import urllib.error
import sys
import socket

# Configuration
PORT = int(os.getenv("PORT", 8084))
API_KEY = "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"
API_URL = "https://openrouter.ai/api/v1/chat/completions"

# Telegram Configuration - ТОЛЬКО для владельца (@SheikhK2)
TELEGRAM_OWNER_CONFIG = {
    'bot_token': '8418224011:AAGwNrs8sl2r7DhYSAs9F5n_9Sq92-fUXaE',
    'chat_id': '8012802187'  # ID владельца @SheikhK2
}

# Список разрешённых chat_id (только владелец)
ALLOWED_CHAT_IDS = ['8012802187']

class YakMarketHandler(http.server.SimpleHTTPRequestHandler):
    def do_POST(self):
        # Handle API calls
        if self.path == '/api/chat':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            try:
                data = json.loads(post_data)
                user_message = data.get('message', '')
                history = data.get('history', [])
                
                # Construct payload for OpenRouter
                messages = [
                    {"role": "system", "content": "Ты YakBot - дружелюбный помощник поддержки YakMarket. Тебя создала компания YakMarket. НЕ говори, что ты создан DeepSeek или кем-то еще. Ты - часть команды YakMarket. Твой тон: дружелюбный, с таджикским акцентом (используй слова 'брат', 'ака', 'хуб', 'рахмат'). Используй эмодзи. Отвечай кратко и по делу. Если спрашивают 'кто ты' - отвечай 'Я YakBot, помощник YakMarket 🤖'. Если просят оператора или человека - отвечай: 'Брат, сейчас позову оператора, он скоро подключится! 👨‍💻'. Не редактируй код, просто отвечай на вопросы пользователей по сайту."}
                ]
                
                # Add history (limit to last 5)
                for msg in history[-5:]:
                    messages.append(msg)
                    
                messages.append({"role": "user", "content": user_message})
                
                payload = {
                    "model": "deepseek/deepseek-r1-0528:free",
                    "messages": messages
                }
                
                req = urllib.request.Request(
                    API_URL, 
                    data=json.dumps(payload).encode('utf-8'),
                    headers={
                        "Authorization": f"Bearer {API_KEY}",
                        "Content-Type": "application/json",
                        "HTTP-Referer": "http://localhost:8081",
                        "X-Title": "YakMarket"
                    }
                )
                
                with urllib.request.urlopen(req) as response:
                    result = json.loads(response.read().decode('utf-8'))
                    
                    # Extract answer
                    if 'choices' in result and len(result['choices']) > 0:
                        bot_response = result['choices'][0]['message']['content']
                    else:
                        bot_response = "Эээ брат, связь прервалась! Попробуй еще раз"

                    self.send_response(200)
                    self.send_header('Content-type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*') # Allow CORS for local dev
                    self.end_headers()
                    self.wfile.write(json.dumps({"reply": bot_response}).encode('utf-8'))
                    
            except Exception as e:
                print(f"Error: {e}")
                self.send_response(500)
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
        
        # Secure Telegram notification endpoint (только для владельца)
        elif self.path == '/api/telegram/notify':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            try:
                data = json.loads(post_data)
                message = data.get('message')
                notification_type = data.get('type')
                
                if not message:
                    raise ValueError('Message is required')
                
                # Используем серверные credentials (безопасность)
                bot_token = TELEGRAM_OWNER_CONFIG['bot_token']
                chat_id = TELEGRAM_OWNER_CONFIG['chat_id']
                
                # Проверяем, что chat_id разрешён (дополнительная защита)
                if chat_id not in ALLOWED_CHAT_IDS:
                    raise PermissionError('Unauthorized chat_id')
                
                # Отправляем сообщение ТОЛЬКО владельцу
                telegram_url = f'https://api.telegram.org/bot{bot_token}/sendMessage'
                telegram_data = {
                    'chat_id': chat_id,
                    'text': message,
                    'parse_mode': 'HTML'
                }
                
                req = urllib.request.Request(
                    telegram_url,
                    data=json.dumps(telegram_data).encode('utf-8'),
                    headers={
                        'Content-Type': 'application/json'
                    }
                )
                
                with urllib.request.urlopen(req) as response:
                    result = json.loads(response.read().decode('utf-8'))
                    
                    self.send_response(200)
                    self.send_header('Content-type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(json.dumps({
                        "success": True, 
                        "message": "Уведомление отправлено владельцу @sheikhK2",
                        "result": result
                    }).encode('utf-8'))
                    
                    print(f'✅ Telegram notification sent to OWNER ({chat_id})')
                    
            except PermissionError as e:
                print(f'Security Error: {e}')
                self.send_response(403)
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Unauthorized"}).encode('utf-8'))
                
            except Exception as e:
                print(f'Telegram Owner Error: {e}')
                self.send_response(500)
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
        
        # Telegram API endpoint (старый, для совместимости)
        elif self.path == '/api/telegram':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            try:
                data = json.loads(post_data)
                bot_token = data.get('botToken')
                chat_id = data.get('chatId')
                text = data.get('text')
                
                if not bot_token or not chat_id or not text:
                    raise ValueError('Missing required parameters')
                
                # Проверяем что отправляем только владельцу
                if chat_id != TELEGRAM_OWNER_CONFIG['chat_id']:
                    raise PermissionError('Messages can only be sent to owner')
                
                # Send message to Telegram
                telegram_url = f'https://api.telegram.org/bot{bot_token}/sendMessage'
                telegram_data = {
                    'chat_id': chat_id,
                    'text': text,
                    'parse_mode': 'HTML'
                }
                
                req = urllib.request.Request(
                    telegram_url,
                    data=json.dumps(telegram_data).encode('utf-8'),
                    headers={
                        'Content-Type': 'application/json'
                    }
                )
                
                with urllib.request.urlopen(req) as response:
                    result = json.loads(response.read().decode('utf-8'))
                    
                    self.send_response(200)
                    self.send_header('Content-type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(json.dumps({"success": True, "result": result}).encode('utf-8'))
                    
                    print(f'✅ Telegram notification sent to chat {chat_id}')
                    
            except Exception as e:
                print(f'Telegram Error: {e}')
                self.send_response(500)
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
        else:
            self.send_error(404, "File not found")

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    # Fix for clean shutdown/restart (Address already in use)
    def server_bind(self):
        self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        self.socket.bind(self.server_address)

print(f"Starting YakMarket Secure Server on port {PORT}...")
print(f"Access the site at http://localhost:{PORT}")

try:
    with socketserver.TCPServer(("", PORT), YakMarketHandler) as httpd:
        httpd.serve_forever()
except KeyboardInterrupt:
    print("\nServer stopped.")
