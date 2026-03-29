/** ≥500 binomial-style names (genus + species) for synthetic patient/staff labels. */
const GENERA = [
  "Panthera", "Equus", "Bos", "Ovis", "Capra", "Sus", "Canis", "Felis", "Loxodonta",
  "Giraffa", "Hippopotamus", "Crocuta", "Acinonyx", "Vulpes", "Ursus", "Ailuropoda",
  "Tapirus", "Rhinoceros", "Diceros", "Syncerus", "Tragelaphus", "Kobus", "Alcelaphus",
  "Connochaetes", "Damaliscus", "Eudorcas", "Nanger", "Litocranius", "Aepyceros",
  "Oreotragus", "Oryx", "Addax", "Antidorcas", "Raphicerus", "Sylvicapra", "Redunca",
  "Cephalophus", "Philantomba", "Neotragus", "Madoqua", "Ourebia", "Procapra",
  "Hemitragus", "Ammotragus", "Capricornis", "Naemorhedus", "Budorcas", "Ovibos",
  "Ovies", "Pseudois", "Hemitragus", "Capra", "Oreamnos", "Rupicapra", "Myotis",
  "Pipistrellus", "Eptesicus", "Nyctalus", "Plecotus", "Vespertilio", "Miniopterus",
  "Tadarida", "Molossus", "Eidolon", "Rousettus", "Epomophorus", "Hypsignathus",
  "Micropteropus", "Casinycteris", "Lissonycteris", "Scotonycteris", "Epomops",
  "Colobus", "Cercopithecus", "Chlorocebus", "Papio", "Theropithecus", "Mandrillus",
  "Lophocebus", "Cercocebus", "Macaca", "Trachypithecus", "Semnopithecus", "Pygathrix",
  "Rhinopithecus", "Nasalis", "Simias", "Pongo", "Gorilla", "Pan", "Homo",
];

const SPECIES = [
  "Leo", "Tigris", "Pardus", "Onca", "Cabrae", "Ferus", "Asinus", "Zebra", "Bison",
  "Taurus", "Aries", "Hircus", "Scrofa", "Familiaris", "Catus", "Africana", "Camelus",
  "Dromedarius", "Reticulata", "Cyclotis", "Maximus", "Indicus", "Sumatrensis", "Gras",
  "Capped", "Dama", "Europaeus", "Americanus", "Vitulus", "Arvensis", "Sylvestris",
  "Barbatus", "Acuta", "Platyrhynchos", "Gallus", "Domesticus", "Meliagris", "Numida",
  "Corvus", "Fringilla", "Passer", "Columba", "Streptopelia", "Apus", "Hirundo",
  "Delphinus", "Orcinus", "Physeter", "Balaenoptera", "Megaptera", "Escherichia",
  "Coli", "Subtilis", "Cereus", "Aureus", "Pyogenes", "Pneumoniae", "Fluorescens",
  "Putida", "Vulgaris", "Fragilis", "Perfringens", "Tetani", "Botulinum", "Sapiens",
  "Erectus", "Habilis", "Naledi", "Neanderthalensis", "Paniscus", "Troglodytes",
  "Abelii", "Pygmaeus", "Borneensis", "Sumatrensis", "Lar", "Obscura", "Fascicularis",
  "Mulatta", "Radiata", "Vetulus", "Rosalia", "Jacchus", "Oedipus", "Imperator",
  "Satyrus", "Beringei", "Gorilla", "Angolensis", "Troglodytes", "Schweinfurthii",
  "Marungensis", "Verus", "Rufomitratus", "Johnstoni", "Kirkii", "Thomsonii", "Grantii",
  "Gazella", "Dorcas", "Subgutturosa", "Leptoceros", "Spekei", "Soemmerringii",
  "Lewel", "Rufifrons", "Elegantulus", "Moschatus", "Americana", "Pictus", "Latrans",
  "Fulvus", "Vulpes", "Chama", "Cinereoargenteus", "Velox", "Jubatus", "Megalotis",
  "Mesomelas", "Rueppellii", "Pallida", "Familiaris", "Latrans", "Adustus", "Microtis",
];

export const ANIMAL_BINOMIALS: string[] = [];
for (const g of GENERA) {
  for (const s of SPECIES) {
    ANIMAL_BINOMIALS.push(`${g} ${s}`);
  }
}

export function pickName(rng: () => number): string {
  const i = Math.floor(rng() * ANIMAL_BINOMIALS.length);
  return ANIMAL_BINOMIALS[i] ?? "Panthera Leo";
}
