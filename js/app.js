import { INITIAL_WORDS, CROATIAN_ALPHABET } from './words-data.js';

class DjecnikApp {
  constructor() {
    this.words = this.loadWords();
    this.activeLetter = null;
    this.searchQuery = '';
    this.currentReaderWordId = 'klopavac';
    this.currentShareWord = null;

    this.initElements();
    this.initEvents();
    this.renderAlphabet();
    this.renderArchive();
    this.renderReader();
  }

  // Učitavanje riječi (početne + one pohranjene u localStorage)
  loadWords() {
    try {
      const stored = localStorage.getItem('djecnik_user_words');
      if (stored) {
        const userWords = JSON.parse(stored);
        return [...INITIAL_WORDS, ...userWords];
      }
    } catch (e) {
      console.error('Greška pri učitavanju riječi:', e);
    }
    return [...INITIAL_WORDS];
  }

  saveWord(newWord) {
    try {
      const stored = localStorage.getItem('djecnik_user_words');
      const userWords = stored ? JSON.parse(stored) : [];
      userWords.unshift(newWord);
      localStorage.setItem('djecnik_user_words', JSON.stringify(userWords));
      this.words.unshift(newWord);
      this.renderAlphabet();
      this.renderArchive();
      this.openReaderAtWord(newWord.id);
    } catch (e) {
      console.error('Greška pri spremanju riječi:', e);
    }
  }

  initElements() {
    // DOM elementi
    this.wordsGrid = document.getElementById('words-grid');
    this.alphabetList = document.getElementById('alphabet-list');
    this.searchInput = document.getElementById('search-input');
    this.clearSearchBtn = document.getElementById('clear-search-btn');
    this.archiveCount = document.getElementById('archive-count');

    // Reader elementi
    this.readerLetter = document.getElementById('reader-letter');
    this.readerWordList = document.getElementById('reader-word-list');
    this.readerPageNum = document.getElementById('reader-page-num');
    this.readerWord = document.getElementById('reader-word');
    this.readerRealWord = document.getElementById('reader-real-word');
    this.readerDefinition = document.getElementById('reader-definition');
    this.readerSpeaker = document.getElementById('reader-speaker');
    this.readerDate = document.getElementById('reader-date');
    this.readerPrevBtn = document.getElementById('reader-prev-btn');
    this.readerNextBtn = document.getElementById('reader-next-btn');
    this.readerShareBtn = document.getElementById('reader-share-btn');

    // Modal za slanje riječi
    this.submitModal = document.getElementById('submit-modal');
    this.submitForm = document.getElementById('submit-word-form');
    this.openSubmitBtns = document.querySelectorAll('.trigger-submit-modal');
    this.closeSubmitBtn = document.getElementById('close-submit-modal');

    // Modal za dijeljenje
    this.shareModal = document.getElementById('share-modal');
    this.closeShareBtn = document.getElementById('close-share-modal');
    this.downloadCardBtn = document.getElementById('download-card-btn');
    this.copyCardBtn = document.getElementById('copy-card-btn');
    this.shareStoryCard = document.getElementById('share-story-card');

    // Toast
    this.toast = document.getElementById('toast');

    // Hero knjiga
    this.heroBook = document.getElementById('hero-book');

    // Mobilni izbornik
    this.menuToggle = document.getElementById('menu-toggle');
    this.navMenu = document.getElementById('nav-menu');
  }

