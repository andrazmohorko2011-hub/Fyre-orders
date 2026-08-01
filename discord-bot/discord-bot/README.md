# Fyre Orders

A Discord bot with three features:
- **Giveaways** — `/giveaway start`, `end`, `reroll`, `list`. Users enter with a button; winners are picked automatically when time is up (persists across restarts).
- **Split or Steal** — `/sos create` starts a 2-winner giveaway. When it ends, both winners get 90 seconds to secretly choose Split or Steal: both Split → each gets half; both Steal → nobody gets anything; one Splits and one Steals → the one who Split takes it all.
- **Double or Keep** — `/dok create` starts a 1-winner giveaway. When it ends, the winner chooses: **Keep** the prize and it's over, or **Double it** — they give up their own prize, but a brand new giveaway for double the prize opens for everyone.
- **Tickets** — `/ticket panel` posts a button that opens a private ticket channel per user; `/ticket close` (or the in-channel button) closes it with a confirm step.

Data is stored in local JSON files under `/data` — no database needed.

## 1. Create the bot in Discord

1. Go to https://discord.com/developers/applications → **New Application**.
2. Under **Bot**, click **Reset Token** and copy it (this is `DISCORD_TOKEN`).
3. On the same page, enable **Server Members Intent** (used for tickets).
4. Under **General Information**, copy the **Application ID** (this is `CLIENT_ID`).
5. Under **OAuth2 → URL Generator**, check scopes `bot` and `applications.commands`, and under bot permissions check: Manage Channels, Send Messages, Embed Links, Read Message History, Manage Roles (for ticket channels). Open the generated URL to invite the bot to your server.

## 2. Configure

```bash
cp .env.example .env
```

Fill in:
- `DISCORD_TOKEN`, `CLIENT_ID` — from step 1
- `GUILD_ID` — your server ID (right-click server icon → Copy Server ID, with Developer Mode on) — makes slash commands appear instantly while testing
- `TICKET_CATEGORY_ID` — a category to drop ticket channels into (optional but recommended)
- `SUPPORT_ROLE_ID` — a staff role that should see every ticket (optional)

## 3. Install & run

```bash
npm install
npm run deploy   # registers all slash commands (/giveaway, /sos, /dok, /ticket, /lock, /unlock)
npm start        # starts the bot
```

## Commands

- `/giveaway start prize:"Nitro" duration:1d winners:1 [channel]` — a normal giveaway
- `/giveaway end message_id:<id>`
- `/giveaway reroll message_id:<id> [winners]`
- `/giveaway list`
- `/sos create prize:"$20 gift card" duration:1d [channel]` — Split or Steal (always 2 winners)
- `/dok create prize:"$20 gift card" duration:1d [channel]` — Double or Keep (always 1 winner)
- `/ticket panel [channel]` — posts the "Open a Ticket" button
- `/ticket close` — closes the ticket you're currently in
- `/lock [channel] [reason]` — stops @everyone sending messages in a channel
- `/unlock [channel] [reason]` — restores normal send permissions

For `/sos` and `/dok`, when the timer runs out the winners get interactive buttons in-channel (90 seconds to respond — defaults to Steal / Keep if they don't answer in time).

Giveaway/ticket management commands require the **Manage Server** permission by default.

---

## Free hosting options

A quick, honest rundown as of mid-2026. This bot is lightweight (no database, low memory), so it fits comfortably on any of these:

**Solid, well-known options:**
- **Oracle Cloud "Always Free" tier** — a genuinely free-forever ARM VM (not a trial). Most reliable free option, but signup can be finicky and it's a full Linux VM you manage yourself (SSH in, install Node, use `pm2` to keep the process alive).
- **Fly.io** — small free allowance, works well for lightweight bots, but requires a credit card on file even though nothing is charged on the free tier.
- **Render** — easy to deploy from GitHub, but the free tier only runs "web services" that sleep after inactivity. You'd need to run it as a "Background Worker" (paid) or add a lightweight HTTP ping endpoint to keep a free web service awake — clunky for a Discord bot.
- **Railway** — no longer has an unlimited free tier; new accounts get a small one-time credit (~$5), then it's pay-as-you-go (a bot like this typically costs a couple dollars a month).
- **Your own machine / a Raspberry Pi**, using `pm2` or a systemd service — free and reliable if you have something that stays on.

**Be cautious with:** the many small "free Discord bot hosting" sites that rank high in search (Wispbyte, Kerit Cloud, HeavenCloud, fps.ms, and similar). They're generally third-party resellers, often ad-supported, with limited RAM (128–512MB), require re-claiming your server periodically, and quality/uptime varies a lot — some are fine for a hobby bot, but I can't vouch for their reliability or how they handle your data, so I'd treat them as a last resort rather than a first choice.

**My recommendation:** start with Oracle Cloud's Always Free VM for genuine 24/7 hosting at no cost, or Fly.io if you'd rather not manage a full VM. If you outgrow the free tier, Railway or Render's paid tier (a few dollars/month) is simple and low-maintenance.

### Quick deploy on a VM (Oracle/Fly/any Linux box)

```bash
git clone <your repo>   # or upload the files
cd discord-bot
npm install
npm install -g pm2
npm run deploy
pm2 start index.js --name fyre-orders
pm2 save
pm2 startup   # follow the printed instructions so it survives reboots
```
