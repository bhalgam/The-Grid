// Main.js - Timer, tasks, and cover image upload
(() => {
  // Utilities
  const $ = id => document.getElementById(id);
  const fmt = s => String(s).padStart(2,'0');

  // Elements
  const timeEl = $('time');
  const startBtn = $('start');
  const pauseBtn = $('pause');
  const resetBtn = $('reset');
  const sessionSel = $('sessionLength');
  const progress = $('progress');

  const taskForm = $('task-form');
  const taskInput = $('task-input');
  const taskListEl = $('task-list');

  // optional elements — UI may be removed by the user; guard their usage
  const coverImg = $('coverImg');
  const imageInput = $('imageInput');
  const changeImageBtn = $('changeImage');
  const removeImageBtn = $('removeImage');

  // State
  let duration = 25*60; // seconds
  let remaining = duration;
  let timerId = null;
  let running = false;

  // Countup state
  let countupStartTime = null;
  let countupElapsed = 0;
  let countupTimerId = null;
  let countupRunning = false;

  // Local storage keys
  const LS_TASKS = 'focus_tasks_v1';
  const LS_COVER = 'focus_cover_v1';

  // --- Timer ---
  function updateDisplay(){
    const mm = Math.floor(remaining/60);
    const ss = remaining%60;
    timeEl.textContent = `${fmt(mm)}:${fmt(ss)}`;
    const perc = 100 - Math.round((remaining/duration)*100);
    progress.value = perc;
  }

  function tick(){
    if (remaining>0){
      remaining--;
      updateDisplay();
    } else {
      stopTimer();
      notifyEnd();
      playBeep();
    }
  }

  function startTimer(){
    if (running) return;
    running = true;
    startBtn.disabled = true;
    pauseBtn.disabled = false;
    timerId = setInterval(tick,1000);
  }
  function pauseTimer(){
    if (!running) return;
    running = false;
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    clearInterval(timerId);
  }
  function stopTimer(){
    running = false;
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    clearInterval(timerId);
  }
  function resetTimer(){
    const mins = Number(sessionSel.value)||25;
    duration = mins*60;
    remaining = duration;
    updateDisplay();
    stopTimer();
  }

  // notifications
  function notifyEnd(){
    if (Notification && Notification.permission==='granted'){
      new Notification('Focus — session complete', {body:'Time is up. Take a short break!'});
    }
  }

  function requestNotification(){
    if (!('Notification' in window)) return;
    if (Notification.permission==='default') Notification.requestPermission();
  }

  // beep using WebAudio
  let audioCtx = null;
  function playBeep(){
    try{
      if (!audioCtx) audioCtx = new (window.AudioContext||window.webkitAudioContext)();
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = 'sine';
      o.frequency.value = 880;
      g.gain.value = 0.0001;
      o.connect(g);
      g.connect(audioCtx.destination);
      // ramp up quickly then down
      g.gain.exponentialRampToValueAtTime(0.12,audioCtx.currentTime+0.02);
      o.start();
      setTimeout(()=>{
        g.gain.exponentialRampToValueAtTime(0.0001,audioCtx.currentTime+0.12);
        setTimeout(()=>o.stop(),150);
      },120);
    }catch(e){console.warn('Audio not available',e)}
  }

  // --- Tasks ---
  function loadTasks(){
    const raw = localStorage.getItem(LS_TASKS);
    if (!raw) return [];
    try{return JSON.parse(raw)||[]}catch(e){return []}
  }
  function saveTasks(tasks){
    localStorage.setItem(LS_TASKS, JSON.stringify(tasks));
  }
  function renderTasks(){
    const tasks = loadTasks();
    taskListEl.innerHTML = '';
    tasks.forEach((t, i)=>{
      const li = document.createElement('li');
      li.className = t.done? 'completed':'';
      const cb = document.createElement('input'); cb.type='checkbox'; cb.checked = !!t.done; cb.setAttribute('aria-label','Mark task done');
      cb.addEventListener('change',()=>{ t.done = cb.checked; saveTasks(tasks); renderTasks(); });
      const span = document.createElement('span'); span.textContent = t.text;
      const actions = document.createElement('div'); actions.className='task-actions';
      const del = document.createElement('button'); del.textContent='✕'; del.title='Delete'; del.addEventListener('click',()=>{ tasks.splice(i,1); saveTasks(tasks); renderTasks(); });
      actions.appendChild(del);
      li.appendChild(cb); li.appendChild(span); li.appendChild(actions);
      taskListEl.appendChild(li);
    });
  }

  taskForm.addEventListener('submit', e=>{
    e.preventDefault();
    const text = taskInput.value.trim();
    if (!text) return;
    const tasks = loadTasks();
    tasks.push({text, done:false, created:Date.now()});
    saveTasks(tasks);
    taskInput.value='';
    renderTasks();
  });

  // --- Cover Image (now supports backend upload at /upload and served at /cover) ---
  // default inline SVG used by server when no cover is uploaded
  const defaultCover = '/cover'; // server will respond with default SVG if no image exists

  // Apply cover to the whole page background using CSS variable --cover-url
  async function applyServerCover(){
    const ts = Date.now();
    const url = `/cover?ts=${ts}`;
    // Try a HEAD request to detect whether server returns a valid image
    try{
      const res = await fetch(url, { method: 'HEAD' });
      if (res.ok){
        document.documentElement.style.setProperty('--cover-url', `url("${url}")`);
        // if there is a small img element (optional), update it too
        if (coverImg) coverImg.src = url;
        return;
      }
    }catch(e){
      // network or server error — we'll fallback below
    }

    // fallback to any local value stored previously
    const v = localStorage.getItem(LS_COVER);
    if (v){
      document.documentElement.style.setProperty('--cover-url', `url("${v}")`);
      if (coverImg) coverImg.src = v;
    } else {
      document.documentElement.style.setProperty('--cover-url', 'none');
      if (coverImg) coverImg.removeAttribute('src');
    }
  }

  async function uploadCoverFile(file){
    try{
      const fd = new FormData();
      fd.append('cover', file);
      const res = await fetch('/upload', {method:'POST', body:fd});
      if (!res.ok) throw new Error('Upload failed');
      // refresh background from server
      await applyServerCover();
      // also keep a local copy as a fallback
      const reader = new FileReader();
      reader.onload = e => localStorage.setItem(LS_COVER, e.target.result);
      reader.readAsDataURL(file);
    }catch(err){
      console.warn('Upload error, saving locally instead', err);
      const reader = new FileReader();
      reader.onload = e => { localStorage.setItem(LS_COVER, e.target.result); document.documentElement.style.setProperty('--cover-url', `url("${e.target.result}")`); };
      reader.readAsDataURL(file);
    }
  }

  // Only wire upload/remove UI if those elements exist in the DOM
  if (changeImageBtn && imageInput){
    changeImageBtn.addEventListener('click', ()=> imageInput.click());
    imageInput.addEventListener('change', e=>{
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      uploadCoverFile(f);
    });
  }
  if (removeImageBtn){
    removeImageBtn.addEventListener('click', async ()=>{
      try{
        await fetch('/remove', {method:'POST'});
      }catch(e){
        console.warn('Remove on server failed', e);
      }
      localStorage.removeItem(LS_COVER);
      await applyServerCover();
    });
  }

  // --- Countup ---
  function updateCountupDisplay(){
    const totalSeconds = Math.floor(countupElapsed / 1000);
    const hh = Math.floor(totalSeconds / 3600);
    const mm = Math.floor((totalSeconds % 3600) / 60);
    const ss = totalSeconds % 60;
    $('countup-time').textContent = `${fmt(hh)}:${fmt(mm)}:${fmt(ss)}`;
  }

  function countupTick(){
    if (countupRunning){
      countupElapsed = Date.now() - countupStartTime;
      updateCountupDisplay();
    }
  }

  function startCountup(){
    if (countupRunning) return;
    countupRunning = true;
    if (countupStartTime === null) countupStartTime = Date.now() - countupElapsed;
    $('countup-start').disabled = true;
    $('countup-pause').disabled = false;
    countupTimerId = setInterval(countupTick, 100);
  }

  function pauseCountup(){
    if (!countupRunning) return;
    countupRunning = false;
    $('countup-start').disabled = false;
    $('countup-pause').disabled = true;
    clearInterval(countupTimerId);
  }

  function resetCountup(){
    countupRunning = false;
    countupStartTime = null;
    countupElapsed = 0;
    $('countup-start').disabled = false;
    $('countup-pause').disabled = true;
    clearInterval(countupTimerId);
    updateCountupDisplay();
  }

  // --- Wiring ---
  startBtn.addEventListener('click', ()=>{ startTimer(); requestNotification(); });
  pauseBtn.addEventListener('click', ()=> pauseTimer());
  resetBtn.addEventListener('click', ()=> resetTimer());
  sessionSel.addEventListener('change', ()=> resetTimer());

  $('countup-start').addEventListener('click', startCountup);
  $('countup-pause').addEventListener('click', pauseCountup);
  $('countup-reset').addEventListener('click', resetCountup);

  // keyboard accessibility: space on time to toggle start/pause
  timeEl.tabIndex = 0;
  timeEl.addEventListener('keydown', e=>{ if (e.code==='Space') (running?pauseTimer():startTimer()); });

  // init
  function init(){
    // set session to selected
    resetTimer();
    resetCountup();
    renderTasks();
    applyServerCover();
  }

  // expose for debugging (optional)
  window._focus = {resetTimer, startTimer, pauseTimer, playBeep};

  init();
})();
alert('Welcome to Focus! Conquer your study.');