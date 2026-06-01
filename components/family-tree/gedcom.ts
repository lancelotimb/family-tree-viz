import type {
  FamilyGraph,
  Individual,
  LifeEvent,
  MemberGender,
  Union,
} from "./types";

/**
 * Canonical family data, defined as a GEDCOM document. `INDI` records are
 * people and `FAM` records are marriage/union nodes (`HUSB`/`WIFE` are the
 * partners, `CHIL` the children). This is the single source of truth — the
 * parser below turns it into the {@link FamilyGraph} the app renders.
 *
 * Custom tags: `_PHOTO` holds an archival gallery caption. Biographies use the
 * standard `NOTE` tag.
 */
export const FAMILY_GEDCOM = `
0 HEAD
1 SOUR FamilyTreeViz
1 GEDC
2 VERS 5.5.1
1 CHAR UTF-8

0 @I1@ INDI
1 NAME Henri /Martin/
1 SEX M
1 BIRT
2 DATE 1862
2 PLAC Lyon, France
1 DEAT
2 DATE 1938
1 NOTE Henri Martin was a master clockmaker whose workshop on the Saône riverbank served three generations of Lyonnais families. He apprenticed under his uncle at fourteen and opened his own atelier at twenty-two. Known for precision and patience, he documented every repair in leather-bound journals that the family still keeps in an oak chest.
1 _PHOTO Workshop portrait, 1890
1 _PHOTO Wedding day, 1888
1 _PHOTO River Saône, 1912
1 FAMS @F1@

0 @I2@ INDI
1 NAME Marie /Dubois/
1 SEX F
1 BIRT
2 DATE 1865
2 PLAC Villefranche-sur-Saône, France
1 DEAT
2 DATE 1944
1 NOTE Marie Dubois Martin tended a walled herb garden behind the clockmaker's shop and taught village children to read on Sunday afternoons. She kept correspondence with cousins in Provence and preserved recipes that became the backbone of family holiday gatherings for decades.
1 _PHOTO Herb garden sketch
1 _PHOTO Sunday school, 1901
1 FAMS @F1@

0 @I3@ INDI
1 NAME Louis /Bernard/
1 SEX M
1 BIRT
2 DATE 1858
2 PLAC Dijon, France
1 DEAT
2 DATE 1931
1 NOTE Louis Bernard was a railway signal engineer who moved east with the expanding line toward Strasbourg. His meticulous diagrams of junction switches were admired by colleagues and later framed by his granddaughter Élise.
1 _PHOTO Signal tower, 1894
1 _PHOTO Engineer's notebook
1 FAMS @F2@

0 @I4@ INDI
1 NAME Suzanne /Moreau/
1 SEX F
1 BIRT
2 DATE 1860
2 PLAC Beaune, France
1 DEAT
2 DATE 1940
1 NOTE Suzanne Moreau Bernard sang in the parish choir and embroidered altar cloths that traveled to three churches before returning to the family home. She wrote vivid letters about vineyard seasons that her descendants still quote at reunions.
1 _PHOTO Choir photograph, 1908
1 FAMS @F2@

0 @I5@ INDI
1 NAME Jean /Martin/
1 SEX M
1 BIRT
2 DATE 1890
2 PLAC Lyon, France
1 DEAT
2 DATE 1965
1 NOTE Jean Martin inherited the clockmaker's bench and expanded into municipal tower clocks across the Rhône valley. He served as a reserve officer during the Great War and returned to rebuild the workshop roof with his own hands.
1 _PHOTO Tower clock restoration
1 _PHOTO Reserve uniform, 1916
1 FAMC @F1@
1 FAMS @F3@

0 @I6@ INDI
1 NAME Claire /Martin/
1 SEX F
1 BIRT
2 DATE 1893
2 PLAC Lyon, France
1 DEAT
2 DATE 1972
1 NOTE Claire Martin trained as a schoolmistress in Grenoble and taught literature in a girls' academy until retirement. She translated English poetry for her pupils and hosted a literary salon every Thursday in her apartment overlooking the park.
1 _PHOTO Academy portrait, 1920
1 FAMC @F1@

0 @I7@ INDI
1 NAME Pierre /Bernard/
1 SEX M
1 BIRT
2 DATE 1888
2 PLAC Dijon, France
1 DEAT
2 DATE 1959
1 NOTE Pierre Bernard followed his father onto the railways and rose to stationmaster at Mulhouse. He collected timetables from across Europe and could recite departure schedules from memory well into his seventies.
1 _PHOTO Stationmaster office, 1935
1 FAMC @F2@
1 FAMS @F4@

0 @I8@ INDI
1 NAME Hélène /Bernard/
1 SEX F
1 BIRT
2 DATE 1894
2 PLAC Mulhouse, France
1 DEAT
2 DATE 1978
1 NOTE Hélène Bernard Martin kept the household accounts with legendary exactness and volunteered at the town library cataloguing donations. She bridged the Martin and Bernard branches of the family and organized the first unified reunion in 1952.
1 _PHOTO Library volunteers, 1948
1 _PHOTO Family reunion, 1952
1 FAMC @F4@
1 FAMS @F3@

0 @I9@ INDI
1 NAME André /Martin/
1 SEX M
1 BIRT
2 DATE 1923
2 PLAC Lyon, France
1 DEAT
2 DATE 1998
1 NOTE André Martin studied architecture in Paris and designed modest public housing that prioritized light and courtyards. He spent summers sketching Provençal farmhouses and passed watercolors to his children as birthday gifts.
1 _PHOTO Housing project model, 1962
1 _PHOTO Watercolor collection
1 _PHOTO Paris studio, 1950
1 FAMC @F3@
1 FAMS @F5@

0 @I10@ INDI
1 NAME Simone /Martin/
1 SEX F
1 BIRT
2 DATE 1926
2 PLAC Lyon, France
1 DEAT
2 DATE 2011
1 NOTE Simone Martin became a pediatric nurse and later directed a clinic ward in Villeurbanne. Colleagues remembered her calm voice during night shifts and the knitted blankets she left for newborns.
1 _PHOTO Clinic dedication, 1975
1 FAMC @F3@
1 FAMS @F6@

0 @I11@ INDI
1 NAME Marguerite /Laurent/
1 SEX F
1 BIRT
2 DATE 1925
2 PLAC Avignon, France
1 DEAT
2 DATE 2003
1 NOTE Marguerite Laurent Martin was a ceramicist whose studio kiln fired tiles for churches and homes alike. She exhibited in Marseille and taught weekend workshops that drew students from across the south.
1 _PHOTO Kiln opening day, 1960
1 _PHOTO Exhibition poster, 1971
1 FAMS @F5@

0 @I12@ INDI
1 NAME Philippe /Martin/
1 SEX M
1 BIRT
2 DATE 1952
2 PLAC Lyon, France
1 NOTE Philippe Martin teaches history at a lycée and leads archival trips for students to municipal record offices. He digitized the family's nineteenth-century journals and maintains the shared genealogy spreadsheet used at reunions.
1 _PHOTO Archive visit, 2018
1 _PHOTO Lycée faculty photo
1 FAMC @F5@
1 FAMS @F7@

0 @I13@ INDI
1 NAME Élise /Martin/
1 SEX F
1 BIRT
2 DATE 1955
2 PLAC Lyon, France
1 NOTE Élise Martin is a violinist with the regional orchestra and coaches chamber ensembles on weekends. She restored her grandfather's signal diagrams and hung them in her practice room as a reminder of precision across disciplines.
1 _PHOTO Orchestra season program
1 FAMC @F5@
1 FAMS @F8@

0 @I14@ INDI
1 NAME Camille /Martin/
1 SEX F
1 BIRT
2 DATE 1958
2 PLAC Lyon, France
1 NOTE Camille Martin runs a small publishing imprint specializing in translated essays and family memoirs. She compiled the first printed anthology of Martin–Bernard letters in 2019.
1 _PHOTO Imprint colophon
1 _PHOTO Letter anthology cover
1 FAMC @F5@

0 @I15@ INDI
1 NAME Isabelle /Fontaine/
1 SEX F
1 BIRT
2 DATE 1954
2 PLAC Annecy, France
1 NOTE Isabelle Fontaine Martin is a landscape architect who redesigned the lakeside promenade in Annecy and consults on heritage garden restorations. She maps family trips around notable parks and cemeteries with equal enthusiasm.
1 _PHOTO Promenade dedication, 2009
1 FAMS @F7@

0 @I16@ INDI
1 NAME Thomas /Renard/
1 SEX M
1 BIRT
2 DATE 1960
2 PLAC Villeurbanne, France
1 NOTE Thomas Renard works in renewable energy project finance and visits his mother Simone every Sunday for lunch. He built the online photo archive that feeds this family tree visualizer.
1 _PHOTO Solar farm inauguration
1 FAMC @F6@
1 FAMS @F9@
1 FAMS @F10@

0 @I17@ INDI
1 NAME Lucas /Martin/
1 SEX M
1 BIRT
2 DATE 1985
2 PLAC Lyon, France
1 NOTE Lucas Martin is a software engineer in Berlin who contributed the interactive layout for this genealogy project. He visits Lyon twice a year and documents each reunion with panoramic photographs.
1 _PHOTO Berlin apartment, 2022
1 _PHOTO Reunion panorama, 2024
1 FAMC @F7@

0 @I18@ INDI
1 NAME Sophie /Martin/
1 SEX F
1 BIRT
2 DATE 1988
2 PLAC Lyon, France
1 NOTE Sophie Martin practices environmental law in Brussels and advocates for river basin protections along the Rhône. She inherited her grandmother Marguerite's eye for color and collects ceramic tiles from travels.
1 _PHOTO Rhône advocacy forum, 2023
1 FAMC @F7@

0 @I19@ INDI
1 NAME Léa /Dupont/
1 SEX F
1 BIRT
2 DATE 1990
2 PLAC Lyon, France
1 NOTE Léa Dupont is a documentary filmmaker whose first feature followed municipal archivists in Lyon. She records oral histories with elder relatives and stores them in a shared family media library.
1 _PHOTO Film festival still
1 _PHOTO Oral history session
1 FAMC @F8@

0 @I20@ INDI
1 NAME Nadia /Khoury/
1 SEX F
1 BIRT
2 DATE 1962
2 PLAC Marseille, France
1 NOTE Nadia Khoury is a marine biologist who met Thomas during a coastal restoration project. Though their marriage ended, she co-parents Olivier and still collaborates with the family on environmental causes.
1 _PHOTO Field station, 1990
1 FAMS @F9@

0 @I21@ INDI
1 NAME Rachel /Cohen/
1 SEX F
1 BIRT
2 DATE 1965
2 PLAC Strasbourg, France
1 NOTE Rachel Cohen is a jazz pianist and music teacher who married Thomas in 1998. She organises the family's summer concerts in the Lyon courtyard.
1 _PHOTO Courtyard concert, 2005
1 FAMS @F10@

0 @I22@ INDI
1 NAME Olivier /Renard/
1 SEX M
1 BIRT
2 DATE 1987
2 PLAC Lyon, France
1 NOTE Olivier Renard is a climate journalist based in Geneva. The elder of Thomas's children, he frequently interviews his aunt Sophie about river law.
1 _PHOTO Press badge, 2015
1 FAMC @F9@

0 @I23@ INDI
1 NAME Mira /Renard/
1 SEX F
1 BIRT
2 DATE 2000
2 PLAC Lyon, France
1 NOTE Mira Renard studies marine ecology and plays piano with her mother Rachel, staying close to her half-brother Olivier.
1 _PHOTO Conservatory recital, 2019
1 FAMC @F10@

0 @F1@ FAM
1 HUSB @I1@
1 WIFE @I2@
1 CHIL @I5@
1 CHIL @I6@
1 MARR
2 DATE 1888
2 PLAC Lyon, France

0 @F2@ FAM
1 HUSB @I3@
1 WIFE @I4@
1 CHIL @I7@
1 MARR
2 DATE 1885

0 @F3@ FAM
1 HUSB @I5@
1 WIFE @I8@
1 CHIL @I9@
1 CHIL @I10@
1 MARR
2 DATE 1920

0 @F4@ FAM
1 HUSB @I7@
1 CHIL @I8@

0 @F5@ FAM
1 HUSB @I9@
1 WIFE @I11@
1 CHIL @I12@
1 CHIL @I13@
1 CHIL @I14@
1 MARR
2 DATE 1950

0 @F6@ FAM
1 WIFE @I10@
1 CHIL @I16@

0 @F7@ FAM
1 HUSB @I12@
1 WIFE @I15@
1 CHIL @I17@
1 CHIL @I18@
1 MARR
2 DATE 1982

0 @F8@ FAM
1 WIFE @I13@
1 CHIL @I19@

0 @F9@ FAM
1 HUSB @I16@
1 WIFE @I20@
1 CHIL @I22@
1 MARR
2 DATE 1985
1 DIV
2 DATE 1994

0 @F10@ FAM
1 HUSB @I16@
1 WIFE @I21@
1 CHIL @I23@
1 MARR
2 DATE 1998

0 TRLR
`;

