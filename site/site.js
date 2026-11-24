import { initialize, rows } from 'nbhi';

setUpTheme();
highlightCode();
addCopyButtons();

await initialize({ source: './site/components' });

followContents();
showAuthor();
showNested();
showTags();
showList();
showForm();

function setUpTheme() {
  const toggle = document.querySelector('.themeToggle');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
  label();
  prefersDark.addEventListener('change', label);

  toggle.addEventListener('click', () => {
    const theme = isDark() ? 'light' : 'dark';
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem('nbhi.theme', theme);
    } catch (error) {
      console.warn('Could not remember the theme', error);
    }
    label();
  });

  function isDark() {
    const { theme } = document.documentElement.dataset;
    return theme ? theme === 'dark' : prefersDark.matches;
  }

  function label() {
    toggle.textContent = isDark() ? 'Day' : 'Night';
    toggle.setAttribute('aria-label', isDark() ? 'Switch to the day theme' : 'Switch to the night theme');
  }
}

function highlightCode() {
  if (window.hljs) {
    window.hljs.highlightAll();
  }
}

function addCopyButtons() {
  document.querySelectorAll('main pre:not(.formOutput)').forEach(pre => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'copy';
    button.textContent = 'Copy';
    button.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(pre.querySelector('code').textContent);
        button.textContent = 'Copied';
      } catch (error) {
        console.warn('Could not copy', error);
        button.textContent = 'Select and copy';
      }
      setTimeout(() => {
        button.textContent = 'Copy';
      }, 1500);
    });
    pre.append(button);
  });
}

function followContents() {
  const links = [...document.querySelectorAll('.contents a')];
  const sections = [...document.querySelectorAll('main > section')];
  let scheduled = false;
  mark();

  window.addEventListener('scroll', () => {
    if (!scheduled) {
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        mark();
      });
    }
  }, { passive: true });

  function mark() {
    const line = window.innerHeight * 0.3;
    const current = sections.findLast(section => section.getBoundingClientRect().top < line) ?? sections[0];
    links.forEach(link => link.classList.toggle('current', link.hash === `#${ current.id }`));
  }
}

function showAuthor() {
  const author = document.querySelector('.author');
  const name = document.querySelector('.authorName');
  const bio = document.querySelector('.authorBio');
  const log = document.querySelector('.authorLog');

  author.name = name.value;
  author.bio = bio.value;
  author.link = '#properties';

  name.addEventListener('input', () => set('name', name.value));
  bio.addEventListener('input', () => set('bio', bio.value));
  document.querySelector('.injectBio').addEventListener('click', () => {
    bio.value = '<img src="x" onerror="alert(\'Gotcha\')"> and <b>bold</b>';
    set('bio', bio.value);
  });

  function set(property, value) {
    author[property] = value;
    log.textContent = `author.${ property } = ${ JSON.stringify(value) }`;
  }
}

function showNested() {
  const card = document.querySelector('.articleCard');
  document.querySelector('.articleStatus').addEventListener('change', event => {
    card.status = event.target.value;
  });
}

function showTags() {
  const tags = document.querySelector('.tags');
  const log = document.querySelector('.tagLog');
  const form = document.querySelector('.addTag');
  const input = form.querySelector('.tagName');

  tags.addEventListener('remove', event => {
    event.target.remove();
    log.textContent = `Heard "remove" from the tag "${ event.detail.label }" on its parent`;
  });

  form.addEventListener('submit', event => {
    event.preventDefault();
    const tag = document.createElement('nb-tag');
    tag.label = input.value.trim();
    tags.append(tag);
    log.textContent = `Added <nb-tag> with label "${ tag.label }"`;
    form.reset();
  });
}

function showList() {
  const table = document.querySelector('.articles');
  const titles = ['Sunsets and slots', 'Coconut properties', 'Lagoon layouts', 'Hammock-driven development', 'Tide tables'];
  const statuses = ['Draft', 'In review', 'Published'];
  let articles = [
    { id: 1, title: 'Getting started', status: 'Published' },
    { id: 2, title: 'Properties', status: 'In review' },
    { id: 3, title: 'Lists and rows', status: 'Draft' },
  ];
  let nextId = 4;
  render();

  document.querySelector('.shuffle').addEventListener('click', () => {
    articles = [...articles].sort(() => Math.random() - 0.5);
    render();
  });

  document.querySelector('.addArticle').addEventListener('click', () => {
    articles = [...articles, {
      id: nextId,
      title: titles[(nextId - 4) % titles.length],
      status: statuses[nextId % statuses.length],
    }];
    nextId++;
    render();
  });

  document.querySelector('.removeArticle').addEventListener('click', () => {
    articles = articles.slice(1);
    render();
  });

  function render() {
    rows(table, articles.map(article => ({ ...article, link: `#lists` })));
  }
}

function showForm() {
  const form = document.querySelector('.tripForm');
  const output = document.querySelector('.formData');

  form.querySelector('[name="island"]').options = [
    { value: '', label: 'Choose an island' },
    { value: 'bora-bora', label: 'Bora Bora' },
    { value: 'zanzibar', label: 'Zanzibar' },
    { value: 'koh-lipe', label: 'Koh Lipe' },
    { value: 'aitutaki', label: 'Aitutaki' },
  ];

  form.addEventListener('submit', event => {
    event.preventDefault();
    show(JSON.stringify(Object.fromEntries(new FormData(form)), null, 2));
  });

  form.addEventListener('reset', () => show('Submit the form to see its FormData.'));

  function show(text) {
    output.textContent = text;
    delete output.dataset.highlighted;
    if (window.hljs) {
      window.hljs.highlightElement(output);
    }
  }
}
