import type { Edge, Node } from "@xyflow/react";
import type { FamilyMemberNodeData, FamilyMemberProfile } from "./types";

const NODE_WIDTH = 200;
const NODE_HEIGHT = 120;
const H_GAP = 80;
const V_GAP = 140;

export const profiles: Record<string, FamilyMemberProfile> = {
  "henri-martin": {
    id: "henri-martin",
    name: "Henri Martin",
    birthYear: 1862,
    deathYear: 1938,
    birthplace: "Lyon, France",
    biography:
      "Henri Martin was a master clockmaker whose workshop on the Saône riverbank served three generations of Lyonnais families. He apprenticed under his uncle at fourteen and opened his own atelier at twenty-two. Known for precision and patience, he documented every repair in leather-bound journals that the family still keeps in an oak chest.",
    avatarUrl: "",
    generation: 0,
    spouseId: "marie-dubois",
    childIds: ["jean-martin", "claire-martin"],
    gallery: [
      { id: "g1", caption: "Workshop portrait, 1890" },
      { id: "g2", caption: "Wedding day, 1888" },
      { id: "g3", caption: "River Saône, 1912" },
    ],
  },
  "marie-dubois": {
    id: "marie-dubois",
    name: "Marie Dubois",
    birthYear: 1865,
    deathYear: 1944,
    birthplace: "Villefranche-sur-Saône, France",
    biography:
      "Marie Dubois Martin tended a walled herb garden behind the clockmaker's shop and taught village children to read on Sunday afternoons. She kept correspondence with cousins in Provence and preserved recipes that became the backbone of family holiday gatherings for decades.",
    avatarUrl: "",
    generation: 0,
    spouseId: "henri-martin",
    childIds: ["jean-martin", "claire-martin"],
    gallery: [
      { id: "g1", caption: "Herb garden sketch" },
      { id: "g2", caption: "Sunday school, 1901" },
    ],
  },
  "louis-bernard": {
    id: "louis-bernard",
    name: "Louis Bernard",
    birthYear: 1858,
    deathYear: 1931,
    birthplace: "Dijon, France",
    biography:
      "Louis Bernard was a railway signal engineer who moved east with the expanding line toward Strasbourg. His meticulous diagrams of junction switches were admired by colleagues and later framed by his granddaughter Élise.",
    avatarUrl: "",
    generation: 0,
    spouseId: "suzanne-moreau",
    childIds: ["pierre-bernard"],
    gallery: [
      { id: "g1", caption: "Signal tower, 1894" },
      { id: "g2", caption: "Engineer's notebook" },
    ],
  },
  "suzanne-moreau": {
    id: "suzanne-moreau",
    name: "Suzanne Moreau",
    birthYear: 1860,
    deathYear: 1940,
    birthplace: "Beaune, France",
    biography:
      "Suzanne Moreau Bernard sang in the parish choir and embroidered altar cloths that traveled to three churches before returning to the family home. She wrote vivid letters about vineyard seasons that her descendants still quote at reunions.",
    avatarUrl: "",
    generation: 0,
    spouseId: "louis-bernard",
    childIds: ["pierre-bernard"],
    gallery: [{ id: "g1", caption: "Choir photograph, 1908" }],
  },
  "jean-martin": {
    id: "jean-martin",
    name: "Jean Martin",
    birthYear: 1890,
    deathYear: 1965,
    birthplace: "Lyon, France",
    biography:
      "Jean Martin inherited the clockmaker's bench and expanded into municipal tower clocks across the Rhône valley. He served as a reserve officer during the Great War and returned to rebuild the workshop roof with his own hands.",
    avatarUrl: "",
    generation: 1,
    spouseId: "hélène-bernard",
    childIds: ["andré-martin", "simone-martin"],
    gallery: [
      { id: "g1", caption: "Tower clock restoration" },
      { id: "g2", caption: "Reserve uniform, 1916" },
    ],
  },
  "claire-martin": {
    id: "claire-martin",
    name: "Claire Martin",
    birthYear: 1893,
    deathYear: 1972,
    birthplace: "Lyon, France",
    biography:
      "Claire Martin trained as a schoolmistress in Grenoble and taught literature in a girls' academy until retirement. She translated English poetry for her pupils and hosted a literary salon every Thursday in her apartment overlooking the park.",
    avatarUrl: "",
    generation: 1,
    childIds: [],
    gallery: [{ id: "g1", caption: "Academy portrait, 1920" }],
  },
  "pierre-bernard": {
    id: "pierre-bernard",
    name: "Pierre Bernard",
    birthYear: 1888,
    deathYear: 1959,
    birthplace: "Dijon, France",
    biography:
      "Pierre Bernard followed his father onto the railways and rose to stationmaster at Mulhouse. He collected timetables from across Europe and could recite departure schedules from memory well into his seventies.",
    avatarUrl: "",
    generation: 1,
    childIds: ["hélène-bernard"],
    gallery: [{ id: "g1", caption: "Stationmaster office, 1935" }],
  },
  "hélène-bernard": {
    id: "hélène-bernard",
    name: "Hélène Bernard",
    birthYear: 1894,
    deathYear: 1978,
    birthplace: "Mulhouse, France",
    biography:
      "Hélène Bernard Martin kept the household accounts with legendary exactness and volunteered at the town library cataloguing donations. She bridged the Martin and Bernard branches of the family and organized the first unified reunion in 1952.",
    avatarUrl: "",
    generation: 1,
    spouseId: "jean-martin",
    childIds: ["andré-martin", "simone-martin"],
    gallery: [
      { id: "g1", caption: "Library volunteers, 1948" },
      { id: "g2", caption: "Family reunion, 1952" },
    ],
  },
  "andré-martin": {
    id: "andré-martin",
    name: "André Martin",
    birthYear: 1923,
    deathYear: 1998,
    birthplace: "Lyon, France",
    biography:
      "André Martin studied architecture in Paris and designed modest public housing that prioritized light and courtyards. He spent summers sketching Provençal farmhouses and passed watercolors to his children as birthday gifts.",
    avatarUrl: "",
    generation: 2,
    spouseId: "marguerite-laurent",
    childIds: ["philippe-martin", "élise-martin", "camille-martin"],
    gallery: [
      { id: "g1", caption: "Housing project model, 1962" },
      { id: "g2", caption: "Watercolor collection" },
      { id: "g3", caption: "Paris studio, 1950" },
    ],
  },
  "simone-martin": {
    id: "simone-martin",
    name: "Simone Martin",
    birthYear: 1926,
    deathYear: 2011,
    birthplace: "Lyon, France",
    biography:
      "Simone Martin became a pediatric nurse and later directed a clinic ward in Villeurbanne. Colleagues remembered her calm voice during night shifts and the knitted blankets she left for newborns.",
    avatarUrl: "",
    generation: 2,
    childIds: ["thomas-renard"],
    gallery: [{ id: "g1", caption: "Clinic dedication, 1975" }],
  },
  "marguerite-laurent": {
    id: "marguerite-laurent",
    name: "Marguerite Laurent",
    birthYear: 1925,
    deathYear: 2003,
    birthplace: "Avignon, France",
    biography:
      "Marguerite Laurent Martin was a ceramicist whose studio kiln fired tiles for churches and homes alike. She exhibited in Marseille and taught weekend workshops that drew students from across the south.",
    avatarUrl: "",
    generation: 2,
    spouseId: "andré-martin",
    childIds: ["philippe-martin", "élise-martin", "camille-martin"],
    gallery: [
      { id: "g1", caption: "Kiln opening day, 1960" },
      { id: "g2", caption: "Exhibition poster, 1971" },
    ],
  },
  "philippe-martin": {
    id: "philippe-martin",
    name: "Philippe Martin",
    birthYear: 1952,
    deathYear: null,
    birthplace: "Lyon, France",
    biography:
      "Philippe Martin teaches history at a lycée and leads archival trips for students to municipal record offices. He digitized the family's nineteenth-century journals and maintains the shared genealogy spreadsheet used at reunions.",
    avatarUrl: "",
    generation: 3,
    spouseId: "isabelle-fontaine",
    childIds: ["lucas-martin", "sophie-martin"],
    gallery: [
      { id: "g1", caption: "Archive visit, 2018" },
      { id: "g2", caption: "Lycée faculty photo" },
    ],
  },
  "élise-martin": {
    id: "élise-martin",
    name: "Élise Martin",
    birthYear: 1955,
    deathYear: null,
    birthplace: "Lyon, France",
    biography:
      "Élise Martin is a violinist with the regional orchestra and coaches chamber ensembles on weekends. She restored her grandfather's signal diagrams and hung them in her practice room as a reminder of precision across disciplines.",
    avatarUrl: "",
    generation: 3,
    childIds: ["léa-dupont"],
    gallery: [{ id: "g1", caption: "Orchestra season program" }],
  },
  "camille-martin": {
    id: "camille-martin",
    name: "Camille Martin",
    birthYear: 1958,
    deathYear: null,
    birthplace: "Lyon, France",
    biography:
      "Camille Martin runs a small publishing imprint specializing in translated essays and family memoirs. She compiled the first printed anthology of Martin–Bernard letters in 2019.",
    avatarUrl: "",
    generation: 3,
    childIds: [],
    gallery: [
      { id: "g1", caption: "Imprint colophon" },
      { id: "g2", caption: "Letter anthology cover" },
    ],
  },
  "isabelle-fontaine": {
    id: "isabelle-fontaine",
    name: "Isabelle Fontaine",
    birthYear: 1954,
    deathYear: null,
    birthplace: "Annecy, France",
    biography:
      "Isabelle Fontaine Martin is a landscape architect who redesigned the lakeside promenade in Annecy and consults on heritage garden restorations. She maps family trips around notable parks and cemeteries with equal enthusiasm.",
    avatarUrl: "",
    generation: 3,
    spouseId: "philippe-martin",
    childIds: ["lucas-martin", "sophie-martin"],
    gallery: [{ id: "g1", caption: "Promenade dedication, 2009" }],
  },
  "thomas-renard": {
    id: "thomas-renard",
    name: "Thomas Renard",
    birthYear: 1960,
    deathYear: null,
    birthplace: "Villeurbanne, France",
    biography:
      "Thomas Renard works in renewable energy project finance and visits his mother Simone every Sunday for lunch. He built the online photo archive that feeds this family tree visualizer.",
    avatarUrl: "",
    generation: 3,
    childIds: [],
    gallery: [{ id: "g1", caption: "Solar farm inauguration" }],
  },
  "lucas-martin": {
    id: "lucas-martin",
    name: "Lucas Martin",
    birthYear: 1985,
    deathYear: null,
    birthplace: "Lyon, France",
    biography:
      "Lucas Martin is a software engineer in Berlin who contributed the interactive layout for this genealogy project. He visits Lyon twice a year and documents each reunion with panoramic photographs.",
    avatarUrl: "",
    generation: 4,
    childIds: [],
    gallery: [
      { id: "g1", caption: "Berlin apartment, 2022" },
      { id: "g2", caption: "Reunion panorama, 2024" },
    ],
  },
  "sophie-martin": {
    id: "sophie-martin",
    name: "Sophie Martin",
    birthYear: 1988,
    deathYear: null,
    birthplace: "Lyon, France",
    biography:
      "Sophie Martin practices environmental law in Brussels and advocates for river basin protections along the Rhône. She inherited her grandmother Marguerite's eye for color and collects ceramic tiles from travels.",
    avatarUrl: "",
    generation: 4,
    childIds: [],
    gallery: [{ id: "g1", caption: "Rhône advocacy forum, 2023" }],
  },
  "léa-dupont": {
    id: "léa-dupont",
    name: "Léa Dupont",
    birthYear: 1990,
    deathYear: null,
    birthplace: "Lyon, France",
    biography:
      "Léa Dupont is a documentary filmmaker whose first feature followed municipal archivists in Lyon. She records oral histories with elder relatives and stores them in a shared family media library.",
    avatarUrl: "",
    generation: 4,
    childIds: [],
    gallery: [
      { id: "g1", caption: "Film festival still" },
      { id: "g2", caption: "Oral history session" },
    ],
  },
};

