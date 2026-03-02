"""
🤖 YAKMARKET STRAPI ADMIN BOT
Telegram панель управления для Strapi CMS
Python 3.11+ | aiogram 3.x
"""

import asyncio
import logging
import sys
from typing import Optional
from datetime import datetime

import aiohttp
from aiogram import Bot, Dispatcher, F, types
from aiogram.enums import ParseMode
from aiogram.filters import Command, CommandStart
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, CallbackQuery
from aiogram.utils.keyboard import InlineKeyboardBuilder
from aiogram.exceptions import TelegramAPIError

# --- Configuration (Loads from Environment Variables) ---
import os
from dotenv import load_dotenv

load_dotenv()

# Telegram Bot Token
BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")

# Strapi API конфигурация
STRAPI_URL = os.getenv("STRAPI_URL", "https://yakmarket-api-production.up.railway.app").rstrip('/')
STRAPI_API_TOKEN = os.getenv("STRAPI_API_TOKEN")

# ID администраторов
admin_ids_str = os.getenv("ADMIN_IDS", "8012802187")
ADMIN_IDS = [int(i.strip()) for i in admin_ids_str.split(",") if i.strip().isdigit()]

if not BOT_TOKEN:
    logger.error("❌ TELEGRAM_BOT_TOKEN not found in environment!")
    sys.exit(1)

if not STRAPI_API_TOKEN:
    logger.error("❌ STRAPI_API_TOKEN not found in environment!")
    sys.exit(1)

# Настройки
MAX_TEXT_LENGTH = 4000
REQUEST_TIMEOUT = 30

# ═══════════════════════════════════════════════════════════════════
# 🛠️ ИНИЦИАЛИЗАЦИЯ
# ═══════════════════════════════════════════════════════════════════

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    stream=sys.stdout
)
logger = logging.getLogger(__name__)

bot = Bot(token=BOT_TOKEN, parse_mode=ParseMode.HTML)
dp = Dispatcher()

# Хранилище сообщений для обновления (message_id -> данные)
user_messages = {}
product_messages = {}

# ═══════════════════════════════════════════════════════════════════
# 🔧 ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
# ═══════════════════════════════════════════════════════════════════

class StrapiAPI:
    """Класс для работы с Strapi REST API"""
    
    def __init__(self, base_url: str, api_token: str):
        self.base_url = base_url.rstrip('/')
        self.headers = {
            "Authorization": f"Bearer {api_token}",
            "Content-Type": "application/json"
        }
    
    async def _request(self, method: str, endpoint: str, **kwargs) -> Optional[dict]:
        """Выполнить HTTP запрос к Strapi"""
        url = f"{self.base_url}/api{endpoint}"
        
        async with aiohttp.ClientSession() as session:
            try:
                async with session.request(
                    method=method,
                    url=url,
                    headers=self.headers,
                    timeout=aiohttp.ClientTimeout(total=REQUEST_TIMEOUT),
                    **kwargs
                ) as response:
                    if response.status == 200 or response.status == 201:
                        return await response.json()
                    elif response.status == 204:
                        return {"success": True}
                    else:
                        text = await response.text()
                        logger.error(f"Strapi API Error {response.status}: {text}")
                        return None
            except Exception as e:
                logger.error(f"Request error: {e}")
                return None
    
    async def get_users(self, limit: int = 10) -> list:
        """Получить список пользователей"""
        result = await self._request(
            "GET", 
            f"/users?pagination[limit]={limit}&sort=createdAt:desc"
        )
        # Strapi returns { "data": [...], "meta": {...} }
        if isinstance(result, dict) and 'data' in result:
            return result.get('data', [])
        return result if isinstance(result, list) else []
    
    async def get_user(self, user_id: str) -> Optional[dict]:
        """Получить информацию о пользователе"""
        result = await self._request("GET", f"/users/{user_id}")
        if isinstance(result, dict) and 'data' in result:
            return result.get('data')
        # Если это сам объект пользователя
        if isinstance(result, dict) and 'id' in result:
            return result
        return result
    
    async def update_user(self, user_id: str, data: dict) -> Optional[dict]:
        """Обновить пользователя"""
        return await self._request(
            "PUT", 
            f"/users/{user_id}", 
            json=data
        )
    
    async def add_warning(self, user_id: str, reason: str = None) -> Optional[dict]:
        """Добавить предупреждение пользователю"""
        # Получаем текущее количество предупреждений
        user = await self.get_user(user_id)
        if not user:
            return None
        
        current_warnings = user.get('warnings', 0) or 0
        
        return await self._request(
            "PUT",
            f"/users/{user_id}",
            json={
                "warnings": current_warnings + 1
            }
        )
    
    async def remove_warnings(self, user_id: str) -> Optional[dict]:
        """Снять все предупреждения"""
        return await self._request(
            "PUT",
            f"/users/{user_id}",
            json={"warnings": 0}
        )
    
    async def delete_user(self, user_id: str) -> bool:
        """Удалить пользователя"""
        result = await self._request("DELETE", f"/users/{user_id}")
        return result is not None
    
    async def get_product(self, product_id: str) -> Optional[dict]:
        """Получить товар"""
        result = await self._request("GET", f"/products/{product_id}?populate=*")
        return result.get('data') if result else None
    
    async def update_product(self, product_id: str, data: dict) -> Optional[dict]:
        """Обновить товар"""
        return await self._request(
            "PUT",
            f"/products/{product_id}",
            json={"data": data}
        )

