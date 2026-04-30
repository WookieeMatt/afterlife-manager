export function registerSettings() {
    game.settings.register("afterlife-manager", "hqJournalId", {
        name: "Headquarters Journal",
        hint: "Select the Journal Entry that acts as the database.",
        scope: "world",
        config: true,
        type: String,
        choices: {}, 
        default: ""
    });

    game.settings.register("afterlife-manager", "sceneFolderId", {
        name: "Expansion Scene Folder",
        hint: "Folder containing map variants for visual routing.",
        scope: "world",
        config: true,
        type: String,
        choices: {}, 
        default: ""
    });
}