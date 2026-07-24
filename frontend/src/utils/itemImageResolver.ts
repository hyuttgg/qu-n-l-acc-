/**
 * Helper to resolve item asset image paths served statically from /public/ảnh
 */
export const resolveItemImage = (category: string, name: string): string => {
  if (!name || name === 'None') return '';
  const firstName = name.split(',')[0].trim();
  let normalizedName = firstName.replace(/\s+/g, '_');
  let folder = '';

  const catLower = category ? category.toLowerCase() : '';

  if (catLower === 'swords' || catLower === 'weapons' || catLower === 'kiếm') {
    folder = 'kiếm';
  } else if (catLower === 'guns' || catLower === 'súng') {
    folder = 'súng';
  } else if (catLower === 'styles' || catLower === 'melee' || catLower === 'võ') {
    folder = 'võ';
    const meleeLower = firstName.toLowerCase().replace(/[\s_\-]+/g, '');

    if (meleeLower.includes('godhuman')) normalizedName = 'Godhuman';
    else if (meleeLower.includes('superhuman')) normalizedName = 'Superhuman';
    else if (meleeLower.includes('sanguine')) normalizedName = 'Sanguine_Art';
    else if (meleeLower.includes('sharkman') || meleeLower.includes('fishmankarate')) normalizedName = 'Sharkman_Karate';
    else if (meleeLower.includes('water') || meleeLower.includes('fishman')) normalizedName = 'Water_Kung_Fu';
    else if (meleeLower.includes('electricclaw') || meleeLower.includes('eclaw')) normalizedName = 'Electric_Claw';
    else if (meleeLower.includes('electric') || meleeLower.includes('electro')) normalizedName = 'Electric';
    else if (meleeLower.includes('dragontalon')) normalizedName = 'Dragon_Talon';
    else if (meleeLower.includes('dragon')) normalizedName = 'Dragon_Breath';
    else if (meleeLower.includes('deathstep')) normalizedName = 'Death_Step';
    else if (meleeLower.includes('darkstep') || meleeLower.includes('blackleg')) normalizedName = 'Dark_Step';
    else if (meleeLower.includes('combat')) normalizedName = 'Combat';
  } else if (catLower === 'accessories' || catLower === 'phụ kiện') {
    folder = 'phụ kiên';
    const accLower = firstName.toLowerCase().replace(/[\s_\-'’%27\(\)]+/g, '');

    if (accLower.includes('warrior') || accLower.includes('corrida')) normalizedName = 'Warrior_Helmet';
    else if (accLower.includes('valkyrie')) normalizedName = 'Valkyrie_Helm';
    else if (accLower.includes('palescarf') || accLower.includes('scarf')) normalizedName = 'Pale_Scarf';
    else if (accLower.includes('darkcoat')) normalizedName = 'Dark_Coat';
    else if (accLower.includes('pinkcoat')) normalizedName = 'Pink_Coat';
    else if (accLower.includes('blackspikey') || accLower.includes('blackspiky')) normalizedName = 'Black_Spikey_Coat';
    else if (accLower.includes('bluespikey') || accLower.includes('bluespiky')) normalizedName = 'Blue_Spikey_Coat';
    else if (accLower.includes('redspikey') || accLower.includes('redspiky')) normalizedName = 'Red_Spikey_Coat';
    else if (accLower.includes('coat')) normalizedName = 'Coat_29';
    else if (accLower.includes('blackcape')) normalizedName = 'Black_Cape';
    else if (accLower.includes('huntercape') || accLower.includes('hunter')) normalizedName = 'Hunter_Cape_29';
    else if (accLower.includes('bandanna') || accLower.includes('bandana')) normalizedName = 'Bandanna_29';
    else if (accLower.includes('bearears') || accLower.includes('bear')) normalizedName = 'Bear_Ears';
    else if (accLower.includes('choppa')) normalizedName = 'Choppa';
    else if (accLower.includes('coolshades') || accLower.includes('shades')) normalizedName = 'Cool_Shades';
    else if (accLower.includes('dinohood') || accLower.includes('dino')) normalizedName = 'Dino_Hood';
    else if (accLower.includes('dojobelt') || accLower.includes('belt')) normalizedName = 'Dojo_Belt_29';
    else if (accLower.includes('feathered')) normalizedName = 'Feathered_Visage';
    else if (accLower.includes('ghoul')) normalizedName = 'Ghoul_Mask';
    else if (accLower.includes('goldensunhat') || accLower.includes('sunhat')) normalizedName = 'Golden_Sunhat';
    else if (accLower.includes('holycrown')) normalizedName = 'Holy_Crown';
    else if (accLower.includes('jawshield')) normalizedName = 'Jaw_Shield';
    else if (accLower.includes('kitsunemask')) normalizedName = 'Kitsune_Mask';
    else if (accLower.includes('kitsuneribbon')) normalizedName = 'Kitsune_Ribbon';
    else if (accLower === 'lei') normalizedName = 'Lei';
    else if (accLower.includes('leviathancrown')) normalizedName = 'Leviathan_Crown';
    else if (accLower.includes('leviathanshield')) normalizedName = 'Leviathan_Shield';
    else if (accLower.includes('marinecap')) normalizedName = 'Marine_Cap';
    else if (accLower.includes('musketeer')) normalizedName = 'Musketeer_Hat';
    else if (accLower.includes('pilot')) normalizedName = 'Pilot_Helmet';
    else if (accLower.includes('prettyhelmet')) normalizedName = 'Pretty_Helmet';
    else if (accLower.includes('sharktooth') || accLower.includes('shark')) normalizedName = 'Shark_Tooth_Necklace';
    else if (accLower.includes('swanglasses') || accLower.includes('swanglass')) normalizedName = 'Swan_Glasses';
    else if (accLower.includes('swordsman')) normalizedName = 'Swordsman_Hat';
    else if (accLower.includes('trex')) normalizedName = 'T-Rex_Skull';
    else if (accLower.includes('terrorjaw') || accLower.includes('terror')) normalizedName = 'Terror_Jaw';
    else if (accLower.includes('tomoering') || accLower.includes('tomoe')) normalizedName = 'Tomoe_Ring';
    else if (accLower.includes('tophat')) normalizedName = 'Top_Hat';
    else if (accLower.includes('usoap') || accLower.includes('usopp')) normalizedName = 'Usop_Hat';
    else if (accLower.includes('zebracap') || accLower.includes('zebra')) normalizedName = 'Zebra_Cap';
    else if (accLower.includes('hunten')) normalizedName = 'hunten.99';
  } else if (catLower === 'materials' || catLower === 'nguyên liệu') {
    folder = 'nguyên liệu võ godhuamn';
    const matLower = firstName.toLowerCase().replace(/[\s_\-'’%27\(\)]+/g, '');

    if (matLower.includes('alucard')) normalizedName = 'Alucard_Fragment';
    else if (matLower.includes('angelwing') || matLower.includes('angel')) normalizedName = 'AngelWings';
    else if (matLower.includes('azure')) normalizedName = 'Azure_Ember';
    else if (matLower.includes('blaze')) normalizedName = 'Blaze_Ember';
    else if (matLower.includes('blueicicle') || matLower.includes('icicle')) normalizedName = 'Blue_Icicle_Berry';
    else if (matLower === 'bones' || matLower === 'bone') normalizedName = 'Bones';
    else if (matLower.includes('cocoa')) normalizedName = 'Conjured_Cocoa';
    else if (matLower.includes('darkfragment')) normalizedName = 'Dark_Fragment';
    else if (matLower.includes('demonicwisp') || matLower.includes('demonic')) normalizedName = 'DemonicWisp';
    else if (matLower.includes('dinosaur')) normalizedName = 'Dinosaur_Bones';
    else if (matLower.includes('dragonegg')) normalizedName = 'Dragon_Egg';
    else if (matLower.includes('dragonscale')) normalizedName = 'DragonScale';
    else if (matLower.includes('ectoplasm')) normalizedName = 'Ectoplasm';
    else if (matLower.includes('electricwing')) normalizedName = 'Electric_Wing';
    else if (matLower.includes('firefeather')) normalizedName = 'Fire_Feather';
    else if (matLower.includes('fireflower')) normalizedName = 'Fire_Flower';
    else if (matLower.includes('fishtail') || matLower.includes('fish')) normalizedName = 'FishTail';
    else if (matLower.includes('foolsgold') || matLower.includes('fool')) normalizedName = 'Fools_Gold';
    else if (matLower.includes('greentoad') || matLower.includes('toad')) normalizedName = 'Green_Toad_Berry';
    else if (matLower.includes('gunpowder')) normalizedName = 'Gunpowder';
    else if (matLower.includes('leather')) normalizedName = 'Leather';
    else if (matLower.includes('leviathanheart')) normalizedName = 'Leviathan_Heart';
    else if (matLower.includes('leviathanscale')) normalizedName = 'Leviathan_Scale';
    else if (matLower.includes('magmaore') || matLower.includes('magma')) normalizedName = 'Magma_Ore';
    else if (matLower.includes('meteorite')) normalizedName = 'Meteorite';
    else if (matLower.includes('minitusk') || matLower.includes('tusk')) normalizedName = 'MiniTusk';
    else if (matLower.includes('mirrorfractal') || matLower.includes('mirror')) normalizedName = 'Mirror_Fractal';
    else if (matLower.includes('monstermagnet')) normalizedName = 'Monster_Magnet';
    else if (matLower.includes('moonstone')) normalizedName = 'Moonstone';
    else if (matLower.includes('mutanttooth')) normalizedName = 'Mutant_Tooth';
    else if (matLower.includes('mysticdroplet') || matLower.includes('mystic')) normalizedName = 'Mystic_Droplet';
    else if (matLower.includes('nightmare')) normalizedName = 'Nightmare_Catcher';
    else if (matLower.includes('orangeberry')) normalizedName = 'Orange_Berry';
    else if (matLower.includes('pinkpig') || matLower.includes('pig')) normalizedName = 'Pink_Pig_Berry';
    else if (matLower.includes('purplejelly') || matLower.includes('jelly')) normalizedName = 'Purple_Jelly_Berry';
    else if (matLower.includes('radioactive')) normalizedName = 'RadioactiveMaterial';
    else if (matLower.includes('redcherry') || matLower.includes('cherry')) normalizedName = 'Red_Cherry_Berry';
    else if (matLower.includes('scrapmetal') || matLower.includes('scrap')) normalizedName = 'Scrap_Metal';
    else if (matLower.includes('sharktooth')) normalizedName = 'Shark_Tooth';
    else if (matLower.includes('simulation')) normalizedName = 'Simulation_Data';
    else if (matLower.includes('terroreyes')) normalizedName = 'Terror_Eyes';
    else if (matLower.includes('vampirefang') || matLower.includes('vampire')) normalizedName = 'VampireFang';
    else if (matLower.includes('volcanicmagnet')) normalizedName = 'Volcanic_Magnet';
    else if (matLower.includes('voltcapsule') || matLower.includes('volt')) normalizedName = 'Volt_Capsule';
    else if (matLower.includes('whitecloud')) normalizedName = 'White_Cloud_Berry';
    else if (matLower.includes('woodenplank') || matLower.includes('plank')) normalizedName = 'Wooden_Plank';
    else if (matLower.includes('yellowstar')) normalizedName = 'Yellow_Star_Berry';
    else if (matLower.includes('yetifur') || matLower.includes('yeti')) normalizedName = 'YetiFur';
  } else if (catLower === 'fruits' || catLower === 'trái ác quỷ') {
    folder = 'trái acc quỷ';
    let cleanName = firstName.split('-')[0].replace(/Physical\s+/i, '').replace(/\s*Fruit/i, '').trim();
    normalizedName = `${cleanName.replace(/\s+/g, '_')}_Fruit`;
  }

  if (!folder) return '';
  return `/ảnh/${folder}/${normalizedName}.webp`;
};
