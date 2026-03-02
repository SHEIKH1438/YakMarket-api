import os
import asyncio
import logging
from aiohttp import web
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import Command, CommandObject
from aiogram.types import Message
import aiohttp

# --- Configuration ---
BOT_TOKEN = os.getenv("BOT_TOKEN", "8662410817:AAEPg37YkiJ6XnfnpmDW_fg1kp0hsz2_Eh0")
ADMIN_ID = int(os.getenv("ADMIN_ID", "8012802187"))
STRAPI_URL = os.getenv("STRAPI_URL", "https://yakmarket-api-production.up.railway.app").rstrip('/')
STRAPI_TOKEN = os.getenv("STRAPI_TOKEN", "88be7ebe25f4fdc1fc06b4f53449d11b92ab0e6296bb28d06a6f67d78367d64213f0ba496df22cb784d4f458a18bfde6bf0415f70f65270bd09415344c239fdf7e360e498701907041fd3a7d652e0ba0e3b0f8cf920c0355c15228bade880a270904545f196deda95f958fb526d82986b70e984058e2bdb300eaafca73bc00e9")

# --- Logging ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- Strapi Client ---
class StrapiClient:
    def __init__(self):
        self.headers = {
            "Authorization": f"Bearer {STRAPI_TOKEN}",
            "Content-Type": "application/json"
        }

    async def get_users(self):
        async with aiohttp.ClientSession() as session:
            # CMS Users are usually under /api/users (built-in) or /api/auth/local/...
            # Per task: GET /api/users
            async with session.get(f"{STRAPI_URL}/api/users", headers=self.headers) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    # Return last 10
                    return data[-10:] if isinstance(data, list) else []
                return None

    async def block_user(self, user_id: int):
        async with aiohttp.ClientSession() as session:
            async with session.put(
                f"{STRAPI_URL}/api/users/{user_id}",
                headers=self.headers,
                json={"blocked": True}
            ) as resp:
                return resp.status == 200

    async def delete_user(self, user_id: int):
        async with aiohttp.ClientSession() as session:
            async with session.delete(f"{STRAPI_URL}/api/users/{user_id}", headers=self.headers) as resp:
                return resp.status in [200, 204]

strapi = StrapiClient()

# --- Bot Initialization ---
bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()

# --- Middleware/Security ---
# Restriction: message.from_user.id != ADMIN_ID must be ignored
@dp.message.outer_middleware()
async def admin_security_middleware(handler, event: Message, data):
    if event.from_user.id != ADMIN_ID:
        logger.warning(f"Unauthorized access attempt by ID: {event.from_user.id}")
        return # Ignore
    return await handler(event, data)

# --- Bot Handlers ---
@dp.message(Command("start"))
async def cmd_start(message: Message):
    await message.answer("Admin Panel Active. Commands: /users, /ban {id}, /del {id}")

@dp.message(Command("users"))
async def cmd_users(message: Message):
    users = await strapi.get_users()
    if users is None:
        return await message.answer("Error fetching users from Strapi.")
    if not users:
        return await message.answer("No users found.")
    
    response = "<b>Last 10 Users:</b>\n"
    for u in users:
        status = "🔴 Blocked" if u.get("blocked") else "🟢 Active"
        response += f"ID: <code>{u['id']}</code> | {u.get('username', 'N/A')} | {status}\n"
    
    await message.answer(response, parse_mode="HTML")

@dp.message(Command("ban"))
async def cmd_ban(message: Message, command: CommandObject):
    if not command.args:
        return await message.answer("Use: /ban {user_id}")
    
    success = await strapi.block_user(command.args)
    if success:
        await message.answer(f"✅ User {command.args} blocked.")
    else:
        await message.answer(f"❌ Failed to block user {command.args}.")

@dp.message(Command("del"))
async def cmd_del(message: Message, command: CommandObject):
    if not command.args:
        return await message.answer("Use: /del {user_id}")
    
    success = await strapi.delete_user(command.args)
    if success:
        await message.answer(f"🗑️ User {command.args} deleted.")
    else:
        await message.answer(f"❌ Failed to delete user {command.args}.")

# --- Webhook Server Handlers ---
async def handle_strapi_webhook(request):
    try:
        data = await request.json()
        event = data.get("event")
        model = data.get("model")
        entry = data.get("entry", {})

        if event == "entry.create":
            # Assuming product model has 'title' and 'price' (or use generic fields)
            name = entry.get("name") or entry.get("title") or "Unnamed Item"
            price = entry.get("price") or "?"
            item_id = entry.get("id")
            # Strapi Admin URL for editing: {STRAPI_URL}/admin/content-manager/collectionType/api::{model}.{model}/{id}
            # Note: This URL structure might vary depending on Strapi version, using the common one.
            edit_url = f"{STRAPI_URL}/admin/content-manager/collectionType/api::{model}.{model}/{item_id}"
            
            msg = (
                f"🆕 <b>New Entry Created!</b>\n\n"
                f"<b>Model:</b> {model}\n"
                f"<b>Name:</b> {name}\n"
                f"<b>Price:</b> {price}\n"
                f"<b>ID:</b> {item_id}\n\n"
                f"<a href='{edit_url}'>🔗 Edit in Strapi</a>"
            )
            await bot.send_message(ADMIN_ID, msg, parse_mode="HTML")
            
        return web.Response(status=200)
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return web.Response(status=500)

# --- Startups ---
async def start_webhook_server():
    app = web.Application()
    app.router.add_post("/strapi-webhook", handle_strapi_webhook)
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, '0.0.0.0', 8080)
    await site.start()
    logger.info("Webhook server started on port 8080")

async def main():
    # Start web server
    await start_webhook_server()
    # Start bot polling
    await dp.start_polling(bot)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, SystemExit):
        logger.info("Bot stopped")
