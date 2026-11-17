package com.donutauction;

import net.minecraft.client.MinecraftClient;
import net.minecraft.client.font.TextRenderer;
import net.minecraft.client.gui.DrawContext;

public final class IslandHud {
    private static final Spring W = new Spring(), H = new Spring();
    private static long last = System.nanoTime();
    private static String flashName;
    private static double flashAmt;
    private static long flashUntil, expandUntil;

    public static void flash(String name, double amt) {
        flashName = name;
        flashAmt = amt;
        flashUntil = System.currentTimeMillis() + 3500;
    }

    public static void pulse() { expandUntil = System.currentTimeMillis() + 2500; }

    private static String timer() {
        long s = (AuctionState.remainingMs() + 999) / 1000;
        return (s / 60) + ":" + String.format("%02d", s % 60);
    }

    public static void render(DrawContext ctx) {
        MinecraftClient mc = MinecraftClient.getInstance();
        if (mc.player == null || mc.options.hudHidden) return;

        long nanos = System.nanoTime();
        float dt = Math.min(0.05f, (nanos - last) / 1e9f);
        last = nanos;
        long now = System.currentTimeMillis();
        AuctionState.tick();
        TextRenderer tr = mc.textRenderer;

        String l1 = null, l2 = null, compact = null;
        int accent = 0x7FD8FF;

        if (now < flashUntil) {
            l1 = flashName;
            l2 = "paid you " + Money.format(flashAmt);
            accent = 0xFFD34D;
        } else if (AuctionState.running) {
            if (AuctionState.topName == null) {
                compact = timer() + "  -  no bids";
            } else if (now < expandUntil) {
                l1 = "TOP BID   " + timer();
                l2 = AuctionState.topName + "  " + Money.format(AuctionState.topAmount);
                accent = 0x6DFF9C;
            } else {
                compact = timer() + "  -  " + Money.format(AuctionState.topAmount);
            }
        } else if (now < AuctionState.winnerUntil) {
            if (AuctionState.topName == null) {
                compact = "Auction ended - no bids";
            } else {
                l1 = "WINNER";
                l2 = AuctionState.topName + "  " + Money.format(AuctionState.topAmount);
                accent = 0xFFD34D;
            }
        }

        int tw = 0, th = 0;
        if (l1 != null) {
            tw = Math.max(tr.getWidth(l1), tr.getWidth(l2)) + 40;
            th = 36;
        } else if (compact != null) {
            tw = tr.getWidth(compact) + 28;
            th = 20;
        }
        W.target = tw;
        H.target = th;
        W.update(dt);
        H.update(dt);
        if (W.pos < 8 || H.pos < 6) return;

        int w = (int) W.pos, h = (int) H.pos;
        int cx = ctx.getScaledWindowWidth() / 2;
        int x = cx - w / 2, y = 8;

        Glass.island(ctx, x, y, w, h, accent);

        if (tw == 0) return;
        ctx.enableScissor(x + 6, y, x + w - 6, y + h);
        if (l1 != null) {
            ctx.drawTextWithShadow(tr, l1, cx - tr.getWidth(l1) / 2, y + 6, 0xFF000000 | (accent & 0xFFFFFF));
            ctx.drawTextWithShadow(tr, l2, cx - tr.getWidth(l2) / 2, y + 19, 0xFFFFFFFF);
        } else {
            ctx.drawTextWithShadow(tr, compact, cx - tr.getWidth(compact) / 2, y + (h - 8) / 2, 0xFFFFFFFF);
        }
        ctx.disableScissor();
    }
}