  initEvents() {
    // Pretraživanje
    this.searchInput.addEventListener('input', (e) => {
      this.searchQuery = e.target.value.trim().toLowerCase();
      if (this.searchQuery) {
        this.clearSearchBtn.classList.add('visible');
      } else {
        this.clearSearchBtn.classList.remove('visible');
      }
      this.renderArchive();
    });

    this.clearSearchBtn.addEventListener('click', () => {
      this.searchInput.value = '';
      this.searchQuery = '';
      this.clearSearchBtn.classList.remove('visible');
      this.renderArchive();
      this.searchInput.focus();
    });

    // Otvaranje modala za slanje riječi
    this.openSubmitBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.openModal(this.submitModal);
      });
    });

    this.closeSubmitBtn.addEventListener('click', () => {
      this.closeModal(this.submitModal);
    });

    // Slanje forme
    this.submitForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleFormSubmit();
    });

    // Modal za dijeljenje
    this.closeShareBtn.addEventListener('click', () => {
      this.closeModal(this.shareModal);
    });

    this.downloadCardBtn.addEventListener('click', () => {
      this.generateAndDownloadCanvas();
    });

    this.copyCardBtn.addEventListener('click', () => {
      this.copyWordText();
    });

    // Reader kontrole
    this.readerPrevBtn.addEventListener('click', () => {
      this.navigateReader(-1);
    });

    this.readerNextBtn.addEventListener('click', () => {
      this.navigateReader(1);
    });

    this.readerShareBtn.addEventListener('click', () => {
      const currentWord = this.words.find(w => w.id === this.currentReaderWordId);
      if (currentWord) {
        this.openShareModal(currentWord);
      }
    });

    // Hero knjiga klik -> otvara čitač
    if (this.heroBook) {
      this.heroBook.addEventListener('click', () => {
        document.getElementById('citac').scrollIntoView({ behavior: 'smooth' });
      });
    }

    // Mobilni izbornik
    if (this.menuToggle) {
      this.menuToggle.addEventListener('click', () => {
        this.navMenu.classList.toggle('open');
      });
    }

    // Zatvaranje modala na klik izvan sadržaja ili Escape
    [this.submitModal, this.shareModal].forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.closeModal(modal);
        }
      });
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeModal(this.submitModal);
        this.closeModal(this.shareModal);
      }
    });
  }

  // Render hrvatske abecede
  renderAlphabet() {
    this.alphabetList.innerHTML = '';

    // "Sve" gumb
    const allBtn = document.createElement('button');
    allBtn.className = `letter-chip all-letters ${this.activeLetter === null ? 'active' : ''}`;
    allBtn.textContent = `Sve riječi (${this.words.length})`;
    allBtn.addEventListener('click', () => {
      this.activeLetter = null;
      this.renderAlphabet();
      this.renderArchive();
    });
    this.alphabetList.appendChild(allBtn);

    // Slovni čipovi
    CROATIAN_ALPHABET.forEach(letter => {
      const count = this.words.filter(w => {
        const firstLetter = w.word.charAt(0).toUpperCase();
        return firstLetter === letter.charAt(0).toUpperCase();
      }).length;

      const chip = document.createElement('button');
      chip.className = `letter-chip ${this.activeLetter === letter ? 'active' : ''} ${count === 0 ? 'disabled' : ''}`;
      chip.textContent = letter;
      chip.title = `${letter} (${count} riječi)`;

      if (count > 0) {
        chip.addEventListener('click', () => {
          this.activeLetter = (this.activeLetter === letter) ? null : letter;
          this.renderAlphabet();
          this.renderArchive();
        });
      }

      this.alphabetList.appendChild(chip);
    });
  }

  // Filtrirane riječi
  getFilteredWords() {
    return this.words.filter(item => {
      const matchesLetter = !this.activeLetter || 
        item.word.charAt(0).toUpperCase() === this.activeLetter.charAt(0).toUpperCase() ||
        (item.letter && item.letter.toUpperCase() === this.activeLetter.toUpperCase());

      const matchesSearch = !this.searchQuery || 
        item.word.toLowerCase().includes(this.searchQuery) ||
        item.realWord.toLowerCase().includes(this.searchQuery) ||
        item.definition.toLowerCase().includes(this.searchQuery) ||
        (item.speaker && item.speaker.toLowerCase().includes(this.searchQuery)) ||
        (item.location && item.location.toLowerCase().includes(this.searchQuery));

      return matchesLetter && matchesSearch;
    });
  }

  // Render arhive kartica riječi
  renderArchive() {
    const filtered = this.getFilteredWords();
    this.archiveCount.innerHTML = `Prikazano <b>${filtered.length}</b> od ukupno <b>${this.words.length}</b> riječi`;

    if (filtered.length === 0) {
      this.wordsGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: var(--c-charcoal-muted);">
          <div style="font-family: var(--font-serif); font-size: 1.8rem; margin-bottom: 12px; color: var(--c-burgundy);">Nije pronađena niti jedna riječ</div>
          <p style="margin-bottom: 24px;">Znaš li ti kako su djeca ovo govorila? Prijavi novu riječ u Dječnik!</p>
          <button class="btn-submit-nav trigger-submit-modal" style="margin: 0 auto; display: inline-flex;">Pošalji svoju riječ</button>
        </div>
      `;
      // Ponovno poveži gumb
      const newBtn = this.wordsGrid.querySelector('.trigger-submit-modal');
      if (newBtn) {
        newBtn.addEventListener('click', () => this.openModal(this.submitModal));
      }
      return;
    }

    this.wordsGrid.innerHTML = '';
    filtered.forEach(item => {
      const card = document.createElement('article');
      card.className = 'word-card';
      card.innerHTML = `
        <div class="card-top">
          <span class="card-brand-tag">dječnik.hr</span>
          <span class="card-letter-badge">${item.letter || item.word.charAt(0).toUpperCase()}</span>
        </div>
        <div>
          <h3 class="card-word">${this.escapeHTML(item.word)}</h3>
          <div class="card-real-word">= ${this.escapeHTML(item.realWord)}</div>
          <div class="card-rule-line"></div>
          <p class="card-definition">${this.escapeHTML(item.definition)}</p>
        </div>
        <div class="card-bottom">
          <div class="card-meta">
            <div class="card-meta-speaker">${this.escapeHTML(item.speaker || 'Dijete')} (${item.age ? item.age : '–'})</div>
            <div style="font-size: 0.75rem; color: var(--c-charcoal-light);">${this.escapeHTML(item.location || 'Hrvatska')}${item.year ? ', ' + item.year : ''}</div>
          </div>
          <div class="card-actions">
            <button class="card-btn-action btn-open-book" title="Otvori u knjizi">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
            </button>
            <button class="card-btn-action btn-share-item" title="Podijeli karticu (Instagram)">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
            </button>
          </div>
        </div>
      `;

      card.querySelector('.btn-open-book').addEventListener('click', () => {
        this.openReaderAtWord(item.id);
      });

      card.querySelector('.btn-share-item').addEventListener('click', () => {
        this.openShareModal(item);
      });

      this.wordsGrid.appendChild(card);
    });
  }

  // Interaktivni čitač knjige (08. STRANICA KNJIGE PRIMJER)
  renderReader() {
    const currentWord = this.words.find(w => w.id === this.currentReaderWordId) || this.words[0];
    if (!currentWord) return;

    this.currentReaderWordId = currentWord.id;
    const letter = (currentWord.letter || currentWord.word.charAt(0)).toUpperCase();
    const wordsWithSameLetter = this.words.filter(w => (w.letter || w.word.charAt(0)).toUpperCase() === letter);

    // Lijeva stranica
    this.readerLetter.textContent = letter.toLowerCase();
    this.readerWordList.innerHTML = '';
    wordsWithSameLetter.forEach(w => {
      const li = document.createElement('li');
      li.className = `page-word-item ${w.id === currentWord.id ? 'active' : ''}`;
      li.textContent = w.word;
      li.addEventListener('click', () => {
        this.openReaderAtWord(w.id, false);
      });
      this.readerWordList.appendChild(li);
    });

    // Broj stranice temeljen na indeksu
    const wordIndex = this.words.findIndex(w => w.id === currentWord.id);
    this.readerPageNum.textContent = `${100 + wordIndex * 2}`;

    // Desna stranica
    this.readerWord.textContent = currentWord.word;
    this.readerRealWord.innerHTML = `= ${this.escapeHTML(currentWord.realWord)}`;
    this.readerDefinition.textContent = currentWord.definition;
    this.readerSpeaker.textContent = `${currentWord.speaker || 'A.G.'} (${currentWord.age || 5})`;
    this.readerDate.textContent = currentWord.date || `${currentWord.location || 'Zagreb'}, ${currentWord.year || '2024'}`;

    // Kontrole
    this.readerPrevBtn.disabled = (wordIndex === 0);
    this.readerNextBtn.disabled = (wordIndex === this.words.length - 1);
  }

  navigateReader(direction) {
    const currentIndex = this.words.findIndex(w => w.id === this.currentReaderWordId);
    const newIndex = currentIndex + direction;
    if (newIndex >= 0 && newIndex < this.words.length) {
      this.currentReaderWordId = this.words[newIndex].id;
      this.renderReader();
    }
  }

  openReaderAtWord(wordId, scroll = true) {
    this.currentReaderWordId = wordId;
    this.renderReader();
    if (scroll) {
      const readerEl = document.getElementById('citac');
      if (readerEl) {
        readerEl.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }

  // Modal za dijeljenje / Instagram format (05. KARTICA RIJEČI)
  openShareModal(word) {
    this.currentShareWord = word;
    this.shareStoryCard.innerHTML = `
      <div class="story-brand">@djecnik.hr</div>
      <div class="story-word-block">
        <div class="story-word">${this.escapeHTML(word.word)}</div>
        <div class="story-real-word">= ${this.escapeHTML(word.realWord)}</div>
        <div class="story-divider"></div>
        <div class="story-definition">${this.escapeHTML(word.definition)}</div>
      </div>
      <div class="story-footer">
        <div>${this.escapeHTML(word.speaker || 'Govornik')} (${word.age || '–'})</div>
        <div>${this.escapeHTML(word.location || 'Zagreb')}${word.year ? ', ' + word.year : ''}</div>
      </div>
    `;
    this.openModal(this.shareModal);
  }

  // Generiranje kartice u Canvasu i preuzimanje slike
  generateAndDownloadCanvas() {
    if (!this.currentShareWord) return;
    const word = this.currentShareWord;

    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920; // 9:16 Instagram Story format
    const ctx = canvas.getContext('2d');

    // Pozadina krem
    ctx.fillStyle = '#F2EFE6';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Kartica unutarnja
    const margin = 100;
    const cardW = canvas.width - (margin * 2);
    const cardH = canvas.height - (margin * 2);
    const radius = 32;

    ctx.fillStyle = '#FAF8F2';
    ctx.strokeStyle = '#D8D6D2';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(margin, margin, cardW, cardH, radius);
    ctx.fill();
    ctx.stroke();

    // Zaglavlje
    ctx.fillStyle = '#8B1E3F';
    ctx.font = 'bold 36px Roboto, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('@djecnik.hr', canvas.width - margin - 80, margin + 120);

    ctx.textAlign = 'left';
    ctx.font = '500 40px Lora, Georgia, serif';
    ctx.fillText('dječnik.hr', margin + 80, margin + 120);

    // Glavna riječ
    const centerY = canvas.height / 2 - 120;
    ctx.fillStyle = '#1E1E1E';
    ctx.font = '600 110px Lora, Georgia, serif';
    ctx.fillText(word.word, margin + 80, centerY);

    // Pravo značenje
    ctx.fillStyle = '#8B1E3F';
    ctx.font = '500 56px Roboto, sans-serif';
    ctx.fillText(`= ${word.realWord}`, margin + 80, centerY + 80);

    // Crvena linija
    ctx.fillStyle = '#8B1E3F';
    ctx.fillRect(margin + 80, centerY + 130, 100, 6);

    // Definicija (wrap teksta)
    ctx.fillStyle = '#1E1E1E';
    ctx.font = '400 44px Roboto, sans-serif';
    this.wrapText(ctx, word.definition, margin + 80, centerY + 220, cardW - 160, 64);

    // Podnožje kartice
    const footerY = canvas.height - margin - 120;
    ctx.strokeStyle = '#EBE8E3';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(margin + 80, footerY - 50);
    ctx.lineTo(canvas.width - margin - 80, footerY - 50);
    ctx.stroke();

    ctx.fillStyle = '#555350';
    ctx.font = '500 36px Roboto, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${word.speaker || 'Govornik'} (${word.age || '–'} god.)`, margin + 80, footerY);

    ctx.textAlign = 'right';
    ctx.fillText(`${word.location || 'Hrvatska'}${word.year ? ', ' + word.year : ''}`, canvas.width - margin - 80, footerY);

    // Preuzimanje
    const link = document.createElement('a');
    link.download = `djecnik-${word.word}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();

    this.showToast(`Kartica za "${word.word}" je preuzeta!`);
  }

  wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line, x, y);
        line = words[n] + ' ';
        y += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, y);
  }

  copyWordText() {
    if (!this.currentShareWord) return;
    const w = this.currentShareWord;
    const text = `Dječnik: "${w.word}" = ${w.realWord}\nOpis: ${w.definition}\nIzgovorio/la: ${w.speaker} (${w.age} god.), ${w.location}\nViše na dječnik.hr`;
    navigator.clipboard.writeText(text).then(() => {
      this.showToast('Tekst riječi je kopiran u međuspremnik!');
    }).catch(() => {
      this.showToast('Nije uspjelo kopiranje teksta.');
    });
  }

  // Obrada obrasca za unos nove riječi
  handleFormSubmit() {
    const wordInput = document.getElementById('input-word').value.trim().toLowerCase();
    const realInput = document.getElementById('input-real-word').value.trim().toLowerCase();
    const defInput = document.getElementById('input-def').value.trim();
    const speakerInput = document.getElementById('input-speaker').value.trim();
    const ageInput = parseInt(document.getElementById('input-age').value.trim(), 10);
    const locInput = document.getElementById('input-location').value.trim();

    if (!wordInput || !realInput || !defInput) {
      alert('Molimo unesite dječju riječ, pravo značenje i kratak opis.');
      return;
    }

    const firstChar = wordInput.charAt(0).toUpperCase();
    const today = new Date();
    const formattedDate = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

    const newEntry = {
      id: `${wordInput}-${Date.now()}`,
      letter: firstChar,
      word: wordInput,
      realWord: realInput,
      definition: defInput,
      speaker: speakerInput || 'Anonimno dijete',
      age: isNaN(ageInput) ? 5 : ageInput,
      date: formattedDate,
      location: locInput || 'Zagreb',
      year: today.getFullYear(),
      tags: ["novo"]
    };

    this.saveWord(newEntry);
    this.submitForm.reset();
    this.closeModal(this.submitModal);
    this.showToast(`Riječ "${wordInput}" je uspješno dodana u Dječnik!`);
  }

  // Pomoćne metode za modal i obavijesti
  openModal(modal) {
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  closeModal(modal) {
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }

  showToast(message) {
    this.toast.textContent = message;
    this.toast.className = 'toast-notice show success';
    setTimeout(() => {
      this.toast.className = 'toast-notice';
    }, 4000);
  }

  escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
      tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      }[tag] || tag)
    );
  }
}

// Inicijalizacija aplikacije pri učitavanju stranice
document.addEventListener('DOMContentLoaded', () => {
  window.djecnikApp = new DjecnikApp();
});
