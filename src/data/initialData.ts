import { Household, Recipe, WeekMenu, Season, Person, MealGroup, MealSlot } from '../types.ts';

export const DEPARTMENT_LABELS: Record<string, { label: string; icon: string; order: number }> = {
  ortofrutta: { label: 'Ortofrutta', icon: '🥕', order: 1 },
  macelleria_pescheria: { label: 'Macelleria / Pescheria', icon: '🥩', order: 2 },
  latticini_freschi: { label: 'Latticini & Freschi', icon: '🧀', order: 3 },
  dispensa_secco: { label: 'Dispensa & Secco', icon: '🌾', order: 4 },
  surgelati: { label: 'Surgelati', icon: '❄️', order: 5 },
  cura_casa_altro: { label: 'Cura casa & Altro', icon: '🧼', order: 6 },
};

export const SEASON_LABELS: Record<Season, { label: string; icon: string }> = {
  autumn: { label: 'Autunno', icon: '🍂' },
  winter: { label: 'Inverno', icon: '❄️' },
  spring: { label: 'Primavera', icon: '🌸' },
  summer: { label: 'Estate', icon: '☀️' },
  all_year: { label: 'Tutto l\'anno', icon: '✨' },
};

export function getCurrentSeason(): Season {
  const month = new Date().getMonth(); // 0 = Jan, 9 = Oct
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'autumn';
  return 'winter';
}