# Инициализация API
strapi = StrapiAPI(STRAPI_URL, STRAPI_API_TOKEN)

# ═══════════════════════════════════════════════════════════════════
# 🎨 КЛАВИАТУРЫ
# ═══════════════════════════════════════════════════════════════════

def get_main_keyboard() -> InlineKeyboardMarkup:
    """Главное меню"""
    builder = InlineKeyboardBuilder()
    builder.button(text="👥 Пользователи", callback_data="menu_users")
    builder.button(text="📦 Товары на модерации", callback_data="menu_products")
    builder.button(text="📊 Статистика", callback_data="menu_stats")
    builder.adjust(1)
    return builder.as_markup()

def get_user_actions_keyboard(user_id: str, is_blocked: bool) -> InlineKeyboardMarkup:
    """Клавиатура действий с пользователем"""
    builder = InlineKeyboardBuilder()
    
    if is_blocked:
        builder.button(
            text="✅ Разблокировать", 
            callback_data=f"user_unblock_{user_id}"
        )
    else:
        builder.button(
            text="🚫 Заблокировать", 
            callback_data=f"user_block_{user_id}"
        )
    
    builder.button(text="⚠️ Предупреждение", callback_data=f"user_warn_{user_id}")
    builder.button(text="✅ Снять предупреждения", callback_data=f"user_unwarn_{user_id}")
    builder.button(text="🗑 Удалить", callback_data=f"user_delete_{user_id}")
    builder.button(text="🔙 Назад", callback_data="back_to_users")
    
    builder.adjust(2, 2, 1, 1)
    return builder.as_markup()

def get_product_moderation_keyboard(product_id: str) -> InlineKeyboardMarkup:
    """Клавиатура модерации товара"""
    builder = InlineKeyboardBuilder()
    builder.button(
        text="✅ Принять", 
        callback_data=f"product_approve_{product_id}"
    )
    builder.button(
        text="❌ Отклонить", 
        callback_data=f"product_reject_{product_id}"
    )
    builder.adjust(2)
    return builder.as_markup()

# ═══════════════════════════════════════════════════════════════════
# 🛡️ МИДЛВАРЫ
# ═══════════════════════════════════════════════════════════════════

async def is_admin(user_id: int) -> bool:
    """Проверить является ли пользователь админом"""
    return user_id in ADMIN_IDS

@dp.message.middleware()
async def admin_check_middleware(handler, event, data):
    """Проверка прав администратора"""
    if isinstance(event, (types.Message, types.CallbackQuery)):
        user_id = event.from_user.id
        if not await is_admin(user_id):
            if isinstance(event, types.Message):
                await event.answer("⛔ У вас нет доступа к этому боту!")
            else:
                await event.answer("⛔ Нет доступа!", show_alert=True)
            return
    return await handler(event, data)

# ═══════════════════════════════════════════════════════════════════
# 📨 ОБРАБОТЧИКИ КОМАНД
# ═══════════════════════════════════════════════════════════════════

