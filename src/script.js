
let currentSong = null;
let savedSongs = JSON.parse(localStorage.getItem('muzen_saved_songs') || '[]');
let isPlaying = false;
let lyricsOpen = false;
let currentModel = 'Melody';
let currentGenre = 'Pop';
let activeVersion = 'v1'; 
let activeV2Mode = 'simple'; 
let activeGenerations = []; 

const mainAudio = document.getElementById('mainAudio');


function getDeviceId() {
  let deviceId = localStorage.getItem('muzen_device_id');
  if (!deviceId) {
    const randomHex = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    deviceId = 'device_' + randomHex;
    localStorage.setItem('muzen_device_id', deviceId);
  }
  return deviceId;
}


async function fetch(url, options = {}) {
  if (typeof url === 'string' && (url.startsWith('/api/') || url.includes('/api/'))) {
    options.headers = options.headers || {};
    options.headers['X-Device-ID'] = getDeviceId();
  }
  return window.fetch(url, options);
}


function initUsernameSetup() {
  const savedUsername = localStorage.getItem('muzen_username');
  const uInput = document.getElementById('genUsername');
  if (uInput) {
    if (savedUsername) {
      uInput.value = savedUsername;
      uInput.readOnly = true;
      uInput.style.opacity = '0.7';
      uInput.style.cursor = 'not-allowed';
      uInput.title = 'Username is set! (One-time setup)';
    } else {
      uInput.addEventListener('change', () => {
        const val = uInput.value.trim();
        if (val && val !== 'your_name') {
          localStorage.setItem('muzen_username', val);
          uInput.readOnly = true;
          uInput.style.opacity = '0.7';
          uInput.style.cursor = 'not-allowed';
          uInput.title = 'Username is set! (One-time setup)';
        }
      });
    }
  }
}


const splashTl = gsap.timeline({ onComplete: revealApp });
splashTl
  .to('#splashBar', { width:'100%', duration:1.9, ease:'power2.inOut' })
  .to('.splash-icon', { opacity:1, scale:1, duration:0.5, ease:'back.out(1.7)' }, 0.1)
  .to('.splash-letter', { y:0, opacity:1, duration:0.55, stagger:0.07, ease:'back.out(1.7)' }, 0.35)
  .to('.splash-tagline', { opacity:1, y:0, duration:0.4, ease:'power3.out' }, 0.9);

function revealApp() {
  gsap.timeline()
    .to('#splash', { clipPath:'inset(0 0 100% 0)', duration:0.65, ease:'power3.inOut' })
    .set('#splash', { display:'none' })
    .from('#navbar', { y:-60, opacity:0, duration:0.55, ease:'power3.out' }, '-=0.15')
    .call(animateHero);
}