const layoutRows: { id: string; row: number; col: number }[] = [
  { id: "henri-martin", row: 0, col: 0 },
  { id: "marie-dubois", row: 0, col: 1 },
  { id: "louis-bernard", row: 0, col: 3 },
  { id: "suzanne-moreau", row: 0, col: 4 },
  { id: "jean-martin", row: 1, col: 0.5 },
  { id: "hélène-bernard", row: 1, col: 1.5 },
  { id: "claire-martin", row: 1, col: 2.5 },
  { id: "pierre-bernard", row: 1, col: 4 },
  { id: "andré-martin", row: 2, col: 0.5 },
  { id: "marguerite-laurent", row: 2, col: 1.5 },
  { id: "simone-martin", row: 2, col: 2.5 },
  { id: "philippe-martin", row: 3, col: 0 },
  { id: "isabelle-fontaine", row: 3, col: 1 },
  { id: "élise-martin", row: 3, col: 2 },
  { id: "camille-martin", row: 3, col: 3 },
  { id: "thomas-renard", row: 3, col: 4.5 },
  { id: "lucas-martin", row: 4, col: 0 },
  { id: "sophie-martin", row: 4, col: 1 },
  { id: "léa-dupont", row: 4, col: 2.5 },
];

function toPosition(col: number, row: number) {
  return {
    x: col * (NODE_WIDTH + H_GAP),
    y: row * (NODE_HEIGHT + V_GAP),
  };
}

