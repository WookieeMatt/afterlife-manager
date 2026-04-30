export function registerSettings() {
    game.settings.register("afterlife-manager", "hqActorId", {
        name: "Headquarters Actor",
        hint: "Select the Actor that holds the Afterlife's shared funds and upgrade data.",
        scope: "world",
        config: true,
        type: String,
        choices: {}, 
        default: ""
    });

    game.settings.register("afterlife-manager", "sceneFolderId", {
        name: "Expansion Scene Folder",
        hint: "Select the folder containing your Afterlife map variants for quick visual routing.",
        scope: "world",
        config: true,
        type: String,
        choices: {}, 
        default: ""
    });

    game.settings.register("afterlife-manager", "enableVisualMapping", {
        name: "Enable Visual Blueprint Mapping",
        hint: "Automatically toggle canvas tiles when upgrades finish construction.",
        scope: "world",
        config: true,
        type: Boolean,
        default: true
    });
}