@dp.message(CommandStart())
async def cmd_start(message: types.Message):
    """Команда /start"""
    await message.answer(
        f"👑 ПАНЕЛЬ ЗАПУЩЕНА (v3.2)\n\n"
        f"Добро пожаловать!\n\n"
        f"Выберите действие:",
        reply_markup=get_main_keyboard()
    )

@dp.message(Command("users"))
async def cmd_users(message: types.Message):
    """Показать список пользователей"""
    await show_users_list(message)

async def show_users_list(message_or_callback, page: int = 0):
    """Показать список пользователей с пагинацией"""
    status_message = await message_or_callback.answer("🔄 Загрузка пользователей...")
    
    users = await strapi.get_users(limit=20)
    
    if not users:
        await status_message.edit_text("📴 Пользователей пока нет или Strapi недоступен.\n\nПроверьте:\n1. Strapi запущен\n2. Токен верный")
        return
    
    builder = InlineKeyboardBuilder()
    text = f"👥 <b>ПОЛЬЗОВАТЕЛИ</b> (всего {len(users)}):\n\n"
    
    for i, user in enumerate(users, 1):
        user_id = str(user.get('id', 'unknown'))
        username = user.get('username', 'Без имени')
        email = user.get('email', 'Нет email')
        is_blocked = user.get('blocked', False)
        warnings = user.get('warnings', 0) or 0
        
        # Статус
        if is_blocked:
            status = "🚫 ЗАБАНЕН"
        elif warnings > 0:
            status = f"⚠️ {warnings} предупрежд."
        else:
            status = "✅ Активен"
        
        text += f"{i}. {status} <b>{username}</b>\n   📧 {email}\n\n"
        
        builder.button(
            text=f"{i}. {username[:20]} {'🚫' if is_blocked else '⚠️' if warnings > 0 else '✅'}",
            callback_data=f"select_user_{user_id}"
        )
    
    builder.adjust(1)
    builder.row(InlineKeyboardButton(text="🔙 Главное меню", callback_data="back_main"))
    
    await status_message.edit_text(
        text[:MAX_TEXT_LENGTH],
        reply_markup=builder.as_markup()
    )

@dp.message(Command("stats"))
async def cmd_stats(message: types.Message):
    """Показать статистику"""
    users = await strapi.get_users(limit=100)
    blocked_count = sum(1 for u in users if u.get('blocked'))
    warnings_count = sum(1 for u in users if (u.get('warnings', 0) or 0) > 0)
    
    await message.answer(
        f"📊 <b>СТАТИСТИКА</b>\n\n"
        f"👥 Всего пользователей: {len(users)}\n"
        f"🚫 Заблокировано: {blocked_count}\n"
        f"⚠️ С предупреждениями: {warnings_count}\n"
        f"✅ Активных: {len(users) - blocked_count}\n\n"
        f"🕐 Обновлено: {datetime.now().strftime('%H:%M:%S')}",
        reply_markup=get_main_keyboard()
    )

@dp.message(Command("warn"))
async def cmd_warn(message: types.Message, command: CommandObject):
    """Дать предупреждение пользователю"""
    if not command.args:
        await message.answer("Использование: /warn <user_id> [причина]\n\nПример: /warn 5 Спам")
        return
    
    parts = command.args.split(' ', 1)
    user_id = parts[0]
    reason = parts[1] if len(parts) > 1 else "Нарушение правил"
    
    result = await strapi.add_warning(user_id, reason)
    
    if result:
        await message.answer(f"✅ Пользователю {user_id} выдано предупреждение!\n📝 Причина: {reason}")
    else:
        await message.answer(f"❌ Не удалось выдать предупреждение")

@dp.message(Command("unwarn"))
async def cmd_unwarn(message: types.Message, command: CommandObject):
    """Снять предупреждения"""
    if not command.args:
        await message.answer("Использование: /unwarn <user_id>\n\nПример: /unwarn 5")
        return
    
    user_id = command.args
    result = await strapi.remove_warnings(user_id)
    
    if result:
        await message.answer(f"✅ У пользователя {user_id} сняты все предупреждения!")
    else:
        await message.answer(f"❌ Не удалось снять предупреждения")

# ═══════════════════════════════════════════════════════════════════
# 🔘 ОБРАБОТЧИКИ КНОПОК
# ═══════════════════════════════════════════════════════════════════

