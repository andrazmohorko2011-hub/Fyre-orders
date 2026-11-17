package com.donutauction;

import net.minecraft.client.MinecraftClient;
import net.minecraft.text.Text;

public final class AuctionState {
    public static boolean running;
    public static long endMs;
    public static long winnerUntil;
    public static String topName;
    public static double topAmount;

    public static void start() {
        running = true;
        topName = null;
        topAmount = 0;
        winnerUntil = 0;
        endMs = System.currentTimeMillis() + Config.get().auctionSeconds * 1000L;
        msg("Auction started (" + Config.get().auctionSeconds + "s)");
    }

    public static void stop() {
        if (!running) return;
        running = false;
        winnerUntil = System.currentTimeMillis() + 7000;
        msg(topName == null ? "Auction ended - no bids"
                : "Auction ended - winner " + topName + " with " + Money.format(topAmount));
    }

    public static void tick() {
        if (running && System.currentTimeMillis() >= endMs) stop();
    }

    public static long remainingMs() { return Math.max(0, endMs - System.currentTimeMillis()); }

    /** @return true if this payment is the new highest bid */
    public static boolean bid(String name, double amount) {
        if (!running || amount <= topAmount) return false;
        topName = name;
        topAmount = amount;
        IslandHud.pulse();
        return true;
    }

    static void msg(String s) {
        MinecraftClient mc = MinecraftClient.getInstance();
        if (mc.player != null) mc.player.sendMessage(Text.literal("[Auction] " + s), false);
    }
}
