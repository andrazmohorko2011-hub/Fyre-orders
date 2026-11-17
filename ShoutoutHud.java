package com.donutauction;

import net.minecraft.client.MinecraftClient;
import net.minecraft.client.font.TextRenderer;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.util.math.MatrixStack;

import java.util.ArrayDeque;
import java.util.Random;

public final class ShoutoutHud {
    private record Item(String name, double amt) { }

    private static final ArrayDeque<Item> queue = new ArrayDeque<>();
    private static Item cur;
    private static long start;
    private static final long DUR = 5500;
    private static final int N = 70;
    private static final float[] px = new float[N], py = new float[N], sp = new float[N], ph = new float[N], hue = new float[N];

    public static void queue(String name, double amt) { queue.add(new Item(name, amt)); }

    private static int hsv(float h) {
        h = h - (float) Math.floor(h);
        float r = cl(Math.abs(h * 6 - 3) - 1), g = cl(2 - Math.abs(h * 6 - 2)), b = cl(2 - Math.abs(h * 6 - 4));
        return ((int) (r * 255) << 16) | ((int) (g * 255) << 8) | (int) (b * 255);
    }

    private static float cl(float v) { return Math.max(0, Math.min(1, v)); }

    private static float easeOutBack(float t) {
        float c1 = 1.70158f, c3 = c1 + 1;
        return 1 + c3 * (float) Math.pow(t - 1, 3) + c1 * (float) Math.pow(t - 1, 2);
    }

    private static void big(DrawContext c, TextRenderer tr, String s, int cx, int cy, float scale, int rgb, float alpha) {
        int a = (int) (alpha * 255);
        if (a < 6) return;
        MatrixStack m = c.getMatrices();
        m.push();
        m.translate(cx, cy, 0);
        m.scale(scale, scale, 1f);
        c.drawTextWithShadow(tr, s, -tr.getWidth(s) / 2, -4, (a << 24) | (rgb & 0xFFFFFF));
        m.pop();
    }

    private static float fit(TextRenderer tr, String s, float base, int maxW) {
        return Math.min(base, maxW / (float) Math.max(1, tr.getWidth(s)));
    }

    public static void render(DrawContext c) {
        MinecraftClient mc = MinecraftClient.getInstance();
        if (mc.player == null) return;
        long now = System.currentTimeMillis();
        if (cur != null && now - start > DUR) cur = null;
        if (cur == null) {
            cur = queue.poll();
            if (cur == null) return;
            start = now;
            Random r = new Random(cur.name().hashCode() ^ now);
            for (int i = 0; i < N; i++) {
                px[i] = r.nextFloat(); py[i] = r.nextFloat() * 400; sp[i] = 60 + r.nextFloat() * 120;
                ph[i] = r.nextFloat() * 6.28f; hue[i] = r.nextFloat();
            }
        }
        long el = now - start;
        float a = Math.max(0, Math.min(Math.min(1, el / 300f), (DUR - el) / 600f));
        int W = c.getScaledWindowWidth(), H = c.getScaledWindowHeight();
        TextRenderer tr = mc.textRenderer;

        int ba = (int) (a * 0xB0);
        c.fillGradient(0, 0, W, H, (ba << 24) | 0x2A0A4A, (ba << 24) | 0x0A1A3A);

        float t = el / 1000f;
        for (int i = 0; i < N; i++) {
            float y = (py[i] + t * sp[i]) % (H + 20) - 10;
            float x = px[i] * W + (float) Math.sin(t * 2 + ph[i]) * 14;
            int ca = (int) (a * 230);
            if (ca > 5) c.fill((int) x, (int) y, (int) x + 3, (int) y + 5, (ca << 24) | hsv(hue[i] + t * 0.2f));
        }

        float s = easeOutBack(Math.min(1, el / 450f));
        int maxW = (int) (W * 0.85f);
        String name = cur.name();
        String amt = Money.format(cur.amt());

        big(c, tr, "SHOUTOUT", W / 2, (int) (H * 0.26f), fit(tr, "SHOUTOUT", 4f, maxW) * s, hsv(t * 0.6f), a);
        big(c, tr, name, W / 2, (int) (H * 0.46f), fit(tr, name, 7f, maxW) * s, 0xFFFFFF, a);
        big(c, tr, "paid " + amt, W / 2, (int) (H * 0.66f), fit(tr, "paid " + amt, 5f, maxW) * s, 0xFFD34D, a);
        big(c, tr, "thank you!", W / 2, (int) (H * 0.80f), 2.5f * s, 0xCFE8FF, a);
    }
}