@dp.callback_query(F.data == "menu_users")
async def on_menu_users(callback: CallbackQuery):
    await show_users_list(callback)
    await callback.answer()

@dp.callback_query(F.data == "back_main")
async def on_back_main(callback: CallbackQuery):
    await callback.message.edit_text(
        "👑 <b>YAKMARKET ADMIN PANEL</b>\n\nВыберите действие:",
        reply_markup=get_main_keyboard()
    )
    await callback.answer()

@dp.callback_query(F.data == "back_to_users")
async def on_back_to_users(callback: CallbackQuery):
    await show_users_list(callback)
    await callback.answer()

@dp.callback_query(F.data.startswith("select_user_"))
async def on_select_user(callback: CallbackQuery):
    """Выбор пользователя - показать действия"""
    user_id = callback.data.replace("select_user_", "")
    
    await callback.message.edit_text(
        "🔄 Загрузка информации..."
    )
    
    user = await strapi.get_user(user_id)
    
    if not user:
        await callback.message.edit_text("❌ Пользователь не найден")
        return
    
    username = user.get('username', 'Без имени')
    email = user.get('email', 'Нет email')
    phone = user.get('phone', 'Не указан')
    is_blocked = user.get('blocked', False)
    warnings = user.get('warnings', 0) or 0
    created_at = user.get('createdAt', 'Неизвестно')
    
    text = (
        f"👤 <b>ПОЛЬЗОВАТЕЛЬ</b>\n\n"
        f"🆔 ID: <code>{user_id}</code>\n"
        f"📛 Имя: {username}\n"
        f"📧 Email: {email}\n"
        f"📱 Телефон: {phone}\n"
        f"📅 Регистрация: {created_at[:10] if created_at else 'Н/Д'}\n"
        f"📊 Статус: {'🚫 Заблокирован' if is_blocked else '✅ Активен'}\n"
        f"⚠️ Предупреждений: {warnings}\n\n"
        f"Выберите действие:"
    )
    
    # Сохраняем message_id для обновления
    user_messages[user_id] = callback.message.message_id
    
    await callback.message.edit_text(
        text,
        reply_markup=get_user_actions_keyboard(user_id, is_blocked)
    )
    await callback.answer()

@dp.callback_query(F.data.startswith("user_block_"))
async def on_block_user(callback: CallbackQuery):
    """Блокировка пользователя"""
    user_id = callback.data.replace("user_block_", "")
    
    await callback.answer("🔄 Блокировка...", show_alert=False)
    
    result = await strapi.update_user(user_id, {"blocked": True})
    
    if result:
        # Обновляем сообщение
        await callback.message.edit_text(
            callback.message.text.replace("✅ Активен", "🚫 Заблокирован"),
            reply_markup=get_user_actions_keyboard(user_id, True)
        )
        await callback.answer("🚫 Пользователь заблокирован!", show_alert=True)
    else:
        await callback.answer("❌ Ошибка блокировки", show_alert=True)

@dp.callback_query(F.data.startswith("user_unblock_"))
async def on_unblock_user(callback: CallbackQuery):
    """Разблокировка пользователя"""
    user_id = callback.data.replace("user_unblock_", "")
    
    await callback.answer("🔄 Разблокировка...", show_alert=False)
    
    result = await strapi.update_user(user_id, {"blocked": False})
    
    if result:
        await callback.message.edit_text(
            callback.message.text.replace("🚫 Заблокирован", "✅ Активен"),
            reply_markup=get_user_actions_keyboard(user_id, False)
        )
        await callback.answer("✅ Пользователь разблокирован!", show_alert=True)
    else:
        await callback.answer("❌ Ошибка разблокировки", show_alert=True)

@dp.callback_query(F.data.startswith("user_delete_"))
async def on_delete_user(callback: CallbackQuery):
    """Удаление пользователя"""
    user_id = callback.data.replace("user_delete_", "")
    
    # Подтверждение
    await callback.answer("⚠️ Удаляем...", show_alert=False)
    
    success = await strapi.delete_user(user_id)
    
    if success:
        await callback.message.edit_text(
            f"🗑 <b>ПОЛЬЗОВАТЕЛЬ УДАЛЁН</b>\n\n"
            f"ID: <code>{user_id}</code>\n\n"
            f"✅ Пользователь полностью удалён из системы",
            reply_markup=InlineKeyboardMarkup(
                inline_keyboard=[
                    [InlineKeyboardButton(text="🔙 К списку", callback_data="back_to_users")]
                ]
            )
        )
        await callback.answer("🗑 Удалено!", show_alert=True)
    else:
        await callback.answer("❌ Ошибка удаления", show_alert=True)

