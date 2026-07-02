import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import fs from "fs";

const app = express();
app.use(express.json());

const SHARED_SONGS_FILE = path.join(process.cwd(), "shared_songs.json");
let sharedSongs: any[] = [];
try {
  if (fs.existsSync(SHARED_SONGS_FILE)) {
    const data = fs.readFileSync(SHARED_SONGS_FILE, "utf8");
    sharedSongs = JSON.parse(data);
  }
} catch (error) {
  console.error("Failed to load shared songs:", error);
}

function saveSharedSongs() {
  try {
    fs.writeFileSync(SHARED_SONGS_FILE, JSON.stringify(sharedSongs, null, 2), "utf8");
  } catch (error) {
    console.error("Failed to save shared songs to disk:", error);
  }
}

const registeredDevices = new Set<string>();

app.use((req, res, next) => {
  const userAgent = (req.headers["user-agent"] || "").toLowerCase();
  
  if (!userAgent || 
      userAgent.includes("curl") || 
      userAgent.includes("wget") || 
      userAgent.includes("python") || 
      userAgent.includes("postman") || 
      userAgent.includes("httpclient") || 
      userAgent.includes("libwww-perl") || 
      userAgent.includes("lwp") || 
      userAgent.includes("pycurl") ||
      userAgent.includes("scrapy") ||
      userAgent.includes("aria2")) {
    return res.status(403).send("fuck u");
  }

  const deviceId = req.headers["x-device-id"] as string;
  if (deviceId && !registeredDevices.has(deviceId)) {
    registeredDevices.add(deviceId);
  }

  next();
});

const DUMMY_AUDIO = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';

const db = {
  songs: [
    { id: '1', title: 'Rainy City Night', model: 'Melody', genre: 'Pop', duration: '3:24', audioUrl: DUMMY_AUDIO },
    { id: '2', title: '3AM Thoughts', model: 'Harmony', genre: 'R&B', duration: '4:01', audioUrl: DUMMY_AUDIO },
    { id: '3', title: 'Concrete Jungle', model: 'Rhythm', genre: 'Hip-Hop', duration: '2:58', audioUrl: DUMMY_AUDIO },
    { id: '4', title: 'Golden Hour', model: 'Melody', genre: 'Acoustic', duration: '3:45', audioUrl: DUMMY_AUDIO },
    { id: '5', title: 'Lost Signal', model: 'Rhythm', genre: 'Electronic', duration: '5:12', audioUrl: DUMMY_AUDIO },
    { id: '6', title: 'Café Roma', model: 'Harmony', genre: 'Jazz', duration: '3:33', audioUrl: DUMMY_AUDIO },
    { id: '7', title: 'Neon Dreams', model: 'Melody', genre: 'Pop', duration: '3:10', audioUrl: DUMMY_AUDIO },
    { id: '8', title: 'Midnight Drive', model: 'Rhythm', genre: 'Electronic', duration: '4:20', audioUrl: DUMMY_AUDIO },
    { id: '9', title: 'Desert Storm', model: 'Harmony', genre: 'Rock', duration: '3:50', audioUrl: DUMMY_AUDIO },
    { id: '10', title: 'Electric Soul', model: 'Rhythm', genre: 'R&B', duration: '3:15', audioUrl: DUMMY_AUDIO },
    { id: '11', title: 'Ocean Eyes', model: 'Melody', genre: 'Pop', duration: '2:45', audioUrl: DUMMY_AUDIO },
    { id: '12', title: 'Velvet Sky', model: 'Harmony', genre: 'Jazz', duration: '4:10', audioUrl: DUMMY_AUDIO },
  ],
  lyrics: {
    '1': [
      { time: 0, line: 'A rainy night in a city that forgot my name' },
      { time: 7, line: 'Neon signs bleeding on the asphalt lane' },
      { time: 14, line: 'I walk these streets with echoes at my side' },
      { time: 21, line: 'Chasing shadows where the lost ones like to hide' },
      { time: 30, line: 'But I keep moving, keep the rhythm in my chest' },
      { time: 37, line: 'Every broken beat — a test I gave my best' },
      { time: 44, line: 'Rainy city night, you hold the things I left' },
      { time: 51, line: 'Rainy city night, you hold what I regret' },
    ],
    'default': [
      { time: 0, line: 'Just a placeholder song' },
      { time: 5, line: 'Testing the API connection' },
      { time: 10, line: 'Music flows through the wires' },
      { time: 15, line: 'AI creating fire' },
      { time: 20, line: 'Vercel hosting our dreams' },
      { time: 25, line: 'Or so it seems' }
    ]
  }
};

