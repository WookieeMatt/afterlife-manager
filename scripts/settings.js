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

    game.settings.register("afterlife-manager", "enableLedgerPrinting", {
        name: "Enable Ledger Printing",
        hint: "Automatically log all approved/rejected requests into the Afterlife Database journal.",
        scope: "world",
        config: true,
        type: Boolean,
        default: true
    });

    game.settings.register("afterlife-manager", "fixerActorId", {
        name: "Identity of the Fixer",
        hint: "Select the NPC/Mook that acts as the system GM. NOTE: Everyone but the GM must link to their character by right-clicking their name in the bottom-left Player list and selecting 'User Configuration'.",
        scope: "world",
        config: true,
        type: String,
        choices: {}, 
        default: ""
    });
}