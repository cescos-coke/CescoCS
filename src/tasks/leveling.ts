import { Quest } from "../engine/task";
import {
  autosell,
  buy,
  chew,
  cliExecute,
  create,
  drink,
  eat,
  Effect,
  effectModifier,
  getMonsters,
  haveEffect,
  haveEquipped,
  inebrietyLimit,
  Item,
  itemAmount,
  itemDrops,
  Location,
  mallPrice,
  Monster,
  mpCost,
  myBasestat,
  myHash,
  myInebriety,
  myLevel,
  myMaxhp,
  myMaxmp,
  myMeat,
  myMp,
  mySoulsauce,
  print,
  putCloset,
  restoreHp,
  restoreMp,
  runChoice,
  storageAmount,
  takeStorage,
  toInt,
  toItem,
  totalFreeRests,
  use,
  useSkill,
  visitUrl,
} from "kolmafia";
import {
  $effect,
  $familiar,
  $item,
  $items,
  $location,
  $monster,
  $monsters,
  $skill,
  $stat,
  AutumnAton,
  clamp,
  CombatLoversLocket,
  ensureEffect,
  get,
  getKramcoWandererChance,
  have,
  SongBoom,
  sum,
  TunnelOfLove,
  uneffect,
  Witchess,
  withChoice,
} from "libram";
import { CombatStrategy } from "grimoire-kolmafia";
import {
  haveCBBIngredients,
  targetBaseMyst,
  targetBaseMystGap,
  tryAcquiringEffect,
  wishFor,
} from "../lib";
import { baseOutfit, docBag, garbageShirt, unbreakableUmbrella } from "../engine/outfit";
import Macro from "../combat";
import { forbiddenEffects } from "../resources";
import { mapMonster } from "libram/dist/resources/2020/Cartography";
import {
  chooseQuest,
  chooseRift,
  rufusTarget,
} from "libram/dist/resources/2023/ClosedCircuitPayphone";

const useCinch = !get("instant_saveCinch", false);
const baseBoozes = $items`bottle of rum, boxed wine, bottle of gin, bottle of vodka, bottle of tequila, bottle of whiskey`;
const freeFightMonsters: Monster[] = $monsters`Witchess Bishop, Witchess King, Witchess Witch, sausage goblin, Eldritch Tentacle`;
const usefulEffects: Effect[] = [
  // Stats
  $effect`Big`,
  $effect`Pasta Oneness`,
  $effect`Saucemastery`,
  $effect`Disdain of She-Who-Was`,
  $effect`Glittering Eyelashes`,
  $effect`Feeling Excited`,
  $effect`Triple-Sized`,
  $effect`substats.enh`,
  $effect`Uncucumbered`,
  $effect`We're All Made of Starfish`,
  $effect`Broad-Spectrum Vaccine`,
  // $effect`Think Win-Lose`,
  // $effect`Confidence of the Votive`,
  $effect`Song of Bravado`,
  $effect`Sparkling Consciousness`,

  // ML
  $effect`Pride of the Puffin`,
  $effect`Drescher's Annoying Noise`,
  $effect`Ur-Kel's Aria of Annoyance`,

  // Xp
  $effect`Carol of the Thrills`,

  // Songs
  $effect`Stevedave's Shanty of Superiority`,
  $effect`Ur-Kel's Aria of Annoyance`,
  $effect`Aloysius' Antiphon of Aptitude`,

  // Spell dmg
  $effect`Carol of the Hells`,
];

export function powerlevelingLocation(): Location {
  if (get("neverendingPartyAlways")) return $location`The Neverending Party`;
  else if (get("stenchAirportAlways") || get("_stenchAirportToday"))
    return $location`Uncle Gator's Country Fun-Time Liquid Waste Sluice`;
  else if (get("spookyAirportAlways")) return $location`The Deep Dark Jungle`;
  else if (get("hotAirportAlways")) return $location`The SMOOCH Army HQ`;
  else if (get("coldAirportAlways")) return $location`VYKEA`;
  else if (get("sleazeAirportAlways")) return $location`Sloppy Seconds Diner`;

  return $location`Uncle Gator's Country Fun-Time Liquid Waste Sluice`; // Default location
}