export function getCurrentWeekId(d = new Date()): string {
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  const weekNumber = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
  return `${target.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
}

const MONTH_NAMES_IT = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
];

const MONTH_SHORT_IT = [
  'Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu',
  'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'
];

export function getMondayOfIsoWeek(weekId: string): Date {
  const [yearStr, weekStr] = weekId.split('-W');
  const year = parseInt(yearStr, 10);
  const week = parseInt(weekStr, 10);

  // Jan 4th is always in ISO week 1
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = (jan4.getDay() + 6) % 7; // 0 = Mon
  const mondayWeek1 = new Date(year, 0, 4 - dayOfWeek);
  
  const targetMonday = new Date(mondayWeek1.getTime() + (week - 1) * 7 * 86400000);
  targetMonday.setHours(0, 0, 0, 0);
  return targetMonday;
}

export function getWeekRangeDisplay(weekId: string): { label: string; shortLabel: string; isCurrent: boolean } {
  const monday = getMondayOfIsoWeek(weekId);
  const sunday = new Date(monday.getTime() + 6 * 86400000);
  const currentWeek = getCurrentWeekId();

  const startDay = monday.getDate();
  const endDay = sunday.getDate();
  const startMonth = monday.getMonth();
  const endMonth = sunday.getMonth();
  const startYear = monday.getFullYear();
  const endYear = sunday.getFullYear();

  let label = '';
  let shortLabel = '';

  if (startMonth === endMonth && startYear === endYear) {
    label = `${startDay} – ${endDay} ${MONTH_NAMES_IT[startMonth]} ${startYear}`;
    shortLabel = `${startDay}–${endDay} ${MONTH_SHORT_IT[startMonth]}`;
  } else if (startYear === endYear) {
    label = `${startDay} ${MONTH_SHORT_IT[startMonth]} – ${endDay} ${MONTH_NAMES_IT[endMonth]} ${startYear}`;
    shortLabel = `${startDay} ${MONTH_SHORT_IT[startMonth]} – ${endDay} ${MONTH_SHORT_IT[endMonth]}`;
  } else {
    label = `${startDay} ${MONTH_SHORT_IT[startMonth]} ${startYear} – ${endDay} ${MONTH_SHORT_IT[endMonth]} ${endYear}`;
    shortLabel = `${startDay} ${MONTH_SHORT_IT[startMonth]} – ${endDay} ${MONTH_SHORT_IT[endMonth]}`;
  }

  return {
    label,
    shortLabel,
    isCurrent: weekId === currentWeek,
  };
}

export function getWeekDayDetails(weekId: string): Record<string, { dateNum: number; monthName: string; formattedDate: string; isToday: boolean }> {
  const monday = getMondayOfIsoWeek(weekId);
  const keys = ['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom'];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const result: Record<string, { dateNum: number; monthName: string; formattedDate: string; isToday: boolean }> = {};

  keys.forEach((key, index) => {
    const d = new Date(monday.getTime() + index * 86400000);
    const isToday = d.getTime() === today.getTime();
    result[key] = {
      dateNum: d.getDate(),
      monthName: MONTH_NAMES_IT[d.getMonth()],
      formattedDate: `${d.getDate()} ${MONTH_NAMES_IT[d.getMonth()]}`,
      isToday,
    };
  });

  return result;
}

export function normalizeMealSlot(slot: MealSlot | undefined, members: Person[]): MealGroup[] {
  if (!slot) return [];

  // Default fallback if members list is empty
  const activeMembers = members && members.length > 0 ? members : [
    { id: 'user_default', name: 'Io', avatar: '👤' },
  ];
  const allMemberIds = activeMembers.map((m) => m.id);
  const memberIdSet = new Set(allMemberIds);

  // CASE 1 PERSON:
  // When there is only 1 person, ALL dishes belong to that single person.
  // There is NO together/separate distinction!
  if (activeMembers.length === 1) {
    const singlePersonId = activeMembers[0].id;
    let allDishes: any[] = [];
    if (slot.groups && slot.groups.length > 0) {
      allDishes = slot.groups.flatMap((g) => g.dishes);
    } else {
      allDishes = [
        ...(slot.togetherDishes || []),
        ...(slot.danieleDishes || []),
        ...(slot.partnerDishes || []),
      ];
    }
    return [
      {
        id: `grp_${singlePersonId}`,
        memberIds: [singlePersonId],
        dishes: allDishes,
        notes: slot.notes,
      },
    ];
  }

  // If slot already has valid groups:
  if (slot.groups && slot.groups.length > 0) {
    // Check if the groups still make sense with the current members
    // If all members in groups still belong to activeMembers
    const knownGroups = slot.groups.map((g) => ({
      ...g,
      memberIds: g.memberIds.filter((id) => memberIdSet.has(id)),
    })).filter((g) => g.memberIds.length > 0);

    // Check if any activeMember is unassigned
    const assignedIds = new Set(knownGroups.flatMap((g) => g.memberIds));
    const unassigned = activeMembers.filter((m) => !assignedIds.has(m.id));

    if (knownGroups.length > 0) {
      if (unassigned.length > 0) {
        // If it was a 'together' group, add unassigned to the together group
        if (knownGroups.length === 1) {
          knownGroups[0].memberIds.push(...unassigned.map((m) => m.id));
        } else {
          // Otherwise each unassigned person gets their own group
          unassigned.forEach((u) => {
            knownGroups.push({
              id: `grp_${u.id}_${Date.now()}`,
              memberIds: [u.id],
              dishes: [],
            });
          });
        }
      }
      return knownGroups;
    }
  }

  // CASE 2+ PERSONS (Fallback or legacy data):
  if (slot.type === 'together' || (!slot.type && (!slot.danieleDishes?.length && !slot.partnerDishes?.length))) {
    return [
      {
        id: 'grp_all',
        memberIds: [...allMemberIds],
        dishes: slot.togetherDishes ? [...slot.togetherDishes] : [],
        notes: slot.notes,
      },
    ];
  }

  // If marked separate:
  const danieleDishes = slot.danieleDishes ? [...slot.danieleDishes] : [];
  const partnerDishes = slot.partnerDishes ? [...slot.partnerDishes] : [];

  return activeMembers.map((m) => {
    const dishes = m.id === 'daniele' ? danieleDishes : (m.id === 'partner' ? partnerDishes : []);
    return {
      id: `grp_${m.id}`,
      memberIds: [m.id],
      dishes: [...dishes],
    };
  });
}


export const INITIAL_RECIPES: Recipe[] = [
  {
    id: 'rec_1',
    name: 'Risotto alla Zucca Mantovana e Rosmarino',
    season: 'autumn',
    category: 'Primo',
    prepTime: '30 min',
    ingredients: ['Riso Carnaroli', 'Zucca Mantovana', 'Cipolla dorata', 'Brodo vegetale', 'Parmigiano Reggiano', 'Rosmarino fresco', 'Burro'],
    notes: 'Mantecare a fuoco spento con burro freddo e parmigiano.',
    lastPreparedDate: '2026-10-02',
  },
  {
    id: 'rec_2',
    name: 'Vellutata di Funghi Porcini e Crostini',
    season: 'autumn',
    category: 'Primo',
    prepTime: '25 min',
    ingredients: ['Funghi porcini', 'Patate', 'Porro', 'Pane casereccio', 'Olio EVO', 'Prezzemolo'],
    notes: 'Ottima calda con crostini tostati con un filo d\'olio.',
    lastPreparedDate: '2026-10-14',
  },
  {
    id: 'rec_3',
    name: 'Filetto di Salmone al Forno con Patate',
    season: 'all_year',
    category: 'Secondo',
    prepTime: '30 min',
    ingredients: ['Filetto di salmone fresco', 'Patate', 'Rosmarino fresco', 'Limoni', 'Olio EVO', 'Aglio'],
    lastPreparedDate: '2026-10-08',
  },
  {
    id: 'rec_4',
    name: 'Pasta al Pesto Genovese e Pomodorini',
    season: 'all_year',
    category: 'Primo',
    prepTime: '15 min',
    ingredients: ['Pasta corta rigata', 'Pesto alla genovese', 'Pomodorini', 'Parmigiano Reggiano', 'Olio EVO'],
    lastPreparedDate: '2026-09-28',
  },
  {
    id: 'rec_5',
    name: 'Spaghetti alle Vongole Veraci',
    season: 'all_year',
    category: 'Primo',
    prepTime: '20 min',
    ingredients: ['Spaghetti trafilati al bronzo', 'Vongole veraci', 'Aglio', 'Prezzemolo', 'Vino bianco secco', 'Peperoncino', 'Olio EVO'],
    lastPreparedDate: '2026-09-15',
  },
  {
    id: 'rec_6',
    name: 'Piadina Romagnola con Squacquerone e Rucola',
    season: 'all_year',
    category: 'Piatto Unico',
    prepTime: '10 min',
    ingredients: ['Piadina romagnola', 'Squacquerone', 'Rucola', 'Prosciutto crudo'],
    lastPreparedDate: '2026-10-11',
  },
  {
    id: 'rec_7',
    name: 'Lasagne Tradizionali della Domenica',
    season: 'autumn',
    category: 'Primo',
    prepTime: '60 min',
    ingredients: ['Sfoglie per lasagne all\'uovo', 'Macinato misto per ragù', 'Passata di pomodoro', 'Besciamella', 'Parmigiano Reggiano', 'Carota', 'Sedano', 'Cipolla'],
    lastPreparedDate: '2026-09-20',
  },
  {
    id: 'rec_8',
    name: 'Gnocchi di Patate al Sugo Fresco e Basilico',
    season: 'all_year',
    category: 'Primo',
    prepTime: '20 min',
    ingredients: ['Gnocchi di patate', 'Passata di pomodoro', 'Mozzarella fior di latte', 'Basilico fresco', 'Parmigiano Reggiano', 'Olio EVO'],
    lastPreparedDate: '2026-10-06',
  },
  {
    id: 'rec_9',
    name: 'Zuppa di Farro, Ceci e Zucca',
    season: 'autumn',
    category: 'Piatto Unico',
    prepTime: '35 min',
    ingredients: ['Farro perlato', 'Ceci cotti', 'Zucca Mantovana', 'Carota', 'Rosmarino fresco', 'Olio EVO'],
    lastPreparedDate: '2026-09-18',
  },
  {
    id: 'rec_10',
    name: 'Pinsa Romana Margherita con Burrata',
    season: 'all_year',
    category: 'Piatto Unico',
    prepTime: '15 min',
    ingredients: ['Base pinsa romana precotta', 'Passata di pomodoro', 'Burrata fresca', 'Basilico fresco', 'Olio EVO'],
    lastPreparedDate: '2026-10-12',
  },
  {
    id: 'rec_11',
    name: 'Risotto agli Asparagi e Robiola',
    season: 'spring',
    category: 'Primo',
    prepTime: '30 min',
    ingredients: ['Riso Carnaroli', 'Asparagi freschi', 'Robiola fresca', 'Scalogno', 'Brodo vegetale', 'Parmigiano Reggiano'],
    lastPreparedDate: '2026-05-10',
  },
  {
    id: 'rec_12',
    name: 'Insalata di Riso Mediterranea',
    season: 'summer',
    category: 'Piatto Unico',
    prepTime: '20 min',
    ingredients: ['Riso per insalate', 'Tonno sott\'olio', 'Olive nere', 'Pomodorini', 'Mais dolce', 'Uova fresche', 'Olio EVO'],
    lastPreparedDate: '2026-07-22',
  },
  {
    id: 'rec_13',
    name: 'Pizzoccheri Valtellinesi con Verza e Patate',
    season: 'winter',
    category: 'Primo',
    prepTime: '40 min',
    ingredients: ['Pizzoccheri grano saraceno', 'Verza', 'Patate', 'Formaggio Casera o Fontina', 'Burro', 'Aglio', 'Salvia'],
    lastPreparedDate: '2026-01-14',
  },
  {
    id: 'rec_14',
    name: 'Pollo al Limone e Timo con Carote',
    season: 'all_year',
    category: 'Secondo',
    prepTime: '25 min',
    ingredients: ['Petto di pollo', 'Limoni', 'Timo fresco', 'Carote', 'Vino bianco secco', 'Olio EVO'],
    lastPreparedDate: '2026-10-09',
  },
  {
    id: 'rec_15',
    name: 'Tortino Rustico di Verdure e Ricotta',
    season: 'all_year',
    category: 'Piatto Unico',
    prepTime: '35 min',
    ingredients: ['Pasta sfoglia rotonda', 'Ricotta fresca', 'Uova fresche', 'Zucchine', 'Parmigiano Reggiano'],
    lastPreparedDate: '2026-10-04',
  }
];

export function createEmptyWeekMenu(weekId: string): WeekMenu {
  const daysMap: Record<string, string> = {
    lun: 'Lunedì',
    mar: 'Martedì',
    mer: 'Mercoledì',
    gio: 'Giovedì',
    ven: 'Venerdì',
    sab: 'Sabato',
    dom: 'Domenica',
  };

  const days: any = {};
  for (const [key, label] of Object.entries(daysMap)) {
    days[key] = {
      dayKey: key,
      dayLabel: label,
      pranzo: {
        type: 'together',
        togetherDishes: [],
        danieleDishes: [],
        partnerDishes: [],
      },
      cena: {
        type: 'together',
        togetherDishes: [],
        danieleDishes: [],
        partnerDishes: [],
      },
    };
  }

  return {
    weekId,
    days,
  };
}

export function createSampleWeekMenu(weekId: string): WeekMenu {
  const menu = createEmptyWeekMenu(weekId);

  // Lunedì: Pranzo insieme + Cena insieme
  menu.days.lun.pranzo = {
    type: 'together',
    togetherDishes: [{ id: 'd_lun_p', name: 'Pasta al Pesto Genovese e Pomodorini', recipeId: 'rec_4' }],
    danieleDishes: [],
    partnerDishes: [],
  };
  menu.days.lun.cena = {
    type: 'together',
    togetherDishes: [{ id: 'd_lun_c', name: 'Filetto di Salmone al Forno con Patate', recipeId: 'rec_3' }],
    danieleDishes: [],
    partnerDishes: [],
  };

  // Martedì: Pranzo separati (Daniele insalata di riso, Partner piadina) + Cena insieme (Risotto alla Zucca)
  menu.days.mar.pranzo = {
    type: 'separate',
    togetherDishes: [],
    danieleDishes: [{ id: 'd_mar_pd', name: 'Insalata di Riso ricca', notes: 'Preparata la sera prima' }],
    partnerDishes: [{ id: 'd_mar_pp', name: 'Piadina Romagnola con Squacquerone e Rucola', recipeId: 'rec_6' }],
  };
  menu.days.mar.cena = {
    type: 'together',
    togetherDishes: [{ id: 'd_mar_c', name: 'Risotto alla Zucca Mantovana e Rosmarino', recipeId: 'rec_1' }],
    danieleDishes: [],
    partnerDishes: [],
  };

  // Mercoledì: Pranzo separati + Cena insieme (Vellutata Funghi)
  menu.days.mer.pranzo = {
    type: 'separate',
    togetherDishes: [],
    danieleDishes: [{ id: 'd_mer_pd', name: 'Petto di Pollo al Limone con Carote', recipeId: 'rec_14' }],
    partnerDishes: [{ id: 'd_mer_pp', name: 'Zuppa di Farro, Ceci e Zucca', recipeId: 'rec_9' }],
  };
  menu.days.mer.cena = {
    type: 'together',
    togetherDishes: [{ id: 'd_mer_c', name: 'Vellutata di Funghi Porcini e Crostini', recipeId: 'rec_2' }],
    danieleDishes: [],
    partnerDishes: [],
  };

  // Giovedì: Pranzo insieme + Cena separati (Daniele carne, Partner vegetariano)
  menu.days.gio.pranzo = {
    type: 'together',
    togetherDishes: [{ id: 'd_gio_p', name: 'Gnocchi di Patate al Sugo Fresco e Basilico', recipeId: 'rec_8' }],
    danieleDishes: [],
    partnerDishes: [],
  };
  menu.days.gio.cena = {
    type: 'separate',
    togetherDishes: [],
    danieleDishes: [{ id: 'd_gio_cd', name: 'Bistecca di Manzo ai ferri con insalata' }],
    partnerDishes: [{ id: 'd_gio_cp', name: 'Tortino Rustico di Verdure e Ricotta', recipeId: 'rec_15' }],
  };

  // Venerdì: Pranzo separati + Cena insieme (Pinsa romana)
  menu.days.ven.pranzo = {
    type: 'separate',
    togetherDishes: [],
    danieleDishes: [{ id: 'd_ven_pd', name: 'Toast integrale con uovo e avocado' }],
    partnerDishes: [{ id: 'd_ven_pp', name: 'Insalata mista con feta e noci' }],
  };
  menu.days.ven.cena = {
    type: 'together',
    togetherDishes: [{ id: 'd_ven_c', name: 'Pinsa Romana Margherita con Burrata', recipeId: 'rec_10' }],
    danieleDishes: [],
    partnerDishes: [],
  };

  // Sabato: Spaghetti alle vongole + Tagliere
  menu.days.sab.pranzo = {
    type: 'together',
    togetherDishes: [{ id: 'd_sab_p', name: 'Spaghetti alle Vongole Veraci', recipeId: 'rec_5' }],
    danieleDishes: [],
    partnerDishes: [],
  };
  menu.days.sab.cena = {
    type: 'together',
    togetherDishes: [{ id: 'd_sab_c', name: 'Tagliere sfizioso di formaggi, olive e focaccia calda' }],
    danieleDishes: [],
    partnerDishes: [],
  };

  // Domenica: Lasagne + Minestrone leggero
  menu.days.dom.pranzo = {
    type: 'together',
    togetherDishes: [{ id: 'd_dom_p', name: 'Lasagne Tradizionali della Domenica', recipeId: 'rec_7' }],
    danieleDishes: [],
    partnerDishes: [],
  };
  menu.days.dom.cena = {
    type: 'together',
    togetherDishes: [{ id: 'd_dom_c', name: 'Minestrone leggero autunnale con crostoni' }],
    danieleDishes: [],
    partnerDishes: [],
  };

  return menu;
}

export function createInitialHousehold(code = 'CASA01'): Household {
  const currentWeek = getCurrentWeekId();
  const sampleWeek = createSampleWeekMenu(currentWeek);

  return {
    code,
    name: 'Casa Nostra',
    members: [
      { id: 'daniele', name: 'Daniele', avatar: '👨‍🍳' },
      { id: 'partner', name: 'Partner', avatar: '👩‍🌾' },
    ],
    users: {
      daniele: { name: 'Daniele', avatar: '👨‍🍳' },
      partner: { name: 'Partner', avatar: '👩‍🌾' },
    },
    houses: [
      { id: 'casa_daniele', name: 'Casa Daniele', icon: '🏠' },
      { id: 'casa_partner', name: 'Casa Partner', icon: '🏡' },
    ],
    activeWeekId: currentWeek,
    menus: {
      [currentWeek]: sampleWeek,
    },
    shoppingList: [
      {
        id: 'sp_1',
        name: 'Zucca Mantovana',
        category: 'ortofrutta',
        assignee: 'together',
        dishName: 'Risotto alla Zucca',
        dayKey: 'mar',
        isDone: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'sp_2',
        name: 'Funghi porcini',
        category: 'ortofrutta',
        assignee: 'together',
        dishName: 'Vellutata di Funghi',
        dayKey: 'mer',
        isDone: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'sp_3',
        name: 'Pomodorini ciliegino',
        category: 'ortofrutta',
        assignee: 'together',
        dishName: 'Pasta al Pesto',
        dayKey: 'lun',
        isDone: true,
        checkedBy: 'Daniele',
        checkedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
      {
        id: 'sp_4',
        name: 'Basilico fresco',
        category: 'ortofrutta',
        assignee: 'together',
        dishName: 'Gnocchi al Sugo',
        dayKey: 'gio',
        isDone: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'sp_5',
        name: 'Rucola fresca',
        category: 'ortofrutta',
        assignee: 'partner',
        dishName: 'Piadina Romagnola',
        dayKey: 'mar',
        isDone: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'sp_6',
        name: 'Limoni biologici',
        category: 'ortofrutta',
        assignee: 'together',
        dishName: 'Salmone al Forno',
        dayKey: 'lun',
        isDone: true,
        checkedBy: 'Partner',
        checkedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
      {
        id: 'sp_7',
        name: 'Filetto di salmone fresco',
        category: 'macelleria_pescheria',
        assignee: 'together',
        dishName: 'Salmone al Forno',
        dayKey: 'lun',
        isDone: true,
        checkedBy: 'Daniele',
        checkedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
      {
        id: 'sp_8',
        name: 'Bistecca di manzo',
        category: 'macelleria_pescheria',
        assignee: 'daniele',
        dishName: 'Bistecca ai ferri',
        dayKey: 'gio',
        isDone: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'sp_9',
        name: 'Vongole veraci',
        category: 'macelleria_pescheria',
        assignee: 'together',
        dishName: 'Spaghetti alle Vongole',
        dayKey: 'sab',
        isDone: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'sp_10',
        name: 'Macinato misto per ragù',
        category: 'macelleria_pescheria',
        assignee: 'together',
        dishName: 'Lasagne della Domenica',
        dayKey: 'dom',
        isDone: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'sp_11',
        name: 'Squacquerone DOP',
        category: 'latticini_freschi',
        assignee: 'partner',
        dishName: 'Piadina Romagnola',
        dayKey: 'mar',
        isDone: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'sp_12',
        name: 'Parmigiano Reggiano 24 mesi',
        category: 'latticini_freschi',
        assignee: 'together',
        dishName: 'Risotto e Pasta',
        dayKey: 'lun',
        isDone: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'sp_13',
        name: 'Burrata pugliese',
        category: 'latticini_freschi',
        assignee: 'together',
        dishName: 'Pinsa Romana',
        dayKey: 'ven',
        isDone: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'sp_14',
        name: 'Pasta corta rigata',
        category: 'dispensa_secco',
        assignee: 'together',
        dishName: 'Pasta al Pesto',
        dayKey: 'lun',
        isDone: true,
        checkedBy: 'Daniele',
        checkedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
      {
        id: 'sp_15',
        name: 'Riso Carnaroli',
        category: 'dispensa_secco',
        assignee: 'together',
        dishName: 'Risotto alla Zucca',
        dayKey: 'mar',
        isDone: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'sp_16',
        name: 'Olio EVO buono',
        category: 'dispensa_secco',
        assignee: 'together',
        dishName: 'Base cucina',
        isDone: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'sp_17',
        name: 'Farro perlato',
        category: 'dispensa_secco',
        assignee: 'partner',
        dishName: 'Zuppa di Farro',
        dayKey: 'mer',
        isDone: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'sp_18',
        name: 'Detersivo piatti ecologico',
        category: 'cura_casa_altro',
        assignee: 'together',
        dishName: 'Fuori lista',
        isDone: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'sp_19',
        name: 'Carta da forno',
        category: 'cura_casa_altro',
        assignee: 'together',
        dishName: 'Fuori lista',
        isDone: false,
        createdAt: new Date().toISOString(),
      },
    ],
    recipes: INITIAL_RECIPES,
    updatedAt: new Date().toISOString(),
  };
}

export function createEmptyHousehold(
  code: string,
  name: string,
  creatorName = 'Io',
  creatorAvatar = '👤',
  creatorUid?: string
): Household {
  const currentWeek = getCurrentWeekId();
  const emptyWeek: WeekMenu = {
    weekId: currentWeek,
    days: {
      lun: { dayKey: 'lun', dayLabel: 'Lunedì', pranzo: { type: 'together', groups: [] }, cena: { type: 'together', groups: [] } },
      mar: { dayKey: 'mar', dayLabel: 'Martedì', pranzo: { type: 'together', groups: [] }, cena: { type: 'together', groups: [] } },
      mer: { dayKey: 'mer', dayLabel: 'Mercoledì', pranzo: { type: 'together', groups: [] }, cena: { type: 'together', groups: [] } },
      gio: { dayKey: 'gio', dayLabel: 'Giovedì', pranzo: { type: 'together', groups: [] }, cena: { type: 'together', groups: [] } },
      ven: { dayKey: 'ven', dayLabel: 'Venerdì', pranzo: { type: 'together', groups: [] }, cena: { type: 'together', groups: [] } },
      sab: { dayKey: 'sab', dayLabel: 'Sabato', pranzo: { type: 'together', groups: [] }, cena: { type: 'together', groups: [] } },
      dom: { dayKey: 'dom', dayLabel: 'Domenica', pranzo: { type: 'together', groups: [] }, cena: { type: 'together', groups: [] } },
    },
  };

  const memberId = creatorUid || `mem_${Date.now()}`;
  return {
    code,
    name: name.trim() || 'La Mia Casa',
    ownerUid: creatorUid,
    memberUids: creatorUid ? [creatorUid] : [],
    members: [
      { id: memberId, name: creatorName, avatar: creatorAvatar }
    ],
    houses: [
      { id: 'casa_principale', name: 'Casa', icon: '🏠' }
    ],
    activeWeekId: currentWeek,
    menus: {
      [currentWeek]: emptyWeek,
    },
    shoppingList: [],
    recipes: INITIAL_RECIPES,
    updatedAt: new Date().toISOString(),
  };
}