app.post('/api/enhance', async (req, res) => {
  try {
    const { prompt } = req.body;
    const systemPrompt = "U are kira you are a song prompt maker you enhance user prompt and send prompt only any message they send take is a s prompt and enhance it to exactly ,don't put Astrid in reply of even  tags like songs prompt ,you are a toll for enhance that is what they want  like with good brain ";
    const encodedQuestion = encodeURIComponent(prompt);
    const encodedSystemPrompt = encodeURIComponent(systemPrompt);
    const aiRes = await fetch(`https://omegatech-api.dixonomega.tech/api/ai/gpt?question=${encodedQuestion}&prompt=${encodedSystemPrompt}`);
    const data = await aiRes.json();
    res.json(data);
  } catch (error: any) {
    res.json({ success: false, message: error.message });
  }
});

app.post('/api/generate', async (req, res) => {
  try {
    const { prompt, model, genre, username, version, title, lyrics, mood, tempo, vocal } = req.body;
    
    if (version === 'v2') {
      let cleanVocal = vocal || '';
      if (cleanVocal.endsWith(' Vocal')) {
        cleanVocal = cleanVocal.replace(' Vocal', '');
      }
      let cleanTempo = tempo || '';
      if (cleanTempo === 'Mid-tempo') {
        cleanTempo = 'Medium';
      }

      let url = `https://omegatech-api.dixonomega.tech/api/ai/Remusic-ai?action=generate` +
        `&prompt=${encodeURIComponent(prompt || '')}` +
        `&genre=${encodeURIComponent(genre || '')}` +
        `&mood=${encodeURIComponent(mood || '')}` +
        `&vocal=${encodeURIComponent(cleanVocal)}` +
        `&tempo=${encodeURIComponent(cleanTempo)}`;
        
      if (title) {
        url += `&title=${encodeURIComponent(title)}`;
      }
      if (lyrics) {
        url += `&lyrics=${encodeURIComponent(lyrics)}`;
      }
        
      const genRes = await fetch(url);
      const text = await genRes.text();
      let genData;
      try {
        genData = JSON.parse(text);
      } catch (e) {
        throw new Error("External Remusic-ai API returned an invalid response. Please try again.");
      }
      res.json(genData);
    } else {
      const finalPrompt = `${prompt}. Style: ${genre || 'Mixed'}. Vibe: ${model || 'Harmony'}.`;
      const encodedPrompt = encodeURIComponent(finalPrompt);
      const genRes = await fetch(`https://omegatech-api.dixonomega.tech/api/ai/sonu3?action=generate&prompt=${encodedPrompt}`);
      
      const text = await genRes.text();
      let genData;
      try {
        genData = JSON.parse(text);
      } catch (e) {
        throw new Error("External API returned an invalid response (possibly overloaded). Please try again.");
      }
      res.json(genData);
    }
  } catch (error: any) {
    res.json({ success: false, message: error.message });
  }
});

app.get('/api/result', async (req, res) => {
  try {
    const { prompt, taskId } = req.query;
    const encodedPrompt = encodeURIComponent(prompt as string);
    const pollRes = await fetch(`https://omegatech-api.dixonomega.tech/api/ai/sonu3?action=result&prompt=${encodedPrompt}&taskId=${taskId}`);
    
    const text = await pollRes.text();
    let pollData;
    try {
      pollData = JSON.parse(text);
    } catch (e) {
      throw new Error("External API returned an invalid response (possibly overloaded). Please try again.");
    }
    
    res.json(pollData);
  } catch (error: any) {
    res.json({ success: false, message: error.message });
  }
});

app.get('/api/lyrics/:id', (req, res) => {
  const id = req.params.id;
  const songLyrics = db.lyrics[id as keyof typeof db.lyrics] || db.lyrics['default'];
  res.json(songLyrics);
});

app.get('/api/explore', (req, res) => {
  res.json([...sharedSongs, ...db.songs]);
});

app.post('/api/register-song', (req, res) => {
  try {
    const { song } = req.body;
    if (song && song.id) {
      if (!sharedSongs.some(s => s.id === song.id)) {
        sharedSongs.unshift(song);
        saveSharedSongs();
      }
      res.json({ success: true, message: 'Song shared with community' });
    } else {
      res.status(400).json({ success: false, message: 'Invalid song object' });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/song/:id', (req, res) => {
  const id = req.params.id;
  const song = sharedSongs.find(s => s.id === id) || db.songs.find(s => s.id === id);
  if (song) {
    res.json({ success: true, song });
  } else {
    res.status(404).json({ success: false, message: 'Song not found' });
  }
});

app.post('/api/save', (req, res) => {
  res.json({ success: true, message: 'Song saved to library' });
});

// Configure Vite or Static Serve if NOT on Vercel
if (!process.env.VERCEL) {
  const PORT = 3000;
  if (process.env.NODE_ENV !== "production") {
    createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    }).then((vite) => {
      app.use(vite.middlewares);
      app.listen(PORT, "0.0.0.0", () => {
        console.log(`Server running on http://localhost:${PORT}`);
      });
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

export default app;
