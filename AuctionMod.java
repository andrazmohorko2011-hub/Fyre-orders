package com.donutauction;

import com.mojang.brigadier.CommandDispatcher;
import com.mojang.brigadier.arguments.IntegerArgumentType;
import com.mojang.brigadier.arguments.StringArgumentType;
import net.fabricmc.api.ClientModInitializer;
import net.fabricmc.fabric.api.client.command.v2.ClientCommandManager;
import net.fabricmc.fabric.api.client.command.v2.ClientCommandRegistrationCallback;
import net.fabricmc.fabric.api.client.command.v2.FabricClientCommandSource;
import net.fabricmc.fabric.api.client.event.lifecycle.v1.ClientTickEvents;
import net.fabricmc.fabric.api.client.keybinding.v1.KeyBindingHelper;
import net.fabricmc.fabric.api.client.message.v1.ClientReceiveMessageEvents;
import net.fabricmc.fabric.api.client.rendering.v1.HudRenderCallback;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.option.KeyBinding;
import net.minecraft.client.sound.PositionedSoundInstance;
import net.minecraft.client.util.InputUtil;
import net.minecraft.sound.SoundEvent;
import net.minecraft.sound.SoundEvents;
import net.minecraft.text.Text;
import org.lwjgl.glfw.GLFW;

import java.util.function.Consumer;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class AuctionMod implements ClientModInitializer {
    // Matches e.g. "Steve paid you $50M." / "[Rank] Steve paid you $1,500,000"
    // If your server words it differently, change this regex.
    private static final Pattern PAID =
            Pattern.compile("(\\w{1,16}) paid you \\$?([\\d,]*\\.?\\d+[kKmMbBtT]?)");

    private static KeyBinding key;

    @Override
    public void onInitializeClient() {
        Config.load();

        key = KeyBindingHelper.registerKeyBinding(new KeyBinding(
                "key.donutauction.toggle", InputUtil.Type.KEYSYM, GLFW.GLFW_KEY_G, "category.donutauction"));

        ClientTickEvents.END_CLIENT_TICK.register(mc -> {
            while (key.wasPressed()) {
                if (AuctionState.running) AuctionState.stop(); else AuctionState.start();
            }
        });

        HudRenderCallback.EVENT.register((ctx, tickCounter) -> {
            IslandHud.render(ctx);
            ShoutoutHud.render(ctx);
        });

        ClientReceiveMessageEvents.GAME.register((msg, overlay) -> {
            if (!overlay) handle(msg.getString());
        });

        ClientCommandRegistrationCallback.EVENT.register((d, access) -> {
            threshold(d, "minimumshoutout", "Popup threshold", v -> Config.get().minimumShoutout = v);
            threshold(d, "shoutoutpayment", "Full-screen shoutout threshold", v -> Config.get().shoutout = v);

            d.register(ClientCommandManager.literal("auction")
                    .then(ClientCommandManager.literal("start").executes(c -> { AuctionState.start(); return 1; }))
                    .then(ClientCommandManager.literal("stop").executes(c -> { AuctionState.stop(); return 1; }))
                    .then(ClientCommandManager.literal("time")
                            .then(ClientCommandManager.argument("seconds", IntegerArgumentType.integer(5, 3600))
                                    .executes(c -> {
                                        int s = IntegerArgumentType.getInteger(c, "seconds");
                                        Config.get().auctionSeconds = s;
                                        Config.save();
                                        c.getSource().sendFeedback(Text.literal("Auction length set to " + s + "s"));
                                        return 1;
                                    }))));
        });
    }

    private static void threshold(CommandDispatcher<FabricClientCommandSource> d, String cmd, String label, Consumer<Double> setter) {
        d.register(ClientCommandManager.literal(cmd)
                .then(ClientCommandManager.argument("amount", StringArgumentType.word()).executes(c -> {
                    double v = Money.parse(StringArgumentType.getString(c, "amount"));
                    if (v < 0) {
                        c.getSource().sendFeedback(Text.literal("Invalid amount. Try 50m, 1.5b or 250k"));
                        return 0;
                    }
                    setter.accept(v);
                    Config.save();
                    c.getSource().sendFeedback(Text.literal(label + " set to " + Money.format(v)));
                    return 1;
                })));
    }

    private static void handle(String text) {
        Matcher m = PAID.matcher(text);
        if (!m.find()) return;
        String name = m.group(1);
        double amt = Money.parse(m.group(2));
        if (amt <= 0) return;

        Config cfg = Config.get();
        AuctionState.bid(name, amt);

        if (amt >= cfg.shoutout) {
            ShoutoutHud.queue(name, amt);
            play(SoundEvents.UI_TOAST_CHALLENGE_COMPLETE);
        } else if (amt >= cfg.minimumShoutout) {
            IslandHud.flash(name, amt);
            play(SoundEvents.ENTITY_EXPERIENCE_ORB_PICKUP);
        }
    }

    private static void play(SoundEvent e) {
        MinecraftClient.getInstance().getSoundManager().play(PositionedSoundInstance.master(e, 1.0f));
    }
}
