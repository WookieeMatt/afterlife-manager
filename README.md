
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

### Open the Main Terminal (All Users)
Opens the primary dashboard to view funds, active projects, and the transaction ledger.
```javascript
game.modules.get("afterlife-manager").api.app.render({force: true});
```

### Bypass to Submission Form (All Users)
Instantly opens the request form to transfer funds or pitch a new facility upgrade.
```javascript
new game.modules.get("afterlife-manager").api.app.constructor.PARTS.form.class().render({force: true});
```

### Monk's Active Tile Bridge (GM Only)
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