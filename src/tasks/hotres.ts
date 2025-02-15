import { CombatStrategy } from "grimoire-kolmafia";
import {
  buy,
  cliExecute,
  create,
  drink,
  Effect,
  inebrietyLimit,
  myInebriety,
  print,
  use,
  useFamiliar,
} from "kolmafia";
import {
  $effect,
  $familiar,
  $item,
  $location,
  $monster,
  $skill,
  CombatLoversLocket,
  CommunityService,
  get,
  have,
  uneffect,
} from "libram";
import { Quest } from "../engine/task";
import { logTestSetup, tryAcquiringEffect, wishFor } from "../lib";
import { sugarItemsAboutToBreak } from "../engine/outfit";
import Macro from "../combat";

export const HotResQuest: Quest = {
  name: "Hot Res",
  completed: () => CommunityService.HotRes.isDone(),
  tasks: [
    {
      name: "Reminisce Red Skeleton",
      completed: () =>
        CombatLoversLocket.monstersReminisced().includes($monster`red skeleton`) ||
        !CombatLoversLocket.availableLocketMonsters().includes($monster`red skeleton`) ||
        get("instant_saveLocketRedSkeleton", false),
      do: () => CombatLoversLocket.reminisce($monster`red skeleton`),
      outfit: () => ({
        back: $item`vampyric cloake`,
        weapon: $item`Fourth of May Cosplay Saber`,
        offhand: have($skill`Double-Fisted Skull Smashing`)
          ? $item`industrial fire extinguisher`
          : undefined,
        familiar: $familiar`Melodramedary`,
        modifier: "Item Drop",
        avoid: sugarItemsAboutToBreak(),
      }),
      choices: { 1387: 3 },
      combat: new CombatStrategy().macro(
        Macro.trySkill($skill`Become a Cloud of Mist`)
          .trySkill($skill`Fire Extinguisher: Foam Yourself`)
          .trySkill($skill`%fn, spit on me!`)
          .trySkill($skill`Use the Force`)
          .trySkill($skill`Shocking Lick`)
          .tryItem($item`yellow rocket`)
          .default()
      ),
      limit: { tries: 1 },
    },
    {
      name: "Grab Foam Suit",
      completed: () =>
        have($effect`Fireproof Foam Suit`) ||
        !have($item`Fourth of May Cosplay Saber`) ||
        get("_saberForceUses") >= 5 ||
        !have($item`industrial fire extinguisher`) ||
        !have($skill`Double-Fisted Skull Smashing`),
      do: $location`The Dire Warren`,
      outfit: {
        back: $item`vampyric cloake`,
        weapon: $item`Fourth of May Cosplay Saber`,
        offhand: $item`industrial fire extinguisher`,
        familiar: $familiar`Cookbookbat`,
        modifier: "Item Drop",
      },
      choices: { 1387: 3 },
      combat: new CombatStrategy().macro(
        Macro.trySkill($skill`Become a Cloud of Mist`)
          .skill($skill`Fire Extinguisher: Foam Yourself`)
          .skill($skill`Use the Force`)
          .abort()
      ),
      limit: { tries: 1 },
    },
    {
      name: "Horsery",
      completed: () => get("_horsery") === "pale horse" || !get("horseryAvailable"),
      do: () => cliExecute("horsery pale"),
      limit: { tries: 1 },
    },
    {
      name: "Metal Meteoroid",
      completed: () => !have($item`metal meteoroid`) || have($item`meteorite guard`),
      do: () => create($item`meteorite guard`, 1),
      limit: { tries: 1 },
    },
    {
      name: "Test",
      prepare: (): void => {
        cliExecute("retrocape vampire hold");
        if (get("parkaMode") !== "pterodactyl") cliExecute("parka pterodactyl");
        const usefulEffects: Effect[] = [
          $effect`Amazing`,
          $effect`Astral Shell`,
          $effect`Egged On`,
          $effect`Elemental Saucesphere`,
          $effect`Feeling Peaceful`,
          $effect`Hot-Headed`,

          // Famwt Buffs
          $effect`Blood Bond`,
          $effect`Empathy`,
          $effect`Leash of Linguini`,
          $effect`Robot Friends`,
        ];
        usefulEffects.forEach((ef) => tryAcquiringEffect(ef, true));
        cliExecute("maximize hot res");
        // If it saves us >= 6 turns, try using a wish
        if (CommunityService.HotRes.actualCost() >= 7) wishFor($effect`Fireproof Lips`);
      },
      completed: () => CommunityService.HotRes.isDone(),
      do: (): void => {
        const maxTurns = get("instant_hotTestTurnLimit", 35);
        const testTurns = CommunityService.HotRes.actualCost();
        if (testTurns > maxTurns) {
          print(`Expected to take ${testTurns}, which is more than ${maxTurns}.`, "red");
          print("Either there was a bug, or you are under-prepared for this test", "red");
          print("Manually complete the test if you think this is fine.", "red");
          print(
            "You may also increase the turn limit by typing 'set instant_hotTestTurnLimit=<new limit>'",
            "red"
          );
        }
        CommunityService.HotRes.run(() => logTestSetup(CommunityService.HotRes), maxTurns);
      },
      outfit: {
        modifier: "hot res",
        familiar: $familiar`Exotic Parrot`,
      },
      limit: { tries: 1 },
    },
  ],
};
