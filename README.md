# Donut Auction Island (Fabric, Minecraft Java 1.21.11)

Client-side Fabric mod source. Requires **Java 21**, **Fabric Loader 0.18.1 or newer**, and **Fabric API 0.141.0+1.21.11**.

## Build on Windows

1. Install JDK 21 and a Gradle 9.2+ installation.
2. Open this folder in IntelliJ IDEA as a Gradle project, or open a terminal in this folder.
3. Run `gradle build`. The first build needs an internet connection to download Minecraft, Loom, mappings, and Fabric dependencies.
4. If successful, the mod JAR will be in `build/libs/` (the file name begins with `donutauction-1.1.0`).
5. Install Fabric Loader for Minecraft 1.21.11, then place the built JAR and the matching Fabric API JAR in `.minecraft/mods`.

## In-game controls

- **G** (Controls → Donut Auction): start/stop the auction timer.
- `/auction start` and `/auction stop`: start/stop the timer.
- `/auction time <seconds>`: set auction length (5–3600 seconds).
- `/minimumshoutout <amount>`: minimum payment for the compact HUD shoutout (e.g. `50m`).
- `/shoutoutpayment <amount>`: minimum payment for the full-screen shoutout (e.g. `500m`).

## Important payment detection note

The payment listener currently looks for chat text in the form `PlayerName paid you $50M`. DonutSMP may use a different message format. If so, this pattern must be adjusted to match the exact server message; otherwise payment shoutouts and bid updates will not trigger. This source has been retargeted to 1.21.11, but it has **not been compiled or tested in-game in this environment**.