function animateHero() {
  gsap.timeline()
    .to('#heroBadge', { opacity:1, y:0, duration:0.45, ease:'power3.out' })
    .to('.word span', { y:0, duration:0.65, stagger:0.1, ease:'power3.out' }, '-=0.2')
    .to('#heroSub', { opacity:1, y:0, duration:0.45, ease:'power3.out' }, '-=0.3')
    .to('#generatorCard', { opacity:1, y:0, duration:0.6, ease:'back.out(1.3)' }, '-=0.25');
  startActivityFeed();
  renderSavedSongs();
  renderExploreFeed();
  initUsernameSetup();
  navigateToPage('home');

  
  const urlParams = new URLSearchParams(window.location.search);
  const songId = urlParams.get('songId');
  if (songId) {
    fetch(`/api/song/${songId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.song) {
          const s = data.song;
          setTimeout(() => {
            openPlayer(s.id, s.title, s.artist || 'Muzen AI', s.audioUrl || s.audio_url, s.thumbnail || s.image_url || s.image);
            navigateToPage('explore');
            triggerCompletionNotification(s);
          }, 800);
        }
      })
      .catch(err => console.error("Error fetching shared song:", err));
  }
}


window.addEventListener('scroll', () => {
  document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 50);
});


document.querySelectorAll('.model-card').forEach(card => {
  card.addEventListener('click', () => {
    document.querySelectorAll('.model-card').forEach(c => c.classList.remove('active'));
    card.classList.add('active');
    currentModel = card.getAttribute('data-model');
    gsap.fromTo(card, { scale:0.95 }, { scale:1, duration:0.32, ease:'back.out(1.7)' });
  });
});


document.querySelectorAll('.tag').forEach(tag => {
  tag.addEventListener('click', () => {
    document.querySelectorAll('.tag').forEach(t => t.classList.remove('active'));
    tag.classList.add('active');
    currentGenre = tag.innerText;
    gsap.fromTo(tag, { scale:0.88 }, { scale:1, duration:0.28, ease:'back.out(1.7)' });
  });
});


document.getElementById('genBtn').addEventListener('click', function(e) {
  const r = document.createElement('span');
  r.className = 'btn-ripple';
  const rect = this.getBoundingClientRect();
  r.style.cssText = `left:${e.clientX-rect.left-25}px;top:${e.clientY-rect.top-25}px;width:50px;height:50px;position:absolute;`;
  this.appendChild(r);
  setTimeout(() => r.remove(), 700);
});


window.randomPrompt = function() {
  const prompts = [
    "A romantic R&B track in the style of The Weeknd about driving through neon-lit city streets at 3 AM looking for a lost love.",
    "A tragic yet beautiful orchestral piece about the sinking of the Titanic, focusing on the freezing waters and the band playing until the end.",
    "An epic Hans Zimmer style soundtrack for a sci-fi movie about humanity discovering a new galaxy, with huge synths and booming percussion.",
    "Create a song that captures the essence of Spider-Man's journey in 'Spider-Man: Brand New Day'. Focus on emotional turmoil and his dual life.",
    "A high-energy classic rock song like Led Zeppelin, about a rebel who rides a motorcycle through the desert with a heavy guitar riff."
  ];
  const ta = document.getElementById('genTextarea');
  ta.value = prompts[Math.floor(Math.random() * prompts.length)];
  gsap.fromTo(ta, { scale: 0.98, opacity: 0.8 }, { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out' });
};


window.enhancePrompt = async function(btn) {
  const ta = document.getElementById('genTextarea');
  const prompt = ta.value;
  if (!prompt) {
    alert("Please enter a prompt to enhance first!");
    return;
  }
  
  const originalText = btn.innerText;
  btn.innerText = "✨ Enhancing...";
  btn.style.pointerEvents = "none";
  
  try {
    const res = await fetch('/api/enhance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });
    const data = await res.json();
    if (data.results) {
      ta.value = data.results;
      gsap.fromTo(ta, { backgroundColor: 'rgba(240,165,0,0.1)' }, { backgroundColor: 'rgba(255,255,255,0.025)', duration: 1 });
    } else {
      throw new Error("No enhanced text found");
    }
  } catch (err) {
    console.error(err);
    alert("Failed to enhance prompt");
  } finally {
    btn.innerText = originalText;
    btn.style.pointerEvents = "auto";
  }
};


window.switchVersion = function(v) {
  activeVersion = v;
  const tabV1 = document.getElementById('v-tab-v1');
  const tabV2 = document.getElementById('v-tab-v2');
  const v1Fields = document.getElementById('v1OnlyFields');
  const v2Fields = document.getElementById('v2OnlyFields');
  const v2ModeContainer = document.getElementById('v2ModeContainer');
  const v2ManualFields = document.getElementById('v2ManualFields');
  const label = document.getElementById('promptBoxLabel');
  
  if (v === 'v1') {
    tabV1.classList.add('active');
    tabV2.classList.remove('active');
    v1Fields.style.display = 'block';
    v2Fields.style.display = 'none';
    v2ModeContainer.style.display = 'none';
    v2ManualFields.style.display = 'none';
    label.textContent = "Describe your song";
  } else {
    tabV1.classList.remove('active');
    tabV2.classList.add('active');
    v1Fields.style.display = 'none';
    v2Fields.style.display = 'block';
    v2ModeContainer.style.display = 'flex';
    if (activeV2Mode === 'custom') {
      v2ManualFields.style.display = 'block';
      label.textContent = "Song style description or prompt";
    } else {
      v2ManualFields.style.display = 'none';
      label.textContent = "Describe your song";
    }
  }
};

window.switchV2Mode = function(mode) {
  activeV2Mode = mode;
  const tabSimple = document.getElementById('m-tab-simple');
  const tabCustom = document.getElementById('m-tab-custom');
  const v2ManualFields = document.getElementById('v2ManualFields');
  const label = document.getElementById('promptBoxLabel');
  
  if (mode === 'simple') {
    tabSimple.classList.add('active');
    tabCustom.classList.remove('active');
    v2ManualFields.style.display = 'none';
    label.textContent = "Describe your song";
  } else {
    tabSimple.classList.remove('active');
    tabCustom.classList.add('active');
    v2ManualFields.style.display = 'block';
    label.textContent = "Song style description or prompt";
  }
};


window.handleGenerate = async function(btn) {
  const prompt = document.getElementById('genTextarea').value;
  const uInput = document.getElementById('genUsername');
  const rawUsername = uInput ? uInput.value.trim() : '';
  const username = rawUsername || 'your_name';
  
  if (rawUsername && rawUsername !== 'your_name') {
    localStorage.setItem('muzen_username', rawUsername);
    if (uInput) {
      uInput.readOnly = true;
      uInput.style.opacity = '0.7';
      uInput.style.cursor = 'not-allowed';
      uInput.title = 'Username is set! (One-time setup)';
    }
  }

  const customTitle = (activeVersion === 'v2' && activeV2Mode === 'custom') ? document.getElementById('v2Title').value : '';
  const customLyrics = (activeVersion === 'v2' && activeV2Mode === 'custom') ? document.getElementById('v2Lyrics').value : '';

  if (!prompt) {
    alert("Please describe your song first!");
    return;
  }

  const version = activeVersion;
  let genre = currentGenre;
  let mood = '';
  let vocal = '';
  let tempo = '';
  
  if (version === 'v2') {
    genre = document.getElementById('v2Genre').value;
    mood = document.getElementById('v2Mood').value;
    vocal = document.querySelector('input[name="v2Vocal"]:checked')?.value || 'Female Vocal';
    tempo = document.querySelector('input[name="v2Tempo"]:checked')?.value || 'Mid-tempo';
  }

  
  const taskLocalId = 'task_' + Date.now();
  
  const newTask = {
    id: taskLocalId,
    prompt: prompt,
    version: version,
    genre: genre,
    mood: mood,
    vocal: vocal,
    tempo: tempo,
    title: customTitle || (version === 'v2' ? 'V2 Sonic Dream' : 'V1 Catchy Loop'),
    progress: 5,
    status: 'generating'
  };

  activeGenerations.push(newTask);
  renderGenerationsQueue();

  
  let progress = 5;
  const progressInterval = setInterval(() => {
    const t = activeGenerations.find(item => item.id === taskLocalId);
    if (t && t.status === 'generating') {
      if (progress < 95) {
        progress += Math.floor(Math.random() * 5) + 2;
        t.progress = Math.min(progress, 95);
        updateQueueProgressUI(taskLocalId, t.progress);
      }
    } else {
      clearInterval(progressInterval);
    }
  }, 1800);

  
  (async () => {
    try {
      const payload = {
        prompt,
        version,
        model: version === 'v2' ? 'v2' : currentModel,
        genre,
        mood,
        vocal,
        tempo,
        title: customTitle || '',
        lyrics: customLyrics || '',
        username
      };

      const genRes = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const genData = await genRes.json();
      
      let resultData = null;
      if (version === 'v2') {
        if (!genData.success || !genData.data || !genData.data.songs || genData.data.songs.length === 0) {
          throw new Error(genData.message || "Failed to start generation");
        }
        const songObj = genData.data.songs[0];
        resultData = {
          taskId: songObj.id,
          title: songObj.title,
          audio_url: songObj.audio,
          thumbnail: songObj.image,
          lyrics: songObj.lyrics,
          duration: songObj.duration
        };
      } else {
        if (!genData.success || !genData.taskId) {
          throw new Error(genData.message || "Failed to start generation");
        }
        const taskId = genData.taskId;
        const encodedPrompt = encodeURIComponent(prompt);
        
        
        while (true) {
          await new Promise(r => setTimeout(r, 6000));
          const t = activeGenerations.find(item => item.id === taskLocalId);
          if (!t) break; 

          const pollRes = await fetch(`/api/result?prompt=${encodedPrompt}&taskId=${taskId}&version=${version}`);
          const pollData = await pollRes.json();
          
          if (pollData.success === false) {
            throw new Error(pollData.message || "Polling failed");
          }
          
          if (pollData.status === 'done') {
            resultData = pollData;
            break;
          } else if (pollData.status === 'error' || pollData.status === 'failed') {
            throw new Error("Generation failed");
          }
        }
      }
      
      const t = activeGenerations.find(item => item.id === taskLocalId);
      if (t && resultData) {
        t.status = 'done';
        t.progress = 100;
        updateQueueProgressUI(taskLocalId, 100);

        const generatedSong = {
          id: resultData.taskId || String(Date.now() + Math.random()),
          title: resultData.title || customTitle || t.title,
          artist: username || 'Muzen AI',
          model: version === 'v2' ? 'Muzen-2.0' : 'Muzen-1.0',
          genre: genre,
          audioUrl: resultData.audio_url || resultData.url,
          thumbnail: resultData.thumbnail || resultData.image_url || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=300&auto=format&fit=crop',
          lyrics: resultData.lyrics || 'Enjoy the synthetic sound generated by Muzen!',
          duration: resultData.duration ? Math.floor(resultData.duration/60) + ':' + String(resultData.duration%60).padStart(2,'0') : '3:10'
        };

        
        if (!savedSongs.find(s => s.id === generatedSong.id)) {
          savedSongs.push(generatedSong);
          localStorage.setItem('muzen_saved_songs', JSON.stringify(savedSongs));
          renderSavedSongs();
        }

        
        fetch('/api/register-song', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ song: generatedSong })
        })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            renderExploreFeed();
          }
        })
        .catch(err => console.error("Error sharing song with server:", err));

        
        currentSong = generatedSong;
        showResult();

        
        triggerCompletionNotification(generatedSong);

        
        setTimeout(() => {
          activeGenerations = activeGenerations.filter(item => item.id !== taskLocalId);
          renderGenerationsQueue();
        }, 5000);
      }
      
    } catch (err) {
      console.error(err);
      const t = activeGenerations.find(item => item.id === taskLocalId);
      if (t) {
        t.status = 'failed';
        renderGenerationsQueue();
        setTimeout(() => {
          activeGenerations = activeGenerations.filter(item => item.id !== taskLocalId);
          renderGenerationsQueue();
        }, 8000);
      }
    } finally {
      clearInterval(progressInterval);
    }
  })();
};

function renderGenerationsQueue() {
  const container = document.getElementById('generationsQueue');
  const itemsContainer = document.getElementById('queueItems');
  
  if (activeGenerations.length === 0) {
    container.style.display = 'none';
    return;
  }
  
  container.style.display = 'block';
  itemsContainer.innerHTML = '';
  
  activeGenerations.forEach(t => {
    let statusBadge = `<span style="color:var(--gold); font-size:0.75rem;">⚡ Generating...</span>`;
    let bgStyle = '';
    if (t.status === 'done') {
      statusBadge = `<span style="color:#10b981; font-weight:600; font-size:0.75rem;">🎉 Ready!</span>`;
      bgStyle = 'style="border-color: rgba(16,185,129,0.3); background: rgba(16,185,129,0.03);"';
    } else if (t.status === 'failed') {
      statusBadge = `<span style="color:#ef4444; font-weight:600; font-size:0.75rem;">❌ Failed</span>`;
      bgStyle = 'style="border-color: rgba(239,68,68,0.3); background: rgba(239,68,68,0.03);"';
    }
    
    itemsContainer.innerHTML += `
      <div class="queue-item" id="q-${t.id}" ${bgStyle}>
        <div class="queue-item-info">
          <div class="queue-item-prompt">${t.title}</div>
          <div class="queue-item-meta">
            <span>Model: ${t.version === 'v2' ? 'v2' : 'v1'}</span> ·
            <span>Genre: ${t.genre}</span> ·
            ${statusBadge}
          </div>
        </div>
        <div class="queue-item-progress-bg">
          <div class="queue-item-progress-fill" id="pfill-${t.id}" style="width: ${t.progress}%"></div>
        </div>
      </div>
    `;
  });
}

function updateQueueProgressUI(taskId, val) {
  const fill = document.getElementById(`pfill-${taskId}`);
  if (fill) {
    fill.style.width = `${val}%`;
  }
}

function triggerCompletionNotification(song) {
  const notif = document.createElement('div');
  notif.className = 'activity-notif';
  notif.style.cssText = `position:fixed; top:2rem; left:50%; transform:translateX(-50%); z-index:2000; border: 1px solid rgba(16,185,129,0.4); background:rgba(12,20,16,0.95); width:340px; max-width:90%; pointer-events:auto; cursor:pointer; padding: 0.85rem 1rem; border-radius: 12px; display: flex; gap: 0.75rem; box-shadow: 0 10px 30px rgba(0,0,0,0.5);`;
  notif.innerHTML = `
    <div class="notif-icon" style="background:#10b981; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
      <svg viewBox="0 0 24 24" fill="currentColor" style="width:16px; height:16px; color:#fff;"><polygon points="5 3 19 12 5 21 5 3"/></svg>
    </div>
    <div class="notif-text" style="font-size:0.8rem; line-height: 1.4;">
      <strong style="color:#10b981;">Song Finished!</strong><br/>
      <span style="color:var(--text);">${song.title} is ready. Tap here to play!</span>
    </div>
  `;
  notif.onclick = () => {
    openPlayer(song.id, song.title, song.artist, song.audioUrl, song.thumbnail);
    notif.remove();
  };
  document.body.appendChild(notif);
  
  
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); 
    osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.15); 
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.45);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.45);
  } catch(e) {}

  gsap.fromTo(notif, { y:-100, opacity:0 }, { y:0, opacity:1, duration:0.4, ease:'back.out(1.4)' });
  setTimeout(() => {
    gsap.to(notif, { y:-100, opacity:0, duration:0.3, ease:'power2.in', onComplete: () => notif.remove() });
  }, 6500);
}

function showResult() {
  const card = document.getElementById('resultCard');
  if (!card) return;
  card.classList.add('show');
  
  document.getElementById('resultTitle').textContent = currentSong.title;
  document.getElementById('resultMeta').textContent = `${currentSong.model} · ${currentSong.genre} · ${currentSong.duration}`;
  
  const artDiv = document.getElementById('resultArt');
  if (currentSong.thumbnail) {
    artDiv.innerHTML = `<img src="${currentSong.thumbnail}" alt="Art"/>`;
  } else {
    artDiv.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`;
  }

  gsap.fromTo(card, { opacity:0, y:18, scale:0.97 }, { opacity:1, y:0, scale:1, duration:0.5, ease:'back.out(1.5)' });
}

window.saveSong = function() {
  if (!currentSong) return;
  if (!savedSongs.find(s => s.id === currentSong.id)) {
    savedSongs.push(currentSong);
    localStorage.setItem('muzen_saved_songs', JSON.stringify(savedSongs));
    renderSavedSongs();
    alert("Song saved to your library!");
  } else {
    alert("Song is already saved!");
  }
};

window.downloadSong = function() {
  if (currentSong && currentSong.audioUrl) {
    const a = document.createElement('a');
    a.href = currentSong.audioUrl;
    a.download = `${currentSong.title}.mp3`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
};

function renderSavedSongs() {
  const grid = document.getElementById('songsGrid');
  const count = document.getElementById('mySongsCount');
  if (!grid || !count) return;
  
  count.textContent = `${savedSongs.length} track${savedSongs.length === 1 ? '' : 's'}`;
  
  if (savedSongs.length === 0) {
    grid.innerHTML = '<p class="i18n-nosongs" style="color:var(--muted); font-size:0.9rem;">You haven\'t saved any songs yet.</p>';
    return;
  }
  
  grid.innerHTML = '';
  savedSongs.forEach((s, i) => {
    let artHtml = `<svg viewBox="0 0 48 48" fill="none" stroke="rgba(255,255,255,0.8)" stroke-width="1.8"><path d="M10 36a6 6 0 1 0 0-12 6 6 0 0 0 0 12z"/><path d="M16 30V10l24-5v20"/><path d="M34 30a6 6 0 1 0 0-12 6 6 0 0 0 0 12z"/></svg>`;
    if (s.thumbnail) artHtml = `<img src="${s.thumbnail}" alt="Art"/>`;
    
    grid.innerHTML += `
    <div class="song-card" onclick="openPlayer('${s.id}', '${s.title.replace(/'/g, "\\'")}', '${s.artist.replace(/'/g, "\\'")}', '${s.audioUrl}', '${s.thumbnail}')">
      <div class="song-thumb">
        <div class="song-thumb-art" style="background:linear-gradient(135deg,#6d28d9,#f0a500)">${artHtml}</div>
        <div class="song-play-overlay">
          <div class="play-circle"><svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg></div>
        </div>
        <div class="song-card-actions">
          <button class="card-action-btn" title="Download MP3" onclick="event.stopPropagation(); downloadSongById('${s.id}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          </button>
          <button class="card-action-btn" title="Share Track" onclick="event.stopPropagation(); shareSongById('${s.id}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
          </button>
        </div>
      </div>
      <div class="song-info">
        <div class="song-title">${s.title}</div>
        <div class="song-meta">
          <span class="song-badge">${s.model}</span>
          <span class="song-dur">${s.duration}</span>
        </div>
        <div class="song-artist" style="font-size:0.75rem; color:var(--muted); margin-top:0.25rem;">By ${s.artist}</div>
      </div>
    </div>`;
  });
}


const curatedTracks = [
  {
    id: "demo-1",
    title: "Sunset Dreamscape",
    artist: "Lofi Chills",
    model: "Muzen-2.0",
    genre: "Lo-fi",
    duration: "2:45",
    thumbnail: "https://images.unsplash.com/photo-1518173946687-a4c8a383392e?q=80&w=300&auto=format&fit=crop",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    lyrics: "[Instrumental Chill Lofi Beat]\n[Intro]\nGentle static crackle\nVinyl warmth spins\n\n[Melody]\nSoft piano keys float like leaves\nLate afternoon sun slipping through high branches\nNeon dusk in the quiet room"
  },
  {
    id: "demo-2",
    title: "Whispers of Joy",
    artist: "Omegatech / The honored one",
    model: "Muzen-2.0",
    genre: "Synthwave",
    duration: "3:12",
    thumbnail: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=300&auto=format&fit=crop",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    lyrics: "[Intro]\nElectric pulses start to build\nDigital heartbeats ready to race\n\n[Verse 1]\nWe walked into the grid of sound\nAnalog dreams all around\nNo limits on the highway of light\nFlying straight into the midnight night\n\n[Chorus]\nWhispers of joy, lighting our way\nNo more looking back at yesterday\nMade by the honoring hands of peace\nThis synthetic love will never cease"
  },
  {
    id: "demo-3",
    title: "Acoustic Warmth",
    artist: "Acoustic Echoes",
    model: "Muzen-1.0",
    genre: "Acoustic",
    duration: "2:58",
    thumbnail: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=300&auto=format&fit=crop",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    lyrics: "[Verse]\nPlucking strings on a wooden frame\nWhispering secrets to the fire's flame\nCold wind outside, window is wet\nBut here with you, the sun hasn't set\n\n[Chorus]\nAnd we sing along\nTo this humble song\nJust a simple vibe to get us through\nJust a little song for me and you"
  },
  {
    id: "demo-4",
    title: "Epic Odyssey",
    artist: "Cinematic Symphony",
    model: "Muzen-1.0",
    genre: "Cinematic",
    duration: "4:05",
    thumbnail: "https://images.unsplash.com/photo-1507838153414-b4b713384a76?q=80&w=300&auto=format&fit=crop",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
    lyrics: "[Orchestral Sweep]\n[Huge brass swell]\n\n[Soprano Solo]\nAve gloriosa, in excelsis\nTerra et sidera, canunt odysseam\n\n[Climax]\nTimpani rolls, massive strings rise\nWe touch the edge of infinity"
  }
];

async function renderExploreFeed() {
  const grid = document.getElementById('exploreGrid');
  if (!grid) return;
  
  try {
    const res = await fetch('/api/explore');
    const songs = await res.json();
    
    grid.innerHTML = '';
    songs.forEach(t => {
      let artHtml = `<svg viewBox="0 0 48 48" fill="none" stroke="rgba(255,255,255,0.8)" stroke-width="1.8"><path d="M10 36a6 6 0 1 0 0-12 6 6 0 0 0 0 12z"/><path d="M16 30V10l24-5v20"/><path d="M34 30a6 6 0 1 0 0-12 6 6 0 0 0 0 12z"/></svg>`;
      const thumbnailSrc = t.thumbnail || t.image_url || t.image;
      if (thumbnailSrc) artHtml = `<img src="${thumbnailSrc}" alt="Art"/>`;
      
      const artistName = t.artist || 'Muzen AI';
      const songAudio = t.audioUrl || t.audio_url || t.audio;
      
      grid.innerHTML += `
      <div class="song-card" onclick="openPlayer('${t.id}', '${t.title.replace(/'/g, "\\'")}', '${artistName.replace(/'/g, "\\'")}', '${songAudio}', '${thumbnailSrc || ''}')">
        <div class="song-thumb">
          <div class="song-thumb-art" style="background:linear-gradient(135deg,#e8357a,#ffd166)">${artHtml}</div>
          <div class="song-play-overlay">
            <div class="play-circle"><svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg></div>
          </div>
          <div class="song-card-actions">
            <button class="card-action-btn" title="Download MP3" onclick="event.stopPropagation(); downloadSongById('${t.id}')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            </button>
            <button class="card-action-btn" title="Share Track" onclick="event.stopPropagation(); shareSongById('${t.id}')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            </button>
          </div>
        </div>
        <div class="song-info">
          <div class="song-title">${t.title}</div>
          <div class="song-meta">
            <span class="song-badge">${t.model || 'Muzen-2.0'}</span>
            <span class="song-badge secondary">${t.genre || 'Pop'}</span>
            <span class="song-dur">${t.duration || '3:00'}</span>
          </div>
          <div class="song-artist" style="font-size:0.75rem; color:var(--muted); margin-top:0.25rem;">By ${artistName}</div>
        </div>
      </div>`;
    });
  } catch (err) {
    console.error("Failed to fetch explore feed, falling back", err);
    grid.innerHTML = '';
    curatedTracks.forEach(t => {
      let artHtml = `<svg viewBox="0 0 48 48" fill="none" stroke="rgba(255,255,255,0.8)" stroke-width="1.8"><path d="M10 36a6 6 0 1 0 0-12 6 6 0 0 0 0 12z"/><path d="M16 30V10l24-5v20"/><path d="M34 30a6 6 0 1 0 0-12 6 6 0 0 0 0 12z"/></svg>`;
      if (t.thumbnail) artHtml = `<img src="${t.thumbnail}" alt="Art"/>`;
      grid.innerHTML += `
      <div class="song-card" onclick="openPlayer('${t.id}', '${t.title.replace(/'/g, "\\'")}', '${t.artist.replace(/'/g, "\\'")}', '${t.audioUrl}', '${t.thumbnail}')">
        <div class="song-thumb">
          <div class="song-thumb-art" style="background:linear-gradient(135deg,#e8357a,#ffd166)">${artHtml}</div>
          <div class="song-play-overlay">
            <div class="play-circle"><svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg></div>
          </div>
          <div class="song-card-actions">
            <button class="card-action-btn" title="Download MP3" onclick="event.stopPropagation(); downloadSongById('${t.id}')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            </button>
            <button class="card-action-btn" title="Share Track" onclick="event.stopPropagation(); shareSongById('${t.id}')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            </button>
          </div>
        </div>
        <div class="song-info">
          <div class="song-title">${t.title}</div>
          <div class="song-meta">
            <span class="song-badge">${t.model}</span>
            <span class="song-badge secondary">${t.genre}</span>
            <span class="song-dur">${t.duration}</span>
          </div>
          <div class="song-artist" style="font-size:0.75rem; color:var(--muted); margin-top:0.25rem;">By ${t.artist}</div>
        </div>
      </div>`;
    });
  }
}


gsap.utils.toArray('.step').forEach((el, i) => {
  ScrollTrigger.create({ trigger:el, start:'top 86%',
    onEnter: () => gsap.to(el, { opacity:1, y:0, duration:0.5, delay:i*0.1, ease:'back.out(1.4)' })
  });
});


window.navigateToPage = function(pageId) {
  const pages = document.querySelectorAll('.app-page');
  pages.forEach(p => {
    p.classList.remove('active');
    p.style.display = 'none';
  });
  
  const targetPage = document.getElementById(`page-${pageId}`);
  if (targetPage) {
    targetPage.style.display = 'block';
    targetPage.classList.add('active');
    gsap.fromTo(targetPage, { opacity:0, y:12 }, { opacity:1, y:0, duration:0.45, ease:'power2.out' });
  }
  
  document.querySelectorAll('.nav-link-tab').forEach(l => l.classList.remove('active'));
  const navLink = document.getElementById(`nav-link-${pageId}`);
  if (navLink) navLink.classList.add('active');
  
  document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
  const sideLink = document.getElementById(`side-link-${pageId}`);
  if (sideLink) sideLink.classList.add('active');

  if (pageId === 'explore') {
    renderExploreFeed();
  } else if (pageId === 'library') {
    renderSavedSongs();
  }
};

window.openSidebar = function() {
  document.getElementById('sidebarMenu').classList.add('open');
  document.getElementById('sidebarOverlay').classList.add('show');
};

window.closeSidebar = function() {
  document.getElementById('sidebarMenu').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('show');
};

window.toggleFaq = function(id) {
  const item = document.getElementById(id);
  if (!item) return;
  const isOpen = item.classList.contains('open');
  document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
  if (!isOpen) {
    item.classList.add('open');
  }
};


window.openPlayer = function(id, title, artist, audioUrl, thumbnail) {
  const overlay = document.getElementById('player-overlay');
  const panel = document.getElementById('playerPanel');
  
  if (id) {
    currentSong = savedSongs.find(s => s.id === id) || curatedTracks.find(s => s.id === id) || {id, title, artist, audioUrl, thumbnail};
  }

  document.getElementById('playerTitle').textContent = currentSong.title;
  document.getElementById('playerArtist').textContent = currentSong.artist || 'Muzen AI';
  document.getElementById('lyricsSongTitle').textContent = currentSong.title;
  
  const discArts = [document.getElementById('discArt'), document.getElementById('discMini')];
  discArts.forEach(div => {
    if (currentSong.thumbnail) {
      div.innerHTML = `<img src="${currentSong.thumbnail}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;" />`;
    } else {
      div.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="width:28px; height:28px; color:rgba(255,255,255,0.7);"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`;
    }
  });

  mainAudio.src = currentSong.audioUrl;
  mainAudio.play();
  
  overlay.style.display = 'block';
  isPlaying = true;
  document.getElementById('discArt').classList.add('playing');
  document.getElementById('discMini').classList.add('playing');
  document.getElementById('pauseIcon').style.display = '';
  document.getElementById('playIcon').style.display = 'none';
  
  gsap.timeline()
    .fromTo('.player-backdrop', { opacity:0 }, { opacity:1, duration:0.3 })
    .fromTo(panel, { y:'100%' }, { y:0, duration:0.5, ease:'expo.out' }, '-=0.1');
    
  populateLyrics();
  updateMiniPlayer();
};

window.closePlayer = function() {
  gsap.timeline()
    .to('#playerPanel', { y:'100%', duration:0.4, ease:'power3.in' })
    .to('.player-backdrop', { opacity:0, duration:0.2 })
    .call(() => {
      document.getElementById('player-overlay').style.display = 'none';
      if (lyricsOpen) { lyricsOpen = false; gsap.set('#lyricsPanel', { x:'100%' }); }
    });
};

window.togglePlay = function() {
  isPlaying = !isPlaying;
  document.getElementById('discArt').classList.toggle('playing', isPlaying);
  document.getElementById('discMini').classList.toggle('playing', isPlaying);
  document.getElementById('playIcon').style.display = isPlaying ? 'none' : '';
  document.getElementById('pauseIcon').style.display = isPlaying ? '' : 'none';
  if(isPlaying) mainAudio.play(); else mainAudio.pause();
  updateMiniPlayer();
};

function updateMiniPlayer() {
  const mini = document.getElementById('miniPlayer');
  if (!currentSong) {
    mini.style.display = 'none';
    return;
  }
  mini.style.display = 'flex';
  document.getElementById('miniPlayerTitle').textContent = currentSong.title;
  document.getElementById('miniPlayerArtist').textContent = `${currentSong.artist || 'Muzen AI'} · ${currentSong.genre || 'Pop'}`;
  
  const thumb = document.getElementById('miniPlayerThumb');
  const defArt = document.getElementById('miniPlayerDefaultArt');
  if (currentSong.thumbnail) {
    thumb.src = currentSong.thumbnail;
    thumb.style.display = 'block';
    defArt.style.display = 'none';
  } else {
    thumb.style.display = 'none';
    defArt.style.display = 'block';
  }

  const playIcon = document.getElementById('miniPlayIcon');
  const pauseIcon = document.getElementById('miniPauseIcon');
  if (isPlaying) {
    playIcon.style.display = 'none';
    pauseIcon.style.display = 'block';
  } else {
    playIcon.style.display = 'block';
    pauseIcon.style.display = 'none';
  }
}

window.closeMiniPlayer = function() {
  const mini = document.getElementById('miniPlayer');
  mini.style.display = 'none';
  mainAudio.pause();
  isPlaying = false;
  document.getElementById('discArt').classList.remove('playing');
  document.getElementById('discMini').classList.remove('playing');
  document.getElementById('playIcon').style.display = '';
  document.getElementById('pauseIcon').style.display = 'none';
};

mainAudio.addEventListener('timeupdate', () => {
  if(!mainAudio.duration) return;
  const pct = (mainAudio.currentTime / mainAudio.duration) * 100;
  document.getElementById('progressFill').style.width = `${pct}%`;
  
  const formatTime = (time) => {
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    return `${m}:${s.toString().padStart(2,'0')}`;
  };
  
  document.getElementById('currentTime').textContent = formatTime(mainAudio.currentTime);
  document.getElementById('totalTime').textContent = formatTime(mainAudio.duration);
});

window.seekSong = function(e, bar) {
  if(!mainAudio.duration) return;
  const pct = (e.clientX - bar.getBoundingClientRect().left) / bar.offsetWidth;
  mainAudio.currentTime = pct * mainAudio.duration;
};

window.prevSong = function() { gsap.fromTo('#playerPanel',{x:-12},{x:0,duration:0.3,ease:'elastic.out(1,0.5)'}); };
window.nextSong = function() { gsap.fromTo('#playerPanel',{x:12},{x:0,duration:0.3,ease:'elastic.out(1,0.5)'}); };

window.toggleHeart = function(btn) {
  btn.classList.toggle('liked');
  gsap.fromTo(btn, {scale:0.7},{scale:1,duration:0.4,ease:'back.out(1.7)'});
  if (btn.classList.contains('liked')) {
    gsap.to(btn.querySelector('svg path'), {attr:{fill:'#e8357a'}, duration:0.2});
  } else {
    gsap.to(btn.querySelector('svg path'), {attr:{fill:'none'}, duration:0.2});
  }
};


function populateLyrics() {
  const scroll = document.getElementById('lyricsScroll');
  if (currentSong && currentSong.lyrics) {
    const lines = currentSong.lyrics.split('\n').filter(l => l.trim() !== '');
    scroll.innerHTML = lines.map((l,i) => `<div class="lyric-line" data-idx="${i}">${l}</div>`).join('');
  } else {
    scroll.innerHTML = '<div class="lyric-line">No lyrics available</div>';
  }
}

window.toggleLyrics = function() {
  const panel = document.getElementById('lyricsPanel');
  const discArea = document.getElementById('discArea');
  lyricsOpen = !lyricsOpen;
  if (lyricsOpen) {
    gsap.timeline()
      .to(discArea, {x:-20, opacity:0, duration:0.28, ease:'power3.in'})
      .fromTo(panel, {x:'100%'}, {x:0, duration:0.4, ease:'expo.out'}, '-=0.05');
  } else {
    gsap.timeline()
      .to(panel, {x:'100%', duration:0.32, ease:'power3.in'})
      .to(discArea, {x:0, opacity:1, duration:0.38, ease:'back.out(1.4)'}, '-=0.1');
  }
};


const activities = [
  {svg:`<svg viewBox="0 0 20 20" fill="none" stroke="rgba(255,255,255,0.8)" stroke-width="1.5"><path d="M4 16a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/><path d="M7 13V5l11-2v8"/><path d="M18 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/></svg>`, msg:'<strong>@kai_beats</strong> generated "Midnight Drive"'},
  {svg:`<svg viewBox="0 0 20 20" fill="none" stroke="rgba(255,255,255,0.8)" stroke-width="1.5"><circle cx="10" cy="10" r="8"/><circle cx="10" cy="10" r="4"/><circle cx="10" cy="10" r="1.5" fill="rgba(255,255,255,0.8)" stroke="none"/></svg>`, msg:'<strong>@luna_vibes</strong> created "Desert Storm"'},
  {svg:`<svg viewBox="0 0 20 20" fill="none" stroke="rgba(255,255,255,0.8)" stroke-width="1.5"><rect x="2" y="12" width="4" height="6" rx="1"/><rect x="8" y="8" width="4" height="10" rx="1"/><rect x="14" y="4" width="4" height="14" rx="1"/></svg>`, msg:'<strong>@neo_wave</strong> made "Electric Soul"'},
  {svg:`<svg viewBox="0 0 20 20" fill="none" stroke="rgba(255,255,255,0.8)" stroke-width="1.5"><path d="M10 2 L12.5 7.5 L18 8.2 L14 12 L15 17.5 L10 14.7 L5 17.5 L6 12 L2 8.2 L7.5 7.5 Z"/></svg>`, msg:'<strong>@star_lyric</strong> generated "Ocean Eyes"'},
];
let actIdx = 0;
function startActivityFeed() {
  const feed = document.getElementById('activityFeed');
  if (!feed) return;
  setInterval(() => {
    const a = activities[actIdx % activities.length];
    const notif = document.createElement('div');
    notif.className = 'activity-notif';
    notif.innerHTML = `<div class="notif-icon">${a.svg}</div><div class="notif-text">${a.msg}</div>`;
    feed.appendChild(notif);
    gsap.fromTo(notif, {x:'-130%'},{x:0,duration:0.5,ease:'back.out(1.4)'});
    setTimeout(() => gsap.to(notif, {x:'-130%',duration:0.4,ease:'power3.in',onComplete:()=>notif.remove()}), 3800);
    actIdx++;
  }, 5500);
}


const translations = {
  ES: {
    '.i18n-home': 'Inicio',
    '.i18n-mysongs': 'Mis Canciones',
    '.i18n-how': 'Cómo Funciona',
    '.i18n-freebadge': 'Gratis',
    '.i18n-navgenerate': 'Generar',
    '.i18n-herobadge': 'Generación Musical IA · Uso Gratuito',
    '.i18n-hero1': 'Tus&nbsp;', '.i18n-hero2': 'palabras.<br>', '.i18n-hero3': 'Tu&nbsp;', '.i18n-hero4': 'canción.',
    '.i18n-herosub': 'Escribe un sentimiento, un recuerdo, un estado de ánimo — Muzen lo convierte en una canción real en segundos. Sin cuenta. Solo crea.',
    '.i18n-describe': 'Describe tu canción',
    '.i18n-random': '🎲 Aleatorio',
    '.i18n-enhance': '✨ Mejorar',
    '.i18n-username': 'Usuario',
    '.i18n-optional': 'Opcional — gratis, sin registro',
    '.i18n-choosesound': 'Elige tu sonido',
    '.i18n-model1': 'Pop, ganchos pegadizos, voz limpia',
    '.i18n-model2': 'Cinematográfico, emocional, rico',
    '.i18n-model3': 'Hip-hop, trap, electrónico',
    '.i18n-genre': 'Género',
    '.i18n-generatebtn': 'Generar Mi Canción — Gratis',
    '.i18n-play': 'Reproducir',
    '.i18n-save': 'Guardar',
    '.i18n-download': 'Descargar',
    '.i18n-mysongstitle': 'Mis Canciones',
    '.i18n-nosongs': 'Aún no has guardado ninguna canción.',
    '.i18n-howeyebrow': 'Cómo funciona',
    '.i18n-howtitle': 'De la idea a la pista en segundos',
    '.i18n-howsub': 'Sin cuenta, sin instrumentos, sin experiencia necesaria',
    '.i18n-step1title': 'Escribe cualquier cosa',
    '.i18n-step1sub': 'Una oración, un sentimiento, o letras completas — Muzen lo entiende todo',
    '.i18n-step2title': 'Elige un modelo',
    '.i18n-step2sub': 'Elige Melody, Harmony o Rhythm — tres motores IA distintos',
    '.i18n-step3title': 'Generar',
    '.i18n-step3sub': 'Muzen compone, arregla y produce tu pista completa al instante',
    '.i18n-step4title': 'Escucha y comparte',
    '.i18n-step4sub': 'Reproduce con letras sincronizadas, descarga el MP3, o comparte tu canción',
    '.i18n-nowplaying': 'Reproduciendo',
    '.i18n-taplyrics': 'Toca para ver letras'
  }
};

fetch('https://ipapi.co/json/')
  .then(res => res.json())
  .then(data => {
    if (data.country_code === 'ES' || data.country_code === 'MX' || data.country_code === 'AR' || data.country_code === 'CO' || data.country_code === 'CL' || data.country_code === 'PE' || data.languages.includes('es')) {
      const dict = translations.ES;
      for (let selector in dict) {
        document.querySelectorAll(selector).forEach(el => el.innerHTML = dict[selector]);
      }
      document.getElementById('genTextarea').placeholder = "Una noche lluviosa en una ciudad que olvidó mi nombre...";
      document.getElementById('genUsername').placeholder = "tu_nombre (guarda en tu biblioteca)";
    }
  })
  .catch(err => console.log('Lang API Error', err));


window.openShareModal = function(song) {
  const modal = document.getElementById('share-modal');
  const titleEl = document.getElementById('shareSongTitle');
  const artistEl = document.getElementById('shareSongArtist');
  const artEl = document.getElementById('shareSongArt');
  const linkInput = document.getElementById('shareLinkInput');
  const copyBtn = document.getElementById('shareCopyBtn');
  const copyText = document.getElementById('shareCopyText');

  if (!modal || !song) return;

  titleEl.textContent = song.title || 'Untitled Track';
  artistEl.textContent = song.artist || 'Muzen AI';
  
  let artHtml = `<svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" stroke-width="1.8" style="width:24px;height:24px;"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`;
  const th = song.thumbnail || song.image_url || song.image;
  if (th) {
    artHtml = `<img src="${th}" alt="Art" style="width:100%;height:100%;object-fit:cover;"/>`;
  }
  artEl.innerHTML = artHtml;

  const permLink = window.location.origin + '?songId=' + song.id;
  linkInput.value = permLink;

  if (copyBtn && copyText) {
    copyBtn.style.background = 'var(--gold)';
    copyBtn.style.color = '#000';
    copyText.textContent = 'Copy';
  }

  modal.style.display = 'flex';
  gsap.fromTo('.share-content', { scale: 0.9, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(1.5)' });
};

window.closeShareModal = function() {
  const modal = document.getElementById('share-modal');
  if (!modal) return;
  gsap.to('.share-content', { scale: 0.9, opacity: 0, duration: 0.2, ease: 'power2.in', onComplete: () => {
    modal.style.display = 'none';
  }});
};

window.copyShareLink = function() {
  const linkInput = document.getElementById('shareLinkInput');
  if (!linkInput) return;

  linkInput.select();
  linkInput.setSelectionRange(0, 99999);

  navigator.clipboard.writeText(linkInput.value)
    .then(() => {
      const copyBtn = document.getElementById('shareCopyBtn');
      const copyText = document.getElementById('shareCopyText');
      if (copyBtn && copyText) {
        copyBtn.style.background = '#10B981';
        copyBtn.style.color = '#fff';
        copyText.textContent = 'Copied!';
        setTimeout(() => {
          copyBtn.style.background = 'var(--gold)';
          copyBtn.style.color = '#000';
          copyText.textContent = 'Copy';
        }, 2000);
      }
    })
    .catch(err => {
      console.error('Failed to copy: ', err);
    });
};

window.shareSongById = async function(id) {
  let song = savedSongs.find(s => s.id === id);
  if (!song) {
    try {
      const res = await fetch(`/api/song/${id}`);
      const data = await res.json();
      if (data.success && data.song) {
        song = data.song;
      }
    } catch (err) {
      console.error(err);
    }
  }

  if (song) {
    openShareModal(song);
  } else {
    alert("Could not load sharing details for this track.");
  }
};

window.downloadSongById = async function(id) {
  let song = savedSongs.find(s => s.id === id);
  if (!song) {
    try {
      const res = await fetch(`/api/song/${id}`);
      const data = await res.json();
      if (data.success && data.song) {
        song = data.song;
      }
    } catch (err) {
      console.error(err);
    }
  }

  if (song) {
    const audioUrl = song.audioUrl || song.audio_url || song.audio;
    if (audioUrl) {
      const a = document.createElement('a');
      a.href = audioUrl;
      a.download = `${song.title || 'Muzen_Track'}.mp3`;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } else {
      alert("No audio URL found for this track.");
    }
  } else {
    alert("Song details not found.");
  }
};

window.shareSongCurrent = function() {
  if (currentSong) {
    openShareModal(currentSong);
  } else {
    alert("Generate or select a song first!");
  }
};

window.sharePlayerSong = function() {
  if (currentSong) {
    openShareModal(currentSong);
  } else {
    alert("Play a song first!");
  }
};