type GedcomNode = {
  level: number;
  xref?: string;
  tag: string;
  value?: string;
  children: GedcomNode[];
};

function tokenizeLine(raw: string): Omit<GedcomNode, "children"> | null {
  const line = raw.replace(/\r$/, "").trimEnd();
  if (!line.trim()) return null;

  const levelMatch = line.match(/^(\d+)\s+(.*)$/);
  if (!levelMatch) return null;

  const level = Number(levelMatch[1]);
  const rest = levelMatch[2];

  if (rest.startsWith("@")) {
    const m = rest.match(/^(@[^@]+@)\s+(\S+)(?:\s(.*))?$/);
    if (!m) return null;
    return { level, xref: stripPointer(m[1]), tag: m[2], value: m[3] };
  }

  const m = rest.match(/^(\S+)(?:\s(.*))?$/);
  if (!m) return null;
  return { level, tag: m[1], value: m[2] };
}

function stripPointer(value: string): string {
  return value.replace(/^@/, "").replace(/@$/, "");
}

/** Build the level-based record tree from raw GEDCOM lines. */
function parseRecords(text: string): GedcomNode[] {
  const roots: GedcomNode[] = [];
  const stack: GedcomNode[] = [];

  for (const rawLine of text.split("\n")) {
    const token = tokenizeLine(rawLine);
    if (!token) continue;

    const node: GedcomNode = { ...token, children: [] };

    while (stack.length > 0 && stack[stack.length - 1].level >= node.level) {
      stack.pop();
    }

    if (stack.length === 0) {
      roots.push(node);
    } else {
      stack[stack.length - 1].children.push(node);
    }
    stack.push(node);
  }

  return roots;
}

