(function setupTemplateModule() {
  function normalizeText(value) {
    return String(value || '').replace(/\r/g, '');
  }

  function createTemplateController(ctx) {
    const {
      state,
      els,
      setStatus,
      insertTextToActiveChat,
    } = ctx;

    let selectedTemplateId = '';
    let isBound = false;
    let searchMatches = [];

    const byId = (id) => state.templates.find((tpl) => tpl.id === id) || null;

    function renderSelect() {
      if (!els.templateSelect) return;
      const previous = selectedTemplateId;
      els.templateSelect.innerHTML = '';

      const createOption = (value, text) => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = text;
        return option;
      };

      els.templateSelect.appendChild(createOption('', 'Новый шаблон'));

      for (const tpl of state.templates) {
        els.templateSelect.appendChild(createOption(tpl.id, tpl.title || 'Без названия'));
      }

      if (previous && byId(previous)) {
        selectedTemplateId = previous;
      } else {
        selectedTemplateId = '';
      }
      els.templateSelect.value = selectedTemplateId;
    }

    function fillEditorFromTemplate(template) {
      if (!els.templateTitle || !els.templateText) return;
      if (!template) {
        els.templateTitle.value = '';
        els.templateText.value = '';
        return;
      }
      els.templateTitle.value = String(template.title || '');
      els.templateText.value = String(template.text || '');
    }

    function readEditorPayload() {
      return {
        id: selectedTemplateId,
        title: String(els.templateTitle?.value || '').trim(),
        text: normalizeText(els.templateText?.value || ''),
      };
    }

    function upsertStateTemplates(nextTemplates) {
      state.templates = Array.isArray(nextTemplates) ? nextTemplates.map((tpl) => ({ ...tpl })) : [];
    }

    async function saveCurrentTemplate() {
      const payload = readEditorPayload();
      if (!payload.text.trim()) {
        setStatus('Шаблон: введите текст');
        return;
      }

      const response = await window.waDeck.saveTemplate(payload);
      if (!response?.ok) {
        const map = {
          template_text_required: 'Введите текст шаблона',
          template_not_found: 'Шаблон не найден',
        };
        setStatus(`Шаблон: ${map[response?.error] || response?.error || 'ошибка сохранения'}`);
        return;
      }

      upsertStateTemplates(response.templates);
      selectedTemplateId = String(response.template?.id || '');
      renderSelect();
      fillEditorFromTemplate(byId(selectedTemplateId));
      setStatus('Шаблон сохранён');
    }

    async function deleteCurrentTemplate() {
      if (!selectedTemplateId) {
        setStatus('Шаблон: выберите шаблон для удаления');
        return;
      }
      const response = await window.waDeck.deleteTemplate(selectedTemplateId);
      if (!response?.ok) {
        setStatus(`Шаблон: ${response?.error || 'ошибка удаления'}`);
        return;
      }

      upsertStateTemplates(response.templates);
      selectedTemplateId = '';
      renderSelect();
      fillEditorFromTemplate(null);
      setStatus('Шаблон удалён');
    }

    async function insertIntoChat() {
      const text = normalizeText(els.templateText?.value || '').trim();
      if (!text) {
        setStatus('Шаблон: нет текста для вставки');
        return;
      }

      const result = await insertTextToActiveChat(text);
      if (!result?.ok) {
        setStatus(`Шаблон: не удалось вставить в чат (${result?.error || 'insert_failed'})`);
        return;
      }
      setStatus('Шаблон вставлен в активный чат');
    }

    function onTemplateSelected() {
      selectedTemplateId = String(els.templateSelect?.value || '').trim();
      fillEditorFromTemplate(byId(selectedTemplateId));
    }

    function newTemplate() {
      selectedTemplateId = '';
      if (els.templateSelect) {
        els.templateSelect.value = '';
      }
      fillEditorFromTemplate(null);
      setStatus('Новый шаблон');
    }

    function setTemplateSearchVisible(visible) {
      if (!els.templateSearchRow || !els.templateSearchInput) return;
      const next = Boolean(visible);
      els.templateSearchRow.classList.toggle('hidden', !next);
      els.templateSearchResultsRow?.classList.add('hidden');
      if (els.templateSearchResults) {
        els.templateSearchResults.innerHTML = '';
      }
      searchMatches = [];
      if (next) {
        els.templateSearchInput.focus();
        els.templateSearchInput.select();
      } else {
        els.templateSearchInput.value = '';
      }
    }

    function findTemplateByQuery(query) {
      const q = String(query || '').trim().toLowerCase();
      if (!q) return null;
      const startsWith = state.templates.find((tpl) => String(tpl.title || '').toLowerCase().startsWith(q));
      const includes = state.templates.find((tpl) => String(tpl.title || '').toLowerCase().includes(q));
      return startsWith || includes || null;
    }

    function findTemplateMatches(query) {
      const q = String(query || '').trim().toLowerCase();
      if (!q) return [];

      const startsWith = state.templates.filter((tpl) => String(tpl.title || '').toLowerCase().startsWith(q));
      const includes = state.templates.filter((tpl) => {
        const title = String(tpl.title || '').toLowerCase();
        return title.includes(q) && !title.startsWith(q);
      });
      return [...startsWith, ...includes];
    }

    function selectTemplate(template, options = {}) {
      if (!template) return;
      const silent = Boolean(options.silent);
      selectedTemplateId = String(template.id || '');
      if (els.templateSelect) {
        els.templateSelect.value = selectedTemplateId;
      }
      fillEditorFromTemplate(template);
      if (!silent) {
        setStatus(`Найден шаблон: ${template.title || 'Без названия'}`);
      }
    }

    function renderTemplateSearchResults(matches) {
      if (!els.templateSearchResultsRow || !els.templateSearchResults) return;
      if (!Array.isArray(matches) || !matches.length) {
        els.templateSearchResultsRow.classList.add('hidden');
        els.templateSearchResults.innerHTML = '';
        return;
      }

      els.templateSearchResults.innerHTML = '';
      for (const tpl of matches) {
        const option = document.createElement('option');
        option.value = String(tpl.id || '');
        option.textContent = String(tpl.title || 'Без названия');
        els.templateSearchResults.appendChild(option);
      }
      els.templateSearchResultsRow.classList.remove('hidden');
    }

    function applyTemplateSearch(query, options = {}) {
      const silent = Boolean(options.silent);
      const q = String(query || '').trim();
      if (!q) {
        searchMatches = [];
        renderTemplateSearchResults([]);
        if (selectedTemplateId) {
          if (els.templateSelect) {
            els.templateSelect.value = selectedTemplateId;
          }
          fillEditorFromTemplate(byId(selectedTemplateId));
        }
        return;
      }

      const matches = findTemplateMatches(q);
      searchMatches = matches;
      if (!matches.length) {
        renderTemplateSearchResults([]);
        if (!silent) {
          setStatus(`Шаблон не найден: ${q}`);
        }
        return;
      }

      if (matches.length === 1) {
        renderTemplateSearchResults([]);
        selectTemplate(matches[0], { silent });
        return;
      }

      renderTemplateSearchResults(matches);
      if (els.templateSearchResults) {
        els.templateSearchResults.value = String(matches[0].id || '');
      }
      if (!silent) {
        setStatus(`Найдено шаблонов: ${matches.length}. Выберите нужный в списке.`);
      }
    }

    function toggleTemplateSearch() {
      if (!els.templateSearchRow || !els.templateSearchInput) return;
      const hidden = els.templateSearchRow.classList.contains('hidden');
      if (hidden) {
        setTemplateSearchVisible(true);
        return;
      }
      const hasQuery = Boolean(String(els.templateSearchInput.value || '').trim());
      if (hasQuery) {
        els.templateSearchInput.value = '';
        applyTemplateSearch('', { silent: true });
        return;
      }
      setTemplateSearchVisible(false);
    }

    function onTemplateSearchInput() {
      if (!els.templateSearchInput) return;
      applyTemplateSearch(els.templateSearchInput.value, { silent: true });
    }

    function onTemplateSearchResultSelected() {
      if (!els.templateSearchResults) return;
      const id = String(els.templateSearchResults.value || '').trim();
      if (!id) return;
      const found = byId(id);
      if (!found) return;
      selectTemplate(found, { silent: false });
    }

    function onTemplateSearchKeydown(event) {
      if (!els.templateSearchInput) return;
      if (event.key === 'Enter') {
        event.preventDefault();
        applyTemplateSearch(els.templateSearchInput.value, { silent: false });
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        setTemplateSearchVisible(false);
      }
    }

    function bind() {
      if (isBound) return;
      isBound = true;

      els.templateSelect?.addEventListener('change', onTemplateSelected);
      els.templateSave?.addEventListener('click', () => saveCurrentTemplate().catch(console.error));
      els.templateDelete?.addEventListener('click', () => deleteCurrentTemplate().catch(console.error));
      els.templateNew?.addEventListener('click', newTemplate);
      els.templateSearch?.addEventListener('click', toggleTemplateSearch);
      els.templateSearchInput?.addEventListener('input', onTemplateSearchInput);
      els.templateSearchInput?.addEventListener('keydown', onTemplateSearchKeydown);
      els.templateSearchResults?.addEventListener('change', onTemplateSearchResultSelected);
      els.templateSearchResults?.addEventListener('dblclick', onTemplateSearchResultSelected);
      els.templateToChat?.addEventListener('click', () => insertIntoChat().catch(console.error));
    }

    async function init(initialTemplates) {
      upsertStateTemplates(initialTemplates);
      if (!state.templates.length) {
        const response = await window.waDeck.listTemplates();
        if (response?.ok) {
          upsertStateTemplates(response.templates);
        }
      }
      renderSelect();
      fillEditorFromTemplate(byId(selectedTemplateId));
      setTemplateSearchVisible(false);
    }

    return {
      bind,
      init,
    };
  }

  window.WaDeckTemplatesModule = {
    createTemplateController,
  };
})();
