import { CombatStrategy } from "grimoire-kolmafia";
import {
  buy,
  drink,
  Effect,
  inebrietyLimit,
  myAdventures,
  myInebriety,
  print,
  storageAmount,
  takeStorage,
  toInt,
  useSkill,
  visitUrl
} from "kolmafia";
import {
  $effect,
  $familiar,
  $item,
  $items,
  $location,
  $skill,
  CommunityService,
  get,
  have,
} from "libram";
import { Quest } from "../engine/task";
import { logTestSetup, tryAcquiringEffect } from "../lib";
import Macro from "../combat";
import { sugarItemsAboutToBreak } from "../engine/outfit";

export const SpellDamageQuest: Quest = {
  name: "Spell Damage",
  completed: () => CommunityService.SpellDamage.isDone(),
  tasks: [
    {
      name: "Pull Tobiko marble soda",
      completed: () =>
        have($item`tobiko marble soda`) ||
        have($effect`Pisces in the Skyces`) ||
        get("_roninStoragePulls")
          .split(",")
          .includes(toInt($item`tobiko marble soda`).toString()),
      do: (): void => {
        if (storageAmount($item`tobiko marble soda`) === 0) {
          print("Uh oh! You do not seem to have a tobiko marble soda in Hagnk's", "red");
        }
        takeStorage($item`tobiko marble soda`, 1);
      },
      limit: { tries: 1 },
    },
    {
      name: "Cargo Shorts",
      completed: () =>
        get("_cargoPocketEmptied") ||
        !have($item`Cargo Cultist Shorts`) ||
        get("instant_saveCargoShorts", false),
      do: (): void => {
        visitUrl("inventory.php?action=pocket");
        visitUrl("choice.php?whichchoice=1420&option=1&pocket=177");
      },
      limit: { tries: 1 },
    },
    {
      name: "Simmer",
      completed: () => have($effect`Simmering`) || !have($skill`Simmer`),
      do: () => useSkill($skill`Simmer`),
      limit: { tries: 1 },
    },
    {
      name: "Meteor Shower",
      completed: () =>
        have($effect`Meteor Showered`) ||
        !have($item`Fourth of May Cosplay Saber`) ||
        !have($skill`Meteor Lore`) ||
        get("_saberForceUses") >= 5,
      do: $location`The Dire Warren`,
      combat: new CombatStrategy().macro(
        Macro.trySkill($skill`Meteor Shower`)
          .trySkill($skill`Use the Force`)
          .abort()
      ),
      outfit: () => ({
        weapon: $item`Fourth of May Cosplay Saber`,
        familiar: $familiar`Cookbookbat`,
        avoid: sugarItemsAboutToBreak(),
      }),
      choices: { 1387: 3 },
      limit: { tries: 1 },
    },
    {
      name: "Test",
      prepare: (): void => {
        if (!have($item`obsidian nutcracker`)) buy($item`obsidian nutcracker`, 1);
        const usefulEffects: Effect[] = [
          $effect`AAA-Charged`,
          $effect`Arched Eyebrow of the Archmage`,
          $effect`Carol of the Hells`,
          $effect`Cowrruption`,
          $effect`Imported Strength`,
          $effect`Jackasses' Symphony of Destruction`,
          $effect`Mental A-cue-ity`,
          $effect`Pisces in the Skyces`,
          $effect`Sigils of Yeg`,
          $effect`Song of Sauce`,
          $effect`Spirit of Peppermint`,
          $effect`The Magic of LOV`,
          $effect`Warlock, Warstock, and Warbarrel`,
          $effect`We're All Made of Starfish`,
        ];
        usefulEffects.forEach((ef) => tryAcquiringEffect(ef, true));
      },
      completed: () => CommunityService.SpellDamage.isDone(),
      do: (): void => {
        const maxTurns = get("instant_spellTestTurnLimit", 55);
        const testTurns = CommunityService.SpellDamage.actualCost();
        if (testTurns > maxTurns) {
          print(`Expected to take ${testTurns}, which is more than ${maxTurns}.`, "red");
          print("Either there was a bug, or you are under-prepared for this test", "red");
          print("Manually complete the test if you think this is fine.", "red");
          print(
            "You may also increase the turn limit by typing 'set instant_spellTestTurnLimit=<new limit>'",
            "red"
          );
        }
        CommunityService.SpellDamage.run(
          () => logTestSetup(CommunityService.SpellDamage),
          maxTurns
        );
      },
      outfit: { modifier: "spell dmg, switch disembodied hand, -switch left-hand man" },
      limit: { tries: 1 },
    },
  ],
};
