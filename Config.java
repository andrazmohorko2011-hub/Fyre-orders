package com.donutauction;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import net.fabricmc.loader.api.FabricLoader;

import java.nio.file.Files;
import java.nio.file.Path;

public final class Config {
    public double minimumShoutout = 50_000_000;   // popup with name + amount
    public double shoutout = 500_000_000;         // full screen shoutout
    public int auctionSeconds = 60;

    private static Config inst = new Config();
    private static final Path FILE = FabricLoader.getInstance().getConfigDir().resolve("donutauction.json");
    private static final Gson G = new GsonBuilder().setPrettyPrinting().create();

    public static Config get() { return inst; }

    public static void load() {
        try {
            if (Files.exists(FILE)) inst = G.fromJson(Files.readString(FILE), Config.class);
        } catch (Exception ignored) { }
        if (inst == null) inst = new Config();
        save();
    }

    public static void save() {
        try { Files.writeString(FILE, G.toJson(inst)); } catch (Exception ignored) { }
    }
}
