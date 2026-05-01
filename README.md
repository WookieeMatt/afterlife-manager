
# Afterlife OS 

**A Foundry VTT v12 Module for Cyberpunk Red**

*Afterlife OS* is a dedicated management terminal designed to gamify the "No Place Like Home" DLC for Cyberpunk Red. It transforms the physical growth of a headquarters—specifically the legendary Afterlife—into an interactive, player-driven experience directly within Foundry VTT.

Instead of tracking shared funds and facility upgrades on a static spreadsheet, Edgerunners can pitch upgrades and transfer Eurobucks through a stylized UI, while the GM acts as the Fixer, approving projects, triggering visual map changes, and executing macros with a single click.

---

## 🦾 Features

* **The Main Terminal:** A dynamic ApplicationV2 interface styled after the classic Cyberpunk Red rulebook aesthetic, fully compatible with Foundry's Light/Dark modes.
* **Shared Fund Management:** Players can securely transfer Eurobucks (eb) from their character sheets directly into the crew's shared pool.
* **Upgrade Pitch System:** Edgerunners can submit custom upgrade requests, detailing the target system, previous state, new state, and project cost.
* **The Fixer's Inbox:** GMs receive pending requests in a secure queue. Approving a request automatically deducts the funds and logs the transaction.
* **Visual Blueprint Routing:** Tie upgrades directly to your canvas. When an upgrade is approved, the GM can automatically transition the crew to a new Scene or trigger Monk's Active Tiles via macros to turn on lights, reveal new rooms, or spawn tokens.
* **Ledgers & History:** Automatically sorts upgrades into "In Progress (Construction)" and "Online Systems," while maintaining a permanent ledger of all eb transfers.

---

## 💾 Installation

To install *Afterlife OS* in your Foundry VTT environment:

* Install the zip with your other modules.

---

## ⚙️ GM Setup & Configuration

Before your crew can start spending their eddies, you need to configure the system routing. 

1. **Create the Headquarters Actor:** Create a blank Actor in your world to serve as the database for your club (e.g., "The Afterlife HQ"). Players should have **Observer** permissions for this Actor so they can view the dashboard, but they do not need Owner permissions.
2. **Create the Expansion Folder (Optional):** If you plan on using the Scene Routing feature, create a Scene Folder (e.g., "Afterlife Expansion") and place your map variants inside it.
3. **Configure Settings:** Go to *Game Settings -> Configure Settings -> Afterlife OS* and assign your HQ Actor and Scene Folder using the provided dropdown menus.

---

## 💻 Usage & Macros

Access the Afterlife OS by creating the following standard Script Macros in Foundry VTT. Give your players permissions to use the Main Terminal macro.

The way the system *triggers* macros (by typing a macro name into the GM Routing text box before hitting Approve) hasn't changed. If you put "Laser Door Opening" in that box, it will still successfully trigger that Foundry macro when you approve an upgrade!

However, because we fully solidified the **API** in `main.js` during this update, you now have a suite of **brand new Hotbar Macros** that you and your players can use to interact with the system without digging through menus.

Here is your official Macro library for Afterlife OS v2.5.0. To use any of these, create a new Macro on your hotbar, set the type to **Script**, and paste the code.

### 1. Open the Main Terminal (Universal)
This is the most important macro. Give this to all your players so they can click one button on their hotbar to open the Terminal, view the ledgers, and access the Transfer/Upgrade buttons.

```javascript
const afterlife = game.modules.get("afterlife-manager")?.api;

if (afterlife) {
    // This forces the dashboard to open for whoever clicks it
    afterlife.app.render({force: true});
} else {
    ui.notifications.error("Afterlife OS terminal is currently offline.");
}
```

---

### 2. "Headless" Quick-Transfer (Advanced Players)
If a player frequently donates a set amount to the Afterlife bank (like a weekly 500eb tithe) and doesn't want to open the UI, they can use this macro. They just select their token on the map and click the macro.

```javascript
const api = game.modules.get("afterlife-manager")?.api;

if (!token) {
    ui.notifications.warn("Select your character's token first!");
} else {
    // Parameters: (Sender ID, Recipient ID, Amount)
    // "afterlife" is the hardcoded ID for the Shared Fund
    api.manager.requestFundTransfer(token.actor.id, "afterlife", 500);
    ui.notifications.info("Transfer request sent to the Fixer.");
}
```

---

### 3. GM Quick-Inject Funds (Fixer Only)
If you want to bypass the approval system entirely and just inject money straight into the Shared Fund (e.g., they found a crate of eb, or completed a gig), use this GM-only macro. 

```javascript
if (!game.user.isGM) {
    ui.notifications.error("Access Denied: Fixer Clearance Required.");
    return;
}

const hq = game.modules.get("afterlife-manager").api.manager.hqJournal;
if (!hq) return ui.notifications.error("HQ Journal not linked.");

// Change the 1000 to whatever amount you want to inject
const injectionAmount = 1000; 

const clubData = hq.getFlag('afterlife-manager', 'afterlifeState') || {};
const currentBank = clubData.basics?.sharedFunds || 0;

hq.setFlag('afterlife-manager', 'afterlifeState.basics.sharedFunds', currentBank + injectionAmount).then(() => {
    ui.notifications.info(`Successfully injected ${injectionAmount}eb into the Shared Fund.`);
});
```

---

### 4. The "Panic Button" Database Reset (Fixer Only)
If you ever want to completely wipe the pending requests, active upgrades, and the shared bank back to zero (without deleting the journal pages themselves), keep this macro handy.

```javascript
if (!game.user.isGM) return;

const hq = game.modules.get("afterlife-manager").api.manager.hqJournal;

if (hq) {
    hq.unsetFlag('afterlife-manager', 'afterlifeState').then(() => {
        ui.notifications.info("Afterlife OS Database has been wiped clean.");
    });
}
```

### 5. Monk's Active Tile Bridge (GM Only)
If you want an upgrade approval to trigger a specific Monk's Active Tile (MATT), create a macro with the exact name you type into the OS Approval prompt. Use this code inside that macro:
```javascript
game.MonksActiveTiles.triggerTile("Name Of Your Target Tile");
```

---

## 📜 Compatibility

* **Foundry VTT:** Verified for Version 12.
* **System:** Built specifically for the `cyberpunk-red-core` system framework.

*Disclaimer: This module references mechanics from the "No Place Like Home" DLC by R. Talsorian Games but is an independent community project.*
```