const child = (node: GedcomNode, tag: string) =>
  node.children.find((c) => c.tag === tag);

const childrenWith = (node: GedcomNode, tag: string) =>
  node.children.filter((c) => c.tag === tag);

function parseYear(node: GedcomNode | undefined): number | null {
  const date = child(node ?? ({ children: [] } as unknown as GedcomNode), "DATE");
  const value = date?.value ?? node?.value;
  if (!value) return null;
  const matches = value.match(/\d{4}/g);
  return matches ? Number(matches[matches.length - 1]) : null;
}

function parseEvent(node: GedcomNode | undefined): LifeEvent | null {
  if (!node) return null;
  return { year: parseYear(node), place: child(node, "PLAC")?.value };
}

function parseName(node: GedcomNode): string {
  const raw = child(node, "NAME")?.value ?? "Unknown";
  return raw.replace(/\//g, "").replace(/\s+/g, " ").trim();
}

function parseGender(node: GedcomNode): MemberGender {
  return child(node, "SEX")?.value?.toUpperCase() === "F" ? "female" : "male";
}

function parseIndividual(node: GedcomNode): Individual {
  const birthNode = child(node, "BIRT");
  const deathNode = child(node, "DEAT");

  return {
    id: node.xref!,
    name: parseName(node),
    gender: parseGender(node),
    birth: parseEvent(birthNode) ?? { year: null },
    death: deathNode ? (parseEvent(deathNode) ?? { year: null }) : null,
    biography: childrenWith(node, "NOTE")
      .map((n) => n.value ?? "")
      .join(" ")
      .trim(),
    avatarUrl: child(node, "_AVATAR")?.value ?? "",
    gallery: childrenWith(node, "_PHOTO").map((photo, index) => ({
      id: `${node.xref}-photo-${index}`,
      caption: photo.value ?? "",
    })),
    fams: childrenWith(node, "FAMS").map((c) => stripPointer(c.value ?? "")),
    famc: child(node, "FAMC")?.value
      ? stripPointer(child(node, "FAMC")!.value!)
      : null,
    generation: 0,
  };
}

function parseUnion(node: GedcomNode): Union {
  const partnerIds = [
    ...childrenWith(node, "HUSB"),
    ...childrenWith(node, "WIFE"),
  ].map((c) => stripPointer(c.value ?? ""));

  return {
    id: node.xref!,
    partnerIds,
    childIds: childrenWith(node, "CHIL").map((c) => stripPointer(c.value ?? "")),
    marriage: parseEvent(child(node, "MARR")),
    divorce: parseEvent(child(node, "DIV")),
    generation: 0,
  };
}

/** Parse a GEDCOM document into a {@link FamilyGraph} (generations unset). */
export function parseGedcom(text: string): FamilyGraph {
  const individuals: Record<string, Individual> = {};
  const unions: Record<string, Union> = {};

  for (const record of parseRecords(text)) {
    if (!record.xref) continue;
    if (record.tag === "INDI") {
      individuals[record.xref] = parseIndividual(record);
    } else if (record.tag === "FAM") {
      unions[record.xref] = parseUnion(record);
    }
  }

  return { individuals, unions };
}