@dp.callback_query(F.data.startswith("user_warn_"))
async def on_warn_user(callback: CallbackQuery):
    """Выдать предупреждение пользователю"""
    user_id = callback.data.replace("user_warn_", "")
    
    await callback.answer("⚠️ Выдаю предупреждение...", show_alert=False)
    
    result = await strapi.add_warning(user_id, "Нарушение правил")
    
    if result:
        # Обновляем сообщение
        current_text = callback.message.text
        if "⚠️ Предупреждений:" in current_text:
            # Увеличиваем счётчик
            import re
            match = re.search(r"⚠️ Предупреждений: (\d+)", current_text)
            if match:
                count = int(match.group(1)) + 1
                new_text = current_text.replace(f"⚠️ Предупреждений: {match.group(1)}", f"⚠️ Предупреждений: {count}")
            else:
                new_text = current_text
        else:
            new_text = current_text.replace("Выберите действие:", "⚠️ Предупреждений: 1\n\nВыберите действие:")
        
        await callback.message.edit_text(new_text)
        await callback.answer("⚠️ Предупреждение выдано!", show_alert=True)
    else:
        await callback.answer("❌ Ошибка", show_alert=True)

@dp.callback_query(F.data.startswith("user_unwarn_"))
async def on_unwarn_user(callback: CallbackQuery):
    """Снять предупреждения с пользователя"""
    user_id = callback.data.replace("user_unwarn_", "")
    
    await callback.answer("✅ Снимаю предупреждения...", show_alert=False)
    
    result = await strapi.remove_warnings(user_id)
    
    if result:
        # Обновляем сообщение
        current_text = callback.message.text
        new_text = current_text.replace("⚠️ Предупреждений: 1", "⚠️ Предупреждений: 0")
        new_text = new_text.replace("⚠️ Предупреждений: 0\n\n", "")
        
        await callback.message.edit_text(new_text)
        await callback.answer("✅ Предупреждения сняты!", show_alert=True)
    else:
        await callback.answer("❌ Ошибка", show_alert=True)

# ═══════════════════════════════════════════════════════════════════
# 📦 МОДЕРАЦИЯ ТОВАРОВ
# ═══════════════════════════════════════════════════════════════════

async def notify_new_product(product_data: dict):
    """
    Отправить уведомление о новом товаре всем админам
    Вызывается из внешнего webhook
    """
    try:
        attributes = product_data.get('attributes', {})
        product_id = product_data.get('id', 'unknown')
        
        title = attributes.get('title', 'Без названия')
        description = attributes.get('description', 'Нет описания')[:200]
        price = attributes.get('price', 0)
        
        # Получаем фото если есть
        images = attributes.get('images', {}).get('data', [])
        photo_url = None
        if images:
            photo_url = images[0].get('attributes', {}).get('url', '')
            if photo_url and not photo_url.startswith('http'):
                photo_url = f"{STRAPI_URL}{photo_url}"
        
        text = (
            f"⚡️ <b>НОВЫЙ ТОВАР НА МОДЕРАЦИЮ!</b>\n\n"
            f"📦 <b>{title}</b>\n"
            f"💰 Цена: {price} TJS\n\n"
            f"📝 {description}...\n\n"
            f"🆔 ID: <code>{product_id}</code>"
        )
        
        keyboard = get_product_moderation_keyboard(str(product_id))
        
        for admin_id in ADMIN_IDS:
            try:
                if photo_url:
                    sent_msg = await bot.send_photo(
                        chat_id=admin_id,
                        photo=photo_url,
                        caption=text,
                        reply_markup=keyboard
                    )
                else:
                    sent_msg = await bot.send_message(
                        chat_id=admin_id,
                        text=text,
                        reply_markup=keyboard
                    )
                
                # Сохраняем для обновления
                product_messages[product_id] = {
                    'chat_id': admin_id,
                    'message_id': sent_msg.message_id
                }
                
            except Exception as e:
                logger.error(f"Error sending to admin {admin_id}: {e}")
                
    except Exception as e:
        logger.error(f"Error in notify_new_product: {e}")

