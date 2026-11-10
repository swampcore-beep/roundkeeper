# the demo fight: SRD 5.2.1 monsters (CC-BY-4.0), the user's characters
DRAGON='''## Adult Red Dragon
*Huge Dragon (Chromatic), Chaotic Evil*
___
- **Armor Class** 19
- **Hit Points** 256 (19d12 + 133)
- **Speed** 40 ft., climb 40 ft., fly 80 ft.
- **Initiative** +12 (22)
___
|STR|DEX|CON|INT|WIS|CHA|
|:---:|:---:|:---:|:---:|:---:|:---:|
|27 (+8)|10 (+0)|25 (+7)|16 (+3)|13 (+1)|23 (+6)|
___
- **Saving Throws** Str +8, Dex +6, Con +7, Int +3, Wis +7, Cha +6
- **Skills** Perception +13, Stealth +6
- **Damage Immunities** Fire
- **Senses** Blindsight 60 ft., Darkvision 120 ft., Passive Perception 23
- **Languages** Common, Draconic
- **Challenge** 17 (18,000 XP, or 20,000 in lair; PB +6)
___
***Legendary Resistance (3/Day, or 4/Day in Lair).*** If the dragon fails a saving throw, it can choose to succeed instead.

### Actions
***Multiattack.*** The dragon makes three Rend attacks. It can replace one attack with a use of Spellcasting to cast Scorching Ray.

***Rend.*** *Melee Attack Roll:* +14, reach 10 ft. *Hit:* 13 (1d10 + 8) Slashing damage plus 5 (2d4) Fire damage.

***Fire Breath (Recharge 5–6).*** *Dexterity Saving Throw:* DC 21, each creature in a 60-foot Cone. *Failure:* 59 (17d6) Fire damage. *Success:* Half damage.

***Spellcasting.*** The dragon casts one of the following spells, requiring no Material components and using Charisma as the spellcasting ability (spell save DC 20, +12 to hit with spell attacks): At Will: *Command* (level 2 version), *Detect Magic*, *Scorching Ray* (level 3 version). 1/Day Each: *Fireball* (level 6 version), *Scrying*.

### Legendary Actions
***Legendary Action Uses: 3 (4 in Lair).*** Immediately after another creature's turn, the dragon can expend a use to take one of the following actions. The dragon regains all expended uses at the start of each of its turns.

***Commanding Presence.*** The dragon uses Spellcasting to cast Command (level 2 version). The dragon can't take this action again until the start of its next turn.

***Fiery Rays.*** The dragon uses Spellcasting to cast Scorching Ray (level 3 version). The dragon can't take this action again until the start of its next turn.

***Pounce.*** The dragon moves up to half its Speed, and it makes one Rend attack.'''
GOBLIN='''## Goblin Warrior
*Small Fey (Goblinoid), Chaotic Neutral*
___
- **Armor Class** 15
- **Hit Points** 10 (3d6)
- **Speed** 30 ft.
- **Initiative** +2 (12)
___
|STR|DEX|CON|INT|WIS|CHA|
|:---:|:---:|:---:|:---:|:---:|:---:|
|8 (−1)|15 (+2)|10 (+0)|10 (+0)|8 (−1)|8 (−1)|
___
- **Skills** Stealth +6
- **Senses** Darkvision 60 ft., Passive Perception 9
- **Languages** Common, Goblin
- **Challenge** 1/4 (50 XP; PB +2)
___
### Actions
***Scimitar.*** *Melee Attack Roll:* +4, reach 5 ft. *Hit:* 5 (1d6 + 2) Slashing damage, plus 2 (1d4) Slashing damage if the attack roll had Advantage.

***Shortbow.*** *Ranged Attack Roll:* +4, range 80/320 ft. *Hit:* 5 (1d6 + 2) Piercing damage, plus 2 (1d4) Piercing damage if the attack roll had Advantage.

### Bonus Actions
***Nimble Escape.*** The goblin takes the Disengage or Hide action.'''
import json
def setup(theme="hoard",scene="fire",dragon_hidden=False,turn="i"):
    return f"""
const SBD=(raw,name)=>{{const sb=parseStatblock(raw);sb.raw=raw;return sb}};
state.list=[
 Object.assign(newCombatant({{id:'d',name:'Adult Red Dragon',kind:'enemy',ctype:'dragon',init:22}}),{{hp:256,hpMax:256,ac:19,boss:true,title:'Scourge of the Ashen Peaks',hidden:{str(dragon_hidden).lower()},sb:SBD({json.dumps(DRAGON)})}}),
 newCombatant({{id:'i',name:'Isandros',kind:'pc',cls:'paladin',init:19}}),
 Object.assign(newCombatant({{id:'g1',name:'Goblin A',base:'Goblin Warrior',kind:'enemy',ctype:'fey',init:16}}),{{hp:10,hpMax:10,ac:15,sb:SBD({json.dumps(GOBLIN)})}}),
 newCombatant({{id:'s',name:'Styx',kind:'pc',cls:'bard',init:15}}),
 Object.assign(newCombatant({{id:'g2',name:'Goblin B',base:'Goblin Warrior',kind:'enemy',ctype:'fey',init:12}}),{{hp:10,hpMax:10,ac:15,sb:SBD({json.dumps(GOBLIN)})}}),
 newCombatant({{id:'a',name:'Astrea',kind:'pc',cls:'druid',init:11,conds:['Concentrating']}}),
 newCombatant({{id:'gr',name:'Gregori',kind:'pc',cls:'wizard',init:8}}),
 Object.assign(newCombatant({{id:'g3',name:'Goblin C',base:'Goblin Warrior',kind:'enemy',ctype:'fey',init:6}}),{{hp:10,hpMax:10,ac:15,sb:SBD({json.dumps(GOBLIN)})}})];
state.effects=[{{id:'e1',name:'Bless',by:'s',targets:['i','s','gr'],conc:false,area:false,r0:1}},{{id:'e2',name:'Spike Growth',by:'a',targets:[],conc:true,area:true,r0:1}}];
state.turn={{round:2,id:'{turn}',init:19}};state.theme={json.dumps(theme)};state.scene={json.dumps(scene)};state.look={{}};state.showQr=false;commit()"""
