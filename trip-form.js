'use strict';
// Trip form helpers (progressive enhancement), from the VIP-АвтоАренда form: address suggestions, a calendar and 10-minute times on desktop.
// Yekaterinburg time and places; the popular list is shown on focus, airports first for a transfer.
// Without JS the fields stay plain inputs; on phones the native date/time pickers are kept.
(() => {
  const desktop = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const pad = n => String(n).padStart(2, '0');
  const localNow = () => {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Yekaterinburg', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date()).map(x => [x.type, x.value]));
    return { date: `${p.year}-${p.month}-${p.day}`, minutes: Number(p.hour) * 60 + Number(p.minute) };
  };
  const months = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
  const monthsOf = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  const weekdays = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
  const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parse = value => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || ''); return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null; };
  let uid = 0;

  // ---- Date and time pickers (desktop only) ----
  const enhancePicker = input => {
    const kind = input.dataset.picker;
    const display = document.createElement('input');
    display.type = 'text'; display.className = 'picker-display'; display.required = input.required; display.autocomplete = 'off';
    display.setAttribute('inputmode', 'none'); display.setAttribute('aria-haspopup', kind === 'date' ? 'dialog' : 'listbox'); display.setAttribute('aria-expanded', 'false');
    display.placeholder = kind === 'date' ? 'Выберите дату' : 'Выберите время';
    input.type = 'hidden';
    input.before(display);
    const pop = document.createElement('div');
    pop.className = `picker-pop picker-${kind}`; pop.hidden = true; pop.id = `picker-${++uid}`;
    display.setAttribute('aria-controls', pop.id);
    display.after(pop);
    const show = () => {
      if (kind === 'date') { const d = parse(input.value); display.value = d ? `${d.getDate()} ${monthsOf[d.getMonth()]}, ${weekdays[d.getDay()]}` : ''; }
      else display.value = input.value || '';
    };
    input.vipSync = show;
    const close = (focus = false) => { pop.hidden = true; display.setAttribute('aria-expanded', 'false'); if (focus) display.focus(); };
    const choose = value => { input.value = value; show(); input.dispatchEvent(new Event('change', { bubbles: true })); display.setCustomValidity(''); close(true); };
    const timeDate = () => input.form?.elements.date?.value || '';

    const renderDate = (month, focusDay) => {
      const now = parse(localNow().date); const max = new Date(now.getFullYear() + 2, now.getMonth(), now.getDate());
      const selected = input.value; const first = new Date(month.getFullYear(), month.getMonth(), 1);
      const offset = (first.getDay() + 6) % 7; const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
      pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-label', 'Выбор даты');
      let html = `<div class="picker-head"><button type="button" data-step="-1" aria-label="Предыдущий месяц">‹</button><strong>${months[month.getMonth()]} ${month.getFullYear()}</strong><button type="button" data-step="1" aria-label="Следующий месяц">›</button></div><div class="picker-week">${['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'].map(w => `<span>${w}</span>`).join('')}</div><div class="picker-days">`;
      html += '<span></span>'.repeat(offset);
      for (let day = 1; day <= days; day++) {
        const d = new Date(month.getFullYear(), month.getMonth(), day); const value = iso(d);
        const off = d < now || d > max;
        html += `<button type="button" data-date="${value}" tabindex="-1"${off ? ' disabled' : ''}${value === selected ? ' aria-pressed="true"' : ''}${value === iso(now) ? ' class="is-today"' : ''} aria-label="${day} ${monthsOf[d.getMonth()]}">${day}</button>`;
      }
      pop.innerHTML = html + '</div>';
      pop.querySelector('[data-step="-1"]').disabled = month <= new Date(now.getFullYear(), now.getMonth(), 1);
      const target = pop.querySelector(`[data-date="${focusDay}"]:not([disabled])`) || pop.querySelector('[aria-pressed="true"]:not([disabled])') || pop.querySelector('[data-date]:not([disabled])');
      if (target) { target.tabIndex = 0; if (!pop.hidden) target.focus(); }
      pop.vipMonth = month;
    };
    const renderTime = () => {
      // The end of a trip may fall after midnight: only the pickup time skips the past slots of today.
      const end = input.name === 'end_time'; const now = localNow(); const today = !end && timeDate() === now.date;
      pop.setAttribute('role', 'listbox'); pop.setAttribute('aria-label', end ? 'Время окончания' : 'Время подачи');
      let html = '';
      for (let m = 0; m < 24 * 60; m += 10) {
        const value = `${pad(Math.floor(m / 60))}:${pad(m % 60)}`; const off = today && m < now.minutes;
        html += `<div role="option" tabindex="-1" data-time="${value}"${off ? ' aria-disabled="true"' : ''}${value === input.value ? ' aria-selected="true"' : ''}>${value}</div>`;
      }
      pop.innerHTML = html;
    };
    // Open upwards when the window has no room below the field (the trip form sits low on the first screen).
    const place = () => {
      pop.classList.remove('is-up');
      const field = display.getBoundingClientRect(); const height = pop.offsetHeight;
      if (window.innerHeight - field.bottom < height + 12 && field.top > window.innerHeight - field.bottom) pop.classList.add('is-up');
    };
    const open = () => {
      pop.hidden = false; display.setAttribute('aria-expanded', 'true');
      requestAnimationFrame(place);
      if (kind === 'date') { const d = parse(input.value) || parse(localNow().date); renderDate(new Date(d.getFullYear(), d.getMonth(), 1), iso(d)); }
      else {
        renderTime();
        const target = pop.querySelector('[aria-selected="true"]') || pop.querySelector('[data-time="09:00"]:not([aria-disabled])') || pop.querySelector('[data-time]:not([aria-disabled])');
        if (target) { pop.scrollTop = target.offsetTop - pop.clientHeight / 2 + target.offsetHeight / 2; target.focus(); }
      }
    };
    display.addEventListener('beforeinput', event => event.preventDefault());
    display.addEventListener('click', () => (pop.hidden ? open() : close()));
    display.addEventListener('keydown', event => {
      if (['Enter', ' ', 'ArrowDown'].includes(event.key)) { event.preventDefault(); open(); }
      if (['Backspace', 'Delete'].includes(event.key)) { event.preventDefault(); input.value = ''; show(); }
    });
    pop.addEventListener('mousedown', event => event.preventDefault());
    pop.addEventListener('click', event => {
      event.preventDefault();// the popup sits inside the <label>: no label activation of the field
      const step = event.target.closest('[data-step]');
      if (step) { const m = pop.vipMonth; renderDate(new Date(m.getFullYear(), m.getMonth() + Number(step.dataset.step), 1)); return; }
      const day = event.target.closest('[data-date]:not([disabled])'); if (day) choose(day.dataset.date);
      const slot = event.target.closest('[data-time]:not([aria-disabled])'); if (slot) choose(slot.dataset.time);
    });
    pop.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(true); return; }
      if (kind === 'date') {
        const current = document.activeElement.closest?.('[data-date]'); if (!current) return;
        const moves = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }; const d = parse(current.dataset.date);
        if (moves[event.key] !== undefined) { event.preventDefault(); d.setDate(d.getDate() + moves[event.key]); }
        else if (event.key === 'PageUp' || event.key === 'PageDown') { event.preventDefault(); d.setMonth(d.getMonth() + (event.key === 'PageUp' ? -1 : 1)); }
        else return;
        const next = pop.querySelector(`[data-date="${iso(d)}"]`);
        if (next && !next.disabled) { current.tabIndex = -1; next.tabIndex = 0; next.focus(); }
        else if (!next) renderDate(new Date(d.getFullYear(), d.getMonth(), 1), iso(d));
      } else {
        const slots = Array.from(pop.querySelectorAll('[data-time]:not([aria-disabled])')); const i = slots.indexOf(document.activeElement);
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); slots[Math.max(0, Math.min(slots.length - 1, i + (event.key === 'ArrowDown' ? 1 : -1)))]?.focus(); }
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); if (i >= 0) choose(slots[i].dataset.time); }
      }
    });
    document.addEventListener('pointerdown', event => { if (!pop.hidden && !pop.contains(event.target) && event.target !== display) close(); });
    pop.addEventListener('focusout', event => { if (!pop.contains(event.relatedTarget) && event.relatedTarget !== display) close(); });
    show();
  };
  if (desktop) document.querySelectorAll('input[data-picker]').forEach(enhancePicker);
  // Phones keep the native wheel; it also gets the 10-minute step and today as the earliest date.
  document.querySelectorAll('input[data-picker="date"]').forEach(input => { if (input.type === 'date') input.min = localNow().date; });

  // ---- Address suggestions: our list of popular places first, then OpenStreetMap (Photon) for any address ----
  const places = [
    ['Аэропорт Кольцово (SVX)', 'улица Бахчиванджи, 1', 'Аэропорт', 'кольцово аэропорт svx koltsovo airport'],
    ['Вокзал Екатеринбург-Пассажирский', 'Вокзальная улица, 22', 'Вокзал', 'жд вокзал ржд екатеринбург пассажирский station'],
    ['Северный автовокзал', 'Вокзальная улица, 15а', 'Автовокзал', 'северный автовокзал'],
    ['Южный автовокзал', 'улица 8 Марта, 145', 'Автовокзал', 'южный автовокзал'],
    ['МВЦ «Екатеринбург-ЭКСПО»', 'Экспо-бульвар, 2', 'Выставки', 'экспо иннопром выставка expo innoprom'],
    ['Ельцин Центр', 'улица Бориса Ельцина, 3', 'Место', 'ельцин центр yeltsin'],
    ['Hyatt Regency Ekaterinburg', 'улица Бориса Ельцина, 8', 'Отель', 'хаятт хаят отель hyatt'],
    ['Екатеринбург Арена', 'улица Репина, 5', 'Стадион', 'екатеринбург арена стадион центральный arena'],
    ['БЦ «Высоцкий»', 'улица Малышева, 51', 'Бизнес-центр', 'высоцкий бизнес центр vysotsky'],
    ['Храм на Крови', 'Царская улица, 10', 'Место', 'храм на крови'],
    // Intercity transfers: airports of the neighbouring cities.
    ['Аэропорт Челябинск (CEK)', 'Челябинск', 'Аэропорт', 'челябинск баландино аэропорт cek'],
    ['Аэропорт Тюмень Рощино (TJM)', 'Тюмень', 'Аэропорт', 'тюмень рощино аэропорт tjm'],
    ['Аэропорт Пермь (PEE)', 'Пермь', 'Аэропорт', 'пермь большое савино аэропорт pee'],
].map(([name, detail, kind, keys]) => ({ name, detail, kind, value: `${name}, ${detail}`, words: `${name} ${detail} ${keys}` }));
  const normal = s => s.toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9]+/g, ' ').trim();
  const localMatches = q => {
    const tokens = normal(q).split(' ').filter(Boolean); if (!tokens.length) return [];
    return places.filter(p => { const words = normal(p.words).split(' '); return tokens.every(t => words.some(w => w.startsWith(t))); }).slice(0, 5);
  };
  const remoteCache = new Map();
  const remote = async (q, signal) => {
    if (remoteCache.has(q)) return remoteCache.get(q);
    // No area limit (intercity trips); lat/lon ranks Yekaterinburg first, results from the Sverdlovsk region are moved up.
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=12&lat=56.838&lon=60.605&zoom=11&location_bias_scale=0.1`;
    const response = await fetch(url, { signal, headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error('suggest failed');
    const data = await response.json();
    const local = p => /Свердлов|Sverdlov/.test(p.state || '') ? 0 : 1;
    // With a house number typed, plain addresses go before shops and offices at that address.
    const house = /[0-9]/.test(q); const shop = p => (house && p.name && p.housenumber ? 1 : 0);
    const items = (data.features || []).sort((a, b) => local(a.properties) - local(b.properties) || shop(a.properties) - shop(b.properties)).map(({ properties: p }) => {
      const street = [p.street, p.housenumber].filter(Boolean).join(', ');
      const title = p.name || street; if (!title) return null;
      const detail = [...new Set([p.name ? street : '', p.district || p.locality, p.city || p.county, p.country !== 'Россия' ? p.country : ''].filter(Boolean))].filter(x => x !== title).join(', ');
      const kind = p.osm_key === 'aeroway' ? 'Аэропорт' : p.osm_value === 'station' ? 'Станция' : p.osm_value === 'hotel' ? 'Отель' : p.housenumber ? 'Адрес' : p.osm_key === 'highway' ? 'Улица' : 'Место';
      return { name: title, detail, kind, key: `${title}|${p.housenumber || ''}|${p.city || p.county || ''}`.toLowerCase(), value: detail ? `${title}, ${detail}` : title };
    }).filter((x, i, all) => x && all.findIndex(y => y && y.key === x.key) === i).slice(0, 6); // OSM splits one street into several pieces
    remoteCache.set(q, items); return items;
  };
  const enhanceSuggest = input => {
    const list = document.createElement('div');
    list.className = 'suggest-pop'; list.id = `suggest-${++uid}`; list.setAttribute('role', 'listbox'); list.hidden = true;
    input.after(list);
    input.setAttribute('role', 'combobox'); input.setAttribute('aria-autocomplete', 'list'); input.setAttribute('aria-expanded', 'false'); input.setAttribute('aria-controls', list.id);
    let items = []; let active = -1; let timer = 0; let controller = null; let remoteShown = false;
    const close = () => { list.hidden = true; input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant'); active = -1; };
    const render = () => {
      if (!items.length) { close(); return; }
      list.innerHTML = items.map((item, i) => `<div role="option" id="${list.id}-${i}" data-index="${i}"${i === active ? ' aria-selected="true"' : ''}><span class="suggest-kind">${item.kind}</span><strong></strong><small></small></div>`).join('') + (remoteShown ? '<p class="suggest-credit">Подсказки адресов: © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a></p>' : '');
      list.querySelectorAll('[role="option"]').forEach((node, i) => { node.querySelector('strong').textContent = items[i].name; node.querySelector('small').textContent = items[i].detail; });
      list.hidden = false; input.setAttribute('aria-expanded', 'true');
      if (active >= 0) input.setAttribute('aria-activedescendant', `${list.id}-${active}`); else input.removeAttribute('aria-activedescendant');
    };
    const choose = i => { input.value = items[i].value; input.dispatchEvent(new Event('change', { bubbles: true })); close(); };
    const merge = (a, b) => { const seen = new Set(a.map(x => normal(x.name))); return a.concat(b.filter(x => !seen.has(normal(x.name)))).slice(0, 8); };
    input.addEventListener('input', () => {
      const q = input.value.trim(); clearTimeout(timer); controller?.abort(); remoteShown = false; active = -1;
      items = q.length >= 2 ? localMatches(q) : []; render();
      if (q.length < 3) return;
      timer = setTimeout(async () => {
        controller = new AbortController();
        try { const found = await remote(q, controller.signal); if (input.value.trim() !== q) return; remoteShown = found.length > 0; items = merge(localMatches(q), found); render(); }
        catch (_) { /* suggestions are optional: the field still accepts any text */ }
      }, 300);
    });
    input.addEventListener('keydown', event => {
      if (list.hidden) return;
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); active = (active + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length; render(); }
      else if (event.key === 'Enter' && active >= 0) { event.preventDefault(); choose(active); }
      else if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); }
    });
    list.addEventListener('mousedown', event => event.preventDefault());
    list.addEventListener('click', event => { event.preventDefault(); const option = event.target.closest('[data-index]'); if (option) choose(Number(option.dataset.index)); });
    // Empty field: the popular places, airports and stations first when the form is in transfer mode.
    input.addEventListener('focus', () => {
      if (input.value.trim()) return;
      const transfer = input.closest('form')?.dataset.mode === 'transfer';
      const rank = p => (transfer ? ['Аэропорт', 'Вокзал', 'Автовокзал'].indexOf(p.kind) : -1);
      items = places.slice(0, 10).map((p, i) => [p, i]).sort((a, b) => ((rank(a[0]) < 0) - (rank(b[0]) < 0)) || a[1] - b[1]).map(x => x[0]).slice(0, 6);
      active = -1; remoteShown = false; render();
    });
    input.addEventListener('blur', () => setTimeout(close, 120));
  };
  document.querySelectorAll('input[data-suggest]').forEach(enhanceSuggest);
})();
