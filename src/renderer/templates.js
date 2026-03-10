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

    function bind() {
      if (isBound) return;
      isBound = true;

      els.templateSelect?.addEventListener('change', onTemplateSelected);
      els.templateSave?.addEventListener('click', () => saveCurrentTemplate().catch(console.error));
      els.templateDelete?.addEventListener('click', () => deleteCurrentTemplate().catch(console.error));
      els.templateNew?.addEventListener('click', newTemplate);
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