let _bestShadowRift: Location | null = null;
export function bestShadowRift(): Location {
  if (!_bestShadowRift) {
    _bestShadowRift =
      chooseRift({
        canAdventure: true,
        sortBy: (l: Location) => {
          const drops = getMonsters(l)
            .map((m) => Object.keys(itemDrops(m)).map((s) => toItem(s)))
            .reduce((acc, val) => acc.concat(val), []);
          return sum(drops, mallPrice);
        },
      }) ?? $location.none;
    if (_bestShadowRift === $location.none && have($item`closed-circuit pay phone`)) {
      throw new Error("Failed to find a suitable Shadow Rift to adventure in");
    }
  }
  return _bestShadowRift;
}

function sendAutumnaton(): void {
  if (AutumnAton.availableLocations().includes(bestShadowRift()) && have($item`autumn-aton`))
    AutumnAton.sendTo(bestShadowRift());
}

function sellMiscellaneousItems(): void {
  const items: Item[] = [
    $item`cardboard ore`,
    $item`hot buttered roll`,
    $item`toast`,
    $item`meat paste`,
    $item`meat stack`,
    $item`jar of swamp honey`,
    $item`turtle voicebox`,
    $item`grody jug`,
    $item`gas can`,
    $item`Middle of the Road™ brand whiskey`,
    $item`neverending wallet chain`,
    $item`pentagram bandana`,
    $item`denim jacket`,
    $item`ratty knitted cap`,
    $item`jam band bootleg`,
    $item`Purple Beast energy drink`,
    $item`cosmetic football`,
    $item`shoe ad T-shirt`,
    $item`pump-up high-tops`,
    $item`noticeable pumps`,
    $item`surprisingly capacious handbag`,
    $item`electronics kit`,
    $item`PB&J with the crusts cut off`,
    $item`dorky glasses`,
    $item`ponytail clip`,
    $item`paint palette`,
    ...baseBoozes,
  ];
  items.forEach((it) => {
    if (itemAmount(it) > 1) autosell(it, itemAmount(it) - 1);
  });
}

