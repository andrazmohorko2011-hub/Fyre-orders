package com.donutauction;

import net.minecraft.client.gui.DrawContext;

/** Software-drawn "liquid glass" rounded shapes (no shaders needed). */
public final class Glass {

    private static int inset(int i, int h, int r) {
        double dy;
        if (i < r) dy = r - i - 0.5;
        else if (i >= h - r) dy = i - (h - r) + 0.5;
        else return 0;
        return r - (int) Math.round(Math.sqrt(Math.max(0, r * r - dy * dy)));
    }

    private static int lerp(int a, int b, float t) {
        int aa = (int) (((a >>> 24) & 255) * (1 - t) + ((b >>> 24) & 255) * t);
        int rr = (int) (((a >> 16) & 255) * (1 - t) + ((b >> 16) & 255) * t);
        int gg = (int) (((a >> 8) & 255) * (1 - t) + ((b >> 8) & 255) * t);
        int bb = (int) ((a & 255) * (1 - t) + (b & 255) * t);
        return (aa << 24) | (rr << 16) | (gg << 8) | bb;
    }

    /** Rounded rect, vertical gradient over the first `rows` rows. */
    public static void grad(DrawContext c, int x, int y, int w, int h, int r, int top, int bot, int rows) {
        r = Math.min(r, Math.min(w, h) / 2);
        rows = Math.max(1, Math.min(rows, h));
        for (int i = 0; i < rows; i++) {
            int in = inset(i, h, r);
            c.fill(x + in, y + i, x + w - in, y + i + 1, lerp(top, bot, i / (float) rows));
        }
    }

    public static void outline(DrawContext c, int x, int y, int w, int h, int r, int color) {
        r = Math.min(r, Math.min(w, h) / 2);
        for (int i = 0; i < h; i++) {
            int in = inset(i, h, r);
            if (i == 0 || i == h - 1) {
                c.fill(x + in, y + i, x + w - in, y + i + 1, color);
                continue;
            }
            int next = i < r ? inset(i - 1, h, r) : inset(i + 1, h, r);
            int len = Math.abs(next - in) + 1;
            c.fill(x + in, y + i, x + in + len, y + i + 1, color);
            c.fill(x + w - in - len, y + i, x + w - in, y + i + 1, color);
        }
    }

    public static void island(DrawContext c, int x, int y, int w, int h, int accent) {
        int r = h / 2;
        for (int i = 4; i >= 1; i--) {                       // soft shadow
            grad(c, x - i, y - i + 3, w + 2 * i, h + 2 * i, r + i, (0x0C * (5 - i)) << 24, (0x0C * (5 - i)) << 24, h + 2 * i);
        }
        grad(c, x, y, w, h, r, 0xB4161A26, 0xA00A0D16, h);               // dark glass body
        grad(c, x, y, w, h, r, (accent & 0xFFFFFF) | 0x12000000, (accent & 0xFFFFFF) | 0x3A000000, h); // tint
        grad(c, x, y, w, h, r, 0x46FFFFFF, 0x00FFFFFF, Math.max(2, h / 2)); // sheen
        outline(c, x, y, w, h, r, 0x66FFFFFF);                           // rim light
        if (w > r * 2 + 4) c.fill(x + r, y + 1, x + w - r, y + 2, 0x66FFFFFF); // specular edge
    }
}
