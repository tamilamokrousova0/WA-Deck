(function setupWeatherModule() {
  const REFRESH_INTERVAL_MS = 10 * 60 * 1000;
  const GEO_CACHE_LIMIT = 24;

  let state, els, setStatus, trimMapSize;

  function init(ctx) {
    state = ctx.state;
    els = ctx.els;
    setStatus = ctx.setStatus;
    trimMapSize = ctx.trimMapSize;
  }

  function normalizeWeatherUnit(value) {
    return String(value || '').toLowerCase() === 'fahrenheit' ? 'fahrenheit' : 'celsius';
  }

  function normalizeWeatherCity(value) {
    return String(value || '').trim() || 'Moscow';
  }

  function weatherUnitSuffix(unit) {
    return normalizeWeatherUnit(unit) === 'fahrenheit' ? '°F' : '°C';
  }

  function weatherCodeToIcon(code, isDay = 1) {
    const value = Number(code);
    const daytime = Number(isDay) === 1;
    if (value === 0) return daytime ? '☀️' : '🌙';
    if ([1, 2].includes(value)) return daytime ? '🌤️' : '☁️';
    if (value === 3) return '☁️';
    if ([45, 48].includes(value)) return '🌫️';
    if ([51, 53, 55, 56, 57, 80, 81, 82].includes(value)) return '🌧️';
    if ([61, 63, 65, 66, 67].includes(value)) return '🌦️';
    if ([71, 73, 75, 77, 85, 86].includes(value)) return '🌨️';
    if ([95, 96, 99].includes(value)) return '⛈️';
    return '🌡️';
  }

  function weatherCodeToRu(code) {
    const value = Number(code);
    if (value === 0) return 'Ясно';
    if ([1, 2].includes(value)) return 'Переменная облачность';
    if (value === 3) return 'Облачно';
    if ([45, 48].includes(value)) return 'Туман';
    if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(value)) return 'Дождь';
    if ([71, 73, 75, 77, 85, 86].includes(value)) return 'Снег';
    if ([95, 96, 99].includes(value)) return 'Гроза';
    return 'Погода';
  }

  function renderWeatherSummary({ city, icon, temperature, unit, loading }) {
    if (!els.weatherCity || !els.weatherIcon || !els.weatherTemp || !els.weatherUnit) return;
    const safeCity = normalizeWeatherCity(city || state.settings?.weatherCity);
    const safeUnit = normalizeWeatherUnit(unit || state.settings?.weatherUnit);
    els.weatherCity.textContent = safeCity;
    els.weatherIcon.textContent = icon || '🌙';
    els.weatherTemp.textContent = typeof temperature === 'number' ? `${Math.round(temperature)}${weatherUnitSuffix(safeUnit)}` : `--${weatherUnitSuffix(safeUnit)}`;
    els.weatherUnit.textContent = safeUnit === 'fahrenheit' ? '°F' : '°C';
    els.weatherToggle?.classList.toggle('is-loading', Boolean(loading));
  }

  function setWeatherMeta(text) {
    if (!els.weatherMeta) return;
    els.weatherMeta.textContent = String(text || '').trim() || 'Погода не загружена';
    els.weatherMeta.title = els.weatherMeta.textContent;
  }

  function closeWeatherPopover() {
    if (!els.weatherPopover) return;
    els.weatherPopover.classList.add('hidden');
  }

  function toggleWeatherPopover() {
    if (!els.weatherPopover || !els.weatherCityInput) return;
    const hidden = els.weatherPopover.classList.contains('hidden');
    if (hidden) {
      els.weatherCityInput.value = normalizeWeatherCity(state.settings?.weatherCity);
      els.weatherPopover.classList.remove('hidden');
      setTimeout(() => {
        els.weatherCityInput?.focus();
        els.weatherCityInput?.select();
      }, 0);
      return;
    }
    closeWeatherPopover();
  }

  async function fetchJsonWithTimeout(url, timeoutMs = 9000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error(`http_${response.status}`);
      }
      return await response.json();
    } finally {
      clearTimeout(timer);
    }
  }

  async function resolveWeatherCoords(city) {
    const safeCity = normalizeWeatherCity(city);
    const cacheKey = safeCity.toLowerCase();
    if (state.weatherGeoCache.has(cacheKey)) {
      return state.weatherGeoCache.get(cacheKey);
    }
    const geocodeUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(safeCity)}&count=1&language=ru&format=json`;
    const payload = await fetchJsonWithTimeout(geocodeUrl, 9000);
    const row = Array.isArray(payload?.results) ? payload.results[0] : null;
    if (!row) {
      throw new Error('city_not_found');
    }
    const coords = {
      city: String(row.name || safeCity),
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
    };
    state.weatherGeoCache.set(cacheKey, coords);
    trimMapSize(state.weatherGeoCache, GEO_CACHE_LIMIT);
    return coords;
  }

  async function refreshWeather(forceCity = '') {
    const city = normalizeWeatherCity(forceCity || state.settings?.weatherCity);
    const unit = normalizeWeatherUnit(state.settings?.weatherUnit);
    renderWeatherSummary({ city, unit, loading: true });
    setWeatherMeta('Обновляю погоду...');

    try {
      const coords = await resolveWeatherCoords(city);
      const forecastUrl =
        `https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude}` +
        `&longitude=${coords.longitude}` +
        '&current=temperature_2m,weather_code,is_day' +
        '&timezone=auto' +
        `&temperature_unit=${unit}`;
      const payload = await fetchJsonWithTimeout(forecastUrl, 9000);
      const current = payload?.current || {};
      const weatherCode = Number(current.weather_code);
      const temperature = Number(current.temperature_2m);
      const isDay = Number(current.is_day || 0);
      const icon = weatherCodeToIcon(weatherCode, isDay);
      const weatherText = weatherCodeToRu(weatherCode);

      renderWeatherSummary({
        city: coords.city,
        icon,
        temperature,
        unit,
        loading: false,
      });
      const hhmm = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
      setWeatherMeta(`${weatherText} • обновлено ${hhmm}`);
    } catch (error) {
      renderWeatherSummary({ city, unit, loading: false });
      if (String(error?.message || '').includes('city_not_found')) {
        setWeatherMeta('Город не найден');
      } else {
        setWeatherMeta('Не удалось получить погоду');
      }
    }
  }

  async function saveWeatherSettings() {
    const draftCity = normalizeWeatherCity(els.weatherCityInput?.value || state.settings?.weatherCity);
    const draftUnit = normalizeWeatherUnit(state.settings?.weatherUnit);
    const nextSettings = await window.waDeck.saveSettings({
      weatherCity: draftCity,
      weatherUnit: draftUnit,
    });
    state.settings = {
      ...(state.settings || {}),
      ...(nextSettings || {}),
    };
    renderWeatherSummary({
      city: state.settings.weatherCity,
      unit: state.settings.weatherUnit,
      loading: false,
    });
    closeWeatherPopover();
    await refreshWeather(state.settings.weatherCity);
  }

  async function toggleWeatherUnit() {
    const nextUnit = normalizeWeatherUnit(state.settings?.weatherUnit) === 'celsius' ? 'fahrenheit' : 'celsius';
    state.settings.weatherUnit = nextUnit;
    renderWeatherSummary({
      city: state.settings.weatherCity,
      unit: nextUnit,
      loading: false,
    });
    const nextSettings = await window.waDeck.saveSettings({
      weatherUnit: nextUnit,
      weatherCity: normalizeWeatherCity(state.settings?.weatherCity),
    });
    state.settings = {
      ...(state.settings || {}),
      ...(nextSettings || {}),
    };
    await refreshWeather(state.settings.weatherCity);
  }

  function startWeatherRefreshLoop() {
    if (state.weatherRefreshTimer) {
      clearInterval(state.weatherRefreshTimer);
      state.weatherRefreshTimer = null;
    }
    state.weatherRefreshTimer = setInterval(() => {
      refreshWeather().catch(() => {});
    }, REFRESH_INTERVAL_MS);
  }

  window.WaDeckWeatherModule = {
    init,
    normalizeWeatherUnit,
    normalizeWeatherCity,
    renderWeatherSummary,
    refreshWeather,
    saveWeatherSettings,
    toggleWeatherUnit,
    startWeatherRefreshLoop,
    toggleWeatherPopover,
    closeWeatherPopover,
  };
})();