export const LevelingQuest: Quest = {
  name: "Leveling",
  completed: () => get("csServicesPerformed").split(",").length > 1,
  tasks: [
    {
      name: "Soul Food",
      ready: () => mySoulsauce() >= 5,
      completed: () => mySoulsauce() < 5 || myMp() > myMaxmp() - 15 || !have($skill`Soul Food`),
      do: (): void => {
        while (mySoulsauce() >= 5 && myMp() <= myMaxmp() - 15) useSkill($skill`Soul Food`);
      },
    },
    {
      name: "Clan Shower",
      completed: () => get("_aprilShower"),
      do: () => ensureEffect($effect`Thaumodynamic`),
      limit: { tries: 1 },
    },
    {
      name: "Inscrutable Gaze",
      completed: () => have($effect`Inscrutable Gaze`) || !have($skill`Inscrutable Gaze`),
      do: (): void => ensureEffect($effect`Inscrutable Gaze`),
    },
    {
      name: "Pull Calzone of Legend",
      completed: () =>
        have($item`Calzone of Legend`) ||
        have($effect`In the 'zone zone!`) ||
        get("_roninStoragePulls")
          .split(",")
          .includes(toInt($item`Calzone of Legend`).toString()) ||
        get("_instant_skipCalzoneOfLegend", false),
      do: (): void => {
        if (storageAmount($item`Calzone of Legend`) === 0) {
          print("Uh oh! You do not seem to have a Calzone of Legend in Hagnk's", "red");
          print(
            "Consider pulling something to make up for the turngen and 300%myst (e.g. a roasted vegetable focaccia),",
            "red"
          );
          print(
            "then type 'set _instant_skipCalzoneOfLegend=true' before re-running instantsccs",
            "red"
          );
        }
        takeStorage($item`Calzone of Legend`, 1);
      },
      limit: { tries: 1 },
    },
    {
      name: "Pull Stick Knife of Loathing",
      completed: () => have($item`Stick-Knife of Loathing`),
      do: (): void => {
        if (storageAmount($item`Stick-Knife of Loathing`) === 0) {
          print("Uh oh! You do not seem to have a Stick-Knife of Loathing", "red");
        }
        takeStorage($item`Stick-Knife of Loathing`, 1);
      },
      limit: { tries: 1 },
    },
    {
      name: "Pull Staff of Simmering Hatred",
      completed: () => have($item`Staff of Simmering Hatred`),
      do: (): void => {
        if (storageAmount($item`Staff of Simmering Hatred`) === 0) {
          print("Uh oh! You do not seem to have a Staff of Simmering Hatred", "red");
        }
        takeStorage($item`Staff of Simmering Hatred`, 1);
      },
      limit: { tries: 1 },
    },
    {
      name: "Wish for XP% buff",
      // TODO: Make this completed if we've already wished twice with the paw (requires mafia tracking)
      completed: () =>
        have($effect`Different Way of Seeing Things`) ||
        !have($item`cursed monkey's paw`) ||
        forbiddenEffects.includes($effect`Different Way of Seeing Things`) ||
        get("instant_saveMonkeysPaw", false) ||
        myBasestat($stat`Mysticality`) >= targetBaseMyst - targetBaseMystGap ||
        get("_monkeyPawWishesUsed", 0) >= 2,
      do: () => wishFor($effect`Different Way of Seeing Things`, false),
    },
    {
      name: "Use Ten-Percent Bonus",
      prepare: (): void => {
        if (get("getawayCampsiteUnlocked"))
          visitUrl("place.php?whichplace=campaway&action=campaway_sky");
      },
      completed: () => !have($item`a ten-percent bonus`),
      do: () => use($item`a ten-percent bonus`, 1),
      limit: { tries: 1 },
    },
    {
      name: "Bastille",
      completed: () => get("_bastilleGames") > 0 || !have($item`Bastille Battalion control rig`),
      do: () => cliExecute("bastille.ash mainstat brutalist"),
      limit: { tries: 1 },
    },
    {
      name: "Restore mp",
      completed: () =>
        get("timesRested") >= totalFreeRests() - get("instant_saveFreeRests", 0) ||
        myMp() >= Math.min(200, myMaxmp()),
      prepare: (): void => {
        if (have($item`Newbiesport™ tent`)) use($item`Newbiesport™ tent`);
      },
      do: (): void => {
        if (get("chateauAvailable")) {
          visitUrl("place.php?whichplace=chateau&action=chateau_restbox");
        } else if (get("getawayCampsiteUnlocked")) {
          visitUrl("place.php?whichplace=campaway&action=campaway_tentclick");
        } else {
          visitUrl("campground.php?action=rest");
        }
      },
      outfit: { modifier: "myst, mp" },
    },
    {
      name: "Alice Army",
      completed: () => get("grimoire3Summons") > 0 || !have($skill`Summon Alice's Army Cards`),
      do: () => useSkill($skill`Summon Alice's Army Cards`),
      limit: { tries: 1 },
    },
    {
      name: "Confiscator's Grimoire",
      completed: () =>
        get("_grimoireConfiscatorSummons") > 0 || !have($skill`Summon Confiscated Things`),
      do: () => useSkill($skill`Summon Confiscated Things`),
      limit: { tries: 1 },
    },
    {
      name: "Eat Calzone",
      ready: () => have($effect`Ready to Eat`), // only eat this after we red rocket
      completed: () => get("calzoneOfLegendEaten") || !have($item`Calzone of Legend`),
      do: () => eat($item`Calzone of Legend`, 1),
      limit: { tries: 1 },
    },
    {
      name: "Cast Prevent Scurvy",
      completed: () => !have($skill`Prevent Scurvy and Sobriety`) || get("_preventScurvy"),
      prepare: () => restoreMp(mpCost($skill`Prevent Scurvy and Sobriety`)),
      do: () => useSkill($skill`Prevent Scurvy and Sobriety`),
      limit: { tries: 1 },
    },
    {
      name: "Consult Gorgonzola",
      completed: () => get("_clanFortuneBuffUsed") || get("instant_saveFortuneTeller", false),
      do: () => cliExecute("fortune buff mys"),
      limit: { tries: 1 },
    },
    {
      name: "Use Glittery Mascara",
      completed: () => have($effect`Glittering Eyelashes`),
      do: () => ensureEffect($effect`Glittering Eyelashes`),
    },
    {
      name: "Buy Oversized Sparkler",
      ready: () => have($effect`Everything Looks Blue`) && get("hasRange") && myMeat() >= 1000,
      completed: () => have($item`oversized sparkler`),
      do: () => buy($item`oversized sparkler`, 1),
      limit: { tries: 1 },
    },
    {
      name: "Drink Astral Pilsners",
      ready: () => myLevel() >= 11,
      completed: () =>
        myInebriety() >= inebrietyLimit() ||
        (!have($item`astral six-pack`) &&
          itemAmount($item`astral pilsner`) <= get("instant_saveAstralPilsners", 0)),
      prepare: () => tryAcquiringEffect($effect`Ode to Booze`),
      do: (): void => {
        if (have($item`astral six-pack`)) use($item`astral six-pack`, 1);
        if (itemAmount($item`astral pilsner`) > get("instant_saveAstralPilsners", 0))
          drink($item`astral pilsner`, 1);
      },
      post: (): void => {
        if (
          !have($item`astral six-pack`) &&
          itemAmount($item`astral pilsner`) <= get("instant_saveAstralPilsners", 0)
        )
          uneffect($effect`Ode to Booze`);
      },
      limit: { tries: 6 },
    },
    {
      name: "Eat Magical Sausages",
      completed: () =>
        (!have($item`magical sausage`) && !have($item`magical sausage casing`)) ||
        myMeat() <= 3000 ||
        get("_sausagesMade") >= 3,
      do: (): void => {
        if (have($item`magical sausage casing`)) create($item`magical sausage`, 1);
        eat($item`magical sausage`, itemAmount($item`magical sausage`));
      },
      post: () => autosell($item`meat stack`, itemAmount($item`meat stack`)),
      limit: { tries: 23 },
    },
    {
      name: "BoomBox Meat",
      ready: () => have($item`Punching Potion`),
      completed: () =>
        SongBoom.song() === "Total Eclipse of Your Meat" || !have($item`SongBoom™ BoomBox`),
      do: () => SongBoom.setSong("Total Eclipse of Your Meat"),
      limit: { tries: 1 },
    },
    {
      name: "Restore MP with Glowing Blue",
      prepare: (): void => {
        restoreHp(clamp(1000, myMaxhp() / 2, myMaxhp()));
        if (!have($effect`Everything Looks Blue`) && !have($item`blue rocket`)) {
          if (myMeat() < 250) throw new Error("Insufficient Meat to purchase blue rocket!");
          buy($item`blue rocket`, 1);
        }
        unbreakableUmbrella();
        restoreMp(50);
        if (!have($effect`Everything Looks Red`) && !have($item`red rocket`)) {
          if (myMeat() >= 250) buy($item`red rocket`, 1);
        }
      },
      completed: () => have($effect`Everything Looks Blue`),
      do: powerlevelingLocation(), // if your powerleveling location is the NEP you don't immediately get the MP regen
      combat: new CombatStrategy().macro(
        Macro.tryItem($item`blue rocket`)
          .tryItem($item`red rocket`)
          .default()
      ),
      outfit: () => baseOutfit(false),
      post: () => sellMiscellaneousItems(),
      choices: {
        1094: 5,
        1115: 6,
        1322: 2,
        1324: 5,
      },
      limit: { tries: 2 },
    },
    {
      name: "Restore MP with Glowing Blue (continued)",
      prepare: (): void => {
        restoreHp(clamp(1000, myMaxhp() / 2, myMaxhp()));
        unbreakableUmbrella();
        restoreMp(50);
      },
      // We need to spend at least 1adv to get the mp regen from Glowing Blue
      // This is only an issue if our powerleveling zone is the NEP, since the previous fight would be free
      completed: () =>
        powerlevelingLocation() !== $location`The Neverending Party` ||
        haveEffect($effect`Glowing Blue`) !== 10 ||
        myMp() >= 500,
      do: $location`The Dire Warren`,
      outfit: () => baseOutfit(false),
      combat: new CombatStrategy().macro(Macro.attack().repeat()),
      post: (): void => {
        sendAutumnaton();
        sellMiscellaneousItems();
      },
      limit: { tries: 1 },
    },
    {
      name: "Get Rufus Quest",
      completed: () => get("_shadowAffinityToday") || !have($item`closed-circuit pay phone`),
      do: () => chooseQuest(() => 2),
      limit: { tries: 1 },
    },
    {
      name: "Shadow Rift",
      prepare: (): void => {
        restoreHp(clamp(1000, myMaxhp() / 2, myMaxhp()));
        unbreakableUmbrella();
        restoreMp(50);
        if (!have($effect`Everything Looks Red`) && !have($item`red rocket`)) {
          if (myMeat() >= 250) buy($item`red rocket`, 1);
        }
      },
      completed: () =>
        have($item`Rufus's shadow lodestone`) ||
        (!have($effect`Shadow Affinity`) && get("encountersUntilSRChoice") !== 0) ||
        !have($item`closed-circuit pay phone`),
      do: bestShadowRift(),
      combat: new CombatStrategy().macro(Macro.tryItem($item`red rocket`).default()),
      outfit: baseOutfit,
      post: (): void => {
        if (have(rufusTarget() as Item)) {
          withChoice(1498, 1, () => use($item`closed-circuit pay phone`));
        }
        sendAutumnaton();
        sellMiscellaneousItems();
      },
      limit: { tries: 12 },
    },
    {
      name: "Use Ointment of the Occult",
      completed: () =>
        (!have($item`grapefruit`) && !have($item`ointment of the occult`)) ||
        have($effect`Mystically Oiled`),
      do: (): void => {
        if (!have($item`ointment of the occult`)) {
          if (get("reagentSummons") === 0) useSkill($skill`Advanced Saucecrafting`, 1);
          create($item`ointment of the occult`, 1);
        }
        ensureEffect($effect`Mystically Oiled`);
      },
    },
    {
      name: "Use Oil of Expertise",
      ready: () => get("_loveTunnelUsed") || !get("loveTunnelAvailable"),
      completed: () =>
        (!have($item`cherry`) && itemAmount($item`oil of expertise`) < 1) ||
        have($effect`Expert Oiliness`),
      do: (): void => {
        if (!have($item`oil of expertise`)) {
          if (get("reagentSummons") === 0) useSkill($skill`Advanced Saucecrafting`, 1);
          create($item`oil of expertise`, 1);
        }
        if (itemAmount($item`oil of expertise`) >= 1)
          use($item`oil of expertise`, 1);
        if (have($item`cherry`) && have($effect`Expert Oiliness`))
          putCloset(itemAmount($item`cherry`), $item`cherry`);
      },
      limit: { tries: 1 },
    },
    {
      name: "Snokebomb",
      prepare: (): void => {
        restoreHp(clamp(1000, myMaxhp() / 2, myMaxhp()));
        unbreakableUmbrella();
        restoreMp(50);
      },
      completed: () => get("_snokebombUsed") >= 3,
      do: powerlevelingLocation(),
      combat: new CombatStrategy().macro(Macro.trySkill($skill`Snokebomb`).abort()),
      outfit: baseOutfit,
      choices: {
        1094: 5,
        1115: 6,
        1322: 2,
        1324: 5,
      },
      post: (): void => {
        sendAutumnaton();
        sellMiscellaneousItems();
      },
      limit: { tries: 4 },
    },
    {
      name: "Get Totem and Saucepan",
      completed: () => have($item`turtle totem`) && have($item`saucepan`),
      do: (): void => {
        buy(1, $item`chewing gum on a string`);
        use(1, $item`chewing gum on a string`);
      },
      limit: { tries: 50 },
    },
    {
      name: "Restore cinch",
      completed: () =>
        get("timesRested") >= totalFreeRests() - get("instant_saveFreeRests", 0) ||
        get("_cinchUsed", 0) <= 95 ||
        !useCinch,
      prepare: (): void => {
        if (have($item`Newbiesport™ tent`)) use($item`Newbiesport™ tent`);
      },
      do: (): void => {
        if (get("chateauAvailable")) {
          visitUrl("place.php?whichplace=chateau&action=chateau_restbox");
        } else if (get("getawayCampsiteUnlocked")) {
          visitUrl("place.php?whichplace=campaway&action=campaway_tentclick");
        } else {
          visitUrl("campground.php?action=rest");
        }
      },
      outfit: { modifier: "myst, mp" },
    },
    {
      name: "Kramco",
      prepare: (): void => {
        restoreHp(clamp(1000, myMaxhp() / 2, myMaxhp()));
        unbreakableUmbrella();
        garbageShirt();
        usefulEffects.forEach((ef) => tryAcquiringEffect(ef));
        restoreMp(50);
      },
      ready: () => getKramcoWandererChance() >= 1.0,
      completed: () => getKramcoWandererChance() < 1.0 || !have($item`Kramco Sausage-o-Matic™`),
      do: $location`Noob Cave`,
      outfit: () => ({
        ...baseOutfit(),
        offhand: $item`Kramco Sausage-o-Matic™`,
      }),
      combat: new CombatStrategy().macro(Macro.default(useCinch)),
      post: (): void => {
        sendAutumnaton();
        sellMiscellaneousItems();
      },
    },
    {
      name: "Map Envy Flapper",
      prepare: (): void => {
        restoreHp(clamp(1000, myMaxhp() / 2, myMaxhp()));
        unbreakableUmbrella();
        restoreMp(50);
      },
      completed: () =>
        !have($skill`Map the Monsters`) ||
        get("_monstersMapped") >= 3 ||
        have($item`imported taffy`) || get("_speakeasyFreeFights", 0) >= 3 || !get("ownsSpeakeasy"),
      do: () => mapMonster($location`An Unusually Quiet Barroom Brawl`, $monster`goblin flapper`),
      combat: new CombatStrategy().macro(
        Macro.if_($monster`goblin flapper`, Macro.trySkill($skill`Feel Envy`).default()).abort(),
      ),
      outfit: baseOutfit,
      limit: { tries: 1 },
    },
    {
      name: "Oliver's Place",
      prepare: (): void => {
        restoreHp(clamp(1000, myMaxhp() / 2, myMaxhp()));
        unbreakableUmbrella();
        restoreMp(50);
      },
      completed: () => get("_speakeasyFreeFights", 0) >= 3 || !get("ownsSpeakeasy"),
      do: $location`An Unusually Quiet Barroom Brawl`,
      combat: new CombatStrategy().macro(Macro.default()),
      outfit: baseOutfit,
      limit: { tries: 3 },
      post: (): void => {
        sendAutumnaton();
        sellMiscellaneousItems();
      },
    },
    {
      name: "God Lobster",
      prepare: (): void => {
        restoreHp(clamp(1000, myMaxhp() / 2, myMaxhp()));
        unbreakableUmbrella();
        usefulEffects.forEach((ef) => tryAcquiringEffect(ef));
        restoreMp(50);
      },
      completed: () => get("_godLobsterFights") >= 3 || !have($familiar`God Lobster`),
      do: () => visitUrl("main.php?fightgodlobster=1"),
      combat: new CombatStrategy().macro(Macro.default(useCinch)),
      choices: { 1310: () => (have($item`God Lobster's Ring`) ? 2 : 3) }, // Get xp on last fight
      outfit: () => ({
        ...baseOutfit(),
        famequip: $items`God Lobster's Ring, God Lobster's Scepter`,
        familiar: $familiar`God Lobster`,
      }),
      limit: { tries: 3 },
      post: (): void => {
        sendAutumnaton();
        sellMiscellaneousItems();
      },
    },
    {
      name: "Eldritch Tentacle",
      prepare: (): void => {
        restoreHp(clamp(1000, myMaxhp() / 2, myMaxhp()));
        unbreakableUmbrella();
        usefulEffects.forEach((ef) => tryAcquiringEffect(ef));
        restoreMp(50);
      },
      completed: () => get("_eldritchHorrorEvoked") || !have($skill`Evoke Eldritch Horror`),
      do: () => useSkill($skill`Evoke Eldritch Horror`),
      post: (): void => {
        if (have($effect`Beaten Up`)) cliExecute("hottub");
        sendAutumnaton();
        sellMiscellaneousItems();
      },
      combat: new CombatStrategy().macro(Macro.default(useCinch)),
      outfit: baseOutfit,
      limit: { tries: 1 },
    },
    {
      name: "Powerlevel",
      completed: () =>
        myBasestat($stat`Mysticality`) >= targetBaseMyst - targetBaseMystGap &&
        (powerlevelingLocation() !== $location`The Neverending Party` ||
          get("_neverendingPartyFreeTurns") >= 10),
      do: powerlevelingLocation(),
      prepare: (): void => {
        restoreHp(clamp(1000, myMaxhp() / 2, myMaxhp()));
        unbreakableUmbrella();
        garbageShirt();
        usefulEffects.forEach((ef) => tryAcquiringEffect(ef));
        restoreMp(50);
        if (!have($effect`Everything Looks Red`) && !have($item`red rocket`)) {
          if (myMeat() >= 250) buy($item`red rocket`, 1);
        }
      },
      outfit: baseOutfit,
      limit: { tries: 60 },
      choices: {
        1094: 5,
        1115: 6,
        1322: 2,
        1324: 5,
      },
      combat: new CombatStrategy().macro(
        Macro.tryItem($item`red rocket`)
          .trySkill($skill`Bowl Sideways`)
          .default(useCinch)
      ),
      post: (): void => {
        sendAutumnaton();
        sellMiscellaneousItems();
      },
    },
    {
      name: "Acquire Lyle's Buff",
      completed: () => get("_lyleFavored"),
      do: (): void => {
        tryAcquiringEffect($effect`Favored by Lyle`);
        tryAcquiringEffect($effect`Starry-Eyed`);
      },
      limit: { tries: 1 },
    },
    {
      name: "Witchess King",
      prepare: (): void => {
        restoreHp(clamp(1000, myMaxhp() / 2, myMaxhp()));
        unbreakableUmbrella();
        garbageShirt();
        usefulEffects.forEach((ef) => tryAcquiringEffect(ef));
        restoreMp(50);
      },
      completed: () =>
        CombatLoversLocket.monstersReminisced().includes($monster`Witchess King`) ||
        !CombatLoversLocket.availableLocketMonsters().includes($monster`Witchess King`) ||
        get("instant_saveLocketWitchessKing", false),
      do: () => CombatLoversLocket.reminisce($monster`Witchess King`),
      combat: new CombatStrategy().macro(Macro.default(useCinch)),
      outfit: baseOutfit,
      post: (): void => {
        sendAutumnaton();
        sellMiscellaneousItems();
      },
      limit: { tries: 1 },
    },
    {
      name: "Free Kills and More Fights",
      prepare: (): void => {
        restoreHp(clamp(1000, myMaxhp() / 2, myMaxhp()));
        unbreakableUmbrella();
        garbageShirt();
        docBag();
        usefulEffects.forEach((ef) => tryAcquiringEffect(ef));
        restoreMp(50);
      },
      outfit: baseOutfit,
      completed: () =>
        myBasestat($stat`Mysticality`) >= targetBaseMyst &&
        (get("_shatteringPunchUsed") >= 3 || !have($skill`Shattering Punch`)) &&
        (get("_gingerbreadMobHitUsed") || !have($skill`Gingerbread Mob Hit`)) &&
        haveCBBIngredients(true),
      do: powerlevelingLocation(),
      combat: new CombatStrategy().macro(
        Macro.trySkill($skill`Feel Pride`)
          .trySkill($skill`Cincho: Confetti Extravaganza`)
          .trySkill($skill`Chest X-Ray`)
          .trySkill($skill`Shattering Punch`)
          .trySkill($skill`Gingerbread Mob Hit`)
          .trySkill($skill`Bowl Sideways`)
          .default(useCinch)
      ),
      choices: {
        1094: 5,
        1115: 6,
        1322: 2,
        1324: 5,
      },
      post: (): void => {
        sendAutumnaton();
        sellMiscellaneousItems();
      },
      limit: { tries: 20 },
    },
  ],
};