@dp.callback_query(F.data.startswith("product_approve_"))
async def on_approve_product(callback: CallbackQuery):
    """Принять товар"""
    product_id = callback.data.replace("product_approve_", "")
    
    await callback.answer("🔄 Публикация...", show_alert=False)
    
    # Обновляем статус в Strapi
    result = await strapi.update_product(product_id, {
        "status": "published",
        "publishedAt": datetime.now().isoformat()
    })
    
    if result:
        # Обновляем сообщение
        await callback.message.edit_caption(
            caption=callback.message.caption + "\n\n✅ <b>ОПУБЛИКОВАНО</b>",
            reply_markup=None
        ) if callback.message.photo else await callback.message.edit_text(
            text=callback.message.text + "\n\n✅ <b>ОПУБЛИКОВАНО</b>",
            reply_markup=None
        )
        await callback.answer("✅ Товар опубликован!", show_alert=True)
    else:
        await callback.answer("❌ Ошибка публикации", show_alert=True)

@dp.callback_query(F.data.startswith("product_reject_"))
async def on_reject_product(callback: CallbackQuery):
    """Отклонить товар"""
    product_id = callback.data.replace("product_reject_", "")
    
    await callback.answer("🔄 Удаление...", show_alert=False)
    
    # Удаляем товар из Strapi
    # или можно обновить статус на 'rejected'
    result = await strapi._request("DELETE", f"/products/{product_id}")
    
    if result is not None:
        await callback.message.edit_caption(
            caption=callback.message.caption + "\n\n❌ <b>ОТКЛОНЕНО</b>",
            reply_markup=None
        ) if callback.message.photo else await callback.message.edit_text(
            text=callback.message.text + "\n\n❌ <b>ОТКЛОНЕНО</b>",
            reply_markup=None
        )
        await callback.answer("❌ Товар отклонён", show_alert=True)
    else:
        await callback.answer("❌ Ошибка", show_alert=True)

# ═══════════════════════════════════════════════════════════════════
# 🌐 WEBSERVER ДЛЯ ПРИЁМА WEBHOOK ОТ STRAPI
# ═══════════════════════════════════════════════════════════════════

from aiohttp import web

async def handle_strapi_webhook(request):
    """Обработчик webhook от Strapi"""
    try:
        data = await request.json()
        logger.info(f"Received webhook: {data}")
        
        # Проверяем событие
        event = data.get('event')
        
        if event == 'entry.create':
            model = data.get('model', '')
            entry = data.get('entry', {})
            
            if model == 'product':
                # Новый товар - отправляем на модерацию
                await notify_new_product({'data': entry})
                return web.json_response({'status': 'notified'})
        
        return web.json_response({'status': 'ignored'})
        
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return web.json_response({'error': str(e)}, status=500)

async def health_check(request):
    """Проверка работоспособности"""
    return web.json_response({
        'status': 'ok',
        'bot': 'running',
        'timestamp': datetime.now().isoformat()
    })

async def start_webserver():
    """Запуск веб-сервера для webhook"""
    app = web.Application()
    app.router.add_post('/webhook/strapi', handle_strapi_webhook)
    app.router.add_get('/health', health_check)
    
    runner = web.AppRunner(app)
    await runner.setup()
    
    port = int(os.environ.get('PORT', 8080))
    site = web.TCPSite(runner, '0.0.0.0', port)
    
    await site.start()
    logger.info(f"Webserver started on port {port}")
    
    return runner

# ═══════════════════════════════════════════════════════════════════
# 🚀 ЗАПУСК
# ═══════════════════════════════════════════════════════════════════

import os

async def main():
    """Главная функция"""
    logger.info("🤖 Starting YakMarket Admin Bot...")
    
    # Мы используем polling вместо webhook на Render, чтобы не занимать PORT
    # (PORT будет занят AI сервером)
    try:
        await dp.start_polling(bot)
    finally:
        await bot.session.close()

if __name__ == "__main__":
    asyncio.run(main())
