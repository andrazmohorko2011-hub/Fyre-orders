# Build the mod on GitHub Actions

1. Create a new GitHub repository (Public or Private is fine).
2. Upload the **contents** of this `donutauction` folder to the repository root (so `build.gradle`, `gradle.properties`, `src/`, and `.github/` are at the top level).
3. Open the repository's **Actions** tab. If prompted, enable GitHub Actions.
4. The workflow runs on push. You can also choose **Build Fabric mod** and click **Run workflow**.
5. Open the successful workflow run, scroll to **Artifacts**, and download `donutauction-minecraft-1.21.11`.
6. Extract the artifact ZIP and put the `.jar` inside your Minecraft `.minecraft/mods` folder. Install Fabric Loader and the matching Fabric API for Minecraft 1.21.11 as well.

The workflow compiles the project; a successful build does not by itself prove every in-game feature works on a live server. Test the mod in-game and check the Actions log if the build fails.
