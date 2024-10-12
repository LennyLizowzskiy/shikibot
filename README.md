# shikibot

### Usage (in Telegram chat)
As inline bot request in message text box:
```css
@botname [(а)ниме|(a)nime|(m)anga|(м)анга] /запрос/]
```

### Running on server
To install dependencies:
```bash
bun install
```
To run:
```bash
bun run index.ts
```
Also, there's a `Dockerfile` in the repo but I didn't test it. It should work because this project uses like only 2 `bun` commands without any complex stuff.

###### Required environment variables
- `SHIKI_API_CLIENT_ID`
- `SHIKI_API_CLIENT_SECRET`
- `SHIKI_API_ACCESS_TOKEN`
- `SHIKI_API_REFRESH_TOKEN`
- `SHIKI_API_USER_AGENT` (only the part that goes after the `User-Agent: `)
- `SHIKI_BASE_URL` (ex: `shikimori.one`)
- `TELEGRAM_BOT_API_KEY` (from [t.me/BotFather](https://t.me/BotFather))