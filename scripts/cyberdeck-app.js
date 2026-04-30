const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Hosts the vendored single-file cyberdeck in an iframe with per-user/per-actor localStorage scope.
 */
export class CyberdeckApplication extends HandlebarsApplicationMixin(ApplicationV2) {
    static DEFAULT_OPTIONS = {
        id: "afterlife-cyberdeck",
        title: "NETRUNNER CYBERDECK",
        tag: "div",
        classes: ["afterlife-cyberdeck-host"],
        window: {
            icon: "fas fa-microchip",
            resizable: true,
            width: 1100,
            height: 800
        }
    };

    static PARTS = {
        deck: { template: "modules/afterlife-manager/templates/cyberdeck-frame.hbs" }
    };

    /** @type {string|undefined} */
    _cyberdeckActorId;

    async _prepareContext() {
        const characters = game.actors.filter(a => a.isOwner && a.type === "character");
        const actorList = characters.map(a => ({ id: a.id, name: a.name }));

        if (this._cyberdeckActorId === undefined) {
            const userChar = game.user.character;
            if (userChar?.isOwner && userChar.type === "character") {
                this._cyberdeckActorId = userChar.id;
            } else {
                this._cyberdeckActorId = actorList[0]?.id ?? "";
            }
        }

        if (this._cyberdeckActorId && !actorList.some(a => a.id === this._cyberdeckActorId)) {
            this._cyberdeckActorId = actorList[0]?.id ?? "";
        }

        const scope = `${game.user.id}_${this._cyberdeckActorId || "none"}`;
        const iframeSrc = `modules/afterlife-manager/cyberdeck/cyberdeck.html?scope=${encodeURIComponent(scope)}`;

        return {
            actors: actorList.map(a => ({
                id: a.id,
                name: a.name,
                selected: a.id === this._cyberdeckActorId
            })),
            hasActors: actorList.length > 0,
            iframeSrc
        };
    }

    _onRender(context, options) {
        super._onRender(context, options);
        const sel = this.element?.querySelector?.('select[name="cyberdeckActor"]');
        if (!sel || sel.dataset.afterlifeBound === "1") return;
        sel.dataset.afterlifeBound = "1";
        sel.addEventListener("change", async () => {
            this._cyberdeckActorId = sel.value;
            await this.render({ force: true });
        });
    }
}