export function buildInitialNodes(): Node<FamilyMemberNodeData>[] {
  return layoutRows.map(({ id, row, col }) => {
    const profile = profiles[id];
    return {
      id,
      type: "familyMember",
      position: toPosition(col, row),
      data: {
        name: profile.name,
        birthYear: profile.birthYear,
        deathYear: profile.deathYear,
        generation: profile.generation,
      },
    };
  });
}

export const initialEdges: Edge[] = [
  { id: "e-henri-marie", source: "henri-martin", target: "marie-dubois", type: "smoothstep" },
  { id: "e-louis-suzanne", source: "louis-bernard", target: "suzanne-moreau", type: "smoothstep" },
  { id: "e-henri-jean", source: "henri-martin", target: "jean-martin", type: "smoothstep" },
  { id: "e-marie-jean", source: "marie-dubois", target: "jean-martin", type: "smoothstep" },
  { id: "e-henri-claire", source: "henri-martin", target: "claire-martin", type: "smoothstep" },
  { id: "e-louis-pierre", source: "louis-bernard", target: "pierre-bernard", type: "smoothstep" },
  { id: "e-jean-helene", source: "jean-martin", target: "hélène-bernard", type: "smoothstep" },
  { id: "e-pierre-helene", source: "pierre-bernard", target: "hélène-bernard", type: "smoothstep" },
  { id: "e-jean-andre", source: "jean-martin", target: "andré-martin", type: "smoothstep" },
  { id: "e-helene-andre", source: "hélène-bernard", target: "andré-martin", type: "smoothstep" },
  { id: "e-helene-simone", source: "hélène-bernard", target: "simone-martin", type: "smoothstep" },
  { id: "e-andre-marguerite", source: "andré-martin", target: "marguerite-laurent", type: "smoothstep" },
  { id: "e-andre-philippe", source: "andré-martin", target: "philippe-martin", type: "smoothstep" },
  { id: "e-marguerite-philippe", source: "marguerite-laurent", target: "philippe-martin", type: "smoothstep" },
  { id: "e-andre-elise", source: "andré-martin", target: "élise-martin", type: "smoothstep" },
  { id: "e-andre-camille", source: "andré-martin", target: "camille-martin", type: "smoothstep" },
  { id: "e-philippe-isabelle", source: "philippe-martin", target: "isabelle-fontaine", type: "smoothstep" },
  { id: "e-philippe-lucas", source: "philippe-martin", target: "lucas-martin", type: "smoothstep" },
  { id: "e-isabelle-lucas", source: "isabelle-fontaine", target: "lucas-martin", type: "smoothstep" },
  { id: "e-philippe-sophie", source: "philippe-martin", target: "sophie-martin", type: "smoothstep" },
  { id: "e-isabelle-sophie", source: "isabelle-fontaine", target: "sophie-martin", type: "smoothstep" },
  { id: "e-elise-lea", source: "élise-martin", target: "léa-dupont", type: "smoothstep" },
  { id: "e-simone-thomas", source: "simone-martin", target: "thomas-renard", type: "smoothstep" },
];

export const searchIndex = Object.values(profiles).map((p) => ({
  id: p.id,
  name: p.name,
  birthYear: p.birthYear,
  deathYear: p.deathYear,
  generation: p.generation,
}));

export const maxGeneration = Math.max(...Object.values(profiles).map((p) => p.generation));
