import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { createInitialHousehold, getCurrentSeason } from './src/data/initialData.ts';
import { Household, ShoppingItem, Recipe, DepartmentCategory } from './src/types.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'households.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// In-memory store
const households: Map<string, Household> = new Map();

// Load from disk if exists
try {
  if (fs.existsSync(DATA_FILE)) {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    for (const [code, hh] of Object.entries(parsed)) {
      households.set(code, hh as Household);
    }
    console.log(`Loaded ${households.size} households from disk.`);
  }
} catch (err) {
  console.error('Error loading households.json:', err);
}

// Seed default household if empty
if (households.size === 0) {
  const initial = createInitialHousehold('CASA01');
  households.set('CASA01', initial);
  saveToDisk();
}

function saveToDisk() {
  try {
    const obj: Record<string, Household> = {};
    for (const [code, hh] of households.entries()) {
      obj[code] = hh;
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(obj, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save to disk:', err);
  }
}

// SSE Connection Manager
const sseClients = new Map<string, Set<Response>>();

function registerSseClient(code: string, res: Response) {
  if (!sseClients.has(code)) {
    sseClients.set(code, new Set());
  }
  sseClients.get(code)!.add(res);
}

function removeSseClient(code: string, res: Response) {
  const set = sseClients.get(code);
  if (set) {
    set.delete(res);
    if (set.size === 0) {
      sseClients.delete(code);
    }
  }
}

function broadcastUpdate(code: string, household: Household) {
  const set = sseClients.get(code);
  if (!set || set.size === 0) return;
  const data = JSON.stringify({
    type: 'HOUSEHOLD_UPDATED',
    code,
    household,
    timestamp: new Date().toISOString(),
  });
  for (const client of set) {
    try {
      client.write(`event: update\ndata: ${data}\n\n`);
    } catch (err) {
      // client disconnected
      set.delete(client);
    }
  }
}

// Setup Gemini API client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

function generateUniqueCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return households.has(code) ? generateUniqueCode() : code;
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // === HOUSEHOLD ROUTES ===

  // Get household by code
  app.get('/api/households/:code', (req: Request, res: Response) => {
    const code = req.params.code.toUpperCase();
    const household = households.get(code);
    if (!household) {
      return res.status(404).json({ error: 'Spazio Condiviso non trovato' });
    }
    res.json(household);
  });

  // Create new household
  app.post('/api/households', (req: Request, res: Response) => {
    const { name, customCode, danieleName, partnerName } = req.body;
    const code = (customCode ? String(customCode).trim().toUpperCase() : generateUniqueCode()).slice(0, 10);
    
    if (households.has(code)) {
      return res.status(400).json({ error: 'Questo codice è già in uso. Scegline un altro.' });
    }

    const newHh = createInitialHousehold(code);
    if (name) newHh.name = name;
    if (danieleName && newHh.users) newHh.users.daniele.name = danieleName;
    if (partnerName && newHh.users) newHh.users.partner.name = partnerName;
    newHh.updatedAt = new Date().toISOString();

    households.set(code, newHh);
    saveToDisk();
    res.status(201).json(newHh);
  });

  // Update household state
  app.put('/api/households/:code', (req: Request, res: Response) => {
    const code = req.params.code.toUpperCase();
    const existing = households.get(code);
    if (!existing) {
      return res.status(404).json({ error: 'Spazio Condiviso non trovato' });
    }

    const updated: Household = {
      ...existing,
      ...req.body,
      code,
      updatedAt: new Date().toISOString(),
    };

    households.set(code, updated);
    saveToDisk();
    broadcastUpdate(code, updated);
    res.json(updated);
  });

  // Toggle shopping list item
  app.post('/api/households/:code/shopping/toggle', (req: Request, res: Response) => {
    const code = req.params.code.toUpperCase();
    const { itemId, isDone, checkedBy } = req.body;
    const hh = households.get(code);
    if (!hh) return res.status(404).json({ error: 'Non trovato' });

    hh.shoppingList = hh.shoppingList.map((item) => {
      if (item.id === itemId) {
        return {
          ...item,
          isDone: typeof isDone === 'boolean' ? isDone : !item.isDone,
          checkedBy: isDone ? (checkedBy || 'Partner') : undefined,
          checkedAt: isDone ? new Date().toISOString() : undefined,
        };
      }
      return item;
    });

    hh.updatedAt = new Date().toISOString();
    saveToDisk();
    broadcastUpdate(code, hh);
    res.json({ success: true, shoppingList: hh.shoppingList });
  });

  // Add item(s) to shopping list
  app.post('/api/households/:code/shopping/add', (req: Request, res: Response) => {
    const code = req.params.code.toUpperCase();
    const { items } = req.body; // array of items or single item
    const hh = households.get(code);
    if (!hh) return res.status(404).json({ error: 'Non trovato' });

    const newItems: ShoppingItem[] = Array.isArray(items) ? items : [items];
    const timestamp = new Date().toISOString();

    for (const it of newItems) {
      hh.shoppingList.unshift({
        id: it.id || `sp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: it.name,
        category: it.category || 'ortofrutta',
        assignee: it.assignee || 'together',
        dishName: it.dishName,
        dayKey: it.dayKey,
        isDone: false,
        createdAt: timestamp,
      });
    }

    hh.updatedAt = timestamp;
    saveToDisk();
    broadcastUpdate(code, hh);
    res.json({ success: true, shoppingList: hh.shoppingList });
  });

  // Delete shopping item
  app.delete('/api/households/:code/shopping/:itemId', (req: Request, res: Response) => {
    const code = req.params.code.toUpperCase();
    const { itemId } = req.params;
    const hh = households.get(code);
    if (!hh) return res.status(404).json({ error: 'Non trovato' });

    hh.shoppingList = hh.shoppingList.filter((it) => it.id !== itemId);
    hh.updatedAt = new Date().toISOString();
    saveToDisk();
    broadcastUpdate(code, hh);
    res.json({ success: true, shoppingList: hh.shoppingList });
  });

  // Clear completed shopping items
  app.post('/api/households/:code/shopping/clear-completed', (req: Request, res: Response) => {
    const code = req.params.code.toUpperCase();
    const hh = households.get(code);
    if (!hh) return res.status(404).json({ error: 'Non trovato' });

    hh.shoppingList = hh.shoppingList.filter((it) => !it.isDone);
    hh.updatedAt = new Date().toISOString();
    saveToDisk();
    broadcastUpdate(code, hh);
    res.json({ success: true, shoppingList: hh.shoppingList });
  });

  // Add / Edit Recipe
  app.post('/api/households/:code/recipes', (req: Request, res: Response) => {
    const code = req.params.code.toUpperCase();
    const recipe: Recipe = req.body;
    const hh = households.get(code);
    if (!hh) return res.status(404).json({ error: 'Non trovato' });

    const existingIndex = hh.recipes.findIndex((r) => r.id === recipe.id);
    if (existingIndex >= 0) {
      hh.recipes[existingIndex] = recipe;
    } else {
      hh.recipes.push(recipe);
    }

    hh.updatedAt = new Date().toISOString();
    saveToDisk();
    broadcastUpdate(code, hh);
    res.json({ success: true, recipes: hh.recipes });
  });

  // Real-time SSE endpoint
  app.get('/api/households/:code/events', (req: Request, res: Response) => {
    const code = req.params.code.toUpperCase();
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    registerSseClient(code, res);
    res.write(`event: connected\ndata: ${JSON.stringify({ code })}\n\n`);

    // Keepalive ping every 25s
    const pingInterval = setInterval(() => {
      try {
        res.write(': keepalive\n\n');
      } catch (err) {
        clearInterval(pingInterval);
      }
    }, 25000);

    req.on('close', () => {
      clearInterval(pingInterval);
      removeSseClient(code, res);
    });
  });

  // === AI ENDPOINTS (GEMINI FLASH) ===

  // 1. Seasonal Recipe Recommendations
  app.post('/api/ai/suggest-seasonal', async (req: Request, res: Response) => {
    try {
      const { season, recentDishes, preferences, mealType } = req.body;
      const currentSeason = season || getCurrentSeason();

      const recentDishesText = Array.isArray(recentDishes) && recentDishes.length > 0
        ? recentDishes.join(', ')
        : 'Nessun piatto recente registrato';

      const prompt = `Sei un maestro di cucina italiana contemporanea ed esperto di stagionalità per coppie.
Genera 3 proposte di ricette STAGIONALI per la stagione "${currentSeason.toUpperCase()}" (mese autunnale/corrente).
Contesto:
- Piatti già preparati negli ultimi 10-14 giorni (REGOLA ANTI-RIPETIZIONE: NON RIPETERE QUESTI PIATTI O VARIANTI IDENTICHE): ${recentDishesText}
- Preferenze utente / note: ${preferences || 'Nessuna preferenza particolare, gustoso e pratico'}
- Tipo pasto: ${mealType || 'Pranzo o Cena'}

Per ogni ricetta fornisci:
1. "name": Nome invitante del piatto in italiano (es. "Risotto alla Zucca Mantovana e Gorgonzola")
2. "description": 1-2 frasi chiare che descrivono il piatto e perché è perfetto per questo periodo
3. "season": "${currentSeason}"
4. "prepTime": tempo stimato (es. "25 min")
5. "category": uno tra "Primo", "Secondo", "Piatto Unico", "Contorno", "Lievitato"
6. "ingredients": array di ingredienti concettuali (SENZA grammature o unità pesanti; es. ["Zucca Mantovana", "Riso Carnaroli", "Gorgonzola dolce", "Salvia fresca", "Olio EVO"])
7. "whySeasonal": spiegazione di una riga sull'ingrediente di stagione protagonista (es. "La zucca è al culmine della dolcezza in autunno").`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            description: 'Lista di 3 ricette stagionali',
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                description: { type: Type.STRING },
                season: { type: Type.STRING },
                prepTime: { type: Type.STRING },
                category: { type: Type.STRING },
                ingredients: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                whySeasonal: { type: Type.STRING },
              },
              required: ['name', 'description', 'season', 'prepTime', 'category', 'ingredients', 'whySeasonal'],
            },
          },
        },
      });

      const text = response.text?.trim() || '[]';
      const parsed = JSON.parse(text);
      res.json({ success: true, recipes: parsed });
    } catch (err: any) {
      console.error('Error generating seasonal recipes with Gemini:', err);
      // Fallback recipes
      res.json({
        success: true,
        fallback: true,
        recipes: [
          {
            name: 'Vellutata di Zucca, Porri e Zenzero con Semi Tostati',
            description: 'Un primo piatto autunnale cremoso e avvolgente con note speziate di zenzero fresco.',
            season: 'autumn',
            prepTime: '30 min',
            category: 'Primo',
            ingredients: ['Zucca Mantovana', 'Porri', 'Zenzero fresco', 'Semi di zucca', 'Olio EVO', 'Crostini di pane'],
            whySeasonal: 'La zucca è l\'ingrediente regina dell\'autunno, nutriente e dolce.',
          },
          {
            name: 'Tagliatelle ai Funghi Misti e Timo Fresco',
            description: 'Pasta all\'uovo profumata ai funghi trifolati in padella con aglio dolce e timo.',
            season: 'autumn',
            prepTime: '20 min',
            category: 'Primo',
            ingredients: ['Tagliatelle all\'uovo', 'Funghi misti di bosco', 'Aglio', 'Timo fresco', 'Parmigiano Reggiano', 'Burro'],
            whySeasonal: 'I funghi di bosco raggiungono il massimo aroma con le prime piogge autunnali.',
          },
          {
            name: 'Trancio di Salmone con Crema di Cavolfiore e Noci',
            description: 'Secondo piatto leggero e proteico con crema vellutata e noci croccanti.',
            season: 'autumn',
            prepTime: '25 min',
            category: 'Secondo',
            ingredients: ['Trancio di salmone fresco', 'Cavolfiore bianco', 'Gherigli di noce', 'Limone', 'Olio EVO'],
            whySeasonal: 'Il cavolfiore novello e le noci fresche sono perfetti per la stagione autunnale.',
          },
        ],
      });
    }
  });

  // 2. Auto-categorize supermarket department for products
  app.post('/api/ai/categorize-product', async (req: Request, res: Response) => {
    try {
      const { productName } = req.body;
      if (!productName) {
        return res.json({ category: 'ortofrutta' });
      }

      const prompt = `Classifica il prodotto da supermercato "${productName}" in uno di questi 6 reparti:
- "ortofrutta" (frutta, verdura fresca, insalate, erbe aromatiche fresche, tuberi, agrumi)
- "macelleria_pescheria" (carne, pesce, crostacei, affettati freschi al banco, macinato)
- "latticini_freschi" (formaggi, latte, burro, yogurt, panna, mozzarella, uova)
- "dispensa_secco" (pasta, riso, farina, sughi pronti, passata, olio, aceto, spezie, biscotti, pane, legumi secchi o in scatola)
- "surgelati" (gelati, pizze surgelate, verdure surgelate, pesce surgelato)
- "cura_casa_altro" (detersivi, carta forno, sacchetti, saponi, spugne)

Rispondi SOLO con l'oggetto JSON.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              category: {
                type: Type.STRING,
                description: 'Uno tra: ortofrutta, macelleria_pescheria, latticini_freschi, dispensa_secco, surgelati, cura_casa_altro',
              },
            },
            required: ['category'],
          },
        },
      });

      const text = response.text?.trim() || '{}';
      const parsed = JSON.parse(text);
      res.json({ category: parsed.category || 'dispensa_secco' });
    } catch (err) {
      console.error('Categorize fallback:', err);
      // Fast rule-based fallback
      const p = (req.body.productName || '').toLowerCase();
      let cat: DepartmentCategory = 'dispensa_secco';
      if (/mela|pera|banana|zucca|pomodor|fungh|insalat|carot|limon|basilic|zucch|patat|cipoll|aglio|verdura|frutta|arancia|spinac/i.test(p)) {
        cat = 'ortofrutta';
      } else if (/carne|pollo|manzo|vitello|salmone|pesce|vongol|tonno|macinato|maiale|tacchino|orate|gamber/i.test(p)) {
        cat = 'macelleria_pescheria';
      } else if (/latte|formagg|mozzarella|burro|parmigiano|yogurt|uov|ricotta|stracchino|squacquerone|burrata/i.test(p)) {
        cat = 'latticini_freschi';
      } else if (/gelato|surgelat|bastoncini|piselli surgelati|pizza surgelata/i.test(p)) {
        cat = 'surgelati';
      } else if (/carta|detersivo|sapone|spugna|shampoo|scottex|sacchetti/i.test(p)) {
        cat = 'cura_casa_altro';
      }
      res.json({ category: cat });
    }
  });

  // Mount Vite middleware in development or serve static in production
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
