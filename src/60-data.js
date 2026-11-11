(function(){
"use strict";
const CONDS=["Blinded","Burning","Charmed","Deafened","Exhaustion","Frightened","Grappled","Incapacitated","Invisible","Paralyzed","Petrified","Poisoned","Prone","Restrained","Stunned","Unconscious","Concentrating"];
const KIND={pc:"Player",enemy:"Enemy",ally:"Ally",lair:"Lair"};
const CLASSES=[["barbarian","Barbarian"],["bard","Bard"],["cleric","Cleric"],["druid","Druid"],["fighter","Fighter"],["monk","Monk"],["paladin","Paladin"],["ranger","Ranger"],["rogue","Rogue"],["sorcerer","Sorcerer"],["warlock","Warlock"],["wizard","Wizard"]];
const CTYPES=[["aberration","Aberration"],["beast","Beast"],["celestial","Celestial"],["construct","Construct"],["dragon","Dragon"],["elemental","Elemental"],["fey","Fey"],["fiend","Fiend"],["giant","Giant"],["humanoid","Humanoid"],["monstrosity","Monstrosity"],["ooze","Ooze"],["plant","Plant"],["undead","Undead"]];
const RIM={fiend:"fire",dragon:"fire",elemental:"fire",undead:"necro",ooze:"ooze",celestial:"holy",aberration:"eldritch"};
/* rules summaries (D&D 2024) in our own words; the book is the authority on details */
const RULES={
  blinded:{t:"Blinded",d:["You can't see and automatically fail any check that needs sight.","Attacks against you have Advantage; your attacks have Disadvantage."]},
  charmed:{t:"Charmed",d:["You can't attack the charmer or target them with harmful effects.","The charmer has Advantage on social checks against you."]},
  deafened:{t:"Deafened",d:["You can't hear and automatically fail any check that needs hearing."]},
  exhaustion:{t:"Exhaustion",d:["Each level: −2 to every d20 Test and −5 ft of Speed.","At level 6 the character dies.","A Long Rest removes one level."]},
  frightened:{t:"Frightened",d:["Disadvantage on checks and attacks while the source of fear is in sight.","You can't willingly move closer to it."]},
  grappled:{t:"Grappled",d:["Speed 0, and it can't increase.","Disadvantage on attacks against anyone but the grappler.","The grappler can drag you, at extra movement cost."]},
  incapacitated:{t:"Incapacitated",d:["No actions, Bonus Actions or Reactions.","You can't speak, and Concentration breaks.","If you roll Initiative like this, you roll with Disadvantage."]},
  invisible:{t:"Invisible",d:["Advantage on your Initiative roll.","Effects that need to see you don't work, unless the caster can somehow see you.","Attacks against you have Disadvantage; your attacks have Advantage."]},
  paralyzed:{t:"Paralyzed",d:["Incapacitated and Speed 0.","You automatically fail Strength and Dexterity saves.","Attacks against you have Advantage; a hit from within 5 ft is a Critical Hit."]},
  petrified:{t:"Petrified",d:["Turned to stone: Incapacitated, Speed 0.","You automatically fail Strength and Dexterity saves; attacks against you have Advantage.","Resistance to all damage, immune to Poisoned."]},
  poisoned:{t:"Poisoned",d:["Disadvantage on attack rolls and ability checks."]},
  burning:{t:"Burning",d:["Take 1d4 Fire damage at the start of each of your turns.","Action: drop Prone and roll on the ground to put the fire out.","The fire also goes out if it is doused, submerged or smothered."]},
  prone:{t:"Prone",d:["You can only crawl; standing up costs half your Speed.","Your attacks have Disadvantage.","Attacks against you from within 5 ft have Advantage, from farther away Disadvantage."]},
  restrained:{t:"Restrained",d:["Speed 0.","Attacks against you have Advantage; your attacks have Disadvantage.","Disadvantage on Dexterity saves."]},
  stunned:{t:"Stunned",d:["Incapacitated.","You automatically fail Strength and Dexterity saves.","Attacks against you have Advantage."]},
  unconscious:{t:"Unconscious",d:["Incapacitated and Prone; you drop what you hold and are unaware of your surroundings.","Speed 0; you automatically fail Strength and Dexterity saves.","Attacks against you have Advantage; a hit from within 5 ft is a Critical Hit."]},
  concentrating:{t:"Concentrating",d:["You're keeping a Concentration spell going; you can only have one.","When you take damage: Constitution save, DC 10 or half the damage (higher), max DC 30.","It ends if you're Incapacitated, die, or cast another Concentration spell."]},
  bloodied:{t:"Bloodied",d:["At half Hit Points or fewer.","No effect on its own, but some abilities and monsters react to it."]},
  zerohp:{t:"0 HP",d:["You're Unconscious and roll a death save (d20) at the start of each turn.","10 or higher succeeds, below 10 fails; a 1 counts as two failures, a 20 brings you back to 1 HP.","Three successes: you're stable. Three failures: the character dies.","Taking damage at 0 HP is a failure; a Critical Hit is two."]},
  stable:{t:"Stable",d:["No more death saves, but you're still at 0 HP and Unconscious.","After 1d4 hours you regain 1 HP, unless someone heals you first."]},
  dead:{t:"Dead",d:["The character has fallen. Ask the DM what's next; maybe someone has Revivify."]},
  insp:{t:"Heroic Inspiration",d:["Spend it to immediately reroll any die you just rolled.","You must use the new roll. You can have at most one."]},
  ac:{t:"AC",d:["Armor Class: an attack hits if its total equals or beats this number."]},
  reaction:{t:"Reaction used",d:["You've used your Reaction (an Opportunity Attack, Shield, Counterspell…).","You get it back at the start of your next turn."]},
  readied:{t:"Readied action",d:["You've set a trigger and an action; when the trigger happens, you can act with your Reaction.","A readied spell needs Concentration until you release it."]},
  dodge:{t:"Dodging",d:["Attacks against you have Disadvantage if you can see the attacker.","You make Dexterity saves with Advantage. Lasts until the start of your next turn."]},
  cover_half:{t:"Half cover",d:["+2 to AC and Dexterity saves."]},
  cover_tq:{t:"Three-quarters cover",d:["+5 to AC and Dexterity saves."]},
  cover_total:{t:"Total cover",d:["Can't be targeted directly by attacks or spells."]},
  know_immune:{t:"Immune",d:["Takes no damage of this type, or can't get this condition."]},
  know_resist:{t:"Resistant",d:["Takes half damage of this type."]},
  know_vuln:{t:"Vulnerable",d:["Takes double damage of this type."]},
  know_note:{t:"What you know",d:["Something the party has found out about this creature."]},
  lair:{t:"Lair action",d:["On initiative 20 (losing ties) the lair itself acts: the ground shakes, rocks fall, mist rises…"]}
};
const LABEL=Object.fromEntries([...CLASSES,...CTYPES]);
const SCENES=[["none","No scene"],["fog","Fog"],["forest","Forest"],["dungeon","Dungeon"],["tavern","Tavern"],["storm","Storm"],["fire","Fire"],["snow","Snow"],["stars","Stars"],["sand","Sandstorm"],
  ["underdark","Deep caverns"],["underwater","Underwater"],["ship","Ship at sea"],["swamp","Swamp"],["shadowfell","Shadow realm"],["avernus","Infernal wastes"],["feywild","Fey glade"],["temple","Temple"],["tower","Wizard's tower"],["cityrain","City rain"],["astral","Astral Plane"],
  ["grave","Graveyard"],["crystal","Crystal cave"],["aurora","Northern lights"],["autumn","Autumn"],["meadow","Sunny meadow"],["bloodmoon","Blood moon"],["ritual","Ritual circle"],["farrealm","Outer void"],
  ["mechanus","Clockwork plane"],["clouds","Above the clouds"],["festival","Festival"],["battle","Battlefield"],["mine","Mine"],["ethereal","Ethereal Plane"],["sewer","Sewers"]];
const SCENE_NEW=new Set(["grave","crystal","aurora","autumn","meadow","bloodmoon","ritual","farrealm","mechanus","clouds","festival","battle","mine","ethereal","sewer"]);
const WEATHERS=[["none","None"],["rain","Rain"],["snow","Snow"],["fog","Fog"],["ash","Ash"]],TODS=[["none","As it is"],["dawn","Dawn"],["day","Day"],["dusk","Dusk"],["night","Night"]];
/* R1: spells that leave something on the battlefield, while their effect lasts */
const BF_FX={"darkness":"darkness","fog cloud":"fog","stinking cloud":"stink","cloudkill":"kill","hunger of hadar":"hadar","wall of fire":"wallfire","sleet storm":"sleet","ice storm":"hail","faerie fire":"faerie","spirit guardians":"guard","daylight":"day","silence":"silence"};
const SIG_FX=new Set(["fireball","lightning bolt","call lightning","cone of cold","thunderwave","shatter","meteor swarm","disintegrate","power word kill","mass healing word","mass cure wounds","healing word","cure wounds","prayer of healing","heal","mass heal","bless","bane"]);
const FX_TYPES=["fire","cold","lightning","thunder","necrotic","radiant","acid","poison","psychic","force"];
const spellFxKnown=(n,t)=>{const k=String(n||"").toLowerCase().trim();return SIG_FX.has(k)||!!BF_FX[k]||FX_TYPES.includes(String(t||"").toLowerCase())};
/* which scene reactions are on (all of them unless the DM turned one off) */
const SFX=[["boss","Boss fight"],["spells","Spells"],["crit","Nat 20"],["lair","Lair actions"],["down","A player at 0 HP"],["clock","Countdowns turn the Ritual circle"],["fade","Fade between scenes"]];
const sfx=k=>k==="boss"?state.sceneReact!==false:!(state.sceneFx&&state.sceneFx[k]===false);
/* a theme: [key, name, scene, names font, title font]; its colours and rows share the key */
const THEMES=[["tavern","Candlelit tavern","tavern","alegreya","alegreya"],["oldmap","Old map","none","fell","fell"],["gothic","Gothic horror","fog","pirata","pirata"],["feywild","Fey glade","forest","cormorant","cormorant"],
  ["forge","Dwarven forge","fire","meta","meta"],["astral","Astral Plane","stars","cinzel","cinzel"],["frost","Frostbound","snow","marcellus","marcellus"],["sun","Sunscorched","sand","philosopher","philosopher"],
  ["marble","Marble & gold","temple","didot","cinzel"],["amphora","Black-figure","none","marcellus","marcellus"],["hoard","Dragon's hoard","fire","cinzeldec","uncial"],["wyrm","Wyrmscale","none","uncial","uncial"],
  ["hc","High contrast","none","atkinson","atkinson"]];
const THEME_NEW=new Set(["marble","amphora","hoard","wyrm"]);
/* the parts a theme is made of, each to pick on its own */
const PALS={tavern:["Tavern",["#14161f","#e3a54a","#6cb4cc","#d66a5b"]],oldmap:["Old map",["#e6d8b8","#8c2f1b","#2f5d73","#9a3420"]],gothic:["Gothic",["#0b090b","#c42a39","#8fa0b5","#cf4242"]],
  feywild:["Fey glade",["#0d1d18","#e8d48a","#8fd6c0","#e57c9c"]],forge:["Forge",["#17130f","#ff8a3d","#8fb0c4","#ff6a3d"]],astral:["Astral",["#080b1e","#5ee1ff","#7fb2ff","#ff7ab8"]],
  frost:["Frost",["#0c1622","#a6dcff","#9fd8ff","#ea8c9c"]],sun:["Sun",["#26190f","#3cc4b4","#3cc4b4","#ef7a3c"]],marble:["Marble",["#ece9e2","#1f5f99","#1f5f99","#a8452a"]],
  amphora:["Black-figure",["#c2602c","#1b120d","#f0b27a","#e8613c"]],hoard:["Hoard",["#0e0605","#f0b43c","#e8c27a","#ff5a36"]],wyrm:["Wyrm",["#06130f","#c9a24a","#9ad6c0","#e0784a"]],hc:["High contrast",["#000","#ffd400","#4fc3ff","#ff5a5a"]]};
const ROWSTYLES=[["tavern","Plain"],["oldmap","Parchment"],["gothic","Blood edge"],["feywild","Fey glow"],["forge","Forge seams"],["astral","Starlight"],["frost","Frost"],["sun","Sun stripes"],
  ["marble","Marble & Greek key"],["amphora","Black-figure & Greek key"],["hoard","Dragon scales"],["wyrm","Wyrmscale"],["hc","High contrast"]];
const FONTS=[["alegreya","Alegreya SC","'Alegreya SC'"],["cinzel","Cinzel","Cinzel"],["cinzeldec","Cinzel Decorative","'Cinzel Decorative'"],["marcellus","Marcellus SC","'Marcellus SC'"],
  ["didot","GFS Didot","'GFS Didot'"],["uncial","Uncial Antiqua","'Uncial Antiqua'"],["fell","IM Fell English","'IM Fell English SC'"],["pirata","Pirata One","'Pirata One'"],
  ["meta","Metamorphous","Metamorphous"],["cormorant","Cormorant SC","'Cormorant SC'"],["philosopher","Philosopher","Philosopher"],["atkinson","Atkinson (easiest to read)","'Atkinson Hyperlegible'"]];
/* the DM screen in light or dark: only on this laptop, never on the tablet or phones */
const SUN='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.5" fill="currentColor"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  MOON='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8.5 8.5 0 019.5 4a8.5 8.5 0 1010.5 10.5z" fill="currentColor"/></svg>';
function dmLightApply(){if(MODE!=="dm"||PREVIEW)return;const on=!!ls.get("dmLight",false),d=document.documentElement.dataset;if(on)d.dm="light";else delete d.dm;
  const b=document.getElementById("dmLightBtn");if(b){b.innerHTML=on?MOON:SUN;b.title=on?"Switch to the dark screen":"Switch to the light screen";b.setAttribute("aria-pressed",String(on))}}
const themeOf=k=>THEMES.find(t=>t[0]===k)||THEMES[0];
/* what the tablet shows: the theme's parts, with the DM's own picks over them */
function lookOf(st){const th=themeOf(st.theme||"tavern"),L=st.look||{};return {pal:L.pal||th[0],rows:L.rows||th[0],font:L.font||th[3],tfont:L.tfont||th[4],mfont:st.mfont||"B"}}
const phoneLight=()=>MODE==="player"&&!PREVIEW&&meName!=="*"&&!!ls.get("pLight",false);   // a phone's own light screen: the table's fonts, light colours
function applyLook(lk){const d=document.documentElement.dataset;
  const set=(k,v,none)=>{if(v&&v!==none)d[k]=v;else delete d[k]};
  if(phoneLight()){d.plight="1";lk=Object.assign({},lk,{pal:"tavern",rows:"tavern"})}else delete d.plight;
  set("mfont",lk.mfont,"B");
  set("skin",lk.pal,"tavern");set("rows",lk.rows,"tavern");set("font",lk.font,"alegreya");set("tfont",lk.tfont,lk.font);}   // no title font = same as the names
const frameKey=c=>c.kind==="pc"?(LABEL[c.cls]?c.cls:""):c.kind==="lair"?"":(LABEL[c.ctype]?c.ctype:"");
const typeOptions=(list,sel,none)=>`<option value="">${none}</option>`+list.map(([k,l])=>`<option value="${k}"${k===sel?" selected":""}>${l}</option>`).join("");
const I={
  shield:'<svg viewBox="0 0 24 24"><path d="M12 2l8.5 3.2v6.1c0 5.2-3.6 9.5-8.5 11.2-4.9-1.7-8.5-6-8.5-11.2V5.2z"/></svg>',
  drop:'<svg viewBox="0 0 24 24"><path d="M12 2.3C8.7 7 5.8 10.6 5.8 14.3a6.2 6.2 0 0012.4 0c0-3.7-2.9-7.3-6.2-12z"/></svg>',
  eye:'<svg viewBox="0 0 24 24"><path d="M12 5C6.5 5 2.7 9.4 1.5 12c1.2 2.6 5 7 10.5 7s9.3-4.4 10.5-7C21.3 9.4 17.5 5 12 5zm0 11a4 4 0 110-8 4 4 0 010 8z"/></svg>',
  eyeoff:'<svg viewBox="0 0 24 24"><path d="M3.3 2l18.7 18.7-1.4 1.4-3.4-3.4A11.6 11.6 0 0112 19C6.5 19 2.7 14.6 1.5 12a13.8 13.8 0 014.1-5L1.9 3.4zM12 5c5.5 0 9.3 4.4 10.5 7a13.7 13.7 0 01-3 4.1l-3.6-3.6A4 4 0 0011.5 8L8.9 5.4A11 11 0 0112 5z"/></svg>',
  up:'<svg viewBox="0 0 24 24"><path d="M12 6l7 8H5z"/></svg>',
  down:'<svg viewBox="0 0 24 24"><path d="M12 18l-7-8h14z"/></svg>',
  x:'<svg viewBox="0 0 24 24"><path d="M6.4 5L12 10.6 17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6L6.4 19 5 17.6 10.6 12 5 6.4z"/></svg>',
  book:'<svg viewBox="0 0 24 24"><path d="M5 3.5h9.5A4.5 4.5 0 0119 8v12.5H7.5A2.5 2.5 0 015 18zm2.5 13.5a1 1 0 000 2H17v-2zM8 7v1.6h7V7z"/></svg>',
  crown:'<svg viewBox="0 0 24 24"><path d="M3 18h18v2.5H3zM2.5 6.5l5.2 4.3L12 4l4.3 6.8 5.2-4.3L19.6 16H4.4z"/></svg>',
  hex:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.6l9.2 5.3v10.2L12 22.4l-9.2-5.3V6.9z"/></svg>',
  star:'<svg viewBox="0 0 24 24"><path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7L12 17.3l-6.2 3.6 1.6-7L2 9.2l7.1-.6z"/></svg>'
};
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let uidN=0;const uid=()=>Math.random().toString(36).slice(2,8)+(uidN++%1296).toString(36).padStart(2,"0");   // the counter keeps two ids made in the same instant apart
const ls={get(k,d){try{const v=localStorage.getItem("it."+k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem("it."+k,JSON.stringify(v))}catch(e){}}};
const SVGI={next:'<svg class="ui-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  prev:'<svg class="ui-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  castle:'<svg class="ui-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 21V9h2V5h2v2h2V5h4v2h2V5h2v4h2v12h-6v-5a2 2 0 00-4 0v5z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
  search:'<svg class="ui-i" viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M15.5 15.5L21 21" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
  book:'<svg class="ui-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2zM4 5v16M8 7h7" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/></svg>',
  spark:'<svg class="ui-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l2.2 6.8L21 12l-6.8 2.2L12 21l-2.2-6.8L3 12l6.8-2.2z" fill="currentColor"/></svg>',
  reload:'<svg class="ui-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12a8 8 0 11-2.3-5.6M20 4v5h-5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  clock:'<svg class="ui-i" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 7.5V12l3 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  area:'<svg class="ui-i" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="3 3"/><circle cx="12" cy="12" r="2.5" fill="currentColor"/></svg>',
  eye:'<svg class="ui-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>',
  qr:'<svg class="ui-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2v2h-2zM16 16h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2z" fill="currentColor"/></svg>'};
const ic=name=>SVGI[name];
/* full screen is a switch: the same button goes in and comes back out (Esc, F11 or a swipe from the top also leave it, and the label follows) */
const fsEl=()=>document.fullscreenElement||document.webkitFullscreenElement||null;
const fsLabel=()=>fsEl()?"Exit full screen":"Full screen";
function fsToggle(){
  const d=document,e=d.documentElement;
  try{const p=fsEl()?(d.exitFullscreen||d.webkitExitFullscreen).call(d):(e.requestFullscreen||e.webkitRequestFullscreen).call(e);p&&p.catch&&p.catch(()=>{})}catch(err){}
}
["fullscreenchange","webkitfullscreenchange"].forEach(ev=>document.addEventListener(ev,()=>document.querySelectorAll('[data-act="fs"]').forEach(b=>b.textContent=fsLabel())));
