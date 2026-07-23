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
  } else if (catLower === 'materials' || catLower === 'nguyên liệu') {
    folder = 'nguyên liệu võ godhuamn';
    const noUnderscoreMaterials = [
      'Angel_Wings', 'Demonic_Wisp', 'Dragon_Scale', 'Fish_Tail', 
      'Mini_Tusk', 'Radioactive_Material', 'Vampire_Fang', 'Yeti_Fur'
    ];
    if (noUnderscoreMaterials.includes(normalizedName)) {
      normalizedName = normalizedName.replace(/_/g, '');
    }
  } else if (catLower === 'fruits' || catLower === 'trái ác quỷ') {
    folder = 'trái acc quỷ';
    let cleanName = firstName.split('-')[0].replace(/Physical\s+/i, '').replace(/\s*Fruit/i, '').trim();
    normalizedName = `${cleanName.replace(/\s+/g, '_')}_Fruit`;
  }

  if (!folder) return '';
  return `/ảnh/${folder}/${normalizedName}.webp`;
};
